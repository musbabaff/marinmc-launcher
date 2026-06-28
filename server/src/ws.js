import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';

// Limits to keep a single client from sending oversized/abusive payloads.
const MAX_WS_PAYLOAD = 256 * 1024; // 256 KB
const MAX_CONTENT_LENGTH = 4000;
import { dbAll, dbRun, dbGet } from './db.js';

// Unpredictable identifier (96 bits) for chat messages.
const genId = () => crypto.randomBytes(12).toString('hex');

// Map to store active connections: username -> ws
const clients = new Map();
let emoteWss = null;

export const isUserOnline = (username) => clients.has(username.toLowerCase());

// Real number of launcher users currently connected over WebSocket.
export const getOnlineCount = () => clients.size;

// Push an event to a single connected user (no-op if they're offline).
export const sendToUser = (username, event, data) => {
  const ws = clients.get(String(username || '').toLowerCase());
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event, data }));
    return true;
  }
  return false;
};

export const initWebSocket = (server) => {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_WS_PAYLOAD });
  emoteWss = new WebSocketServer({ noServer: true, maxPayload: MAX_WS_PAYLOAD });

  console.log('[WebSocket] WebSocket Server initialized.');
  console.log('[WebSocket] Emote WebSocket Server initialized.');

  // Set up emoteWss connection logic
  emoteWss.on('connection', (ws, request) => {
    console.log('[EmoteWS] Client connected.');
    
    // Send welcome frame to turn off compression
    ws.send(JSON.stringify({ compression: 0 }));

    ws.on('message', (message, isBinary) => {
      // Broadcast binary or text frame to all other connected clients
      emoteWss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message, { binary: isBinary });
        }
      });
    });

    ws.on('close', () => {
      console.log('[EmoteWS] Client disconnected.');
    });

    ws.on('error', (err) => {
      console.error('[EmoteWS] Socket error:', err.message);
    });
  });

  wss.on('connection', async (ws, request) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const username = url.searchParams.get('username');
    const userId = username.toLowerCase();

    clients.set(userId, ws);
    console.log(`[WebSocket] User connected: ${username} (Active count: ${clients.size})`);

    // Broadcast online status to friends
    await broadcastStatus(userId, 'online');

    ws.on('message', async (messageData) => {
      try {
        const message = JSON.parse(messageData);
        if (!message || typeof message.event !== 'string' || typeof message.data !== 'object' || message.data === null) {
          return;
        }
        if (message.event === 'chat:message') {
          const { recipient, content, time, fileAttachment, voiceDuration } = message.data;
          // Validate shape before persisting/routing.
          if (typeof recipient !== 'string' || !recipient.trim() ||
              typeof content !== 'string' || content.length === 0 ||
              content.length > MAX_CONTENT_LENGTH) {
            return;
          }
          const recipientId = recipient.toLowerCase();

          // Save to sender message logs (for persistence)
          const msgId = genId();
          await dbRun(`
            INSERT INTO messages (id, username, contact_id, sender, content, time, is_self, file_name, file_size, is_image, voice_duration)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            msgId, 
            userId, 
            recipientId, 
            'Sen', 
            content, 
            time, 
            1, 
            fileAttachment?.name || null,
            fileAttachment?.size || null,
            fileAttachment?.isImage ? 1 : 0,
            voiceDuration || null
          ]);

          // Save to recipient message logs (recipient sees sender name as sender)
          const recipientMsgId = genId();
          await dbRun(`
            INSERT INTO messages (id, username, contact_id, sender, content, time, is_self, file_name, file_size, is_image, voice_duration)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            recipientMsgId, 
            recipientId, 
            userId, 
            username, 
            content, 
            time, 
            0, 
            fileAttachment?.name || null,
            fileAttachment?.size || null,
            fileAttachment?.isImage ? 1 : 0,
            voiceDuration || null
          ]);

          // Update contact last message & unread badge for both sides
          await updateLastMessage(userId, recipientId, content, time, 0);
          await updateLastMessage(recipientId, userId, content, time, 1);

          // Route to recipient if online
          const recipientWs = clients.get(recipientId);
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
              event: 'chat:message',
              data: {
                id: msgId,
                sender: username,
                content,
                time,
                fileAttachment,
                voiceDuration
              }
            }));
          }
        } else if (message.event === 'lobby:message') {
          const { content, time } = message.data;
          if (typeof content !== 'string' || content.length === 0 || content.length > MAX_CONTENT_LENGTH) {
            return;
          }

          const packet = JSON.stringify({
            event: 'lobby:message',
            data: {
              id: genId(),
              sender: username,
              content,
              time
            }
          });

          clients.forEach(wsClient => {
            if (wsClient.readyState === WebSocket.OPEN) {
              wsClient.send(packet);
            }
          });
        }
      } catch (err) {
        console.error('[WebSocket] Error processing message:', err.message);
      }
    });

    ws.on('close', async () => {
      clients.delete(userId);
      console.log(`[WebSocket] User disconnected: ${username} (Active count: ${clients.size})`);
      // Broadcast offline status to friends
      await broadcastStatus(userId, 'offline');
    });
  });

  // Handle upgrade request from Express server
  server.on('upgrade', async (request, socket, head) => {
    const host = request.headers.host || 'localhost:3000';
    const url = new URL(request.url, `http://${host}`);
    const pathname = url.pathname;

    console.log(`[WebSocket Upgrade] parsed pathname: ${pathname}`);

    if (pathname === '/ws') {
      const username = url.searchParams.get('username');
      // Prefer the token from the Sec-WebSocket-Protocol header (sent as
      // "token.<value>"); fall back to the legacy query param for older clients.
      const protoHeader = request.headers['sec-websocket-protocol'] || '';
      const headerToken = protoHeader
        .split(',')
        .map((p) => p.trim())
        .find((p) => p.startsWith('token.'));
      const token = headerToken ? headerToken.slice('token.'.length) : url.searchParams.get('token');

      if (!username || !token) {
        console.warn('[WebSocket Upgrade] Missing username or token');
        socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }

      try {
        const user = await dbGet('SELECT * FROM users WHERE LOWER(username) = ? AND token = ?', [username.toLowerCase(), token]);
        if (!user) {
          console.warn(`[WebSocket Upgrade] Token mismatch or user not found in DB for: ${username}`);
          socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
          socket.destroy();
          return;
        }
        if (user.token_expires_at != null && Number(user.token_expires_at) < Date.now()) {
          console.warn(`[WebSocket Upgrade] Expired token for: ${username}`);
          socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
          socket.destroy();
          return;
        }
      } catch (err) {
        console.error('[WebSocket Upgrade] DB error during upgrade handshake:', err.message);
        socket.write('HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }

      console.log('[WebSocket Upgrade] Upgrading socket connection...');
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else if (pathname === '/emotes') {
      console.log('[WebSocket Upgrade] Upgrading emote socket connection...');
      emoteWss.handleUpgrade(request, socket, head, (ws) => {
        emoteWss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });
};

// Helper: Broadcast online status to friends of a user
async function broadcastStatus(userId, status) {
  try {
    // Find all users who have this user in their contacts
    const contactsWithUs = await dbAll('SELECT username FROM contacts WHERE contact_id = ?', [userId]);
    
    contactsWithUs.forEach(c => {
      const friendId = c.username.toLowerCase();
      const friendWs = clients.get(friendId);
      if (friendWs && friendWs.readyState === WebSocket.OPEN) {
        friendWs.send(JSON.stringify({
          event: 'status:change',
          data: {
            contactId: userId,
            status: status
          }
        }));
      }
    });

    // Update status in SQLite contacts list
    await dbRun('UPDATE contacts SET status = ? WHERE contact_id = ?', [status, userId]);
  } catch (err) {
    console.error('[WebSocket] Broadcast status failed:', err.message);
  }
}

// Helper: Update contact's last message
async function updateLastMessage(username, contactId, content, time, incrementUnread) {
  try {
    const contact = await dbGet('SELECT * FROM contacts WHERE username = ? AND contact_id = ?', [username, contactId]);
    if (contact) {
      const unreadCount = contact.unread + incrementUnread;
      await dbRun(`
        UPDATE contacts 
        SET last_message = ?, time = ?, unread = ? 
        WHERE username = ? AND contact_id = ?
      `, [content, time, unreadCount, username, contactId]);
    }
    // If contact doesn't exist (was deleted), do NOT re-create it
  } catch (err) {
    console.error('[WebSocket] Update last message failed:', err.message);
  }
}


