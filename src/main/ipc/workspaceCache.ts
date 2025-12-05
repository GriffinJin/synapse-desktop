import { ipcMain } from 'electron';
import Store from 'electron-store';
import type { RepoInfo } from '../types';

type WorkspaceCacheEntry = { repos: RepoInfo[]; lastScan: string };

// Initialize electron-store for workspace cache
const store = new Store<{
  entries: Record<string, WorkspaceCacheEntry>;
}>({
  name: 'workspace-cache',
  defaults: {
    entries: {}
  }
});

export function registerWorkspaceCacheIpc() {
  ipcMain.handle('workspace-cache:list', async () => {
    const cache = store.store;
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
    const cache = store.store;
    const entry = cache.entries[root];
    return entry ? entry.repos : null;
  });

  ipcMain.handle('workspace-cache:set', async (_event, root: string, repos: RepoInfo[]) => {
    if (typeof root !== 'string' || !root.trim()) throw new Error('Invalid root');
    const cache = store.store;
    cache.entries[root] = { repos: Array.isArray(repos) ? repos : [], lastScan: new Date().toISOString() };
    store.store = cache;
    return { ok: true };
  });

  ipcMain.handle('workspace-cache:remove', async (_event, root: string) => {
    if (typeof root !== 'string' || !root.trim()) throw new Error('Invalid root');
    const cache = store.store;
    delete cache.entries[root];
    store.store = cache;
    return { ok: true };
  });
}