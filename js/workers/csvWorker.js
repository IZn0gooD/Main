// CSV Worker: parse large CSV text off the main thread

self.onmessage = (e) => {
  try {
    const { type, text } = e.data || {};
    if (type !== 'parse' || !text) {
      self.postMessage({ ok: false, error: 'invalid_request' });
      return;
    }
    const rows = parseCSVText(text);
    const normalized = normalizeMatchCsvRows(rows);
    self.postMessage({ ok: true, rows: normalized });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err && err.message || err) });
  }
};

function parseCSVText(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (!lines.length) return [];
  const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'; i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim()); current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };
  const header = parseLine(lines[0]).map(h => String(h || '').trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    rows.push({ header, cols });
  }
  return rows;
}

function normalizeMatchCsvRows(rows) {
  const out = [];
  rows.forEach(r => {
    const h = r.header;
    const get = (name) => {
      const idx = h.indexOf(name);
      return idx >= 0 ? r.cols[idx] : '';
    };
    const date = get('date') || get('datetime') || get('jour');
    const map = get('map') || get('carte');
    const opponent = get('opponent') || get('adversaire');
    const score = get('score') || get('resultat');
    const result = get('result') || get('issue');
    out.push({ date, map, opponent, score, result });
  });
  return out;
}


