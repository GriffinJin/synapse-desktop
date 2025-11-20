import { ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import { execFile } from 'node:child_process';
import type { RepoInfo } from '../types';

function isGitRepo(dir: string): boolean {
  const gitDir = path.join(dir, '.git');
  if (fssync.existsSync(gitDir)) return true;
  try {
    const stat = fssync.statSync(gitDir);
    return stat.isFile() || stat.isDirectory();
  } catch {
    return false;
  }
}

async function resolveActualGitDir(dir: string): Promise<string | null> {
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
    return 'detached';
  } catch {
    return null;
  }
}

async function execGit(dir: string, args: string[], timeoutMs = 3000): Promise<{ stdout: string; stderr: string } | null> {
  return new Promise((resolve) => {
    execFile('git', args, { timeout: timeoutMs, cwd: dir }, (err, stdout, stderr) => {
      if (err) return resolve(null);
      resolve({ stdout, stderr });
    });
  });
}

async function computeRepoStatus(dir: string, branch: string | null): Promise<{ ahead: boolean; behind: boolean; unstaged: boolean }> {
  let ahead = false;
  let behind = false;
  let unstaged = false;

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

  await execGit(dir, ['fetch', '--quiet']);

  let upstream: string | null = null;
  const upRes = await execGit(dir, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  const up = upRes?.stdout?.trim();
  if (up) upstream = up;
  else if (branch && branch !== 'detached') {
    const rem = await execGit(dir, ['remote']);
    const hasOrigin = !!rem?.stdout?.split(/\r?\n/).some(r => r.trim() === 'origin');
    if (hasOrigin) upstream = `origin/${branch}`;
  }

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

export async function findGitRepos(root: string, maxDepth = 4): Promise<RepoInfo[]> {
  const results: RepoInfo[] = [];
  async function walk(dir: string, depth: number) {
    if (depth > maxDepth) return;
    if (isGitRepo(dir)) {
      const name = path.basename(dir);
      const branch = await readBranchName(dir);
      const origin = await readOriginRemoteUrl(dir);
      const flags = await computeRepoStatus(dir, branch);
      results.push({ name, path: dir, origin, branch, ...flags });
      return;
    }
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

async function readOriginRemoteUrl(dir: string): Promise<string | null> {
  const res = await execGit(dir, ['remote', 'get-url', 'origin']);
  const url = res?.stdout?.trim();
  if (url) return url;
  const cfg = await execGit(dir, ['config', '--get', 'remote.origin.url']);
  const cfgUrl = cfg?.stdout?.trim();
  return cfgUrl || null;
}

export function registerWorkspaceIpc() {
  ipcMain.handle('workspace:choose-dir', async () => {
    const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (res.canceled || !res.filePaths || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });

  ipcMain.handle('workspace:scan-git', async (_event, root: string) => {
    if (typeof root !== 'string' || !root.trim()) throw new Error('Invalid root directory');
    return await findGitRepos(path.resolve(root));
  });
}