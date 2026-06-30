import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Window Controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Game Launching
  launchGame: (options: any) => ipcRenderer.invoke('game:launch', options),
  stopGame: () => ipcRenderer.invoke('game:stop'),
  isGameRunning: () => ipcRenderer.invoke('game-is-running'),
  detectJava: () => ipcRenderer.invoke('detect-java'),

  // Game event listeners
  onGameLog: (callback: (log: string) => void) => {
    const subscription = (_event: any, log: string) => callback(log);
    ipcRenderer.on('game:log', subscription);
    return () => ipcRenderer.removeListener('game:log', subscription);
  },
  onDownloadProgress: (callback: (percent: number) => void) => {
    const subscription = (_event: any, percent: number) => callback(percent);
    ipcRenderer.on('game:progress', subscription);
    return () => ipcRenderer.removeListener('game:progress', subscription);
  },
  onGameStatus: (callback: (status: 'IDLE' | 'CHECKING' | 'DOWNLOADING' | 'LAUNCHING' | 'RUNNING' | 'ERROR') => void) => {
    const subscription = (_event: any, status: 'IDLE' | 'CHECKING' | 'DOWNLOADING' | 'LAUNCHING' | 'RUNNING' | 'ERROR') => callback(status);
    ipcRenderer.on('game:status', subscription);
    return () => ipcRenderer.removeListener('game:status', subscription);
  },
  onGameCrash: (callback: (data: { exitCode: number; crashLogPath: string; suspectedMod?: string; suspectedFilename?: string; crashDetails?: string }) => void) => {
    const subscription = (_event: any, data: { exitCode: number; crashLogPath: string; suspectedMod?: string; suspectedFilename?: string; crashDetails?: string }) => callback(data);
    ipcRenderer.on('game-crash', subscription);
    return () => ipcRenderer.removeListener('game-crash', subscription);
  },

  // System Information
  getVersion: () => ipcRenderer.invoke('app:version'),
   downloadFile: (url: string, filename: string, projectType: string, targetVersion?: string) => ipcRenderer.invoke('system:download-file', url, filename, projectType, targetVersion),
   deleteModFile: (filename: string, projectType: string, targetVersion?: string) => ipcRenderer.invoke('system:delete-file', filename, projectType, targetVersion),
   toggleModFile: (filename: string, projectType: string, enabled: boolean, targetVersion?: string) => ipcRenderer.invoke('system:toggle-file', filename, projectType, enabled, targetVersion),
  openDirectory: (dirPath: string) => ipcRenderer.invoke('system:open-directory', dirPath),
  uploadSkinFile: (filePath: string) => ipcRenderer.invoke('system:upload-skin-file', filePath),
  getSystemInfo: () => ipcRenderer.invoke('system:info'),
  getHardware: () => ipcRenderer.invoke('system:hardware'),
  getSystemStats: () => ipcRenderer.invoke('system:stats'),
  optimizeMemory: () => ipcRenderer.invoke('system:optimize-memory'),
  getStartup: () => ipcRenderer.invoke('system:get-startup'),
  setStartup: (enabled: boolean) => ipcRenderer.invoke('system:set-startup', enabled),
  updateSettings: (settings: any) => ipcRenderer.invoke('system:update-settings', settings),
  validateMojangUsername: (username: string) => ipcRenderer.invoke('system:validate-mojang', username),
  checkConnectivity: () => ipcRenderer.invoke('system:check-connectivity'),
  selectDirectory: () => ipcRenderer.invoke('system:select-directory'),
  validateDirectory: (dirPath: string) => ipcRenderer.invoke('validate-directory', dirPath),
  openExternal: (url: string) => ipcRenderer.invoke('system:open-external', url),
  getScreenshots: (gameDir: string) => ipcRenderer.invoke('get-screenshots', gameDir),
  uploadSkin: () => ipcRenderer.invoke('upload-skin'),
  openCrashLog: (crashPath: string) => ipcRenderer.invoke('open-crash-log', crashPath),
  copyCrashLog: (crashPath: string) => ipcRenderer.invoke('copy-crash-log', crashPath),
  exportProfile: (settings: any) => ipcRenderer.invoke('profile:export', settings),
  importProfile: () => ipcRenderer.invoke('profile:import'),
  cloneProfile: (sourceDir: string, destDir: string) => ipcRenderer.invoke('profile:clone', sourceDir, destDir),

  // Authentication IPCs
  loginCracked: (username: string) => ipcRenderer.invoke('auth:login-cracked', username),
  loginMicrosoft: () => ipcRenderer.invoke('auth:login-microsoft'),
  logout: () => ipcRenderer.invoke('auth:logout'),

  // Updates status listeners (for UI info)
  onUpdateStatus: (callback: (status: string, details?: any) => void) => {
    const subscription = (_event: any, status: string, details?: any) => callback(status, details);
    ipcRenderer.on('updater:status', subscription);
    return () => ipcRenderer.removeListener('updater:status', subscription);
  },
  onUpdateProgress: (callback: (percent: number) => void) => {
    const subscription = (_event: any, percent: number) => callback(percent);
    ipcRenderer.on('updater:progress', subscription);
    return () => ipcRenderer.removeListener('updater:progress', subscription);
  }
});
