import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Window Controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Game Launching
  launchGame: (options: any) => ipcRenderer.invoke('game:launch', options),
  stopGame: () => ipcRenderer.invoke('game:stop'),
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

  // System Information
  getSystemInfo: () => ipcRenderer.invoke('system:info'),
  selectDirectory: () => ipcRenderer.invoke('system:select-directory'),
  openExternal: (url: string) => ipcRenderer.invoke('system:open-external', url),

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
