// DB facade: picks the right backend based on env vars.
//
// Default: in-memory store (works out of the box, no setup).
// Set MYSQL_HOST (+ MYSQL_USER/MYSQL_PASSWORD/MYSQL_DATABASE) to use MySQL.
// Set REDIS_URL to add a Redis read-through cache on top.
//
// Each store implements: saveScan(record) and getRecentScans(limit).

const memory = require('./memoryStore');
const redis = require('./redisCache');

const useMysql = !!process.env.MYSQL_HOST;

const primary = useMysql ? require('./mysqlStore') : memory;

async function saveScan(record) {
  return primary.saveScan(record);
}

async function getRecentScans(limit = 10) {
  if (process.env.REDIS_URL) {
    const cached = await redis.getCached('recent_scans');
    if (cached) return cached;
  }
  const rows = await primary.getRecentScans(limit);
  if (process.env.REDIS_URL) {
    await redis.setCached('recent_scans', rows, 60);
  }
  return rows;
}

module.exports = { saveScan, getRecentScans, backend: useMysql ? 'mysql' : 'memory' };
