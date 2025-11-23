/**
 * Service de récupération automatique après crash
 * Gère la détection de crash et la récupération des données perdues
 */
class RecoveryService {
    constructor() {
        this.recoveryDataKey = 'app_recovery_state';
        this.crashFlagKey = 'app_crash_flag';
        this.recoveryBackupKey = 'app_recovery_backup';
        this.maxRecoveryBackups = 3; // Nombre maximum de sauvegardes de récupération
        this.lastSaveTime = null;
    }

    /**
     * Initialise le service et vérifie s'il y a eu un crash
     */
    init() {
        const crashed = this.detectCrash();
        if (crashed) {
            console.warn('⚠️ Crash détecté lors de la dernière session');
            return this.getRecoveryData();
        } else {
            // Marquer l'application comme démarrée correctement
            this.markAppStarted();
            return null;
        }
    }

    /**
     * Détecte si l'application a crashé
     */
    detectCrash() {
        try {
            const crashFlag = localStorage.getItem(this.crashFlagKey);
            return crashFlag === 'true';
        } catch (error) {
            console.error('Erreur lors de la détection de crash:', error);
            return false;
        }
    }

    /**
     * Marque l'application comme démarrée correctement
     */
    markAppStarted() {
        try {
            localStorage.setItem(this.crashFlagKey, 'false');
        } catch (error) {
            console.error('Erreur lors du marquage du démarrage:', error);
        }
    }

    /**
     * Marque l'application comme en cours d'exécution (appelé avant fermeture normale)
     */
    markAppClosing() {
        try {
            localStorage.setItem(this.crashFlagKey, 'false');
            // Nettoyer les données de récupération si la fermeture est normale
            this.clearRecoveryData();
        } catch (error) {
            console.error('Erreur lors du marquage de la fermeture:', error);
        }
    }

    /**
     * Sauvegarde l'état actuel pour récupération
     */
    saveRecoveryState(teamData, additionalInfo = {}) {
        try {
            const recoveryData = {
                timestamp: new Date().toISOString(),
                teamData: JSON.parse(JSON.stringify(teamData)), // Deep copy
                ...additionalInfo
            };

            // Sauvegarder dans localStorage
            localStorage.setItem(this.recoveryDataKey, JSON.stringify(recoveryData));
            
            // Créer une sauvegarde de récupération dans le tableau de sauvegardes
            this.createRecoveryBackup(recoveryData);

            // Marquer qu'il y a des données non sauvegardées
            localStorage.setItem(this.crashFlagKey, 'true');
            
            this.lastSaveTime = Date.now();
            return true;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de l\'état de récupération:', error);
            // Si localStorage est plein, supprimer les anciennes sauvegardes
            if (error.name === 'QuotaExceededError') {
                this.cleanOldRecoveryBackups();
                // Réessayer
                try {
                    localStorage.setItem(this.recoveryDataKey, JSON.stringify(recoveryData));
                    return true;
                } catch (retryError) {
                    console.error('Impossible de sauvegarder après nettoyage:', retryError);
                }
            }
            return false;
        }
    }

    /**
     * Crée une sauvegarde de récupération dans le tableau de sauvegardes
     */
    createRecoveryBackup(recoveryData) {
        try {
            const backups = this.getRecoveryBackups();
            backups.push(recoveryData);

            // Limiter le nombre de sauvegardes
            if (backups.length > this.maxRecoveryBackups) {
                backups.shift(); // Supprimer la plus ancienne
            }

            localStorage.setItem(this.recoveryBackupKey, JSON.stringify(backups));
        } catch (error) {
            console.error('Erreur lors de la création de la sauvegarde de récupération:', error);
        }
    }

    /**
     * Récupère toutes les sauvegardes de récupération
     */
    getRecoveryBackups() {
        try {
            const backupsJson = localStorage.getItem(this.recoveryBackupKey);
            if (!backupsJson) {
                return [];
            }
            return JSON.parse(backupsJson);
        } catch (error) {
            console.error('Erreur lors de la récupération des sauvegardes:', error);
            return [];
        }
    }

    /**
     * Nettoie les anciennes sauvegardes de récupération
     */
    cleanOldRecoveryBackups() {
        try {
            const backups = this.getRecoveryBackups();
            // Garder seulement les 2 plus récentes
            const recentBackups = backups.slice(-2);
            localStorage.setItem(this.recoveryBackupKey, JSON.stringify(recentBackups));
        } catch (error) {
            console.error('Erreur lors du nettoyage des sauvegardes:', error);
        }
    }

    /**
     * Récupère les données de récupération
     */
    getRecoveryData() {
        try {
            const recoveryJson = localStorage.getItem(this.recoveryDataKey);
            if (!recoveryJson) {
                return null;
            }
            return JSON.parse(recoveryJson);
        } catch (error) {
            console.error('Erreur lors de la récupération des données:', error);
            return null;
        }
    }

    /**
     * Récupère la dernière sauvegarde de récupération disponible
     */
    getLatestRecoveryBackup() {
        const backups = this.getRecoveryBackups();
        if (backups.length === 0) {
            return null;
        }
        // Retourner la plus récente
        return backups[backups.length - 1];
    }

    /**
     * Efface les données de récupération
     */
    clearRecoveryData() {
        try {
            localStorage.removeItem(this.recoveryDataKey);
            // Ne pas supprimer les sauvegardes de récupération, elles peuvent être utiles
        } catch (error) {
            console.error('Erreur lors du nettoyage des données de récupération:', error);
        }
    }

    /**
     * Restaure les données de récupération
     */
    restoreRecoveryData(recoveryData) {
        if (!recoveryData || !recoveryData.teamData) {
            console.error('Données de récupération invalides');
            return null;
        }
        return JSON.parse(JSON.stringify(recoveryData.teamData)); // Deep copy
    }

    /**
     * Vérifie si des données de récupération sont disponibles
     */
    hasRecoveryData() {
        const recoveryData = this.getRecoveryData();
        return recoveryData !== null;
    }

    /**
     * Obtient les statistiques de récupération
     */
    getRecoveryStats() {
        const recoveryData = this.getRecoveryData();
        const backups = this.getRecoveryBackups();
        const hasCrashed = this.detectCrash();

        return {
            hasCrashed: hasCrashed,
            hasRecoveryData: recoveryData !== null,
            recoveryDataTimestamp: recoveryData ? recoveryData.timestamp : null,
            recoveryBackupsCount: backups.length,
            lastSaveTime: this.lastSaveTime
        };
    }

    /**
     * Formate une date pour l'affichage
     */
    formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

// Rendre le service disponible globalement
window.RecoveryService = RecoveryService;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecoveryService;
}

