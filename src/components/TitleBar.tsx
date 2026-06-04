import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore.ts';
import { Shield, Minus, Square, X } from 'lucide-react';
import { APP_VERSION } from '../lib/constants.ts';
import { api } from '../lib/api.ts';

export default function TitleBar() {
  const session = useAuthStore((state) => state.session);
  const [onlineCount, setOnlineCount] = useState(1248);

  useEffect(() => {
    api.getOnlineCount().then((res) => {
      if (res && res.total) {
        setOnlineCount(res.total);
      }
    });
    const interval = setInterval(() => {
      api.getOnlineCount().then((res) => {
        if (res && res.total) {
          setOnlineCount(res.total);
        }
      });
    }, 45000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="h-[40px] w-full drag-region bg-[#0A0A0A] flex items-center justify-between px-4 border-b border-[#1E1E1E] select-none text-xs text-[#A1A1AA] font-medium z-50 shrink-0">
      {/* Brand */}
      <div className="flex items-center space-x-2">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] flex items-center justify-center shadow-lg shadow-[#8B5CF6]/20">
          <Shield className="w-3 h-3 text-white" />
        </div>
        <span className="font-extrabold text-white select-none tracking-wider text-[11px] uppercase">MarinMC Client</span>
        <span className="text-[#52525B]">|</span>
        <span className="text-[9px] font-bold text-[#A1A1AA] bg-[#1A1A1A] px-1.5 py-0.5 rounded border border-[#2A2A2A] uppercase">
          Build {APP_VERSION}
        </span>
      </div>

      {/* Right side: user info + online count + window controls */}
      <div className="flex items-center space-x-4 no-drag">
        {/* Live Online Count */}
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] absolute" />
          <span className="text-[10px] font-extrabold text-[#A1A1AA] uppercase tracking-wider">{onlineCount} Online</span>
        </div>

        {session && (
          <div className="flex items-center space-x-2 mr-1 border-r border-[#1E1E1E] pr-3 h-5">
            <img
              src={session.avatar}
              alt={session.name}
              className="w-4 h-4 rounded-full border border-[#8B5CF6]/30"
            />
            <span className="text-[10px] text-[#A1A1AA] font-bold">
              {session.name}
            </span>
          </div>
        )}

        <div className="flex items-center">
          {/* Minimize */}
          <button
            onClick={handleMinimize}
            className="w-8 h-7 flex items-center justify-center rounded hover:bg-[#1A1A1A] text-[#52525B] hover:text-white transition-all duration-150"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Maximize (disabled since resizable: false) */}
          <button
            onClick={handleMaximize}
            className="w-8 h-7 flex items-center justify-center rounded text-[#52525B]/20 cursor-not-allowed"
            title="Maximize (disabled)"
            disabled
          >
            <Square className="w-3 h-3" />
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="w-8 h-7 flex items-center justify-center rounded hover:bg-[#EF4444] text-[#52525B] hover:text-white transition-all duration-150"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
