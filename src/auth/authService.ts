import { UserSession } from '../types/auth';
import { apiInstance, setAuthToken, clearAuthToken } from '../lib/api';

const SESSION_STORE_NAME = 'marinmc_session';
const PROFILES_STORE_NAME = 'marinmc_profiles';

// In-memory plaintext tokens (never persisted in the clear). Populated on write
// and by hydrateAuth() on startup. Keyed by session id.
const tokenCache = new Map<string, string>();

function fixAvatar(session: any): any {
  if (session && session.avatar && session.avatar.includes('mc-heads.net')) {
    session.avatar = session.avatar.replace('mc-heads.net', 'minotar.net');
  }
  return session;
}

// Encrypt a token at rest via the OS keychain (safeStorage). Falls back to
// plaintext (enc:false) when unavailable so the app never breaks.
async function encToken(token: string): Promise<{ value: string; enc: boolean }> {
  try {
    if (token && window.electronAPI?.encryptSecret) {
      const r = await window.electronAPI.encryptSecret(token);
      if (r?.ok && r.value) return { value: r.value, enc: true };
    }
  } catch { /* fall through */ }
  return { value: token, enc: false };
}

// Resolve a stored session's real token (decrypt if it was encrypted at rest).
async function resolveToken(stored: any): Promise<string | null> {
  if (!stored || !stored.token) return null;
  if (!stored._enc) return stored.token; // legacy / plaintext-fallback
  try {
    if (window.electronAPI?.decryptSecret) {
      const r = await window.electronAPI.decryptSecret(stored.token);
      return r?.ok ? r.value : null;
    }
  } catch { /* ignore */ }
  return null; // encrypted but cannot decrypt on this machine → force re-login
}

