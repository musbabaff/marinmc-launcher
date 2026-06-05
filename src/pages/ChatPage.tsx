import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore.ts';
import {
  Search, Edit3, Pin, Users, MessageSquare,
  Image, Smile, FileText, Mic, Send, Heart, Video, Menu,
  Paperclip
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'idle' | 'offline';
  lastMessage?: string;
  time?: string;
  unread?: number;
  type: 'pinned' | 'group' | 'dm';
}

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  time: string;
  isSelf: boolean;
  reactions?: { emoji: string; count: number }[];
}

export default function ChatPage() {
  useAuthStore((s) => s.session);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Empty contacts — real data will come from server
  const contacts: Contact[] = [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim() || !activeContact) return;
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'Sen',
      content: inputText,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      isSelf: true,
    };
    setMessages([...messages, newMsg]);
    setInputText('');
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden select-none">

      {/* ===== LEFT PANEL ===== */}
      <div className="w-[280px] shrink-0 bg-[#0a080a] border-r border-white/[0.04] flex flex-col h-full">

        {/* Header */}
        <div className="px-4 py-4 border-b border-white/[0.04] flex items-center justify-between">
          <h2 className="text-[12px] font-extrabold text-white tracking-wider">MarinMC Relay</h2>
          <button className="p-1.5 rounded-lg hover:bg-white/5 text-[#52525B] hover:text-white transition-colors">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-white/[0.04]">
          <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-xl px-3 py-2">
            <Search className="w-3.5 h-3.5 text-[#52525B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Mesaj ara..."
              className="bg-transparent border-none outline-none text-[10px] text-white placeholder-white/20 w-full font-medium"
            />
          </div>
        </div>

        {/* Empty contacts state */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-12 h-12 rounded-xl bg-[#2D7DD2]/10 border border-[#2D7DD2]/20 flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 text-[#2D7DD2]" />
              </div>
              <p className="text-[10px] font-bold text-white mb-1">Henüz mesaj yok</p>
              <p className="text-[8px] text-[#52525B] font-medium leading-relaxed">
                Arkadaşlarınla sohbet etmeye başla! Relay sistemi yakında aktif olacak.
              </p>
            </div>
          ) : (
            contacts
              .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setActiveContact(contact)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left ${
                    activeContact?.id === contact.id
                      ? 'bg-[#2D7DD2]/10 border-l-2 border-[#2D7DD2]'
                      : 'hover:bg-white/[0.02] border-l-2 border-transparent'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      className="w-9 h-9 rounded-lg border border-white/10"
                    />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a080a] ${
                      contact.status === 'online' ? 'bg-[#259457]' :
                      contact.status === 'idle' ? 'bg-[#F59E0B]' : 'bg-[#52525B]'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-white truncate">{contact.name}</h4>
                      {contact.time && <span className="text-[8px] text-[#52525B] font-medium shrink-0">{contact.time}</span>}
                    </div>
                    {contact.lastMessage && (
                      <p className="text-[8px] text-[#52525B] truncate mt-0.5 font-medium">{contact.lastMessage}</p>
                    )}
                  </div>
                  {contact.unread && contact.unread > 0 && (
                    <span className="w-4 h-4 bg-[#2D7DD2] rounded-full text-[7px] font-black text-white flex items-center justify-center shrink-0">
                      {contact.unread}
                    </span>
                  )}
                </button>
              ))
          )}
        </div>
      </div>

      {/* ===== MAIN CHAT AREA ===== */}
      <div className="flex-1 flex flex-col bg-[#060305] h-full">
        {!activeContact ? (
          /* No chat selected — empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-[#2D7DD2]/10 border border-[#2D7DD2]/20 flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-[#2D7DD2]" />
            </div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider mb-2">MarinMC Relay</h2>
            <p className="text-[10px] text-[#52525B] max-w-[280px] leading-relaxed font-medium">
              Oyun içi sohbet sistemi yakında aktif olacak. Arkadaşlarınla mesajlaş, gruplar oluştur ve sesli sohbet et!
            </p>
            <div className="flex gap-2 mt-5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                <Users className="w-3 h-3 text-[#2D7DD2]" />
                <span className="text-[8px] font-bold text-[#52525B]">Gruplar</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                <Video className="w-3 h-3 text-[#2D7DD2]" />
                <span className="text-[8px] font-bold text-[#52525B]">Sesli Sohbet</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                <Image className="w-3 h-3 text-[#2D7DD2]" />
                <span className="text-[8px] font-bold text-[#52525B]">Medya Paylaşımı</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <img src={activeContact.avatar} alt="" className="w-8 h-8 rounded-lg border border-white/10" />
                <div>
                  <h3 className="text-[11px] font-bold text-white">{activeContact.name}</h3>
                  <span className="text-[8px] text-[#259457] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[#259457] rounded-full" />
                    Çevrimiçi
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {[Search, Pin, Heart, Users, Video, Menu].map((Icon, i) => (
                  <button key={i} className="p-1.5 rounded-lg hover:bg-white/5 text-[#52525B] hover:text-white transition-colors">
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-[10px] text-[#52525B] font-bold">Henüz mesaj yok — ilk mesajı sen gönder!</p>
                </div>
              )}
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[60%] px-3.5 py-2 rounded-2xl ${
                    msg.isSelf
                      ? 'bg-[#2D7DD2] text-white rounded-br-md'
                      : 'bg-[#111111] border border-white/[0.06] text-[#d2d2d2] rounded-bl-md'
                  }`}>
                    {!msg.isSelf && (
                      <span className="text-[8px] font-bold text-[#2D7DD2] block mb-0.5">{msg.sender}</span>
                    )}
                    <p className="text-[11px] font-medium leading-relaxed">{msg.content}</p>
                    <span className={`text-[7px] font-medium mt-1 block text-right ${
                      msg.isSelf ? 'text-white/50' : 'text-[#52525B]'
                    }`}>{msg.time}</span>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing indicator */}
            {isTyping && (
              <div className="px-5 py-1.5 flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-[#52525B] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <span className="text-[8px] text-[#52525B] font-medium">yazıyor...</span>
              </div>
            )}

            {/* Input bar */}
            <div className="px-4 py-3 border-t border-white/[0.04] flex items-center gap-2 shrink-0">
              <div className="flex-1 flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-xl px-3.5 py-2.5">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={`${activeContact.name} kişisine mesaj yaz...`}
                  className="bg-transparent border-none outline-none text-[11px] text-white placeholder-white/20 w-full font-medium"
                />
                <div className="flex items-center gap-1">
                  {[Image, Smile, FileText, Paperclip, Mic].map((Icon, i) => (
                    <button key={i} className="p-1 rounded hover:bg-white/5 text-[#52525B] hover:text-white transition-colors">
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleSend}
                className="w-9 h-9 rounded-xl bg-[#2D7DD2] hover:bg-[#4A9AE8] flex items-center justify-center text-white transition-all shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
