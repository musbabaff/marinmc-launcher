import { create } from 'zustand';
import { useAuthStore } from './authStore.ts';

export interface ChatMessage {
  id: string;
  sender: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isSelf: boolean;
  image?: {
    url: string;
    name: string;
    size: string;
  };
  reactions?: { emoji: string; count: number; users: string[] }[];
}

export interface Conversation {
  id: string;
  name: string;
  type: 'dm' | 'group';
  avatar: string;
  isPinned: boolean;
  isOnline?: boolean;
  statusText?: string;
  unreadCount: number;
  lastMessageTime: string;
  messages: ChatMessage[];
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string;
  initializeChat: () => void;
  setActiveConversationId: (id: string) => void;
  sendMessage: (content: string, imageFile?: { url: string; name: string; size: string }) => void;
  addReaction: (messageId: string, emoji: string) => void;
  markAsRead: (conversationId: string) => void;
}

const getStorageKey = () => {
  const session = useAuthStore.getState().session;
  const user = session ? session.name : 'default';
  return `marinmc_chat_${user.toLowerCase()}`;
};

// Seed initial conversations list
const SEED_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    name: 'Towny Ekibi',
    type: 'group',
    avatar: 'https://minotar.net/avatar/steve/48',
    isPinned: true,
    unreadCount: 1,
    lastMessageTime: '20:21',
    messages: [
      { id: 'm1_1', sender: 'Luser_29', content: 'Selam millet, MarinMC Towny girecek var mı?', timestamp: '20:15', isSelf: false },
      { id: 'm1_2', sender: 'Steve', content: 'Ben gelirim, 10 dakikaya bilgisayar başındayım.', timestamp: '20:17', isSelf: false },
      { id: 'm1_3', sender: 'Luser_29', content: 'Harika! Şehrin yanına yeni tarla kurdum onu gösteririm.', timestamp: '20:18', isSelf: false },
      { id: 'm1_4', sender: 'Luser_29', content: 'Şöyle bir görüntü çektim tarladan:', timestamp: '20:19', isSelf: false, image: { url: 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=800&auto=format&fit=crop&q=60', name: 'towny_farm.png', size: '1.24 MB' } }
    ]
  },
  {
    id: 'c2',
    name: 'HypixelGod',
    type: 'dm',
    avatar: 'https://minotar.net/avatar/HypixelGod/48',
    isPinned: true,
    isOnline: true,
    statusText: 'In-game: MarinMC Survival',
    unreadCount: 0,
    lastMessageTime: 'Dün 18:40',
    messages: [
      { id: 'm2_1', sender: 'HypixelGod', content: 'MarinMC Survival sunucusu sıfırlandı mı?', timestamp: 'Dün 18:30', isSelf: false },
      { id: 'm2_2', sender: 'Self', content: 'Evet, dün gece sıfırlandı. Yeni sezon başladı.', timestamp: 'Dün 18:32', isSelf: true },
      { id: 'm2_3', sender: 'HypixelGod', content: 'Süper, o zaman klan kuralım hemen.', timestamp: 'Dün 18:35', isSelf: false }
    ]
  },
  {
    id: 'c3',
    name: 'Notch',
    type: 'dm',
    avatar: 'https://minotar.net/avatar/Notch/48',
    isPinned: true,
    isOnline: true,
    statusText: 'Boşta',
    unreadCount: 0,
    lastMessageTime: 'Salı 14:20',
    messages: [
      { id: 'm3_1', sender: 'Notch', content: 'Merhaba, bugün ne inşa ediyorsunuz?', timestamp: 'Salı 14:10', isSelf: false },
      { id: 'm3_2', sender: 'Self', content: 'MarinMC için özel bir lobi inşa ediyoruz.', timestamp: 'Salı 14:15', isSelf: true }
    ]
  }
];

const BOT_REPLIES: Record<string, string[]> = {
  merhaba: ['Selam! Naber, MarinMC girecek misin?', 'Merhaba, madendeyim şu an, naber?', 'Selamlar! Lobiye gelsene takılalım.'],
  selam: ['Selam! Sunucuda mısın?', 'Aleykum selam, naber?', 'Selam dostum, gelsene Towny sunucusuna.'],
  towny: ['Ben de şu an Towny sunucusundayım, şehri büyütüyorum.', 'Towny sezonu aşırı iyi olmuş yalnız.', 'Gelsene tarlaları göstereyim sana.'],
   survival: ['Survival sıfırlandı, klan kurduk çabuk gel!', 'Survivalda elmas buldum az önce.', 'Gelsene kasılalım beraber.'],
  'ne haber': ['İyidir, sen ne yapıyorsun?', 'Güzel, MarinMC oynamaya hazırlanıyorum.', 'İyi valla, maden kazıyorum.'],
  default: [
    'Harika! Oyunda mısın şu an?',
    'Tamamdır, lobide bekliyorum seni.',
    'MarinMC sunucusu bugün bayağı kalabalık.',
    'Ben de tam madene inecektim, gelsene.',
    'Dediğin gibi, yama notları da gelmiş kontrol ettin mi?'
  ]
};

