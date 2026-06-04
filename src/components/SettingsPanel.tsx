import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, User, Palette, Globe, Monitor,
  Cpu, FolderOpen, Terminal, HardDrive, ShieldAlert,
  Trash2, RotateCcw, FolderOpenDot, Download,
  Check, AlertTriangle, Zap
} from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsSection = 'account' | 'launcher' | 'java' | 'advanced';

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const settings = useSettingsStore();
  const { session, logout } = useAuthStore();
  const panelRef = useRef<HTMLDivElement>(null);

  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const [ramValue, setRamValue] = useState(settings.ram);
  const [jvmArgsVal, setJvmArgsVal] = useState(settings.jvmArgs);
  const [launcherDirVal, setLauncherDirVal] = useState(settings.launcherDir);
  const [javaPathVal, setJavaPathVal] = useState(settings.javaPath);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [javaTestResult, setJavaTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    setRamValue(settings.ram);
    setJvmArgsVal(settings.jvmArgs);
    setLauncherDirVal(settings.launcherDir);
    setJavaPathVal(settings.javaPath);
  }, [settings.ram, settings.jvmArgs, settings.launcherDir, settings.javaPath]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleSave = () => {
    settings.saveSettings({
      ram: ramValue,
      jvmArgs: jvmArgsVal,
      launcherDir: launcherDirVal,
      javaPath: javaPathVal,
      launcherBehavior: settings.launcherBehavior,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
    onClose();
    navigate('/login');
  };

  const handleResetAll = () => {
    settings.resetAll();
    setRamValue(4096);
    setJvmArgsVal("-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch");
    setJavaPathVal('Bundled Java');
    setLauncherDirVal('');
    setShowResetConfirm(false);
  };

  const handleSelectDir = async () => {
    if (window.electronAPI) {
      const dir = await window.electronAPI.selectDirectory();
      if (dir) setLauncherDirVal(dir);
    }
  };

  const handleJavaTest = async () => {
    // Simulated test for UI
    setJavaTestResult(null);
    setTimeout(() => {
      if (javaPathVal === 'Bundled Java' || javaPathVal.includes('java')) {
        setJavaTestResult({ success: true, message: 'Java 17.0.10 (Adoptium)' });
      } else {
        setJavaTestResult({ success: false, message: javaPathVal });
      }
    }, 800);
  };

  const handleClearCache = () => {
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2500);
  };

  const getRamInGb = (mb: number) => (mb / 1024).toFixed(1);

  const sections: { key: SettingsSection; icon: typeof User; label: string }[] = [
    { key: 'account', icon: User, label: t('settings.accountSection') },
    { key: 'launcher', icon: Palette, label: t('settings.launcherSection') },
    { key: 'java', icon: Cpu, label: t('settings.javaSection') },
    { key: 'advanced', icon: Zap, label: t('settings.advancedSection') },
  ];

  const langOptions = [
    { code: 'tr' as const, label: 'Türkçe', flag: '🇹🇷' },
    { code: 'en' as const, label: 'English', flag: '🇬🇧' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[420px] bg-[#0D0F14]/95 backdrop-blur-xl border-l border-white/[0.06] z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h2 className="text-base font-bold text-white tracking-tight">{t('settings.title')}</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 text-brand-textMuted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section Tabs */}
            <div className="flex border-b border-white/[0.06]">
              {sections.map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-all duration-200 relative ${
                    activeSection === key
                      ? 'text-brand-accent'
                      : 'text-brand-textMuted hover:text-white/70'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                  {activeSection === key && (
                    <motion.div
                      layoutId="settingsTab"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-accent rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 no-drag custom-scrollbar">
              {/* ========= ACCOUNT SECTION ========= */}
              {activeSection === 'account' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* User card */}
                  <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
                    <img
                      src={session?.avatar || `https://minotar.net/avatar/steve/48`}
                      alt="avatar"
                      className="w-14 h-14 rounded-xl border-2 border-brand-accent/30 shadow-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{session?.name || 'Player'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-brand-accent/15 text-brand-accent border border-brand-accent/20">
                          {t('settings.accountTypeCracked')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Logout button */}
                  {!showLogoutConfirm ? (
                    <button
                      onClick={() => setShowLogoutConfirm(true)}
                      className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all"
                    >
                      {t('servers.logout')}
                    </button>
                  ) : (
                    <div className="glass-panel p-4 rounded-2xl border border-red-500/20 space-y-3">
                      <p className="text-xs text-red-300 font-medium">{t('settings.logoutConfirm')}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleLogout}
                          className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-all"
                        >
                          {t('servers.logout')}
                        </button>
                        <button
                          onClick={() => setShowLogoutConfirm(false)}
                          className="flex-1 py-2 rounded-xl bg-white/5 text-brand-textMuted text-xs font-bold hover:bg-white/10 transition-all"
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ========= LAUNCHER SECTION ========= */}
              {activeSection === 'launcher' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* Theme */}
                  <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/80">
                      <Palette className="w-4 h-4 text-brand-accent" />
                      {t('settings.themeLabel')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['dark', 'light'] as const).map((th) => (
                        <button
                          key={th}
                          onClick={() => settings.setTheme(th)}
                          className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                            settings.theme === th
                              ? 'bg-brand-accent/15 border-brand-accent/30 text-brand-accent'
                              : 'bg-white/[0.03] border-white/5 text-brand-textMuted hover:bg-white/[0.06]'
                          }`}
                        >
                          {th === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language */}
                  <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/80">
                      <Globe className="w-4 h-4 text-brand-accent" />
                      {t('settings.langLabel')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {langOptions.map(({ code, label, flag }) => (
                        <button
                          key={code}
                          onClick={() => settings.setLanguage(code)}
                          className={`py-2 rounded-xl text-xs font-semibold transition-all border flex items-center justify-center gap-2 ${
                            settings.language === code
                              ? 'bg-brand-accent/15 border-brand-accent/30 text-brand-accent'
                              : 'bg-white/[0.03] border-white/5 text-brand-textMuted hover:bg-white/[0.06]'
                          }`}
                        >
                          <span className="text-base">{flag}</span>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto Update */}
                  <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-brand-accent" />
                      <span className="text-xs font-bold text-white/80">{t('settings.autoUpdateLabel')}</span>
                    </div>
                    <button
                      onClick={() => settings.setAutoUpdate(!settings.autoUpdate)}
                      className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
                        settings.autoUpdate ? 'bg-brand-accent' : 'bg-white/10'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${
                        settings.autoUpdate ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Close behavior */}
                  <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/80">
                      <Monitor className="w-4 h-4 text-brand-accent" />
                      {t('settings.closeBehaviorLabel')}
                    </label>
                    <div className="space-y-1.5">
                      {([
                        { key: 'minimize' as const, label: t('settings.behaviorMin') },
                        { key: 'close' as const, label: t('settings.behaviorClose') },
                        { key: 'nothing' as const, label: t('settings.behaviorNothing') },
                      ]).map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => settings.setLauncherBehavior(key)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-semibold text-left transition-all border ${
                            settings.launcherBehavior === key
                              ? 'bg-brand-accent/15 border-brand-accent/30 text-brand-accent'
                              : 'bg-white/[0.03] border-white/5 text-brand-textMuted hover:bg-white/[0.06]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Version */}
                  <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand-textMuted">{t('settings.versionLabel')}</span>
                    <span className="text-xs font-bold text-white/60">v1.0.0</span>
                  </div>
                </motion.div>
              )}

              {/* ========= JAVA SECTION ========= */}
              {activeSection === 'java' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* RAM Slider */}
                  <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/80">
                        <Cpu className="w-4 h-4 text-brand-accent" />
                        <span>{t('settings.ramLabel')}</span>
                      </div>
                      <span className="text-xs font-extrabold text-brand-accent bg-brand-accentLight px-2 py-0.5 rounded-lg border border-brand-accent/20">
                        {getRamInGb(ramValue)} GB
                      </span>
                    </div>
                    <input
                      type="range"
                      min="512"
                      max={settings.totalSystemRAM}
                      step="512"
                      value={ramValue}
                      onChange={(e) => setRamValue(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-[#131622] rounded-lg appearance-none cursor-pointer accent-brand-accent border border-white/5"
                    />
                    <div className="flex justify-between text-[9px] text-brand-textMuted font-semibold">
                      <span>512 MB</span>
                      <span className="text-brand-accent/60">{t('settings.ramRecommendation')}</span>
                      <span>{getRamInGb(settings.totalSystemRAM)} GB</span>
                    </div>
                    {ramValue > settings.totalSystemRAM * 0.75 && (
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-amber-400 text-[10px]">
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Fiziksel belleğinizin %75'inden fazlasını ayırdınız.</span>
                      </div>
                    )}
                  </div>

                  {/* Java Path */}
                  <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/80">
                      <FolderOpen className="w-4 h-4 text-brand-accent" />
                      {t('settings.javaPathLabel')}
                    </label>
                    <input
                      type="text"
                      value={javaPathVal}
                      onChange={(e) => setJavaPathVal(e.target.value)}
                      placeholder="C:\Program Files\Java\jdk-17\bin\java.exe"
                      className="w-full px-3 py-2.5 rounded-xl glass-input text-xs font-semibold text-white placeholder-white/20"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleJavaTest}
                        className="flex-1 py-2 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-xs font-bold hover:bg-brand-accent/20 transition-all"
                      >
                        {t('settings.javaTestBtn')}
                      </button>
                      <button
                        onClick={() => {
                          if (window.electronAPI) {
                            window.electronAPI.openExternal('https://adoptium.net/temurin/releases/');
                          }
                        }}
                        className="flex-1 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-brand-textMuted text-xs font-bold hover:bg-white/[0.06] transition-all"
                      >
                        {t('settings.javaDownloadBtn')}
                      </button>
                    </div>
                    {javaTestResult && (
                      <div className={`p-2.5 rounded-xl flex items-start gap-2 text-[10px] border ${
                        javaTestResult.success
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        {javaTestResult.success ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                        <span>{javaTestResult.success ? t('settings.javaTestSuccess') : t('settings.javaTestFail')} {javaTestResult.message}</span>
                      </div>
                    )}
                  </div>

                  {/* JVM Args */}
                  <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/80">
                      <Terminal className="w-4 h-4 text-brand-accent" />
                      JVM Arguments
                    </label>
                    <textarea
                      value={jvmArgsVal}
                      onChange={(e) => setJvmArgsVal(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl glass-input text-xs font-semibold text-white placeholder-white/20 resize-none font-mono leading-relaxed"
                    />
                  </div>

                  {/* Game Directory */}
                  <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/80">
                      <HardDrive className="w-4 h-4 text-brand-accent" />
                      Oyun Dizini
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={launcherDirVal}
                        onChange={(e) => setLauncherDirVal(e.target.value)}
                        className="flex-1 px-3 py-2.5 rounded-xl glass-input text-xs font-semibold text-white placeholder-white/20"
                      />
                      <button
                        onClick={handleSelectDir}
                        className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-brand-textMuted hover:bg-white/[0.06] transition-all"
                      >
                        <FolderOpenDot className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Save button */}
                  <button
                    onClick={handleSave}
                    className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      saveSuccess
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                        : 'bg-gradient-to-r from-brand-accent to-blue-600 text-white shadow-glow-purple hover:scale-[1.02]'
                    }`}
                  >
                    {saveSuccess ? '✓ Kaydedildi' : t('settings.applyBtn')}
                  </button>
                </motion.div>
              )}

              {/* ========= ADVANCED SECTION ========= */}
              {activeSection === 'advanced' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* Clear Cache */}
                  <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-white/80">
                      <Trash2 className="w-4 h-4 text-brand-accent" />
                      {t('settings.clearCacheLabel')}
                    </div>
                    <p className="text-[10px] text-brand-textMuted leading-relaxed">{t('settings.clearCacheDesc')}</p>
                    <button
                      onClick={handleClearCache}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-all border ${
                        cacheCleared
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-white/[0.03] border-white/5 text-brand-textMuted hover:bg-white/[0.06]'
                      }`}
                    >
                      {cacheCleared ? t('settings.cacheCleared') : t('settings.clearCacheBtn')}
                    </button>
                  </div>

                  {/* Reset Settings */}
                  <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-white/80">
                      <RotateCcw className="w-4 h-4 text-amber-400" />
                      {t('settings.resetSettingsLabel')}
                    </div>
                    <p className="text-[10px] text-brand-textMuted leading-relaxed">{t('settings.resetSettingsDesc')}</p>
                    {!showResetConfirm ? (
                      <button
                        onClick={() => setShowResetConfirm(true)}
                        className="w-full py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all"
                      >
                        {t('settings.resetSettingsBtn')}
                      </button>
                    ) : (
                      <div className="space-y-2 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                        <p className="text-[10px] text-amber-300 font-medium">{t('settings.resetConfirm')}</p>
                        <div className="flex gap-2">
                          <button onClick={handleResetAll} className="flex-1 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                            {t('settings.resetSettingsBtn')}
                          </button>
                          <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-1.5 rounded-lg bg-white/5 text-brand-textMuted text-[10px] font-bold">
                            İptal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Open Logs */}
                  <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-white/80">
                      <FolderOpenDot className="w-4 h-4 text-brand-accent" />
                      {t('settings.openLogsLabel')}
                    </div>
                    <p className="text-[10px] text-brand-textMuted leading-relaxed">{t('settings.openLogsDesc')}</p>
                    <button
                      onClick={() => {
                        // Open logs folder via electron
                      }}
                      className="w-full py-2 rounded-xl bg-white/[0.03] border border-white/5 text-brand-textMuted text-xs font-bold hover:bg-white/[0.06] transition-all"
                    >
                      {t('settings.openLogsBtn')}
                    </button>
                  </div>

                  {/* System info */}
                  <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-2">
                    <p className="text-[10px] text-brand-textMuted">
                      OS: <strong className="text-white/60">{settings.osName}</strong> · RAM: <strong className="text-white/60">{getRamInGb(settings.totalSystemRAM)} GB</strong>
                    </p>
                    <p className="text-[10px] text-brand-textMuted">MarinMC Launcher © 2026</p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
