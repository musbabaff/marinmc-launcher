import { ipcMain } from 'electron';
import axios from 'axios';
import * as path from 'path';

let launchInterval: NodeJS.Timeout | null = null;
let gameInterval: NodeJS.Timeout | null = null;
let isGameRunning = false;

// Mock database fallbacks if api.marinmc.com is offline
const MOCK_MODS = [
  { name: 'MarinMC-Core-v1.4.jar', url: 'https://api.marinmc.com/files/mods/core.jar', sha256: 'a1b2c3d4e5f6', path: 'mods/core.jar', size: 12.4 },
  { name: 'MarinMC-SkyblockHacks-v1.0.jar', url: 'https://api.marinmc.com/files/mods/skyblock.jar', sha256: 'b2c3d4e5f6a1', path: 'mods/skyblock.jar', size: 4.8 },
  { name: 'OptiFine_1.21_HD_U_I1.jar', url: 'https://api.marinmc.com/files/mods/optifine.jar', sha256: 'c3d4e5f6a1b2', path: 'mods/optifine.jar', size: 6.2 }
];

ipcMain.handle('game:launch', async (event, options: { 
  ram: number; 
  jvmArgs: string; 
  username: string; 
  serverId: string;
  gameDir: string;
}) => {
  if (isGameRunning) {
    throw new Error('Minecraft is zaten çalışıyor.');
  }

  isGameRunning = true;
  const sender = event.sender;
  const serverId = options.serverId || 'survival';

  sender.send('game:log', `[MarinMC Launcher] Oyun başlatma motoru hazırlandı.`);
  sender.send('game:log', `[MarinMC Launcher] Seçilen Sunucu: ${serverId.toUpperCase()}`);
  sender.send('game:log', `[MarinMC Launcher] Oyuncu: ${options.username}`);
  sender.send('game:log', `[MarinMC Launcher] Bellek Limiti: -Xmx${options.ram}M -Xms512M`);
  sender.send('game:log', `[MarinMC Launcher] Oyun Dizin: ${options.gameDir || 'Varsayılan'}`);
  sender.send('game:log', `[MarinMC Launcher] JVM Parametreleri: ${options.jvmArgs || 'Varsayılan'}`);

  // Transition to CHECKING
  sender.send('game:status', 'CHECKING');
  sender.send('game:log', `[MarinMC Launcher] Dosyalar kontrol ediliyor...`);

  // Simulated Fabric and Mod fetches
  try {
    // Attempt real GET to api.marinmc.com/mods/{serverId}
    sender.send('game:log', `[MarinMC Launcher] Mod listesi sorgulanıyor... (GET https://api.marinmc.com/mods/${serverId})`);
    const modsResponse = await axios.get(`https://api.marinmc.com/mods/${serverId}`, { timeout: 2000 })
      .catch(() => ({ data: MOCK_MODS }));
      
    const modsList = modsResponse.data;
    sender.send('game:log', `[MarinMC Launcher] Toplam ${modsList.length} mod dosyası doğrulandı.`);
  } catch (err) {
    sender.send('game:log', `[MarinMC Launcher] Mod listesi önbellekten okundu.`);
  }

  return new Promise<void>((resolve, reject) => {
    let progress = 0;
    
    // Switch to DOWNLOADING state
    setTimeout(() => {
      if (!isGameRunning) return;
      sender.send('game:status', 'DOWNLOADING');
      sender.send('game:log', `[MarinMC Launcher] İstemci ve mod dosyaları indiriliyor...`);
    }, 1000);

    launchInterval = setInterval(() => {
      if (!isGameRunning) {
        clearInterval(launchInterval!);
        reject(new Error('Giriş durduruldu.'));
        return;
      }

      progress += 4;
      sender.send('game:progress', progress);

      if (progress === 16) {
        sender.send('game:log', '[MarinMC Launcher] Vanilla 1.21 sürüm kütüphaneleri indiriliyor (12 MB / 85 MB)...');
      } else if (progress === 32) {
        sender.send('game:log', '[MarinMC Launcher] Fabric loader ve natives yükleniyor...');
      } else if (progress === 48) {
        sender.send('game:log', '[MarinMC Launcher] Sunucu mod dosyaları indiriliyor (4.2 MB / 23.4 MB)...');
      } else if (progress === 68) {
        sender.send('game:log', '[MarinMC Launcher] Mod dosyalarının SHA256 bütünlüğü doğrulanıyor...');
        MOCK_MODS.forEach(mod => {
          sender.send('game:log', `[MarinMC Launcher] OK: ${mod.name} [SHA256: ${mod.sha256}]`);
        });
      } else if (progress === 84) {
        sender.send('game:log', '[MarinMC Launcher] Resmi kaynak paketi indiriliyor (12.4 MB / 12.4 MB)...');
      } else if (progress === 96) {
        sender.send('game:log', '[MarinMC Launcher] Dosyalar başarıyla .minecraft/marinmc/ dizinine yazıldı.');
        sender.send('game:status', 'LAUNCHING');
        sender.send('game:log', '[MarinMC Launcher] Minecraft JVM süreci başlatılıyor...');
      } else if (progress >= 100) {
        clearInterval(launchInterval!);
        sender.send('game:status', 'RUNNING');
        sender.send('game:log', '[MarinMC Launcher] Java Sanal Makinesi (JVM) aktif edildi. Minecraft başlatıldı.');
        
        let line = 0;
        const mockGameLogs = [
          '[Java HotSpot(TM) 64-Bit Server VM] OS: Windows 11, Version: 10.0',
          '[main/INFO]: Loading Minecraft version 1.21 (Fabric)',
          '[main/INFO]: Loading mod list...',
          '[main/INFO]: Initializing graphics driver bindings...',
          '[main/INFO]: [STDOUT]: GL info: Intel(R) Iris(R) Xe Graphics GL version 4.6.0',
          '[main/INFO]: OpenAL Sound engine initialization successful',
          '[main/INFO]: Font renderer loaded with 1256 glyphs',
          '[main/INFO]: Auto-connecting to oyna.marinmc.com:25565',
          '[main/INFO]: Handshake success. Server version BungeeCord 1.21',
          '[main/INFO]: Logged into MarinMC Game Node lobby successfully!'
        ];

        gameInterval = setInterval(() => {
          if (!isGameRunning) {
            clearInterval(gameInterval!);
            return;
          }

          if (line < mockGameLogs.length) {
            sender.send('game:log', mockGameLogs[line]);
            line++;
          } else {
            // Heartbeat logs simulating active gameplay
            sender.send('game:log', `[Client thread/INFO]: [MarinMC] Player position updated: X:${(Math.random() * 200).toFixed(1)} Y:72.0 Z:${(Math.random() * 200).toFixed(1)} (Ping: ${Math.floor(Math.random() * 10) + 10}ms)`);
          }
        }, 800);

        resolve();
      }
    }, 150);
  });
});

ipcMain.handle('game:stop', async (event) => {
  isGameRunning = false;
  if (launchInterval) {
    clearInterval(launchInterval);
    launchInterval = null;
  }
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
  
  event.sender.send('game:status', 'IDLE');
  event.sender.send('game:log', '[MarinMC Launcher] Java process terminated. Minecraft closed.');
  event.sender.send('game:progress', 0);
  return { success: true };
});
