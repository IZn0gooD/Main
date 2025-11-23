/**
 * Service de chargement asynchrone des ressources
 * Améliore la réactivité en chargeant les ressources de manière asynchrone
 */
class ResourceLoader {
    constructor() {
        this.imageCache = new Map();
        this.loadingPromises = new Map();
        this.maxConcurrentLoads = 5;
        this.currentLoads = 0;
        this.loadQueue = [];
    }

    /**
     * Charge une image de manière asynchrone avec cache
     */
    async loadImage(src) {
        // Vérifier le cache
        if (this.imageCache.has(src)) {
            return this.imageCache.get(src);
        }

        // Vérifier si l'image est déjà en cours de chargement
        if (this.loadingPromises.has(src)) {
            return this.loadingPromises.get(src);
        }

        // Créer une promesse de chargement
        const loadPromise = this._loadImageWithQueue(src);
        this.loadingPromises.set(src, loadPromise);

        try {
            const image = await loadPromise;
            this.imageCache.set(src, image);
            return image;
        } catch (error) {
            console.error(`Erreur lors du chargement de l'image ${src}:`, error);
            throw error;
        } finally {
            this.loadingPromises.delete(src);
        }
    }

    /**
     * Charge une image avec gestion de la file d'attente
     */
    async _loadImageWithQueue(src) {
        return new Promise((resolve, reject) => {
            const loadImage = () => {
                if (this.currentLoads >= this.maxConcurrentLoads) {
                    // Ajouter à la file d'attente
                    this.loadQueue.push(() => {
                        this.currentLoads++;
                        this._performImageLoad(src, resolve, reject);
                    });
                    return;
                }

                this.currentLoads++;
                this._performImageLoad(src, resolve, reject);
            };

            loadImage();
        });
    }

    /**
     * Effectue le chargement réel de l'image
     */
    _performImageLoad(src, resolve, reject) {
        const img = new Image();
        
        img.onload = () => {
            this.currentLoads--;
            resolve(img);
            // Traiter la file d'attente
            this._processQueue();
        };
        
        img.onerror = (error) => {
            this.currentLoads--;
            reject(new Error(`Impossible de charger l'image: ${src}`));
            // Traiter la file d'attente même en cas d'erreur
            this._processQueue();
        };
        
        img.src = src;
    }

    /**
     * Traite la file d'attente de chargement
     */
    _processQueue() {
        if (this.loadQueue.length > 0 && this.currentLoads < this.maxConcurrentLoads) {
            const nextLoad = this.loadQueue.shift();
            nextLoad();
        }
    }

    /**
     * Précharge plusieurs images
     */
    async preloadImages(srcArray) {
        const loadPromises = srcArray.map(src => this.loadImage(src).catch(err => {
            console.warn(`Échec du préchargement de ${src}:`, err);
            return null;
        }));
        
        return Promise.all(loadPromises);
    }

    /**
     * Charge une image et l'affiche dans un élément
     */
    async loadImageIntoElement(src, element) {
        try {
            const img = await this.loadImage(src);
            if (element) {
                element.src = img.src;
                element.style.opacity = '0';
                // Animation de fade-in
                setTimeout(() => {
                    element.style.transition = 'opacity 0.3s ease';
                    element.style.opacity = '1';
                }, 10);
            }
            return img;
        } catch (error) {
            console.error(`Erreur lors du chargement de l'image dans l'élément:`, error);
            if (element) {
                element.style.opacity = '0.5';
            }
            throw error;
        }
    }

