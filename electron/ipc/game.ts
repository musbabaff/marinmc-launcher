import { ipcMain, BrowserWindow, app } from 'electron';
import { Client, Authenticator } from 'minecraft-launcher-core';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import axios from 'axios';
import { discordRPC } from '../discord.js';
import { backendSettings } from '../settings.js';

/**
 * Clamps the user-requested RAM to a safe ceiling based on total physical memory.
 * Leaves at least 2 GB (or 40 % of total, whichever is larger) for the OS, JVM
 * native overhead, and Minecraft off-heap buffers.
 */
export function getSafeRamMb(requestedMb: number): number {
  const totalMb = Math.floor(os.totalmem() / (1024 * 1024));
  const osReserveMb = Math.max(2048, Math.floor(totalMb * 0.40));
  const safeCap = Math.max(1024, totalMb - osReserveMb); // never below 1 GB
  if (requestedMb > safeCap) {
    console.log(`[SmartJVM] Requested ${requestedMb}M exceeds safe cap ${safeCap}M (total RAM: ${totalMb}M). Clamping.`);
    return safeCap;
  }
  return requestedMb;
}

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
  // NOTE: AlwaysPreTouch removed — it forces the JVM to physically reserve the
  // entire heap at startup, which fails on systems with a small page file.
  args.push('-XX:+UseNUMA');
  args.push('-XX:+UseStringDeduplication');
  args.push('-Dsun.rmi.dgc.server.gcInterval=3600000');
  args.push('-Dsun.rmi.dgc.client.gcInterval=3600000');

  return args;
}

