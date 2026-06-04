import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore.ts';
import { sanitizeUrl, sanitizeParam } from '../lib/security.ts';
import {
  UploadCloud, RefreshCw, Star, Download, Check, Cloud
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SkinItem {
  id: string;
  name: string;
  username: string;
  daysAgo: string;
  starred: boolean;
}

const MOCK_FAVORITE_SKINS: SkinItem[] = [
  { id: 'fav1', name: 'Takım Elbise', username: 'Steve', daysAgo: '13g', starred: true },
  { id: 'fav2', name: 'Astronot', username: 'alex_mc', daysAgo: '20g', starred: true },
  { id: 'fav3', name: 'Kışlık Kürk', username: 'Luser_29', daysAgo: '1a', starred: true },
  { id: 'fav4', name: 'Gladyatör', username: 'HypixelGod', daysAgo: '3a', starred: false }
];

const MOCK_LATEST_SKINS: SkinItem[] = [
  { id: 'lat1', name: 'Samuray', username: 'Notch', daysAgo: '1s', starred: false },
  { id: 'lat2', name: 'Korsan', username: 'Dream', daysAgo: '3s', starred: false },
  { id: 'lat3', name: 'Robot', username: 'MumboJumbo', daysAgo: '5s', starred: false },
  { id: 'lat4', name: 'Ninja', username: 'Skeppy', daysAgo: '1g', starred: false },
  { id: 'lat5', name: 'Büyücü', username: 'Technoblade', daysAgo: '2g', starred: false },
  { id: 'lat6', name: 'Cyberpunk', username: 'Grian', daysAgo: '3g', starred: false }
];

const CAPES = [
  { id: 'cape1', color: 'bg-pink-600', name: 'Pink Cape' },
  { id: 'cape2', color: 'bg-emerald-600', name: 'Green Cape' },
  { id: 'cape3', color: 'bg-teal-600', name: 'Teal Cape' },
  { id: 'cape4', color: 'bg-indigo-600', name: 'Purple Cape' },
  { id: 'cape5', color: 'bg-amber-600', name: 'Gold Cape' },
  { id: 'cape6', color: 'bg-zinc-800', name: 'Dark Cape' }
];

export default function CosmeticsPage() {
  const { t } = useTranslation();
  const session = useAuthStore((state) => state.session);

  const [activeSkinUser, setActiveSkinUser] = useState(session?.name || 'Steve');
  const [selectedCapeId, setSelectedCapeId] = useState('cape4');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedSkinPath, setUploadedSkinPath] = useState<string | null>(null);

  // Rotate body animation mockup state
  const [rotated, setRotated] = useState(false);

  const handleUploadSkin = async () => {
    if (window.electronAPI) {
      const res = await window.electronAPI.uploadSkin();
      if (res.success && res.path) {
        setUploadedSkinPath(res.path);
        // Set skin viewer name to custom placeholder or username
        alert('Kostüm başarıyla yüklendi! Dosya: ' + res.path);
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.png')) {
        setUploadedSkinPath(file.name);
        alert('Kostüm dosyası başarıyla yüklendi: ' + file.name);
      } else {
        alert('Lütfen geçerli bir .png kostüm dosyası sürükleyin.');
      }
    }
  };

  return (
    <div className="flex-grow flex flex-col p-6 overflow-y-auto no-drag custom-scrollbar space-y-5 select-none bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#1E1E1E] pb-4">
        <div>
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">{t('cosmetics.title')}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Cloud className="w-3.5 h-3.5 text-[#52525B]" />
            <span className="text-[10px] text-[#A1A1AA] font-bold">Gardırop MarinMC Bulutuna bağlı</span>
          </div>
        </div>
      </div>

      {/* Main sections layout */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        
        {/* Left column: 2D isometric skin viewer (4 cols) */}
        <div className="col-span-4 bg-[#111111] border border-[#1E1E1E] rounded-2xl p-4 flex flex-col items-center justify-between min-h-[300px]">
          <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-widest self-start">
            {t('cosmetics.currentSkin')}
          </span>

          {/* Isometric view mc-heads body render */}
          <div className="relative my-4 flex items-center justify-center h-44">
            <motion.img
              src={sanitizeUrl(`https://mc-heads.net/body/${sanitizeParam(activeSkinUser)}/180`)}
              alt="skin body render"
              animate={{ rotateY: rotated ? 180 : 0 }}
              transition={{ duration: 0.6 }}
              className="max-h-full object-contain pointer-events-none select-none drop-shadow-xl"
            />
          </div>

          <div className="w-full space-y-2">
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setRotated(!rotated)}
                className="flex-1 py-2 bg-white/[0.03] border border-[#2A2A2A] text-[#A1A1AA] hover:text-white rounded-xl text-[10px] font-bold uppercase transition-all flex justify-center items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Döndür</span>
              </button>
              <button className="flex-1 py-2 bg-white/[0.03] border border-[#2A2A2A] text-[#A1A1AA] hover:text-white rounded-xl text-[10px] font-bold uppercase transition-all flex justify-center items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                <span>İndir</span>
              </button>
            </div>
            <button className="w-full py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider flex justify-center items-center gap-1.5 shadow-glow-purple">
              <Check className="w-4 h-4" />
              <span>Aktif Et</span>
            </button>
          </div>
        </div>

        {/* Center column: Upload skin zone (4 cols) */}
        <div className="col-span-4 bg-[#111111] border border-[#1E1E1E] rounded-2xl p-4 flex flex-col justify-between min-h-[300px]">
          <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-widest block mb-4">
            {t('cosmetics.uploadSkin')}
          </span>

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={handleUploadSkin}
            className={`flex-grow border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-[#8B5CF6] bg-[#8B5CF6]/5'
                : 'border-[#2A2A2A] hover:border-[#8B5CF6]/50 bg-white/[0.01]'
            }`}
          >
            <UploadCloud className="w-8 h-8 text-[#52525B] mb-2 animate-bounce" />
            <span className="text-xs font-bold text-white mb-1">Yeni Kostüm Seçin (.png)</span>
            <span className="text-[9px] text-[#A1A1AA] font-semibold leading-relaxed">Dosyayı buraya sürükleyin veya göz atmak için tıklayın</span>
            {uploadedSkinPath && (
              <div className="mt-3 px-3 py-1 bg-emerald-500/15 border border-emerald-500/25 rounded text-[8px] text-emerald-400 font-mono">
                {uploadedSkinPath}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Capes (4 cols) */}
        <div className="col-span-4 bg-[#111111] border border-[#1E1E1E] rounded-2xl p-4 flex flex-col justify-between min-h-[300px]">
          <div>
            <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-widest block mb-4">
              {t('cosmetics.capes')}
            </span>

            {/* Cape grid */}
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {CAPES.map((cape) => {
                const selected = cape.id === selectedCapeId;
                return (
                  <div
                    key={cape.id}
                    onClick={() => setSelectedCapeId(cape.id)}
                    className={`aspect-[2/3] rounded-lg border cursor-pointer p-1 flex flex-col justify-between transition-all ${
                      selected
                        ? 'border-[#8B5CF6] bg-[#8B5CF6]/5 shadow-[0_0_10px_rgba(139,92,246,0.15)]'
                        : 'border-[#2A2A2A] bg-black/45 hover:border-[#52525B]'
                    }`}
                  >
                    <div className={`w-full h-12 rounded ${cape.color} flex items-center justify-center font-extrabold text-[8px] text-white/5 opacity-55`}>
                      CAPE
                    </div>
                    <span className="text-[8px] font-bold text-[#A1A1AA] text-center leading-tight truncate">{cape.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full pt-4">
            <span className="text-[8px] text-[#52525B] font-bold block text-center uppercase tracking-widest">Capes synced to MarinMC Cloud</span>
          </div>
        </div>

      </div>

      {/* Favorites list */}
      <div className="space-y-3">
        <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-widest block">{t('cosmetics.favorites')}</span>
        <div className="grid grid-cols-4 gap-4">
          {MOCK_FAVORITE_SKINS.map((skin) => (
            <div
              key={skin.id}
              onClick={() => setActiveSkinUser(skin.username)}
              className="bg-[#111111] border border-[#1E1E1E] hover:border-[#2A2A2A] rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3">
                <img
                  src={sanitizeUrl(`https://mc-heads.net/avatar/${sanitizeParam(skin.username)}/32`)}
                  alt={skin.name}
                  className="w-8 h-8 rounded-lg border border-white/5"
                />
                <div>
                  <h4 className="text-xs font-bold text-white leading-none mb-1">{skin.name}</h4>
                  <p className="text-[9px] text-[#52525B] leading-none">Sahip: {skin.username}</p>
                </div>
              </div>
              <Star className={`w-4 h-4 ${skin.starred ? 'text-amber-500 fill-amber-500' : 'text-[#52525B]'}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Latest community list */}
      <div className="space-y-3 pt-2">
        <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-widest block">Topluluk Kostümleri</span>
        <div className="grid grid-cols-6 gap-3">
          {MOCK_LATEST_SKINS.map((skin) => (
            <div
              key={skin.id}
              onClick={() => setActiveSkinUser(skin.username)}
              className="bg-[#111111] border border-[#1E1E1E] hover:border-[#8B5CF6]/50 rounded-xl p-3 flex flex-col items-center text-center cursor-pointer transition-all"
            >
              <img
                src={sanitizeUrl(`https://mc-heads.net/avatar/${sanitizeParam(skin.username)}/28`)}
                alt={skin.name}
                className="w-7 h-7 rounded border border-white/5 mb-2"
              />
              <h4 className="text-[10px] font-bold text-white leading-none truncate w-full">{skin.name}</h4>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
