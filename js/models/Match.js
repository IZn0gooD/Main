/**
 * Modèle Match - Représente un match joué par l'équipe
 */
class Match {
    constructor(date, map, opponent, score = '', result = '') {
        this.date = date;
        this.map = map;
        this.opponent = opponent;
        this.score = score;
        this.result = result;
        this.rounds = [];
    }

    /**
     * Ajoute un round au match
     */
    addRound(round) {
        this.rounds.push(round);
    }

    /**
     * Retire un round du match
     */
    removeRound(roundNumber) {
        this.rounds = this.rounds.filter(r => r.round_number !== roundNumber);
    }

    /**
     * Obtient le nombre de rounds gagnés
     */
    getWinsCount() {
        return this.rounds.filter(r => r.winner === 'Équipe').length;
    }

    /**
     * Obtient le nombre de rounds perdus
     */
    getLossesCount() {
        return this.rounds.filter(r => r.winner === 'Adversaire').length;
    }

    /**
     * Convertit le match en objet JSON
     */
    toJSON() {
        return {
            date: this.date,
            map: this.map,
            opponent: this.opponent,
            score: this.score,
            result: this.result,
            rounds: this.rounds.map(r => r.toJSON())
        };
    }

    /**
     * Crée un match depuis un objet JSON
     */
    static fromJSON(data) {
        const match = new Match(
            data.date || data.Date || '',
            data.map || data.Map || '',
            data.opponent || data.Opponent || '',
            data.score || data.Score || '',
            data.result || data.Result || ''
        );
        
        const roundsData = data.rounds || data.Rounds || [];
        match.rounds = roundsData.map(rData => {
            // Utiliser Round.fromJSON si disponible, sinon créer directement
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
    }
}

// Rendre la classe disponible globalement
window.Match = Match;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Match;
}

