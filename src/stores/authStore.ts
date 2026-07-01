import { create } from 'zustand';
import { UserSession } from '../types/auth';
import { authService } from '../auth/authService';

const PROFILES_STORE_NAME = 'marinmc_profiles';
const SESSION_STORE_NAME = 'marinmc_session';

interface AuthState {
  session: UserSession | null;
  profiles: UserSession[];
  isLoading: boolean;
  error: string | null;
  loginWithCracked: (username: string, password: string, isRegister?: boolean, email?: string) => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  initializeSession: () => void;
  setSession: (session: UserSession | null) => void;
  switchProfile: (id: string) => Promise<void>;
  removeProfile: (id: string) => void;
  addOfflineProfile: (username: string, password: string, isRegister?: boolean, email?: string) => Promise<void>;
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
      authService.persistSession(session);
      const currentProfiles = get().profiles;
      if (!currentProfiles.some(p => p.id === session.id)) {
        const updated = [...currentProfiles, session];
        authService.persistProfiles(updated);
        set({ session, profiles: updated });
      } else {
        set({ session });
      }
    } else {
      localStorage.removeItem(SESSION_STORE_NAME);
      set({ session });
    }
  },

  initializeSession: () => {
    const session = authService.getStoredSession();
    let profiles: UserSession[] = authService.getStoredProfiles();
    if (session && !profiles.some(p => p.id === session.id)) {
      profiles.push(session);
      authService.persistProfiles(profiles);
    }
    set({ session, profiles });
  },

  loginWithCracked: async (username, password, isRegister = false, email) => {
    set({ isLoading: true, error: null });
    try {
      const session = isRegister
        ? await authService.registerCracked(username, password, email)
        : await authService.loginCracked(username, password);
      const currentProfiles = get().profiles;
      const updated = currentProfiles.filter(p => p.id !== session.id);
      updated.push(session);
      authService.persistProfiles(updated);
      set({ session, profiles: updated, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Giriş yapılamadı.', isLoading: false });
      throw err;
    }
  },

  loginWithMicrosoft: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.loginMicrosoft();
      const currentProfiles = get().profiles;
      const updated = currentProfiles.filter(p => p.id !== session.id);
      updated.push(session);
      authService.persistProfiles(updated);
      set({ session, profiles: updated, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Microsoft ile giriş yapılamadı.', isLoading: false });
    }
  },

  switchProfile: async (id) => {
    const target = get().profiles.find(p => p.id === id);
    if (target) {
      await authService.persistSession(target);
      if (target.type === 'cracked' && window.electronAPI) {
        await window.electronAPI.loginCracked(target.name);
      }
      set({ session: target });
      // Full reload so every store, the WebSocket and all data re-initialise as
      // the new account (e.g. its friend requests load).
      try { sessionStorage.setItem('marinmc_switched_to', target.name); } catch {}
      window.location.reload();
    }
  },

  removeProfile: (id) => {
    const updated = get().profiles.filter(p => p.id !== id);
    authService.persistProfiles(updated);
    let nextSession = get().session;
    if (get().session?.id === id) {
      nextSession = updated.length > 0 ? updated[0] : null;
      if (nextSession) {
        authService.persistSession(nextSession);
      } else {
        localStorage.removeItem(SESSION_STORE_NAME);
      }
    }
    set({ profiles: updated, session: nextSession });
  },

  addOfflineProfile: async (username, password, isRegister = false, email) => {
    set({ isLoading: true, error: null });
    try {
      const session = isRegister
        ? await authService.registerCracked(username, password, email)
        : await authService.loginCracked(username, password);
      const currentProfiles = get().profiles;
      const updated = currentProfiles.filter(p => p.id !== session.id);
      updated.push(session);
      authService.persistProfiles(updated);
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
      authService.persistProfiles(updated);
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
      localStorage.removeItem(PROFILES_STORE_NAME);
      set({ session: null, profiles: [], isLoading: false });
    }
  }
}));
