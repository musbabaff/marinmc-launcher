export interface PlayerCount {
  online: number;
  max: number;
}

export interface ServerInfo {
  id: string;
  name: string;
  ip: string;
  port: number;
  description: string;
  online: boolean;
  players: PlayerCount;
  version: string;
  ping: number;
  bannerUrl?: string;
}
