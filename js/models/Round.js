/**
 * Modèle Round - Représente un round d'un match
 */
class Round {
    constructor(roundNumber, winner = '', side = '', type = '', note = '') {
        this.round_number = roundNumber;
        this.winner = winner;
        this.side = side;
        this.type = type;
        this.note = note;
    }

    /**
     * Convertit le round en objet JSON
     */
    toJSON() {
        return {
            round_number: this.round_number,
            winner: this.winner,
            side: this.side,
            type: this.type,
            note: this.note
        };
    }

    /**
     * Crée un round depuis un objet JSON
     */
    static fromJSON(data) {
        return new Round(
            data.round_number || data.RoundNumber || 0,
            data.winner || data.Winner || '',
            data.side || data.Side || '',
            data.type || data.Type || '',
            data.note || data.Note || ''
        );
    }
}

// Rendre la classe disponible globalement
window.Round = Round;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Round;
}

