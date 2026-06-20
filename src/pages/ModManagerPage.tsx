import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../stores/settingsStore.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { api } from '../lib/api.ts';
import {
  Search, Download, Trash2, Package, Layers, Image, Sparkles,
  ArrowDownAZ, Clock, TrendingUp, Star, Loader2, AlertTriangle, RefreshCw,
  Play, Settings, Cpu, FolderOpen, Lock, Shield, ChevronDown, ChevronUp
} from 'lucide-react';
import { searchProjects, formatDownloads, formatFileSize, getProjectVersions } from '../lib/modrinth';
import type { ModrinthSearchHit, InstalledMod } from '../types/modrinth';

import vBg2 from '../../assets/version-bg-2.png';

type ProjectType = 'mod' | 'modpack' | 'resourcepack' | 'shader';
type SortIndex = 'relevance' | 'downloads' | 'updated' | 'newest';
type Tab = 'search' | 'installed';

const FILTERS: { type: ProjectType; label: string; icon: typeof Package }[] = [
  { type: 'mod', label: 'Modlar', icon: Package },
  { type: 'modpack', label: 'Mod Paketleri', icon: Layers },
  { type: 'resourcepack', label: 'Texture Packler', icon: Image },
  { type: 'shader', label: 'Shaderlar', icon: Sparkles },
];

const SORTS: { value: SortIndex; label: string; icon: typeof ArrowDownAZ }[] = [
  { value: 'relevance', label: 'İlgi', icon: ArrowDownAZ },
  { value: 'downloads', label: 'İndirme', icon: TrendingUp },
  { value: 'updated', label: 'Güncellenen', icon: Clock },
  { value: 'newest', label: 'Yeni', icon: Star },
];

const INSTALLED_KEY = 'marinmc_installed_mods';

// Mandatory system mods that the launcher auto-downloads. Displayed in UI but cannot be removed.
const SYSTEM_MODS: { name: string; category: string; slug: string }[] = [
  // Core
  { name: 'Fabric API', category: 'Core', slug: 'fabric-api' },
  { name: 'Sodium', category: 'Rendering', slug: 'sodium' },
  { name: 'Iris Shaders', category: 'Shader', slug: 'iris' },
  { name: 'Lithium', category: 'Optimizasyon', slug: 'lithium' },
  // Rendering & Culling
  { name: 'ImmediatelyFast', category: 'Rendering', slug: 'immediatelyfast' },
  { name: 'Entity Culling', category: 'Culling', slug: 'entityculling' },
  { name: 'More Culling', category: 'Culling', slug: 'moreculling' },
  // Performance
  { name: 'FerriteCore', category: 'Bellek', slug: 'ferrite-core' },
  { name: 'Krypton', category: 'Ağ', slug: 'krypton' },
  { name: 'FastNoise', category: 'Worldgen', slug: 'zfastnoise' },
  { name: 'ThreadTweak', category: 'Thread', slug: 'threadtweak' },
  { name: 'Dynamic FPS', category: 'Güç', slug: 'dynamic-fps' },
  { name: 'Debugify', category: 'Bugfix', slug: 'debugify' },
  // Sodium Addons
  { name: 'Sodium Extra', category: 'Ayarlar', slug: 'sodium-extra' },
  { name: "Reese's Sodium Options", category: 'UI', slug: 'reeses-sodium-options' },
  // Emote & Cosmetic
  { name: 'Emotecraft', category: 'Emote', slug: 'emotecraft' },
  { name: 'Online Emotes', category: 'Emote', slug: 'online-emotes' },
  { name: 'Player Animation Library', category: 'Animasyon', slug: 'player-animation-lib' },
  { name: 'GeckoLib', category: '3D Model', slug: 'geckolib' },
  // Libraries
  { name: 'Forge Config API Port', category: 'Kütüphane', slug: 'forge-config-api-port' },
  { name: 'YACL', category: 'Kütüphane', slug: 'yacl' },
  { name: 'Cloth Config API', category: 'Kütüphane', slug: 'cloth-config' },
  { name: 'Mod Menu', category: 'UI', slug: 'modmenu' },
  // MarinMC
  { name: 'MarinMC Client Mod', category: 'MarinMC', slug: 'marinmc-client' },
];

// Slugs used to detect if a Modrinth search result is already a system mod
const SYSTEM_MOD_SLUGS = new Set(SYSTEM_MODS.map(m => m.slug));

