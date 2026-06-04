import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../stores/appStore.ts';
import {
  Home, User, Bell, MessageSquare, Layers,
  Globe, Image, ShoppingCart, Settings
} from 'lucide-react';
import { motion } from 'framer-motion';

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

  const items: SidebarItem[] = [
    { icon: Home, label: 'Ana Sayfa', path: '/home' },
    { icon: User, label: 'Profil', path: '/profile' },
    { icon: Bell, label: 'Bildirimler', path: '/notifications' },
    { icon: MessageSquare, label: 'Relay Sohbet', path: '/chat' },
    { icon: Layers, label: 'Sürümler', path: '/versions' },
    { icon: Globe, label: 'Gardırop', path: '/cosmetics' },
    { icon: Image, label: 'Galeri', path: '/gallery' },
    { icon: ShoppingCart, label: 'Market', path: '/store', isPlaceholder: true },
  ];

  const handleNav = (item: SidebarItem) => {
    if (item.isPlaceholder) {
      alert('Market yakında eklenecektir!');
      return;
    }
    setActivePage(item.path);
    navigate(item.path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="w-[60px] h-[calc(100vh-40px)] bg-[#0D0D0D] border-r border-[#1E1E1E] flex flex-col items-center py-4 justify-between z-20">
      <div className="flex flex-col space-y-3 w-full items-center">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <div key={item.path} className="relative group w-full flex justify-center">
              <button
                onClick={() => handleNav(item)}
                className={`p-2.5 rounded-lg transition-all duration-200 relative ${
                  active
                    ? 'text-[#8B5CF6] bg-[#8B5CF6]/10'
                    : 'text-[#52525B] hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                <Icon className="w-5 h-5" />
                {active && (
                  <motion.div
                    layoutId="sidebarActive"
                    className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-[#8B5CF6] rounded-r"
                  />
                )}
              </button>

              {/* Tooltip */}
              <div className="absolute left-[65px] top-1/2 -translate-y-1/2 bg-[#141414] border border-[#2A2A2A] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-md opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                {item.label}
                {item.isPlaceholder && <span className="ml-1.5 text-[8px] text-[#06B6D4] uppercase font-extrabold">Yakında</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Settings Bottom */}
      <div className="relative group w-full flex justify-center">
        <button
          onClick={() => {
            setActivePage('/settings');
            navigate('/settings');
          }}
          className={`p-2.5 rounded-lg transition-all duration-200 ${
            isActive('/settings')
              ? 'text-[#8B5CF6] bg-[#8B5CF6]/10'
              : 'text-[#52525B] hover:text-white hover:bg-[#1A1A1A]'
          }`}
        >
          <Settings className="w-5 h-5" />
        </button>
        <div className="absolute left-[65px] top-1/2 -translate-y-1/2 bg-[#141414] border border-[#2A2A2A] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-md opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
          Ayarlar
        </div>
      </div>
    </div>
  );
}
