import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../stores/settingsStore.ts';
import { ChevronDown, Settings, Tag, Hammer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileSettingsModal from '../components/ProfileSettingsModal.tsx';

import vBg1 from '../../assets/version-bg-1.png';
import vBg2 from '../../assets/version-bg-2.png';
import vBg3 from '../../assets/version-bg-3.png';
import vBg4 from '../../assets/version-bg-4.png';
import vBg5 from '../../assets/version-bg-5.png';

interface VersionItem {
  num: string;
  label: string;
  subs: string[];
  bgUrl: string;
  iconType: 'tag' | 'anvil';
}

const VERSION_LIST: VersionItem[] = [
  {
    num: '1.21',
    label: 'Fabric 🔷 1.21.8',
    subs: ['1.21.8'],
    bgUrl: vBg2,
    iconType: 'tag'
  },
  {
    num: '1.20',
    label: 'Fabric 🔷 1.20.x',
    subs: ['1.20.4', '1.20.2', '1.20.1', '1.20'],
    bgUrl: vBg3,
    iconType: 'tag'
  },
  {
    num: '1.19',
    label: 'Fabric 🔷 1.19.x',
    subs: ['1.19.4', '1.19.2', '1.19'],
    bgUrl: vBg4,
    iconType: 'tag'
  },
  {
    num: '1.18',
    label: 'Fabric 🔷 1.18.x',
    subs: ['1.18.2', '1.18.1', '1.18'],
    bgUrl: vBg1,
    iconType: 'tag'
  },
  {
    num: '1.17',
    label: 'Fabric 🔷 1.17.x',
    subs: ['1.17.1', '1.17'],
    bgUrl: vBg5,
    iconType: 'tag'
  },
  {
    num: '1.16',
    label: 'Fabric 🔷 1.16.x',
    subs: ['1.16.5', '1.16.4', '1.16.1'],
    bgUrl: vBg5,
    iconType: 'tag'
  },
  {
    num: '1.13',
    label: 'Vanilla ☕ 1.13.x',
    subs: ['1.13.1', '1.13.2'],
    bgUrl: vBg4,
    iconType: 'tag'
  },
  {
    num: '1.12',
    label: 'Forge 🛠️ 1.12.x',
    subs: ['1.12.2', '1.12.1'],
    bgUrl: vBg1,
    iconType: 'tag'
  },
  {
    num: '1.8',
    label: 'Vanilla ☕ 1.8.x',
    subs: ['1.8.9', '1.8.8'],
    bgUrl: vBg2,
    iconType: 'anvil'
  },
  {
    num: '1.7',
    label: 'Forge 🛠️ 1.7.x',
    subs: ['1.7.10', '1.7.2'],
    bgUrl: vBg3,
    iconType: 'anvil'
  }
];

export default function VersionsPage() {
  const settings = useSettingsStore();
  const navigate = useNavigate();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdown(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleSelectVersion = (num: string, defaultSub: string) => {
    settings.setSelectedVersion(num);
    settings.setSelectedSubVersion(defaultSub);
  };

  const handleLaunchVersion = (num: string, sub: string) => {
    settings.setSelectedVersion(num);
    settings.setSelectedSubVersion(sub);
    // Use session/query param to trigger immediate launch on HomePage
    navigate('/home?launch=true');
  };

  const toggleDropdown = (e: React.MouseEvent, num: string) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === num ? null : num);
  };

  const selectSubVersion = (e: React.MouseEvent, num: string, sub: string) => {
    e.stopPropagation();
    settings.setSelectedVersion(num);
    settings.setSelectedSubVersion(sub);
    setActiveDropdown(null);
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto no-drag custom-scrollbar bg-[#070b19] text-[#d2d2d2] select-none h-full w-full">
      {/* Title */}
      <div className="mb-5 flex justify-between items-center">
        <h1 className="text-sm font-extrabold tracking-widest text-white uppercase">CHANGE VERSION</h1>
      </div>

      {/* Grid of Version Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-6">
        {VERSION_LIST.map((ver) => {
          // Yalnızca 1.21.8 şu an aktif; diğer tüm sürümler "Yakında" olarak gösterilir.
          const isActive = ver.num === '1.21';
          const isSelected = settings.selectedVersion === ver.num && isActive;
          const currentSub = settings.selectedVersion === ver.num ? settings.selectedSubVersion : ver.subs[0];
          const isOpen = activeDropdown === ver.num && isActive;

          return (
            <div
              key={ver.num}
              onClick={() => isActive && handleSelectVersion(ver.num, currentSub)}
              className={`h-[185px] rounded-2xl border p-4 flex flex-col justify-between relative overflow-hidden group transition-all duration-300 ${
                isSelected
                  ? 'border-[#2D7DD2] bg-[#070b19] shadow-[0_0_20px_rgba(45,125,210,0.25)]'
                  : 'border-white/[0.04] bg-[#070b19]'
              } ${!isActive ? 'opacity-50 pointer-events-none select-none' : 'cursor-pointer'}`}
            >
              {/* Coming soon badge */}
              {!isActive && (
                <div className="absolute top-3 right-3 bg-red-500/20 border border-red-500/40 text-red-400 text-[8.5px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider z-20">
                  {settings.language === 'tr' ? 'YAKINDA' : 'COMING SOON'}
                </div>
              )}
              {/* Background Artwork */}
              <div
                className={`absolute inset-0 bg-cover bg-center transition-all duration-500 pointer-events-none ${
                  isSelected ? 'opacity-[0.50] scale-102' : 'opacity-[0.25] group-hover:opacity-[0.35]'
                }`}
                style={{ backgroundImage: `url(${ver.bgUrl})` }}
              />
              
              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#070b19]/90 via-[#070b19]/35 to-transparent pointer-events-none" />

              {/* Card Top: Subversion Selector Badge */}
              <div className="flex justify-between items-start z-10">
                <div className="relative">
                  <button
                    onClick={(e) => isActive && toggleDropdown(e, ver.num)}
                    className="bg-black/60 hover:bg-black/80 px-2 py-0.8 rounded-lg text-[9px] font-bold text-white border border-white/10 flex items-center gap-1.5 transition-all"
                  >
                    <span>{currentSub}</span>
                    <ChevronDown className="w-2.5 h-2.5 text-white/50" />
                  </button>

                  {/* Dropdown Options */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-6.5 left-0 bg-[#070b19] border border-white/10 rounded-lg py-1 z-30 flex flex-col min-w-[75px] shadow-2xl text-[9px] font-bold max-h-24 overflow-y-auto custom-scrollbar"
                      >
                        {ver.subs.map((sub) => (
                          <button
                            key={sub}
                            onClick={(e) => selectSubVersion(e, ver.num, sub)}
                            className="px-2.5 py-1 text-[#A1A1AA] hover:text-white hover:bg-white/5 text-left w-full transition-colors"
                          >
                            {sub}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Card Center: Large Version Header */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <span className="text-3xl md:text-4xl font-black text-white tracking-wide font-sans select-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)]">
                  {ver.num}
                </span>
              </div>

              {/* Card Bottom Controls */}
              <div className="flex justify-between items-end z-10">
                {/* Left icon: tag or anvil */}
                <div className="p-1.5 rounded-lg bg-black/40 border border-white/5 text-white/60">
                  {ver.iconType === 'tag' ? (
                    <Tag className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Hammer className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-1.5">
                  {/* Settings gear */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectVersion(ver.num, currentSub);
                      setSettingsOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-black/40 border border-white/5 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>

                  {/* Launch button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLaunchVersion(ver.num, currentSub);
                    }}
                    className={`w-[68px] h-[26px] rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center transition-all duration-300 ${
                      isSelected
                        ? 'bg-[#2D7DD2] hover:bg-[#4A9AE8] text-white shadow-[0_4px_12px_rgba(45,125,210,0.2)]'
                        : 'bg-black/40 border border-white/5 text-[#52525B] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    LAUNCH
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Profile Settings Modal Overlay */}
      <ProfileSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