export const authService = {
  /** Persist the active session with its token encrypted at rest. */
  async persistSession(session: UserSession): Promise<void> {
    if (!session) { localStorage.removeItem(SESSION_STORE_NAME); return; }
    tokenCache.set(session.id, session.token);
    setAuthToken(session.token);
    const { value, enc } = await encToken(session.token);
    localStorage.setItem(SESSION_STORE_NAME, JSON.stringify({ ...session, token: value, _enc: enc }));
  },

  /** Persist the profile list with every token encrypted at rest. */
  async persistProfiles(profiles: UserSession[]): Promise<void> {
    const out: any[] = [];
    for (const p of profiles) {
      if (p.token) tokenCache.set(p.id, p.token);
      const { value, enc } = await encToken(p.token);
      out.push({ ...p, token: value, _enc: enc });
    }
    localStorage.setItem(PROFILES_STORE_NAME, JSON.stringify(out));
  },

  async registerCracked(username: string, password: string, email?: string): Promise<UserSession> {
    if (!username || username.trim().length < 3 || username.trim().length > 16) {
      throw new Error('Kullanıcı adı 3-16 karakter arasında olmalıdır.');
    }
    const pwError = validatePassword(password);
    if (pwError) throw new Error(pwError);

    try {
      const res = await apiInstance.post('/auth/register', {
        username: username.trim(),
        password: password,
        email: email ? email.trim() : undefined
      });
      const session: UserSession = res.data.session;
      await this.persistSession(session);
      if (window.electronAPI) await window.electronAPI.loginCracked(username.trim());
      return session;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Kayıt başarısız oldu.');
    }
  },

  async loginCracked(username: string, password: string): Promise<UserSession> {
    if (!username || username.trim().length < 3 || username.trim().length > 16) {
      throw new Error('Kullanıcı adı 3-16 karakter arasında olmalıdır.');
    }
    if (!password) throw new Error('Şifre gereklidir.');

    try {
      const res = await apiInstance.post('/auth/login', {
        username: username.trim(),
        password: password
      });
      const session: UserSession = res.data.session;
      await this.persistSession(session);
      if (window.electronAPI) await window.electronAPI.loginCracked(username.trim());
      return session;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Giriş başarısız oldu.');
    }
  },

  async loginMicrosoft(): Promise<UserSession> {
    try {
      if (!window.electronAPI) {
        throw new Error('Microsoft ile giriş yalnızca masaüstü uygulamasında kullanılabilir.');
      }
      const session: UserSession = await window.electronAPI.loginMicrosoft();
      try {
        const res = await apiInstance.post('/auth/microsoft-login', {
          username: session.name,
          uuid: session.id,
          token: session.token
        });
        if (res.data && res.data.token) session.token = res.data.token;
      } catch (err) {
        console.warn('[AuthService] Backend Microsoft sync failed, using client token:', err);
      }
      await this.persistSession(session);
      return session;
    } catch (error: any) {
      throw new Error(error?.message || 'Microsoft ile giriş yapılamadı.');
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem(SESSION_STORE_NAME);
    tokenCache.clear();
    clearAuthToken();
    if (window.electronAPI) await window.electronAPI.logout();
  },

  /** Synchronous session read — uses the decrypted in-memory token cache. */
  getStoredSession(): UserSession | null {
    try {
      const data = localStorage.getItem(SESSION_STORE_NAME);
      if (!data) return null;
      const session = fixAvatar(JSON.parse(data));
      const token = tokenCache.get(session.id) || (!session._enc ? session.token : undefined);
      // Encrypted at rest but not yet decrypted (should not happen post-hydrate):
      // don't hand back the ciphertext as a token.
      if (session._enc && !token) return null;
      if (token) {
        session.token = token;
        setAuthToken(token);
      }
      delete session._enc;
      return session;
    } catch {
      return null;
    }
  },

  /** Synchronous profiles read — swaps in decrypted tokens from the cache. */
  getStoredProfiles(): UserSession[] {
    try {
      const data = localStorage.getItem(PROFILES_STORE_NAME);
      if (!data) return [];
      const arr = JSON.parse(data);
      if (!Array.isArray(arr)) return [];
      return arr.map((p: any) => {
        const s = fixAvatar(p);
        const token = tokenCache.get(s.id) || (!s._enc ? s.token : '');
        const { _enc, ...rest } = s;
        return { ...rest, token };
      });
    } catch {
      return [];
    }
  },

  /**
   * Decrypt all stored tokens into memory before the app renders. Also migrates
   * any legacy plaintext tokens to encrypted-at-rest. Must run before the auth
   * store initialises (see main.tsx).
   */
  async hydrateAuth(): Promise<void> {
    // Session
    try {
      const raw = localStorage.getItem(SESSION_STORE_NAME);
      if (raw) {
        const s = JSON.parse(raw);
        const tok = await resolveToken(s);
        if (tok) {
          tokenCache.set(s.id, tok);
          setAuthToken(tok);
          if (!s._enc) await this.persistSession({ ...s, token: tok }); // migrate
        } else if (s._enc) {
          localStorage.removeItem(SESSION_STORE_NAME); // undecryptable → force re-login
        }
      }
    } catch { /* ignore */ }

    // Profiles
    try {
      const raw = localStorage.getItem(PROFILES_STORE_NAME);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          let needsMigrate = false;
          const resolved: UserSession[] = [];
          for (const p of arr) {
            const tok = await resolveToken(p);
            if (tok) tokenCache.set(p.id, tok);
            if (!p._enc) needsMigrate = true;
            const { _enc, ...rest } = p;
            resolved.push({ ...rest, token: tok || '' });
          }
          if (needsMigrate) await this.persistProfiles(resolved); // migrate plaintext → encrypted
        }
      }
    } catch { /* ignore */ }
  }
};

/** Password policy: min 8 chars, at least one letter and one digit. */
export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return 'Şifre en az 8 karakter olmalıdır.';
  if (!/[A-Za-z]/.test(password)) return 'Şifre en az bir harf içermelidir.';
  if (!/[0-9]/.test(password)) return 'Şifre en az bir rakam içermelidir.';
  return null;
}
