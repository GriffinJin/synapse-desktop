import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { execFile } from 'node:child_process';
import path from 'node:path';
import started from 'electron-squirrel-startup';

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import os from 'node:os';

const M2_CONFIG_DIR = path.join(os.homedir(), '.m2', 'config');
const DEFAULT_XML = '<?xml version="1.0" encoding="UTF-8"?>\n<configuration/>\n';

type FileMeta = {
  name: string;
  relativePath: string;
  absolutePath: string;
  isDirectory: boolean;
  size?: number;
}

async function listRecursive(dir: string, base: string): Promise<FileMeta[]> {
  // List files/directories recursively with metadata
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: FileMeta[] = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(base, abs);
    if (entry.isDirectory()) {
      out.push({
        name: entry.name,
        relativePath: rel,
        absolutePath: abs,
        isDirectory: true,
      });
      out.push(...(await listRecursive(abs, base)));
    } else {
      const stat = await fs.stat(abs);
      out.push({
        name: entry.name,
        relativePath: rel,
        absolutePath: abs,
        isDirectory: false,
        size: stat.size,
      });
    }
  }
  return out;
}

ipcMain.handle('m2:list-files', async () => {
  // Return empty list if directory does not exist
  if (!fssync.existsSync(M2_CONFIG_DIR)) return [];
  return await listRecursive(M2_CONFIG_DIR, M2_CONFIG_DIR);
});

ipcMain.handle('m2:read-file', async (_event, relativePath: string) => {
  // Read file content safely under ~/.m2/config only
  if (typeof relativePath !== 'string' || !relativePath.length) {
    throw new Error('Invalid relativePath');
  }
  const base = path.resolve(M2_CONFIG_DIR);
  const abs = path.resolve(path.join(base, relativePath));
  const isInside =
    abs === base || abs.startsWith(base + path.sep);
  if (!isInside) {
    throw new Error('Access denied: outside ~/.m2/config');
  }
  const content = await fs.readFile(abs, 'utf-8');
  return content;
});

// Create a new XML file safely inside ~/.m2/config
ipcMain.handle('m2:create-file', async (_event, fileName: string, content?: string) => {
  if (typeof fileName !== 'string' || !fileName.trim()) {
    throw new Error('Invalid fileName');
  }
  const base = path.resolve(M2_CONFIG_DIR);
  await fs.mkdir(base, { recursive: true });
  // Only allow file name without directories
  let safeName = path.basename(fileName.trim());
  const safePattern = /^[a-zA-Z0-9._-]+(\.xml)?$/;
  if (!safePattern.test(safeName)) {
    throw new Error('Invalid fileName characters');
  }
  if (!/\.xml$/i.test(safeName)) {
    safeName += '.xml';
  }
  const abs = path.resolve(path.join(base, safeName));
  const isInside = abs === base || abs.startsWith(base + path.sep);
  if (!isInside) {
    throw new Error('Access denied: outside ~/.m2/config');
  }
  if (fssync.existsSync(abs)) {
    throw new Error('File already exists');
  }
  await fs.writeFile(abs, content ?? DEFAULT_XML, 'utf-8');
  return true;
});

// System stats: OS, CPU usage (system-wide), memory (English-only comments)
let prevCpuInfo: ReturnType<typeof os.cpus> | null = null;
function cpuTotals(infos: ReturnType<typeof os.cpus>) {
  let idle = 0;
  let total = 0;
  for (const info of infos) {
    const t = info.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total };
}

ipcMain.handle('system:get-stats', async () => {
  const platform = os.platform();
  const release = os.release();
  const arch = os.arch();

  const nowInfo = os.cpus();
  let cpuPercent: number | null = null;
  if (prevCpuInfo) {
    const prev = cpuTotals(prevCpuInfo);
    const now = cpuTotals(nowInfo);
    const idleDelta = now.idle - prev.idle;
    const totalDelta = now.total - prev.total;
    cpuPercent = totalDelta > 0 ? (100 * (1 - idleDelta / totalDelta)) : null;
  }
  // Store current snapshot for next call
  prevCpuInfo = nowInfo;

  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();
  const usedBytes = totalBytes - freeBytes;
  const memPercent = (usedBytes / totalBytes) * 100;

  return {
    os: { platform, release, arch },
    cpu: { percent: cpuPercent },
    memory: { usedBytes, totalBytes, percent: memPercent },
  };
});

