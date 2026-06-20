import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore.ts';
import { Clock, Calendar, Heart, Trophy, User, Loader2, Award, CheckCircle2, Lock } from 'lucide-react';
import { api, Achievement } from '../lib/api';

interface PlaySession {
  id: string;
  date: string;
  duration: string;
  server: string;
}

interface UserProfile {
  username: string;
  totalPlayTime: number;
  lastLogin: string;
  coins: number;
  playSessions: PlaySession[];
}

interface LeaderboardItem {
  rank: number;
  username: string;
  totalPlayTime: number;
  lastLogin: string;
  coins: number;
  status: 'online' | 'idle' | 'offline';
  server: string;
}

export default function ProfilePage() {
  const session = useAuthStore((state) => state.session);

  const [activeTab, setActiveTab] = useState<'profile' | 'leaderboard' | 'achievements'>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  
  const [favoriteGame, setFavoriteGame] = useState(() => {
    return localStorage.getItem('favorite_game') || 'Towny';
  });

  const handleFavoriteGameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFavoriteGame(val);
    localStorage.setItem('favorite_game', val);
  };
  
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [loadingAchievements, setLoadingAchievements] = useState(false);

  // Load profile from API
  useEffect(() => {
    if (!session) return;
    setLoadingProfile(true);
    api.getUserProfile(session.name)
      .then((data) => {
        setProfile(data);
      })
      .catch((err) => console.error('Failed to load profile:', err))
      .finally(() => setLoadingProfile(false));
  }, [session]);

  // Load leaderboard from API
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      setLoadingLeaderboard(true);
      api.getLeaderboard()
        .then((data) => {
          setLeaderboard(data);
        })
        .catch((err) => console.error('Failed to load leaderboard:', err))
        .finally(() => setLoadingLeaderboard(false));
    }
  }, [activeTab]);

  // Load achievements from API
  useEffect(() => {
    if (!session) return;
    if (activeTab === 'achievements') {
      setLoadingAchievements(true);
      api.getAchievements(session.name)
        .then((data) => setAchievements(data))
        .catch((err) => console.error('Failed to load achievements:', err))
        .finally(() => setLoadingAchievements(false));
    }
  }, [activeTab, session]);

  const totalPlayMinutes = profile ? profile.totalPlayTime : 0;
  const totalPlayTimeText = totalPlayMinutes >= 60 
    ? `${Math.round(totalPlayMinutes / 60)} Saat` 
    : `${totalPlayMinutes} dk`;

  return (
    <div className="flex-grow flex flex-col p-6 overflow-y-auto no-drag custom-scrollbar space-y-5 select-none bg-[#0A0A0A]">
      {/* Header & Tabs */}
      <div className="flex justify-between items-center border-b border-[#1E1E1E] pb-4 shrink-0">
        <div>
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">Oyuncu Profili</h2>
          <p className="text-[10px] text-[#A1A1AA] font-bold mt-1">
            Hesap kimliğinizi, liderlik tablosunu ve oynama istatistiklerinizi yönetin.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex gap-1 bg-[#111111] border border-white/[0.04] p-0.5 rounded-xl">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-[#2D7DD2] text-white shadow-[0_0_12px_rgba(45,125,210,0.25)]'
                : 'text-[#52525B] hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profilim</span>
          </button>

          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === 'achievements'
                ? 'bg-[#2D7DD2] text-white shadow-[0_0_12px_rgba(45,125,210,0.25)]'
                : 'text-[#52525B] hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Başarımlarım</span>
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === 'leaderboard'
                ? 'bg-[#2D7DD2] text-white shadow-[0_0_12px_rgba(45,125,210,0.25)]'
                : 'text-[#52525B] hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Liderlik Tablosu</span>
          </button>
        </div>
      </div>

      {activeTab === 'profile' ? (
        loadingProfile ? (
          <div className="flex-grow flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#2D7DD2] animate-spin" />
          </div>
        ) : (
          /* Profil Tab */
          <div className="grid grid-cols-12 gap-5 items-stretch animate-[fadeIn_0.25s_ease-out]">
            
            {/* Left: Avatar body render (4 cols) */}
            <div className="col-span-4 bg-[#111111] border border-[#1E1E1E] rounded-2xl p-4 flex flex-col items-center justify-center">
              <div className="h-64 flex items-center justify-center relative py-4 select-none pointer-events-none">
                <img
                  src={`https://mc-heads.net/body/${session?.name || 'Steve'}/220`}
                  alt="avatar body render"
                  className="max-h-full object-contain drop-shadow-xl animate-[pulse_3s_infinite]"
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
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white leading-none">{session?.name || 'Player'}</h3>
                      <span title="Oyuncu adı değiştirilemez"><Lock className="w-3.5 h-3.5 text-[#52525B]" /></span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-[9px] font-extrabold bg-[#2D7DD2]/15 border border-[#2D7DD2]/20 text-[#2D7DD2] px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                      {session?.type === 'ms' ? 'Premium Microsoft' : 'Ücretsiz'} Hesap
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#111111] border border-[#1E1E1E] p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#2D7DD2]/10 text-[#2D7DD2] flex items-center justify-center">
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
                    <span className="text-[10px] font-black text-white leading-none whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] block">{profile?.lastLogin || 'Mevcut Değil'}</span>
                  </div>
                </div>

                <div className="bg-[#111111] border border-[#1E1E1E] p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[8px] font-extrabold text-[#52525B] uppercase tracking-widest block leading-none mb-1">Favori Oda</span>
                    <select
                      value={favoriteGame}
                      onChange={handleFavoriteGameChange}
                      className="bg-[#0A0A0A] border border-[#2A2A2A] text-[10px] font-bold text-white rounded px-1 py-0.5 outline-none focus:border-[#2D7DD2] cursor-pointer"
                    >
                      <option value="Towny">Towny</option>
                      <option value="Skyblock">Skyblock</option>
                      <option value="Factions">Factions</option>
                      <option value="Survival">Survival</option>
                      <option value="Bedwars">Bedwars</option>
                      <option value="Creative">Creative</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Recent Activity history list */}
              <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-4 space-y-3">
                <span className="text-[9px] font-extrabold text-[#52525B] uppercase tracking-widest block">Son Oynanan Oturumlar</span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {profile && profile.playSessions.length > 0 ? (
                    profile.playSessions.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-2.5 hover:bg-white/[0.01] rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2D7DD2]" />
                          <span className="text-xs font-bold text-white/90">{item.server}</span>
                        </div>
                        <div className="flex gap-4 text-[9px] text-[#A1A1AA] font-bold">
                          <span>{item.date}</span>
                          <span className="text-[#52525B] font-mono">({item.duration})</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-[#52525B] font-bold text-center py-4">Henüz oynanmış oyun oturumu bulunamadı.</p>
                  )}
                </div>
              </div>

            </div>

          </div>
        )

      ) : activeTab === 'achievements' ? (
        loadingAchievements ? (
          <div className="flex-grow flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#2D7DD2] animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 animate-[fadeIn_0.25s_ease-out]">
            {achievements.map((a) => (
              <div 
                key={a.id} 
                className={`bg-[#111111] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                  a.completed 
                    ? 'border-[#2D7DD2]/30 bg-gradient-to-br from-[#111111] to-[#2D7DD2]/10 shadow-[0_0_15px_rgba(45,125,210,0.05)]' 
                    : 'border-white/[0.04] opacity-50'
                }`}
              >
                {a.completed && (
                  <div className="absolute -top-6 -right-6 w-12 h-12 bg-[#2D7DD2]/10 rounded-full blur-xl" />
                )}

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                      a.completed 
                        ? 'bg-[#2D7DD2]/10 border-[#2D7DD2]/20 text-[#2D7DD2]' 
                        : 'bg-white/5 border-white/10 text-[#52525B]'
                    }`}>
                      {a.completed ? <Trophy className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                    </div>
                    
                    {a.completed ? (
                      <span className="text-[7.5px] font-extrabold bg-[#2D7DD2]/15 text-[#2D7DD2] border border-[#2D7DD2]/20 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                        Açıldı ({a.date})
                      </span>
                    ) : (
                      <span className="text-[7.5px] font-extrabold bg-white/5 text-[#52525B] border border-white/5 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                        Kilitli
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-white leading-none uppercase tracking-wider">{a.title}</h4>
                    <p className="text-[9px] text-[#A1A1AA] font-bold mt-2 leading-relaxed">
                      {a.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.02] flex items-center gap-1.5 text-[8.5px] font-bold">
                  {a.completed ? (
                    <span className="text-[#2D7DD2] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#2D7DD2]" />
                      Rozet Kazanıldı
                    </span>
                  ) : (
                    <span className="text-[#52525B] flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Kilitli Rozet
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Leaderboard Tab */
        loadingLeaderboard ? (
          <div className="flex-grow flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#2D7DD2] animate-spin" />
          </div>
        ) : (
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-5 overflow-hidden flex flex-col flex-grow animate-[fadeIn_0.25s_ease-out] max-h-[460px]">
            <span className="text-[10px] font-extrabold text-[#52525B] uppercase tracking-widest block mb-4 shrink-0">MARINMC EN ÇOK OYNAYAN LİSTESİ</span>
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#2A2A2A] text-[9px] text-[#52525B] uppercase font-black tracking-widest">
                    <th className="py-2.5 pl-3">Sıra</th>
                    <th className="py-2.5">Oyuncu</th>
                    <th className="py-2.5">Toplam Süre</th>
                    <th className="py-2.5">Aktif Durum</th>
                    <th className="py-2.5 pr-3">Oda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {leaderboard.map((player) => {
                    const isGold = player.rank === 1;
                    const isSilver = player.rank === 2;
                    const isBronze = player.rank === 3;
                    return (
                      <tr 
                        key={player.username} 
                        className={`hover:bg-white/[0.02] transition-colors ${
                          player.username.toLowerCase() === session?.name?.toLowerCase() 
                            ? 'bg-[#2D7DD2]/5 text-white border-l-2 border-l-[#2D7DD2]' 
                            : 'text-white/80'
                        }`}
                      >
                        <td className="py-3 pl-3 font-black">
                          {isGold ? (
                            <span className="text-yellow-400 flex items-center gap-0.5">🏆 1</span>
                          ) : isSilver ? (
                            <span className="text-slate-300 flex items-center gap-0.5">🥈 2</span>
                          ) : isBronze ? (
                            <span className="text-amber-600 flex items-center gap-0.5">🥉 3</span>
                          ) : (
                            <span className="text-[#52525B] pl-2">{player.rank}</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2.5 font-bold">
                            <img
                              src={`https://minotar.net/avatar/${player.username}/24`}
                              alt={player.username}
                              className="w-5 h-5 rounded-md border border-white/5"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/24';
                              }}
                            />
                            <span className={player.username.toLowerCase() === session?.name?.toLowerCase() ? 'text-[#a78bfa] font-black' : ''}>
                              {player.username}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 font-extrabold text-white/95">{player.totalPlayTime} Saat</td>
                        <td className="py-3 font-bold">
                          {player.status === 'online' ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Çevrimiçi
                            </span>
                          ) : player.status === 'idle' ? (
                            <span className="text-amber-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Boşta
                            </span>
                          ) : (
                            <span className="text-[#52525B]">Çevrimdışı</span>
                          )}
                        </td>
                        <td className="py-3 pr-3 font-bold text-[#A1A1AA]">
                          {player.server}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
