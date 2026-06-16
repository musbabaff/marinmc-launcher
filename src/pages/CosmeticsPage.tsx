import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import {
  Sparkles, UploadCloud, Check, Search, Grid, Crown, 
  Trash2, RefreshCw
} from 'lucide-react';
import ThreePreview from '../components/ThreePreview.tsx';

// Real Minecraft cape images
const CAPES = [
  { name: 'Minecon 2011', url: 'https://i.imgur.com/dtpq5xi.png' },
  { name: 'Minecon 2012', url: 'https://i.imgur.com/AnRw549.png' },
  { name: 'Minecon 2013', url: 'https://i.imgur.com/ue6PcKG.png' },
  { name: 'Minecon 2015', url: 'https://i.imgur.com/aYBFpDk.png' },
  { name: 'Minecon 2016', url: 'https://i.imgur.com/X0eLPPR.png' },
  { name: 'Mojang New', url: 'https://i.imgur.com/mFGU1XK.png' },
  { name: 'Mojang Studios', url: 'https://i.imgur.com/2sB78nt.png' },
  { name: 'Vanilla Cape', url: 'https://i.imgur.com/1C5SJfX.png' },
  { name: 'Mor Alev', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300' },
  { name: 'Neon Ejder', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300' }
];

// Wing styles
const WING_STYLES = [
  { id: 'violet', name: 'Gökkuşağı Kanatları', desc: 'Vibrant RGB geçişli neon kanatlar.', color: 'from-[#8B5CF6] via-[#3B82F6] to-[#10B981]' },
  { id: 'fire', name: 'Alev Kanatları', desc: 'Kırmızı, turuncu ve sarı lav desenli alev kanatlar.', color: 'from-red-500 via-orange-500 to-yellow-500' },
  { id: 'ice', name: 'Buz Kristali', desc: 'Turkuaz, beyaz ve mavi ışıltılı buz kanatları.', color: 'from-cyan-400 via-white to-blue-500' },
  { id: 'gold', name: 'Altın İhtişam', desc: 'Zengin sarı ve altın tonlarında asil kanatlar.', color: 'from-yellow-500 via-amber-400 to-white' },
  { id: 'angel', name: 'Melek Kanadı', desc: 'Sade beyaz ve açık mavi tonlarında ku tüyü kanatlar.', color: 'from-white via-sky-100 to-sky-200' },
];

// Minecraft skin presets
const SKIN_PRESETS = [
  { name: 'Steve (Varsayılan)', user: 'Steve' },
  { name: 'Alex (Varsayılan)', user: 'Alex' },
  { name: 'Notch', user: 'Notch' },
  { name: 'Herobrine', user: 'Herobrine' },
  { name: 'Dream', user: 'Dream' },
  { name: 'Technoblade', user: 'Technoblade' },
  { name: 'Arctic Fox', user: 'ArcticFox' },
  { name: 'Cyber Ninja', user: 'CyberNinja' },
  { name: 'Shadow Knight', user: 'ShadowKnight' },
  { name: 'Crystal Mage', user: 'CrystalMage' },
  { name: 'Philza', user: 'Philza' },
  { name: 'Ranboo', user: 'Ranboo' },
];

export default function CosmeticsPage() {
  const session = useAuthStore((s) => s.session);
  const username = session?.name || 'Player';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'capes' | 'wings' | 'skins'>('capes');
  const [selectedCape, setSelectedCape] = useState<number>(-1);
  const [activeSkin, setActiveSkin] = useState<string>(username);
  const [activeSkinType, setActiveSkinType] = useState<'username' | 'file'>('username');
  const [modelType, setModelType] = useState<'classic' | 'slim'>('classic');
  const [wingsEnabled, setWingsEnabled] = useState<boolean>(true);
  const [wingStyle, setWingStyle] = useState<string>('violet');
  const [customUsername, setCustomUsername] = useState<string>('');
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Load cosmetics
  useEffect(() => {
    api.getCosmetics(username).then((data) => {
      setActiveSkin(data.skinVal || username);
      setActiveSkinType(data.skinType || 'username');
      setModelType(data.modelType || 'classic');
      setWingsEnabled(data.wingsEnabled !== false);
      setWingStyle(data.wingStyle || 'violet');

      if (data.capeUrl) {
        const idx = CAPES.findIndex(c => c.url === data.capeUrl);
        setSelectedCape(idx);
      } else {
        setSelectedCape(-1);
      }
    });
  }, [username]);

  const saveCosmetics = async (updated: Partial<Parameters<typeof api.updateCosmetics>[1]>) => {
    const activeCapeUrl = selectedCape >= 0 ? CAPES[selectedCape]?.url : '';
    const payload = {
      skinType: activeSkinType,
      skinVal: activeSkin,
      capeUrl: activeCapeUrl,
      modelType,
      wingsEnabled,
      wingStyle,
      ...updated
    };
    await api.updateCosmetics(username, payload);
  };

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 2000);
  };

  // Cape interaction
  const handleCapeClick = async (idx: number) => {
    if (selectedCape === idx) {
      setSelectedCape(-1);
      await saveCosmetics({ capeUrl: '' });
      showFeedback('Pelerin çıkarıldı.');
    } else {
      setSelectedCape(idx);
      await saveCosmetics({ capeUrl: CAPES[idx].url });
      showFeedback(`"${CAPES[idx].name}" pelerini kuşanıldı!`);
    }
  };

  // Wing interaction
  const handleWingStyleClick = async (styleId: string) => {
    setWingStyle(styleId);
    setWingsEnabled(true);
    await saveCosmetics({ wingStyle: styleId, wingsEnabled: true });
    showFeedback('Kanat stili güncellendi.');
  };

  // Preset skin interaction
  const handleSkinPresetClick = async (user: string) => {
    setActiveSkin(user);
    setActiveSkinType('username');
    await saveCosmetics({ skinType: 'username', skinVal: user });
    showFeedback(`Kostüm "${user}" olarak değiştirildi.`);
  };

  // Custom username skin search
  const handleCustomSkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = customUsername.trim();
    if (!target) return;
    setActiveSkin(target);
    setActiveSkinType('username');
    await saveCosmetics({ skinType: 'username', skinVal: target });
    setCustomUsername('');
    showFeedback(`Kostüm "${target}" olarak güncellendi.`);
  };

  // Clear all cosmetics
  const handleClearAll = async () => {
    setSelectedCape(-1);
    setWingsEnabled(false);
    setActiveSkin(username);
    setActiveSkinType('username');
    await saveCosmetics({
      capeUrl: '',
      wingsEnabled: false,
      skinType: 'username',
      skinVal: username
    });
    showFeedback('Tüm kozmetikler sıfırlandı.');
  };

  // File Upload
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
      await saveCosmetics({ skinType: 'file', skinVal: dataUrl });
      showFeedback('Özel cilt dosyası başarıyla yüklendi.');

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
    <div className="flex-1 flex overflow-hidden bg-[#060305] text-[#d2d2d2] h-full w-full select-none">
      
      {/* LEFT PANEL: PREVIEW & CONTROLS */}
      <div className="w-[300px] border-r border-white/[0.04] p-5 flex flex-col justify-between shrink-0 bg-[#080509]/30 h-full overflow-y-auto custom-scrollbar">
        <div className="space-y-5">
          <div>
            <h2 className="text-[10px] font-black tracking-widest text-[#52525B] uppercase mb-2">Görünüm Önizleme</h2>
            
            {/* 3D Canvas Frame */}
            <div className="w-full h-[280px] bg-[#0a0a0a] border border-white/[0.05] hover:border-white/10 rounded-2xl relative overflow-hidden group transition-all duration-300">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#8B5CF6]/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-[#8B5CF6]/10 transition-all duration-300" />
              
              <div className="absolute top-3.5 left-3.5 z-20 flex flex-col gap-1.5">
                <span className="text-[7.5px] bg-white/5 border border-white/10 text-white px-2 py-0.5 rounded font-black uppercase">
                  {activeSkinType === 'file' ? 'Özel Dosya' : activeSkin}
                </span>
                {selectedCape >= 0 && (
                  <span className="text-[6.5px] bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#c084fc] px-1.5 py-0.5 rounded font-black uppercase tracking-wider self-start">
                    Pelerin Aktif
                  </span>
                )}
              </div>

              {/* Reset button inside preview */}
              <button
                onClick={handleClearAll}
                className="absolute top-3.5 right-3.5 z-20 p-1.5 rounded-lg bg-black/40 hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/25 text-[#52525B] hover:text-red-400 transition-all active:scale-95"
                title="Tüm Kozmetikleri Sıfırla"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* 3D Mesh rendering */}
              <div className="w-full h-full z-10 flex items-center justify-center">
                <ThreePreview 
                  skin={activeSkin} 
                  capeUrl={selectedCape >= 0 ? CAPES[selectedCape]?.url : undefined} 
                  wingsEnabled={wingsEnabled} 
                  modelType={modelType}
                  wingStyle={wingStyle}
                />
              </div>

              <span className="absolute bottom-3.5 left-1/2 -translate-x-1/2 text-[7px] text-[#52525B] font-black uppercase tracking-widest bg-black/40 border border-white/[0.04] px-2.5 py-0.5 rounded-md z-20">
                Çevirmek İçin Sürükleyin
              </span>
            </div>
          </div>

          {/* arm model selectors */}
          <div className="bg-[#0a0a0a] border border-white/[0.04] p-3.5 rounded-2xl space-y-3.5">
            <div>
              <span className="text-[8px] font-black text-[#52525B] uppercase tracking-widest mb-1.5 block">Kol Modeli</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'classic' as const, label: 'Steve (Klasik)' },
                  { id: 'slim' as const, label: 'Alex (İnce)' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={async () => {
                      setModelType(m.id);
                      await saveCosmetics({ modelType: m.id });
                      showFeedback(`Kol modeli "${m.label}" yapıldı.`);
                    }}
                    className={`text-[8.5px] font-black py-1.5 rounded-lg border transition-all uppercase tracking-wider ${
                      modelType === m.id
                        ? 'bg-[#8B5CF6]/15 border-[#8B5CF6]/40 text-[#c084fc] shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                        : 'bg-black/20 border-white/5 text-[#52525B] hover:text-white hover:border-white/10'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* wings toggle */}
            <div className="flex items-center justify-between border-t border-white/[0.03] pt-3">
              <div className="flex flex-col">
                <span className="text-[8.5px] font-black text-white/80 uppercase tracking-widest">3D Ejderha Kanatları</span>
                <span className="text-[7px] text-[#52525B] font-bold uppercase tracking-wider mt-0.5">Kanatları Göster/Gizle</span>
              </div>
              <button
                onClick={async () => {
                  const next = !wingsEnabled;
                  setWingsEnabled(next);
                  await saveCosmetics({ wingsEnabled: next });
                  showFeedback(next ? 'Kanatlar aktif edildi.' : 'Kanatlar gizlendi.');
                }}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 relative focus:outline-none ${
                  wingsEnabled ? 'bg-[#8B5CF6]' : 'bg-[#131622] border border-white/5'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${
                    wingsEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* upload skin PNG */}
          <div className="bg-[#0a0a0a] border border-white/[0.04] p-3.5 rounded-2xl">
            <span className="text-[8px] font-black text-[#52525B] uppercase tracking-widest mb-2 block">Özel Cilt (Skin) Yükle</span>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-xl py-5 px-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 ${
                isDragOver
                  ? 'border-[#8B5CF6] bg-[#8B5CF6]/5'
                  : 'border-white/5 hover:border-white/10 bg-black/10 hover:bg-white/[0.01]'
              }`}
            >
              <UploadCloud className={`w-6 h-6 transition-colors ${isDragOver ? 'text-[#8B5CF6]' : 'text-white/30'}`} />
              <div className="text-center">
                <p className="text-[8px] font-black text-white/70 tracking-wide uppercase">Cilt Dosyası Sürükle</p>
                <p className="text-[7px] text-[#52525B] font-bold leading-normal mt-0.5">Veya bilgisayarından bir .PNG dosyası seç</p>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".png" onChange={handleFileChange} className="hidden" />
          </div>
        </div>

        {/* Sync Indicator */}
        <div className="text-[7px] text-[#52525B] font-black uppercase tracking-widest mt-4 flex items-center justify-center gap-1">
          <span className="w-1 h-1 rounded-full bg-[#8B5CF6] animate-pulse" />
          <span>Kalıcı Profil Senkronizasyonu Aktif</span>
        </div>
      </div>

      {/* RIGHT PANEL: CATEGORY BROWSER & GRIDS */}
      <div className="flex-1 flex flex-col overflow-hidden h-full relative bg-[#070508]/10">
        
        {/* Category Tabs */}
        <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between shrink-0 bg-[#070507]">
          <div className="flex gap-2 p-0.5 bg-black/40 border border-white/[0.04] rounded-xl">
            {[
              { id: 'capes' as const, label: 'Pelerinler', icon: Crown },
              { id: 'wings' as const, label: 'Kanat Stilleri', icon: Sparkles },
              { id: 'skins' as const, label: 'Kostüm Seçici', icon: Grid },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                      : 'text-[#52525B] hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback messages */}
          <AnimatePresence>
            {feedbackMsg && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest"
              >
                {feedbackMsg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tab Panel content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          {/* CAPES TAB */}
          {activeTab === 'capes' && (
            <div className="grid grid-cols-5 gap-3.5 animate-[fadeIn_0.25s_ease-out]">
              {CAPES.map((cape, idx) => {
                const isActive = selectedCape === idx;
                return (
                  <button
                    key={cape.name}
                    onClick={() => handleCapeClick(idx)}
                    className={`aspect-[3/4] rounded-2xl border-2 flex flex-col justify-between p-3.5 bg-[#0a0a0a]/50 hover:bg-[#0c0c0c] transition-all duration-300 relative group overflow-hidden ${
                      isActive
                        ? 'border-[#8B5CF6] shadow-[0_0_20px_rgba(139,92,246,0.25)] scale-[1.03] bg-[#120f1a]/80'
                        : 'border-white/[0.04] hover:border-white/15'
                    }`}
                  >
                    {/* Cape preview render */}
                    <div className="flex-1 w-full bg-black/40 border border-white/[0.03] rounded-lg overflow-hidden flex items-center justify-center p-2 mb-3 relative">
                      <img
                        src={cape.url}
                        alt={cape.name}
                        className="h-full object-contain rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://i.imgur.com/1C5SJfX.png';
                        }}
                      />
                    </div>

                    <div className="text-center w-full min-w-0">
                      <span className="text-[8px] font-black text-white/80 group-hover:text-white truncate block uppercase tracking-wider">{cape.name}</span>
                      {isActive ? (
                        <span className="text-[6.5px] text-[#c084fc] font-black uppercase tracking-widest block mt-1">Kuşanıldı</span>
                      ) : (
                        <span className="text-[6.5px] text-[#52525B] font-bold uppercase tracking-widest block mt-1">Kuşan</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* WINGS TAB */}
          {activeTab === 'wings' && (
            <div className="grid grid-cols-2 gap-4 animate-[fadeIn_0.25s_ease-out]">
              {WING_STYLES.map((style) => {
                const isActive = wingsEnabled && wingStyle === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => handleWingStyleClick(style.id)}
                    className={`p-5 rounded-2xl border-2 flex items-center gap-4 bg-[#0a0a0a]/50 hover:bg-[#0c0c0c] transition-all duration-300 text-left relative group ${
                      isActive
                        ? 'border-[#8B5CF6] shadow-[0_0_20px_rgba(139,92,246,0.2)] scale-[1.01] bg-[#120f1a]/80'
                        : 'border-white/[0.04] hover:border-white/10'
                    }`}
                  >
                    {/* Circle preview of the color gradient */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${style.color} border border-white/10 shrink-0 shadow-lg relative flex items-center justify-center`}>
                      {isActive && (
                        <Check className="w-5 h-5 text-white filter drop-shadow-md" />
                      )}
                    </div>
                    
                    <div className="min-w-0">
                      <h4 className="text-[10px] font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                        <span>{style.name}</span>
                        {isActive && (
                          <span className="px-1.5 py-0.5 bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[6.5px] font-black text-[#c084fc] rounded uppercase">AKTİF</span>
                        )}
                      </h4>
                      <p className="text-[9px] text-[#52525B] font-medium leading-relaxed">{style.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* SKINS PRESETS TAB */}
          {activeTab === 'skins' && (
            <div className="space-y-6 animate-[fadeIn_0.25s_ease-out]">
              
              {/* Custom Search Form */}
              <form onSubmit={handleCustomSkinSubmit} className="bg-[#0a0a0a]/50 border border-white/[0.04] p-5 rounded-2xl flex gap-3 items-center">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-[#52525B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Premium Minecraft Kullanıcı Adı Girin... (Örn: notch, dream)"
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/40 border border-white/[0.06] text-xs font-semibold text-white focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#a78bfa] text-white text-[9.5px] font-black uppercase tracking-wider transition-all shadow-[0_4px_12px_rgba(139,92,246,0.25)] flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Kostümü Çek</span>
                </button>
              </form>

              {/* Presets grid */}
              <div className="grid grid-cols-6 gap-3.5">
                {SKIN_PRESETS.map((skin) => {
                  const isActive = activeSkinType === 'username' && activeSkin.toLowerCase() === skin.user.toLowerCase();
                  return (
                    <button
                      key={skin.user}
                      onClick={() => handleSkinPresetClick(skin.user)}
                      className={`rounded-2xl border-2 flex flex-col justify-between p-3 bg-[#0a0a0a]/50 hover:bg-[#0c0c0c] transition-all duration-300 relative group overflow-hidden ${
                        isActive
                          ? 'border-[#8B5CF6] shadow-[0_0_15px_rgba(139,92,246,0.2)] scale-[1.03] bg-[#120f1a]/80'
                          : 'border-white/[0.04] hover:border-white/10'
                      }`}
                    >
                      {/* Character body render */}
                      <div className="flex-grow flex items-center justify-center p-1.5 h-[110px] relative z-10">
                        <img
                          src={`https://mc-heads.net/body/${skin.user}/90`}
                          alt={skin.name}
                          className="max-h-full object-contain filter drop-shadow-md group-hover:scale-[1.04] transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://mc-heads.net/body/Steve/90';
                          }}
                        />
                      </div>

                      <div className="text-center w-full mt-3 relative z-10 min-w-0">
                        <p className="text-[7.5px] font-black text-white/80 group-hover:text-white truncate uppercase tracking-wider block leading-none">{skin.name}</p>
                        {isActive ? (
                          <span className="text-[5px] text-[#c084fc] font-black uppercase tracking-widest block mt-1">Seçildi</span>
                        ) : (
                          <span className="text-[5px] text-[#52525B] font-bold uppercase tracking-widest block mt-1">Seç</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
