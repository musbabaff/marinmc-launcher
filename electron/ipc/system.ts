import { ipcMain, dialog, shell } from 'electron';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { resolveGameDir } from './game.js';

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
