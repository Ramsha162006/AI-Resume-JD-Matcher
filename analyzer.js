const { GoogleGenAI } = require('@google/genai');

const MODEL = 'gemini-3.8-flash';

const ANALYSIS_PROMPT = `You are an expert ATS (Applicant Tracking System) analyst.
Analyze the given RESUME against the JOB DESCRIPTION.
Return ONLY a valid JSON object (no markdown, no explanation) with this exact shape:
{
  "matchScore": <integer 0-100>,
  "matchedSkills": [<strings: skills/keywords found in both>],
  "missingKeywords": [<strings: important JD keywords absent from resume>],
  "suggestions": [<3 strings: concrete resume bullet point improvements>]
}

RESUME:
"""
%s
"""

JOB DESCRIPTION:
"""
%s
"""`;

function extract(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s+#./-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

// Local fallback when no API key or the API call fails.
function localAnalysis(resume, jd) {
  const resumeTokens = new Set(extract(resume));
  const jdTokens = extract(jd);

  const skillWords = jdTokens.filter(
    (w) => w.length > 2 && !STOP_WORDS.has(w)
  );

  const matched = [...new Set(skillWords.filter((w) => resumeTokens.has(w)))].slice(0, 20);
  const missing = [...new Set(skillWords.filter((w) => !resumeTokens.has(w)))].slice(0, 20);

  const score = skillWords.length
    ? Math.round((matched.length / skillWords.length) * 100)
    : 0;

  const suggestions = [
    `Add the missing keyword${missing[0] ? ` "${missing[0]}"` : ''} to a concrete experience bullet.`,
    'Quantify at least one achievement (e.g. "reduced X by 30%").',
    'Mirror job-title language from the job description in your experience section.',
  ];

  return { matchScore: score, matchedSkills: matched, missingKeywords: missing, suggestions };
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'you', 'are', 'our', 'with', 'will', 'have', 'this',
  'that', 'from', 'your', 'must', 'able', 'work', 'team', 'role', 'job',
  'plus', 'year', 'years', 'strong', 'good', 'great', 'looking', 'candidate',
  'experience', 'skills', 'ability', 'including', 'using', 'use', 'new',
  'senior', 'skilled', 'lead', 'leader', 'leadership', 'preferred', 'required',
  'responsibilities', 'requirements', 'qualification', 'qualifications',
]);

function hasApiKey() {
  return !!process.env.GEMINI_API_KEY;
}

async function aiAnalysis(resume, jd) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = ANALYSIS_PROMPT.replace('%s', resume.slice(0, 8000)).replace('%s', jd.slice(0, 8000));
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  const raw = response.text || '';
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  }
  const parsed = JSON.parse(cleaned);

  return {
    matchScore: clampScore(parsed.matchScore),
    matchedSkills: asStringArray(parsed.matchedSkills),
    missingKeywords: asStringArray(parsed.missingKeywords),
    suggestions: asStringArray(parsed.suggestions, 3),
  };
}

function clampScore(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function asStringArray(val, max) {
  let arr = Array.isArray(val) ? val.filter((x) => typeof x === 'string' && x.trim()) : [];
  arr = arr.map((s) => s.trim());
  if (max) arr = arr.slice(0, max);
  return arr;
}

async function analyze(resume, jd) {
  if (!resume || !jd) {
    throw new Error('Both resume and job description are required.');
  }
  if (hasApiKey()) {
    try {
      return await aiAnalysis(resume, jd);
    } catch (err) {
      console.error('AI analysis failed, using local fallback:', err.message);
      return localAnalysis(resume, jd);
    }
  }
  return localAnalysis(resume, jd);
}

function excerpt(text, len = 80) {
  const t = (text || '').trim().replace(/\s+/g, ' ');
  return t.length > len ? t.slice(0, len) + '…' : t;
}

module.exports = { analyze, hasApiKey, excerpt };
