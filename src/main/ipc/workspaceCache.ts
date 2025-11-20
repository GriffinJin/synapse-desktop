import { ipcMain, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import type { RepoInfo } from '../types';

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

export function registerWorkspaceCacheIpc() {
  ipcMain.handle('workspace-cache:list', async () => {
    const cache = await readWorkspaceCache();
    const list = Object.entries(cache.entries).map(([root, entry]) => ({
      root,
      lastScan: entry.lastScan,
      count: Array.isArray(entry.repos) ? entry.repos.length : 0,
    }));
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
}