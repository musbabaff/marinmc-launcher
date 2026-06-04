import { create } from 'zustand';

interface SettingsState {
  ram: number; // in MB
  jvmArgs: string;
  launcherDir: string;
  javaPath: string;
  totalSystemRAM: number; // in MB
  osName: string;
  launcherBehavior: 'minimize' | 'close' | 'nothing';
  language: 'tr' | 'en';
  theme: 'dark' | 'light';
  autoUpdate: boolean;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: { 
    ram: number; 
    jvmArgs: string; 
    launcherDir: string; 
    javaPath: string;
    launcherBehavior?: 'minimize' | 'close' | 'nothing';
  }) => void;
  setLanguage: (lang: 'tr' | 'en') => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setAutoUpdate: (enabled: boolean) => void;
  setLauncherBehavior: (behavior: 'minimize' | 'close' | 'nothing') => void;
  resetAll: () => void;
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
  launcherBehavior: (() => {
    const val = localStorage.getItem('marinmc_setting_behavior');
    return (val as 'minimize' | 'close' | 'nothing') || 'minimize';
  })(),
  language: (() => {
    const val = localStorage.getItem('marinmc_setting_language');
    return (val as 'tr' | 'en') || 'tr';
  })(),
  theme: (() => {
    const val = localStorage.getItem('marinmc_setting_theme');
    return (val as 'dark' | 'light') || 'dark';
  })(),
  autoUpdate: (() => {
    const val = localStorage.getItem('marinmc_setting_autoUpdate');
    return val !== 'false'; // default true
  })(),

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
    const savedBehavior = localStorage.getItem('marinmc_setting_behavior') || 'minimize';

    set({
      totalSystemRAM: sysRAM,
      osName: sysOS,
      launcherDir: savedDir,
      javaPath: savedJava,
      launcherBehavior: savedBehavior as 'minimize' | 'close' | 'nothing'
    });
  },

  saveSettings: (newSettings) => {
    localStorage.setItem('marinmc_setting_ram', newSettings.ram.toString());
    localStorage.setItem('marinmc_setting_jvmArgs', newSettings.jvmArgs);
    localStorage.setItem('marinmc_setting_launcherDir', newSettings.launcherDir);
    localStorage.setItem('marinmc_setting_javaPath', newSettings.javaPath);
    if (newSettings.launcherBehavior) {
      localStorage.setItem('marinmc_setting_behavior', newSettings.launcherBehavior);
    }
    set((state) => ({ 
      ...newSettings,
      launcherBehavior: newSettings.launcherBehavior || state.launcherBehavior
    }));
  },

  setLanguage: (lang) => {
    localStorage.setItem('marinmc_setting_language', lang);
    import('../lib/i18n.ts').then(mod => mod.default.changeLanguage(lang));
    set({ language: lang });
  },

  setTheme: (theme) => {
    localStorage.setItem('marinmc_setting_theme', theme);
    set({ theme });
  },

  setAutoUpdate: (enabled) => {
    localStorage.setItem('marinmc_setting_autoUpdate', enabled.toString());
    set({ autoUpdate: enabled });
  },

  setLauncherBehavior: (behavior) => {
    localStorage.setItem('marinmc_setting_behavior', behavior);
    set({ launcherBehavior: behavior });
  },

  resetAll: () => {
    const keys = [
      'marinmc_setting_ram', 'marinmc_setting_jvmArgs', 'marinmc_setting_launcherDir',
      'marinmc_setting_javaPath', 'marinmc_setting_behavior', 'marinmc_setting_language',
      'marinmc_setting_theme', 'marinmc_setting_autoUpdate'
    ];
    keys.forEach(k => localStorage.removeItem(k));
    import('../lib/i18n.ts').then(mod => mod.default.changeLanguage('tr'));
    set({
      ram: 4096,
      jvmArgs: DEFAULT_JVM_ARGS,
      launcherDir: '',
      javaPath: 'Bundled Java',
      launcherBehavior: 'minimize',
      language: 'tr',
      theme: 'dark',
      autoUpdate: true,
    });
  }
}));
