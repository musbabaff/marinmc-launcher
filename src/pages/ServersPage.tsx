import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServersStore } from '../stores/serversStore.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Anchor, 
  LogOut, 
  Compass, 
  Disc, 
  Send, 
  ChevronDown, 
  Globe 
} from 'lucide-react';
import logoSvg from '../../assets/logo.svg';

const translations = {
  tr: {
    navbarTitle: 'Oynamak için sunucu seçin',
    playersOnline: 'oyuncu aktif',
    logout: 'Çıkış Yap',
    settingsTooltip: 'Ayarlar',
    copyright: '© 2026 MarinMC. Tüm hakları saklıdır. Mojang AB ile ilişkili değildir.',
    playersCount: 'Oyuncu',
    selectBtn: 'BAĞLAN',
    onlineText: 'Aktif',
    offlineText: 'Kapalı',
    versionText: 'Sürüm'
  },
  en: {
    navbarTitle: 'Select a server to play',
    playersOnline: 'players online',
    logout: 'Log Out',
    settingsTooltip: 'Settings',
    copyright: '© 2026 MarinMC. All rights reserved. Not affiliated with Mojang AB.',
    playersCount: 'Players',
    selectBtn: 'CONNECT',
    onlineText: 'Online',
    offlineText: 'Offline',
    versionText: 'Version'
  }
};

const colorMap: Record<string, {
  glow: string;
  border: string;
  activeBorder: string;
  text: string;
  badgeBg: string;
  gradient: string;
  shadow: string;
}> = {
  teal: {
    glow: 'hover:shadow-[0_0_20px_rgba(20,184,166,0.25)]',
    border: 'hover:border-teal-500/40',
    activeBorder: 'border-teal-500 ring-2 ring-teal-500/20',
    text: 'text-teal-400',
    badgeBg: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
    gradient: 'from-teal-600/15 to-transparent',
    shadow: 'shadow-teal-900/10'
  },
  purple: {
    glow: 'hover:shadow-[0_0_20px_rgba(139,92,246,0.25)]',
    border: 'hover:border-purple-500/40',
    activeBorder: 'border-purple-500 ring-2 ring-purple-500/20',
    text: 'text-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    gradient: 'from-purple-600/15 to-transparent',
    shadow: 'shadow-purple-900/10'
  },
  orange: {
    glow: 'hover:shadow-[0_0_20px_rgba(249,115,22,0.25)]',
    border: 'hover:border-orange-500/40',
    activeBorder: 'border-orange-500 ring-2 ring-orange-500/20',
    text: 'text-orange-400',
    badgeBg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    gradient: 'from-orange-600/15 to-transparent',
    shadow: 'shadow-orange-900/10'
  }
};