export function resolveGameDir(customDir?: string): string {
  if (customDir && customDir.trim() !== '') {
    const trimmed = customDir.trim();
    // Only honour an absolute path. A relative value would otherwise resolve
    // against the process cwd and write game files somewhere unexpected.
    if (path.isAbsolute(trimmed)) {
      return path.normalize(trimmed);
    }
    console.warn('[game.ts] Ignoring non-absolute custom game directory:', trimmed);
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
    name: 'Player Animation Library',
    filename: 'PlayerAnimationLibFabric-1.1.2+mc.1.21.8.jar',
    url: 'https://cdn.modrinth.com/data/ha1mEyJS/versions/dIf3Q9r1/PlayerAnimationLibFabric-1.1.2%2Bmc.1.21.8.jar',
    md5: '3a281adf2405b230c2fe45c1d25c9511'
  },
  {
    name: 'Emotecraft',
    filename: 'emotecraft-fabric-for-MC1.21.7-3.0.0-b.build.139.jar',
    url: 'https://cdn.modrinth.com/data/pZ2wrerK/versions/6ftsR5Uf/emotecraft-fabric-for-MC1.21.7-3.0.0-b.build.139.jar',
    md5: '2ccc3dd6c41e1a6ffc60fb412f2a58aa'
  },
  {
    name: 'Online Emotes',
    filename: 'online-emotes-3.4.1+mc1.21.8-fabric.jar',
    url: 'https://cdn.modrinth.com/data/Dc4g4seU/versions/ed0MvWmw/online-emotes-3.4.1%2Bmc1.21.8-fabric.jar',
    md5: 'a423bf89ad6f64b2bf3ba093dac360e1'
  },
  {
    name: 'Forge Config API Port',
    filename: 'ForgeConfigAPIPort-v21.8.2-1.21.8-Fabric.jar',
    url: 'https://cdn.modrinth.com/data/ohNO6lps/versions/YbUUjWdw/ForgeConfigAPIPort-v21.8.2-1.21.8-Fabric.jar',
    md5: '70a44acea420b7672a5b66e6639e16b5'
  },
  {
    name: 'GeckoLib',
    filename: 'geckolib-fabric-1.21.8-5.2.2.jar',
    url: 'https://cdn.modrinth.com/data/8BmcQJ2H/versions/k4Azk0wN/geckolib-fabric-1.21.8-5.2.2.jar',
    md5: 'dfb2b38528b75e7649b920995fdf7a38'
  },
  // --- Optimization Mods ---
  {
    name: 'FerriteCore',
    filename: 'ferritecore-8.0.4-fabric.jar',
    url: 'https://cdn.modrinth.com/data/uXXizFIs/versions/LdlksamY/ferritecore-8.0.4-fabric.jar',
    md5: '16a510b25f8c974384f1a3a2d0358cdf'
  },
  {
    name: 'ImmediatelyFast',
    filename: 'ImmediatelyFast-Fabric-1.12.5+1.21.8.jar',
    url: 'https://cdn.modrinth.com/data/5ZwdcRci/versions/iNldtLH8/ImmediatelyFast-Fabric-1.12.5%2B1.21.8.jar',
    md5: 'b87781ed5840add0d80fc68c3a1731f0'
  },
  {
    name: 'Entity Culling',
    filename: 'entityculling-fabric-1.10.3-mc1.21.8.jar',
    url: 'https://cdn.modrinth.com/data/NNAgCjsB/versions/FmVJqif3/entityculling-fabric-1.10.3-mc1.21.8.jar',
    md5: '51ee747411e69f535c8437e1fa109e95'
  },
  {
    name: 'Dynamic FPS',
    filename: 'dynamic-fps-3.11.4+minecraft-1.21.6-fabric.jar',
    url: 'https://cdn.modrinth.com/data/LQ3K71Q1/versions/OnRerL4D/dynamic-fps-3.11.4%2Bminecraft-1.21.6-fabric.jar',
    md5: 'c923a1b56cbe3575b6f1eec2cd5e7f12'
  },
  {
    name: 'Krypton',
    filename: 'krypton-0.2.9.jar',
    url: 'https://cdn.modrinth.com/data/fQEb0iXm/versions/neW85eWt/krypton-0.2.9.jar',
    md5: '1cf6349d30573e851efefd5bb1eb34ed'
  },
  {
    name: 'Debugify',
    filename: 'debugify-1.21.8+1.0.jar',
    url: 'https://cdn.modrinth.com/data/QwxR6Gcd/versions/WLSwJeXa/debugify-1.21.8%2B1.0.jar',
    md5: 'ca4360f1b1526ff6578fe957735a95b3'
  },
  {
    name: 'More Culling',
    filename: 'moreculling-fabric-1.21.8-1.4.0-beta.2.jar',
    url: 'https://cdn.modrinth.com/data/51shyZVL/versions/ivOsScf8/moreculling-fabric-1.21.8-1.4.0-beta.2.jar',
    md5: '87f9710fa1b16968eeb834451400af9e'
  },
  {
    name: 'ThreadTweak',
    filename: 'threadtweak-fabric-0.1.7+mc1.21.5.jar',
    url: 'https://cdn.modrinth.com/data/vSEH1ERy/versions/IvtlnXcT/threadtweak-fabric-0.1.7%2Bmc1.21.5.jar',
    md5: 'be883fc3ca37cec8394213d5271d445a'
  },
  {
    name: 'FastNoise',
    filename: 'zfastnoise-1.0.11+1+1.21.jar',
    url: 'https://cdn.modrinth.com/data/OnlVIpq5/versions/e6mPQAQP/zfastnoise-1.0.11%2B1%2B1.21.jar',
    md5: 'b7e5d6ae6c8b3230e6932dd651f37d4e'
  },
  // --- Library Dependencies ---
  {
    name: 'Yet Another Config Lib (YACL)',
    filename: 'yet_another_config_lib_v3-3.8.2+1.21.6-fabric.jar',
    url: 'https://cdn.modrinth.com/data/1eAoo2KR/versions/iPLhsWMM/yet_another_config_lib_v3-3.8.2%2B1.21.6-fabric.jar',
    md5: '4cb67f8dbd317cc42dcbd9599687286e'
  },
  {
    name: 'Cloth Config API',
    filename: 'cloth-config-19.0.147-fabric.jar',
    url: 'https://cdn.modrinth.com/data/9s6osm5g/versions/cz0b1j8R/cloth-config-19.0.147-fabric.jar',
    md5: '374787e705220edb15af113964ce96d2'
  },
  {
    name: 'Mod Menu',
    filename: 'modmenu-15.0.2.jar',
    url: 'https://cdn.modrinth.com/data/mOgUt4GM/versions/ku5NivOP/modmenu-15.0.2.jar',
    md5: '0f70ab88677a7404dbc95798604c7833'
  },
  // --- MarinMC Custom ---
  {
    name: 'MarinMC Client Mod',
    filename: 'marinmc-client-mod-1.0.0.jar',
    url: 'https://media.githubusercontent.com/media/musbabaff/marinmc-launcher/main/assets/marinmc-client-mod-1.0.0.jar',
    md5: 'b7f8f8dd1d6c722530f5425cc5d1878f'
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
      { key: 'playeranimationlib', target: 'PlayerAnimationLibFabric-1.1.2+mc.1.21.8.jar' },
      { key: 'emotecraft', target: 'emotecraft-fabric-for-MC1.21.7-3.0.0-b.build.139.jar' },
      { key: 'online-emotes', target: 'online-emotes-3.4.1+mc1.21.8-fabric.jar' },
      { key: 'forgeconfigapiport', target: 'ForgeConfigAPIPort-v21.8.2-1.21.8-Fabric.jar' },
      { key: 'geckolib', target: 'geckolib-fabric-1.21.8-5.2.2.jar' },
      // Optimization mods
      { key: 'ferritecore', target: 'ferritecore-8.0.4-fabric.jar' },
      { key: 'immediatelyfast', target: 'ImmediatelyFast-Fabric-1.12.5+1.21.8.jar' },
      { key: 'entityculling', target: 'entityculling-fabric-1.10.3-mc1.21.8.jar' },
      { key: 'dynamic-fps', target: 'dynamic-fps-3.11.4+minecraft-1.21.6-fabric.jar' },
      { key: 'krypton', target: 'krypton-0.2.9.jar' },
      { key: 'debugify', target: 'debugify-1.21.8+1.0.jar' },
      { key: 'moreculling', target: 'moreculling-fabric-1.21.8-1.4.0-beta.2.jar' },
      { key: 'threadtweak', target: 'threadtweak-fabric-0.1.7+mc1.21.5.jar' },
      { key: 'zfastnoise', target: 'zfastnoise-1.0.11+1+1.21.jar' },
      { key: 'noisium', target: '' },
      // Library dependencies
      { key: 'yet_another_config_lib', target: 'yet_another_config_lib_v3-3.8.2+1.21.6-fabric.jar' },
      { key: 'cloth-config', target: 'cloth-config-19.0.147-fabric.jar' },
      { key: 'modmenu', target: 'modmenu-15.0.2.jar' },
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

    const lines = content.split(/\r?\n/);
    
    // Enforce Resource Pack
    const targetPackLine = 'resourcePacks:["vanilla","programmatic_marinmc_pack.zip"]';
    let packUpdated = false;
    
    // Enforce Tutorial Off (Prevents sticky tutorial toasts on screen)
    const targetTutorialLine = 'tutorialStep:none';
    let tutorialUpdated = false;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('resourcePacks:')) {
        lines[i] = targetPackLine;
        packUpdated = true;
      } else if (lines[i].startsWith('tutorialStep:')) {
        lines[i] = targetTutorialLine;
        tutorialUpdated = true;
      }
    }

    if (!packUpdated) {
      lines.push(targetPackLine);
    }
    if (!tutorialUpdated) {
      lines.push(targetTutorialLine);
    }

    fs.writeFileSync(optionsPath, lines.join('\n'), 'utf8');
    logCallback(`[MarinMC Launcher] options.txt güncellendi (Eğitim adımları kapatıldı, kaynak paketi aktif edildi).`);
  } catch (err: any) {
    console.error('Failed to inject options:', err.message);
    logCallback(`[HATA] options.txt dosyası güncellenemedi: ${err.message}`);
  }
}

