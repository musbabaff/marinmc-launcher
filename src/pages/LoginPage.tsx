import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MarinLogo from '../components/MarinLogo.tsx';
import { STEVE_AVATAR_FALLBACK } from '../lib/constants.ts';

import loginBg from '../../assets/login-bg.png';

export default function LoginPage() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [buildVersion, setBuildVersion] = useState('');

  const navigate = useNavigate();
  const { session, loginWithCracked, isLoading, error, clearError } = useAuthStore();

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      navigate('/home');
    }
  }, [session, navigate]);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.getVersion) {
      window.electronAPI.getVersion().then(setBuildVersion);
    }
  }, []);

  const handleOfflineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    if (username.trim().length < 3) {
      setLocalError(t('login.validationError'));
      return;
    }
    if (password.length < 6) {
      setLocalError(t('login.passwordMinLength'));
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setLocalError(t('login.passwordMismatch'));
      return;
    }
    try {
      await loginWithCracked(username.trim(), password, isRegister);
    } catch (err: any) {
      setLocalError(err.message || t('login.authFailed'));
    }
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
      <div className="w-1/2 h-full bg-[#070b19] flex flex-col items-center justify-between py-8 px-12 relative z-10">

        {/* Top-left branding */}
        <div className="self-start flex items-center gap-2 text-[11px] text-[#52525B] font-medium">
          <MarinLogo glyphOnly size={14} className="opacity-60" />
          <span className="text-white/60">MarinMC Client</span>
          <span className="text-white/20">|</span>
          <span>{buildVersion ? `v${buildVersion}` : 'v1.2.1'}</span>
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

          {/* Login Form */}
          <form
            onSubmit={handleOfflineSubmit}
            className="w-full mt-3 space-y-2.5"
          >
            {/* Mode Selector Tab */}
            <div className="flex w-full bg-white/[0.03] rounded-xl p-1 border border-white/5 mb-1">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setLocalError(null); }}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider ${
                  !isRegister ? 'bg-[#2D7DD2] text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                {t('login.loginTab')}
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setLocalError(null); }}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider ${
                  isRegister ? 'bg-[#2D7DD2] text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                {t('login.registerTab')}
              </button>
            </div>

            {/* Username Field */}
            <div className="flex items-center bg-[#070b19] border border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-[#2D7DD2]/50 transition-all">
              <img
                src={`https://minotar.net/avatar/${/^[a-zA-Z0-9_]{3,16}$/.test(username.trim()) ? encodeURIComponent(username.trim()) : 'Steve'}/20`}
                alt="avatar"
                className="w-5 h-5 rounded bg-black/25 mr-2.5 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = STEVE_AVATAR_FALLBACK;
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

            {isRegister && (
              <div className="flex items-center bg-[#070b19] border border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-[#2D7DD2]/50 transition-all">
                <svg className="w-4 h-4 text-white/30 mr-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <input
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-transparent border-none outline-none text-xs w-full text-white placeholder-white/25 font-medium"
                />
              </div>
            )}

            {/* Password Field */}
            <div className="flex items-center bg-[#070b19] border border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-[#2D7DD2]/50 transition-all">
              <svg className="w-4 h-4 text-white/30 mr-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0110 0v4"></path>
              </svg>
              <input
                type="password"
                placeholder={isRegister ? t('login.setPasswordPlaceholder') : t('login.enterPasswordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="bg-transparent border-none outline-none text-xs w-full text-white placeholder-white/25 font-medium"
              />
            </div>

            {isRegister && (
              <div className="flex items-center bg-[#070b19] border border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-[#2D7DD2]/50 transition-all">
                <svg className="w-4 h-4 text-white/30 mr-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4"></path>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0110 0v4"></path>
                </svg>
                <input
                  type="password"
                  placeholder={t('login.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-transparent border-none outline-none text-xs w-full text-white placeholder-white/25 font-medium"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#2D7DD2]/20 hover:bg-[#2D7DD2]/30 border border-[#2D7DD2]/40 text-[#2D7DD2] hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                isRegister ? t('login.registerAndLogin') : t('login.loginTab')
              )}
            </button>
          </form>

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
              className="w-11 h-11 rounded-xl bg-[#0f172a]/80 border border-white/10 hover:border-white/25 flex items-center justify-center text-white/60 hover:text-white transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z" />
              </svg>
            </button>

            {/* X / Twitter */}
            <button
              onClick={() => openExternal('https://x.com/marinmc')}
              className="w-11 h-11 rounded-xl bg-[#0f172a]/80 border border-white/10 hover:border-white/25 flex items-center justify-center text-white/60 hover:text-white transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>

            {/* Instagram */}
            <button
              onClick={() => openExternal('https://instagram.com/marinmc')}
              className="w-11 h-11 rounded-xl bg-[#0f172a]/80 border border-white/10 hover:border-white/25 flex items-center justify-center text-white/60 hover:text-white transition-all"
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
              className="w-11 h-11 rounded-xl bg-[#0f172a]/80 border border-white/10 hover:border-white/25 flex items-center justify-center text-white/60 hover:text-white transition-all"
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
        <div className="absolute inset-0 bg-gradient-to-r from-[#070b19] via-transparent to-transparent w-[80px]" />
        
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
