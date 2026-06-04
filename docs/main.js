const PRODUCTION_STATS = 'https://wasl-production-05b9.up.railway.app/api/stats';

function resolveStatsUrl() {
  const { hostname, protocol } = window.location;
  if (protocol === 'file:') {
    return PRODUCTION_STATS;
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '/api/stats';
  }
  return PRODUCTION_STATS;
}

function applyStats(els, data) {
  els.donors.textContent = data.donors ?? 0;
  els.donations.textContent = data.donations ?? 0;
  els.hospitals.textContent = data.hospitals ?? 0;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadStats() {
  const els = {
    donors: document.getElementById('stat-donors'),
    donations: document.getElementById('stat-donations'),
    hospitals: document.getElementById('stat-hospitals'),
  };
  if (!els.donors) return;

  const sources = [resolveStatsUrl(), 'stats.json'];

  for (const url of sources) {
    try {
      const data = await fetchJson(url);
      applyStats(els, data);
      return;
    } catch {
      /* try next source */
    }
  }

  els.donors.textContent = '—';
  els.donations.textContent = '—';
  els.hospitals.textContent = '—';
}

loadStats();
