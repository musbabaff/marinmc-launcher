import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore.ts';
import { HardDrive, Cpu, ShieldAlert, FolderOpen, Save, RefreshCcw, Check, Terminal, Languages } from 'lucide-react';

export default function SettingsPage() {
  const settings = useSettingsStore();

  const [ramValue, setRamValue] = useState(settings.ram);
  const [jvmArgsVal, setJvmArgsVal] = useState(settings.jvmArgs);
  const [launcherDirVal, setLauncherDirVal] = useState(settings.launcherDir);
  const [javaPathVal, setJavaPathVal] = useState(settings.javaPath);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state with store values upon loading
  useEffect(() => {
    setRamValue(settings.ram);
    setJvmArgsVal(settings.jvmArgs);
    setLauncherDirVal(settings.launcherDir);
    setJavaPathVal(settings.javaPath);
  }, [settings.ram, settings.jvmArgs, settings.launcherDir, settings.javaPath]);

  const handleSave = () => {
    settings.saveSettings({
      ram: ramValue,
      jvmArgs: jvmArgsVal,
      launcherDir: launcherDirVal,
      javaPath: javaPathVal,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleReset = () => {
    // Reset to defaults
    setRamValue(4096);
    setJvmArgsVal("-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch");
    setJavaPathVal("Bundled Java");
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
            <h2 className="text-xl font-bold tracking-tight">Launcher Ayarları</h2>
            <p className="text-xs text-brand-textMuted mt-0.5">Sistem ve Minecraft çalıştırma ayarlarını yapılandırın</p>
          </div>

          <div className="flex items-center space-x-2 no-drag">
            <button
              onClick={handleReset}
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#131622] hover:bg-brand-cardHover border border-white/5 text-brand-textMuted hover:text-brand-text flex items-center space-x-1.5 transition-colors"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              <span>Sıfırla</span>
            </button>
            
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-brand-accent hover:bg-brand-accentHover text-white flex items-center space-x-1.5 shadow-glow-purple transition-all"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-200" />
                  <span className="text-green-200">Kaydedildi</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Kaydet</span>
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
                  <span>Bellek (RAM) Ataması</span>
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
                  <span>En az (1.0 GB)</span>
                  <span>Önerilen (4.0 GB)</span>
                  <span>Maksimum ({getRamInGb(settings.totalSystemRAM)} GB)</span>
                </div>
              </div>

              {ramValue > settings.totalSystemRAM * 0.75 && (
                <div className="p-3 bg-brand-gold/10 border border-brand-gold/20 rounded-xl flex items-start space-x-2 text-brand-gold text-[10px]">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Fiziksel belleğinizin %75'inden fazlasını atadınız. Bu durum işletim sisteminizde yavaşlamalara neden olabilir.
                  </span>
                </div>
              )}
            </div>

            {/* Java Path Configuration card */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
              <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                <FolderOpen className="w-4 h-4 text-brand-accent" />
                <span>Java Çalıştırma Dosyası</span>
              </label>
              <input
                type="text"
                value={javaPathVal}
                onChange={(e) => setJavaPathVal(e.target.value)}
                placeholder="Örn: C:\Program Files\Java\jdk-17\bin\java.exe"
                className="w-full px-4 py-3 rounded-xl glass-input text-xs font-semibold text-white placeholder-white/20"
              />
              <span className="text-[10px] text-brand-textMuted block leading-relaxed px-0.5">
                Varsayılan ayar, sisteminizde kurulu olan uyumlu sürümü otomatik seçecektir.
              </span>
            </div>
          </div>

          {/* Right panel: JVM Arguments and Launcher Path */}
          <div className="space-y-6">
            {/* JVM Arguments */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
              <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                <Terminal className="w-4 h-4 text-brand-accent" />
                <span>JVM Argümanları (Parametreler)</span>
              </label>
              <textarea
                value={jvmArgsVal}
                onChange={(e) => setJvmArgsVal(e.target.value)}
                rows={3}
                placeholder="Java sanal makine parametreleri..."
                className="w-full px-4 py-3 rounded-xl glass-input text-xs font-semibold text-white placeholder-white/20 resize-none font-mono leading-relaxed"
              />
              <span className="text-[10px] text-brand-textMuted block leading-relaxed px-0.5">
                İleri düzey Java optimizasyon kodları. Hatalı parametreler oyunun açılmasını engelleyebilir.
              </span>
            </div>

            {/* Game Location directory */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
              <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                <HardDrive className="w-4 h-4 text-brand-accent" />
                <span>Oyun Dizini (Kurulum Yolu)</span>
              </label>
              <input
                type="text"
                value={launcherDirVal}
                onChange={(e) => setLauncherDirVal(e.target.value)}
                placeholder="Örn: C:\Users\Kullanıcı\AppData\Roaming\.marinmc"
                className="w-full px-4 py-3 rounded-xl glass-input text-xs font-semibold text-white placeholder-white/20"
              />
              <span className="text-[10px] text-brand-textMuted block leading-relaxed px-0.5">
                Mod paketleri, haritalar ve kaynak paketleri bu dizine indirilecektir.
              </span>
            </div>
          </div>
        </div>

        {/* Language Selector */}
        <div className="mt-6">
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
              <Languages className="w-4 h-4 text-brand-accent" />
              <span>Dil / Language</span>
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
                      {lang.code === 'tr' ? 'Arayüz dili' : 'Interface language'}
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
        <span>Sistem İşletim Sistemi: <strong className="text-brand-text">{settings.osName}</strong></span>
        <span>MarinMC Minecraft Network © 2026</span>
      </div>
    </div>
  );
}
