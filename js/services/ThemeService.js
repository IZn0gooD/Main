/**
 * Service de gestion des thèmes personnalisables
 * Permet de changer les couleurs d'accent et les modes de couleur
 */
class ThemeService {
    constructor() {
        this.themes = {
            default: {
                name: 'Valorant Rouge',
                accent: '#ff4655',
                accentHover: '#ff6b7a',
                bgPrimary: '#171f26',
                bgSecondary: '#1e2832',
                bgTertiary: '#252f3a',
                textPrimary: '#ffffff',
                textSecondary: '#b0b8c0',
                textTertiary: '#6b7280'
            },
            blue: {
                name: 'Bleu Électrique',
                accent: '#00a8ff',
                accentHover: '#0097e6',
                bgPrimary: '#171f26',
                bgSecondary: '#1e2832',
                bgTertiary: '#252f3a',
                textPrimary: '#ffffff',
                textSecondary: '#b0b8c0',
                textTertiary: '#6b7280'
            },
            green: {
                name: 'Vert Toxique',
                accent: '#00ff88',
                accentHover: '#00e67a',
                bgPrimary: '#171f26',
                bgSecondary: '#1e2832',
                bgTertiary: '#252f3a',
                textPrimary: '#ffffff',
                textSecondary: '#b0b8c0',
                textTertiary: '#6b7280'
            },
            purple: {
                name: 'Violet Mystique',
                accent: '#9b59b6',
                accentHover: '#8e44ad',
                bgPrimary: '#171f26',
                bgSecondary: '#1e2832',
                bgTertiary: '#252f3a',
                textPrimary: '#ffffff',
                textSecondary: '#b0b8c0',
                textTertiary: '#6b7280'
            },
            orange: {
                name: 'Orange Flamboyant',
                accent: '#ff6b35',
                accentHover: '#ff5722',
                bgPrimary: '#171f26',
                bgSecondary: '#1e2832',
                bgTertiary: '#252f3a',
                textPrimary: '#ffffff',
                textSecondary: '#b0b8c0',
                textTertiary: '#6b7280'
            },
            custom: {
                name: 'Personnalisé',
                accent: '#ff4655',
                accentHover: '#ff6b7a',
                bgPrimary: '#171f26',
                bgSecondary: '#1e2832',
                bgTertiary: '#252f3a',
                textPrimary: '#ffffff',
                textSecondary: '#b0b8c0',
                textTertiary: '#6b7280'
            }
        };
        
        this.currentTheme = 'default';
        this.loadTheme();
    }

    /**
     * Charge le thème sauvegardé
     */
    loadTheme() {
        try {
            const saved = localStorage.getItem('themeSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.currentTheme = settings.theme || 'default';
                
                // Si thème personnalisé, charger les couleurs
                if (this.currentTheme === 'custom' && settings.colors) {
                    this.themes.custom = { ...this.themes.custom, ...settings.colors };
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement du thème:', error);
        }
        
        this.applyTheme(this.currentTheme);
    }

    /**
     * Sauvegarde le thème actuel
     */
    saveTheme() {
        try {
            const settings = {
                theme: this.currentTheme,
                colors: this.currentTheme === 'custom' ? {
                    accent: this.themes.custom.accent,
                    accentHover: this.themes.custom.accentHover
                } : null
            };
            localStorage.setItem('themeSettings', JSON.stringify(settings));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du thème:', error);
        }
    }

    /**
     * Applique un thème
     */
    applyTheme(themeName) {
        if (!this.themes[themeName]) {
            console.warn(`Thème "${themeName}" non trouvé, utilisation du thème par défaut`);
            themeName = 'default';
        }
        
        this.currentTheme = themeName;
        const theme = this.themes[themeName];
        
        // Appliquer les variables CSS
        const root = document.documentElement;
        root.style.setProperty('--accent-color', theme.accent);
        root.style.setProperty('--accent-hover', theme.accentHover);
        root.style.setProperty('--bg-primary', theme.bgPrimary);
        root.style.setProperty('--bg-secondary', theme.bgSecondary);
        root.style.setProperty('--bg-tertiary', theme.bgTertiary);
        root.style.setProperty('--text-primary', theme.textPrimary);
        root.style.setProperty('--text-secondary', theme.textSecondary);
        root.style.setProperty('--text-tertiary', theme.textTertiary);
        
        // Sauvegarder
        this.saveTheme();
        
        // Émettre un événement pour notifier le changement
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: themeName } }));
    }

    /**
     * Personnalise les couleurs d'accent
     */
    setCustomAccentColor(accentColor) {
        // Calculer automatiquement la couleur hover (plus claire)
        const hoverColor = this.lightenColor(accentColor, 15);
        
        this.themes.custom.accent = accentColor;
        this.themes.custom.accentHover = hoverColor;
        
        if (this.currentTheme === 'custom') {
            this.applyTheme('custom');
        }
    }

    /**
     * Éclaircit une couleur
     */
    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    /**
     * Assombrit une couleur
     */
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    /**
     * Obtient la liste des thèmes disponibles
     */
    getAvailableThemes() {
        return Object.keys(this.themes).map(key => ({
            id: key,
            name: this.themes[key].name,
            accent: this.themes[key].accent
        }));
    }

    /**
     * Obtient le thème actuel
     */
    getCurrentTheme() {
        return {
            id: this.currentTheme,
            ...this.themes[this.currentTheme]
        };
    }
}

// Rendre le service disponible globalement
window.ThemeService = ThemeService;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeService;
}

