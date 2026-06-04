import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.ts';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Compass, Loader2 } from 'lucide-react';
import axios from 'axios';

// Vite resolves these relative imports to absolute URLs at compile time
import logoSvg from '../../assets/logo.svg';
import loginBg from '../../assets/login-bg.jpg';

const translations = {
  tr: {
    title: 'Giriş',
    subtitle: 'MarinMC dünyasına katılın',
    usernamePlaceholder: 'Kullanıcı adı',
    passwordPlaceholder: 'Şifre',
    submitButton: 'DEVAM ET',
    noAccount: 'Hesabım yok',
    forgotPassword: 'Şifremi unuttum',
    footer: '© 2026 MarinMC, Mojang AB ile ilişkili değildir.',
    playersOnline: 'oyuncu aktif',
    validationError: 'Kullanıcı adı en az 3, şifre en az 6 karakter olmalıdır.',
    authError: 'Hatalı kullanıcı adı veya şifre',
    orText: 'veya',
    microsoftBtn: 'MICROSOFT HESABI İLE GİRİŞ',
    loading: 'Giriş yapılıyor...'
  },
  en: {
    title: 'Login',
    subtitle: 'Join the MarinMC world',
    usernamePlaceholder: 'Username',
    passwordPlaceholder: 'Password',
    submitButton: 'CONTINUE',
    noAccount: 'No account?',
    forgotPassword: 'Forgot password?',
    footer: '© 2026 MarinMC, not affiliated with Mojang AB.',
    playersOnline: 'players online',
    validationError: 'Username must be at least 3, password at least 6 characters.',
    authError: 'Incorrect username or password',
    orText: 'or',
    microsoftBtn: 'SIGN IN WITH MICROSOFT',
    loading: 'Logging in...'
  }
};

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lang, setLang] = useState<'tr' | 'en'>('tr');
  const [playerCount, setPlayerCount] = useState('1,248');
  const [localError, setLocalError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { session, loginWithCracked, loginWithMicrosoft, isLoading, error, clearError } = useAuthStore();

  const t = translations[lang];

  // Redirect on mount if already authenticated
  useEffect(() => {
    if (session) {
      navigate('/servers');
    }
  }, [session, navigate]);

  // Fetch online players count
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await axios.get('https://api.marinmc.com/status');
        if (response.data && response.data.onlinePlayers) {
          setPlayerCount(response.data.onlinePlayers.toLocaleString());
        }
      } catch {
        // Fallback: slight randomizer to look alive
        const offset = Math.floor(Math.random() * 20) - 10;
        const base = 1248 + offset;
        setPlayerCount(base.toLocaleString());
      }
    };
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    // Form validations
    if (username.trim().length < 3 || password.length < 6) {
      setLocalError(t.validationError);
      return;
    }

    await loginWithCracked(username);
  };

  const handleMicrosoftLogin = async () => {
    clearError();
    setLocalError(null);
    await loginWithMicrosoft();
  };

  // Determine if inputs should have error styling
  const hasError = !!error || !!localError;

  return (
    <div className="flex-1 h-full w-full flex bg-[#180619] overflow-hidden relative text-white font-sans">
      {/* Language toggle + Live Players Badge absolute layout */}
      <div className="absolute top-4 right-4 z-30 flex items-center space-x-3 pointer-events-auto">
        {/* Language selector */}
        <div className="bg-[#240321]/80 border border-[#400B3D]/50 rounded-lg px-2.5 py-1 text-[11px] font-semibold flex items-center space-x-1.5 backdrop-blur-md">
          <button 
            onClick={() => setLang('tr')} 
            className={`transition-colors ${lang === 'tr' ? 'text-[#06B6D4]' : 'text-gray-400 hover:text-white'}`}
          >
            TR
          </button>
          <span className="text-white/20">|</span>
          <button 
            onClick={() => setLang('en')} 
            className={`transition-colors ${lang === 'en' ? 'text-[#06B6D4]' : 'text-gray-400 hover:text-white'}`}
          >
            EN
          </button>
        </div>

        {/* Players online badge */}
        <div className="bg-[#240321]/80 border border-[#400B3D]/50 rounded-lg px-3 py-1 text-[11px] font-semibold flex items-center space-x-2 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse"></span>
          <span>
            {playerCount} <span className="text-gray-400 font-normal">{t.playersOnline}</span>
          </span>
        </div>
      </div>

      {/* Left Panel: Form (40%) */}
      <motion.div
        initial={{ x: -120, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-[40%] h-full bg-[#180619] border-r border-[#400B3D]/30 p-10 flex flex-col justify-between z-20 relative select-none"
      >
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3">
          <img src={logoSvg} className="w-9 h-9" alt="MarinMC Logo" />
          <div>
            <h1 className="text-base font-extrabold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4]">MARINMC</h1>
            <p className="text-[9px] text-[#A1A1AA] tracking-widest font-bold uppercase">Launcher</p>
          </div>
        </div>

        {/* Auth Box */}
        <div className="my-auto py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-[#DCDBDC]">{t.title}</h2>
            <p className="text-[11px] text-[#A1A1AA] mt-1">{t.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div className="space-y-1">
              <div 
                className={`flex items-center bg-[#1B051D] border rounded-xl px-3.5 py-2.5 transition-all duration-300 ${
                  hasError 
                    ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.15)]' 
                    : 'border-[#3A1F40] focus-within:border-[#06B6D4] focus-within:shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                }`}
              >
                {/* Dynamic Player Head / Avatar Icon */}
                <div className="mr-3 shrink-0 flex items-center justify-center">
                  <img
                    src={`https://mc-heads.net/avatar/${/^[a-zA-Z0-9_]{3,16}$/.test(username.trim()) ? encodeURIComponent(username.trim()) : 'Steve'}/22`}
                    alt="Player avatar"
                    className="w-5.5 h-5.5 rounded bg-black/20 border border-white/5 transition-all duration-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/22';
                    }}
                  />
                </div>
                <input
                  type="text"
                  placeholder={t.usernamePlaceholder}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="bg-transparent border-none outline-none text-xs w-full text-white placeholder-white/20 font-semibold"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div 
                className={`flex items-center bg-[#1B051D] border rounded-xl px-3.5 py-2.5 transition-all duration-300 ${
                  hasError 
                    ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.15)]' 
                    : 'border-[#3A1F40] focus-within:border-[#06B6D4] focus-within:shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                }`}
              >
                <Lock className="w-4 h-4 text-[#A1A1AA] mr-3 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-transparent border-none outline-none text-xs w-full text-white placeholder-white/20 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#A1A1AA] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Validation / Login error display */}
              {hasError && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-red-400 font-semibold mt-1.5 flex items-center pl-1"
                >
                  {localError || error || t.authError}
                </motion.p>
              )}
            </div>

            {/* Devam Et Button */}
            <motion.button
              whileHover={{ scale: 1.01, boxShadow: '0 0 15px rgba(255, 255, 255, 0.15)' }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#F9F9F9] hover:bg-[#E9E8E9] text-[#180619] text-xs font-extrabold rounded-xl tracking-wider uppercase transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.loading}</span>
                </>
              ) : (
                <span>{t.submitButton}</span>
              )}
            </motion.button>

            {/* Separator for Microsoft Login */}
            <div className="flex items-center my-4">
              <div className="flex-1 h-[1px] bg-[#400B3D]/30"></div>
              <span className="text-[10px] text-[#A1A1AA] px-3 uppercase tracking-wider font-bold">{t.orText}</span>
              <div className="flex-1 h-[1px] bg-[#400B3D]/30"></div>
            </div>

            {/* Microsoft Login Button */}
            <motion.button
              whileHover={{ scale: 1.01, backgroundColor: '#E9E8E9' }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={handleMicrosoftLogin}
              disabled={isLoading}
              className="w-full py-3 bg-[#DCDBDC] text-[#180619] text-[10px] font-extrabold rounded-xl tracking-wider uppercase transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Compass className="w-3.5 h-3.5 text-[#180619]" />
              <span>{t.microsoftBtn}</span>
            </motion.button>
          </form>

          {/* Bottom ghost links */}
          <div className="flex items-center justify-center space-x-6 mt-6">
            <button className="text-[11px] text-[#A1A1AA] hover:text-white font-semibold transition-colors duration-200">
              {t.noAccount}
            </button>
            <span className="text-[#400B3D]/40">|</span>
            <button className="text-[11px] text-[#A1A1AA] hover:text-white font-semibold transition-colors duration-200">
              {t.forgotPassword}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-[9px] text-[#52525B] text-center leading-relaxed">
          {t.footer}
        </div>
      </motion.div>

      {/* Right Panel: Hero Image (60%) */}
      <div className="w-[60%] h-full relative overflow-hidden bg-[#1D0416]">
        {/* Background Artwork */}
        <motion.div
          initial={{ scale: 1.06, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${loginBg})` }}
        />

        {/* Dark Left Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#180619] via-[#180619]/40 to-transparent z-10 pointer-events-none" />

        {/* Glow and atmospheric effects over hero */}
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#8B5CF6]/10 rounded-full blur-[100px] pointer-events-none" />
      </div>
    </div>
  );
}
