import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Upload, Save, Cloud, Grid3X3, List, AlignJustify,
  ArrowUpDown, Calendar, User, Server, ChevronDown
} from 'lucide-react';

const MOCK_SCREENSHOTS = [
  { id: '1', url: 'https://mc-heads.net/body/Steve/300', title: 'Base Overview', date: '2026-06-01', server: 'Donut SMP', player: 'dbrn', size: '2.4 MB' },
  { id: '2', url: 'https://mc-heads.net/body/Alex/300', title: 'Nether Portal', date: '2026-05-28', server: 'MarinMC Towny', player: 'cuvsa', size: '1.8 MB' },
  { id: '3', url: 'https://mc-heads.net/body/Notch/300', title: 'Diamond Mine', date: '2026-05-25', server: 'Hypixel', player: '172px', size: '3.1 MB' },
  { id: '4', url: 'https://mc-heads.net/body/Dream/300', title: 'PvP Arena', date: '2026-05-20', server: 'MarinMC Survival', player: 'masaya46', size: '2.0 MB' },
  { id: '5', url: 'https://mc-heads.net/body/Technoblade/300', title: 'Castle Build', date: '2026-05-15', server: 'Donut SMP', player: 'dbrn', size: '4.2 MB' },
  { id: '6', url: 'https://mc-heads.net/body/Philza/300', title: 'End City', date: '2026-05-10', server: 'MarinMC Creative', player: '3wafyy', size: '2.7 MB' },
  { id: '7', url: 'https://mc-heads.net/body/Herobrine/300', title: 'Underwater Temple', date: '2026-05-05', server: 'MarinMC Towny', player: 'dbrn', size: '1.5 MB' },
  { id: '8', url: 'https://mc-heads.net/body/Sapnap/300', title: 'Farm Design', date: '2026-04-30', server: 'Donut SMP', player: 'cuvsa', size: '2.9 MB' },
  { id: '9', url: 'https://mc-heads.net/body/TommyInnit/300', title: 'Redstone Machine', date: '2026-04-25', server: 'Hypixel', player: '172px', size: '1.2 MB' },
];

const PLAYERS = ['dbrn', 'cuvsa', '172px', 'masaya46', '3wafyy', 'daaaavidds'];
const SERVERS = ['Donut SMP', 'MarinMC Towny', 'MarinMC Survival', 'MarinMC Creative', 'Hypixel'];

export default function GalleryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'detailed'>('grid');
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'size'>('newest');
  const [filterPlayer, setFilterPlayer] = useState<string | null>(null);
  const [filterServer, setFilterServer] = useState<string | null>(null);
  const [playerSearch, setPlayerSearch] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  const filtered = MOCK_SCREENSHOTS
    .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(s => !filterPlayer || s.player === filterPlayer)
    .filter(s => !filterServer || s.server === filterServer)
    .sort((a, b) => {
      if (sortMode === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortMode === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
      return parseFloat(b.size) - parseFloat(a.size);
    });

  const filteredPlayers = PLAYERS.filter(p => p.toLowerCase().includes(playerSearch.toLowerCase()));

  return (
    <div className="flex-1 flex h-full overflow-hidden select-none">

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col bg-[#060305] h-full">

        {/* Top bar */}
        <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-extrabold tracking-widest text-white uppercase">GALLERY</h1>
            <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-xl px-3 py-2 w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#52525B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search screenshots..."
                className="bg-transparent border-none outline-none text-[10px] text-white placeholder-white/20 w-full font-medium"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[8px] text-[#52525B] font-medium">
              <Cloud className="w-3 h-3" />
              <span>All media synced to MarinMC Cloud</span>
            </div>
            <button className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all">
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all">
              <Save className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((shot, idx) => (
                <motion.div
                  key={shot.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04 }}
                  className="aspect-video bg-[#0a0a0a] border border-white/[0.04] rounded-xl overflow-hidden cursor-pointer group relative"
                >
                  <img
                    src={shot.url}
                    alt={shot.title}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-[10px] font-bold text-white truncate">{shot.title}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[8px] text-[#A1A1AA] font-medium">{shot.server}</span>
                      <span className="text-[8px] text-[#52525B]">{shot.size}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((shot, idx) => (
                <motion.div
                  key={shot.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 p-2.5 bg-[#0a0a0a] border border-white/[0.04] rounded-xl hover:border-white/10 transition-all cursor-pointer"
                >
                  <img src={shot.url} alt={shot.title} className="w-16 h-10 rounded-lg object-cover opacity-70" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-white truncate">{shot.title}</p>
                    <p className="text-[8px] text-[#52525B]">{shot.server} • {shot.date}</p>
                  </div>
                  <span className="text-[9px] text-[#52525B] font-medium">{shot.size}</span>
                </motion.div>
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Search className="w-8 h-8 text-[#52525B] mb-2" />
              <p className="text-[11px] text-[#52525B] font-bold">No screenshots found</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== RIGHT PANEL — Filters ===== */}
      <div className="w-[240px] shrink-0 bg-[#0a080a] border-l border-white/[0.04] p-4 overflow-y-auto custom-scrollbar space-y-5">

        {/* View */}
        <div>
          <span className="text-[9px] font-black text-[#52525B] uppercase tracking-widest block mb-2">View</span>
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
          <span className="text-[9px] font-black text-[#52525B] uppercase tracking-widest block mb-2">Sorting</span>
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
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Filter by Player */}
        <div>
          <span className="text-[9px] font-black text-[#52525B] uppercase tracking-widest block mb-2">
            <User className="w-3 h-3 inline mr-1" />
            Filter by Player
          </span>
          <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-lg px-2.5 py-1.5 mb-2">
            <Search className="w-3 h-3 text-[#52525B]" />
            <input
              type="text"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              placeholder="Search player..."
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
              Clear filter
            </button>
          )}
        </div>

        {/* Filter by Server */}
        <div>
          <span className="text-[9px] font-black text-[#52525B] uppercase tracking-widest block mb-2">
            <Server className="w-3 h-3 inline mr-1" />
            Filter by Server
          </span>
          <div className="flex flex-col gap-1">
            {SERVERS.map(s => (
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

        {/* Calendar Filter */}
        <div>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="flex items-center gap-1.5 text-[9px] font-black text-[#52525B] uppercase tracking-widest mb-2"
          >
            <Calendar className="w-3 h-3" />
            <span>Filter by Date</span>
            <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showCalendar ? 'rotate-180' : ''}`} />
          </button>
          {showCalendar && (
            <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-3">
              <div className="text-center text-[10px] font-bold text-white mb-2">June 2026</div>
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
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
      </div>
    </div>
  );
}
