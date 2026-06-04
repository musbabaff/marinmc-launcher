import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore, Conversation } from '../stores/chatStore.ts';
import { useAuthStore } from '../stores/authStore.ts';
import {
  Search, MessageSquarePlus, Star, Users, MessageSquare, Send, Paperclip, Smile,
  Maximize2, Download, MoreHorizontal
} from 'lucide-react';

export default function ChatPage() {
  const { t } = useTranslation();
  const chat = useChatStore();
  const session = useAuthStore((state) => state.session);

  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = chat.conversations.find((c) => c.id === chat.activeConversationId) || chat.conversations[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv.messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    chat.sendMessage(inputText.trim());
    setInputText('');
  };

  const handleAddReaction = (msgId: string, emoji: string) => {
    chat.addReaction(msgId, emoji);
  };

  const getFilteredConversations = (type: 'pinned' | 'group' | 'dm') => {
    return chat.conversations.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (type === 'pinned') return c.isPinned;
      if (type === 'group') return !c.isPinned && c.type === 'group';
      return !c.isPinned && c.type === 'dm';
    });
  };

  return (
    <div className="flex-grow flex h-full overflow-hidden select-none bg-[#0A0A0A]">
      {/* Left conversation sidebar (300px) */}
      <div className="w-[300px] bg-[#0D0D0D] border-r border-[#1E1E1E] flex flex-col">
        {/* Header search block */}
        <div className="p-4 border-b border-[#1E1E1E] flex items-center justify-between gap-3">
          <div className="flex-1 bg-[#111111] border border-[#2A2A2A] rounded-xl px-3 py-1.5 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#52525B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('chat.searchInbox')}
              className="bg-transparent border-none text-[10px] text-white focus:outline-none placeholder-white/20 w-full font-semibold"
            />
          </div>
          <button className="p-2 rounded-xl bg-white/[0.03] border border-[#2A2A2A] text-[#52525B] hover:text-white hover:bg-white/[0.06] transition-all">
            <MessageSquarePlus className="w-4 h-4" />
          </button>
        </div>

        {/* Channels/Inbox listings scroll */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          
          {/* Pinned section */}
          {getFilteredConversations('pinned').length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-wider flex items-center gap-1 px-2 mb-1.5">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>{t('chat.pinned')}</span>
              </span>
              {getFilteredConversations('pinned').map((c) => (
                <ConversationItem key={c.id} c={c} activeId={activeConv.id} onClick={chat.setActiveConversationId} />
              ))}
            </div>
          )}

          {/* Group chats */}
          {getFilteredConversations('group').length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-wider flex items-center gap-1 px-2 mb-1.5">
                <Users className="w-3 h-3 text-[#8B5CF6]" />
                <span>{t('chat.groups')}</span>
              </span>
              {getFilteredConversations('group').map((c) => (
                <ConversationItem key={c.id} c={c} activeId={activeConv.id} onClick={chat.setActiveConversationId} />
              ))}
            </div>
          )}

          {/* DMs */}
          {getFilteredConversations('dm').length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-wider flex items-center gap-1 px-2 mb-1.5">
                <MessageSquare className="w-3 h-3 text-[#06B6D4]" />
                <span>{t('chat.directMessages')}</span>
              </span>
              {getFilteredConversations('dm').map((c) => (
                <ConversationItem key={c.id} c={c} activeId={activeConv.id} onClick={chat.setActiveConversationId} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right chat panel view */}
      <div className="flex-1 flex flex-col bg-[#0A0A0A] relative">
        {/* Active conversation header */}
        <div className="px-6 py-3 border-b border-[#1E1E1E] flex justify-between items-center bg-[#0D0D0D]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={activeConv.avatar} alt="avatar" className="w-9 h-9 rounded-xl border border-white/5" />
              {activeConv.isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#10B981] rounded-full border-2 border-[#0D0D0D]" />
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-white leading-tight">{activeConv.name}</h3>
              <p className="text-[9px] text-[#A1A1AA] leading-tight mt-0.5">
                {activeConv.statusText || (activeConv.isOnline ? 'Aktif' : 'Çevrimdışı')}
              </p>
            </div>
          </div>
          <button className="p-2 rounded-xl text-[#52525B] hover:text-white hover:bg-white/5 transition-all">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Message bubble stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <div className="flex flex-col gap-4">
            {activeConv.messages.map((m, idx) => {
              const showDateSep = idx === 0 || (idx > 0 && activeConv.messages[idx - 1].timestamp.includes('Dün') !== m.timestamp.includes('Dün'));
              return (
                <div key={m.id} className="space-y-3">
                  {showDateSep && (
                    <div className="flex items-center gap-4 my-2 select-none">
                      <div className="h-[1px] flex-1 bg-[#1E1E1E]" />
                      <span className="text-[9px] text-[#52525B] font-extrabold uppercase tracking-widest">
                        {m.timestamp.includes('Dün') ? 'DÜN' : 'BUGÜN'}
                      </span>
                      <div className="h-[1px] flex-1 bg-[#1E1E1E]" />
                    </div>
                  )}

                  <div className={`flex items-start gap-3 group relative ${m.isSelf ? 'flex-row-reverse' : ''}`}>
                    {/* User head avatar */}
                    <img
                      src={m.isSelf ? (session?.avatar || 'https://minotar.net/avatar/steve/24') : `https://minotar.net/avatar/${m.sender}/24`}
                      alt="avatar"
                      className="w-7 h-7 rounded-lg border border-white/5"
                    />

                    {/* Chat Bubble card */}
                    <div className={`max-w-[70%] space-y-1.5 ${m.isSelf ? 'items-end' : ''}`}>
                      <div className={`rounded-xl px-4 py-2.5 text-xs font-semibold leading-relaxed border ${
                        m.isSelf
                          ? 'bg-[#8B5CF6] border-[#8B5CF6]/20 text-white'
                          : 'bg-[#111111] border-[#1E1E1E] text-white/95'
                      }`}>
                        {/* Sender tag if group chat */}
                        {activeConv.type === 'group' && !m.isSelf && (
                          <span className="text-[9px] text-[#8B5CF6] font-extrabold uppercase block mb-1">
                            {m.sender}
                          </span>
                        )}
                        <p>{m.content}</p>
                      </div>

                      {/* Image inline preview attach card */}
                      {m.image && (
                        <div className="relative rounded-xl overflow-hidden border border-[#2A2A2A] bg-black/40 group/img max-w-[320px]">
                          <img src={m.image.url} alt={m.image.name} className="max-h-48 object-cover max-w-full" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105">
                              <Maximize2 className="w-4 h-4" />
                            </button>
                            <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105">
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="p-2 bg-[#111111] border-t border-[#1E1E1E] text-[8px] text-[#A1A1AA] font-bold font-mono flex justify-between">
                            <span>{m.image.name}</span>
                            <span>{m.image.size}</span>
                          </div>
                        </div>
                      )}

                      {/* Timestamp and reactions row */}
                      <div className={`flex items-center gap-2 ${m.isSelf ? 'justify-end' : ''}`}>
                        <span className="text-[8px] text-[#52525B] font-bold font-mono">{m.timestamp}</span>

                        {/* Inline reactions badge */}
                        {m.reactions && m.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            onClick={() => chat.addReaction(m.id, r.emoji)}
                            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1 hover:border-[#8B5CF6]"
                          >
                            <span>{r.emoji}</span>
                            <span className="text-[8px] text-[#A1A1AA]">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reaction trigger overlay on bubble hover */}
                    <div className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-[#141414] border border-[#2A2A2A] p-1 rounded-lg shadow-xl z-20 ${
                      m.isSelf ? 'right-full mr-2' : 'left-full ml-2'
                    }`}>
                      {['⭐', '❤️', '👍'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleAddReaction(m.id, emoji)}
                          className="hover:scale-110 p-0.5 rounded text-xs select-none transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Typing and inputs */}
        <div className="p-4 bg-[#0D0D0D] border-t border-[#1E1E1E]">
          {/* Typing info */}
          <div className="h-4 text-[8px] text-[#52525B] font-extrabold uppercase mb-1.5 px-2">
            {activeConv.name === 'Towny Ekibi' && (
              <span className="animate-pulse">Luser_29 yazıyor...</span>
            )}
          </div>

          <form onSubmit={handleSend} className="bg-[#111111] border border-[#2A2A2A] rounded-xl px-4 py-2.5 flex items-center gap-3">
            <button type="button" className="p-1 rounded hover:bg-white/5 text-[#52525B] hover:text-white transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('chat.typeMessage')}
              className="bg-transparent border-none text-xs text-white focus:outline-none placeholder-white/20 w-full font-semibold"
            />
            <button type="button" className="p-1 rounded hover:bg-white/5 text-[#52525B] hover:text-white transition-colors">
              <Smile className="w-4 h-4" />
            </button>
            <button type="submit" className="p-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white hover:scale-105 transition-all shadow-glow-purple">
              <Send className="w-3.5 h-3.5 fill-white" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Conversation Sidebar Item component helper
function ConversationItem({ c, activeId, onClick }: { c: Conversation; activeId: string; onClick: (id: string) => void }) {
  const lastMsg = c.messages[c.messages.length - 1];
  const active = c.id === activeId;

  return (
    <button
      onClick={() => onClick(c.id)}
      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left select-none transition-all duration-200 ${
        active
          ? 'bg-[#1A1A1A] border-[#2A2A2A] text-white shadow-lg'
          : 'bg-transparent border-transparent text-[#A1A1AA] hover:bg-white/[0.02] hover:text-white'
      }`}
    >
      <div className="relative">
        <img src={c.avatar} alt="avatar" className="w-8 h-8 rounded-lg border border-white/5" />
        {c.isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#10B981] rounded-full border-2 border-[#0D0D0D]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <h4 className="text-[11px] font-extrabold text-white truncate leading-none">{c.name}</h4>
          <span className="text-[8px] text-[#52525B] font-bold font-mono">{c.lastMessageTime}</span>
        </div>
        <p className="text-[9px] text-[#52525B] font-semibold truncate leading-none mt-1.5">
          {lastMsg ? lastMsg.content : 'Dosya gönderildi.'}
        </p>
      </div>

      {/* Unread badge */}
      {c.unreadCount > 0 && (
        <span className="w-4 h-4 bg-[#8B5CF6] text-white text-[8px] font-black rounded-full flex items-center justify-center shrink-0">
          {c.unreadCount}
        </span>
      )}
    </button>
  );
}
