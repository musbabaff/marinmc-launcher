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
    <div className="flex-grow flex flex-col p-6 overflow-y-auto no-drag custom-scrollbar space-y-4 select-none bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#1E1E1E] pb-4">
        <div>
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">Bildirim Merkezi</h2>
          <p className="text-[10px] text-[#A1A1AA] font-bold mt-1">
            Toplam <strong className="text-white/85">{notifications.length} bildirim</strong> · <strong className="text-[#8B5CF6]">{getUnreadCount()} okunmamış</strong>
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-3.5 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-[#2A2A2A] rounded-xl text-[10px] text-white font-extrabold uppercase transition-all"
          >
            Tümünü Okundu İşaretle
          </button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-[#52525B] py-16">
          <Bell className="w-12 h-12 mb-2" />
          <span className="text-xs font-bold uppercase tracking-wider">Yeni Bildirim Yok</span>
          <span className="text-[10px]">Tüm gelişmeleri takip ettiniz. Yeni bir bildirim geldiğinde burada görünecektir.</span>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {notifications.map((not) => {
              // Left border colors
              const borderStyles = {
                urgent: 'border-l-[3px] border-l-[#EF4444]',
                info: 'border-l-[3px] border-l-[#06B6D4]',
                success: 'border-l-[3px] border-l-[#10B981]'
              };

              const Icon = not.type === 'urgent' ? ShieldAlert : not.type === 'success' ? CheckCircle2 : Info;

              return (
                <motion.div
                  key={not.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={`bg-[#111111] border border-[#1E1E1E] rounded-xl p-4 flex items-start gap-4 transition-all relative ${
                    borderStyles[not.type]
                  } ${not.unread ? 'bg-[#16141F]/40 border-[#8B5CF6]/10' : ''}`}
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    not.type === 'urgent' ? 'bg-[#EF4444]/15 text-[#EF4444]' : not.type === 'success' ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-[#06B6D4]/15 text-[#06B6D4]'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-xs font-bold text-white leading-none">{not.title}</h4>
                      {not.unread && (
                        <span className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-[#A1A1AA] leading-relaxed mb-2 font-medium">{not.description}</p>
                    <div className="flex items-center gap-1 text-[8px] text-[#52525B] font-bold font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{not.date}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleDelete(not.id)}
                    className="absolute top-4 right-4 p-1 rounded-lg text-[#52525B] hover:text-[#EF4444] hover:bg-red-500/10 transition-all"
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
