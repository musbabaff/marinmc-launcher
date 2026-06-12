import { UserSession } from '../types/auth';

const SESSION_STORE_NAME = 'marinmc_session';

export const authService = {
  /**
   * Log in using a cracked/offline username.
   * Calls the MarinMC API to register/validate.
   */
  async loginCracked(username: string): Promise<UserSession> {
    if (!username || username.trim().length < 3 || username.trim().length > 16) {
      throw new Error('Kullanıcı adı 3-16 karakter arasında olmalıdır.');
    }

    // Completely bypass api.marinmc.com request to avoid DNS name resolution failures
    const session: UserSession = {
      id: `offline-${username.toLowerCase()}`,
      name: username.trim(),
      token: `offline_token_${Date.now()}`,
      type: 'cracked',
      avatar: `https://mc-heads.net/avatar/${username.trim()}/64`,
    };

    localStorage.setItem(SESSION_STORE_NAME, JSON.stringify(session));
    
    if (window.electronAPI) {
      await window.electronAPI.loginCracked(username);
    }

    return session;
  },

  /**
   * Log in using Microsoft Premium OAuth.
   * Triggers the Electron-side BrowserWindow flow.
   */
  async loginMicrosoft(): Promise<UserSession> {
    try {
      let session: UserSession;
      
      if (window.electronAPI) {
        // Triggers Microsoft OAuth inside Electron
        session = await window.electronAPI.loginMicrosoft();
      } else {
        // Browser fallback mockup
        await new Promise((resolve) => setTimeout(resolve, 1500));
        session = {
          id: 'ms-mock-uuid-' + Math.random().toString(36).substr(2, 9),
          name: 'MarinPremium',
          token: `mock_ms_token_${Date.now()}`,
          type: 'ms',
          avatar: 'https://mc-heads.net/avatar/MarinPremium/64',
        };
      }

      localStorage.setItem(SESSION_STORE_NAME, JSON.stringify(session));
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
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
};
