import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useServersStore } from '../stores/serversStore.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { useSettingsStore } from '../stores/settingsStore.ts';
import { Play, Square, ChevronLeft, Terminal, Cpu, Wifi, Users } from 'lucide-react';

export default function ServerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { servers, selectedServer, selectServer } = useServersStore();
  const session = useAuthStore((state) => state.session);
  const { ram, jvmArgs } = useSettingsStore();

  const [launching, setLaunching] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (servers.length > 0 && id) {
      const server = servers.find((s) => s.id === id);
      if (server) selectServer(server);
    }
  }, [id, servers, selectServer]);

  // Scroll to bottom of developer console logs
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // IPC Event Subscriptions
  useEffect(() => {
    let unsubscribeLog: (() => void) | undefined;
    let unsubscribeProgress: (() => void) | undefined;

    if (window.electronAPI) {
      unsubscribeLog = window.electronAPI.onGameLog((logLine: string) => {
        setLogs((prev) => [...prev, logLine]);
        if (logLine.includes('Logged into MarinMC Server') || logLine.includes('Player coordinates')) {
          setRunning(true);
          setLaunching(false);
        }
      });

      unsubscribeProgress = window.electronAPI.onDownloadProgress((percent: number) => {
        setProgress(percent);
      });
    }

    return () => {
      if (unsubscribeLog) unsubscribeLog();
      if (unsubscribeProgress) unsubscribeProgress();
    };
  }, []);

  if (!selectedServer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-brand-textMuted text-xs">
        <p>Sunucu detayları yükleniyor...</p>
        <Link to="/servers" className="mt-4 text-brand-accent hover:underline flex items-center space-x-1">
          <ChevronLeft className="w-4 h-4" />
          <span>Geri Dön</span>
        </Link>
      </div>
    );
  }

  const handleLaunch = async () => {
    if (launching || running) return;

    setLaunching(true);
    setProgress(0);
    setLogs([]);
    
    try {
      if (window.electronAPI) {
        await window.electronAPI.launchGame({
          ram,
          jvmArgs,
          username: session?.name || 'Player',
          version: selectedServer.version
        });
      } else {
        // Browser mock launch sequence
        setLogs((prev) => [...prev, '[Mock] Initializing browser-mode launch...']);
        let p = 0;
        const interval = setInterval(() => {
          p += 10;
          setProgress(p);
          setLogs((prev) => [...prev, `[Mock] Downloading libraries... ${p}%`]);
          if (p >= 100) {
            clearInterval(interval);
            setLogs((prev) => [...prev, '[Mock] Game process started successfully!']);
            setRunning(true);
            setLaunching(false);
          }
        }, 300);
      }
    } catch (err: any) {
      setLogs((prev) => [...prev, `[HATA] Başlatma başarısız oldu: ${err.message}`]);
      setLaunching(false);
    }
  };

  const handleStop = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.stopGame();
      }
      setLaunching(false);
      setRunning(false);
      setProgress(0);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 p-6 h-full flex flex-col overflow-hidden relative">
      {/* Back button */}
      <div className="mb-4">
        <Link
          to="/servers"
          onClick={handleStop}
          className="inline-flex items-center space-x-1.5 text-xs text-brand-textMuted hover:text-brand-text transition-colors duration-200"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Sunucu Listesi</span>
        </Link>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-5 gap-6 flex-1 overflow-hidden">
        {/* Left Side: Server Card & Play Trigger */}
        <div className="col-span-2 flex flex-col justify-between overflow-y-auto pr-1">
          <div className="space-y-5">
            {/* Banner */}
            <div className="relative rounded-2xl overflow-hidden border border-white/5 h-36">
              {selectedServer.bannerUrl ? (
                <img
                  src={selectedServer.bannerUrl}
                  alt={selectedServer.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#1E1B4B]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D15] via-transparent to-transparent"></div>
              
              {/* Server Name & Status badge */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-white">{selectedServer.name}</h3>
                  <div className="flex items-center space-x-2 text-[10px] text-brand-success font-semibold mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-success animate-ping"></span>
                    <span>Aktif Sunucu</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-xs text-brand-success bg-brand-success/10 border border-brand-success/20 px-2 py-0.5 rounded-lg">
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="font-bold">{selectedServer.ping} ms</span>
                </div>
              </div>
            </div>

            {/* Description & Specs */}
            <div className="space-y-4">
              <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-2">
                <p className="text-xs text-brand-textMuted leading-relaxed">
                  {selectedServer.description}
                </p>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#131622] border border-white/5 p-3 rounded-xl flex items-center space-x-3">
                  <div className="p-2 bg-brand-accentLight border border-brand-accent/20 rounded-lg text-brand-accent">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-textMuted font-bold uppercase tracking-wider">Oyuncular</p>
                    <p className="text-xs font-bold">{selectedServer.players.online} / {selectedServer.players.max}</p>
                  </div>
                </div>

                <div className="bg-[#131622] border border-white/5 p-3 rounded-xl flex items-center space-x-3">
                  <div className="p-2 bg-brand-accentLight border border-brand-accent/20 rounded-lg text-brand-accent">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-textMuted font-bold uppercase tracking-wider">Versiyon</p>
                    <p className="text-xs font-bold">{selectedServer.version}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger Block */}
          <div className="space-y-3 mt-4">
            {/* Progress indicator */}
            {(launching || running) && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-brand-textMuted font-semibold px-0.5">
                  <span>{running ? 'Oyun Çalışıyor...' : 'Kütüphaneler İndiriliyor...'}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#131622] rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-brand-accent to-purple-600 transition-all duration-300 shadow-glow-purple"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {launching || running ? (
              <button
                onClick={handleStop}
                className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs rounded-xl transition-all duration-200 active:scale-[0.99] flex items-center justify-center space-x-2 shadow-lg"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Oyunu Durdur</span>
              </button>
            ) : (
              <button
                onClick={handleLaunch}
                className="w-full py-4 bg-gradient-to-r from-brand-accent to-purple-600 hover:from-brand-accentHover hover:to-purple-500 text-white font-extrabold text-xs tracking-wider rounded-xl transition-all duration-200 active:scale-[0.99] flex items-center justify-center space-x-2 shadow-glow-purple animate-glow-pulse"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>OYUNU BAŞLAT</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Log Console / Output terminal */}
        <div className="col-span-3 glass-panel rounded-2xl border border-white/5 flex flex-col overflow-hidden bg-[#0A0C14]">
          {/* Terminal Title */}
          <div className="h-10 bg-[#0E101A] border-b border-white/5 px-4 flex items-center justify-between text-[11px] text-brand-textMuted select-none shrink-0 font-medium">
            <div className="flex items-center space-x-2">
              <Terminal className="w-3.5 h-3.5 text-brand-accent" />
              <span>Geliştirici Konsolu</span>
            </div>
            <span className="text-[10px] bg-white/5 border border-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold text-brand-textMuted">
              JVM Log
            </span>
          </div>

          {/* Terminal body */}
          <div className="flex-1 p-4 overflow-y-auto font-mono text-[10px] leading-relaxed space-y-1.5 scrollbar-thin select-text">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`${
                  log.includes('[HATA]') || log.includes('error')
                    ? 'text-red-400'
                    : log.includes('INFO') || log.includes('[MarinMC')
                    ? 'text-brand-accent'
                    : 'text-brand-textMuted'
                }`}
              >
                {log}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-white/20 select-none">
                <Terminal className="w-6 h-6 mb-1.5 opacity-50" />
                <p>Konsol çıktısı için "Oyunu Başlat" butonuna basın.</p>
              </div>
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
