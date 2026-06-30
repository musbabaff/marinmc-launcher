import type { Achievement } from './api';

// Real, computed-from-local-state achievement system (no mock data).
// Counters are bumped at real action points via incrementStat().

export function incrementStat(key: string, by = 1): void {
  try {
    const cur = parseInt(localStorage.getItem(key) || '0', 10) || 0;
    localStorage.setItem(key, String(cur + by));
  } catch {
    /* ignore */
  }
}

interface Stats {
  coins: number;
  playTimeMin: number;
  friends: number;
  hasCosmetic: boolean;
  isPremium: boolean;
  customJvm: boolean;
  messagesSent: number;
  modsDownloaded: number;
  screenshotsShared: number;
  gamesLaunched: number;
}

function num(key: string): number {
  return parseInt(localStorage.getItem(key) || '0', 10) || 0;
}

function readStats(): Stats {
  let friends = 0;
  try {
    const contacts = JSON.parse(localStorage.getItem('marinmc_chat_contacts') || '[]');
    friends = Array.isArray(contacts) ? contacts.length : 0;
  } catch { /* ignore */ }

  let isPremium = false;
  try {
    const session = JSON.parse(localStorage.getItem('marinmc_session') || '{}');
    isPremium = session?.type === 'ms';
  } catch { /* ignore */ }

  const cape = localStorage.getItem('marinmc_active_cape_url') || '';
  const wings = localStorage.getItem('marinmc_active_wings_enabled') === 'true';

  return {
    coins: num('marinmc_coins'),
    playTimeMin: num('marinmc_total_play_time'),
    friends,
    hasCosmetic: cape !== '' || wings,
    isPremium,
    customJvm: localStorage.getItem('marinmc_setting_smartJvmOpt') === 'true',
    messagesSent: num('marinmc_stat_messages_sent'),
    modsDownloaded: num('marinmc_stat_mods_downloaded'),
    screenshotsShared: num('marinmc_stat_screenshots_shared'),
    gamesLaunched: num('marinmc_stat_games_launched'),
  };
}

interface AchievementDef {
  id: string;
  title: string;
  description: string;
  check: (s: Stats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Onboarding
  { id: 'first_login', title: 'İlk Adım', description: 'MarinMC Launcher\'a ilk kez giriş yap.', check: () => true },
  { id: 'premium', title: 'Premium Üye', description: 'Microsoft (premium) hesabıyla giriş yap.', check: s => s.isPremium },
  // Social
  { id: 'friend_1', title: 'Sosyal Keşif', description: 'Arkadaş listene ilk arkadaşını ekle.', check: s => s.friends >= 1 },
  { id: 'friend_5', title: 'Sosyal Kelebek', description: '5 arkadaş edin.', check: s => s.friends >= 5 },
  { id: 'friend_10', title: 'Topluluk Yıldızı', description: '10 arkadaş edin.', check: s => s.friends >= 10 },
  // Coins
  { id: 'coins_500', title: 'Cüzdan', description: '500 jetona ulaş.', check: s => s.coins >= 500 },
  { id: 'coins_1000', title: 'Jeton Avcısı', description: '1.000 jetona ulaş.', check: s => s.coins >= 1000 },
  { id: 'coins_5000', title: 'Jeton Baronu', description: '5.000 jetona ulaş.', check: s => s.coins >= 5000 },
  { id: 'coins_10000', title: 'Hazine Sandığı', description: '10.000 jetona ulaş.', check: s => s.coins >= 10000 },
  // Playtime
  { id: 'play_1h', title: 'Acemi', description: 'Toplam 1 saat oyna.', check: s => s.playTimeMin >= 60 },
  { id: 'play_10h', title: 'Zaman Bükücü', description: 'Toplam oynama süreni 10 saate ulaştır.', check: s => s.playTimeMin >= 600 },
  { id: 'play_50h', title: 'Adanmış', description: 'Toplam 50 saat oyna.', check: s => s.playTimeMin >= 3000 },
  { id: 'play_100h', title: 'Efsane', description: 'Toplam 100 saat oyna.', check: s => s.playTimeMin >= 6000 },
  // Cosmetics
  { id: 'cosmetic', title: 'Kozmetik Ustası', description: 'Gardıroptan ilk pelerin veya kanat kozmetiğini kuşan.', check: s => s.hasCosmetic },
  // Mods
  { id: 'mod_1', title: 'Mod Meraklısı', description: 'Mod Yöneticisinden ilk modunu indir.', check: s => s.modsDownloaded >= 1 },
  { id: 'mod_10', title: 'Mod Koleksiyoncusu', description: '10 mod indir.', check: s => s.modsDownloaded >= 10 },
  // Chat
  { id: 'msg_1', title: 'Relay Sohbetçisi', description: 'Relay Sohbet kanalında ilk mesajını gönder.', check: s => s.messagesSent >= 1 },
  { id: 'msg_50', title: 'Geveze', description: '50 mesaj gönder.', check: s => s.messagesSent >= 50 },
  { id: 'msg_500', title: 'Sohbet Kurdu', description: '500 mesaj gönder.', check: s => s.messagesSent >= 500 },
  // Screenshots
  { id: 'ss_1', title: 'Fotoğrafçı', description: 'Galeri sayfasında ilk ekran görüntünü toplulukla paylaş.', check: s => s.screenshotsShared >= 1 },
  { id: 'ss_10', title: 'Paparazzi', description: '10 ekran görüntüsü paylaş.', check: s => s.screenshotsShared >= 10 },
  // Launch
  { id: 'launch_1', title: 'Oyuna Hazır', description: 'Oyunu ilk kez başlat.', check: s => s.gamesLaunched >= 1 },
  { id: 'launch_25', title: 'Düzenli Oyuncu', description: 'Oyunu 25 kez başlat.', check: s => s.gamesLaunched >= 25 },
  { id: 'launch_100', title: 'Maratoncu', description: 'Oyunu 100 kez başlat.', check: s => s.gamesLaunched >= 100 },
  // Settings
  { id: 'jvm', title: 'Kusursuz Entegrasyon', description: 'Akıllı JVM optimizasyon ayarlarını aktif et.', check: s => s.customJvm },
];

/** Compute the full achievement list with real completion state, persisting dates. */
export function computeAchievements(username: string): Achievement[] {
  const stats = readStats();
  const storeKey = `marinmc_achievements_${username}`;
  let stored: Record<string, { completed: boolean; date: string }> = {};
  try {
    const raw = localStorage.getItem(storeKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && !Array.isArray(parsed)) stored = parsed;
    }
  } catch { /* ignore (old array format) */ }

  const today = new Date().toLocaleDateString('tr-TR');
  const result: Achievement[] = ACHIEVEMENTS.map(def => {
    const done = def.check(stats);
    const prev = stored[def.id];
    // Keep the first unlock date; assign today when newly unlocked.
    const date = done ? (prev?.completed && prev.date && prev.date !== '-' ? prev.date : today) : '-';
    return { id: def.id, title: def.title, description: def.description, completed: done, date };
  });

  const toStore: Record<string, { completed: boolean; date: string }> = {};
  result.forEach(r => { toStore[r.id] = { completed: r.completed, date: r.date }; });
  try { localStorage.setItem(storeKey, JSON.stringify(toStore)); } catch { /* ignore */ }

  return result;
}
