import { useAuthStore } from '../stores/authStore.ts';
import { Shield, Minus, Square, X } from 'lucide-react';
import { LAUNCHER_NAME, APP_VERSION } from '../lib/constants.ts';

export default function TitleBar() {
  const session = useAuthStore((state) => state.session);

  const handleMinimize = () => {
    if (window.electronAPI) window.electronAPI.minimize();
  };

  const handleMaximize = () => {
    if (window.electronAPI) window.electronAPI.maximize();
  };

  const handleClose = () => {
    if (window.electronAPI) window.electronAPI.close();
  };

  return (
    <div className="h-10 w-full drag-region bg-[#0B0D15] flex items-center justify-between px-4 border-b border-white/[0.03] select-none text-xs text-brand-textMuted font-medium z-50 shrink-0">
      {/* Brand */}
      <div className="flex items-center space-x-2.5">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Shield className="w-3 h-3 text-white" />
        </div>
        <span className="font-bold text-brand-text select-none tracking-tight text-[12px]">{LAUNCHER_NAME}</span>
        <span className="text-[9px] font-semibold text-brand-textMuted/50 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.04]">
          v{APP_VERSION}
        </span>
      </div>

      {/* Right side: user info + window controls */}
      <div className="flex items-center space-x-1 no-drag">
        {session && (
          <div className="flex items-center space-x-2.5 mr-3 border-r border-white/[0.06] pr-3">
            <img
              src={session.avatar}
              alt={session.name}
              className="w-5 h-5 rounded-full border border-brand-accent/30"
            />
            <span className="text-[11px] text-brand-text/80 font-semibold max-w-[100px] truncate">
              {session.name}
            </span>
          </div>
        )}

        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="w-8 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.07] text-brand-textMuted hover:text-brand-text transition-all duration-150"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Maximize (disabled since resizable: false) */}
        <button
          onClick={handleMaximize}
          className="w-8 h-7 flex items-center justify-center rounded-md text-brand-textMuted/30 cursor-not-allowed"
          title="Maximize (disabled)"
          disabled
        >
          <Square className="w-3 h-3" />
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="w-8 h-7 flex items-center justify-center rounded-md hover:bg-red-500/20 text-brand-textMuted hover:text-red-400 transition-all duration-150"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
