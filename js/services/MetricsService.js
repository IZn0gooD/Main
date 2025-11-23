/**
 * MetricsService - collecte simple de métriques d’usage (compteurs d’événements)
 * - Compteurs persistés dans localStorage
 * - Historique temporel des événements (facultatif)
 */
class MetricsService {
	constructor(options = {}) {
		this.storageKey = options.storageKey || 'vtm_metrics';
		this.historyKey = options.historyKey || 'vtm_metrics_history';
		this.counters = {};
		this.history = [];
		this._load();
	}

	_load() {
		try {
			this.counters = JSON.parse(localStorage.getItem(this.storageKey) || '{}') || {};
		} catch { this.counters = {}; }
		try {
			this.history = JSON.parse(localStorage.getItem(this.historyKey) || '[]') || [];
		} catch { this.history = []; }
	}

	_save() {
		try { localStorage.setItem(this.storageKey, JSON.stringify(this.counters)); } catch {}
		try { localStorage.setItem(this.historyKey, JSON.stringify(this.history)); } catch {}
	}

	incr(name, data = null) {
		if (!name) return;
		this.counters[name] = (this.counters[name] || 0) + 1;
		this.history.push({ ts: new Date().toISOString(), name, data });
		if (this.history.length > 1000) this.history.splice(0, this.history.length - 1000);
		this._save();
	}

	getSummary() {
		const total = Object.values(this.counters).reduce((a, b) => a + b, 0);
		return { totalEvents: total, counters: { ...this.counters } };
	}

	getHistory() {
		return this.history.slice();
	}

	reset() {
		this.counters = {}; this.history = []; this._save();
	}

	exportJSON() {
		const blob = new Blob([JSON.stringify({ summary: this.getSummary(), history: this.getHistory() }, null, 2)], { type: 'application/json;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `metrics_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
}

window.MetricsService = MetricsService;
if (typeof module !== 'undefined' && module.exports) {
	module.exports = MetricsService;
}


