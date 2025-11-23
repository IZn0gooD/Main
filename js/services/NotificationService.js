/**
 * Service de gestion des notifications personnalisées
 * Gère les alertes, notifications de progression, et rappels
 */
class NotificationService {
    constructor() {
        this.notifications = [];
        this.notificationTimers = {}; // Stockage des timers par ID de notification
        this.notificationStates = {}; // États des notifications (isClosing, etc.)
        this.debug = false; // Activer les logs de débogage si nécessaire
        this.settings = {
            enabled: true,
            showProgressAlerts: true,
            showPerformanceAlerts: true,
            showMatchReminders: false,
            soundEnabled: false,
            // seuils
            winrateThreshold: 10,
            agentMinWinrate: 40,
            agentMinMatches: 3
        };
        this.loadSettings();
    }

    /**
     * Charge les paramètres depuis le stockage local
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('notificationSettings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Erreur lors du chargement des paramètres de notification:', error);
        }
    }

    /**
     * Sauvegarde les paramètres dans le stockage local
     */
    saveSettings() {
        try {
            localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des paramètres de notification:', error);
        }
    }

    /**
     * Affiche une notification avec durée personnalisable et bouton de fermeture
     */
    show(message, type = 'info', duration = null) {
        if (!this.settings.enabled) return;

        // Durées par défaut selon le type (en millisecondes)
        const defaultDurations = {
            info: 3000,      // 3 secondes
            success: 3000,   // 3 secondes
            warning: 3000,  // 3 secondes
            error: 3000,    // 3 secondes
            progress: 3000  // 3 secondes
        };

        // Utiliser la durée par défaut si non spécifiée (null ou undefined)
        if (duration === null || duration === undefined) {
            duration = defaultDurations[type] || 3000;
        }

        // Générer un ID unique pour cette notification
        const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Créer le conteneur de notification
        const notification = document.createElement('div');
        notification.id = notificationId;
        notification.className = `notification notification-${type}`;
        
        // Créer le contenu de la notification
        const notificationContent = document.createElement('div');
        notificationContent.className = 'notification-content';
        notificationContent.textContent = message;
        
        // Créer le bouton de fermeture
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Fermer');
        closeBtn.onclick = () => {
            this.removeNotification(notificationId);
        };
        
        // Assembler la notification
        notification.appendChild(notificationContent);
        notification.appendChild(closeBtn);

        // Enregistrer l'alerte dans l'historique
        try {
            this.notifications.push({
                ts: new Date().toISOString(),
                type,
                message
            });
            if (this.notifications.length > 500) {
                this.notifications.splice(0, this.notifications.length - 500);
            }
        } catch {}
        
        // Styles pour les différents types
        const styles = {
            info: { background: '#2196F3', color: 'white' },
            success: { background: '#4CAF50', color: 'white' },
            warning: { background: '#FF9800', color: 'white' },
            error: { background: '#F44336', color: 'white' },
            progress: { background: '#9C27B0', color: 'white' }
        };

        // Calculer la position verticale pour l'empilement
        const existingNotifications = document.querySelectorAll('.notification');
        const topOffset = 20 + (existingNotifications.length * 80); // 80px par notification

        Object.assign(notification.style, {
            position: 'fixed',
            top: `${topOffset}px`,
            right: '20px',
            minWidth: '300px',
            maxWidth: '500px',
            padding: '15px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            zIndex: '10000',
            animation: 'slideInRight 0.3s ease',
            animationFillMode: 'forwards', // Maintenir l'état final de l'animation
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '15px',
            cursor: 'default',
            opacity: '1', // S'assurer que l'opacité est à 1 après l'animation
            ...styles[type] || styles.info
        });

        // Styles pour le contenu
        Object.assign(notificationContent.style, {
            flex: '1',
            wordWrap: 'break-word',
            lineHeight: '1.4'
        });

        // Styles pour le bouton de fermeture
        Object.assign(closeBtn.style, {
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold',
            cursor: 'pointer',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background-color 0.2s',
            flexShrink: '0'
        });

        // Hover sur le bouton de fermeture
        closeBtn.onmouseenter = () => {
            closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        };
        closeBtn.onmouseleave = () => {
            closeBtn.style.backgroundColor = 'transparent';
        };

        document.body.appendChild(notification);

        // Initialiser l'état de la notification
        this.notificationStates[notificationId] = {
            isClosing: false,
            createdAt: Date.now(),
            animationEntered: false // Flag pour indiquer que l'animation d'entrée est terminée
        };

        // Attendre que l'animation d'entrée soit terminée avant de démarrer le timer
        const handleEnterAnimationEnd = (event) => {
            if (event.animationName === 'slideInRight' || event.type === 'animationend') {
                if (this.debug) console.log(`[NotificationService] Animation d'entrée terminée pour ${notificationId}`);
                notification.removeEventListener('animationend', handleEnterAnimationEnd);
                
                // Marquer que l'animation d'entrée est terminée
                if (this.notificationStates[notificationId]) {
                    this.notificationStates[notificationId].animationEntered = true;
                }
                
                // Maintenir l'état final de l'animation (opacity: 1, transform: translateX(0))
                notification.style.opacity = '1';
                notification.style.transform = 'translateX(0)';
                
                // Démarrer le timer de fermeture automatique seulement après l'animation d'entrée
                if (duration > 0) {
                    if (this.debug) console.log(`[NotificationService] Création d'un timer de ${duration}ms pour ${notificationId}`);
                    this.notificationTimers[notificationId] = setTimeout(() => {
                        if (this.debug) console.log(`[NotificationService] Timer expiré pour ${notificationId} après ${duration}ms`);
                        // Vérifier que la notification n'est pas déjà en cours de fermeture
                        if (this.notificationStates[notificationId] && !this.notificationStates[notificationId].isClosing) {
                            this.removeNotification(notificationId);
                        }
                    }, duration);
                }
            }
        };

        // Écouter la fin de l'animation d'entrée
        notification.addEventListener('animationend', handleEnterAnimationEnd, { once: true });

        // Fallback : si l'animation d'entrée ne se déclenche pas, démarrer le timer après un court délai
        setTimeout(() => {
            if (this.notificationStates[notificationId] && !this.notificationStates[notificationId].animationEntered) {
                if (this.debug) console.log(`[NotificationService] Fallback: animation d'entrée non détectée pour ${notificationId}`);
                notification.removeEventListener('animationend', handleEnterAnimationEnd);
                this.notificationStates[notificationId].animationEntered = true;
                notification.style.opacity = '1';
                notification.style.transform = 'translateX(0)';
                
                if (duration > 0 && !this.notificationTimers[notificationId]) {
                    if (this.debug) console.log(`[NotificationService] Création d'un timer de ${duration}ms pour ${notificationId} (fallback)`);
                    this.notificationTimers[notificationId] = setTimeout(() => {
                        if (this.debug) console.log(`[NotificationService] Timer expiré pour ${notificationId} après ${duration}ms`);
                        if (this.notificationStates[notificationId] && !this.notificationStates[notificationId].isClosing) {
                            this.removeNotification(notificationId);
                        }
                    }, duration);
                }
            }
        }, 350); // 300ms animation + 50ms marge

        // Son (si activé)
        if (this.settings.soundEnabled) {
            this.playSound(type);
        }

        return notification;
    }

