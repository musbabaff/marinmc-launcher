import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { autoUpdater } from 'electron-updater';
import { createSplash, closeSplash } from './splash.js';
import { setupTray, destroyTray, setGameRunning } from './tray.js';

// Import IPC handlers so they are registered in the main process
import './ipc/auth.js';
import './ipc/game.js';
import './ipc/system.js';

let mainWindow: BrowserWindow | null = null;

// Single instance lock
const isFirstInstance = app.requestSingleInstanceLock();
if (!isFirstInstance) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  // Show splash screen first
  const splash = createSplash();

  mainWindow = new BrowserWindow({
    width: 960,
    height: 600,
    frame: false,
    resizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0F111A',
    show: false, // Don't show until ready
  });

  // When main window content is loaded, close splash and show main
  mainWindow.once('ready-to-show', () => {
    // Give a small delay so splash progress bar finishes visually
    setTimeout(() => {
      closeSplash();
      mainWindow?.show();
      mainWindow?.focus();
    }, 2200); // ~2.2s matches splash progress bar duration
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    const devServerPort = 5173;
    mainWindow.loadURL(`http://localhost:${devServerPort}`);
    // Open DevTools in detached window in dev mode
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Listen for game state changes from renderer to update tray
  mainWindow.webContents.on('ipc-message', (_event, channel) => {
    if (channel === 'game:running') {
      setGameRunning(true);
    } else if (channel === 'game:stopped') {
      setGameRunning(false);
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  setupTray();

  // Initialize auto updater (only in packaged builds)
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('Error starting auto-updater:', err);
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    destroyTray();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC listeners for the custom titlebar
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.minimize();
});

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.close();
});

// Handle auto-updater logs / communications
autoUpdater.on('checking-for-update', () => {
  mainWindow?.webContents.send('updater:status', 'checking');
});

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('updater:status', 'available', info);
});

autoUpdater.on('update-not-available', (info) => {
  mainWindow?.webContents.send('updater:status', 'not-available', info);
});

autoUpdater.on('error', (err) => {
  mainWindow?.webContents.send('updater:status', 'error', err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
  mainWindow?.webContents.send('updater:progress', progressObj.percent);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow?.webContents.send('updater:status', 'downloaded', info);
  // Install the update
  autoUpdater.quitAndInstall();
});
