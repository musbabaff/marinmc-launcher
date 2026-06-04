import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/appStore.ts';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineBanner() {
  const { t } = useTranslation();
  const isOnline = useAppStore((state) => state.isOnline);

  const handleOpenHelp = () => {
    if (window.electronAPI) {
      window.electronAPI.openExternal('https://support.marinmc.com');
    }
  };

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 32, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="bg-gradient-to-r from-amber-600/90 to-amber-500/90 text-white w-full flex items-center justify-between px-4 text-xs select-none border-b border-amber-600/20 z-30 shrink-0"
        >
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t('offline.banner')}</span>
          </div>
          <button
            onClick={handleOpenHelp}
            className="flex items-center gap-1 hover:underline font-extrabold text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded transition-all hover:bg-white/20"
          >
            <span>{t('offline.solutions')}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
