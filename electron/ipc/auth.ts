import { ipcMain } from 'electron';

// Mock database or session caching
let activeSession: any = null;

ipcMain.handle('auth:login-cracked', async (_event, username: string) => {
  // Validate username (standard Minecraft username constraints)
  if (!username || username.trim().length < 3 || username.trim().length > 16) {
    throw new Error('Username must be between 3 and 16 characters long.');
  }

  // Generate a predictable offline-mode UUID
  const mockUuid = Buffer.from(`OfflinePlayer:${username}`).toString('hex').substring(0, 32);
  
  activeSession = {
    id: mockUuid,
    name: username.trim(),
    token: `offline_token_${Date.now()}`,
    type: 'cracked',
    avatar: `https://mc-heads.net/avatar/${username}/64`
  };

  return activeSession;
});

ipcMain.handle('auth:login-microsoft', async () => {
  // Simulates a Microsoft OAuth login browser window popup or device code flow
  // In a full implementation, you would open an OAuth window or call an auth library
  return new Promise((resolve) => {
    setTimeout(() => {
      activeSession = {
        id: 'c0c7a52f205b4b73bbf8b2a1a8cde59f',
        name: 'MarinPremium',
        token: `ms_token_oauth_${Date.now()}`,
        type: 'ms',
        avatar: 'https://mc-heads.net/avatar/MarinPremium/64'
      };
      resolve(activeSession);
    }, 1500); // simulate delay
  });
});

ipcMain.handle('auth:logout', async () => {
  activeSession = null;
  return { success: true };
});
