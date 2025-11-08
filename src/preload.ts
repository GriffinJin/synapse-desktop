// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

// Expose safe, minimal APIs to the renderer (English-only comments)
contextBridge.exposeInMainWorld('m2', {
  // List files under ~/.m2/config
  listFiles: async () => ipcRenderer.invoke('m2:list-files'),
  // Read a specific file (relative path under ~/.m2/config)
  readFile: async (relativePath: string) => ipcRenderer.invoke('m2:read-file', relativePath),
  // Create a new XML file under ~/.m2/config
  createFile: async (fileName: string, content?: string) => ipcRenderer.invoke('m2:create-file', fileName, content),
});

// Expose system stats API (English-only comments)
contextBridge.exposeInMainWorld('system', {
  // Get OS, CPU usage, and memory usage
  getStats: async () => ipcRenderer.invoke('system:get-stats'),
  // Get environment versions of java, python, and mvn
  getEnvVersions: async () => ipcRenderer.invoke('system:get-env-versions'),
});

// Expose workspace APIs (English-only comments)
contextBridge.exposeInMainWorld('workspace', {
  // Open a directory chooser dialog and return the selected path or null
  chooseDir: async () => ipcRenderer.invoke('workspace:choose-dir'),
  // Scan recursively for Git repositories under the given root directory
  scanGitRepos: async (root: string) => ipcRenderer.invoke('workspace:scan-git', root),
});

// Expose a minimal notifications channel to the renderer (English-only comments)
contextBridge.exposeInMainWorld('notify', {
  // Subscribe to system notifications broadcast on 'system:notify'
  on: (handler: (payload: any) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: any) => handler(payload);
    ipcRenderer.on('system:notify', listener);
    // Return an unsubscribe function for convenience
    return () => ipcRenderer.removeListener('system:notify', listener);
  },
  // Remove all listeners on the channel
  off: () => ipcRenderer.removeAllListeners('system:notify'),
});