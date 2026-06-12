import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore.ts';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import {
  Star, ChevronLeft, ChevronRight,
  Cloud, Sparkles, UploadCloud, Coins, ShoppingBag, Check
} from 'lucide-react';
import ThreePreview from '../components/ThreePreview.tsx';

// Real Minecraft cape images from Imgur (CORS enabled)
const CAPES = [
  { name: 'Minecon 2011', url: 'https://i.imgur.com/dtpq5xi.png', price: 0 },
  { name: 'Minecon 2012', url: 'https://i.imgur.com/AnRw549.png', price: 0 },
  { name: 'Minecon 2013', url: 'https://i.imgur.com/ue6PcKG.png', price: 0 },
  { name: 'Minecon 2015', url: 'https://i.imgur.com/aYBFpDk.png', price: 0 },
  { name: 'Minecon 2016', url: 'https://i.imgur.com/X0eLPPR.png', price: 0 },
  { name: 'Mojang New', url: 'https://i.imgur.com/mFGU1XK.png', price: 250 },
  { name: 'Mojang Studios', url: 'https://i.imgur.com/2sB78nt.png', price: 300 },
  { name: 'Vanilla Cape', url: 'https://i.imgur.com/1C5SJfX.png', price: 150 },
  { name: 'Mor Alev', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300', price: 400 },
  { name: 'Neon Ejder', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300', price: 500 }
];

const FAVORITE_SKINS = [
  { name: 'Shadow Knight', timeKey: 'daysAgo', timeCount: 2, user: 'ShadowKnight' },
  { name: 'Arctic Fox', timeKey: 'daysAgo', timeCount: 5, user: 'ArcticFox' },
  { name: 'Cyber Ninja', timeKey: 'weeksAgo', timeCount: 1, user: 'CyberNinja' },
  { name: 'Crystal Mage', timeKey: 'weeksAgo', timeCount: 2, user: 'CrystalMage' },
];

const LATEST_SKINS = [
  'Notch', 'Herobrine', 'Dream', 'Technoblade', 'Philza', 'Sapnap',
  'BadBoyHalo', 'Skeppy', 'TommyInnit', 'Tubbo', 'Ranboo', 'Wilbur',
];

export default function CosmeticsPage() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const username = session?.name || 'Player';
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedCape, setSelectedCape] = useState(0);
  const [capeScroll, setCapeScroll] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeSkin, setActiveSkin] = useState(username);
  const [activeSkinType, setActiveSkinType] = useState<'username' | 'file'>('username');
  
  const [modelType, setModelType] = useState<'classic' | 'slim'>('classic');
  const [wingsEnabled, setWingsEnabled] = useState<boolean>(true);
  const [coins, setCoins] = useState<number>(500);
  const [purchasedCapes, setPurchasedCapes] = useState<string[]>([]);
  const [showError, setShowError] = useState<string | null>(null);

  // Load active cosmetics from API on mount
  useEffect(() => {
    api.getCosmetics(username).then((data) => {
      setActiveSkin(data.skinVal || username);
      setActiveSkinType(data.skinType);
      setModelType(data.modelType || 'classic');
      setWingsEnabled(data.wingsEnabled !== false);
      setCoins(data.coins !== undefined ? data.coins : 500);
      setPurchasedCapes(data.purchasedCapes || []);

      if (data.capeUrl) {
        const idx = CAPES.findIndex(c => c.url === data.capeUrl);
        if (idx !== -1) {
          setSelectedCape(idx);
        } else {
          setSelectedCape(-1);
        }
      } else {
        setSelectedCape(-1);
      }
    });
  }, [username]);

  // Handler for selecting/buying a cape
  const handleCapeSelect = async (index: number) => {
    const cape = CAPES[index];
    if (!cape) return;

    const isOwned = cape.price === 0 || purchasedCapes.includes(cape.name);
    
    if (isOwned) {
      setSelectedCape(index);
      await api.updateCosmetics(username, {
        skinType: activeSkinType,
        skinVal: activeSkin,
        capeUrl: cape.url,
        modelType,
        wingsEnabled,
        purchasedCapes
      });
    } else {
      // Purchase Flow
      if (coins >= cape.price) {
        const nextCoins = coins - cape.price;
        const nextPurchased = [...purchasedCapes, cape.name];
        setCoins(nextCoins);
        setPurchasedCapes(nextPurchased);
        setSelectedCape(index);
        
        await api.updateCosmetics(username, {
          skinType: activeSkinType,
          skinVal: activeSkin,
          capeUrl: cape.url,
          modelType,
          wingsEnabled,
          purchasedCapes: nextPurchased,
          coins: nextCoins
        });
      } else {
        setShowError('Yetersiz Jeton! Liderlik tablosunda yer alarak veya sunucuda aktif kalarak jeton biriktirebilirsiniz.');
        setTimeout(() => setShowError(null), 3500);
      }
    }
  };

  // Handler for clearing active cape
  const handleClearCape = () => {
    setSelectedCape(-1);
    api.updateCosmetics(username, {
      skinType: activeSkinType,
      skinVal: activeSkin,
      capeUrl: '',
      modelType,
      wingsEnabled,
      purchasedCapes
    });
  };

  // Handler for selecting a predefined skin
  const handleSkinSelect = (skinUser: string) => {
    setActiveSkin(skinUser);
    setActiveSkinType('username');
    const activeCape = selectedCape >= 0 ? CAPES[selectedCape]?.url : '';
    api.updateCosmetics(username, {
      skinType: 'username',
      skinVal: skinUser,
      capeUrl: activeCape || '',
      modelType,
      wingsEnabled,
      purchasedCapes
    });
  };

  // Model selection handler
  const handleModelChange = (type: 'classic' | 'slim') => {
    setModelType(type);
    api.updateCosmetics(username, {
      skinType: activeSkinType,
      skinVal: activeSkin,
      capeUrl: selectedCape >= 0 ? CAPES[selectedCape]?.url : '',
      modelType: type,
      wingsEnabled,
      purchasedCapes
    });
  };

  // Wings toggle handler
  const handleWingsToggle = () => {
    const nextVal = !wingsEnabled;
    setWingsEnabled(nextVal);
    api.updateCosmetics(username, {
      skinType: activeSkinType,
      skinVal: activeSkin,
      capeUrl: selectedCape >= 0 ? CAPES[selectedCape]?.url : '',
      modelType,
      wingsEnabled: nextVal,
      purchasedCapes
    });
  };

  // File upload logic
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processSkinFile(file);
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'image/png') {
      await processSkinFile(file);
    }
  };

  const processSkinFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setActiveSkin(dataUrl);
      setActiveSkinType('file');
      const activeCape = selectedCape >= 0 ? CAPES[selectedCape]?.url : '';
      api.updateCosmetics(username, {
        skinType: 'file',
        skinVal: dataUrl,
        capeUrl: activeCape || '',
        modelType,
        wingsEnabled,
        purchasedCapes
      });

      // Copy file locally via Electron API
      if (window.electronAPI) {
        const filePath = (file as any).path;
        if (filePath) {
          await window.electronAPI.uploadSkinFile(filePath);
        } else {
          const res = await window.electronAPI.uploadSkin();
          if (res.success && res.path) {
            await window.electronAPI.uploadSkinFile(res.path);
          }
        }
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto no-drag custom-scrollbar bg-[#060305] text-[#d2d2d2] select-none h-full w-full space-y-6">
      {/* Title & Jeton Balance */}
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#8B5CF6] animate-pulse" />
          <h1 className="text-sm font-extrabold tracking-widest text-white uppercase">{t('cosmetics.title')}</h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3.5 py-1.5 rounded-xl shadow-[0_0_12px_rgba(245,158,11,0.1)]">
          <Coins className="w-4 h-4" />
          <span>{coins.toLocaleString()} JETON</span>
        </div>
      </div>

      {showError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold px-4 py-2.5 rounded-xl animate-bounce">
          ⚠️ {showError}
        </div>
      )}

      {/* Top Section: Current Skin + Upload + Capes */}
      <div className="flex gap-5 items-stretch">
        {/* Current Skin Preview Card */}
        <div className="w-[240px] shrink-0 flex flex-col gap-2.5">
          <div>
            <span className="text-[9px] font-black text-[#52525B] uppercase tracking-widest mb-2 block">{t('cosmetics.currentSkin')}</span>
            <div className="relative bg-[#0a0a0a] border border-white/[0.05] hover:border-white/10 rounded-2xl p-4 h-[240px] flex flex-col items-center justify-between overflow-hidden group transition-all duration-300">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-[#8B5CF6]/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-[#8B5CF6]/8 transition-all duration-300" />
              
              <div className="self-start z-20 flex justify-between w-full items-center">
                <span className="text-[8px] bg-white/5 border border-white/10 text-[#d2d2d2] px-2 py-0.5 rounded-md font-bold uppercase truncate max-w-[120px]">
                  {activeSkinType === 'file' ? 'Özel Cilt' : activeSkin}
                </span>
                {selectedCape !== -1 && (
                  <span className="text-[7px] bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#a78bfa] px-1.5 py-0.5 rounded font-black uppercase">
                    Pelerin Aktif
                  </span>
                )}
              </div>

              {/* 3D Skin Preview */}
              <div className="w-full h-[160px] z-10 flex items-center justify-center">
                <ThreePreview skin={activeSkin} capeUrl={selectedCape !== -1 ? CAPES[selectedCape]?.url : undefined} wingsEnabled={wingsEnabled} modelType={modelType} />
              </div>

              <span className="text-[7px] text-[#52525B] font-black uppercase tracking-widest bg-white/[0.02] border border-white/[0.04] px-2 py-0.5 rounded-md z-20">
                Çevirmek için sürükleyin
              </span>
            </div>
          </div>

          {/* Model & Wing settings */}
          <div className="bg-[#0a0a0a] border border-white/[0.04] hover:border-white/[0.08] rounded-2xl p-3.5 flex flex-col gap-3 transition-all duration-300">
            <div>
              <span className="text-[8px] font-black text-[#52525B] uppercase tracking-widest mb-1.5 block">Kol Modeli</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleModelChange('classic')}
                  className={`text-[8.5px] font-black py-1.5 rounded-lg border transition-all uppercase tracking-wider ${
                    modelType === 'classic'
                      ? 'bg-[#8B5CF6]/15 border-[#8B5CF6]/40 text-[#a78bfa] shadow-[0_0_10px_rgba(139,92,246,0.1)]'
                      : 'bg-[#050505] border-white/5 text-[#d2d2d2]/60 hover:text-[#d2d2d2] hover:border-white/10'
                  }`}
                >
                  Steve (Classic)
                </button>
                <button
                  onClick={() => handleModelChange('slim')}
                  className={`text-[8.5px] font-black py-1.5 rounded-lg border transition-all uppercase tracking-wider ${
                    modelType === 'slim'
                      ? 'bg-[#8B5CF6]/15 border-[#8B5CF6]/40 text-[#a78bfa] shadow-[0_0_10px_rgba(139,92,246,0.1)]'
                      : 'bg-[#050505] border-white/5 text-[#d2d2d2]/60 hover:text-[#d2d2d2] hover:border-white/10'
                  }`}
                >
                  Alex (Slim)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.03] pt-2.5">
              <div className="flex flex-col">
                <span className="text-[8.5px] font-black text-[#d2d2d2]/80 uppercase tracking-widest">Ejderha Kanatları</span>
                <span className="text-[7px] text-[#52525B] font-bold uppercase tracking-wider mt-0.5">3D Neon Işıltılı</span>
              </div>
              <button
                onClick={handleWingsToggle}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 relative ${
                  wingsEnabled ? 'bg-[#8B5CF6]' : 'bg-[#1a1a1a] border border-white/5'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-300 shadow-[0_1px_3px_rgba(0,0,0,0.4)] ${
                    wingsEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Upload Skin Card */}
        <div className="w-[180px] shrink-0 flex flex-col">
          <span className="text-[9px] font-black text-[#52525B] uppercase tracking-widest mb-2 block">{t('cosmetics.uploadSkin')}</span>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 border border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 ${
              isDragOver
                ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                : 'border-white/10 hover:border-white/20 bg-[#0a0a0a] hover:bg-white/[0.01]'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center transition-transform duration-300">
              <UploadCloud className="w-5 h-5 text-white/40" />
            </div>
            <div className="text-center px-2">
              <p className="text-[9px] font-black text-white/70 tracking-wide uppercase mb-0.5">{t('cosmetics.dragAndDrop')}</p>
              <p className="text-[8px] text-[#52525B] font-bold leading-normal">{t('cosmetics.fileOrBrowse')}</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Capes Selector & Store Card */}
        <div className="flex-grow flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-[#52525B] uppercase tracking-widest">Kozmetik Mağazası (Pelerinler)</span>
              {selectedCape !== -1 && (
                <button
                  onClick={handleClearCape}
                  className="text-[7px] text-[#EF4444] hover:underline font-bold uppercase tracking-wider bg-red-500/5 px-1.5 py-0.5 rounded border border-red-500/10"
                >
                  Pelerini Kaldır
                </button>
              )}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setCapeScroll(Math.max(0, capeScroll - 1))}
                disabled={capeScroll === 0}
                className="w-6 h-6 rounded-lg bg-[#0a0a0a] border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCapeScroll(Math.min(CAPES.length - 4, capeScroll + 1))}
                disabled={capeScroll >= CAPES.length - 4}
                className="w-6 h-6 rounded-lg bg-[#0a0a0a] border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-[#0a0a0a] border border-white/[0.04] rounded-2xl p-4 flex gap-3 overflow-hidden items-center justify-start">
            {CAPES.slice(capeScroll, capeScroll + 4).map((cape, idx) => {
              const actualIdx = capeScroll + idx;
              const isOwned = cape.price === 0 || purchasedCapes.includes(cape.name);
              const isActive = selectedCape === actualIdx;
              
              return (
                <motion.button
                  key={cape.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => handleCapeSelect(actualIdx)}
                  className={`w-[84px] h-[110px] rounded-xl border-2 flex flex-col items-center justify-end pb-1.5 overflow-hidden bg-[#0e0e0e] shrink-0 transition-all duration-300 relative group ${
                    isActive
                      ? 'border-[#8B5CF6] shadow-[0_0_15px_rgba(139,92,246,0.3)] scale-105 bg-[#120f1a]'
                      : isOwned 
                        ? 'border-white/5 hover:border-white/15 opacity-80 hover:opacity-100'
                        : 'border-[#3F3F46]/30 hover:border-amber-500/20 opacity-60 hover:opacity-100 bg-[#080808]'
                  }`}
                >
                  {/* Cape Image Container */}
                  <div className="absolute inset-1.5 bottom-6 bg-white/[0.01] border border-white/[0.03] rounded-lg overflow-hidden flex items-center justify-center">
                    <img
                      src={cape.url}
                      alt={cape.name}
                      className="w-full h-full object-contain rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://i.imgur.com/1C5SJfX.png';
                      }}
                    />
                  </div>
                  
                  {/* Price Tag or Status */}
                  <div className="z-10 w-full px-1 text-center truncate">
                    <span className="text-[6.5px] font-black text-white/70 group-hover:text-white truncate block uppercase tracking-wider">{cape.name}</span>
                    {isActive ? (
                      <span className="text-[5px] text-[#8B5CF6] font-black uppercase tracking-widest block mt-0.5">Kuşanıldı</span>
                    ) : isOwned ? (
                      <span className="text-[5px] text-emerald-400 font-bold uppercase tracking-widest flex items-center justify-center gap-0.5 mt-0.5">
                        <Check className="w-1.5 h-1.5" /> Sahip
                      </span>
                    ) : (
                      <span className="text-[5.5px] text-amber-400 font-black uppercase tracking-widest flex items-center justify-center gap-0.5 mt-0.5 bg-amber-400/10 py-0.5 rounded border border-amber-400/20">
                        <ShoppingBag className="w-1.5 h-1.5" /> {cape.price} JT
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Cloud Sync Status */}
          <div className="flex items-center gap-1.5 mt-2.5 text-[8px] text-[#52525B] font-bold uppercase tracking-wider">
            <Cloud className="w-3 h-3 text-[#8B5CF6]" />
            <span>Kalıcı Profil Mağazası (API Senkronizasyonu Aktif)</span>
          </div>
        </div>
      </div>

      {/* Favorites Section */}
      <div>
        <div className="flex items-center justify-between mb-3 border-b border-white/[0.04] pb-2">
          <span className="text-[9px] font-black text-[#52525B] uppercase tracking-widest">{t('cosmetics.favorites')}</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {FAVORITE_SKINS.map((skin, idx) => (
            <motion.div
              key={skin.user}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleSkinSelect(skin.user)}
              className={`w-[144px] h-[190px] shrink-0 bg-[#0a0a0a] border rounded-2xl p-3 flex flex-col items-center justify-between group cursor-pointer transition-all duration-300 relative ${
                activeSkin === skin.user && activeSkinType === 'username'
                  ? 'border-[#8B5CF6] shadow-[0_0_15px_rgba(139,92,246,0.15)] bg-[#120f1a]'
                  : 'border-white/[0.04] hover:border-white/10 hover:bg-white/[0.01]'
              }`}
            >
              <div className="absolute top-3 left-3 z-10 w-5 h-5 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center">
                <Star className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" />
              </div>

              <div className="flex-1 flex items-center justify-center mt-3">
                <img
                  src={`https://mc-heads.net/body/${skin.user}/90`}
                  alt={skin.name}
                  className="max-h-[120px] object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="text-center mt-2">
                <p className="text-[10px] font-black text-white leading-none uppercase tracking-wide">{skin.name}</p>
                <p className="text-[8px] text-[#52525B] font-bold uppercase tracking-wide mt-1">{t(`cosmetics.${skin.timeKey}`, { count: skin.timeCount })}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Latest Skins Grid */}
      <div>
        <span className="text-[9px] font-black text-[#52525B] uppercase tracking-widest mb-3 block border-b border-white/[0.04] pb-2">{t('cosmetics.latest')}</span>
        <div className="grid grid-cols-6 gap-3">
          {LATEST_SKINS.map((skin, idx) => (
            <motion.div
              key={skin}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => handleSkinSelect(skin)}
              className={`bg-[#0a0a0a] border rounded-2xl p-3 flex flex-col items-center cursor-pointer transition-all duration-300 group relative ${
                activeSkin === skin && activeSkinType === 'username'
                  ? 'border-[#8B5CF6] shadow-[0_0_12px_rgba(139,92,246,0.15)] bg-[#120f1a]'
                  : 'border-white/[0.04] hover:border-white/10 hover:bg-white/[0.01]'
              }`}
            >
              <div className="absolute top-2.5 left-2.5 z-10">
                <Star className={`w-2.5 h-2.5 transition-colors ${activeSkin === skin && activeSkinType === 'username' ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-[#52525B] group-hover:text-[#F59E0B]'}`} />
              </div>

              <img
                src={`https://mc-heads.net/body/${skin}/60`}
                alt={skin}
                className="h-[80px] object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300"
              />
              <p className="text-[8px] font-black text-white/50 group-hover:text-white truncate w-full text-center mt-2 uppercase tracking-wide">{skin}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
