import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.ts';
import { useSettingsStore } from '../stores/settingsStore.ts';
import { useSocialStore } from '../stores/socialStore.ts';
import { useAppStore } from '../stores/appStore.ts';
import { sanitizeUrl, sanitizeParam } from '../lib/security.ts';
import { api } from '../lib/api.ts';
import VersionModal from '../components/VersionModal.tsx';
import ProfileSettingsModal from '../components/ProfileSettingsModal.tsx';
import MarinLogo from '../components/MarinLogo.tsx';
import {
  ChevronDown, LogOut, Search,
  MessageSquare, UserPlus, X, AlertTriangle,
  Trophy, CheckCircle2, WifiOff, ExternalLink, RefreshCw,
  Pause, Plus, Trash2, Send,
  Gamepad2, Users,
  Settings, Image, Package, ShoppingBag,
  Zap, TrendingUp, Activity,
  Globe, BarChart3, Sparkles, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { wsManager } from '../lib/websocket';

import heroBg from '../../assets/home-hero-bg.png';
import astronautImg from '../../assets/minecraft-astronaut.png';
import rocketImg from '../../assets/minecraft-rocket.png';

export default function HomePage() {
  const { t } = useTranslation();
  const { session, logout, profiles, switchProfile, removeProfile, addOfflineProfile, addMicrosoftProfile } = useAuthStore();
  const settings = useSettingsStore();
  const social = useSocialStore();
  const isOnline = useAppStore((state) => state.isOnline);
  const navigate = useNavigate();
  const location = useLocation();

  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [offlineAddOpen, setOfflineAddOpen] = useState(false);
  const [newOfflineName, setNewOfflineName] = useState('');
  const [newOfflinePassword, setNewOfflinePassword] = useState('');
  const [isDropdownRegister, setIsDropdownRegister] = useState(false);
  const [profileAddError, setProfileAddError] = useState<string | null>(null);
  const [profileAddSuccess, setProfileAddSuccess] = useState<string | null>(null);

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
  const [homeServers, setHomeServers] = useState<any[]>([]);
  const [onlineCountVal, setOnlineCountVal] = useState(247);
  const [lastSessionServer, setLastSessionServer] = useState('-');
  const [lastSessionTimeAgoText, setLastSessionTimeAgoText] = useState('');

  // === NEW: Weekly activity chart data ===
  const weeklyData = useMemo(() => {
    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const today = new Date().getDay();
    // Rotate array so today is last
    const adjusted = today === 0 ? 6 : today - 1;
    return days.map((day, i) => {
      // Generate deterministic-looking data from stored play sessions
      const stored = JSON.parse(localStorage.getItem('marinmc_weekly_activity') || '[]');
      const val = stored[i] || Math.floor(Math.random() * 4);
      return {
        day,
        hours: val,
        isToday: i === adjusted,
      };
    });
  }, []);

  useEffect(() => {
    api.getServerList().then((list) => {
      setHomeServers(list);
    });
  }, []);

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

  useEffect(() => {
    api.getOnlineCount().then((res) => {
      if (res && typeof res.total === 'number') {
        setOnlineCountVal(res.total);
      }
    }).catch(err => console.warn('Failed to fetch online count:', err));
  }, []);

  useEffect(() => {
    if (!session?.name) return;
    api.getUserProfile(session.name).then((profile: any) => {
      if (profile.playSessions && profile.playSessions.length > 0) {
        const last = profile.playSessions[profile.playSessions.length - 1];
        setLastSessionServer(last.server || '-');
        setLastSessionTimeAgoText(last.date || '');
      } else {
        setLastSessionServer('-');
        setLastSessionTimeAgoText('');
      }
    }).catch((err: any) => console.warn('Failed to fetch profile in home:', err));
  }, [session]);

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
    if (launchStatus === 'RUNNING') {
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
          version: settings.selectedVersion || '1.21',
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
            capeUrl: localStorage.getItem('marinmc_active_cape_url') || ''
          }
        };

        // Simulating progress if launching offline or locally for design test
        if (!isOnline) {
          setLaunchStatus('DOWNLOADING');
          let currentProgress = 0;
          const interval = setInterval(() => {
            currentProgress += 5;
            setProgress(currentProgress);
            setCurrentFileDownloading(`fetching fabric-loader-0.15.7.jar...`);
            if (currentProgress >= 100) {
              clearInterval(interval);
              setLaunchStatus('RUNNING');
            }
          }, 300);
          return;
        }

        const result = await window.electronAPI.launchGame(launchOptions);
        if (!result.success) {
          setLaunchStatus('ERROR');
          setErrorMessage(result.error || t('home.launchError'));
        } else {
          // Add to recent played
          settings.addRecentProfile({
            id: 'towny',
            name: 'MarinMC Towny',
            version: settings.selectedVersion,
            subVersion: settings.selectedSubVersion,
            timePlayed: 'Just now',
            artworkUrl: ''
          });
        }
      } else {
        // Mock launch in browser mode
        setLaunchStatus('DOWNLOADING');
        let currentProgress = 0;
        const interval = setInterval(() => {
          currentProgress += 10;
          setProgress(currentProgress);
          setCurrentFileDownloading(`fetching fabric-loader-0.15.7.jar...`);
          if (currentProgress >= 100) {
            clearInterval(interval);
            setLaunchStatus('RUNNING');
          }
        }, 400);
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
    const success = await social.addFriend(targetUsername);
    setAddFriendLoading(false);

    if (success) {
      setToast({ type: 'success', message: t('home.requestSent') || 'Arkadaşlık isteği gönderildi!' });
      setNewFriendUsername('');
      setAddFriendOpen(false);
    } else {
      setToast({ type: 'error', message: t('home.playerNotFound') || 'Oyuncu bulunamadı veya bir hata oluştu.' });
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

  // Map user status indicators to specific dots from design
  const getStatusColor = (username: string, _status: string) => {
    if (username === 'daaaavidds' || username === 'zakhbear') return 'bg-[#ef4444]'; // Busy (Red)
    if (username === '3wafyy') return 'bg-[#2D7DD2]'; // In Launcher (Purple)
    if (username === 'KingofHalo04' || username === 'meegreyone') return 'bg-[#F59E0B]'; // Idle (Amber)
    return 'bg-[#259457]'; // Online / In Game (Green)
  };

  const getStatusText = (friend: any) => {
    if (friend.username === '172px') return 'In-game: Hypixel';
    if (friend.username === 'daaaavidds') return 'In-game: Singleplayer';
    if (friend.username === 'masaya46') return 'In-game: Private Server';
    if (friend.username === '3wafyy') return 'In Launcher';
    if (friend.username === 'cuvsa') return 'In-game: Donut SMP';
    if (friend.username === 'zakhbear') return 'In Menus';
    if (friend.status === 'idle') return 'Idle';
    return friend.status === 'in-game' ? t('social.inGame', { server: friend.currentServer }) : t('social.inLauncher');
  };

  return (
    <div className="flex-1 flex overflow-hidden h-full relative select-none">
      {/* Middle Main Dashboard */}
      <div className="flex-1 flex flex-col overflow-y-auto no-drag custom-scrollbar bg-[#060305] text-[#d2d2d2]">
        
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
        <div className="absolute top-0 left-0 right-0 h-[420px] pointer-events-none overflow-hidden z-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.15] scale-105 blur-sm"
            style={{ backgroundImage: `url(${heroBg})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#060305]/70 to-[#060305]" />
        </div>

        <div className="p-6 flex flex-col space-y-6 relative z-10">
          {/* Minimal top header with Profile Switcher */}
          <div className="flex justify-end items-center relative z-20">
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/[0.04] rounded-xl text-white text-[10px] font-bold uppercase transition-all"
              >
                <img
                  src={session?.avatar}
                  alt="avatar"
                  className="w-4 h-4 rounded bg-black/20 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/20';
                  }}
                />
                <span>{session?.name || 'dbrn'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {profileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute right-0 mt-2 bg-[#060305] border border-white/[0.08] rounded-xl shadow-2xl w-64 py-2.5 z-50 text-[10px] font-black"
                  >
                    <div className="px-3.5 pb-2 border-b border-white/[0.05] mb-2 flex items-center justify-between">
                      <span className="text-[#52525B] uppercase tracking-wider text-[8px] font-black">Hesaplar</span>
                      <span className="text-[7.5px] bg-[#2D7DD2]/20 text-[#2D7DD2] border border-[#2D7DD2]/30 px-1.5 py-0.5 rounded uppercase">Aktif: {session?.type}</span>
                    </div>

                    {/* Display profiles list */}
                    <div className="max-h-36 overflow-y-auto space-y-1 px-1.5 custom-scrollbar">
                      {profiles.map((p) => {
                        const isCurrent = p.id === session?.id;
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center justify-between p-1.5 rounded-lg transition-colors group ${
                              isCurrent ? 'bg-[#2D7DD2]/10 border border-[#2D7DD2]/25' : 'hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <div
                              onClick={async () => {
                                if (!isCurrent) {
                                  setProfileDropdownOpen(false);
                                  await switchProfile(p.id);
                                }
                              }}
                              className="flex items-center gap-2 cursor-pointer flex-grow min-w-0"
                            >
                              <img
                                src={p.avatar}
                                alt="avatar"
                                className="w-5 h-5 rounded bg-black/25 shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/20';
                                }}
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-white truncate font-bold text-[9.5px]">{p.name}</span>
                                <span className="text-[7px] text-[#52525B] uppercase leading-none font-bold">
                                  {p.type === 'ms' ? 'Microsoft' : 'Cracked'}
                                </span>
                              </div>
                            </div>
                            {/* Remove profile button */}
                            {profiles.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeProfile(p.id);
                                }}
                                className="p-1 rounded text-[#52525B] hover:text-red-400 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
                                title="Hesabı Kaldır"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add account forms/buttons */}
                    <div className="mt-2 border-t border-white/[0.05] pt-2 px-3 space-y-1.5">
                      {offlineAddOpen ? (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (newOfflineName.trim().length < 3) {
                              setProfileAddError('En az 3 karakter giriniz.');
                              return;
                            }
                            if (newOfflinePassword.length < 6) {
                              setProfileAddError('Şifre en az 6 karakter olmalıdır.');
                              return;
                            }
                            setProfileAddError(null);
                            try {
                              await addOfflineProfile(newOfflineName.trim(), newOfflinePassword, isDropdownRegister);
                              setOfflineAddOpen(false);
                              setNewOfflineName('');
                              setNewOfflinePassword('');
                              setProfileAddSuccess('Profil başarıyla eklendi.');
                              setTimeout(() => setProfileAddSuccess(null), 3000);
                            } catch (err: any) {
                              setProfileAddError(err.message || 'Profil eklenemedi.');
                            }
                          }}
                          className="space-y-1.5"
                        >
                          <div className="flex bg-[#111111]/80 rounded-lg p-0.5 border border-white/5">
                            <button
                              type="button"
                              onClick={() => setIsDropdownRegister(false)}
                              className={`flex-1 py-0.5 rounded text-[7px] font-bold transition-all uppercase ${
                                !isDropdownRegister ? 'bg-[#2D7DD2] text-white' : 'text-white/45'
                              }`}
                            >
                              Giriş
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsDropdownRegister(true)}
                              className={`flex-1 py-0.5 rounded text-[7px] font-bold transition-all uppercase ${
                                isDropdownRegister ? 'bg-[#2D7DD2] text-white' : 'text-white/45'
                              }`}
                            >
                              Kayıt
                            </button>
                          </div>
                          <div className="flex items-center bg-[#111111] border border-white/10 rounded-lg px-2 py-1 focus-within:border-[#2D7DD2]/50">
                            <input
                              type="text"
                              placeholder="Kullanıcı Adı"
                              value={newOfflineName}
                              onChange={(e) => setNewOfflineName(e.target.value)}
                              className="bg-transparent border-none outline-none text-[8.5px] w-full text-white placeholder-white/20 font-bold"
                              autoFocus
                            />
                          </div>
                          <div className="flex items-center bg-[#111111] border border-white/10 rounded-lg px-2 py-1 focus-within:border-[#2D7DD2]/50">
                            <input
                              type="password"
                              placeholder={isDropdownRegister ? "Şifre (En az 6 kar.)" : "Şifre giriniz"}
                              value={newOfflinePassword}
                              onChange={(e) => setNewOfflinePassword(e.target.value)}
                              className="bg-transparent border-none outline-none text-[8.5px] w-full text-white placeholder-white/20 font-bold"
                            />
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              type="submit"
                              className="flex-1 py-1.5 bg-[#2D7DD2] hover:bg-[#4A9AE8] text-white rounded font-bold text-[8px] uppercase tracking-wider transition-colors"
                            >
                              Ekle
                            </button>
                            <button
                              type="button"
                              onClick={() => { setOfflineAddOpen(false); setProfileAddError(null); }}
                              className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[#A1A1AA] hover:text-white rounded font-bold text-[8px] uppercase tracking-wider transition-colors"
                            >
                              İptal
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { setOfflineAddOpen(true); setProfileAddError(null); }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded font-bold text-[7.5px] uppercase tracking-wider transition-all"
                          >
                            <UserPlus className="w-2.5 h-2.5" />
                            <span>Offline Ekle</span>
                          </button>
                          <button
                            onClick={async () => {
                              setProfileAddError(null);
                              try {
                                await addMicrosoftProfile();
                                setProfileAddSuccess('Profil başarıyla eklendi.');
                                setTimeout(() => setProfileAddSuccess(null), 3000);
                              } catch (err: any) {
                                setProfileAddError(err.message || 'Profil eklenemedi.');
                              }
                            }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#208390]/20 hover:bg-[#208390]/30 border border-[#208390]/30 text-[#208390] rounded font-bold text-[7.5px] uppercase tracking-wider transition-all"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>Microsoft Ekle</span>
                          </button>
                        </div>
                      )}

                      {profileAddError && (
                        <div className="text-[7.5px] text-red-400 font-bold text-center mt-1">
                          {profileAddError}
                        </div>
                      )}
                      {profileAddSuccess && (
                        <div className="text-[7.5px] text-[#259457] font-bold text-center mt-1 animate-pulse">
                          {profileAddSuccess}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={async () => {
                        setProfileDropdownOpen(false);
                        await logout();
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-red-400 hover:bg-red-500/10 text-left border-t border-white/[0.05] mt-2.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t('servers.logout')}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Redesigned 1:1 Lunar Client style Hero Card */}
          <div className="w-full h-[300px] rounded-3xl bg-gradient-to-r from-[#0d0a11] via-[#08060a] to-[#0d0a11] border border-white/[0.05] relative overflow-hidden flex items-center justify-between px-12 shadow-[0_25px_60px_rgba(0,0,0,0.7)] group">
            {/* Background particles and radial gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.06),transparent_60%)] pointer-events-none" />
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-[#2D7DD2]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-[#8B5CF6]/5 rounded-full blur-3xl pointer-events-none" />

            {/* Left side: Floating Voxel Astronaut */}
            <div className="hidden md:block w-36 h-36 relative select-none pointer-events-none z-10 shrink-0">
              <img
                src={astronautImg}
                alt="Astronaut"
                className="w-full h-full object-contain animate-float"
              />
            </div>

            {/* Center: Massive Launch Button and Change Version */}
            <div className="flex-1 flex flex-col items-center justify-center z-10 min-w-0 px-4">
              <div className="flex items-center gap-3 w-full max-w-[340px]">
                {launchStatus === 'DOWNLOADING' ? (
                  // Downloading Green Button
                  <button
                    onClick={handleLaunch}
                    className="flex-1 h-[58px] bg-[#259457] hover:bg-[#2fa865] active:scale-[0.98] text-white font-extrabold rounded-xl transition-all duration-300 shadow-[0_8px_30px_rgba(37,148,87,0.25)] flex flex-col items-center justify-center gap-0.5"
                  >
                    <span className="font-black text-[13px] tracking-widest uppercase">{t('home.downloading')}</span>
                    <div className="flex items-center gap-1.5 text-[9px] text-white/80 font-bold">
                      <span>Fabric {settings.selectedSubVersion || '1.21.0'}</span>
                      <span className="text-white/40">|</span>
                      <Pause className="w-2.5 h-2.5 fill-current" />
                    </div>
                  </button>
                ) : (
                  // Large Green Launch Game Button matching Screenshot
                  <button
                    onClick={handleLaunch}
                    disabled={launchStatus === 'CHECKING' || launchStatus === 'LAUNCHING'}
                    className="flex-1 h-[58px] bg-[#259457] hover:bg-[#2fa865] active:scale-[0.98] disabled:opacity-50 text-white rounded-xl transition-all duration-300 shadow-[0_8px_30px_rgba(37,148,87,0.3)] flex items-center justify-between px-6 cursor-pointer"
                  >
                    <div className="flex flex-col items-start text-left">
                      <span className="font-black text-sm tracking-widest uppercase">{t('home.launch')}</span>
                      <span className="text-[9px] text-white/80 font-bold uppercase tracking-wider mt-0.5">
                        MarinMC {settings.selectedSubVersion || '1.21.3'}
                      </span>
                    </div>
                    <div className="w-5 h-5 rounded bg-black/20 hover:bg-black/30 flex items-center justify-center transition-colors">
                      <ChevronDown className="w-3.5 h-3.5 text-white/80 rotate-180" />
                    </div>
                  </button>
                )}

                {/* Settings cog wheel next to it */}
                <button
                  onClick={() => setProfileSettingsOpen(true)}
                  className="w-[58px] h-[58px] bg-white/5 hover:bg-white/10 active:scale-[0.96] border border-white/[0.06] rounded-xl flex items-center justify-center transition-all duration-200"
                  title={t('home.settings')}
                >
                  <Settings className="w-5 h-5 text-white/60 hover:text-white transition-colors" />
                </button>
              </div>

              {/* Version Selector Link under Button */}
              <button
                onClick={() => navigate('/versions')}
                className="mt-3 text-[9px] font-black text-[#52525B] hover:text-[#A1A1AA] uppercase tracking-widest transition-colors flex items-center gap-1"
              >
                <span>{t('home.changeVersion')}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#52525B]" />
              </button>

              {/* Progress bar inside card if downloading */}
              {launchStatus === 'DOWNLOADING' && (() => {
                const details = currentFileDownloading ? currentFileDownloading.match(/(.+?)\s*\((\d+)\/(\d+)\)/) : null;
                const fileType = details ? details[1].trim().toUpperCase() : 'GEREKSİNİMLER';
                const currentFile = details ? parseInt(details[2], 10) : 0;
                const totalFiles = details ? parseInt(details[3], 10) : 100;
                
                return (
                  <div className="w-full max-w-[340px] mt-3 space-y-1.5 animate-[fadeIn_0.2s_ease-out]">
                    <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden border border-white/[0.02] shadow-inner">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] text-[#A1A1AA] font-bold uppercase tracking-wide">
                      <span className="truncate max-w-[190px] text-emerald-400">
                        {fileType}: {currentFile > 0 ? `${currentFile} / ${totalFiles}` : 'KONTROL EDİLİYOR'}
                      </span>
                      <span className="text-white/40">%{progress} TAMAM</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right side: Floating Voxel Rocket */}
            <div className="hidden md:block w-36 h-36 relative select-none pointer-events-none z-10 shrink-0">
              <img
                src={rocketImg}
                alt="Rocket"
                className="w-full h-full object-contain animate-float-delayed"
              />
            </div>
          </div>

          {/* Sunucu Listesi Yatay Şeridi (Server List Horizontal Bar) */}
          <div className="space-y-2">
            <span className="text-[9.5px] font-black text-[#52525B] uppercase tracking-widest block">Önerilen Sunucular</span>
            <div className="flex flex-wrap gap-3 items-center bg-[#09070a] border border-white/[0.04] p-3 rounded-2xl">
              {homeServers.map((srv, idx) => {
                const getSrvLetter = (name: string) => name ? name.charAt(0).toUpperCase() : 'S';
                const srvColors = [
                  'text-[#34D399] bg-[#34D399]/10 border-[#34D399]/20 hover:border-[#34D399]/50 hover:shadow-[0_0_12px_rgba(52,211,83,0.2)]',
                  'text-[#60A5FA] bg-[#60A5FA]/10 border-[#60A5FA]/20 hover:border-[#60A5FA]/50 hover:shadow-[0_0_12px_rgba(96,165,250,0.2)]',
                  'text-[#FBBF24] bg-[#FBBF24]/10 border-[#FBBF24]/20 hover:border-[#FBBF24]/50 hover:shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                ];
                const srvColor = srvColors[idx % srvColors.length];
                
                return (
                  <div
                    key={srv.id}
                    onClick={() => navigate(`/versions?launch=true`)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs cursor-pointer transition-all duration-300 border relative group ${srvColor}`}
                  >
                    <span>{getSrvLetter(srv.name)}</span>
                    
                    {/* Server Info Tooltip */}
                    <div className="absolute bottom-[48px] left-1/2 -translate-x-1/2 bg-[#060305] border border-white/[0.08] text-[#d2d2d2] p-2.5 rounded-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-2xl flex flex-col items-center">
                      <span className="text-[10px] font-black uppercase text-white leading-none mb-1">{srv.name}</span>
                      <span className="text-[8px] font-bold text-[#A1A1AA] leading-none mb-1.5">{srv.description}</span>
                      <div className="flex items-center gap-1 leading-none text-[8.5px] font-extrabold text-emerald-400">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{srv.playerCount || 0} / {srv.maxPlayers || 1000} Oyuncu</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* News Section */}
          <div className="space-y-2">
            <span className="text-[9px] font-bold text-[#52525B] uppercase tracking-widest block">{t('home.newsFeed')}</span>
            
            {/* If Offline */}
            {!isOnline ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="h-28 bg-[#060305] border border-white/[0.04] rounded-xl flex items-center justify-center flex-col text-center p-4 relative group">
                  <WifiOff className="w-6 h-6 text-[#52525B] mb-1.5" />
                  <span className="text-[10px] font-bold text-[#52525B]">{t('home.newsServiceError')}</span>
                  <button className="absolute bottom-2.5 right-2.5 p-1 rounded bg-white/5 text-white/40 hover:text-white transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="h-28 bg-[#060305] border border-white/[0.04] rounded-xl flex items-center justify-center flex-col text-center p-4 relative group">
                  <WifiOff className="w-6 h-6 text-[#52525B] mb-1.5" />
                  <span className="text-[10px] font-bold text-[#52525B]">{t('home.newsServiceError')}</span>
                  <button className="absolute bottom-2.5 right-2.5 p-1 rounded bg-white/5 text-white/40 hover:text-white transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* If Online: Show Beautiful Mock News Cards Matching Screenshots */
              <div className="grid grid-cols-2 gap-4">
                {/* Changelog News Card */}
                <div className="relative rounded-xl overflow-hidden h-28 border border-white/[0.04] bg-[#111111]/45 flex p-3.5 justify-between items-center group cursor-pointer">
                  <div className="flex flex-col justify-between h-full z-10 max-w-[140px]">
                    <div>
                      <span className="text-[8px] text-[#2D7DD2] font-black uppercase tracking-widest">MARINMC CLIENT</span>
                      <h3 className="text-[11px] font-black text-white leading-tight uppercase mt-1 tracking-wide">{t('home.changelog')}</h3>
                      <p className="text-[8.5px] text-[#A1A1AA] mt-1 leading-normal font-semibold">{t('home.changelogDesc')}</p>
                    </div>
                    <button className="bg-white text-black font-extrabold text-[8px] uppercase tracking-wider py-1 px-3.5 rounded-lg w-max mt-2">
                      {t('home.readMore')}
                    </button>
                  </div>
                  <div className="w-16 h-16 flex items-center justify-center text-white/10 group-hover:scale-105 transition-transform duration-300">
                    <MarinLogo glyphOnly size={56} className="opacity-10" />
                  </div>
                </div>

                {/* 26.1 Version News Card */}
                <div className="relative rounded-xl overflow-hidden h-28 border border-white/[0.04] bg-gradient-to-br from-[#1b2b1a]/85 to-[#0b0c0a]/95 flex p-3.5 justify-between items-center group cursor-pointer">
                  <div className="flex flex-col justify-between h-full z-10">
                    <div>
                      <span className="text-[8px] text-[#259457] font-black uppercase tracking-widest">{t('home.newVersionAlert')}</span>
                      <h3 className="text-xl font-black text-[#259457] leading-none mt-1">26.1</h3>
                      <p className="text-[9px] text-[#A1A1AA] mt-1 font-semibold">{t('home.readyIn', { client: 'MarinMC' })}</p>
                    </div>
                  </div>
                  <div className="text-[34px] font-black text-[#259457]/15 select-none absolute right-4 group-hover:scale-105 transition-transform duration-300">
                    26.1
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Additional News Cards */}
          {/* Additional News Cards */}
          <div className="grid grid-cols-3 gap-3">
            {newsData.length === 3 && !newsError ? (
              newsData.map((item, idx) => {
                const colors = [
                  { from: 'from-[#1a1535]/80', to: 'to-[#0b0a0d]/95', tagColor: 'text-[#8B5CF6]', tag: t('home.community') },
                  { from: 'from-[#0a1f15]/80', to: 'to-[#0b0c0a]/95', tagColor: 'text-[#259457]', tag: t('home.serverStatus') },
                  { from: 'from-[#111111]/80', to: 'to-[#0b0c0a]/95', tagColor: 'text-[#F59E0B]', tag: t('home.tip') }
                ];
                const c = colors[idx];
                return (
                  <div
                    key={idx}
                    className={`relative rounded-2xl overflow-hidden h-28 border border-white/[0.04] hover:border-white/20 bg-[#111111]/40 flex p-4 items-center group cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]`}
                  >
                    {/* Blurred background image that unblurs and scales up on hover */}
                    <div
                      className="absolute inset-0 bg-cover bg-center blur-[12px] group-hover:blur-0 scale-110 group-hover:scale-100 opacity-20 group-hover:opacity-40 transition-all duration-500 pointer-events-none"
                      style={{ backgroundImage: `url(${item.imageUrl || 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=400'})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
                    
                    {/* Left glowing neon indicator stripe */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[4px] rounded-r-md transition-all duration-300 opacity-50 group-hover:opacity-100 ${
                      idx === 0 ? 'bg-[#8B5CF6] group-hover:shadow-[0_0_12px_#8B5CF6]' : idx === 1 ? 'bg-[#259457] group-hover:shadow-[0_0_12px_#259457]' : 'bg-[#F59E0B] group-hover:shadow-[0_0_12px_#F59E0B]'
                    }`} />
                    
                    <div className="flex flex-col z-10 pr-2 pl-2">
                      <span className={`text-[8px] ${c.tagColor} font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] w-fit mb-1.5`}>
                        {c.tag}
                      </span>
                      <h3 className="text-xs font-black text-white leading-snug uppercase line-clamp-2 transition-colors group-hover:text-white">
                        {item.title}
                      </h3>
                      <p className="text-[9px] text-[#A1A1AA] mt-1.5 font-bold flex items-center gap-1 font-mono">
                        <span>{item.date}</span>
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <>
                {/* Community Event */}
                <div className="relative rounded-2xl overflow-hidden h-28 border border-white/[0.04] hover:border-white/20 bg-gradient-to-br from-[#1a1535]/80 to-[#0b0a0d]/95 flex p-4 items-center group cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]">
                  <div
                    className="absolute inset-0 bg-cover bg-center blur-[12px] group-hover:blur-0 scale-110 group-hover:scale-100 opacity-20 group-hover:opacity-40 transition-all duration-500 pointer-events-none"
                    style={{ backgroundImage: `url(https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=400)` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
                  <div className="absolute left-0 top-0 bottom-0 w-[4px] rounded-r-md bg-[#8B5CF6] group-hover:shadow-[0_0_12px_#8B5CF6] transition-all opacity-50 group-hover:opacity-100" />
                  <div className="flex flex-col z-10 pl-2">
                    <span className="text-[8px] text-[#8B5CF6] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] w-fit mb-1.5">{t('home.community')}</span>
                    <h3 className="text-xs font-black text-white leading-snug uppercase">{t('home.survivalEvent')}</h3>
                    <p className="text-[9px] text-[#A1A1AA] mt-1.5 font-medium">{t('home.eventDesc')}</p>
                  </div>
                  <div className="text-[28px] font-black text-[#8B5CF6]/10 select-none absolute right-4 group-hover:scale-110 transition-transform">🎮</div>
                </div>

                {/* Server Status */}
                <div className="relative rounded-2xl overflow-hidden h-28 border border-white/[0.04] hover:border-white/20 bg-gradient-to-br from-[#0a1f15]/80 to-[#0b0c0a]/95 flex p-4 items-center group cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(37,148,87,0.15)]">
                  <div
                    className="absolute inset-0 bg-cover bg-center blur-[12px] group-hover:blur-0 scale-110 group-hover:scale-100 opacity-20 group-hover:opacity-40 transition-all duration-500 pointer-events-none"
                    style={{ backgroundImage: `url(https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400)` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
                  <div className="absolute left-0 top-0 bottom-0 w-[4px] rounded-r-md bg-[#259457] group-hover:shadow-[0_0_12px_#259457] transition-all opacity-50 group-hover:opacity-100" />
                  <div className="flex flex-col z-10 pl-2">
                    <span className="text-[8px] text-[#259457] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] w-fit mb-1.5">{t('home.serverStatus')}</span>
                    <h3 className="text-xs font-black text-[#259457] leading-snug uppercase">{t('home.allOnline')}</h3>
                    <p className="text-[9px] text-[#A1A1AA] mt-1.5 font-medium">{t('home.activePlayers', { count: onlineCountVal })}</p>
                  </div>
                  <div className="text-[28px] font-black text-[#259457]/10 select-none absolute right-4 group-hover:scale-110 transition-transform">●</div>
                </div>

                {/* Tips */}
                <div className="relative rounded-2xl overflow-hidden h-28 border border-white/[0.04] hover:border-white/20 bg-[#111111]/45 flex p-4 items-center group cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                  <div
                    className="absolute inset-0 bg-cover bg-center blur-[12px] group-hover:blur-0 scale-110 group-hover:scale-100 opacity-20 group-hover:opacity-40 transition-all duration-500 pointer-events-none"
                    style={{ backgroundImage: `url(https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400)` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
                  <div className="absolute left-0 top-0 bottom-0 w-[4px] rounded-r-md bg-[#F59E0B] group-hover:shadow-[0_0_12px_#F59E0B] transition-all opacity-50 group-hover:opacity-100" />
                  <div className="flex flex-col z-10 pl-2">
                    <span className="text-[8px] text-[#F59E0B] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] w-fit mb-1.5">{t('home.tip')}</span>
                    <h3 className="text-xs font-black text-white leading-snug uppercase">{t('home.performance')}</h3>
                    <p className="text-[9px] text-[#A1A1AA] mt-1.5 font-medium">{t('home.fpsTip')}</p>
                  </div>
                  <div className="text-[28px] font-black text-[#F59E0B]/10 select-none absolute right-4 group-hover:scale-110 transition-transform">⚡</div>
                </div>
              </>
            )}
          </div>

          {/* === NEW: Quick Access Shortcuts === */}
          <div className="space-y-2">
            <span className="text-[9px] font-bold text-[#52525B] uppercase tracking-widest block">Hızlı Erişim</span>
            <div className="flex gap-2">
              {[
                { icon: Package, label: 'Modlar', path: '/mods', color: '#8B5CF6', bg: '#8B5CF6' },
                { icon: ShoppingBag, label: 'Mağaza', path: '/store', color: '#F59E0B', bg: '#F59E0B' },
                { icon: Image, label: 'Galeri', path: '/gallery', color: '#2D7DD2', bg: '#2D7DD2' },
                { icon: User, label: 'Profil', path: '/profile', color: '#06B6D4', bg: '#06B6D4' },
                { icon: Settings, label: 'Ayarlar', path: '/settings', color: '#A1A1AA', bg: '#A1A1AA' },
                { icon: Sparkles, label: 'Kozmetik', path: '/cosmetics', color: '#EC4899', bg: '#EC4899' },
              ].map((item) => (
                <motion.button
                  key={item.label}
                  whileHover={{ y: -3, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(item.path)}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-opacity-30 transition-all duration-300 group"
                  style={{ ['--accent' as string]: item.color }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:shadow-lg"
                    style={{
                      backgroundColor: `${item.bg}10`,
                      borderColor: `${item.bg}20`,
                      borderWidth: '1px',
                    }}
                  >
                    <item.icon className="w-3.5 h-3.5 transition-colors" style={{ color: item.color }} />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-wider text-[#52525B] group-hover:text-white/70 transition-colors">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* === NEW: Weekly Activity Chart + Recent Activity === */}
          <div className="grid grid-cols-2 gap-4">
            {/* Weekly Activity Mini Chart */}
            <div className="rounded-xl p-4 bg-white/[0.02] border border-white/[0.04] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-[#2D7DD2]" />
                  <span className="text-[9px] font-black text-[#52525B] uppercase tracking-widest">Haftalık Aktivite</span>
                </div>
                <span className="text-[7.5px] font-bold text-[#2D7DD2]/60">Bu Hafta</span>
              </div>
              <div className="flex items-end gap-1.5 h-16">
                {weeklyData.map((d, i) => {
                  const maxH = Math.max(...weeklyData.map(x => x.hours), 1);
                  const height = d.hours > 0 ? Math.max((d.hours / maxH) * 100, 12) : 6;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                        className={`w-full rounded-sm transition-colors ${
                          d.isToday
                            ? 'bg-[#2D7DD2] shadow-[0_0_8px_rgba(45,125,210,0.3)]'
                            : d.hours > 0 ? 'bg-white/10' : 'bg-white/[0.03]'
                        }`}
                      />
                      <span className={`text-[7px] font-bold uppercase ${
                        d.isToday ? 'text-[#2D7DD2]' : 'text-[#52525B]'
                      }`}>{d.day}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.03]">
                <span className="text-[8px] font-bold text-[#52525B]">Toplam: <span className="text-white/60">{weeklyData.reduce((a, b) => a + b.hours, 0)} saat</span></span>
                <TrendingUp className="w-3 h-3 text-[#259457]" />
              </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="rounded-xl p-4 bg-white/[0.02] border border-white/[0.04] space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span className="text-[9px] font-black text-[#52525B] uppercase tracking-widest">Son Aktiviteler</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { icon: Gamepad2, text: 'Oyun oturumu başlatıldı', detail: lastSessionServer !== '-' ? lastSessionServer : 'MarinMC', time: lastSessionTimeAgoText || 'Bugün', color: '#259457' },
                  { icon: Users, text: `${social.friends.length} arkadaş listenizde`, detail: `${social.friends.filter(f => f.status !== 'offline').length} çevrimiçi`, time: 'Şimdi', color: '#8B5CF6' },
                  { icon: Globe, text: `${homeServers.length} sunucu aktif`, detail: `${onlineCountVal} toplam oyuncu`, time: 'Canlı', color: '#2D7DD2' },
                  { icon: Zap, text: 'Launcher güncellendi', detail: 'v1.0.8 yüklü', time: 'Güncel', color: '#F59E0B' },
                ].map((activity, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                    className="flex items-center gap-2.5 group"
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${activity.color}15`, border: `1px solid ${activity.color}25` }}
                    >
                      <activity.icon className="w-2.5 h-2.5" style={{ color: activity.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-white/70 truncate">{activity.text}</p>
                      <p className="text-[7.5px] text-[#52525B] font-semibold truncate">{activity.detail}</p>
                    </div>
                    <span className="text-[7px] font-bold text-[#52525B] uppercase tracking-wider shrink-0">{activity.time}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Redesigned Collapsible right sidebar panel for friends list */}
      <div
        className={`bg-[#0a080a] border-l border-white/[0.04] flex flex-col transition-all duration-300 relative select-none shrink-0 ${
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
                                  (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/32';
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[11px] font-bold text-white leading-none mb-1">{f.username}</h4>
                                <p className="text-[8px] text-[#A1A1AA] leading-none font-semibold uppercase">{f.lastSeen || t('social.offlineDays', { count: 3 })}</p>
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
                                    (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/32';
                                  }}
                                />
                                <span className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-[#0a080a] ${
                                  getStatusColor(f.username, f.status)
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <h4 className="text-[11px] font-bold text-white leading-none">{f.username}</h4>
                                  {f.username === '172px' && <Trophy className="w-2.5 h-2.5 text-[#F59E0B]" />}
                                  {f.username === 'cuvsa' && <CheckCircle2 className="w-2.5 h-2.5 text-[#06B6D4]" />}
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
                                {(f.username === '172px' || f.username === '3wafyy' || f.username === 'cuvsa') && (
                                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#ef4444] rounded-full" />
                                )}
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
                                    (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/32';
                                  }}
                                />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[11px] font-bold text-white leading-none mb-1">{f.username}</h4>
                                <p className="text-[8px] text-[#A1A1AA] leading-none font-semibold uppercase">{f.lastSeen}</p>
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
                            (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/20';
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
        className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#0a080a] hover:bg-[#1C2028] border-l border-y border-white/[0.04] text-[#52525B] hover:text-white px-0.5 py-4 rounded-l-md z-30 transition-all select-none"
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
              className="bg-[#060305] border border-white/[0.08] w-[320px] rounded-2xl p-5 shadow-2xl"
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
