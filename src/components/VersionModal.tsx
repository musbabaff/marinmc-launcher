import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore.ts';
import { useAuthStore } from '../stores/authStore.ts';
import {
  X, Settings, Cpu, Monitor, Terminal, Layers,
  Compass, Sliders, Play, Trash2, FolderOpen, Save, RefreshCw, Filter, ShieldAlert, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: () => void;
}

type AdvancedTab = 'loader' | 'mods' | 'shaders' | 'worlds' | 'resources' | 'advanced';

interface ModItem {
  id: string;
  name: string;
  author: string;
  version: string;
  size: string;
  enabled: boolean;
  isCustom?: boolean;
}

const INITIAL_MODS: ModItem[] = [
  { id: '1', name: 'Litematica', author: 'masa', version: 'v0.26.3', size: '1.82 MB', enabled: true },
  { id: '2', name: 'Mod Menu', author: 'Terraformers', version: 'v17.0.0', size: '1.12 MB', enabled: true },
  { id: '3', name: 'Inventory Profiles Next', author: 'blackd', version: 'v2.3.1', size: '1.48 MB', enabled: false },
  { id: '4', name: 'Chat Patches', author: 'OBro1961', version: 'v8.0-alpha.8', size: '1.93 MB', enabled: false },
  { id: '5', name: 'FerriteCore', author: 'malte0811', version: 'v8.2.0', size: '2.16 MB', enabled: true },
  { id: '6', name: 'Sodium', author: 'jellysquid3', version: 'v0.6.0', size: '3.21 MB', enabled: true },
  { id: '7', name: 'Lithium', author: 'caffeinemc', version: 'v0.13.0', size: '1.45 MB', enabled: true },
];