function parseCrashLogs(logs: string[]): {
  suspectedMod?: string;
  suspectedFilename?: string;
  crashDetails: string;
} {
  const logsText = logs.join('\n');
  
  // Filter out launcher launch debug/classpath lines to prevent matching classpath jars
  const cleanLogs = logs.filter(line => {
    const l = line.toLowerCase();
    return !l.includes('[debug]') && 
           !l.includes('-cp') && 
           !l.includes('-classpath') && 
           !l.includes('jvm arguments') && 
           !l.includes('launching with:');
  });
  const cleanLogsText = cleanLogs.join('\n');

  let suspectedMod = 'Unknown / System';
  let suspectedFilename = 'Java/Minecraft Crash';

  // 1. Out of memory
  if (logsText.includes('java.lang.OutOfMemoryError') || logsText.includes('OutOfMemory')) {
    return {
      suspectedMod: 'Out of Memory',
      suspectedFilename: 'Insufficient allocated RAM',
      crashDetails: 'Minecraft run out of memory. Please allocate more RAM in launcher settings.'
    };
  }

  // 2. Graphics Driver
  if (logsText.includes('org.lwjgl.LWJGLException') || logsText.includes('Pixel format not accelerated') || logsText.includes('GLFW error 65542')) {
    return {
      suspectedMod: 'Graphics Driver',
      suspectedFilename: 'OpenGL / GLFW Error',
      crashDetails: 'Failed to initialize graphics. Please update your GPU drivers.'
    };
  }

  // 3. Watchdog timeout
  if (logsText.includes('Client shutdown watchdog') || logsText.includes('java.lang.Error: Watchdog')) {
    return {
      suspectedMod: 'Client Shutdown Watchdog',
      suspectedFilename: 'System Timeout / Hang',
      crashDetails: 'The game process took too long to shut down or respond, triggering the Watchdog safety shutdown.'
    };
  }

  // 4. JVM / Java Settings
  if (logsText.includes('VM option') || logsText.includes('Java Virtual Machine') || logsText.includes('unlock option') || logsText.includes('unlocking')) {
    const errorLines = logs.filter(line => 
      line.toLowerCase().includes('error:') || 
      line.toLowerCase().includes('vm option') || 
      line.toLowerCase().includes('unlock option') ||
      line.toLowerCase().includes('unlocking')
    );
    const details = errorLines.length > 0 ? errorLines.join('\n') : 'Java Virtual Machine failed to start. Check JVM arguments.';
    return { suspectedMod: 'JVM / Java Settings', suspectedFilename: 'JVM Configuration Error', crashDetails: details };
  }

  // 5. Fabric Mod Dependency Mismatch / Missing Mod
  // Example: Mod 'Online Emotes' (online_emotes) requires version 21.7.0 or later of forgeconfigapiport, which is missing!
  // Example: Mod 'Noisium' (noisium) 2.7.0+mc1.21.6 requires version 1.21.6 of 'Minecraft' (minecraft), but only the wrong version is present: 1.21.8!
  const depMatch = cleanLogsText.match(/Mod '([^']+)' \(([^)]+)\)[\s\S]*?requires[\s\S]*?of '?([a-zA-Z0-9_-]+)'?/);
  if (depMatch) {
    const modName = depMatch[1];
    const depId = depMatch[3];
    const isWrongVersion = cleanLogsText.includes('wrong version is present') || cleanLogsText.includes('is incompatible');
    return {
      suspectedMod: modName,
      suspectedFilename: isWrongVersion ? `Version Mismatch: ${depId}` : `Missing Dependency: ${depId}`,
      crashDetails: cleanLogs.slice(-12).join('\n')
    };
  }

  // Example: [HARD_DEP_NO_CANDIDATE online_emotes ... {depends forgeconfigapiport ...}]
  const hardDepMatch = cleanLogsText.match(/HARD_DEP_NO_CANDIDATE ([a-zA-Z0-9_-]+)[\s\S]*?\{depends ([a-zA-Z0-9_-]+)/);
  if (hardDepMatch) {
    const modId = hardDepMatch[1];
    const depId = hardDepMatch[2];
    const modName = modId.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    return {
      suspectedMod: modName,
      suspectedFilename: `Missing: ${depId}`,
      crashDetails: cleanLogs.slice(-12).join('\n')
    };
  }

  // Example: Mod 'A' is incompatible with mod 'B'
  const incompatibilityMatch = cleanLogsText.match(/Mod '([^']+)' \(([^)]+)\) is incompatible with mod '([^']+)'/);
  if (incompatibilityMatch) {
    return {
      suspectedMod: `${incompatibilityMatch[1]} & ${incompatibilityMatch[3]}`,
      suspectedFilename: 'Mod Conflict',
      crashDetails: cleanLogs.slice(-12).join('\n')
    };
  }

  // 6. Mixin Failures
  const mixinMatch = cleanLogsText.match(/Mixin apply failed ([a-zA-Z0-9_-]+)\.mixins\.json/);
  if (mixinMatch) {
    return {
      suspectedMod: mixinMatch[1],
      suspectedFilename: `${mixinMatch[1]}.mixins.json`,
      crashDetails: cleanLogs.slice(-12).join('\n')
    };
  }

  // 7. Check for known package patterns in Java Stack Trace
  const knownPackages = [
    { pattern: 'com.marinmc.client', name: 'MarinMC Client Mod', file: 'marinmc-client-mod-1.0.0.jar' },
    { pattern: 'net.caffeinemc.mods.sodium', name: 'Sodium', file: 'sodium-fabric.jar' },
    { pattern: 'net.irisshaders.iris', name: 'Iris', file: 'iris-fabric.jar' },
    { pattern: 'com.kosmx.emotes', name: 'Online Emotes', file: 'online-emotes.jar' },
    { pattern: 'net.fabricmc.loader', name: 'Fabric Loader', file: 'fabric-loader' },
    { pattern: 'org.spongepowered.asm.mixin', name: 'Mixin Engine (Mod Conflict)', file: 'mixin' }
  ];
  for (const pkg of knownPackages) {
    if (cleanLogsText.includes(pkg.pattern)) {
      suspectedMod = pkg.name;
      suspectedFilename = pkg.file;
      break;
    }
  }

  // 8. General Jar match in clean logs (not in classpath)
  if (suspectedFilename === 'Java/Minecraft Crash' && (logsText.includes('org.spongepowered.asm') || logsText.includes('mixin') || logsText.includes('FabricLoader') || logsText.includes('fabric-loader'))) {
    const jarMatch = cleanLogsText.match(/([a-zA-Z0-9_-]+\.jar)/i);
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
  }

  // 9. General stack trace parser
  const last15Lines = cleanLogs.slice(-15);
  let stacktraceDetails = '';
  for (let i = last15Lines.length - 1; i >= 0; i--) {
    const line = last15Lines[i];
    if (line.includes('Exception in thread') || line.includes('Caused by:') || line.includes('java.lang.')) {
      if (suspectedMod === 'Unknown / System') suspectedMod = 'Java Exception';
      if (suspectedFilename === 'Java/Minecraft Crash') {
        suspectedFilename = line.split(':')[0].trim().substring(0, 50) || 'Minecraft Crash';
      }
      stacktraceDetails = last15Lines.slice(Math.max(0, i - 1), i + 8).join('\n');
      break;
    }
  }

  return {
    suspectedMod,
    suspectedFilename,
    crashDetails: stacktraceDetails || cleanLogs.slice(-8).join('\n') || 'Oyun beklenmedik şekilde kapandı (Çıkış kodu: 1).'
  };
}

