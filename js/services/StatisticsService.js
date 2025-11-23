/**
 * Service de statistiques avancées
 * Gère les statistiques par période, analyse temporelle, comparaisons, etc.
 */
class StatisticsService {
    constructor() {
        this.dateFormat = 'DD-MM-YYYY';
    }

    /**
     * Parse une date au format DD-MM-YYYY
     */
    parseDate(dateString) {
        if (!dateString) return null;
        const parts = dateString.split('-');
        if (parts.length !== 3) return null;
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Les mois sont 0-indexés
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
    }

    /**
     * Formate une date au format DD-MM-YYYY
     */
    formatDate(date) {
        if (!date) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }

    /**
     * Obtient les statistiques par période (semaine, mois, année)
     */
    getStatsByPeriod(team, period = 'all') {
        const now = new Date();
        let startDate = null;
        let endDate = new Date();

        switch (period) {
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                startDate = new Date(now);
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            case 'all':
            default:
                startDate = null;
                break;
        }

        let filteredMatches = team.matches;
        if (startDate) {
            filteredMatches = team.matches.filter(match => {
                const matchDate = this.parseDate(match.date);
                if (!matchDate) return false;
                return matchDate >= startDate && matchDate <= endDate;
            });
        }

        const victories = filteredMatches.filter(m => m.result === 'win' || m.result === 'Victoire').length;
        const defeats = filteredMatches.filter(m => m.result === 'loss' || m.result === 'Défaite').length;
        const total = victories + defeats;
        const winrate = total > 0 ? Math.round((victories / total) * 100 * 10) / 10 : 0;

        return {
            period,
            startDate: startDate ? this.formatDate(startDate) : null,
            endDate: this.formatDate(endDate),
            matchesCount: filteredMatches.length,
            victories,
            defeats,
            winrate,
            lossrate: total > 0 ? Math.round((defeats / total) * 100 * 10) / 10 : 0,
            matches: filteredMatches
        };
    }

    /**
     * Obtient les statistiques par période personnalisée
     */
    getStatsByCustomPeriod(team, startDate, endDate) {
        const start = this.parseDate(startDate);
        const end = this.parseDate(endDate);

        if (!start || !end) {
            return null;
        }

        const filteredMatches = team.matches.filter(match => {
            const matchDate = this.parseDate(match.date);
            if (!matchDate) return false;
            return matchDate >= start && matchDate <= end;
        });

        const victories = filteredMatches.filter(m => m.result === 'win' || m.result === 'Victoire').length;
        const defeats = filteredMatches.filter(m => m.result === 'loss' || m.result === 'Défaite').length;
        const total = victories + defeats;
        const winrate = total > 0 ? Math.round((victories / total) * 100 * 10) / 10 : 0;

        return {
            startDate,
            endDate,
            matchesCount: filteredMatches.length,
            victories,
            defeats,
            winrate,
            lossrate: total > 0 ? Math.round((defeats / total) * 100 * 10) / 10 : 0,
            matches: filteredMatches
        };
    }

