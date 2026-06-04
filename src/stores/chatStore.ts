import { create } from 'zustand';

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
  setActiveConversationId: (id: string) => void;
  sendMessage: (content: string, imageFile?: { url: string; name: string; size: string }) => void;
  addReaction: (messageId: string, emoji: string) => void;
  markAsRead: (conversationId: string) => void;
}

const MOCK_MESSAGES_1: ChatMessage[] = [
  { id: 'm1_1', sender: 'Luser_29', content: 'Selam millet, MarinMC Towny girecek var mı?', timestamp: '20:15', isSelf: false },
  { id: 'm1_2', sender: 'Self', content: 'Ben gelirim, 10 dakikaya bilgisayar başındayım.', timestamp: '20:17', isSelf: true },
  { id: 'm1_3', sender: 'Luser_29', content: 'Harika! Şehrin yanına yeni tarla kurdum onu gösteririm.', timestamp: '20:18', isSelf: false },
  { id: 'm1_4', sender: 'Luser_29', content: 'Şöyle bir görüntü çektim tarladan:', timestamp: '20:19', isSelf: false, image: { url: 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=800&auto=format&fit=crop&q=60', name: 'towny_farm.png', size: '1.24 MB' } },
  { id: 'm1_5', sender: 'Self', content: 'Bayağı iyi duruyor, eline sağlık!', timestamp: '20:21', isSelf: true, reactions: [{ emoji: '👍', count: 2, users: ['Luser_29', 'Self'] }] }
];

const MOCK_MESSAGES_2: ChatMessage[] = [
  { id: 'm2_1', sender: 'HypixelGod', content: 'MarinMC Survival sunucusu sıfırlandı mı?', timestamp: 'Dün 18:30', isSelf: false },
  { id: 'm2_2', sender: 'Self', content: 'Evet, dün gece sıfırlandı. Yeni sezon başladı.', timestamp: 'Dün 18:32', isSelf: true },
  { id: 'm2_3', sender: 'HypixelGod', content: 'Süper, o zaman klan kuralım hemen.', timestamp: 'Dün 18:35', isSelf: false },
  { id: 'm2_4', sender: 'Self', content: 'Klan evinin yerini seçtiniz mi?', timestamp: 'Dün 18:36', isSelf: true },
  { id: 'm2_5', sender: 'HypixelGod', content: 'Şurayı bulduk, koordinatlar resimde yazıyor:', timestamp: 'Dün 18:40', isSelf: false, image: { url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=60', name: 'survival_base_coords.png', size: '2.1 MB' } }
];

const MOCK_MESSAGES_3: ChatMessage[] = [
  { id: 'm3_1', sender: 'Notch', content: 'Hello, what are you guys building today?', timestamp: 'Salı 14:10', isSelf: false },
  { id: 'm3_2', sender: 'Dream', content: 'Working on a new speedrun seed!', timestamp: 'Salı 14:12', isSelf: false },
  { id: 'm3_3', sender: 'Self', content: 'Just building a custom lobby for MarinMC.', timestamp: 'Salı 14:15', isSelf: true },
  { id: 'm3_4', sender: 'Notch', content: 'Sounds great. Show me a preview.', timestamp: 'Salı 14:16', isSelf: false },
  { id: 'm3_5', sender: 'Self', content: 'Here is the central dome mockup:', timestamp: 'Salı 14:20', isSelf: true, image: { url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=60', name: 'lobby_dome.png', size: '890 KB' } }
];

const MOCK_CONVERSATIONS: Conversation[] = [
  // Pinned (3)
  {
    id: 'c1',
    name: 'Towny Ekibi',
    type: 'group',
    avatar: 'https://minotar.net/avatar/steve/48',
    isPinned: true,
    unreadCount: 2,
    lastMessageTime: '20:21',
    messages: MOCK_MESSAGES_1
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
    messages: MOCK_MESSAGES_2
  },
  {
    id: 'c3',
    name: 'Notch',
    type: 'dm',
    avatar: 'https://minotar.net/avatar/Notch/48',
    isPinned: true,
    isOnline: true,
    statusText: 'Idle',
    unreadCount: 0,
    lastMessageTime: 'Salı 14:20',
    messages: MOCK_MESSAGES_3
  },
  // Groups (2)
  {
    id: 'c4',
    name: 'DSMP Fan Club',
    type: 'group',
    avatar: 'https://minotar.net/avatar/Dream/48',
    isPinned: false,
    unreadCount: 5,
    lastMessageTime: '19:12',
    messages: [
      { id: 'm4_1', sender: 'Dream', content: 'New speedrun video tomorrow!', timestamp: '19:00', isSelf: false },
      { id: 'm4_2', sender: 'Skeppy', content: 'Wait, did you beat the record?', timestamp: '19:05', isSelf: false },
      { id: 'm4_3', sender: 'Technoblade', content: 'Technoblade never dies!', timestamp: '19:10', isSelf: false },
      { id: 'm4_4', sender: 'Dream', content: 'Hahaha check out this thumbnail:', timestamp: '19:12', isSelf: false, image: { url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=60', name: 'speedrun_thumbnail.jpg', size: '1.4 MB' } }
    ]
  },
  {
    id: 'c5',
    name: 'MarinMC Yetkililer',
    type: 'group',
    avatar: 'https://minotar.net/avatar/alex_mc/48',
    isPinned: false,
    unreadCount: 0,
    lastMessageTime: 'Dün 23:45',
    messages: [
      { id: 'm5_1', sender: 'AdminAlex', content: 'Sunucu yedekleri başarıyla alındı.', timestamp: 'Dün 23:30', isSelf: false },
      { id: 'm5_2', sender: 'Self', content: 'Eline sağlık. Hile koruması testleri bitti mi?', timestamp: 'Dün 23:35', isSelf: true },
      { id: 'm5_3', sender: 'AdminAlex', content: 'Evet, stabil duruyor. Günlük rapor:', timestamp: 'Dün 23:45', isSelf: false, image: { url: 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=800&auto=format&fit=crop&q=60', name: 'shield_report.png', size: '420 KB' } }
    ]
  },
  // Direct Messages (5)
  {
    id: 'c6',
    name: 'Dream',
    type: 'dm',
    avatar: 'https://minotar.net/avatar/Dream/48',
    isPinned: false,
    isOnline: true,
    statusText: 'In Launcher',
    unreadCount: 0,
    lastMessageTime: 'Dün 15:30',
    messages: [
      { id: 'm6_1', sender: 'Dream', content: 'Hey, are you joining the server?', timestamp: 'Dün 15:20', isSelf: false },
      { id: 'm6_2', sender: 'Self', content: 'Yeah, let me finish this build.', timestamp: 'Dün 15:22', isSelf: true },
      { id: 'm6_3', sender: 'Dream', content: 'Alright, see you there.', timestamp: 'Dün 15:25', isSelf: false, reactions: [{ emoji: '⭐', count: 1, users: ['Self'] }] }
    ]
  },
  {
    id: 'c7',
    name: 'alex_mc',
    type: 'dm',
    avatar: 'https://minotar.net/avatar/alex_mc/48',
    isPinned: false,
    isOnline: true,
    statusText: 'In Launcher',
    unreadCount: 0,
    lastMessageTime: '2 gün önce',
    messages: [
      { id: 'm7_1', sender: 'alex_mc', content: 'Kozmetikler güncellendi mi?', timestamp: '2 gün önce', isSelf: false },
      { id: 'm7_2', sender: 'Self', content: 'Evet, pelerinler eklendi.', timestamp: '2 gün önce', isSelf: true }
    ]
  },
  {
    id: 'c8',
    name: 'LegoBuilder',
    type: 'dm',
    avatar: 'https://minotar.net/avatar/LegoBuilder/48',
    isPinned: false,
    isOnline: false,
    unreadCount: 0,
    lastMessageTime: '3 gün önce',
    messages: [
      { id: 'm8_1', sender: 'LegoBuilder', content: 'Creative tarlasına baksana bi ara.', timestamp: '3 gün önce', isSelf: false }
    ]
  },
  {
    id: 'c9',
    name: 'Skeppy',
    type: 'dm',
    avatar: 'https://minotar.net/avatar/Skeppy/48',
    isPinned: false,
    isOnline: false,
    unreadCount: 0,
    lastMessageTime: '5 gün önce',
    messages: [
      { id: 'm9_1', sender: 'Skeppy', content: 'Minecraft but... videosu çekelim mi?', timestamp: '5 gün önce', isSelf: false }
    ]
  },
  {
    id: 'c10',
    name: 'MumboJumbo',
    type: 'dm',
    avatar: 'https://minotar.net/avatar/MumboJumbo/48',
    isPinned: false,
    isOnline: false,
    unreadCount: 0,
    lastMessageTime: '1 hafta önce',
    messages: [
      { id: 'm10_1', sender: 'MumboJumbo', content: 'Redstone door is completed.', timestamp: '1 hafta önce', isSelf: false }
    ]
  }
];

export const useChatStore = create<ChatState>((set) => ({
  conversations: MOCK_CONVERSATIONS,
  activeConversationId: 'c1',
  setActiveConversationId: (id) => {
    set({ activeConversationId: id });
    // Clear unread count
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, unreadCount: 0 } : c
      )
    }));
  },
  sendMessage: (content, imageFile) => {
    set((state) => {
      const activeId = state.activeConversationId;
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
      return {
        conversations: state.conversations.map((c) => {
          if (c.id === activeId) {
            return {
              ...c,
              lastMessageTime: timeStr,
              messages: [...c.messages, newMsg]
            };
          }
          return c;
        })
      };
    });
  },
  addReaction: (messageId, emoji) => {
    set((state) => {
      const activeId = state.activeConversationId;
      return {
        conversations: state.conversations.map((c) => {
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
                      // Remove reaction
                      const users = reaction.users.filter((u) => u !== 'Self');
                      if (users.length === 0) {
                        reactions.splice(existingIdx, 1);
                      } else {
                        reactions[existingIdx] = { ...reaction, count: reaction.count - 1, users };
                      }
                    } else {
                      // Add reaction
                      reactions[existingIdx] = {
                        ...reaction,
                        count: reaction.count + 1,
                        users: [...reaction.users, 'Self']
                      };
                    }
                  } else {
                    // Create new reaction
                    reactions.push({ emoji, count: 1, users: ['Self'] });
                  }
                  return { ...m, reactions };
                }
                return m;
              })
            };
          }
          return c;
        })
      };
    });
  },
  markAsRead: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      )
    }));
  }
}));
