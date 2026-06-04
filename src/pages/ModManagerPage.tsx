import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Package, Plus, AlertTriangle, Lock,
  ToggleLeft, ToggleRight, Trash2, Upload, FileArchive,
  Shield, Search, X
} from 'lucide-react';

interface ModItem {
  id: string;
  name: string;
  version: string;
  size: string;
  type: 'server' | 'custom';
  enabled: boolean;
  hasConflict?: boolean;
  conflictWith?: string;
  description?: string;
}

const SERVER_MODS: ModItem[] = [
  { id: 'sm1', name: 'MarinMC-Core', version: '2.4.1', size: '1.2 MB', type: 'server', enabled: true, description: 'Ana sunucu modu — kimlik doğrulama, senkronizasyon' },
  { id: 'sm2', name: 'MarinMC-Chat', version: '1.8.0', size: '450 KB', type: 'server', enabled: true, description: 'Sunucu sohbet sistemi ve filtre' },
  { id: 'sm3', name: 'MarinMC-AntiCheat', version: '3.1.2', size: '2.1 MB', type: 'server', enabled: true, description: 'Hile önleme ve güvenlik sistemi' },
  { id: 'sm4', name: 'WorldGuard-Client', version: '7.0.9', size: '890 KB', type: 'server', enabled: true, description: 'Bölge koruma ve izin yönetimi' },
  { id: 'sm5', name: 'VoxelMap-Addon', version: '1.2.0', size: '1.5 MB', type: 'server', enabled: true, description: 'Sunucu destekli harita entegrasyonu' },
];

