import { useNotificationStore } from '../stores/notificationStore.ts';
import { Bell, Info, ShieldAlert, CheckCircle2, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore.ts';

interface InboxPopoverProps {
  onClose: () => void;
}

export default function InboxPopover({ onClose }: InboxPopoverProps) {
  const { notifications, markAllAsRead, markAsRead } = useNotificationStore();
  const navigate = useNavigate();
  const setActivePage = useAppStore((state) => state.setActivePage);

  const unreadCount = notifications.filter(n => n.unread).length;
  const recentNotifications = notifications.slice(0, 4);

  const handleViewAll = () => {
    setActivePage('/notifications');
    navigate('/notifications');
    onClose();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <ShieldAlert className="w-3.5 h-3.5 text-[#EF4444]" />;
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />;
      default:
        return <Info className="w-3.5 h-3.5 text-[#2D7DD2]" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'bg-[#EF4444]/10 border border-[#EF4444]/20';
      case 'success':
        return 'bg-[#10B981]/10 border border-[#10B981]/20';
      default:
        return 'bg-[#2D7DD2]/10 border border-[#2D7DD2]/20';
    }
  };

  return (
    <div className="absolute right-0 top-[32px] w-[300px] bg-[#070b19] border border-white/[0.08] rounded-xl shadow-2xl p-3 z-50 text-[10px] select-none font-bold animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-white/[0.05] mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-white text-[11px] font-black uppercase tracking-wider">Gelen Kutusu</span>
          {unreadCount > 0 && (
            <span className="bg-[#2D7DD2]/20 text-[#2D7DD2] border border-[#2D7DD2]/30 px-1.5 py-0.2 rounded text-[7.5px] uppercase">
              {unreadCount} Yeni
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="text-[#52525B] hover:text-white transition-colors p-1"
            title="Tümünü Okundu İşaretle"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-0.5">
        {recentNotifications.length === 0 ? (
          <div className="py-6 text-center text-[#52525B]">
            <Bell className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
            <p className="text-[8px] uppercase tracking-wider font-black">Yeni bildirim bulunmuyor</p>
          </div>
        ) : (
          recentNotifications.map((not) => (
            <div 
              key={not.id}
              onClick={() => markAsRead(not.id)}
              className={`p-2 rounded-lg flex items-start gap-2.5 cursor-pointer transition-all border ${
                not.unread 
                  ? 'bg-[#0a0f1d]/40 border-[#2D7DD2]/20 hover:bg-[#0a0f1d]/60' 
                  : 'bg-white/[0.01] border-transparent hover:bg-white/5'
              }`}
            >
              {/* Icon Container */}
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${getIconBg(not.type)}`}>
                {getIcon(not.type)}
              </div>

              {/* Title & Desc */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline gap-1">
                  <span className="text-white truncate font-extrabold text-[9px] leading-tight">{not.title}</span>
                  {not.unread && (
                    <span className="w-1.5 h-1.5 bg-[#2D7DD2] rounded-full shrink-0 shadow-[0_0_6px_#2D7DD2]" />
                  )}
                </div>
                <p className="text-[#A1A1AA] text-[8px] font-medium leading-relaxed truncate mt-0.5">{not.description}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-2 border-t border-white/[0.05] pt-2">
        <button 
          onClick={handleViewAll}
          className="w-full py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-bold text-[8px] uppercase tracking-wider transition-all text-center block"
        >
          Tümünü Gör
        </button>
      </div>
    </div>
  );
}
