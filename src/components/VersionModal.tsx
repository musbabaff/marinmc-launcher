import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore.ts';
import {
  X, Settings, FolderOpen, Save, RefreshCw, ShieldAlert,
  Globe, Sun, HardDrive, Layout, CheckCircle2, Trash2,
  ChevronDown, Search, Compass as LoaderIcon, Package, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: () => void;
}

type SettingsTab = 'loader' | 'mods' | 'shaders' | 'worlds' | 'resources' | 'advanced';

interface ContentItem {
  name: string;
  displayName: string;
  size: number;
  enabled: boolean;
  modified: number;
}

const CONTENT_TABS: SettingsTab[] = ['mods', 'shaders', 'worlds', 'resources'];

function formatSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const ICON_BG = ['bg-[#2D7DD2]', 'bg-[#06B6D4]', 'bg-[#259457]', 'bg-[#F59E0B]', 'bg-[#8B5CF6]', 'bg-[#EF4444]'];

export default function VersionModal({ isOpen, onClose, onLaunch: _onLaunch }: VersionModalProps) {
  const { t } = useTranslation();
  const settings = useSettingsStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('mods');
  const [searchQuery, setSearchQuery] = useState('');

  // Advanced tab — synced to the real settings store.
  const [resW, setResW] = useState(String(settings.resolutionWidth));
  const [resH, setResH] = useState(String(settings.resolutionHeight));
  const [fullscreen, setFullscreen] = useState(settings.fullscreen);
  const [ramVal, setRamVal] = useState(Math.round(settings.ram / 1024));
  const [jvmVal, setJvmVal] = useState(settings.jvmArgs);
  const [saved, setSaved] = useState(false);

  // Real content state
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const maxRamGb = Math.max(8, Math.round(settings.totalSystemRAM / 1024));

  const loadContent = useCallback(async (kind: SettingsTab) => {
    if (!CONTENT_TABS.includes(kind) || !window.electronAPI?.listContent) return;
    setLoading(true);
    try {
      const items = await window.electronAPI.listContent(kind);
      setContent(Array.isArray(items) ? items : []);
    } catch {
      setContent([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset + sync when opening / switching tabs.
  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
    if (activeTab === 'advanced') {
      setResW(String(settings.resolutionWidth));
      setResH(String(settings.resolutionHeight));
      setFullscreen(settings.fullscreen);
      setRamVal(Math.round(settings.ram / 1024));
      setJvmVal(settings.jvmArgs);
    } else if (CONTENT_TABS.includes(activeTab)) {
      loadContent(activeTab);
    } else {
      setContent([]);
    }
  }, [isOpen, activeTab, loadContent, settings]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleApplySettings = () => {
    settings.saveSettings({
      ram: ramVal * 1024,
      jvmArgs: jvmVal,
      launcherDir: settings.launcherDir,
      javaPath: settings.javaPath,
    });
    settings.setResolution(parseInt(resW, 10) || 1280, parseInt(resH, 10) || 720);
    settings.setFullscreen(fullscreen);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const toggleItem = async (item: ContentItem) => {
    if (!window.electronAPI?.toggleContent) return;
    await window.electronAPI.toggleContent(activeTab, item.name);
    loadContent(activeTab);
  };

  const deleteItem = async (item: ContentItem) => {
    if (!window.electronAPI?.deleteContent) return;
    await window.electronAPI.deleteContent(activeTab, item.name);
    loadContent(activeTab);
  };

  const openFolder = () => { window.electronAPI?.openContentFolder?.(activeTab); };

  const filtered = content.filter(c => c.displayName.toLowerCase().includes(searchQuery.toLowerCase()));

  const tabs: { id: SettingsTab; icon: any; label: string }[] = [
    { id: 'loader', icon: LoaderIcon, label: t('versionModal.loader') },
    { id: 'mods', icon: HardDrive, label: t('versionModal.mods') },
    { id: 'shaders', icon: Sun, label: t('versionModal.shaders') },
    { id: 'worlds', icon: Globe, label: t('versionModal.worlds') },
    { id: 'resources', icon: Layout, label: t('versionModal.resources') },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="w-[820px] h-[520px] bg-[#070b19] border border-white/[0.08] rounded-2xl flex overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar */}
            <div className="w-[185px] border-r border-white/[0.04] bg-[#040204]/40 p-4 flex flex-col justify-between select-none">
              <div className="space-y-4">
                <div>
                  <span className="text-[8px] font-bold text-[#52525B] tracking-widest uppercase block mb-1">{t('servers.versionText')}</span>
                  <div className="bg-black/40 border border-white/10 px-3 py-2 rounded-xl text-[10px] font-extrabold text-white flex items-center justify-between w-full">
                    <span>{settings.selectedSubVersion || '1.21.8'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-white/20" />
                  </div>
                </div>
                <div className="flex flex-col space-y-1">
                  {tabs.map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all text-left ${
                        activeTab === id
                          ? 'text-white bg-[#2D7DD2]/20 border border-[#2D7DD2]/40 shadow-[0_0_15px_rgba(45,125,210,0.12)]'
                          : 'text-[#52525B] hover:text-[#d2d2d2] hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" /><span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setActiveTab('advanced')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all text-left ${
                  activeTab === 'advanced'
                    ? 'text-white bg-[#2D7DD2]/20 border border-[#2D7DD2]/40 shadow-[0_0_15px_rgba(45,125,210,0.12)]'
                    : 'text-[#52525B] hover:text-[#d2d2d2] hover:bg-white/5'
                }`}
              >
                <Settings className="w-3.5 h-3.5" /><span>{t('versionModal.advanced')}</span>
              </button>
            </div>

            {/* Main panel */}
            <div className="flex-grow flex flex-col h-full bg-[#070b19] text-[#d2d2d2] overflow-hidden">
              {/* Topbar */}
              <div className="flex justify-between items-center p-5 border-b border-white/[0.04]">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#52525B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={!CONTENT_TABS.includes(activeTab)}
                    placeholder={activeTab === 'mods' ? t('versionModal.findMod') : activeTab === 'worlds' ? t('versionModal.findWorld') : t('versionModal.searchSettings')}
                    className="bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[10px] font-bold text-white placeholder-white/20 w-[240px] focus:outline-none focus:border-[#2D7DD2] disabled:opacity-40"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {CONTENT_TABS.includes(activeTab) && (
                    <>
                      <button onClick={() => loadContent(activeTab)} className="bg-[#259457]/10 hover:bg-[#259457]/20 border border-[#259457]/20 text-[#259457] p-2 rounded-xl transition-all cursor-pointer" title={t('versionModal.refresh')}>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={openFolder} className="bg-black/40 border border-white/10 p-2 rounded-xl text-[#52525B] hover:text-white transition-colors cursor-pointer" title={t('versionModal.openFolder')}>
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button onClick={onClose} className="hover:bg-white/5 text-[#52525B] hover:text-white p-2 rounded-xl transition-colors cursor-pointer ml-1.5">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">

                {/* LOADER tab — real info */}
                {activeTab === 'loader' && (
                  <div className="space-y-4">
                    <div className="border border-[#2D7DD2]/25 bg-[#2D7DD2]/[0.06] rounded-2xl p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#2D7DD2]/15 border border-[#2D7DD2]/30 flex items-center justify-center shrink-0">
                        <LoaderIcon className="w-6 h-6 text-[#2D7DD2]" />
                      </div>
                      <div>
                        <h3 className="text-[13px] font-black text-white">Fabric</h3>
                        <p className="text-[9px] text-[#A1A1AA] font-bold mt-0.5">{t('versionModal.loaderInfoDesc')}</p>
                      </div>
                      <span className="ml-auto text-[8px] font-black uppercase tracking-widest bg-[#259457]/20 text-[#259457] border border-[#259457]/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />{t('versionModal.enabled')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <InfoCard label={t('servers.versionText')} value={settings.selectedSubVersion || '1.21.8'} />
                      <InfoCard label="Mod Loader" value="Fabric" />
                    </div>
                  </div>
                )}

                {/* MODS / SHADERS / RESOURCES / WORLDS — real content */}
                {CONTENT_TABS.includes(activeTab) && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[9px] text-[#52525B] font-extrabold uppercase tracking-wider">
                      <span>{filtered.length} {t('versionModal.itemsLoaded')}</span>
                    </div>

                    <button
                      onClick={openFolder}
                      className="w-full border border-dashed border-white/[0.08] bg-black/25 hover:bg-black/40 hover:border-white/15 rounded-2xl p-4 flex items-center gap-3.5 group transition-all cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/55 group-hover:scale-105 transition-transform">
                        <span className="text-lg font-bold">+</span>
                      </div>
                      <div className="text-left">
                        <h4 className="text-[10px] font-bold text-white uppercase">{t('versionModal.addContent')}</h4>
                        <p className="text-[8px] text-[#52525B] mt-0.5">{t('versionModal.addContentDesc')}</p>
                      </div>
                    </button>

                    {loading ? (
                      <div className="flex flex-col items-center justify-center h-40 text-[#52525B]">
                        <Loader2 className="w-6 h-6 animate-spin mb-2" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">{t('versionModal.loadingContent')}</span>
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-[#52525B]">
                        <Package className="w-8 h-8 mb-2.5 opacity-60" />
                        <p className="text-[10px] font-extrabold uppercase tracking-widest">{t('versionModal.emptyContent')}</p>
                        <p className="text-[8px] mt-0.5 font-semibold">{t('versionModal.emptyContentDesc')}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-1.5 max-h-[240px] overflow-y-auto pr-1.5 custom-scrollbar">
                        {filtered.map((item, i) => (
                          <div key={item.name} className={`flex items-center justify-between p-2.5 bg-black/10 border border-white/[0.03] rounded-xl hover:border-white/[0.06] transition-all ${!item.enabled ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 ${ICON_BG[i % ICON_BG.length]} text-white border border-white/10 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 shadow-lg shadow-black/35`}>
                                {activeTab === 'worlds' ? <Globe className="w-4 h-4" /> : 'JAR'}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-[11px] font-bold text-white truncate leading-none mb-1">{item.displayName}</h4>
                                <span className="text-[8px] text-[#52525B] font-semibold">{formatSize(item.size)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {activeTab !== 'worlds' && (
                                <button
                                  onClick={() => toggleItem(item)}
                                  className={`text-[8.5px] font-extrabold uppercase px-2 py-1 rounded-md border flex items-center gap-1 transition-all ${
                                    item.enabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/5 text-[#52525B]'
                                  }`}
                                >
                                  {item.enabled && <CheckCircle2 className="w-2.5 h-2.5" />}
                                  <span>{item.enabled ? t('versionModal.enabled') : t('versionModal.disabled')}</span>
                                </button>
                              )}
                              <button onClick={() => deleteItem(item)} className="p-1.5 rounded bg-white/5 border border-white/5 text-[#52525B] hover:text-[#EF4444] transition-colors" title={t('versionModal.delete')}>
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ADVANCED — real settings */}
                {activeTab === 'advanced' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-[11px] font-bold text-white uppercase">{t('versionModal.advancedTitle')}</h3>
                        <p className="text-[9px] text-[#EF4444] mt-0.5 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-[#EF4444]" />
                          <span>{t('versionModal.advancedWarning')}</span>
                        </p>
                      </div>
                    </div>

                    <div className="border border-white/[0.04] bg-black/25 rounded-2xl p-4 space-y-3.5">
                      <div>
                        <h4 className="text-[10px] font-bold text-white uppercase">{t('versionModal.gameResolution')}</h4>
                        <p className="text-[8px] text-[#52525B] mt-0.5">{t('versionModal.gameResolutionDesc')}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl text-[9px] font-black text-white w-24">
                          <span className="text-white/40">W</span>
                          <input type="text" value={resW} onChange={(e) => setResW(e.target.value)} className="bg-transparent border-none w-full focus:outline-none text-right pr-1" />
                        </div>
                        <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl text-[9px] font-black text-white w-24">
                          <span className="text-white/40">H</span>
                          <input type="text" value={resH} onChange={(e) => setResH(e.target.value)} className="bg-transparent border-none w-full focus:outline-none text-right pr-1" />
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => { setResW('1920'); setResH('1080'); }} className="px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-bold uppercase text-[#A1A1AA] hover:text-white transition-all">1080p</button>
                          <button onClick={() => { setResW('2560'); setResH('1440'); }} className="px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-bold uppercase text-[#A1A1AA] hover:text-white transition-all">1440p</button>
                          <button onClick={() => { setResW('3840'); setResH('2160'); }} className="px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-bold uppercase text-[#A1A1AA] hover:text-white transition-all">4K</button>
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors text-[8px] font-bold text-[#A1A1AA] uppercase tracking-wider ml-auto">
                          <input type="checkbox" checked={fullscreen} onChange={(e) => setFullscreen(e.target.checked)} className="rounded border-white/10 bg-black/40 text-[#2D7DD2] focus:ring-0 w-3 h-3" />
                          <span>{t('versionModal.fullscreenMode')}</span>
                        </label>
                      </div>
                    </div>

                    <div className="border border-white/[0.04] bg-black/25 rounded-2xl p-4 space-y-3.5">
                      <div>
                        <h4 className="text-[10px] font-bold text-white uppercase">{t('versionModal.allocatedMemory')}</h4>
                        <p className="text-[8px] text-[#52525B] mt-0.5">{t('versionModal.allocatedMemoryDesc')}</p>
                      </div>
                      <div className="flex items-center gap-4.5 pt-1">
                        <div className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-[10px] font-black text-white shrink-0 min-w-[70px] text-center">{ramVal} GB</div>
                        <div className="flex-grow space-y-1.5 pr-2">
                          <input type="range" min="1" max={maxRamGb} step="1" value={ramVal} onChange={(e) => setRamVal(parseInt(e.target.value, 10))} className="w-full h-1 bg-white/[0.04] rounded-lg appearance-none cursor-pointer accent-[#2D7DD2]" />
                          <div className="flex justify-between text-[7px] text-[#52525B] font-bold uppercase tracking-wider">
                            <span>1 GB</span><span>{Math.round(maxRamGb / 2)} GB</span><span>{maxRamGb} GB</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border border-white/[0.04] bg-black/25 rounded-2xl p-4 space-y-2">
                      <div>
                        <h4 className="text-[10px] font-bold text-white uppercase">{t('versionModal.jvmArgs')}</h4>
                        <p className="text-[8px] text-[#52525B] mt-0.5">{t('versionModal.jvmArgsDesc')}</p>
                      </div>
                      <textarea value={jvmVal} onChange={(e) => setJvmVal(e.target.value)} rows={2} placeholder="-XX:+UseG1GC..." className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-[9px] text-white leading-normal font-mono resize-none focus:outline-none focus:border-[#2D7DD2]" />
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom save (advanced only) */}
              {activeTab === 'advanced' && (
                <div className="p-5 border-t border-white/[0.04] bg-black/10 flex justify-end">
                  <button
                    onClick={handleApplySettings}
                    className="px-4.5 py-2 bg-[#2D7DD2] hover:bg-[#4A9AE8] text-white font-extrabold text-[9.5px] uppercase tracking-widest rounded-xl transition-all shadow-[0_5px_15px_rgba(45,125,210,0.25)] hover:scale-[1.02] flex items-center gap-2"
                  >
                    {saved ? <CheckCircle2 className="w-3.5 h-3.5 text-green-300" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{saved ? t('profileSettings.saveSuccess') : t('versionModal.saveProfileSettings')}</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/[0.04] bg-black/25 rounded-xl px-4 py-3">
      <span className="text-[8px] font-bold text-[#52525B] uppercase tracking-widest block">{label}</span>
      <span className="text-[12px] font-black text-white mt-1 block">{value}</span>
    </div>
  );
}