// Environment versions: Java, Python, Maven (English-only comments)
function execFileSafe(cmd: string, args: string[], timeoutMs = 3000): Promise<{ stdout: string; stderr: string } | null> {
  return new Promise((resolve) => {
    try {
      // Augment PATH to include common Homebrew locations on macOS
      const augmentedPath = [process.env.PATH || '', '/usr/local/bin', '/opt/homebrew/bin']
        .filter(Boolean)
        .join(path.delimiter);
      execFile(cmd, args, { timeout: timeoutMs, env: { ...process.env, PATH: augmentedPath } }, (_error, stdout, stderr) => {
        // Even if the command exits with error, version strings may still be printed
        resolve({ stdout, stderr });
      });
    } catch {
      resolve(null);
    }
  });
}

function parseJavaVersion(out: string) {
  // Typical outputs: 'java version "17.0.9"' or 'openjdk version "17.0.9"'
  const m = out.match(/version\s+"([^"]+)"/i);
  if (m && m[1]) return m[1];
  // Fallback: first number sequence
  const n = out.match(/(\d+\.\d+(?:\.\d+)?)/);
  return n ? n[1] : null;
}

function parsePythonVersion(out: string) {
  // Typical output: 'Python 3.11.6'
  const m = out.match(/Python\s+([\d.]+)/i);
  return m ? m[1] : null;
}

function parseMavenVersion(out: string) {
  // Typical output first line: 'Apache Maven 3.9.6'
  const m = out.match(/Apache Maven\s+([\d.]+)/i);
  return m ? m[1] : null;
}

ipcMain.handle('system:get-env-versions', async () => {
  // Java: prefer stderr content
  const javaRes = await execFileSafe('java', ['-version']);
  const javaOut = javaRes ? (javaRes.stderr || javaRes.stdout || '') : '';
  const java = javaOut ? parseJavaVersion(javaOut) : null;

  // Python: try python3 then python
  let python: string | null = null;
  const py3 = await execFileSafe('python3', ['--version']);
  const py3Out = py3 ? (py3.stdout || py3.stderr || '') : '';
  python = py3Out ? parsePythonVersion(py3Out) : null;
  if (!python) {
    const py = await execFileSafe('python', ['--version']);
    const pyOut = py ? (py.stdout || py.stderr || '') : '';
    python = pyOut ? parsePythonVersion(pyOut) : null;
  }

  // Maven
  const mvnRes = await execFileSafe('mvn', ['-v']);
  const mvnOut = mvnRes ? (mvnRes.stdout || mvnRes.stderr || '') : '';
  const mvn = mvnOut ? parseMavenVersion(mvnOut) : null;

  return { java, python, mvn };
});

// Workspace: directory chooser and Git repository scanner (English-only comments)
type RepoInfo = {
  name: string;
  path: string;
  origin: string | null;
  branch: string | null;
  ahead: boolean;
  behind: boolean;
  unstaged: boolean;
};

function isGitRepo(dir: string): boolean {
  const gitDir = path.join(dir, '.git');
  if (fssync.existsSync(gitDir)) return true;
  // Some worktrees or special setups have .git as a file pointer
  const gitFile = path.join(dir, '.git');
  try {
    const stat = fssync.statSync(gitFile);
    return stat.isFile() || stat.isDirectory();
  } catch {
    return false;
  }
}

