import { ipcMain, BrowserWindow } from 'electron';
import axios from 'axios';

// Cache the active session
let activeSession: any = null;

// Helper to perform the full Microsoft -> Xbox Live -> XSTS -> Mojang token exchange sequence
async function exchangeCodeForSession(code: string): Promise<any> {
  try {
    console.log('[auth.ts] Starting Microsoft token exchange...');
    
    // 1. Exchange auth code for Microsoft OAuth Access Token
    const tokenUrl = 'https://login.live.com/oauth20_token.srf';
    const tokenParams = new URLSearchParams();
    tokenParams.append('client_id', '00000000402b5328');
    tokenParams.append('code', code);
    tokenParams.append('grant_type', 'authorization_code');
    tokenParams.append('redirect_uri', 'https://login.live.com/oauth20_desktop.srf');
    tokenParams.append('scope', 'XboxLive.signin offline_access');

    const tokenRes = await axios.post(tokenUrl, tokenParams.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const msAccessToken = tokenRes.data.access_token;
    if (!msAccessToken) {
      throw new Error('Microsoft access token could not be retrieved.');
    }

    console.log('[auth.ts] Microsoft Access Token acquired. Authenticating with Xbox Live...');

    // 2. Authenticate with Xbox Live
    const xblRes = await axios.post('https://user.auth.xboxlive.com/user/authenticate', {
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: `d=${msAccessToken}`
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const xblToken = xblRes.data.Token;
    const userHash = xblRes.data.DisplayClaims?.xui?.[0]?.uhs;
    if (!xblToken || !userHash) {
      throw new Error('Xbox Live authentication failed.');
    }

    console.log('[auth.ts] Xbox Live Token acquired. Requesting XSTS token...');

    // 3. Authenticate with XSTS
    let xstsToken = '';
    try {
      const xstsRes = await axios.post('https://xsts.auth.xboxlive.com/xsts/authorize', {
        Properties: {
          SandboxId: 'RETAIL',
          UserTokens: [xblToken]
        },
        RelyingParty: 'rp://api.minecraftservices.com/',
        TokenType: 'JWT'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      xstsToken = xstsRes.data.Token;
    } catch (xstsErr: any) {
      // Parse detailed Xbox Live/XSTS block errors
      const xerr = xstsErr.response?.data?.XErr;
      console.error('[auth.ts] XSTS Authorize error code:', xerr);
      if (xerr === 2148916233) {
        throw new Error('Bu Microsoft hesabına bağlı bir Xbox Live profili bulunamadı. Lütfen önce xbox.com adresine giderek bir profil oluşturun.');
      } else if (xerr === 2148916235) {
        throw new Error('Hesabınız ebeveyn denetimi grubunda yer alıyor. Lütfen Xbox Live ayarlarından gerekli izinleri verin.');
      } else if (xerr === 2148916238) {
        throw new Error('Hesabınız 18 yaşından küçük veya Xbox Live profili bulunmuyor. Lütfen xbox.com adresinde profil oluşturun.');
      }
      throw new Error(xstsErr.response?.data?.Message || 'XSTS authorization failed.');
    }

    if (!xstsToken) {
      throw new Error('XSTS token could not be retrieved.');
    }

    console.log('[auth.ts] XSTS Token acquired. Logging in with Minecraft Services...');

    // 4. Authenticate with Mojang (Minecraft Services)
    const mcLoginRes = await axios.post('https://api.minecraftservices.com/authentication/login_with_xbox', {
      identityToken: `XBL3.0 x=${userHash};${xstsToken}`
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const mcAccessToken = mcLoginRes.data.access_token;
    if (!mcAccessToken) {
      throw new Error('Minecraft login with Xbox failed.');
    }

    console.log('[auth.ts] Minecraft access token acquired. Fetching profile...');

    // 5. Fetch Minecraft Profile
    try {
      const profileRes = await axios.get('https://api.minecraftservices.com/minecraft/profile', {
        headers: {
          'Authorization': `Bearer ${mcAccessToken}`
        }
      });

      const profile = profileRes.data;
      if (!profile || !profile.id || !profile.name) {
        throw new Error('Geçerli bir Minecraft profili bulunamadı.');
      }

      console.log('[auth.ts] Profile successfully retrieved:', profile.name);

      return {
        id: profile.id,
        name: profile.name,
        token: mcAccessToken,
        type: 'ms',
        avatar: `https://minotar.net/avatar/${profile.name}/64`
      };
    } catch (profileErr: any) {
      if (profileErr.response?.status === 404) {
        throw new Error('Minecraft profili bulunamadı. Lütfen bu Microsoft hesabı üzerinde orijinal bir Minecraft lisansı olduğundan emin olun.');
      }
      throw profileErr;
    }
  } catch (err: any) {
    console.error('[auth.ts] Authentication pipeline failed:', err.message);
    throw err;
  }
}

// 1. Cracked / Offline login handler
ipcMain.handle('auth:login-cracked', async (_event, username: string) => {
  if (!username || username.trim().length < 3 || username.trim().length > 16) {
    throw new Error('Kullanıcı adı 3-16 karakter arasında olmalıdır.');
  }

  // Generate offline UUID
  const mockUuid = Buffer.from(`OfflinePlayer:${username}`).toString('hex').substring(0, 32);
  
  activeSession = {
    id: mockUuid,
    name: username.trim(),
    token: `offline_token_${Date.now()}`,
    type: 'cracked',
    avatar: `https://minotar.net/avatar/${username}/64`
  };

  console.log('[auth.ts] Cracked login session cache set:', activeSession.name);
  return activeSession;
});

// 2. Real Microsoft Login handler
ipcMain.handle('auth:login-microsoft', async () => {
  console.log('[auth.ts] Spawning Microsoft login child window...');
  
  return new Promise((resolve, reject) => {
    const authWindow = new BrowserWindow({
      width: 520,
      height: 680,
      title: 'Microsoft ile Giriş Yap',
      autoHideMenuBar: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const authUrl = 'https://login.live.com/oauth20_authorize.srf' +
      '?client_id=00000000402b5328' +
      '&response_type=code' +
      '&scope=XboxLive.signin%20offline_access' +
      '&redirect_uri=https://login.live.com/oauth20_desktop.srf';

    authWindow.loadURL(authUrl);

    authWindow.once('ready-to-show', () => {
      authWindow.show();
    });

    let resolved = false;

    // Handle redirection intercept
    const handleRedirect = async (url: string) => {
      if (url.startsWith('https://login.live.com/oauth20_desktop.srf')) {
        const parsedUrl = new URL(url);
        const code = parsedUrl.searchParams.get('code');
        const error = parsedUrl.searchParams.get('error');

        if (code) {
          resolved = true;
          authWindow.destroy(); // Safely destroy first
          
          try {
            activeSession = await exchangeCodeForSession(code);
            resolve(activeSession);
          } catch (err: any) {
            reject(new Error(err.message || 'Microsoft giriş doğrulaması başarısız oldu.'));
          }
        } else if (error) {
          resolved = true;
          authWindow.destroy();
          reject(new Error(`Microsoft Giriş Hatası: ${parsedUrl.searchParams.get('error_description') || error}`));
        }
      }
    };

    authWindow.webContents.on('will-redirect', (event, url) => {
      handleRedirect(url);
    });

    authWindow.webContents.on('will-navigate', (event, url) => {
      handleRedirect(url);
    });

    authWindow.on('closed', () => {
      if (!resolved) {
        reject(new Error('Giriş işlemi kullanıcı tarafından iptal edildi.'));
      }
    });
  });
});

// 3. Logout handler
ipcMain.handle('auth:logout', async () => {
  activeSession = null;
  console.log('[auth.ts] Session cleared.');
  return { success: true };
});
