import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServersStore } from '../stores/serversStore.ts';
import { RefreshCw, Users, Wifi, AlertTriangle, ChevronRight, Play } from 'lucide-react';

export default function ServersPage() {
  const { servers, isLoading, error, fetchServers, selectServer } = useServersStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleSelectServer = (server: any) => {
    selectServer(server);
    navigate(`/server/${server.id}`);
  };

  const totalOnlinePlayers = servers.reduce((sum, s) => sum + (s.players?.online || 0), 0);

  return (
    <div className="flex-1 p-8 overflow-y-auto h-full flex flex-col justify-between">
      {/* Top Header stats */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Oyun Odaları</h2>
          <p className="text-xs text-brand-textMuted mt-0.5">Bağlanmak istediğiniz alt oyun sunucusunu seçin</p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Online count */}
          <div className="px-3.5 py-1.5 rounded-xl bg-brand-accentLight border border-brand-accent/20 flex items-center space-x-2 text-xs">
            <Users className="w-4 h-4 text-brand-accent animate-pulse" />
            <span className="text-brand-textMuted">Toplam Aktif:</span>
            <span className="font-bold text-brand-text">{totalOnlinePlayers} Oyuncu</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchServers()}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-[#131622] hover:bg-brand-cardHover border border-white/5 text-brand-textMuted hover:text-brand-text transition-colors duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center space-x-3 text-red-400 text-xs">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Servers */}
      <div className="grid grid-cols-1 gap-4 flex-1 overflow-y-auto pr-1">
        {servers.map((server) => (
          <div
            key={server.id}
            onClick={() => handleSelectServer(server)}
            className="group glass-panel rounded-2xl p-5 hover:bg-brand-cardHover border border-white/[0.03] hover:border-brand-accent/30 flex items-center justify-between cursor-pointer transition-all duration-300 relative overflow-hidden"
          >
            {/* Ambient hover glow line */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-brand-accent transition-all duration-300"></div>

            {/* Banner/Info */}
            <div className="flex items-center space-x-5 z-10">
              {server.bannerUrl ? (
                <img
                  src={server.bannerUrl}
                  alt={server.name}
                  className="w-24 h-16 object-cover rounded-lg border border-white/5 group-hover:scale-[1.03] transition-transform duration-300"
                />
              ) : (
                <div className="w-24 h-16 rounded-lg bg-brand-accentLight border border-brand-accent/20 flex items-center justify-center">
                  <Play className="w-6 h-6 text-brand-accent" />
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-sm group-hover:text-brand-accent transition-colors duration-200">
                    {server.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-brand-textMuted font-bold">
                    {server.version}
                  </span>
                </div>
                <p className="text-xs text-brand-textMuted max-w-md line-clamp-1 leading-relaxed">
                  {server.description}
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div className="flex items-center space-x-6 z-10">
              {/* Players */}
              <div className="text-right space-y-0.5">
                <div className="text-[10px] text-brand-textMuted font-medium uppercase tracking-wider">Aktif</div>
                <div className="text-xs font-bold text-brand-text">
                  {server.players.online} <span className="text-brand-textMuted font-normal">/ {server.players.max}</span>
                </div>
              </div>

              {/* Ping */}
              <div className="text-right space-y-0.5">
                <div className="text-[10px] text-brand-textMuted font-medium uppercase tracking-wider">Gecikme</div>
                <div className="text-xs font-bold text-brand-success flex items-center justify-end space-x-1">
                  <Wifi className="w-3.5 h-3.5" />
                  <span>{server.ping} ms</span>
                </div>
              </div>

              {/* Arrow Indicator */}
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-brand-accent group-hover:text-white transition-all duration-300">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}

        {servers.length === 0 && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-brand-textMuted text-xs">
            <Wifi className="w-8 h-8 mb-2 animate-bounce" />
            <p>Yüklü oyun odası bulunamadı.</p>
          </div>
        )}
      </div>

      {/* Footer Branding banner */}
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-brand-textMuted">
        <span>Sunucu IP: <strong className="text-brand-text">{servers[0]?.ip || 'oyna.marinmc.com'}</strong></span>
        <span>MarinMC Minecraft Network © 2026</span>
      </div>
    </div>
  );
}
