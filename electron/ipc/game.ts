import { ipcMain, BrowserWindow, app } from 'electron';
import { Client, Authenticator } from 'minecraft-launcher-core';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import axios from 'axios';
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

const PERFORMANCE_MODS = [
  {
    name: 'Fabric API',
    filename: 'fabric-api-0.100.0+1.21.8.jar',
    url: 'https://cdn.marinmc.com/mods/fabric-api-0.100.0+1.21.8.jar',
    md5: 'a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8'
  },
  {
    name: 'Sodium',
    filename: 'sodium-fabric-0.6.0+1.21.8.jar',
    url: 'https://cdn.marinmc.com/mods/sodium-fabric-0.6.0+1.21.8.jar',
    md5: 'b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9'
  },
  {
    name: 'Iris Shaders',
    filename: 'iris-1.8.0+1.21.8.jar',
    url: 'https://cdn.marinmc.com/mods/iris-1.8.0+1.21.8.jar',
    md5: 'c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0'
  },
  {
    name: 'Lithium',
    filename: 'lithium-fabric-0.12.0+1.21.8.jar',
    url: 'https://cdn.marinmc.com/mods/lithium-fabric-0.12.0+1.21.8.jar',
    md5: 'd6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1'
  },
  {
    name: 'Reese\'s Sodium Options',
    filename: 'reeses-sodium-options-1.7.2+1.21.8.jar',
    url: 'https://cdn.marinmc.com/mods/reeses-sodium-options-1.7.2+1.21.8.jar',
    md5: 'e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2'
  },
  {
    name: 'Sodium Extra',
    filename: 'sodium-extra-0.5.4+1.21.8.jar',
    url: 'https://cdn.marinmc.com/mods/sodium-extra-0.5.4+1.21.8.jar',
    md5: 'f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3'
  },
  {
    name: 'MarinMC Client Mod',
    filename: 'marinmc-client-mod-1.0.0.jar',
    url: 'https://cdn.marinmc.com/mods/marinmc-client-mod-1.0.0.jar',
    md5: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'
  }
];

function calculateMD5(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', err => reject(err));
  });
}

function cleanDuplicateMods(modsDir: string, logCallback: (msg: string) => void) {
  if (!fs.existsSync(modsDir)) return;
  try {
    const files = fs.readdirSync(modsDir);
    const prefixes = [
      { key: 'fabric-api', target: 'fabric-api-0.100.0+1.21.8.jar' },
      { key: 'sodium-fabric', target: 'sodium-fabric-0.6.0+1.21.8.jar' },
      { key: 'iris', target: 'iris-1.8.0+1.21.8.jar' },
      { key: 'lithium', target: 'lithium-fabric-0.12.0+1.21.8.jar' },
      { key: 'reeses-sodium-options', target: 'reeses-sodium-options-1.7.2+1.21.8.jar' },
      { key: 'sodium-extra', target: 'sodium-extra-0.5.4+1.21.8.jar' },
      { key: 'marinmc-client-mod', target: 'marinmc-client-mod-1.0.0.jar' }
    ];

    for (const file of files) {
      if (!file.endsWith('.jar')) continue;
      
      for (const prefix of prefixes) {
        if (file.toLowerCase().startsWith(prefix.key) && file !== prefix.target) {
          const dupPath = path.join(modsDir, file);
          try {
            fs.unlinkSync(dupPath);
            logCallback(`[MarinMC Launcher] Çakışan eski mod silindi: ${file}`);
          } catch (err: any) {
            console.error(`Failed to delete duplicate mod ${file}:`, err.message);
          }
        }
      }
    }
  } catch (err: any) {
    console.error('Error during mod cleanup:', err.message);
  }
}

