import { apiClient } from './api-client';
import type {
  ApiResponse,
  GameServer,
  ServerPlayer,
  NewsArticle,
  RelayChannel,
  RelayMessage,
  PlayerProfile,
  PlayerStats,
  LeaderboardEntry,
} from '../types/api';

/**
 * MarinMC Backend API Service
 * All methods return typed ApiResponse<T> with success/error handling.
 */
class MarinMCApi {
  // ─── Auth ───────────────────────────────────────────────

  /** Login with username and password */
  async login(username: string, password: string) {
    return apiClient.post<{ token: string; profile: PlayerProfile }>('/auth/login', { username, password });
  }

  /** Register a new account */
  async register(username: string, email: string, password: string) {
    return apiClient.post<{ token: string }>('/auth/register', { username, email, password });
  }

  /** Logout current session */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  }

  /** Refresh auth token */
  async refreshToken() {
    return apiClient.post<{ token: string }>('/auth/refresh');
  }

  /** Validate current session */
  async validateSession() {
    return apiClient.get<{ valid: boolean }>('/auth/validate');
  }

  // ─── Servers ────────────────────────────────────────────

  /** Get all available game servers */
  async getServers(): Promise<ApiResponse<GameServer[]>> {
    return apiClient.get<GameServer[]>('/servers');
  }

  /** Get status of a specific server */
  async getServerStatus(serverId: string): Promise<ApiResponse<GameServer>> {
    return apiClient.get<GameServer>(`/servers/${serverId}`);
  }

  /** Get online players on a server */
  async getServerPlayers(serverId: string): Promise<ApiResponse<ServerPlayer[]>> {
    return apiClient.get<ServerPlayer[]>(`/servers/${serverId}/players`);
  }

  // ─── News ───────────────────────────────────────────────

  /** Get news feed with pagination */
  async getNewsFeed(page = 1, limit = 10): Promise<ApiResponse<NewsArticle[]>> {
    return apiClient.get<NewsArticle[]>('/news', {
      page: String(page),
      limit: String(limit),
    });
  }

  /** Get a single news article by ID */
  async getNewsArticle(id: string): Promise<ApiResponse<NewsArticle>> {
    return apiClient.get<NewsArticle>(`/news/${id}`);
  }

  // ─── Relay Chat ─────────────────────────────────────────

  /** Get available relay channels */
  async getChannels(): Promise<ApiResponse<RelayChannel[]>> {
    return apiClient.get<RelayChannel[]>('/relay/channels');
  }

  /** Get messages for a channel */
  async getMessages(channelId: string, before?: string, limit = 50): Promise<ApiResponse<RelayMessage[]>> {
    const params: Record<string, string> = { limit: String(limit) };
    if (before) params.before = before;
    return apiClient.get<RelayMessage[]>(`/relay/channels/${channelId}/messages`, params);
  }

  /** Send a message to a channel */
  async sendMessage(channelId: string, content: string): Promise<ApiResponse<RelayMessage>> {
    return apiClient.post<RelayMessage>(`/relay/channels/${channelId}/messages`, { content });
  }

  /** Get currently online friends */
  async getOnlineFriends(): Promise<ApiResponse<{ username: string; status: string; server?: string }[]>> {
    return apiClient.get('/relay/friends/online');
  }

  // ─── Profile ────────────────────────────────────────────

  /** Get player profile (self if no username provided) */
  async getProfile(username?: string): Promise<ApiResponse<PlayerProfile>> {
    const path = username ? `/profile/${username}` : '/profile/me';
    return apiClient.get<PlayerProfile>(path);
  }

  /** Update own profile */
  async updateProfile(data: Partial<PlayerProfile>): Promise<ApiResponse<PlayerProfile>> {
    return apiClient.put<PlayerProfile>('/profile/me', data);
  }

  /** Get skin history for a player */
  async getSkinHistory(username: string): Promise<ApiResponse<{ url: string; date: string }[]>> {
    return apiClient.get(`/profile/${username}/skins`);
  }

  // ─── Leaderboard ────────────────────────────────────────

  /** Get leaderboard for a category */
  async getLeaderboard(category: string, limit = 50): Promise<ApiResponse<LeaderboardEntry[]>> {
    return apiClient.get<LeaderboardEntry[]>(`/leaderboard/${category}`, {
      limit: String(limit),
    });
  }

  // ─── Stats ──────────────────────────────────────────────

  /** Get player stats (self if no username) */
  async getPlayerStats(username?: string): Promise<ApiResponse<PlayerStats>> {
    const path = username ? `/stats/${username}` : '/stats/me';
    return apiClient.get<PlayerStats>(path);
  }
}

/** Singleton MarinMC API instance */
export const marinmcApi = new MarinMCApi();
