/**
 * LoggerService - journalisation centralisée et métriques d'usage
 * - Stocke un buffer circulaire de logs en localStorage
 * - Fournit une API simple: logEvent, logError, getLogs, clear, exportJSON
 */
class LoggerService {
	constructor(options = {}) {
		this.storageKey = options.storageKey || 'vtm_logs';
		this.maxEntries = options.maxEntries || 1000;
		this.logs = [];
		this._load();
	}

	_load() {
		try {
			const raw = localStorage.getItem(this.storageKey);
			this.logs = raw ? JSON.parse(raw) : [];
			if (!Array.isArray(this.logs)) this.logs = [];
		} catch {
			this.logs = [];
		}
	}

	_save() {
		try {
			localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
		} catch {}
	}

	_push(entry) {
		this.logs.push(entry);
		if (this.logs.length > this.maxEntries) {
			this.logs.splice(0, this.logs.length - this.maxEntries);
		}
		this._save();
	}

	logEvent(name, data = null, level = 'info') {
		const entry = {
			ts: new Date().toISOString(),
			type: 'event',
			level,
			name,
			data
		};
		this._push(entry);
	}

	logError(error, context = null) {
		const entry = {
			ts: new Date().toISOString(),
			type: 'error',
			level: 'error',
			name: error?.name || 'Error',
			message: error?.message || String(error),
			stack: error?.stack || null,
			context
		};
		this._push(entry);
	}

	getLogs() {
		return this.logs.slice();
	}

	clear() {
		this.logs = [];
		this._save();
	}

	exportJSON() {
		try {
			const blob = new Blob([JSON.stringify(this.getLogs(), null, 2)], { type: 'application/json;charset=utf-8;' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `vtm_logs_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch {}
	}
}

window.LoggerService = LoggerService;

if (typeof module !== 'undefined' && module.exports) {
	module.exports = LoggerService;
}


