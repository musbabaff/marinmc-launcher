import { ensureDbInitialized, dbAll } from './db.js';

async function run() {
  await ensureDbInitialized();
  const users = await dbAll('SELECT username, token FROM users');
  console.log('ALL USERS IN DB:', users);
}
run();
