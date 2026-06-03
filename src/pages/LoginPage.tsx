import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.ts';
import { Shield, Sparkles, AlertCircle, Compass, Gamepad2, Disc, Send, Globe } from 'lucide-react';
import { DISCORD_URL, TELEGRAM_URL, WEBSITE_URL } from '../lib/constants.ts';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [method, setMethod] = useState<'cracked' | 'ms'>('cracked');
  const navigate = useNavigate();
  
  const { session, loginWithCracked, loginWithMicrosoft, isLoading, error, clearError } = useAuthStore();

  useEffect(() => {
    // If user already logged in, redirect to servers
    if (session) {
      navigate('/servers');
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (method === 'cracked') {
      if (!username.trim()) return;
      await loginWithCracked(username);
    } else {
      await loginWithMicrosoft();
    }
  };

  const handleMicrosoftLogin = async () => {
    clearError();
    await loginWithMicrosoft();
  };

  return (
    <div className="flex-1 h-full w-full flex relative overflow-hidden bg-launcher-bg bg-cover bg-center">
      {/* Background overlay/haze */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D15] via-transparent to-[#0B0D15]/80 z-0"></div>

      {/* Decorative neon ambient gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-brand-accent/15 blur-[80px] pointer-events-none z-0"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-brand-gold/5 blur-[120px] pointer-events-none z-0"></div>

      {/* Brand & Socials Section */}
      <div className="w-1/2 h-full flex flex-col justify-between p-10 z-10 select-none">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-brand-accent/20 border border-brand-accent/30 shadow-glow-purple">
            <Shield className="w-6 h-6 text-brand-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-brand-text">MARINMC</h1>
            <p className="text-[10px] text-brand-textMuted tracking-widest font-semibold uppercase">Official Launcher</p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-extrabold tracking-tight leading-snug">
            Sınırsız Bir <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-purple-400">Minecraft</span> Macerası Seni Bekliyor!
          </h2>
          <p className="text-xs text-brand-textMuted max-w-sm leading-relaxed">
            Türkiye'nin en gelişmiş survival ve skyblock oyun dünyasına katıl. Hemen karakterini seç ve oynamaya başla!
          </p>
        </div>

        {/* Social Links */}
        <div className="flex items-center space-x-4 no-drag">
          <a
            href={WEBSITE_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-2 text-xs text-brand-textMuted hover:text-brand-text transition-colors duration-200"
          >
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Web Sitesi</span>
          </a>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-2 text-xs text-brand-textMuted hover:text-brand-text transition-colors duration-200"
          >
            <Disc className="w-4 h-4 text-brand-accent" />
            <span>Discord</span>
          </a>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-2 text-xs text-brand-textMuted hover:text-brand-text transition-colors duration-200"
          >
            <Send className="w-4 h-4 text-blue-400" />
            <span>Telegram</span>
          </a>
        </div>
      </div>

      {/* Login Card Form */}
      <div className="w-1/2 h-full flex items-center justify-center p-10 z-10 no-drag">
        <div className="w-[360px] glass-panel rounded-2xl p-8 shadow-2xl relative border border-white/[0.04] bg-[#131622]/90">
          <div className="mb-6 text-center">
            <h3 className="text-lg font-bold">Hesap Girişi</h3>
            <p className="text-[11px] text-brand-textMuted mt-1">Oyuna bağlanmak için bir yöntem seçin</p>
          </div>

          {/* Error panel */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start space-x-2 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Authentication Method Selector Tabs */}
          <div className="flex border-b border-white/5 mb-6">
            <button
              type="button"
              onClick={() => { setMethod('cracked'); clearError(); }}
              className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-all ${
                method === 'cracked'
                  ? 'border-brand-accent text-brand-text'
                  : 'border-transparent text-brand-textMuted hover:text-brand-text'
              }`}
            >
              Cracked Giriş
            </button>
            <button
              type="button"
              onClick={() => { setMethod('ms'); clearError(); }}
              className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-all ${
                method === 'ms'
                  ? 'border-brand-accent text-brand-text'
                  : 'border-transparent text-brand-textMuted hover:text-brand-text'
              }`}
            >
              Microsoft Premium
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {method === 'cracked' ? (
              <div className="space-y-1.5">
                <label className="text-[10px] text-brand-textMuted tracking-wider font-bold uppercase">Kullanıcı Adı</label>
                <input
                  type="text"
                  placeholder="Karakter Adı girin..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-xl glass-input text-xs font-semibold text-white placeholder-white/20"
                />
                <span className="text-[9px] text-brand-textMuted block leading-relaxed">
                  Skininizin görünmesi için oyun içi kayıtlı karakter adınızı yazın.
                </span>
              </div>
            ) : (
              <div className="py-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-brand-accentLight border border-brand-accent/20 flex items-center justify-center mx-auto text-brand-accent animate-pulse">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold">Orijinal Minecraft Hesabı</p>
                  <p className="text-[10px] text-brand-textMuted px-4 leading-relaxed">
                    Sistem sizi güvenli bir şekilde Microsoft Xbox Live sunucuları ile yetkilendirecektir.
                  </p>
                </div>
              </div>
            )}

            {method === 'cracked' ? (
              <button
                type="submit"
                disabled={isLoading || !username.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-brand-accent to-purple-600 hover:from-brand-accentHover hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-glow-purple hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Gamepad2 className="w-4 h-4" />
                    <span>Hemen Oyna</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 text-white text-xs font-bold rounded-xl shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Compass className="w-4 h-4" />
                    <span>Microsoft Account ile Bağlan</span>
                  </>
                )}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
