/**
 * Service de gestion de l'accessibilité
 * Gère les attributs ARIA, la navigation au clavier, le contraste et la taille de police
 */
class AccessibilityService {
    constructor() {
        this.fontSize = 16; // Taille de police par défaut (px)
        this.highContrast = false;
        this.init();
    }

    /**
     * Initialise le service d'accessibilité
     */
    init() {
        // Charger les préférences depuis le localStorage
        this.loadPreferences();
        
        // Appliquer les préférences
        this.applyFontSize();
        this.applyHighContrast();
        
        // Ajouter les attributs ARIA de base
        this.addAriaAttributes();
    }

    /**
     * Charge les préférences d'accessibilité depuis le localStorage
     */
    loadPreferences() {
        try {
            const savedFontSize = localStorage.getItem('accessibility_fontSize');
            if (savedFontSize) {
                this.fontSize = parseInt(savedFontSize, 10);
            }
            
            const savedContrast = localStorage.getItem('accessibility_highContrast');
            if (savedContrast) {
                this.highContrast = savedContrast === 'true';
            }
        } catch (error) {
            console.error('Erreur lors du chargement des préférences d\'accessibilité:', error);
        }
    }

    /**
     * Sauvegarde les préférences d'accessibilité dans le localStorage
     */
    savePreferences() {
        try {
            localStorage.setItem('accessibility_fontSize', this.fontSize.toString());
            localStorage.setItem('accessibility_highContrast', this.highContrast.toString());
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des préférences d\'accessibilité:', error);
        }
    }

    /**
     * Ajoute les attributs ARIA de base à l'interface
     */
    addAriaAttributes() {
        // Ajouter role="main" au conteneur principal
        const contentArea = document.querySelector('.content-area');
        if (contentArea) {
            contentArea.setAttribute('role', 'main');
            contentArea.setAttribute('aria-label', 'Zone de contenu principal');
        }

        // Ajouter role="navigation" aux onglets
        const tabsContainer = document.querySelector('.tabs-container');
        if (tabsContainer) {
            tabsContainer.setAttribute('role', 'tablist');
            tabsContainer.setAttribute('aria-label', 'Navigation principale');
        }

        // Ajouter les attributs ARIA aux boutons d'onglets
        document.querySelectorAll('.tab-btn').forEach((btn, index) => {
            const tabName = btn.dataset.tab;
            const tabId = `${tabName}Tab`;
            btn.setAttribute('role', 'tab');
            btn.setAttribute('aria-controls', tabId);
            btn.setAttribute('aria-selected', btn.classList.contains('active') ? 'true' : 'false');
            btn.setAttribute('id', `tab-${tabName}`);
            btn.setAttribute('tabindex', btn.classList.contains('active') ? '0' : '-1');
        });

        // Ajouter les attributs ARIA aux contenus d'onglets
        document.querySelectorAll('.tab-content').forEach((content) => {
            const tabName = content.id.replace('Tab', '');
            content.setAttribute('role', 'tabpanel');
            content.setAttribute('aria-labelledby', `tab-${tabName}`);
            content.setAttribute('aria-hidden', content.classList.contains('active') ? 'false' : 'true');
        });

        // Ajouter les attributs ARIA aux boutons
        document.querySelectorAll('button').forEach((btn) => {
            if (!btn.getAttribute('aria-label') && btn.title) {
                btn.setAttribute('aria-label', btn.title);
            }
        });

        // Ajouter les attributs ARIA aux modales
        document.querySelectorAll('.modal').forEach((modal) => {
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-hidden', 'true');
        });

        // Ajouter les attributs ARIA aux listes
        document.querySelectorAll('.list-content').forEach((list) => {
            list.setAttribute('role', 'list');
        });

        // Ajouter les attributs ARIA aux éléments de liste
        document.querySelectorAll('.list-item').forEach((item) => {
            item.setAttribute('role', 'listitem');
        });
    }

    /**
     * Met à jour les attributs ARIA lors du changement d'onglet
     */
    updateAriaForTab(activeTabName) {
        // Mettre à jour les boutons d'onglets
        document.querySelectorAll('.tab-btn').forEach((btn) => {
            const tabName = btn.dataset.tab;
            const isActive = tabName === activeTabName;
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            btn.setAttribute('tabindex', isActive ? '0' : '-1');
        });

        // Mettre à jour les contenus d'onglets
        document.querySelectorAll('.tab-content').forEach((content) => {
            const tabName = content.id.replace('Tab', '');
            const isActive = tabName === activeTabName;
            content.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });
    }

    /**
     * Met à jour les attributs ARIA pour une modale
     */
    updateAriaForModal(modal, isOpen) {
        if (modal) {
            modal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
            
            // Gérer le focus trap
            if (isOpen) {
                const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            }
        }
    }

    /**
     * Augmente la taille de police
     */
    increaseFontSize() {
        if (this.fontSize < 24) {
            this.fontSize += 2;
            this.applyFontSize();
            this.savePreferences();
        }
    }

    /**
     * Diminue la taille de police
     */
    decreaseFontSize() {
        if (this.fontSize > 12) {
            this.fontSize -= 2;
            this.applyFontSize();
            this.savePreferences();
        }
    }

    /**
     * Réinitialise la taille de police
     */
    resetFontSize() {
        this.fontSize = 16;
        this.applyFontSize();
        this.savePreferences();
    }

    /**
     * Applique la taille de police
     */
    applyFontSize() {
        document.documentElement.style.setProperty('--base-font-size', `${this.fontSize}px`);
        document.body.style.fontSize = `${this.fontSize}px`;
    }

    /**
     * Active/désactive le mode contraste élevé
     */
    toggleHighContrast() {
        this.highContrast = !this.highContrast;
        this.applyHighContrast();
        this.savePreferences();
    }

    /**
     * Applique le mode contraste élevé
     */
    applyHighContrast() {
        if (this.highContrast) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
    }

    /**
     * Obtient la taille de police actuelle
     */
    getFontSize() {
        return this.fontSize;
    }

    /**
     * Obtient l'état du contraste élevé
     */
    isHighContrast() {
        return this.highContrast;
    }
}

// Rendre le service disponible globalement
window.AccessibilityService = AccessibilityService;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityService;
}