    /**
     * Charge des données JSON de manière asynchrone
     */
    async loadJSON(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Erreur lors du chargement JSON depuis ${url}:`, error);
            throw error;
        }
    }

    /**
     * Précharge toutes les images d'agents
     */
    async preloadAgentImages() {
        const { ALL_AGENTS } = window;
        if (!ALL_AGENTS) {
            console.warn('ALL_AGENTS non disponible');
            return;
        }

        const path = require('path');
        const agentPaths = ALL_AGENTS.map(agent => {
            const agentFileMap = {
                'Jett': 'Jett.png',
                'Phoenix': 'Phoenix.png',
                'Raze': 'Raze.png',
                'Reyna': 'Reyna.png',
                'Omen': 'Omen.png',
                'Viper': 'Viper.png',
                'Killjoy': 'Killjoy.png',
                'Sage': 'Sage.png',
                'Sova': 'Sova.png',
                'Cypher': 'Cypher.png',
                'Astra': 'Astra.png',
                'Breach': 'Breach.png',
                'Brimstone': 'Brimstone.png',
                'Chamber': 'Chamber.png',
                'Clove': 'Clove.png',
                'Deadlock': 'Deadlock.png',
                'Fade': 'Fade.png',
                'Gekko': 'Gekko.png',
                'Harbor': 'Harbor.png',
                'Iso': 'Iso.png',
                'Kayo': 'KAYO.png',
                'KAY/O': 'KAYO.png', // alias pour l'orthographe officielle
                'Neon': 'Neon.png',
                'Skye': 'Skye.png',
                'Tejo': 'Tejo.png',
                'Veto': 'Veto.png',
                'Vyse': 'Vyse.png',
                'Waylay': 'Waylay.png',
                'Yoru': 'Yoru.png'
            };
            
            const fileName = agentFileMap[agent] || `${agent}.png`;
            const imagePath = path.join(__dirname, 'assets', 'Agents', fileName);
            return `file:///${imagePath.replace(/\\/g, '/')}`;
        });

        console.log('🖼️ Préchargement des images d\'agents...');
        await this.preloadImages(agentPaths);
        console.log('✅ Images d\'agents préchargées');
    }

    /**
     * Précharge toutes les images de maps
     */
    async preloadMapImages() {
        const { ALL_MAPS } = window;
        if (!ALL_MAPS) {
            console.warn('ALL_MAPS non disponible');
            return;
        }

        const path = require('path');
        const mapPaths = ALL_MAPS.map(map => {
            const mapFileMap = {
                'Ascent': 'Ascent.png',
                'Bind': 'Bind.png',
                'Breeze': 'Breeze.png',
                'Fracture': 'Fracture.png',
                'Haven': 'Haven.png',
                'Icebox': 'Icebox.png',
                'Lotus': 'Lotus.png',
                'Pearl': 'Pearl.png',
                'Split': 'Split.png',
                'Sunset': 'Sunset.png',
                'Abyss': 'Abyss.png',
                'Corrode': 'Corrode.png'
            };
            
            const fileName = mapFileMap[map] || `${map}.png`;
            const imagePath = path.join(__dirname, 'assets', 'Maps', fileName);
            return `file:///${imagePath.replace(/\\/g, '/')}`;
        });

        console.log('🗺️ Préchargement des images de maps...');
        await this.preloadImages(mapPaths);
        console.log('✅ Images de maps préchargées');
    }

    /**
     * Précharge toutes les ressources principales
     */
    async preloadAllResources() {
        console.log('📦 Début du préchargement des ressources...');
        
        try {
            // Précharger les images d'agents et de maps en parallèle
            await Promise.all([
                this.preloadAgentImages(),
                this.preloadMapImages()
            ]);
            
            console.log('✅ Toutes les ressources ont été préchargées');
        } catch (error) {
            console.error('❌ Erreur lors du préchargement des ressources:', error);
        }
    }

    /**
     * Nettoie le cache
     */
    clearCache() {
        this.imageCache.clear();
        console.log('🗑️ Cache des images vidé');
    }

    /**
     * Obtient les statistiques du cache
     */
    getCacheStats() {
        return {
            cachedImages: this.imageCache.size,
            loadingImages: this.loadingPromises.size,
            queuedLoads: this.loadQueue.length,
            currentLoads: this.currentLoads
        };
    }
}

// Rendre le service disponible globalement
window.ResourceLoader = ResourceLoader;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResourceLoader;
}

