import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../stores/appStore.ts';
import {
  Home, User, Bell, MessageSquare, Layers,
  Globe, Image, ShoppingCart, Settings, X, ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [marketModalOpen, setMarketModalOpen] = useState(false);

  const group1: SidebarItem[] = [
    { icon: Home, label: 'Ana Sayfa', path: '/home' },
    { icon: User, label: 'Profil', path: '/profile' },
    { icon: Bell, label: 'Bildirimler', path: '/notifications' },
  ];

  const group2: SidebarItem[] = [
    { icon: MessageSquare, label: 'Relay Sohbet', path: '/chat' },
    { icon: Layers, label: 'Sürümler', path: '/versions' },
    { icon: Globe, label: 'Gardırop', path: '/cosmetics' },
    { icon: Image, label: 'Galeri', path: '/gallery' },
  ];

  const handleNav = (item: SidebarItem) => {
    if (item.isPlaceholder) {
      setMarketModalOpen(true);
      return;
    }
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
            {/* Custom Stylized MarinMC M Logo */}
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
              <path d="M2 20V4h3.5l4.5 8 4.5-8H18v16h-3V9l-3.5 6h-3L5 9v11H2z" />
            </svg>
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
              onClick={() => handleNav({ icon: ShoppingCart, label: 'Market', path: '/store', isPlaceholder: true })}
              className="p-2.5 rounded-xl transition-all duration-300 text-[#52525B] hover:text-[#d2d2d2] hover:bg-white/5 relative"
            >
              <ShoppingCart className="w-4.5 h-4.5" />
              {/* Red Notification Badge */}
              <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-[#ef4444] rounded-full border border-[#060305] text-[7.5px] font-black text-white flex items-center justify-center">
                0
              </span>
            </button>
            <div className="absolute left-[65px] top-1/2 -translate-y-1/2 bg-[#060305] border border-[#2A2A2A] text-[#d2d2d2] text-[10px] font-bold px-2.5 py-1.5 rounded-md opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
              Market <span className="ml-1 text-[8px] text-[#2D7DD2] font-black uppercase">Yakında</span>
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

      {/* ===== Market Coming Soon Modal ===== */}
      <AnimatePresence>
        {marketModalOpen && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center"
            onClick={() => setMarketModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-[#0A0A0A] border border-white/[0.08] w-[360px] rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header gradient */}
              <div className="h-24 bg-gradient-to-br from-[#2D7DD2]/20 via-[#0A0A0A] to-[#2D7DD2]/5 flex items-center justify-center relative">
                <div className="w-14 h-14 rounded-2xl bg-[#2D7DD2]/10 border border-[#2D7DD2]/20 flex items-center justify-center">
                  <ShoppingBag className="w-7 h-7 text-[#2D7DD2]" />
                </div>
                <button
                  onClick={() => setMarketModalOpen(false)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 text-[#52525B] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 pb-6 pt-3 text-center">
                <h2 className="text-sm font-black text-white uppercase tracking-wider mb-1.5">
                  MarinMC Market
                </h2>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed mb-1">
                  Skin, cape ve daha fazlası için market yakında hizmetinizde!
                </p>
                <div className="flex items-center justify-center gap-1.5 mb-5">
                  <span className="text-[8px] bg-[#2D7DD2]/10 text-[#2D7DD2] border border-[#2D7DD2]/20 px-2 py-0.5 rounded-full font-bold uppercase">Yakında</span>
                </div>

                <button
                  onClick={() => setMarketModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-[#2D7DD2] hover:bg-[#4A9AE8] text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-[0_5px_15px_rgba(45,125,210,0.25)] hover:scale-[1.02]"
                >
                  Tamam
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