async function verifyPerformanceMods(gameDir: string, logCallback: (msg: string) => void): Promise<void> {
  const modsDir = path.join(gameDir, 'mods');
  if (!fs.existsSync(modsDir)) {
    fs.mkdirSync(modsDir, { recursive: true });
  }

  // Clean duplicate essential mods first to prevent Fabric loading failures
  cleanDuplicateMods(modsDir, logCallback);

  logCallback(`[MarinMC Launcher] Optimizasyon modları kontrol ediliyor...`);

  for (const mod of PERFORMANCE_MODS) {
    const modPath = path.join(modsDir, mod.filename);
    let needDownload = true;

    if (fs.existsSync(modPath)) {
      try {
        const fileHash = await calculateMD5(modPath);
        if (fileHash === mod.md5) {
          logCallback(`[MarinMC Launcher] Doğrulandı (Bütünlük OK): ${mod.name}`);
          needDownload = false;
        } else {
          logCallback(`[MarinMC Launcher] Bütünlük hatası: ${mod.name} (MD5 uyuşmadı, tekrar indiriliyor).`);
        }
      } catch (hashErr: any) {
        logCallback(`[UYARI] Mod bütünlüğü doğrulanamadı (${mod.name}): ${hashErr.message}`);
      }
    }

    if (needDownload) {
      logCallback(`[MarinMC Launcher] Mod indiriliyor: ${mod.name}...`);
      try {
        const response = await axios({
          method: 'get',
          url: mod.url,
          responseType: 'stream',
          timeout: 20000
        });

        const writer = fs.createWriteStream(modPath);
        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        logCallback(`[MarinMC Launcher] Başarıyla indirildi: ${mod.name}`);
      } catch (err: any) {
        console.error(`Failed to download mod ${mod.name}:`, err.message);
        logCallback(`[UYARI] ${mod.name} indirilemedi (offline/hata): ${err.message}. Devam ediliyor.`);
      }
    }
  }
}

async function downloadResourcePack(gameDir: string, logCallback: (msg: string) => void): Promise<void> {
  const resourcePacksDir = path.join(gameDir, 'resourcepacks');
  if (!fs.existsSync(resourcePacksDir)) {
    fs.mkdirSync(resourcePacksDir, { recursive: true });
  }
  const packPath = path.join(resourcePacksDir, 'programmatic_marinmc_pack.zip');
  const url = 'https://cdn.marinmc.com/resourcepacks/marinmc_pack.zip';

  logCallback(`[MarinMC Launcher] Server kaynak paketi indiriliyor...`);
  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      timeout: 20000
    });

    const writer = fs.createWriteStream(packPath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    logCallback(`[MarinMC Launcher] Server kaynak paketi başarıyla indirildi.`);
  } catch (err: any) {
    console.error('Failed to download resource pack:', err.message);
    logCallback(`[UYARI] Sunucu kaynak paketi indirilemedi: ${err.message}. Devam ediliyor.`);
  }
}

function injectResourcePack(gameDir: string, logCallback: (msg: string) => void) {
  try {
    const optionsPath = path.join(gameDir, 'options.txt');
    let content = '';
    if (fs.existsSync(optionsPath)) {
      content = fs.readFileSync(optionsPath, 'utf8');
    }

    const targetLine = 'resourcePacks:["vanilla","programmatic_marinmc_pack.zip"]';
    let updated = false;
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('resourcePacks:')) {
        lines[i] = targetLine;
        updated = true;
        break;
      }
    }

    if (!updated) {
      lines.push(targetLine);
    }

    fs.writeFileSync(optionsPath, lines.join('\n'), 'utf8');
    logCallback(`[MarinMC Launcher] options.txt güncellendi (Kaynak paketi aktif edildi).`);
  } catch (err: any) {
    console.error('Failed to inject resource pack options:', err.message);
    logCallback(`[HATA] options.txt dosyasına kaynak paketi enjekte edilemedi: ${err.message}`);
  }
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
        `[MarinMC Launcher] Senkronizasyon aşaması başlatıldı (Fabric 1.21.8).`);

      // 1. Verify performance mods
      await verifyPerformanceMods(gameDir, (msg) => {
        mainWindow.webContents.send('game:log', msg);
      });

      // 2. Download resource pack
      await downloadResourcePack(gameDir, (msg) => {
        mainWindow.webContents.send('game:log', msg);
      });

      // 3. Inject resource pack
      injectResourcePack(gameDir, (msg) => {
        mainWindow.webContents.send('game:log', msg);
      });

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
      launcher.on('arguments', (args: any) => {
        mainWindow.webContents.send('game:log',
          `[MarinMC Launcher] Java başlatma argümanları hazırlandı.`);
        
        // Enforce direct server connection arguments in args array
        if (Array.isArray(args)) {
          if (!args.includes('--server')) {
            args.push('--server', 'oyna.marinmc.com');
          }
          if (!args.includes('--port')) {
            args.push('--port', '25565');
          }
        }
        
        mainWindow.webContents.send('game:log',
          `[MarinMC Launcher] Sunucu bağlantı parametreleri (oyna.marinmc.com:25565) doğrulanıp eklendi.`);
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
