import { UserSession } from '../types/auth';
import { apiInstance, setAuthToken, clearAuthToken } from '../lib/api';

const SESSION_STORE_NAME = 'marinmc_session';

export const authService = {
  /**
   * Register using a cracked/offline username and password.
   */
  async registerCracked(username: string, password: string, email?: string): Promise<UserSession> {
    if (!username || username.trim().length < 3 || username.trim().length > 16) {
      throw new Error('Kullanıcı adı 3-16 karakter arasında olmalıdır.');
    }
    if (!password || password.length < 6) {
      throw new Error('Şifre en az 6 karakter olmalıdır.');
    }

    try {
      const res = await apiInstance.post('/auth/register', {
        username: username.trim(),
        password: password,
        email: email ? email.trim() : undefined
      });

      const session: UserSession = res.data.session;
      localStorage.setItem(SESSION_STORE_NAME, JSON.stringify(session));
      setAuthToken(session.token);
      
      if (window.electronAPI) {
        await window.electronAPI.loginCracked(username.trim());
      }

      return session;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Kayıt başarısız oldu.');
    }
  },

  /**
   * Log in using a cracked/offline username and password.
   */
  async loginCracked(username: string, password: string): Promise<UserSession> {
    if (!username || username.trim().length < 3 || username.trim().length > 16) {
      throw new Error('Kullanıcı adı 3-16 karakter arasında olmalıdır.');
    }
    if (!password || password.length < 6) {
      throw new Error('Şifre en az 6 karakter olmalıdır.');
    }

    try {
      const res = await apiInstance.post('/auth/login', {
        username: username.trim(),
        password: password
      });

      const session: UserSession = res.data.session;
      localStorage.setItem(SESSION_STORE_NAME, JSON.stringify(session));
      setAuthToken(session.token);
      
      if (window.electronAPI) {
        await window.electronAPI.loginCracked(username.trim());
      }

      return session;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Giriş başarısız oldu.');
    }
  },

  /**
   * Log in using Microsoft Premium OAuth.
   * Triggers the Electron-side BrowserWindow flow.
   */
  async loginMicrosoft(): Promise<UserSession> {
    try {
      if (!window.electronAPI) {
        // The real Microsoft OAuth flow runs inside Electron; there is no
        // browser stand-in (no fabricated session).
        throw new Error('Microsoft ile giriş yalnızca masaüstü uygulamasında kullanılabilir.');
      }

      // Triggers the real Microsoft OAuth flow inside Electron
      const session: UserSession = await window.electronAPI.loginMicrosoft();

      // Synchronize with our backend server to get a valid authentication token
      try {
        const res = await apiInstance.post('/auth/microsoft-login', {
          username: session.name,
          uuid: session.id,
          token: session.token
        });
        
        if (res.data && res.data.token) {
          session.token = res.data.token;
        }
      } catch (err) {
        console.warn('[AuthService] Backend Microsoft sync failed, using client token:', err);
      }

      localStorage.setItem(SESSION_STORE_NAME, JSON.stringify(session));
      setAuthToken(session.token);
      return session;
    } catch (error: any) {
      throw new Error(error?.message || 'Microsoft ile giriş yapılamadı.');
    }
  },

  /**
   * Log out of the current session.
   */
  async logout(): Promise<void> {
    localStorage.removeItem(SESSION_STORE_NAME);
    clearAuthToken();
    if (window.electronAPI) {
      await window.electronAPI.logout();
    }
  },

  /**
   * Get the cached user session.
   */
  getStoredSession(): UserSession | null {
    try {
      const data = localStorage.getItem(SESSION_STORE_NAME);
      if (data) {
        const session = JSON.parse(data);
        if (session && session.avatar && session.avatar.includes('mc-heads.net')) {
          session.avatar = session.avatar.replace('mc-heads.net', 'minotar.net');
          localStorage.setItem(SESSION_STORE_NAME, JSON.stringify(session));
        }
        if (session && session.token) {
          setAuthToken(session.token);
        }
        return session;
      }
      return null;
    } catch {
      return null;
    }
  }
};
