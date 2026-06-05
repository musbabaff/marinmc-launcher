import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore.ts';
import {
  X, Settings, FolderOpen, Save, RefreshCw, Filter, ShieldAlert,
  Globe, Sun, HardDrive, Layout, CheckCircle2, Trash2, Cloud,
  ChevronDown, Search, Compass as LoaderIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: () => void;
}

type SettingsTab = 'loader' | 'mods' | 'shaders' | 'worlds' | 'resources' | 'advanced';

interface ModItem {
  id: string;
  name: string;
  author: string;
  version: string;
  size: string;
  enabled: boolean;
  iconBg: string;
}

const INITIAL_MODS: ModItem[] = [
  { id: '1', name: 'Litematica', author: 'By masa', version: 'v0.26.3', size: '1.82MB', enabled: true, iconBg: 'bg-[#2D7DD2]' },
  { id: '2', name: 'Mod Menu', author: 'By Terraformers', version: 'v17.0.0', size: '1.12MB', enabled: true, iconBg: 'bg-[#06B6D4]' },
  { id: '3', name: 'Inventory Profiles Next', author: 'By blackd', version: 'v2.3.1', size: '1.48MB', enabled: false, iconBg: 'bg-[#259457]' },
  { id: '4', name: 'Chat Patches', author: 'By OBro1961', version: 'v8.0-alpha.8', size: '1.93MB', enabled: false, iconBg: 'bg-[#F59E0B]' },
  { id: '5', name: 'FerriteCore', author: 'By malte0811', version: 'v8.2.0', size: '2.16MB', enabled: true, iconBg: 'bg-[#EF4444]' }
];

