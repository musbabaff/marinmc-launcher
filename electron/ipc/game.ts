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

  // UnlockExperimentalVMOptions MUST precede any experimental flags (like G1NewSizePercent)
  args.push('-XX:+UnlockExperimentalVMOptions');

  // 1. Choose optimal Garbage Collector (G1GC is used always to prevent conflict with MCLC default args)
  args.push('-XX:+UseG1GC');
  args.push('-XX:MaxGCPauseMillis=50');

  if (allocatedRamMb >= 4096) {
    args.push('-XX:G1HeapRegionSize=32m');
    args.push('-XX:G1ReservePercent=20');
    args.push('-XX:G1NewSizePercent=30');
    args.push('-XX:G1MaxNewSizePercent=40');
    args.push('-XX:G1MixedGCCountTarget=8');
    args.push('-XX:InitiatingHeapOccupancyPercent=15');
    args.push('-XX:G1MixedGCLiveThresholdPercent=90');
    args.push('-XX:G1RSetUpdatingPauseTimePercent=5');
    args.push('-XX:SurvivorRatio=32');
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
    filename: 'fabric-api-0.136.1+1.21.8.jar',
    url: 'https://cdn.modrinth.com/data/P7dR8mSH/versions/g58ofrov/fabric-api-0.136.1%2B1.21.8.jar',
    md5: '85d76d57a7b5bb7043ea815133d2f6ba'
  },
  {
    name: 'Sodium',
    filename: 'sodium-fabric-0.7.3+mc1.21.8.jar',
    url: 'https://cdn.modrinth.com/data/AANobbMI/versions/7pwil2dy/sodium-fabric-0.7.3%2Bmc1.21.8.jar',
    md5: '2e38db8afdf3a8d319658780b7f45501'
  },
  {
    name: 'Iris Shaders',
    filename: 'iris-fabric-1.9.6+mc1.21.8.jar',
    url: 'https://cdn.modrinth.com/data/YL57xq9U/versions/Rhzf61g1/iris-fabric-1.9.6%2Bmc1.21.8.jar',
    md5: '64fdd8ffe47175923a1cfb6b0617867d'
  },
  {
    name: 'Lithium',
    filename: 'lithium-fabric-0.18.1+mc1.21.8.jar',
    url: 'https://cdn.modrinth.com/data/gvQqBUqZ/versions/qxIL7Kb8/lithium-fabric-0.18.1%2Bmc1.21.8.jar',
    md5: '7852499e964ca766501bd2c6f5a14f22'
  },
  {
    name: 'Reese\'s Sodium Options',
    filename: 'reeses-sodium-options-fabric-1.8.4+mc1.21.6.jar',
    url: 'https://cdn.modrinth.com/data/Bh37bMuy/versions/AgGRyydH/reeses-sodium-options-fabric-1.8.4%2Bmc1.21.6.jar',
    md5: '6256d2626c3a7252c681bdd7c992db46'
  },
  {
    name: 'Sodium Extra',
    filename: 'sodium-extra-fabric-0.7.0+mc1.21.8.jar',
    url: 'https://cdn.modrinth.com/data/PtjYWJkn/versions/Of25zuEG/sodium-extra-fabric-0.7.0%2Bmc1.21.8.jar',
    md5: 'b5ac5b552279a9adb2d99cbfe7d1edef'
  },
  {
    name: 'MarinMC Client Mod',
    filename: 'marinmc-client-mod-1.0.0.jar',
    url: 'https://raw.githubusercontent.com/musbabaff/marinmc-launcher/main/assets/marinmc-client-mod-1.0.0.jar',
    md5: 'e86e80391af4b0adc228d0cff7908aa1'
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
      { key: 'fabric-api', target: 'fabric-api-0.136.1+1.21.8.jar' },
      { key: 'sodium-fabric', target: 'sodium-fabric-0.7.3+mc1.21.8.jar' },
      { key: 'iris', target: 'iris-fabric-1.9.6+mc1.21.8.jar' },
      { key: 'lithium', target: 'lithium-fabric-0.18.1+mc1.21.8.jar' },
      { key: 'reeses-sodium-options', target: 'reeses-sodium-options-fabric-1.8.4+mc1.21.6.jar' },
      { key: 'sodium-extra', target: 'sodium-extra-fabric-0.7.0+mc1.21.8.jar' },
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

async function compileAndCopyClientModDev(gameDir: string, logCallback: (msg: string) => void): Promise<void> {
  if (app.isPackaged) return;

  logCallback(`[MarinMC Launcher] [GELİŞTİRİCİ] Yerel istemci modu otomatik derleniyor...`);
  
  const modProjectDir = path.resolve(process.cwd(), 'marinmc-client-mod');
  const gradlewBat = path.join(modProjectDir, 'gradlew.bat');
  const compiledJarPath = path.join(modProjectDir, 'build', 'libs', 'marinmc-client-mod-1.0.0.jar');
  const destinationJarPath = path.join(gameDir, 'mods', 'marinmc-client-mod-1.0.0.jar');

  if (!fs.existsSync(gradlewBat)) {
    logCallback(`[HATA] gradlew.bat bulunamadı: ${gradlewBat}. Derleme atlanıyor.`);
    return;
  }

  const { exec } = require('child_process');
  const compilePromise = new Promise<void>((resolve, reject) => {
    const proc = exec('gradlew.bat build -x test', { cwd: modProjectDir });
    
    proc.stdout.on('data', (data: any) => {
      const text = String(data).trim();
      if (text) {
        logCallback(`[Gradle] ${text}`);
      }
    });

    proc.stderr.on('data', (data: any) => {
      const text = String(data).trim();
      if (text) {
        logCallback(`[Gradle Hata] ${text}`);
      }
    });

    proc.on('close', (code: number) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Gradle derleme hatası (çıkış kodu: ${code})`));
      }
    });
  });

  try {
    await compilePromise;
    logCallback(`[MarinMC Launcher] [GELİŞTİRİCİ] Derleme başarılı. Dosya kopyalanıyor...`);
    
    const modsDir = path.join(gameDir, 'mods');
    if (!fs.existsSync(modsDir)) {
      fs.mkdirSync(modsDir, { recursive: true });
    }

    if (fs.existsSync(compiledJarPath)) {
      fs.copyFileSync(compiledJarPath, destinationJarPath);
      logCallback(`[MarinMC Launcher] [GELİŞTİRİCİ] Mod başarıyla güncellendi: ${destinationJarPath}`);
    } else {
      logCallback(`[HATA] Derlenmiş mod dosyası bulunamadı: ${compiledJarPath}`);
    }
  } catch (err: any) {
    logCallback(`[HATA] İstemci modu derlenirken hata oluştu: ${err.message}`);
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
        } else if (!app.isPackaged && mod.name === 'MarinMC Client Mod') {
          logCallback(`[MarinMC Launcher] [GELİŞTİRİCİ] Yerel özel mod algılandı ve korundu: ${mod.name}`);
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
      
      const downloadFile = async (downloadUrl: string) => {
        const response = await axios({
          method: 'get',
          url: downloadUrl,
          responseType: 'stream',
          timeout: 25000
        });
        const writer = fs.createWriteStream(modPath);
        response.data.pipe(writer);
        return new Promise<void>((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
      };

      let success = false;
      let downloadError: any = null;

      try {
        await downloadFile(mod.url);
        success = true;
        logCallback(`[MarinMC Launcher] Başarıyla indirildi: ${mod.name}`);
      } catch (err: any) {
        downloadError = err;
        console.error(`Failed to download mod ${mod.name} from URL:`, err.message);
      }

      if (!success) {
        logCallback(`[UYARI] ${mod.name} indirilemedi (offline/hata): ${downloadError?.message || 'Bilinmeyen Hata'}. Devam ediliyor.`);
      }
    }
  }
}

async function downloadResourcePack(gameDir: string, logCallback: (msg: string) => void): Promise<void> {
  // Bypassed to prevent DNS name resolution error timeouts on cdn.marinmc.com
  logCallback(`[MarinMC Launcher] Sunucu kaynak paketi indirme işlemi atlandı (çevrimdışı mod).`);
  return;
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

function parseCrashLogs(logs: string[]): {
  suspectedMod?: string;
  suspectedFilename?: string;
  crashDetails: string;
} {
  const logsText = logs.join('\n');
  
  let suspectedMod = 'Unknown / System';
  let suspectedFilename = 'Java/Minecraft Crash';
  
  if (logsText.includes('VM option') || logsText.includes('Java Virtual Machine') || logsText.includes('unlock option') || logsText.includes('unlocking')) {
    suspectedMod = 'JVM / Java Settings';
    suspectedFilename = 'JVM Configuration Error';
    const errorLines = logs.filter(line => 
      line.toLowerCase().includes('error:') || 
      line.toLowerCase().includes('vm option') || 
      line.toLowerCase().includes('unlock option') ||
      line.toLowerCase().includes('unlocking')
    );
    const details = errorLines.length > 0 ? errorLines.join('\n') : 'Java Virtual Machine failed to start. Check JVM arguments.';
    return { suspectedMod, suspectedFilename, crashDetails: details };
  }
  
  if (logsText.includes('org.spongepowered.asm') || logsText.includes('mixin') || logsText.includes('FabricLoader') || logsText.includes('fabric-loader')) {
    const jarMatch = logsText.match(/([a-zA-Z0-9_-]+\.jar)/);
    if (jarMatch && jarMatch[1]) {
      suspectedFilename = jarMatch[1];
      suspectedMod = suspectedFilename
        .replace(/\.jar$/, '')
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    } else {
      suspectedMod = 'Fabric Loader / Mixin';
      suspectedFilename = 'Mod Conflict or Incompatibility';
    }
    
    const crashDetails = logs.slice(-6).join('\n');
    return { suspectedMod, suspectedFilename, crashDetails };
  }

  if (logsText.includes('java.lang.OutOfMemoryError') || logsText.includes('OutOfMemory')) {
    suspectedMod = 'Out of Memory';
    suspectedFilename = 'Insufficient allocated RAM';
    return {
      suspectedMod,
      suspectedFilename,
      crashDetails: 'Minecraft run out of memory. Please allocate more RAM in launcher settings.'
    };
  }

  if (logsText.includes('org.lwjgl.LWJGLException') || logsText.includes('Pixel format not accelerated') || logsText.includes('GLFW error 65542')) {
    suspectedMod = 'Graphics Driver';
    suspectedFilename = 'OpenGL / GLFW Error';
    return {
      suspectedMod,
      suspectedFilename,
      crashDetails: 'Failed to initialize graphics. Please update your GPU drivers.'
    };
  }

  const last15Lines = logs.slice(-15);
  for (let i = last15Lines.length - 1; i >= 0; i--) {
    const line = last15Lines[i];
    if (line.includes('Exception in thread') || line.includes('Caused by:') || line.includes('java.lang.')) {
      suspectedMod = 'Java Exception';
      suspectedFilename = line.split(':')[0] || 'Minecraft Crash';
      return {
        suspectedMod,
        suspectedFilename,
        crashDetails: last15Lines.slice(Math.max(0, i - 1), i + 6).join('\n')
      };
    }
  }

  return {
    suspectedMod: 'Unknown / Client',
    suspectedFilename: 'Minecraft Crash',
    crashDetails: logs.slice(-8).join('\n') || 'Oyun beklenmedik şekilde kapandı (Çıkış kodu: 1).'
  };
}

function isValidUUID(uuidStr?: string): boolean {
  if (!uuidStr) return false;
  return /^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$/.test(uuidStr);
}

let gameProcess: any = null;

export function registerGameHandlers(mainWindow: BrowserWindow) {

  ipcMain.handle('game:launch', async (_event, options: {
    ram: number;
    jvmArgs: string;
    username: string;
    accessToken?: string;
    uuid?: string;
    userType?: 'cracked' | 'ms';
    version: string;
    serverId: string;
    gameDir: string;
    javaPath?: string;
    resolutionWidth?: number;
    resolutionHeight?: number;
    fullscreen?: boolean;
    cosmetics?: {
      skinType: 'file' | 'username';
      capeUrl: string;
    };
  }) => {
    if (gameProcess) {
      return { success: false, error: 'Minecraft zaten çalışıyor.' };
    }

    const logBuffer: string[] = [];
    const logLimit = 150;
    const gameDir = resolveGameDir(options.gameDir);
    const launcherLogDir = path.join(gameDir, 'logs');
    
    try {
      fs.mkdirSync(launcherLogDir, { recursive: true });
    } catch {}
    
    const launcherLogFile = path.join(launcherLogDir, 'launcher-latest.log');
    try {
      fs.writeFileSync(launcherLogFile, ''); // clear log
    } catch {}

    const appendToLauncherLog = (line: string) => {
      logBuffer.push(line);
      if (logBuffer.length > logLimit) {
        logBuffer.shift();
      }
      try {
        fs.appendFileSync(launcherLogFile, line + '\n');
      } catch (err) {
        console.error('Failed to write to launcher-latest.log:', err);
      }
    };

    const sendAndLog = (msg: string) => {
      mainWindow.webContents.send('game:log', msg);
      appendToLauncherLog(msg);
    };

    try {
      const launcher = new Client();

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

      sendAndLog(`[MarinMC Launcher] Senkronizasyon aşaması başlatıldı (Fabric 1.21.8).`);

      // Write cosmetics configuration
      const cosmeticsConfig = options.cosmetics || { skinType: 'username', capeUrl: '' };
      try {
        const configDir = path.join(gameDir, 'config');
        fs.mkdirSync(configDir, { recursive: true });
        const cosmeticsPath = path.join(configDir, 'marinmc-cosmetics.json');
        fs.writeFileSync(cosmeticsPath, JSON.stringify(cosmeticsConfig, null, 2), 'utf8');
        sendAndLog(`[MarinMC Launcher] Kozmetikler uygulandı (Cilt Tipi: ${cosmeticsConfig.skinType}, Pelerin: ${cosmeticsConfig.capeUrl || 'Yok'}).`);
      } catch (cosmErr: any) {
        console.error('Failed to write cosmetics config:', cosmErr);
        sendAndLog(`[UYARI] Kozmetik konfigürasyonu yazılamadı: ${cosmErr.message}`);
      }

      // Geliştirici modunda yerel istemci modunu derle ve kopyala
      if (!app.isPackaged) {
        await compileAndCopyClientModDev(gameDir, (msg) => {
          sendAndLog(msg);
        });
      }

      // 1. Verify performance mods
      await verifyPerformanceMods(gameDir, (msg) => {
        sendAndLog(msg);
      });

      // 2. Download resource pack
      await downloadResourcePack(gameDir, (msg) => {
        sendAndLog(msg);
      });

      // 3. Inject resource pack
      injectResourcePack(gameDir, (msg) => {
        sendAndLog(msg);
      });

      // Resolve Fabric Loader version if 1.21 or 1.21.8 is selected (or an old fabric-loader version of it)
      let versionToLaunch = options.version || '1.21';
      const is121Version = versionToLaunch === '1.21' || 
                            versionToLaunch === '1.21.8' || 
                            (versionToLaunch.startsWith('fabric-loader-') && (versionToLaunch.endsWith('-1.21.8') || versionToLaunch.endsWith('-1.21')));

      if (is121Version) {
        const gameVersion = '1.21.8';
        const loaderVersion = '0.19.3';
        const fabricVersionId = `fabric-loader-${loaderVersion}-${gameVersion}`;
        const fabricVersionDir = path.join(gameDir, 'versions', fabricVersionId);
        const fabricJsonPath = path.join(fabricVersionDir, `${fabricVersionId}.json`);

        if (!fs.existsSync(fabricJsonPath)) {
          sendAndLog(`[MarinMC Launcher] Fabric Loader 1.21.8 profili kuruluyor...`);
          try {
            fs.mkdirSync(fabricVersionDir, { recursive: true });
            const profileUrl = `https://meta.fabricmc.net/v2/versions/loader/${gameVersion}/${loaderVersion}/profile/json`;
            const profileRes = await axios.get(profileUrl, { timeout: 15000 });
            fs.writeFileSync(fabricJsonPath, JSON.stringify(profileRes.data, null, 2), 'utf8');
            sendAndLog(`[MarinMC Launcher] Fabric Loader profili başarıyla kuruldu.`);
          } catch (fabricErr: any) {
            console.error('Failed to download Fabric profile:', fabricErr.message);
            sendAndLog(`[HATA] Fabric Loader profili indirilemedi: ${fabricErr.message}. Vanilla olarak başlatmayı deniyor.`);
          }
        }

        if (fs.existsSync(fabricJsonPath)) {
          versionToLaunch = fabricVersionId;
        }
      }

      sendAndLog(`[MarinMC Launcher] Oyun başlatma motoru hazırlandı.`);
      sendAndLog(`[MarinMC Launcher] Seçilen Sunucu: ${(options.serverId || 'survival').toUpperCase()}`);
      sendAndLog(`[MarinMC Launcher] Oyuncu: ${options.username}`);
      sendAndLog(`[MarinMC Launcher] Bellek Limiti: -Xmx${options.ram}M -Xms512M`);
      sendAndLog(`[MarinMC Launcher] Oyun Dizin: ${gameDir}`);
      sendAndLog(`[MarinMC Launcher] Minecraft sürümü: ${versionToLaunch}`);

      // Build authorization
      const hasValidUuid = options.uuid && isValidUUID(options.uuid);
      const isOffline = options.userType === 'cracked' ||
                        !options.accessToken || 
                        options.accessToken.startsWith('offline_token_') || 
                        (options.uuid && options.uuid.startsWith('offline-')) ||
                        !hasValidUuid;

      const auth = !isOffline
        ? {
            access_token: options.accessToken,
            client_token: 'marinmc-launcher',
            uuid: options.uuid || options.username,
            name: options.username,
            user_properties: '{}'
          }
        : Authenticator.getAuth(options.username);

      let javaPathResolved = (options.javaPath && options.javaPath !== 'Bundled Java')
        ? options.javaPath
        : 'java';

      // Security check on custom javaPath
      if (javaPathResolved !== 'java') {
        const normalized = javaPathResolved.toLowerCase().trim();
        const base = path.basename(normalized);
        if (base !== 'java.exe' && base !== 'java' && base !== 'javaw.exe' && base !== 'javaw') {
          throw new Error('Geçersiz Java yürütülebilir dosyası. Seçilen dosya java veya java.exe olmalıdır.');
        }
        if (!fs.existsSync(javaPathResolved)) {
          throw new Error('Belirtilen Java yolu bulunamadı.');
        }
      }

      let customVersionName: string | undefined = undefined;
      let vanillaVersionNumber = versionToLaunch;

      if (versionToLaunch.startsWith('fabric-loader-')) {
        customVersionName = versionToLaunch;
        const parts = versionToLaunch.split('-');
        vanillaVersionNumber = parts[parts.length - 1]; // e.g., '1.21.8'
      }

      const launchOptions: any = {
        authorization: auth,
        root: gameDir,
        version: {
          number: vanillaVersionNumber,
          custom: customVersionName,
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
          width: options.resolutionWidth || 1280,
          height: options.resolutionHeight || 720,
          fullscreen: !!options.fullscreen
        }
      };

      // Resolve JVM arguments (Smart Optimization vs Custom Only)
      let customArgsList: string[] = [];
      if (options.jvmArgs) {
        customArgsList = options.jvmArgs.split(' ').filter(Boolean).filter(arg => {
          const lower = arg.toLowerCase();
          // Filter out dangerous flags that could execute commands or write arbitrary files
          return !lower.startsWith('-xx:onoutofmemoryerror') &&
                 !lower.startsWith('-xx:errorfile') &&
                 !lower.startsWith('-agentpath') &&
                 !lower.startsWith('-javaagent') &&
                 !lower.startsWith('-xrun');
        });
      }

      let finalArgs: string[] = [];
      if (backendSettings.smartJvmOpt) {
        const smartArgs = getSmartJvmArgs(options.ram);
        const customKeys = new Set(customArgsList.map(arg => arg.split('=')[0]));
        const uniqueSmartArgs = smartArgs.filter(arg => !customKeys.has(arg.split('=')[0]));
        finalArgs = [...uniqueSmartArgs, ...customArgsList];
        sendAndLog(`[MarinMC Launcher] Akıllı JVM optimizasyonu uygulandı.`);
      } else {
        finalArgs = customArgsList;
      }

      // ALWAYS ensure -XX:+UnlockExperimentalVMOptions is the very first argument to avoid JVM creation crashes
      const unlockFlag = '-XX:+UnlockExperimentalVMOptions';
      const cleanArgs = finalArgs.filter(arg => arg !== unlockFlag);
      launchOptions.customArgs = [unlockFlag, ...cleanArgs];

      // Set Discord activity: Launching game...
      if (backendSettings.discordRpcEnabled) {
        const details = backendSettings.language === 'tr' ? 'Oyuna Bağlanıyor...' : 'Connecting to game...';
        const state = backendSettings.language === 'tr' ? `Minecraft ${options.version || '1.21'} Başlatılıyor` : `Launching Minecraft ${options.version || '1.21'}`;
        discordRPC.setActivity(details, state, options.serverId);
      }

      // Status: CHECKING
      mainWindow.webContents.send('game:status', 'CHECKING');
      sendAndLog(`[MarinMC Launcher] Dosyalar kontrol ediliyor...`);

      // Listen for debug logs from the launcher
      launcher.on('debug', (e: any) => {
        console.log('[MLCORE:debug]', e);
        appendToLauncherLog(`[debug] ${e}`);
        mainWindow.webContents.send('game:log', `[debug] ${e}`);
      });

      // Listen for stdout data from the Java process
      launcher.on('data', (e: any) => {
        const line = String(e).trim();
        appendToLauncherLog(line);
        mainWindow.webContents.send('game:log', line);
      });

      // Listen for download progress events
      launcher.on('progress', (e: any) => {
        const percent = e.total > 0 ? Math.round((e.task / e.total) * 100) : 0;
        mainWindow.webContents.send('game:progress', percent);
        mainWindow.webContents.send('game:status', 'DOWNLOADING');
        sendAndLog(`[MarinMC Launcher] İndiriliyor: ${e.type} (${e.task}/${e.total})`);
      });

      // Listen for download status changes
      launcher.on('download-status', (e: any) => {
        sendAndLog(`[MarinMC Launcher] İndirme durumu: ${JSON.stringify(e)}`);
      });

      // Listen for arguments (logged right before launch)
      launcher.on('arguments', (args: any) => {
        sendAndLog(`[MarinMC Launcher] Java başlatma argümanları hazırlandı.`);
        if (Array.isArray(args)) {
          sendAndLog(`[MarinMC Launcher] JVM Arguments: ${args.filter(a => typeof a === 'string' && a.startsWith('-')).join(' ')}`);
        }
        
        // Enforce direct server connection arguments in args array
        if (Array.isArray(args)) {
          if (!args.includes('--server')) {
            args.push('--server', 'oyna.marinmc.com');
          }
          if (!args.includes('--port')) {
            args.push('--port', '25565');
          }
        }
        
        sendAndLog(`[MarinMC Launcher] Sunucu bağlantı parametreleri (oyna.marinmc.com:25565) doğrulanıp eklendi.`);
        mainWindow.webContents.send('game:status', 'LAUNCHING');
      });

      // Listen for close event
      launcher.on('close', (code: number) => {
        console.log('[game.ts] Minecraft process exited with code:', code);
        gameProcess = null;
        mainWindow.webContents.send('game:status', 'IDLE');
        sendAndLog(`[MarinMC Launcher] Minecraft kapandı (çıkış kodu: ${code}).`);
        mainWindow.webContents.send('game:progress', 0);

        if (backendSettings.discordRpcEnabled) {
          const details = backendSettings.language === 'tr' ? 'Başlatıcıda' : 'In Launcher';
          const state = backendSettings.language === 'tr' ? 'Ana Menü' : 'Main Menu';
          discordRPC.setActivity(details, state);
        }

        if (code !== 0 && code !== null) {
          const crashInfo = parseCrashLogs(logBuffer);
          mainWindow.webContents.send('game-crash', {
            exitCode: code,
            crashLogPath: path.join(gameDir, 'crash-reports'),
            suspectedMod: crashInfo.suspectedMod,
            suspectedFilename: crashInfo.suspectedFilename,
            crashDetails: crashInfo.crashDetails
          });
        }
      });

      // Launch Minecraft
      sendAndLog(`[MarinMC Launcher] minecraft-launcher-core ile başlatılıyor...`);

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
      sendAndLog(`[MarinMC Launcher] Java Sanal Makinesi (JVM) aktif edildi. Minecraft başlatıldı.`);

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
