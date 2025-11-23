/**
 * Service de recherche et filtrage avancé
 * Permet de rechercher et filtrer les joueurs, matchs et données
 */
class SearchService {
    constructor() {
        this.searchHistory = [];
        this.maxHistorySize = 20;
    }

    /**
     * Recherche dans les joueurs
     */
    searchPlayers(players, query) {
        if (!query || query.trim() === '') {
            return players;
        }

        const searchTerm = query.toLowerCase().trim();
        const terms = searchTerm.split(/\s+/);

        return players.filter(player => {
            const name = (player.name || '').toLowerCase();
            const agent = (player.agent || '').toLowerCase();
            const role = (player.role || '').toLowerCase();
            const rank = (player.rank || '').toLowerCase();

            // Vérifier si tous les termes de recherche sont présents
            return terms.every(term => 
                name.includes(term) ||
                agent.includes(term) ||
                role.includes(term) ||
                rank.includes(term)
            );
        });
    }

    /**
     * Recherche dans les matchs
     */
    searchMatches(matches, query) {
        if (!query || query.trim() === '') {
            return matches;
        }

        const searchTerm = query.toLowerCase().trim();
        const terms = searchTerm.split(/\s+/);

        return matches.filter(match => {
            const date = (match.date || '').toLowerCase();
            const map = (match.map || '').toLowerCase();
            const opponent = (match.opponent || '').toLowerCase();
            const score = (match.score || '').toLowerCase();
            const result = (match.result || '').toLowerCase();

            return terms.every(term =>
                date.includes(term) ||
                map.includes(term) ||
                opponent.includes(term) ||
                score.includes(term) ||
                result.includes(term)
            );
        });
    }

    /**
     * Filtre les joueurs par critères multiples
     */
    filterPlayers(players, filters) {
        let filtered = [...players];

        // Filtre par rôle
        if (filters.role && filters.role !== 'all') {
            filtered = filtered.filter(p => p.role === filters.role);
        }

        // Filtre par rang
        if (filters.rank && filters.rank !== 'all') {
            filtered = filtered.filter(p => p.rank === filters.rank);
        }

        // Filtre par agent
        if (filters.agent && filters.agent !== 'all') {
            filtered = filtered.filter(p => p.agent === filters.agent);
        }

        // Filtre par map (agents connus)
        if (filters.map && filters.map !== 'all') {
            filtered = filtered.filter(p => {
                const knownAgents = p.known_agents || {};
                const agentsOnMap = knownAgents[filters.map] || [];
                return agentsOnMap.length > 0;
            });
        }

        // Recherche textuelle
        if (filters.search && filters.search.trim() !== '') {
            filtered = this.searchPlayers(filtered, filters.search);
        }

        return filtered;
    }

    /**
     * Filtre les matchs par critères multiples
     */
    filterMatches(matches, filters) {
        let filtered = [...matches];

        // Filtre par map
        if (filters.map && filters.map !== 'all') {
            filtered = filtered.filter(m => m.map === filters.map);
        }

        // Filtre par résultat
        if (filters.result && filters.result !== 'all') {
            filtered = filtered.filter(m => {
                if (filters.result === 'win') {
                    return m.result === 'Victoire' || m.result === 'win';
                } else if (filters.result === 'loss') {
                    return m.result === 'Défaite' || m.result === 'loss';
                }
                return m.result === filters.result;
            });
        }

        // Filtre par adversaire
        if (filters.opponent && filters.opponent.trim() !== '') {
            const opponentTerm = filters.opponent.toLowerCase().trim();
            filtered = filtered.filter(m => 
                (m.opponent || '').toLowerCase().includes(opponentTerm)
            );
        }

        // Filtre par date (range)
        if (filters.dateFrom) {
            filtered = filtered.filter(m => {
                const matchDate = new Date(m.date);
                const fromDate = new Date(filters.dateFrom);
                return matchDate >= fromDate;
            });
        }

        if (filters.dateTo) {
            filtered = filtered.filter(m => {
                const matchDate = new Date(m.date);
                const toDate = new Date(filters.dateTo);
                return matchDate <= toDate;
            });
        }

        // Recherche textuelle
        if (filters.search && filters.search.trim() !== '') {
            filtered = this.searchMatches(filtered, filters.search);
        }

        // Tri
        if (filters.sortBy) {
            filtered = this.sortMatches(filtered, filters.sortBy, filters.sortOrder || 'desc');
        }

        return filtered;
    }

