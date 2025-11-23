/**
 * Service de gestion des raccourcis clavier avancés
 * Permet de définir et gérer des raccourcis clavier personnalisables
 */
class KeyboardService {
    constructor() {
        this.shortcuts = new Map();
        this.enabled = true;
        this.helpModal = null;
    }

    /**
     * Enregistre un raccourci clavier
     */
    register(keys, callback, description = '') {
        const keyString = this.normalizeKeys(keys);
        this.shortcuts.set(keyString, {
            callback,
            description,
            keys: keyString
        });
    }

    /**
     * Normalise la chaîne de touches (ex: "Ctrl+S" ou "Ctrl+Shift+N")
     */
    normalizeKeys(keys) {
        return keys.toLowerCase()
            .split('+')
            .map(k => k.trim())
            .sort()
            .join('+');
    }

    /**
     * Vérifie si une combinaison de touches correspond à un raccourci
     */
    checkShortcut(event) {
        if (!this.enabled) return false;

        const keys = [];
        
        if (event.ctrlKey || event.metaKey) keys.push('ctrl');
        if (event.shiftKey) keys.push('shift');
        if (event.altKey) keys.push('alt');
        
        const key = event.key.toLowerCase();
        if (key && !['control', 'shift', 'alt', 'meta'].includes(key)) {
            keys.push(key);
        }

        const keyString = keys.sort().join('+');
        const shortcut = this.shortcuts.get(keyString);

        if (shortcut) {
            event.preventDefault();
            shortcut.callback();
            return true;
        }

        return false;
    }

    /**
     * Active/désactive les raccourcis
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Obtient tous les raccourcis enregistrés
     */
    getAllShortcuts() {
        return Array.from(this.shortcuts.values());
    }

    /**
     * Supprime un raccourci
     */
    unregister(keys) {
        const keyString = this.normalizeKeys(keys);
        return this.shortcuts.delete(keyString);
    }

    /**
     * Formate une touche pour l'affichage
     */
    formatKey(key) {
        const keyMap = {
            'ctrl': 'Ctrl',
            'shift': 'Shift',
            'alt': 'Alt',
            'meta': 'Cmd',
            ' ': 'Espace',
            'arrowup': '↑',
            'arrowdown': '↓',
            'arrowleft': '←',
            'arrowright': '→',
            'enter': 'Entrée',
            'escape': 'Échap',
            'delete': 'Suppr',
            'backspace': 'Retour'
        };

        if (keyMap[key]) {
            return keyMap[key];
        }

        // Capitaliser la première lettre
        return key.charAt(0).toUpperCase() + key.slice(1);
    }

    /**
     * Formate une combinaison de touches pour l'affichage
     */
    formatShortcut(keys) {
        return keys.split('+')
            .map(k => this.formatKey(k))
            .join(' + ');
    }

    /**
     * Génère le HTML pour l'aide des raccourcis
     */
    generateHelpHTML() {
        const shortcuts = this.getAllShortcuts();
        
        if (shortcuts.length === 0) {
            return '<p>Aucun raccourci enregistré.</p>';
        }

        // Grouper par catégorie
        const categories = {
            'Fichier': [],
            'Navigation': [],
            'Actions': [],
            'Autres': []
        };

        shortcuts.forEach(shortcut => {
            const desc = shortcut.description.toLowerCase();
            if (desc.includes('sauvegard') || desc.includes('import') || desc.includes('export')) {
                categories['Fichier'].push(shortcut);
            } else if (desc.includes('onglet') || desc.includes('tab') || desc.includes('navig')) {
                categories['Navigation'].push(shortcut);
            } else if (desc.includes('ajout') || desc.includes('supprim') || desc.includes('modif')) {
                categories['Actions'].push(shortcut);
            } else {
                categories['Autres'].push(shortcut);
            }
        });

        let html = '';

        Object.keys(categories).forEach(category => {
            if (categories[category].length > 0) {
                html += `<div class="shortcut-category">
                    <h3>${category}</h3>
                    <div class="shortcut-list">`;
                
                categories[category].forEach(shortcut => {
                    html += `
                        <div class="shortcut-item">
                            <div class="shortcut-keys">
                                <kbd>${this.formatShortcut(shortcut.keys)}</kbd>
                            </div>
                            <div class="shortcut-description">${shortcut.description || 'Aucune description'}</div>
                        </div>
                    `;
                });

                html += `</div></div>`;
            }
        });

        return html;
    }
}

// Rendre le service disponible globalement
window.KeyboardService = KeyboardService;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyboardService;
}

