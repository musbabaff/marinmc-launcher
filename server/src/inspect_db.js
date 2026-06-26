import { ensureDbInitialized, dbAll } from './db.js';

async function run() {
  await ensureDbInitialized();
  // NOTE: never select/print auth tokens here — this dump can leak credentials.
  const users = await dbAll('SELECT username, last_login, coins FROM users');
  console.log('ALL USERS IN DB:', users);
}
run();
