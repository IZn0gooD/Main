/**
 * Module de formatage des données
 * Fonctions utilitaires pour formater les données pour l'affichage
 */

/**
 * Classe pour les formateurs
 */
class Formatters {
    /**
     * Formate une date au format DD-MM-YYYY
     * @param {Date|string|number} date - Date à formater
     * @returns {string}
     */
    static formatDate(date) {
        if (!date) return 'N/A';
        
        let dateObj;
        if (date instanceof Date) {
            dateObj = date;
        } else if (typeof date === 'string') {
            // Tenter de parser si c'est une chaîne
            const parts = date.split('-');
            if (parts.length === 3) {
                dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
            } else {
                dateObj = new Date(date);
            }
        } else if (typeof date === 'number') {
            dateObj = new Date(date);
        } else {
            return 'N/A';
        }
        
        if (isNaN(dateObj.getTime())) {
            return 'N/A';
        }
        
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        
        return `${day}-${month}-${year}`;
    }

    /**
     * Formate une date en format long (ex: "15 janvier 2024")
     * @param {Date|string|number} date - Date à formater
     * @param {string} locale - Locale (par défaut 'fr-FR')
     * @returns {string}
     */
    static formatDateLong(date, locale = 'fr-FR') {
        if (!date) return 'N/A';
        
        let dateObj;
        if (date instanceof Date) {
            dateObj = date;
        } else if (typeof date === 'string') {
            const parts = date.split('-');
            if (parts.length === 3) {
                dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
            } else {
                dateObj = new Date(date);
            }
        } else if (typeof date === 'number') {
            dateObj = new Date(date);
        } else {
            return 'N/A';
        }
        
        if (isNaN(dateObj.getTime())) {
            return 'N/A';
        }
        
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return dateObj.toLocaleDateString(locale, options);
    }