    /**
     * Analyse détaillée de performance par map
     */
    getDetailedMapStats(team, mapName = null) {
        let filteredMatches = team.matches;
        if (mapName) {
            filteredMatches = team.matches.filter(m => m.map === mapName);
        }

        const mapStats = {};
        
        filteredMatches.forEach(match => {
            const map = match.map || 'Inconnue';
            if (!mapStats[map]) {
                mapStats[map] = {
                    name: map,
                    totalMatches: 0,
                    victories: 0,
                    defeats: 0,
                    winrate: 0,
                    totalRounds: 0,
                    roundsWon: 0,
                    roundsLost: 0,
                    averageScore: { wins: 0, losses: 0 },
                    opponents: new Set(),
                    dates: []
                };
            }

            const stats = mapStats[map];
            stats.totalMatches++;
            
            if (match.result === 'win' || match.result === 'Victoire') {
                stats.victories++;
            } else if (match.result === 'loss' || match.result === 'Défaite') {
                stats.defeats++;
            }

            // Statistiques des rounds
            if (match.rounds && match.rounds.length > 0) {
                stats.totalRounds += match.rounds.length;
                const roundsWon = match.rounds.filter(r => r.result === 'win' || r.result === 'Victoire').length;
                const roundsLost = match.rounds.length - roundsWon;
                stats.roundsWon += roundsWon;
                stats.roundsLost += roundsLost;
            }

            // Score moyen
            if (match.score) {
                const scoreParts = match.score.split('-');
                if (scoreParts.length === 2) {
                    const ourScore = parseInt(scoreParts[0], 10);
                    const theirScore = parseInt(scoreParts[1], 10);
                    if (match.result === 'win' || match.result === 'Victoire') {
                        stats.averageScore.wins += ourScore;
                    } else {
                        stats.averageScore.losses += theirScore;
                    }
                }
            }

            if (match.opponent) {
                stats.opponents.add(match.opponent);
            }

            if (match.date) {
                stats.dates.push(match.date);
            }
        });

        // Calculer les moyennes et pourcentages
        Object.values(mapStats).forEach(stats => {
            stats.winrate = stats.totalMatches > 0 
                ? Math.round((stats.victories / stats.totalMatches) * 100 * 10) / 10 
                : 0;
            
            stats.roundWinrate = stats.totalRounds > 0
                ? Math.round((stats.roundsWon / stats.totalRounds) * 100 * 10) / 10
                : 0;

            if (stats.victories > 0) {
                stats.averageScore.wins = Math.round(stats.averageScore.wins / stats.victories);
            }
            if (stats.defeats > 0) {
                stats.averageScore.losses = Math.round(stats.averageScore.losses / stats.defeats);
            }

            stats.opponentsCount = stats.opponents.size;
            stats.opponents = Array.from(stats.opponents);
            
            // Trier les dates
            stats.dates.sort((a, b) => {
                const dateA = this.parseDate(a);
                const dateB = this.parseDate(b);
                if (!dateA || !dateB) return 0;
                return dateA - dateB;
            });
        });

        return mapStats;
    }

    /**
     * Analyse temporelle - progression dans le temps
     */
    getTemporalAnalysis(team, period = 'month') {
        const matches = team.matches.slice().sort((a, b) => {
            const dateA = this.parseDate(a.date);
            const dateB = this.parseDate(b.date);
            if (!dateA || !dateB) return 0;
            return dateA - dateB;
        });

        if (matches.length === 0) {
            return {
                periods: [],
                winrate: [],
                victories: [],
                defeats: [],
                totalMatches: []
            };
        }

        const firstDate = this.parseDate(matches[0].date);
        const lastDate = this.parseDate(matches[matches.length - 1].date);
        
        if (!firstDate || !lastDate) {
            return {
                periods: [],
                winrate: [],
                victories: [],
                defeats: [],
                totalMatches: []
            };
        }

        const periods = [];
        const winrate = [];
        const victories = [];
        const defeats = [];
        const totalMatches = [];

        let currentPeriod = new Date(firstDate);
        
        while (currentPeriod <= lastDate) {
            let periodEnd = new Date(currentPeriod);
            let periodLabel = '';

            switch (period) {
                case 'week':
                    periodEnd.setDate(currentPeriod.getDate() + 7);
                    periodLabel = `Semaine ${this.formatDate(currentPeriod)}`;
                    break;
                case 'month':
                    periodEnd.setMonth(currentPeriod.getMonth() + 1);
                    periodLabel = `${currentPeriod.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`;
                    break;
                case 'year':
                    periodEnd.setFullYear(currentPeriod.getFullYear() + 1);
                    periodLabel = `${currentPeriod.getFullYear()}`;
                    break;
                default:
                    periodEnd.setMonth(currentPeriod.getMonth() + 1);
                    periodLabel = `${currentPeriod.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`;
            }

            const periodMatches = matches.filter(match => {
                const matchDate = this.parseDate(match.date);
                if (!matchDate) return false;
                return matchDate >= currentPeriod && matchDate < periodEnd;
            });

            const periodVictories = periodMatches.filter(m => m.result === 'win' || m.result === 'Victoire').length;
            const periodDefeats = periodMatches.filter(m => m.result === 'loss' || m.result === 'Défaite').length;
            const periodTotal = periodVictories + periodDefeats;
            const periodWinrate = periodTotal > 0 
                ? Math.round((periodVictories / periodTotal) * 100 * 10) / 10 
                : 0;

            periods.push(periodLabel);
            winrate.push(periodWinrate);
            victories.push(periodVictories);
            defeats.push(periodDefeats);
            totalMatches.push(periodTotal);

            currentPeriod = new Date(periodEnd);
        }

        return {
            periods,
            winrate,
            victories,
            defeats,
            totalMatches
        };
    }

