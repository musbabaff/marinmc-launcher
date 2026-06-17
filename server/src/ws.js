import { WebSocketServer } from 'ws';
import { dbAll, dbRun, dbGet } from './db.js';

// Map to store active connections: username -> ws
const clients = new Map();

export const isUserOnline = (username) => clients.has(username.toLowerCase());

export const initWebSocket = (server) => {
  const wss = new WebSocketServer({ noServer: true });

  console.log('[WebSocket] WebSocket Server initialized.');

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
        if (message.event === 'chat:message') {
          const { recipient, content, time, fileAttachment, voiceDuration } = message.data;
          const recipientId = recipient.toLowerCase();

          console.log(`[WebSocket] Message from ${username} to ${recipient}: ${content}`);

          // Save to sender message logs (for persistence)
          const msgId = Math.random().toString(36).substr(2, 9);
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
          const recipientMsgId = Math.random().toString(36).substr(2, 9);
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
          console.log(`[WebSocket] Lobby message from ${username}: ${content}`);
          
          const packet = JSON.stringify({
            event: 'lobby:message',
            data: {
              id: Math.random().toString(36).substr(2, 9),
              sender: username,
              content,
              time
            }
          });

          clients.forEach(wsClient => {
            if (wsClient.readyState === 1) { // WebSocket.OPEN
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

  // Live Lobby Chat Simulation Interval
  const LOBBY_BOT_NAMES = ['Steve', 'Alex', '172px', 'masaya46', 'cuvsa', 'zakhbear', 'daaaavidds'];
  const LOBBY_BOT_MESSAGES = [
    'Sa beyler, Towny\'e gelcek var mı?',
    'Beyler lobi neden bu kadar kalabalık bugün?',
    'Son güncellemeyle FPS değerleri çok iyi olmuş yalnız.',
    'Admin bey markete yeni pelerinler ne zaman gelecek?',
    'Survival klan alımı vardır, pm atın.',
    'Ejderha kanatları bende aşırı iyi duruyor abi.',
    'oyna.marinmc.com ping değerleriniz kaç? bende 15ms',
    'Optifine yerine Sodium kullanın, başlatıcıda zaten yüklü geliyor'
  ];

  // Live Lobby Chat Simulation Interval disabled to avoid mock/simulated traffic

  // Handle upgrade request from Express server
  server.on('upgrade', async (request, socket, head) => {
    const host = request.headers.host || 'localhost:3000';
    const url = new URL(request.url, `http://${host}`);
    const pathname = url.pathname;

    console.log(`[WebSocket Upgrade] request.url: ${request.url}`);
    console.log(`[WebSocket Upgrade] parsed pathname: ${pathname}`);

    if (pathname === '/ws') {
      const username = url.searchParams.get('username');
      const token = url.searchParams.get('token');
      console.log(`[WebSocket Upgrade] credentials -> username: ${username}, token: ${token}`);

      if (!username || !token) {
        console.warn('[WebSocket Upgrade] Missing username or token');
        socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }

      try {
        const user = await dbGet('SELECT * FROM users WHERE LOWER(username) = ? AND token = ?', [username.toLowerCase(), token]);
        console.log('[WebSocket Upgrade] database user lookup:', user);
        if (!user) {
          console.warn(`[WebSocket Upgrade] Token mismatch or user not found in DB for: ${username}`);
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
    } else {
      // Create contact if it doesn't exist
      await dbRun(`
        INSERT INTO contacts (username, contact_id, name, avatar, last_message, time, unread)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        username,
        contactId,
        contactId.charAt(0).toUpperCase() + contactId.slice(1),
        `https://minotar.net/avatar/${contactId}/48`,
        content,
        time,
        incrementUnread
      ]);
    }
  } catch (err) {
    console.error('[WebSocket] Update last message failed:', err.message);
  }
}


