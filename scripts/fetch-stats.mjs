import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const statsUrl = process.env.STATS_URL || 'https://wasl-production-05b9.up.railway.app/api/stats';
const outPath = path.join(root, 'docs', 'stats.json');

const res = await fetch(statsUrl);
if (!res.ok) {
  console.warn(`fetch-stats: ${statsUrl} returned ${res.status}, keeping existing stats.json`);
  process.exit(0);
}

const data = await res.json();
await writeFile(outPath, `${JSON.stringify(data)}\n`, 'utf8');
console.log('fetch-stats: wrote', outPath, data);
