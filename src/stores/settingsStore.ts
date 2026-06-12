import { create } from 'zustand';

export interface RecentProfile {
  id: string;
  name: string;
  version: string;
  subVersion: string;
  timePlayed: string;
  artworkUrl?: string;
  mode?: string;
  ip?: string;
  port?: number;
}

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
  selectedVersion: string;
  selectedSubVersion: string;
  recentProfiles: RecentProfile[];
  smartJvmOpt: boolean;
  discordRpcEnabled: boolean;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: { 
    ram: number; 
    jvmArgs: string; 
    launcherDir: string; 
    javaPath: string;
    launcherBehavior?: 'minimize' | 'close' | 'nothing';
    smartJvmOpt?: boolean;
    discordRpcEnabled?: boolean;
  }) => void;
  setLanguage: (lang: 'tr' | 'en') => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setAutoUpdate: (enabled: boolean) => void;
  setLauncherBehavior: (behavior: 'minimize' | 'close' | 'nothing') => void;
  setSelectedVersion: (version: string) => void;
  setSelectedSubVersion: (subVersion: string) => void;
  addRecentProfile: (profile: RecentProfile) => void;
  resolutionWidth: number;
  resolutionHeight: number;
  fullscreen: boolean;
  setResolution: (width: number, height: number) => void;
  setFullscreen: (enabled: boolean) => void;
  resetAll: () => void;
}

const DEFAULT_JVM_ARGS = "-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch";

