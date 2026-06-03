import { app, BrowserWindow, ipcMain, Tray, Menu } from 'electron';
import * as path from 'path';
import { autoUpdater } from 'electron-updater';

// Import IPC handlers so they are registered in the main process
import './ipc/auth.js';
import './ipc/game.js';
import './ipc/system.js';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Single instance lock
const isFirstInstance = app.requestSingleInstanceLock();
if (!isFirstInstance) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
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
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
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
}

// System Tray Support
function setupTray() {
  // A tray icon would ordinarily reside in the build/assets directory.
  // We specify a fallback configuration if file access errors occur in testing.
  const iconPath = path.join(__dirname, app.isPackaged ? '../dist/assets/favicon.ico' : '../assets/favicon.ico');
  
  try {
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Restore Window', click: () => mainWindow?.show() },
      { type: 'separator' },
      { label: 'Exit Launcher', click: () => {
          app.quit();
        }
      }
    ]);
    tray.setToolTip('MarinMC Launcher');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (mainWindow?.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow?.show();
      }
    });
  } catch (e) {
    console.warn('System tray failed to initialize (likely due to missing icon asset in test workspace):', e);
  }
}

app.whenReady().then(() => {
  createWindow();
  setupTray();

  // Initialize auto updater
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error('Error starting auto-updater:', err);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
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
