import { create } from 'zustand';
import { ServerInfo } from '../types/server';
import { api } from '../lib/api';

interface ServersState {
  servers: ServerInfo[];
  selectedServer: ServerInfo | null;
  isLoading: boolean;
  error: string | null;
  fetchServers: () => Promise<void>;
  selectServer: (server: ServerInfo) => void;
}

export const useServersStore = create<ServersState>((set, get) => ({
  servers: [],
  selectedServer: null,
  isLoading: false,
  error: null,
  fetchServers: async () => {
    set({ isLoading: true, error: null });
    try {
      const servers = await api.getServers();
      const currentSelected = get().selectedServer;
      
      // Keep selection if it exists in the fetched list
      const stillExists = currentSelected ? servers.find(s => s.id === currentSelected.id) : null;
      
      set({ 
        servers, 
        isLoading: false,
        selectedServer: stillExists || (servers.length > 0 ? servers[0] : null)
      });
    } catch (err: any) {
      set({ error: err.message || 'Sunucular yüklenirken hata oluştu', isLoading: false });
    }
  },
  selectServer: (server) => set({ selectedServer: server }),
}));