export default function VersionModal({ isOpen, onClose, onLaunch: _onLaunch }: VersionModalProps) {
  const settings = useSettingsStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('advanced');
  const [searchQuery, setSearchQuery] = useState('');

  // Advanced tab states
  const [resolutionEnabled, setResolutionEnabled] = useState(true);
  const [resW, setResW] = useState('1920');
  const [resH, setResH] = useState('1080');
  const [fullscreen, setFullscreen] = useState(false);
  const [borderless, setBorderless] = useState(true);
  const [lockAspect, setLockAspect] = useState(true);

  const [ramEnabled, setRamEnabled] = useState(true);
  const [ramVal, setRamVal] = useState(6); // 6 GB

  const [jvmEnabled, setJvmEnabled] = useState(false);
  const [jvmVal, setJvmVal] = useState(settings.jvmArgs);

  // Mods tab states
  const [mods, setMods] = useState<ModItem[]>(INITIAL_MODS);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleApplySettings = () => {
    // Save to settings store
    settings.saveSettings({
      ram: ramEnabled ? ramVal * 1024 : settings.ram,
      jvmArgs: jvmEnabled ? jvmVal : settings.jvmArgs,
      launcherDir: settings.launcherDir,
      javaPath: settings.javaPath
    });
    onClose();
  };

  const toggleMod = (id: string) => {
    setMods(mods.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const deleteMod = (id: string) => {
    setMods(mods.filter(m => m.id !== id));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-[820px] h-[520px] bg-[#060305] border border-white/[0.08] rounded-2xl flex overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Sidebar inside modal */}
            <div className="w-[185px] border-r border-white/[0.04] bg-[#040204]/40 p-4 flex flex-col justify-between select-none">
              
              {/* Top controls: Version display + Menu items */}
              <div className="space-y-4">
                <div>
                  <span className="text-[8px] font-bold text-[#52525B] tracking-widest uppercase block mb-1">VERSION</span>
                  <button className="bg-black/40 border border-white/10 px-3 py-1.8 rounded-xl text-[10px] font-extrabold text-white flex items-center justify-between w-full">
                    <span>{settings.selectedSubVersion || '1.21.7'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-white/50" />
                  </button>
                </div>

                {/* Vertical Tabs */}
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={() => setActiveTab('loader')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all text-left ${
                      activeTab === 'loader'
                        ? 'text-white bg-[#2D7DD2]/20 border border-[#2D7DD2]/40 shadow-[0_0_15px_rgba(45,125,210,0.12)]'
                        : 'text-[#52525B] hover:text-[#d2d2d2] hover:bg-white/5'
                    }`}
                  >
                    <LoaderIcon className="w-3.5 h-3.5" />
                    <span>Loader</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('mods')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all text-left ${
                      activeTab === 'mods'
                        ? 'text-white bg-[#2D7DD2]/20 border border-[#2D7DD2]/40 shadow-[0_0_15px_rgba(45,125,210,0.12)]'
                        : 'text-[#52525B] hover:text-[#d2d2d2] hover:bg-white/5'
                    }`}
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Mods</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('shaders')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all text-left ${
                      activeTab === 'shaders'
                        ? 'text-white bg-[#2D7DD2]/20 border border-[#2D7DD2]/40 shadow-[0_0_15px_rgba(45,125,210,0.12)]'
                        : 'text-[#52525B] hover:text-[#d2d2d2] hover:bg-white/5'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Shaders</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('worlds')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all text-left ${
                      activeTab === 'worlds'
                        ? 'text-white bg-[#2D7DD2]/20 border border-[#2D7DD2]/40 shadow-[0_0_15px_rgba(45,125,210,0.12)]'
                        : 'text-[#52525B] hover:text-[#d2d2d2] hover:bg-white/5'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Worlds</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('resources')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all text-left ${
                      activeTab === 'resources'
                        ? 'text-white bg-[#2D7DD2]/20 border border-[#2D7DD2]/40 shadow-[0_0_15px_rgba(45,125,210,0.12)]'
                        : 'text-[#52525B] hover:text-[#d2d2d2] hover:bg-white/5'
                    }`}
                  >
                    <Layout className="w-3.5 h-3.5" />
                    <span>Resources</span>
                  </button>
                </div>
              </div>

              {/* Bottom "Advanced" Tab Trigger */}
              <button
                onClick={() => setActiveTab('advanced')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all text-left ${
                  activeTab === 'advanced'
                    ? 'text-white bg-[#2D7DD2]/20 border border-[#2D7DD2]/40 shadow-[0_0_15px_rgba(45,125,210,0.12)]'
                    : 'text-[#52525B] hover:text-[#d2d2d2] hover:bg-white/5'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Advanced</span>
              </button>

            </div>

            {/* Right Main settings panel */}
            <div className="flex-grow flex flex-col h-full bg-[#060305] text-[#d2d2d2] overflow-hidden">
              
              {/* Modal Topbar Search + Controls */}
              <div className="flex justify-between items-center p-5 border-b border-white/[0.04]">
                {/* Search Inputs based on tab */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#52525B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      activeTab === 'mods'
                        ? 'Find a mod...'
                        : activeTab === 'worlds'
                        ? 'Find a world...'
                        : 'Search settings...'
                    }
                    className="bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-1.8 text-[10px] font-bold text-white placeholder-white/20 w-[240px] focus:outline-none focus:border-[#2D7DD2]"
                  />
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-1.5">
                  {activeTab === 'mods' && (
                    <button className="bg-[#259457]/10 hover:bg-[#259457]/20 border border-[#259457]/20 text-[#259457] p-1.8 rounded-xl transition-all cursor-pointer">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button className="bg-black/40 border border-white/10 p-1.8 rounded-xl text-[#52525B] hover:text-white transition-colors cursor-pointer">
                    <Filter className="w-3.5 h-3.5" />
                  </button>
                  <button className="bg-black/40 border border-white/10 p-1.8 rounded-xl text-[#52525B] hover:text-white transition-colors cursor-pointer">
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={onClose}
                    className="hover:bg-white/5 text-[#52525B] hover:text-white p-1.8 rounded-xl transition-colors cursor-pointer ml-1.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Modal Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4.5 custom-scrollbar">

                {/* ================== TAB: ADVANCED ================== */}
                {activeTab === 'advanced' && (
                  <div className="space-y-4.5">
                    {/* Header Alert */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-[11px] font-bold text-white uppercase">Advanced Settings</h3>
                        <p className="text-[9px] text-[#EF4444] mt-0.5 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-[#EF4444]" />
                          <span>Proceed with caution. Modifying these settings may cause game instability.</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-[#52525B]">
                        <Cloud className="w-3 h-3" />
                        <span className="text-[7.5px] font-bold uppercase tracking-wider">Synced · Last synced: 2h ago</span>
                      </div>
                    </div>

                    {/* Card: Game Resolution */}
                    <div className="border border-white/[0.04] bg-black/25 rounded-2xl p-4 space-y-3.5 relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-[10px] font-bold text-white uppercase">Game Resolution</h4>
                          <p className="text-[8px] text-[#52525B] mt-0.5">Define custom launch resolution and fullscreen preferences.</p>
                        </div>
                        <button
                          onClick={() => setResolutionEnabled(!resolutionEnabled)}
                          className={`text-[8.5px] font-extrabold uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all ${
                            resolutionEnabled
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-white/5 border-white/5 text-[#52525B]'
                          }`}
                        >
                          {resolutionEnabled && <CheckCircle2 className="w-2.5 h-2.5" />}
                          <span>Enabled</span>
                        </button>
                      </div>

                      {resolutionEnabled && (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl text-[9px] font-black text-white w-24">
                              <span className="text-white/40">W</span>
                              <input
                                type="text"
                                value={resW}
                                onChange={(e) => setResW(e.target.value)}
                                className="bg-transparent border-none w-full focus:outline-none focus:ring-0 text-right pr-1"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl text-[9px] font-black text-white w-24">
                              <span className="text-white/40">H</span>
                              <input
                                type="text"
                                value={resH}
                                onChange={(e) => setResH(e.target.value)}
                                className="bg-transparent border-none w-full focus:outline-none focus:ring-0 text-right pr-1"
                              />
                            </div>

                            {/* Preset Buttons */}
                            <div className="flex gap-1.5">
                              <button onClick={() => { setResW('1920'); setResH('1080'); }} className="px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-bold uppercase text-[#A1A1AA] hover:text-white transition-all">1080p</button>
                              <button onClick={() => { setResW('2560'); setResH('1440'); }} className="px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-bold uppercase text-[#A1A1AA] hover:text-white transition-all">1440p</button>
                              <button onClick={() => { setResW('3840'); setResH('2160'); }} className="px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-bold uppercase text-[#A1A1AA] hover:text-white transition-all">4K</button>
                            </div>
                          </div>

                          {/* Checkbox controls */}
                          <div className="flex flex-wrap gap-4 text-[8px] font-bold text-[#A1A1AA] uppercase tracking-wider select-none">
                            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                              <input type="checkbox" checked={fullscreen} onChange={(e) => setFullscreen(e.target.checked)} className="rounded border-white/10 bg-black/40 text-[#2D7DD2] focus:ring-0 w-3 h-3" />
                              <span>Fullscreen mode</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                              <input type="checkbox" checked={borderless} onChange={(e) => setBorderless(e.target.checked)} className="rounded border-white/10 bg-black/40 text-[#2D7DD2] focus:ring-0 w-3 h-3" />
                              <span>Borderless Window</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                              <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} className="rounded border-white/10 bg-black/40 text-[#2D7DD2] focus:ring-0 w-3 h-3" />
                              <span>Lock Aspect Ratio</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card: Allocated Memory */}
                    <div className="border border-white/[0.04] bg-black/25 rounded-2xl p-4 space-y-3.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-[10px] font-bold text-white uppercase">Allocated Memory</h4>
                          <p className="text-[8px] text-[#52525B] mt-0.5">Overrides global RAM settings for this specific profile.</p>
                        </div>
                        <button
                          onClick={() => setRamEnabled(!ramEnabled)}
                          className={`text-[8.5px] font-extrabold uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all ${
                            ramEnabled
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-white/5 border-white/5 text-[#52525B]'
                          }`}
                        >
                          {ramEnabled && <CheckCircle2 className="w-2.5 h-2.5" />}
                          <span>Enabled</span>
                        </button>
                      </div>

                      {ramEnabled && (
                        <div className="flex items-center gap-4.5 pt-2">
                          <div className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-[10px] font-black text-white shrink-0 min-w-[70px] text-center">
                            {ramVal} GB
                          </div>
                          
                          {/* Premium custom RAM slider */}
                          <div className="flex-grow space-y-1.5 pr-2">
                            <input
                              type="range"
                              min="1"
                              max="32"
                              step="1"
                              value={ramVal}
                              onChange={(e) => setRamVal(parseInt(e.target.value, 10))}
                              className="w-full h-1 bg-white/[0.04] rounded-lg appearance-none cursor-pointer accent-[#2D7DD2]"
                            />
                            {/* Ticks */}
                            <div className="flex justify-between text-[7px] text-[#52525B] font-bold uppercase tracking-wider">
                              <span>1 GB</span>
                              <span>8 GB</span>
                              <span>16 GB</span>
                              <span>24 GB</span>
                              <span>32 GB</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card: JVM Arguments */}
                    <div className="border border-white/[0.04] bg-black/25 rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-[10px] font-bold text-white uppercase">JVM Arguments</h4>
                          <p className="text-[8px] text-[#52525B] mt-0.5">Custom Java execution flags for advanced performance tweaking.</p>
                        </div>
                        <button
                          onClick={() => setJvmEnabled(!jvmEnabled)}
                          className={`text-[8.5px] font-extrabold uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all ${
                            jvmEnabled
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-white/5 border-white/5 text-[#52525B]'
                          }`}
                        >
                          {jvmEnabled && <CheckCircle2 className="w-2.5 h-2.5" />}
                          <span>Enabled</span>
                        </button>
                      </div>

                      {jvmEnabled && (
                        <div className="pt-2">
                          <textarea
                            value={jvmVal}
                            onChange={(e) => setJvmVal(e.target.value)}
                            rows={2}
                            placeholder="-XX:+UseG1GC -XX:+ParallelRefProcEnabled..."
                            className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-[9px] text-white leading-normal font-mono resize-none focus:outline-none focus:border-[#2D7DD2]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ================== TAB: MODS ================== */}
                {activeTab === 'mods' && (
                  <div className="space-y-4">
                    {/* Header sub-bar */}
                    <div className="flex justify-between items-center text-[9px] text-[#52525B] font-extrabold uppercase tracking-wider">
                      <span>{mods.length} mods loaded</span>
                      <div className="flex items-center gap-1 text-[#52525B] font-normal">
                        <Cloud className="w-3 h-3 text-[#52525B]" />
                        <span className="text-[7.5px] font-bold uppercase tracking-wider">Synced · Last synced: 18m ago</span>
                      </div>
                    </div>

                    {/* Drag and Drop Zone */}
                    <div className="border border-white/[0.04] bg-black/25 rounded-2xl p-4 flex items-center gap-3.5 relative group">
                      <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/55 group-hover:scale-105 transition-transform duration-300">
                        <span className="text-lg font-bold">+</span>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-white uppercase">3rd Party Mods</h4>
                        <p className="text-[8px] text-[#52525B] mt-0.5">Drag & drop files here, or browse to add mods.</p>
                      </div>
                    </div>

                    {/* Mod list items */}
                    <div className="flex flex-col space-y-1.5 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar">
                      {mods
                        .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((mod) => (
                          <div
                            key={mod.id}
                            className="flex items-center justify-between p-2.5 bg-black/10 border border-white/[0.03] rounded-xl hover:border-white/[0.06] transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Voxel styled jar icon */}
                              <div className={`w-8 h-8 ${mod.iconBg} text-white border border-white/10 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 shadow-lg shadow-black/35`}>
                                JAR
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-[11px] font-bold text-white truncate leading-none mb-1">{mod.name}</h4>
                                <span className="text-[8px] text-[#52525B] font-semibold">{mod.author}</span>
                              </div>
                            </div>

                            {/* Status & Options */}
                            <div className="flex items-center gap-2">
                              <span className="text-[9.5px] font-bold text-[#A1A1AA]">{mod.version}</span>
                              <span className="text-[8.5px] text-[#52525B] font-semibold pr-2 border-r border-white/[0.04]">{mod.size}</span>
                              
                              <button
                                onClick={() => toggleMod(mod.id)}
                                className={`text-[8.5px] font-extrabold uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all ${
                                  mod.enabled
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-white/5 border-white/5 text-[#52525B]'
                                }`}
                              >
                                {mod.enabled && <CheckCircle2 className="w-2.5 h-2.5" />}
                                <span>Enabled</span>
                              </button>

                              <button className="p-1 rounded bg-white/5 border border-white/5 text-[#52525B] hover:text-white transition-colors">
                                <Settings className="w-3 h-3" />
                              </button>

                              <button
                                onClick={() => deleteMod(mod.id)}
                                className="p-1 rounded bg-white/5 border border-white/5 text-[#52525B] hover:text-[#EF4444] transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ================== TAB: WORLDS ================== */}
                {activeTab === 'worlds' && (
                  <div className="space-y-4">
                    {/* Header info */}
                    <div className="flex justify-between items-center text-[9px] text-[#52525B] font-extrabold uppercase tracking-wider">
                      <span>Fetching worlds...</span>
                      <div className="flex items-center gap-1 text-[#52525B] font-normal">
                        <Cloud className="w-3 h-3 text-[#52525B]" />
                        <span className="text-[7.5px] font-bold uppercase tracking-wider">Syncing with MarinMC Cloud...</span>
                      </div>
                    </div>

                    {/* World drag and drop zone */}
                    <div className="border border-white/[0.04] bg-black/25 rounded-2xl p-4 flex items-center gap-3.5 relative group">
                      <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/55 group-hover:scale-105 transition-transform duration-300">
                        <span className="text-lg font-bold">+</span>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-white uppercase">Worlds</h4>
                        <p className="text-[8px] text-[#52525B] mt-0.5">Drag & drop files here, or browse to add worlds.</p>
                      </div>
                    </div>

                    {/* Animated Skeleton loader rows for world list matching mockup */}
                    <div className="flex flex-col space-y-1.5 select-none">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 bg-black/10 border border-white/[0.02] rounded-xl relative overflow-hidden animate-pulse"
                        >
                          <div className="flex items-center gap-3 w-1/3">
                            <div className="w-8 h-8 bg-white/[0.04] border border-white/5 rounded-lg shrink-0" />
                            <div className="space-y-1.5 w-full">
                              <div className="h-2.5 bg-white/[0.04] rounded-md w-3/4" />
                              <div className="h-1.5 bg-white/[0.02] rounded-md w-1/2" />
                            </div>
                          </div>
                          <div className="h-3 bg-white/[0.04] rounded-md w-16" />
                          <div className="flex items-center gap-2">
                            <div className="h-5 bg-white/[0.04] rounded-md w-16" />
                            <div className="w-5 h-5 bg-white/[0.04] rounded-md" />
                            <div className="w-5 h-5 bg-white/[0.04] rounded-md" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ================== OTHER TABS ================== */}
                {activeTab !== 'advanced' && activeTab !== 'mods' && activeTab !== 'worlds' && (
                  <div className="flex flex-col items-center justify-center h-48 text-[#52525B]">
                    <LoaderIcon className="w-8 h-8 mb-2.5 text-[#52525B] animate-spin" />
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#52525B]">Loader & Shaders Settings</p>
                    <p className="text-[8px] text-[#52525B] mt-0.5 font-semibold">Configuring environment and syncing assets...</p>
                  </div>
                )}
              </div>

              {/* Save settings bottom panel */}
              <div className="p-5 border-t border-white/[0.04] bg-black/10 flex justify-end">
                <button
                  onClick={handleApplySettings}
                  className="px-4.5 py-2 bg-[#2D7DD2] hover:bg-[#4A9AE8] text-white font-extrabold text-[9.5px] uppercase tracking-widest rounded-xl transition-all shadow-[0_5px_15px_rgba(45,125,210,0.25)] hover:scale-[1.02] flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile Settings</span>
                </button>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
