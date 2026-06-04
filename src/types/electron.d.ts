export interface IElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  launchGame: (options: { 
    ram: number; 
    jvmArgs: string; 
    username: string; 
    version: string;
    serverId: string;
    gameDir: string;
  }) => Promise<void>;
  stopGame: () => Promise<{ success: boolean }>;
  onGameLog: (callback: (log: string) => void) => () => void;
  onDownloadProgress: (callback: (percent: number) => void) => () => void;
  onGameStatus: (callback: (status: 'IDLE' | 'CHECKING' | 'DOWNLOADING' | 'LAUNCHING' | 'RUNNING' | 'ERROR') => void) => () => void;
  getSystemInfo: () => Promise<{ totalRAM: number; javaPath: string; os: string }>;
  selectDirectory: () => Promise<string | null>;
  openExternal: (url: string) => Promise<{ success: boolean }>;
  loginCracked: (username: string) => Promise<any>;
  loginMicrosoft: () => Promise<any>;
  logout: () => Promise<{ success: boolean }>;
  onUpdateStatus: (callback: (status: string, details?: any) => void) => () => void;
  onUpdateProgress: (callback: (percent: number) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
