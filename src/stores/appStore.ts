import { create } from 'zustand';

interface AppState {
  isOnline: boolean;
  activePage: string;
  setOnline: (v: boolean) => void;
  setActivePage: (page: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: true,
  activePage: '/home',
  setOnline: (v) => set({ isOnline: v }),
  setActivePage: (page) => set({ activePage: page }),
}));
