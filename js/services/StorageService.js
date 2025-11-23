/**
 * Service de gestion du stockage et du cache
 * Gère les accès aux fichiers JSON avec cache pour améliorer les performances
 */
class StorageService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5000; // 5 secondes de cache
        this.lastSaveTime = null;
        this.autoSaveInterval = null;
        this.autoSaveEnabled = false;
        this.autoSaveDelay = 30000; // 30 secondes
    }

    /**
     * Charge une équipe depuis un fichier avec cache
     */
    async loadTeam(filePath = null) {
        const cacheKey = filePath || 'default';
        
        // Vérifier le cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const { ipcRenderer } = require('electron');
            const teamData = await ipcRenderer.invoke('load-team', filePath);
            
            // Mettre en cache
            if (teamData) {
                this.cache.set(cacheKey, {
                    data: teamData,
                    timestamp: Date.now()
                });
            }
            
            return teamData;
        } catch (error) {
            console.error('Erreur lors du chargement de l\'équipe:', error);
            throw error;
        }
    }

    /**
     * Sauvegarde une équipe dans un fichier
     */
    async saveTeam(teamData, filePath = null) {
        try {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('save-team', teamData, filePath);
            
            // Invalider le cache
            const cacheKey = filePath || 'default';
            this.cache.delete(cacheKey);
            
            this.lastSaveTime = Date.now();
            return result;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            throw error;
        }
    }

    /**
     * Active la sauvegarde automatique
     */
    enableAutoSave(saveCallback, delay = 30000) {
        this.autoSaveEnabled = true;
        this.autoSaveDelay = delay;
        
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        this.autoSaveInterval = setInterval(() => {
            if (this.autoSaveEnabled && saveCallback) {
                saveCallback();
            }
        }, this.autoSaveDelay);
    }

    /**
     * Désactive la sauvegarde automatique
     */
    disableAutoSave() {
        this.autoSaveEnabled = false;
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    /**
     * Vide le cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Vérifie l'intégrité d'un fichier JSON
     */
    async validateJSONFile(filePath) {
        try {
            const { ipcRenderer } = require('electron');
            const data = await ipcRenderer.invoke('load-team', filePath);
            
            // Vérifications de base
            if (!data) {
                return { valid: false, error: 'Fichier vide ou inexistant' };
            }
            
            if (typeof data !== 'object') {
                return { valid: false, error: 'Format invalide: doit être un objet' };
            }
            
            // Vérifier la structure de base
            const requiredFields = ['name', 'players', 'matches', 'progression_entries'];
            for (const field of requiredFields) {
                if (!(field in data)) {
                    return { valid: false, error: `Champ manquant: ${field}` };
                }
            }
            
            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
}

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageService;
}

