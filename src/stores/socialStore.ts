import { create } from 'zustand';
import { useAuthStore } from './authStore.ts';

export interface Friend {
  username: string;
  status: 'in-game' | 'in-launcher' | 'idle' | 'offline';
  currentServer?: string;
  lastSeen?: string;
}

interface SocialState {
  friends: Friend[];
  pendingRequests: number;
  pendingNames: string[];
  initializeSocial: () => void;
  addFriend: (username: string) => Promise<boolean>;
  removeFriend: (username: string) => void;
  setPendingRequests: (count: number) => void;
  acceptRequest: (username: string) => void;
  rejectRequest: (username: string) => void;
}

// Get standard storage key based on current logged in user
const getStorageKey = () => {
  const session = useAuthStore.getState().session;
  const user = session ? session.name : 'default';
  return `marinmc_friends_${user.toLowerCase()}`;
};

// Seed friends list to match MarinMC's mockup design
const SEED_FRIENDS: Friend[] = [
  { username: '172px', status: 'in-game', currentServer: 'Hypixel' },
  { username: 'daaaavidds', status: 'idle', currentServer: 'Singleplayer' }, // We'll map status red/orange/purple dynamically in UI
  { username: 'masaya46', status: 'in-game', currentServer: 'Private Server' },
  { username: '3wafyy', status: 'in-launcher' },
  { username: 'cuvsa', status: 'in-game', currentServer: 'Donut SMP' },
  { username: 'zakhbear', status: 'idle', currentServer: 'In Menus' },
  { username: 'KingofHalo04', status: 'idle' },
  { username: 'meegreyone', status: 'idle' },
  { username: 'XerzerBro', status: 'offline', lastSeen: 'Offline for 3 days' },
  { username: '2fishbowl', status: 'offline', lastSeen: 'Offline for 21 hours' },
  { username: 'wtfbroimlagging', status: 'offline', lastSeen: 'Offline for 30 days' },
  { username: 'Director32', status: 'offline', lastSeen: 'Offline for 251 days' }
];

export const useSocialStore = create<SocialState>((set, get) => {
  // Subscribe to auth session changes to reload correct friends list
  useAuthStore.subscribe(() => {
    // Reload social state when user logs in or out
    get().initializeSocial();
  });

  return {
    friends: [],
    pendingRequests: 2,
    pendingNames: ['KillaMc', 'GamerQueen'],

    initializeSocial: () => {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(SEED_FRIENDS));
      set({ friends: SEED_FRIENDS });
    },

    addFriend: async (username) => {
      const trimmed = username.trim();
      if (!trimmed) return false;

      // Don't add duplicate
      const currentFriends = get().friends;
      if (currentFriends.some(f => f.username.toLowerCase() === trimmed.toLowerCase())) {
        return true;
      }

      let officialName = trimmed;

      if (window.electronAPI) {
        // Validate with Mojang API via IPC
        const valRes = await window.electronAPI.validateMojangUsername(trimmed);
        if (!valRes.success || !valRes.name) {
          return false; // Friend does not exist in Minecraft
        }
        officialName = valRes.name;
      }

      const newFriend: Friend = {
        username: officialName,
        status: 'offline',
        lastSeen: 'Az önce eklendi'
      };

      const updated = [newFriend, ...currentFriends];
      set({ friends: updated });
      localStorage.setItem(getStorageKey(), JSON.stringify(updated));
      return true;
    },

    removeFriend: (username) => {
      const filtered = get().friends.filter(f => f.username.toLowerCase() !== username.toLowerCase());
      set({ friends: filtered });
      localStorage.setItem(getStorageKey(), JSON.stringify(filtered));
    },

    setPendingRequests: (count) => set({ pendingRequests: count }),

    acceptRequest: (username) => {
      const currentFriends = get().friends;
      const newFriend: Friend = {
        username,
        status: 'offline',
        lastSeen: 'Az önce eklendi'
      };
      const updated = [newFriend, ...currentFriends];
      set({
        friends: updated,
        pendingNames: get().pendingNames.filter(n => n !== username),
        pendingRequests: Math.max(0, get().pendingRequests - 1)
      });
      localStorage.setItem(getStorageKey(), JSON.stringify(updated));
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
