import axios from 'axios';

// API base URL configuration (can be changed via settings/localStorage)
export const getApiBaseUrl = (): string => {
  return localStorage.getItem('marinmc_api_url') || 'https://server-two-lyart-67.vercel.app/api';
};

// Create Axios Instance
export const apiInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Update Authorization Token dynamically
export const setAuthToken = (token: string) => {
  apiInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

// Clear Authorization Token
export const clearAuthToken = () => {
  delete apiInstance.defaults.headers.common['Authorization'];
};

// ==========================================
//  REST API Methods with Offline Fallbacks
// ==========================================

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'idle' | 'offline';
  lastMessage: string;
  time: string;
  type: 'pinned' | 'dm';
  unread: number;
  favorite?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  time: string;
  isSelf: boolean;
  fileAttachment?: {
    name: string;
    size: string;
    isImage: boolean;
  };
}

export interface CosmeticsData {
  skinType: 'username' | 'file';
  skinVal?: string;
  capeUrl: string;
  purchasedCapes?: string[];
  modelType?: 'classic' | 'slim';
  wingsEnabled?: boolean;
  coins?: number;
}

export const api = {
  // --- USER PROFILE & STATS ---
  getUserProfile: async (username: string) => {
    try {
      const res = await apiInstance.get(`/users/${username}/profile`);
      return res.data;
    } catch (err) {
      console.warn('[API] getProfile failed, returning fallback.');
      return {
        username,
        totalPlayTime: parseInt(localStorage.getItem('marinmc_total_play_time') || '124', 10),
        lastLogin: localStorage.getItem('marinmc_last_login_time') || 'Bugün 20:15',
        coins: parseInt(localStorage.getItem('marinmc_coins') || '500', 10),
        playSessions: JSON.parse(localStorage.getItem('marinmc_play_sessions') || '[]')
      };
    }
  },

  updateUserProfile: async (username: string, data: { totalPlayTime?: number; lastLogin?: string; coins?: number; playSessions?: any[] }) => {
    try {
      await apiInstance.put(`/users/${username}/profile`, data);
    } catch (err) {
      console.warn('[API] updateProfile failed, updating locally.');
      if (data.totalPlayTime !== undefined) localStorage.setItem('marinmc_total_play_time', data.totalPlayTime.toString());
      if (data.lastLogin !== undefined) localStorage.setItem('marinmc_last_login_time', data.lastLogin);
      if (data.coins !== undefined) localStorage.setItem('marinmc_coins', data.coins.toString());
      if (data.playSessions !== undefined) localStorage.setItem('marinmc_play_sessions', JSON.stringify(data.playSessions));
    }
  },

  // --- COSMETICS ---
  getCosmetics: async (username: string): Promise<CosmeticsData> => {
    try {
      const res = await apiInstance.get(`/users/${username}/cosmetics`);
      return res.data;
    } catch (err) {
      console.warn('[API] getCosmetics failed, returning fallback.');
      return {
        skinType: (localStorage.getItem('marinmc_active_skin_type') as any) || 'username',
        skinVal: localStorage.getItem('marinmc_active_skin_val') || username,
        capeUrl: localStorage.getItem('marinmc_active_cape_url') || ''
      };
    }
  },

  updateCosmetics: async (username: string, data: CosmeticsData) => {
    try {
      await apiInstance.put(`/users/${username}/cosmetics`, data);
    } catch (err) {
      console.warn('[API] updateCosmetics failed, updating locally.');
      localStorage.setItem('marinmc_active_skin_type', data.skinType);
      if (data.skinVal) localStorage.setItem('marinmc_active_skin_val', data.skinVal);
      localStorage.setItem('marinmc_active_cape_url', data.capeUrl);
    }
  },

  // --- CHATS & FRIENDS ---
  getContacts: async (username: string): Promise<Contact[]> => {
    try {
      const res = await apiInstance.get(`/chats/${username}/contacts`);
      return res.data;
    } catch (err) {
      console.warn('[API] getContacts failed, returning fallback.');
      const local = localStorage.getItem('marinmc_chat_contacts');
      if (local) return JSON.parse(local);
      
      const initial: Contact[] = [
        { id: 'solmazzz', name: 'Solmazzz', avatar: 'https://minotar.net/avatar/Solmazzz/48', status: 'idle', lastMessage: 'Selam dostum! MarinMC Launcher\'ın yeni tasarımı nasıl olmuş?', time: '20:15', type: 'pinned', unread: 1 },
        { id: 'support', name: 'MarinMC Destek', avatar: 'https://minotar.net/avatar/MHF_Question/48', status: 'online', lastMessage: 'Destek kanalımıza hoş geldiniz. Sorularınızı buradan iletebilirsiniz.', time: 'Dün', type: 'dm', unread: 0 },
        { id: 'admin', name: 'Admin', avatar: 'https://minotar.net/avatar/MHF_Herobrine/48', status: 'offline', lastMessage: 'Görsel testler tamamlandı. Her şey harika çalışıyor!', time: '08.06', type: 'dm', unread: 0 }
      ];
      localStorage.setItem('marinmc_chat_contacts', JSON.stringify(initial));
      return initial;
    }
  },

  updateContacts: async (username: string, contacts: Contact[]) => {
    try {
      await apiInstance.put(`/chats/${username}/contacts`, { contacts });
    } catch (err) {
      console.warn('[API] updateContacts failed, updating locally.');
      localStorage.setItem('marinmc_chat_contacts', JSON.stringify(contacts));
    }
  },

  getChatMessages: async (username: string): Promise<Record<string, ChatMessage[]>> => {
    try {
      const res = await apiInstance.get(`/chats/${username}/messages`);
      return res.data;
    } catch (err) {
      console.warn('[API] getChatMessages failed, returning fallback.');
      const local = localStorage.getItem('marinmc_chat_messages');
      if (local) return JSON.parse(local);

      const initial: Record<string, ChatMessage[]> = {
        solmazzz: [{ id: 'm1', sender: 'Solmazzz', content: 'Selam dostum! MarinMC Launcher\'ın yeni tasarımı nasıl olmuş?', time: '20:15', isSelf: false }],
        support: [{ id: 'm2', sender: 'MarinMC Destek', content: 'Destek kanalımıza hoş geldiniz. Sorularınızı buradan iletebilirsiniz.', time: 'Dün 18:00', isSelf: false }],
        admin: [{ id: 'm3', sender: 'Admin', content: 'Görsel testler tamamlandı. Her şey harika çalışıyor!', time: '08.06.2026 15:30', isSelf: false }]
      };
      localStorage.setItem('marinmc_chat_messages', JSON.stringify(initial));
      return initial;
    }
  },

  updateChatMessages: async (username: string, messages: Record<string, ChatMessage[]>) => {
    try {
      await apiInstance.put(`/chats/${username}/messages`, { messages });
    } catch (err) {
      console.warn('[API] updateChatMessages failed, updating locally.');
      localStorage.setItem('marinmc_chat_messages', JSON.stringify(messages));
    }
  },

  getOnlineCount: async (): Promise<{ total: number }> => {
    try {
      const res = await apiInstance.get('/stats/online-count');
      return res.data;
    } catch {
      // Offline fallback: return sum of local players
      return { total: 504 };
    }
  },

  getServerList: async (): Promise<any[]> => {
    try {
      const res = await apiInstance.get('/servers');
      return res.data;
    } catch {
      // Offline fallback: return standard MarinMC servers aligned with backend
      return [
        {
          id: 'towny',
          name: 'MarinMC Towny',
          ip: 'oyna.marinmc.com',
          port: 25565,
          mode: 'TOWNY',
          description: 'Gelişmiş Towny deneyimi, özel ekonomi ve meslekler.',
          playerCount: 284,
          maxPlayers: 1000,
          tags: ['ECONOMY', 'JOBS', 'WAR'],
          themeColor: 'teal',
          artworkUrl: 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=600&auto=format&fit=crop&q=60',
          bannerUrl: 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=800&auto=format&fit=crop&q=80',
          online: true,
          players: { online: 284, max: 1000 },
          version: '1.21.8',
          ping: 15
        },
        {
          id: 'survival',
          name: 'MarinMC Survival',
          ip: 'oyna.marinmc.com',
          port: 25565,
          mode: 'SURVIVAL',
          description: 'Klasik hayatta kalma deneyimi, iddialı zindanlar ve klanlar.',
          playerCount: 128,
          maxPlayers: 1000,
          tags: ['KLAN', 'DUNGEON', 'PVP'],
          themeColor: 'purple',
          artworkUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=60',
          bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
          online: true,
          players: { online: 128, max: 1000 },
          version: '1.21.8',
          ping: 22
        },
        {
          id: 'skyblock',
          name: 'MarinMC Skyblock',
          ip: 'oyna.marinmc.com',
          port: 25565,
          mode: 'SKYBLOCK',
          description: 'Gelişmiş ada görevleri, adalar arası ticaret ve özel minyonlar.',
          playerCount: 92,
          maxPlayers: 1000,
          tags: ['SKYBLOCK', 'MINIONS', 'TRADE'],
          themeColor: 'orange',
          artworkUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=60',
          bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
          online: true,
          players: { online: 92, max: 1000 },
          version: '1.21.8',
          ping: 18
        }
      ];
    }
  },

  getLeaderboard: async () => {
    try {
      const res = await apiInstance.get('/leaderboard');
      return res.data;
    } catch (err) {
      console.warn('[API] getLeaderboard failed, returning fallback.');
      return [
        { rank: 1, username: '172px', totalPlayTime: 852, lastLogin: 'Bugün 12:44', coins: 4500, status: 'online', server: 'Survival' },
        { rank: 2, username: 'daaaavidds', totalPlayTime: 712, lastLogin: 'Bugün 13:10', coins: 3800, status: 'idle', server: 'Towny' },
        { rank: 3, username: 'masaya46', totalPlayTime: 590, lastLogin: 'Dün 20:15', coins: 2900, status: 'online', server: 'Skyblock' },
        { rank: 4, username: 'cuvsa', totalPlayTime: 440, lastLogin: '08.06.2026', coins: 1200, status: 'offline', server: '-' },
        { rank: 5, username: 'zakhbear', totalPlayTime: 384, lastLogin: '07.06.2026', coins: 950, status: 'offline', server: '-' },
        { rank: 6, username: 'wtfbroimlagging', totalPlayTime: 290, lastLogin: '05.06.2026', coins: 640, status: 'offline', server: '-' },
        { rank: 7, username: 'wtfbro', totalPlayTime: 210, lastLogin: '04.06.2026', coins: 520, status: 'offline', server: '-' },
        { rank: 8, username: 'Steve', totalPlayTime: 180, lastLogin: '02.06.2026', coins: 500, status: 'offline', server: '-' },
        { rank: 9, username: 'Alex', totalPlayTime: 150, lastLogin: '01.06.2026', coins: 500, status: 'offline', server: '-' }
      ];
    }
  }
};

export const checkConnectivity = async (): Promise<boolean> => {
  try {
    await axios.get('https://api.mojang.com', { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
};
