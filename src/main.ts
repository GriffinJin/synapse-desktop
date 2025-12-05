/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Register IPC handlers by module to keep concerns separated (English-only comments)
import { registerM2Ipc } from './main/ipc/m2';
import { registerSystemIpc } from './main/ipc/system';
import { registerWorkspaceIpc } from './main/ipc/workspace';
import { registerWorkspaceCacheIpc } from './main/ipc/workspaceCache';

// Initialize all IPC modules eagerly so renderer has channels available
registerM2Ipc();
registerSystemIpc();
registerWorkspaceIpc();
registerWorkspaceCacheIpc();

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
  mainWindow.webContents.openDevTools();
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