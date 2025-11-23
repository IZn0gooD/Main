/**
 * Modèle Player - Représente un joueur de l'équipe
 */
class Player {
    constructor(name, agent, role, rank) {
        this.name = name;
        this.agent = agent;
        this.role = role;
        this.rank = rank;
        this.known_agents = {}; // { mapName: [agent1, agent2, ...] }
    }

    /**
     * Ajoute un agent connu pour une map spécifique
     */
    addKnownAgent(mapName, agentName) {
        if (!this.known_agents[mapName]) {
            this.known_agents[mapName] = [];
        }
        if (!this.known_agents[mapName].includes(agentName)) {
            this.known_agents[mapName].push(agentName);
        }
    }

    /**
     * Retire un agent connu pour une map spécifique
     */
    removeKnownAgent(mapName, agentName) {
        if (this.known_agents[mapName]) {
            this.known_agents[mapName] = this.known_agents[mapName].filter(a => a !== agentName);
            if (this.known_agents[mapName].length === 0) {
                delete this.known_agents[mapName];
            }
        }
    }

    /**
     * Obtient tous les agents connus pour toutes les maps
     */
    getAllKnownAgents() {
        return this.known_agents;
    }

    /**
     * Convertit le joueur en objet JSON
     */
    toJSON() {
        return {
            name: this.name,
            agent: this.agent,
            role: this.role,
            rank: this.rank,
            known_agents: this.known_agents
        };
    }

    /**
     * Crée un joueur depuis un objet JSON
     */
    static fromJSON(data) {
        const player = new Player(
            data.name || data.Name || '',
            data.agent || data.Agent || '',
            data.role || data.Role || '',
            data.rank || data.Rank || ''
        );
        player.known_agents = data.known_agents || data.KnownAgents || {};
        return player;
    }
}

// Rendre la classe disponible globalement
window.Player = Player;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Player;
}