async function resolveActualGitDir(dir: string): Promise<string | null> {
  // If .git is a directory, return it; if it's a file, resolve the gitdir pointer
  const gitPath = path.join(dir, '.git');
  try {
    const stat = fssync.statSync(gitPath);
    if (stat.isDirectory()) return gitPath;
    if (stat.isFile()) {
      const content = await fs.readFile(gitPath, 'utf-8');
      const m = content.match(/gitdir:\s*(.+)/i);
      if (m && m[1]) {
        const p = m[1].trim();
        const resolved = path.isAbsolute(p) ? p : path.resolve(dir, p);
        return resolved;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function readBranchName(dir: string): Promise<string | null> {
  try {
    const actualGitDir = await resolveActualGitDir(dir);
    const headPath = actualGitDir ? path.join(actualGitDir, 'HEAD') : path.join(dir, '.git', 'HEAD');
    const head = await fs.readFile(headPath, 'utf-8');
    const refMatch = head.match(/ref:\s*(.+)/i);
    if (refMatch && refMatch[1]) {
      const refPath = refMatch[1].trim();
      const parts = refPath.split(/[\\/]/);
      return parts[parts.length - 1] || null;
    }
    // Detached HEAD contains commit SHA
    return 'detached';
  } catch {
    return null;
  }
}

// Execute git commands in a specific repository directory
async function execGit(dir: string, args: string[], timeoutMs = 3000): Promise<{ stdout: string; stderr: string } | null> {
  return new Promise((resolve) => {
    execFile('git', args, { timeout: timeoutMs, cwd: dir }, (err, stdout, stderr) => {
      if (err) return resolve(null);
      resolve({ stdout, stderr });
    });
  });
}

// Compute simple repo status flags: ahead (unpushed), behind (unpulled), unstaged changes
async function computeRepoStatus(dir: string, branch: string | null): Promise<{ ahead: boolean; behind: boolean; unstaged: boolean }> {
  let ahead = false;
  let behind = false;
  let unstaged = false;

  // Unstaged changes via porcelain status
  try {
    const statusRes = await execGit(dir, ['status', '--porcelain']);
    if (statusRes) {
      const lines = statusRes.stdout.trim().split(/\r?\n/).filter(Boolean);
      for (const ln of lines) {
        if (ln.startsWith('??')) { unstaged = true; break; }
        if (ln.length >= 2 && ln[1] !== ' ') { unstaged = true; break; }
      }
    }
  } catch {
    // ignore
  }

  // Try to update remote refs quickly (optional)
  await execGit(dir, ['fetch', '--quiet']);

  // Determine upstream tracking ref
  let upstream: string | null = null;
  const upRes = await execGit(dir, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  const up = upRes?.stdout?.trim();
  if (up) upstream = up;
  else if (branch && branch !== 'detached') {
    // Fallback to origin/<branch> if origin exists
    const rem = await execGit(dir, ['remote']);
    const hasOrigin = !!rem?.stdout?.split(/\r?\n/).some(r => r.trim() === 'origin');
    if (hasOrigin) upstream = `origin/${branch}`;
  }

  // Compute ahead/behind vs upstream
  if (upstream) {
    const cnt = await execGit(dir, ['rev-list', '--left-right', '--count', `${upstream}...HEAD`]);
    const out = cnt?.stdout?.trim();
    if (out) {
      const parts = out.split(/\s+/);
      const behindCount = parseInt(parts[0] || '0', 10);
      const aheadCount = parseInt(parts[1] || '0', 10);
      ahead = aheadCount > 0;
      behind = behindCount > 0;
    }
  }

  return { ahead, behind, unstaged };
}

// Read origin remote URL, if present (English-only comments)
async function readOriginRemoteUrl(dir: string): Promise<string | null> {
  // Try git remote get-url origin, fallback to config key
  const res = await execGit(dir, ['remote', 'get-url', 'origin']);
  const url = res?.stdout?.trim();
  if (url) return url;
  const cfg = await execGit(dir, ['config', '--get', 'remote.origin.url']);
  const cfgUrl = cfg?.stdout?.trim();
  return cfgUrl || null;
}

async function findGitRepos(root: string, maxDepth = 4): Promise<RepoInfo[]> {
  const results: RepoInfo[] = [];
  async function walk(dir: string, depth: number) {
    if (depth > maxDepth) return;
    // If current dir is a git repo, record and do not descend further
    if (isGitRepo(dir)) {
      const name = path.basename(dir);
      const branch = await readBranchName(dir);
      const origin = await readOriginRemoteUrl(dir);
      const flags = await computeRepoStatus(dir, branch);
      results.push({ name, path: dir, origin, branch, ...flags });
      return; // skip inside the repo
    }
    // Skip heavy or hidden folders
    const skipNames = new Set(['node_modules', '.git', '.svn', '.hg']);
    let entries: fssync.Dirent[] = [] as any;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true }) as unknown as fssync.Dirent[];
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (skipNames.has(entry.name)) continue;
      const abs = path.join(dir, entry.name);
      await walk(abs, depth + 1);
    }
  }
  await walk(root, 0);
  return results;
}

ipcMain.handle('workspace:choose-dir', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (res.canceled || !res.filePaths || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

ipcMain.handle('workspace:scan-git', async (_event, root: string) => {
  if (typeof root !== 'string' || !root.trim()) throw new Error('Invalid root directory');
  return await findGitRepos(path.resolve(root));
});

// Workspace cache (JSON file under app userData) - English-only comments
type WorkspaceCacheEntry = { repos: RepoInfo[]; lastScan: string };
type WorkspaceCache = { entries: Record<string, WorkspaceCacheEntry> };
function workspaceCacheFile(): string {
  return path.join(app.getPath('userData'), 'workspace-cache.json');
}
async function readWorkspaceCache(): Promise<WorkspaceCache> {
  try {
    const file = workspaceCacheFile();
    if (!fssync.existsSync(file)) return { entries: {} };
    const raw = await fs.readFile(file, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { entries: {} };
    const entries = parsed.entries && typeof parsed.entries === 'object' ? parsed.entries : {};
    return { entries } as WorkspaceCache;
  } catch {
    return { entries: {} };
  }
}
async function writeWorkspaceCache(cache: WorkspaceCache): Promise<void> {
  const file = workspaceCacheFile();
  const content = JSON.stringify({ entries: cache.entries || {} }, null, 2);
  await fs.writeFile(file, content, 'utf-8');
}

ipcMain.handle('workspace-cache:list', async () => {
  const cache = await readWorkspaceCache();
  const list = Object.entries(cache.entries).map(([root, entry]) => ({
    root,
    lastScan: entry.lastScan,
    count: Array.isArray(entry.repos) ? entry.repos.length : 0,
  }));
  // Sort by lastScan desc for convenience
  list.sort((a, b) => (a.lastScan > b.lastScan ? -1 : a.lastScan < b.lastScan ? 1 : 0));
  return list;
});
ipcMain.handle('workspace-cache:get', async (_event, root: string) => {
  if (typeof root !== 'string' || !root.trim()) return null;
  const cache = await readWorkspaceCache();
  const entry = cache.entries[root];
  return entry ? entry.repos : null;
});
ipcMain.handle('workspace-cache:set', async (_event, root: string, repos: RepoInfo[]) => {
  if (typeof root !== 'string' || !root.trim()) throw new Error('Invalid root');
  const cache = await readWorkspaceCache();
  cache.entries[root] = { repos: Array.isArray(repos) ? repos : [], lastScan: new Date().toISOString() };
  await writeWorkspaceCache(cache);
  return { ok: true };
});
ipcMain.handle('workspace-cache:remove', async (_event, root: string) => {
  if (typeof root !== 'string' || !root.trim()) throw new Error('Invalid root');
  const cache = await readWorkspaceCache();
  delete cache.entries[root];
  await writeWorkspaceCache(cache);
  return { ok: true };
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    // Enforce minimum window size to prevent layout from breaking
    minWidth: 1024,
    minHeight: 640,
    // On macOS, use hiddenInset so the traffic lights sit with the web UI
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
