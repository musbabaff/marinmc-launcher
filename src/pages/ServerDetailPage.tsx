import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useServersStore } from '../stores/serversStore.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { useSettingsStore } from '../stores/settingsStore.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Settings, 
  Play, 
  Square, 
  Terminal, 
  Compass, 
  Loader2, 
  X, 
  FolderOpen
} from 'lucide-react';
import axios from 'axios';
import logoPng from '../../assets/logo.png';
import { getApiBaseUrl } from '../lib/api.ts';
import { STEVE_AVATAR_FALLBACK } from '../lib/constants.ts';

const translations = {
  tr: {
    backBtn: 'Sunucu Listesi',
    playBtn: 'OYNA',
    checking: 'Dosyalar kontrol ediliyor...',
    downloading: 'İstemci indiriliyor...',
    launching: 'Minecraft başlatılıyor...',
    running: 'Oyunu Durdur',
    relaunch: 'Yeniden Başlat',
    stopBtn: 'DURDUR',
    lastSession: 'Son oturum: 2 gün önce',
    newsTitle: 'Son Haberler & Güncellemeler',
    consoleBtn: 'Konsol',
    settingsTitle: 'Gelişmiş Ayarlar',
    ramLabel: 'Bellek (RAM) Tahsisi',
    jvmLabel: 'Ek JVM Argümanları',
    dirLabel: 'Oyun Dizin Yolu',
    behaviorLabel: 'Oyun Başladıktan Sonra',
    applyBtn: 'UYGULA',
    resetBtn: 'SIFIRLA',
    ramRecommendation: 'Önerilen: 2048 MB - 4096 MB',
    behaviorMin: 'Launcher\'ı Küçült',
    behaviorClose: 'Launcher\'ı Kapat',
    behaviorNothing: 'Hiçbir şey yapma',
    onlineText: 'Aktif',
    copyright: '© 2026 MarinMC. Tüm hakları saklıdır. Mojang AB ile ilişkili değildir.',
    consoleTitle: 'Geliştirici Konsolu',
    clearBtn: 'Temizle',
    emptyConsole: 'Konsol çıktısı boş. Oyunu başlattığınızda çıktılar burada görünecektir.',
    loadingDetails: 'Sunucu detayları yükleniyor...'
  },
  en: {
    backBtn: 'Server List',
    playBtn: 'PLAY',
    checking: 'Checking client files...',
    downloading: 'Downloading client...',
    launching: 'Starting Minecraft...',
    running: 'Stop Game',
    relaunch: 'Relaunch',
    stopBtn: 'CANCEL',
    lastSession: 'Last session: 2 days ago',
    newsTitle: 'Latest News & Updates',
    consoleBtn: 'Console',
    settingsTitle: 'Advanced Settings',
    ramLabel: 'Memory (RAM) Allocation',
    jvmLabel: 'Additional JVM Arguments',
    dirLabel: 'Game Directory Path',
    behaviorLabel: 'After Game Launches',
    applyBtn: 'APPLY',
    resetBtn: 'RESET',
    ramRecommendation: 'Recommended: 2048 MB - 4096 MB',
    behaviorMin: 'Minimize Launcher',
    behaviorClose: 'Close Launcher',
    behaviorNothing: 'Do nothing',
    onlineText: 'Online',
    copyright: '© 2026 MarinMC. All rights reserved. Not affiliated with Mojang AB.',
    consoleTitle: 'Developer Console',
    clearBtn: 'Clear',
    emptyConsole: 'Console output is empty. Logs will appear here once the game starts.',
    loadingDetails: 'Loading server details...'
  }
};

const MOCK_NEWS: any[] = [];

