export interface GameProfile {
  id: string;
  name: string;
  version: string;
  type: 'vanilla' | 'forge' | 'fabric';
}

export interface LaunchOptions {
  ram: number;       // in MB
  jvmArgs: string;
  username: string;
  version: string;
}
