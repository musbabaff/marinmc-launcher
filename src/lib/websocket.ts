import { getApiBaseUrl } from './api.ts';

export const getWsUrl = (): string => {
  const apiUrl = getApiBaseUrl();
  // Derive ws/wss from http/https
  return apiUrl.replace(/^http/, 'ws').replace('/api', '/ws');
};

type WsCallback = (data: any) => void;

class WebSocketManager {
  private socket: WebSocket | null = null;
  private listeners: Record<string, WsCallback[]> = {};
  private reconnectTimeout: any = null;
  private activeUsername: string | null = null;
  private reconnectInterval = 5000;

  public connect(username: string) {
    if (this.socket && this.activeUsername === username && 
       (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('[WebSocket] Already connected or connecting as:', username);
      return;
    }

    this.activeUsername = username;
    
    let token = '';
    try {
      const stored = localStorage.getItem('marinmc_session');
      if (stored) {
        const session = JSON.parse(stored);
        token = session.token || '';
      }
    } catch (e) {
      console.warn('[WebSocket] Failed to read token from session storage:', e);
    }

    const url = `${getWsUrl()}?username=${encodeURIComponent(username)}&token=${encodeURIComponent(token)}`;

    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      try {
        this.socket.close();
      } catch (err) {
        console.warn('[WebSocket] Error closing old socket:', err);
      }
    }

    console.log('[WebSocket] Connecting to:', url);
    try {
      this.socket = new WebSocket(url);


      this.socket.onopen = () => {
        console.log('[WebSocket] Connected as:', username);
        this.emit('connection', { connected: true });
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.event && message.data) {
            this.emit(message.event, message.data);
          }
        } catch (err) {
          console.warn('[WebSocket] Error parsing message:', event.data);
        }
      };

      this.socket.onclose = (e) => {
        console.log('[WebSocket] Connection closed:', e.reason);
        this.emit('connection', { connected: false });
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        console.error('[WebSocket] Error:', err);
      };
    } catch (err) {
      console.error('[WebSocket] Connection error:', err);
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.activeUsername = null;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public send(event: string, data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, data }));
    } else {
      console.warn('[WebSocket] Cannot send, socket not connected.', { event, data });
    }
  }

  public addListener(event: string, callback: WsCallback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.removeListener(event, callback);
  }

  public removeListener(event: string, callback: WsCallback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  private emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error('[WebSocket] Error in event listener:', err);
        }
      });
    }
  }

  private scheduleReconnect() {
    if (!this.activeUsername) return; // Explicitly disconnected
    if (this.reconnectTimeout) return;

    console.log(`[WebSocket] Scheduling reconnect in ${this.reconnectInterval}ms...`);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.activeUsername) {
        this.connect(this.activeUsername);
      }
    }, this.reconnectInterval);
  }
}

export const wsManager = new WebSocketManager();
