import { motion } from 'framer-motion';
import { ShoppingBag, Sparkles, CreditCard, Shield } from 'lucide-react';

export default function StorePage() {
  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden bg-[#080d1a] text-[#d2d2d2] select-none h-full relative justify-between">
      {/* Top action bar */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-sm font-extrabold tracking-widest text-white uppercase flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#2D7DD2]" />
            <span>MARINMC MARKET & MAĞAZA</span>
          </h1>
          <p className="text-[9px] text-[#52525B] font-bold mt-0.5 uppercase tracking-wide">
            Sunucu rütbeleri, anahtarlar, özel kanatlar ve pelerinler.
          </p>
        </div>
      </div>

      {/* Main Teaser Area */}
      <div className="flex-grow flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[580px] bg-gradient-to-br from-[#0c152b] via-[#080d1a] to-[#0c152b] border border-white/[0.05] rounded-3xl p-8 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-center flex flex-col items-center"
        >
          {/* Neon background glows */}
          <div className="absolute top-0 left-1/4 w-32 h-32 bg-[#2D7DD2]/10 rounded-full blur-[40px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-[#EAB308]/10 rounded-full blur-[40px] pointer-events-none" />
          
          {/* Lock Icon inside glowing ring */}
          <div className="w-16 h-16 rounded-2xl bg-[#EAB308]/10 border border-[#EAB308]/25 flex items-center justify-center mb-5 relative group">
            <div className="absolute inset-0 bg-[#EAB308]/5 rounded-2xl blur-lg group-hover:bg-[#EAB308]/10 transition-all" />
            <Shield className="w-7 h-7 text-[#EAB308] animate-pulse" />
          </div>

          <span className="px-3.5 py-1 bg-[#2D7DD2]/10 border border-[#2D7DD2]/30 text-[#2D7DD2] text-[8px] font-black tracking-widest rounded-full uppercase mb-3.5 animate-bounce">
            YAKINDA AKTİF
          </span>

          <h2 className="text-lg font-black tracking-widest text-white uppercase mb-2">
            MARKET & KOZMETİK MAĞAZASI
          </h2>
          
          <p className="text-[10px] text-[#A1A1AA] font-medium leading-relaxed max-w-[440px] mb-6">
            MarinMC Network market altyapısı güncelleniyor. Sunucularımızda kullanabileceğiniz özel rütbeler, kasa anahtarları, 3D kanatlar ve pelerinler çok yakında bu ekran üzerinden doğrudan erişime açılacaktır.
          </p>

          {/* Features Preview Cards */}
          <div className="grid grid-cols-3 gap-3.5 w-full text-left mb-6">
            {[
              { title: 'Rütbeler & VIP', desc: 'VIP, MVP ve özel lobi uçuş yetkileri.', icon: Sparkles, color: 'text-emerald-400 bg-emerald-400/5 border-emerald-400/15' },
              { title: '3D Kozmetikler', desc: 'Özel pelerinler ve kanat modelleri.', icon: ShoppingBag, color: 'text-[#EAB308] bg-[#EAB308]/5 border-[#EAB308]/15' },
              { title: 'Kasa Anahtarları', desc: 'Gizemli kutular ve şans ödülleri.', icon: CreditCard, color: 'text-amber-400 bg-amber-400/5 border-amber-400/15' },
            ].map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div key={idx} className={`p-3.5 border rounded-2xl flex flex-col justify-between ${feat.color}`}>
                  <Icon className="w-4 h-4 mb-2 shrink-0" />
                  <div>
                    <h4 className="text-[9.5px] font-black uppercase text-white tracking-wide mb-1">{feat.title}</h4>
                    <p className="text-[8.5px] text-[#52525B] font-bold leading-snug">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="w-full h-px bg-white/[0.04] mb-5" />

          {/* Info status indicator */}
          <div className="flex items-center gap-2 text-[8.5px] font-black text-emerald-400 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Altyapı Entegrasyon Çalışmaları Devam Ediyor</span>
          </div>
        </motion.div>
      </div>

      {/* Footer info */}
      <div className="text-center text-[8px] text-[#52525B] font-bold uppercase tracking-widest shrink-0 mt-4 border-t border-white/[0.02] pt-4">
        Destek veya bilgi almak için lobi üzerinden yetkililerle iletişime geçebilirsiniz.
      </div>
    </div>
  );
}