function loadInstalled(): InstalledMod[] {
  try {
    return JSON.parse(localStorage.getItem(INSTALLED_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveInstalled(mods: InstalledMod[]) {
  localStorage.setItem(INSTALLED_KEY, JSON.stringify(mods));
}

export default function ModManagerPage() {
  const settings = useSettingsStore();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('mod');
  const [sortBy, setSortBy] = useState<SortIndex>('relevance');
  const [results, setResults] = useState<ModrinthSearchHit[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installedMods, setInstalledMods] = useState<InstalledMod[]>(loadInstalled);
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
  const [systemModsExpanded, setSystemModsExpanded] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const LIMIT = 20;

  const doSearch = useCallback(async (q: string, type: ProjectType, sort: SortIndex, newOffset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchProjects({
        query: q,
        projectType: type,
        index: sort,
        offset: newOffset,
        limit: LIMIT,
      });
      if (newOffset === 0) {
        setResults(res.hits);
      } else {
        setResults(prev => [...prev, ...res.hits]);
      }
      setTotalHits(res.total_hits);
      setOffset(newOffset + res.hits.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Arama başarısız');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-search with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(query, projectType, sortBy, 0);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, projectType, sortBy, doSearch]);

  const handleInstall = async (hit: ModrinthSearchHit) => {
    if (installedMods.some(m => m.projectId === hit.project_id)) return;

    setInstallingIds(prev => new Set(prev).add(hit.project_id));

    try {
      const versions = await getProjectVersions(hit.project_id);
      const latest = versions[0];
      if (!latest || !latest.files[0]) throw new Error('Sürüm bulunamadı');

      const file = latest.files.find(f => f.primary) || latest.files[0];

      // If Electron API available, download to correct folder
      if (window.electronAPI) {
        await window.electronAPI.downloadFile(file.url, file.filename, projectType);
      }

      const installed: InstalledMod & { enabled?: boolean; projectType?: string } = {
        projectId: hit.project_id,
        versionId: latest.id,
        slug: hit.slug,
        title: hit.title,
        iconUrl: hit.icon_url,
        author: hit.author,
        fileName: file.filename,
        fileSize: file.size,
        installedAt: new Date().toISOString(),
        gameVersions: latest.game_versions,
        loaders: latest.loaders,
        enabled: true,
        projectType: projectType
      };

      const updated = [...installedMods, installed];
      setInstalledMods(updated);
      saveInstalled(updated);

      // Unlock achievement a2 (Mod Meraklısı)
      const sessionName = useAuthStore.getState().session?.name;
      if (sessionName) {
        const achievementsStr = localStorage.getItem(`marinmc_achievements_${sessionName}`);
        if (achievementsStr) {
          try {
            const achievements = JSON.parse(achievementsStr);
            const a2 = achievements.find((a: any) => a.id === 'a2');
            if (a2 && !a2.completed) {
              a2.completed = true;
              a2.date = new Date().toLocaleDateString('tr-TR');
              localStorage.setItem(`marinmc_achievements_${sessionName}`, JSON.stringify(achievements));
              api.updateAchievements(sessionName, achievements).catch(err => console.error(err));
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    } catch (err) {
      console.error('Install failed:', err);
    } finally {
      setInstallingIds(prev => {
        const next = new Set(prev);
        next.delete(hit.project_id);
        return next;
      });
    }
  };

  const handleUninstall = async (projectId: string) => {
    const mod = installedMods.find(m => m.projectId === projectId) as any;
    if (mod && window.electronAPI) {
      try {
        await window.electronAPI.deleteModFile(mod.fileName, mod.projectType || 'mod');
      } catch (err) {
        console.error('Failed to delete mod file from disk:', err);
      }
    }
    const updated = installedMods.filter(m => m.projectId !== projectId);
    setInstalledMods(updated);
    saveInstalled(updated);
  };

  const handleToggleEnable = async (projectId: string) => {
    const updated = installedMods.map((m: any) => {
      if (m.projectId === projectId) {
        const nextEnabled = m.enabled !== false ? false : true;
        if (window.electronAPI) {
          window.electronAPI.toggleModFile(m.fileName, m.projectType || 'mod', nextEnabled)
            .catch(err => console.error('Failed to toggle mod file:', err));
        }
        return { ...m, enabled: nextEnabled };
      }
      return m;
    });
    setInstalledMods(updated);
    saveInstalled(updated);
  };

  const isInstalled = (projectId: string) => installedMods.some(m => m.projectId === projectId);
  const isInstalling = (projectId: string) => installingIds.has(projectId);
  const isSystemMod = (slug: string) => SYSTEM_MOD_SLUGS.has(slug);

  const handleLaunchGame = () => {
    navigate('/home?launch=true');
  };

  return (
    <div className="flex-1 flex flex-row gap-5 p-6 overflow-hidden bg-[#060305] text-[#d2d2d2] select-none h-full w-full">
      
      {/* LEFT COLUMN: Mod Search and List */}
      <div className="flex-grow flex flex-col min-w-0 h-full">
        {/* Header + Tabs */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h1 className="text-sm font-extrabold tracking-widest text-white uppercase">MOD YÖNETİCİSİ</h1>
          <div className="flex gap-1 bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-0.5">
            <button
              onClick={() => setTab('search')}
              className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                tab === 'search' ? 'bg-[#2D7DD2] text-white font-black' : 'text-[#52525B] hover:text-white'
              }`}
            >
              MODRINTH ARA
            </button>
            <button
              onClick={() => setTab('installed')}
              className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                tab === 'installed' ? 'bg-[#2D7DD2] text-white font-black' : 'text-[#52525B] hover:text-white'
              }`}
            >
              YÜKLÜ
              {installedMods.length > 0 && (
                <span className="w-4 h-4 bg-white/10 rounded-full text-[7px] flex items-center justify-center font-black">
                  {installedMods.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {tab === 'search' ? (
          <>
            {/* Search Bar */}
            <div className="flex items-center gap-3 mb-3 shrink-0">
              <div className="flex-1 flex items-center gap-2 bg-[#0a0a0a] border border-white/[0.06] rounded-xl px-3.5 py-2.5">
                <Search className="w-4 h-4 text-[#52525B]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Mod, shader, texture pack ara..."
                  className="bg-transparent border-none outline-none text-[11px] text-white placeholder-white/20 w-full font-bold uppercase tracking-wider"
                />
                {loading && <Loader2 className="w-3.5 h-3.5 text-[#2D7DD2] animate-spin" />}
              </div>
            </div>

            {/* Filter + Sort Row */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex gap-1.5">
                {FILTERS.map(f => {
                  const Icon = f.icon;
                  return (
                    <button
                      key={f.type}
                      onClick={() => setProjectType(f.type)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all border ${
                        projectType === f.type
                          ? 'bg-[#2D7DD2]/15 border-[#2D7DD2]/30 text-[#2D7DD2]'
                          : 'bg-transparent border-white/[0.04] text-[#52525B] hover:text-white hover:border-white/10'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {f.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-1 bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-0.5">
                {SORTS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setSortBy(s.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-[7.5px] font-black uppercase tracking-wider transition-all ${
                      sortBy === s.value ? 'bg-white/10 text-white' : 'text-[#52525B] hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 min-h-0">
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-red-400">{error}</p>
                    <button onClick={() => doSearch(query, projectType, sortBy, 0)} className="text-[8px] text-[#52525B] hover:text-white flex items-center gap-1 mt-1">
                      <RefreshCw className="w-2.5 h-2.5" /> Tekrar dene
                    </button>
                  </div>
                </div>
              )}

              {!loading && results.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Package className="w-10 h-10 text-[#52525B] mb-3" />
                  <p className="text-[10px] font-bold text-[#52525B] uppercase tracking-wider">
                    {query ? 'Sonuç bulunamadı' : 'Mod aramak için yukarıdaki alanı kullanın'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <AnimatePresence mode="popLayout">
                  {results.map((hit, idx) => (
                    <motion.div
                      key={hit.project_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.03 }}
                      className="bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-3 flex gap-3 group hover:border-white/10 transition-all"
                    >
                      {/* Icon */}
                      <div className="w-11 h-11 rounded-lg bg-[#111111] border border-white/[0.06] overflow-hidden shrink-0">
                        {hit.icon_url ? (
                          <img src={hit.icon_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#52525B]">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-[10.5px] font-black text-white truncate leading-tight">{hit.title}</h3>
                            <span className="text-[8px] text-[#52525B] font-bold uppercase">by {hit.author}</span>
                          </div>
                          {/* Install button */}
                          {isSystemMod(hit.slug) ? (
                            <span className="text-[7px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded font-black uppercase shrink-0 flex items-center gap-1">
                              <Lock className="w-2 h-2" /> Sistem Modu
                            </span>
                          ) : isInstalled(hit.project_id) ? (
                            <span className="text-[7px] bg-[#259457]/15 text-[#259457] border border-[#259457]/20 px-2 py-0.5 rounded font-black uppercase shrink-0">
                              Yüklü
                            </span>
                          ) : (
                            <button
                              onClick={() => handleInstall(hit)}
                              disabled={isInstalling(hit.project_id)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2D7DD2] hover:bg-[#4A9AE8] text-white text-[7.5px] font-black uppercase tracking-wider transition-all shrink-0 disabled:opacity-50"
                            >
                              {isInstalling(hit.project_id) ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <Download className="w-2.5 h-2.5" />
                              )}
                              {isInstalling(hit.project_id) ? 'Yükleniyor' : 'Yükle'}
                            </button>
                          )}
                        </div>
                        <p className="text-[8.5px] text-[#A1A1AA] mt-1 leading-relaxed line-clamp-2 font-semibold">
                          {hit.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[7px] text-[#52525B] font-bold flex items-center gap-0.5">
                            <Download className="w-2.5 h-2.5" />
                            {formatDownloads(hit.downloads)}
                          </span>
                          {hit.display_categories?.slice(0, 3).map(cat => (
                            <span key={cat} className="text-[6.5px] bg-white/[0.04] text-[#52525B] px-1.5 py-0.5 rounded font-bold uppercase">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Load More */}
              {results.length > 0 && results.length < totalHits && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={() => doSearch(query, projectType, sortBy, offset)}
                    disabled={loading}
                    className="px-6 py-2.5 bg-[#2D7DD2]/10 border border-[#2D7DD2]/20 rounded-xl text-[9px] font-black text-[#2D7DD2] hover:bg-[#2D7DD2]/20 transition-all disabled:opacity-50 flex items-center gap-2 uppercase tracking-wider"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Daha Fazla Yükle ({results.length}/{totalHits})
                  </button>
                </div>
              )}

              {/* Loading skeleton */}
              {loading && results.length === 0 && (
                <div className="grid grid-cols-2 gap-2.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-3 flex gap-3 animate-pulse">
                      <div className="w-11 h-11 rounded-lg bg-white/[0.04]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-2.5 bg-white/[0.04] rounded w-3/4" />
                        <div className="h-2 bg-white/[0.04] rounded w-1/2" />
                        <div className="h-2 bg-white/[0.04] rounded w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Installed Mods Tab */
          <div className="flex-grow overflow-y-auto custom-scrollbar pr-1 min-h-0">
            {/* System Mods Section */}
            <div className="mb-4">
              <button
                onClick={() => setSystemModsExpanded(!systemModsExpanded)}
                className="flex items-center gap-2 w-full mb-2 group"
              >
                <Shield className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-[8px] font-black text-yellow-400 uppercase tracking-widest">Zorunlu Sistem Modları</span>
                <span className="text-[7px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded-full font-black">{SYSTEM_MODS.length}</span>
                <div className="flex-1 h-[1px] bg-yellow-500/10" />
                {systemModsExpanded ? (
                  <ChevronUp className="w-3 h-3 text-yellow-400/50" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-yellow-400/50" />
                )}
              </button>
              <AnimatePresence>
                {systemModsExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    {SYSTEM_MODS.map((mod, idx) => (
                      <motion.div
                        key={mod.slug}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="bg-[#0a0a0a] border border-yellow-500/[0.08] rounded-xl px-3 py-2.5 flex items-center gap-3 group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                          <Lock className="w-3 h-3 text-yellow-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[10px] font-black text-white truncate">{mod.name}</h3>
                          <span className="text-[7px] bg-yellow-500/10 text-yellow-400/70 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">{mod.category}</span>
                        </div>
                        <span className="text-[6.5px] text-yellow-400/40 font-black uppercase tracking-wider shrink-0">Kaldırılamaz</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User-installed Mods Section */}
            {installedMods.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-3.5 h-3.5 text-[#2D7DD2]" />
                  <span className="text-[8px] font-black text-[#2D7DD2] uppercase tracking-widest">Kullanıcı Modları</span>
                  <span className="text-[7px] bg-[#2D7DD2]/15 text-[#2D7DD2] px-1.5 py-0.5 rounded-full font-black">{installedMods.length}</span>
                  <div className="flex-1 h-[1px] bg-[#2D7DD2]/10" />
                </div>
                <div className="space-y-2">
                  {installedMods.map((mod, idx) => (
                    <motion.div
                      key={mod.projectId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-3 flex items-center gap-3 hover:border-white/10 transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#111111] border border-white/[0.06] overflow-hidden shrink-0">
                        {mod.iconUrl ? (
                          <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#52525B]">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[10.5px] font-black text-white truncate">{mod.title}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[8px] text-[#52525B] font-bold uppercase">by {mod.author}</span>
                          <span className="text-[7.5px] text-[#52525B] font-mono">{mod.fileName}</span>
                          <span className="text-[7.5px] text-[#52525B] font-mono">{formatFileSize(mod.fileSize)}</span>
                        </div>
                        <div className="flex gap-1 mt-1">
                          {mod.loaders?.slice(0, 2).map(l => (
                            <span key={l} className="text-[6.5px] bg-[#2D7DD2]/10 text-[#2D7DD2] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">{l}</span>
                          ))}
                          {mod.gameVersions?.slice(0, 2).map(v => (
                            <span key={v} className="text-[6.5px] bg-white/[0.04] text-[#52525B] px-1.5 py-0.5 rounded font-bold">{v}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        {/* Enable/Deactivate Toggle Switch */}
                        <button
                          onClick={() => handleToggleEnable(mod.projectId)}
                          className={`w-8 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0 ${
                            mod.enabled !== false ? 'bg-[#259457]' : 'bg-white/5 border border-white/10'
                          }`}
                          title={mod.enabled !== false ? "Devre Dışı Bırak" : "Etkinleştir"}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${
                              mod.enabled !== false ? 'translate-x-3' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleUninstall(mod.projectId)}
                          className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all shrink-0"
                          title="Kaldır"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {installedMods.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="w-8 h-8 text-[#52525B] mb-2" />
                <p className="text-[9px] text-[#52525B] font-bold uppercase tracking-wider">Ek kullanıcı modu yok</p>
                <p className="text-[7.5px] text-[#52525B]/60 font-bold mt-0.5">Modrinth'ten ek mod arayıp yükleyebilirsin!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Selected Version Detail Card & Launch game */}
      <div className="w-[300px] bg-[#0a080a] border border-white/[0.04] rounded-2xl p-5 flex flex-col justify-between shrink-0 h-full relative overflow-hidden">
        {/* Background Overlay Art */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: `url(${vBg2})` }}
        />
        
        {/* Top section */}
        <div className="space-y-5 z-10">
          <div>
            <span className="text-[7.5px] font-black text-[#52525B] tracking-widest uppercase block mb-1">SEÇİLİ SÜRÜM</span>
            <h2 className="text-[18px] font-black text-white uppercase tracking-wider leading-none">
              MINECRAFT {settings.selectedSubVersion || '1.21.8'}
            </h2>
            <span className="text-[8.5px] text-[#259457] font-black uppercase tracking-widest mt-1 block">
              FABRIC LOADER (ÖNERİLEN)
            </span>
          </div>

          {/* Profile metadata list */}
          <div className="space-y-3 pt-2">
            <span className="text-[7.5px] font-black text-[#52525B] tracking-widest uppercase block border-b border-white/[0.04] pb-1">PROFİL PARAMETRELERİ</span>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#52525B]">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[8px] text-[#52525B] font-black uppercase block">BELLEK RAM</span>
                <span className="text-[10px] text-white font-bold">{Math.round(settings.ram / 1024)} GB</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#52525B]">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[8px] text-[#52525B] font-black uppercase block">OPTIMIZASYON</span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">AKILLI JVM AKTİF</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#52525B]">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[8px] text-[#52525B] font-black uppercase block">OYUN DİZİNİ</span>
                <span className="text-[9px] text-white font-bold truncate block select-all font-mono">
                  {settings.launcherDir.split('\\').pop() || settings.launcherDir.split('/').pop() || '.marinmc'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom launch button card */}
        <div className="space-y-3 z-10 pt-4 border-t border-white/[0.04]">
          <div className="bg-black/40 border border-white/[0.04] rounded-xl p-3 text-center">
            <span className="text-[8px] text-[#52525B] font-black uppercase tracking-wider block mb-0.5">TOPLAM MOD</span>
            <span className="text-xs text-white font-extrabold">{SYSTEM_MODS.length + installedMods.length}</span>
            <div className="flex items-center justify-center gap-3 mt-1">
              <span className="text-[6.5px] text-yellow-400/70 font-black"><Lock className="w-2 h-2 inline mr-0.5" />{SYSTEM_MODS.length} Sistem</span>
              <span className="text-[6.5px] text-[#2D7DD2]/70 font-black"><Package className="w-2 h-2 inline mr-0.5" />{installedMods.filter((m: any) => m.enabled !== false).length} Kullanıcı</span>
            </div>
          </div>

          <button
            onClick={handleLaunchGame}
            className="w-full h-[52px] bg-[#259457] hover:bg-[#2fa865] active:scale-[0.98] text-white rounded-xl transition-all duration-300 shadow-[0_8px_30px_rgba(37,148,87,0.3)] flex items-center justify-center gap-2.5 cursor-pointer font-black tracking-widest text-[11px] uppercase"
          >
            <Play className="w-4 h-4 fill-current text-white" />
            <span>OYUNU BAŞLAT</span>
          </button>
        </div>

      </div>

    </div>
  );
}
