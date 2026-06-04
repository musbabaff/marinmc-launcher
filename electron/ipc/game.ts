import { ipcMain, BrowserWindow, app } from 'electron';
import { Client, Authenticator } from 'minecraft-launcher-core';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export function resolveGameDir(customDir?: string): string {
  if (customDir && customDir.trim() !== '') {
    return customDir;
  }

  // Try Electron's userData first (most reliable)
  try {
    const userData = app.getPath('userData');
    if (userData && !userData.includes('\\Default\\')) {
      return path.join(userData, 'game');
    }
  } catch {}

  // Fallback 1: APPDATA environment variable
  if (process.env.APPDATA && !process.env.APPDATA.includes('\\Default\\')) {
    return path.join(process.env.APPDATA, '.marinmc');
  }

  // Fallback 2: USERPROFILE environment variable
  if (process.env.USERPROFILE && !process.env.USERPROFILE.includes('\\Default')) {
    return path.join(process.env.USERPROFILE, 'AppData', 'Roaming', '.marinmc');
  }

  // Fallback 3: os.homedir()
  const home = os.homedir();
  return path.join(home, '.marinmc');
}

let gameProcess: any = null;

export function registerGameHandlers(mainWindow: BrowserWindow) {

  ipcMain.handle('game:launch', async (_event, options: {
    ram: number;
    jvmArgs: string;
    username: string;
    accessToken?: string;
    version: string;
    serverId: string;
    gameDir: string;
    javaPath?: string;
  }) => {
    if (gameProcess) {
      return { success: false, error: 'Minecraft zaten çalışıyor.' };
    }

    try {
      const launcher = new Client();

      // Determine game directory
      const gameDir = resolveGameDir(options.gameDir);

      console.log('[game.ts] Using game directory:', gameDir);

      // Ensure game directory exists
      try {
        fs.mkdirSync(gameDir, { recursive: true });
      } catch (mkdirErr: any) {
        throw new Error(
          `Oyun klasörü oluşturulamadı: ${gameDir}\n` +
          `Lütfen Ayarlar'dan farklı bir klasör seçin.\n` +
          `Hata: ${mkdirErr.message}`
        );
      }

      mainWindow.webContents.send('game:log',
        `[MarinMC Launcher] Oyun başlatma motoru hazırlandı.`);
      mainWindow.webContents.send('game:log',
        `[MarinMC Launcher] Seçilen Sunucu: ${(options.serverId || 'survival').toUpperCase()}`);
      mainWindow.webContents.send('game:log',
        `[MarinMC Launcher] Oyuncu: ${options.username}`);
      mainWindow.webContents.send('game:log',
        `[MarinMC Launcher] Bellek Limiti: -Xmx${options.ram}M -Xms512M`);
      mainWindow.webContents.send('game:log',
        `[MarinMC Launcher] Oyun Dizin: ${gameDir}`);
      mainWindow.webContents.send('game:log',
        `[MarinMC Launcher] Minecraft sürümü: ${options.version || '1.21'}`);

      // Build authorization
      // For cracked/offline mode, use offline auth
      const auth = Authenticator.getAuth(options.username);

      const javaPathResolved = (options.javaPath && options.javaPath !== 'Bundled Java')
        ? options.javaPath
        : 'java';

      const launchOptions: any = {
        authorization: auth,
        root: gameDir,
        version: {
          number: options.version || '1.21',
          type: 'release'
        },
        memory: {
          max: `${options.ram || 4096}M`,
          min: '512M'
        },
        javaPath: javaPathResolved,
        server: {
          host: 'oyna.marinmc.com',
          port: '25565'
        },
        window: {
          width: 925,
          height: 530
        }
      };

      // Add custom JVM arguments if provided
      if (options.jvmArgs) {
        launchOptions.customArgs = options.jvmArgs.split(' ').filter(Boolean);
      }

      // Status: CHECKING
      mainWindow.webContents.send('game:status', 'CHECKING');
      mainWindow.webContents.send('game:log',
        `[MarinMC Launcher] Dosyalar kontrol ediliyor...`);

      // Listen for debug logs from the launcher
      launcher.on('debug', (e: any) => {
        console.log('[MLCORE:debug]', e);
        mainWindow.webContents.send('game:log', `[debug] ${e}`);
      });

      // Listen for stdout data from the Java process
      launcher.on('data', (e: any) => {
        mainWindow.webContents.send('game:log', String(e));
      });

      // Listen for download progress events
      launcher.on('progress', (e: any) => {
        const percent = e.total > 0 ? Math.round((e.task / e.total) * 100) : 0;
        mainWindow.webContents.send('game:progress', percent);
        mainWindow.webContents.send('game:status', 'DOWNLOADING');
        mainWindow.webContents.send('game:log',
          `[MarinMC Launcher] İndiriliyor: ${e.type} (${e.task}/${e.total})`);
      });

      // Listen for download status changes
      launcher.on('download-status', (e: any) => {
        mainWindow.webContents.send('game:log',
          `[MarinMC Launcher] İndirme durumu: ${JSON.stringify(e)}`);
      });

      // Listen for arguments (logged right before launch)
      launcher.on('arguments', (e: any) => {
        mainWindow.webContents.send('game:log',
          `[MarinMC Launcher] Java başlatma argümanları hazırlandı.`);
        mainWindow.webContents.send('game:status', 'LAUNCHING');
      });

      // Listen for close event
      launcher.on('close', (code: number) => {
        console.log('[game.ts] Minecraft process exited with code:', code);
        gameProcess = null;
        mainWindow.webContents.send('game:status', 'IDLE');
        mainWindow.webContents.send('game:log',
          `[MarinMC Launcher] Minecraft kapandı (çıkış kodu: ${code}).`);
        mainWindow.webContents.send('game:progress', 0);
      });

      // Launch Minecraft
      mainWindow.webContents.send('game:log',
        `[MarinMC Launcher] minecraft-launcher-core ile başlatılıyor...`);

      gameProcess = await launcher.launch(launchOptions);

      // The launch() resolves when the Java process is spawned
      mainWindow.webContents.send('game:status', 'RUNNING');
      mainWindow.webContents.send('game:log',
        `[MarinMC Launcher] Java Sanal Makinesi (JVM) aktif edildi. Minecraft başlatıldı.`);

      return { success: true };

    } catch (error: any) {
      console.error('[game.ts] Launch error:', error);
      gameProcess = null;
      mainWindow.webContents.send('game:status', 'ERROR');
      mainWindow.webContents.send('game:log',
        `[HATA] Oyun başlatılamadı: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('game:stop', async () => {
    if (gameProcess) {
      try {
        gameProcess.kill();
      } catch (err) {
        console.error('[game.ts] Error killing game process:', err);
      }
      gameProcess = null;
    }

    mainWindow.webContents.send('game:status', 'IDLE');
    mainWindow.webContents.send('game:log',
      '[MarinMC Launcher] Java süreci sonlandırıldı. Minecraft kapatıldı.');
    mainWindow.webContents.send('game:progress', 0);
    return { success: true };
  });

  ipcMain.handle('game-is-running', () => {
    return { running: gameProcess !== null };
  });

  ipcMain.handle('detect-java', async () => {
    const { exec } = require('child_process');
    return new Promise<{ found: boolean; version: string | null }>((resolve) => {
      exec('java -version', (error: any, _stdout: any, stderr: any) => {
        if (error) {
          console.log('[game.ts] Java not found:', error.message);
          resolve({ found: false, version: null });
        } else {
          const versionOutput = (stderr || _stdout || '').trim();
          console.log('[game.ts] Java found:', versionOutput);
          resolve({ found: true, version: versionOutput });
        }
      });
    });
  });
}
