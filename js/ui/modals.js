/**
 * Module de gestion des modales
 * Fournit des utilitaires pour ouvrir, fermer et gérer les modales
 */

/**
 * Classe pour gérer les modales
 */
class ModalsManager {
    constructor(options = {}) {
        this.accessibilityService = options.accessibilityService || null;
        this.openModals = new Set();
        this.init();
    }

    /**
     * Initialise le gestionnaire de modales
     */
    init() {
        // Fermer les modales avec Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.openModals.size > 0) {
                const openModal = Array.from(this.openModals)[this.openModals.size - 1];
                this.close(openModal);
            }
        });

        // Fermer les modales en cliquant à l'extérieur
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.close(e.target);
            }
        });

        // Initialiser les boutons de fermeture existants
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) {
                    this.close(modal);
                }
            });
        });
    }

    /**
     * Ouvre une modale
     * @param {string|HTMLElement} modalId - ID ou élément de la modale
     * @param {Object} options - Options (onOpen, onClose, etc.)
     */
    open(modalId, options = {}) {
        const modal = typeof modalId === 'string' 
            ? document.getElementById(modalId) 
            : modalId;
        
        if (!modal) {
            console.warn(`Modale non trouvée: ${modalId}`);
            return;
        }

        // Fermer les modales précédentes si nécessaire
        if (options.closeOthers !== false) {
            this.closeAll();
        }

        // Afficher la modale
        modal.classList.add('show');
        this.openModals.add(modal);

        // Mettre à jour ARIA
        if (this.accessibilityService) {
            this.accessibilityService.updateAriaForModal(modal, true);
        }

        // Appeler le callback onOpen si fourni
        if (options.onOpen && typeof options.onOpen === 'function') {
            options.onOpen(modal);
        }

        // Focus sur le premier élément focusable
        const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    /**
     * Ferme une modale
     * @param {string|HTMLElement} modalId - ID ou élément de la modale
     * @param {Object} options - Options (onClose, etc.)
     */
    close(modalId, options = {}) {
        const modal = typeof modalId === 'string' 
            ? document.getElementById(modalId) 
            : modalId;
        
        if (!modal) {
            console.warn(`Modale non trouvée: ${modalId}`);
            return;
        }

        // Cacher la modale
        modal.classList.remove('show');
        this.openModals.delete(modal);

        // Mettre à jour ARIA
        if (this.accessibilityService) {
            this.accessibilityService.updateAriaForModal(modal, false);
        }

        // Appeler le callback onClose si fourni
        if (options.onClose && typeof options.onClose === 'function') {
            options.onClose(modal);
        }
    }

    /**
     * Ferme toutes les modales ouvertes
     */
    closeAll() {
        const modalsArray = Array.from(this.openModals);
        modalsArray.forEach(modal => {
            this.close(modal);
        });
    }

    /**
     * Vérifie si une modale est ouverte
     * @param {string|HTMLElement} modalId - ID ou élément de la modale
     * @returns {boolean}
     */
    isOpen(modalId) {
        const modal = typeof modalId === 'string' 
            ? document.getElementById(modalId) 
            : modalId;
        
        return modal ? modal.classList.contains('show') : false;
    }

    /**
     * Toggle l'état d'une modale (ouvrir si fermée, fermer si ouverte)
     * @param {string|HTMLElement} modalId - ID ou élément de la modale
     * @param {Object} options - Options
     */
    toggle(modalId, options = {}) {
        const modal = typeof modalId === 'string' 
            ? document.getElementById(modalId) 
            : modalId;
        
        if (!modal) {
            console.warn(`Modale non trouvée: ${modalId}`);
            return;
        }

        if (this.isOpen(modal)) {
            this.close(modal, options);
        } else {
            this.open(modal, options);
        }
    }

    /**
     * Enregistre un gestionnaire de fermeture pour une modale
     * @param {string|HTMLElement} modalId - ID ou élément de la modale
     * @param {Function} handler - Fonction à appeler lors de la fermeture
     */
    onClose(modalId, handler) {
        const modal = typeof modalId === 'string' 
            ? document.getElementById(modalId) 
            : modalId;
        
        if (!modal) {
            console.warn(`Modale non trouvée: ${modalId}`);
            return;
        }

        // Ajouter un attribut data pour stocker le handler
        modal.dataset.closeHandler = 'true';
        
        // Ajouter un event listener personnalisé
        modal.addEventListener('modal:close', (e) => {
            if (typeof handler === 'function') {
                handler(e.detail || {});
            }
        });
    }

    /**
     * Déclenche un événement de fermeture personnalisé
     * @param {string|HTMLElement} modalId - ID ou élément de la modale
     * @param {Object} detail - Détails de l'événement
     */
    triggerClose(modalId, detail = {}) {
        const modal = typeof modalId === 'string' 
            ? document.getElementById(modalId) 
            : modalId;
        
        if (!modal) {
            return;
        }

        const event = new CustomEvent('modal:close', { detail });
        modal.dispatchEvent(event);
    }
}

// Créer une instance globale si elle n'existe pas déjà
if (!window.modalsManager) {
    window.modalsManager = null; // Sera initialisé dans renderer.js
}

// Rendre la classe disponible globalement
window.ModalsManager = ModalsManager;

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalsManager;
}

