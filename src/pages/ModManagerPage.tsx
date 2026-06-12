import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Download, Trash2, Package, Layers, Image, Sparkles,
  ArrowDownAZ, Clock, TrendingUp, Star, Loader2, AlertTriangle, RefreshCw
} from 'lucide-react';
import { searchProjects, formatDownloads, formatFileSize, getProjectVersions } from '../lib/modrinth';
import type { ModrinthSearchHit, InstalledMod } from '../types/modrinth';

type ProjectType = 'mod' | 'modpack' | 'resourcepack' | 'shader';
type SortIndex = 'relevance' | 'downloads' | 'updated' | 'newest';
type Tab = 'search' | 'installed';

const FILTERS: { type: ProjectType; label: string; icon: typeof Package }[] = [
  { type: 'mod', label: 'Mod', icon: Package },
  { type: 'modpack', label: 'Modpack', icon: Layers },
  { type: 'resourcepack', label: 'Texture Pack', icon: Image },
  { type: 'shader', label: 'Shader', icon: Sparkles },
];

const SORTS: { value: SortIndex; label: string; icon: typeof ArrowDownAZ }[] = [
  { value: 'relevance', label: 'İlgi', icon: ArrowDownAZ },
  { value: 'downloads', label: 'İndirme', icon: TrendingUp },
  { value: 'updated', label: 'Güncellenen', icon: Clock },
  { value: 'newest', label: 'Yeni', icon: Star },
];

const INSTALLED_KEY = 'marinmc_installed_mods';

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

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden bg-[#060305] text-[#d2d2d2] select-none h-full">

      {/* Header + Tabs */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-sm font-extrabold tracking-widest text-white uppercase">MOD YÖNETİCİSİ</h1>
        <div className="flex gap-1 bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-0.5">
          <button
            onClick={() => setTab('search')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
              tab === 'search' ? 'bg-[#2D7DD2] text-white' : 'text-[#52525B] hover:text-white'
            }`}
          >
            Modrinth Ara
          </button>
          <button
            onClick={() => setTab('installed')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              tab === 'installed' ? 'bg-[#2D7DD2] text-white' : 'text-[#52525B] hover:text-white'
            }`}
          >
            Yüklü
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
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 flex items-center gap-2 bg-[#0a0a0a] border border-white/[0.06] rounded-xl px-3.5 py-2.5">
              <Search className="w-4 h-4 text-[#52525B]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Mod, shader, texture pack ara..."
                className="bg-transparent border-none outline-none text-[11px] text-white placeholder-white/20 w-full font-medium"
              />
              {loading && <Loader2 className="w-3.5 h-3.5 text-[#2D7DD2] animate-spin" />}
            </div>
          </div>

          {/* Filter + Sort Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1.5">
              {FILTERS.map(f => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.type}
                    onClick={() => setProjectType(f.type)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all border ${
                      projectType === f.type
                        ? 'bg-[#2D7DD2]/15 border-[#2D7DD2]/30 text-[#2D7DD2]'
                        : 'bg-transparent border-white/[0.04] text-[#52525B] hover:text-white hover:border-white/10'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {f.label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1">
              {SORTS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setSortBy(s.value)}
                  className={`px-2 py-1 rounded text-[7px] font-bold uppercase tracking-wider transition-all ${
                    sortBy === s.value ? 'bg-white/10 text-white' : 'text-[#52525B] hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
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
                <p className="text-[10px] font-bold text-[#52525B]">
                  {query ? 'Sonuç bulunamadı' : 'Mod aramak için yukarıdaki alanı kullanın'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
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
                          <h3 className="text-[10px] font-bold text-white truncate leading-tight">{hit.title}</h3>
                          <span className="text-[8px] text-[#52525B] font-medium">by {hit.author}</span>
                        </div>
                        {/* Install button */}
                        {isInstalled(hit.project_id) ? (
                          <span className="text-[7px] bg-[#259457]/15 text-[#259457] border border-[#259457]/20 px-2 py-0.5 rounded font-bold uppercase shrink-0">
                            Yüklü
                          </span>
                        ) : (
                          <button
                            onClick={() => handleInstall(hit)}
                            disabled={isInstalling(hit.project_id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#2D7DD2] hover:bg-[#4A9AE8] text-white text-[7px] font-bold uppercase tracking-wider transition-all shrink-0 disabled:opacity-50"
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
                      <p className="text-[8px] text-[#A1A1AA] mt-1 leading-relaxed line-clamp-2 font-medium">
                        {hit.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[7px] text-[#52525B] font-bold flex items-center gap-0.5">
                          <Download className="w-2.5 h-2.5" />
                          {formatDownloads(hit.downloads)}
                        </span>
                        {hit.display_categories?.slice(0, 3).map(cat => (
                          <span key={cat} className="text-[6px] bg-white/[0.04] text-[#52525B] px-1.5 py-0.5 rounded font-bold uppercase">
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
                  className="px-6 py-2 bg-[#2D7DD2]/10 border border-[#2D7DD2]/20 rounded-xl text-[9px] font-bold text-[#2D7DD2] hover:bg-[#2D7DD2]/20 transition-all disabled:opacity-50 flex items-center gap-2"
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
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {installedMods.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Package className="w-10 h-10 text-[#52525B] mb-3" />
              <p className="text-[10px] font-bold text-white mb-1">Yüklü mod yok</p>
              <p className="text-[8px] text-[#52525B] font-medium">Modrinth'ten mod arayıp yükleyebilirsin!</p>
            </div>
          ) : (
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
                    <h3 className="text-[10px] font-bold text-white truncate">{mod.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[8px] text-[#52525B] font-medium">by {mod.author}</span>
                      <span className="text-[7px] text-[#52525B]">{mod.fileName}</span>
                      <span className="text-[7px] text-[#52525B]">{formatFileSize(mod.fileSize)}</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      {mod.loaders?.slice(0, 2).map(l => (
                        <span key={l} className="text-[6px] bg-[#2D7DD2]/10 text-[#2D7DD2] px-1.5 py-0.5 rounded font-bold uppercase">{l}</span>
                      ))}
                      {mod.gameVersions?.slice(0, 2).map(v => (
                        <span key={v} className="text-[6px] bg-white/[0.04] text-[#52525B] px-1.5 py-0.5 rounded font-bold">{v}</span>
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
          )}
        </div>
      )}
    </div>
  );
}
