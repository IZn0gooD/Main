# 📖 Exemple d'Utilisation de l'API Service

## 🔧 Configuration Initiale

### 1. Configuration de la Clé API

```javascript
// Dans renderer.js ou dans une fonction de configuration
const apiService = new APIService();

// Configuration pour l'API Riot Games (officielle)
apiService.configure({
    provider: 'riot',
    apiKey: 'VOTRE_CLE_API_RIOT', // ⚠️ Ne jamais commiter cette clé
    region: 'eu' // eu, na, ap, kr, etc.
});

// OU configuration pour l'API non officielle Henrik
apiService.configure({
    provider: 'henrik',
    apiKey: 'VOTRE_CLE_API_HENRIK',
    region: 'eu'
});
```

### 2. Test de Connexion

```javascript
async function testAPIConnection() {
    const apiService = new APIService();
    
    if (!apiService.isConfigured()) {
        console.warn('⚠️ API non configurée');
        return;
    }
    
    const isConnected = await apiService.testConnection();
    if (isConnected) {
        console.log('✅ Connexion API réussie');
    } else {
        console.error('❌ Connexion API échouée');
    }
}
```

## 📥 Utilisation des Endpoints

### 1. Récupérer le Contenu du Jeu (Agents, Maps)

```javascript
async function syncGameContent() {
    const apiService = new APIService();
    
    try {
        const content = await apiService.getContent('fr-FR');
        
        // Mettre à jour la liste des agents
        if (content.characters) {
            const agents = content.characters.map(char => char.name);
            console.log('Agents disponibles:', agents);
            // Mettre à jour ALL_AGENTS dans constants.js ou dans l'application
        }
        
        // Mettre à jour la liste des maps
        if (content.maps) {
            const maps = content.maps.map(map => map.name);
            console.log('Maps disponibles:', maps);
            // Mettre à jour ALL_MAPS dans constants.js ou dans l'application
        }
        
        showNotification('Contenu du jeu synchronisé avec succès', 'success');
    } catch (error) {
        console.error('Erreur lors de la synchronisation:', error);
        showNotification('Erreur lors de la synchronisation: ' + error.message, 'error');
    }
}
```

### 2. Vérifier le Statut des Serveurs

```javascript
async function checkServerStatus() {
    const apiService = new APIService();
    
    try {
        const status = await apiService.getStatus();
        
        // Afficher les informations de statut
        if (status.maintenances && status.maintenances.length > 0) {
            const maintenance = status.maintenances[0];
            showNotification(
                `⚠️ Maintenance prévue: ${maintenance.maintenance_status}`,
                'warning'
            );
        } else {
            showNotification('✅ Tous les serveurs sont opérationnels', 'success');
        }
        
        return status;
    } catch (error) {
        console.error('Erreur lors de la vérification du statut:', error);
        showNotification('Impossible de vérifier le statut des serveurs', 'error');
    }
}
```

### 3. Obtenir les Classements (Optionnel)

```javascript
async function getLeaderboard() {
    const apiService = new APIService();
    
    try {
        // Remplacer 'act-uuid' par l'ID de l'acte actuel
        const leaderboard = await apiService.getLeaderboard('act-uuid', 0, 10);
        
        console.log('Top 10 joueurs:', leaderboard.players);
        
        return leaderboard;
    } catch (error) {
        console.error('Erreur lors de la récupération du classement:', error);
    }
}
```

### 4. Import Automatique de Matchs (Avancé)

⚠️ **Nécessite le PUUID du joueur et son consentement explicite**

