import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore.ts';
import LoginPage from './pages/LoginPage.tsx';
import ServersPage from './pages/ServersPage.tsx';
import ServerDetailPage from './pages/ServerDetailPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import { Shield, Server, Settings, LogOut, Minus, Square, X } from 'lucide-react';
import { LAUNCHER_NAME } from './lib/constants.ts';

// Titlebar Component
const TitleBar = () => {
  const session = useAuthStore((state) => state.session);

  const handleMinimize = () => {
    if (window.electronAPI) window.electronAPI.minimize();
  };
// ...
  const handleMaximize = () => {
    if (window.electronAPI) window.electronAPI.maximize();
  };

  const handleClose = () => {
    if (window.electronAPI) window.electronAPI.close();
  };

  return (
    <div className="h-10 w-full drag-region bg-[#0B0D15] flex items-center justify-between px-4 border-b border-white/[0.03] select-none text-xs text-brand-textMuted font-medium z-50">
      {/* Brand */}
      <div className="flex items-center space-x-2">
        <Shield className="w-4 h-4 text-brand-accent animate-pulse" />
        <span className="font-semibold text-brand-text select-none">{LAUNCHER_NAME}</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-1 no-drag">
        {session && (
          <div className="flex items-center space-x-3 mr-4 border-r border-white/10 pr-4">
            <img src={session.avatar} alt={session.name} className="w-5 h-5 rounded-full border border-brand-accent/40" />
            <span className="text-[11px] text-brand-text font-semibold">{session.name}</span>
          </div>
        )}
        <button 
          onClick={handleMinimize}
          className="p-1 rounded hover:bg-white/10 text-brand-textMuted hover:text-brand-text transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={handleMaximize}
          className="p-1 rounded hover:bg-white/10 text-brand-textMuted hover:text-brand-text transition-colors"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={handleClose}
          className="p-1 rounded hover:bg-red-500/20 hover:text-red-400 text-brand-textMuted transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// Sidebar / Layout Wrapper
const MainLayout = ({ children }: { children: React.ReactNode }) => {
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

  return (
    <div className="flex h-[560px] w-full relative overflow-hidden bg-launcher-bg bg-cover bg-center">
      {/* Sidebar Navigation */}
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

          <Link
            to="/settings"
            className={`p-3 rounded-xl transition-all duration-300 relative group ${
              isActive('/settings')
                ? 'bg-brand-accent text-white shadow-glow-purple'
                : 'text-brand-textMuted hover:text-brand-text hover:bg-white/5'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="absolute left-24 bg-brand-card border border-white/5 text-brand-text text-[11px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl">
              Ayarlar
            </span>
          </Link>
        </div>

        {/* User control / Logout */}
        <button
          onClick={handleLogout}
          className="p-3 rounded-xl text-brand-textMuted hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 group relative"
        >
          <LogOut className="w-5 h-5" />
          <span className="absolute left-24 bg-brand-card border border-white/5 text-brand-text text-[11px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl">
            Çıkış Yap
          </span>
        </button>
      </div>

      {/* Main View Area */}
      <div className="flex-1 h-full overflow-hidden bg-gradient-to-b from-transparent to-[#0B0D15]/90 z-10 flex flex-col">
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
  return (
    <HashRouter>
      <div className="flex flex-col w-[960px] h-[600px] overflow-hidden select-none bg-brand-bg relative">
        <TitleBar />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/servers"
            element={
              <ProtectedRoute>
                <ServersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/server/:id"
            element={
              <ProtectedRoute>
                <ServerDetailPage />
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
          {/* Redirect to servers by default */}
          <Route path="*" element={<Navigate to="/servers" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
