import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.ts';
import { useSocialStore } from '../stores/socialStore.ts';
import { api } from '../lib/api';
import { wsManager } from '../lib/websocket';
import {
  Search, Edit3, Pin, Users, MessageSquare,
  Image, Smile, FileText, Mic, Send, Heart, Video,
  Paperclip, X
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
  favorite?: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  time: string;
  isSelf: boolean;
  reactions?: { emoji: string; count: number }[];
  fileAttachment?: { name: string; size: string; isImage?: boolean };
  voiceDuration?: string;
}

export default function ChatPage() {
  const session = useAuthStore((s) => s.session);
  const username = session?.name || 'anonymous';
  const location = useLocation();
  const socialStore = useSocialStore();
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive UI States
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceTimer, setVoiceTimer] = useState(0);
  const voiceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parse active query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const activeId = params.get('active');
    if (activeId && contacts.length > 0) {
      const found = contacts.find(c => c.id === activeId);
      if (found) {
        setActiveContact(found);
      }
    }
  }, [location.search, contacts]);

  // Voice recording timer hook
  useEffect(() => {
    if (isRecordingVoice) {
      setVoiceTimer(0);
      voiceIntervalRef.current = setInterval(() => {
        setVoiceTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
        voiceIntervalRef.current = null;
      }
    }
    return () => {
      if (voiceIntervalRef.current) clearInterval(voiceIntervalRef.current);
    };
  }, [isRecordingVoice]);

  // 1. Initial Seeding/Loading of Contacts & Messages from REST API and WS Connection
  useEffect(() => {
    if (!username) return;

    // Load contacts from backend API / local cache
    api.getContacts(username).then((data) => {
      setContacts(data as any);
    });

    // Load message logs
    api.getChatMessages(username).then((data) => {
      setChatMessages(data as any);
    });

    // Connect to WebSocket gateway
    wsManager.connect(username);

    // Listen for WebSocket incoming chat messages
    const disconnectMsg = wsManager.addListener('chat:message', (msg: any) => {
      const contactId = msg.sender.toLowerCase();
      
      setChatMessages(prev => {
        const current = prev[contactId] || [];
        const updated = [...current, {
          id: msg.id || Date.now().toString(),
          sender: msg.sender,
          content: msg.content,
          time: msg.time || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          isSelf: false,
          fileAttachment: msg.fileAttachment,
          voiceDuration: msg.voiceDuration
        }];
        const newMsgs = { ...prev, [contactId]: updated };
        api.updateChatMessages(username, newMsgs as any);
        return newMsgs;
      });

      setContacts(prev => {
        const updated = prev.map(c => {
          if (c.id === contactId) {
            return {
              ...c,
              lastMessage: msg.content,
              time: msg.time || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
              unread: (c.unread || 0) + 1
            };
          }
          return c;
        });
        api.updateContacts(username, updated as any);
        return updated;
      });
    });

    // Listen for friend status changes (online/idle/offline)
    const disconnectStatus = wsManager.addListener('status:change', (statusData: any) => {
      const contactId = statusData.contactId.toLowerCase();
      setContacts(prev => {
        const updated = prev.map(c => {
          if (c.id === contactId) {
            return { ...c, status: statusData.status };
          }
          return c;
        });
        api.updateContacts(username, updated as any);
        return updated;
      });
    });

    return () => {
      disconnectMsg();
      disconnectStatus();
      wsManager.disconnect();
    };
  }, [username]);

  // Scroll to bottom on message updates
  const activeMessages = activeContact ? (chatMessages[activeContact.id] || []) : [];
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, isTyping]);

  const handleNewChat = (usernameToChat: string) => {
    const contactId = usernameToChat.toLowerCase();
    const existing = contacts.find(c => c.id === contactId);
    if (existing) {
      setActiveContact(existing);
    } else {
      const newContact: Contact = {
        id: contactId,
        name: usernameToChat,
        avatar: `https://minotar.net/avatar/${usernameToChat}/48`,
        status: 'online',
        lastMessage: 'Sohbet başlatıldı',
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        type: 'dm',
        unread: 0
      };
      const updated = [newContact, ...contacts];
      setContacts(updated);
      api.updateContacts(username, updated as any);
      setActiveContact(newContact);
    }
    setIsNewChatOpen(false);
  };

  const togglePin = (contactId: string) => {
    const updated: Contact[] = contacts.map(c => {
      if (c.id === contactId) {
        return { ...c, type: c.type === 'pinned' ? 'dm' : 'pinned' };
      }
      return c;
    });
    setContacts(updated);
    api.updateContacts(username, updated as any);
    if (activeContact && activeContact.id === contactId) {
      setActiveContact({ ...activeContact, type: activeContact.type === 'pinned' ? 'dm' : 'pinned' });
    }
  };

  const toggleFavorite = (contactId: string) => {
    const updated = contacts.map(c => {
      if (c.id === contactId) {
        return { ...c, favorite: !c.favorite };
      }
      return c;
    });
    setContacts(updated);
    api.updateContacts(username, updated as any);
    if (activeContact && activeContact.id === contactId) {
      setActiveContact({ ...activeContact, favorite: !activeContact.favorite });
    }
  };

  const handleSendFile = (fileName: string, fileSize: string, isImage = false) => {
    if (!activeContact) return;
    const timeNow = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const fileMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'Sen',
      content: isImage ? `Görsel gönderdi: ${fileName}` : `Dosya gönderdi: ${fileName}`,
      time: timeNow,
      isSelf: true,
      fileAttachment: { name: fileName, size: fileSize, isImage }
    };
    
    const currentMsgs = chatMessages[activeContact.id] || [];
    const updatedMsgs = [...currentMsgs, fileMsg];
    const newChatMessages = { ...chatMessages, [activeContact.id]: updatedMsgs };
    setChatMessages(newChatMessages);
    api.updateChatMessages(username, newChatMessages as any);

    // Send over websocket
    wsManager.send('chat:message', {
      recipient: activeContact.id,
      content: fileMsg.content,
      time: timeNow,
      fileAttachment: { name: fileName, size: fileSize, isImage }
    });

    const updatedContacts = contacts.map(c => 
      c.id === activeContact.id 
        ? { ...c, lastMessage: isImage ? '🖼️ Görsel' : '📄 Dosya', time: timeNow } 
        : c
    );
    setContacts(updatedContacts);
    api.updateContacts(username, updatedContacts as any);
  };

  const handleSendVoice = (duration: string) => {
    if (!activeContact) return;
    const timeNow = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const voiceMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'Sen',
      content: 'Sesli Mesaj',
      time: timeNow,
      isSelf: true,
      voiceDuration: duration
    };
    
    const currentMsgs = chatMessages[activeContact.id] || [];
    const updatedMsgs = [...currentMsgs, voiceMsg];
    const newChatMessages = { ...chatMessages, [activeContact.id]: updatedMsgs };
    setChatMessages(newChatMessages);
    api.updateChatMessages(username, newChatMessages as any);

    // Send over websocket
    wsManager.send('chat:message', {
      recipient: activeContact.id,
      content: 'Sesli Mesaj',
      time: timeNow,
      voiceDuration: duration
    });

    const updatedContacts = contacts.map(c => 
      c.id === activeContact.id 
        ? { ...c, lastMessage: '🎤 Sesli Mesaj', time: timeNow } 
        : c
    );
    setContacts(updatedContacts);
    api.updateContacts(username, updatedContacts as any);
  };

  const handleSelectContact = (contact: Contact) => {
    setActiveContact(contact);
    
    // Clear unread badge
    const updated = contacts.map(c => c.id === contact.id ? { ...c, unread: 0 } : c);
    setContacts(updated);
    api.updateContacts(username, updated as any);
  };

  const handleSend = () => {
    if (!inputText.trim() || !activeContact) return;
    
    const timeNow = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'Sen',
      content: inputText.trim(),
      time: timeNow,
      isSelf: true
    };

    // Update messages
    const currentMsgs = chatMessages[activeContact.id] || [];
    const updatedMsgs = [...currentMsgs, userMsg];
    const newChatMessages = { ...chatMessages, [activeContact.id]: updatedMsgs };
    setChatMessages(newChatMessages);
    api.updateChatMessages(username, newChatMessages as any);

    // Send over websocket
    wsManager.send('chat:message', {
      recipient: activeContact.id,
      content: inputText.trim(),
      time: timeNow
    });

    // Update contacts list last message
    const updatedContacts = contacts.map(c => 
      c.id === activeContact.id 
        ? { ...c, lastMessage: inputText.trim(), time: timeNow } 
        : c
    );
    setContacts(updatedContacts);
    api.updateContacts(username, updatedContacts as any);
    
    const userPrompt = inputText.trim();
    setInputText('');

    // Trigger chatbot response simulation (works offline / as fallback)
    setIsTyping(true);
    setTimeout(() => {
      let botResponse = '';
      const text = userPrompt.toLowerCase();

      if (activeContact.id === 'solmazzz') {
        if (text.includes('selam') || text.includes('merhaba') || text.includes('sa')) {
          botResponse = 'Aleyküm selam dostum! MarinMC Launcher testlerine katıldığın için teşekkürler. Arayüz tasarımı sence nasıl olmuş?';
        } else if (text.includes('iyi') || text.includes('güzel') || text.includes('harika') || text.includes('beğendim')) {
          botResponse = 'Süper! Arayüzdeki görsel sorunları hallettik. Şimdi her modülün tam çalışır olmasını ve mock dataların kaldırılmasını sağlıyoruz.';
        } else if (text.includes('hata') || text.includes('çök') || text.includes('crash')) {
          botResponse = 'Hata mı aldın? Geliştirdiğimiz gelişmiş Crash Modal artık çökme sebebini detaylıca gösteriyor, orayı inceleyebilir veya log dosyasını bana iletebilirsin!';
        } else {
          botResponse = 'Anladım dostum. MarinMC launcher üzerindeki her sayfayı test edebilirsin, oyun tarafında da yakında yeni güncellemeler gelecek!';
        }
      } else if (activeContact.id === 'support') {
        if (text.includes('yardım') || text.includes('sorun') || text.includes('hata') || text.includes('açılmıyor')) {
          botResponse = 'Karşılaştığınız sorunla ilgili işletim sisteminizi ve aldığınız hatayı yazarsanız, teknik birimimiz size hemen destek olacaktır.';
        } else {
          botResponse = 'MarinMC Destek birimi ile iletişime geçtiğiniz için teşekkürler. İhtiyaç halinde sorununuzu buraya detaylıca yazabilirsiniz.';
        }
      } else {
        botResponse = 'Admin Relay sistemi bağlantı testi tamamlandı. Girişler başarıyla loglandı.';
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: activeContact.name,
        content: botResponse,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        isSelf: false
      };

      const finalMsgs = [...updatedMsgs, botMsg];
      const finalChatMessages = { ...newChatMessages, [activeContact.id]: finalMsgs };
      setChatMessages(finalChatMessages);
      api.updateChatMessages(username, finalChatMessages as any);

      const finalContacts = updatedContacts.map(c => 
        c.id === activeContact.id 
          ? { ...c, lastMessage: botResponse, time: botMsg.time } 
          : c
      );
      setContacts(finalContacts);
      api.updateContacts(username, finalContacts as any);
      setIsTyping(false);
    }, 1800);
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedContacts = [...filteredContacts].sort((a, b) => {
    // 1. Pinned chats always on top
    const aPinned = a.type === 'pinned';
    const bPinned = b.type === 'pinned';
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    // 2. Sort by status (online > idle > offline) and favorite status inside each group
    const getStatusWeight = (c: Contact) => {
      const status = c.status || 'offline';
      const favorite = c.favorite ? 1 : 0;
      let statusWeight = 0;
      if (status === 'online') statusWeight = 3;
      else if (status === 'idle') statusWeight = 2;
      else if (status === 'offline') statusWeight = 1;
      
      // We give higher priority to favorites within the same status group
      return statusWeight * 10 + favorite;
    };

    return getStatusWeight(b) - getStatusWeight(a);
  });

  return (
    <div className="flex-grow flex h-full overflow-hidden select-none bg-[#060305] text-[#d2d2d2]">
      {/* ===== LEFT PANEL ===== */}
      <div className="w-[280px] shrink-0 bg-[#0a080a] border-r border-white/[0.04] flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/[0.04] flex items-center justify-between">
          <h2 className="text-[12px] font-extrabold text-white tracking-wider">MarinMC Relay</h2>
          <button 
            onClick={() => setIsNewChatOpen(true)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-[#52525B] hover:text-white transition-colors"
            title="Yeni Sohbet Başlat"
          >
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
              placeholder="Arkadaş ara..."
              className="bg-transparent border-none outline-none text-[10px] text-white placeholder-white/20 w-full font-medium"
            />
          </div>
        </div>

        {/* Contacts */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {sortedContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-12 h-12 rounded-xl bg-[#2D7DD2]/10 border border-[#2D7DD2]/20 flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 text-[#2D7DD2]" />
              </div>
              <p className="text-[10px] font-bold text-white mb-1">Kişi bulunamadı</p>
            </div>
          ) : (
            sortedContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => handleSelectContact(contact)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left relative group ${
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
                    <div className="flex items-center gap-1 min-w-0">
                      <h4 className="text-[10px] font-bold text-white truncate">{contact.name}</h4>
                      {contact.type === 'pinned' && <Pin className="w-2.5 h-2.5 text-[#2D7DD2] shrink-0" />}
                      {contact.favorite && <Heart className="w-2.5 h-2.5 text-red-500 fill-current shrink-0" />}
                    </div>
                    {contact.time && <span className="text-[8px] text-[#52525B] font-medium shrink-0">{contact.time}</span>}
                  </div>
                  {contact.lastMessage && (
                    <p className="text-[8px] text-[#52525B] truncate mt-0.5 font-medium">{contact.lastMessage}</p>
                  )}
                </div>
                {contact.unread && contact.unread > 0 ? (
                  <span className="w-4 h-4 bg-[#2D7DD2] rounded-full text-[7px] font-black text-white flex items-center justify-center shrink-0">
                    {contact.unread}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ===== MAIN CHAT AREA ===== */}
      <div className="flex-grow flex flex-col bg-[#060305] h-full relative">
        {!activeContact ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-[#2D7DD2]/10 border border-[#2D7DD2]/20 flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-[#2D7DD2]" />
            </div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider mb-2">MarinMC Relay</h2>
            <p className="text-[10px] text-[#52525B] max-w-[280px] leading-relaxed font-medium">
              Sohbet etmek için sol taraftaki aktif kişilerden birini seçin! Sistem anlık etkileşimli geri dönüşleri desteklemektedir.
            </p>
            <div className="flex gap-2 mt-5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                <Users className="w-3 h-3 text-[#2D7DD2]" />
                <span className="text-[8px] font-bold text-[#52525B]">Gelişmiş Grup</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                <Video className="w-3 h-3 text-[#2D7DD2]" />
                <span className="text-[8px] font-bold text-[#52525B]">Görüntülü Arama</span>
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
            <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between shrink-0 bg-[#070507]">
              <div className="flex items-center gap-3">
                <img src={activeContact.avatar} alt="" className="w-8 h-8 rounded-lg border border-white/10" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-[11px] font-bold text-white">{activeContact.name}</h3>
                    {activeContact.favorite && <Heart className="w-3 h-3 text-red-500 fill-current" />}
                  </div>
                  <span className={`text-[8px] font-medium flex items-center gap-1 ${
                    activeContact.status === 'offline' ? 'text-[#52525B]' : 'text-[#259457]'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      activeContact.status === 'online' ? 'bg-[#259457]' :
                      activeContact.status === 'idle' ? 'bg-[#F59E0B]' : 'bg-[#52525B]'
                    }`} />
                    {activeContact.status === 'online' ? 'Çevrimiçi' : activeContact.status === 'idle' ? 'Boşta' : 'Çevrimdışı'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePin(activeContact.id)}
                  className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${
                    activeContact.type === 'pinned' ? 'text-[#2D7DD2]' : 'text-[#52525B] hover:text-white'
                  }`}
                  title="Sohbeti Sabitle"
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => toggleFavorite(activeContact.id)}
                  className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${
                    activeContact.favorite ? 'text-red-500' : 'text-[#52525B] hover:text-white'
                  }`}
                  title="Favorilere Ekle"
                >
                  <Heart className={`w-3.5 h-3.5 ${activeContact.favorite ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => setIsVideoCallOpen(true)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-[#52525B] hover:text-white transition-colors"
                  title="Görüntülü Arama Başlat"
                >
                  <Video className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
              {activeMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-[10px] text-[#52525B] font-bold">Henüz mesaj yok — ilk mesajı sen gönder!</p>
                </div>
              )}
              {activeMessages.map((msg) => (
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
                    <p className="text-[11px] font-medium leading-relaxed select-text">{msg.content}</p>
                    
                    {/* Render Image Attachment */}
                    {msg.fileAttachment?.isImage && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-white/5 bg-black/10 p-1">
                        <div className="h-28 bg-[#111111] flex items-center justify-center text-[10px] text-white/40 gap-1.5">
                          <Image className="w-5 h-5 text-[#2D7DD2]" />
                          <span>{msg.fileAttachment.name} ({msg.fileAttachment.size})</span>
                        </div>
                      </div>
                    )}

                    {/* Render Document Attachment */}
                    {msg.fileAttachment && !msg.fileAttachment.isImage && (
                      <div className="mt-2 p-2 bg-black/20 rounded-xl border border-white/5 flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-[#2D7DD2]/10 border border-[#2D7DD2]/20 rounded-lg flex items-center justify-center text-[#2D7DD2]">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-[9px] font-bold text-white truncate">{msg.fileAttachment.name}</p>
                          <span className="text-[7px] text-gray-500 block">{msg.fileAttachment.size}</span>
                        </div>
                      </div>
                    )}

                    {/* Render Voice Message */}
                    {msg.voiceDuration && (
                      <div className="mt-2 p-2 bg-black/20 rounded-xl border border-white/5 flex items-center gap-2.5 w-44">
                        <Mic className="w-4 h-4 text-[#2D7DD2] animate-pulse shrink-0" />
                        <div className="flex-grow h-2 flex items-center gap-0.5">
                          <div className="w-1 h-3 bg-[#2D7DD2] rounded-full" />
                          <div className="w-1 h-1 bg-[#2D7DD2] rounded-full opacity-40" />
                          <div className="w-1 h-4 bg-[#2D7DD2] rounded-full" />
                          <div className="w-1 h-2 bg-[#2D7DD2] rounded-full opacity-60" />
                          <div className="w-1 h-3 bg-[#2D7DD2] rounded-full" />
                          <div className="w-1 h-1 bg-[#2D7DD2] rounded-full opacity-40" />
                        </div>
                        <span className="text-[8px] text-gray-400 font-mono shrink-0">{msg.voiceDuration}</span>
                      </div>
                    )}

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
            <div className="px-4 py-3 border-t border-white/[0.04] flex items-center gap-2 shrink-0 bg-[#070507] relative">
              
              {/* Emoji Picker Popover */}
              {isEmojiPickerOpen && (
                <div className="absolute bottom-14 right-14 bg-[#0a080a] border border-white/[0.06] rounded-xl p-2.5 flex gap-1.5 z-40 shadow-xl">
                  {['😊', '😂', '🔥', '❤️', '👍', '🎮', '🚀', '☠️'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setInputText(prev => prev + emoji);
                        setIsEmojiPickerOpen(false);
                      }}
                      className="text-base p-1 hover:bg-white/5 rounded transition-all"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Voice Recording Badge */}
              {isRecordingVoice && (
                <div className="flex-grow flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-[10px] text-red-400 font-bold">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    <span>Ses Kaydediliyor... ({voiceTimer}s)</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsRecordingVoice(false);
                      handleSendVoice(`00:${voiceTimer.toString().padStart(2, '0')}`);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded-lg text-[8px] uppercase tracking-wider font-extrabold"
                  >
                    Kaydı Bitir
                  </button>
                </div>
              )}

              {!isRecordingVoice && (
                <>
                  <div className="flex-grow flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-xl px-3.5 py-2.5">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder={`${activeContact.name} kişisine mesaj yaz...`}
                      className="bg-transparent border-none outline-none text-[11px] text-white placeholder-white/20 w-full font-medium"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleSendFile("ekran_goruntusu.png", "1.4 MB", true)}
                        className="p-1 rounded hover:bg-white/5 text-[#52525B] hover:text-white transition-colors"
                        title="Resim Gönder"
                      >
                        <Image className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                        className="p-1 rounded hover:bg-white/5 text-[#52525B] hover:text-white transition-colors"
                        title="Emoji Ekle"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleSendFile("klavuz.txt", "12 KB", false)}
                        className="p-1 rounded hover:bg-white/5 text-[#52525B] hover:text-white transition-colors"
                        title="Metin Belgesi Gönder"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleSendFile("arsiv.zip", "8.9 MB", false)}
                        className="p-1 rounded hover:bg-white/5 text-[#52525B] hover:text-white transition-colors"
                        title="Dosya Gönder"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setIsRecordingVoice(true)}
                        className="p-1 rounded hover:bg-white/5 text-[#52525B] hover:text-white transition-colors"
                        title="Sesli Mesaj Kaydet"
                      >
                        <Mic className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleSend}
                    className="w-9 h-9 rounded-xl bg-[#2D7DD2] hover:bg-[#4A9AE8] flex items-center justify-center text-white transition-all shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ===== NEW CHAT MODAL ===== */}
      {isNewChatOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a080a] border border-white/[0.06] rounded-2xl w-80 max-w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Yeni Sohbet Başlat</h3>
              <button onClick={() => setIsNewChatOpen(false)} className="p-1 text-[#52525B] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-60 overflow-y-auto custom-scrollbar space-y-1.5">
              {socialStore.friends.length === 0 ? (
                <p className="text-[10px] text-gray-500 font-bold text-center py-6 uppercase tracking-wider">Arkadaş listeniz boş</p>
              ) : (
                socialStore.friends.map(friend => (
                  <button
                    key={friend.username}
                    onClick={() => handleNewChat(friend.username)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all text-left"
                  >
                    <img src={`https://minotar.net/avatar/${friend.username}/24`} alt="" className="w-6 h-6 rounded" />
                    <span className="text-[10px] font-bold text-white">{friend.username}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== VIDEO CALL MODAL ===== */}
      {isVideoCallOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a080a] border border-[#2D7DD2]/20 rounded-2xl w-[400px] max-w-full overflow-hidden shadow-2xl p-6 text-center space-y-6">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <img
                  src={activeContact ? activeContact.avatar : ""}
                  alt=""
                  className="w-20 h-20 rounded-2xl border-2 border-[#2D7DD2] animate-pulse"
                />
                <div className="absolute inset-0 bg-[#2D7DD2]/10 rounded-2xl animate-ping" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">{activeContact?.name}</h3>
                <span className="text-[9px] text-[#2D7DD2] font-black uppercase tracking-widest animate-pulse mt-1 block">Görüntülü Arama Yapılıyor...</span>
              </div>
            </div>
            
            <div className="text-[11px] text-gray-400 leading-relaxed max-w-[280px] mx-auto font-medium">
              MarinMC Relay arama motoru aracılığıyla güvenli, şifreli ses ve görüntü kanalı kuruluyor. Lütfen bekleyin.
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setIsVideoCallOpen(false)}
                className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[9px] font-extrabold uppercase tracking-wider transition-all"
              >
                Aramayı Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