    /**
     * Formate une date relative (ex: "Il y a 2 jours")
     * @param {Date|string|number} date - Date à formater
     * @returns {string}
     */
    static formatDateRelative(date) {
        if (!date) return 'N/A';
        
        let dateObj;
        if (date instanceof Date) {
            dateObj = date;
        } else if (typeof date === 'string') {
            const parts = date.split('-');
            if (parts.length === 3) {
                dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
            } else {
                dateObj = new Date(date);
            }
        } else if (typeof date === 'number') {
            dateObj = new Date(date);
        } else {
            return 'N/A';
        }
        
        if (isNaN(dateObj.getTime())) {
            return 'N/A';
        }
        
        const now = new Date();
        const diffMs = now - dateObj;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffSecs < 60) {
            return 'À l\'instant';
        } else if (diffMins < 60) {
            return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
        } else if (diffHours < 24) {
            return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
        } else if (diffDays < 7) {
            return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
        } else {
            return this.formatDate(dateObj);
        }
    }

    /**
     * Formate un nombre avec des séparateurs de milliers
     * @param {number} number - Nombre à formater
     * @param {number} decimals - Nombre de décimales (par défaut 0)
     * @param {string} locale - Locale (par défaut 'fr-FR')
     * @returns {string}
     */
    static formatNumber(number, decimals = 0, locale = 'fr-FR') {
        if (number === null || number === undefined || isNaN(number)) {
            return 'N/A';
        }
        
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(number);
    }

    /**
     * Formate un pourcentage
     * @param {number} value - Valeur à formater (0-100 ou 0-1)
     * @param {number} decimals - Nombre de décimales (par défaut 1)
     * @param {boolean} isDecimal - Si true, la valeur est déjà en 0-1, sinon en 0-100
     * @returns {string}
     */
    static formatPercentage(value, decimals = 1, isDecimal = false) {
        if (value === null || value === undefined || isNaN(value)) {
            return 'N/A';
        }
        
        const percentage = isDecimal ? value * 100 : value;
        return `${percentage.toFixed(decimals)}%`;
    }

    /**
     * Formate une durée en secondes en format lisible (ex: "2h 30min")
     * @param {number} seconds - Durée en secondes
     * @returns {string}
     */
    static formatDuration(seconds) {
        if (seconds === null || seconds === undefined || isNaN(seconds)) {
            return 'N/A';
        }
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}min`);
        if (secs > 0 && hours === 0) parts.push(`${secs}s`);
        
        return parts.length > 0 ? parts.join(' ') : '0s';
    }

    /**
     * Formate une taille de fichier en format lisible (ex: "1.5 MB")
     * @param {number} bytes - Taille en octets
     * @param {number} decimals - Nombre de décimales (par défaut 2)
     * @returns {string}
     */
    static formatFileSize(bytes, decimals = 2) {
        if (bytes === null || bytes === undefined || isNaN(bytes) || bytes === 0) {
            return '0 Bytes';
        }
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
    }

    /**
     * Formate un score de match (ex: "13 - 11")
     * @param {string} score - Score au format "13-11"
     * @returns {string}
     */
    static formatScore(score) {
        if (!score || typeof score !== 'string') {
            return 'N/A';
        }
        
        return score.replace('-', ' - ');
    }

    /**
     * Formate un KDA (ex: "18 / 12 / 5")
     * @param {string} kda - KDA au format "18/12/5"
     * @returns {string}
     */
    static formatKDA(kda) {
        if (!kda || typeof kda !== 'string') {
            return 'N/A';
        }
        
        return kda.replace(/\//g, ' / ');
    }

    /**
     * Formate un KDA en ratio (ex: "1.50")
     * @param {string|number} kills - Kills
     * @param {string|number} deaths - Deaths
     * @param {number} decimals - Nombre de décimales (par défaut 2)
     * @returns {string}
     */
    static formatKDARatio(kills, deaths, decimals = 2) {
        const k = typeof kills === 'string' ? parseInt(kills, 10) : kills;
        const d = typeof deaths === 'string' ? parseInt(deaths, 10) : deaths;
        
        if (isNaN(k) || isNaN(d) || d === 0) {
            return k > 0 ? 'Inf' : '0.00';
        }
        
        return (k / d).toFixed(decimals);
    }

    /**
     * Formate une version sémantique pour l'affichage
     * @param {string} version - Version (ex: "v1.2.3" ou "1.2.3")
     * @returns {string}
     */
    static formatVersion(version) {
        if (!version || typeof version !== 'string') {
            return 'N/A';
        }
        
        // Retirer le 'v' préfixe s'il existe
        return version.startsWith('v') ? version : `v${version}`;
    }

    /**
     * Tronque un texte avec des ellipses
     * @param {string} text - Texte à tronquer
     * @param {number} maxLength - Longueur maximale
     * @param {string} suffix - Suffixe à ajouter (par défaut "...")
     * @returns {string}
     */
    static truncate(text, maxLength, suffix = '...') {
        if (!text || typeof text !== 'string') {
            return '';
        }
        
        if (text.length <= maxLength) {
            return text;
        }
        
        return text.substring(0, maxLength - suffix.length) + suffix;
    }

    /**
     * Capitalise la première lettre d'un texte
     * @param {string} text - Texte à capitaliser
     * @returns {string}
     */
    static capitalize(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }
        
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

    /**
     * Formate un temps relatif en format compact (ex: "2j", "3h", "45min")
     * @param {Date|string|number} date - Date à formater
     * @returns {string}
     */
    static formatTimeAgo(date) {
        if (!date) return 'N/A';
        
        let dateObj;
        if (date instanceof Date) {
            dateObj = date;
        } else if (typeof date === 'string') {
            const parts = date.split('-');
            if (parts.length === 3) {
                dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
            } else {
                dateObj = new Date(date);
            }
        } else if (typeof date === 'number') {
            dateObj = new Date(date);
        } else {
            return 'N/A';
        }
        
        if (isNaN(dateObj.getTime())) {
            return 'N/A';
        }
        
        const now = new Date();
        const diffMs = now - dateObj;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffSecs < 60) {
            return 'À l\'instant';
        } else if (diffMins < 60) {
            return `${diffMins}min`;
        } else if (diffHours < 24) {
            return `${diffHours}h`;
        } else if (diffDays < 30) {
            return `${diffDays}j`;
        } else {
            return this.formatDate(dateObj);
        }
    }
}

// Rendre les fonctions disponibles globalement
window.Formatters = Formatters;

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Formatters;
}

