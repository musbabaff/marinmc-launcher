import express from 'express';
import cors from 'cors';
import http from 'http';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import { z } from 'zod';
import crypto from 'crypto';
import { ensureDbInitialized, dbGet, dbRun, dbAll } from './db.js';
import { initWebSocket, isUserOnline } from './ws.js';

const app = express();
const port = process.env.PORT || 3000;

// 1. Helmet for Secure HTTP Headers
app.use(helmet());

// 2. Rate Limiting to prevent DDoS/Brute-force
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyiniz.' }
});
app.use('/api/', apiLimiter);

// 3. HTTP Parameter Pollution protection
app.use(hpp());

// 4. CORS configuration
app.use(cors({
  origin: '*', // Allow all origins for launcher (Electron app runs locally on file:// or localhost)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Self-healing database initialization middleware (crucial for Vercel Serverless cold starts)
app.use(async (req, res, next) => {
  try {
    await ensureDbInitialized();
    next();
  } catch (err) {
    console.error('[DB] Failed to ensure database is initialized:', err);
    res.status(500).json({ error: 'Veritabanı bağlantısı kurulamadı.' });
  }
});

const router = express.Router();

// --- INPUT VALIDATION SCHEMAS (ZOD) ---

const usernameParamSchema = z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/);

const validateUsername = (req, res, next) => {
  const result = usernameParamSchema.safeParse(req.params.username);
  if (!result.success) {
    return res.status(400).json({ error: 'Geçersiz kullanıcı adı formatı.' });
  }
  next();
};

const profileSchema = z.object({
  totalPlayTime: z.number().nonnegative().optional(),
  lastLogin: z.string().max(100).optional(),
  coins: z.number().nonnegative().optional(),
  playSessions: z.array(z.object({
    id: z.string().max(50).optional(),
    date: z.string().max(100),
    duration: z.string().max(50),
    server: z.string().max(100)
  })).optional()
});

const cosmeticsSchema = z.object({
  skinType: z.enum(['username', 'file']),
  skinVal: z.string().max(150000).optional(), // Max ~150KB for base64 skin files
  capeUrl: z.string().max(2048).optional(),
  purchasedCapes: z.array(z.string()).optional(),
  modelType: z.enum(['classic', 'slim']).optional(),
  wingsEnabled: z.boolean().optional(),
  coins: z.number().nonnegative().optional()
});

const screenshotSchema = z.object({
  title: z.string().min(1).max(100),
  url: z.string().min(1),
  username: z.string().min(3).max(30)
});

const contactsSchema = z.object({
  contacts: z.array(z.object({
    id: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
    name: z.string().max(100),
    avatar: z.string().max(2048),
    status: z.enum(['online', 'idle', 'offline']).optional(),
    lastMessage: z.string().max(2000).optional(),
    time: z.string().max(100).optional(),
    type: z.enum(['pinned', 'dm']).optional(),
    unread: z.number().nonnegative().optional(),
    favorite: z.boolean().optional()
  }))
});

const messagesSchema = z.object({
  messages: z.record(
    z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
    z.array(z.object({
      id: z.string().max(50).optional(),
      sender: z.string().max(100),
      content: z.string().max(2000),
      time: z.string().max(100),
      isSelf: z.boolean(),
      fileAttachment: z.object({
        name: z.string().max(255),
        size: z.string().max(50),
        isImage: z.boolean()
      }).optional(),
      voiceDuration: z.string().max(50).optional()
    }))
  )
});

const authSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(100)
});

const microsoftAuthSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  uuid: z.string().min(3).max(100),
  token: z.string().min(3).max(1000)
});

// --- AUTHENTICATION & SECURITY HELPERS ---

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [salt, hash] = storedHash.split(':');
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === testHash;
}

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Erişim engellendi. Token eksik.' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE token = ?', [token]);
    if (!user) {
      return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş oturum.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Kimlik doğrulama hatası.' });
  }
};

const authorizeUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Kimlik doğrulanmadı.' });
  }
  const paramUsername = req.params.username;
  if (paramUsername && paramUsername.toLowerCase() !== req.user.username.toLowerCase()) {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
  }
  next();
};

