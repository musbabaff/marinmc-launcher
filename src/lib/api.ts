import axios from 'axios';
import { ServerInfo } from '../types/server';
import { API_BASE } from './constants';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
});

export const api = {
  // Fetch new servers list structure
  async getServerList(): Promise<ServerInfo[]> {
    try {
      const response = await apiClient.get('/servers');
      return response.data;
    } catch (err) {
      console.warn('API error fetching servers, using mock fallback:', err);
      // Return three premium mock servers requested
      return [
        {
          id: 'towny',
          name: 'MarinMC Towny',
          ip: 'towny.marinmc.com',
          port: 25565,
          mode: 'TOWNY',
          description: 'Şehir kur, toprak kazan!',
          playerCount: 428,
          maxPlayers: 1000,
          tags: ['POPÜLER'],
          themeColor: 'teal',
          version: '1.20.4',
          ping: 14,
          online: true,
          players: { online: 428, max: 1000 },
          artworkUrl: 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=800&auto=format&fit=crop&q=60'
        },
        {
          id: 'creative',
          name: 'MarinMC Creative',
          ip: 'creative.marinmc.com',
          port: 25565,
          mode: 'CREATIVE',
          description: 'Sınırsız yaratıcılık!',
          playerCount: 156,
          maxPlayers: 500,
          tags: ['YENİ'],
          themeColor: 'purple',
          version: '1.20.4',
          ping: 18,
          online: true,
          players: { online: 156, max: 500 },
          artworkUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=60'
        },
        {
          id: 'survival',
          name: 'MarinMC Survival',
          ip: 'survival.marinmc.com',
          port: 25565,
          mode: 'SURVIVAL',
          description: 'Hayatta kal, efsane ol!',
          playerCount: 664,
          maxPlayers: 1500,
          tags: ['POPÜLER', 'SEZONLUK'],
          themeColor: 'orange',
          version: '1.20.4',
          ping: 11,
          online: true,
          players: { online: 664, max: 1500 },
          artworkUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=60'
        }
      ];
    }
  },

  // Fetch global online counts
  async getOnlineCount(): Promise<{ total: number }> {
    try {
      const response = await apiClient.get('/stats/online');
      return response.data;
    } catch (err) {
      // Mock global player count fallback
      const totalMock = 1248;
      return { total: totalMock };
    }
  },

  // Legacy fallback method for other parts of the project
  async getServers(): Promise<ServerInfo[]> {
    return this.getServerList();
  },

  // Fetch launcher announcement or updates
  async getNews() {
    try {
      const response = await apiClient.get('/news');
      return response.data;
    } catch (err) {
      return [
        {
          id: 1,
          title: 'Büyük Yaz Sezonu Başladı!',
          date: '04.06.2026',
          summary: 'Yeni hayatta kalma haritası, rütbe ödülleri ve market güncellemeleri aktif edildi.'
        },
        {
          id: 2,
          title: 'Hile Koruması Güncellendi',
          date: '02.06.2026',
          summary: 'Tüm oyun lobilerinde geçerli yeni hile tespit sistemimiz devreye sokulmuştur.'
        }
      ];
    }
  }
};

export async function checkConnectivity(): Promise<boolean> {
  try {
    await axios.get('https://api.marinmc.com/ping', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