    /**
     * Supprime une notification avec animation synchronisée
     */
    removeNotification(notificationId) {
        const notification = document.getElementById(notificationId);
        if (!notification) {
            if (this.debug) console.log(`[NotificationService] Notification ${notificationId} introuvable`);
            return;
        }

        // Vérifier si la notification est déjà en cours de fermeture
        if (this.notificationStates[notificationId] && this.notificationStates[notificationId].isClosing) {
            if (this.debug) console.log(`[NotificationService] Notification ${notificationId} déjà en cours de fermeture, ignorée`);
            return;
        }

        // Marquer comme en cours de fermeture
        if (this.notificationStates[notificationId]) {
            this.notificationStates[notificationId].isClosing = true;
        }

        // Annuler le timer de fermeture automatique si présent
        if (this.notificationTimers[notificationId]) {
            if (this.debug) console.log(`[NotificationService] Annulation du timer pour ${notificationId}`);
            clearTimeout(this.notificationTimers[notificationId]);
            delete this.notificationTimers[notificationId];
        }

        // Calculer la durée réelle d'affichage pour le débogage
        if (this.debug && this.notificationStates[notificationId]) {
            const displayDuration = Date.now() - this.notificationStates[notificationId].createdAt;
            console.log(`[NotificationService] Fermeture de ${notificationId} après ${displayDuration}ms d'affichage`);
        }

        // S'assurer que la notification est dans son état final (visible) avant de commencer l'animation de sortie
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
        
        // Retirer l'animation d'entrée si elle est encore active
        notification.style.animation = 'none';
        // Forcer un reflow pour réinitialiser l'animation
        void notification.offsetWidth;

        // Appliquer l'animation de sortie
        notification.style.animation = 'slideOutRight 0.3s ease';
        notification.style.animationFillMode = 'forwards';

        // Écouter la fin de l'animation pour supprimer le DOM
        const handleAnimationEnd = (event) => {
            // S'assurer que c'est bien l'animation de sortie qui se termine
            if (event.animationName === 'slideOutRight' || event.type === 'animationend') {
                if (this.debug) console.log(`[NotificationService] Animation de sortie terminée pour ${notificationId}`);
                
                // Retirer l'événement pour éviter les appels multiples
                notification.removeEventListener('animationend', handleAnimationEnd);
                
                // Supprimer du DOM seulement après la fin de l'animation
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                
                // Nettoyer les références
                delete this.notificationStates[notificationId];
                
                // Réorganiser les positions des autres notifications
                this.repositionNotifications();
            }
        };

        // Attacher l'événement avec { once: true } pour s'assurer qu'il ne se déclenche qu'une fois
        notification.addEventListener('animationend', handleAnimationEnd, { once: true });

        // Fallback avec setTimeout au cas où l'événement animationend ne se déclenche pas
        setTimeout(() => {
            // Vérifier si la notification existe toujours (si l'animation n'a pas été gérée)
            if (document.getElementById(notificationId)) {
                if (this.debug) console.log(`[NotificationService] Fallback: suppression forcée de ${notificationId}`);
                notification.removeEventListener('animationend', handleAnimationEnd);
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                delete this.notificationStates[notificationId];
                this.repositionNotifications();
            }
        }, 500); // 300ms animation + 200ms marge
    }

