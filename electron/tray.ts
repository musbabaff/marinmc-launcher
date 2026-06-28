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
  // tray-icon.png is copied next to the compiled main (dist-electron) at build
  // time; fall back to the raw assets folder when running from source.
  const candidates = [
    path.join(__dirname, 'tray-icon.png'),
    path.join(__dirname, '../assets/tray-icon.png'),
    path.join(__dirname, '../dist/assets/tray-icon.png'),
  ];

  try {
    let icon = nativeImage.createEmpty();
    for (const p of candidates) {
      try {
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) { icon = img; break; }
      } catch { /* try next */ }
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
