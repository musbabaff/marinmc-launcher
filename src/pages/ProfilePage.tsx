import { useState } from 'react';
import { useAuthStore } from '../stores/authStore.ts';
import { Clock, Calendar, Heart, Edit2, Check } from 'lucide-react';

export default function ProfilePage() {
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);

  const [usernameInput, setUsernameInput] = useState(session?.name || 'Player');
  const [editing, setEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const handleEditToggle = () => {
    if (editing) {
      // Save username changes to state
      if (usernameInput.trim().length >= 3) {
        if (session) {
          setSession({
            ...session,
            name: usernameInput.trim(),
            avatar: `https://minotar.net/avatar/${usernameInput.trim()}/48`
          });
        }
        setSuccessMsg(true);
        setTimeout(() => setSuccessMsg(false), 2000);
      }
    }
    setEditing(!editing);
  };

  const totalPlayMinutes = (() => {
    const val = localStorage.getItem('marinmc_total_play_time') || '124';
    const parsed = parseInt(val, 10);
    return parsed === 124 ? 124 * 60 : parsed;
  })();
  const totalPlayTimeText = totalPlayMinutes >= 60 
    ? `${Math.round(totalPlayMinutes / 60)} Saat` 
    : `${totalPlayMinutes} dk`;

  const lastLogin = localStorage.getItem('marinmc_last_login_time') || 'Bugün 20:15';

  const sessionsList = (() => {
    try {
      return JSON.parse(localStorage.getItem('marinmc_play_sessions') || '[]');
    } catch {
      return [];
    }
  })();

  const favoriteServer = sessionsList.length > 0 
    ? sessionsList[0].server.replace('MarinMC ', '') 
    : 'Towny';

  return (
    <div className="flex-grow flex flex-col p-6 overflow-y-auto no-drag custom-scrollbar space-y-5 select-none bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#1E1E1E] pb-4">
        <div>
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">Oyuncu Profili</h2>
          <p className="text-[10px] text-[#A1A1AA] font-bold mt-1">
            Hesap kimliğinizi ve oynama istatistiklerinizi yönetin.
          </p>
        </div>
      </div>

      {/* Main split sections layout */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        
        {/* Left: Avatar body render (4 cols) */}
        <div className="col-span-4 bg-[#111111] border border-[#1E1E1E] rounded-2xl p-4 flex flex-col items-center justify-center">
          <div className="h-64 flex items-center justify-center relative py-4 select-none pointer-events-none">
            <img
              src={`https://mc-heads.net/body/${session?.name || 'Steve'}/220`}
              alt="avatar body render"
              className="max-h-full object-contain drop-shadow-xl animate-pulse"
            />
          </div>
        </div>

        {/* Right: Username edits + Statistics info panel (8 cols) */}
        <div className="col-span-8 space-y-4">
          
          {/* Identity Box */}
          <div className="glass-panel p-5 rounded-2xl border border-[#1E1E1E] space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-widest block mb-1">Oyuncu Kimliği</span>
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-xs font-bold text-white focus:outline-none"
                    />
                    <button
                      onClick={handleEditToggle}
                      className="p-2 bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-lg text-white font-bold transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white leading-none">{session?.name || 'Player'}</h3>
                    <button
                      onClick={handleEditToggle}
                      className="p-1 text-[#52525B] hover:text-white transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {successMsg && (
                  <span className="text-[9px] text-emerald-400 font-semibold block mt-1">Değişiklikler kaydedildi.</span>
                )}
              </div>

              <span className="text-[9px] font-extrabold bg-[#8B5CF6]/15 border border-[#8B5CF6]/20 text-[#8B5CF6] px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                {session?.type || 'Ücretsiz'} Hesap
              </span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#111111] border border-[#1E1E1E] p-4 rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[8px] font-extrabold text-[#52525B] uppercase tracking-widest block leading-none mb-1">Oynama Süresi</span>
                <span className="text-xs font-black text-white leading-none">{totalPlayTimeText}</span>
              </div>
            </div>

            <div className="bg-[#111111] border border-[#1E1E1E] p-4 rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#06B6D4]/10 text-[#06B6D4] flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[8px] font-extrabold text-[#52525B] uppercase tracking-widest block leading-none mb-1">Son Giriş</span>
                <span className="text-xs font-black text-white leading-none">{lastLogin}</span>
              </div>
            </div>

            <div className="bg-[#111111] border border-[#1E1E1E] p-4 rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[8px] font-extrabold text-[#52525B] uppercase tracking-widest block leading-none mb-1">Favori Oda</span>
                <span className="text-xs font-black text-white leading-none">{favoriteServer}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity history list */}
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-4 space-y-3">
            <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-widest block">Son Oynanan Oturumlar</span>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {sessionsList.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center p-2.5 hover:bg-white/[0.01] rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                    <span className="text-xs font-bold text-white/90">{item.server}</span>
                  </div>
                  <div className="flex gap-4 text-[9px] text-[#A1A1AA] font-bold">
                    <span>{item.date}</span>
                    <span className="text-[#52525B] font-mono">({item.duration})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
