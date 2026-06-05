import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as os from 'os';
import { autoUpdater } from 'electron-updater';
import { createSplash, closeSplash } from './splash.js';
import { setupTray, destroyTray, setGameRunning } from './tray.js';
import { discordRPC } from './discord.js';
import { backendSettings } from './settings.js';

// Force correct userData path on Windows
if (process.platform === 'win32') {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  app.setPath('userData', path.join(appData, 'MarinMC Launcher'));
}

// Import non-game IPC handlers (these register globally via side-effects)
import './ipc/auth.js';
import './ipc/system.js';

// Game handlers are registered explicitly with mainWindow reference
import { registerGameHandlers } from './ipc/game.js';

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
    minWidth: 960,
    minHeight: 600,
    frame: false,
    resizable: true,
    maximizable: false,
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#060305',
    show: false, // Don't show until ready
  });

  // Register game IPC handlers with mainWindow reference
  registerGameHandlers(mainWindow);

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

  // Connect to Discord RPC on startup if enabled
  if (backendSettings.discordRpcEnabled) {
    discordRPC.connect().then(() => {
      const details = backendSettings.language === 'tr' ? 'Başlatıcıda' : 'In Launcher';
      const state = backendSettings.language === 'tr' ? 'Ana Menü' : 'Main Menu';
      discordRPC.setActivity(details, state);
    }).catch((err) => {
      console.error('[Discord RPC] Startup connection failed:', err.message);
    });
  }

  // Initialize auto updater (only in packaged builds)
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('Error starting auto-updater:', err);
    });
  }
});

app.on('window-all-closed', () => {
  discordRPC.disconnect();
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