function isValidUUID(uuidStr?: string): boolean {
  if (!uuidStr) return false;
  return /^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$/.test(uuidStr);
}

function syncModsFolder(gameDir: string, targetVersion: string, is121Version: boolean, log: (msg: string) => void) {
  const modsDir = path.join(gameDir, 'mods');
  const versionFile = path.join(modsDir, '.version');
  
  let cleanTargetVersion = targetVersion;
  if (targetVersion.startsWith('fabric-loader-')) {
    const parts = targetVersion.split('-');
    cleanTargetVersion = parts[parts.length - 1]; // e.g. "1.21.8"
  }
  
  let currentModsVersion = '';
  if (fs.existsSync(versionFile)) {
    try {
      currentModsVersion = fs.readFileSync(versionFile, 'utf8').trim();
    } catch (err) {
      console.error('Failed to read .version file:', err);
    }
  } else if (fs.existsSync(modsDir)) {
    currentModsVersion = '1.21.8';
    try {
      fs.writeFileSync(versionFile, currentModsVersion, 'utf8');
    } catch {}
  }
  
  if (currentModsVersion && currentModsVersion !== cleanTargetVersion) {
    log(`[Mods Ayrıştırıcı] Sürüm değişti (${currentModsVersion} → ${cleanTargetVersion}). Mod klasörleri ayrıştırılıyor...`);
    const backupDir = path.join(gameDir, `mods_backup_${currentModsVersion}`);
    
    if (fs.existsSync(modsDir)) {
      try {
        if (fs.existsSync(backupDir)) {
          fs.rmSync(backupDir, { recursive: true, force: true });
        }
        fs.renameSync(modsDir, backupDir);
        log(`[Mods Ayrıştırıcı] Eski sürüm modları yedeklendi: ${path.basename(backupDir)}`);
      } catch (err: any) {
        log(`[HATA] Mod klasörü yedeklenemedi: ${err.message}`);
        return;
      }
    }
    
    const targetBackupDir = path.join(gameDir, `mods_backup_${cleanTargetVersion}`);
    if (fs.existsSync(targetBackupDir)) {
      try {
        fs.renameSync(targetBackupDir, modsDir);
        log(`[Mods Ayrıştırıcı] Hedef sürüm modları geri yüklendi.`);
      } catch (err: any) {
        log(`[HATA] Hedef sürüm modları geri yüklenemedi: ${err.message}. Yeni klasör oluşturuluyor.`);
        fs.mkdirSync(modsDir, { recursive: true });
      }
    } else {
      fs.mkdirSync(modsDir, { recursive: true });
    }
    
    try {
      fs.writeFileSync(versionFile, cleanTargetVersion, 'utf8');
    } catch {}
  } else if (!fs.existsSync(modsDir)) {
    fs.mkdirSync(modsDir, { recursive: true });
    try {
      fs.writeFileSync(versionFile, cleanTargetVersion, 'utf8');
    } catch {}
  }
}

