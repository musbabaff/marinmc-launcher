import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore.ts';
import { useSettingsStore } from '../stores/settingsStore.ts';
import { useSocialStore } from '../stores/socialStore.ts';
import { useAppStore } from '../stores/appStore.ts';
import { sanitizeUrl, sanitizeParam } from '../lib/security.ts';
import VersionModal from '../components/VersionModal.tsx';
import {
  ChevronDown, User, LogOut, Search,
  MessageSquare, UserPlus, X, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

export default function HomePage() {
  const { t } = useTranslation();
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);
  const settings = useSettingsStore();
  const social = useSocialStore();
  const isOnline = useAppStore((state) => state.isOnline);

  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  
  // Launch states
  const [launchStatus, setLaunchStatus] = useState<'IDLE' | 'CHECKING' | 'DOWNLOADING' | 'LAUNCHING' | 'RUNNING' | 'ERROR'>('IDLE');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentFileDownloading, setCurrentFileDownloading] = useState('');

  // News states
  const [news, setNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

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

  // Fetch news
  useEffect(() => {
    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const response = await axios.get('https://api.marinmc.com/news?limit=4');
        setNews(response.data);
      } catch (err) {
        // Mock fallback
        setNews([
          { id: 1, title: 'MarinMC Towny Sezon V Başladı!', date: '04.06.2026', thumbnail: 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=400&auto=format&fit=crop&q=60' },
          { id: 2, title: 'Yeni Sürüm Optimizasyon Yama Raporu', date: '02.06.2026', thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&auto=format&fit=crop&q=60' },
          { id: 3, title: 'Kozmetik Gardırobu Marketi Aktif Edildi', date: '29.05.2026', thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&auto=format&fit=crop&q=60' },
          { id: 4, title: 'Haftalık Topluluk İnşa Etkinliği Detayları', date: '25.05.2026', thumbnail: 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=400&auto=format&fit=crop&q=60' }
        ]);
      } finally {
        setNewsLoading(false);
      }
    };
    fetchNews();
  }, []);

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
          setErrorMessage('Java bulunamadı! Lütfen Java 21 yükleyin: https://adoptium.net');
          return;
        }

        // Step 2: Launch
        const launchOptions = {
          ram: settings.ram,
          jvmArgs: settings.jvmArgs,
          username: session?.name || 'Player',
          accessToken: session?.token,
          version: settings.selectedVersion || '1.21',
          serverId: 'towny', // Default auto-connects to towny
          gameDir: settings.launcherDir,
          javaPath: settings.javaPath
        };

        const result = await window.electronAPI.launchGame(launchOptions);
        if (!result.success) {
          setLaunchStatus('ERROR');
          setErrorMessage(result.error || 'Başlatma hatası oluştu.');
        } else {
          // Add to recent played
          settings.addRecentProfile({
            id: 'towny',
            name: 'MarinMC Towny',
            version: settings.selectedVersion,
            subVersion: settings.selectedSubVersion,
            timePlayed: 'Just now',
            artworkUrl: 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=400&auto=format&fit=crop&q=60'
          });
        }
      }
    } catch (err: any) {
      setLaunchStatus('ERROR');
      setErrorMessage(err.message || 'Hata oluştu.');
    }
  };

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendUsername.trim()) return;
    setAddFriendLoading(true);
    await social.addFriend(newFriendUsername.trim());
    setAddFriendLoading(false);
    setNewFriendUsername('');
    setAddFriendOpen(false);
    alert('Arkadaşlık isteği gönderildi!');
  };

  // Filter friends list
  const onlineFriends = social.friends.filter(f => f.status !== 'offline' && f.username.toLowerCase().includes(friendsSearch.toLowerCase()));
  const offlineFriends = social.friends.filter(f => f.status === 'offline' && f.username.toLowerCase().includes(friendsSearch.toLowerCase()));

  return (
    <div className="flex-1 flex overflow-hidden h-full relative select-none">
      {/* Left Main Dashboard */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto no-drag custom-scrollbar space-y-5">
        
        {/* Welcome message header section */}
        <div className="flex justify-between items-start">
          <div>
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-1.5 hover:text-white text-white text-base font-black tracking-wide uppercase transition-all"
              >
                <span>{t('home.greeting')}, 🎮 {session?.name || 'Player'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {profileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute left-0 mt-1 bg-[#141414] border border-[#2A2A2A] rounded-xl shadow-xl w-44 py-1 z-50 text-[11px] font-bold"
                  >
                    <button
                      onClick={() => { setProfileDropdownOpen(false); }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-[#A1A1AA] hover:bg-[#1A1A1A] hover:text-white text-left"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Profili Görüntüle</span>
                    </button>
                    <button
                      onClick={async () => {
                        setProfileDropdownOpen(false);
                        await logout();
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-red-400 hover:bg-red-500/10 text-left border-t border-[#1E1E1E]"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t('servers.logout')}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className="text-[10px] text-[#A1A1AA] font-bold mt-1">
              {t('home.lastPlayed')}: <strong className="text-white/80">MarinMC Towny</strong> · {t('home.totalPlaytime')}: <strong className="text-white/80">124s</strong>
            </p>
          </div>

          {/* Quick connections status badge */}
          <div className="flex gap-2">
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
              isOnline
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              {isOnline ? 'Bulut Senkronize' : 'Çevrimdışı Mod'}
            </span>
          </div>
        </div>

        {/* Dynamic Launch Card */}
        <div className="space-y-2 select-none">
          <div className="relative rounded-2xl overflow-hidden p-6 bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] flex flex-col justify-between h-44 shadow-glow-purple-lg">
            
            {/* Background design overlay */}
            <div className="absolute right-0 bottom-0 top-0 w-1/2 opacity-20 pointer-events-none bg-gradient-radial from-white to-transparent" />

            <div className="flex justify-between items-start z-10">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Seçilen Sürüm</span>
                <span className="text-sm font-bold text-white mt-1 bg-black/20 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 w-max">
                  Fabric 🔷 {settings.selectedSubVersion}
                </span>
              </div>

              <button
                onClick={() => setVersionModalOpen(true)}
                className="bg-black/20 hover:bg-black/40 border border-white/10 text-white font-extrabold text-[9px] uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition-all"
              >
                {t('home.changeVersion')} ▼
              </button>
            </div>

            {/* Launch CTA */}
            <div className="flex justify-between items-end z-10">
              <button
                onClick={handleLaunch}
                disabled={launchStatus === 'CHECKING' || launchStatus === 'DOWNLOADING' || launchStatus === 'LAUNCHING'}
                className="text-white hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <h1 className="text-4xl font-black uppercase tracking-wider leading-none select-none select-none">
                  {launchStatus === 'IDLE' && t('home.launch')}
                  {launchStatus === 'CHECKING' && 'KONTROL EDİLİYOR...'}
                  {launchStatus === 'DOWNLOADING' && 'İNDİRİLİYOR...'}
                  {launchStatus === 'LAUNCHING' && 'BAŞLATILIYOR...'}
                  {launchStatus === 'RUNNING' && 'DURDUR'}
                  {launchStatus === 'ERROR' && 'HATA!'}
                </h1>
              </button>

              <span className="text-[10px] font-black text-white/50 uppercase tracking-wider">
                {launchStatus === 'RUNNING' ? 'Oyun Açık' : 'Hazır'}
              </span>
            </div>
          </div>

          {/* Downloading state sub progressbar details */}
          {launchStatus === 'DOWNLOADING' && (
            <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-3 space-y-2">
              <div className="flex justify-between text-[9px] text-[#A1A1AA] font-bold">
                <span className="truncate max-w-[280px]">Dosya: {currentFileDownloading || 'Kütüphaneler indiriliyor...'}</span>
                <span>%{progress}</span>
              </div>
              <div className="w-full bg-[#1A1A1A] h-1 rounded-full overflow-hidden border border-white/[0.02]">
                <div
                  className="bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {launchStatus === 'ERROR' && errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-[10px] text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Latest profiles slider */}
        <div className="space-y-2">
          <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-widest block">{t('home.latestProfiles')}</span>
          <div className="flex gap-3 overflow-x-auto no-drag custom-scrollbar pb-1">
            {settings.recentProfiles.map((p) => (
              <div
                key={p.id}
                onClick={handleLaunch}
                className="w-48 bg-[#111111] border border-[#1E1E1E] hover:border-[#2A2A2A] rounded-xl p-3 flex flex-col justify-between h-20 cursor-pointer shrink-0 transition-all hover:bg-[#1A1A1A]"
              >
                <div>
                  <h4 className="text-xs font-bold text-white truncate leading-none mb-0.5">{p.name}</h4>
                  <p className="text-[9px] text-[#52525B] leading-none">Fabric {p.version}</p>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[9px] text-[#A1A1AA] font-semibold">{p.timePlayed}</span>
                  <span className="text-[8px] bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/20 font-bold uppercase tracking-wider px-1.5 py-0.2 rounded">
                    {p.mode || 'LOBİ'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* News Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-widest">{t('home.newsFeed')}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {newsLoading ? (
              // Skeleton cards loader
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-32 bg-[#111111] border border-[#1E1E1E] rounded-xl animate-pulse" />
              ))
            ) : (
              news.map((item) => (
                <div
                  key={item.id}
                  onClick={() => window.electronAPI && window.electronAPI.openExternal('https://marinmc.com/news')}
                  className="relative rounded-xl overflow-hidden h-32 border border-[#1E1E1E] hover:border-[#2A2A2A] cursor-pointer group transition-all"
                >
                  {item.thumbnail && (item.thumbnail.startsWith('http://') || item.thumbnail.startsWith('https://')) ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:scale-105 group-hover:opacity-50 transition-all duration-300"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex flex-col justify-end">
                    <span className="text-[9px] text-[#52525B] font-bold mb-1">{item.date}</span>
                    <h3 className="text-xs font-bold text-white leading-tight group-hover:text-[#8B5CF6] transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Partners list circles scroll */}
        <div className="space-y-2 pb-2">
          <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-widest block">{t('home.partners')}</span>
          <div className="flex gap-4 items-center overflow-x-auto pb-1 custom-scrollbar">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="w-10 h-10 rounded-full bg-[#111111] border border-[#1E1E1E] hover:border-[#8B5CF6]/50 flex items-center justify-center text-xs font-bold text-[#A1A1AA] hover:text-[#8B5CF6] transition-all cursor-pointer shrink-0"
              >
                P{idx + 1}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Collapsible right sidebar panel for friends list */}
      <div
        className={`bg-[#0D0D0D] border-l border-[#1E1E1E] flex flex-col transition-all duration-300 relative select-none shrink-0 ${
          friendsPanelOpen ? 'w-[300px]' : 'w-0'
        }`}
      >
        {friendsPanelOpen && (
          <div className="flex flex-col h-full w-[300px]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#1E1E1E]">
              <div className="flex gap-3">
                <button
                  onClick={() => setFriendsTab('friends')}
                  className={`text-xs font-bold uppercase tracking-wider ${
                    friendsTab === 'friends' ? 'text-white' : 'text-[#52525B] hover:text-[#A1A1AA]'
                  }`}
                >
                  Arkadaşlar
                </button>
                <button
                  onClick={() => setFriendsTab('requests')}
                  className={`text-xs font-bold uppercase tracking-wider relative ${
                    friendsTab === 'requests' ? 'text-white' : 'text-[#52525B] hover:text-[#A1A1AA]'
                  }`}
                >
                  <span>İstekler</span>
                  {social.pendingRequests > 0 && (
                    <span className="absolute -top-1 -right-2.5 w-1.5 h-1.5 bg-[#8B5CF6] rounded-full" />
                  )}
                </button>
              </div>

              {/* Add friend triggers */}
              <button
                onClick={() => setAddFriendOpen(true)}
                className="p-1 rounded hover:bg-white/5 text-[#52525B] hover:text-white"
                title="Arkadaş Ekle"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>

            {/* Content box based on tab */}
            {friendsTab === 'friends' ? (
              <>
                {/* Search */}
                <div className="px-4 py-2 border-b border-[#1E1E1E] flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-[#52525B]" />
                  <input
                    type="text"
                    value={friendsSearch}
                    onChange={(e) => setFriendsSearch(e.target.value)}
                    placeholder="Oyuncu ara..."
                    className="bg-transparent border-none focus:outline-none text-[10px] text-white placeholder-white/10 w-full"
                  />
                </div>

                {/* Friends lists */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {/* Online section */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-wider">
                      {onlineFriends.length} ÇEVRİMİÇİ
                    </span>
                    {onlineFriends.map((f) => (
                      <div key={f.username} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/[0.02] group transition-all">
                        <div className="relative">
                          <img
                            src={sanitizeUrl(`https://minotar.net/avatar/${sanitizeParam(f.username)}/32`)}
                            alt={f.username}
                            className="w-8 h-8 rounded-lg border border-white/5"
                          />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0D0D0D] ${
                            f.status === 'in-game' ? 'bg-[#10B981]' : f.status === 'in-launcher' ? 'bg-[#06B6D4]' : 'bg-amber-500'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white leading-none mb-1">{f.username}</h4>
                          <p className="text-[9px] text-[#A1A1AA] truncate leading-none">
                            {f.status === 'in-game' && `Oynuyor: ${f.currentServer}`}
                            {f.status === 'in-launcher' && 'Başlatıcıda'}
                            {f.status === 'idle' && 'Boşta'}
                          </p>
                        </div>
                        <button className="p-1 rounded bg-[#1A1A1A] border border-[#2A2A2A] text-[#52525B] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Offline section */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-wider">
                      {offlineFriends.length} ÇEVRİMDIŞI
                    </span>
                    {offlineFriends.map((f) => (
                      <div key={f.username} className="flex items-center gap-3 p-1.5 rounded-lg opacity-40 hover:opacity-100 group transition-all">
                        <img
                          src={sanitizeUrl(`https://minotar.net/avatar/${sanitizeParam(f.username)}/32`)}
                          alt={f.username}
                          className="w-8 h-8 rounded-lg grayscale border border-white/5"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white leading-none mb-1">{f.username}</h4>
                          <p className="text-[9px] text-[#A1A1AA] leading-none">Son görülme: {f.lastSeen}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              // Requests view list
              <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {Array.from({ length: social.pendingRequests }).map((_, idx) => {
                  const names = ['KillaMc', 'GamerQueen', 'RedstoneGuy'];
                  const name = names[idx] || 'Player';
                  return (
                    <div key={name} className="flex items-center justify-between p-2.5 bg-[#111111] border border-[#1E1E1E] rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <img src={`https://minotar.net/avatar/${name}/24`} alt="avatar" className="w-6 h-6 rounded" />
                        <span className="text-xs font-bold text-white">{name}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-2 py-0.8 rounded text-[9px] font-extrabold uppercase">Kabul</button>
                        <button className="bg-white/5 hover:bg-white/10 text-[#A1A1AA] px-2 py-0.8 rounded text-[9px] font-extrabold uppercase">Red</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collapse vertical toggle tab handle */}
      <button
        onClick={() => setFriendsPanelOpen(!friendsPanelOpen)}
        className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#0D0D0D] hover:bg-[#1A1A1A] border-l border-y border-[#1E1E1E] text-[#52525B] hover:text-white px-0.5 py-4 rounded-l-md z-30 transition-all select-none"
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
              className="bg-[#0A0A0A] border border-[#2A2A2A] w-[320px] rounded-xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Arkadaşlık İsteği</h4>
                <button onClick={() => setAddFriendOpen(false)} className="p-1 rounded hover:bg-white/5 text-[#52525B] hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <form onSubmit={handleAddFriendSubmit} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Kullanıcı adı..."
                  value={newFriendUsername}
                  onChange={(e) => setNewFriendUsername(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#111111] border border-[#2A2A2A] text-xs font-semibold text-white focus:outline-none focus:border-[#8B5CF6]"
                />
                <button
                  type="submit"
                  disabled={addFriendLoading}
                  className="w-full py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-xs uppercase tracking-wider flex justify-center items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{addFriendLoading ? 'Gönderiliyor...' : 'İstek Gönder'}</span>
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
