import { create } from 'zustand';
import { useAuthStore } from './authStore.ts';
import { api } from '../lib/api';
import { wsManager } from '../lib/websocket';

let wsBound = false;
let presenceStarted = false;

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
  addFriend: (username: string) => Promise<{ ok: boolean; error?: string }>;
  removeFriend: (username: string) => Promise<void>;
  setPendingRequests: (count: number) => void;
  acceptRequest: (username: string) => Promise<void>;
  rejectRequest: (username: string) => Promise<void>;
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
        set({ friends: [], pendingNames: [], pendingRequests: 0 });
        return;
      }

      // Presence heartbeat: ping the server every 15s so friends see us online
      // (works without WebSocket; the server marks us online from last_seen).
      if (!presenceStarted) {
        presenceStarted = true;
        const ping = () => {
          const s = useAuthStore.getState().session;
          if (s) api.pingPresence(s.name);
        };
        ping();
        setInterval(ping, 15000);
      }

      // Bind WS listeners once: friend events + presence changes refresh in real time.
      if (!wsBound) {
        wsBound = true;
        wsManager.addListener('friend:request', () => get().initializeSocial());
        wsManager.addListener('friend:accept', () => get().initializeSocial());
        wsManager.addListener('friend:remove', () => get().initializeSocial());
        wsManager.addListener('status:change', () => get().initializeSocial());
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

      // Load real incoming friend requests from the server
      try {
        const requests = await api.getFriendRequests(session.name);
        set({ pendingNames: requests.map(r => r.fromName), pendingRequests: requests.length });
      } catch (err) {
        console.error('Failed to load friend requests:', err);
      }
    },

    addFriend: async (username) => {
      const trimmed = username.trim();
      if (!trimmed) return { ok: false, error: 'Kullanıcı adı boş.' };

      const session = useAuthStore.getState().session;
      if (!session) return { ok: false, error: 'Oturum bulunamadı.' };

      // Prevent sending a request to yourself
      if (trimmed.toLowerCase() === session.name.toLowerCase()) {
        return { ok: false, error: 'Kendine istek gönderemezsin.' };
      }

      // Send a real friend request to the server. The other user only becomes a
      // friend once they accept (or instantly if they had already requested you).
      const res = await api.sendFriendRequest(session.name, trimmed);
      if (!res.success) {
        console.warn('[Social] friend request failed:', res.error);
        return { ok: false, error: res.error };
      }
      // Reload so an auto-accepted request shows up immediately.
      await get().initializeSocial();
      return { ok: true };
    },

    removeFriend: async (username) => {
      const session = useAuthStore.getState().session;
      if (!session) return;
      try {
        // Reciprocal removal: server deletes the contact on BOTH sides.
        await api.removeFriendApi(session.name, username);

        // Also clear our local chat history with them
        try {
          const allMessages = await api.getChatMessages(session.name);
          const contactId = username.toLowerCase();
          if (allMessages[contactId]) {
            delete allMessages[contactId];
            await api.updateChatMessages(session.name, allMessages);
          }
        } catch (msgErr) {
          console.error('Failed to remove friend messages:', msgErr);
        }

        await get().initializeSocial();
      } catch (err) {
        console.error('Failed to remove friend from API:', err);
      }
    },

    setPendingRequests: (count) => set({ pendingRequests: count }),

    acceptRequest: async (username) => {
      const session = useAuthStore.getState().session;
      if (!session) return;
      // Server creates reciprocal contacts for both users.
      await api.acceptFriend(session.name, username);
      await get().initializeSocial();
    },

    rejectRequest: async (username) => {
      const session = useAuthStore.getState().session;
      if (!session) return;
      await api.rejectFriend(session.name, username);
      set({
        pendingNames: get().pendingNames.filter(n => n !== username),
        pendingRequests: Math.max(0, get().pendingRequests - 1)
      });
    }
  };
});

// Run initialization immediately on load
useSocialStore.getState().initializeSocial();
