import { WebSocketServer } from 'ws';
import { dbAll, dbRun, dbGet } from './db.js';

// Map to store active connections: username -> ws
const clients = new Map();

export const initWebSocket = (server) => {
  const wss = new WebSocketServer({ noServer: true });

  console.log('[WebSocket] WebSocket Server initialized.');

  wss.on('connection', async (ws, request) => {
    // Parse username from query params: ?username=...
    const url = new URL(request.url, `http://${request.headers.host}`);
    const username = url.searchParams.get('username');

    if (!username) {
      console.warn('[WebSocket] Connection rejected: No username provided.');
      ws.close(4001, 'Username is required');
      return;
    }

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
  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    if (pathname === '/ws') {
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


