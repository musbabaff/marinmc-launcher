import { create } from 'zustand';

type GameStatusType = 'IDLE' | 'CHECKING' | 'DOWNLOADING' | 'LAUNCHING' | 'RUNNING' | 'ERROR';

interface AppState {
  isOnline: boolean;
  activePage: string;
  gameLogs: string[];
  gameStatus: GameStatusType;
  setOnline: (v: boolean) => void;
  setActivePage: (page: string) => void;
  addGameLog: (log: string) => void;
  clearGameLogs: () => void;
  setGameStatus: (status: GameStatusType) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: true,
  activePage: '/home',
  gameLogs: [],
  gameStatus: 'IDLE',
  setOnline: (v) => set({ isOnline: v }),
  setActivePage: (page) => set({ activePage: page }),
  addGameLog: (log) => set((state) => {
    const nextLogs = [...state.gameLogs, log];
    if (nextLogs.length > 1000) {
      nextLogs.shift();
    }
    return { gameLogs: nextLogs };
  }),
  clearGameLogs: () => set({ gameLogs: [] }),
  setGameStatus: (status) => set({ gameStatus: status }),
}));
