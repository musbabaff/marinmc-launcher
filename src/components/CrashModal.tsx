import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Play, Copy, FolderOpen, AlertOctagon, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CrashModalProps {
  isOpen: boolean;
  exitCode: number;
  crashLogPath: string;
  suspectedMod?: string;
  suspectedFilename?: string;
  crashDetails?: string;
  onClose: () => void;
  onRelaunch: () => void;
}

export default function CrashModal({
  isOpen,
  exitCode,
  crashLogPath,
  suspectedMod,
  suspectedFilename,
  crashDetails,
  onClose,
  onRelaunch
}: CrashModalProps) {
  const { t } = useTranslation();
  const [copySuccess, setCopySuccess] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const suspectedModName = suspectedMod || 'Unknown / System';
  const suspectedFile = suspectedFilename || 'Java/Minecraft Crash';
  const fileTypeBadge = suspectedFile.toLowerCase().endsWith('.jar') ? 'JAR' : 'ERR';
  const badgeBgColor = fileTypeBadge === 'JAR'
    ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/20 text-[#8B5CF6]'
    : 'bg-amber-500/10 border-amber-500/20 text-amber-400';

  const handleCopyLog = async () => {
    if (window.electronAPI) {
      const res = await window.electronAPI.copyCrashLog(crashLogPath);
      if (res.success) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } else {
        alert('Hata günlüğü kopyalanamadı: ' + res.error);
      }
    }
  };

  const handleOpenLog = async () => {
    setOpenError(null);
    if (window.electronAPI) {
      const res = await window.electronAPI.openCrashLog(crashLogPath);
      if (!res.success) {
        setOpenError(res.error || 'Dosya açılamadı.');
      }
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center"
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-[#0A0A0A] border border-[#EF4444]/30 w-[430px] rounded-2xl overflow-hidden shadow-2xl relative flex flex-col p-6 items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close btn */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-[#52525B] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Red explosion icon */}
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-[#EF4444] mb-4 shadow-glow-red">
                <AlertOctagon className="w-8 h-8 animate-pulse" />
              </div>

              {/* Title */}
              <h2 className="text-base font-bold text-white text-center mb-1">
                {t('crash.title')}
              </h2>
              <p className="text-xs text-[#A1A1AA] text-center mb-4 leading-relaxed">
                Oyun beklenmedik bir şekilde kapandı. Çıkış Kodu: <strong className="text-red-400 font-mono bg-red-500/15 px-1.5 py-0.5 rounded border border-red-500/20">{exitCode}</strong>
              </p>

              {/* Suspected Cause box */}
              <div className="w-full bg-[#111111] border border-[#2A2A2A] rounded-xl p-4 mb-3">
                <span className="text-[10px] font-extrabold text-[#52525B] uppercase tracking-wider block mb-2">
                  {t('crash.suspectedCause')}
                </span>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono border shrink-0 ${badgeBgColor}`}>
                    {fileTypeBadge}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white leading-none mb-1 truncate">{suspectedModName}</h4>
                    <p className="text-[10px] text-[#A1A1AA] font-mono leading-none truncate" title={suspectedFile}>{suspectedFile}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-[9px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded border border-red-500/20 font-bold uppercase tracking-wider">
                    Kritik Hata
                  </span>
                </div>
              </div>

              {/* Collapsible Details Panel */}
              {crashDetails && (
                <div className="w-full mb-4">
                  <button
                    onClick={() => setDetailsOpen(!detailsOpen)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-[#2D7DD2] hover:text-blue-400 transition-colors uppercase tracking-wider select-none mb-2"
                  >
                    <span>{detailsOpen ? 'Hata Detaylarını Gizle' : 'Hata Detaylarını Göster'}</span>
                    <span className="text-[8px]">{detailsOpen ? '▲' : '▼'}</span>
                  </button>
                  <AnimatePresence>
                    {detailsOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="w-full overflow-hidden"
                      >
                        <pre className="w-full bg-[#050505] border border-[#2A2A2A] rounded-xl p-3 text-[9px] font-mono text-red-400/90 overflow-x-auto max-h-32 whitespace-pre-wrap text-left select-text scrollbar-thin">
                          {crashDetails}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Action Buttons */}
              <div className="w-full space-y-2 mb-4">
                <button
                  onClick={() => {
                    onRelaunch();
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02]"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{t('crash.relaunch')}</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCopyLog}
                    className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      copySuccess
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                        : 'bg-white/[0.03] border-[#2A2A2A] text-[#A1A1AA] hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copySuccess ? 'Kopyalandı' : t('crash.copyCrashLog')}</span>
                  </button>
                  <button
                    onClick={handleOpenLog}
                    className="py-2 rounded-xl bg-white/[0.03] border border-[#2A2A2A] text-[#A1A1AA] hover:bg-white/[0.06] hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>{t('crash.openCrashLog')}</span>
                  </button>
                </div>
              </div>

              {openError && (
                <p className="text-[10px] text-red-400 font-semibold mb-3">{openError}</p>
              )}

              {/* Info text */}
              <div className="flex items-center gap-1.5 text-[9px] text-[#52525B]">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Sorun devam ederse lütfen MarinMC destek ekibiyle iletişime geçin.</span>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