export default function VersionModal({ isOpen, onClose, onLaunch }: VersionModalProps) {
  const settings = useSettingsStore();
  const session = useAuthStore((state) => state.session);

  const [activeSubOpen, setActiveSubOpen] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState(settings.selectedSubVersion);
  
  // Advanced Modal settings
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AdvancedTab>('advanced');

  // Advanced States
  const [resEnabled, setResEnabled] = useState(false);
  const [resW, setResW] = useState('1920');
  const [resH, setResH] = useState('1080');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBorderless, setIsBorderless] = useState(false);

  // RAM Memory State (overrides settings if checked)
  const [ramEnabled, setRamEnabled] = useState(false);
  const [ramVal, setRamVal] = useState(settings.ram);

  // JVM Args overrides
  const [jvmEnabled, setJvmEnabled] = useState(false);
  const [jvmVal, setJvmVal] = useState(settings.jvmArgs);

  // Mod manager state
  const [mods, setMods] = useState<ModItem[]>(INITIAL_MODS);
  const [modSearch, setModSearch] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const versions = [
    { num: '1.21', label: 'Fabric 🔷 1.21.x', subs: ['1.21.11', '1.21.10', '1.21.9', '1.21.8', '1.21.1'] },
    { num: '1.20', label: 'Forge 🛠️ 1.20.x', subs: ['1.20.4', '1.20.2', '1.20.1', '1.20.0'] },
    { num: '1.19', label: 'OptiFine 🌟 1.19.x', subs: ['1.19.4', '1.19.3', '1.19.2'] },
    { num: '1.16', label: 'Fabric 🔷 1.16.x', subs: ['1.16.5', '1.16.4', '1.16.1'] },
    { num: '1.13', label: 'Vanilla ☕ 1.13.x', subs: ['1.13.2', '1.13.1'] },
    { num: '1.12', label: 'Forge 🛠️ 1.12.x', subs: ['1.12.2', '1.12.1'] },
    { num: '1.8', label: 'Vanilla ☕ 1.8.x', subs: ['1.8.9', '1.8.8'] },
    { num: '1.7', label: 'Forge 🛠️ 1.7.x', subs: ['1.7.10', '1.7.2'] }
  ];

  const handleSelectVersion = (num: string, defaultSub: string) => {
    settings.setSelectedVersion(num);
    settings.setSelectedSubVersion(defaultSub);
    setSelectedSub(defaultSub);
  };

  const toggleSubDropdown = (e: React.MouseEvent, num: string) => {
    e.stopPropagation();
    setActiveSubOpen(activeSubOpen === num ? null : num);
  };

  const handleSelectSub = (num: string, sub: string) => {
    settings.setSelectedVersion(num);
    settings.setSelectedSubVersion(sub);
    setSelectedSub(sub);
    setActiveSubOpen(null);
  };

  const handleApplyAdvanced = () => {
    // Save overrides to settings if enabled
    if (ramEnabled) {
      settings.saveSettings({
        ram: ramVal,
        jvmArgs: jvmEnabled ? jvmVal : settings.jvmArgs,
        launcherDir: settings.launcherDir,
        javaPath: settings.javaPath
      });
    } else if (jvmEnabled) {
      settings.saveSettings({
        ram: settings.ram,
        jvmArgs: jvmVal,
        launcherDir: settings.launcherDir,
        javaPath: settings.javaPath
      });
    }
    setAdvancedOpen(false);
  };

  // Mod Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.jar')) {
        const newMod: ModItem = {
          id: `mod_${Date.now()}`,
          name: file.name.replace('.jar', ''),
          author: session?.name || 'Siz',
          version: 'v1.0.0',
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          enabled: true,
          isCustom: true
        };
        setMods([newMod, ...mods]);
      } else {
        alert('Lütfen geçerli bir .jar dosyası sürükleyin.');
      }
    }
  };

  const toggleMod = (id: string) => {
    setMods(mods.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const deleteMod = (id: string) => {
    setMods(mods.filter(m => m.id !== id));
  };

  const filteredMods = mods.filter(m => m.name.toLowerCase().includes(modSearch.toLowerCase()));

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !advancedOpen && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, advancedOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 flex items-center justify-center"
            onClick={onClose}
          >
            {/* Main Modal Panel */}
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              className="bg-[#0A0A0A] border border-[#2A2A2A] w-[720px] max-h-[500px] rounded-2xl p-6 flex flex-col relative z-40 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#1E1E1E] pb-4 mb-4">
                <div>
                  <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">Versiyon Seçimi</h2>
                  <p className="text-[10px] text-[#A1A1AA] font-bold">Oynamak istediğiniz Minecraft sürümünü belirleyin.</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-[#52525B] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid of Version Cards */}
              <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-3 pr-1 no-drag custom-scrollbar">
                {versions.map((ver) => {
                  const isCurrent = settings.selectedVersion === ver.num;
                  return (
                    <div
                      key={ver.num}
                      onClick={() => handleSelectVersion(ver.num, ver.subs[0])}
                      className={`relative rounded-xl border p-3 flex flex-col justify-between cursor-pointer transition-all duration-300 ${
                        isCurrent
                          ? 'border-[#06B6D4] bg-[#06B6D4]/5 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                          : 'border-[#1E1E1E] bg-[#111111] hover:border-[#2A2A2A] hover:bg-[#1A1A1A]'
                      }`}
                    >
                      {/* Top section */}
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                          <span className="text-xl font-black text-white">{ver.num}</span>
                          <span className="text-[9px] font-extrabold text-[#A1A1AA] uppercase">{ver.label}</span>
                        </div>

                        {/* Sub-version selector button */}
                        <div className="relative">
                          <button
                            onClick={(e) => toggleSubDropdown(e, ver.num)}
                            className="bg-[#1A1A1A] border border-[#2A2A2A] text-white px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 hover:bg-[#2A2A2A]"
                          >
                            <span>{isCurrent ? selectedSub : ver.subs[0]}</span>
                            <span className="text-[7px]">▼</span>
                          </button>
                          
                          {/* Sub-version dropdown list */}
                          <AnimatePresence>
                            {activeSubOpen === ver.num && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute right-0 mt-1 bg-[#141414] border border-[#2A2A2A] rounded-lg shadow-xl w-24 py-1 z-50 text-[10px] max-h-32 overflow-y-auto custom-scrollbar"
                              >
                                {ver.subs.map((s) => (
                                  <button
                                    key={s}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectSub(ver.num, s);
                                    }}
                                    className="w-full text-left px-2.5 py-1 text-[#A1A1AA] hover:bg-[#2A2A2A] hover:text-white font-bold"
                                  >
                                    {s}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Bottom Controls */}
                      <div className="flex items-center justify-between mt-6">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectVersion(ver.num, ver.subs[0]);
                              setAdvancedOpen(true);
                            }}
                            className="p-1 rounded bg-[#2A2A2A]/40 text-[#52525B] hover:text-white hover:bg-[#2A2A2A] transition-all"
                            title="Gelişmiş Seçenekler"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectVersion(ver.num, ver.subs[0]);
                            onLaunch();
                            onClose();
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 hover:scale-[1.02] ${
                            isCurrent
                              ? 'bg-[#06B6D4] text-black font-black'
                              : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#1A1A1A]'
                          }`}
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>Başlat</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Inner Advanced settings overlay modal */}
            <AnimatePresence>
              {advancedOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center"
                  onClick={() => setAdvancedOpen(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 15 }}
                    className="bg-[#0A0A0A] border border-[#2A2A2A] w-[680px] h-[460px] rounded-2xl flex overflow-hidden shadow-2xl relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Left Sidebar Panel */}
                    <div className="w-[160px] bg-[#111111] border-r border-[#1E1E1E] flex flex-col p-4 justify-between select-none">
                      <div className="space-y-1">
                        <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-wider block px-2.5 mb-3">Profil Menüsü</span>
                        {([
                          { key: 'loader', label: 'Başlatıcı', icon: Layers },
                          { key: 'mods', label: 'Mod Yöneticisi', icon: Compass },
                          { key: 'shaders', label: 'Görseller', icon: Sliders },
                          { key: 'worlds', label: 'Dünyalar', icon: Globe },
                          { key: 'resources', label: 'Kaynaklar', icon: Layers },
                          { key: 'advanced', label: 'Gelişmiş', icon: Settings }
                        ] as const).map(t => (
                          <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key)}
                            className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs font-bold rounded-lg text-left transition-all ${
                              activeTab === t.key
                                ? 'bg-[#8B5CF6]/15 text-[#8B5CF6]'
                                : 'text-[#A1A1AA] hover:bg-[#1A1A1A] hover:text-white'
                            }`}
                          >
                            <t.icon className="w-3.5 h-3.5" />
                            <span>{t.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Close sidebar btn */}
                      <button
                        onClick={() => setAdvancedOpen(false)}
                        className="w-full py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-[#2A2A2A] rounded-lg text-[10px] text-[#A1A1AA] hover:text-white font-extrabold transition-all"
                      >
                        Geri Dön
                      </button>
                    </div>

                    {/* Right Panel View Contents */}
                    <div className="flex-1 flex flex-col p-5">
                      {/* Header */}
                      <div className="flex justify-between items-center border-b border-[#1E1E1E] pb-3 mb-4">
                        <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                          {activeTab === 'advanced' && 'Gelişmiş Profil Ayarları'}
                          {activeTab === 'mods' && 'Mod Yöneticisi'}
                          {activeTab !== 'advanced' && activeTab !== 'mods' && `${activeTab.toUpperCase()} Seçenekleri`}
                        </h3>
                        <button
                          onClick={() => setAdvancedOpen(false)}
                          className="p-1 rounded hover:bg-white/5 text-[#52525B] hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Tab Area scrollbox */}
                      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4 text-xs">
                        
                        {/* ================== ADVANCED TAB ================== */}
                        {activeTab === 'advanced' && (
                          <>
                            {/* Warn panel */}
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-[10px] text-red-400">
                              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                              <div className="flex-1 leading-relaxed">
                                <strong className="font-bold block mb-0.5">Dikkatli İlerleyin!</strong>
                                Bu ayarların değiştirilmesi oyun performansında kararsızlıklara veya çökmelere yol açabilir.
                              </div>
                            </div>

                            {/* Custom Resolution Selector */}
                            <div className="glass-panel p-4 rounded-xl border border-[#1E1E1E] space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 font-bold text-white/90">
                                  <Monitor className="w-4 h-4 text-[#8B5CF6]" />
                                  <span>Özel Çözünürlük</span>
                                </div>
                                <button
                                  onClick={() => setResEnabled(!resEnabled)}
                                  className={`relative w-9 h-4.5 rounded-full transition-all duration-300 ${
                                    resEnabled ? 'bg-[#8B5CF6]' : 'bg-white/10'
                                  }`}
                                >
                                  <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-md transition-all duration-300 ${
                                    resEnabled ? 'left-[18px]' : 'left-0.5'
                                  }`} />
                                </button>
                              </div>
                              {resEnabled && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  className="space-y-3 pt-2"
                                >
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="number"
                                      value={resW}
                                      onChange={(e) => setResW(e.target.value)}
                                      placeholder="Genişlik"
                                      className="w-20 px-2.5 py-1.5 rounded-lg bg-[#111111] border border-[#2A2A2A] text-[10px] text-white"
                                    />
                                    <span className="text-[#52525B]">x</span>
                                    <input
                                      type="number"
                                      value={resH}
                                      onChange={(e) => setResH(e.target.value)}
                                      placeholder="Yükseklik"
                                      className="w-20 px-2.5 py-1.5 rounded-lg bg-[#111111] border border-[#2A2A2A] text-[10px] text-white"
                                    />
                                    <button
                                      onClick={() => { setResW('1920'); setResH('1080'); }}
                                      className="px-2.5 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] text-[9px] hover:bg-[#2A2A2A] rounded-lg text-white font-extrabold uppercase"
                                    >
                                      Sıfırla
                                    </button>
                                  </div>
                                  <div className="flex gap-4">
                                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-[#A1A1AA] hover:text-white">
                                      <input
                                        type="checkbox"
                                        checked={isFullscreen}
                                        onChange={(e) => setIsFullscreen(e.target.checked)}
                                        className="rounded border-[#2A2A2A] accent-[#8B5CF6]"
                                      />
                                      <span>Tam Ekran Modu</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-[#A1A1AA] hover:text-white">
                                      <input
                                        type="checkbox"
                                        checked={isBorderless}
                                        onChange={(e) => setIsBorderless(e.target.checked)}
                                        className="rounded border-[#2A2A2A] accent-[#8B5CF6]"
                                      />
                                      <span>Çerçevesiz Pencere</span>
                                    </label>
                                  </div>
                                </motion.div>
                              )}
                            </div>

                            {/* Allocated Memory Overrides */}
                            <div className="glass-panel p-4 rounded-xl border border-[#1E1E1E] space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 font-bold text-white/90">
                                  <Cpu className="w-4 h-4 text-[#8B5CF6]" />
                                  <span>Özel Bellek Tahsisi</span>
                                </div>
                                <button
                                  onClick={() => setRamEnabled(!ramEnabled)}
                                  className={`relative w-9 h-4.5 rounded-full transition-all duration-300 ${
                                    ramEnabled ? 'bg-[#8B5CF6]' : 'bg-white/10'
                                  }`}
                                >
                                  <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-md transition-all duration-300 ${
                                    ramEnabled ? 'left-[18px]' : 'left-0.5'
                                  }`} />
                                </button>
                              </div>
                              {ramEnabled && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  className="space-y-2 pt-2"
                                >
                                  <div className="flex justify-between text-[9px] text-[#A1A1AA] font-bold">
                                    <span>Tahsisi: {(ramVal / 1024).toFixed(1)} GB</span>
                                    <span>Sistem RAM: {(settings.totalSystemRAM / 1024).toFixed(1)} GB</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="512"
                                    max={settings.totalSystemRAM}
                                    step="512"
                                    value={ramVal}
                                    onChange={(e) => setRamVal(parseInt(e.target.value, 10))}
                                    className="w-full h-1 bg-[#1A1A1A] rounded-lg appearance-none cursor-pointer accent-[#8B5CF6]"
                                  />
                                </motion.div>
                              )}
                            </div>

                            {/* Custom JVM arguments overrides */}
                            <div className="glass-panel p-4 rounded-xl border border-[#1E1E1E] space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 font-bold text-white/90">
                                  <Terminal className="w-4 h-4 text-[#8B5CF6]" />
                                  <span>JVM Parametreleri Overrides</span>
                                </div>
                                <button
                                  onClick={() => setJvmEnabled(!jvmEnabled)}
                                  className={`relative w-9 h-4.5 rounded-full transition-all duration-300 ${
                                    jvmEnabled ? 'bg-[#8B5CF6]' : 'bg-white/10'
                                  }`}
                                >
                                  <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-md transition-all duration-300 ${
                                    jvmEnabled ? 'left-[18px]' : 'left-0.5'
                                  }`} />
                                </button>
                              </div>
                              {jvmEnabled && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  className="pt-2"
                                >
                                  <textarea
                                    value={jvmVal}
                                    onChange={(e) => setJvmVal(e.target.value)}
                                    rows={2}
                                    className="w-full p-2 rounded-xl bg-[#111111] border border-[#2A2A2A] text-[10px] text-white leading-normal font-mono resize-none focus:outline-none focus:border-[#8B5CF6]"
                                  />
                                </motion.div>
                              )}
                            </div>
                          </>
                        )}

                        {/* ================== MODS TAB ================== */}
                        {activeTab === 'mods' && (
                          <div className="space-y-3">
                            {/* Search and control buttons bar */}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={modSearch}
                                onChange={(e) => setModSearch(e.target.value)}
                                placeholder="Mod ara..."
                                className="flex-1 px-3 py-1.5 rounded-lg bg-[#111111] border border-[#2A2A2A] text-[10px] text-white placeholder-white/20"
                              />
                              <button className="p-1.5 rounded bg-[#1A1A1A] border border-[#2A2A2A] text-[#A1A1AA] hover:text-white" title="Yenile">
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button className="p-1.5 rounded bg-[#1A1A1A] border border-[#2A2A2A] text-[#A1A1AA] hover:text-white" title="Filtrele">
                                <Filter className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setMods(INITIAL_MODS)} className="p-1.5 rounded bg-[#1A1A1A] border border-[#2A2A2A] text-[#A1A1AA] hover:text-white" title="Varsayılana Dön">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Drag and Drop Zone */}
                            <div
                              onDragEnter={handleDrag}
                              onDragOver={handleDrag}
                              onDragLeave={handleDrag}
                              onDrop={handleDrop}
                              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-all ${
                                dragActive
                                  ? 'border-[#8B5CF6] bg-[#8B5CF6]/5'
                                  : 'border-[#2A2A2A] hover:border-[#8B5CF6]/50 bg-white/[0.02]'
                              }`}
                            >
                              <FolderOpen className="w-6 h-6 text-[#52525B] mb-1" />
                              <span className="text-[10px] text-[#A1A1AA] font-bold">Mod eklemek için .jar dosyalarını buraya sürükleyin</span>
                              <span className="text-[8px] text-[#52525B]">veya tıklayarak seçin</span>
                            </div>

                            {/* Mod list items */}
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                              {filteredMods.map((mod) => (
                                <div
                                  key={mod.id}
                                  className="flex items-center gap-3 p-2 bg-[#111111] border border-[#1E1E1E] rounded-xl hover:border-[#2A2A2A] transition-all"
                                >
                                  <div className="w-7 h-7 bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/25 rounded-lg flex items-center justify-center text-[10px] font-bold font-mono">
                                    JAR
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <h4 className="text-[10px] font-bold text-white truncate leading-none">{mod.name}</h4>
                                      <span className="text-[8px] text-[#52525B]">by {mod.author}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className="text-[8px] font-bold bg-[#1A1A1A] border border-[#2A2A2A] text-[#A1A1AA] px-1 py-0.2 rounded">{mod.version}</span>
                                      <span className="text-[8px] text-[#52525B]">{mod.size}</span>
                                    </div>
                                  </div>

                                  {/* Enabled Toggle checkbox */}
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => toggleMod(mod.id)}
                                      className={`text-[9px] font-bold px-2 py-0.5 rounded transition-all border ${
                                        mod.enabled
                                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                          : 'bg-[#1A1A1A] border-[#2A2A2A] text-[#52525B]'
                                      }`}
                                    >
                                      {mod.enabled ? 'Aktif' : 'Pasif'}
                                    </button>

                                    {/* Delete Trash button for user custom mods */}
                                    {mod.isCustom && (
                                      <button
                                        onClick={() => deleteMod(mod.id)}
                                        className="p-1 rounded hover:bg-red-500/15 text-[#52525B] hover:text-[#EF4444] transition-all"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ================== OTHER PLACEHOLDERS ================== */}
                        {activeTab !== 'advanced' && activeTab !== 'mods' && (
                          <div className="flex flex-col items-center justify-center py-10 text-[#52525B]">
                            <Layers className="w-8 h-8 mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-wider">Geliştirme Aşamasında</p>
                            <p className="text-[8px]">Bu sekmedeki ayarlar yakında aktif edilecektir.</p>
                          </div>
                        )}
                      </div>

                      {/* Save button panel */}
                      <div className="border-t border-[#1E1E1E] pt-3 mt-4 flex justify-end">
                        <button
                          onClick={handleApplyAdvanced}
                          className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-[1.02] shadow-glow-purple"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Ayarları Kaydet</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
