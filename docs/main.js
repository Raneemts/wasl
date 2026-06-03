const API_STATS = 'https://wasl-production-05b9.up.railway.app/api/stats';

async function loadStats() {
  const els = {
    donors: document.getElementById('stat-donors'),
    donations: document.getElementById('stat-donations'),
    hospitals: document.getElementById('stat-hospitals'),
  };
  if (!els.donors) return;

  try {
    const res = await fetch(API_STATS);
    if (!res.ok) throw new Error('stats unavailable');
    const data = await res.json();
    els.donors.textContent = data.donors ?? 0;
    els.donations.textContent = data.donations ?? 0;
    els.hospitals.textContent = data.hospitals ?? 0;
  } catch {
    els.donors.textContent = '—';
    els.donations.textContent = '—';
    els.hospitals.textContent = '—';
  }
}

loadStats();
