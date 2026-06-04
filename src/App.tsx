import { useState, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from './stores/authStore.ts';
import TitleBar from './components/TitleBar.tsx';
import SettingsPanel from './components/SettingsPanel.tsx';
import { Server, Settings, LogOut } from 'lucide-react';

// Lazy-loaded pages for performance
const LoginPage = lazy(() => import('./pages/LoginPage.tsx'));
const ServersPage = lazy(() => import('./pages/ServersPage.tsx'));
const ServerDetailPage = lazy(() => import('./pages/ServerDetailPage.tsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.tsx'));
const ModManagerPage = lazy(() => import('./pages/ModManagerPage.tsx'));

// Loading fallback
const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center bg-brand-bg">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
      <span className="text-[10px] text-brand-textMuted font-semibold uppercase tracking-wider">Yükleniyor...</span>
    </div>
  </div>
);

// Sidebar / Layout Wrapper
const MainLayout = ({ children, onOpenSettings }: { children: React.ReactNode; onOpenSettings: () => void }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isFullScreenPage = location.pathname === '/servers' || location.pathname.startsWith('/server') || location.pathname.startsWith('/mods');

  return (
    <div className="flex h-[560px] w-full relative overflow-hidden bg-launcher-bg bg-cover bg-center">
      {/* Sidebar Navigation - Hidden on Fullscreen Pages */}
      {!isFullScreenPage && (
        <div className="w-20 bg-[#0B0D15]/80 border-r border-white/[0.03] flex flex-col items-center justify-between py-6 z-20">
          <div className="flex flex-col space-y-6">
            <Link
              to="/servers"
              className={`p-3 rounded-xl transition-all duration-300 relative group ${
                isActive('/servers')
                  ? 'bg-brand-accent text-white shadow-glow-purple'
                  : 'text-brand-textMuted hover:text-brand-text hover:bg-white/5'
              }`}
            >
              <Server className="w-5 h-5" />
              <span className="absolute left-24 bg-brand-card border border-white/5 text-brand-text text-[11px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl">
                Sunucular
              </span>
            </Link>

            <button
              onClick={onOpenSettings}
              className="p-3 rounded-xl transition-all duration-300 relative group text-brand-textMuted hover:text-brand-text hover:bg-white/5"
            >
              <Settings className="w-5 h-5" />
              <span className="absolute left-24 bg-brand-card border border-white/5 text-brand-text text-[11px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl">
                {t('servers.settingsTooltip')}
              </span>
            </button>
          </div>

          {/* User control / Logout */}
          <button
            onClick={handleLogout}
            className="p-3 rounded-xl text-brand-textMuted hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 group relative"
          >
            <LogOut className="w-5 h-5" />
            <span className="absolute left-24 bg-brand-card border border-white/5 text-brand-text text-[11px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl">
              {t('servers.logout')}
            </span>
          </button>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 h-full overflow-hidden bg-gradient-to-b from-transparent to-[#0B0D15]/90 z-10 flex flex-col">
        {children}
      </div>
    </div>
  );
};

// Route Guard logic
const ProtectedRoute = ({ children, onOpenSettings }: { children: React.ReactNode; onOpenSettings: () => void }) => {
  const session = useAuthStore((state) => state.session);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout onOpenSettings={onOpenSettings}>{children}</MainLayout>;
};

// App Main Router
export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <HashRouter>
      <div className="flex flex-col w-[960px] h-[600px] overflow-hidden select-none bg-brand-bg relative">
        <TitleBar />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/servers"
              element={
                <ProtectedRoute onOpenSettings={() => setSettingsOpen(true)}>
                  <ServersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/server/:id"
              element={
                <ProtectedRoute onOpenSettings={() => setSettingsOpen(true)}>
                  <ServerDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mods/:serverId?"
              element={
                <ProtectedRoute onOpenSettings={() => setSettingsOpen(true)}>
                  <ModManagerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute onOpenSettings={() => setSettingsOpen(true)}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            {/* Redirect to servers by default */}
            <Route path="*" element={<Navigate to="/servers" replace />} />
          </Routes>
        </Suspense>

        {/* Global Settings Drawer */}
        <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </HashRouter>
  );
}
