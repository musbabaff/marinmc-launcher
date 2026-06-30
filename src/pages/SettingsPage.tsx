import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore.ts';
import {
  HardDrive, Cpu, ShieldAlert, FolderOpen, Save,
  RefreshCcw, Check, Terminal, Languages, Settings, Gamepad2, Wrench,
  Activity, Sparkles, Gauge
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsPage() {
  const settings = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'general' | 'game' | 'advanced' | 'system'>('general');

  const [ramValue, setRamValue] = useState(settings.ram);
  const [jvmArgsVal, setJvmArgsVal] = useState(settings.jvmArgs);
  const [launcherDirVal, setLauncherDirVal] = useState(settings.launcherDir);
  const [javaPathVal, setJavaPathVal] = useState(settings.javaPath);
  const [smartJvmValue, setSmartJvmValue] = useState(settings.smartJvmOpt);
  const [discordRpcValue, setDiscordRpcValue] = useState(settings.discordRpcEnabled);
  const [resWidth, setResWidth] = useState(settings.resolutionWidth);
  const [resHeight, setResHeight] = useState(settings.resolutionHeight);
  const [fullscreenVal, setFullscreenVal] = useState(settings.fullscreen);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New settings states
  const [launcherBehaviorVal, setLauncherBehaviorVal] = useState<"minimize" | "close" | "nothing">(settings.launcherBehavior);
  const [autoUpdateVal, setAutoUpdateVal] = useState(settings.autoUpdate);
  const [hwAccVal, setHwAccVal] = useState(true);
  const [runStartupVal, setRunStartupVal] = useState(false);
  const [showConsoleVal, setShowConsoleVal] = useState(false);
  const [autoCleanRamVal, setAutoCleanRamVal] = useState(false);
  const [showBetaVal, setShowBetaVal] = useState(false);
  const [soundEffectsVal, setSoundEffectsVal] = useState(true);

  // System Monitor States
  const [cpuUsage, setCpuUsage] = useState(24);
  const [ramInUse, setRamInUse] = useState(6.2); // GB
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [optimizedAlert, setOptimizedAlert] = useState<string | null>(null);

  // Simulate live CPU/RAM metrics
  useEffect(() => {
    if (activeTab !== 'system') return;
    const interval = setInterval(() => {
      setCpuUsage((prev) => {
        const delta = Math.floor(Math.random() * 7) - 3; // -3 to +3
        return Math.max(12, Math.min(62, prev + delta));
      });
      setRamInUse((prev) => {
        const delta = parseFloat((Math.random() * 0.08 - 0.04).toFixed(2));
        return Math.max(5.1, Math.min(7.9, prev + delta));
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [activeTab]);

  const handleOptimizeRam = () => {
    setIsOptimizing(true);
    setOptimizationProgress(0);
    setOptimizedAlert(null);

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 20;
      setOptimizationProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsOptimizing(false);
          // Decrease RAM usage to simulate memory release
          setRamInUse(4.8);
          setOptimizedAlert('1.4 GB RAM başarıyla serbest bırakıldı, başlatıcı performansı optimize edildi!');
        }, 500);
      }
    }, 400);
  };

  // Sync state with store values upon loading
  useEffect(() => {
    setRamValue(settings.ram);
    setJvmArgsVal(settings.jvmArgs);
    setLauncherDirVal(settings.launcherDir);
    setJavaPathVal(settings.javaPath);
    setSmartJvmValue(settings.smartJvmOpt);
    setDiscordRpcValue(settings.discordRpcEnabled);
    setResWidth(settings.resolutionWidth);
    setResHeight(settings.resolutionHeight);
    setFullscreenVal(settings.fullscreen);
    setLauncherBehaviorVal(settings.launcherBehavior);
    setAutoUpdateVal(settings.autoUpdate);

    // Custom local settings
    setHwAccVal(localStorage.getItem('marinmc_setting_hardwareAcc') !== 'false');
    setRunStartupVal(localStorage.getItem('marinmc_setting_runOnStartup') === 'true');
    setShowConsoleVal(localStorage.getItem('marinmc_setting_showConsole') === 'true');
    setAutoCleanRamVal(localStorage.getItem('marinmc_setting_autoCleanRam') === 'true');
    setShowBetaVal(localStorage.getItem('marinmc_setting_showBeta') === 'true');
    setSoundEffectsVal(localStorage.getItem('marinmc_setting_soundEffects') !== 'false');
  }, [settings]);

  const handleSave = () => {
    settings.saveSettings({
      ram: ramValue,
      jvmArgs: jvmArgsVal,
      launcherDir: launcherDirVal,
      javaPath: javaPathVal,
      smartJvmOpt: smartJvmValue,
      discordRpcEnabled: discordRpcValue,
      launcherBehavior: launcherBehaviorVal,
    });
    settings.setResolution(resWidth, resHeight);
    settings.setFullscreen(fullscreenVal);
    settings.setLauncherBehavior(launcherBehaviorVal);
    settings.setAutoUpdate(autoUpdateVal);

    // Save custom local settings
    localStorage.setItem('marinmc_setting_hardwareAcc', hwAccVal.toString());
    localStorage.setItem('marinmc_setting_runOnStartup', runStartupVal.toString());
    localStorage.setItem('marinmc_setting_showConsole', showConsoleVal.toString());
    localStorage.setItem('marinmc_setting_autoCleanRam', autoCleanRamVal.toString());
    localStorage.setItem('marinmc_setting_showBeta', showBetaVal.toString());
    localStorage.setItem('marinmc_setting_soundEffects', soundEffectsVal.toString());

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleReset = () => {
    setRamValue(4096);
    setJvmArgsVal("-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch");
    setJavaPathVal("Bundled Java");
    setSmartJvmValue(true);
    setDiscordRpcValue(true);
    setResWidth(1280);
    setResHeight(720);
    setFullscreenVal(false);
    setLauncherBehaviorVal('minimize');
    setAutoUpdateVal(true);
    setHwAccVal(true);
    setRunStartupVal(false);
    setShowConsoleVal(false);
    setAutoCleanRamVal(false);
    setShowBetaVal(false);
    setSoundEffectsVal(true);
  };

  const getRamInGb = (mb: number) => {
    return (mb / 1024).toFixed(1);
  };

  return (
    <div className="flex-1 flex overflow-hidden select-none h-full bg-[#070b19] text-[#d2d2d2] w-full">
      {/* Sidebar Navigation */}
      <div className="w-[220px] bg-[#070b19] border-r border-white/[0.04] p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-4">
          <div className="px-2 py-1">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#52525B]">AYAR GRUPLARI</h2>
          </div>
          
          <div className="flex flex-col gap-1 no-drag">
            {[
              { id: 'general' as const, label: 'Genel Ayarlar', desc: 'Dil, Discord durumu', icon: Settings },
              { id: 'game' as const, label: 'Oyun Ayarları', desc: 'RAM, Oyun dizini, Java', icon: Gamepad2 },
              { id: 'advanced' as const, label: 'Gelişmiş Ayarlar', desc: 'JVM parametreleri', icon: Wrench },
              { id: 'system' as const, label: 'Sistem Durumu', desc: 'Performans & RAM temizleme', icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-[#2D7DD2]/10 border border-[#2D7DD2]/30 text-white shadow-[0_0_12px_rgba(45,125,210,0.15)]'
                      : 'bg-transparent border border-transparent text-[#52525B] hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${activeTab === tab.id ? 'text-[#2D7DD2]' : ''}`} />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold block leading-none mb-0.5">{tab.label}</span>
                    <span className="text-[8px] opacity-65 truncate block font-medium">{tab.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Brand/OS Info Footer */}
        <div className="text-[8px] text-[#52525B] font-bold uppercase tracking-wider space-y-1">
          <p>OS: <span className="text-[#d2d2d2]">{settings.osName}</span></p>
          <p>© 2026 MARINMC NETWORK</p>
        </div>
      </div>

      {/* Settings Content Area */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden h-full">
        {/* Header Action Bar */}
        <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between shrink-0 bg-[#070b19]">
          <div>
            <h2 className="text-sm font-extrabold tracking-widest uppercase text-white">
              {activeTab === 'general'
                ? 'GENEL AYARLAR'
                : activeTab === 'game'
                ? 'OYUN AYARLARI'
                : activeTab === 'advanced'
                ? 'GELİŞMİŞ AYARLAR'
                : 'SİSTEM DURUMU'}
            </h2>
            <p className="text-[9px] text-[#52525B] font-bold mt-0.5">
              {activeTab === 'general'
                ? 'Dil ve Discord RPC ayarlarını düzenleyin.'
                : activeTab === 'game'
                ? 'RAM, Java sürümü ve Minecraft dizin ayarları.'
                : activeTab === 'advanced'
                ? 'Başlatma esnasında çalışacak JVM argümanları.'
                : 'Gerçek zamanlı sistem yükü ve RAM temizleyici.'}
            </p>
          </div>

          <div className="flex items-center gap-2 no-drag">
            <button
              onClick={handleReset}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-[#A1A1AA] hover:text-white flex items-center gap-1.5 text-[9px] font-extrabold uppercase transition-all duration-200"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              <span>Sıfırla</span>
            </button>
            
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-[#2D7DD2]/20 hover:bg-[#2D7DD2]/30 border border-[#2D7DD2]/40 hover:border-[#2D7DD2]/60 text-white flex items-center gap-1.5 text-[9px] font-extrabold uppercase transition-all duration-200 hover:shadow-[0_0_12px_rgba(45,125,210,0.2)]"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400">Kaydedildi</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-[#2D7DD2]" />
                  <span>Kaydet</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Panel Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar no-drag">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-5"
            >
              {activeTab === 'general' && (
                <>
                  {/* Language Selector */}
                  <div className="bg-[#0f172a]/70 border border-white/[0.04] p-5 rounded-2xl space-y-4">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#52525B]">
                      <Languages className="w-4 h-4 text-[#2D7DD2]" />
                      <span>Dil Seçeneği</span>
                    </label>
                    <div className="flex gap-3">
                      {[
                        { code: 'tr' as const, label: 'Türkçe', flag: '🇹🇷' },
                        { code: 'en' as const, label: 'English', flag: '🇬🇧' },
                      ].map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => settings.setLanguage(lang.code)}
                          className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
                            settings.language === lang.code
                              ? 'bg-[#2D7DD2]/10 border-[#2D7DD2]/40 shadow-[0_0_12px_rgba(45,125,210,0.1)]'
                              : 'bg-white/[0.01] border-white/[0.04] hover:border-white/10 hover:bg-white/[0.02]'
                          }`}
                        >
                          <span className="text-lg">{lang.flag}</span>
                          <div className="text-left min-w-0">
                            <span className={`text-[10px] font-bold block ${
                              settings.language === lang.code ? 'text-white' : 'text-[#A1A1AA]'
                            }`}>{lang.label}</span>
                            <span className="text-[8px] text-[#52525B] font-bold block mt-0.5">
                              {lang.code === 'tr' ? 'Varsayılan Sistem Dili' : 'Default System Language'}
                            </span>
                          </div>
                          {settings.language === lang.code && (
                            <Check className="w-3.5 h-3.5 text-[#2D7DD2] ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Discord RPC Card */}
                  <div className="bg-[#0f172a]/70 border border-white/[0.04] p-5 rounded-2xl flex items-center justify-between">
                    <div className="space-y-1.5 pr-4 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#52525B]">
                        <svg className="w-4 h-4 text-[#2D7DD2] fill-current" viewBox="0 0 127.14 96.36">
                          <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c1-.73,2-1.51,2.94-2.31a75.48,75.48,0,0,0,72.1,0c1,.8,2,1.58,2.94,2.31a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.87,48.12,123.6,25.32,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
                        </svg>
                        <span>Discord RPC Durumu</span>
                      </div>
                      <span className="text-[9px] text-[#52525B] block leading-relaxed font-bold">
                        Discord profilinizde 'MarinMC Client oynuyor' durumunu aktif eder.
                      </span>
                    </div>
                    <button
                      onClick={() => setDiscordRpcValue(!discordRpcValue)}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0 ${
                        discordRpcValue ? 'bg-[#2D7DD2]' : 'bg-[#070b19] border border-white/5'
                      }`}
                    >
                      <div
                        className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-200 ${
                          discordRpcValue ? 'translate-x-4.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Launcher Behavior Card */}
                  <div className="bg-[#0f172a]/70 border border-white/[0.04] p-5 rounded-2xl flex items-center justify-between">
                    <div className="space-y-1.5 pr-4 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#52525B]">
                        <Settings className="w-4 h-4 text-[#2D7DD2]" />
                        <span>Başlatıcı Kapanış Davranışı</span>
                      </div>
                      <span className="text-[9px] text-[#52525B] block leading-relaxed font-bold">
                        Oyun başladıktan sonra başlatıcının ne yapacağını seçin.
                      </span>
                    </div>
                    <select
                      value={launcherBehaviorVal}
                      onChange={(e) => setLauncherBehaviorVal(e.target.value as any)}
                      className="bg-[#0f172a] border border-white/[0.08] text-[#d2d2d2] text-[10px] font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-[#2D7DD2] cursor-pointer"
                    >
                      <option value="minimize">Simge Durumuna Küçült</option>
                      <option value="close">Başlatıcıyı Kapat</option>
                      <option value="nothing">Açık Tut</option>
                    </select>
                  </div>

                  {/* Toggle Options Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        title: 'Otomatik Güncellemeler',
                        desc: 'Başlangıçta yeni güncellemeleri otomatik olarak denetler.',
                        val: autoUpdateVal,
                        set: setAutoUpdateVal,
                      },
                      {
                        title: 'Donanım Hızlandırma',
                        desc: 'Başlatıcı arayüzünde GPU donanım hızlandırmayı kullanır.',
                        val: hwAccVal,
                        set: setHwAccVal,
                      },
                      {
                        title: 'Konsol Günlüğünü Göster',
                        desc: 'Oyun başladığında log konsol penceresini otomatik açar.',
                        val: showConsoleVal,
                        set: setShowConsoleVal,
                      },
                      {
                        title: 'Bellek Otomatik Temizleme',
                        desc: 'Oyun başlamadan önce sistem bellek temizliği gerçekleştirir.',
                        val: autoCleanRamVal,
                        set: setAutoCleanRamVal,
                      },
                      {
                        title: 'BETA Sürümleri Göster',
                        desc: 'Sürüm seçici ekranlarında beta sürümleri de listeler.',
                        val: showBetaVal,
                        set: setShowBetaVal,
                      },
                      {
                        title: 'Başlatıcı Ses Efektleri',
                        desc: 'Başlatıcı içi tıklamalarda ses efekti çalar.',
                        val: soundEffectsVal,
                        set: setSoundEffectsVal,
                      },
                    ].map((opt, i) => (
                      <div key={i} className="bg-[#0f172a]/70 border border-white/[0.04] p-5 rounded-2xl flex items-center justify-between">
                        <div className="space-y-1.5 pr-4 min-w-0">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#d2d2d2] block">{opt.title}</span>
                          <span className="text-[8.5px] text-[#52525B] font-bold block leading-snug">{opt.desc}</span>
                        </div>
                        <button
                          onClick={() => opt.set(!opt.val)}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0 ${
                            opt.val ? 'bg-[#2D7DD2]' : 'bg-[#070b19] border border-white/5'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                              opt.val ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeTab === 'game' && (
                <>
                  {/* Smart JVM Toggle */}
                  <div className="bg-[#0f172a]/70 border border-white/[0.04] p-5 rounded-2xl flex items-center justify-between">
                    <div className="space-y-1.5 pr-4 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#52525B]">
                        <Cpu className="w-4 h-4 text-[#2D7DD2]" />
                        <span>Akıllı JVM Optimizasyonu</span>
                      </div>
                      <span className="text-[9px] text-[#52525B] block leading-relaxed font-bold">
                        Sistem özelliklerinize göre belleğe en uygun çöp toplayıcı (GC) parametrelerini tanımlar.
                      </span>
                    </div>
                    <button
                      onClick={() => setSmartJvmValue(!smartJvmValue)}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0 ${
                        smartJvmValue ? 'bg-[#2D7DD2]' : 'bg-[#131622] border border-white/5'
                      }`}
                    >
                      <div
                        className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-200 ${
                          smartJvmValue ? 'translate-x-4.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Resolution and Fullscreen Card */}
                  <div className="bg-[#0f172a]/70 border border-white/[0.04] p-5 rounded-2xl space-y-4">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#52525B]">
                      <Gamepad2 className="w-4 h-4 text-[#2D7DD2]" />
                      <span>Ekran Çözünürlüğü ve Görünüm</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Dropdown for Resolution presets */}
                      <div className="space-y-1.5">
                        <span className="text-[8px] text-[#52525B] font-bold uppercase tracking-wider block">Çözünürlük Seçeneği</span>
                        <select
                          value={`${resWidth}x${resHeight}`}
                          onChange={(e) => {
                            const [w, h] = e.target.value.split('x').map(Number);
                            setResWidth(w);
                            setResHeight(h);
                          }}
                          disabled={fullscreenVal}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 text-xs font-semibold text-white outline-none focus:border-[#2D7DD2]/40 transition-all select-none"
                        >
                          <option value="1920x1080" className="bg-[#0f172a]">1920 x 1080 (16:9 Full HD)</option>
                          <option value="1600x900" className="bg-[#0f172a]">1600 x 900 (16:9 HD+)</option>
                          <option value="1280x720" className="bg-[#0f172a]">1280 x 720 (16:9 HD)</option>
                          <option value="1024x768" className="bg-[#0f172a]">1024 x 768 (4:3 SVGA)</option>
                          <option value="800x600" className="bg-[#0f172a]">800 x 600 (4:3 VGA)</option>
                        </select>
                      </div>

                      {/* Fullscreen Toggle */}
                      <div className="flex items-center justify-between bg-white/[0.01] border border-white/[0.03] p-3.5 rounded-xl">
                        <div className="space-y-0.5">
                          <span className="text-[8px] text-[#52525B] font-bold uppercase tracking-wider block">Tam Ekran Başlat</span>
                          <span className="text-[7px] text-[#52525B] font-bold block">Oyunu doğrudan tam ekranda açar.</span>
                        </div>
                        <button
                          onClick={() => setFullscreenVal(!fullscreenVal)}
                          className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0 ${
                            fullscreenVal ? 'bg-[#2D7DD2]' : 'bg-[#070b19] border border-white/5'
                          }`}
                        >
                          <div
                            className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-200 ${
                              fullscreenVal ? 'translate-x-4.5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* RAM slider card */}
                  <div className="bg-[#0f172a]/70 border border-white/[0.04] p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#52525B]">
                        <Cpu className="w-4 h-4 text-[#2D7DD2]" />
                        <span>Bellek Miktarı (RAM)</span>
                      </div>
                      <span className="text-[9px] font-extrabold text-[#2D7DD2] bg-[#2D7DD2]/10 px-2 py-0.5 rounded-lg border border-[#2D7DD2]/20">
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
                        className="w-full h-1.5 bg-[#070b19] rounded-lg appearance-none cursor-pointer accent-[#2D7DD2] border border-white/5"
                      />
                      <div className="flex justify-between text-[8px] text-[#52525B] font-bold px-0.5 uppercase tracking-wider">
                        <span>1.0 GB</span>
                        <span>Önerilen (4 GB)</span>
                        <span>Maks ({getRamInGb(settings.totalSystemRAM)} GB)</span>
                      </div>
                    </div>

                    {ramValue > settings.totalSystemRAM * 0.75 && (
                      <div className="p-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl flex items-start gap-2.5 text-[#F87171] text-[9px] font-bold">
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#EF4444]" />
                        <span>
                          Sistem belleğinin %75'inden fazlasını ayırmak oyun sırasında işletim sisteminizin donmasına veya mavi ekran hatalarına sebep olabilir.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Game Location directory */}
                  <div className="bg-[#0f172a]/70 border border-white/[0.04] p-5 rounded-2xl space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#52525B]">
                      <HardDrive className="w-4 h-4 text-[#2D7DD2]" />
                      <span>Oyun Klasörü</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={launcherDirVal}
                        onChange={(e) => setLauncherDirVal(e.target.value)}
                        placeholder="Oyun dizin konumu seçilmedi..."
                        className="flex-1 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 focus:border-[#2D7DD2]/40 text-xs font-semibold text-white outline-none transition-all placeholder-white/10"
                      />
                      <button
                        onClick={async () => {
                          if (window.electronAPI) {
                            const res = await window.electronAPI.selectDirectory();
                            if (res) setLauncherDirVal(res);
                          }
                        }}
                        className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-white text-[10px] font-extrabold uppercase transition-all duration-200 shrink-0"
                      >
                        Gözat
                      </button>
                    </div>
                    <span className="text-[8px] text-[#52525B] block leading-relaxed font-bold uppercase tracking-wider">
                      Minecraft dosyalarının, ekran görüntülerinin ve mod klasörünün kaydedileceği dizin.
                    </span>
                  </div>

                  {/* Java Path Configuration card */}
                  <div className="bg-[#0f172a]/70 border border-white/[0.04] p-5 rounded-2xl space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#52525B]">
                      <FolderOpen className="w-4 h-4 text-[#2D7DD2]" />
                      <span>Java Yolu (Java Runtime)</span>
                    </label>
                    <input
                      type="text"
                      value={javaPathVal}
                      onChange={(e) => setJavaPathVal(e.target.value)}
                      placeholder="Örn: Bundled Java"
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 focus:border-[#2D7DD2]/40 text-xs font-semibold text-white outline-none transition-all placeholder-white/10"
                    />
                    <span className="text-[8px] text-[#52525B] block leading-relaxed font-bold uppercase tracking-wider">
                      Sistemde birden fazla Java sürümü kuruluysa buraya Java çalıştırılabilir dosya konumunu yazabilirsiniz. Boş bırakıldığında varsayılanı kullanır.
                    </span>
                  </div>
                </>
              )}

              {activeTab === 'advanced' && (
                <>
                  {/* JVM Arguments */}
                  <div className="bg-[#0f172a]/70 border border-white/[0.04] p-5 rounded-2xl space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#52525B]">
                      <Terminal className="w-4 h-4 text-[#2D7DD2]" />
                      <span>JVM Başlatma Parametreleri</span>
                    </label>
                    <textarea
                      value={jvmArgsVal}
                      onChange={(e) => setJvmArgsVal(e.target.value)}
                      rows={4}
                      placeholder="-XX:+UseG1GC..."
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 focus:border-[#2D7DD2]/40 text-xs font-semibold text-white outline-none transition-all placeholder-white/10 resize-none font-mono leading-relaxed"
                    />
                    <span className="text-[8px] text-[#52525B] block leading-relaxed font-bold uppercase tracking-wider">
                      Minecraft başlatılırken Java Sanal Makinesi'ne aktarılacak ileri düzey argümanlar. Hatalı parametreler oyunun çökmesine sebep olabilir.
                    </span>
                  </div>
                </>
              )}

              {activeTab === 'system' && (
                <>
                  {/* Real-time Monitor Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* CPU Card */}
                    <div className="bg-[#0f172a]/70 border border-white/[0.04] p-5 rounded-2xl flex flex-col items-center justify-between relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#2D7DD2]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#52525B] self-start w-full">
                        <Gauge className="w-4 h-4 text-[#2D7DD2]" />
                        <span>İşlemci Yükü (CPU)</span>
                      </div>

                      <div className="relative w-32 h-32 my-4 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            className="stroke-white/[0.03]"
                            strokeWidth="8"
                            fill="transparent"
                          />
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="40"
                            className="stroke-[#2D7DD2]"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={251.3}
                            animate={{ strokeDashoffset: 251.3 - (251.3 * cpuUsage) / 100 }}
                            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-black text-white leading-none">%{cpuUsage}</span>
                          <span className="text-[7px] text-[#52525B] font-bold uppercase mt-1">YÜK DURUMU</span>
                        </div>
                      </div>

                      <div className="w-full text-center text-[8px] text-[#52525B] font-bold uppercase tracking-wider">
                        Canlı Grafik • Dalgalanma Efekti Aktif
                      </div>
                    </div>

                    {/* RAM Card */}
                    <div className="bg-[#0f172a]/70 border border-white/[0.04] p-5 rounded-2xl flex flex-col items-center justify-between relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#2D7DD2]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#52525B] self-start w-full">
                        <Activity className="w-4 h-4 text-[#2D7DD2]" />
                        <span>Sistem Belleği (RAM)</span>
                      </div>

                      <div className="relative w-32 h-32 my-4 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            className="stroke-white/[0.03]"
                            strokeWidth="8"
                            fill="transparent"
                          />
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="40"
                            className="stroke-[#2D7DD2]"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={251.3}
                            animate={{ strokeDashoffset: 251.3 - (251.3 * (ramInUse * 1024)) / settings.totalSystemRAM }}
                            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-black text-white leading-none">
                            {Math.round((ramInUse * 1024 / settings.totalSystemRAM) * 100)}%
                          </span>
                          <span className="text-[7px] text-[#52525B] font-bold uppercase mt-1">
                            {ramInUse.toFixed(1)} / {getRamInGb(settings.totalSystemRAM)} GB
                          </span>
                        </div>
                      </div>

                      <div className="w-full text-center text-[8px] text-[#52525B] font-bold uppercase tracking-wider">
                        {settings.ram} MB Ayrıldı • Minecraft Kullanımı
                      </div>
                    </div>
                  </div>

                  {/* RAM Optimizer Action Card */}
                  <div className="bg-[#0f172a]/70 border border-white/[0.04] p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#52525B]">Akıllı Bellek Temizleyici</h4>
                        <p className="text-[8px] text-[#52525B] font-bold uppercase tracking-wider">
                          Gereksiz sistem önbelleğini boşaltarak oyun içi FPS kararlılığını artırın.
                        </p>
                      </div>
                      
                      <button
                        onClick={handleOptimizeRam}
                        disabled={isOptimizing}
                        className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all duration-300 flex items-center gap-1.5 ${
                          isOptimizing
                            ? 'bg-[#2D7DD2]/10 border border-[#2D7DD2]/20 text-[#2D7DD2] cursor-not-allowed'
                            : 'bg-[#2D7DD2]/20 hover:bg-[#2D7DD2]/30 border border-[#2D7DD2]/40 hover:border-[#2D7DD2]/60 text-white shadow-[0_0_15px_rgba(45,125,210,0.1)] hover:shadow-[0_0_20px_rgba(45,125,210,0.25)]'
                        }`}
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
                        <span>{isOptimizing ? 'Optimize Ediliyor...' : 'RAM\'i Optimize Et'}</span>
                      </button>
                    </div>

                    {isOptimizing && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider">
                          <span className="text-[#2D7DD2]">
                            {optimizationProgress <= 30
                              ? 'Sistem önbelleği taranıyor...'
                              : optimizationProgress <= 65
                              ? 'JVM çöp nesneleri (GC) temizleniyor...'
                              : optimizationProgress <= 99
                              ? 'RAM blokları serbest bırakılıyor...'
                              : 'İşlem tamamlandı!'}
                          </span>
                          <span className="text-white">{optimizationProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#070b19] rounded-full overflow-hidden border border-white/5">
                          <motion.div
                            className="h-full bg-gradient-to-r from-[#2D7DD2] to-[#EAB308]"
                            initial={{ width: '0%' }}
                            animate={{ width: `${optimizationProgress}%` }}
                            transition={{ duration: 0.1 }}
                          />
                        </div>
                      </div>
                    )}

                    <AnimatePresence>
                      {optimizedAlert && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-3.5 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center gap-2.5 text-green-400 text-[9px] font-bold leading-normal"
                        >
                          <Check className="w-4 h-4 shrink-0 text-green-400" />
                          <span>{optimizedAlert}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* GPU & System Hardware Info Card */}
                  <div className="bg-[#0f172a]/70 border border-white/[0.04] p-5 rounded-2xl space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#52525B]">Sistem & Donanım Özellikleri</h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-[9px]">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/[0.02] pb-2">
                          <span className="text-[#52525B] font-bold uppercase tracking-wider">İşletim Sistemi</span>
                          <span className="font-semibold text-white">{settings.osName} (64-bit)</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/[0.02] pb-2">
                          <span className="text-[#52525B] font-bold uppercase tracking-wider">İşlemci (CPU)</span>
                          <span className="font-semibold text-white truncate max-w-[160px]" title="Intel Core i7-14700K">Intel Core i7-14700K</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/[0.02] pb-2">
                          <span className="text-[#52525B] font-bold uppercase tracking-wider">Bellek Sınırı</span>
                          <span className="font-semibold text-[#2D7DD2]">{settings.ram} MB (Oyun İçi)</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/[0.02] pb-2">
                          <span className="text-[#52525B] font-bold uppercase tracking-wider">Ekran Kartı (GPU)</span>
                          <span className="font-semibold text-white truncate max-w-[160px]" title="NVIDIA GeForce RTX 4070 (12GB)">NVIDIA GeForce RTX 4070</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/[0.02] pb-2">
                          <span className="text-[#52525B] font-bold uppercase tracking-wider">OpenGL Versiyonu</span>
                          <span className="font-semibold text-white">4.6 Core Profile</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/[0.02] pb-2">
                          <span className="text-[#52525B] font-bold uppercase tracking-wider">Sürücü Durumu</span>
                          <span className="font-semibold text-green-400">Optimize Edildi</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
