import { useState } from 'react';
import { Bell, Info, ShieldAlert, CheckCircle2, Trash2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'urgent' | 'info' | 'success';
  date: string;
  unread: boolean;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'Planlı Sunucu Bakımı', description: 'MarinMC Towny sunucusu 5 dakika içinde yedekleme ve bakım için yeniden başlatılacaktır.', type: 'urgent', date: 'Az önce', unread: true },
  { id: '2', title: 'Arkadaşlık İsteği', description: 'RedstoneGuy size bir arkadaşlık isteği gönderdi.', type: 'info', date: '10 dakika önce', unread: true },
  { id: '3', title: 'Yeni Sürüm Güncellemesi', description: 'MarinMC Client v1.0.1 güncellemesi indirilmeye hazır. Değişiklik listesini görmek için tıklayın.', type: 'info', date: '2 saat önce', unread: false },
  { id: '4', title: 'Mod Güncellemesi Mevcut', description: 'Sodium modu için yeni bir v0.6.1 sürümü yayınlandı. Ayarlar penceresinden güncelleyebilirsiniz.', type: 'info', date: '1 gün önce', unread: false },
  { id: '5', title: 'Ödeme Başarılı', description: 'VIP üyelik siparişiniz başarıyla işlendi. Sunucuya giriş yaptığınızda aktif edilecektir.', type: 'success', date: '3 gün önce', unread: false }
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getUnreadCount = () => {
    return notifications.filter(n => n.unread).length;
  };

  return (
    <div className="flex-grow flex flex-col p-6 overflow-y-auto no-drag custom-scrollbar space-y-5 select-none bg-[#060305] text-[#d2d2d2] h-full w-full">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/[0.04] pb-4">
        <div>
          <h2 className="text-sm font-extrabold text-white uppercase tracking-widest">Bildirim Merkezi</h2>
          <p className="text-[10px] text-[#52525B] font-bold mt-1.5 flex items-center gap-1.5">
            <span>Toplam <strong className="text-white/80">{notifications.length} bildirim</strong></span>
            <span className="text-white/10">•</span>
            <span className="text-[#8B5CF6]">{getUnreadCount()} okunmamış</span>
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 hover:border-[#8B5CF6]/50 rounded-xl text-[10px] text-white font-extrabold uppercase transition-all duration-200 hover:shadow-[0_0_12px_rgba(139,92,246,0.2)]"
          >
            Tümünü Okundu İşaretle
          </button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-[#52525B] py-16">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
            <Bell className="w-6 h-6 text-white/30" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-white/50 mb-1">Yeni Bildirim Yok</span>
          <span className="text-[9px] text-[#52525B] max-w-[280px] text-center leading-relaxed">Tüm gelişmeleri takip ettiniz. Yeni bir bildirim geldiğinde burada görünecektir.</span>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {notifications.map((not, idx) => {
              // Left border colors and glowing colors
              const borderStyles = {
                urgent: 'border-l-[3px] border-l-[#EF4444] hover:shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:border-[#EF4444]/30',
                info: 'border-l-[3px] border-l-[#06B6D4] hover:shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:border-[#06B6D4]/30',
                success: 'border-l-[3px] border-l-[#10B981] hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:border-[#10B981]/30'
              };

              const Icon = not.type === 'urgent' ? ShieldAlert : not.type === 'success' ? CheckCircle2 : Info;

              return (
                <motion.div
                  key={not.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-[#0a0a0a] border border-white/[0.04] rounded-2xl p-4 flex items-start gap-4 transition-all duration-300 relative ${
                    borderStyles[not.type]
                  } ${not.unread ? 'bg-[#120e1e]/40 border-[#8B5CF6]/20' : 'hover:bg-white/[0.01]'}`}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    not.type === 'urgent' ? 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20' : not.type === 'success' ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20' : 'bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className="text-[11px] font-extrabold text-white leading-none tracking-wide">{not.title}</h4>
                      {not.unread && (
                        <span className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full shrink-0 shadow-[0_0_8px_#8B5CF6]" />
                      )}
                    </div>
                    <p className="text-[10px] text-[#A1A1AA] leading-relaxed mb-2.5 font-medium">{not.description}</p>
                    <div className="flex items-center gap-1.5 text-[8px] text-[#52525B] font-extrabold font-mono uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{not.date}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleDelete(not.id)}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-[#52525B] hover:text-[#EF4444] hover:bg-red-500/10 transition-all duration-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
