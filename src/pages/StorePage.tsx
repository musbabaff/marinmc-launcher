import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import {
  Coins, ShoppingBag, Sparkles, Check, CreditCard, Shield,
  X, Loader2, ShoppingCart, Info
} from 'lucide-react';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'rank' | 'crate' | 'cosmetic';
  badge?: string;
  color: string;
}

const STORE_ITEMS: StoreItem[] = [
  // Ranks
  { id: 'rank_vip', name: 'VIP Rütbesi', description: 'Sunucularda yeşil [VIP] tagı, lobi uçuş yetkisi ve %10 XP bonusu.', price: 250, type: 'rank', badge: 'Popüler', color: 'from-green-500/20 to-green-500/5 text-green-400 border-green-500/30' },
  { id: 'rank_vip_plus', name: 'VIP+ Rütbesi', description: '[VIP+] tagı, özel evcil hayvanlar ve %20 XP bonusu.', price: 500, type: 'rank', color: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/30' },
  { id: 'rank_mvp', name: 'MVP Rütbesi', description: 'Mavi [MVP] tagı, lobi evcil hayvan kontrolü ve %35 XP bonusu.', price: 1000, type: 'rank', color: 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/30' },
  { id: 'rank_mvp_plus', name: 'MVP+ Rütbesi', description: 'Turuncu [MVP+] tagı, sınırsız kozmetik erişimi ve %50 XP bonusu.', price: 1500, type: 'rank', badge: 'Premium', color: 'from-orange-500/20 to-orange-500/5 text-orange-400 border-orange-500/30' },
  
  // Crates
  { id: 'crate_epic', name: 'Destansı Kasa Anahtarı', description: 'Kasadan gizemli şapkalar, pelerinler veya ifadeler çıkarın.', price: 50, type: 'crate', color: 'from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/30' },
  { id: 'crate_legendary', name: 'Efsanevi Kasa Anahtarı', description: 'En nadir 3D kozmetikleri garanti eden efsanevi kasa anahtarı.', price: 120, type: 'crate', badge: 'Şanslı', color: 'from-yellow-500/20 to-yellow-500/5 text-yellow-400 border-yellow-500/30' },
  { id: 'crate_cosmetic', name: 'Kozmetik Kasa Anahtarı', description: 'Sadece pelerin ve kol stili ödülleri veren özel anahtar.', price: 80, type: 'crate', color: 'from-pink-500/20 to-pink-500/5 text-pink-400 border-pink-500/30' },

  // Cosmetics
  { id: 'cosmetic_rainbow_wings', name: 'Gökkuşağı Kanatları', description: '3D hareketli ve RGB dalgalanan premium ejderha kanatları.', price: 800, type: 'cosmetic', badge: 'VIP Kozmetik', color: 'from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-400 border-fuchsia-500/30' },
  { id: 'cosmetic_glow_aura', name: 'Parıltı Aurası', description: 'Lobi ve oyun içi karakterinizin etrafında parlayan mor halkalar.', price: 600, type: 'cosmetic', color: 'from-violet-500/20 to-violet-500/5 text-violet-400 border-violet-500/30' },
  { id: 'cosmetic_flame_particles', name: 'Alev Efekti', description: 'Yürürken arkanızda yanan lav ve alev parçacıkları bırakır.', price: 450, type: 'cosmetic', color: 'from-red-500/20 to-red-500/5 text-red-400 border-red-500/30' },
];

const COIN_PACKAGES = [
  { id: 'pack_small', coins: 1000, price: '4.99', desc: 'Başlangıç paketi' },
  { id: 'pack_medium', coins: 2500, price: '9.99', desc: 'En popüler paket', popular: true },
  { id: 'pack_large', coins: 5000, price: '17.99', desc: 'Devasa tasarruf paketi' }
];

export default function StorePage() {
  const session = useAuthStore((s) => s.session);
  const username = session?.name || 'Player';

  const [activeTab, setActiveTab] = useState<'ranks' | 'crates' | 'cosmetics' | 'topup'>('ranks');
  const [coins, setCoins] = useState(500);
  const [purchasedCapes, setPurchasedCapes] = useState<string[]>([]);
  const [skinType, setSkinType] = useState<'username' | 'file'>('username');
  const [skinVal, setSkinVal] = useState(username);
  const [capeUrl, setCapeUrl] = useState('');
  const [modelType, setModelType] = useState<'classic' | 'slim'>('classic');
  const [wingsEnabled, setWingsEnabled] = useState(true);

  // Modals and notifications
  const [checkoutItem, setCheckoutItem] = useState<StoreItem | null>(null);
  const [checkoutPackage, setCheckoutPackage] = useState<typeof COIN_PACKAGES[0] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Payment form states
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Fetch current user cosmetics/coins on mount
  useEffect(() => {
    api.getCosmetics(username).then((data) => {
      setSkinType(data.skinType || 'username');
      setSkinVal(data.skinVal || username);
      setCapeUrl(data.capeUrl || '');
      setModelType(data.modelType || 'classic');
      setWingsEnabled(data.wingsEnabled !== false);
      setCoins(data.coins !== undefined ? data.coins : 500);
      setPurchasedCapes(data.purchasedCapes || []);
    });
  }, [username]);

  const saveCosmeticsState = async (newCoins: number, newPurchased: string[]) => {
    try {
      await api.updateCosmetics(username, {
        skinType,
        skinVal,
        capeUrl,
        modelType,
        wingsEnabled,
        purchasedCapes: newPurchased,
        coins: newCoins
      });
    } catch (err) {
      console.error('Failed to sync cosmetics store values:', err);
    }
  };

  const handlePurchaseItem = async (item: StoreItem) => {
    if (purchasedCapes.includes(item.id)) return;

    if (coins < item.price) {
      setErrorAlert('Yetersiz Jeton! Lütfen üst kısımdan jeton yükleyin veya günlük görevleri tamamlayın.');
      setTimeout(() => setErrorAlert(null), 4000);
      return;
    }

    setCheckoutItem(item);
  };

  const confirmPurchaseItem = async () => {
    if (!checkoutItem) return;
    setIsProcessing(true);

    setTimeout(async () => {
      const nextCoins = coins - checkoutItem.price;
      const nextPurchased = [...purchasedCapes, checkoutItem.id];
      
      setCoins(nextCoins);
      setPurchasedCapes(nextPurchased);
      await saveCosmeticsState(nextCoins, nextPurchased);

      setIsProcessing(false);
      setCheckoutItem(null);
      setSuccessMessage(`Tebrikler! "${checkoutItem.name}" başarıyla hesabınıza tanımlandı!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    }, 1200);
  };

  const handleTopupPackage = (pkg: typeof COIN_PACKAGES[0]) => {
    setCheckoutPackage(pkg);
    setCardNumber('');
    setCardExpiry('');
    setCardCvc('');
    setPhoneNumber('');
    setProcessProgress(0);
  };

  const confirmPayment = () => {
    if (!checkoutPackage) return;
    setIsProcessing(true);
    setProcessProgress(0);

    let progressVal = 0;
    const interval = setInterval(() => {
      progressVal += 25;
      setProcessProgress(progressVal);
      if (progressVal >= 100) {
        clearInterval(interval);
        setTimeout(async () => {
          const nextCoins = coins + checkoutPackage.coins;
          setCoins(nextCoins);
          await saveCosmeticsState(nextCoins, purchasedCapes);

          setIsProcessing(false);
          setCheckoutPackage(null);
          setSuccessMessage(`Ödeme Başarılı! ${checkoutPackage.coins} Jeton hesabınıza başarıyla eklendi.`);
          setTimeout(() => setSuccessMessage(null), 4000);
        }, 500);
      }
    }, 400);
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden bg-[#060305] text-[#d2d2d2] select-none h-full relative">
      {/* Top action bar: Balance and store info */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-sm font-extrabold tracking-widest text-white uppercase flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#2D7DD2]" />
            <span>MARINMC MARKET & MAĞAZA</span>
          </h1>
          <p className="text-[9px] text-[#52525B] font-bold mt-0.5 uppercase tracking-wide">
            Sunucu rütbeleri, anahtarlar, özel kanatlar ve jeton yükleme sayfası.
          </p>
        </div>

        {/* Coins Balance Indicator */}
        <div className="flex items-center gap-3">
          <div className="bg-[#0a0a0a] border border-white/[0.04] p-2 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(251,191,36,0.05)]">
            <div className="flex items-center gap-1.5 pl-1">
              <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-[11px] font-black text-white">{coins} Jeton</span>
            </div>
            <button
              onClick={() => setActiveTab('topup')}
              className="px-2.5 py-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 hover:border-amber-400/50 text-amber-400 text-[8px] font-black uppercase tracking-wider transition-all duration-200"
            >
              Yükle
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-[#09070a] border border-white/[0.04] p-1 rounded-xl mb-4 self-start shrink-0">
        {[
          { id: 'ranks' as const, label: 'Rütbeler' },
          { id: 'crates' as const, label: 'Kasa Anahtarları' },
          { id: 'cosmetics' as const, label: 'Kozmetikler' },
          { id: 'topup' as const, label: 'Jeton Yükle' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-[#2D7DD2]/10 border border-[#2D7DD2]/30 text-white shadow-[0_0_12px_rgba(45,125,210,0.15)]'
                : 'text-[#52525B] hover:text-[#d2d2d2] border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main product view area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar no-drag pr-1 pb-4">
        {errorAlert && (
          <div className="mb-4 p-3 bg-red-500/5 border border-red-500/25 rounded-xl flex items-center gap-2.5 text-red-400 text-[9px] font-black uppercase tracking-wider">
            <Info className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorAlert}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3.5 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center gap-2.5 text-green-400 text-[9px] font-bold"
            >
              <Sparkles className="w-4.5 h-4.5 shrink-0 text-green-400 animate-spin" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab !== 'topup' ? (
          <div className="grid grid-cols-3 gap-4">
            {STORE_ITEMS.filter(item => item.type === activeTab.slice(0, -1)).map((item) => {
              const isOwned = purchasedCapes.includes(item.id);
              return (
                <div
                  key={item.id}
                  className="bg-[#0a0a0a] border border-white/[0.04] rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-white/10 transition-all duration-300"
                >
                  <div className={`absolute top-0 right-0 bg-gradient-to-l ${item.color} h-1 w-full`} />
                  
                  <div className="space-y-2.5 flex-1">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">{item.name}</span>
                      {item.badge && (
                        <span className="text-[7px] bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-full font-black uppercase">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[8.5px] text-[#A1A1AA] font-medium leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/[0.02]">
                    <div className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[10px] font-black text-white">{item.price} Jeton</span>
                    </div>

                    <button
                      onClick={() => handlePurchaseItem(item)}
                      disabled={isOwned}
                      className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1 ${
                        isOwned
                          ? 'bg-green-500/10 border border-green-500/20 text-green-400 cursor-default'
                          : 'bg-white/5 hover:bg-[#2D7DD2]/10 border border-white/10 hover:border-[#2D7DD2]/30 text-white hover:text-white shadow-[0_3px_10px_rgba(0,0,0,0.2)]'
                      }`}
                    >
                      {isOwned ? (
                        <>
                          <Check className="w-3 h-3 text-green-400" />
                          <span>Alındı</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3 h-3 text-[#2D7DD2]" />
                          <span>Satın Al</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Jeton Yükleme Menüsü */
          <div className="space-y-4">
            <div className="bg-[#0a0a0a] border border-white/[0.04] p-5 rounded-2xl space-y-1">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#52525B]">Jeton Mağazası</h3>
              <p className="text-[8.5px] text-[#52525B] font-bold uppercase tracking-wider">
                Güvenli ödeme altyapısıyla jeton bakiyenizi anında güncelleyin.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {COIN_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`bg-[#0a0a0a] border rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-white/10 transition-all duration-300 ${
                    pkg.popular ? 'border-[#2D7DD2]/30 bg-[#2D7DD2]/[0.02]' : 'border-white/[0.04]'
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute top-0 right-0 bg-[#2D7DD2] text-white text-[7px] font-black uppercase px-3.5 py-0.5 rounded-bl-xl tracking-wider">
                      En Popüler
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-5 h-5 text-amber-400 animate-pulse" />
                      <span className="text-sm font-black text-white tracking-wide">{pkg.coins} Jeton</span>
                    </div>
                    <p className="text-[8.5px] text-[#A1A1AA] font-bold uppercase tracking-wider">
                      {pkg.desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-3 border-t border-white/[0.02]">
                    <span className="text-[11px] font-black text-white">${pkg.price} USD</span>

                    <button
                      onClick={() => handleTopupPackage(pkg)}
                      className="px-3.5 py-2 rounded-xl bg-[#2D7DD2]/20 hover:bg-[#2D7DD2]/30 border border-[#2D7DD2]/40 hover:border-[#2D7DD2]/60 text-white text-[8px] font-black uppercase tracking-wider transition-all duration-300 hover:shadow-[0_0_15px_rgba(45,125,210,0.2)]"
                    >
                      Satın Al
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== ITEM CHECKOUT MODAL ===== */}
      <AnimatePresence>
        {checkoutItem && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0A0A0A] border border-white/[0.08] w-[380px] rounded-2xl overflow-hidden shadow-2xl p-6 relative"
            >
              <button
                onClick={() => setCheckoutItem(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-[#52525B] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#2D7DD2]/10 border border-[#2D7DD2]/20 flex items-center justify-center mx-auto">
                  <ShoppingCart className="w-7 h-7 text-[#2D7DD2]" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Satın Alma Onayı</h3>
                  <p className="text-[10px] text-[#A1A1AA] leading-relaxed">
                    <strong>{checkoutItem.name}</strong> ürününü satın almak istiyor musunuz?
                  </p>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl flex justify-between items-center text-[9px] uppercase font-bold tracking-wider">
                  <span className="text-[#52525B]">Ürün Fiyatı:</span>
                  <span className="text-amber-400 font-black flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    {checkoutItem.price} Jeton
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setCheckoutItem(null)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-[#A1A1AA] hover:text-white text-[9px] font-black uppercase transition-all"
                  >
                    Vazgeç
                  </button>

                  <button
                    onClick={confirmPurchaseItem}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 rounded-xl bg-[#2D7DD2] hover:bg-[#4A9AE8] text-white text-[9px] font-black uppercase tracking-wider transition-all shadow-[0_4px_15px_rgba(45,125,210,0.25)] flex items-center justify-center gap-1.5"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>İşleniyor...</span>
                      </>
                    ) : (
                      <span>Onayla</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== CASH TOPUP CHECKOUT MODAL ===== */}
      <AnimatePresence>
        {checkoutPackage && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0A0A0A] border border-white/[0.08] w-[420px] rounded-2xl overflow-hidden shadow-2xl relative"
            >
              <div className="h-16 bg-gradient-to-br from-[#2D7DD2]/10 to-transparent flex items-center px-6 border-b border-white/[0.03]">
                <Coins className="w-5 h-5 text-amber-400 mr-2.5 animate-pulse" />
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Güvenli Ödeme</h3>
                  <span className="text-[7.5px] text-[#52525B] font-bold uppercase tracking-widest">{checkoutPackage.coins} Jeton Yükleme</span>
                </div>
                <button
                  onClick={() => setCheckoutPackage(null)}
                  disabled={isProcessing}
                  className="absolute top-4.5 right-4 p-1.5 rounded-lg hover:bg-white/10 text-[#52525B] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {isProcessing ? (
                  /* Processing Payment Screen */
                  <div className="py-10 text-center space-y-4">
                    <Loader2 className="w-10 h-10 text-[#2D7DD2] animate-spin mx-auto" />
                    <div className="space-y-1.5">
                      <span className="text-[9px] text-[#2D7DD2] font-black uppercase tracking-widest block">
                        {processProgress <= 50 ? 'Banka provizyonu alınıyor...' : 'Jetonlar hesabınıza tanımlanıyor...'}
                      </span>
                      <span className="text-[8px] text-[#52525B] font-bold uppercase tracking-wider block">Lütfen pencereyi kapatmayın...</span>
                    </div>

                    <div className="w-full h-1.5 bg-[#131622] rounded-full overflow-hidden border border-white/5 max-w-[280px] mx-auto">
                      <motion.div
                        className="h-full bg-[#2D7DD2]"
                        initial={{ width: '0%' }}
                        animate={{ width: `${processProgress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                  </div>
                ) : (
                  /* Standard Input Checkout Form */
                  <>
                    {/* Method Selector */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPaymentMethod('card')}
                        className={`flex-1 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${
                          paymentMethod === 'card'
                            ? 'bg-[#2D7DD2]/10 border-[#2D7DD2]/40 text-white shadow-[0_0_10px_rgba(45,125,210,0.1)]'
                            : 'bg-white/[0.01] border-white/[0.04] text-[#52525B] hover:text-white'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Kredi Kartı</span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('mobile')}
                        className={`flex-1 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${
                          paymentMethod === 'mobile'
                            ? 'bg-[#2D7DD2]/10 border-[#2D7DD2]/40 text-white shadow-[0_0_10px_rgba(45,125,210,0.1)]'
                            : 'bg-white/[0.01] border-white/[0.04] text-[#52525B] hover:text-white'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Mobil Ödeme</span>
                      </button>
                    </div>

                    {paymentMethod === 'card' ? (
                      /* Kredi Kartı Formu */
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[7.5px] text-[#52525B] font-bold uppercase tracking-wider">Kart Numarası</label>
                          <input
                            type="text"
                            placeholder="0000 0000 0000 0000"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16).replace(/(.{4})/g, '$1 ').trim())}
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.01] border border-white/[0.06] text-xs font-semibold text-white outline-none focus:border-[#2D7DD2]/40 transition-all placeholder-white/10"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[7.5px] text-[#52525B] font-bold uppercase tracking-wider">Son Kullanma</label>
                            <input
                              type="text"
                              placeholder="AA/YY"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value.replace(/\D/g, '').substring(0, 4).replace(/(.{2})/, '$1/'))}
                              className="w-full px-4 py-3 rounded-xl bg-white/[0.01] border border-white/[0.06] text-xs font-semibold text-white outline-none focus:border-[#2D7DD2]/40 transition-all placeholder-white/10"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[7.5px] text-[#52525B] font-bold uppercase tracking-wider">CVC</label>
                            <input
                              type="password"
                              placeholder="***"
                              value={cardCvc}
                              onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').substring(0, 3))}
                              className="w-full px-4 py-3 rounded-xl bg-white/[0.01] border border-white/[0.06] text-xs font-semibold text-white outline-none focus:border-[#2D7DD2]/40 transition-all placeholder-white/10 font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Mobil Ödeme Formu */
                      <div className="space-y-1">
                        <label className="text-[7.5px] text-[#52525B] font-bold uppercase tracking-wider">Telefon Numarası</label>
                        <input
                          type="text"
                          placeholder="0555 555 55 55"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').substring(0, 11))}
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.01] border border-white/[0.06] text-xs font-semibold text-white outline-none focus:border-[#2D7DD2]/40 transition-all placeholder-white/10"
                        />
                      </div>
                    )}

                    <div className="pt-2 flex justify-between items-center border-t border-white/[0.02]">
                      <div className="text-left">
                        <span className="text-[7.5px] text-[#52525B] font-bold uppercase tracking-wider block">Toplam Tutar:</span>
                        <span className="text-xs font-black text-white">${checkoutPackage.price} USD</span>
                      </div>

                      <button
                        onClick={confirmPayment}
                        className="px-5 py-2.5 rounded-xl bg-[#2D7DD2] hover:bg-[#4A9AE8] text-white text-[9px] font-black uppercase tracking-wider transition-all shadow-[0_4px_15px_rgba(45,125,210,0.25)] hover:scale-[1.02]"
                      >
                        Ödemeyi Tamamla
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
