import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/appStore.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { useNotificationStore } from '../stores/notificationStore.ts';
import { Minus, Square, X, Bell, LogIn, ExternalLink, ChevronDown, LogOut, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  
  const { session, logout, profiles, switchProfile, removeProfile, addOfflineProfile } = useAuthStore();
  const { notifications } = useNotificationStore();
  
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [version, setVersion] = useState('');
  const [inboxOpen, setInboxOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [offlineAddOpen, setOfflineAddOpen] = useState(false);
  const [newOfflineName, setNewOfflineName] = useState('');
  const [newOfflinePassword, setNewOfflinePassword] = useState('');
  const [profileAddError, setProfileAddError] = useState<string | null>(null);
  const [profileAddSuccess, setProfileAddSuccess] = useState<string | null>(null);
  
  const inboxRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
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
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
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
          <div className="relative animate-fade-in" ref={profileRef}>
            <button 
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/[0.05] rounded-lg transition-all cursor-pointer"
              title="Hesapları Yönet"
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
              <ChevronDown className={`w-3 h-3 text-white/50 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {profileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute right-0 mt-2 bg-[#070b19]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl w-64 py-2.5 z-50 text-[10px] font-black"
                >
                  <div className="px-3.5 pb-2 border-b border-white/[0.05] mb-2 flex items-center justify-between">
                    <span className="text-[#52525B] uppercase tracking-wider text-[8px] font-black">Hesaplar</span>
                  </div>

                  {/* Display profiles list */}
                  <div className="max-h-36 overflow-y-auto space-y-1 px-1.5 custom-scrollbar">
                    {profiles.map((p) => {
                      const isCurrent = p.id === session.id;
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
                                (e.target as HTMLImageElement).src = STEVE_AVATAR_FALLBACK;
                              }}
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-white truncate font-bold text-[9.5px]">{p.name}</span>
                              <span className="text-[7px] text-[#52525B] uppercase leading-none font-bold">
                                {p.type === 'ms' ? t('home.accountPremium') : t('home.accountCracked')}
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
                              className="p-1 rounded text-[#52525B] hover:text-red-400 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
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
                            await addOfflineProfile(newOfflineName.trim(), newOfflinePassword, false);
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
                        <div className="flex items-center bg-[#070b19] border border-white/10 rounded-lg px-2 py-1 focus-within:border-[#2D7DD2]/50">
                          <input
                            type="text"
                            placeholder="Kullanıcı Adı"
                            value={newOfflineName}
                            onChange={(e) => setNewOfflineName(e.target.value)}
                            className="bg-transparent border-none outline-none text-[8.5px] w-full text-white placeholder-white/20 font-bold"
                            autoFocus
                          />
                        </div>
                        <div className="flex items-center bg-[#070b19] border border-white/10 rounded-lg px-2 py-1 focus-within:border-[#2D7DD2]/50">
                          <input
                            type="password"
                            placeholder="Şifre giriniz"
                            value={newOfflinePassword}
                            onChange={(e) => setNewOfflinePassword(e.target.value)}
                            className="bg-transparent border-none outline-none text-[8.5px] w-full text-white placeholder-white/20 font-bold"
                          />
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="submit"
                            className="flex-1 py-1.5 bg-[#2D7DD2] hover:bg-[#4A9AE8] text-white rounded font-bold text-[8px] uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Giriş Yap
                          </button>
                          <button
                            type="button"
                            onClick={() => { setOfflineAddOpen(false); setProfileAddError(null); }}
                            className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[#A1A1AA] hover:text-white rounded font-bold text-[8px] uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            İptal
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => { setOfflineAddOpen(true); setProfileAddError(null); }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-[8px] uppercase tracking-wider transition-all cursor-pointer"
                        >
                          <UserPlus className="w-3 h-3 text-[#2D7DD2]" />
                          <span>Hesap Ekle</span>
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
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-red-400 hover:bg-red-500/10 text-left border-t border-white/[0.05] mt-2.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('servers.logout')}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