    /**
     * Trie les matchs
     */
    sortMatches(matches, sortBy, order = 'desc') {
        const sorted = [...matches];
        const direction = order === 'asc' ? 1 : -1;

        sorted.sort((a, b) => {
            let aVal, bVal;

            switch (sortBy) {
                case 'date':
                    aVal = new Date(a.date || 0);
                    bVal = new Date(b.date || 0);
                    break;
                case 'map':
                    aVal = (a.map || '').toLowerCase();
                    bVal = (b.map || '').toLowerCase();
                    break;
                case 'opponent':
                    aVal = (a.opponent || '').toLowerCase();
                    bVal = (b.opponent || '').toLowerCase();
                    break;
                case 'result':
                    aVal = a.result === 'Victoire' || a.result === 'win' ? 1 : 0;
                    bVal = b.result === 'Victoire' || b.result === 'win' ? 1 : 0;
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return -1 * direction;
            if (aVal > bVal) return 1 * direction;
            return 0;
        });

        return sorted;
    }

    /**
     * Recherche globale dans toute l'équipe
     */
    globalSearch(team, query) {
        if (!query || query.trim() === '') {
            return {
                players: team.players || [],
                matches: team.matches || [],
                progression: team.progression_entries || []
            };
        }

        const results = {
            players: this.searchPlayers(team.players || [], query),
            matches: this.searchMatches(team.matches || [], query),
            progression: this.searchProgression(team.progression_entries || [], query)
        };

        // Ajouter à l'historique
        this.addToHistory(query);

        return results;
    }

    /**
     * Recherche dans les entrées de progression
     */
    searchProgression(entries, query) {
        if (!query || query.trim() === '') {
            return entries;
        }

        const searchTerm = query.toLowerCase().trim();
        const terms = searchTerm.split(/\s+/);

        return entries.filter(entry => {
            const date = (entry.date || '').toLowerCase();
            const mentalPos = (entry.mental_positif || '').toLowerCase();
            const mentalNeg = (entry.mental_negatif || '').toLowerCase();
            const macroPos = (entry.macro_positif || '').toLowerCase();
            const macroNeg = (entry.macro_negatif || '').toLowerCase();
            const microPos = (entry.micro_positif || '').toLowerCase();
            const microNeg = (entry.micro_negatif || '').toLowerCase();
            const urgent = (entry.urgent || '').toLowerCase();
            const strength = (entry.strength || '').toLowerCase();
            const vods = (entry.vods || '').toLowerCase();

            return terms.every(term =>
                date.includes(term) ||
                mentalPos.includes(term) ||
                mentalNeg.includes(term) ||
                macroPos.includes(term) ||
                macroNeg.includes(term) ||
                microPos.includes(term) ||
                microNeg.includes(term) ||
                urgent.includes(term) ||
                strength.includes(term) ||
                vods.includes(term)
            );
        });
    }

    /**
     * Ajoute une recherche à l'historique
     */
    addToHistory(query) {
        if (!query || query.trim() === '') return;

        const trimmedQuery = query.trim();
        
        // Retirer si déjà présent
        const index = this.searchHistory.indexOf(trimmedQuery);
        if (index > -1) {
            this.searchHistory.splice(index, 1);
        }

        // Ajouter au début
        this.searchHistory.unshift(trimmedQuery);

        // Limiter la taille
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * Obtient l'historique de recherche
     */
    getHistory() {
        return [...this.searchHistory];
    }

    /**
     * Vide l'historique
     */
    clearHistory() {
        this.searchHistory = [];
    }

    /**
     * Statistiques de recherche
     */
    getSearchStats(team, query) {
        const results = this.globalSearch(team, query);
        
        return {
            query: query,
            playersFound: results.players.length,
            matchesFound: results.matches.length,
            progressionFound: results.progression.length,
            totalFound: results.players.length + results.matches.length + results.progression.length
        };
    }
}

// Rendre le service disponible globalement
window.SearchService = SearchService;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchService;
}