export default function ModManagerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { serverId } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [customMods, setCustomMods] = useState<ModItem[]>([
    { id: 'cm1', name: 'OptiFine', version: 'HD U I7', size: '6.4 MB', type: 'custom', enabled: true, description: 'Performans ve grafik iyileştirmeleri' },
    { id: 'cm2', name: 'JourneyMap', version: '5.9.18', size: '3.2 MB', type: 'custom', enabled: true, description: 'Gerçek zamanlı minimap modu', hasConflict: true, conflictWith: 'VoxelMap-Addon' },
    { id: 'cm3', name: 'Sodium', version: '0.5.8', size: '1.1 MB', type: 'custom', enabled: false, description: 'Performans optimizasyon modu' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const toggleMod = (modId: string) => {
    setCustomMods(prev => prev.map(m => 
      m.id === modId ? { ...m, enabled: !m.enabled } : m
    ));
  };

  const removeMod = (modId: string) => {
    setCustomMods(prev => prev.filter(m => m.id !== modId));
  };

  const addMod = useCallback((fileName: string) => {
    const newMod: ModItem = {
      id: `cm_${Date.now()}`,
      name: fileName.replace('.jar', ''),
      version: '???',
      size: '??? KB',
      type: 'custom',
      enabled: true,
      description: 'Yeni eklenen mod'
    };
    setCustomMods(prev => [...prev, newMod]);
  }, []);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(f => {
      if (f.name.endsWith('.jar')) {
        addMod(f.name);
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(f => {
        if (f.name.endsWith('.jar')) {
          addMod(f.name);
        }
      });
    }
  };

  const filteredCustomMods = customMods.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const conflictCount = customMods.filter(m => m.hasConflict && m.enabled).length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#0D0F14] to-[#0B0D15]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-4">
        <button
          onClick={() => navigate(serverId ? `/server/${serverId}` : '/servers')}
          className="p-2 rounded-xl hover:bg-white/5 text-brand-textMuted hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-accent" />
            {t('mods.title')}
          </h1>
          <p className="text-[10px] text-brand-textMuted mt-0.5">{t('mods.subtitle')}</p>
        </div>
        <span className="text-[10px] font-semibold text-brand-textMuted bg-white/[0.03] border border-white/5 px-2.5 py-1 rounded-lg">
          {t('mods.customModCount', { count: customMods.length })}
        </span>
      </div>

      {/* Warning Banner */}
      {conflictCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[10px] text-amber-300 font-medium">{t('mods.warningBanner')}</span>
        </motion.div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* ========= SERVER MODS ========= */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/80">{t('mods.serverModsTitle')}</h2>
            <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              {SERVER_MODS.length}
            </span>
          </div>
          <p className="text-[10px] text-brand-textMuted">{t('mods.serverModsDesc')}</p>

          <div className="grid gap-2">
            {SERVER_MODS.map((mod, i) => (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-panel p-3 rounded-xl border border-white/5 flex items-center gap-3 group"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <FileArchive className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">{mod.name}</span>
                    <span className="text-[9px] text-brand-textMuted font-mono">{mod.version}</span>
                  </div>
                  <p className="text-[9px] text-brand-textMuted truncate">{mod.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] text-brand-textMuted">{mod.size}</span>
                  <div className="flex items-center gap-1 text-[9px] text-emerald-400/60 font-semibold">
                    <Lock className="w-3 h-3" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* ========= CUSTOM MODS ========= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white/80">{t('mods.customModsTitle')}</h2>
              <span className="text-[9px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                {customMods.length}
              </span>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-accent/15 border border-brand-accent/25 text-brand-accent text-[10px] font-bold hover:bg-brand-accent/25 transition-all"
            >
              <Plus className="w-3 h-3" />
              {t('mods.addModBtn')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jar"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
          <p className="text-[10px] text-brand-textMuted">{t('mods.customModsDesc')}</p>

          {/* Search */}
          {customMods.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-textMuted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Mod ara..."
                className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs text-white placeholder-white/20"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-brand-textMuted hover:text-white" />
                </button>
              )}
            </div>
          )}

          {/* Custom mods list */}
          <div className="grid gap-2">
            <AnimatePresence>
              {filteredCustomMods.map((mod, i) => (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`glass-panel p-3 rounded-xl border flex items-center gap-3 group transition-all ${
                    mod.hasConflict && mod.enabled
                      ? 'border-red-500/30 bg-red-500/[0.03]'
                      : 'border-white/5'
                  } ${!mod.enabled ? 'opacity-50' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                    mod.hasConflict && mod.enabled
                      ? 'bg-red-500/10 border-red-500/20'
                      : 'bg-purple-500/10 border-purple-500/20'
                  }`}>
                    <FileArchive className={`w-4 h-4 ${mod.hasConflict && mod.enabled ? 'text-red-400' : 'text-purple-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{mod.name}</span>
                      <span className="text-[9px] text-brand-textMuted font-mono">{mod.version}</span>
                      {mod.hasConflict && mod.enabled && (
                        <span className="text-[8px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded border border-red-500/20 uppercase">
                          {t('mods.conflictBadge')}
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-brand-textMuted truncate">
                      {mod.hasConflict && mod.enabled
                        ? `⚠ ${t('mods.conflictWarning')} (${mod.conflictWith})`
                        : mod.description
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleMod(mod.id)}
                      className={`p-1.5 rounded-lg transition-all ${
                        mod.enabled ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-brand-textMuted hover:bg-white/5'
                      }`}
                      title={mod.enabled ? 'Devre dışı bırak' : 'Etkinleştir'}
                    >
                      {mod.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => removeMod(mod.id)}
                      className="p-1.5 rounded-lg text-brand-textMuted hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Always-visible size */}
                  <span className="text-[9px] text-brand-textMuted shrink-0">{mod.size}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-2 p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
              isDragOver
                ? 'border-brand-accent bg-brand-accent/10'
                : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
            }`}
          >
            <Upload className={`w-6 h-6 ${isDragOver ? 'text-brand-accent' : 'text-brand-textMuted'}`} />
            <span className="text-[10px] text-brand-textMuted font-medium">{t('mods.dropzoneText')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
