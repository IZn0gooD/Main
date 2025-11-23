/**
 * Service de sauvegarde et historique des versions
 * Permet de créer des sauvegardes multiples et de restaurer des versions précédentes
 */
class BackupService {
    constructor() {
        this.maxBackups = 10; // Nombre maximum de sauvegardes à conserver
        this.backupInterval = 300000; // Intervalle de sauvegarde automatique (5 minutes)
        this.autoBackupEnabled = true;
        this.backupTimer = null;
    }

    /**
     * Crée une sauvegarde avec horodatage
     */
    async createBackup(teamData, teamName = 'team') {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            let payload = JSON.parse(JSON.stringify(teamData)); // Deep copy

            let backupData = {
                timestamp: new Date().toISOString(),
                teamName: teamName,
                data: payload,
                version: this.getNextVersion(),
                encrypted: false
            };

            // Chiffrement optionnel si EncryptionService et passphrase définie
            try {
                if (window.EncryptionService) {
                    const encService = new EncryptionService();
                    if (encService.isEnabled()) {
                        try {
                            const encrypted = await encService.encryptJson(payload);
                            backupData.data = encrypted;
                            backupData.encrypted = true;
                        } catch (encryptError) {
                            // Si le chiffrement échoue, sauvegarder sans chiffrement
                            console.warn('Erreur lors du chiffrement, sauvegarde non chiffrée:', encryptError);
                            backupData.data = payload;
                            backupData.encrypted = false;
                        }
                    }
                }
            } catch (e) {
                // En cas d'erreur, sauvegarder sans chiffrement
                console.warn('Chiffrement non disponible, sauvegarde non chiffrée:', e);
                backupData.data = payload;
                backupData.encrypted = false;
            }

            // Stocker dans localStorage
            const backups = this.getAllBackups();
            backups.push(backupData);

            // Limiter le nombre de sauvegardes
            if (backups.length > this.maxBackups) {
                backups.shift(); // Supprimer la plus ancienne
            }

            localStorage.setItem('team_backups', JSON.stringify(backups));
            
            console.log(`✅ Sauvegarde créée: ${backupData.version} - ${backupData.timestamp}`);
            return backupData;
        } catch (error) {
            console.error('❌ Erreur lors de la création de la sauvegarde:', error);
            return null;
        }
    }

    /**
     * Récupère toutes les sauvegardes
     */
    getAllBackups() {
        try {
            const backupsJson = localStorage.getItem('team_backups');
            if (!backupsJson) {
                return [];
            }
            return JSON.parse(backupsJson);
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des sauvegardes:', error);
            return [];
        }
    }

    /**
     * Récupère une sauvegarde spécifique par index
     */
    getBackup(index) {
        const backups = this.getAllBackups();
        if (index >= 0 && index < backups.length) {
            return backups[backups.length - 1 - index]; // Plus récent en premier
        }
        return null;
    }

    /**
     * Restaure une sauvegarde
     */
    restoreBackup(backup) {
        if (!backup || !backup.data) {
            console.error('❌ Sauvegarde invalide');
            return null;
        }
        try {
            // Déchiffrement optionnel
            if (backup.encrypted && window.EncryptionService) {
                const encService = new EncryptionService();
                if (encService.isEnabled()) {
                    // decryptJson est async: exposer la gestion au consommateur si nécessaire
                    console.warn('restoreBackup: déchiffrement asynchrone non supporté dans cette méthode synchrone.');
                }
            }
        } catch (e) {
            console.warn('Déchiffrement non appliqué:', e);
        }
        return JSON.parse(JSON.stringify(backup.data));
    }

    /**
     * Supprime une sauvegarde
     */
    deleteBackup(index) {
        const backups = this.getAllBackups();
        if (index >= 0 && index < backups.length) {
            const sortedBackups = [...backups].reverse(); // Plus récent en premier
            const backupToDelete = sortedBackups[index];
            const filteredBackups = backups.filter(b => b.timestamp !== backupToDelete.timestamp);
            localStorage.setItem('team_backups', JSON.stringify(filteredBackups));
            return true;
        }
        return false;
    }

    /**
     * Supprime toutes les sauvegardes
     */
    clearAllBackups() {
        localStorage.removeItem('team_backups');
        console.log('🗑️ Toutes les sauvegardes ont été supprimées');
    }

    /**
     * Obtient le prochain numéro de version
     */
    getNextVersion() {
        const backups = this.getAllBackups();
        if (backups.length === 0) {
            return 'v1.0';
        }
        
        // Extraire le numéro de version le plus élevé
        let maxVersion = 0;
        backups.forEach(backup => {
            if (backup.version) {
                const versionMatch = backup.version.match(/v(\d+)\.(\d+)/);
                if (versionMatch) {
                    const major = parseInt(versionMatch[1]);
                    const minor = parseInt(versionMatch[2]);
                    const versionNum = major * 100 + minor;
                    if (versionNum > maxVersion) {
                        maxVersion = versionNum;
                    }
                }
            }
        });

        const major = Math.floor(maxVersion / 100);
        const minor = (maxVersion % 100) + 1;
        return `v${major}.${minor}`;
    }

    /**
     * Formate une date pour l'affichage
     */
    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Active la sauvegarde automatique
     */
    enableAutoBackup(callback, interval = null) {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
        }

        this.autoBackupEnabled = true;
        const backupInterval = interval || this.backupInterval;

        this.backupTimer = setInterval(() => {
            if (this.autoBackupEnabled && callback) {
                callback();
            }
        }, backupInterval);

        console.log(`✅ Sauvegarde automatique activée (${backupInterval / 1000}s)`);
    }

    /**
     * Désactive la sauvegarde automatique
     */
    disableAutoBackup() {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
            this.backupTimer = null;
        }
        this.autoBackupEnabled = false;
        console.log('⏸️ Sauvegarde automatique désactivée');
    }

    /**
     * Exporte toutes les sauvegardes
     */
    exportBackups() {
        const backups = this.getAllBackups();
        return JSON.stringify(backups, null, 2);
    }

    /**
     * Importe des sauvegardes
     */
    importBackups(backupsJson) {
        try {
            const backups = JSON.parse(backupsJson);
            if (Array.isArray(backups)) {
                // Fusionner avec les sauvegardes existantes
                const existingBackups = this.getAllBackups();
                const merged = [...existingBackups, ...backups];
                
                // Trier par timestamp et limiter
                merged.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                if (merged.length > this.maxBackups) {
                    merged.splice(0, merged.length - this.maxBackups);
                }
                
                localStorage.setItem('team_backups', JSON.stringify(merged));
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Erreur lors de l\'import des sauvegardes:', error);
            return false;
        }
    }

    /**
     * Obtient les statistiques des sauvegardes
     */
    getBackupStats() {
        const backups = this.getAllBackups();
        const totalSize = JSON.stringify(backups).length;
        
        return {
            count: backups.length,
            maxBackups: this.maxBackups,
            totalSize: totalSize,
            totalSizeFormatted: this.formatBytes(totalSize),
            oldestBackup: backups.length > 0 ? backups[0].timestamp : null,
            newestBackup: backups.length > 0 ? backups[backups.length - 1].timestamp : null
        };
    }

    /**
     * Formate les bytes en format lisible
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Rendre le service disponible globalement
window.BackupService = BackupService;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackupService;
}

