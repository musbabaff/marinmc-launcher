import axios from 'axios';
import { UserSession } from '../types/auth';

const API_BASE_URL = 'https://api.marinmc.com';
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

    try {
      // POST to https://api.marinmc.com/auth/cracked
      const response = await axios.post(`${API_BASE_URL}/auth/cracked`, {
        username: username.trim(),
      });

      // API returns: { uuid, username, accessToken }
      const { uuid, username: apiUsername, accessToken } = response.data;

      const session: UserSession = {
        id: uuid || `offline-${apiUsername.toLowerCase()}`,
        name: apiUsername || username.trim(),
        token: accessToken || `offline_token_${Date.now()}`,
        type: 'cracked',
        avatar: `https://mc-heads.net/avatar/${apiUsername || username.trim()}/64`,
      };

      localStorage.setItem(SESSION_STORE_NAME, JSON.stringify(session));
      
      // Also notify Electron if available
      if (window.electronAPI) {
        await window.electronAPI.loginCracked(username);
      }

      return session;
    } catch (error: any) {
      console.warn('MarinMC API cracked auth failed, falling back to local session...', error);
      
      // Fallback for development/testing when API is offline
      const fallbackSession: UserSession = {
        id: `offline-${username.toLowerCase()}`,
        name: username.trim(),
        token: `offline_token_${Date.now()}`,
        type: 'cracked',
        avatar: `https://mc-heads.net/avatar/${username.trim()}/64`,
      };

      localStorage.setItem(SESSION_STORE_NAME, JSON.stringify(fallbackSession));
      
      if (window.electronAPI) {
        await window.electronAPI.loginCracked(username);
      }

      return fallbackSession;
    }
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
