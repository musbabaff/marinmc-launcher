import { create } from 'zustand';
import { UserSession } from '../types/auth';
import { authService } from '../auth/authService';

interface AuthState {
  session: UserSession | null;
  isLoading: boolean;
  error: string | null;
  loginWithCracked: (username: string) => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  initializeSession: () => void;
  setSession: (session: UserSession | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: authService.getStoredSession(),
  isLoading: false,
  error: null,
  clearError: () => set({ error: null }),
  
  setSession: (session) => {
    if (session) {
      localStorage.setItem('marinmc_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('marinmc_session');
    }
    set({ session });
  },
  
  initializeSession: () => {
    const session = authService.getStoredSession();
    set({ session });
  },

  loginWithCracked: async (username) => {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.loginCracked(username);
      set({ session, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Giriş yapılamadı.', isLoading: false });
    }
  },

  loginWithMicrosoft: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.loginMicrosoft();
      set({ session, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Microsoft ile giriş yapılamadı.', isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      set({ session: null, isLoading: false });
    }
  }
}));

