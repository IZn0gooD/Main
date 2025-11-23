/**
 * Service de gestion des API externes
 * Gère les interactions avec les APIs Valorant (officielles et non officielles)
 * 
 * ⚠️ IMPORTANT : Ce service nécessite une clé API pour fonctionner.
 * Ne jamais commiter la clé API dans le code source.
 */

/**
 * Gestionnaire de limite de taux
 */
class RateLimiter {
    constructor(requestsPerSecond = 20, requestsPerMinute = 100) {
        this.requestsPerSecond = requestsPerSecond;
        this.requestsPerMinute = requestsPerMinute;
        this.requests = [];
    }

    /**
     * Vérifie si une requête peut être effectuée
     * @returns {boolean}
     */
    canMakeRequest() {
        const now = Date.now();
        
        // Nettoyer les requêtes anciennes
        this.requests = this.requests.filter(time => now - time < 60000);
        
        // Vérifier les limites
        const requestsLastSecond = this.requests.filter(time => now - time < 1000).length;
        const requestsLastMinute = this.requests.length;
        
        return requestsLastSecond < this.requestsPerSecond && 
               requestsLastMinute < this.requestsPerMinute;
    }

    /**
     * Enregistre une requête
     */
    recordRequest() {
        this.requests.push(Date.now());
    }

    /**
     * Obtient le temps d'attente avant la prochaine requête possible
     * @returns {number} Temps en millisecondes
     */
    getWaitTime() {
        const now = Date.now();
        const requestsLastSecond = this.requests.filter(time => now - time < 1000).length;
        
        if (requestsLastSecond >= this.requestsPerSecond) {
            const oldestRequest = Math.min(...this.requests.filter(time => now - time < 1000));
            return 1000 - (now - oldestRequest);
        }
        
        return 0;
    }
}

/**
 * Cache pour les réponses API
 */
class APICache {
    constructor(defaultTTL = 300000) { // 5 minutes par défaut
        this.cache = new Map();
        this.defaultTTL = defaultTTL;
    }

    /**
     * Obtient une valeur du cache
     * @param {string} key - Clé du cache
     * @returns {any|null}
     */
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expires) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }

    /**
     * Stocke une valeur dans le cache
     * @param {string} key - Clé du cache
     * @param {any} value - Valeur à stocker
     * @param {number} ttl - Temps de vie en millisecondes (optionnel)
     */
    set(key, value, ttl = null) {
        const expires = Date.now() + (ttl || this.defaultTTL);
        this.cache.set(key, { value, expires });
    }

    /**
     * Vide le cache
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Supprime les entrées expirées
     */
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expires) {
                this.cache.delete(key);
            }
        }
    }
}

/**
 * Service de gestion des API
 */
class APIService {
    constructor() {
        this.provider = 'none'; // 'riot', 'henrik', 'custom', 'none'
        this.apiKey = null;
        this.baseURL = null;
        this.rateLimiter = new RateLimiter();
        this.cache = new APICache();
        this.region = 'eu'; // eu, na, ap, kr, etc.
        
        // Charger la configuration depuis localStorage
        this.loadConfig();
        
        // Nettoyer le cache périodiquement
        setInterval(() => this.cache.cleanup(), 60000); // Toutes les minutes
    }

