import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.ts';
import { useSettingsStore } from '../stores/settingsStore.ts';
import { useSocialStore } from '../stores/socialStore.ts';
import { useAppStore } from '../stores/appStore.ts';
import { sanitizeUrl, sanitizeParam } from '../lib/security.ts';
import VersionModal from '../components/VersionModal.tsx';
import MarinLogo from '../components/MarinLogo.tsx';
import {
  ChevronDown, User, LogOut, Search,
  MessageSquare, UserPlus, X, AlertTriangle,
  Trophy, CheckCircle2, WifiOff, ExternalLink, RefreshCw,
  Pause
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import heroBg from '../../assets/home-hero-bg.png';

export default function HomePage() {
  const { t } = useTranslation();
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);
  const settings = useSettingsStore();
  const social = useSocialStore();
  const isOnline = useAppStore((state) => state.isOnline);
  const navigate = useNavigate();
  const location = useLocation();

  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

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
  const [friendsTab, setFriendsTab] = useState<'friends' | 'requests'>('friends');
  const [friendsSearch, setFriendsSearch] = useState('');
  const [friendsPanelOpen, setFriendsPanelOpen] = useState(true);

  // Add Friend modal
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const [addFriendLoading, setAddFriendLoading] = useState(false);

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
          version: settings.selectedVersion || '1.21',
          serverId: 'towny',
          gameDir: settings.launcherDir,
          javaPath: settings.javaPath,
          smartJvmOpt: settings.smartJvmOpt,
          discordRpcEnabled: settings.discordRpcEnabled
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
    if (!newFriendUsername.trim()) return;
    setAddFriendLoading(true);
    const success = await social.addFriend(newFriendUsername.trim());
    setAddFriendLoading(false);
    setNewFriendUsername('');
    setAddFriendOpen(false);
    if (success) {
      alert(t('home.requestSent'));
    } else {
      alert(t('home.playerNotFound'));
    }
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
          {/* Welcome message header section */}
          <div className="flex justify-between items-start">
            <div>
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 hover:text-white text-white text-base font-extrabold tracking-wide uppercase transition-all"
                >
                  <span>{t('home.greeting')}, {session?.name || 'dbrn'}</span>
                  <ChevronDown className={`w-4 h-4 text-white/50 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {profileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute left-0 mt-2 bg-[#060305] border border-white/[0.08] rounded-xl shadow-2xl w-44 py-1.5 z-50 text-[10px] font-black"
                    >
                      <button
                        onClick={() => { setProfileDropdownOpen(false); }}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-[#A1A1AA] hover:bg-white/5 hover:text-white text-left"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>{t('home.viewProfile')}</span>
                      </button>
                      <button
                        onClick={async () => {
                          setProfileDropdownOpen(false);
                          await logout();
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-red-400 hover:bg-red-500/10 text-left border-t border-white/[0.05]"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{t('servers.logout')}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <p className="text-[10px] text-[#52525B] font-semibold mt-1">
                {t('home.lastPlayed')}: <span className="text-[#2D7DD2]">{isOnline ? 'Donut SMP' : 'Hypixel'}</span> - {isOnline ? t('home.hoursAgo', { count: 7 }) : t('home.hoursAgo', { count: 16 })} · {t('home.totalPlaytime')}: <span className="text-white/80">{isOnline ? `1,662${t('profile.hour')}` : `1,364${t('profile.hour')}`}</span>
              </p>
            </div>
          </div>

          {/* Launch Section & Panels Row */}
          <div className="flex flex-wrap gap-5 items-start">
            
            {/* Launch Card */}
            <div className={`rounded-2xl p-5 bg-[#060305] border border-white/[0.05] shadow-[0_20px_50px_rgba(0,0,0,0.65)] flex flex-col items-center justify-center shrink-0 w-[270px] relative overflow-hidden transition-all duration-300 ${
              launchStatus === 'DOWNLOADING' ? 'h-[190px] pt-4 pb-3' : 'h-[150px]'
            }`}>
              {/* Blur Overlay Graphic */}
              <div className="absolute -top-12 -left-12 w-28 h-28 bg-[#2D7DD2]/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-[#2D7DD2]/15 rounded-full blur-2xl pointer-events-none" />

              {/* Main Button */}
              {launchStatus === 'DOWNLOADING' ? (
                // Downloading Green Button
                <button
                  onClick={handleLaunch}
                  className="w-[230px] h-[52px] bg-[#259457] hover:bg-[#2fa865] active:scale-[0.98] text-white font-extrabold text-xs tracking-widest rounded-xl transition-all duration-300 shadow-[0_8px_25px_rgba(37,148,87,0.25)] flex flex-col items-center justify-center gap-0.5"
                >
                  <span className="font-black text-[13px]">{t('home.downloading')}</span>
                  <div className="flex items-center gap-1.5 text-[9px] text-white/80 font-bold">
                    <span>Fabric {settings.selectedSubVersion || '1.21.0'}</span>
                    <span className="text-white/40">|</span>
                    <Pause className="w-2.5 h-2.5 fill-current" />
                  </div>
                </button>
              ) : (
                // Launch Teal Button matching the visual
                <button
                  onClick={handleLaunch}
                  disabled={launchStatus === 'CHECKING' || launchStatus === 'LAUNCHING'}
                  className="w-[230px] h-[52px] bg-[#208390] hover:bg-[#2aa4b5] active:scale-[0.98] disabled:opacity-50 text-white font-extrabold text-xs tracking-widest rounded-xl transition-all duration-300 shadow-[0_8px_25px_rgba(32,131,144,0.25)] flex flex-col items-center justify-center gap-0.5"
                >
                  <span className="font-black text-[13px]">{t('home.launch')}</span>
                  <span className="text-[9px] text-white/80 font-bold">Fabric {settings.selectedSubVersion || '1.21.3'}</span>
                </button>
              )}

              {/* Dropdown under Button */}
              <button
                onClick={() => navigate('/versions')}
                className="mt-3.5 text-[9px] font-bold text-[#A1A1AA] hover:text-white uppercase tracking-wider transition-colors flex items-center gap-1"
              >
                <span>{t('home.changeVersion')}</span>
                <ChevronDown className="w-3 h-3 text-[#A1A1AA]" />
              </button>

              {/* Progress bar inside card if downloading */}
              {launchStatus === 'DOWNLOADING' && (
                <div className="w-[230px] mt-3 space-y-1">
                  <div className="w-full bg-white/[0.04] h-1 rounded-full overflow-hidden border border-white/[0.01]">
                    <div
                      className="bg-[#259457] h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] text-[#52525B] font-bold uppercase tracking-wide">
                    <span className="truncate max-w-[140px]">{currentFileDownloading || t('details.checking')}</span>
                    <span>{(progress * 1.125).toFixed(1)} MB / 112.5 MB</span>
                  </div>
                </div>
              )}
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
                    <MarinLogo glyphOnly size={56} className="text-white/10" />
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
                    className={`relative rounded-xl overflow-hidden h-24 border border-white/[0.04] bg-[#111111]/45 flex p-3 items-center group cursor-pointer`}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"
                      style={{ backgroundImage: `url(${item.imageUrl})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/90 pointer-events-none" />
                    <div className="flex flex-col z-10 pr-2">
                      <span className={`text-[7px] ${c.tagColor} font-black uppercase tracking-widest`}>{c.tag}</span>
                      <h3 className="text-[10px] font-black text-white leading-tight uppercase mt-0.5 line-clamp-1">{item.title}</h3>
                      <p className="text-[8px] text-[#A1A1AA] mt-0.5 font-medium">{item.date}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <>
                {/* Community Event */}
                <div className="relative rounded-xl overflow-hidden h-24 border border-white/[0.04] bg-gradient-to-br from-[#1a1535]/80 to-[#0b0a0d]/95 flex p-3 items-center group cursor-pointer">
                  <div className="flex flex-col z-10">
                    <span className="text-[7px] text-[#8B5CF6] font-black uppercase tracking-widest">{t('home.community')} (Offline)</span>
                    <h3 className="text-[10px] font-black text-white leading-tight uppercase mt-0.5">{t('home.survivalEvent')}</h3>
                    <p className="text-[8px] text-[#A1A1AA] mt-0.5 font-medium">{t('home.eventDesc')}</p>
                  </div>
                  <div className="text-[22px] font-black text-[#8B5CF6]/10 select-none absolute right-3">🎮</div>
                </div>

                {/* Server Status */}
                <div className="relative rounded-xl overflow-hidden h-24 border border-white/[0.04] bg-gradient-to-br from-[#0a1f15]/80 to-[#0b0c0a]/95 flex p-3 items-center group cursor-pointer">
                  <div className="flex flex-col z-10">
                    <span className="text-[7px] text-[#259457] font-black uppercase tracking-widest">{t('home.serverStatus')} (Offline)</span>
                    <h3 className="text-[10px] font-black text-[#259457] leading-tight uppercase mt-0.5">{t('home.allOnline')}</h3>
                    <p className="text-[8px] text-[#A1A1AA] mt-0.5 font-medium">{t('home.activePlayers', { count: 247 })}</p>
                  </div>
                  <div className="text-[22px] font-black text-[#259457]/10 select-none absolute right-3">●</div>
                </div>

                {/* Tips */}
                <div className="relative rounded-xl overflow-hidden h-24 border border-white/[0.04] bg-[#111111]/45 flex p-3 items-center group cursor-pointer">
                  <div className="flex flex-col z-10">
                    <span className="text-[7px] text-[#F59E0B] font-black uppercase tracking-widest">{t('home.tip')} (Offline)</span>
                    <h3 className="text-[10px] font-black text-white leading-tight uppercase mt-0.5">{t('home.performance')}</h3>
                    <p className="text-[8px] text-[#A1A1AA] mt-0.5 font-medium">{t('home.fpsTip')}</p>
                  </div>
                  <div className="text-[22px] font-black text-[#F59E0B]/10 select-none absolute right-3">⚡</div>
                </div>
              </>
            )}
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
              <div className="flex gap-4">
                <button
                  onClick={() => setFriendsTab('friends')}
                  className={`text-[11px] font-black uppercase tracking-wider relative transition-colors ${
                    friendsTab === 'friends' ? 'text-white' : 'text-[#52525B] hover:text-[#A1A1AA]'
                  }`}
                >
                  {t('home.friendsTab')}
                </button>
                <button
                  onClick={() => setFriendsTab('requests')}
                  className={`text-[11px] font-black uppercase tracking-wider relative transition-colors ${
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
                  <div className="flex-1 flex flex-col">
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
                        {t('home.offlineCount', { count: 42 })}
                      </span>
                      {offlineFriends.map((f) => (
                        <div key={f.username} className="flex items-center gap-3 p-1 rounded-lg opacity-40">
                          <img
                            src={sanitizeUrl(`https://minotar.net/avatar/${sanitizeParam(f.username)}/32`)}
                            alt={f.username}
                            className="w-7 h-7 rounded-lg grayscale border border-white/5"
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
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
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
                          <div className="relative">
                            <button className="p-1 rounded bg-white/5 border border-white/5 text-[#52525B] hover:text-white transition-colors">
                              <MessageSquare className="w-3 h-3" />
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
                        {t('home.offlineCount', { count: 34 })}
                      </span>
                      {offlineFriends.map((f) => (
                        <div key={f.username} className="flex items-center gap-3 p-1 rounded-lg opacity-40 hover:opacity-100 group transition-all">
                          <img
                            src={sanitizeUrl(`https://minotar.net/avatar/${sanitizeParam(f.username)}/32`)}
                            alt={f.username}
                            className="w-7 h-7 rounded-lg grayscale border border-white/5"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[11px] font-bold text-white leading-none mb-1">{f.username}</h4>
                            <p className="text-[8px] text-[#A1A1AA] leading-none font-semibold uppercase">{f.lastSeen}</p>
                          </div>
                          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1 rounded bg-white/5 border border-white/5 text-[#52525B] hover:text-white transition-colors">
                              <MessageSquare className="w-3 h-3" />
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
              </>
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
    </div>
  );
}
