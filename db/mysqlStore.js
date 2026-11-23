const mysql = require('mysql2/promise');

let pool = null;
let tableInitialized = false;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || process.env.DB_HOST,
      port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
      user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
      password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD,
      database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'ats_scorer',
      ssl: (process.env.DB_SSL === 'true' || process.env.MYSQL_SSL === 'true')
        ? { rejectUnauthorized: false }
        : undefined,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

async function ensureTable() {
  if (tableInitialized) return;
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS scans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      resume_excerpt VARCHAR(255),
      jd_excerpt VARCHAR(255),
      match_score INT,
      matched_skills JSON,
      missing_keywords JSON,
      suggestions JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  tableInitialized = true;
}

async function saveScan(record) {
  await ensureTable();
  const [result] = await getPool().execute(
    `INSERT INTO scans (resume_excerpt, jd_excerpt, match_score, matched_skills, missing_keywords, suggestions)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      record.resumeExcerpt,
      record.jdExcerpt,
      record.matchScore,
      JSON.stringify(record.matchedSkills),
      JSON.stringify(record.missingKeywords),
      JSON.stringify(record.suggestions),
    ]
  );
  return { id: result.insertId, createdAt: new Date().toISOString(), ...record };
}

async function getRecentScans(limit = 10) {
  await ensureTable();
  const [rows] = await getPool().query(
    `SELECT id, resume_excerpt, jd_excerpt, match_score, matched_skills, missing_keywords, suggestions, created_at
     FROM scans ORDER BY id DESC LIMIT ?`,
    [Number(limit)]
  );
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
    resumeExcerpt: r.resume_excerpt,
    jdExcerpt: r.jd_excerpt,
    matchScore: r.match_score,
    matchedSkills: typeof r.matched_skills === 'string' ? JSON.parse(r.matched_skills) : r.matched_skills,
    missingKeywords: typeof r.missing_keywords === 'string' ? JSON.parse(r.missing_keywords) : r.missing_keywords,
    suggestions: typeof r.suggestions === 'string' ? JSON.parse(r.suggestions) : r.suggestions,
  }));
}

module.exports = { saveScan, getRecentScans };
