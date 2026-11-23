require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const { analyze, hasApiKey, excerpt } = require('./analyzer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/analyze', async (req, res) => {
  try {
    const { resume, jobDescription } = req.body || {};
    if (!resume || !jobDescription) {
      return res.status(400).json({ error: 'Both resume and jobDescription are required.' });
    }

    const result = await analyze(resume, jobDescription);

    const record = {
      resumeExcerpt: excerpt(resume),
      jdExcerpt: excerpt(jobDescription),
      matchScore: result.matchScore,
      matchedSkills: result.matchedSkills,
      missingKeywords: result.missingKeywords,
      suggestions: result.suggestions,
    };
    const saved = await db.saveScan(record);

    res.json({ ...result, id: saved.id, createdAt: saved.createdAt });
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: 'Analysis failed. Please try again.' });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const rows = await db.getRecentScans(limit);
    res.json(rows);
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Could not load history.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, backend: db.backend, ai: hasApiKey() ? 'gemini' : 'local' });
});

app.listen(PORT, () => {
  console.log(`ATS Scorer running on http://localhost:${PORT} (db: ${db.backend}, ai: ${hasApiKey() ? 'gemini' : 'local'})`);
});

module.exports = app;
