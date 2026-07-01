import { ipcMain, dialog, shell, clipboard, app, session } from 'electron';
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

// --- Real-time system monitoring (no mock data) ---

// CPU usage is computed from the delta between two os.cpus() snapshots.
let lastCpuTimes = os.cpus().map(c => c.times);
function sampleCpuUsage(): number {
  const current = os.cpus().map(c => c.times);
  let idleDiff = 0;
  let totalDiff = 0;
  for (let i = 0; i < current.length; i++) {
    const c = current[i];
    const p = lastCpuTimes[i];
    if (!p) continue;
    const cTotal = c.user + c.nice + c.sys + c.idle + c.irq;
    const pTotal = p.user + p.nice + p.sys + p.idle + p.irq;
    idleDiff += c.idle - p.idle;
    totalDiff += cTotal - pTotal;
  }
  lastCpuTimes = current;
  if (totalDiff <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((1 - idleDiff / totalDiff) * 100)));
}

function extractGpuName(glRenderer: string): string {
  if (!glRenderer) return '';
  // ANGLE strings look like: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1050 Direct3D11 vs_5_0 ps_5_0, D3D11)"
  const m = glRenderer.match(/(NVIDIA GeForce[^,/)]*|NVIDIA[^,/)]*|AMD Radeon[^,/)]*|Radeon[^,/)]*|Intel\(R\)[^,/)]*|Intel[^,/)]*|Apple[^,/)]*|Mali[^,/)]*|Adreno[^,/)]*)/i);
  let name = m ? m[1] : glRenderer;
  return name.replace(/\s+(Direct3D11|OpenGL|vs_\d_\d|ps_\d_\d).*$/i, '').trim();
}

let cachedHardware: any = null;
ipcMain.handle('system:hardware', async () => {
  if (cachedHardware) return cachedHardware;
  const cpus = os.cpus();
  const cpuModel = (cpus[0]?.model || 'Bilinmiyor').replace(/\s+@.*$/, '').trim();
  const cores = cpus.length;
  const totalRAM = Math.round(os.totalmem() / (1024 * 1024));
  const osType = os.platform();
  const osName = osType === 'win32' ? 'Windows' : osType === 'darwin' ? 'macOS' : 'Linux';

  let gpuModel = 'Bilinmiyor';
  let glVersion = '';
  try {
    const info: any = await app.getGPUInfo('complete');
    const aux = info?.auxAttributes || {};
    glVersion = (aux.glVersion || '').toString();
    gpuModel = extractGpuName(aux.glRenderer || '') || gpuModel;
  } catch { /* ignore */ }

  // Windows fallback for a clean GPU name when ANGLE parsing is unhelpful.
  if ((gpuModel === 'Bilinmiyor' || gpuModel.length < 3) && osType === 'win32') {
    try {
      const out = execSync(
        'powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | Where-Object { $_.AdapterRAM -gt 0 } | Select-Object -First 1 -ExpandProperty Name)"',
        { encoding: 'utf8', timeout: 5000 }
      );
      if (out.trim()) gpuModel = out.trim();
    } catch { /* ignore */ }
  }

  cachedHardware = { cpuModel, cores, totalRAM, gpuModel, glVersion, osName, arch: os.arch() };
  return cachedHardware;
});

ipcMain.handle('system:stats', async () => {
  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();
  return {
    cpuUsage: sampleCpuUsage(),
    ramUsedMB: Math.round((totalBytes - freeBytes) / (1024 * 1024)),
    ramTotalMB: Math.round(totalBytes / (1024 * 1024))
  };
});

// Honest memory optimization: clears the launcher's own browser caches and runs
// V8 GC when available, then reports the real RSS drop of the launcher process.
ipcMain.handle('system:optimize-memory', async () => {
  const before = process.memoryUsage().rss;
  try { (global as any).gc?.(); } catch { /* gc not exposed */ }
  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearCodeCaches({ urls: [] });
  } catch { /* ignore */ }
  await new Promise(r => setTimeout(r, 350));
  try { (global as any).gc?.(); } catch { /* ignore */ }
  const after = process.memoryUsage().rss;
  const freedMB = Math.max(0, Math.round((before - after) / (1024 * 1024)));
  return { freedMB, rssMB: Math.round(after / (1024 * 1024)) };
});