    /**
     * Compare deux équipes
     */
    compareTeams(team1, team2) {
        const stats1 = team1.getStats();
        const stats2 = team2.getStats();

        const mapStats1 = this.getDetailedMapStats(team1);
        const mapStats2 = this.getDetailedMapStats(team2);

        return {
            overall: {
                team1: {
                    name: team1.name,
                    ...stats1
                },
                team2: {
                    name: team2.name,
                    ...stats2
                },
                difference: {
                    winrate: stats1.winrate - stats2.winrate,
                    matchesCount: stats1.matchesCount - stats2.matchesCount,
                    victories: stats1.victories - stats2.victories
                }
            },
            maps: {
                team1: mapStats1,
                team2: mapStats2
            }
        };
    }

    /**
     * Génère les données pour un graphique comparatif
     */
    generateComparisonChartData(team1, team2, type = 'bar') {
        const comparison = this.compareTeams(team1, team2);
        
        if (type === 'bar') {
            return {
                type: 'bar',
                data: {
                    labels: ['Winrate', 'Victoires', 'Défaites', 'Total Matchs'],
                    datasets: [
                        {
                            label: team1.name,
                            data: [
                                comparison.overall.team1.winrate,
                                comparison.overall.team1.victories,
                                comparison.overall.team1.defeats,
                                comparison.overall.team1.matchesCount
                            ],
                            backgroundColor: 'rgba(255, 70, 85, 0.6)',
                            borderColor: 'rgba(255, 70, 85, 1)',
                            borderWidth: 1
                        },
                        {
                            label: team2.name,
                            data: [
                                comparison.overall.team2.winrate,
                                comparison.overall.team2.victories,
                                comparison.overall.team2.defeats,
                                comparison.overall.team2.matchesCount
                            ],
                            backgroundColor: 'rgba(70, 85, 255, 0.6)',
                            borderColor: 'rgba(70, 85, 255, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            };
        } else if (type === 'radar') {
            // Graphique radar pour comparaison multi-critères
            const maps = [...new Set([
                ...Object.keys(comparison.maps.team1),
                ...Object.keys(comparison.maps.team2)
            ])];

            return {
                type: 'radar',
                data: {
                    labels: maps,
                    datasets: [
                        {
                            label: `${team1.name} - Winrate`,
                            data: maps.map(map => comparison.maps.team1[map]?.winrate || 0),
                            backgroundColor: 'rgba(255, 70, 85, 0.2)',
                            borderColor: 'rgba(255, 70, 85, 1)',
                            borderWidth: 2
                        },
                        {
                            label: `${team2.name} - Winrate`,
                            data: maps.map(map => comparison.maps.team2[map]?.winrate || 0),
                            backgroundColor: 'rgba(70, 85, 255, 0.2)',
                            borderColor: 'rgba(70, 85, 255, 1)',
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            };
        }

        return null;
    }
}

// Rendre le service disponible globalement
window.StatisticsService = StatisticsService;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatisticsService;
}

