import { app, BrowserWindow, ipcMain } from 'electron';
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
