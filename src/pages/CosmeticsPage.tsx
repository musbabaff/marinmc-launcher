import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore.ts';
import { motion } from 'framer-motion';
import {
  Star, ChevronLeft, ChevronRight,
  Cloud, Plus
} from 'lucide-react';
import ThreePreview from '../components/ThreePreview.tsx';

// Real Minecraft cape images from NameMC
const CAPES = [
  { name: 'Minecon 2011', url: 'https://s.namemc.com/i/9e507ed2b1a76857.png' },
  { name: 'Minecon 2012', url: 'https://s.namemc.com/i/4378e332b2b64e47.png' },
  { name: 'Minecon 2013', url: 'https://s.namemc.com/i/c9afbbe6a8d0bef1.png' },
  { name: 'Minecon 2015', url: 'https://s.namemc.com/i/8c93b1e0b24a0d2b.png' },
  { name: 'Minecon 2016', url: 'https://s.namemc.com/i/19bf3bb467659883.png' },
  { name: 'Mojang', url: 'https://s.namemc.com/i/0654b7e4bb3b6dd0.png' },
  { name: 'Cherry Blossom', url: 'https://s.namemc.com/i/d7b95af7a1aba498.png' },
  { name: 'Vanilla', url: 'https://s.namemc.com/i/cf1ad0e328cf1e3a.png' },
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
  const username = session?.name || 'Steve';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCape, setSelectedCape] = useState(0);
  const [capeScroll, setCapeScroll] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeSkin, setActiveSkin] = useState(username);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleSkinSelect = (skinUser: string) => {
    setActiveSkin(skinUser);
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto no-drag custom-scrollbar bg-[#060305] text-[#d2d2d2] select-none h-full w-full space-y-5">

      {/* Title */}
      <h1 className="text-sm font-extrabold tracking-widest text-white uppercase">{t('cosmetics.title')}</h1>

      {/* Top Section: Current Skin + Upload + Capes */}
      <div className="flex gap-4 items-stretch">

        {/* Current Skin Preview */}
        <div className="w-[220px] shrink-0">
          <span className="text-[9px] font-bold text-[#52525B] uppercase tracking-widest mb-2 block">{t('cosmetics.currentSkin')}</span>
          <div className="relative bg-[#0a0a0a] border-2 border-[#2D7DD2]/40 rounded-2xl p-3 h-[280px] flex items-center justify-center overflow-hidden group">
            {/* Glowing border effect */}
            <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_30px_rgba(45,125,210,0.15)] pointer-events-none" />

            {/* 3D Skin Preview with Three.js */}
            <div className="w-full h-[220px] z-10 flex items-center justify-center">
              <ThreePreview skin={activeSkin} capeUrl={CAPES[selectedCape]?.url} />
            </div>

            {/* Active skin name badge */}
            <div className="absolute top-3 left-3 z-20">
              <span className="text-[8px] bg-[#2D7DD2]/20 text-[#2D7DD2] border border-[#2D7DD2]/30 px-2 py-0.5 rounded-md font-bold uppercase">{activeSkin}</span>
            </div>

            {/* Bottom action info label */}
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 z-20">
              <span className="text-[8px] text-[#52525B] font-bold uppercase tracking-widest bg-black/40 px-2 py-1 rounded-md border border-white/5">
                Çevirmek için Sürükleyin
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Upload Skin */}
        <div className="w-[160px] shrink-0 flex flex-col">
          <span className="text-[9px] font-bold text-[#52525B] uppercase tracking-widest mb-2 block">{t('cosmetics.uploadSkin')}</span>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
              isDragOver
                ? 'border-[#2D7DD2] bg-[#2D7DD2]/10'
                : 'border-white/10 hover:border-white/20 bg-[#0a0a0a]'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Plus className="w-5 h-5 text-white/40" />
            </div>
            <div className="text-center">
              <p className="text-[9px] font-bold text-white/60">{t('cosmetics.dragAndDrop')}</p>
              <p className="text-[8px] text-[#52525B] font-medium">{t('cosmetics.fileOrBrowse')}</p>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept=".png" className="hidden" />
        </div>

        {/* Right: Capes — Real cape images */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold text-[#52525B] uppercase tracking-widest">{t('cosmetics.capes')}</span>
            <div className="flex gap-1">
              <button
                onClick={() => setCapeScroll(Math.max(0, capeScroll - 1))}
                className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => setCapeScroll(Math.min(CAPES.length - 4, capeScroll + 1))}
                className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="flex gap-2 overflow-hidden">
            {CAPES.slice(capeScroll, capeScroll + 6).map((cape, idx) => (
              <motion.button
                key={cape.name}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedCape(capeScroll + idx)}
                className={`w-[72px] h-[100px] rounded-xl border-2 flex flex-col items-center justify-end pb-1.5 overflow-hidden bg-[#0a0a0a] shrink-0 transition-all relative group ${
                  selectedCape === capeScroll + idx
                    ? 'border-[#2D7DD2] shadow-[0_0_12px_rgba(45,125,210,0.3)] scale-105'
                    : 'border-white/10 hover:border-white/25 opacity-70 hover:opacity-100'
                }`}
              >
                {/* Cape image */}
                <img
                  src={cape.url}
                  alt={cape.name}
                  className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-20px)] object-contain rounded-lg"
                  onError={(e) => {
                    // Fallback to colored div if image fails
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-[6px] font-bold text-white/70 truncate px-1 z-10 relative">{cape.name}</span>
              </motion.button>
            ))}
          </div>

          {/* Cloud sync */}
          <div className="flex items-center gap-1.5 mt-3 text-[8px] text-[#52525B] font-medium">
            <Cloud className="w-3 h-3" />
            <span>{t('cosmetics.synced')}</span>
          </div>
        </div>
      </div>

      {/* Favorites Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-bold text-[#52525B] uppercase tracking-widest">{t('cosmetics.favorites')}</span>
            <div className="flex-1 h-px bg-white/[0.04]" />
          </div>
          <div className="flex gap-1">
            <button className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {FAVORITE_SKINS.map((skin, idx) => (
            <motion.div
              key={skin.user}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              onClick={() => handleSkinSelect(skin.user)}
              className={`w-[140px] h-[180px] shrink-0 bg-[#0a0a0a] border rounded-xl p-2 flex flex-col items-center justify-between group cursor-pointer transition-all relative ${
                activeSkin === skin.user ? 'border-[#2D7DD2] shadow-[0_0_10px_rgba(45,125,210,0.2)]' : 'border-white/[0.06] hover:border-white/10'
              }`}
            >
              {/* Star icon */}
              <div className="absolute top-2 left-2 z-10">
                <Star className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" />
              </div>

              {/* Skin preview */}
              <div className="flex-1 flex items-center justify-center">
                <img
                  src={`https://mc-heads.net/body/${skin.user}/100`}
                  alt={skin.name}
                  className="max-h-[120px] object-contain drop-shadow-lg group-hover:scale-105 transition-transform"
                />
              </div>

              {/* Name + time */}
              <div className="text-center mt-1">
                <p className="text-[10px] font-bold text-white leading-none">{skin.name}</p>
                <p className="text-[8px] text-[#52525B] font-medium mt-0.5">{t(`cosmetics.${skin.timeKey}`, { count: skin.timeCount })}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Latest Section */}
      <div>
        <span className="text-[9px] font-bold text-[#52525B] uppercase tracking-widest mb-3 block">{t('cosmetics.latest')}</span>
        <div className="grid grid-cols-6 gap-2.5">
          {LATEST_SKINS.map((skin, idx) => (
            <motion.div
              key={skin}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => handleSkinSelect(skin)}
              className={`bg-[#0a0a0a] border rounded-xl p-2 flex flex-col items-center cursor-pointer transition-all group relative ${
                activeSkin === skin ? 'border-[#2D7DD2] shadow-[0_0_8px_rgba(45,125,210,0.2)]' : 'border-white/[0.04] hover:border-white/10'
              }`}
            >
              {/* Star outline */}
              <div className="absolute top-1.5 left-1.5 z-10">
                <Star className={`w-2.5 h-2.5 transition-colors ${activeSkin === skin ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-white/20 group-hover:text-[#F59E0B]'}`} />
              </div>

              <img
                src={`https://mc-heads.net/body/${skin}/70`}
                alt={skin}
                className="h-[80px] object-contain drop-shadow-md group-hover:scale-105 transition-transform"
              />
              <p className="text-[8px] font-bold text-white/60 mt-1.5 truncate w-full text-center">{skin}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
