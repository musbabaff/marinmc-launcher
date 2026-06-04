import { create } from 'zustand';

export interface Friend {
  username: string;
  status: 'in-game' | 'in-launcher' | 'idle' | 'offline';
  currentServer?: string;
  lastSeen?: string;
}

interface SocialState {
  friends: Friend[];
  pendingRequests: number;
  setFriends: (friends: Friend[]) => void;
  addFriend: (username: string) => Promise<boolean>;
  removeFriend: (username: string) => void;
  setPendingRequests: (count: number) => void;
}

const INITIAL_MOCK_FRIENDS: Friend[] = [
  // Online / In-game
  { username: 'Luser_29', status: 'in-game', currentServer: 'MarinMC Towny' },
  { username: 'HypixelGod', status: 'in-game', currentServer: 'MarinMC Survival' },
  { username: 'Notch', status: 'in-game', currentServer: 'MarinMC Creative' },
  { username: 'Steve', status: 'in-game', currentServer: 'MarinMC Towny' },
  // In Launcher
  { username: 'alex_mc', status: 'in-launcher' },
  { username: 'musbabaff', status: 'in-launcher' },
  // Idle
  { username: 'LegoBuilder', status: 'idle' },
  { username: 'Dream', status: 'idle' },
  { username: 'Technoblade', status: 'idle' },
  { username: 'Skeppy', status: 'idle' },
  // Offline (20 offline friends)
  { username: 'Jeb_', status: 'offline', lastSeen: '2 hours ago' },
  { username: 'Dinnerbone', status: 'offline', lastSeen: '5 hours ago' },
  { username: 'Grian', status: 'offline', lastSeen: '1 day ago' },
  { username: 'MumboJumbo', status: 'offline', lastSeen: '2 days ago' },
  { username: 'DanTDM', status: 'offline', lastSeen: '3 days ago' },
  { username: 'PopularMMOs', status: 'offline', lastSeen: '5 days ago' },
  { username: 'CaptainSparklez', status: 'offline', lastSeen: '1 week ago' },
  { username: 'AntVenom', status: 'offline', lastSeen: '1 week ago' },
  { username: 'SethBling', status: 'offline', lastSeen: '2 weeks ago' },
  { username: 'Stampylongnose', status: 'offline', lastSeen: '2 weeks ago' },
  { username: 'iBallisticSquid', status: 'offline', lastSeen: '3 weeks ago' },
  { username: 'Lachy', status: 'offline', lastSeen: '3 weeks ago' },
  { username: 'PrestonPlayz', status: 'offline', lastSeen: '1 month ago' },
  { username: 'Ssundee', status: 'offline', lastSeen: '1 month ago' },
  { username: 'Unspeakable', status: 'offline', lastSeen: '1 month ago' },
  { username: 'MrBeast', status: 'offline', lastSeen: '2 months ago' },
  { username: 'BajanCanadian', status: 'offline', lastSeen: '2 months ago' },
  { username: 'JeromeASF', status: 'offline', lastSeen: '3 months ago' },
  { username: 'SkyDoesMinecraft', status: 'offline', lastSeen: '1 year ago' },
  { username: 'Deadlox', status: 'offline', lastSeen: '1 year ago' }
];

export const useSocialStore = create<SocialState>((set) => ({
  friends: INITIAL_MOCK_FRIENDS,
  pendingRequests: 3,
  setFriends: (friends) => set({ friends }),
  addFriend: async (username) => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    set((state) => {
      if (state.friends.some((f) => f.username.toLowerCase() === username.toLowerCase())) {
        return state;
      }
      return {
        friends: [
          { username, status: 'offline', lastSeen: 'Just now' },
          ...state.friends
        ]
      };
    });
    return true;
  },
  removeFriend: (username) =>
    set((state) => ({
      friends: state.friends.filter((f) => f.username !== username)
    })),
  setPendingRequests: (count) => set({ pendingRequests: count })
}));
