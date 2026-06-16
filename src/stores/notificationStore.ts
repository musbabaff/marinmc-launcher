import { create } from 'zustand';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: 'urgent' | 'info' | 'success';
  date: string;
  unread: boolean;
}

interface NotificationState {
  notifications: NotificationItem[];
  addNotification: (title: string, description: string, type?: NotificationItem['type']) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  { id: '1', title: 'Planlı Sunucu Bakımı', description: 'MarinMC Towny sunucusu 5 dakika içinde yedekleme ve bakım için yeniden başlatılacaktır.', type: 'urgent', date: 'Az önce', unread: true },
  { id: '2', title: 'Arkadaşlık İsteği', description: 'RedstoneGuy size bir arkadaşlık isteği gönderdi.', type: 'info', date: '10 dakika önce', unread: true },
  { id: '3', title: 'Yeni Sürüm Güncellemesi', description: 'MarinMC Client v1.0.1 güncellemesi indirilmeye hazır. Değişiklik listesini görmek için tıklayın.', type: 'info', date: '2 saat önce', unread: false },
  { id: '4', title: 'Mod Güncellemesi Mevcut', description: 'Sodium modu için yeni bir v0.6.1 sürümü yayınlandı. Ayarlar penceresinden güncelleyebilirsiniz.', type: 'info', date: '1 gün önce', unread: false },
  { id: '5', title: 'Ödeme Başarılı', description: 'VIP üyelik siparişiniz başarıyla işlendi. Sunucuya giriş yaptığınızda aktif edilecektir.', type: 'success', date: '3 gün önce', unread: false }
];

export const useNotificationStore = create<NotificationState>((set) => {
  // Load initially from localStorage
  const loadInitial = (): NotificationItem[] => {
    try {
      const stored = localStorage.getItem('marinmc_notifications');
      return stored ? JSON.parse(stored) : DEFAULT_NOTIFICATIONS;
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  };

  const saveToStorage = (list: NotificationItem[]) => {
    localStorage.setItem('marinmc_notifications', JSON.stringify(list));
  };

  return {
    notifications: loadInitial(),

    addNotification: (title, description, type = 'info') => set((state) => {
      const newItem: NotificationItem = {
        id: Math.random().toString(36).substring(2, 9),
        title,
        description,
        type,
        date: 'Şimdi',
        unread: true
      };
      const updated = [newItem, ...state.notifications];
      saveToStorage(updated);
      return { notifications: updated };
    }),

    markAsRead: (id) => set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, unread: false } : n
      );
      saveToStorage(updated);
      return { notifications: updated };
    }),

    markAllAsRead: () => set((state) => {
      const updated = state.notifications.map((n) => ({ ...n, unread: false }));
      saveToStorage(updated);
      return { notifications: updated };
    }),

    deleteNotification: (id) => set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      saveToStorage(updated);
      return { notifications: updated };
    }),

    clearAll: () => set(() => {
      saveToStorage([]);
      return { notifications: [] };
    })
  };
});
