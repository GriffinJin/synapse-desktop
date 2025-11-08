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