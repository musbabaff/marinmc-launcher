import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore.ts';
import { sanitizeUrl, sanitizeParam } from '../lib/security.ts';
import {
  Image as ImageIcon, Cloud, Folder, LayoutGrid, List, AlignJustify, Search,
  Calendar, Server, User, ArrowLeft, ArrowRight, Download, Share2, Trash2, Maximize2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Screenshot {
  id: string;
  name: string;
  url?: string;
  bgColor: string; // fallback color block
  server: string;
  date: string;
  size: string;
  players: string[];
}

const MOCK_SCREENSHOTS: Screenshot[] = [
  { id: '1', name: '2026-06-04_12.30.45.png', bgColor: 'from-purple-900 to-indigo-950', server: 'MarinMC Towny', date: '04.06.2026 12:30', size: '1.45 MB', players: ['Luser_29', 'Notch', 'Steve'] },
  { id: '2', name: '2026-06-03_18.45.12.png', bgColor: 'from-teal-900 to-emerald-950', server: 'MarinMC Survival', date: '03.06.2026 18:45', size: '2.10 MB', players: ['HypixelGod', 'alex_mc'] },
  { id: '3', name: '2026-06-02_22.15.00.png', bgColor: 'from-orange-900 to-amber-950', server: 'MarinMC Creative', date: '02.06.2026 22:15', size: '1.80 MB', players: ['LegoBuilder', 'Notch'] },
  { id: '4', name: '2026-05-30_10.20.10.png', bgColor: 'from-blue-900 to-cyan-950', server: 'MarinMC Towny', date: '30.05.2026 10:20', size: '940 KB', players: ['Steve', 'Dream'] },
  { id: '5', name: '2026-05-28_15.05.30.png', bgColor: 'from-rose-900 to-pink-950', server: 'MarinMC Survival', date: '28.05.2026 15:05', size: '1.24 MB', players: ['Skeppy', 'Technoblade'] },
  { id: '6', name: '2026-05-25_14.40.22.png', bgColor: 'from-violet-900 to-fuchsia-950', server: 'MarinMC Towny', date: '25.05.2026 14:40', size: '1.67 MB', players: ['Luser_29', 'alex_mc', 'Steve'] },
  { id: '7', name: '2026-05-20_19.55.15.png', bgColor: 'from-yellow-900 to-amber-950', server: 'MarinMC Creative', date: '20.05.2026 19:55', size: '2.34 MB', players: ['LegoBuilder', 'Steve'] },
  { id: '8', name: '2026-05-18_17.10.45.png', bgColor: 'from-indigo-900 to-cyan-950', server: 'MarinMC Towny', date: '18.05.2026 17:10', size: '1.12 MB', players: ['Dream', 'Notch'] },
  { id: '9', name: '2026-05-12_23.00.00.png', bgColor: 'from-emerald-900 to-teal-950', server: 'MarinMC Survival', date: '12.05.2026 23:00', size: '1.89 MB', players: ['HypixelGod', 'MumboJumbo'] }
];

export default function GalleryPage() {
  const { t } = useTranslation();
  const settings = useSettingsStore();

  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'detailed'>('grid');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'size'>('newest');
  
  // Smart filters states
  const [filterServer, setFilterServer] = useState('all');
  const [filterPlayer, setFilterPlayer] = useState('all');

  // Lightbox view state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Sync screenshot backend files
  const [localScreenshots, setLocalScreenshots] = useState<any[]>([]);

  useEffect(() => {
    if (window.electronAPI && settings.launcherDir) {
      window.electronAPI.getScreenshots(settings.launcherDir).then((res) => {
        if (res.success && res.screenshots) {
          setLocalScreenshots(res.screenshots);
        }
      });
    }
  }, [settings.launcherDir]);

  // Combine mock + local
  const allScreenshots: Screenshot[] = [
    ...localScreenshots.map((ls, idx) => ({
      id: `local_${idx}`,
      name: ls.name,
      url: `file:///${ls.path.replace(/\\/g, '/')}`,
      bgColor: 'from-[#1A1A1A] to-[#111111]',
      server: 'MarinMC Sunucu',
      date: new Date(ls.date).toLocaleString(),
      size: (ls.size / (1024 * 1024)).toFixed(2) + ' MB',
      players: ['Siz']
    })),
    ...MOCK_SCREENSHOTS
  ];

  // Apply filters
  const filteredScreenshots = allScreenshots.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesServer = filterServer === 'all' || s.server.toLowerCase().includes(filterServer.toLowerCase());
    const matchesPlayer = filterPlayer === 'all' || s.players.some(p => p.toLowerCase() === filterPlayer.toLowerCase());
    return matchesSearch && matchesServer && matchesPlayer;
  });

  // Apply sorting
  const sortedScreenshots = [...filteredScreenshots].sort((a, b) => {
    if (sortBy === 'newest') return b.date.localeCompare(a.date);
    if (sortBy === 'oldest') return a.date.localeCompare(b.date);
    // Parse size strings
    const parseSize = (sz: string) => {
      const num = parseFloat(sz);
      if (sz.includes('KB')) return num;
      return num * 1024;
    };
    return parseSize(b.size) - parseSize(a.size);
  });

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % sortedScreenshots.length);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + sortedScreenshots.length) % sortedScreenshots.length);
    }
  };

  const activeLightboxItem = lightboxIndex !== null ? sortedScreenshots[lightboxIndex] : null;

  return (
    <div className="flex-grow flex h-full overflow-hidden select-none bg-[#0A0A0A]">
      {/* Main content grid area (left) */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto no-drag custom-scrollbar space-y-4">
        
        {/* Header toolbar sync panel */}
        <div className="flex justify-between items-center border-b border-[#1E1E1E] pb-4">
          <div>
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">{t('gallery.title')}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Cloud className="w-3.5 h-3.5 text-[#52525B]" />
              <span className="text-[10px] text-[#A1A1AA] font-bold">Bulut Yedekleme: <strong className="text-white/85">2.4 GB / 10.0 GB Kullanıldı</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode icons */}
            <div className="flex bg-[#111111] border border-[#2A2A2A] rounded-lg p-0.5 mr-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-[#8B5CF6]/15 text-[#8B5CF6]' : 'text-[#52525B]'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-[#8B5CF6]/15 text-[#8B5CF6]' : 'text-[#52525B]'}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`p-1.5 rounded transition-all ${viewMode === 'detailed' ? 'bg-[#8B5CF6]/15 text-[#8B5CF6]' : 'text-[#52525B]'}`}
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
            </div>

            <button className="p-2 rounded-xl bg-white/[0.03] border border-[#2A2A2A] text-[#52525B] hover:text-white flex items-center gap-1.5 text-[10px] font-extrabold uppercase">
              <Folder className="w-4 h-4" />
              <span>Klasörü Aç</span>
            </button>
          </div>
        </div>

        {/* Dynamic masonry lists */}
        {sortedScreenshots.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[#52525B] py-16">
            <ImageIcon className="w-12 h-12 mb-2" />
            <span className="text-xs font-bold uppercase tracking-wider">Ekran Görüntüsü Bulunamadı</span>
            <span className="text-[10px]">Dizin boş veya filtrelerle eşleşen kayıt yok.</span>
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-3 gap-4'
              : 'space-y-2'
          }>
            {sortedScreenshots.map((shot, index) => {
              if (viewMode === 'grid') {
                return (
                  <div
                    key={shot.id}
                    onClick={() => setLightboxIndex(index)}
                    className="relative aspect-video rounded-xl overflow-hidden border border-[#1E1E1E] hover:border-[#8B5CF6]/60 cursor-pointer group transition-all"
                  >
                    {/* Fallback gradients or absolute URL images */}
                    {shot.url && (shot.url.startsWith('http://') || shot.url.startsWith('https://') || shot.url.startsWith('file://')) ? (
                      <img src={shot.url} alt={shot.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${shot.bgColor} flex items-center justify-center text-white/5 font-mono text-xs select-none`}>
                        MINECRAFT SCREENSHOT
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 select-none">
                      <span className="text-[8px] bg-black/50 text-[#06B6D4] px-1.5 py-0.5 rounded font-extrabold uppercase w-max tracking-wide">
                        {shot.server}
                      </span>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[9px] font-extrabold text-white truncate max-w-[120px] leading-none mb-0.5">{shot.name}</p>
                          <p className="text-[8px] text-[#A1A1AA] leading-none">{shot.date}</p>
                        </div>
                        <Maximize2 className="w-3.5 h-3.5 text-white/70" />
                      </div>
                    </div>
                  </div>
                );
              }

              // List View / Detailed List items
              return (
                <div
                  key={shot.id}
                  onClick={() => setLightboxIndex(index)}
                  className="flex items-center justify-between p-3 bg-[#111111] border border-[#1E1E1E] hover:border-[#2A2A2A] rounded-xl cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-8 rounded bg-gradient-to-br from-indigo-950 to-indigo-900 border border-white/5" />
                    <div>
                      <h4 className="text-xs font-bold text-white leading-none mb-1">{shot.name}</h4>
                      <p className="text-[9px] text-[#52525B]">Boyut: {shot.size} · {shot.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] bg-[#8B5CF6]/15 border border-[#8B5CF6]/20 text-[#8B5CF6] px-2 py-0.5 rounded font-extrabold uppercase">
                      {shot.server}
                    </span>
                    {viewMode === 'detailed' && (
                      <div className="flex -space-x-1.5">
                        {shot.players.map(p => (
                          <img
                            key={p}
                            src={sanitizeUrl(`https://minotar.net/avatar/${sanitizeParam(p)}/16`)}
                            alt={p}
                            className="w-4 h-4 rounded-full border border-[#0A0A0A]"
                            title={p}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right panel smart filters (220px) */}
      <div className="w-[220px] bg-[#0D0D0D] border-l border-[#1E1E1E] p-4 space-y-5 flex flex-col justify-start">
        
        {/* Search */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-widest">{t('gallery.search')}</span>
          <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl px-2.5 py-1.5 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#52525B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Dosya ara..."
              className="bg-transparent border-none text-[9px] text-white focus:outline-none placeholder-white/20 w-full"
            />
          </div>
        </div>

        {/* Sorting selection */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-widest">Sıralama</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full bg-[#111111] border border-[#2A2A2A] text-white text-[9px] font-extrabold uppercase rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="newest">En Yeni İlk</option>
            <option value="oldest">En Eski İlk</option>
            <option value="size">En Büyük İlk</option>
          </select>
        </div>

        {/* Filter by Server */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-widest flex items-center gap-1">
            <Server className="w-3 h-3 text-[#06B6D4]" />
            <span>{t('gallery.filterByServer')}</span>
          </span>
          <select
            value={filterServer}
            onChange={(e) => setFilterServer(e.target.value)}
            className="w-full bg-[#111111] border border-[#2A2A2A] text-white text-[9px] font-extrabold uppercase rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">Tüm Sunucular</option>
            <option value="towny">Towny</option>
            <option value="survival">Survival</option>
            <option value="creative">Creative</option>
          </select>
        </div>

        {/* Filter by Player */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-widest flex items-center gap-1">
            <User className="w-3 h-3 text-[#8B5CF6]" />
            <span>{t('gallery.filterByPlayer')}</span>
          </span>
          <select
            value={filterPlayer}
            onChange={(e) => setFilterPlayer(e.target.value)}
            className="w-full bg-[#111111] border border-[#2A2A2A] text-white text-[9px] font-extrabold uppercase rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">Herkes</option>
            <option value="steve">Steve</option>
            <option value="notch">Notch</option>
            <option value="dream">Dream</option>
            <option value="luser_29">Luser_29</option>
          </select>
        </div>

        {/* Calendar mockup filter */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-widest flex items-center gap-1">
            <Calendar className="w-3 h-3 text-emerald-400" />
            <span>Tarih Aralığı</span>
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button className="py-1 rounded bg-[#111111] border border-[#2A2A2A] text-[#A1A1AA] hover:text-white text-[8px] font-extrabold uppercase">Bu Hafta</button>
            <button className="py-1 rounded bg-[#111111] border border-[#2A2A2A] text-[#A1A1AA] hover:text-white text-[8px] font-extrabold uppercase">Bu Ay</button>
          </div>
        </div>

      </div>

      {/* Lightbox full-screen modal overlay */}
      <AnimatePresence>
        {activeLightboxItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Top Toolbar */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <span className="text-[9px] bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#8B5CF6] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider">
                  {activeLightboxItem.server}
                </span>
                <span className="text-[10px] text-[#A1A1AA] font-mono">{activeLightboxItem.name}</span>
                <span className="text-[#52525B]">·</span>
                <span className="text-[9px] text-[#52525B] font-bold">{activeLightboxItem.date} ({activeLightboxItem.size})</span>
              </div>
              <button
                onClick={() => setLightboxIndex(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-[#52525B] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Center image canvas */}
            <div className="flex-grow flex items-center justify-center relative p-8">
              {/* Prev Arrow */}
              <button
                onClick={handlePrev}
                className="absolute left-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[#A1A1AA] hover:text-white transition-all hover:scale-105"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Main content box */}
              <div className="max-w-[80vw] max-h-[65vh] select-none border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative bg-gradient-to-br from-indigo-950 to-indigo-900 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                {activeLightboxItem.url && (activeLightboxItem.url.startsWith('http://') || activeLightboxItem.url.startsWith('https://') || activeLightboxItem.url.startsWith('file://')) ? (
                  <img src={activeLightboxItem.url} alt="lightbox screenshot" className="w-full h-full object-contain max-h-[65vh]" />
                ) : (
                  <div className={`w-[640px] h-[360px] bg-gradient-to-br ${activeLightboxItem.bgColor} flex items-center justify-center text-white/5 font-mono text-sm`}>
                    MINECRAFT SCREENSHOT CANVAS
                  </div>
                )}
              </div>

              {/* Next Arrow */}
              <button
                onClick={handleNext}
                className="absolute right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[#A1A1AA] hover:text-white transition-all hover:scale-105"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Bottom active players row and action toolbar */}
            <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center bg-[#0D0D0D]" onClick={(e) => e.stopPropagation()}>
              {/* Present players */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-wider">Fotoğraftakiler:</span>
                <div className="flex items-center gap-1.5">
                  {activeLightboxItem.players.map(p => (
                    <div key={p} className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded px-2 py-0.5">
                      <img src={sanitizeUrl(`https://minotar.net/avatar/${sanitizeParam(p)}/14`)} alt={p} className="w-3.5 h-3.5 rounded-md" />
                      <span className="text-[9px] text-[#A1A1AA] font-bold">{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action tools */}
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[#A1A1AA] hover:text-white transition-all">
                  <Download className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[#A1A1AA] hover:text-white transition-all">
                  <Share2 className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-white transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
