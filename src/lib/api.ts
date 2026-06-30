import axios from 'axios';

// Production API base. Override at build time with VITE_API_URL, or at runtime
// via the marinmc_api_url localStorage key (Settings). Defaults to the public
// MarinMC API domain.
export const PROD_API_BASE = (import.meta.env.VITE_API_URL as string) || 'https://api.marinmc.com/api';

// API base URL configuration (can be changed via settings/localStorage)
export const getApiBaseUrl = (): string => {
  return localStorage.getItem('marinmc_api_url') ||
    (import.meta.env.DEV ? 'http://localhost:3000/api' : PROD_API_BASE);
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
    isImage?: boolean;
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
  wingStyle?: string;
}

export interface CommunityScreenshot {
  id: string;
  url: string;
  title: string;
  username: string;
  likes: number;
  date: string;
}

export interface Quest {
  id: string;
  description: string;
  progress: number;
  target: number;
  coins: number;
  claimed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  date: string;
}

export const api = {
  getUserProfile: async (username: string) => {
    try {
      const res = await apiInstance.get(`/users/${username}/profile`);
      return res.data;
    } catch (err) {
      console.warn('[API] getProfile failed, returning fallback.');
      return {
        username,
        totalPlayTime: Number(localStorage.getItem('marinmc_total_play_time') || '0'),
        lastLogin: localStorage.getItem('marinmc_last_login_time') || '',
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

      const initial: Contact[] = [];
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

  // --- FRIEND REQUESTS ---
  sendFriendRequest: async (me: string, target: string): Promise<{ success: boolean; status?: 'requested' | 'friends'; error?: string }> => {
    try {
      const res = await apiInstance.post(`/friends/${me}/request`, { target });
      return res.data;
    } catch (err: any) {
      // A 404 here means the server doesn't have the friends endpoints yet (not updated).
      if (err?.response?.status === 404) {
        return { success: false, error: 'Sunucu bu özelliği desteklemiyor (API güncellenmemiş olabilir).' };
      }
      return { success: false, error: err?.response?.data?.error || 'İstek gönderilemedi (sunucuya ulaşılamadı).' };
    }
  },

  getFriendRequests: async (me: string): Promise<{ from: string; fromName: string }[]> => {
    try {
      const res = await apiInstance.get(`/friends/${me}/requests`);
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  acceptFriend: async (me: string, requester: string): Promise<boolean> => {
    try {
      await apiInstance.post(`/friends/${me}/accept`, { requester });
      return true;
    } catch (err) {
      console.warn('[API] acceptFriend failed', err);
      return false;
    }
  },

  rejectFriend: async (me: string, requester: string): Promise<boolean> => {
    try {
      await apiInstance.post(`/friends/${me}/reject`, { requester });
      return true;
    } catch (err) {
      console.warn('[API] rejectFriend failed', err);
      return false;
    }
  },

  removeFriendApi: async (me: string, target: string): Promise<boolean> => {
    try {
      await apiInstance.post(`/friends/${me}/remove`, { target });
      return true;
    } catch (err) {
      console.warn('[API] removeFriend failed', err);
      return false;
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

      const initial: Record<string, ChatMessage[]> = {};
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

  // Deliver a message to the recipient over REST (reliable even if WebSocket
  // can't connect). The server writes it to the recipient's log and notifies live.
  sendChatMessage: async (
    me: string,
    payload: { recipient: string; content: string; time: string; fileAttachment?: any; voiceDuration?: string }
  ): Promise<boolean> => {
    try {
      await apiInstance.post(`/chats/${me}/send`, payload);
      return true;
    } catch (err) {
      console.warn('[API] sendChatMessage failed', err);
      return false;
    }
  },

  // Presence heartbeat so friends see us as online (REST, no WebSocket needed).
  pingPresence: async (me: string): Promise<void> => {
    try { await apiInstance.post(`/presence/${me}/ping`); } catch { /* ignore */ }
  },

  getOnlineCount: async (): Promise<{ total: number }> => {
    try {
      const res = await apiInstance.get('/stats/online-count');
      return res.data;
    } catch {
      // Offline fallback: return sum of local players
      return { total: 0 };
    }
  },

  getServerList: async (): Promise<any[]> => {
    try {
      const res = await apiInstance.get('/servers');
      return res.data;
    } catch {
      // No fabricated servers: if the API is unreachable, return nothing so the
      // UI shows a real "no servers / offline" state instead of fake data.
      return [];
    }
  },

  getLeaderboard: async () => {
    try {
      const res = await apiInstance.get('/leaderboard');
      return res.data;
    } catch (err) {
      console.warn('[API] getLeaderboard failed, returning empty fallback.');
      return [];
    }
  },

  // --- COMMUNITY GALLERY ---
  getCommunityScreenshots: async (): Promise<CommunityScreenshot[]> => {
    try {
      const res = await apiInstance.get('/gallery/community');
      return res.data;
    } catch (err) {
      console.warn('[API] getCommunityScreenshots failed, returning fallback.');
      const local = localStorage.getItem('marinmc_community_screenshots');
      if (local) return JSON.parse(local);
      return [];
    }
  },

  shareScreenshot: async (username: string, title: string, url: string): Promise<boolean> => {
    try {
      await apiInstance.post('/gallery/community', { username, title, url });
      return true;
    } catch (err) {
      console.warn('[API] shareScreenshot failed, saving locally.');
      const local = localStorage.getItem('marinmc_community_screenshots');
      const list: CommunityScreenshot[] = local ? JSON.parse(local) : [];
      const newItem: CommunityScreenshot = {
        id: Math.random().toString(36).substring(2, 11),
        url,
        title,
        username,
        likes: 0,
        date: new Date().toLocaleDateString('tr-TR')
      };
      list.unshift(newItem);
      localStorage.setItem('marinmc_community_screenshots', JSON.stringify(list));
      return true;
    }
  },

  likeScreenshot: async (id: string): Promise<{ success: boolean; likes: number }> => {
    try {
      const res = await apiInstance.post(`/gallery/community/${id}/like`);
      return res.data;
    } catch (err) {
      console.warn('[API] likeScreenshot failed, updating locally.');
      const local = localStorage.getItem('marinmc_community_screenshots');
      if (local) {
        const list: CommunityScreenshot[] = JSON.parse(local);
        const item = list.find(i => i.id === id);
        if (item) {
          item.likes = (item.likes || 0) + 1;
          localStorage.setItem('marinmc_community_screenshots', JSON.stringify(list));
          return { success: true, likes: item.likes };
        }
      }
      return { success: false, likes: 0 };
    }
  },

  // --- QUESTS ---
  getQuests: async (username: string): Promise<Quest[]> => {
    try {
      const res = await apiInstance.get(`/users/${username}/quests`);
      return res.data;
    } catch (err) {
      console.warn('[API] getQuests failed, returning fallback.');
      const local = localStorage.getItem(`marinmc_quests_${username}`);
      if (local) return JSON.parse(local);
      const initial: Quest[] = [
        { id: 'q1', description: 'Lobi Sohbetine 1 Mesaj Yaz', progress: 0, target: 1, coins: 50, claimed: false },
        { id: 'q2', description: 'Bir Arkadaş Ekle', progress: 0, target: 1, coins: 100, claimed: false },
        { id: 'q3', description: 'Günde 30 dakika oyna', progress: 0, target: 30, coins: 150, claimed: false }
      ];
      localStorage.setItem(`marinmc_quests_${username}`, JSON.stringify(initial));
      return initial;
    }
  },

  claimQuestReward: async (username: string, id: string): Promise<{ success: boolean; coins: number }> => {
    try {
      const res = await apiInstance.post(`/users/${username}/quests/${id}/claim`);
      return res.data;
    } catch (err) {
      console.warn('[API] claimQuestReward failed, claiming locally.');
      const localQuests = localStorage.getItem(`marinmc_quests_${username}`);
      if (localQuests) {
        const list: Quest[] = JSON.parse(localQuests);
        const quest = list.find(q => q.id === id);
        if (quest && !quest.claimed && quest.progress >= quest.target) {
          quest.claimed = true;
          localStorage.setItem(`marinmc_quests_${username}`, JSON.stringify(list));

          const currentCoins = parseInt(localStorage.getItem('marinmc_coins') || '500', 10);
          const nextCoins = currentCoins + quest.coins;
          localStorage.setItem('marinmc_coins', nextCoins.toString());
          return { success: true, coins: nextCoins };
        }
      }
      return { success: false, coins: parseInt(localStorage.getItem('marinmc_coins') || '500', 10) };
    }
  },

  // --- ACHIEVEMENTS ---
  getAchievements: async (username: string): Promise<Achievement[]> => {
    const defaultAchievements: Achievement[] = [
      { id: 'a1', title: 'İlk Adım', description: 'Yeni tasarımlı launcher\'a ilk kez giriş yap.', completed: true, date: new Date().toLocaleDateString('tr-TR') },
      { id: 'a2', title: 'Mod Meraklısı', description: 'Mod Yöneticisinden ilk modunu indir.', completed: false, date: '-' },
      { id: 'a3', title: 'Sosyal Keşif', description: 'Arkadaş listene ilk arkadaşını ekle.', completed: false, date: '-' },
      { id: 'a4', title: 'Jeton Avcısı', description: 'Cüzdanında 1,000 veya daha fazla Jeton barındır.', completed: false, date: '-' },
      { id: 'a5', title: 'Kozmetik Ustası', description: 'Gardıroptan ilk pelerin veya kanat kozmetiğini kuşan.', completed: false, date: '-' },
      { id: 'a6', title: 'Zaman Bükücü', description: 'Toplam oynama süresini 10 saate ulaştır.', completed: false, date: '-' },
      { id: 'a7', title: 'Relay Sohbetçisi', description: 'Relay Sohbet kanalında ilk mesajını gönder.', completed: false, date: '-' },
      { id: 'a8', title: 'Fotoğrafçı', description: 'Galeri sayfasında ilk ekran görüntünü toplulukla paylaş.', completed: false, date: '-' },
      { id: 'a9', title: 'Kusursuz Entegrasyon', description: 'Özel JVM optimizasyon ayarlarını aktif et.', completed: false, date: '-' }
    ];

    let backendList: any[] = [];
    try {
      const res = await apiInstance.get(`/users/${username}/achievements`);
      backendList = Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.warn('[API] getAchievements failed, loading from local.');
      const local = localStorage.getItem(`marinmc_achievements_${username}`);
      if (local) {
        backendList = JSON.parse(local);
      } else {
        backendList = defaultAchievements;
      }
    }

    const currentCoins = parseInt(localStorage.getItem('marinmc_coins') || '500', 10);
    const totalPlayTime = Number(localStorage.getItem('marinmc_total_play_time') || '0');

    // a3: Sosyal Keşif (Friend check)
    const contactsStr = localStorage.getItem('marinmc_chat_contacts') || '[]';
    let hasFriend = false;
    try {
      const contacts = JSON.parse(contactsStr);
      hasFriend = Array.isArray(contacts) && contacts.length > 0;
    } catch (e) {}

    // a5: Kozmetik Ustası (Cosmetics check)
    const activeCape = localStorage.getItem('marinmc_active_cape_url') || '';
    const wingsEnabled = localStorage.getItem('marinmc_active_wings_enabled') !== 'false';
    const hasCosmetic = activeCape !== '' || wingsEnabled;

    const merged = defaultAchievements.map(def => {
      const found = backendList.find((b: any) => b.id === def.id);
      let completed = found ? (found.completed === true || found.completed === 1) : def.completed;
      let date = found ? (found.date || '-') : def.date;

      if (def.id === 'a3' && hasFriend) {
        completed = true;
        if (date === '-') date = new Date().toLocaleDateString('tr-TR');
      }
      if (def.id === 'a4' && currentCoins >= 1000) {
        completed = true;
        if (date === '-') date = new Date().toLocaleDateString('tr-TR');
      }
      if (def.id === 'a5' && hasCosmetic) {
        completed = true;
        if (date === '-') date = new Date().toLocaleDateString('tr-TR');
      }
      if (def.id === 'a6' && totalPlayTime >= 600) { // 10 hours = 600 minutes
        completed = true;
        if (date === '-') date = new Date().toLocaleDateString('tr-TR');
      }

      return {
        ...def,
        completed,
        date
      };
    });

    localStorage.setItem(`marinmc_achievements_${username}`, JSON.stringify(merged));
    return merged;
  },

  updateAchievements: async (username: string, achievements: Achievement[]) => {
    try {
      await apiInstance.put(`/users/${username}/achievements`, { achievements });
    } catch (err) {
      console.warn('[API] updateAchievements failed, updating locally.');
      localStorage.setItem(`marinmc_achievements_${username}`, JSON.stringify(achievements));
    }
  }
};

export const checkConnectivity = async (): Promise<boolean> => {
  if (window.electronAPI && window.electronAPI.checkConnectivity) {
    try {
      return await window.electronAPI.checkConnectivity();
    } catch (err) {
      console.warn('[API] Electron checkConnectivity failed:', err);
    }
  }
  // Browser fallback (e.g. during dev:renderer without Electron wrapper)
  try {
    const res = await axios.get(`${getApiBaseUrl()}/stats/online-count`, { timeout: 3000 });
    return res.status === 200;
  } catch {
    return window.navigator.onLine;
  }
};
