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

export const useNotificationStore = create<NotificationState>((set) => {
  // Load from localStorage. No seeded/sample notifications — real ones only.
  const loadInitial = (): NotificationItem[] => {
    try {
      const stored = localStorage.getItem('marinmc_notifications');
      if (!stored) return [];
      const list = JSON.parse(stored);
      if (!Array.isArray(list)) return [];
      // One-time cleanup: drop the old hardcoded sample notifications (fixed ids 1-5).
      return list.filter((n: NotificationItem) => !['1', '2', '3', '4', '5'].includes(n.id));
    } catch {
      return [];
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
