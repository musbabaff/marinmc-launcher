import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore.ts';
import { Minus, Square, X } from 'lucide-react';
import { api } from '../lib/api.ts';
import MarinLogo from './MarinLogo.tsx';

export default function TitleBar() {
  const isOnline = useAppStore((state) => state.isOnline);
  const [onlineCount, setOnlineCount] = useState(9671);

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
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI) window.electronAPI.minimize();
  };


  const handleClose = () => {
    if (window.electronAPI) window.electronAPI.close();
  };

  return (
    <div className="h-[40px] w-full drag-region bg-[#060305] flex items-center justify-between px-6 select-none text-[11px] text-[#A1A1AA] font-semibold z-50 shrink-0">
      {/* Brand */}
      <div className="flex items-center space-x-3 text-[10px] tracking-wide font-normal">
        <MarinLogo glyphOnly size={14} className="text-white" />
        <span className="text-white hover:text-white/80 transition-colors">MarinMC Client</span>
        <span className="text-[#333]">Build 0.9.2</span>
        <div className="flex items-center space-x-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#259457]' : 'bg-[#EF4444]'}`} />
          <span className={`${isOnline ? 'text-[#259457]' : 'text-[#EF4444]'} font-bold`}>
            {isOnline ? `${onlineCount} Online` : 'Offline'}
          </span>
        </div>
      </div>

      {/* Window Controls */}
      <div className="flex items-center space-x-1 no-drag">
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-white/5 text-[#d2d2d2] transition-all duration-150"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Maximize */}
        <button
          className="w-8 h-7 flex items-center justify-center rounded text-[#52525B]/20 cursor-not-allowed"
          title="Maximize (Disabled)"
          disabled
        >
          <Square className="w-3.5 h-3.5" />
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-[#EF4444] text-[#d2d2d2] hover:text-white transition-all duration-150"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
