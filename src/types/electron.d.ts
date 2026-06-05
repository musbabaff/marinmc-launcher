export interface IElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  launchGame: (options: { 
    ram: number; 
    jvmArgs: string; 
    username: string; 
    accessToken?: string;
    uuid?: string;
    version: string;
    serverId: string;
    gameDir: string;
    javaPath?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  stopGame: () => Promise<{ success: boolean }>;
  isGameRunning: () => Promise<{ running: boolean }>;
  detectJava: () => Promise<{ found: boolean; version: string | null }>;
  onGameLog: (callback: (log: string) => void) => () => void;
  onDownloadProgress: (callback: (percent: number) => void) => () => void;
  onGameStatus: (callback: (status: 'IDLE' | 'CHECKING' | 'DOWNLOADING' | 'LAUNCHING' | 'RUNNING' | 'ERROR') => void) => () => void;
  onGameCrash: (callback: (data: { exitCode: number; crashLogPath: string }) => void) => () => void;
  getSystemInfo: () => Promise<{ totalRAM: number; javaPath: string; os: string; defaultGameDir?: string }>;
  validateMojangUsername: (username: string) => Promise<{ success: boolean; uuid?: string; name?: string }>;
  selectDirectory: () => Promise<string | null>;
  validateDirectory: (dirPath: string) => Promise<{ valid: boolean; path?: string; error?: string }>;
  openExternal: (url: string) => Promise<{ success: boolean }>;
  getScreenshots: (gameDir: string) => Promise<{ success: boolean; screenshots: Array<{ name: string; path: string; size: number; date: string | Date }> }>;
  uploadSkin: () => Promise<{ success: boolean; path?: string }>;
  openCrashLog: (crashPath: string) => Promise<{ success: boolean; error?: string }>;
  copyCrashLog: (crashPath: string) => Promise<{ success: boolean; error?: string }>;
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
