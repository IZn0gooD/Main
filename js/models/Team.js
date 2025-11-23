/**
 * Modèle Team - Représente une équipe complète avec joueurs, matchs et progression
 */
class Team {
    constructor(name) {
        this.name = name;
        this.players = [];
        this.matches = [];
        this.progression_entries = [];
    }

    /**
     * Ajoute un joueur à l'équipe
     */
    addPlayer(player) {
        this.players.push(player);
    }

    /**
     * Retire un joueur de l'équipe
     */
    removePlayer(playerName) {
        this.players = this.players.filter(p => p.name !== playerName);
    }

    /**
     * Trouve un joueur par son nom
     */
    findPlayer(playerName) {
        return this.players.find(p => p.name === playerName);
    }

    /**
     * Ajoute un match à l'équipe
     */
    addMatch(match) {
        this.matches.push(match);
    }

    /**
     * Retire un match de l'équipe
     */
    removeMatch(matchIndex) {
        if (matchIndex >= 0 && matchIndex < this.matches.length) {
            this.matches.splice(matchIndex, 1);
        }
    }

    /**
     * Obtient les statistiques globales de l'équipe
     */
    getStats() {
        const victories = this.matches.filter(m => m.result === 'win' || m.result === 'Victoire').length;
        const defeats = this.matches.filter(m => m.result === 'loss' || m.result === 'Défaite').length;
        const totalMatches = victories + defeats;
        const winrate = totalMatches > 0 ? Math.round((victories / totalMatches) * 100 * 10) / 10 : 0;

        return {
            playersCount: this.players.length,
            matchesCount: this.matches.length,
            victories,
            defeats,
            winrate,
            lossrate: totalMatches > 0 ? Math.round((defeats / totalMatches) * 100 * 10) / 10 : 0
        };
    }

    /**
     * Convertit l'équipe en objet JSON
     */
    toJSON() {
        return {
            name: this.name,
            players: this.players.map(p => {
                // Utiliser toJSON si disponible, sinon créer manuellement
                if (typeof p.toJSON === 'function') {
                    return p.toJSON();
                }
                return {
                    name: p.name,
                    agent: p.agent,
                    role: p.role,
                    rank: p.rank,
                    known_agents: p.known_agents
                };
            }),
            matches: this.matches.map(m => {
                // Utiliser toJSON si disponible, sinon créer manuellement
                if (typeof m.toJSON === 'function') {
                    return m.toJSON();
                }
                return {
                    date: m.date,
                    map: m.map,
                    opponent: m.opponent,
                    score: m.score,
                    result: m.result,
                    rounds: m.rounds.map(r => {
                        if (typeof r.toJSON === 'function') {
                            return r.toJSON();
                        }
                        return {
                            round_number: r.round_number,
                            winner: r.winner,
                            side: r.side,
                            type: r.type,
                            note: r.note
                        };
                    })
                };
            }),
            progression_entries: this.progression_entries
        };
    }

    /**
     * Crée une équipe depuis un objet JSON
     */
    static fromJSON(data) {
        const team = new Team(data.name || data.Name || 'Nouvelle Equipe');
        
        // Charger les joueurs
        const playersData = data.players || data.Players || [];
        team.players = playersData.map(pData => {
            // Utiliser Player.fromJSON si disponible
            if (typeof Player !== 'undefined' && Player.fromJSON) {
                return Player.fromJSON(pData);
            }
            // Fallback manuel
            const player = new Player(
                pData.name || pData.Name || '',
                pData.agent || pData.Agent || '',
                pData.role || pData.Role || '',
                pData.rank || pData.Rank || ''
            );
            player.known_agents = pData.known_agents || pData.KnownAgents || {};
            return player;
        });
        
        // Charger les matchs
        const matchesData = data.matches || data.Matches || [];
        team.matches = matchesData.map(mData => {
            // Utiliser Match.fromJSON si disponible
            if (typeof Match !== 'undefined' && Match.fromJSON) {
                return Match.fromJSON(mData);
            }
            // Fallback manuel
            const match = new Match(
                mData.date || mData.Date || '',
                mData.map || mData.Map || '',
                mData.opponent || mData.Opponent || '',
                mData.score || mData.Score || '',
                mData.result || mData.Result || ''
            );
            
            const roundsData = mData.rounds || mData.Rounds || [];
            match.rounds = roundsData.map(rData => {
                if (typeof Round !== 'undefined' && Round.fromJSON) {
                    return Round.fromJSON(rData);
                }
                return new Round(
                    rData.round_number || rData.RoundNumber || 0,
                    rData.winner || rData.Winner || '',
                    rData.side || rData.Side || '',
                    rData.type || rData.Type || '',
                    rData.note || rData.Note || ''
                );
            });
            
            return match;
        });
        
        // Charger les entrées de progression
        team.progression_entries = data.progression_entries || [];
        
        return team;
    }
}

// Rendre la classe disponible globalement
window.Team = Team;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Team;
}

