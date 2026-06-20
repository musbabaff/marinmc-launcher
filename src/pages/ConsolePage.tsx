import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../stores/appStore.ts';
import {
  Terminal, Search, Trash2, Copy, Download,
  Play, ShieldAlert, Check, RefreshCw
} from 'lucide-react';

interface ParsedLogLine {
  text: string;
  level: 'info' | 'warn' | 'error' | 'debug';
}

export default function ConsolePage() {
  const { gameLogs, gameStatus, clearGameLogs } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Parse log lines into structured data for statistics and coloring
  const parsedLogs = useMemo<ParsedLogLine[]>(() => {
    return gameLogs.map((log) => {
      const lower = log.toLowerCase();
      let level: 'info' | 'warn' | 'error' | 'debug' = 'info';

      if (lower.includes('[error]') || lower.includes('[severe]') || lower.includes('exception') || log.trim().startsWith('at ')) {
        level = 'error';
      } else if (lower.includes('[warn]') || lower.includes('[warning]')) {
        level = 'warn';
      } else if (lower.includes('[debug]')) {
        level = 'debug';
      }

      return { text: log, level };
    });
  }, [gameLogs]);

  // Statistics counters
  const stats = useMemo(() => {
    let info = 0;
    let warn = 0;
    let error = 0;
    let debug = 0;

    parsedLogs.forEach((l) => {
      if (l.level === 'warn') warn++;
      else if (l.level === 'error') error++;
      else if (l.level === 'debug') debug++;
      else info++;
    });

    return { total: parsedLogs.length, info, warn, error, debug };
  }, [parsedLogs]);

  // Filter logs based on search query and level filter
  const filteredLogs = useMemo(() => {
    return parsedLogs.filter((log) => {
      const matchesSearch = log.text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [parsedLogs, searchQuery, levelFilter]);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  // Copy to clipboard function
  const handleCopy = () => {
    const rawText = filteredLogs.map((l) => l.text).join('\n');
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export logs to txt file
  const handleExport = () => {
    const rawText = filteredLogs.map((l) => l.text).join('\n');
    const blob = new Blob([rawText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `marinmc_game_logs_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden bg-[#070b19] text-[#d2d2d2] select-none h-full relative">
      {/* Header section */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-sm font-extrabold tracking-widest text-white uppercase flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#2D7DD2]" />
            <span>GELİŞTİRİCİ KONSOLU & OYUN LOGLARI</span>
          </h1>
          <p className="text-[9px] text-[#52525B] font-bold mt-0.5 uppercase tracking-wide">
            Minecraft başlatıcı ve istemci olay günlüklerini gerçek zamanlı olarak izleyin.
          </p>
        </div>

        {/* Live Game Status Badge */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-[8px] font-black uppercase tracking-wider transition-all duration-300 ${
            gameStatus === 'RUNNING'
              ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.15)]'
              : gameStatus === 'LAUNCHING' || gameStatus === 'CHECKING' || gameStatus === 'DOWNLOADING'
              ? 'bg-[#2D7DD2]/10 border-[#2D7DD2]/30 text-[#2D7DD2] shadow-[0_0_12px_rgba(45,125,210,0.15)]'
              : 'bg-white/5 border-white/10 text-[#52525B]'
          }`}>
            {gameStatus === 'RUNNING' ? (
              <>
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />
                <span>Oyunda Aktif</span>
              </>
            ) : gameStatus === 'LAUNCHING' || gameStatus === 'CHECKING' || gameStatus === 'DOWNLOADING' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Yükleniyor ({gameStatus})</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 bg-white/20 rounded-full" />
                <span>Minecraft Kapalı</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Counters & Statistics Bar */}
      <div className="grid grid-cols-4 gap-4 mb-4 shrink-0">
        <div className="bg-[#0f172a]/70 border border-white/[0.04] p-3 rounded-xl flex flex-col justify-center">
          <span className="text-[8px] text-[#52525B] font-black uppercase tracking-wider block">Toplam Log Satırı</span>
          <span className="text-lg font-black text-white leading-none mt-1">{stats.total}</span>
        </div>
        <div className="bg-[#0f172a]/70 border border-white/[0.04] p-3 rounded-xl flex flex-col justify-center">
          <span className="text-[8px] text-[#52525B] font-black uppercase tracking-wider block">Bilgi (Info)</span>
          <span className="text-lg font-black text-cyan-400 leading-none mt-1">{stats.info}</span>
        </div>
        <div className="bg-[#0f172a]/70 border border-white/[0.04] p-3 rounded-xl flex flex-col justify-center">
          <span className="text-[8px] text-[#52525B] font-black uppercase tracking-wider block">Uyarılar (Warn)</span>
          <span className="text-lg font-black text-amber-500 leading-none mt-1">{stats.warn}</span>
        </div>
        <div className="bg-[#0f172a]/70 border border-white/[0.04] p-3 rounded-xl flex flex-col justify-center">
          <span className="text-[8px] text-[#52525B] font-black uppercase tracking-wider block">Hatalar (Error)</span>
          <span className="text-lg font-black text-red-500 leading-none mt-1">{stats.error}</span>
        </div>
      </div>

      {/* Filtering Actions Bar */}
      <div className="bg-[#0f172a]/70 border border-white/[0.04] p-3 rounded-xl mb-4 flex items-center justify-between gap-4 shrink-0">
        {/* Level Filters */}
        <div className="flex gap-1.5">
          {[
            { id: 'all' as const, label: 'Hepsi' },
            { id: 'info' as const, label: 'Bilgi' },
            { id: 'warn' as const, label: 'Uyarı' },
            { id: 'error' as const, label: 'Hata' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setLevelFilter(btn.id)}
              className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all duration-200 ${
                levelFilter === btn.id
                  ? 'bg-[#2D7DD2]/10 border border-[#2D7DD2]/30 text-white'
                  : 'text-[#52525B] hover:text-[#d2d2d2]'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex-1 max-w-[280px] relative">
          <Search className="w-3.5 h-3.5 text-[#52525B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Loglarda ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/10 text-[10px] font-bold text-white outline-none focus:border-[#2D7DD2]/30 transition-all placeholder-[#52525B]"
          />
        </div>

        {/* Control Actions */}
        <div className="flex gap-2">
          {/* Auto-Scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all duration-200 ${
              autoScroll
                ? 'bg-[#2D7DD2]/10 border-[#2D7DD2]/30 text-white'
                : 'bg-transparent border-white/[0.06] text-[#52525B] hover:text-white'
            }`}
          >
            Otomatik Kaydır
          </button>
          
          <button
            onClick={handleCopy}
            disabled={filteredLogs.length === 0}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-white text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-[#2D7DD2]" />}
            <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>

          <button
            onClick={handleExport}
            disabled={filteredLogs.length === 0}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-white text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0"
          >
            <Download className="w-3 h-3 text-[#2D7DD2]" />
            <span>İndir</span>
          </button>

          <button
            onClick={clearGameLogs}
            disabled={gameLogs.length === 0}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
            <span>Temizle</span>
          </button>
        </div>
      </div>

      {/* Terminal logs viewport */}
      <div className="flex-1 bg-[#0b0f19]/90 border border-white/[0.03] rounded-2xl p-4 overflow-y-auto custom-scrollbar font-mono text-[9px] leading-relaxed no-drag relative">
        {filteredLogs.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-[#52525B]">
            {gameLogs.length === 0 ? (
              <>
                <Play className="w-8 h-8 text-[#2d7dd2]/40 mb-3 animate-pulse" />
                <span className="font-bold uppercase tracking-wider text-[9px]">Log Akışı Bekleniyor</span>
                <span className="text-[8px] mt-1 max-w-[280px] leading-normal font-medium text-[#52525B]">
                  Minecraft şu anda çalışmıyor. Oyunu başlattığınızda canlı loglar burada listelenecektir.
                </span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-8 h-8 text-amber-500/40 mb-3" />
                <span className="font-bold uppercase tracking-wider text-[9px]">Sonuç Bulunamadı</span>
                <span className="text-[8px] mt-1 max-w-[280px] leading-normal font-medium text-[#52525B]">
                  Aradığınız kriterlere uygun herhangi bir log satırı bulunamadı.
                </span>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 select-text pr-2">
            {filteredLogs.map((log, idx) => {
              let textClass = 'text-zinc-300';
              if (log.level === 'warn') textClass = 'text-amber-400 font-semibold';
              else if (log.level === 'error') textClass = 'text-red-400 font-semibold';
              else if (log.level === 'debug') textClass = 'text-purple-400/80';

              return (
                <div key={idx} className={`${textClass} break-all whitespace-pre-wrap`}>
                  {log.text}
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
