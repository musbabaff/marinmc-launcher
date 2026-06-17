import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '../stores/notificationStore.ts';
import { 
  Info, ShieldAlert, CheckCircle2, Trash2, 
  Calendar, Check, Eye, Trash, BellOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type FilterType = 'all' | 'urgent' | 'info' | 'success';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { notifications, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotificationStore();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const getUnreadCount = () => {
    return notifications.filter(n => n.unread).length;
  };

  const getLocalizedTitle = (not: any) => {
    if (not.title === 'Planlı Sunucu Bakımı' || not.title === 'Scheduled Server Maintenance') return t('notifications.titleUrgent');
    if (not.title === 'Arkadaşlık İsteği' || not.title === 'Friend Request') return t('notifications.titleFriendRequest');
    if (not.title === 'Yeni Sürüm Güncellemesi' || not.title === 'New Client Version') return t('notifications.titleUpdate');
    if (not.title === 'Mod Güncellemesi Mevcut' || not.title === 'Mod Update Available') return t('notifications.titleModUpdate');
    if (not.title === 'Ödeme Başarılı' || not.title === 'Payment Successful') return t('notifications.titleSuccessVIP');
    return not.title;
  };

  const getLocalizedDesc = (not: any) => {
    if (not.description.includes('Towny')) return t('notifications.descUrgent');
    if (not.description.includes('RedstoneGuy')) return t('notifications.descFriendRequest');
    if (not.description.includes('v1.0.1')) return t('notifications.descUpdate');
    if (not.description.includes('Sodium')) return t('notifications.descModUpdate');
    if (not.description.includes('VIP')) return t('notifications.descSuccessVIP');
    return not.description;
  };

  const getLocalizedDate = (date: string) => {
    const lower = date.toLowerCase();
    if (lower === 'az önce' || lower === 'just now' || lower === 'şimdi' || lower === 'now') {
      return t('notifications.dateJustNow');
    }
    if (lower.includes('dakika') || lower.includes('minute') || lower.includes('min')) {
      const match = date.match(/\d+/);
      const count = match ? match[0] : '10';
      return t('notifications.dateMinsAgo', { count });
    }
    if (lower.includes('saat') || lower.includes('hour')) {
      const match = date.match(/\d+/);
      const count = match ? match[0] : '2';
      return t('notifications.dateHoursAgo', { count });
    }
    if (lower.includes('gün') || lower.includes('day')) {
      const match = date.match(/\d+/);
      const count = match ? match[0] : '3';
      return t('notifications.dateDaysAgo', { count });
    }
    return date;
  };

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(not => {
    if (activeFilter === 'all') return true;
    return not.type === activeFilter;
  });

  return (
    <div className="flex-grow flex flex-col p-8 overflow-y-auto no-drag custom-scrollbar space-y-6 select-none bg-[#070408]/95 text-[#e0e0e0] h-full w-full relative">
      {/* Background Glow Effect */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/4 w-[300px] h-[300px] bg-pink-600/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-purple-400 tracking-wider uppercase">
              {t('notifications.title')}
            </h2>
            {getUnreadCount() > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-purple-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.5)] animate-pulse">
                {getUnreadCount()} {t('notifications.unread').toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#71717A] mt-2 flex items-center gap-2 font-medium">
            <span>{t('notifications.total')}: <strong className="text-white/80">{notifications.length}</strong></span>
            <span className="text-white/10">•</span>
            <span className="text-purple-400">{getUnreadCount()} {t('notifications.unread')}</span>
          </p>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-white/[0.03] hover:bg-purple-600/10 border border-white/[0.05] hover:border-purple-500/30 rounded-xl text-[10px] text-white font-extrabold uppercase transition-all duration-300 flex items-center gap-2 hover:shadow-[0_0_15px_rgba(139,92,246,0.15)] group"
            >
              <Eye className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
              {t('notifications.markAllRead')}
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-red-950/10 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/30 rounded-xl text-[10px] text-red-400 hover:text-red-300 font-extrabold uppercase transition-all duration-300 flex items-center gap-2 hover:shadow-[0_0_15px_rgba(239,68,68,0.1)] group"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500 group-hover:scale-110 transition-transform" />
              {t('profileSettings.cancel') || 'TEMİZLE'}
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      {notifications.length > 0 && (
        <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.03] p-1 rounded-xl w-fit">
          {(['all', 'urgent', 'info', 'success'] as const).map((filter) => {
            const labels: Record<FilterType, string> = {
              all: t('store.categories.all') || 'Tümü',
              urgent: t('profileSettings.tabExport') || 'Kritik',
              info: 'Bilgi',
              success: 'Başarılı'
            };
            const counts = {
              all: notifications.length,
              urgent: notifications.filter(n => n.type === 'urgent').length,
              info: notifications.filter(n => n.type === 'info').length,
              success: notifications.filter(n => n.type === 'success').length
            };

            const colors = {
              all: 'hover:text-purple-400',
              urgent: 'hover:text-[#EF4444]',
              info: 'hover:text-[#06B6D4]',
              success: 'hover:text-[#10B981]'
            };

            const activeColors = {
              all: 'bg-purple-600/15 text-purple-400 border border-purple-500/20 shadow-[0_0_10px_rgba(139,92,246,0.1)]',
              urgent: 'bg-red-500/15 text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
              info: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]',
              success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
            };

            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`relative px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 border border-transparent ${
                  activeFilter === filter 
                    ? activeColors[filter] 
                    : `text-[#71717A] ${colors[filter]}`
                }`}
              >
                <span>{labels[filter]}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-md bg-white/5 font-mono ${
                  activeFilter === filter ? 'bg-white/10 text-current' : 'text-[#71717A]'
                }`}>
                  {counts[filter]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main List */}
      <div className="flex-1">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center text-[#71717A] py-24 bg-white/[0.01] border border-white/[0.02] rounded-3xl"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.05] flex items-center justify-center mb-4 relative group">
                <div className="absolute inset-0 bg-purple-600/10 rounded-3xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <BellOff className="w-8 h-8 text-[#52525B] group-hover:text-purple-400 transition-colors duration-300" />
              </div>
              <span className="text-sm font-black uppercase tracking-widest text-white/60 mb-2">
                {t('notifications.noNotifications')}
              </span>
              <span className="text-[10px] text-[#52525B] max-w-[320px] text-center leading-relaxed font-medium">
                {t('notifications.noNotificationsDesc')}
              </span>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((not, idx) => {
                const Icon = not.type === 'urgent' ? ShieldAlert : not.type === 'success' ? CheckCircle2 : Info;
                
                // Color configuration mapping
                const config = {
                  urgent: {
                    border: 'border-l-[4px] border-l-[#EF4444]/80 hover:border-red-500/30',
                    iconBg: 'bg-red-500/10 text-red-400 border border-red-500/20',
                    glow: 'hover:shadow-[0_0_25px_rgba(239,68,68,0.08)]',
                    accentColor: 'text-red-400'
                  },
                  info: {
                    border: 'border-l-[4px] border-l-[#06B6D4]/80 hover:border-cyan-500/30',
                    iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
                    glow: 'hover:shadow-[0_0_25px_rgba(6,182,212,0.08)]',
                    accentColor: 'text-cyan-400'
                  },
                  success: {
                    border: 'border-l-[4px] border-l-[#10B981]/80 hover:border-emerald-500/30',
                    iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                    glow: 'hover:shadow-[0_0_25px_rgba(16,185,129,0.08)]',
                    accentColor: 'text-emerald-400'
                  }
                };

                const currentConfig = config[not.type];

                return (
                  <motion.div
                    key={not.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30, delay: idx * 0.03 }}
                    whileHover={{ scale: 1.008 }}
                    onClick={() => {
                      if (not.unread) markAsRead(not.id);
                    }}
                    className={`group relative overflow-hidden bg-gradient-to-r ${
                      not.unread 
                        ? 'from-purple-950/10 to-purple-900/5 border-purple-500/20 shadow-[0_0_20px_rgba(139,92,246,0.05)]' 
                        : 'from-white/[0.02] to-white/[0.005] border-white/[0.03]'
                    } border rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 cursor-pointer ${
                      currentConfig.border
                    } ${currentConfig.glow}`}
                  >
                    {/* Background Radial Light Effect on Hover */}
                    <div className="absolute inset-0 bg-radial-gradient from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    {/* Left Icon Panel */}
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                      currentConfig.iconBg
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Middle Text Details */}
                    <div className="flex-grow min-w-0 pr-12">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <h4 className="text-[12px] font-black text-white leading-none tracking-wide group-hover:text-purple-300 transition-colors duration-200">
                          {getLocalizedTitle(not)}
                        </h4>
                        {not.unread && (
                          <span className="w-2 h-2 bg-purple-500 rounded-full shrink-0 shadow-[0_0_10px_#8b5cf6]" />
                        )}
                      </div>
                      <p className="text-[10.5px] text-[#A1A1AA] leading-relaxed mb-3 font-semibold">
                        {getLocalizedDesc(not)}
                      </p>
                      <div className="flex items-center gap-2 text-[9px] text-[#52525B] font-extrabold uppercase tracking-widest">
                        <Calendar className="w-3.5 h-3.5 text-[#52525B]" />
                        <span>{getLocalizedDate(not.date)}</span>
                      </div>
                    </div>

                    {/* Action Panel on Right Side */}
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                      {not.unread && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(not.id);
                          }}
                          title={t('notifications.markAllRead') || 'Okundu İşaretle'}
                          className="p-2 bg-white/[0.03] hover:bg-purple-600/20 border border-white/[0.05] hover:border-purple-500/40 rounded-xl text-purple-400 hover:text-purple-300 transition-all duration-200"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(not.id);
                        }}
                        title={t('profileSettings.cancel') || 'Sil'}
                        className="p-2 bg-white/[0.03] hover:bg-red-500/20 border border-white/[0.05] hover:border-red-500/40 rounded-xl text-[#71717a] hover:text-red-400 transition-all duration-200"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Unread Glow Border overlay */}
                    {not.unread && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none -z-10" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
