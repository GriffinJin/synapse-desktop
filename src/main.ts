import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import os from 'node:os';

const M2_CONFIG_DIR = path.join(os.homedir(), '.m2', 'config');

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

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
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
