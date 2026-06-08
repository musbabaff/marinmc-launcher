import { ipcMain, dialog, shell, clipboard } from 'electron';
import * as os from 'os';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { resolveGameDir } from './game.js';
import { backendSettings } from '../settings.js';
import { discordRPC } from '../discord.js';

ipcMain.handle('system:info', async () => {
  const totalRAM = Math.round(os.totalmem() / (1024 * 1024)); // Total memory in MB
  const osType = os.platform(); // 'win32', 'darwin', 'linux'
  let javaPath = 'Default (Bundled Java)';

  try {
    // Attempt to locate java path on system
    if (osType === 'win32') {
      const output = execSync('where java', { encoding: 'utf8' });
      javaPath = output.split('\r\n')[0] || 'Default (Bundled Java)';
    } else {
      const output = execSync('which java', { encoding: 'utf8' });
      javaPath = output.trim() || 'Default (Bundled Java)';
    }
  } catch (err) {
    // Java is not on PATH, which is normal. Return fallback path placeholder
    if (osType === 'win32') {
      javaPath = 'C:\\Program Files\\Common Files\\Oracle\\Java\\javapath\\java.exe';
    } else {
      javaPath = '/usr/bin/java';
    }
  }

  return {
    totalRAM,
    javaPath,
    os: osType === 'win32' ? 'Windows' : osType === 'darwin' ? 'macOS' : 'Linux',
    defaultGameDir: resolveGameDir()
  };
});

ipcMain.handle('system:select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Oyun Klasörünü Seçin'
  });
  if (result.canceled) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('system:open-external', async (_event, url: string) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err) {
    console.error('Failed to open external link:', err);
    return { success: false };
  }
});

ipcMain.handle('validate-directory', async (_event, dirPath: string) => {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    // Test write access
    const testFile = path.join(dirPath, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return { valid: true, path: dirPath };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
});

ipcMain.handle('get-screenshots', async (_event, gameDir: string) => {
  const screenshotsDir = path.join(gameDir, 'screenshots');
  try {
    if (!fs.existsSync(screenshotsDir)) {
      return { success: true, screenshots: [] };
    }
    const files = fs.readdirSync(screenshotsDir)
      .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
      .map(f => {
        const filePath = path.join(screenshotsDir, f);
        const stat = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          size: stat.size,
          date: stat.mtime
        };
      });
    return { success: true, screenshots: files };
  } catch {
    return { success: true, screenshots: [] };
  }
});

ipcMain.handle('upload-skin', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'PNG Images', extensions: ['png'] }],
    properties: ['openFile']
  });
  if (!result.canceled && result.filePaths[0]) {
    return { success: true, path: result.filePaths[0] };
  }
  return { success: false };
});

ipcMain.handle('open-crash-log', async (_event, crashPath: string) => {
  try {
    let targetFile = '';
    if (fs.existsSync(crashPath)) {
      const stats = fs.statSync(crashPath);
      if (stats.isDirectory()) {
        const files = fs.readdirSync(crashPath);
        if (files.length > 0) {
          const latest = files.sort().reverse()[0];
          targetFile = path.join(crashPath, latest);
        }
      } else {
        targetFile = crashPath;
      }
    }

    // Fallback to logs/latest.log if no crash report exists
    if (!targetFile || !fs.existsSync(targetFile)) {
      const gameDir = path.dirname(crashPath);
      const latestLog = path.join(gameDir, 'logs', 'latest.log');
      if (fs.existsSync(latestLog)) {
        targetFile = latestLog;
      }
    }

    if (targetFile && fs.existsSync(targetFile)) {
      await shell.openPath(targetFile);
      return { success: true };
    }
    return { success: false, error: 'Hata günlüğü dosyası bulunamadı.' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('copy-crash-log', async (_event, crashPath: string) => {
  try {
    let targetFile = '';
    if (fs.existsSync(crashPath)) {
      const stats = fs.statSync(crashPath);
      if (stats.isDirectory()) {
        const files = fs.readdirSync(crashPath);
        if (files.length > 0) {
          const latest = files.sort().reverse()[0];
          targetFile = path.join(crashPath, latest);
        }
      } else {
        targetFile = crashPath;
      }
    }

    // Fallback to logs/latest.log if no crash report exists
    if (!targetFile || !fs.existsSync(targetFile)) {
      const gameDir = path.dirname(crashPath);
      const latestLog = path.join(gameDir, 'logs', 'latest.log');
      if (fs.existsSync(latestLog)) {
        targetFile = latestLog;
      }
    }

    if (targetFile && fs.existsSync(targetFile)) {
      const content = fs.readFileSync(targetFile, 'utf-8');
      clipboard.writeText(content);
      return { success: true };
    }
    return { success: false, error: 'Hata günlüğü dosyası bulunamadı.' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('system:validate-mojang', async (_event, username: string) => {
  try {
    const res = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`, { timeout: 4000 });
    if (res.status === 200 && res.data && res.data.name) {
      return { success: true, uuid: res.data.id, name: res.data.name };
    }
    return { success: false };
  } catch (err) {
    return { success: false };
  }
});

ipcMain.handle('system:update-settings', async (_event, settings: {
  smartJvmOpt: boolean;
  discordRpcEnabled: boolean;
  language: 'tr' | 'en';
}) => {
  const oldRpcEnabled = backendSettings.discordRpcEnabled;
  backendSettings.smartJvmOpt = settings.smartJvmOpt;
  backendSettings.discordRpcEnabled = settings.discordRpcEnabled;
  backendSettings.language = settings.language;

  console.log('[ipc/system] Settings updated:', backendSettings);

  // Manage Discord RPC connection based on updated settings
  if (backendSettings.discordRpcEnabled) {
    await discordRPC.connect();
    const details = backendSettings.language === 'tr' ? 'Başlatıcıda' : 'In Launcher';
    const state = backendSettings.language === 'tr' ? 'Ana Menü' : 'Main Menu';
    discordRPC.setActivity(details, state);
  } else {
    discordRPC.disconnect();
  }

  return { success: true };
});