// Map the UI version selection (major like "1.21", concrete like "1.17.1",
// or an existing "fabric-loader-..." id) to a concrete vanilla game version.
function resolveGameVersion(selected: string): string {
  if (!selected) return '1.21.8';
  if (selected.startsWith('fabric-loader-')) {
    const parts = selected.split('-');
    return parts[parts.length - 1];
  }
  // Major version shortcuts → the concrete version we officially support.
  const majorMap: Record<string, string> = {
    '1.21': '1.21.8',
    '1.20': '1.20.4',
    '1.19': '1.19.4',
    '1.18': '1.18.2',
    '1.17': '1.17.1'
  };
  return majorMap[selected] || selected;
}

// The full MarinMC mod set (Sodium/Iris/client mod/etc.) is built for 1.21.8.
// Only that version gets the performance mods + custom client mod; every other
// supported version launches as clean Fabric so it never crashes on incompatible mods.
function isFullModVersion(gameVersion: string): boolean {
  return gameVersion === '1.21.8';
}

// Install a Fabric Loader profile for ANY supported game version (1.17.1–1.21.8).
// Returns the fabric version id (e.g. "fabric-loader-0.16.14-1.17.1") on success,
// or null if it could not be installed (caller falls back to vanilla).
async function installFabricProfile(
  gameDir: string,
  gameVersion: string,
  isCancelled: () => boolean,
  log: (msg: string) => void
): Promise<string | null> {
  try {
    // Resolve a Fabric Loader version that supports this game version.
    // A recent loader is backward-compatible with all older game versions.
    let loaderVersion = '0.19.3';
    try {
      const loadersRes = await axios.get(
        `https://meta.fabricmc.net/v2/versions/loader/${gameVersion}`,
        { timeout: 15000 }
      );
      if (Array.isArray(loadersRes.data) && loadersRes.data.length > 0) {
        const stable = loadersRes.data.find((l: any) => l?.loader?.stable);
        loaderVersion = (stable || loadersRes.data[0]).loader.version;
      }
    } catch (metaErr: any) {
      log(`[UYARI] Fabric Loader listesi alınamadı (${metaErr.message}). Varsayılan ${loaderVersion} kullanılıyor.`);
    }
    if (isCancelled()) return null;

    const fabricVersionId = `fabric-loader-${loaderVersion}-${gameVersion}`;
    const fabricVersionDir = path.join(gameDir, 'versions', fabricVersionId);
    const fabricJsonPath = path.join(fabricVersionDir, `${fabricVersionId}.json`);

    if (!fs.existsSync(fabricJsonPath)) {
      log(`[MarinMC Launcher] Fabric Loader ${loaderVersion} (${gameVersion}) profili kuruluyor...`);
      fs.mkdirSync(fabricVersionDir, { recursive: true });
      const profileUrl = `https://meta.fabricmc.net/v2/versions/loader/${gameVersion}/${loaderVersion}/profile/json`;
      const profileRes = await axios.get(profileUrl, { timeout: 20000 });
      if (isCancelled()) return null;
      fs.writeFileSync(fabricJsonPath, JSON.stringify(profileRes.data, null, 2), 'utf8');
      log(`[MarinMC Launcher] Fabric Loader profili başarıyla kuruldu.`);
    }

    return fs.existsSync(fabricJsonPath) ? fabricVersionId : null;
  } catch (err: any) {
    log(`[HATA] Fabric Loader profili (${gameVersion}) indirilemedi: ${err.message}. Vanilla deneniyor.`);
    return null;
  }
}

