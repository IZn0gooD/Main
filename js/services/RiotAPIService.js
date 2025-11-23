class RiotAPIService {
	constructor(apiKey = '') {
		this.apiKey = (apiKey || '').trim();
		this.base = 'https://{platform}.api.riotgames.com';
		// Plateformes de VALORANT (status) et régions pour content
		this.platforms = ['eu1', 'na1', 'ap1', 'kr1', 'latam1', 'br1'];
		this.contentRegions = ['eu', 'na', 'ap', 'kr', 'latam', 'br'];
		// Hôtes Accounts
		this.accountHosts = ['europe', 'americas', 'asia'];
	}

	setKey(key) {
		this.apiKey = (key || '').trim();
	}

	_headers() {
		if (!this.apiKey || !this.apiKey.trim()) {
			throw new Error('API key manquante');
		}
		// L'API Riot utilise X-Riot-Token pour les nouvelles clés API
		// Certaines anciennes clés peuvent utiliser X-Riot-API-Key, mais X-Riot-Token est le standard actuel
		const trimmedKey = this.apiKey.trim();
		console.log('[RiotAPIService] Utilisation de la clé API (longueur:', trimmedKey.length, ')');
		return { 'X-Riot-Token': trimmedKey };
	}

	async _fetchJson(url, timeoutMs = 15000, externalSignal = null, maxRetries = 2) {
		// Exposer la dernière requête pour cURL
		try { window.__lastRiotRequest = { method: 'GET', url, headers: this._headers() }; } catch {}
		let attempt = 0;
		const sleep = (ms) => new Promise(r => setTimeout(r, ms));
		let useAlternativeHeader = false; // Essayer X-Riot-API-Key si X-Riot-Token échoue avec 401
		
		while (true) {
			attempt += 1;
			const controller = new AbortController();
			// Propager une annulation externe si fournie
			if (externalSignal && typeof externalSignal.addEventListener === 'function') {
				if (externalSignal.aborted) controller.abort();
				else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
			}
			const timer = setTimeout(() => controller.abort(), timeoutMs);
			let res;
			try {
				// Vérifier que la clé API est définie
				if (!this.apiKey || !this.apiKey.trim()) {
					throw new Error('API key manquante. Veuillez entrer votre clé API Riot Games.');
				}
				
				// Essayer X-Riot-API-Key si X-Riot-Token a échoué avec 401
				const headers = useAlternativeHeader 
					? { 'X-Riot-API-Key': this.apiKey.trim() }
					: this._headers();
				
				// Vérifier que les headers contiennent bien la clé
				if (!headers['X-Riot-Token'] && !headers['X-Riot-API-Key']) {
					console.error('[RiotAPIService] Headers ne contiennent pas la clé API:', Object.keys(headers));
					throw new Error('Erreur: clé API non transmise dans les headers');
				}
				
				console.log('[RiotAPIService] Envoi requête vers:', url);
				console.log('[RiotAPIService] Headers:', Object.keys(headers));
				
				if (window.ipcRenderer && typeof window.ipcRenderer.invoke === 'function') {
					// Utiliser le proxy main pour contourner CORS en environnement Electron sécurisé
					const proxyRes = await window.ipcRenderer.invoke('riot-proxy', { url, headers });
					if (!proxyRes || proxyRes.ok === undefined) {
						if (proxyRes && proxyRes.error) {
							throw new Error(`Proxy IPC: ${proxyRes.error}`);
						}
						throw new Error('Proxy IPC indisponible');
					}
					// Simuler l'interface Response minimale
					res = {
						ok: proxyRes.ok,
						status: proxyRes.status || 0,
						statusText: proxyRes.status === 401 ? 'Unauthorized' : '',
						headers: new Map(Object.entries(proxyRes.headers || {})),
						text: async () => proxyRes.body || '',
						json: async () => {
							try {
								return JSON.parse(proxyRes.body || '{}');
							} catch (e) {
								return {};
							}
						}
					};
				} else {
					res = await fetch(url, { headers, signal: controller.signal });
				}
			} catch (fetchErr) {
				clearTimeout(timer);
				// Si c'est une erreur réseau et qu'on n'a pas encore essayé l'autre header, réessayer
				if (!useAlternativeHeader && (fetchErr.message?.includes('Failed to fetch') || fetchErr.message?.includes('NetworkError'))) {
					useAlternativeHeader = true;
					continue;
				}
				throw fetchErr;
			} finally {
				clearTimeout(timer);
			}
			const getHeader = (k) => {
				try {
					if (typeof res.headers.get === 'function') return res.headers.get(k);
					if (res.headers instanceof Map) return res.headers.get(k.toLowerCase());
					if (res.headers && typeof res.headers === 'object') return res.headers[k] || res.headers[k.toLowerCase()];
				} catch {}
				return null;
			};
			const ratelimit = {
				limit: getHeader('X-App-Rate-Limit'),
				count: getHeader('X-App-Rate-Limit-Count'),
				methodLimit: getHeader('X-Method-Rate-Limit'),
				methodCount: getHeader('X-Method-Rate-Limit-Count'),
				retryAfter: getHeader('Retry-After')
			};
			if (!res.ok) {
				// Si 401 avec X-Riot-Token, essayer X-Riot-API-Key une fois
				if (res.status === 401 && !useAlternativeHeader && attempt === 1) {
					useAlternativeHeader = true;
					await sleep(100); // Petite pause avant de réessayer
					continue;
				}
				// Respecter Retry-After pour 429; retry simple pour 5xx
				if ((res.status === 429 || (res.status >= 500 && res.status < 600)) && attempt <= maxRetries) {
					const retryMs = res.status === 429 && ratelimit.retryAfter ? (parseInt(ratelimit.retryAfter, 10) * 1000) : (attempt * 500);
					await sleep(retryMs);
					continue;
				}
				const text = await res.text().catch(() => '');
				const err = new Error(`HTTP ${res.status} ${res.statusText || ''} — ${text}`);
				err.status = res.status;
				err.rate = ratelimit;
				throw err;
			}
			const json = await res.json();
			return { json, rate: ratelimit };
		}
	}

	// VAL-CONTENT-V1: contents
	async getContents(region = 'eu', opts = {}) {
		const url = `https://${region}.api.riotgames.com/val/content/v1/contents`;
		return this._fetchJson(url, 15000, opts.signal);
	}

	// Agents et Maps via contents (filtrage client)
	async getAgents(region = 'eu', opts = {}) {
		const { json, rate } = await this.getContents(region, opts);
		const agents = (json.characters || []).map(c => ({ name: c.name, id: c.id, localizedNames: c.localizedNames }));
		return { json: agents, rate };
	}
	async getMaps(region = 'eu', opts = {}) {
		const { json, rate } = await this.getContents(region, opts);
		const maps = (json.maps || []).map(m => ({ name: m.name, id: m.id, localizedNames: m.localizedNames }));
		return { json: maps, rate };
	}

	// VAL-STATUS-V1
	async getStatus(platform = 'eu1', opts = {}) {
		const url = this.base.replace('{platform}', platform) + '/val/status/v1/platform-data';
		return this._fetchJson(url, 15000, opts.signal);
	}

	// Example: Match par PUUID (VAL-MATCH-V1)
	// GET /val/match/v1/by-puuid/{region}/{puuid}/ids
	async getMatchIdsByPuuid(region = 'eu', puuid = '', start = 0, count = 10, opts = {}) {
		if (!puuid) throw new Error('PUUID requis');
		const url = `https://${region}.api.riotgames.com/val/match/v1/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`;
		return this._fetchJson(url, 15000, opts.signal);
	}

	// Détail match par matchId
	async getMatchById(region = 'eu', matchId = '', opts = {}) {
		if (!matchId) throw new Error('matchId requis');
		const url = `https://${region}.api.riotgames.com/val/match/v1/matches/${matchId}`;
		return this._fetchJson(url, 15000, opts.signal);
	}

	// Account-V1: Récupérer compte par Riot ID (gameName + tagLine)
	async getAccountByRiotId(host = 'europe', gameName = '', tagLine = '', opts = {}) {
		if (!gameName || !tagLine) throw new Error('gameName et tagLine requis');
		const encName = encodeURIComponent(gameName);
		const encTag = encodeURIComponent(tagLine);
		const url = `https://${host}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encName}/${encTag}`;
		return this._fetchJson(url, 15000, opts.signal);
	}

	// Account-V1: Récupérer compte par PUUID (pour vérification)
	async getAccountByPuuid(host = 'europe', puuid = '', opts = {}) {
		if (!puuid) throw new Error('PUUID requis');
		const url = `https://${host}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`;
		return this._fetchJson(url, 15000, opts.signal);
	}
}

window.RiotAPIService = RiotAPIService;
if (typeof module !== 'undefined' && module.exports) {
	module.exports = RiotAPIService;
}