```javascript
async function importPlayerMatches(puuid) {
    const apiService = new APIService();
    
    try {
        // Demander le consentement à l'utilisateur
        const consent = confirm(
            'Voulez-vous importer vos matchs depuis l\'API Riot Games ?\n\n' +
            'Cela nécessite votre PUUID et votre consentement explicite.'
        );
        
        if (!consent) {
            return;
        }
        
        // Récupérer l'historique des matchs
        const matchHistory = await apiService.getMatchHistory(puuid, 'competitive');
        
        // Traiter chaque match
        for (const matchRef of matchHistory.history) {
            const matchDetails = await apiService.getMatch(matchRef.matchId);
            
            // Convertir les données de l'API en format de l'application
            const convertedMatch = convertAPIMatchToAppFormat(matchDetails);
            
            // Ajouter le match à l'équipe
            team.matches.push(convertedMatch);
        }
        
        saveTeam();
        showNotification(`${matchHistory.history.length} matchs importés`, 'success');
    } catch (error) {
        console.error('Erreur lors de l\'import:', error);
        showNotification('Erreur lors de l\'import des matchs', 'error');
    }
}

function convertAPIMatchToAppFormat(apiMatch) {
    // Convertir le format de l'API Riot Games vers le format de l'application
    return {
        date: formatDateFromTimestamp(apiMatch.matchInfo.gameStartMillis),
        map: apiMatch.matchInfo.mapId,
        opponent: 'API Import', // À adapter selon les données disponibles
        score: `${apiMatch.teams[0].roundsWon}-${apiMatch.teams[1].roundsWon}`,
        result: apiMatch.teams[0].won ? 'Victoire' : 'Défaite',
        rounds: convertRounds(apiMatch.roundResults)
    };
}
```

## 🎛️ Gestion du Cache

### Vider le Cache

```javascript
function clearAPICache() {
    const apiService = new APIService();
    apiService.clearCache();
    showNotification('Cache API vidé', 'success');
}
```

### Forcer une Mise à Jour (Ignorer le Cache)

```javascript
async function forceUpdateContent() {
    const apiService = new APIService();
    
    // Utiliser useCache: false pour forcer une nouvelle requête
    const content = await apiService.request('/val/content/v1/contents', {
        useCache: false
    });
    
    return content;
}
```

## 📊 Statistiques du Service

```javascript
function displayAPIStats() {
    const apiService = new APIService();
    const stats = apiService.getStats();
    
    console.log('Statistiques API:', {
        provider: stats.provider,
        configured: stats.isConfigured,
        cacheSize: stats.cacheSize,
        pendingRequests: stats.rateLimiterRequests
    });
}
```

## 🔐 Sécurité

### Stockage Sécurisé de la Clé API

```javascript
// Dans une fonction de configuration sécurisée
function configureAPI() {
    // Demander la clé API à l'utilisateur (ne jamais la hardcoder)
    const apiKey = prompt('Entrez votre clé API Riot Games:');
    
    if (!apiKey) {
        showNotification('Configuration annulée', 'info');
        return;
    }
    
    const apiService = new APIService();
    apiService.configure({
        provider: 'riot',
        apiKey: apiKey,
        region: 'eu'
    });
    
    // La clé est automatiquement sauvegardée dans localStorage (chiffrée si possible)
    showNotification('Configuration API enregistrée', 'success');
}
```

## 🚨 Gestion des Erreurs

```javascript
async function safeAPIRequest(endpoint) {
    const apiService = new APIService();
    
    try {
        const data = await apiService.request(endpoint);
        return { success: true, data };
    } catch (error) {
        // Gérer différents types d'erreurs
        if (error.message.includes('Limite de taux')) {
            showNotification('Trop de requêtes. Veuillez patienter.', 'warning');
        } else if (error.message.includes('Clé API invalide')) {
            showNotification('Clé API invalide. Veuillez la reconfigurer.', 'error');
        } else if (error.message.includes('non configurée')) {
            showNotification('API non configurée. Veuillez configurer une clé API.', 'warning');
        } else {
            showNotification('Erreur API: ' + error.message, 'error');
        }
        
        return { success: false, error: error.message };
    }
}
```

## 🔄 Synchronisation Automatique

```javascript
// Synchroniser le contenu du jeu toutes les heures
function setupAutoSync() {
    const apiService = new APIService();
    
    if (!apiService.isConfigured()) {
        return;
    }
    
    // Synchroniser immédiatement
    syncGameContent();
    
    // Puis toutes les heures
    setInterval(() => {
        syncGameContent();
    }, 3600000); // 1 heure
}
```

## 📝 Notes Importantes

1. **Ne jamais commiter la clé API** dans le code source
2. **Respecter les limites de taux** pour éviter les blocages
3. **Utiliser le cache** pour réduire les requêtes
4. **Gérer les erreurs** gracieusement
5. **Demander le consentement** avant d'importer des données de joueurs
6. **Respecter les politiques Riot Games** concernant les applications tierces

