import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MarinLogo from '../components/MarinLogo.tsx';

import loginBg from '../../assets/login-bg.png';

export default function LoginPage() {
  const { t } = useTranslation();
  const [showOfflineForm, setShowOfflineForm] = useState(false);
  const [username, setUsername] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { session, loginWithCracked, loginWithMicrosoft, isLoading, error, clearError } = useAuthStore();

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      navigate('/home');
    }
  }, [session, navigate]);

  const handleMicrosoftLogin = async () => {
    clearError();
    setLocalError(null);
    try {
      await loginWithMicrosoft();
    } catch (err: any) {
      setLocalError(err.message || t('login.microsoftError'));
    }
  };

  const handleOfflineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    if (username.trim().length < 3) {
      setLocalError(t('login.validationError'));
      return;
    }
    await loginWithCracked(username.trim());
  };

  const hasError = !!error || !!localError;

  const openExternal = (url: string) => {
    if (window.electronAPI) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="flex w-full h-[calc(100vh-40px)] overflow-hidden relative text-white font-sans select-none">
      {/* ===== LEFT PANEL ===== */}
      <div className="w-1/2 h-full bg-[#0a0809] flex flex-col items-center justify-between py-8 px-12 relative z-10">

        {/* Top-left branding */}
        <div className="self-start flex items-center gap-2 text-[11px] text-[#52525B] font-medium">
          <MarinLogo glyphOnly size={14} className="text-white/60" />
          <span className="text-white/60">MarinMC Client</span>
          <span className="text-white/20">|</span>
          <span>Build 0.9.2</span>
        </div>

        {/* Center content */}
        <div className="flex flex-col items-center w-full max-w-[380px]">
          {/* M Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4"
          >
            <MarinLogo size={80} />
          </motion.div>

          {/* Brand Name */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center mb-10"
          >
            <h1 className="text-3xl tracking-wide">
              <span className="font-light">MarinMC</span>{' '}
              <span className="font-bold italic">Client</span>
            </h1>
          </motion.div>

          {/* Microsoft Login Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleMicrosoftLogin}
            disabled={isLoading}
            className="w-full py-3.5 bg-white hover:bg-gray-100 text-[#1a1a1a] rounded-xl font-semibold text-sm flex items-center justify-center gap-3 transition-all shadow-lg disabled:opacity-50 mb-3"
          >
            {isLoading && !showOfflineForm ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{t('login.logInWith')}</span>
                {/* Microsoft Logo */}
                <svg width="18" height="18" viewBox="0 0 21 21">
                  <rect x="0" y="0" width="10" height="10" fill="#f25022" />
                  <rect x="11" y="0" width="10" height="10" fill="#7fba00" />
                  <rect x="0" y="11" width="10" height="10" fill="#00a4ef" />
                  <rect x="11" y="11" width="10" height="10" fill="#ffb900" />
                </svg>
                <span className="font-bold">Microsoft</span>
              </>
            )}
          </motion.button>

          {/* Offline Login Toggle */}
          <AnimatePresence mode="wait">
            {!showOfflineForm ? (
              <motion.button
                key="offline-toggle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowOfflineForm(true)}
                className="text-[11px] text-[#52525B] hover:text-[#A1A1AA] font-medium transition-colors flex items-center gap-1 mt-2"
              >
                <span>{t('login.orPlayOffline')}</span>
                <ChevronRight className="w-3 h-3" />
              </motion.button>
            ) : (
              <motion.form
                key="offline-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleOfflineSubmit}
                className="w-full mt-3 space-y-2.5"
              >
                <div className="flex items-center bg-[#111111] border border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-[#2D7DD2]/50 transition-all">
                  <img
                    src={`https://mc-heads.net/avatar/${/^[a-zA-Z0-9_]{3,16}$/.test(username.trim()) ? encodeURIComponent(username.trim()) : 'Steve'}/20`}
                    alt="avatar"
                    className="w-5 h-5 rounded bg-black/25 mr-2.5"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/20';
                    }}
                  />
                  <input
                    type="text"
                    placeholder={t('login.usernamePlaceholder')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    className="bg-transparent border-none outline-none text-xs w-full text-white placeholder-white/25 font-medium"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-[#1a1a1a] hover:bg-[#222222] border border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    t('login.submitButton')
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowOfflineForm(false); setLocalError(null); }}
                  className="w-full text-[10px] text-[#52525B] hover:text-[#A1A1AA] font-medium transition-colors"
                >
                  {t('login.backToMicrosoft')}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Error Display */}
          <AnimatePresence>
            {hasError && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[10px] text-red-400 font-semibold mt-3 flex items-center justify-center bg-red-500/10 border border-red-500/20 py-2 px-3 rounded-xl w-full text-center"
              >
                {localError || error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Social Icons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-3 mt-10"
          >
            {/* Discord */}
            <button
              onClick={() => openExternal('https://discord.gg/marinmc')}
              className="w-11 h-11 rounded-xl bg-[#111111] border border-white/10 hover:border-white/25 flex items-center justify-center text-white/60 hover:text-white transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z" />
              </svg>
            </button>

            {/* X / Twitter */}
            <button
              onClick={() => openExternal('https://x.com/marinmc')}
              className="w-11 h-11 rounded-xl bg-[#111111] border border-white/10 hover:border-white/25 flex items-center justify-center text-white/60 hover:text-white transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>

            {/* Instagram */}
            <button
              onClick={() => openExternal('https://instagram.com/marinmc')}
              className="w-11 h-11 rounded-xl bg-[#111111] border border-white/10 hover:border-white/25 flex items-center justify-center text-white/60 hover:text-white transition-all"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </button>

            {/* YouTube */}
            <button
              onClick={() => openExternal('https://youtube.com/@marinmc')}
              className="w-11 h-11 rounded-xl bg-[#111111] border border-white/10 hover:border-white/25 flex items-center justify-center text-white/60 hover:text-white transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </button>
          </motion.div>
        </div>

        {/* Footer Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 text-[10px] text-[#3f3f46]"
        >
          <button onClick={() => openExternal('https://marinmc.com/privacy')} className="hover:text-[#A1A1AA] transition-colors">{t('login.privacyPolicy')}</button>
          <span>•</span>
          <button onClick={() => openExternal('https://marinmc.com/terms')} className="hover:text-[#A1A1AA] transition-colors">{t('login.termsOfService')}</button>
          <span>•</span>
          <button onClick={() => openExternal('https://marinmc.com/support')} className="hover:text-[#A1A1AA] transition-colors">{t('login.support')}</button>
        </motion.div>
      </div>

      {/* ===== RIGHT PANEL — Background Image ===== */}
      <div className="w-1/2 h-full relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${loginBg})` }}
        />
        {/* Subtle gradient overlay on left edge for blend */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0809] via-transparent to-transparent w-[80px]" />
        
        {/* Subtle N watermark on the image */}
        <div className="absolute bottom-1/3 right-1/4 opacity-[0.08]">
          <svg className="w-32 h-32 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 20V4h3.5l4.5 8 4.5-8H18v16h-3V9l-3.5 6h-3L5 9v11H2z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