// Fast validity check: a real .jar/.zip ends with an End-Of-Central-Directory
// record (signature 0x06054b50). Truncated/partial downloads lack it.
function isValidZip(filePath: string): boolean {
  let fd: number | null = null;
  try {
    const size = fs.statSync(filePath).size;
    if (size < 22) return false;
    fd = fs.openSync(filePath, 'r');
    // Fast path: EOCD with no archive comment sits in exactly the last 22 bytes.
    const tail = Buffer.alloc(22);
    fs.readSync(fd, tail, 0, 22, size - 22);
    if (tail.readUInt32LE(0) === 0x06054b50) return true;
    // Slow path: scan up to 64 KB back for the EOCD (archives with a comment).
    const scanLen = Math.min(size, 65557);
    const buf = Buffer.alloc(scanLen);
    fs.readSync(fd, buf, 0, scanLen, size - scanLen);
    for (let i = scanLen - 22; i >= 0; i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    if (fd !== null) { try { fs.closeSync(fd); } catch { /* ignore */ } }
  }
}

// Remove corrupt/truncated library jars so the launcher re-downloads clean copies.
// Fixes Fabric "zip END header not found" crashes from interrupted downloads.
function cleanCorruptLibraries(gameDir: string, log: (msg: string) => void): void {
  const libDir = path.join(gameDir, 'libraries');
  if (!fs.existsSync(libDir)) return;
  let removed = 0;
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.jar')) {
        if (!isValidZip(full)) {
          try {
            fs.unlinkSync(full);
            removed++;
            log(`[MarinMC Launcher] Bozuk kütüphane silindi (yeniden indirilecek): ${entry.name}`);
          } catch { /* ignore */ }
        }
      }
    }
  };
  try { walk(libDir); } catch { /* ignore */ }
  if (removed > 0) {
    log(`[MarinMC Launcher] ${removed} bozuk kütüphane temizlendi; eksikler otomatik indirilecek.`);
  }
}

function calculateHash(filePath: string, algo: 'sha1' | 'md5' = 'sha1'): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algo);
    const stream = fs.createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', err => reject(err));
  });
}

// Performance / QoL mods available across 1.17–1.21 on Modrinth (Fabric).
// For non-1.21.8 versions we resolve each mod's correct build per game version,
// so every supported version launches WITH mods (not just clean Fabric).
const MODRINTH_VERSION_MODS = [
  'fabric-api', 'sodium', 'lithium', 'iris', 'ferrite-core',
  'modmenu', 'cloth-config', 'yacl', 'reeses-sodium-options', 'sodium-extra',
  'entityculling', 'dynamic-fps', 'krypton', 'immediatelyfast', 'moreculling'
];

