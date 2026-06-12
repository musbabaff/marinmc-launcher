import express from 'express';
import cors from 'cors';
import http from 'http';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import { z } from 'zod';
import { ensureDbInitialized, dbGet, dbRun, dbAll } from './db.js';
import { initWebSocket } from './ws.js';

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

// --- USER PROFILE & STATS ---
router.get('/users/:username/profile', validateUsername, async (req, res) => {
  const username = req.params.username;
  try {
    let user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      const lastLogin = new Date().toLocaleString('tr-TR');
      await dbRun('INSERT INTO users (username, total_play_time, last_login, coins) VALUES (?, ?, ?, ?)', [username, 124, lastLogin, 500]);
      user = { username, total_play_time: 124, last_login: lastLogin, coins: 500 };
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

router.put('/users/:username/profile', validateUsername, async (req, res) => {
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
    
    // Default legendary mock list of players to ensure a complete leaderboard (10 items)
    const mockPlayers = [
      { username: '172px', totalPlayTime: 852, lastLogin: 'Bugün 12:44', coins: 4500, status: 'online', server: 'Survival' },
      { username: 'daaaavidds', totalPlayTime: 712, lastLogin: 'Bugün 13:10', coins: 3800, status: 'idle', server: 'Towny' },
      { username: 'masaya46', totalPlayTime: 590, lastLogin: 'Dün 20:15', coins: 2900, status: 'online', server: 'Skyblock' },
      { username: 'cuvsa', totalPlayTime: 440, lastLogin: '08.06.2026', coins: 1200, status: 'offline', server: '-' },
      { username: 'zakhbear', totalPlayTime: 384, lastLogin: '07.06.2026', coins: 950, status: 'offline', server: '-' },
      { username: 'wtfbroimlagging', totalPlayTime: 290, lastLogin: '05.06.2026', coins: 640, status: 'offline', server: '-' },
      { username: 'wtfbro', totalPlayTime: 210, lastLogin: '04.06.2026', coins: 520, status: 'offline', server: '-' },
      { username: 'Steve', totalPlayTime: 180, lastLogin: '02.06.2026', coins: 500, status: 'offline', server: '-' },
      { username: 'Alex', totalPlayTime: 150, lastLogin: '01.06.2026', coins: 500, status: 'offline', server: '-' }
    ];

    const merged = [];
    const seen = new Set();

    dbUsers.forEach((u) => {
      seen.add(u.username.toLowerCase());
      merged.push({
        username: u.username,
        totalPlayTime: u.total_play_time,
        lastLogin: u.last_login || 'Bugün',
        coins: u.coins !== undefined ? u.coins : 500,
        status: 'offline',
        server: '-'
      });
    });

    mockPlayers.forEach((p) => {
      if (!seen.has(p.username.toLowerCase())) {
        merged.push(p);
      }
    });

    merged.sort((a, b) => b.totalPlayTime - a.totalPlayTime);
    const result = merged.slice(0, 10).map((p, index) => ({
      rank: index + 1,
      ...p
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- COSMETICS ---
router.get('/users/:username/cosmetics', validateUsername, async (req, res) => {
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

router.put('/users/:username/cosmetics', validateUsername, async (req, res) => {
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
router.get('/chats/:username/contacts', validateUsername, async (req, res) => {
  const username = req.params.username;
  try {
    const contacts = await dbAll('SELECT * FROM contacts WHERE username = ?', [username]);
    if (contacts.length === 0) {
      const initial = [
        { contact_id: 'solmazzz', name: 'Solmazzz', avatar: 'https://minotar.net/avatar/Solmazzz/48', status: 'idle', last_message: "Selam dostum! MarinMC Launcher'ın yeni tasarımı nasıl olmuş?", time: '20:15', type: 'pinned', unread: 1, favorite: 0 },
        { contact_id: 'support', name: 'MarinMC Destek', avatar: 'https://minotar.net/avatar/MHF_Question/48', status: 'online', last_message: 'Destek kanalımıza hoş geldiniz. Sorularınızı buradan iletebilirsiniz.', time: 'Dün', type: 'dm', unread: 0, favorite: 0 },
        { contact_id: 'admin', name: 'Admin', avatar: 'https://minotar.net/avatar/MHF_Herobrine/48', status: 'offline', last_message: 'Görsel testler tamamlandı. Her şey harika çalışıyor!', time: '08.06', type: 'dm', unread: 0, favorite: 0 }
      ];
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

router.put('/chats/:username/contacts', validateUsername, async (req, res) => {
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

router.get('/chats/:username/messages', validateUsername, async (req, res) => {
  const username = req.params.username;
  try {
    const messages = await dbAll('SELECT * FROM messages WHERE username = ?', [username]);
    if (messages.length === 0) {
      const initial = {
        solmazzz: [{ id: 'm1', sender: 'Solmazzz', content: "Selam dostum! MarinMC Launcher'ın yeni tasarımı nasıl olmuş?", time: '20:15', is_self: 0 }],
        support: [{ id: 'm2', sender: 'MarinMC Destek', content: 'Destek kanalımıza hoş geldiniz. Sorularınızı buradan iletebilirsiniz.', time: 'Dün 18:00', is_self: 0 }],
        admin: [{ id: 'm3', sender: 'Admin', content: 'Görsel testler tamamlandı. Her şey harika çalışıyor!', time: '08.06.2026 15:30', is_self: 0 }]
      };

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

router.put('/chats/:username/messages', validateUsername, async (req, res) => {
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
  },
  {
    id: 'survival',
    name: 'MarinMC Survival',
    ip: 'oyna.marinmc.com',
    port: 25565,
    mode: 'SURVIVAL',
    description: 'Klasik hayatta kalma deneyimi, iddialı zindanlar ve klanlar.',
    playerCount: 128,
    maxPlayers: 1000,
    tags: ['KLAN', 'DUNGEON', 'PVP'],
    themeColor: 'purple',
    artworkUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=60',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
    online: true,
    players: { online: 128, max: 1000 },
    version: '1.21.8',
    ping: 22
  },
  {
    id: 'skyblock',
    name: 'MarinMC Skyblock',
    ip: 'oyna.marinmc.com',
    port: 25565,
    mode: 'SKYBLOCK',
    description: 'Gelişmiş ada görevleri, adalar arası ticaret ve özel minyonlar.',
    playerCount: 92,
    maxPlayers: 1000,
    tags: ['SKYBLOCK', 'MINIONS', 'TRADE'],
    themeColor: 'orange',
    artworkUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=60',
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
    online: true,
    players: { online: 92, max: 1000 },
    version: '1.21.8',
    ping: 18
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
