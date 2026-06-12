import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../stores/settingsStore.ts';
import { useAuthStore } from '../stores/authStore.ts';
import {
  Search, Cloud, Grid3X3, List, AlignJustify,
  ArrowUpDown, Calendar, User, Server, ChevronDown, FolderOpen,
  Heart, Share2, Globe, Image, X
} from 'lucide-react';
import { api, CommunityScreenshot } from '../lib/api.ts';

interface Screenshot {
  id: string;
  url: string;
  title: string;
  date: string;
  server: string;
  player: string;
  size: string;
}

const MOCK_SCREENSHOTS = [
  { id: '1', url: 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=600&auto=format&fit=crop&q=60', title: 'Ev İnşaatı', date: '2026-06-01', server: 'MarinMC Towny', player: 'Solmazzz', size: '2.4 MB' },
  { id: '2', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=60', title: 'PvP Arenası', date: '2026-05-28', server: 'MarinMC Towny', player: 'Solmazzz', size: '1.8 MB' },
  { id: '3', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=60', title: 'Maden Günlüğü', date: '2026-05-25', server: 'MarinMC Survival', player: 'Steve', size: '3.1 MB' }
];

export default function GalleryPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'detailed'>('grid');
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'size'>('newest');
  const [filterPlayer, setFilterPlayer] = useState<string | null>(null);
  const [filterServer, setFilterServer] = useState<string | null>(null);
  const [playerSearch, setPlayerSearch] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  const [activeTab, setActiveTab] = useState<'local' | 'community'>('local');
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [communityScreenshots, setCommunityScreenshots] = useState<CommunityScreenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCommunity, setLoadingCommunity] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedLocalScreenshot, setSelectedLocalScreenshot] = useState<Screenshot | null>(null);
  const [shareTitle, setShareTitle] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [previewScreenshot, setPreviewScreenshot] = useState<any | null>(null);

  const launcherDir = useSettingsStore(state => state.launcherDir);
  const session = useAuthStore(state => state.session);
  const currentUsername = session?.name || 'Player';

  const screenshotsDir = launcherDir ? `${launcherDir}/screenshots` : '';

  // 1. Fetch screenshots from local disk using Electron IPC
  useEffect(() => {
    async function loadScreenshots() {
      if (window.electronAPI && launcherDir) {
        try {
          const res = await window.electronAPI.getScreenshots(launcherDir);
          if (res.success && res.screenshots && res.screenshots.length > 0) {
            const mapped: Screenshot[] = res.screenshots.map((s: any, idx: number) => ({
              id: idx.toString(),
              url: s.url, // base64 data URL
              title: s.name,
              date: s.date,
              server: 'Yerel Oyun',
              player: currentUsername,
              size: s.size
            }));
            setScreenshots(mapped);
          } else {
            // Fallback to mocks if no local screenshots found
            setScreenshots(MOCK_SCREENSHOTS);
          }
        } catch (err) {
          console.error('Failed to load local screenshots:', err);
          setScreenshots(MOCK_SCREENSHOTS);
        }
      } else {
        // Fallback to mock data in browser mode
        setScreenshots(MOCK_SCREENSHOTS);
      }
      setLoading(false);
    }
    loadScreenshots();
  }, [launcherDir, currentUsername]);

  const loadCommunityScreenshots = async () => {
    setLoadingCommunity(true);
    try {
      const res = await api.getCommunityScreenshots();
      setCommunityScreenshots(res);
    } catch (err) {
      console.error('Failed to load community screenshots:', err);
    } finally {
      setLoadingCommunity(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'community') {
      loadCommunityScreenshots();
    }
  }, [activeTab]);

  const handleLike = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (likedIds.has(id)) return;
    try {
      const res = await api.likeScreenshot(id);
      if (res.success) {
        setLikedIds(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        setCommunityScreenshots(prev =>
          prev.map(item => (item.id === id ? { ...item, likes: res.likes } : item))
        );
      }
    } catch (err) {
      console.error('Failed to like screenshot:', err);
    }
  };

  const handleShare = async () => {
    if (!selectedLocalScreenshot) return;
    setIsSharing(true);
    try {
      const success = await api.shareScreenshot(currentUsername, shareTitle || 'Başlıksız Görsel', selectedLocalScreenshot.url);
      if (success) {
        setShowShareModal(false);
        setSelectedLocalScreenshot(null);
        setShareTitle('');
        setActiveTab('community');
      }
    } catch (err) {
      console.error('Failed to share screenshot:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleOpenFolder = () => {
    if (window.electronAPI && screenshotsDir) {
      window.electronAPI.openDirectory(screenshotsDir);
    }
  };

  const filteredLocal = screenshots
    .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(s => !filterPlayer || s.player === filterPlayer)
    .filter(s => !filterServer || s.server === filterServer)
    .sort((a, b) => {
      if (sortMode === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortMode === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
      return parseFloat(b.size) - parseFloat(a.size);
    });

  const filteredCommunity = communityScreenshots
    .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(s => !filterPlayer || s.username === filterPlayer)
    .sort((a, b) => {
      if (sortMode === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortMode === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
      return b.likes - a.likes;
    });

  // Unique players and servers extracted dynamically from active images list
  const uniquePlayers = Array.from(new Set(
    activeTab === 'local' 
      ? screenshots.map(s => s.player) 
      : communityScreenshots.map(s => s.username)
  ));
  const uniqueServers = activeTab === 'local' ? Array.from(new Set(screenshots.map(s => s.server))) : [];

  const filteredPlayers = uniquePlayers.filter(p => p.toLowerCase().includes(playerSearch.toLowerCase()));

  const activeScreenshots = activeTab === 'local' ? filteredLocal : filteredCommunity;
  const isGalleryLoading = activeTab === 'local' ? loading : loadingCommunity;

  return (
    <div className="flex-grow flex h-full overflow-hidden select-none">
      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col bg-[#060305] h-full">
        {/* Top bar */}
        <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-extrabold tracking-widest text-white uppercase">{t('gallery.title')}</h1>
            
            {/* Tab Switcher */}
            <div className="flex bg-white/[0.02] border border-white/[0.04] p-0.5 rounded-xl">
              <button
                onClick={() => setActiveTab('local')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  activeTab === 'local'
                    ? 'bg-[#2D7DD2]/20 text-white border border-[#2D7DD2]/30 shadow-lg shadow-[#2D7DD2]/5'
                    : 'text-[#52525B] hover:text-white'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Yerel Fotoğraflar</span>
              </button>
              <button
                onClick={() => setActiveTab('community')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  activeTab === 'community'
                    ? 'bg-[#2D7DD2]/20 text-white border border-[#2D7DD2]/30 shadow-lg shadow-[#2D7DD2]/5'
                    : 'text-[#52525B] hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Topluluk Galerisi</span>
              </button>
            </div>

            <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-xl px-3 py-2 w-[180px]">
              <Search className="w-3.5 h-3.5 text-[#52525B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('gallery.searchPlaceholder')}
                className="bg-transparent border-none outline-none text-[10px] text-white placeholder-white/20 w-full font-medium"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[8px] text-[#52525B] font-medium mr-2">
              <Cloud className="w-3 h-3 text-[#2D7DD2]" />
              <span>{window.electronAPI ? 'Yerel Eşitleme Aktif' : t('gallery.synced')}</span>
            </div>
            {window.electronAPI && activeTab === 'local' && (
              <button
                onClick={handleOpenFolder}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white flex items-center gap-1.5 text-[9px] font-bold transition-all"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Görsel Klasörünü Aç</span>
              </button>
            )}
            {activeTab === 'community' && (
              <button
                onClick={loadCommunityScreenshots}
                className="px-3 py-2 rounded-lg bg-[#2D7DD2]/20 border border-[#2D7DD2]/30 text-[#2D7DD2] hover:bg-[#2D7DD2]/30 flex items-center gap-1.5 text-[9px] font-bold transition-all"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Yenile</span>
              </button>
            )}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {isGalleryLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-[#2D7DD2]/30 border-t-[#2D7DD2] rounded-full animate-spin mb-2" />
              <span className="text-[10px] text-[#52525B] font-bold uppercase">Yükleniyor...</span>
            </div>
          ) : activeScreenshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Search className="w-8 h-8 text-[#52525B] mb-2" />
              <p className="text-[10px] text-white font-bold mb-1">
                {activeTab === 'local' ? t('gallery.noScreenshots') : 'Toplulukta Henüz Görsel Yok'}
              </p>
              <p className="text-[8px] text-[#52525B] max-w-[240px] leading-relaxed">
                {activeTab === 'local'
                  ? 'Oyunda F2 tuşuyla ekran görüntüsü aldığınızda görselleriniz otomatik olarak burada listelenecektir.'
                  : 'Paylaşılan ilk fotoğrafı sen yükleyebilirsin! Yerel fotoğraflar sekmesinden fotoğraf paylaşmayı dene.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-3 gap-3">
              {activeScreenshots.map((shot: any, idx) => (
                <motion.div
                  key={shot.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => setPreviewScreenshot(shot)}
                  className="aspect-video bg-[#0a0a0a] border border-white/[0.04] rounded-xl overflow-hidden cursor-pointer group relative"
                >
                  <img
                    src={shot.url}
                    alt={shot.title}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                  
                  {/* Share button overlay for local screenshots */}
                  {activeTab === 'local' && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLocalScreenshot(shot);
                          setShareTitle(shot.title.replace(/\.[^/.]+$/, ""));
                          setShowShareModal(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#2D7DD2] hover:bg-[#2D7DD2]/80 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[#2D7DD2]/25 transition-all transform translate-y-2 group-hover:translate-y-0 duration-200"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Toplulukta Paylaş</span>
                      </button>
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-white truncate max-w-[140px]">{shot.title}</p>
                      {activeTab === 'local' ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[8px] text-[#A1A1AA] font-medium">{shot.server}</span>
                          <span className="text-[8px] text-[#52525B]">• {shot.size}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <img
                            src={`https://minotar.net/avatar/${shot.username}/24`}
                            alt={shot.username}
                            className="w-4 h-4 rounded border border-white/10"
                          />
                          <span className="text-[8px] text-[#A1A1AA] font-bold">{shot.username}</span>
                          <span className="text-[7px] text-[#52525B]">• {shot.date}</span>
                        </div>
                      )}
                    </div>
                    {activeTab === 'community' && (
                      <button
                        onClick={(e) => handleLike(shot.id, e)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all ${
                          likedIds.has(shot.id)
                            ? 'bg-red-500/20 text-red-500 border-red-500/30'
                            : 'bg-white/5 text-white/50 hover:text-white border-white/10'
                        }`}
                      >
                        <Heart className={`w-3 h-3 ${likedIds.has(shot.id) ? 'fill-current' : ''}`} />
                        <span className="text-[9px] font-extrabold">{shot.likes || 0}</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {activeScreenshots.map((shot: any, idx) => (
                <motion.div
                  key={shot.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => setPreviewScreenshot(shot)}
                  className="flex items-center gap-3 p-2.5 bg-[#0a0a0a] border border-white/[0.04] rounded-xl hover:border-white/10 transition-all cursor-pointer relative group"
                >
                  <img src={shot.url} alt={shot.title} className="w-16 h-10 rounded-lg object-cover opacity-70" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-white truncate">{shot.title}</p>
                    {activeTab === 'local' ? (
                      <p className="text-[8px] text-[#52525B]">{shot.server} • {shot.date}</p>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <img
                          src={`https://minotar.net/avatar/${shot.username}/24`}
                          alt={shot.username}
                          className="w-3.5 h-3.5 rounded"
                        />
                        <span className="text-[8px] text-[#A1A1AA] font-medium">{shot.username} • {shot.date}</span>
                      </div>
                    )}
                  </div>
                  {activeTab === 'local' ? (
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] text-[#52525B] font-medium">{shot.size}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLocalScreenshot(shot);
                          setShareTitle(shot.title.replace(/\.[^/.]+$/, ""));
                          setShowShareModal(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#2D7DD2] opacity-0 group-hover:opacity-100 text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-1 transition-opacity"
                      >
                        <Share2 className="w-2.5 h-2.5" />
                        <span>Paylaş</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleLike(shot.id, e)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
                        likedIds.has(shot.id)
                          ? 'bg-red-500/20 text-red-500 border-red-500/30'
                          : 'bg-white/5 text-white/50 hover:text-white border-white/10'
                      }`}
                    >
                      <Heart className={`w-3 h-3 ${likedIds.has(shot.id) ? 'fill-current' : ''}`} />
                      <span className="text-[9px] font-extrabold">{shot.likes || 0}</span>
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== RIGHT PANEL — Filters ===== */}
      <div className="w-[240px] shrink-0 bg-[#0a080a] border-l border-white/[0.04] p-4 overflow-y-auto custom-scrollbar space-y-5">
        {/* View */}
        <div>
          <span className="text-[9px] font-black text-[#52525B] uppercase tracking-widest block mb-2">{t('gallery.view')}</span>
          <div className="flex gap-1.5">
            {[
              { mode: 'grid' as const, icon: Grid3X3 },
              { mode: 'list' as const, icon: List },
              { mode: 'detailed' as const, icon: AlignJustify },
            ].map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                  viewMode === mode
                    ? 'bg-[#2D7DD2]/20 text-[#2D7DD2] border border-[#2D7DD2]/30'
                    : 'bg-white/[0.02] text-[#52525B] border border-white/[0.04] hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>

        {/* Sorting */}
        <div>
          <span className="text-[9px] font-black text-[#52525B] uppercase tracking-widest block mb-2">{t('gallery.sorting')}</span>
          <div className="flex flex-col gap-1">
            {['newest', 'oldest', 'size'].map((mode) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode as any)}
                className={`py-1.5 px-3 rounded-lg text-[9px] font-bold uppercase tracking-wider text-left transition-all flex items-center gap-2 ${
                  sortMode === mode
                    ? 'bg-[#2D7DD2]/20 text-[#2D7DD2] border border-[#2D7DD2]/30'
                    : 'bg-white/[0.02] text-[#52525B] border border-white/[0.04] hover:text-white'
                }`}
              >
                <ArrowUpDown className="w-3 h-3" />
                {mode === 'size' && activeTab === 'community' ? 'Popülerlik (Beğeni)' : t(`gallery.${mode}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Filter by Player */}
        {filteredPlayers.length > 0 && (
          <div>
            <span className="text-[9px] font-black text-[#52525B] uppercase tracking-widest block mb-2">
              <User className="w-3 h-3 inline mr-1" />
              {t('gallery.filterByPlayer')}
            </span>
            <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-lg px-2.5 py-1.5 mb-2">
              <Search className="w-3 h-3 text-[#52525B]" />
              <input
                type="text"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                placeholder={t('gallery.searchPlayerPlaceholder')}
                className="bg-transparent border-none outline-none text-[9px] text-white placeholder-white/20 w-full"
              />
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {filteredPlayers.map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPlayer(filterPlayer === p ? null : p)}
                  className={`rounded-lg overflow-hidden transition-all ${
                    filterPlayer === p ? 'ring-2 ring-[#2D7DD2] scale-105' : 'hover:scale-105 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={`https://minotar.net/avatar/${p}/32`}
                    alt={p}
                    className="w-full aspect-square rounded-lg"
                  />
                </button>
              ))}
            </div>
            {filterPlayer && (
              <button onClick={() => setFilterPlayer(null)} className="text-[8px] text-[#2D7DD2] font-bold mt-1 hover:underline">
                {t('gallery.clearFilter')}
              </button>
            )}
          </div>
        )}

        {/* Filter by Server */}
        {activeTab === 'local' && uniqueServers.length > 0 && (
          <div>
            <span className="text-[9px] font-black text-[#52525B] uppercase tracking-widest block mb-2">
              <Server className="w-3 h-3 inline mr-1" />
              {t('gallery.filterByServer')}
            </span>
            <div className="flex flex-col gap-1">
              {uniqueServers.map(s => (
                <button
                  key={s}
                  onClick={() => setFilterServer(filterServer === s ? null : s)}
                  className={`py-1.5 px-2.5 rounded-lg text-[9px] font-bold text-left transition-all ${
                    filterServer === s
                      ? 'bg-[#2D7DD2]/20 text-[#2D7DD2] border border-[#2D7DD2]/30'
                      : 'bg-white/[0.02] text-[#52525B] border border-white/[0.04] hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Calendar Filter */}
        {activeTab === 'local' && (
          <div>
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="flex items-center gap-1.5 text-[9px] font-black text-[#52525B] uppercase tracking-widest mb-2"
            >
              <Calendar className="w-3 h-3" />
              <span>{t('gallery.filterByDate')}</span>
              <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showCalendar ? 'rotate-180' : ''}`} />
            </button>
            {showCalendar && (
              <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-3">
                <div className="text-center text-[10px] font-bold text-white mb-2">{t('gallery.monthYear')}</div>
                <div className="grid grid-cols-7 gap-0.5 text-center">
                  {t('gallery.weekdays').split(',').map((d, i) => (
                    <span key={i} className="text-[8px] text-[#52525B] font-bold py-1">{d}</span>
                  ))}
                  {Array.from({ length: 30 }, (_, i) => (
                    <button
                      key={i}
                      className={`text-[8px] py-1 rounded transition-all ${
                        i + 1 === 5 ? 'bg-[#2D7DD2] text-white font-bold' : 'text-[#52525B] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== SHARE DIALOG (MODAL) ===== */}
      <AnimatePresence>
        {showShareModal && selectedLocalScreenshot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0b080b] border border-white/10 rounded-2xl w-[450px] overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#2D7DD2]" />
                  <span className="text-xs font-extrabold uppercase text-white tracking-wider">Toplulukta Paylaş</span>
                </div>
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setSelectedLocalScreenshot(null);
                  }}
                  className="text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <div className="aspect-video bg-[#050305] border border-white/[0.04] rounded-xl overflow-hidden relative">
                  <img
                    src={selectedLocalScreenshot.url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2">
                    <span className="text-[8px] text-[#A1A1AA] bg-black/60 px-1.5 py-0.5 rounded border border-white/10 font-bold">Önizleme</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-[#52525B] uppercase tracking-wider">Görsel Başlığı</label>
                  <input
                    type="text"
                    value={shareTitle}
                    onChange={(e) => setShareTitle(e.target.value)}
                    placeholder="Bu ekran görüntüsüne bir isim ver..."
                    maxLength={50}
                    className="w-full bg-[#111] border border-white/[0.06] rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-[#2D7DD2]/50 font-medium"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 bg-white/[0.01] border-t border-white/[0.04] flex items-center justify-end gap-2">
                <button
                  disabled={isSharing}
                  onClick={() => {
                    setShowShareModal(false);
                    setSelectedLocalScreenshot(null);
                  }}
                  className="px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-white/50 hover:text-white transition-all"
                >
                  Vazgeç
                </button>
                <button
                  disabled={isSharing}
                  onClick={handleShare}
                  className="px-5 py-2 rounded-lg bg-[#2D7DD2] hover:bg-[#2D7DD2]/80 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[#2D7DD2]/20 transition-all disabled:opacity-50"
                >
                  {isSharing ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Paylaşılıyor...</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Paylaş</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== LIGHTBOX PREVIEW MODAL ===== */}
      <AnimatePresence>
        {previewScreenshot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6" onClick={() => setPreviewScreenshot(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-[800px] w-full bg-[#0a080a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setPreviewScreenshot(null)}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white border border-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col">
                <div className="aspect-video w-full bg-black relative">
                  <img
                    src={previewScreenshot.url}
                    alt={previewScreenshot.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                
                {/* Meta Details Footer */}
                <div className="p-4 bg-[#0e0c0e] border-t border-white/[0.04] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {previewScreenshot.username ? (
                      <img
                        src={`https://minotar.net/avatar/${previewScreenshot.username}/32`}
                        alt={previewScreenshot.username}
                        className="w-8 h-8 rounded-lg border border-white/10"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[#2D7DD2]/10 border border-[#2D7DD2]/20 flex items-center justify-center text-[#2D7DD2]">
                        <Image className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">{previewScreenshot.title}</h3>
                      <p className="text-[9px] text-[#A1A1AA] font-bold mt-0.5">
                        {previewScreenshot.username ? (
                          <>Paylaşan: <span className="text-[#2D7DD2]">{previewScreenshot.username}</span></>
                        ) : (
                          <>Yerel Ekran Görüntüsü</>
                        )}
                        <span className="text-[#52525B] font-medium ml-2">• {previewScreenshot.date}</span>
                      </p>
                    </div>
                  </div>

                  {previewScreenshot.username ? (
                    <button
                      onClick={(e) => handleLike(previewScreenshot.id, e)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                        likedIds.has(previewScreenshot.id)
                          ? 'bg-red-500/20 text-red-500 border-red-500/30'
                          : 'bg-white/5 text-white/50 hover:text-white border border-white/10'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${likedIds.has(previewScreenshot.id) ? 'fill-current' : ''}`} />
                      <span className="text-[11px] font-black">{previewScreenshot.likes || 0}</span>
                    </button>
                  ) : (
                    <div className="text-[9px] text-[#52525B] font-bold uppercase tracking-wider">
                      Boyut: {previewScreenshot.size}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
