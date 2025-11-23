/**
 * Module de gestion des onglets
 * Gère la navigation et l'affichage des onglets principaux et secondaires
 */

/**
 * Classe pour gérer les onglets
 */
class TabsManager {
    constructor(options = {}) {
        this.accessibilityService = options.accessibilityService || null;
        this.updateCallbacks = options.updateCallbacks || {};
    }

    /**
     * Change l'onglet actif
     * @param {string} tabName - Nom de l'onglet à activer
     */
    switchTab(tabName) {
        const targetTab = document.getElementById(`${tabName}Tab`);
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (!targetTab || !targetBtn) return;
        
        // Obtenir l'onglet actif actuel
        const currentActiveTab = document.querySelector('.tab-content.active');
        const currentActiveBtn = document.querySelector('.tab-btn.active');
        
        // Animation de sortie de l'onglet actuel
        if (currentActiveTab && currentActiveTab !== targetTab) {
            currentActiveTab.classList.add('tab-exiting');
            setTimeout(() => {
                currentActiveTab.classList.remove('active', 'tab-exiting');
            }, 200);
        } else if (currentActiveTab) {
            currentActiveTab.classList.remove('active');
        }
        
        // Désactiver tous les boutons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Activer le nouveau bouton avec animation
        targetBtn.classList.add('active');
        
        // Animation d'entrée du nouvel onglet
        targetTab.classList.add('tab-entering');
        setTimeout(() => {
            targetTab.classList.add('active');
            targetTab.classList.remove('tab-entering');
        }, 50);
        
        // Mettre à jour les attributs ARIA
        if (this.accessibilityService) {
            this.accessibilityService.updateAriaForTab(tabName);
        }
        
        // Mettre à jour le contenu si nécessaire
        const updateCallback = this.updateCallbacks[tabName];
        if (updateCallback) {
            setTimeout(() => {
                updateCallback();
            }, 100);
        }
    }

    /**
     * Change l'onglet de statistiques actif
     * @param {string} tabName - Nom de l'onglet de statistiques à activer
     */
    switchStatsTab(tabName) {
        const targetTab = document.getElementById(`${tabName}StatsTab`);
        const targetBtn = document.querySelector(`[data-stats-tab="${tabName}"]`);
        
        if (!targetTab || !targetBtn) return;
        
        // Obtenir l'onglet actif actuel
        const currentActiveTab = document.querySelector('.stats-tab-content.active');
        
        // Animation de sortie
        if (currentActiveTab && currentActiveTab !== targetTab) {
            currentActiveTab.classList.add('tab-exiting');
            setTimeout(() => {
                currentActiveTab.classList.remove('active', 'tab-exiting');
            }, 200);
        } else if (currentActiveTab) {
            currentActiveTab.classList.remove('active');
        }
        
        // Désactiver tous les boutons
        document.querySelectorAll('.stats-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Activer le nouveau bouton
        targetBtn.classList.add('active');
        
        // Animation d'entrée
        targetTab.classList.add('tab-entering');
        setTimeout(() => {
            targetTab.classList.add('active');
            targetTab.classList.remove('tab-entering');
        }, 50);
        
        // Mettre à jour le contenu
        const updateCallback = this.updateCallbacks[`stats_${tabName}`];
        if (updateCallback) {
            setTimeout(() => {
                updateCallback();
            }, 100);
        }
    }

    /**
     * Enregistre un callback de mise à jour pour un onglet
     * @param {string} tabName - Nom de l'onglet
     * @param {Function} callback - Fonction à appeler lors du changement d'onglet
     */
    registerUpdateCallback(tabName, callback) {
        this.updateCallbacks[tabName] = callback;
    }

    /**
     * Enregistre un callback de mise à jour pour un onglet de statistiques
     * @param {string} tabName - Nom de l'onglet de statistiques
     * @param {Function} callback - Fonction à appeler lors du changement d'onglet
     */
    registerStatsUpdateCallback(tabName, callback) {
        this.updateCallbacks[`stats_${tabName}`] = callback;
    }
}

// Exporter pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TabsManager;
}

// Rendre disponible globalement
window.TabsManager = TabsManager;

