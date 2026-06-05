import * as net from 'net';
import * as os from 'os';
import * as path from 'path';

export class DiscordRPC {
  private clientId: string;
  private socket: net.Socket | null = null;
  private connected = false;
  private currentActivity: any = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  public connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.connected || this.socket) {
        resolve(true);
        return;
      }

      const pipePath = this.getPipePath();
      if (!pipePath) {
        console.log('[Discord RPC] Unsupported platform or no environment path found.');
        resolve(false);
        return;
      }

      console.log('[Discord RPC] Connecting to path:', pipePath);
      const socket = net.createConnection(pipePath);
      this.socket = socket;

      socket.on('connect', () => {
        this.connected = true;
        console.log('[Discord RPC] Connected successfully.');
        this.sendHandshake();
        if (this.currentActivity) {
          this.sendActivityData(this.currentActivity);
        }
        resolve(true);
      });

      socket.on('data', (data) => {
        // Handle incoming messages from Discord (handshake response, set_activity response, etc.)
        // We log it in dev but don't strictly need to parse it for fire-and-forget setActivity.
        console.log('[Discord RPC] Data received from socket.');
      });

      socket.on('error', (err) => {
        console.log('[Discord RPC] Socket error:', err.message);
        this.cleanup();
        this.scheduleReconnect();
        resolve(false);
      });

      socket.on('close', () => {
        console.log('[Discord RPC] Socket closed.');
        this.cleanup();
        this.scheduleReconnect();
        resolve(false);
      });
    });
  }

  private getPipePath(): string | null {
    if (process.platform === 'win32') {
      return '\\\\.\\pipe\\discord-ipc-0';
    } else {
      const envs = ['XDG_RUNTIME_DIR', 'TMPDIR', 'TMP', 'TEMP'];
      for (const env of envs) {
        const val = process.env[env];
        if (val) {
          return path.join(val, 'discord-ipc-0');
        }
      }
      return '/tmp/discord-ipc-0';
    }
  }

  private sendHandshake() {
    const payload = JSON.stringify({
      v: 1,
      client_id: this.clientId
    });
    this.sendPacket(0, payload);
  }

  private sendPacket(op: number, payload: string) {
    if (!this.socket || !this.connected) return;

    const payloadBuffer = Buffer.from(payload, 'utf8');
    const headerBuffer = Buffer.alloc(8);
    headerBuffer.writeInt32LE(op, 0);
    headerBuffer.writeInt32LE(payloadBuffer.length, 4);

    try {
      this.socket.write(Buffer.concat([headerBuffer, payloadBuffer]));
    } catch (err: any) {
      console.error('[Discord RPC] Failed to write packet:', err.message);
    }
  }

  private sendActivityData(activity: any) {
    const payload = JSON.stringify({
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity: activity
      },
      nonce: Math.random().toString(36).substring(2, 15)
    });
    this.sendPacket(1, payload);
  }

  public setActivity(details: string, state: string, serverName?: string, startTimestamp?: number) {
    const activity: any = {
      details: details,
      state: state,
      assets: {
        large_image: 'logo',
        large_text: 'MarinMC Network',
      },
      buttons: [
        {
          label: 'Web Sitesi',
          url: 'https://marinmc.com'
        },
        {
          label: 'Discord',
          url: 'https://discord.gg/marinmc'
        }
      ]
    };

    if (startTimestamp) {
      activity.timestamps = {
        start: startTimestamp
      };
    }

    if (serverName) {
      activity.assets.small_image = serverName.toLowerCase();
      activity.assets.small_text = serverName.toUpperCase();
    }

    this.currentActivity = activity;

    if (this.connected) {
      this.sendActivityData(activity);
    } else {
      this.connect();
    }
  }

  public clearActivity() {
    this.currentActivity = null;
    if (this.connected) {
      this.sendActivityData(null);
    }
  }

  private cleanup() {
    this.connected = false;
    this.socket = null;
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.currentActivity) {
        this.connect();
      }
    }, 15000);
  }

  public disconnect() {
    this.currentActivity = null;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {}
      this.cleanup();
    }
  }
}

export const discordRPC = new DiscordRPC('1245084931086094336');