export default function ServersPage() {
  const { 
    servers, 
    totalOnline, 
    isLoading, 
    selectedServerId, 
    fetchServers, 
    setSelectedServer, 
    updateOnlineCounts 
  } = useServersStore();
  
  const { session, logout } = useAuthStore();
  const navigate = useNavigate();

  const [lang, setLang] = useState<'tr' | 'en'>('tr');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const t = translations[lang];

  // Fetch servers on mount
  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  // Poll online counts every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      updateOnlineCounts();
    }, 30000);
    return () => clearInterval(interval);
  }, [updateOnlineCounts]);

  // Click outside listener to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setIsUserOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSelectServer = (id: string) => {
    setSelectedServer(id);
    navigate(`/server/${id}`);
  };

  return (
    <div className="flex-1 h-full w-full flex flex-col justify-between p-8 relative overflow-hidden bg-[#0B0D15] text-white select-none">
      {/* Subtle animated backglows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-1/4 -left-1/4 w-[60%] h-[60%] rounded-full bg-teal-500/5 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-[65%] h-[65%] rounded-full bg-blue-600/5 blur-[130px] animate-pulse" style={{ animationDuration: '12s' }}></div>
      </div>

      {/* TOP NAVBAR */}
      <div className="flex items-center justify-between z-20 select-none pb-4 border-b border-white/[0.04]">
        {/* Left: Logo */}
        <div className="flex items-center space-x-3">
          <img src={logoSvg} className="w-8 h-8" alt="Logo" />
          <div>
            <span className="text-sm font-extrabold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">MARINMC</span>
            <p className="text-[8px] text-gray-500 tracking-wider font-bold uppercase">Minecraft Network</p>
          </div>
        </div>

        {/* Center: Title with Anchor Icon */}
        <div className="flex items-center space-x-2 bg-white/[0.02] border border-white/[0.04] px-4 py-1.5 rounded-full backdrop-blur-md shadow-inner">
          <Anchor className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-semibold text-gray-200 tracking-wide">{t.navbarTitle}</span>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center space-x-3">
          {/* Global Online Badge */}
          <div className="bg-[#161925]/90 border border-white/5 rounded-xl px-3 py-1.5 text-[11px] font-semibold flex items-center space-x-2 backdrop-blur-md shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-gray-200">
              {totalOnline.toLocaleString()} <span className="text-gray-500 font-normal">{t.playersOnline}</span>
            </span>
          </div>

          {/* Language selector dropdown */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="bg-[#161925]/90 border border-white/5 rounded-xl px-3 py-1.5 text-[11px] font-semibold flex items-center space-x-1.5 hover:bg-white/[0.03] transition-colors backdrop-blur-md shadow-md"
            >
              <span>{lang === 'tr' ? '🇹🇷 TR' : '🇬🇧 EN'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isLangOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-1.5 w-24 bg-[#161925]/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-50 py-1"
                >
                  <button
                    onClick={() => { setLang('tr'); setIsLangOpen(false); }}
                    className="w-full text-left px-3.5 py-1.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    🇹🇷 Türkçe
                  </button>
                  <button
                    onClick={() => { setLang('en'); setIsLangOpen(false); }}
                    className="w-full text-left px-3.5 py-1.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    🇬🇧 English
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Settings Gear */}
          <button
            onClick={() => navigate('/settings')}
            title={t.settingsTooltip}
            className="p-2 bg-[#161925]/90 hover:bg-white/[0.04] border border-white/5 rounded-xl text-gray-400 hover:text-white transition-colors backdrop-blur-md shadow-md"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Profile Dropdown */}
          <div className="relative" ref={userRef}>
            {session && (
              <button
                onClick={() => setIsUserOpen(!isUserOpen)}
                className="bg-[#161925]/90 border border-white/5 rounded-xl pl-2.5 pr-2 py-1.5 flex items-center space-x-2.5 hover:bg-white/[0.03] transition-colors backdrop-blur-md shadow-md"
              >
                <img 
                  src={session.avatar} 
                  alt={session.name} 
                  className="w-5.5 h-5.5 rounded-lg border border-white/10 shrink-0" 
                />
                <span className="text-[11px] font-semibold text-gray-200 tracking-wide max-w-[80px] truncate">{session.name}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isUserOpen ? 'rotate-180' : ''}`} />
              </button>
            )}

            <AnimatePresence>
              {isUserOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-1.5 w-36 bg-[#161925]/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-50 py-1"
                >
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center space-x-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.logout}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* SERVER CARDS GRID */}
      <div className="flex-1 flex items-center justify-center py-6 z-10">
        {isLoading ? (
          /* SKELETON LOADER CARDS */
          <div className="grid grid-cols-3 gap-6 w-full max-w-4.5xl px-4">
            {[1, 2, 3].map((idx) => (
              <div 
                key={idx} 
                className="h-[320px] rounded-2xl bg-white/[0.01] border border-white/[0.04] p-5 flex flex-col justify-between animate-pulse"
              >
                <div className="flex justify-between items-start">
                  <div className="w-14 h-5 rounded bg-white/5"></div>
                  <div className="w-16 h-5 rounded bg-white/5"></div>
                </div>
                <div className="space-y-3">
                  <div className="w-24 h-4 rounded bg-white/5"></div>
                  <div className="w-3/4 h-3 rounded bg-white/5"></div>
                  <div className="w-full h-10 rounded-xl bg-white/5 mt-4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ACTUAL SERVER SELECT GRID */
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
            className="grid grid-cols-3 gap-6 w-full max-w-4.5xl px-4"
          >
            {servers.map((server) => {
              const theme = colorMap[server.themeColor] || colorMap.teal;
              const isSelected = selectedServerId === server.id;

              return (
                <motion.div
                  key={server.id}
                  variants={{
                    hidden: { y: 30, opacity: 0 },
                    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
                  }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  onClick={() => handleSelectServer(server.id)}
                  className={`h-[330px] rounded-2xl bg-[#131622]/40 border backdrop-blur-md p-5 flex flex-col justify-between relative cursor-pointer overflow-hidden transition-all duration-300 group shadow-lg ${theme.shadow} ${
                    isSelected 
                      ? `${theme.activeBorder} bg-[#131622]/60` 
                      : `border-white/[0.04] hover:bg-[#131622]/50 ${theme.border} ${theme.glow}`
                  }`}
                >
                  {/* Subtle Top-gradient background based on server theme */}
                  <div className={`absolute top-0 inset-x-0 h-40 bg-gradient-to-b ${theme.gradient} opacity-60 pointer-events-none`} />

                  {/* Top: Badges & Live status */}
                  <div className="flex justify-between items-start z-10">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8.5px] text-gray-400 font-extrabold tracking-wider uppercase">
                      {server.mode}
                    </span>

                    {/* Server Specific Player Count */}
                    <div className="bg-black/35 border border-white/5 rounded-lg px-2 py-0.5 text-[10px] font-semibold flex items-center space-x-1.5 backdrop-blur-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      <span className="text-gray-300 font-bold">
                        {server.playerCount}
                        <span className="text-gray-500 font-normal"> / {server.maxPlayers}</span>
                      </span>
                    </div>
                  </div>

                  {/* Artwork Placeholder or actual Image (renders in a middle box or bg) */}
                  <div className="w-full h-24 rounded-lg overflow-hidden border border-white/[0.04] relative bg-[#0d0f17] z-10 group-hover:border-white/[0.1] transition-colors">
                    {server.artworkUrl ? (
                      <img 
                        src={server.artworkUrl} 
                        alt={server.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <Compass className={`w-8 h-8 ${theme.text} opacity-30`} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                  </div>

                  {/* Bottom: Info, tags & Action button */}
                  <div className="space-y-3 z-10">
                    <div className="space-y-1">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {server.tags.map((tag) => (
                          <span key={tag} className={`text-[8px] font-extrabold tracking-wide px-1.5 py-0.5 rounded uppercase ${theme.badgeBg}`}>
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Server Name */}
                      <h3 className="font-extrabold text-base tracking-tight text-white group-hover:text-blue-400 transition-colors">
                        {server.name}
                      </h3>

                      {/* Description */}
                      <p className="text-[11px] text-gray-400 line-clamp-1 leading-relaxed">
                        {server.description}
                      </p>
                    </div>

                    {/* Action Button */}
                    <button className={`w-full py-2.5 rounded-xl text-[10px] font-extrabold tracking-wider uppercase transition-colors duration-200 ${
                      isSelected 
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md' 
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 group-hover:text-white'
                    }`}>
                      {t.selectBtn}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* BOTTOM FOOTER BAR */}
      <div className="z-20 border-t border-white/[0.04] pt-4 flex items-center justify-between text-[10px] text-gray-600 select-none">
        {/* Left: Copyright */}
        <div className="flex items-center space-x-2.5">
          <span>{t.copyright}</span>
          <span className="text-gray-800">|</span>
          <span className="text-gray-500">IP: <strong className="text-gray-300">oyna.marinmc.com</strong></span>
        </div>

        {/* Right: Social icons */}
        <div className="flex items-center space-x-3 pointer-events-auto">
          <a
            href="https://discord.gg/marinmc"
            target="_blank"
            rel="noreferrer"
            title="Discord"
            className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/10 text-gray-500 hover:text-[#5865F2] transition-all"
          >
            <Disc className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://t.me/marinmc"
            target="_blank"
            rel="noreferrer"
            title="Telegram"
            className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/10 text-gray-500 hover:text-[#24A1DE] transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://marinmc.com"
            target="_blank"
            rel="noreferrer"
            title="Website"
            className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/10 text-gray-500 hover:text-blue-400 transition-all"
          >
            <Globe className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
