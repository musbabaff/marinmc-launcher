import { ipcMain, BrowserWindow, app } from 'electron';
import { Client, Authenticator } from 'minecraft-launcher-core';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { discordRPC } from '../discord.js';
import { backendSettings } from '../settings.js';

export function getSmartJvmArgs(allocatedRamMb: number): string[] {
  const args: string[] = [];

  // 1. Choose optimal Garbage Collector
  if (allocatedRamMb >= 4096) {
    args.push('-XX:+UseG1GC');
    args.push('-XX:MaxGCPauseMillis=50');
    args.push('-XX:G1HeapRegionSize=32m');
    args.push('-XX:G1ReservePercent=20');
    args.push('-XX:G1NewSizePercent=30');
    args.push('-XX:G1MaxNewSizePercent=40');
    args.push('-XX:G1MixedGCCountTarget=8');
    args.push('-XX:InitiatingHeapOccupancyPercent=15');
    args.push('-XX:G1MixedGCLiveThresholdPercent=90');
    args.push('-XX:G1RSetUpdatingPauseTimePercent=5');
    args.push('-XX:SurvivorRatio=32');
  } else {
    args.push('-XX:+UseParallelGC');
    args.push('-XX:MaxGCPauseMillis=100');
  }

  // 2. Thread allocations based on CPU Core Count
  const cpuCores = os.cpus() ? os.cpus().length : 1;
  if (cpuCores > 1) {
    const gcThreads = Math.max(2, Math.min(cpuCores, 8));
    args.push(`-XX:ParallelGCThreads=${gcThreads}`);
    
    if (allocatedRamMb >= 4096) {
      const concThreads = Math.max(1, Math.floor(gcThreads / 4));
      args.push(`-XX:ConcGCThreads=${concThreads}`);
    }
  }

  // 3. Experimental & general JVM flags for performance
  args.push('-XX:+UnlockExperimentalVMOptions');
  args.push('-XX:+ParallelRefProcEnabled');
  args.push('-XX:+DisableExplicitGC');
  args.push('-XX:+AlwaysPreTouch');
  args.push('-XX:+UseNUMA');
  args.push('-XX:+UseStringDeduplication');
  args.push('-Dsun.rmi.dgc.server.gcInterval=3600000');
  args.push('-Dsun.rmi.dgc.client.gcInterval=3600000');

  return args;
}

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
    uuid?: string;
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
      // If access token is provided, construct premium auth, else use offline cracked mode
      const auth = (options.accessToken && options.accessToken.trim() !== '')
        ? {
            access_token: options.accessToken,
            client_token: 'marinmc-launcher',
            uuid: options.uuid || options.username,
            name: options.username,
            user_properties: '{}'
          }
        : Authenticator.getAuth(options.username);

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

      // Resolve JVM arguments (Smart Optimization vs Custom Only)
      let customArgsList: string[] = [];
      if (options.jvmArgs) {
        customArgsList = options.jvmArgs.split(' ').filter(Boolean);
      }

      if (backendSettings.smartJvmOpt) {
        const smartArgs = getSmartJvmArgs(options.ram);
        const customKeys = new Set(customArgsList.map(arg => arg.split('=')[0]));
        const uniqueSmartArgs = smartArgs.filter(arg => !customKeys.has(arg.split('=')[0]));
        launchOptions.customArgs = [...uniqueSmartArgs, ...customArgsList];
        
        mainWindow.webContents.send('game:log',
          `[MarinMC Launcher] Akıllı JVM optimizasyonu uygulandı.`);
      } else {
        launchOptions.customArgs = customArgsList;
      }

      // Set Discord activity: Launching game...
      if (backendSettings.discordRpcEnabled) {
        const details = backendSettings.language === 'tr' ? 'Oyuna Bağlanıyor...' : 'Connecting to game...';
        const state = backendSettings.language === 'tr' ? `Minecraft ${options.version || '1.21'} Başlatılıyor` : `Launching Minecraft ${options.version || '1.21'}`;
        discordRPC.setActivity(details, state, options.serverId);
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

        if (backendSettings.discordRpcEnabled) {
          const details = backendSettings.language === 'tr' ? 'Başlatıcıda' : 'In Launcher';
          const state = backendSettings.language === 'tr' ? 'Ana Menü' : 'Main Menu';
          discordRPC.setActivity(details, state);
        }

        if (code !== 0 && code !== null) {
          mainWindow.webContents.send('game-crash', {
            exitCode: code,
            crashLogPath: path.join(gameDir, 'crash-reports')
          });
        }
      });

      // Launch Minecraft
      mainWindow.webContents.send('game:log',
        `[MarinMC Launcher] minecraft-launcher-core ile başlatılıyor...`);

      gameProcess = await launcher.launch(launchOptions);

      // Update Discord status to: Playing on MarinMC [ServerName]
      if (backendSettings.discordRpcEnabled) {
        const details = backendSettings.language === 'tr' ? 'Oyunda' : 'Playing';
        const serverName = options.serverId ? options.serverId.toUpperCase() : 'SURVIVAL';
        const state = `MarinMC: ${serverName}`;
        discordRPC.setActivity(details, state, options.serverId, Date.now());
      }

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

    if (backendSettings.discordRpcEnabled) {
      const details = backendSettings.language === 'tr' ? 'Başlatıcıda' : 'In Launcher';
      const state = backendSettings.language === 'tr' ? 'Ana Menü' : 'Main Menu';
      discordRPC.setActivity(details, state);
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