// Resolve + download version-appropriate Fabric mods from Modrinth for a given game
// version. Each mod is independent: if a mod has no build for this version it is
// skipped (never fatal), so the launch always succeeds.
async function installVersionMods(
  gameDir: string,
  gameVersion: string,
  isCancelled: () => boolean,
  log: (msg: string) => void
): Promise<void> {
  const modsDir = path.join(gameDir, 'mods');
  if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });

  log(`[MarinMC Launcher] ${gameVersion} için modlar Modrinth üzerinden çözümleniyor...`);
  let installed = 0;
  let skipped = 0;

  for (const slug of MODRINTH_VERSION_MODS) {
    if (isCancelled()) return;
    try {
      const verRes = await axios.get(`https://api.modrinth.com/v2/project/${slug}/version`, {
        params: {
          loaders: JSON.stringify(['fabric']),
          game_versions: JSON.stringify([gameVersion])
        },
        timeout: 15000,
        headers: { 'User-Agent': 'MarinMC-Launcher/1.0 (marinmc.com)' }
      });
      const versions = verRes.data;
      if (!Array.isArray(versions) || versions.length === 0) {
        skipped++;
        continue; // no compatible build for this version — skip silently
      }
      const ver = versions[0]; // newest compatible
      const file = (ver.files || []).find((f: any) => f.primary) || (ver.files || [])[0];
      if (!file || !file.url) { skipped++; continue; }

      const destPath = path.join(modsDir, file.filename);
      const expectedSha1: string | undefined = file.hashes?.sha1;

      // Already present & verified? Skip re-download.
      if (fs.existsSync(destPath) && expectedSha1) {
        try {
          const existing = await calculateHash(destPath, 'sha1');
          if (existing === expectedSha1) { installed++; continue; }
        } catch { /* re-download below */ }
      }

      const dl = await axios.get(file.url, { responseType: 'arraybuffer', timeout: 60000 });
      if (isCancelled()) return;
      fs.writeFileSync(destPath, Buffer.from(dl.data));

      // Verify integrity; drop the file if it doesn't match (never ship a bad jar).
      if (expectedSha1) {
        const actual = await calculateHash(destPath, 'sha1');
        if (actual !== expectedSha1) {
          try { fs.unlinkSync(destPath); } catch { /* ignore */ }
          log(`[Atlandı] ${slug}: bütünlük doğrulanamadı.`);
          skipped++;
          continue;
        }
      }
      log(`[MarinMC Launcher] Mod kuruldu: ${file.filename}`);
      installed++;
    } catch (err: any) {
      skipped++;
      log(`[Atlandı] ${slug}: ${gameVersion} için alınamadı (${err.message}).`);
    }
  }

  log(`[MarinMC Launcher] ${gameVersion} mod kurulumu tamamlandı (${installed} kuruldu, ${skipped} atlandı).`);
}

let gameProcess: any = null;
let isLaunching = false;
let launchCancelled = false;

