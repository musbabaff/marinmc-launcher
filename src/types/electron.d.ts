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
    userType?: 'cracked' | 'ms';
    version: string;
    serverId: string;
    gameDir: string;
    javaPath?: string;
    smartJvmOpt?: boolean;
    discordRpcEnabled?: boolean;
    cosmetics?: {
      skinType: 'file' | 'username';
      capeUrl: string;
    };
  }) => Promise<{ success: boolean; error?: string }>;
  stopGame: () => Promise<{ success: boolean }>;
  isGameRunning: () => Promise<{ running: boolean }>;
  detectJava: () => Promise<{ found: boolean; version: string | null }>;
  onGameLog: (callback: (log: string) => void) => () => void;
  onDownloadProgress: (callback: (percent: number) => void) => () => void;
  onGameStatus: (callback: (status: 'IDLE' | 'CHECKING' | 'DOWNLOADING' | 'LAUNCHING' | 'RUNNING' | 'ERROR') => void) => () => void;
  onGameCrash: (callback: (data: { 
    exitCode: number; 
    crashLogPath: string; 
    suspectedMod?: string; 
    suspectedFilename?: string; 
    crashDetails?: string; 
  }) => void) => () => void;
  getSystemInfo: () => Promise<{ totalRAM: number; javaPath: string; os: string; defaultGameDir?: string }>;
  updateSettings: (settings: { smartJvmOpt: boolean; discordRpcEnabled: boolean; language: 'tr' | 'en'; launcherDir: string }) => Promise<{ success: boolean }>;
  validateMojangUsername: (username: string) => Promise<{ success: boolean; uuid?: string; name?: string }>;
  checkConnectivity: () => Promise<boolean>;
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
  downloadFile: (url: string, filename: string, projectType: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  getVersion: () => Promise<string>;
  deleteModFile: (filename: string, projectType: string) => Promise<{ success: boolean; error?: string }>;
  toggleModFile: (filename: string, projectType: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  openDirectory: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
  uploadSkinFile: (filePath: string) => Promise<{ success: boolean; path?: string; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