// --- AUTHENTICATION ROUTES ---

router.post('/auth/register', async (req, res) => {
  const validation = authSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Geçersiz veri formatı. Kullanıcı adı 3-30 harf/rakam/alt çizgi olmalı, şifre en az 6 karakter olmalıdır.', details: validation.error.format() });
  }

  const { username, password } = validation.data;
  const lowerUsername = username.toLowerCase();

  try {
    const existingUser = await dbGet('SELECT * FROM users WHERE LOWER(username) = ?', [lowerUsername]);
    
    if (existingUser) {
      if (existingUser.password_hash) {
        return res.status(400).json({ error: 'Bu kullanıcı adı zaten kayıtlı.' });
      }
      
      // Upgrade legacy user
      const passwordHash = hashPassword(password);
      const token = crypto.randomBytes(32).toString('hex');
      const lastLogin = new Date().toLocaleString('tr-TR');
      
      await dbRun('UPDATE users SET password_hash = ?, token = ?, last_login = ? WHERE LOWER(username) = ?', [
        passwordHash,
        token,
        lastLogin,
        lowerUsername
      ]);
      
      return res.json({
        success: true,
        token,
        session: {
          id: `offline-${lowerUsername}`,
          name: existingUser.username,
          token,
          type: 'cracked',
          avatar: `https://mc-heads.net/avatar/${existingUser.username}/64`
        }
      });
    }

    const passwordHash = hashPassword(password);
    const token = crypto.randomBytes(32).toString('hex');
    const lastLogin = new Date().toLocaleString('tr-TR');

    await dbRun('INSERT INTO users (username, total_play_time, last_login, coins, password_hash, token) VALUES (?, ?, ?, ?, ?, ?)', [
      username,
      0,
      lastLogin,
      500,
      passwordHash,
      token
    ]);

    res.json({
      success: true,
      token,
      session: {
        id: `offline-${lowerUsername}`,
        name: username,
        token,
        type: 'cracked',
        avatar: `https://mc-heads.net/avatar/${username}/64`
      }
    });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    res.status(500).json({ error: 'Kayıt sırasında bir hata oluştu.' });
  }
});

router.post('/auth/login', async (req, res) => {
  const validation = authSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Geçersiz veri formatı.', details: validation.error.format() });
  }

  const { username, password } = validation.data;
  const lowerUsername = username.toLowerCase();

  try {
    const user = await dbGet('SELECT * FROM users WHERE LOWER(username) = ?', [lowerUsername]);
    
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı. Lütfen önce Kayıt Ol sekmesini kullanarak kayıt olun.' });
    }

    if (!user.password_hash) {
      return res.status(400).json({ error: 'Bu hesap henüz güvenceye alınmamış. Lütfen önce Kayıt Ol sekmesini kullanarak şifre belirleyin.' });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Hatalı şifre. Lütfen tekrar deneyiniz.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const lastLogin = new Date().toLocaleString('tr-TR');

    await dbRun('UPDATE users SET token = ?, last_login = ? WHERE LOWER(username) = ?', [
      token,
      lastLogin,
      lowerUsername
    ]);

    res.json({
      success: true,
      token,
      session: {
        id: `offline-${lowerUsername}`,
        name: user.username,
        token,
        type: 'cracked',
        avatar: `https://mc-heads.net/avatar/${user.username}/64`
      }
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Giriş sırasında bir hata oluştu.' });
  }
});

router.post('/auth/microsoft-login', async (req, res) => {
  const validation = microsoftAuthSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Geçersiz veri formatı.', details: validation.error.format() });
  }

  const { username, uuid, token: msToken } = validation.data;
  const lowerUsername = username.toLowerCase();

  try {
    let user = await dbGet('SELECT * FROM users WHERE LOWER(username) = ?', [lowerUsername]);
    const serverToken = crypto.randomBytes(32).toString('hex');
    const lastLogin = new Date().toLocaleString('tr-TR');

    if (!user) {
      await dbRun('INSERT INTO users (username, total_play_time, last_login, coins, token) VALUES (?, ?, ?, ?, ?)', [
        username,
        0,
        lastLogin,
        500,
        serverToken
      ]);
    } else {
      await dbRun('UPDATE users SET token = ?, last_login = ? WHERE LOWER(username) = ?', [
        serverToken,
        lastLogin,
        lowerUsername
      ]);
    }

    res.json({
      success: true,
      token: serverToken,
      session: {
        id: uuid,
        name: username,
        token: serverToken,
        type: 'ms',
        avatar: `https://mc-heads.net/avatar/${username}/64`
      }
    });
  } catch (err) {
    console.error('[Auth] Microsoft login error:', err);
    res.status(500).json({ error: 'Microsoft girişi sırasında bir hata oluştu.' });
  }
});

