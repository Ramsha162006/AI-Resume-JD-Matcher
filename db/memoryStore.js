// In-memory store used when MySQL/Redis are not configured.
// Replace with a real DB in production (see mysqlStore.js / redisCache.js).

let scans = [];
let nextId = 1;

async function saveScan(record) {
  const entry = { id: nextId++, createdAt: new Date().toISOString(), ...record };
  scans.push(entry);
  return entry;
}

async function getRecentScans(limit = 10) {
  return scans.slice(-limit).reverse();
}

async function clearAll() {
  scans = [];
  nextId = 1;
}

module.exports = { saveScan, getRecentScans, clearAll };
