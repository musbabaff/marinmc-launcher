import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.ts';
import { useSettingsStore } from '../stores/settingsStore.ts';
import { useSocialStore } from '../stores/socialStore.ts';
import { useAppStore } from '../stores/appStore.ts';
import { sanitizeUrl, sanitizeParam } from '../lib/security.ts';
import { api, getApiBaseUrl } from '../lib/api.ts';
import { incrementStat } from '../lib/achievements.ts';
import { STEVE_AVATAR_FALLBACK } from '../lib/constants.ts';
import VersionModal from '../components/VersionModal.tsx';
import ProfileSettingsModal from '../components/ProfileSettingsModal.tsx';
import {
  ChevronDown, ChevronUp, Search, Play,
  MessageSquare, UserPlus, X, AlertTriangle,
  CheckCircle2, WifiOff, ExternalLink,
  Pause, Trash2, Send,
  Settings, Sparkles, Loader2, Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { wsManager } from '../lib/websocket';

import heroBg from '../../assets/home-hero-bg.png';
import heroVideo from '../../assets/arkaplan.mp4';

export default function HomePage() {
  const { t } = useTranslation();
  const { session } = useAuthStore();
  const settings = useSettingsStore();
  const social = useSocialStore();
  const isOnline = useAppStore((state) => state.isOnline);
  const navigate = useNavigate();
  const location = useLocation();

  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);

  // Trigger launch if redirected from VersionsPage with launch query param
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('launch') === 'true') {
      // Clear the query parameter so it won't launch again on refresh
      navigate('/home', { replace: true });
      // Small timeout to allow state to settle
      setTimeout(() => {
        handleLaunch();
      }, 100);
    }
  }, [location.search]);
  
  // Launch states
  const [launchStatus, setLaunchStatus] = useState<'IDLE' | 'CHECKING' | 'DOWNLOADING' | 'LAUNCHING' | 'RUNNING' | 'ERROR'>('IDLE');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentFileDownloading, setCurrentFileDownloading] = useState('');

  interface GitHubNewsItem {
    title: string;
    date: string;
    imageUrl: string;
  }
  const [newsData, setNewsData] = useState<GitHubNewsItem[]>([]);
  const [newsError, setNewsError] = useState(false);


  const displayNews = useMemo(() => {
    // Only real news from the published news feed; no placeholder articles.
    if (!newsData || newsData.length === 0 || newsError) return [];
    const categories = ['GÜNCELLEME', 'DUYURU', 'ETKİNLİK', 'MAĞAZA', 'SİSTEM', 'TOPLULUK'];
    const tagColors = [
      'text-[#2D7DD2] border-[#2D7DD2]/30 bg-[#2D7DD2]/10',
      'text-[#259457] border-[#259457]/30 bg-[#259457]/10',
      'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10',
      'text-[#EC4899] border-[#EC4899]/30 bg-[#EC4899]/10',
      'text-[#06B6D4] border-[#06B6D4]/30 bg-[#06B6D4]/10',
      'text-[#3B82F6] border-[#3B82F6]/30 bg-[#3B82F6]/10'
    ];
    return newsData.map((item, idx) => ({
      category: categories[idx % categories.length],
      tagColor: tagColors[idx % tagColors.length],
      title: item.title,
      description: (item as any).description || '',
      date: item.date,
      imageUrl: item.imageUrl || ''
    })).slice(0, 6);
  }, [newsData, newsError]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('https://raw.githubusercontent.com/musbabaff/marinmc-launcher/main/assets/news.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        const newsArray = Array.isArray(data) ? data : (data && Array.isArray(data.news) ? data.news : null);
        if (newsArray && newsArray.length >= 3) {
          setNewsData(newsArray.slice(0, 3));
        } else {
          throw new Error('Invalid data format');
        }
      } catch (err) {
        console.warn('GitHub news feed unreachable, showing offline states:', err);
        setNewsError(true);
      }
    };
    fetchNews();
  }, []);

  // Friends Panel states
  const [friendsTab, setFriendsTab] = useState<'friends' | 'requests' | 'lobby'>('friends');
  const [friendsSearch, setFriendsSearch] = useState('');
  const [friendsPanelOpen, setFriendsPanelOpen] = useState(true);

  // Lobby Chat states
  interface LobbyMessage {
    id: string;
    sender: string;
    content: string;
    time: string;
  }
  const INITIAL_LOBBY_MESSAGES: LobbyMessage[] = [];
  const [lobbyMessages, setLobbyMessages] = useState<LobbyMessage[]>(INITIAL_LOBBY_MESSAGES);
  const [lobbyInput, setLobbyInput] = useState('');
  const lobbyEndRef = useRef<HTMLDivElement>(null);

  // Setup WebSocket connection and lobby:message listener
  useEffect(() => {
    if (!session?.name) return;
    
    // Auto-connect to websocket
    wsManager.connect(session.name);

    const removeLobbyListener = wsManager.addListener('lobby:message', (msg: any) => {
      setLobbyMessages((prev) => {
        const next = [...prev, {
          id: msg.id || Math.random().toString(),
          sender: msg.sender,
          content: msg.content,
          time: msg.time || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        }];
        if (next.length > 40) {
          next.shift();
        }
        return next;
      });
    });

    return () => {
      removeLobbyListener();
    };
  }, [session]);

  // Scroll to bottom when lobbyMessages change or tab active
  useEffect(() => {
    if (friendsTab === 'lobby' && lobbyEndRef.current) {
      lobbyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lobbyMessages, friendsTab]);

  const handleSendLobbyMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lobbyInput.trim() || !session?.name) return;
    
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    wsManager.send('lobby:message', {
      content: lobbyInput.trim(),
      time: timeStr
    });
    
    setLobbyInput('');
  };

  // Add Friend modal
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const [addFriendLoading, setAddFriendLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (toast) {
      timer = setTimeout(() => {
        setToast(null);
      }, 3500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [toast]);

  // Setup game status listeners
  useEffect(() => {
    let unsubscribeLog: (() => void) | undefined;
    let unsubscribeProgress: (() => void) | undefined;
    let unsubscribeStatus: (() => void) | undefined;

    if (window.electronAPI) {
      unsubscribeLog = window.electronAPI.onGameLog((line: string) => {
        if (line.includes('İndiriliyor:')) {
          const match = line.match(/İndiriliyor:\s*(.+)/);
          if (match && match[1]) {
            setCurrentFileDownloading(match[1]);
          }
        }
      });

      unsubscribeProgress = window.electronAPI.onDownloadProgress((percent: number) => {
        setProgress(percent);
      });

      unsubscribeStatus = window.electronAPI.onGameStatus((status) => {
        setLaunchStatus(status);
        if (status === 'RUNNING') {
          if (settings.launcherBehavior === 'minimize') {
            window.electronAPI.minimize();
          } else if (settings.launcherBehavior === 'close') {
            window.electronAPI.close();
          }
        }
      });
    }

    return () => {
      if (unsubscribeLog) unsubscribeLog();
      if (unsubscribeProgress) unsubscribeProgress();
      if (unsubscribeStatus) unsubscribeStatus();
    };
  }, [settings.launcherBehavior]);

  const handleLaunch = async () => {
    if (launchStatus === 'RUNNING' || launchStatus === 'DOWNLOADING' || launchStatus === 'LAUNCHING' || launchStatus === 'CHECKING') {
      if (window.electronAPI) {
        await window.electronAPI.stopGame();
      }
      return;
    }

    setLaunchStatus('CHECKING');
    setErrorMessage('');
    setProgress(0);

    try {
      if (window.electronAPI) {
        // Optional pre-launch memory cleanup (Settings → "Oyun Öncesi Bellek Temizliği").
        if (localStorage.getItem('marinmc_setting_autoCleanRam') === 'true') {
          try { await window.electronAPI.optimizeMemory?.(); } catch { /* non-fatal */ }
        }

        // Step 1: Detect Java
        const javaCheck = await window.electronAPI.detectJava();
        if (!javaCheck.found) {
          setLaunchStatus('ERROR');
          setErrorMessage(t('home.javaNotFoundError'));
          return;
        }

        // Step 2: Launch with Session UUID
        const launchOptions = {
          ram: settings.ram,
          jvmArgs: settings.jvmArgs,
          username: session?.name || 'dbrn',
          accessToken: session?.token,
          uuid: session?.id,
          userType: session?.type,
          version: settings.selectedSubVersion || '1.21.8',
          serverId: 'towny',
          gameDir: settings.launcherDir,
          javaPath: settings.javaPath,
          smartJvmOpt: settings.smartJvmOpt,
          discordRpcEnabled: settings.discordRpcEnabled,
          resolutionWidth: settings.resolutionWidth,
          resolutionHeight: settings.resolutionHeight,
          fullscreen: settings.fullscreen,
          cosmetics: {
            skinType: (localStorage.getItem('marinmc_active_skin_type') as any) || 'username',
            capeUrl: localStorage.getItem('marinmc_active_cape_url') || '',
            apiUrl: getApiBaseUrl()
          }
        };

        // Launch for real (works offline if the version is already cached;
        // the backend reports a real error otherwise — no simulated progress).
        const result = await window.electronAPI.launchGame(launchOptions);
        if (!result.success) {
          setLaunchStatus('ERROR');
          setErrorMessage(result.error || t('home.launchError'));
        } else {
          // Track successful launches for achievements (Oyuna Hazır, Düzenli Oyuncu, Maratoncu).
          incrementStat('marinmc_stat_games_launched');
          // Add to recent played
          settings.addRecentProfile({
            id: 'towny',
            name: 'MarinMC Towny',
            version: settings.selectedVersion,
            subVersion: settings.selectedSubVersion,
            timePlayed: 'Just now',
            artworkUrl: ''
          });
          // Optional: open the live console (Settings → "Konsol Günlüğünü Göster").
          if (localStorage.getItem('marinmc_setting_showConsole') === 'true') {
            navigate('/console');
          }
        }
      } else {
        // The game can only be launched from the desktop app, not the browser.
        setLaunchStatus('ERROR');
        setErrorMessage(t('home.launchError'));
      }
    } catch (err: any) {
      setLaunchStatus('ERROR');
      setErrorMessage(err.message || t('home.errorOccurred'));
    }
  };

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUsername = newFriendUsername.trim();
    if (!targetUsername) return;

    if (targetUsername.toLowerCase() === (session?.name || '').toLowerCase()) {
      setToast({ type: 'error', message: 'Kendi kendinize arkadaşlık isteği gönderemezsiniz!' });
      return;
    }

    setAddFriendLoading(true);
    const result = await social.addFriend(targetUsername);
    setAddFriendLoading(false);

    if (result.ok) {
      setToast({ type: 'success', message: t('home.requestSent') || 'Arkadaşlık isteği gönderildi!' });
      setNewFriendUsername('');
      setAddFriendOpen(false);
    } else {
      // Show the real reason (e.g. user not registered, already friends, server not updated)
      setToast({ type: 'error', message: result.error || t('home.playerNotFound') || 'Oyuncu bulunamadı veya bir hata oluştu.' });
    }
  };

  const handleOpenChat = async (friendUsername: string) => {
    const activeUser = useAuthStore.getState().session?.name || 'Player';
    const chatContacts = await api.getContacts(activeUser);
    const exists = chatContacts.some(c => c.id.toLowerCase() === friendUsername.toLowerCase());
    if (!exists) {
      const newContact = {
        id: friendUsername.toLowerCase(),
        name: friendUsername,
        avatar: `https://minotar.net/avatar/${friendUsername}/48`,
        status: 'online',
        lastMessage: 'Sohbet başlatıldı',
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        type: 'dm' as const,
        unread: 0
      };
      const updated = [...chatContacts, newContact];
      await api.updateContacts(activeUser, updated as any);
    }
    navigate(`/chat?active=${friendUsername.toLowerCase()}`);
  };

  // Filter friends list
  const onlineFriends = social.friends.filter(f => f.status !== 'offline' && f.username.toLowerCase().includes(friendsSearch.toLowerCase()));
  const offlineFriends = social.friends.filter(f => f.status === 'offline' && f.username.toLowerCase().includes(friendsSearch.toLowerCase()));

  // Status dot color derived purely from real presence state.
  const getStatusColor = (_username: string, status: string) => {
    if (status === 'idle') return 'bg-[#F59E0B]'; // Boşta (Amber)
    return 'bg-[#259457]'; // Çevrimiçi / Oyunda (Yeşil)
  };

  const getStatusText = (friend: any) => {
    if (friend.status === 'idle') return t('social.idle');
    if (friend.status === 'in-game') return t('social.inGame', { server: friend.currentServer });
    return t('social.inLauncher');
  };

  return (
    <div className="flex-1 flex overflow-hidden h-full relative select-none">
      {/* Middle Main Dashboard */}
      <div className="flex-1 flex flex-col overflow-hidden h-full no-drag bg-[#070b19] text-[#d2d2d2] relative">
        
        {/* Offline Red Banner */}
        {!isOnline && (
          <div className="bg-[#D05239] text-white w-full py-2 px-6 flex items-center justify-between text-[11px] font-semibold select-none z-30 shrink-0">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
              <span>MarinMC is running in offline mode. No connection available.</span>
            </div>
            <button
              onClick={() => window.electronAPI && window.electronAPI.openExternal('https://support.marinmc.com')}
              className="flex items-center gap-1 hover:underline font-bold text-[9px] uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded transition-all hover:bg-white/20"
            >
              <span>Potential Solutions</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Launch Error Banner */}
        {launchStatus === 'ERROR' && errorMessage && (
          <div className="bg-[#EF4444] text-white w-full py-2 px-6 flex items-center justify-between text-[11px] font-semibold select-none z-30 shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setLaunchStatus('IDLE')}
              className="p-1 rounded hover:bg-white/10 text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Hero Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <video
            className="absolute inset-0 w-full h-full object-cover opacity-[0.25] scale-105 blur-[10px]"
            src={heroVideo}
            autoPlay
            loop
            muted
            playsInline
            poster={heroBg}
            onPlay={(e) => { e.currentTarget.playbackRate = 0.6; }}
            onError={(e) => {
              const target = e.target as HTMLVideoElement;
              const parent = target.parentElement;
              if (parent) {
                target.style.display = 'none';
                const fallbackImg = document.createElement('div');
                fallbackImg.className = 'absolute inset-0 bg-cover bg-center opacity-[0.25] scale-100';
                fallbackImg.style.backgroundImage = `url(${heroBg})`;
                parent.insertBefore(fallbackImg, target);
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070b19]/40 via-[#070b19]/80 to-[#070b19]" />
        </div>

        {/* Top Scrollable Area */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6 relative z-10 custom-scrollbar">

          {/* Redesigned Sleek Lunar-style Launch Panel */}
          <div className="w-full rounded-2xl bg-gradient-to-br from-[#080d1a] via-[#040714] to-[#080d1a] border border-white/[0.06] relative overflow-hidden flex flex-col items-center justify-center py-20 px-12 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(45,125,210,0.1)] group">
            {/* Background video overlay */}
            <video
              className="absolute inset-0 w-full h-full object-cover opacity-[0.18] scale-105 blur-[10px] pointer-events-none transition-transform duration-700 group-hover:scale-107"
              src={heroVideo}
              autoPlay
              loop
              muted
              playsInline
              onPlay={(e) => { e.currentTarget.playbackRate = 0.6; }}
            />
            {/* Background particles and radial gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(45,125,210,0.08),transparent_70%)] pointer-events-none" />
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#2D7DD2]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-[#EAB308]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Dynamic Minecraft-style floating pixel particles */}
            {[...Array(24)].map((_, i) => {
              const size = Math.random() * 4 + 2; // 2px to 6px
              const isGold = Math.random() > 0.5;
              const delay = Math.random() * 8;
              const duration = Math.random() * 10 + 6;
              const left = Math.random() * 90 + 5; // 5% to 95%
              return (
                <motion.div
                  key={i}
                  className={`absolute rounded-sm pointer-events-none ${
                    isGold 
                      ? 'bg-yellow-500/35 shadow-[0_0_10px_rgba(234,179,8,0.6)]' 
                      : 'bg-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  }`}
                  style={{
                    width: size,
                    height: size,
                    left: `${left}%`,
                    bottom: '10%'
                  }}
                  animate={{
                    y: [0, -260 - Math.random() * 120],
                    x: [0, (Math.random() - 0.5) * 60],
                    opacity: [0, 0.8, 0.8, 0],
                    scale: [0.5, 1.3, 0.5],
                  }}
                  transition={{
                    duration: duration,
                    repeat: Infinity,
                    delay: delay,
                    ease: "easeOut"
                  }}
                />
              );
            })}

            {/* Floating Minecraft Icons */}
            <motion.svg
              width="48"
              height="48"
              viewBox="0 0 16 16"
              className="absolute top-5 left-12 text-white/[0.04] pointer-events-none fill-current"
              animate={{
                y: [0, -12, 0],
                rotate: [15, 25, 15],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <path d="M12,2h2v2h-2V2z M11,3h2v2h-2V3z M10,4h2v2h-2V4z M9,5h2v2h-2V5z M8,6h2v2h-2V6z M7,7h2v2h-2V7z M6,8h2v2h-2V8z M5,9h2v2H5V9z M4,10h2v2H4V10z M3,11h2v2H3V11z M2,12h2v2H2V12z M2,10h1v1H2V10z M1,11h1v1H1V11z M0,12h1v1H0V12z M0,13h2v2H0V13z M13,1h2v2h-2V1z M14,0h2v2h-2V0z" />
            </motion.svg>

            <motion.svg
              width="48"
              height="48"
              viewBox="0 0 16 16"
              className="absolute top-8 right-16 text-white/[0.04] pointer-events-none fill-current"
              animate={{
                y: [0, -15, 0],
                rotate: [-15, -25, -15],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <path d="M13,0h3v3h-3V0z M12,1h2v2h-2V1z M11,2h2v2h-2V2z M10,3h1v1h-1V3z M9,4h1v1H9V4z M8,5h1v1H8V5z M7,6h1v1H7V6z M6,7h1v1H6V7z M5,8h1v1H5V8z M4,9h1v1H4V9z M3,10h1v1H3V10z M2,11h1v1H2V11z M1,12h1v1H1V12z M0,13h2v2H0V13z M14,3v1h-1V3z M15,4v1h-1V4z" />
            </motion.svg>

            <motion.svg
              width="48"
              height="48"
              viewBox="0 0 16 16"
              className="absolute bottom-8 left-20 text-white/[0.04] pointer-events-none fill-current"
              animate={{
                y: [0, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <path d="M6,2h4v1H6V2z M4,3h2v1H4V3z M10,3h2v1h-2V3z M3,4h1v2H3V4z M12,4h1v2h-1V4z M2,6h1v4H2V6z M13,6h1v4h-1V6z M3,10h1v2H3V10z M12,10h1v2h-1V10z M4,12h2v1H4V12z M10,12h2v1h-2V12z M6,13h4v1H6V13z M7,0h2v2H7V0z" />
            </motion.svg>

            <motion.svg
              width="48"
              height="48"
              viewBox="0 0 8 8"
              className="absolute bottom-6 right-24 text-white/[0.04] pointer-events-none fill-current"
              animate={{
                y: [0, -12, 0],
                rotate: [0, 15, -15, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <rect x="1" y="1" width="2" height="2" />
              <rect x="5" y="1" width="2" height="2" />
              <rect x="3" y="3" width="2" height="2" />
              <rect x="2" y="4" width="4" height="2" />
              <rect x="2" y="6" width="1" height="1" />
              <rect x="5" y="6" width="1" height="1" />
            </motion.svg>

            {/* Launch components */}
            <div className="w-full flex flex-col items-center z-10">
              <div className="flex items-center gap-4.5 w-full max-w-[560px]">
                {launchStatus === 'RUNNING' ? (
                  // Running - Stop Button (Red/Rose Gradient)
                  <button
                    onClick={handleLaunch}
                    className="flex-1 h-[88px] bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 active:scale-[0.98] text-white font-extrabold rounded-2xl transition-all duration-300 shadow-[0_10px_35px_rgba(244,63,94,0.3)] flex flex-col items-center justify-center gap-0.5 cursor-pointer border border-rose-500/20"
                  >
                    <span className="font-black text-[17px] tracking-widest uppercase">{t('home.stop')}</span>
                    <div className="flex items-center gap-1.5 text-[11px] text-white/80 font-bold">
                      <span>MarinMC {settings.selectedSubVersion || '1.21.3'}</span>
                      <span className="text-white/40">|</span>
                      <Square className="w-3 h-3 fill-current" />
                    </div>
                  </button>
                ) : launchStatus === 'DOWNLOADING' ? (
                  // Downloading Green Button (Click to cancel/stop)
                  <button
                    onClick={handleLaunch}
                    className="flex-1 h-[88px] bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-[0.98] text-white font-extrabold rounded-2xl transition-all duration-300 shadow-[0_10px_35px_rgba(16,185,129,0.3)] flex flex-col items-center justify-center gap-0.5 cursor-pointer border border-emerald-500/20"
                  >
                    <span className="font-black text-[17px] tracking-widest uppercase">{t('home.downloading')}</span>
                    <div className="flex items-center gap-1.5 text-[11px] text-white/80 font-bold">
                      <span>Fabric {settings.selectedSubVersion || '1.21.0'}</span>
                      <span className="text-white/40">|</span>
                      <Pause className="w-3 h-3 fill-current text-white animate-pulse" />
                    </div>
                  </button>
                ) : (launchStatus === 'CHECKING' || launchStatus === 'LAUNCHING') ? (
                  // Checking / Launching Amber Button (Click to cancel/stop)
                  <button
                    onClick={handleLaunch}
                    className="flex-1 h-[88px] bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 active:scale-[0.98] text-white font-extrabold rounded-2xl transition-all duration-300 shadow-[0_10px_35px_rgba(245,158,11,0.3)] flex flex-col items-center justify-center gap-0.5 cursor-pointer border border-amber-500/20"
                  >
                    <span className="font-black text-[17px] tracking-widest uppercase text-white">
                      {launchStatus === 'CHECKING' ? t('home.checking') : t('home.launching')}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-white/80 font-bold">
                      <span>{t('home.changeVersion')}</span>
                      <span className="text-white/40">|</span>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    </div>
                  </button>
                ) : (
                  // Professional split PLAY button: main launch + attached version switcher.
                  <div className="flex-grow h-[88px] flex rounded-2xl overflow-hidden border border-[#4ade80]/25 shadow-[0_12px_40px_rgba(34,197,94,0.35),0_0_20px_rgba(34,197,94,0.12)]">
                    <button
                      onClick={handleLaunch}
                      className="flex-grow flex items-center justify-center gap-3.5 bg-gradient-to-r from-[#22c55e] to-[#15803d] hover:from-[#4ade80] hover:to-[#16a34a] active:scale-[0.99] text-white transition-all duration-300 cursor-pointer select-none px-6"
                    >
                      <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0 shadow-inner">
                        <Play className="w-5.5 h-5.5 fill-current text-white" />
                      </div>
                      <div className="flex flex-col items-start leading-none">
                        <span className="font-black text-[18px] tracking-widest uppercase text-white drop-shadow-sm">{t('home.launch')}</span>
                        <span className="text-[10.5px] text-white/85 font-extrabold uppercase tracking-wider mt-1">
                          MarinMC {settings.selectedSubVersion || '1.21.8'}
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setVersionModalOpen(true);
                      }}
                      className="w-[60px] shrink-0 bg-[#15803d] hover:bg-[#1a9648] active:scale-[0.97] border-l border-black/20 flex items-center justify-center transition-colors cursor-pointer group"
                      title={t('home.changeVersion')}
                    >
                      <ChevronUp className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
                    </button>
                  </div>
                )}

                {/* Profile/Java settings (RAM, resolution, version) — distinct from version switcher */}
                <button
                  onClick={() => setProfileSettingsOpen(true)}
                  className="w-[88px] h-[88px] bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.96] border border-white/[0.08] rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] shrink-0 group"
                  title={t('home.settings')}
                >
                  <Settings className="w-6 h-6 text-white/60 group-hover:text-white group-hover:rotate-45 transition-all duration-300" />
                  <span className="text-[7px] font-black uppercase tracking-widest text-white/40 group-hover:text-white/70 transition-colors">{t('home.settings')}</span>
                </button>
              </div>

              {/* Version Selector Link under Button */}
              <button
                onClick={() => navigate('/versions')}
                className="mt-3.5 text-[9px] font-black text-[#62626B] hover:text-[#B1B1BA] uppercase tracking-widest transition-colors flex items-center gap-1.5"
              >
                <span>{t('home.changeVersion')}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#62626B]" />
              </button>

              {/* Progress bar inside card if downloading */}
              {launchStatus === 'DOWNLOADING' && (() => {
                const details = currentFileDownloading ? currentFileDownloading.match(/(.+?)\s*\((\d+)\/(\d+)\)/) : null;
                const fileType = details ? details[1].trim().toUpperCase() : 'GEREKSİNİMLER';
                const currentFile = details ? parseInt(details[2], 10) : 0;
                const totalFiles = details ? parseInt(details[3], 10) : 100;
                
                return (
                  <div className="w-full max-w-[460px] mt-3.5 space-y-1.5 animate-[fadeIn_0.2s_ease-out]">
                    <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden border border-white/[0.02] shadow-inner">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-[#A1A1AA] font-bold uppercase tracking-wide">
                      <span className="truncate max-w-[280px] text-emerald-400">
                        {fileType}: {currentFile > 0 ? `${currentFile} / ${totalFiles}` : 'KONTROL EDİLİYOR'}
                      </span>
                      <span className="text-white/40">%{progress} TAMAM</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

        </div>

        {/* Bottom Pinned News Feed Area */}
        <div className="shrink-0 bg-[#080d1a]/85 border-t border-white/[0.04] p-6 relative z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          {/* News Feed Header */}
          <div className="space-y-1.5 pb-4">
            <span className="text-[10px] font-black text-[#EAB308] uppercase tracking-wider">MARINMC HABERLERİ</span>
            <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#EAB308] animate-pulse" />
              <span>Gelişmeler & Güncellemeler</span>
            </h2>
          </div>

          {/* News Feed Grid */}
          {(!isOnline || displayNews.length === 0) ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3 h-[180px] bg-[#0f172a]/40 border border-white/[0.04] rounded-2xl flex items-center justify-center flex-col text-center p-6 relative group">
                <WifiOff className="w-8 h-8 text-[#52525B] mb-2" />
                <span className="text-[10px] font-bold text-[#52525B]">{t('home.newsServiceError')}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {displayNews.slice(0, 3).map((item, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="relative rounded-2xl overflow-hidden border border-white/[0.04] bg-[#0f172a]/60 hover:bg-[#1e293b]/80 hover:border-white/10 transition-all duration-300 flex flex-col h-[180px] group shadow-xl"
                >
                  {/* Card Image Cover with zoom effect */}
                  <div className="h-[90px] overflow-hidden relative shrink-0">
                    <div
                      className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                      style={{ backgroundImage: `url(${item.imageUrl})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-black/30 pointer-events-none" />
                    
                    {/* Category tag on top of image */}
                    <span className={`absolute top-2.5 left-2.5 text-[7.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded border backdrop-blur-md ${item.tagColor}`}>
                      {item.category}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-3 flex flex-col justify-between flex-grow min-h-0 relative z-10">
                    <div className="space-y-0.5">
                      <h3 className="text-[9.5px] font-black text-white leading-snug uppercase line-clamp-1 tracking-wide group-hover:text-[#2D7DD2] transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-[8px] text-[#A1A1AA] leading-normal line-clamp-2 font-semibold">
                        {item.description}
                      </p>
                    </div>
                    
                    {/* Card Footer */}
                    <div className="flex justify-between items-center pt-1.5 border-t border-white/[0.03] mt-1 shrink-0">
                      <span className="text-[7px] text-[#52525B] font-bold font-mono uppercase tracking-wider">{item.date}</span>
                      <span className="text-[7px] text-[#2D7DD2] font-black uppercase tracking-widest group-hover:underline flex items-center gap-0.5">
                        DEVAMINI OKU ➔
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Redesigned Collapsible right sidebar panel for friends list */}
      <div
        className={`bg-[#070b19] border-l border-white/[0.04] flex flex-col transition-all duration-300 relative select-none shrink-0 ${
          friendsPanelOpen ? 'w-[300px]' : 'w-0'
        }`}
      >
        {friendsPanelOpen && (
          <div className="flex flex-col h-full w-[300px]">
            {/* Tab Header Selector */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.04]">
              <div className="flex gap-3">
                <button
                  onClick={() => setFriendsTab('friends')}
                  className={`text-[10px] font-black uppercase tracking-wider relative transition-colors ${
                    friendsTab === 'friends' ? 'text-white' : 'text-[#52525B] hover:text-[#A1A1AA]'
                  }`}
                >
                  {t('home.friendsTab')}
                </button>
                <button
                  onClick={() => setFriendsTab('lobby')}
                  className={`text-[10px] font-black uppercase tracking-wider relative transition-colors ${
                    friendsTab === 'lobby' ? 'text-white' : 'text-[#52525B] hover:text-[#A1A1AA]'
                  }`}
                >
                  <span>Lobi</span>
                  <span className="absolute top-0 -right-2.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                </button>
                <button
                  onClick={() => setFriendsTab('requests')}
                  className={`text-[10px] font-black uppercase tracking-wider relative transition-colors ${
                    friendsTab === 'requests' ? 'text-white' : 'text-[#52525B] hover:text-[#A1A1AA]'
                  }`}
                >
                  <span>{t('home.requestsTab')}</span>
                  {social.pendingRequests > 0 && (
                    <span className="absolute top-0 -right-2.5 w-1.5 h-1.5 bg-[#F59E0B] rounded-full" />
                  )}
                </button>
              </div>

              {/* Add friend trigger */}
              <button
                onClick={() => setAddFriendOpen(true)}
                className="p-1 rounded hover:bg-white/5 text-[#52525B] hover:text-white transition-colors"
                title={t('home.addFriend')}
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>

            {/* Content box based on tab */}
            {friendsTab === 'friends' ? (
              <>
                {social.friends.length === 0 ? (
                  <div className="flex-1 flex flex-col justify-between p-4 bg-black/10">
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-8">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 border border-emerald-500/20">
                        <MessageSquare className="w-6 h-6 animate-pulse" />
                      </div>
                      
                      <button
                        onClick={() => navigate('/chat')}
                        className="text-emerald-400 hover:text-emerald-300 font-black text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 transition-colors"
                      >
                        SATELLITE'I AÇ <span className="text-[10px]">↗</span>
                      </button>
                      
                      <p className="text-[10.5px] text-[#A1A1AA] font-semibold leading-relaxed mb-6 max-w-[200px]">
                        Satellite üzerinden farklı sürüm ve sunuculardaki arkadaşlarınla mesajlaş.
                      </p>
                      
                      <button
                        onClick={() => setAddFriendOpen(true)}
                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 active:scale-95 flex items-center gap-1.5"
                      >
                        <UserPlus className="w-4 h-4" />
                        İLK ARKADAŞINI EKLE
                      </button>
                    </div>


                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Search */}
                    <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-2.5 bg-black/10">
                      <Search className="w-3.5 h-3.5 text-[#52525B]" />
                      <input
                        type="text"
                        value={friendsSearch}
                        onChange={(e) => setFriendsSearch(e.target.value)}
                        placeholder={t('home.findPlayerPlaceholder')}
                        className="bg-transparent border-none focus:outline-none text-[10px] text-white placeholder-white/20 w-full font-bold uppercase tracking-wider"
                      />
                    </div>

                    {/* Offline Mode Alert for friends service */}
                    {!isOnline ? (
                      <div className="flex-grow flex flex-col">
                        {/* Big Offline Banner */}
                        <div className="flex-grow flex flex-col items-center justify-center text-center p-6 bg-black/10">
                          <WifiOff className="w-9 h-9 text-[#52525B] mb-2.5" />
                          <span className="text-[10px] text-[#52525B] uppercase tracking-widest max-w-[200px] leading-relaxed">
                            {t('home.friendsServiceError')}
                          </span>
                        </div>

                        {/* Offline friends list underneath (mockup requirement) */}
                        <div className="border-t border-white/[0.04] h-[220px] overflow-y-auto p-4 space-y-2.5 custom-scrollbar bg-black/25">
                          <span className="text-[9px] font-black text-[#52525B] uppercase tracking-wider block">
                            {t('home.offlineCount', { count: offlineFriends.length })}
                          </span>
                          {offlineFriends.map((f) => (
                            <div key={f.username} className="flex items-center gap-3 p-1 rounded-lg opacity-40">
                              <img
                                src={sanitizeUrl(`https://minotar.net/avatar/${sanitizeParam(f.username)}/32`)}
                                alt={f.username}
                                className="w-7 h-7 rounded-lg grayscale border border-white/5"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = STEVE_AVATAR_FALLBACK;
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[11px] font-bold text-white leading-none mb-1">{f.username}</h4>
                                <p className="text-[8px] text-[#A1A1AA] leading-none font-semibold uppercase">{t('social.offline')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Online friends lists */
                      <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {/* Online section */}
                        <div className="space-y-2">
                          <span className="text-[9px] font-black text-[#52525B] uppercase tracking-wider block">
                            {t('home.onlineCount', { count: onlineFriends.length })}
                          </span>
                          {onlineFriends.map((f) => (
                            <div key={f.username} className="flex items-center gap-3 p-1 rounded-lg hover:bg-white/[0.01] group transition-all">
                              <div className="relative">
                                <img
                                  src={sanitizeUrl(`https://minotar.net/avatar/${sanitizeParam(f.username)}/32`)}
                                  alt={f.username}
                                  className="w-7 h-7 rounded-lg border border-white/5"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = STEVE_AVATAR_FALLBACK;
                                  }}
                                />
                                <span className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-[#070b19] ${
                                  getStatusColor(f.username, f.status)
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <h4 className="text-[11px] font-bold text-white leading-none">{f.username}</h4>
                                </div>
                                <p className="text-[8.5px] text-[#A1A1AA] truncate leading-none font-semibold">
                                  {getStatusText(f)}
                                </p>
                              </div>
                              <div className="relative flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenChat(f.username)}
                                  className="p-1 rounded bg-white/5 border border-white/5 text-[#52525B] hover:text-white transition-colors"
                                  title="Mesaj Gönder"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => social.removeFriend(f.username)}
                                  className="p-1 rounded bg-red-500/10 border border-red-500/20 text-[#52525B] hover:text-red-400 hover:bg-red-500/20 transition-colors"
                                  title="Arkadaşı Sil"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                                {/* Chat Badge mockup unread dot */}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Offline section */}
                        <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                          <span className="text-[9px] font-black text-[#52525B] uppercase tracking-wider block">
                            {t('home.offlineCount', { count: offlineFriends.length })}
                          </span>
                          {offlineFriends.map((f) => (
                            <div key={f.username} className="flex items-center gap-3 p-1 rounded-lg opacity-40 hover:opacity-100 group transition-all">
                              <img
                                  src={sanitizeUrl(`https://minotar.net/avatar/${sanitizeParam(f.username)}/32`)}
                                  alt={f.username}
                                  className="w-7 h-7 rounded-lg grayscale border border-white/5"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = STEVE_AVATAR_FALLBACK;
                                  }}
                                />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[11px] font-bold text-white leading-none mb-1">{f.username}</h4>
                                <p className="text-[8px] text-[#A1A1AA] leading-none font-semibold uppercase">{t('social.offline')}</p>
                              </div>
                              <div className="relative opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenChat(f.username)}
                                  className="p-1 rounded bg-white/5 border border-white/5 text-[#52525B] hover:text-white transition-colors"
                                  title="Mesaj Gönder"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => social.removeFriend(f.username)}
                                  className="p-1 rounded bg-red-500/10 border border-red-500/20 text-[#52525B] hover:text-red-400 hover:bg-red-500/20 transition-colors"
                                  title="Arkadaşı Sil"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                                {f.username === '2fishbowl' && (
                                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#ef4444] rounded-full" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}


                  </div>
                )}
              </>
            ) : friendsTab === 'lobby' ? (
              // Lobby Chat View
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-black/10">
                {/* Message logs */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {lobbyMessages.map((msg) => {
                    const isSelf = msg.sender.toLowerCase() === session?.name?.toLowerCase();
                    const isAdmin = msg.sender === 'Admin';
                    return (
                      <div key={msg.id} className="flex gap-2.5 items-start">
                        <img 
                          src={`https://minotar.net/avatar/${msg.sender}/24`} 
                          alt={msg.sender} 
                          className="w-6 h-6 rounded shrink-0 border border-white/5 bg-black/35"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = STEVE_AVATAR_FALLBACK;
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <span className={`text-[9.5px] font-black tracking-wide ${
                              isSelf ? 'text-amber-400' : isAdmin ? 'text-red-400' : 'text-[#a78bfa]'
                            }`}>
                              {msg.sender}
                            </span>
                            <span className="text-[7.5px] text-[#52525B] font-medium font-mono">{msg.time}</span>
                          </div>
                          <p className="text-[10px] text-white/90 font-medium leading-normal mt-0.5 break-all">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={lobbyEndRef} />
                </div>

                {/* Input box */}
                <form onSubmit={handleSendLobbyMessage} className="p-3 border-t border-white/[0.04] flex gap-2 items-center bg-black/15 shrink-0">
                  <input
                    type="text"
                    value={lobbyInput}
                    onChange={(e) => setLobbyInput(e.target.value)}
                    placeholder="Lobiye mesaj yaz..."
                    maxLength={150}
                    className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-[9.5px] text-white placeholder-white/20 outline-none focus:border-[#2D7DD2]/50 font-medium"
                  />
                  <button 
                    type="submit"
                    className="p-2 bg-[#2D7DD2]/20 hover:bg-[#2D7DD2]/30 border border-[#2D7DD2]/30 text-[#2D7DD2] rounded-xl transition-all active:scale-95 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            ) : (
              // Requests View
              <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {social.pendingNames.length > 0 ? (
                  social.pendingNames.map((name) => (
                    <div key={name} className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                        <div className="flex items-center gap-2.5">
                          <img src={`https://minotar.net/avatar/${name}/24`} alt="avatar" className="w-6 h-6 rounded" />
                          <span className="text-[10px] font-bold text-white">{name}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => social.acceptRequest(name)}
                            className="bg-[#2D7DD2] hover:bg-[#4A9AE8] text-white px-2 py-0.5 rounded text-[8px] font-black uppercase transition-colors"
                          >
                            {t('home.accept')}
                          </button>
                          <button
                            onClick={() => social.rejectRequest(name)}
                            className="bg-white/5 hover:bg-white/10 text-[#A1A1AA] px-2 py-0.5 rounded text-[8px] font-black uppercase transition-colors"
                          >
                            {t('home.reject')}
                          </button>
                        </div>
                      </div>
                  ))
                ) : (
                  <div className="text-center text-[10px] text-gray-500 font-bold py-6 uppercase tracking-wider">{t('home.noPendingRequests')}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collapse vertical toggle tab handle */}
      <button
        onClick={() => setFriendsPanelOpen(!friendsPanelOpen)}
        className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#070b19] hover:bg-[#0f172a] border-l border-y border-white/[0.04] text-[#52525B] hover:text-white px-0.5 py-4 rounded-l-md z-30 transition-all select-none"
      >
        <span className="text-[8px] font-bold writing-mode-vertical uppercase tracking-widest">
          {friendsPanelOpen ? '▶' : '◀'}
        </span>
      </button>

      {/* Add friend overlay Modal */}
      <AnimatePresence>
        {addFriendOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setAddFriendOpen(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#070b19] border border-white/[0.08] w-[320px] rounded-2xl p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">{t('home.friendRequest')}</h4>
                <button onClick={() => setAddFriendOpen(false)} className="p-1 rounded hover:bg-white/5 text-[#52525B] hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleAddFriendSubmit} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder={t('home.minecraftUsername')}
                  value={newFriendUsername}
                  onChange={(e) => setNewFriendUsername(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs font-semibold text-white focus:outline-none focus:border-[#2D7DD2]"
                />
                <button
                  type="submit"
                  disabled={addFriendLoading}
                  className="w-full py-2.5 rounded-xl bg-[#2D7DD2] hover:bg-[#4A9AE8] text-white font-black text-xs uppercase tracking-wider flex justify-center items-center gap-1.5 shadow-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{addFriendLoading ? t('home.checkingFriend') : t('home.sendRequest')}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Version Modal */}
      <VersionModal
        isOpen={versionModalOpen}
        onClose={() => setVersionModalOpen(false)}
        onLaunch={handleLaunch}
      />

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={profileSettingsOpen}
        onClose={() => setProfileSettingsOpen(false)}
      />

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`fixed top-12 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all select-none ${
              toast.type === 'success'
                ? 'bg-green-500/10 border-green-500/25 text-green-400 shadow-green-500/5'
                : 'bg-red-500/10 border-red-500/25 text-red-400 shadow-red-500/5'
            }`}
            style={{ minWidth: '280px' }}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              toast.type === 'success' ? 'bg-green-500/15' : 'bg-red-500/15'
            }`}>
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4.5 h-4.5 text-green-400 animate-bounce" />
              ) : (
                <AlertTriangle className="w-4.5 h-4.5 text-red-400 animate-pulse" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[8px] font-black uppercase tracking-widest block text-white/40 mb-0.5">
                {toast.type === 'success' ? 'BAŞARILI' : 'HATA'}
              </span>
              <span className="text-[11px] font-semibold text-white/90 leading-tight block">
                {toast.message}
              </span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded hover:bg-white/5 text-white/30 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