// --- USER PROFILE & STATS ---
router.get('/users/:username/profile', validateUsername, authenticateToken, authorizeUser, async (req, res) => {
  const username = req.params.username;
  try {
    let user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      const lastLogin = new Date().toLocaleString('tr-TR');
      await dbRun('INSERT INTO users (username, total_play_time, last_login, coins) VALUES (?, ?, ?, ?)', [username, 0, lastLogin, 500]);
      user = { username, total_play_time: 0, last_login: lastLogin, coins: 500 };
    }
    const sessions = await dbAll('SELECT * FROM sessions WHERE username = ?', [username]);
    res.json({
      username: user.username,
      totalPlayTime: user.total_play_time,
      lastLogin: user.last_login,
      coins: user.coins !== undefined ? user.coins : 500,
      playSessions: sessions.map(s => ({
        id: s.id,
        date: s.date,
        duration: s.duration,
        server: s.server
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:username/profile', validateUsername, authenticateToken, authorizeUser, async (req, res) => {
  const username = req.params.username;
  
  // Zod validation
  const validation = profileSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Geçersiz veri formatı.', details: validation.error.format() });
  }
  
  const { totalPlayTime, lastLogin, coins, playSessions } = validation.data;
  try {
    let user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      await dbRun('INSERT INTO users (username, total_play_time, last_login, coins) VALUES (?, ?, ?, ?)', [
        username,
        totalPlayTime || 0,
        lastLogin || new Date().toLocaleString('tr-TR'),
        coins !== undefined ? coins : 500
      ]);
    } else {
      await dbRun('UPDATE users SET total_play_time = ?, last_login = ?, coins = ? WHERE username = ?', [
        totalPlayTime !== undefined ? totalPlayTime : user.total_play_time,
        lastLogin !== undefined ? lastLogin : user.last_login,
        coins !== undefined ? coins : (user.coins !== undefined ? user.coins : 500),
        username
      ]);
    }

    if (playSessions) {
      await dbRun('DELETE FROM sessions WHERE username = ?', [username]);
      for (const s of playSessions) {
        const sessionId = s.id || Math.random().toString(36).substring(2, 11);
        await dbRun('INSERT INTO sessions (id, username, date, duration, server) VALUES (?, ?, ?, ?, ?)', [
          sessionId,
          username,
          s.date,
          s.duration,
          s.server
        ]);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const dbUsers = await dbAll('SELECT username, total_play_time, last_login, coins FROM users ORDER BY total_play_time DESC LIMIT 10');
    
    const result = dbUsers.map((u, index) => {
      const online = isUserOnline(u.username);
      const totalPlayTimeHours = Math.round((u.total_play_time || 0) / 60);
      return {
        rank: index + 1,
        username: u.username,
        totalPlayTime: totalPlayTimeHours,
        lastLogin: u.last_login || 'Bugün',
        coins: u.coins !== undefined ? u.coins : 500,
        status: online ? 'online' : 'offline',
        server: online ? 'Towny' : '-'
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- COSMETICS ---
router.get('/users/:username/cosmetics', validateUsername, authenticateToken, authorizeUser, async (req, res) => {
  const username = req.params.username;
  try {
    const [cos, user] = await Promise.all([
      dbGet('SELECT * FROM cosmetics WHERE username = ?', [username]),
      dbGet('SELECT coins FROM users WHERE username = ?', [username])
    ]);
    
    const coins = user ? (user.coins !== undefined ? user.coins : 500) : 500;
    
    if (!cos) {
      res.json({
        skinType: 'username',
        skinVal: username,
        capeUrl: '',
        purchasedCapes: [],
        modelType: 'classic',
        wingsEnabled: true,
        coins
      });
    } else {
      let purchasedCapes = [];
      try {
        if (cos.purchased_capes) {
          purchasedCapes = JSON.parse(cos.purchased_capes);
        }
      } catch (e) {
        console.error('Failed to parse purchased_capes:', e);
      }
      res.json({
        skinType: cos.skin_type,
        skinVal: cos.skin_val,
        capeUrl: cos.cape_url,
        purchasedCapes,
        modelType: cos.model_type || 'classic',
        wingsEnabled: cos.wings_enabled !== 0,
        coins
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:username/cosmetics', validateUsername, authenticateToken, authorizeUser, async (req, res) => {
  const username = req.params.username;
  
  // Zod validation
  const validation = cosmeticsSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Geçersiz veri formatı.', details: validation.error.format() });
  }

  const { skinType, skinVal, capeUrl, purchasedCapes, modelType, wingsEnabled, coins } = validation.data;
  try {
    if (coins !== undefined) {
      await dbRun('UPDATE users SET coins = ? WHERE username = ?', [coins, username]);
    }
    
    const cos = await dbGet('SELECT * FROM cosmetics WHERE username = ?', [username]);
    const purchasedStr = purchasedCapes ? JSON.stringify(purchasedCapes) : null;
    const wingsVal = wingsEnabled !== undefined ? (wingsEnabled ? 1 : 0) : null;
    
    if (!cos) {
      await dbRun(`
        INSERT INTO cosmetics (username, skin_type, skin_val, cape_url, purchased_capes, model_type, wings_enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        username,
        skinType || 'username',
        skinVal || username,
        capeUrl || '',
        purchasedStr || '[]',
        modelType || 'classic',
        wingsVal !== null ? wingsVal : 1
      ]);
    } else {
      await dbRun(`
        UPDATE cosmetics
        SET skin_type = ?, skin_val = ?, cape_url = ?, purchased_capes = ?, model_type = ?, wings_enabled = ?
        WHERE username = ?
      `, [
        skinType || cos.skin_type,
        skinVal || cos.skin_val,
        capeUrl !== undefined ? capeUrl : cos.cape_url,
        purchasedStr !== null ? purchasedStr : cos.purchased_capes,
        modelType || cos.model_type,
        wingsVal !== null ? wingsVal : cos.wings_enabled,
        username
      ]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CHATS & FRIENDS ---
router.get('/chats/:username/contacts', validateUsername, authenticateToken, authorizeUser, async (req, res) => {
  const username = req.params.username;
  try {
    const contacts = await dbAll('SELECT * FROM contacts WHERE username = ?', [username]);
    if (contacts.length === 0) {
      const initial = [];
      for (const c of initial) {
        await dbRun(`
          INSERT INTO contacts (username, contact_id, name, avatar, status, last_message, time, type, unread, favorite)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [username, c.contact_id, c.name, c.avatar, c.status, c.last_message, c.time, c.type, c.unread, c.favorite]);
      }
      res.json(initial.map(c => ({
        id: c.contact_id,
        name: c.name,
        avatar: c.avatar,
        status: c.status,
        lastMessage: c.last_message,
        time: c.time,
        type: c.type,
        unread: c.unread,
        favorite: c.favorite === 1
      })));
    } else {
      res.json(contacts.map(c => ({
        id: c.contact_id,
        name: c.name,
        avatar: c.avatar,
        status: c.status,
        lastMessage: c.last_message,
        time: c.time,
        type: c.type,
        unread: c.unread,
        favorite: c.favorite === 1
      })));
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/chats/:username/contacts', validateUsername, authenticateToken, authorizeUser, async (req, res) => {
  const username = req.params.username;
  
  // Zod validation
  const validation = contactsSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Geçersiz veri formatı.', details: validation.error.format() });
  }

  const { contacts } = validation.data;
  try {
    await dbRun('DELETE FROM contacts WHERE username = ?', [username]);
    if (contacts) {
      for (const c of contacts) {
        await dbRun(`
          INSERT INTO contacts (username, contact_id, name, avatar, status, last_message, time, type, unread, favorite)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          username,
          c.id,
          c.name,
          c.avatar,
          c.status || 'offline',
          c.lastMessage || '',
          c.time || '',
          c.type || 'dm',
          c.unread || 0,
          c.favorite ? 1 : 0
        ]);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/chats/:username/messages', validateUsername, authenticateToken, authorizeUser, async (req, res) => {
  const username = req.params.username;
  try {
    const messages = await dbAll('SELECT * FROM messages WHERE username = ?', [username]);
    if (messages.length === 0) {
      const initial = {};

      for (const [contactId, msgs] of Object.entries(initial)) {
        for (const m of msgs) {
          await dbRun(`
            INSERT INTO messages (id, username, contact_id, sender, content, time, is_self)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [m.id, username, contactId, m.sender, m.content, m.time, m.is_self]);
        }
      }

      const resData = {};
      for (const [contactId, msgs] of Object.entries(initial)) {
        resData[contactId] = msgs.map(m => ({
          id: m.id,
          sender: m.sender,
          content: m.content,
          time: m.time,
          isSelf: m.is_self === 1
        }));
      }
      res.json(resData);
    } else {
      const resData = {};
      messages.forEach(m => {
        if (!resData[m.contact_id]) {
          resData[m.contact_id] = [];
        }
        resData[m.contact_id].push({
          id: m.id,
          sender: m.sender,
          content: m.content,
          time: m.time,
          isSelf: m.is_self === 1,
          fileAttachment: m.file_name ? {
            name: m.file_name,
            size: m.file_size,
            isImage: m.is_image === 1
          } : undefined,
          voiceDuration: m.voice_duration || undefined
        });
      });
      res.json(resData);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/chats/:username/messages', validateUsername, authenticateToken, authorizeUser, async (req, res) => {
  const username = req.params.username;
  
  // Zod validation
  const validation = messagesSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Geçersiz veri formatı.', details: validation.error.format() });
  }

  const { messages } = validation.data;
  try {
    await dbRun('DELETE FROM messages WHERE username = ?', [username]);
    if (messages) {
      for (const [contactId, msgs] of Object.entries(messages)) {
        for (const m of msgs) {
          await dbRun(`
            INSERT INTO messages (id, username, contact_id, sender, content, time, is_self, file_name, file_size, is_image, voice_duration)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            m.id || Math.random().toString(36).substring(2, 11),
            username,
            contactId,
            m.sender,
            m.content,
            m.time,
            m.isSelf ? 1 : 0,
            m.fileAttachment?.name || null,
            m.fileAttachment?.size || null,
            m.fileAttachment?.isImage ? 1 : 0,
            m.voiceDuration || null
          ]);
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- COMMUNITY GALLERY ---
router.get('/gallery/community', async (req, res) => {
  try {
    const list = await dbAll('SELECT * FROM community_screenshots ORDER BY date DESC LIMIT 30');
    res.json(list.map(item => ({
      id: item.id,
      url: item.url,
      title: item.title,
      username: item.username,
      likes: item.likes,
      date: item.date
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/gallery/community', authenticateToken, async (req, res) => {
  const validation = screenshotSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Geçersiz veri formatı.', details: validation.error.format() });
  }
  const { title, url, username } = validation.data;
  if (username.toLowerCase() !== req.user.username.toLowerCase()) {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
  }
  try {
    const id = Math.random().toString(36).substring(2, 11);
    const dateStr = new Date().toLocaleDateString('tr-TR');
    await dbRun(`
      INSERT INTO community_screenshots (id, url, title, username, likes, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, url, title, username, 0, dateStr]);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/gallery/community/:id/like', async (req, res) => {
  const { id } = req.params;
  try {
    const item = await dbGet('SELECT * FROM community_screenshots WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).json({ error: 'Görsel bulunamadı.' });
    }
    const nextLikes = (item.likes || 0) + 1;
    await dbRun('UPDATE community_screenshots SET likes = ? WHERE id = ?', [nextLikes, id]);
    res.json({ success: true, likes: nextLikes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- QUESTS & ACHIEVEMENTS ---
router.get('/users/:username/quests', validateUsername, authenticateToken, authorizeUser, async (req, res) => {
  const username = req.params.username;
  try {
    let list = await dbAll('SELECT * FROM quests WHERE username = ?', [username]);
    if (list.length === 0) {
      const initialQuests = [
        { id: 'q1', description: 'Lobi Sohbetine 1 Mesaj Yaz', progress: 0, target: 1, coins: 50, claimed: 0 },
        { id: 'q2', description: 'Bir Arkadaş Ekle', progress: 0, target: 1, coins: 100, claimed: 0 },
        { id: 'q3', description: 'Günde 30 dakika oyna', progress: 0, target: 30, coins: 150, claimed: 0 }
      ];
      for (const q of initialQuests) {
        await dbRun(`
          INSERT INTO quests (id, username, description, progress, target, coins, claimed)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [q.id, username, q.description, q.progress, q.target, q.coins, q.claimed]);
      }
      list = await dbAll('SELECT * FROM quests WHERE username = ?', [username]);
    }

    // Dynamically update progress on fetch
    const contacts = await dbAll('SELECT * FROM contacts WHERE username = ?', [username]);
    const user = await dbGet('SELECT total_play_time FROM users WHERE username = ?', [username]);

    const hasFriend = contacts.length > 0 ? 1 : 0;
    await dbRun('UPDATE quests SET progress = ? WHERE username = ? AND id = ? AND claimed = 0', [hasFriend, username, 'q2']);
    
    if (user) {
      const playedMin = Math.min(30, Math.max(0, user.total_play_time || 0));
      await dbRun('UPDATE quests SET progress = ? WHERE username = ? AND id = ? AND claimed = 0', [playedMin, username, 'q3']);
    }

    // Fetch again after updates
    list = await dbAll('SELECT * FROM quests WHERE username = ?', [username]);

    res.json(list.map(q => ({
      id: q.id,
      description: q.description,
      progress: q.progress,
      target: q.target,
      coins: q.coins,
      claimed: q.claimed === 1
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/:username/quests/:id/claim', validateUsername, authenticateToken, authorizeUser, async (req, res) => {
  const { username, id } = req.params;
  try {
    const quest = await dbGet('SELECT * FROM quests WHERE username = ? AND id = ?', [username, id]);
    if (!quest) {
      return res.status(404).json({ error: 'Görev bulunamadı.' });
    }
    if (quest.claimed === 1) {
      return res.status(400).json({ error: 'Ödül zaten alınmış.' });
    }
    if (quest.progress < quest.target) {
      return res.status(400).json({ error: 'Görev henüz tamamlanmadı.' });
    }

    await dbRun('UPDATE quests SET claimed = 1 WHERE username = ? AND id = ?', [username, id]);
    
    const user = await dbGet('SELECT coins FROM users WHERE username = ?', [username]);
    const nextCoins = (user ? user.coins : 500) + quest.coins;
    await dbRun('UPDATE users SET coins = ? WHERE username = ?', [nextCoins, username]);

    res.json({ success: true, coins: nextCoins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:username/achievements', validateUsername, authenticateToken, authorizeUser, async (req, res) => {
  const username = req.params.username;
  try {
    const initialAchievements = [
      { id: 'a1', title: 'İlk Adım', description: 'Yeni tasarımlı launcher\'a ilk kez giriş yap.', completed: 1, date: new Date().toLocaleDateString('tr-TR') },
      { id: 'a2', title: 'Mod Meraklısı', description: 'Mod Yöneticisinden ilk modunu indir.', completed: 0, date: '-' },
      { id: 'a3', title: 'Sosyal Keşif', description: 'Arkadaş listene ilk arkadaşını ekle.', completed: 0, date: '-' },
      { id: 'a4', title: 'Jeton Avcısı', description: 'Cüzdanında 1,000 veya daha fazla Jeton barındır.', completed: 0, date: '-' },
      { id: 'a5', title: 'Kozmetik Ustası', description: 'Gardıroptan ilk pelerin veya kanat kozmetiğini kuşan.', completed: 0, date: '-' },
      { id: 'a6', title: 'Zaman Bükücü', description: 'Toplam oynama süresini 10 saate ulaştır.', completed: 0, date: '-' },
      { id: 'a7', title: 'Relay Sohbetçisi', description: 'Relay Sohbet kanalında ilk mesajını gönder.', completed: 0, date: '-' },
      { id: 'a8', title: 'Fotoğrafçı', description: 'Galeri sayfasında ilk ekran görüntünü toplulukla paylaş.', completed: 0, date: '-' },
      { id: 'a9', title: 'Kusursuz Entegrasyon', description: 'Özel JVM optimizasyon ayarlarını aktif et.', completed: 0, date: '-' }
    ];

    for (const a of initialAchievements) {
      const exists = await dbGet('SELECT 1 FROM achievements WHERE username = ? AND id = ?', [username, a.id]);
      if (!exists) {
        await dbRun(`
          INSERT INTO achievements (id, username, title, description, completed, date)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [a.id, username, a.title, a.description, a.completed, a.date]);
      }
    }

    // Dynamically update achievements
    const user = await dbGet('SELECT coins, total_play_time FROM users WHERE username = ?', [username]);
    if (user) {
      // Jeton Avcısı (a4)
      if (user.coins >= 1000) {
        await dbRun('UPDATE achievements SET completed = 1, date = ? WHERE username = ? AND id = ? AND completed = 0', [new Date().toLocaleDateString('tr-TR'), username, 'a4']);
      }
      // Zaman Bükücü (a6) - total_play_time is stored in minutes in database
      if (user.total_play_time >= 600) {
        await dbRun('UPDATE achievements SET completed = 1, date = ? WHERE username = ? AND id = ? AND completed = 0', [new Date().toLocaleDateString('tr-TR'), username, 'a6']);
      }
    }

    // Fetch all updated achievements
    const list = await dbAll('SELECT * FROM achievements WHERE username = ?', [username]);

    res.json(list.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      completed: a.completed === 1,
      date: a.date
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:username/achievements', validateUsername, authenticateToken, authorizeUser, async (req, res) => {
  const username = req.params.username;
  const { achievements } = req.body;
  try {
    if (achievements) {
      for (const a of achievements) {
        const exists = await dbGet('SELECT 1 FROM achievements WHERE username = ? AND id = ?', [username, a.id]);
        if (!exists) {
          await dbRun(`
            INSERT INTO achievements (id, username, title, description, completed, date)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [a.id, username, a.title, a.description, a.completed ? 1 : 0, a.date || '-']);
        } else {
          await dbRun(`
            UPDATE achievements
            SET completed = ?, date = ?
            WHERE username = ? AND id = ?
          `, [a.completed ? 1 : 0, a.date || '-', username, a.id]);
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- STATS & SERVERS ---
const serversList = [
  {
    id: 'towny',
    name: 'MarinMC Towny',
    ip: 'oyna.marinmc.com',
    port: 25565,
    mode: 'TOWNY',
    description: 'Gelişmiş Towny deneyimi, özel ekonomi ve meslekler.',
    playerCount: 284,
    maxPlayers: 1000,
    tags: ['ECONOMY', 'JOBS', 'WAR'],
    themeColor: 'teal',
    artworkUrl: 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=600&auto=format&fit=crop&q=60',
    bannerUrl: 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=800&auto=format&fit=crop&q=80',
    online: true,
    players: { online: 284, max: 1000 },
    version: '1.21.8',
    ping: 15
  }
];

router.get('/stats/online-count', (req, res) => {
  const total = serversList.reduce((acc, s) => acc + s.playerCount, 0);
  res.json({ total });
});

router.get('/servers', (req, res) => {
  res.json(serversList);
});

app.use('/api', router);

// Setup standard HTTP server & hook up WebSockets
const server = http.createServer(app);

// Initialize DB and start server
const startServer = async () => {
  try {
    await ensureDbInitialized();
    
    // Bind WebSocket server to standard HTTP server
    initWebSocket(server);

    server.listen(port, () => {
      console.log(`[Server] Express API and WS server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('[Server] Failed to initialize DB or server:', err);
    process.exit(1);
  }
};

// Start the server ONLY if not running in a Vercel Serverless environment
if (!process.env.VERCEL) {
  startServer();
}

export default app;
