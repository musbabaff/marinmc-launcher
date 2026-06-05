import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore.ts';
import { useTranslation } from 'react-i18next';
import { HardDrive, Cpu, ShieldAlert, FolderOpen, Save, RefreshCcw, Check, Terminal, Languages } from 'lucide-react';

export default function SettingsPage() {
  const { t } = useTranslation();
  const settings = useSettingsStore();

  const [ramValue, setRamValue] = useState(settings.ram);
  const [jvmArgsVal, setJvmArgsVal] = useState(settings.jvmArgs);
  const [launcherDirVal, setLauncherDirVal] = useState(settings.launcherDir);
  const [javaPathVal, setJavaPathVal] = useState(settings.javaPath);
  const [smartJvmValue, setSmartJvmValue] = useState(settings.smartJvmOpt);
  const [discordRpcValue, setDiscordRpcValue] = useState(settings.discordRpcEnabled);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state with store values upon loading
  useEffect(() => {
    setRamValue(settings.ram);
    setJvmArgsVal(settings.jvmArgs);
    setLauncherDirVal(settings.launcherDir);
    setJavaPathVal(settings.javaPath);
    setSmartJvmValue(settings.smartJvmOpt);
    setDiscordRpcValue(settings.discordRpcEnabled);
  }, [settings.ram, settings.jvmArgs, settings.launcherDir, settings.javaPath, settings.smartJvmOpt, settings.discordRpcEnabled]);

  const handleSave = () => {
    settings.saveSettings({
      ram: ramValue,
      jvmArgs: jvmArgsVal,
      launcherDir: launcherDirVal,
      javaPath: javaPathVal,
      smartJvmOpt: smartJvmValue,
      discordRpcEnabled: discordRpcValue,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleReset = () => {
    // Reset to defaults
    setRamValue(4096);
    setJvmArgsVal("-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch");
    setJavaPathVal("Bundled Java");
    setSmartJvmValue(true);
    setDiscordRpcValue(true);
  };

  const getRamInGb = (mb: number) => {
    return (mb / 1024).toFixed(1);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto h-full flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{t('settings.titleLauncher')}</h2>
            <p className="text-xs text-brand-textMuted mt-0.5">{t('settings.subtitleLauncher')}</p>
          </div>

          <div className="flex items-center space-x-2 no-drag">
            <button
              onClick={handleReset}
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#131622] hover:bg-brand-cardHover border border-white/5 text-brand-textMuted hover:text-brand-text flex items-center space-x-1.5 transition-colors"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              <span>{t('settings.resetBtn')}</span>
            </button>
            
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-brand-accent hover:bg-brand-accentHover text-white flex items-center space-x-1.5 shadow-glow-purple transition-all"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-200" />
                  <span className="text-green-200">{t('settings.saved')}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{t('settings.save')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Configurations grid */}
        <div className="grid grid-cols-2 gap-6 no-drag">
          {/* Left panel: RAM and Java path */}
          <div className="space-y-6">
            {/* RAM slider card */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                  <Cpu className="w-4 h-4 text-brand-accent" />
                  <span>{t('settings.ramLabel')}</span>
                </div>
                <span className="text-xs font-extrabold text-brand-accent bg-brand-accentLight px-2 py-0.5 rounded-lg border border-brand-accent/20">
                  {getRamInGb(ramValue)} GB / {getRamInGb(settings.totalSystemRAM)} GB
                </span>
              </div>

              <div className="space-y-2">
                <input
                  type="range"
                  min="1024"
                  max={settings.totalSystemRAM}
                  step="512"
                  value={ramValue}
                  onChange={(e) => setRamValue(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-[#131622] rounded-lg appearance-none cursor-pointer accent-brand-accent border border-white/5"
                />
                <div className="flex justify-between text-[9px] text-brand-textMuted font-semibold px-0.5">
                  <span>{t('settings.ramMinLabel')}</span>
                  <span>{t('settings.ramRecLabel')}</span>
                  <span>{t('settings.ramMaxLabel')} ({getRamInGb(settings.totalSystemRAM)} GB)</span>
                </div>
              </div>

              {ramValue > settings.totalSystemRAM * 0.75 && (
                <div className="p-3 bg-brand-gold/10 border border-brand-gold/20 rounded-xl flex items-start space-x-2 text-brand-gold text-[10px]">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {t('settings.ramWarning')}
                  </span>
                </div>
              )}
            </div>

            {/* Java Path Configuration card */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
              <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                <FolderOpen className="w-4 h-4 text-brand-accent" />
                <span>{t('settings.javaPathLabel')}</span>
              </label>
              <input
                type="text"
                value={javaPathVal}
                onChange={(e) => setJavaPathVal(e.target.value)}
                placeholder={t('settings.javaPathPlaceholder')}
                className="w-full px-4 py-3 rounded-xl glass-input text-xs font-semibold text-white placeholder-white/20"
              />
              <span className="text-[10px] text-brand-textMuted block leading-relaxed px-0.5">
                {t('settings.javaPathDesc')}
              </span>
            </div>

            {/* Smart JVM Card */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="space-y-1 pr-4">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                  <Cpu className="w-4 h-4 text-brand-accent" />
                  <span>{t('settings.smartJvmOptLabel')}</span>
                </div>
                <span className="text-[10px] text-brand-textMuted block leading-relaxed">
                  {t('settings.smartJvmOptDesc')}
                </span>
              </div>
              <button
                onClick={() => setSmartJvmValue(!smartJvmValue)}
                className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none shrink-0 ${
                  smartJvmValue ? 'bg-brand-accent' : 'bg-[#131622] border border-white/5'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                    smartJvmValue ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Right panel: JVM Arguments and Launcher Path */}
          <div className="space-y-6">
            {/* JVM Arguments */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
              <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                <Terminal className="w-4 h-4 text-brand-accent" />
                <span>{t('settings.jvmArgs')}</span>
              </label>
              <textarea
                value={jvmArgsVal}
                onChange={(e) => setJvmArgsVal(e.target.value)}
                rows={3}
                placeholder={t('settings.jvmArgsPlaceholder')}
                className="w-full px-4 py-3 rounded-xl glass-input text-xs font-semibold text-white placeholder-white/20 resize-none font-mono leading-relaxed"
              />
              <span className="text-[10px] text-brand-textMuted block leading-relaxed px-0.5">
                {t('settings.jvmArgsDescLong')}
              </span>
            </div>

            {/* Game Location directory */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
              <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                <HardDrive className="w-4 h-4 text-brand-accent" />
                <span>{t('settings.gameDirLabel')}</span>
              </label>
              <input
                type="text"
                value={launcherDirVal}
                onChange={(e) => setLauncherDirVal(e.target.value)}
                placeholder={t('settings.gameDirPlaceholder')}
                className="w-full px-4 py-3 rounded-xl glass-input text-xs font-semibold text-white placeholder-white/20"
              />
              <span className="text-[10px] text-brand-textMuted block leading-relaxed px-0.5">
                {t('settings.gameDirDesc')}
              </span>
            </div>

            {/* Discord RPC Card */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="space-y-1 pr-4">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                  <svg className="w-4 h-4 text-brand-accent fill-current" viewBox="0 0 127.14 96.36">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c1-.73,2-1.51,2.94-2.31a75.48,75.48,0,0,0,72.1,0c1,.8,2,1.58,2.94,2.31a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.87,48.12,123.6,25.32,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
                  </svg>
                  <span>{t('settings.discordRpcLabel')}</span>
                </div>
                <span className="text-[10px] text-brand-textMuted block leading-relaxed">
                  {t('settings.discordRpcDesc')}
                </span>
              </div>
              <button
                onClick={() => setDiscordRpcValue(!discordRpcValue)}
                className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none shrink-0 ${
                  discordRpcValue ? 'bg-brand-accent' : 'bg-[#131622] border border-white/5'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                    discordRpcValue ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Language Selector */}
        <div className="mt-6">
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
              <Languages className="w-4 h-4 text-brand-accent" />
              <span>{t('settings.langSelector')}</span>
            </div>
            <div className="flex gap-3">
              {[
                { code: 'tr' as const, label: 'Türkçe', flag: '🇹🇷' },
                { code: 'en' as const, label: 'English', flag: '🇬🇧' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    settings.setLanguage(lang.code);
                  }}
                  className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    settings.language === lang.code
                      ? 'bg-[#2D7DD2]/10 border-[#2D7DD2]/40 shadow-[0_0_12px_rgba(45,125,210,0.15)]'
                      : 'bg-[#111111] border-white/[0.06] hover:border-white/10'
                  }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <div className="text-left">
                    <span className={`text-xs font-bold block ${
                      settings.language === lang.code ? 'text-white' : 'text-[#A1A1AA]'
                    }`}>{lang.label}</span>
                    <span className="text-[9px] text-[#52525B] font-medium">
                      {t('settings.langSubtitle')}
                    </span>
                  </div>
                  {settings.language === lang.code && (
                    <Check className="w-4 h-4 text-[#2D7DD2] ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Branding banner */}
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-brand-textMuted">
        <span>{t('settings.osLabel')} <strong className="text-brand-text">{settings.osName}</strong></span>
        <span>MarinMC Minecraft Network © 2026</span>
      </div>
    </div>
  );
}
