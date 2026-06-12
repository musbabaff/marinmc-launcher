import { create } from 'zustand';
import { useAuthStore } from './authStore.ts';
import { api, Contact } from '../lib/api';

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
  initializeChat: () => Promise<void>;
  setActiveConversationId: (id: string) => void;
  sendMessage: (content: string, imageFile?: { url: string; name: string; size: string }) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
}

const BOT_REPLIES: Record<string, string[]> = {
  merhaba: ['Selam! Naber, MarinMC girecek misin?', 'Merhaba, madendeyim şu an, naber?', 'Selamlar! Lobiye gelsene takılalım.'],
  selam: ['Selam! Sunucuda mısın?', 'Aleykum selam, naber?', 'Selam dostum, gelsene Towny sunucusuna.'],
  towny: ['Ben de şu an Towny sunucusundayım, şehri büyütüyorum.', 'Towny sezonu aşırı iyi olmuş yalnız.', 'Gelsene tarlaları göstereyim sana.'],
  survival: ['Survival sıfırlandı, klan kurduk çabuk gel!', 'Survivalda elmas buldum az önce.', 'Gelsene kasılalım beraber.'],
  default: [
    'Harika! Oyunda mısın şu an?',
    'Tamamdır, lobide bekliyorum seni.',
    'MarinMC sunucusu bugün bayağı kalabalık.',
    'Ben de tam madene inecektim, gelsene.',
    'Dediğin gibi, yama notları da gelmiş kontrol ettin mi?'
  ]
};

const persistConversationsToApi = async (username: string, conversations: Conversation[]) => {
  const contacts: Contact[] = conversations.map(c => ({
    id: c.id,
    name: c.name,
    avatar: c.avatar,
    status: c.isOnline ? 'online' : 'offline',
    lastMessage: c.messages.length > 0 ? c.messages[c.messages.length - 1].content : '',
    time: c.lastMessageTime,
    type: c.isPinned ? 'pinned' : 'dm',
    unread: c.unreadCount,
    favorite: false
  }));

  const messagesMap: Record<string, any[]> = {};
  conversations.forEach(c => {
    messagesMap[c.id] = c.messages.map(m => ({
      id: m.id,
      sender: m.sender,
      content: m.content,
      time: m.timestamp,
      isSelf: m.isSelf,
      fileAttachment: m.image ? {
        name: m.image.name,
        size: m.image.size,
        isImage: true
      } : undefined
    }));
  });

  await Promise.all([
    api.updateContacts(username, contacts),
    api.updateChatMessages(username, messagesMap)
  ]);
};

export const useChatStore = create<ChatState>((set, get) => {
  useAuthStore.subscribe(() => {
    get().initializeChat();
  });

  return {
    conversations: [],
    activeConversationId: 'solmazzz', // Default active conversation

    initializeChat: async () => {
      const session = useAuthStore.getState().session;
      if (!session) {
        set({ conversations: [] });
        return;
      }
      try {
        const [contacts, messagesMap] = await Promise.all([
          api.getContacts(session.name),
          api.getChatMessages(session.name)
        ]);

        const conversations: Conversation[] = contacts.map(c => {
          const rawMsgs = messagesMap[c.id] || [];
          const messages: ChatMessage[] = rawMsgs.map(m => ({
            id: m.id,
            sender: m.sender,
            content: m.content,
            timestamp: m.time,
            isSelf: m.isSelf,
            image: m.fileAttachment ? {
              url: '',
              name: m.fileAttachment.name,
              size: m.fileAttachment.size
            } : undefined
          }));

          return {
            id: c.id,
            name: c.name,
            type: c.type === 'pinned' ? 'dm' : (c.type || 'dm'),
            avatar: c.avatar,
            isPinned: c.type === 'pinned',
            isOnline: c.status !== 'offline',
            statusText: c.status === 'online' ? 'Çevrimiçi' : c.status === 'idle' ? 'Boşta' : 'Çevrimdışı',
            unreadCount: c.unread || 0,
            lastMessageTime: c.time || '',
            messages
          };
        });

        // Set default active conversation if previous was not found
        const currentActive = get().activeConversationId;
        const exists = conversations.some(c => c.id === currentActive);
        set({
          conversations,
          activeConversationId: exists ? currentActive : (conversations.length > 0 ? conversations[0].id : '')
        });
      } catch (err) {
        console.error('Failed to initialize chat from API:', err);
      }
    },

    setActiveConversationId: (id) => {
      set({ activeConversationId: id });
      const session = useAuthStore.getState().session;
      if (!session) return;

      let updatedConversations: Conversation[] = [];
      set((state) => {
        updatedConversations = state.conversations.map((c) =>
          c.id === id ? { ...c, unreadCount: 0 } : c
        );
        return { conversations: updatedConversations };
      });

      persistConversationsToApi(session.name, updatedConversations).catch(console.error);
    },

    sendMessage: async (content, imageFile) => {
      const activeId = get().activeConversationId;
      const session = useAuthStore.getState().session;
      if (!session) return;

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

      let updatedConversations: Conversation[] = [];
      set((state) => {
        updatedConversations = state.conversations.map((c) => {
          if (c.id === activeId) {
            return {
              ...c,
              lastMessageTime: timeStr,
              messages: [...c.messages, newMsg]
            };
          }
          return c;
        });
        return { conversations: updatedConversations };
      });

      try {
        await persistConversationsToApi(session.name, updatedConversations);
      } catch (err) {
        console.error('Failed to persist sent message:', err);
      }

      // Simulated Auto-Reply Chatbot
      setTimeout(async () => {
        const activeConv = get().conversations.find((c) => c.id === activeId);
        if (!activeConv) return;

        const lowerMsg = content.toLowerCase();
        let replyPool = BOT_REPLIES.default;
        
        if (lowerMsg.includes('selam')) replyPool = BOT_REPLIES.selam;
        else if (lowerMsg.includes('merhaba')) replyPool = BOT_REPLIES.merhaba;
        else if (lowerMsg.includes('towny')) replyPool = BOT_REPLIES.towny;
        else if (lowerMsg.includes('survival')) replyPool = BOT_REPLIES.survival;

        const randomReply = replyPool[Math.floor(Math.random() * replyPool.length)];
        
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

        let postBotConversations: Conversation[] = [];
        set((state) => {
          postBotConversations = state.conversations.map((c) => {
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
          return { conversations: postBotConversations };
        });

        try {
          await persistConversationsToApi(session.name, postBotConversations);
        } catch (err) {
          console.error('Failed to persist bot reply:', err);
        }
      }, 1500);
    },

    addReaction: async (messageId, emoji) => {
      const session = useAuthStore.getState().session;
      if (!session) return;

      let updatedConversations: Conversation[] = [];
      set((state) => {
        const activeId = state.activeConversationId;
        updatedConversations = state.conversations.map((c) => {
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
        return { conversations: updatedConversations };
      });

      try {
        await persistConversationsToApi(session.name, updatedConversations);
      } catch (err) {
        console.error('Failed to persist reaction:', err);
      }
    },

    markAsRead: async (conversationId) => {
      const session = useAuthStore.getState().session;
      if (!session) return;

      let updatedConversations: Conversation[] = [];
      set((state) => {
        updatedConversations = state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        );
        return { conversations: updatedConversations };
      });

      try {
        await persistConversationsToApi(session.name, updatedConversations);
      } catch (err) {
        console.error('Failed to persist read mark:', err);
      }
    }
  };
});

// Run initialization immediately on load
useChatStore.getState().initializeChat();