    /**
     * Réorganise les positions des notifications restantes
     */
    repositionNotifications() {
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach((notif, index) => {
            const topOffset = 20 + (index * 80);
            notif.style.top = `${topOffset}px`;
        });
    }

    /**
     * Vérifie la progression d'un joueur et envoie une alerte si nécessaire
     */
    checkPlayerProgress(player, previousStats, currentStats) {
        if (!this.settings.showProgressAlerts) return;

        // Alerte si amélioration significative
        const thr = Number(this.settings.winrateThreshold) || 10;
        if (currentStats.winrate > previousStats.winrate + thr) {
            this.show(
                `🎉 ${player.name} a amélioré son winrate de ${previousStats.winrate}% à ${currentStats.winrate}% !`,
                'success',
                5000
            );
        }

        // Alerte si baisse significative
        if (currentStats.winrate < previousStats.winrate - thr) {
            this.show(
                `⚠️ ${player.name} a vu son winrate baisser de ${previousStats.winrate}% à ${currentStats.winrate}%`,
                'warning',
                5000
            );
        }
    }

    /**
     * Vérifie les performances faibles sur certains agents
     */
    checkAgentPerformance(team, minWinrate = 40) {
        if (!this.settings.showPerformanceAlerts) return;

        const agentStats = {}; // Placeholder — dépend des données disponibles

        // Alerter pour les agents avec faible performance
        Object.entries(agentStats).forEach(([agent, stats]) => {
            const minMatches = Number(this.settings.agentMinMatches) || 3;
            const minWr = Number(this.settings.agentMinWinrate) || minWinrate;
            if (stats.winrate < minWr && stats.matches >= minMatches) {
                this.show(
                    `📊 Performance faible sur ${agent}: ${stats.winrate}% de winrate (${stats.matches} matchs)`,
                    'warning',
                    3000
                );
            }
        });
    }

    /**
     * Affiche une notification de sauvegarde automatique
     */
    notifyAutoSave(success = true) {
        if (success) {
            this.show('💾 Sauvegarde automatique effectuée', 'success', 3000);
        } else {
            this.show('❌ Erreur lors de la sauvegarde automatique', 'error', 3000);
        }
    }

    /**
     * Affiche une notification de chargement
     */
    notifyLoad(success = true, teamName = '') {
        if (success) {
            this.show(`✅ Équipe "${teamName}" chargée avec succès`, 'success', 3000);
        } else {
            this.show('❌ Erreur lors du chargement de l\'équipe', 'error', 3000);
        }
    }

    /**
     * Joue un son selon le type de notification
     */
    playSound(type) {
        // Implémentation optionnelle pour les sons
        // Peut utiliser l'API Web Audio ou des fichiers audio
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Fréquences différentes selon le type
            const frequencies = {
                info: 440,
                success: 523,
                warning: 392,
                error: 330,
                progress: 494
            };

            oscillator.frequency.value = frequencies[type] || 440;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            // Ignorer les erreurs audio
        }
    }

    // Alertes — API
    getAlerts() {
        return (this.notifications || []).slice();
    }

    clearAlerts() {
        this.notifications = [];
    }

    exportAlertsJSON() {
        try {
            const blob = new Blob([JSON.stringify(this.getAlerts(), null, 2)], { type: 'application/json;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `alerts_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {}
    }

    /**
     * Active ou désactive les notifications
     */
    setEnabled(enabled) {
        this.settings.enabled = enabled;
        this.saveSettings();
    }

    /**
     * Configure les paramètres de notification
     */
    configure(settings) {
        this.settings = { ...this.settings, ...settings };
        this.saveSettings();
    }
}

// Rendre le service disponible globalement
window.NotificationService = NotificationService;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationService;
}

