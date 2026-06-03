import { create } from 'zustand';
import { UserSession } from '../types/auth';

interface AuthState {
  session: UserSession | null;
  isLoading: boolean;
  error: string | null;
  loginWithCracked: (username: string) => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: (() => {
    try {
      return JSON.parse(localStorage.getItem('marinmc_session') || 'null');
    } catch {
      return null;
    }
  })(),
  isLoading: false,
  error: null,
  clearError: () => set({ error: null }),
  loginWithCracked: async (username) => {
    set({ isLoading: true, error: null });
    try {
      let session: UserSession;
      if (window.electronAPI) {
        session = await window.electronAPI.loginCracked(username);
      } else {
        // Browser fallback
        session = {
          id: 'offline-' + username.toLowerCase(),
          name: username,
          token: `mock_token_${Date.now()}`,
          type: 'cracked',
          avatar: `https://mc-heads.net/avatar/${username}/64`
        };
      }
      localStorage.setItem('marinmc_session', JSON.stringify(session));
      set({ session, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Giriş yapılamadı', isLoading: false });
    }
  },
  loginWithMicrosoft: async () => {
    set({ isLoading: true, error: null });
    try {
      let session: UserSession;
      if (window.electronAPI) {
        session = await window.electronAPI.loginMicrosoft();
      } else {
        // Browser mock callback
        await new Promise((resolve) => setTimeout(resolve, 1000));
        session = {
          id: 'ms-mock-uuid',
          name: 'MarinPremium',
          token: `mock_ms_token_${Date.now()}`,
          type: 'ms',
          avatar: 'https://mc-heads.net/avatar/MarinPremium/64'
        };
      }
      localStorage.setItem('marinmc_session', JSON.stringify(session));
      set({ session, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Microsoft ile giriş yapılamadı', isLoading: false });
    }
  },
  logout: async () => {
    set({ isLoading: true });
    try {
      if (window.electronAPI) {
        await window.electronAPI.logout();
      }
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('marinmc_session');
    set({ session: null, isLoading: false });
  }
}));
