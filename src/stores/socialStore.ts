import { create } from 'zustand';
import { useAuthStore } from './authStore.ts';
import { api, Contact } from '../lib/api';

export interface Friend {
  username: string;
  status: 'in-game' | 'in-launcher' | 'idle' | 'offline';
  currentServer?: string;
  lastSeen?: string;
  favorite?: boolean;
}

interface SocialState {
  friends: Friend[];
  pendingRequests: number;
  pendingNames: string[];
  initializeSocial: () => Promise<void>;
  addFriend: (username: string) => Promise<boolean>;
  removeFriend: (username: string) => Promise<void>;
  setPendingRequests: (count: number) => void;
  acceptRequest: (username: string) => Promise<void>;
  rejectRequest: (username: string) => void;
}

export const useSocialStore = create<SocialState>((set, get) => {
  // Subscribe to auth session changes to reload correct friends list
  useAuthStore.subscribe(() => {
    get().initializeSocial();
  });

  return {
    friends: [],
    pendingRequests: 0,
    pendingNames: [],

    initializeSocial: async () => {
      const session = useAuthStore.getState().session;
      if (!session) {
        set({ friends: [] });
        return;
      }
      try {
        const contacts = await api.getContacts(session.name);
        const friends: Friend[] = contacts.map(c => {
          let status: Friend['status'] = 'offline';
          let currentServer: string | undefined;
          if (c.status === 'online') {
            if (c.lastMessage && c.lastMessage.startsWith('In-game: ')) {
              status = 'in-game';
              currentServer = c.lastMessage.replace('In-game: ', '');
            } else {
              status = 'in-launcher';
            }
          } else if (c.status === 'idle') {
            status = 'idle';
          }
          return {
            username: c.name,
            status,
            currentServer,
            lastSeen: c.status === 'offline' ? (c.time ? `Offline since ${c.time}` : 'Offline') : undefined,
            favorite: c.favorite
          };
        });
        set({ friends });
      } catch (err) {
        console.error('Failed to load friends from API:', err);
      }
    },

    addFriend: async (username) => {
      const trimmed = username.trim();
      if (!trimmed) return false;

      const session = useAuthStore.getState().session;
      if (!session) return false;

      let officialName = trimmed;
      if (window.electronAPI) {
        const valRes = await window.electronAPI.validateMojangUsername(trimmed);
        if (!valRes.success || !valRes.name) {
          return false;
        }
        officialName = valRes.name;
      }

      try {
        const contacts = await api.getContacts(session.name);
        if (contacts.some(c => c.name.toLowerCase() === officialName.toLowerCase())) {
          return true;
        }

        const newContact: Contact = {
          id: officialName.toLowerCase(),
          name: officialName,
          avatar: `https://minotar.net/avatar/${officialName}/48`,
          status: 'offline',
          lastMessage: 'Henüz mesaj yok',
          time: 'Şimdi',
          type: 'dm',
          unread: 0,
          favorite: false
        };

        const updated = [...contacts, newContact];
        await api.updateContacts(session.name, updated);
        await get().initializeSocial();
        return true;
      } catch (err) {
        console.error('Failed to add friend to API:', err);
        return false;
      }
    },

    removeFriend: async (username) => {
      const session = useAuthStore.getState().session;
      if (!session) return;
      try {
        const contacts = await api.getContacts(session.name);
        const updated = contacts.filter(c => c.name.toLowerCase() !== username.toLowerCase());
        await api.updateContacts(session.name, updated);
        await get().initializeSocial();
      } catch (err) {
        console.error('Failed to remove friend from API:', err);
      }
    },

    setPendingRequests: (count) => set({ pendingRequests: count }),

    acceptRequest: async (username) => {
      const session = useAuthStore.getState().session;
      if (!session) return;
      try {
        const contacts = await api.getContacts(session.name);
        if (!contacts.some(c => c.name.toLowerCase() === username.toLowerCase())) {
          const newContact: Contact = {
            id: username.toLowerCase(),
            name: username,
            avatar: `https://minotar.net/avatar/${username}/48`,
            status: 'offline',
            lastMessage: 'Arkadaşlık isteği kabul edildi',
            time: 'Şimdi',
            type: 'dm',
            unread: 0,
            favorite: false
          };
          const updated = [...contacts, newContact];
          await api.updateContacts(session.name, updated);
        }
        set({
          pendingNames: get().pendingNames.filter(n => n !== username),
          pendingRequests: Math.max(0, get().pendingRequests - 1)
        });
        await get().initializeSocial();
      } catch (err) {
        console.error('Failed to accept request:', err);
      }
    },

    rejectRequest: (username) => {
      set({
        pendingNames: get().pendingNames.filter(n => n !== username),
        pendingRequests: Math.max(0, get().pendingRequests - 1)
      });
    }
  };
});

// Run initialization immediately on load
useSocialStore.getState().initializeSocial();
