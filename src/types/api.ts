// MarinMC Backend API Type Definitions

export interface ApiError {
  status: number;
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: ApiError;
}

// Servers
export interface GameServer {
  id: string;
  name: string;
  mode: 'TOWNY' | 'SURVIVAL' | 'CREATIVE' | 'SKYBLOCK' | 'BEDWARS' | 'SKYWARS';
  ip: string;
  port: number;
  onlinePlayers: number;
  maxPlayers: number;
  status: 'online' | 'offline' | 'maintenance';
  version: string;
  motd: string;
  iconUrl?: string;
}

export interface ServerPlayer {
  username: string;
  uuid: string;
  joinedAt: string;
}

// News
export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: 'update' | 'event' | 'maintenance' | 'announcement';
  imageUrl?: string;
  author: string;
  authorAvatar?: string;
  publishedAt: string;
  tags: string[];
}

// Relay Chat
export interface RelayChannel {
  id: string;
  name: string;
  type: 'global' | 'server' | 'dm' | 'group';
  icon?: string;
  memberCount?: number;
  lastMessage?: RelayMessage;
  unreadCount: number;
}

export interface RelayMessage {
  id: string;
  channelId: string;
  sender: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'system';
  reactions?: { emoji: string; count: number; reacted: boolean }[];
}

// Profile
export interface PlayerProfile {
  uuid: string;
  username: string;
  rank: string;
  joinDate: string;
  lastSeen: string;
  playtime: number;
  skinUrl: string;
  capeUrl?: string;
  bio?: string;
  socialLinks?: { platform: string; url: string }[];
}

export interface PlayerStats {
  kills: number;
  deaths: number;
  wins: number;
  losses: number;
  blocksPlaced: number;
  blocksBroken: number;
  playtimeHours: number;
  achievementsUnlocked: number;
  totalAchievements: number;
}

// Leaderboard
export interface LeaderboardEntry {
  rank: number;
  username: string;
  uuid: string;
  score: number;
  category: string;
}
