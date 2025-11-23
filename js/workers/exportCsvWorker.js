// Worker: build CSV from team data off the main thread

self.onmessage = (e) => {
  try {
    const { type, team, filters } = e.data || {};
    if (type !== 'stats' || !team) {
      self.postMessage({ ok: false, error: 'invalid_request' });
      return;
    }
    const csv = buildStatsCsv(team, filters || {});
    self.postMessage({ ok: true, csv });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err && err.message || err) });
  }
};

function buildStatsCsv(team, filters) {
  const headers = ['Date','Map','Opponent','Score','Result'];
  const rows = [headers];
  const matches = Array.isArray(team.matches) ? team.matches : [];
  const from = filters.from ? new Date(filters.from) : null;
  const to = filters.to ? new Date(filters.to) : null;
  const mapFilter = (filters.map && filters.map !== 'all') ? String(filters.map) : null;
  for (const m of matches) {
    if (!m) continue;
    if (mapFilter && String(m.map) !== mapFilter) continue;
    if (from || to) {
      const d = new Date(m.date);
      if (from && d < from) continue;
      if (to && d > to) continue;
    }
    rows.push([m.date || '', m.map || '', m.opponent || '', m.score || '', m.result || '']);
  }
  return rows.map(r => r.map(v => {
    const s = String(v ?? '');
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(';')).join('\n');
}


