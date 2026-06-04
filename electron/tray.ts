import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron';
import * as path from 'path';

let tray: Tray | null = null;
let isGameRunning = false;

export function setGameRunning(running: boolean): void {
  isGameRunning = running;
  updateTrayMenu();
  if (tray) {
    tray.setToolTip(running ? 'MarinMC - Oyun çalışıyor' : 'MarinMC Launcher');
  }
}

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

function updateTrayMenu(): void {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "MarinMC Launcher'ı Aç",
      click: () => {
        const win = getMainWindow();
        if (win) {
          if (win.isMinimized()) win.restore();
          win.show();
          win.focus();
        }
      },
    },
    {
      label: 'Oyunu Durdur',
      enabled: isGameRunning,
      click: () => {
        const win = getMainWindow();
        if (win) {
          win.webContents.send('tray:stop-game');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Çıkış',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

export function setupTray(): Tray | null {
  const iconPath = path.join(
    __dirname,
    app.isPackaged ? '../dist/assets/tray-icon.png' : '../assets/tray-icon.png'
  );

  try {
    // Create a fallback icon if the file doesn't exist
    let icon;
    try {
      icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) {
        // Create a simple 32x32 fallback icon
        icon = nativeImage.createEmpty();
      }
    } catch {
      icon = nativeImage.createEmpty();
    }

    tray = new Tray(icon);
    tray.setToolTip('MarinMC Launcher');

    // Double-click to show/hide
    tray.on('double-click', () => {
      const win = getMainWindow();
      if (win) {
        if (win.isVisible()) {
          win.hide();
        } else {
          win.show();
          win.focus();
        }
      }
    });

    updateTrayMenu();
    return tray;
  } catch (e) {
    console.warn('System tray failed to initialize:', e);
    return null;
  }
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
