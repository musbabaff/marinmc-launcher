import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../stores/appStore.ts';
import MarinLogo from './MarinLogo.tsx';
import {
  Home, User, Bell, MessageSquare, Layers,
  Globe, Image, ShoppingCart, Settings, Package, Terminal
} from 'lucide-react';

interface SidebarItem {
  icon: any;
  label: string;
  path: string;
  isPlaceholder?: boolean;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const setActivePage = useAppStore((state) => state.setActivePage);

  const group1: SidebarItem[] = [
    { icon: Home, label: 'Ana Sayfa', path: '/home' },
    { icon: User, label: 'Profil', path: '/profile' },
    { icon: Bell, label: 'Bildirimler', path: '/notifications' },
  ];

  const group2: SidebarItem[] = [
    { icon: MessageSquare, label: 'Relay Sohbet', path: '/chat' },
    { icon: Layers, label: 'Sürümler', path: '/versions' },
    { icon: Package, label: 'Mod Yöneticisi', path: '/mods' },
    { icon: Globe, label: 'Gardırop', path: '/cosmetics' },
    { icon: Image, label: 'Galeri', path: '/gallery' },
    { icon: Terminal, label: 'Konsol', path: '/console' },
  ];

  const handleNav = (item: SidebarItem) => {
    setActivePage(item.path);
    navigate(item.path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      <div className="w-[60px] h-[calc(100vh-40px)] bg-[#060305] border-r border-white/[0.04] flex flex-col items-center py-5 justify-between z-20 shrink-0 select-none">
        {/* Brand Logo "M" */}
        <div className="flex flex-col space-y-4 w-full items-center">
          <div className="w-9 h-9 flex items-center justify-center text-white mb-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/home')}>
            <MarinLogo glyphOnly size={24} />
          </div>

          {/* Divider 1 */}
          <div className="w-4 h-[1px] bg-white/[0.08]" />

          {/* Group 1 Navigation Items */}
          <div className="flex flex-col space-y-4 w-full items-center">
            {group1.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <div key={item.path} className="relative group w-full flex justify-center">
                  <button
                    onClick={() => handleNav(item)}
                    className={`p-2.5 rounded-xl transition-all duration-300 relative ${
                      active
                        ? 'text-white bg-[#2D7DD2]/20 border border-[#2D7DD2]/40 shadow-[0_0_15px_rgba(45,125,210,0.3)]'
                        : 'text-[#52525B] hover:text-[#d2d2d2] hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </button>

                  {/* Tooltip */}
                  <div className="absolute left-[65px] top-1/2 -translate-y-1/2 bg-[#060305] border border-[#2A2A2A] text-[#d2d2d2] text-[10px] font-bold px-2.5 py-1.5 rounded-md opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Divider 2 */}
          <div className="w-4 h-[1px] bg-white/[0.08]" />

          {/* Group 2 Navigation Items */}
          <div className="flex flex-col space-y-4 w-full items-center">
            {group2.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <div key={item.path} className="relative group w-full flex justify-center">
                  <button
                    onClick={() => handleNav(item)}
                    className={`p-2.5 rounded-xl transition-all duration-300 relative ${
                      active
                        ? 'text-white bg-[#2D7DD2]/20 border border-[#2D7DD2]/40 shadow-[0_0_15px_rgba(45,125,210,0.3)]'
                        : 'text-[#52525B] hover:text-[#d2d2d2] hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </button>

                  {/* Tooltip */}
                  <div className="absolute left-[65px] top-1/2 -translate-y-1/2 bg-[#060305] border border-[#2A2A2A] text-[#d2d2d2] text-[10px] font-bold px-2.5 py-1.5 rounded-md opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Icons (Shop and Settings) */}
        <div className="flex flex-col space-y-4 w-full items-center">
          {/* Market / Shop */}
          <div className="relative group w-full flex justify-center">
            <button
              onClick={() => {
                setActivePage('/store');
                navigate('/store');
              }}
              className={`p-2.5 rounded-xl transition-all duration-300 relative ${
                isActive('/store')
                  ? 'text-white bg-[#2D7DD2]/20 border border-[#2D7DD2]/40 shadow-[0_0_15px_rgba(45,125,210,0.3)]'
                  : 'text-[#52525B] hover:text-[#d2d2d2] hover:bg-white/5'
              }`}
            >
              <ShoppingCart className="w-4.5 h-4.5" />
            </button>
            <div className="absolute left-[65px] top-1/2 -translate-y-1/2 bg-[#060305] border border-[#2A2A2A] text-[#d2d2d2] text-[10px] font-bold px-2.5 py-1.5 rounded-md opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
              Market
            </div>
          </div>

          {/* Settings */}
          <div className="relative group w-full flex justify-center">
            <button
              onClick={() => {
                setActivePage('/settings');
                navigate('/settings');
              }}
              className={`p-2.5 rounded-xl transition-all duration-300 ${
                isActive('/settings')
                  ? 'text-white bg-[#2D7DD2]/20 border border-[#2D7DD2]/40 shadow-[0_0_15px_rgba(45,125,210,0.3)]'
                  : 'text-[#52525B] hover:text-[#d2d2d2] hover:bg-white/5'
              }`}
            >
              <Settings className="w-4.5 h-4.5" />
            </button>
            <div className="absolute left-[65px] top-1/2 -translate-y-1/2 bg-[#060305] border border-[#2A2A2A] text-[#d2d2d2] text-[10px] font-bold px-2.5 py-1.5 rounded-md opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
              Ayarlar
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
