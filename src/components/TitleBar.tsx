import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/appStore.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { useNotificationStore } from '../stores/notificationStore.ts';
import { Minus, Square, X, Bell, LogIn, ExternalLink } from 'lucide-react';
import { api } from '../lib/api.ts';
import MarinLogo from './MarinLogo.tsx';
import InboxPopover from './InboxPopover.tsx';
import { useNavigate } from 'react-router-dom';
import { STEVE_AVATAR_FALLBACK } from '../lib/constants.ts';

export default function TitleBar() {
  const { t } = useTranslation();
  const isOnline = useAppStore((state) => state.isOnline);
  const activePage = useAppStore((state) => state.activePage);
  const gameStatus = useAppStore((state) => state.gameStatus);
  const setActivePage = useAppStore((state) => state.setActivePage);
  
  const { session } = useAuthStore();
  const { notifications } = useNotificationStore();
  
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [version, setVersion] = useState('');
  const [inboxOpen, setInboxOpen] = useState(false);
  
  const inboxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => n.unread).length;

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.getVersion) {
      window.electronAPI.getVersion().then(setVersion);
    }
  }, []);

  useEffect(() => {
    api.getOnlineCount().then((res) => {
      if (res && res.total !== undefined) {
        setOnlineCount(res.total);
      }
    }).catch(err => console.warn('Failed to fetch online count:', err));
    
    const interval = setInterval(() => {
      api.getOnlineCount().then((res) => {
        if (res && res.total !== undefined) {
          setOnlineCount(res.total);
        }
      }).catch(err => console.warn('Failed to fetch online count:', err));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inboxRef.current && !inboxRef.current.contains(event.target as Node)) {
        setInboxOpen(false);
      }
    }
    document.addEventListener('mousedown', event => handleClickOutside(event));
    return () => document.removeEventListener('mousedown', event => handleClickOutside(event));
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI) window.electronAPI.minimize();
  };

  const handleClose = () => {
    if (window.electronAPI) window.electronAPI.close();
  };

  const getPageTitle = () => {
    switch (activePage) {
      case '/home': return t('titlebar.launchpad');
      case '/profile': return t('titlebar.profile');
      case '/notifications': return t('titlebar.notifications');
      case '/chat': return t('titlebar.chat');
      case '/versions': return t('titlebar.versions');
      case '/mods': return t('titlebar.mods');
      case '/cosmetics': return t('titlebar.cosmetics');
      case '/gallery': return t('titlebar.gallery');
      case '/console': return t('titlebar.console');
      case '/store': return t('titlebar.market');
      case '/settings': return t('titlebar.settings');
      default: return t('titlebar.launchpad');
    }
  };

  const handleLoginClick = () => {
    setActivePage('/login');
    navigate('/login');
  };

  const handleProfileClick = () => {
    setActivePage('/profile');
    navigate('/profile');
  };

  const handleRunningClick = () => {
    setActivePage('/console');
    navigate('/console');
  };

  const isRunning = gameStatus === 'RUNNING';

  return (
    <div className="h-[40px] w-full drag-region bg-[#070b19] flex items-center justify-between px-6 select-none text-[11px] text-[#A1A1AA] font-semibold z-50 shrink-0 border-b border-white/[0.02]">
      {/* Left side: Brand Logo + Online Count + Active Tab */}
      <div className="flex items-center space-x-3 text-[10px] tracking-wide font-normal">
        <MarinLogo glyphOnly size={14} className="text-white" />
        <span className="text-white hover:text-white/80 transition-colors font-bold tracking-wider cursor-pointer" onClick={() => { setActivePage('/home'); navigate('/home'); }}>
          MarinMC Client
        </span>
        <span className="text-[#52525B] font-mono text-[9px] bg-white/5 px-2 py-0.5 rounded border border-white/[0.03]">
          {version ? `v${version}` : 'v1.0.8'}
        </span>

        {/* Vertical divider */}
        <div className="w-[1px] h-3 bg-white/[0.08]" />

        {/* Online Count */}
        <div className="flex items-center space-x-1.5 bg-white/[0.02] border border-white/[0.04] px-2 py-0.5 rounded-lg">
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#259457] animate-pulse' : 'bg-[#EF4444]'}`} />
          <span className={`${isOnline ? 'text-white/80' : 'text-[#EF4444]'} font-bold`}>
            {isOnline ? (
              onlineCount !== null ? (
                `${onlineCount.toLocaleString()} ${t('titlebar.online')}`
              ) : (
                t('titlebar.connecting')
              )
            ) : t('titlebar.offline')}
          </span>
        </div>

        {/* Vertical divider */}
        <div className="w-[1px] h-3 bg-white/[0.08]" />

        {/* Active Page Name */}
        <span className="text-white font-extrabold uppercase tracking-widest text-[9.5px]">
          {getPageTitle()}
        </span>
      </div>

      {/* Right side: Inbox, User/Login button, Instance counter, Window controls */}
      <div className="flex items-center space-x-4 no-drag">
        {/* Instances Running */}
        <button 
          onClick={handleRunningClick}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-[9.5px] font-extrabold uppercase ${
            isRunning 
              ? 'bg-[#259457]/15 border-[#259457]/30 text-[#259457] shadow-[0_0_10px_rgba(37,148,87,0.15)] hover:bg-[#259457]/25' 
              : 'bg-white/5 border-white/[0.05] text-[#A1A1AA] hover:bg-white/10 hover:text-white'
          }`}
          title={isRunning ? t('titlebar.openConsole') : t('titlebar.noRunningGame')}
        >
          <span>{isRunning ? '1' : '0'} {t('titlebar.runningInstance')}</span>
          <ExternalLink className="w-3 h-3" />
        </button>

        {/* Inbox Bell Container */}
        <div className="relative" ref={inboxRef}>
          <button 
            onClick={() => setInboxOpen(!inboxOpen)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all relative ${
              inboxOpen 
                ? 'bg-[#2D7DD2]/15 border-[#2D7DD2]/30 text-white' 
                : 'bg-white/5 border-white/[0.05] text-[#A1A1AA] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#2D7DD2] rounded-full border-2 border-[#070b19] shadow-[0_0_6px_#2D7DD2]" />
            )}
          </button>
          
          {inboxOpen && (
            <InboxPopover onClose={() => setInboxOpen(false)} />
          )}
        </div>

        {/* Login or User profile */}
        {session ? (
          <button 
            onClick={handleProfileClick}
            className="flex items-center gap-2 px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/[0.05] rounded-lg transition-all"
            title={t('titlebar.goToProfile')}
          >
            <img 
              src={session.avatar} 
              alt="" 
              className="w-4 h-4 rounded bg-black/20 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = STEVE_AVATAR_FALLBACK;
              }}
            />
            <span className="text-white font-extrabold text-[9.5px] max-w-[80px] truncate">{session.name}</span>
          </button>
        ) : (
          <button 
            onClick={handleLoginClick}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#2D7DD2]/10 hover:bg-[#2D7DD2]/20 border border-[#2D7DD2]/30 rounded-lg text-white font-extrabold text-[9.5px] uppercase transition-all"
          >
            <LogIn className="w-3 h-3 text-[#2D7DD2]" />
            <span>{t('titlebar.login')}</span>
          </button>
        )}

        {/* Window controls separator */}
        <div className="w-[1px] h-3 bg-white/[0.08]" />

        {/* Window Controls */}
        <div className="flex items-center space-x-0.5">
          {/* Minimize */}
          <button
            onClick={handleMinimize}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 text-[#A1A1AA] hover:text-white transition-all duration-150"
            title="Minimize"
          >
            <Minus className="w-3 h-3" />
          </button>

          {/* Maximize */}
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#52525B]/20 cursor-not-allowed"
            title="Maximize (Disabled)"
            disabled
          >
            <Square className="w-3 h-3" />
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#EF4444] text-[#A1A1AA] hover:text-white transition-all duration-150"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
