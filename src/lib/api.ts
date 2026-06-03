import axios from 'axios';
import { ServerInfo } from '../types/server';
import { API_BASE, SERVER_IP } from './constants';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
});

export const api = {
  // Fetch servers list with status
  async getServers(): Promise<ServerInfo[]> {
    try {
      const response = await apiClient.get('/servers');
      return response.data;
    } catch (err) {
      console.warn('API error fetching servers, using mock fallback:', err);
      // Return beautiful mock game nodes for testing
      return [
        {
          id: 'survival',
          name: 'MarinMC Survival',
          ip: SERVER_IP,
          port: 25565,
          description: 'Sonsuz hayatta kalma macerası, özel ekonomi ve klan savaşları!',
          online: true,
          players: { online: 342, max: 1000 },
          version: '1.20.4',
          ping: 15,
          bannerUrl: 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=800&auto=format&fit=crop&q=60'
        },
        {
          id: 'skyblock',
          name: 'MarinMC Skyblock',
          ip: SERVER_IP,
          port: 25565,
          description: 'Gökyüzündeki adanı büyüt, görevleri tamamla ve en zengin sen ol!',
          online: true,
          players: { online: 189, max: 500 },
          version: '1.20.4',
          ping: 18,
          bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=60'
        },
        {
          id: 'bedwars',
          name: 'MarinMC Bedwars',
          ip: SERVER_IP,
          port: 25565,
          description: 'Yatakları koru, rakipleri yok et. Hızlı tempolu PVP mücadelesi!',
          online: true,
          players: { online: 256, max: 800 },
          version: '1.20.4',
          ping: 12,
          bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=60'
        }
      ];
    }
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
