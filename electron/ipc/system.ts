import { ipcMain } from 'electron';
import * as os from 'os';
import { execSync } from 'child_process';

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
    os: osType === 'win32' ? 'Windows' : osType === 'darwin' ? 'macOS' : 'Linux'
  };
});