    /**
     * Charge la configuration depuis localStorage
     */
    loadConfig() {
        try {
            const config = localStorage.getItem('api_config');
            if (config) {
                const parsed = JSON.parse(config);
                this.provider = parsed.provider || 'none';
                this.apiKey = parsed.apiKey || null;
                this.baseURL = parsed.baseURL || null;
                this.region = parsed.region || 'eu';
                
                // Ne pas logger la clé API pour des raisons de sécurité
                if (this.apiKey) {
                    console.log(`✅ Configuration API chargée (provider: ${this.provider})`);
                }
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement de la configuration API:', error);
        }
    }

    /**
     * Sauvegarde la configuration dans localStorage
     */
    saveConfig() {
        try {
            const config = {
                provider: this.provider,
                apiKey: this.apiKey,
                baseURL: this.baseURL,
                region: this.region
            };
            localStorage.setItem('api_config', JSON.stringify(config));
            console.log('✅ Configuration API sauvegardée');
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde de la configuration API:', error);
        }
    }

    /**
     * Configure le service API
     * @param {Object} config - Configuration
     * @param {string} config.provider - Provider ('riot', 'henrik', 'custom', 'none')
     * @param {string} config.apiKey - Clé API
     * @param {string} config.baseURL - URL de base (optionnel)
     * @param {string} config.region - Région (optionnel)
     */
    configure(config) {
        this.provider = config.provider || 'none';
        // Nettoyer la clé API (supprimer les espaces avant/après)
        this.apiKey = config.apiKey ? config.apiKey.trim() : null;
        this.baseURL = config.baseURL || null;
        this.region = config.region || 'eu';
        
        // Définir l'URL de base selon le provider
        if (!this.baseURL && this.provider === 'riot') {
            // Pour Riot Games API, la région doit être convertie en plateforme/routing
            // Pour Valorant, on utilise 'eu', 'na', 'ap', 'kr', etc. directement
            this.baseURL = `https://${this.region}.api.riotgames.com`;
        } else if (!this.baseURL && this.provider === 'henrik') {
            this.baseURL = 'https://api.henrikdev.xyz/valorant';
        }
        
        this.saveConfig();
    }

    /**
     * Vérifie si le service est configuré
     * @returns {boolean}
     */
    isConfigured() {
        return this.provider !== 'none' && this.apiKey !== null;
    }

    /**
     * Effectue une requête API avec gestion du cache et rate limiting
     * @param {string} endpoint - Endpoint à appeler
     * @param {Object} options - Options de requête
     * @param {boolean} options.useCache - Utiliser le cache (défaut: true)
     * @param {number} options.cacheTTL - TTL du cache en ms (défaut: 5 minutes)
     * @returns {Promise<any>}
     */
    async request(endpoint, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('API non configurée. Veuillez configurer une clé API.');
        }

        // Extraire les options
        const { 
            useCache = true, 
            cacheTTL = 300000,
            baseURL: customBaseURL = null // Permettre de surcharger le baseURL
        } = options;
        
        const cacheKey = `${this.provider}:${endpoint}`;

        // Vérifier le cache
        if (useCache) {
            const cached = this.cache.get(cacheKey);
            if (cached !== null) {
                console.log(`📦 Données récupérées du cache: ${endpoint}`);
                return cached;
            }
        }

        // Vérifier le rate limiting
        if (!this.rateLimiter.canMakeRequest()) {
            const waitTime = this.rateLimiter.getWaitTime();
            console.warn(`⏳ Limite de taux atteinte. Attente de ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        // Construire l'URL complète
        // Utiliser le baseURL personnalisé si fourni, sinon utiliser celui du service
        const baseURL = customBaseURL || this.baseURL;
        if (!baseURL) {
            throw new Error('BaseURL non défini. Veuillez configurer l\'API correctement.');
        }
        const url = endpoint.startsWith('http') ? endpoint : `${baseURL}${endpoint}`;
        
        // Construire les headers
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.provider === 'riot') {
            // S'assurer que la clé API est bien nettoyée
            const cleanApiKey = this.apiKey ? this.apiKey.trim() : null;
            if (!cleanApiKey || cleanApiKey.length === 0) {
                throw new Error('Clé API manquante ou invalide pour Riot Games API');
            }
            headers['X-Riot-Token'] = cleanApiKey;
            console.log(`✅ Header X-Riot-Token ajouté (longueur: ${cleanApiKey.length})`);
        } else if (this.provider === 'henrik') {
            const cleanApiKey = this.apiKey ? this.apiKey.trim() : null;
            if (!cleanApiKey || cleanApiKey.length === 0) {
                throw new Error('Clé API manquante ou invalide pour Henrik Dev API');
            }
            headers['Authorization'] = cleanApiKey;
            console.log(`✅ Header Authorization ajouté (longueur: ${cleanApiKey.length})`);
        }
        
        // Log de debug (sans exposer la clé API)
        console.log(`📡 Requête API: ${url}`, {
            provider: this.provider,
            region: this.region,
            hasApiKey: !!this.apiKey,
            apiKeyLength: this.apiKey ? this.apiKey.length : 0,
            headers: Object.keys(headers),
            baseURL: baseURL
        });

        try {
            // Enregistrer la requête
            this.rateLimiter.recordRequest();

            // Effectuer la requête avec gestion d'erreurs réseau
            // Dans Electron, pas besoin de mode: 'cors' car webSecurity gère les requêtes
            let response;
            try {
                response = await fetch(url, { 
                    headers,
                    method: 'GET'
                });
            } catch (fetchError) {
                // Gérer les erreurs de réseau (CORS, connexion, etc.)
                console.error(`❌ Erreur de réseau lors de la requête (${url}):`, fetchError);
                console.error('Détails de l\'erreur:', {
                    name: fetchError.name,
                    message: fetchError.message,
                    stack: fetchError.stack
                });
                
                if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
                    throw new Error('Erreur de connexion réseau (Failed to fetch). Vérifiez votre connexion Internet et que les endpoints API sont accessibles. Si vous êtes dans un environnement Electron, vérifiez les paramètres de webSecurity.');
                } else if (fetchError.name === 'AbortError') {
                    throw new Error('Requête interrompue.');
                } else if (fetchError.message.includes('Failed to fetch')) {
                    throw new Error('Erreur de connexion réseau (Failed to fetch). Cela peut être dû à un problème CORS, une connexion Internet interrompue, ou des paramètres de sécurité dans Electron.');
                } else {
                    throw new Error(`Erreur réseau: ${fetchError.message}`);
                }
            }
            
            if (!response.ok) {
                let errorMessage = '';
                let errorBody = null;
                
                // Essayer de récupérer le message d'erreur depuis le body
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        errorBody = await response.json();
                    } else {
                        errorBody = await response.text();
                    }
                } catch (e) {
                    // Ignorer si on ne peut pas lire le body
                }
                
                if (response.status === 401) {
                    errorMessage = 'Erreur 401 (Non autorisé): Clé API invalide, expirée ou manquante.';
                    if (errorBody) {
                        if (typeof errorBody === 'object' && errorBody.message) {
                            errorMessage += ` ${errorBody.message}`;
                        } else if (typeof errorBody === 'string') {
                            errorMessage += ` ${errorBody}`;
                        }
                    }
                    errorMessage += ' Vérifiez que votre clé API est correcte et valide sur https://developer.riotgames.com/';
                } else if (response.status === 429) {
                    // Rate limit exceeded
                    const retryAfter = response.headers.get('Retry-After') || '60';
                    errorMessage = `Limite de taux dépassée. Réessayez dans ${retryAfter} secondes.`;
                } else if (response.status === 403) {
                    errorMessage = 'Erreur 403 (Interdit): Clé API invalide, expirée ou permissions insuffisantes.';
                    if (errorBody) {
                        if (typeof errorBody === 'object' && errorBody.message) {
                            errorMessage += ` ${errorBody.message}`;
                        } else if (typeof errorBody === 'string') {
                            errorMessage += ` ${errorBody}`;
                        }
                    }
                } else if (response.status === 404) {
                    errorMessage = 'Ressource non trouvée (404). L\'endpoint API pourrait être incorrect.';
                } else {
                    errorMessage = `Erreur API: ${response.status} ${response.statusText}`;
                    if (errorBody) {
                        if (typeof errorBody === 'object' && errorBody.message) {
                            errorMessage += ` - ${errorBody.message}`;
                        } else if (typeof errorBody === 'string') {
                            errorMessage += ` - ${errorBody}`;
                        }
                    }
                }
                
                console.error(`❌ Erreur API ${response.status}:`, {
                    url,
                    status: response.status,
                    statusText: response.statusText,
                    errorBody
                });
                
                throw new Error(errorMessage);
            }

            const data = await response.json();

            // Mettre en cache
            if (useCache) {
                this.cache.set(cacheKey, data, cacheTTL);
            }

            return data;
        } catch (error) {
            console.error(`❌ Erreur lors de la requête API (${endpoint}):`, error);
            throw error;
        }
    }

    /**
     * Obtient le contenu du jeu (agents, maps, etc.) - VAL-CONTENT-V1
     * @param {string} locale - Locale (défaut: 'fr-FR')
     * @returns {Promise<Object>}
     */
    async getContent(locale = 'fr-FR') {
        if (this.provider === 'riot') {
            // Pour VAL-CONTENT-V1, on utilise la région (eu, na, ap, kr, latam, br)
            // Le baseURL devrait déjà être configuré avec la région
            return await this.request(`/val/content/v1/contents?locale=${locale}`, {
                useCache: true,
                cacheTTL: 3600000 // Cache 1 heure pour le contenu
            });
        } else if (this.provider === 'henrik') {
            return await this.request(`/v1/content?locale=${locale}`, {
                useCache: true,
                cacheTTL: 3600000
            });
        }
        throw new Error('Provider non supporté pour getContent');
    }

    /**
     * Obtient le statut des serveurs - VAL-STATUS-V1
     * Note: Pour Riot Games API, VAL-STATUS-V1 nécessite une plateforme, pas une région
     * @returns {Promise<Object>}
     */
    async getStatus() {
        if (this.provider === 'riot') {
            // Pour VAL-STATUS-V1, on utilise une plateforme spécifique
            // Les plateformes valides pour Valorant sont: na1, eu1, ap, kr, br1, latam1
            // Note: VAL-STATUS-V1 peut nécessiter une plateforme spécifique selon la région
            const platformMap = {
                'eu': 'eu1',
                'euw': 'euw1',
                'eun': 'eun1',
                'na': 'na1',
                'ap': 'ap',
                'kr': 'kr',
                'br': 'br1',
                'latam': 'latam1'
            };
            
            // Essayer d'abord avec la plateforme correspondant à la région
            let platform = platformMap[this.region] || this.region;
            
            // Si la plateforme n'est pas dans le format attendu, utiliser eu1 par défaut
            if (!['na1', 'eu1', 'euw1', 'eun1', 'ap', 'kr', 'br1', 'latam1'].includes(platform)) {
                console.warn(`Plateforme ${platform} non reconnue, utilisation de eu1 par défaut`);
                platform = 'eu1';
            }
            
            // Construire l'URL complète avec la plateforme
            const statusBaseURL = `https://${platform}.api.riotgames.com`;
            const endpoint = '/val/status/v1/platform-data';
            
            console.log(`🔍 Tentative de récupération du statut avec plateforme: ${platform}`);
            
            try {
                // Utiliser request avec baseURL surchargé
                const status = await this.request(endpoint, { 
                    baseURL: statusBaseURL,
                    useCache: true,
                    cacheTTL: 60000 // Cache 1 minute pour le statut
                });
                return status;
            } catch (error) {
                // Si l'erreur est 404 ou si la plateforme ne fonctionne pas, essayer avec eu1
                if (error.message.includes('404') || error.message.includes('Non trouvé')) {
                    console.warn(`Plateforme ${platform} non disponible, essai avec eu1`);
                    if (platform !== 'eu1') {
                        const fallbackBaseURL = 'https://eu1.api.riotgames.com';
                        return await this.request(endpoint, { 
                            baseURL: fallbackBaseURL,
                            useCache: true,
                            cacheTTL: 60000
                        });
                    }
                }
                // Propager l'erreur si ce n'est pas un 404
                throw error;
            }
        } else if (this.provider === 'henrik') {
            return await this.request(`/v1/website/${this.region}`);
        }
        throw new Error('Provider non supporté pour getStatus');
    }

    /**
     * Obtient les classements - VAL-RANKED-V1
     * @param {string} actId - ID de l'acte
     * @param {number} start - Index de départ (défaut: 0)
     * @param {number} size - Taille (défaut: 200)
     * @returns {Promise<Object>}
     */
    async getLeaderboard(actId, start = 0, size = 200) {
        if (this.provider === 'riot') {
            return await this.request(`/val/ranked/v1/leaderboards/by-act/${actId}?start=${start}&size=${size}`);
        } else if (this.provider === 'henrik') {
            return await this.request(`/v1/leaderboard/${this.region}`);
        }
        throw new Error('Provider non supporté pour getLeaderboard');
    }

    /**
     * Obtient les détails d'un match - VAL-MATCH-V1
     * ⚠️ Nécessite le PUUID du joueur et son consentement
     * @param {string} matchId - ID du match
     * @returns {Promise<Object>}
     */
    async getMatch(matchId) {
        if (this.provider === 'riot') {
            return await this.request(`/val/match/v1/matches/${matchId}`);
        } else if (this.provider === 'henrik') {
            return await this.request(`/v2/match/${matchId}`);
        }
        throw new Error('Provider non supporté pour getMatch');
    }

    /**
     * Obtient l'historique des matchs d'un joueur - VAL-MATCH-V1
     * ⚠️ Nécessite le PUUID du joueur et son consentement
     * @param {string} puuid - PUUID du joueur
     * @param {string} queue - Type de queue (défaut: 'competitive')
     * @returns {Promise<Object>}
     */
    async getMatchHistory(puuid, queue = 'competitive') {
        if (this.provider === 'riot') {
            return await this.request(`/val/match/v1/matchlists/by-puuid/${puuid}?queue=${queue}`);
        } else if (this.provider === 'henrik') {
            return await this.request(`/v3/matches/${this.region}/${puuid}?filter=${queue}`);
        }
        throw new Error('Provider non supporté pour getMatchHistory');
    }

    /**
     * Teste la connexion API
     * Pour Riot Games, on utilise un endpoint plus simple (account-v1) pour tester
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        try {
            if (!this.isConfigured()) {
                throw new Error('API non configurée');
            }
            
            if (this.provider === 'riot') {
                // Pour tester la connexion, on utilise un endpoint plus simple
                // VAL-STATUS-V1 nécessite une plateforme spécifique, donc on teste avec un endpoint plus simple
                // On teste avec l'endpoint de contenu qui est plus fiable
                try {
                    await this.request(`/val/content/v1/contents?locale=fr-FR`);
                    return true;
                } catch (error) {
                    // Si ça échoue, essayer avec getStatus
                    console.warn('Test avec /val/content/v1/contents échoué, essai avec getStatus:', error);
                    await this.getStatus();
                    return true;
                }
            } else if (this.provider === 'henrik') {
                await this.getStatus();
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('❌ Test de connexion API échoué:', error);
            throw error; // Propager l'erreur pour avoir plus de détails
        }
    }

    /**
     * Vide le cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache API vidé');
    }

    /**
     * Obtient les statistiques du service
     * @returns {Object}
     */
    getStats() {
        return {
            provider: this.provider,
            isConfigured: this.isConfigured(),
            cacheSize: this.cache.cache.size,
            rateLimiterRequests: this.rateLimiter.requests.length
        };
    }
}

// Rendre le service disponible globalement
window.APIService = APIService;
window.RateLimiter = RateLimiter;
window.APICache = APICache;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIService, RateLimiter, APICache };
}

