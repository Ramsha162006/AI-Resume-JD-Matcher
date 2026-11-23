const $ = (id) => document.getElementById(id);

const resumeInput = $('resume');
const jdInput = $('jobDescription');
const analyzeBtn = $('analyzeBtn');
const btnText = analyzeBtn.querySelector('.btn-text');
const spinner = analyzeBtn.querySelector('.spinner');
const formError = $('formError');
const resultsCard = $('resultsCard');
const emptyState = $('emptyState');
const historyList = $('historyList');

// Theme toggle
const themeToggle = $('themeToggle');
const savedTheme = localStorage.getItem('ats-theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ats-theme', next);
});

// Char counters
function bindCount(input, counter) {
  const update = () => { counter.textContent = `${input.value.length} chars`; };
  input.addEventListener('input', update);
  update();
}
bindCount(resumeInput, $('resumeCount'));
bindCount(jdInput, $('jdCount'));

// Analyze
analyzeBtn.addEventListener('click', async () => {
  const resume = resumeInput.value.trim();
  const jd = jdInput.value.trim();

  hide(formError);
  if (!resume || !jd) {
    formError.textContent = 'Please paste both your resume and the job description.';
    show(formError);
    return;
  }

  setLoading(true);
  hide(emptyState);
  hide(resultsCard);

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume, jobDescription: jd }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Request failed');
    }
    const data = await res.json();
    renderResults(data);
    await loadHistory();
  } catch (err) {
    formError.textContent = err.message || 'Something went wrong. Please try again.';
    show(formError);
    show(emptyState);
  } finally {
    setLoading(false);
  }
});

function setLoading(on) {
  analyzeBtn.disabled = on;
  btnText.textContent = on ? 'Analyzing…' : 'Check ATS Match';
  spinner.hidden = !on;
}

function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true; }

function renderResults(data) {
  const score = Math.max(0, Math.min(100, Math.round(data.matchScore || 0)));

  // Score number animate
  animateNumber($('scoreNumber'), score);

  // Ring
  const ring = $('ringProgress');
  const circumference = 326.7;
  ring.style.strokeDashoffset = circumference - (circumference * score) / 100;
  ring.style.stroke = scoreColor(score);

  // Progress bar
  const bar = $('progressBar');
  bar.style.width = score + '%';
  bar.style.background = `linear-gradient(90deg, ${scoreColor(score)}, ${scoreColor(score, true)})`;

  // Badges
  renderBadges($('matchedSkills'), data.matchedSkills, 'matched', 'No matched skills detected.');
  renderBadges($('missingKeywords'), data.missingKeywords, 'missing', 'No missing keywords — great match!');

  // Suggestions
  const ul = $('suggestions');
  ul.innerHTML = '';
  (data.suggestions || []).forEach((s) => {
    const li = document.createElement('li');
    li.textContent = s;
    ul.appendChild(li);
  });

  show(resultsCard);
  resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderBadges(container, items, cls, emptyText) {
  container.innerHTML = '';
  if (!items || items.length === 0) {
    const p = document.createElement('p');
    p.textContent = emptyText;
    p.style.color = 'var(--text-muted)';
    p.style.fontSize = '13px';
    container.appendChild(p);
    return;
  }
  items.forEach((s) => {
    const span = document.createElement('span');
    span.className = `badge ${cls}`;
    span.textContent = s;
    container.appendChild(span);
  });
}

function animateNumber(el, target) {
  let start = 0;
  const duration = 800;
  const startTime = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function scoreColor(score, lighter) {
  if (score >= 70) return lighter ? '#4ee89a' : '#2ecc71';
  if (score >= 40) return lighter ? '#ffc25a' : '#f0a93b';
  return lighter ? '#ff8585' : '#ff5d5d';
}

// History
$('refreshHistory').addEventListener('click', loadHistory);

async function loadHistory() {
  try {
    const res = await fetch('/api/history?limit=10');
    if (!res.ok) throw new Error('Failed to load history');
    const rows = await res.json();
    renderHistory(rows);
  } catch {
    historyList.innerHTML = '<p class="history-empty">Could not load history.</p>';
  }
}

function renderHistory(rows) {
  historyList.innerHTML = '';
  if (!rows.length) {
    historyList.innerHTML = '<p class="history-empty">No scans yet.</p>';
    return;
  }
  rows.forEach((r) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const score = r.matchScore ?? 0;
    const tier = score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';
    item.innerHTML = `
      <div class="history-score score-tag-${tier}">${score}%</div>
      <div class="history-meta">${formatDate(r.createdAt)}</div>
      <div class="history-snippet">${escapeHtml(r.resumeExcerpt || '')}</div>
    `;
    item.addEventListener('click', () => showHistoryDetail(r));
    historyList.appendChild(item);
  });
}

function showHistoryDetail(r) {
  $('scoreNumber').textContent = r.matchScore ?? 0;
  const ring = $('ringProgress');
  const circumference = 326.7;
  ring.style.strokeDashoffset = circumference - (circumference * (r.matchScore || 0)) / 100;
  ring.style.stroke = scoreColor(r.matchScore || 0);

  const bar = $('progressBar');
  bar.style.width = (r.matchScore || 0) + '%';
  bar.style.background = `linear-gradient(90deg, ${scoreColor(r.matchScore || 0)}, ${scoreColor(r.matchScore || 0, true)})`;

  renderBadges($('matchedSkills'), r.matchedSkills, 'matched', 'No matched skills recorded.');
  renderBadges($('missingKeywords'), r.missingKeywords, 'missing', 'No missing keywords recorded.');
  const ul = $('suggestions');
  ul.innerHTML = '';
  (r.suggestions || []).forEach((s) => {
    const li = document.createElement('li');
    li.textContent = s;
    ul.appendChild(li);
  });

  hide(emptyState);
  show(resultsCard);
  resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadHistory();
