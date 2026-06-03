import { create } from 'zustand';

interface SettingsState {
  ram: number; // in MB
  jvmArgs: string;
  launcherDir: string;
  javaPath: string;
  totalSystemRAM: number; // in MB
  osName: string;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: { ram: number; jvmArgs: string; launcherDir: string; javaPath: string }) => void;
}

const DEFAULT_JVM_ARGS = "-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch";

export const useSettingsStore = create<SettingsState>((set) => ({
  ram: (() => {
    const val = localStorage.getItem('marinmc_setting_ram');
    return val ? parseInt(val, 10) : 4096;
  })(),
  jvmArgs: localStorage.getItem('marinmc_setting_jvmArgs') || DEFAULT_JVM_ARGS,
  launcherDir: localStorage.getItem('marinmc_setting_launcherDir') || '',
  javaPath: localStorage.getItem('marinmc_setting_javaPath') || 'Bundled Java',
  totalSystemRAM: 8192, // Default fallback
  osName: 'Windows',

  loadSettings: async () => {
    let defaultDir = '';
    let sysRAM = 8192;
    let sysOS = 'Windows';
    let sysJava = 'Bundled Java';

    if (window.electronAPI) {
      try {
        const sysInfo = await window.electronAPI.getSystemInfo();
        sysRAM = sysInfo.totalRAM;
        sysOS = sysInfo.os;
        sysJava = sysInfo.javaPath;
      } catch (err) {
        console.error('Error fetching system specs:', err);
      }
    }

    // Set OS-specific default directories if empty
    if (sysOS === 'Windows') {
      defaultDir = 'C:\\Users\\Default\\AppData\\Roaming\\.marinmc';
    } else if (sysOS === 'macOS') {
      defaultDir = '/Users/Default/Library/Application Support/marinmc';
    } else {
      defaultDir = '/home/default/.marinmc';
    }

    const savedDir = localStorage.getItem('marinmc_setting_launcherDir') || defaultDir;
    const savedJava = localStorage.getItem('marinmc_setting_javaPath') || sysJava;

    set({
      totalSystemRAM: sysRAM,
      osName: sysOS,
      launcherDir: savedDir,
      javaPath: savedJava
    });
  },

  saveSettings: (newSettings) => {
    localStorage.setItem('marinmc_setting_ram', newSettings.ram.toString());
    localStorage.setItem('marinmc_setting_jvmArgs', newSettings.jvmArgs);
    localStorage.setItem('marinmc_setting_launcherDir', newSettings.launcherDir);
    localStorage.setItem('marinmc_setting_javaPath', newSettings.javaPath);
    set({ ...newSettings });
  }
}));
