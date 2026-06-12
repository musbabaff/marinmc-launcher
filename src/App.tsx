import { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore.ts';
import { useAppStore } from './stores/appStore.ts';
import { useSettingsStore } from './stores/settingsStore.ts';
import TitleBar from './components/TitleBar.tsx';
import Sidebar from './components/Sidebar.tsx';
import OfflineBanner from './components/OfflineBanner.tsx';
import CrashModal from './components/CrashModal.tsx';
import { checkConnectivity, api } from './lib/api.ts';

import { useTranslation } from 'react-i18next';

// Lazy-loaded pages for performance
const LoginPage = lazy(() => import('./pages/LoginPage.tsx'));
const HomePage = lazy(() => import('./pages/HomePage.tsx'));
const VersionsPage = lazy(() => import('./pages/VersionsPage.tsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.tsx'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage.tsx'));
const ChatPage = lazy(() => import('./pages/ChatPage.tsx'));
const CosmeticsPage = lazy(() => import('./pages/CosmeticsPage.tsx'));
const GalleryPage = lazy(() => import('./pages/GalleryPage.tsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.tsx'));
const ModManagerPage = lazy(() => import('./pages/ModManagerPage.tsx'));
const StorePage = lazy(() => import('./pages/StorePage.tsx'));
const ConsolePage = lazy(() => import('./pages/ConsolePage.tsx'));

// Loading fallback
const PageLoader = () => {
  const { t } = useTranslation();
  return (
    <div className="flex-grow flex items-center justify-center bg-[#060305]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#2D7DD2]/30 border-t-[#2D7DD2] rounded-full animate-spin" />
        <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider">{t('login.loading')}</span>
      </div>
    </div>
  );
};

// Layout wrapper structure
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="flex flex-1 h-[calc(100vh-40px)] w-full relative overflow-hidden bg-[#060305]">
      {/* Sidebar Navigation */}
      {!isLoginPage && <Sidebar />}

      {/* Main View Area */}
      <div className="flex-1 h-full overflow-hidden flex flex-col relative bg-[#060305]">
        <OfflineBanner />
        {children}
      </div>
    </div>
  );
};

// Route Guard logic
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const session = useAuthStore((state) => state.session);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

// App Main Router
export default function App() {
  const setOnline = useAppStore((state) => state.setOnline);
  const settings = useSettingsStore();
  const session = useAuthStore((state) => state.session);

  // Crash Modal States
  const [crashOpen, setCrashOpen] = useState(false);
  const [crashCode, setCrashCode] = useState(0);
  const [crashPath, setCrashPath] = useState('');
  const [crashSuspectedMod, setCrashSuspectedMod] = useState('');
  const [crashSuspectedFile, setCrashSuspectedFile] = useState('');
  const [crashDetails, setCrashDetails] = useState('');

  // Auto-Updater States
  const [updateStatus, setUpdateStatus] = useState<string>('idle');
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  // Listen for auto-updater events from main process
  useEffect(() => {
    let unsubscribeStatus: (() => void) | undefined;
    let unsubscribeProgress: (() => void) | undefined;

    if (window.electronAPI) {
      unsubscribeStatus = window.electronAPI.onUpdateStatus((status: string, details?: any) => {
        if (status === 'error') {
          // Only show error screen if we were previously downloading or found an update
          setUpdateStatus((prev) => {
            if (prev === 'downloading' || prev === 'available') {
              return 'error';
            }
            return 'idle';
          });
        } else if (status === 'not-available') {
          setUpdateStatus('idle');
        } else {
          setUpdateStatus(status);
        }
        if (details) setUpdateInfo(details);
      });
      unsubscribeProgress = window.electronAPI.onUpdateProgress((percent: number) => {
        setUpdateProgress(percent);
      });
    }

    return () => {
      if (unsubscribeStatus) unsubscribeStatus();
      if (unsubscribeProgress) unsubscribeProgress();
    };
  }, []);

  // Listen for live Minecraft stdout/stderr logs
  useEffect(() => {
    let unsubscribeLog: (() => void) | undefined;
    if (window.electronAPI) {
      const addGameLog = useAppStore.getState().addGameLog;
      unsubscribeLog = window.electronAPI.onGameLog((log: string) => {
        addGameLog(log);
      });
    }
    return () => {
      if (unsubscribeLog) unsubscribeLog();
    };
  }, []);

  // Periodically check API connectivity (30s)
  useEffect(() => {
    const check = async () => {
      const online = await checkConnectivity();
      setOnline(online);
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [setOnline]);

  // Load global settings on startup & initialize session
  useEffect(() => {
    settings.loadSettings();
    useAuthStore.getState().initializeSession();
  }, []);

  // Fetch and cache user profile statistics on login
  useEffect(() => {
    if (session?.name) {
      api.getUserProfile(session.name).then(profile => {
        if (profile) {
          localStorage.setItem('marinmc_total_play_time', (profile.totalPlayTime || 0).toString());
          localStorage.setItem('marinmc_last_login_time', profile.lastLogin || 'Bugün 20:15');
          localStorage.setItem('marinmc_play_sessions', JSON.stringify(profile.playSessions || []));
        }
      });
    }
  }, [session]);

  // Listen for game status to track play sessions and total duration
  useEffect(() => {
    let unsubscribeStatus: (() => void) | undefined;
    let startTime = 0;

    if (window.electronAPI) {
      unsubscribeStatus = window.electronAPI.onGameStatus((status) => {
        useAppStore.getState().setGameStatus(status);
        if (status === 'RUNNING') {
          startTime = Date.now();
        } else if (status === 'IDLE' || status === 'ERROR') {
          if (startTime > 0) {
            const endTime = Date.now();
            const durationMs = endTime - startTime;
            startTime = 0;

            const durationMin = Math.max(1, Math.round(durationMs / 60000)); // Minimum 1 minute
            
            // 1. Total Play Time (stored in minutes)
            const prevTotalStr = localStorage.getItem('marinmc_total_play_time') || '0';
            let prevTotal = parseInt(prevTotalStr, 10);
            if (prevTotal === 124) {
              prevTotal = 124 * 60;
            }
            const newTotal = prevTotal + durationMin;
            localStorage.setItem('marinmc_total_play_time', newTotal.toString());

            // 2. Play Sessions List
            const sessionsStr = localStorage.getItem('marinmc_play_sessions') || '[]';
            let sessions = [];
            try {
              sessions = JSON.parse(sessionsStr);
            } catch (e) {
              sessions = [];
            }

            const now = new Date();
            const dateStr = now.toLocaleDateString('tr-TR') + ' ' + now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            
            let durText = '';
            if (durationMin < 60) {
              durText = `${durationMin} dk`;
            } else {
              const hrs = Math.floor(durationMin / 60);
              const mins = durationMin % 60;
              durText = mins > 0 ? `${hrs} sa ${mins} dk` : `${hrs} sa`;
            }

            sessions.unshift({
              id: Math.random().toString(36).substr(2, 9),
              date: dateStr,
              duration: durText,
              server: 'MarinMC Towny'
            });

            sessions = sessions.slice(0, 20); // Keep last 20
            localStorage.setItem('marinmc_play_sessions', JSON.stringify(sessions));
            localStorage.setItem('marinmc_last_login_time', dateStr);

            // Sync with backend database
            const username = useAuthStore.getState().session?.name || 'Player';
            api.updateUserProfile(username, {
              totalPlayTime: newTotal,
              lastLogin: dateStr,
              playSessions: sessions
            });
          }
        }
      });
    }

    return () => {
      if (unsubscribeStatus) unsubscribeStatus();
    };
  }, []);

  // Listen for game-crash events from the Electron main process
  useEffect(() => {
    let unsubscribeCrash: (() => void) | undefined;
    if (window.electronAPI) {
      unsubscribeCrash = window.electronAPI.onGameCrash((data) => {
        setCrashCode(data.exitCode);
        setCrashPath(data.crashLogPath);
        setCrashSuspectedMod(data.suspectedMod || '');
        setCrashSuspectedFile(data.suspectedFilename || '');
        setCrashDetails(data.crashDetails || '');
        setCrashOpen(true);
      });
    }
    return () => {
      if (unsubscribeCrash) unsubscribeCrash();
    };
  }, []);

  const handleRelaunch = () => {
    if (window.electronAPI) {
      const settingsState = useSettingsStore.getState();
      const session = useAuthStore.getState().session;
      window.electronAPI.launchGame({
        ram: settingsState.ram,
        jvmArgs: settingsState.jvmArgs,
        username: session?.name || 'Player',
        accessToken: session?.token,
        uuid: session?.id,
        userType: session?.type,
        version: settingsState.selectedVersion,
        serverId: 'towny',
        gameDir: settingsState.launcherDir,
        javaPath: settingsState.javaPath,
        cosmetics: {
          skinType: (localStorage.getItem('marinmc_active_skin_type') as any) || 'username',
          capeUrl: localStorage.getItem('marinmc_active_cape_url') || ''
        }
      });
    }
  };

  return (
    <HashRouter>
      <div className="flex flex-col w-full h-screen overflow-hidden select-none bg-[#060305] relative text-[#d2d2d2]">
        <TitleBar />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            {/* Version triggers open HomePage with version modal active */}
            <Route
              path="/versions"
              element={
                <ProtectedRoute>
                  <VersionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cosmetics"
              element={
                <ProtectedRoute>
                  <CosmeticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gallery"
              element={
                <ProtectedRoute>
                  <GalleryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mods"
              element={
                <ProtectedRoute>
                  <ModManagerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/store"
              element={
                <ProtectedRoute>
                  <StorePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/console"
              element={
                <ProtectedRoute>
                  <ConsolePage />
                </ProtectedRoute>
              }
            />
            {/* Redirect to home by default */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Suspense>

        {/* Global Crash Modal Overlay */}
        <CrashModal
          isOpen={crashOpen}
          exitCode={crashCode}
          crashLogPath={crashPath}
          suspectedMod={crashSuspectedMod}
          suspectedFilename={crashSuspectedFile}
          crashDetails={crashDetails}
          onClose={() => setCrashOpen(false)}
          onRelaunch={handleRelaunch}
        />

        {/* Global Auto-Updater Overlay */}
        {(updateStatus === 'downloading' || updateStatus === 'downloaded' || updateStatus === 'available' || updateStatus === 'error') && (
          <div className="fixed inset-0 bg-[#060305]/95 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-8 select-none text-center">
            {/* Spinning/pulsing update icon */}
            <div className="w-16 h-16 rounded-2xl bg-[#2D7DD2]/10 border border-[#2D7DD2]/20 flex items-center justify-center mb-6 animate-pulse">
              <svg className="w-8 h-8 text-[#2D7DD2] animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>

            {updateStatus === 'error' ? (
              <div className="max-w-md space-y-4">
                <h2 className="text-sm font-black text-red-400 uppercase tracking-widest">
                  GÜNCELLEME HATASI
                </h2>
                <p className="text-[10px] text-[#A1A1AA] leading-relaxed">
                  Başlatıcı güncellenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.
                </p>
                <button
                  onClick={() => setUpdateStatus('idle')}
                  className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-white font-bold text-[9px] uppercase tracking-wider transition-all"
                >
                  Güncellemeyi Atla ve Devam Et
                </button>
              </div>
            ) : (
              <div className="max-w-md space-y-4 flex flex-col items-center">
                <h2 className="text-sm font-black text-white uppercase tracking-widest">
                  {updateStatus === 'downloaded' ? 'GÜNCELLEME HAZIR' : 'YENİ SÜRÜM İNDİRİLİYOR'}
                </h2>
                <p className="text-[10px] text-[#A1A1AA] leading-relaxed max-w-xs">
                  {updateStatus === 'downloaded' 
                    ? 'Yükleme başlatılıyor, lütfen bekleyin...' 
                    : `MarinMC Launcher için yeni bir sürüm (${updateInfo?.version || 'v1.0.2'}) indiriliyor. Lütfen kapatmayın.`}
                </p>

                {updateStatus !== 'downloaded' && (
                  <>
                    {/* Progress Bar */}
                    <div className="w-64 bg-white/[0.04] h-2 rounded-full overflow-hidden border border-white/[0.05] mt-2">
                      <div 
                        className="bg-gradient-to-r from-[#2D7DD2] to-[#208390] h-full rounded-full transition-all duration-300"
                        style={{ width: `${updateProgress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-white mt-1">
                      %{updateProgress.toFixed(0)}
                    </span>
                  </>
                )}
                
                <span className="text-[8px] text-[#52525B] font-bold uppercase tracking-wider block mt-4 animate-pulse">
                  İndirme bitince otomatik olarak yeniden başlatılacak
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </HashRouter>
  );
}