export function registerGameHandlers(rawMainWindow: BrowserWindow) {
  const mainWindow = {
    webContents: {
      send: (channel: string, ...args: any[]) => {
        if (rawMainWindow && !rawMainWindow.isDestroyed() && !rawMainWindow.webContents.isDestroyed()) {
          rawMainWindow.webContents.send(channel, ...args);
        }
      }
    }
  } as unknown as BrowserWindow;

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

    isLaunching = true;
    launchCancelled = false;

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
      const cosmeticsConfig: any = options.cosmetics || { skinType: 'username', capeUrl: '' };
      if (!cosmeticsConfig.apiUrl) {
        const isDev = !app.isPackaged;
        cosmeticsConfig.apiUrl = isDev
          ? 'http://localhost:3000/api'
          : (process.env.MARINMC_API_URL || 'https://api.marinmc.com/api');
      }
      try {
        const configDir = path.join(gameDir, 'config');
        fs.mkdirSync(configDir, { recursive: true });
        const cosmeticsPath = path.join(configDir, 'marinmc-cosmetics.json');
        fs.writeFileSync(cosmeticsPath, JSON.stringify(cosmeticsConfig, null, 2), 'utf8');
        sendAndLog(`[MarinMC Launcher] Kozmetikler uygulandı (Cilt Tipi: ${cosmeticsConfig.skinType}, Pelerin: ${cosmeticsConfig.capeUrl || 'Yok'}, Sunucu: ${cosmeticsConfig.apiUrl}).`);
      } catch (cosmErr: any) {
        console.error('Failed to write cosmetics config:', cosmErr);
        sendAndLog(`[UYARI] Kozmetik konfigürasyonu yazılamadı: ${cosmErr.message}`);
      }

      // Resolve the concrete game version (1.17.1 … 1.21.8) from the UI selection.
      let versionToLaunch = options.version || '1.21.8';
      const gameVersion = resolveGameVersion(versionToLaunch);
      const fullMods = isFullModVersion(gameVersion);

      // Separating mods folders for different versions (keeps 1.21.8 mods out of
      // other versions and vice versa, so nothing incompatible ever loads).
      syncModsFolder(gameDir, gameVersion, fullMods, (msg) => {
        sendAndLog(msg);
      });

      if (fullMods) {
        // Geliştirici modunda yerel istemci modunu derle ve kopyala
        if (!app.isPackaged) {
          await compileAndCopyClientModDev(gameDir, (msg) => {
            sendAndLog(msg);
          });
          if (launchCancelled) { isLaunching = false; return { success: false, error: 'Başlatma iptal edildi.' }; }
        }

        // 1. Verify performance mods
        await verifyPerformanceMods(gameDir, (msg) => {
          sendAndLog(msg);
        });
        if (launchCancelled) { isLaunching = false; return { success: false, error: 'Başlatma iptal edildi.' }; }

        // 2. Download resource pack
        await downloadResourcePack(gameDir, (msg) => {
          sendAndLog(msg);
        });
        if (launchCancelled) { isLaunching = false; return { success: false, error: 'Başlatma iptal edildi.' }; }

        // 3. Inject resource pack
        injectResourcePack(gameDir, (msg) => {
          sendAndLog(msg);
        });
      } else {
        // Non-1.21.8 versions: install version-appropriate Fabric mods from Modrinth
        // (Sodium/Iris/Lithium/etc.) so every version launches WITH mods. The custom
        // MarinMC client mod is 1.21.8-only and intentionally not added here.
        await installVersionMods(gameDir, gameVersion, () => launchCancelled, (msg) => sendAndLog(msg));
        if (launchCancelled) { isLaunching = false; return { success: false, error: 'Başlatma iptal edildi.' }; }
      }

      // Install a Fabric Loader profile for EVERY supported version so the launch
      // path is consistent and reliable (fixes vanilla 1.17/1.18 classpath crashes).
      const fabricVersionId = await installFabricProfile(
        gameDir,
        gameVersion,
        () => launchCancelled,
        (msg) => sendAndLog(msg)
      );
      if (launchCancelled) { isLaunching = false; return { success: false, error: 'Başlatma iptal edildi.' }; }
      if (fabricVersionId) {
        versionToLaunch = fabricVersionId;
      } else {
        // Fall back to vanilla concrete version if Fabric could not be installed.
        versionToLaunch = gameVersion;
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

      if (process.platform === 'win32') {
        if (javaPathResolved === 'java') {
          javaPathResolved = 'javaw';
        } else {
          if (javaPathResolved.toLowerCase().endsWith('java.exe')) {
            javaPathResolved = javaPathResolved.slice(0, -8) + 'javaw.exe';
          } else if (javaPathResolved.toLowerCase().endsWith('java')) {
            javaPathResolved = javaPathResolved.slice(0, -4) + 'javaw';
          }
        }
      }

      // Security check on custom javaPath
      if (javaPathResolved !== 'java' && javaPathResolved !== 'javaw') {
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

      // Clamp RAM to a safe value based on total system memory
      const requestedRam = options.ram || 4096;
      const safeRam = backendSettings.smartJvmOpt ? getSafeRamMb(requestedRam) : requestedRam;
      if (safeRam !== requestedRam) {
        sendAndLog(`[MarinMC Launcher] ⚠️ Bellek limiti güvenli değere düşürüldü: ${requestedRam}M → ${safeRam}M (Toplam RAM yetersiz)`);
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
          max: `${safeRam}M`,
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

      // Integrity sweep: drop any corrupt/truncated library jars (e.g. a partially
      // downloaded jna jar) so the launcher fetches clean copies — prevents the
      // Fabric "zip END header not found" startup crash.
      cleanCorruptLibraries(gameDir, sendAndLog);

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
        if (rawMainWindow && !rawMainWindow.isDestroyed()) {
          rawMainWindow.show();
        }
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
      isLaunching = false;

      if (launchCancelled) {
        if (gameProcess) {
          try {
            gameProcess.kill('SIGKILL');
          } catch {}
          gameProcess = null;
        }
        return { success: false, error: 'Başlatma iptal edildi.' };
      }

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

      if (rawMainWindow && !rawMainWindow.isDestroyed()) {
        rawMainWindow.hide();
      }

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
    if (isLaunching) {
      launchCancelled = true;
      isLaunching = false;
    }

    if (gameProcess) {
      try {
        if (process.platform === 'win32' && gameProcess.pid) {
          const { execFile } = require('child_process');
          // Pass arguments as an array (no shell) so the PID can never be
          // interpreted as part of a shell command.
          execFile('taskkill', ['/pid', String(gameProcess.pid), '/T', '/F'], (err: any) => {
            if (err) {
              console.error('[game.ts] Error killing process via taskkill:', err);
              try { gameProcess.kill('SIGKILL'); } catch {}
            }
          });
        } else {
          gameProcess.kill('SIGKILL');
        }
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
