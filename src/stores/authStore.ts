import { create } from 'zustand';
import { UserSession } from '../types/auth';
import { authService } from '../auth/authService';

interface AuthState {
  session: UserSession | null;
  profiles: UserSession[];
  isLoading: boolean;
  error: string | null;
  loginWithCracked: (username: string) => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  initializeSession: () => void;
  setSession: (session: UserSession | null) => void;
  switchProfile: (id: string) => Promise<void>;
  removeProfile: (id: string) => void;
  addOfflineProfile: (username: string) => Promise<void>;
  addMicrosoftProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: authService.getStoredSession(),
  profiles: [],
  isLoading: false,
  error: null,
  clearError: () => set({ error: null }),
  
  setSession: (session) => {
    if (session) {
      localStorage.setItem('marinmc_session', JSON.stringify(session));
      const currentProfiles = get().profiles;
      if (!currentProfiles.some(p => p.id === session.id)) {
        const updated = [...currentProfiles, session];
        localStorage.setItem('marinmc_profiles', JSON.stringify(updated));
        set({ session, profiles: updated });
      } else {
        set({ session });
      }
    } else {
      localStorage.removeItem('marinmc_session');
      set({ session });
    }
  },
  
  initializeSession: () => {
    const session = authService.getStoredSession();
    let profiles: UserSession[] = [];
    try {
      const stored = localStorage.getItem('marinmc_profiles');
      profiles = stored ? JSON.parse(stored) : [];
    } catch (e) {
      profiles = [];
    }
    if (session && !profiles.some(p => p.id === session.id)) {
      profiles.push(session);
      localStorage.setItem('marinmc_profiles', JSON.stringify(profiles));
    }
    set({ session, profiles });
  },

  loginWithCracked: async (username) => {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.loginCracked(username);
      const currentProfiles = get().profiles;
      const updated = currentProfiles.filter(p => p.id !== session.id);
      updated.push(session);
      localStorage.setItem('marinmc_profiles', JSON.stringify(updated));
      set({ session, profiles: updated, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Giriş yapılamadı.', isLoading: false });
    }
  },

  loginWithMicrosoft: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.loginMicrosoft();
      const currentProfiles = get().profiles;
      const updated = currentProfiles.filter(p => p.id !== session.id);
      updated.push(session);
      localStorage.setItem('marinmc_profiles', JSON.stringify(updated));
      set({ session, profiles: updated, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Microsoft ile giriş yapılamadı.', isLoading: false });
    }
  },

  switchProfile: async (id) => {
    const target = get().profiles.find(p => p.id === id);
    if (target) {
      localStorage.setItem('marinmc_session', JSON.stringify(target));
      if (target.type === 'cracked' && window.electronAPI) {
        await window.electronAPI.loginCracked(target.name);
      }
      set({ session: target });
    }
  },

  removeProfile: (id) => {
    const updated = get().profiles.filter(p => p.id !== id);
    localStorage.setItem('marinmc_profiles', JSON.stringify(updated));
    let nextSession = get().session;
    if (get().session?.id === id) {
      nextSession = updated.length > 0 ? updated[0] : null;
      if (nextSession) {
        localStorage.setItem('marinmc_session', JSON.stringify(nextSession));
      } else {
        localStorage.removeItem('marinmc_session');
      }
    }
    set({ profiles: updated, session: nextSession });
  },

  addOfflineProfile: async (username) => {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.loginCracked(username);
      const currentProfiles = get().profiles;
      const updated = currentProfiles.filter(p => p.id !== session.id);
      updated.push(session);
      localStorage.setItem('marinmc_profiles', JSON.stringify(updated));
      set({ profiles: updated, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Profil eklenemedi.', isLoading: false });
      throw err;
    }
  },

  addMicrosoftProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.loginMicrosoft();
      const currentProfiles = get().profiles;
      const updated = currentProfiles.filter(p => p.id !== session.id);
      updated.push(session);
      localStorage.setItem('marinmc_profiles', JSON.stringify(updated));
      set({ profiles: updated, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Profil eklenemedi.', isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('marinmc_profiles');
      set({ session: null, profiles: [], isLoading: false });
    }
  }
}));