// Real OS-level "launch on startup" toggle.
ipcMain.handle('system:get-startup', async () => {
  try { return app.getLoginItemSettings().openAtLogin; } catch { return false; }
});
ipcMain.handle('system:set-startup', async (_event, enabled: boolean) => {
  try {
    app.setLoginItemSettings({ openAtLogin: !!enabled });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// --- Real profile content (mods / shaders / resource packs / worlds) ---

const CONTENT_SUBFOLDER: Record<string, string> = {
  mods: 'mods',
  shaders: 'shaderpacks',
  resources: 'resourcepacks',
  worlds: 'saves'
};

// Reject anything that isn't a plain file/dir name (path-traversal safe).
function safeName(name: string): boolean {
  return !!name && !name.includes('/') && !name.includes('\\') && !name.includes('..');
}

function dirSizeShallow(dir: string): number {
  let total = 0;
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isFile()) {
        try { total += fs.statSync(path.join(dir, e.name)).size; } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
  return total;
}

ipcMain.handle('system:list-content', async (_event, kind: string) => {
  const sub = CONTENT_SUBFOLDER[kind];
  if (!sub) return [];
  const dir = path.join(resolveGameDir(), sub);
  if (!fs.existsSync(dir)) return [];
  const isWorlds = kind === 'worlds';
  const items: any[] = [];
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (isWorlds) {
      if (!entry.isDirectory()) continue;
      let modified = 0;
      try { modified = fs.statSync(full).mtimeMs; } catch { /* ignore */ }
      items.push({ name: entry.name, displayName: entry.name, size: dirSizeShallow(full), enabled: true, modified });
    } else {
      if (!entry.isFile()) continue;
      const n = entry.name;
      const lower = n.toLowerCase();
      const isPack = lower.endsWith('.jar') || lower.endsWith('.jar.disabled') || lower.endsWith('.zip') || lower.endsWith('.zip.disabled');
      if (!isPack) continue;
      const enabled = !lower.endsWith('.disabled');
      const base = n.replace(/\.disabled$/i, '');
      let size = 0, modified = 0;
      try { const st = fs.statSync(full); size = st.size; modified = st.mtimeMs; } catch { /* ignore */ }
      items.push({ name: n, displayName: base.replace(/\.(jar|zip)$/i, ''), size, enabled, modified });
    }
  }
  // Newest first for worlds, alphabetical for packs.
  items.sort((a, b) => isWorlds ? b.modified - a.modified : a.displayName.localeCompare(b.displayName));
  return items;
});

ipcMain.handle('system:toggle-content', async (_event, kind: string, name: string) => {
  const sub = CONTENT_SUBFOLDER[kind];
  if (!sub || kind === 'worlds' || !safeName(name)) return { success: false };
  const dir = path.join(resolveGameDir(), sub);
  const current = path.join(dir, name);
  try {
    if (!fs.existsSync(current)) return { success: false };
    const target = name.toLowerCase().endsWith('.disabled')
      ? path.join(dir, name.replace(/\.disabled$/i, ''))
      : path.join(dir, name + '.disabled');
    fs.renameSync(current, target);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('system:delete-content', async (_event, kind: string, name: string) => {
  const sub = CONTENT_SUBFOLDER[kind];
  if (!sub || !safeName(name)) return { success: false };
  const full = path.join(resolveGameDir(), sub, name);
  try {
    if (!fs.existsSync(full)) return { success: false };
    fs.rmSync(full, { recursive: true, force: true });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('system:open-content-folder', async (_event, kind: string) => {
  const sub = CONTENT_SUBFOLDER[kind];
  if (!sub) return { success: false };
  const dir = path.join(resolveGameDir(), sub);
  try {
    fs.mkdirSync(dir, { recursive: true });
    await shell.openPath(dir);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
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

ipcMain.handle('get-screenshots', async (_event, _gameDir: string) => {
  const gameDir = resolveGameDir(backendSettings.launcherDir);
  const screenshotsDir = path.join(gameDir, 'screenshots');
  try {
    if (!fs.existsSync(screenshotsDir)) {
      return { success: true, screenshots: [] };
    }
    const files = fs.readdirSync(screenshotsDir)
      .filter(f => {
        const lower = f.toLowerCase();
        return (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) && !f.includes('..') && !f.includes('/') && !f.includes('\\');
      })
      .map(f => {
        const filePath = path.join(screenshotsDir, f);
        const stat = fs.statSync(filePath);
        const ext = path.extname(f).toLowerCase() === '.jpg' || path.extname(f).toLowerCase() === '.jpeg' ? 'jpeg' : 'png';
        const base64Data = fs.readFileSync(filePath).toString('base64');
        return {
          name: f,
          url: `data:image/${ext};base64,${base64Data}`,
          size: (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
          date: stat.mtime.toISOString().split('T')[0]
        };
      });
    return { success: true, screenshots: files };
  } catch (err: any) {
    return { success: false, error: err.message, screenshots: [] };
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

    // Fallback to logs/latest.log or launcher-latest.log if no crash report exists
    if (!targetFile || !fs.existsSync(targetFile)) {
      const gameDir = path.dirname(crashPath);
      const latestLog = path.join(gameDir, 'logs', 'latest.log');
      const launcherLog = path.join(gameDir, 'logs', 'launcher-latest.log');
      if (fs.existsSync(latestLog)) {
        targetFile = latestLog;
      } else if (fs.existsSync(launcherLog)) {
        targetFile = launcherLog;
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

    // Fallback to logs/latest.log or launcher-latest.log if no crash report exists
    if (!targetFile || !fs.existsSync(targetFile)) {
      const gameDir = path.dirname(crashPath);
      const latestLog = path.join(gameDir, 'logs', 'latest.log');
      const launcherLog = path.join(gameDir, 'logs', 'launcher-latest.log');
      if (fs.existsSync(latestLog)) {
        targetFile = latestLog;
      } else if (fs.existsSync(launcherLog)) {
        targetFile = launcherLog;
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

ipcMain.handle('system:check-connectivity', async () => {
  try {
    const res = await axios.get('https://api.mojang.com/users/profiles/minecraft/Steve', { timeout: 3000 });
    return res.status === 200;
  } catch (err) {
    try {
      const apiBase = process.env.MARINMC_API_URL || 'https://api.marinmc.com/api';
      const res = await axios.get(`${apiBase}/stats/online-count`, { timeout: 3000 });
      return res.status === 200;
    } catch {
      return false;
    }
  }
});


ipcMain.handle('system:update-settings', async (_event, settings: {
  smartJvmOpt: boolean;
  discordRpcEnabled: boolean;
  language: 'tr' | 'en';
  launcherDir: string;
}) => {
  const oldRpcEnabled = backendSettings.discordRpcEnabled;
  backendSettings.smartJvmOpt = settings.smartJvmOpt;
  backendSettings.discordRpcEnabled = settings.discordRpcEnabled;
  backendSettings.language = settings.language;
  backendSettings.launcherDir = settings.launcherDir;

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

// Only allow downloads over HTTPS from trusted content hosts. Prevents the
// renderer from coercing the main process into fetching arbitrary URLs (SSRF)
// or local resources via file://.
const ALLOWED_DOWNLOAD_HOSTS = ['modrinth.com', 'marinmc.com'];
function isAllowedDownloadUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_DOWNLOAD_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
}

// Reduce a user-supplied filename to a single safe path segment and reject
// anything that could traverse out of the destination folder.
function safeSegment(filename: string): string {
  const name = path.basename(String(filename || ''));
  if (!name || name === '.' || name === '..' || name.includes('/') || name.includes('\\')) {
    throw new Error('Geçersiz dosya adı.');
  }
  return name;
}

// Refuse to operate on symlinks so a planted link can't redirect a
// delete/rename onto a file outside the game directory.
function assertNotSymlink(targetPath: string): void {
  try {
    if (fs.lstatSync(targetPath).isSymbolicLink()) {
      throw new Error('Symlink hedeflerine izin verilmiyor.');
    }
  } catch (err: any) {
    if (err && err.code === 'ENOENT') return; // path doesn't exist yet -> fine
    throw err;
  }
}

ipcMain.handle('system:download-file', async (_event, url: string, filename: string, projectType: string, targetVersion?: string) => {
  try {
    if (!isAllowedDownloadUrl(url)) {
      return { success: false, error: 'İndirme adresi güvenli kaynaklar listesinde değil.' };
    }
    const sanitizedFilename = safeSegment(filename);
    const gameDir = resolveGameDir(backendSettings.launcherDir);
    let subfolder = 'mods';
    if (projectType === 'resourcepack') {
      subfolder = 'resourcepacks';
    } else if (projectType === 'shader') {
      subfolder = 'shaderpacks';
    } else if (projectType === 'mod' && targetVersion) {
      let cleanTargetVersion = targetVersion;
      if (targetVersion.startsWith('fabric-loader-')) {
        const parts = targetVersion.split('-');
        cleanTargetVersion = parts[parts.length - 1];
      }
      const versionFile = path.join(gameDir, 'mods', '.version');
      let currentModsVersion = '';
      if (fs.existsSync(versionFile)) {
        try {
          currentModsVersion = fs.readFileSync(versionFile, 'utf8').trim();
        } catch {}
      }
      if (currentModsVersion && currentModsVersion !== cleanTargetVersion) {
        subfolder = `mods_backup_${cleanTargetVersion}`;
      }
    }
    const destFolder = path.join(gameDir, subfolder);
    fs.mkdirSync(destFolder, { recursive: true });
    const destPath = path.join(destFolder, sanitizedFilename);
    assertNotSymlink(destPath);

    // Download file using axios
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(destPath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });

    return { success: true, path: destPath };
  } catch (err: any) {
    console.error('Download failed:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('system:delete-file', async (_event, filename: string, projectType: string, targetVersion?: string) => {
  try {
    const sanitizedFilename = safeSegment(filename);
    const gameDir = resolveGameDir(backendSettings.launcherDir);
    let subfolder = 'mods';
    if (projectType === 'resourcepack') {
      subfolder = 'resourcepacks';
    } else if (projectType === 'shader') {
      subfolder = 'shaderpacks';
    } else if (projectType === 'mod' && targetVersion) {
      let cleanTargetVersion = targetVersion;
      if (targetVersion.startsWith('fabric-loader-')) {
        const parts = targetVersion.split('-');
        cleanTargetVersion = parts[parts.length - 1];
      }
      const versionFile = path.join(gameDir, 'mods', '.version');
      let currentModsVersion = '';
      if (fs.existsSync(versionFile)) {
        try { currentModsVersion = fs.readFileSync(versionFile, 'utf8').trim(); } catch {}
      }
      if (currentModsVersion && currentModsVersion !== cleanTargetVersion) {
        subfolder = `mods_backup_${cleanTargetVersion}`;
      }
    }
    const activePath = path.join(gameDir, subfolder, sanitizedFilename);
    const disabledPath = activePath + '.disabled';

    if (fs.existsSync(activePath)) {
      assertNotSymlink(activePath);
      fs.unlinkSync(activePath);
    }
    if (fs.existsSync(disabledPath)) {
      assertNotSymlink(disabledPath);
      fs.unlinkSync(disabledPath);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('system:toggle-file', async (_event, filename: string, projectType: string, enabled: boolean, targetVersion?: string) => {
  try {
    const sanitizedFilename = safeSegment(filename);
    const gameDir = resolveGameDir(backendSettings.launcherDir);
    let subfolder = 'mods';
    if (projectType === 'resourcepack') {
      subfolder = 'resourcepacks';
    } else if (projectType === 'shader') {
      subfolder = 'shaderpacks';
    } else if (projectType === 'mod' && targetVersion) {
      let cleanTargetVersion = targetVersion;
      if (targetVersion.startsWith('fabric-loader-')) {
        const parts = targetVersion.split('-');
        cleanTargetVersion = parts[parts.length - 1];
      }
      const versionFile = path.join(gameDir, 'mods', '.version');
      let currentModsVersion = '';
      if (fs.existsSync(versionFile)) {
        try { currentModsVersion = fs.readFileSync(versionFile, 'utf8').trim(); } catch {}
      }
      if (currentModsVersion && currentModsVersion !== cleanTargetVersion) {
        subfolder = `mods_backup_${cleanTargetVersion}`;
      }
    }
    const activePath = path.join(gameDir, subfolder, sanitizedFilename);
    const disabledPath = activePath + '.disabled';

    if (enabled) {
      if (fs.existsSync(disabledPath)) {
        assertNotSymlink(disabledPath);
        fs.renameSync(disabledPath, activePath);
      }
    } else {
      if (fs.existsSync(activePath)) {
        assertNotSymlink(activePath);
        fs.renameSync(activePath, disabledPath);
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('system:open-directory', async (_event, dirPath: string) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    await shell.openPath(dirPath);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('system:upload-skin-file', async (_event, filePath: string) => {
  try {
    if (!filePath || typeof filePath !== 'string' || path.extname(filePath).toLowerCase() !== '.png') {
      throw new Error('Geçersiz dosya türü. Sadece PNG dosyaları yüklenebilir.');
    }
    if (!fs.existsSync(filePath)) {
      throw new Error('Dosya bulunamadı.');
    }
    const gameDir = resolveGameDir(backendSettings.launcherDir);
    const skinsDir = path.join(gameDir, 'skins');
    fs.mkdirSync(skinsDir, { recursive: true });
    const destPath = path.join(skinsDir, 'active_skin.png');
    fs.copyFileSync(filePath, destPath);
    
    // Read base64 to return for preview
    const base64 = fs.readFileSync(destPath).toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;
    
    return { success: true, path: destPath, dataUrl };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('profile:export', async (_event, settingsPayload: any) => {
  try {
    const result = await dialog.showSaveDialog({
      title: 'Profili Dışa Aktar',
      defaultPath: 'marinmc-profile.lcpack',
      filters: [
        { name: 'MarinMC Profile Pack (*.lcpack)', extensions: ['lcpack'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Cancelled' };
    }

    fs.writeFileSync(result.filePath, JSON.stringify(settingsPayload, null, 2), 'utf-8');
    return { success: true, filePath: result.filePath };
  } catch (err: any) {
    console.error('Error exporting profile:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('profile:import', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Profili İçe Aktar',
      filters: [
        { name: 'MarinMC Profile Pack (*.lcpack)', extensions: ['lcpack'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Cancelled' };
    }

    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    const parsed = JSON.parse(content);
    return { success: true, settings: parsed };
  } catch (err: any) {
    console.error('Error importing profile:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('profile:clone', async (_event, sourceDir: string, destDir: string) => {
  try {
    if (!sourceDir || !destDir) {
      throw new Error('Geçersiz kaynak veya hedef dizini.');
    }
    
    const resolvedSource = resolveGameDir(sourceDir);
    const resolvedDest = resolveGameDir(destDir);
    
    if (!fs.existsSync(resolvedSource)) {
      fs.mkdirSync(resolvedDest, { recursive: true });
      return { success: true };
    }

    fs.mkdirSync(resolvedDest, { recursive: true });
    
    if (typeof fs.cpSync === 'function') {
      fs.cpSync(resolvedSource, resolvedDest, { recursive: true, force: true });
    } else {
      const copyRecursive = (src: string, dest: string) => {
        const exists = fs.existsSync(src);
        const stats = exists && fs.statSync(src);
        const isDirectory = exists && stats && stats.isDirectory();
        if (isDirectory) {
          if (!fs.existsSync(dest)) fs.mkdirSync(dest);
          fs.readdirSync(src).forEach((childItemName) => {
            copyRecursive(path.join(src, childItemName), path.join(dest, childItemName));
          });
        } else {
          fs.copyFileSync(src, dest);
        }
      };
      copyRecursive(resolvedSource, resolvedDest);
    }
    
    return { success: true };
  } catch (err: any) {
    console.error('Error cloning profile directory:', err);
    return { success: false, error: err.message };
  }
});

