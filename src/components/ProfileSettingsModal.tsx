import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore.ts';
import {
  X, FolderOpen, Settings, Cpu, Layers, Download, Copy,
  CheckCircle2, AlertTriangle, Monitor, Sliders, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'files' | 'java' | 'versions' | 'export';

// Real, officially supported MarinMC versions (all run on Fabric). No mock data —
// this matches exactly what the launcher can install & launch (see VersionsPage /
// resolveGameVersion in electron/ipc/game.ts).
const SUPPORTED_VERSIONS = [
  { num: '1.21', sub: '1.21.8', full: true },
  { num: '1.20', sub: '1.20.4', full: false },
  { num: '1.19', sub: '1.19.4', full: false },
  { num: '1.18', sub: '1.18.2', full: false },
  { num: '1.17', sub: '1.17.1', full: false }
];

export default function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
  const { t } = useTranslation();
  const settings = useSettingsStore();

  const [activeTab, setActiveTab] = useState<TabType>('java');
  const [ramVal, setRamVal] = useState(4); // in GB
  const [resW, setResW] = useState(1280);
  const [resH, setResH] = useState(720);
  const [fullscreen, setFullscreen] = useState(false);
  // MarinMC runs exclusively on Fabric — no loader picker, no mock loaders.
  const loaderType = 'fabric' as const;
  const [selectedSubVer, setSelectedSubVer] = useState('1.21.8');
  const [gameDir, setGameDir] = useState('');
  
  // Toasts / Messages
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize values when modal opens
  useEffect(() => {
    if (isOpen) {
      setRamVal(Math.round(settings.ram / 1024));
      setResW(settings.resolutionWidth);
      setResH(settings.resolutionHeight);
      setFullscreen(settings.fullscreen);
      setGameDir(settings.launcherDir);
      
      // Snap to a real supported version (fall back to the latest if unknown).
      const sub = settings.selectedSubVersion || '1.21.8';
      const known = SUPPORTED_VERSIONS.find(v => v.sub === sub);
      setSelectedSubVer(known ? known.sub : '1.21.8');
    }
  }, [isOpen, settings]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleSave = () => {
    settings.saveSettings({
      ram: ramVal * 1024,
      jvmArgs: settings.jvmArgs,
      launcherDir: gameDir,
      javaPath: settings.javaPath
    });
    settings.setResolution(resW, resH);
    settings.setFullscreen(fullscreen);
    
    // Save version details based on selection
    const matchedVer = SUPPORTED_VERSIONS.find(v => v.sub === selectedSubVer) || SUPPORTED_VERSIONS[0];
    settings.setSelectedVersion(matchedVer.num);
    settings.setSelectedSubVersion(matchedVer.sub);
    
    showToast(t('profileSettings.saveSuccess'));
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleSelectDirectory = async () => {
    if (window.electronAPI) {
      try {
        const dir = await window.electronAPI.selectDirectory();
        if (dir) {
          const validation = await window.electronAPI.validateDirectory(dir);
          if (validation.valid) {
            setGameDir(dir);
            showToast(t('profileSettings.dirSelected'));
          } else {
            showToast(t('profileSettings.dirInvalid'));
          }
        }
      } catch (err) {
        console.error('Directory selection error:', err);
      }
    }
  };

  const handleResetDirectory = () => {
    let defaultDir = '';
    const sysOS = settings.osName;
    if (sysOS === 'Windows') {
      defaultDir = 'C:\\Users\\Default\\AppData\\Roaming\\.marinmc';
    } else if (sysOS === 'macOS') {
      defaultDir = '/Users/Default/Library/Application Support/marinmc';
    } else {
      defaultDir = '/home/default/.marinmc';
    }
    setGameDir(defaultDir);
    showToast(t('profileSettings.dirReset'));
  };

  const handleExport = async () => {
    if (window.electronAPI) {
      const settingsPayload = {
        ram: ramVal * 1024,
        jvmArgs: settings.jvmArgs,
        launcherDir: gameDir,
        javaPath: settings.javaPath,
        resolutionWidth: resW,
        resolutionHeight: resH,
        fullscreen: fullscreen,
        loaderType: loaderType,
        selectedVersion: SUPPORTED_VERSIONS.find(v => v.sub === selectedSubVer)?.num || '1.21',
        selectedSubVersion: selectedSubVer
      };
      try {
        const result = await window.electronAPI.exportProfile(settingsPayload);
        if (result.success) {
          showToast(t('profileSettings.exportSuccess'));
        }
      } catch (err) {
        console.error('Export error:', err);
      }
    }
  };

  const handleImport = async () => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.importProfile();
        if (result.success && result.settings) {
          const s = result.settings;
          if (s.ram) setRamVal(Math.round(s.ram / 1024));
          if (s.resolutionWidth) setResW(s.resolutionWidth);
          if (s.resolutionHeight) setResH(s.resolutionHeight);
          if (s.fullscreen !== undefined) setFullscreen(s.fullscreen);
          if (s.launcherDir) setGameDir(s.launcherDir);
          if (s.selectedSubVersion) {
            const known = SUPPORTED_VERSIONS.find(v => v.sub === s.selectedSubVersion);
            setSelectedSubVer(known ? known.sub : '1.21.8');
          }
          showToast(t('profileSettings.importSuccess'));
        }
      } catch (err) {
        console.error('Import error:', err);
      }
    }
  };

  const handleClone = async () => {
    if (window.electronAPI) {
      try {
        const destDir = await window.electronAPI.selectDirectory();
        if (destDir) {
          const validation = await window.electronAPI.validateDirectory(destDir);
          if (validation.valid) {
            const sourceDir = gameDir || settings.launcherDir;
            showToast(t('profileSettings.cloneProfile') + '...');
            
            const result = await window.electronAPI.cloneProfile(sourceDir, destDir);
            if (result.success) {
              setGameDir(destDir);
              showToast(t('profileSettings.cloneSuccess'));
            } else {
              showToast(result.error || 'Clone failed.');
            }
          } else {
            showToast(t('profileSettings.dirInvalid'));
          }
        }
      } catch (err) {
        console.error('Clone error:', err);
      }
    }
  };

  const maxRam = Math.max(16, Math.round(settings.totalSystemRAM / 1024));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-[720px] h-[480px] bg-[#070b19] border border-white/[0.08] rounded-2xl flex overflow-hidden shadow-2xl relative select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Sidebar inside modal */}
            <div className="w-[195px] border-r border-white/[0.04] bg-[#040204]/40 p-5 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <span className="text-[7.5px] font-black text-[#52525B] tracking-widest uppercase block mb-1">{t('profileSettings.editedProfile')}</span>
                  <div className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1.5 bg-white/5 border border-white/10 px-3.5 py-2.5 rounded-xl">
                    <Settings className="w-3.5 h-3.5 text-[#2D7DD2]" />
                    <span>MARINMC {selectedSubVer}</span>
                  </div>
                </div>

                {/* Vertical Tabs */}
                <div className="flex flex-col space-y-1.5">
                  <button
                    onClick={() => setActiveTab('files')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all text-left ${
                      activeTab === 'files'
                        ? 'text-white bg-[#259457]/20 border border-[#259457]/40 shadow-[0_0_15px_rgba(37,148,87,0.12)]'
                        : 'text-[#52525B] hover:text-[#d2d2d2] hover:bg-white/5'
                    }`}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>{t('profileSettings.tabFiles')}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('java')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all text-left ${
                      activeTab === 'java'
                        ? 'text-white bg-[#259457]/20 border border-[#259457]/40 shadow-[0_0_15px_rgba(37,148,87,0.12)]'
                        : 'text-[#52525B] hover:text-[#d2d2d2] hover:bg-white/5'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>{t('profileSettings.tabJava')}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('versions')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all text-left ${
                      activeTab === 'versions'
                        ? 'text-white bg-[#259457]/20 border border-[#259457]/40 shadow-[0_0_15px_rgba(37,148,87,0.12)]'
                        : 'text-[#52525B] hover:text-[#d2d2d2] hover:bg-white/5'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{t('profileSettings.tabVersions')}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('export')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all text-left ${
                      activeTab === 'export'
                        ? 'text-white bg-[#259457]/20 border border-[#259457]/40 shadow-[0_0_15px_rgba(37,148,87,0.12)]'
                        : 'text-[#52525B] hover:text-[#d2d2d2] hover:bg-white/5'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t('profileSettings.tabExport')}</span>
                  </button>
                </div>
              </div>

              {/* Close/Save Buttons at Bottom */}
              <div className="space-y-2">
                <button
                  onClick={handleSave}
                  className="w-full py-2.5 bg-[#259457] hover:bg-[#2fa865] active:scale-[0.98] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-[#259457]/15 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('profileSettings.save')}</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/[0.06] text-[#A1A1AA] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  {t('profileSettings.cancel')}
                </button>
              </div>
            </div>

            {/* Right Tab Content Panel */}
            <div className="flex-grow flex flex-col h-full bg-[#070b19] text-[#d2d2d2] overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-white/[0.04]">
                <div>
                  <h3 className="text-[11px] font-black text-white uppercase tracking-widest">
                    {activeTab === 'files' && t('profileSettings.titleFiles')}
                    {activeTab === 'java' && t('profileSettings.titleJava')}
                    {activeTab === 'versions' && t('profileSettings.titleVersions')}
                    {activeTab === 'export' && t('profileSettings.titleExport')}
                  </h3>
                  <p className="text-[9px] text-[#52525B] font-bold uppercase mt-0.5 tracking-wider">
                    {activeTab === 'files' && t('profileSettings.descFiles')}
                    {activeTab === 'java' && t('profileSettings.descJava')}
                    {activeTab === 'versions' && t('profileSettings.descVersions')}
                    {activeTab === 'export' && t('profileSettings.descExport')}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="hover:bg-white/5 text-[#52525B] hover:text-white p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Bodies */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                
                {/* 1. FILES TAB */}
                {activeTab === 'files' && (
                  <div className="space-y-5">
                    <div className="border border-white/[0.04] bg-black/25 rounded-2xl p-5 space-y-4">
                      <div>
                        <h4 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <FolderOpen className="w-4 h-4 text-[#2D7DD2]" />
                          <span>{t('profileSettings.gameDirectory')}</span>
                        </h4>
                        <p className="text-[8.5px] text-[#A1A1AA] font-semibold mt-1">
                          {t('profileSettings.gameDirectoryDesc')}
                        </p>
                      </div>

                      <div className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[9.5px] font-semibold text-white/90 break-all select-text font-mono">
                        {gameDir || t('profileSettings.noDefaultDir')}
                      </div>

                      <div className="flex gap-2.5">
                        <button
                          onClick={handleSelectDirectory}
                          className="px-4 py-2.5 bg-[#2D7DD2]/20 hover:bg-[#2D7DD2]/30 border border-[#2D7DD2]/30 text-[#2D7DD2] rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          {t('profileSettings.changeDir')}
                        </button>
                        <button
                          onClick={handleResetDirectory}
                          className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/[0.08] text-[#A1A1AA] hover:text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all active:scale-95"
                        >
                          {t('profileSettings.reset')}
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-xl p-4 flex gap-3 items-start">
                      <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                      <div className="text-[8.5px] text-[#F59E0B] font-bold uppercase tracking-wider leading-relaxed">
                        {t('profileSettings.dirWarning')}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. JAVA ENVIRONMENT TAB */}
                {activeTab === 'java' && (
                  <div className="space-y-5">
                    {/* Resolution Card */}
                    <div className="border border-white/[0.04] bg-black/25 rounded-2xl p-5 space-y-4">
                      <div>
                        <h4 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Monitor className="w-4 h-4 text-[#2D7DD2]" />
                          <span>{t('profileSettings.resolution')}</span>
                        </h4>
                        <p className="text-[8.5px] text-[#A1A1AA] font-semibold mt-1">
                          {t('profileSettings.resolutionDesc')}
                        </p>
                      </div>

                      <div className="flex items-center gap-4.5">
                        <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-3.5 py-2 rounded-xl text-[10px] font-black text-white w-28">
                          <span className="text-white/40">{t('profileSettings.width')}</span>
                          <input
                            type="number"
                            value={resW}
                            onChange={(e) => setResW(parseInt(e.target.value, 10) || 1280)}
                            className="bg-transparent border-none w-full text-right focus:outline-none focus:ring-0 font-bold"
                          />
                        </div>
                        <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-3.5 py-2 rounded-xl text-[10px] font-black text-white w-28">
                          <span className="text-white/40">{t('profileSettings.height')}</span>
                          <input
                            type="number"
                            value={resH}
                            onChange={(e) => setResH(parseInt(e.target.value, 10) || 720)}
                            className="bg-transparent border-none w-full text-right focus:outline-none focus:ring-0 font-bold"
                          />
                        </div>

                        {/* Fullscreen Toggle */}
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#A1A1AA] hover:text-white transition-colors text-[9.5px] font-black uppercase tracking-wider ml-auto">
                          <input
                            type="checkbox"
                            checked={fullscreen}
                            onChange={(e) => setFullscreen(e.target.checked)}
                            className="rounded border-white/10 bg-black/40 text-[#2D7DD2] focus:ring-0 w-3.5 h-3.5"
                          />
                          <span>{t('profileSettings.fullscreen')}</span>
                        </label>
                      </div>
                    </div>

                    {/* Allocated Memory Card */}
                    <div className="border border-white/[0.04] bg-black/25 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Sliders className="w-4 h-4 text-[#2D7DD2]" />
                            <span>{t('profileSettings.allocatedRam')}</span>
                          </h4>
                          <p className="text-[8.5px] text-[#A1A1AA] font-semibold mt-1">
                            {t('profileSettings.allocatedRamDesc')}
                          </p>
                        </div>
                        <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-black text-white">
                          {ramVal} GB
                        </div>
                      </div>

                      <div className="flex items-center gap-4.5 pt-2">
                        <div className="flex-grow space-y-2 pr-1">
                          <input
                            type="range"
                            min="1"
                            max={maxRam}
                            step="1"
                            value={ramVal}
                            onChange={(e) => setRamVal(parseInt(e.target.value, 10))}
                            className="w-full h-1 bg-white/[0.04] rounded-lg appearance-none cursor-pointer accent-[#259457]"
                          />
                          <div className="flex justify-between text-[7px] text-[#52525B] font-bold uppercase tracking-wider">
                            <span>1 GB</span>
                            <span>{Math.round(maxRam / 2)} GB</span>
                            <span>{maxRam} GB</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 items-center text-[8.5px] text-[#52525B] font-bold uppercase tracking-wider">
                        <Info className="w-3.5 h-3.5 text-[#52525B]" />
                        <span>{t('profileSettings.recommendedRam')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. VERSIONS TAB */}
                {activeTab === 'versions' && (
                  <div className="space-y-5">
                    {/* Mod loader (Fabric — the only loader MarinMC uses) */}
                    <div className="border border-white/[0.04] bg-black/25 rounded-2xl p-5 space-y-4">
                      <div>
                        <h4 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-[#2D7DD2]" />
                          <span>{t('profileSettings.modLoader')}</span>
                        </h4>
                        <p className="text-[8.5px] text-[#A1A1AA] font-semibold mt-1">
                          {t('profileSettings.modLoaderDesc')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between bg-[#2D7DD2]/10 border border-[#2D7DD2]/40 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#2D7DD2]/20 border border-[#2D7DD2]/30 flex items-center justify-center">
                            <Layers className="w-3.5 h-3.5 text-[#2D7DD2]" />
                          </div>
                          <div className="leading-tight">
                            <span className="text-[12px] font-black text-white block">Fabric</span>
                            <span className="text-[7.5px] font-bold uppercase tracking-wider text-[#2D7DD2]">{t('profileSettings.fabricDesc')}</span>
                          </div>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest bg-[#259457]/20 text-[#259457] border border-[#259457]/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {t('profileSettings.loaderActive')}
                        </span>
                      </div>
                    </div>

                    {/* Real, supported game versions */}
                    <div className="border border-white/[0.04] bg-black/25 rounded-2xl p-5 space-y-4">
                      <div>
                        <h4 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Settings className="w-4 h-4 text-[#2D7DD2]" />
                          <span>{t('profileSettings.versionSelect')}</span>
                        </h4>
                        <p className="text-[8.5px] text-[#A1A1AA] font-semibold mt-1">
                          {t('profileSettings.versionSelectDesc')}
                        </p>
                      </div>

                      <div className="grid grid-cols-5 gap-2.5">
                        {SUPPORTED_VERSIONS.map((v) => {
                          // Only 1.21.8 is active for now; others are "Coming Soon".
                          const active = v.full;
                          return (
                            <button
                              key={v.sub}
                              disabled={!active}
                              onClick={() => active && setSelectedSubVer(v.sub)}
                              className={`relative p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                                !active
                                  ? 'border-white/[0.03] bg-black/40 text-[#52525B] opacity-50 cursor-not-allowed'
                                  : selectedSubVer === v.sub
                                    ? 'border-[#259457] bg-[#259457]/10 text-white shadow-[0_0_15px_rgba(37,148,87,0.12)]'
                                    : 'border-white/[0.04] bg-black/40 hover:bg-black/60 text-[#A1A1AA]'
                              }`}
                            >
                              <span className="text-[12px] font-black leading-none">{v.num}</span>
                              <span className="text-[7.5px] font-bold mt-1 opacity-70">{v.sub}</span>
                              {active ? (
                                <span className="absolute -top-1.5 -right-1.5 text-[6.5px] font-black uppercase tracking-wider bg-[#259457] text-white px-1.5 py-0.5 rounded-md shadow">
                                  {t('profileSettings.fullMods')}
                                </span>
                              ) : (
                                <span className="absolute -top-1.5 -right-1.5 text-[6px] font-black uppercase tracking-wider bg-[#EF4444]/80 text-white px-1.5 py-0.5 rounded-md shadow">
                                  {t('profileSettings.comingSoon')}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Honest note: full MarinMC mod suite is 1.21.8; others run clean Fabric */}
                      <div className="flex gap-2 items-start text-[8px] text-[#52525B] font-bold uppercase tracking-wider leading-relaxed">
                        <Info className="w-3.5 h-3.5 text-[#52525B] shrink-0 mt-0.5" />
                        <span>{t('profileSettings.modScopeNote')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. EXPORT TAB */}
                {activeTab === 'export' && (
                  <div className="space-y-5">
                    {/* Profile Export/Import */}
                    <div className="border border-white/[0.04] bg-black/25 rounded-2xl p-5 space-y-4">
                      <div>
                        <h4 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Download className="w-4 h-4 text-[#2D7DD2]" />
                          <span>{t('profileSettings.exportProfile')}</span>
                        </h4>
                        <p className="text-[8.5px] text-[#A1A1AA] font-semibold mt-1">
                          {t('profileSettings.exportProfileDesc')}
                        </p>
                      </div>
                      <div className="flex gap-2.5">
                        <button
                          onClick={handleExport}
                          className="px-4 py-2.5 bg-[#259457] hover:bg-[#2fa865] text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {t('profileSettings.exportBtn')}
                        </button>
                        <button
                          onClick={handleImport}
                          className="px-4 py-2.5 bg-[#2D7DD2]/20 hover:bg-[#2D7DD2]/30 border border-[#2D7DD2]/30 text-[#2D7DD2] rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          {t('profileSettings.importBtn')}
                        </button>
                      </div>
                    </div>

                    {/* Profile Cloning */}
                    <div className="border border-white/[0.04] bg-black/25 rounded-2xl p-5 space-y-4">
                      <div>
                        <h4 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Copy className="w-4 h-4 text-[#2D7DD2]" />
                          <span>{t('profileSettings.cloneProfile')}</span>
                        </h4>
                        <p className="text-[8.5px] text-[#A1A1AA] font-semibold mt-1">
                          {t('profileSettings.cloneProfileDesc')}
                        </p>
                      </div>
                      <button
                        onClick={handleClone}
                        className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/[0.08] text-[#A1A1AA] hover:text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {t('profileSettings.cloneBtn')}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Notification / Toast Banner */}
            <AnimatePresence>
              {toastMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  className="absolute bottom-5 right-5 bg-[#259457] text-white border border-[#259457]/30 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-2xl flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{toastMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