export default function ServerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { servers, selectedServer, selectServer } = useServersStore();
  const session = useAuthStore((state) => state.session);
  const { 
    ram, 
    jvmArgs, 
    launcherDir, 
    launcherBehavior, 
    totalSystemRAM, 
    osName, 
    language: lang,
    setLanguage: setLang,
    loadSettings, 
    saveSettings 
  } = useSettingsStore();

  const [launchStatus, setLaunchStatus] = useState<'IDLE' | 'CHECKING' | 'DOWNLOADING' | 'LAUNCHING' | 'RUNNING' | 'ERROR'>('IDLE');
  const [progress, setProgress] = useState(0);
  const [currentFileDownloading, setCurrentFileDownloading] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [news, setNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  // Interactive panels
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  // Settings states
  const [tempRam, setTempRam] = useState(ram);
  const [tempJvmArgs, setTempJvmArgs] = useState(jvmArgs);
  const [tempLauncherDir, setTempLauncherDir] = useState(launcherDir);
  const [tempBehavior, setTempBehavior] = useState(launcherBehavior);

  const consoleEndRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  // Load configuration and server context on mount
  useEffect(() => {
    loadSettings();
    if (servers.length > 0 && id) {
      const server = servers.find((s) => s.id === id);
      if (server) selectServer(server);
    }
  }, [id, servers, selectServer, loadSettings]);

  // Fetch news
  useEffect(() => {
    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const response = await axios.get(`https://api.marinmc.com/news?server=${id}&limit=3`);
        setNews(response.data);
      } catch {
        setNews(MOCK_NEWS);
      } finally {
        setNewsLoading(false);
      }
    };
    fetchNews();
  }, [id]);

  // Sync settings when store values load
  useEffect(() => {
    setTempRam(ram);
    setTempJvmArgs(jvmArgs);
    setTempLauncherDir(launcherDir);
    setTempBehavior(launcherBehavior);
  }, [ram, jvmArgs, launcherDir, launcherBehavior, isSettingsOpen]);

  // Scroll to bottom of developer console logs
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Electron IPC IPC Event Subscriptions
  useEffect(() => {
    let unsubscribeLog: (() => void) | undefined;
    let unsubscribeProgress: (() => void) | undefined;
    let unsubscribeStatus: (() => void) | undefined;

    if (window.electronAPI) {
      unsubscribeLog = window.electronAPI.onGameLog((logLine: string) => {
        setLogs((prev) => [...prev.slice(-150), logLine]); // Limit array length
        if (logLine.includes('İndiriliyor:')) {
          const match = logLine.match(/İndiriliyor:\s*(.+)/);
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
          if (launcherBehavior === 'minimize') {
            window.electronAPI.minimize();
          } else if (launcherBehavior === 'close') {
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
  }, [launcherBehavior]);

  // Click outside to close settings
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsPanelRef.current && !settingsPanelRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsOpen]);

  if (!selectedServer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-xs">
        <p>{t.loadingDetails}</p>
        <button onClick={() => navigate('/servers')} className="mt-4 text-blue-400 hover:underline flex items-center space-x-1">
          <ChevronLeft className="w-4 h-4" />
          <span>{t.backBtn}</span>
        </button>
      </div>
    );
  }

  const getErrorInfo = (msg: string) => {
    if (msg.includes('java') || msg.includes('Java') || msg.includes('ENOENT'))
      return { text: 'Java bulunamadı! Lütfen Java 21 yükleyin.', link: 'https://adoptium.net', linkText: 'Java 21 İndir' };
    if (msg.includes('network') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED'))
      return { text: 'İnternet bağlantınızı kontrol edin.', link: null, linkText: null };
    if (msg.includes('session') || msg.includes('auth') || msg.includes('token'))
      return { text: 'Oturum geçersiz, lütfen tekrar giriş yapın.', link: null, linkText: null };
    return { text: msg, link: null, linkText: null };
  };

  const handleLaunch = async () => {
    if (launchStatus !== 'IDLE' && launchStatus !== 'ERROR') return;

    setLogs([]);
    setProgress(0);
    setErrorMessage('');

    try {
      if (window.electronAPI) {
        // Step 1: Check Java availability
        setLaunchStatus('CHECKING');
        setLogs(['[MarinMC Launcher] Java kontrol ediliyor...']);

        const javaCheck = await window.electronAPI.detectJava();
        if (!javaCheck.found) {
          setLaunchStatus('ERROR');
          setErrorMessage('Java bulunamadı! Lütfen Java 21 yükleyin: https://adoptium.net');
          setLogs((prev) => [...prev, '[HATA] Java bulunamadı. Lütfen Java 21 yükleyip tekrar deneyin.']);
          return;
        }
        setLogs((prev) => [...prev, `[MarinMC Launcher] Java bulundu: ${javaCheck.version}`]);

        // Step 2: Launch game with full options
        const launchOptions = {
          ram,
          jvmArgs,
          username: session?.name || 'Player',
          accessToken: session?.token,
          uuid: session?.id,
          userType: session?.type,
          version: selectedServer.version || '1.21',
          serverId: selectedServer.id,
          gameDir: launcherDir,
          javaPath: useSettingsStore.getState().javaPath,
          smartJvmOpt: useSettingsStore.getState().smartJvmOpt,
          discordRpcEnabled: useSettingsStore.getState().discordRpcEnabled,
          cosmetics: {
            skinType: (localStorage.getItem('marinmc_active_skin_type') as any) || 'username',
            capeUrl: localStorage.getItem('marinmc_active_cape_url') || '',
            apiUrl: getApiBaseUrl()
          }
        };

        const result = await window.electronAPI.launchGame(launchOptions);

        if (!result.success) {
          setLaunchStatus('ERROR');
          setErrorMessage(result.error || 'Bilinmeyen başlatma hatası');
          setLogs((prev) => [...prev, `[HATA] ${result.error || 'Bilinmeyen başlatma hatası'}`]);
        }
        // RUNNING/CLOSED/ERROR states are handled by onGameStatus listener

      } else {
        // Simulated browser launch sequence
        setLaunchStatus('CHECKING');
        setLogs(['[Launcher] Dosyalar kontrol ediliyor...']);
        await new Promise((resolve) => setTimeout(resolve, 1200));

        setLaunchStatus('DOWNLOADING');
        setLogs((prev) => [...prev, '[Launcher] Dosyalar indiriliyor... (1.21-Fabric)']);
        let p = 0;
        const interval = setInterval(() => {
          p += 10;
          setProgress(p);
          setLogs((prev) => [...prev, `[Launcher] Kütüphaneler yükleniyor... ${p}%`]);
          if (p >= 100) {
            clearInterval(interval);
            setLaunchStatus('LAUNCHING');
            setLogs((prev) => [...prev, '[Launcher] Oyun süreci başlatılıyor...']);
            setTimeout(() => {
              setLaunchStatus('RUNNING');
              setLogs((prev) => [...prev, '[Launcher] Minecraft başarıyla başlatıldı.']);
            }, 1000);
          }
        }, 200);
      }
    } catch (err: any) {
      setLaunchStatus('ERROR');
      setErrorMessage(err.message || 'Beklenmeyen hata');
      setLogs((prev) => [...prev, `[HATA] Oyun başlatılamadı: ${err.message}`]);
    }
  };

  const handleStop = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.stopGame();
      }
      setLaunchStatus('IDLE');
      setProgress(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectFolder = async () => {
    if (window.electronAPI) {
      const selected = await window.electronAPI.selectDirectory();
      if (selected) {
        setTempLauncherDir(selected);
      }
    }
  };

  const handleOpenLink = async (url: string) => {
    // Only allow links pointing to trusted domains: marinmc.com, discord.gg, or t.me
    const isTrusted = /^(https:\/\/([a-z0-9-]+\.)?marinmc\.com|https:\/\/discord\.gg|https:\/\/t\.me)/i.test(url);
    const safeUrl = isTrusted ? url : 'https://marinmc.com';

    if (window.electronAPI) {
      await window.electronAPI.openExternal(safeUrl);
    } else {
      window.open(safeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleApplySettings = () => {
    saveSettings({
      ram: tempRam,
      jvmArgs: tempJvmArgs,
      launcherDir: tempLauncherDir,
      javaPath: 'Bundled Java',
      launcherBehavior: tempBehavior
    });
    setIsSettingsOpen(false);
  };

  const handleResetSettings = () => {
    let defaultDir = '';
    if (osName === 'Windows') {
      defaultDir = 'C:\\Users\\Default\\AppData\\Roaming\\.marinmc';
    } else if (osName === 'macOS') {
      defaultDir = '/Users/Default/Library/Application Support/marinmc';
    } else {
      defaultDir = '/home/default/.marinmc';
    }

    setTempRam(4096);
    setTempJvmArgs("-XX:G1NewSizePercent=5 -XX:G1MaxNewSizePercent=60");
    setTempLauncherDir(defaultDir);
    setTempBehavior('minimize');
  };

  const getPlayButtonContent = () => {
    switch (launchStatus) {
      case 'CHECKING':
        return (
          <button disabled className="w-full py-3.5 bg-gray-700 text-gray-400 font-extrabold text-[11px] rounded-xl flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            <span>{t.checking}</span>
          </button>
        );
      case 'DOWNLOADING':
        return (
          <button onClick={handleStop} className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-[11px] rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-md">
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>{t.stopBtn}</span>
          </button>
        );
      case 'LAUNCHING':
        return (
          <button disabled className="w-full py-3.5 bg-amber-600 text-amber-200 font-extrabold text-[11px] rounded-xl flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-200" />
            <span>{t.launching}</span>
          </button>
        );
      case 'RUNNING':
        return (
          <button onClick={handleStop} className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold text-[11px] rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg">
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>{t.running}</span>
          </button>
        );
      case 'ERROR': {
        const errInfo = getErrorInfo(errorMessage);
        return (
          <div className="space-y-2">
            <div className="text-[9px] text-red-400 font-semibold text-center truncate px-1" title={errInfo.text}>
              {errInfo.text}
            </div>
            {errInfo.link && (
              <button
                onClick={() => handleOpenLink(errInfo.link!)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>{errInfo.linkText}</span>
              </button>
            )}
            <button onClick={handleLaunch} className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-[11px] rounded-xl transition-all flex items-center justify-center space-x-2 shadow-md">
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{t.relaunch}</span>
            </button>
          </div>
        );
      }
      case 'IDLE':
      default:
        return (
          <button onClick={handleLaunch} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-[#2D7DD2] hover:from-blue-500 hover:to-[#4A9AE8] text-white font-extrabold text-[11px] rounded-xl tracking-wider transition-all flex items-center justify-center space-x-2 shadow-[0_4px_20px_rgba(45,125,210,0.3)]">
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{t.playBtn}</span>
          </button>
        );
    }
  };

  return (
    <div className="flex-1 h-full w-full flex flex-col justify-between p-8 relative overflow-hidden bg-[#0D0F14] text-white">
      
      {/* NAVBAR WITH BACK ARROW */}
      <div className="flex items-center justify-between z-20 pb-4 border-b border-white/[0.04] shrink-0">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => { handleStop(); navigate('/servers'); }} 
            className="p-2 bg-[#161925]/90 hover:bg-white/[0.04] border border-white/5 rounded-xl text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <img src={logoPng} className="w-8 h-8" alt="Logo" />
          <div>
            <span className="text-sm font-extrabold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-400">MARINMC</span>
            <p className="text-[8px] text-gray-500 tracking-wider font-bold uppercase">Minecraft Network</p>
          </div>
        </div>

        {/* Right Header Panel */}
        <div className="flex items-center space-x-3">
          {/* Language badge */}
          <div className="bg-[#161925]/90 border border-white/5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold flex items-center space-x-1.5">
            <button onClick={() => setLang('tr')} className={`transition-colors ${lang === 'tr' ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}>TR</button>
            <span className="text-white/20">|</span>
            <button onClick={() => setLang('en')} className={`transition-colors ${lang === 'en' ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}>EN</button>
          </div>

          {/* Settings Trigger */}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-[#161925]/90 hover:bg-white/[0.04] border border-white/5 rounded-xl text-gray-400 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User badge */}
          {session && (
            <div className="bg-[#161925]/90 border border-white/5 rounded-xl px-3 py-1.5 flex items-center space-x-2.5">
              <img src={session.avatar} alt={session.name} className="w-5.5 h-5.5 rounded-lg border border-white/10 shrink-0" />
              <span className="text-[11px] font-semibold text-gray-200 tracking-wide max-w-[80px] truncate">{session.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* DETAILED VIEW BODY */}
      <div className="flex-1 flex flex-col justify-between py-6 overflow-hidden z-10 relative">
        
        {/* HERO CONTAINER */}
        <div className="w-full h-[190px] rounded-2xl border border-white/[0.04] relative overflow-hidden flex flex-col justify-end p-6 shadow-xl shrink-0 bg-[#0B0D15]">
          {/* Background Blurred image */}
          <div 
            className="absolute inset-0 bg-cover bg-center filter blur-md scale-105 opacity-30"
            style={{ backgroundImage: `url(${selectedServer.artworkUrl || 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=800&auto=format&fit=crop&q=60'})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0F14] via-[#0D0F14]/70 to-black/20" />

          {/* Content */}
          <div className="relative z-10 flex justify-between items-end w-full">
            {/* Left side details */}
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center space-x-2">
                {selectedServer.tags.map(tag => (
                  <span key={tag} className="text-[9px] font-extrabold tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded uppercase">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400">
                  <Compass className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-white tracking-tight">{selectedServer.name}</h2>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{selectedServer.description}</p>
                </div>
              </div>
            </div>

            {/* Right side Play + Stats */}
            <div className="flex flex-col items-end space-y-3 shrink-0">
              <div className="text-right text-[11px] font-semibold text-gray-400 space-y-0.5">
                <div className="flex items-center justify-end space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-gray-200">
                    {selectedServer.playerCount} / {selectedServer.maxPlayers} {t.onlineText}
                  </span>
                </div>
                <p className="text-gray-500 text-[10px]">{t.lastSession}</p>
              </div>

              {/* Action Button Section */}
              <div className="w-48">
                {/* Simulated downloading progress bar */}
                {launchStatus === 'DOWNLOADING' && (() => {
                  const details = currentFileDownloading ? currentFileDownloading.match(/(.+?)\s*\((\d+)\/(\d+)\)/) : null;
                  const fileType = details ? details[1].trim().toUpperCase() : 'GEREKSİNİMLER';
                  const currentFile = details ? parseInt(details[2], 10) : 0;
                  const totalFiles = details ? parseInt(details[3], 10) : 100;
                  
                  return (
                    <div className="w-full mb-2.5 space-y-1 animate-[fadeIn_0.2s_ease-out]">
                      <div className="flex justify-between text-[8px] text-gray-400 font-bold px-0.5 uppercase tracking-wide">
                        <span className="truncate max-w-[120px] text-emerald-400">
                          {fileType}: {currentFile > 0 ? `${currentFile}/${totalFiles}` : 'KONTROL EDİLİYOR'}
                        </span>
                        <span>%{progress}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 shadow-[0_0_6px_rgba(52,211,153,0.3)]" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })()}
                {getPlayButtonContent()}
              </div>
            </div>
          </div>
        </div>

        {/* NEWS SECTION */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden min-h-0">
          <div className="flex items-center justify-between pb-3 select-none shrink-0">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">{t.newsTitle}</h3>
          </div>

          <div className="grid grid-cols-3 gap-5 overflow-hidden flex-1 select-none">
            {newsLoading ? (
              [1, 2, 3].map(idx => (
                <div key={idx} className="h-full rounded-2xl bg-white/[0.01] border border-white/[0.04] animate-pulse"></div>
              ))
            ) : (
              news.map((item, index) => (
                <motion.div
                  key={index}
                  whileHover={{ y: -4, scale: 1.01 }}
                  onClick={() => handleOpenLink(item.url)}
                  className="rounded-2xl bg-[#161925]/30 border border-white/[0.04] hover:border-white/10 cursor-pointer overflow-hidden relative flex flex-col justify-end p-4 group transition-all duration-300 shadow-md"
                >
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-102 transition-transform duration-500" 
                    style={{ backgroundImage: `url(${item.imageUrl})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                  <div className="relative z-10 space-y-2">
                    <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2 leading-relaxed">
                      {item.title}
                    </h4>

                    <div className="flex items-center justify-between text-[9px] text-gray-500">
                      <div className="flex items-center space-x-1.5">
                        <img 
                          src={/^(https?:\/\/)/.test(item.authorAvatar) ? encodeURI(item.authorAvatar) : STEVE_AVATAR_FALLBACK} 
                          alt="Author" 
                          className="w-4 h-4 rounded-full border border-white/10" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = STEVE_AVATAR_FALLBACK;
                          }}
                        />
                        <span>{item.author}</span>
                      </div>
                      <span>{item.date}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* BOTTOM CONSOLE TRIGGER & DISCLAIMER */}
      <div className="z-20 border-t border-white/[0.04] pt-4 flex items-center justify-between text-[10px] text-gray-600 select-none shrink-0 relative">
        <span>{t.copyright}</span>
        
        {/* Toggle Console Button */}
        <button
          onClick={() => setIsConsoleOpen(!isConsoleOpen)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 border rounded-xl transition-all duration-200 uppercase font-bold text-[9px] tracking-wide ${
            isConsoleOpen 
              ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(45,125,210,0.4)]' 
              : 'bg-[#161925]/90 border-white/5 hover:bg-white/[0.03] text-gray-400 hover:text-white'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>{t.consoleBtn}</span>
        </button>
      </div>

      {/* SETTINGS DRAWER OVERLAY PANEL (SLIDES IN FROM RIGHT) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            {/* Backdrop Blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 pointer-events-auto"
              onClick={() => setIsSettingsOpen(false)}
            />

            {/* Panel drawer */}
            <motion.div
              ref={settingsPanelRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="absolute right-0 top-0 bottom-0 w-[330px] bg-[#131622] border-l border-white/10 z-40 p-6 flex flex-col justify-between shadow-2xl pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-blue-400" />
                  <h3 className="font-extrabold text-sm tracking-wide">{t.settingsTitle}</h3>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Settings Content */}
              <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1 scrollbar-thin text-xs">
                
                {/* RAM Allocation */}
                <div className="space-y-2">
                  <div className="flex justify-between font-bold">
                    <span className="text-gray-400">{t.ramLabel}</span>
                    <span className="text-blue-400">{tempRam} MB</span>
                  </div>
                  <input
                    type="range"
                    min="512"
                    max={totalSystemRAM}
                    step="256"
                    value={tempRam}
                    onChange={(e) => setTempRam(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-500 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-600 font-semibold">{t.ramRecommendation}</p>
                </div>

                {/* JVM Args */}
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-400 block">{t.jvmLabel}</label>
                  <textarea
                    rows={4}
                    value={tempJvmArgs}
                    onChange={(e) => setTempJvmArgs(e.target.value)}
                    className="w-full bg-[#0D0F14] border border-white/5 rounded-xl px-3 py-2 text-[11px] font-mono text-gray-300 placeholder-gray-700 focus:border-blue-500 focus:outline-none leading-normal resize-none"
                  />
                </div>

                {/* Directory Path */}
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-400 block">{t.dirLabel}</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={tempLauncherDir}
                      className="w-full bg-[#0D0F14] border border-white/5 rounded-xl px-3 py-2 text-[10px] font-semibold text-gray-400 focus:outline-none truncate"
                    />
                    <button
                      type="button"
                      onClick={handleSelectFolder}
                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-gray-400 hover:text-white transition-all shrink-0"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Behavior Radios */}
                <div className="space-y-2">
                  <label className="font-bold text-gray-400 block">{t.behaviorLabel}</label>
                  <div className="space-y-2 font-semibold text-gray-300">
                    <label className="flex items-center space-x-2.5 cursor-pointer hover:text-white">
                      <input
                        type="radio"
                        name="behavior"
                        checked={tempBehavior === 'minimize'}
                        onChange={() => setTempBehavior('minimize')}
                        className="accent-blue-500 w-3.5 h-3.5"
                      />
                      <span>{t.behaviorMin}</span>
                    </label>
                    <label className="flex items-center space-x-2.5 cursor-pointer hover:text-white">
                      <input
                        type="radio"
                        name="behavior"
                        checked={tempBehavior === 'close'}
                        onChange={() => setTempBehavior('close')}
                        className="accent-blue-500 w-3.5 h-3.5"
                      />
                      <span>{t.behaviorClose}</span>
                    </label>
                    <label className="flex items-center space-x-2.5 cursor-pointer hover:text-white">
                      <input
                        type="radio"
                        name="behavior"
                        checked={tempBehavior === 'nothing'}
                        onChange={() => setTempBehavior('nothing')}
                        className="accent-blue-500 w-3.5 h-3.5"
                      />
                      <span>{t.behaviorNothing}</span>
                    </label>
                  </div>
                </div>

              </div>

              {/* Drawer actions */}
              <div className="flex items-center space-x-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleApplySettings}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs tracking-wider transition-colors uppercase"
                >
                  {t.applyBtn}
                </button>
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold rounded-xl text-xs tracking-wider transition-colors uppercase"
                >
                  {t.resetBtn}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SLIDE-UP CONSOLE DRAWER PANEL */}
      <AnimatePresence>
        {isConsoleOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 inset-x-0 h-64 bg-[#0A0C14] border-t border-white/10 z-30 flex flex-col shadow-2xl pointer-events-auto"
          >
            {/* Header */}
            <div className="h-10 bg-[#0E101A] border-b border-white/5 px-4 flex items-center justify-between text-[10px] text-gray-400 select-none shrink-0 font-medium">
              <div className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                <span>{t.consoleTitle} ({selectedServer.name})</span>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setLogs([])}
                  className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] hover:bg-white/10 transition-colors uppercase font-semibold text-gray-300"
                >
                  {t.clearBtn}
                </button>
                <button 
                  onClick={() => setIsConsoleOpen(false)}
                  className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            {/* Logs list */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-[9px] leading-relaxed space-y-1.5 scrollbar-thin select-text bg-[#07080d]">
              {logs.map((log, index) => (
                <div 
                  key={index} 
                  className={
                    log.includes('[HATA]') || log.includes('error') || log.includes('Exception')
                      ? 'text-red-400' 
                      : log.includes('INFO') || log.includes('[MarinMC')
                      ? 'text-blue-400' 
                      : 'text-gray-500'
                  }
                >
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-white/10 select-none py-10">
                  <Terminal className="w-6 h-6 mb-1 opacity-40" />
                  <p>{t.emptyConsole}</p>
                </div>
              )}
              <div ref={consoleEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
