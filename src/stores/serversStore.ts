import { create } from 'zustand';
import { ServerInfo } from '../types/server';
import { api } from '../lib/api';

interface ServersState {
  servers: ServerInfo[];
  totalOnline: number;
  isLoading: boolean;
  error: string | null;
  selectedServerId: string | null;
  selectedServer: ServerInfo | null; // Compatibility with ServerDetailPage
  fetchServers: () => Promise<void>;
  setSelectedServer: (id: string | null) => void;
  updateOnlineCounts: () => Promise<void>;
  selectServer: (server: ServerInfo) => void; // Compatibility
}

export const useServersStore = create<ServersState>((set, get) => ({
  servers: [],
  totalOnline: 0,
  isLoading: false,
  error: null,
  selectedServerId: null,
  selectedServer: null,

  fetchServers: async () => {
    set({ isLoading: true, error: null });
    try {
      const [servers, stats] = await Promise.all([
        api.getServerList(),
        api.getOnlineCount()
      ]);

      const currentId = get().selectedServerId;
      const stillExists = currentId ? servers.find(s => s.id === currentId) : null;
      const selected = stillExists || (servers.length > 0 ? servers[0] : null);

      set({
        servers,
        totalOnline: stats.total,
        isLoading: false,
        selectedServerId: selected ? selected.id : null,
        selectedServer: selected
      });
    } catch (err: any) {
      console.error('Error fetching servers:', err);
      // Fallback: keep existing state if available, or just clear loading
      set({ 
        isLoading: false,
        error: err.message || 'Sunucular yüklenirken hata oluştu'
      });
    }
  },

  setSelectedServer: (id) => {
    const servers = get().servers;
    const selected = id ? servers.find(s => s.id === id) || null : null;
    set({ 
      selectedServerId: id,
      selectedServer: selected
    });
  },

  updateOnlineCounts: async () => {
    try {
      const [servers, stats] = await Promise.all([
        api.getServerList(),
        api.getOnlineCount()
      ]);
      
      const currentId = get().selectedServerId;
      const stillExists = currentId ? servers.find(s => s.id === currentId) : null;

      set({
        servers,
        totalOnline: stats.total,
        selectedServer: stillExists || get().selectedServer
      });
    } catch (err) {
      console.warn('Silent online count update failed:', err);
    }
  },

  selectServer: (server) => {
    set({
      selectedServerId: server.id,
      selectedServer: server
    });
  }
}));