export const useChatStore = create<ChatState>((set, get) => {
  useAuthStore.subscribe(() => {
    get().initializeChat();
  });

  return {
    conversations: [],
    activeConversationId: 'c1',

    initializeChat: () => {
      const key = getStorageKey();
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          set({ conversations: JSON.parse(cached) });
        } catch {
          set({ conversations: SEED_CONVERSATIONS });
        }
      } else {
        localStorage.setItem(key, JSON.stringify(SEED_CONVERSATIONS));
        set({ conversations: SEED_CONVERSATIONS });
      }
    },

    setActiveConversationId: (id) => {
      set({ activeConversationId: id });
      set((state) => {
        const updated = state.conversations.map((c) =>
          c.id === id ? { ...c, unreadCount: 0 } : c
        );
        localStorage.setItem(getStorageKey(), JSON.stringify(updated));
        return { conversations: updated };
      });
    },

    sendMessage: (content, imageFile) => {
      const activeId = get().activeConversationId;
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const newMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        sender: 'Self',
        content,
        timestamp: timeStr,
        isSelf: true,
        image: imageFile
      };

      set((state) => {
        const updated = state.conversations.map((c) => {
          if (c.id === activeId) {
            return {
              ...c,
              lastMessageTime: timeStr,
              messages: [...c.messages, newMsg]
            };
          }
          return c;
        });
        localStorage.setItem(getStorageKey(), JSON.stringify(updated));
        return { conversations: updated };
      });

      // Simulated Auto-Reply Chatbot
      setTimeout(() => {
        const activeConv = get().conversations.find((c) => c.id === activeId);
        if (!activeConv) return;

        // Choose reply based on keywords
        const lowerMsg = content.toLowerCase();
        let replyPool = BOT_REPLIES.default;
        
        if (lowerMsg.includes('selam')) replyPool = BOT_REPLIES.selam;
        else if (lowerMsg.includes('merhaba')) replyPool = BOT_REPLIES.merhaba;
        else if (lowerMsg.includes('towny')) replyPool = BOT_REPLIES.towny;
        else if (lowerMsg.includes('survival')) replyPool = BOT_REPLIES.survival;
        else if (lowerMsg.includes('naber') || lowerMsg.includes('ne haber')) replyPool = BOT_REPLIES.premium;

        const randomReply = replyPool[Math.floor(Math.random() * replyPool.length)];
        
        // Choose simulated sender from conversation participants
        const botName = activeConv.type === 'dm' ? activeConv.name : 'Steve';
        const botTime = new Date();
        const botTimeStr = `${String(botTime.getHours()).padStart(2, '0')}:${String(botTime.getMinutes()).padStart(2, '0')}`;

        const botMsg: ChatMessage = {
          id: `msg_bot_${Date.now()}`,
          sender: botName,
          content: randomReply,
          timestamp: botTimeStr,
          isSelf: false
        };

        set((state) => {
          const updated = state.conversations.map((c) => {
            if (c.id === activeId) {
              return {
                ...c,
                lastMessageTime: botTimeStr,
                unreadCount: c.id === state.activeConversationId ? 0 : c.unreadCount + 1,
                messages: [...c.messages, botMsg]
              };
            }
            return c;
          });
          localStorage.setItem(getStorageKey(), JSON.stringify(updated));
          return { conversations: updated };
        });
      }, 1500);
    },

    addReaction: (messageId, emoji) => {
      set((state) => {
        const activeId = state.activeConversationId;
        const updated = state.conversations.map((c) => {
          if (c.id === activeId) {
            return {
              ...c,
              messages: c.messages.map((m) => {
                if (m.id === messageId) {
                  const reactions = m.reactions ? [...m.reactions] : [];
                  const existingIdx = reactions.findIndex((r) => r.emoji === emoji);
                  if (existingIdx > -1) {
                    const reaction = reactions[existingIdx];
                    if (reaction.users.includes('Self')) {
                      const users = reaction.users.filter((u) => u !== 'Self');
                      if (users.length === 0) {
                        reactions.splice(existingIdx, 1);
                      } else {
                        reactions[existingIdx] = { ...reaction, count: reaction.count - 1, users };
                      }
                    } else {
                      reactions[existingIdx] = {
                        ...reaction,
                        count: reaction.count + 1,
                        users: [...reaction.users, 'Self']
                      };
                    }
                  } else {
                    reactions.push({ emoji, count: 1, users: ['Self'] });
                  }
                  return { ...m, reactions };
                }
                return m;
              })
            };
          }
          return c;
        });
        localStorage.setItem(getStorageKey(), JSON.stringify(updated));
        return { conversations: updated };
      });
    },

    markAsRead: (conversationId) => {
      set((state) => {
        const updated = state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        );
        localStorage.setItem(getStorageKey(), JSON.stringify(updated));
        return { conversations: updated };
      });
    }
  };
});

// Run initialization immediately on load
useChatStore.getState().initializeChat();
