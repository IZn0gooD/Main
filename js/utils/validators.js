/**
 * Module de validation des données
 * Fonctions utilitaires pour valider les formats et structures de données
 */

/**
 * Classe pour les validateurs
 */
class Validators {
    /**
     * Valide le format d'une date (DD-MM-YYYY)
     * @param {string} dateStr - Date à valider
     * @returns {boolean}
     */
    static validateDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') {
            return false;
        }
        
        const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
        if (!dateRegex.test(dateStr)) {
            return false;
        }
        
        const parts = dateStr.split('-');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        
        // Vérifier les limites
        if (month < 1 || month > 12) return false;
        if (day < 1 || day > 31) return false;
        if (year < 1900 || year > 2100) return false;
        
        // Vérifier si la date est valide
        const date = new Date(year, month - 1, day);
        return date.getDate() === day && 
               date.getMonth() === month - 1 && 
               date.getFullYear() === year;
    }

    /**
     * Valide le format d'un score (ex: "13-11")
     * @param {string} scoreStr - Score à valider
     * @returns {boolean}
     */
    static validateScore(scoreStr) {
        if (!scoreStr || typeof scoreStr !== 'string') {
            return false;
        }
        
        const scoreRegex = /^\d{1,2}-\d{1,2}$/;
        if (!scoreRegex.test(scoreStr)) {
            return false;
        }
        
        const parts = scoreStr.split('-');
        const score1 = parseInt(parts[0], 10);
        const score2 = parseInt(parts[1], 10);
        
        // Les scores doivent être entre 0 et 26 (maximum dans Valorant)
        return score1 >= 0 && score1 <= 26 && score2 >= 0 && score2 <= 26;
    }

    /**
     * Valide le format d'un KDA (ex: "18/12/5")
     * @param {string} kdaStr - KDA à valider
     * @returns {boolean}
     */
    static validateKDA(kdaStr) {
        if (!kdaStr || typeof kdaStr !== 'string') {
            return false;
        }
        
        const kdaRegex = /^\d+\/\d+\/\d+$/;
        if (!kdaRegex.test(kdaStr)) {
            return false;
        }
        
        const parts = kdaStr.split('/');
        const kills = parseInt(parts[0], 10);
        const deaths = parseInt(parts[1], 10);
        const assists = parseInt(parts[2], 10);
        
        // Vérifier que les valeurs sont raisonnables (0-100 par exemple)
        return kills >= 0 && kills <= 100 && 
               deaths >= 0 && deaths <= 100 && 
               assists >= 0 && assists <= 100;
    }

    /**
     * Valide le format d'une couleur hexadécimale (#RRGGBB)
     * @param {string} color - Couleur à valider
     * @returns {boolean}
     */
    static validateHexColor(color) {
        if (!color || typeof color !== 'string') {
            return false;
        }
        
        const hexRegex = /^#[0-9A-Fa-f]{6}$/;
        return hexRegex.test(color);
    }

    /**
     * Valide le format d'une version sémantique (vX.Y.Z ou X.Y.Z)
     * @param {string} version - Version à valider
     * @returns {boolean}
     */
    static validateSemanticVersion(version) {
        if (!version || typeof version !== 'string') {
            return false;
        }
        
        // Accepter vX.Y.Z ou X.Y.Z
        const versionRegex = /^v?\d+\.\d+(\.\d+)?$/;
        return versionRegex.test(version);
    }

    /**
     * Valide qu'une chaîne n'est pas vide
     * @param {string} str - Chaîne à valider
     * @returns {boolean}
     */
    static validateNotEmpty(str) {
        return str !== null && str !== undefined && 
               typeof str === 'string' && str.trim().length > 0;
    }

    /**
     * Valide qu'un nombre est dans une plage donnée
     * @param {number} value - Valeur à valider
     * @param {number} min - Minimum (inclus)
     * @param {number} max - Maximum (inclus)
     * @returns {boolean}
     */
    static validateNumberRange(value, min, max) {
        if (typeof value !== 'number' || isNaN(value)) {
            return false;
        }
        return value >= min && value <= max;
    }

    /**
     * Valide qu'une valeur est un nombre entier positif
     * @param {any} value - Valeur à valider
     * @returns {boolean}
     */
    static validatePositiveInteger(value) {
        return Number.isInteger(value) && value > 0;
    }

    /**
     * Valide qu'une valeur est un nombre entier non négatif
     * @param {any} value - Valeur à valider
     * @returns {boolean}
     */
    static validateNonNegativeInteger(value) {
        return Number.isInteger(value) && value >= 0;
    }

    /**
     * Valide qu'une valeur est dans une liste de valeurs autorisées
     * @param {any} value - Valeur à valider
     * @param {Array} allowedValues - Liste des valeurs autorisées
     * @returns {boolean}
     */
    static validateInList(value, allowedValues) {
        return allowedValues.includes(value);
    }

    /**
     * Valide le format d'un email (basique)
     * @param {string} email - Email à valider
     * @returns {boolean}
     */
    static validateEmail(email) {
        if (!email || typeof email !== 'string') {
            return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Valide le format d'une URL (basique)
     * @param {string} url - URL à valider
     * @returns {boolean}
     */
    static validateURL(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }
        
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Valide qu'un objet a les propriétés requises
     * @param {Object} obj - Objet à valider
     * @param {Array<string>} requiredProps - Liste des propriétés requises
     * @returns {boolean}
     */
    static validateRequiredProperties(obj, requiredProps) {
        if (!obj || typeof obj !== 'object') {
            return false;
        }
        
        return requiredProps.every(prop => obj.hasOwnProperty(prop) && obj[prop] !== undefined);
    }
}

// Rendre les fonctions disponibles globalement
window.Validators = Validators;

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Validators;
}

