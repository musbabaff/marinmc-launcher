export interface PlayerCount {
  online: number;
  max: number;
}

export interface ServerInfo {
  id: string;
  name: string;
  ip: string;
  mode: string;
  description: string;
  playerCount: number;
  maxPlayers: number;
  tags: string[];
  artworkUrl?: string;
  themeColor: string; // e.g. 'teal', 'purple', 'orange'
  
  // Legacy fields for backward compatibility with ServerDetailPage
  port: number;
  online: boolean;
  players: PlayerCount;
  version: string;
  ping: number;
  bannerUrl?: string;
}
