import { ipcMain } from 'electron';

let launchInterval: NodeJS.Timeout | null = null;
let gameInterval: NodeJS.Timeout | null = null;
let isGameRunning = false;

ipcMain.handle('game:launch', async (event, options: { ram: number; jvmArgs: string; username: string }) => {
  if (isGameRunning) {
    throw new Error('Minecraft is already running.');
  }

  isGameRunning = true;
  const sender = event.sender;

  sender.send('game:log', '[MarinMC Launcher] Starting launcher engine...');
  sender.send('game:log', `[MarinMC Launcher] Username: ${options.username}`);
  sender.send('game:log', `[MarinMC Launcher] Memory Limit: ${options.ram}MB`);
  sender.send('game:log', `[MarinMC Launcher] JVM Arguments: ${options.jvmArgs || 'Default'}`);

  let progress = 0;

  return new Promise<void>((resolve, reject) => {
    launchInterval = setInterval(() => {
      if (!isGameRunning) {
        clearInterval(launchInterval!);
        reject(new Error('Launch aborted.'));
        return;
      }

      progress += 5;
      sender.send('game:progress', progress);

      if (progress === 15) {
        sender.send('game:log', '[MarinMC Launcher] Checking for client updates...');
      } else if (progress === 30) {
        sender.send('game:log', '[MarinMC Launcher] Downloading assets and natives (18 MB / 64 MB)...');
      } else if (progress === 60) {
        sender.send('game:log', '[MarinMC Launcher] Downloading assets and natives (48 MB / 64 MB)...');
      } else if (progress === 80) {
        sender.send('game:log', '[MarinMC Launcher] Rebuilding mods and assets manifest...');
      } else if (progress === 95) {
        sender.send('game:log', '[MarinMC Launcher] Loading assets index...');
      } else if (progress >= 100) {
        clearInterval(launchInterval!);
        sender.send('game:log', '[MarinMC Launcher] Asset synchronization complete. Starting JVM.');
        
        let line = 0;
        const mockGameLogs = [
          '[Java HotSpot(TM) 64-Bit Server VM] OS: Windows 11, Version: 10.0',
          '[main/INFO]: Loading Minecraft version 1.20.4',
          '[main/INFO]: Loading Forge/Fabric bootstrap...',
          '[main/INFO]: Initializing LWJGL bindings...',
          '[main/INFO]: [STDOUT]: GL info: Intel(R) Iris(R) Xe Graphics GL version 4.6.0',
          '[main/INFO]: Sound engine initialization successful',
          '[main/INFO]: Font renderer loaded with 256 glyphs',
          '[main/INFO]: Resource pack "MarinMC Official Resourcepack" loaded successfully',
          '[main/INFO]: Opening connection to MarinMC Minecraft Server [oyna.marinmc.com]...',
          '[main/INFO]: Handshake success. Server version 1.20.4 (BungeeCord)',
          '[main/INFO]: Logged into MarinMC Server! Lobby loading...'
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
            // Constant heartbeat logs
            sender.send('game:log', `[Client thread/INFO]: [MarinMC] Player coordinates: X:${(Math.random() * 100).toFixed(1)} Y:64.0 Z:${(Math.random() * 100).toFixed(1)}`);
          }
        }, 1000);

        resolve();
      }
    }, 200);
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
  event.sender.send('game:log', '[MarinMC Launcher] Game terminated or stopped by user request.');
  event.sender.send('game:progress', 0);
  return { success: true };
});