const INITIAL_MOCK_RECENT_PROFILES: RecentProfile[] = [];

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
  selectedVersion: localStorage.getItem('marinmc_setting_selectedVersion') || '1.21',
  selectedSubVersion: localStorage.getItem('marinmc_setting_selectedSubVersion') || '1.21.8',
  recentProfiles: (() => {
    try {
      const saved = localStorage.getItem('marinmc_setting_recentProfiles');
      return saved ? JSON.parse(saved) : INITIAL_MOCK_RECENT_PROFILES;
    } catch {
      return INITIAL_MOCK_RECENT_PROFILES;
    }
  })(),
  smartJvmOpt: (() => {
    const val = localStorage.getItem('marinmc_setting_smartJvmOpt');
    return val !== 'false'; // default true
  })(),
  discordRpcEnabled: (() => {
    const val = localStorage.getItem('marinmc_setting_discordRpc');
    return val !== 'false'; // default true
  })(),
  resolutionWidth: (() => {
    const val = localStorage.getItem('marinmc_setting_res_width');
    return val ? parseInt(val, 10) : 1280;
  })(),
  resolutionHeight: (() => {
    const val = localStorage.getItem('marinmc_setting_res_height');
    return val ? parseInt(val, 10) : 720;
  })(),
  fullscreen: (() => {
    const val = localStorage.getItem('marinmc_setting_fullscreen');
    return val === 'true'; // default false
  })(),

  loadSettings: async () => {
    let defaultDir = '';
    let sysRAM = 8192;
    let sysOS = 'Windows';
    let sysJava = 'Bundled Java';
    let defaultGameDirResolved = '';

    if (window.electronAPI) {
      try {
        const sysInfo = await window.electronAPI.getSystemInfo();
        sysRAM = sysInfo.totalRAM;
        sysOS = sysInfo.os;
        sysJava = sysInfo.javaPath;
        if (sysInfo.defaultGameDir) {
          defaultGameDirResolved = sysInfo.defaultGameDir;
        }

        // Notify backend of loaded settings (moved below set)
      } catch (err) {
        console.error('Error fetching system specs:', err);
      }
    }

    // Set OS-specific default directories if empty as fallback
    if (sysOS === 'Windows') {
      defaultDir = 'C:\\Users\\Default\\AppData\\Roaming\\.marinmc';
    } else if (sysOS === 'macOS') {
      defaultDir = '/Users/Default/Library/Application Support/marinmc';
    } else {
      defaultDir = '/home/default/.marinmc';
    }

    const finalDefaultDir = defaultGameDirResolved || defaultDir;
    const savedDir = localStorage.getItem('marinmc_setting_launcherDir') || finalDefaultDir;
    const savedJava = localStorage.getItem('marinmc_setting_javaPath') || sysJava;
    const savedBehavior = localStorage.getItem('marinmc_setting_behavior') || 'minimize';

    set({
      totalSystemRAM: sysRAM,
      osName: sysOS,
      launcherDir: savedDir,
      javaPath: savedJava,
      launcherBehavior: savedBehavior as 'minimize' | 'close' | 'nothing'
    });

    if (window.electronAPI) {
      const state = useSettingsStore.getState();
      window.electronAPI.updateSettings({
        smartJvmOpt: state.smartJvmOpt,
        discordRpcEnabled: state.discordRpcEnabled,
        language: state.language,
        launcherDir: state.launcherDir
      }).catch(err => console.error('updateSettings failed:', err));
    }
  },

  saveSettings: (newSettings) => {
    const currentSmart = useSettingsStore.getState().smartJvmOpt;
    const currentDiscord = useSettingsStore.getState().discordRpcEnabled;
    const smartJvmOpt = newSettings.smartJvmOpt !== undefined ? newSettings.smartJvmOpt : currentSmart;
    const discordRpcEnabled = newSettings.discordRpcEnabled !== undefined ? newSettings.discordRpcEnabled : currentDiscord;

    localStorage.setItem('marinmc_setting_ram', newSettings.ram.toString());
    localStorage.setItem('marinmc_setting_jvmArgs', newSettings.jvmArgs);
    localStorage.setItem('marinmc_setting_launcherDir', newSettings.launcherDir);
    localStorage.setItem('marinmc_setting_javaPath', newSettings.javaPath);
    localStorage.setItem('marinmc_setting_smartJvmOpt', smartJvmOpt.toString());
    localStorage.setItem('marinmc_setting_discordRpc', discordRpcEnabled.toString());
    if (newSettings.launcherBehavior) {
      localStorage.setItem('marinmc_setting_behavior', newSettings.launcherBehavior);
    }
    set((state) => ({ 
      ...newSettings,
      smartJvmOpt,
      discordRpcEnabled,
      launcherBehavior: newSettings.launcherBehavior || state.launcherBehavior
    }));

    if (window.electronAPI) {
      window.electronAPI.updateSettings({
        smartJvmOpt,
        discordRpcEnabled,
        language: useSettingsStore.getState().language,
        launcherDir: newSettings.launcherDir
      });
    }
  },

  setLanguage: (lang) => {
    localStorage.setItem('marinmc_setting_language', lang);
    import('../lib/i18n.ts').then(mod => mod.default.changeLanguage(lang));
    set({ language: lang });

    if (window.electronAPI) {
      const state = useSettingsStore.getState();
      window.electronAPI.updateSettings({
        smartJvmOpt: state.smartJvmOpt,
        discordRpcEnabled: state.discordRpcEnabled,
        language: lang,
        launcherDir: state.launcherDir
      });
    }
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

  setSelectedVersion: (version) => {
    localStorage.setItem('marinmc_setting_selectedVersion', version);
    set({ selectedVersion: version });
  },

  setSelectedSubVersion: (subVersion) => {
    localStorage.setItem('marinmc_setting_selectedSubVersion', subVersion);
    set({ selectedSubVersion: subVersion });
  },

  addRecentProfile: (profile) => {
    set((state) => {
      // Remove duplicate if exists
      const filtered = state.recentProfiles.filter((p) => p.id !== profile.id);
      const updated = [profile, ...filtered].slice(0, 5); // keep last 5
      localStorage.setItem('marinmc_setting_recentProfiles', JSON.stringify(updated));
      return { recentProfiles: updated };
    });
  },

  setResolution: (width, height) => {
    localStorage.setItem('marinmc_setting_res_width', width.toString());
    localStorage.setItem('marinmc_setting_res_height', height.toString());
    set({ resolutionWidth: width, resolutionHeight: height });
  },

  setFullscreen: (enabled) => {
    localStorage.setItem('marinmc_setting_fullscreen', enabled.toString());
    set({ fullscreen: enabled });
  },

  resetAll: () => {
    const keys = [
      'marinmc_setting_ram', 'marinmc_setting_jvmArgs', 'marinmc_setting_launcherDir',
      'marinmc_setting_javaPath', 'marinmc_setting_behavior', 'marinmc_setting_language',
      'marinmc_setting_theme', 'marinmc_setting_autoUpdate',
      'marinmc_setting_selectedVersion', 'marinmc_setting_selectedSubVersion',
      'marinmc_setting_recentProfiles', 'marinmc_setting_smartJvmOpt', 'marinmc_setting_discordRpc',
      'marinmc_setting_res_width', 'marinmc_setting_res_height', 'marinmc_setting_fullscreen'
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
      selectedVersion: '1.21',
      selectedSubVersion: '1.21.8',
      recentProfiles: INITIAL_MOCK_RECENT_PROFILES,
      smartJvmOpt: true,
      discordRpcEnabled: true,
      resolutionWidth: 1280,
      resolutionHeight: 720,
      fullscreen: false
    });

    if (window.electronAPI) {
      const state = useSettingsStore.getState();
      window.electronAPI.updateSettings({
        smartJvmOpt: true,
        discordRpcEnabled: true,
        language: 'tr',
        launcherDir: state.launcherDir
      });
    }
  }
}));
