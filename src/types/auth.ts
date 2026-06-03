export interface UserSession {
  id: string;
  name: string;
  token: string;
  type: 'cracked' | 'ms';
  avatar: string;
}
