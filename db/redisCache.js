// Optional Redis read-through cache for scan history. Requires `redis` (npm install redis).
// Activated automatically when process.env.REDIS_URL is set.
// The primary store stays MySQL/memory; Redis caches recent-scan results for SPEED.

let createClient = null;
let client = null;

async function getClient() {
  if (!createClient) {
    ({ createClient } = require('redis'));
  }
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (err) => console.error('Redis error:', err.message));
    await client.connect();
  }
  return client;
}

async function getCached(key) {
  try {
    const c = await getClient();
    const val = await c.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

async function setCached(key, value, ttlSeconds = 60) {
  try {
    const c = await getClient();
    await c.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch {
    // cache is best-effort
  }
}

module.exports = { getCached, setCached };
