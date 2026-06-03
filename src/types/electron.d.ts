export interface IElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  launchGame: (options: { ram: number; jvmArgs: string; username: string; version: string }) => Promise<void>;
  stopGame: () => Promise<{ success: boolean }>;
  onGameLog: (callback: (log: string) => void) => () => void;
  onDownloadProgress: (callback: (percent: number) => void) => () => void;
  getSystemInfo: () => Promise<{ totalRAM: number; javaPath: string; os: string }>;
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
