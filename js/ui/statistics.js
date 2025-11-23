/**
 * Module de gestion des statistiques
 * Gère l'affichage et le calcul des statistiques
 */

/**
 * Classe pour gérer les statistiques
 */
class StatisticsUI {
    constructor(options = {}) {
        this.getTeam = options.getTeam || (() => null);
        this.statisticsService = options.statisticsService || null;
        this.getAllMaps = options.getAllMaps || (() => []);
        this.showNotification = options.showNotification || (() => {});
        
        // Références aux filtres (seront mis à jour depuis renderer.js)
        this.mapFilterType = 'all';
        this.mapFilterValue = '';
        this.roundFilterType = 'all';
        this.roundFilterValue = '';
    }

    /**
     * Met à jour tous les onglets de statistiques
     */
    updateStatisticsTab() {
        // Initialiser les filtres
        this.onMapFilterTypeChange();
        this.onRoundFilterTypeChange();
        
        this.updateMapStats();
        this.updateRoundStats();
        
        // Mettre à jour les nouvelles statistiques si le service est disponible
        if (this.statisticsService) {
            this.updatePeriodStats();
            this.updateTemporalStats();
        }
    }

    /**
     * Met à jour les statistiques par map
     */
    updateMapStats() {
        const display = document.getElementById('mapStatsDisplay');
        if (!display) return;
        display.innerHTML = '';
        
        const team = this.getTeam();
        if (!team) return;
        
        // Filtrer les matchs selon les filtres actifs
        let filteredMatches = team.matches;
        if (this.mapFilterType === 'map' && this.mapFilterValue) {
            filteredMatches = filteredMatches.filter(m => m.map === this.mapFilterValue);
        } else if (this.mapFilterType === 'opponent' && this.mapFilterValue) {
            filteredMatches = filteredMatches.filter(m => m.opponent === this.mapFilterValue);
        }
        
        // Utiliser le service de statistiques si disponible pour des stats plus détaillées
        let mapStats = {};
        if (this.statisticsService) {
            // Créer une équipe temporaire avec les matchs filtrés pour obtenir des stats détaillées
            const tempTeam = new Team(team.name);
            tempTeam.matches = filteredMatches;
            const detailedStats = this.statisticsService.getDetailedMapStats(tempTeam);
            mapStats = detailedStats;
        } else {
            // Fallback vers l'ancienne méthode
            filteredMatches.forEach(match => {
                if (!mapStats[match.map]) {
                    mapStats[match.map] = { wins: 0, losses: 0, totalMatches: 0 };
                }
                mapStats[match.map].totalMatches++;
                if (match.result === 'Victoire' || match.result === 'win') {
                    mapStats[match.map].wins++;
                } else if (match.result === 'Défaite' || match.result === 'loss') {
                    mapStats[match.map].losses++;
                }
            });
        }
        
        if (Object.keys(mapStats).length === 0) {
            display.innerHTML = '<div class="empty-state">Aucune donnée disponible avec les filtres sélectionnés</div>';
            return;
        }
        
        Object.entries(mapStats).forEach(([mapName, stats]) => {
            const total = stats.totalMatches || (stats.wins + stats.losses);
            const winrate = stats.winrate || (total > 0 ? Math.round((stats.wins / total) * 100 * 10) / 10 : 0);
            
            const card = document.createElement('div');
            card.className = 'stat-card';
            
            // Ajouter des informations supplémentaires si disponibles
            let additionalInfo = '';
            if (stats.totalRounds !== undefined) {
                const roundWinrate = stats.roundWinrate || 0;
                additionalInfo = `
                    <div><strong>Rounds:</strong> ${stats.roundsWon || 0}V / ${stats.roundsLost || 0}D (Winrate: ${roundWinrate}%)</div>
                `;
            }
            if (stats.opponentsCount !== undefined) {
                additionalInfo += `<div><strong>Adversaires différents:</strong> ${stats.opponentsCount}</div>`;
            }
            
            card.innerHTML = `
                <div class="stat-card-title">🗺️ ${mapName}</div>
                <div class="stat-card-content">
                    <div><strong>Matchs:</strong> ${stats.wins || 0}V / ${stats.losses || 0}D (Total: ${total})</div>
                    <div><strong>Winrate:</strong> ${winrate}%</div>
                    ${additionalInfo}
                </div>
            `;
            display.appendChild(card);
        });
    }

    /**
     * Met à jour les statistiques par round
     */
    updateRoundStats() {
        const display = document.getElementById('roundsStatsDisplay');
        if (!display) return;
        display.innerHTML = '';
        
        const team = this.getTeam();
        if (!team) return;
        
        // Filtrer les matchs selon les filtres actifs
        let filteredMatches = team.matches;
        if (this.roundFilterType === 'map' && this.roundFilterValue) {
            filteredMatches = filteredMatches.filter(m => m.map === this.roundFilterValue);
        } else if (this.roundFilterType === 'opponent' && this.roundFilterValue) {
            filteredMatches = filteredMatches.filter(m => m.opponent === this.roundFilterValue);
        }
        
        // Vérifier s'il y a des matchs filtrés
        if (filteredMatches.length === 0) {
            display.innerHTML = '<div class="empty-state">Aucune donnée disponible avec les filtres sélectionnés</div>';
            return;
        }
        
        const stats = this.calculateRoundStats(filteredMatches);
        
        // Vérifier s'il y a des données de rounds
        const hasData = Object.keys(stats).some(key => stats[key].wins > 0 || stats[key].losses > 0);
        if (!hasData) {
            display.innerHTML = '<div class="empty-state">Aucune donnée de rounds disponible avec les filtres sélectionnés</div>';
            return;
        }
        
        // Statistiques par type
        const typeStatsDiv = document.createElement('div');
        typeStatsDiv.className = 'stats-section';
        typeStatsDiv.innerHTML = '<h4>Par Type de Round</h4>';
        
        let hasTypeData = false;
        ['gun_rounds', 'eco_rounds', 'anti_eco_rounds', 'bonus_rounds', 'full_buy_rounds', 'force_buy_rounds'].forEach(type => {
            const typeData = stats[type];
            const total = typeData.wins + typeData.losses;
            if (total > 0) {
                hasTypeData = true;
                const rate = Math.round((typeData.wins / total) * 100 * 10) / 10;
                const card = document.createElement('div');
                card.className = 'stat-card';
                card.innerHTML = `
                    <div class="stat-card-title">${this.getTypeLabel(type)}</div>
                    <div class="stat-card-content">
                        <div>${typeData.wins}V / ${typeData.losses}D (Total: ${total})</div>
                        <div>Winrate: ${rate}%</div>
                    </div>
                `;
                typeStatsDiv.appendChild(card);
            }
        });
        
        if (hasTypeData) {
            display.appendChild(typeStatsDiv);
        }
        
        // Statistiques par côté
        const sideStatsDiv = document.createElement('div');
        sideStatsDiv.className = 'stats-section';
        sideStatsDiv.innerHTML = '<h4>Par Côté</h4>';
        
        let hasSideData = false;
        ['attack_rounds', 'defense_rounds'].forEach(side => {
            const sideData = stats[side];
            const total = sideData.wins + sideData.losses;
            if (total > 0) {
                hasSideData = true;
                const rate = Math.round((sideData.wins / total) * 100 * 10) / 10;
                const card = document.createElement('div');
                card.className = 'stat-card';
                card.innerHTML = `
                    <div class="stat-card-title">${this.getSideLabel(side)}</div>
                    <div class="stat-card-content">
                        <div>${sideData.wins}V / ${sideData.losses}D (Total: ${total})</div>
                        <div>Winrate: ${rate}%</div>
                    </div>
                `;
                sideStatsDiv.appendChild(card);
            }
        });
        
        if (hasSideData) {
            display.appendChild(sideStatsDiv);
        }
        
        // Statistiques totales
        const totalStatsDiv = document.createElement('div');
        totalStatsDiv.className = 'stats-section';
        totalStatsDiv.innerHTML = '<h4>Total</h4>';
        
        const totalData = stats.total_rounds;
        const totalRounds = totalData.wins + totalData.losses;
        if (totalRounds > 0) {
            const totalRate = Math.round((totalData.wins / totalRounds) * 100 * 10) / 10;
            const totalCard = document.createElement('div');
            totalCard.className = 'stat-card';
            totalCard.style.border = '2px solid var(--accent-color)';
            totalCard.innerHTML = `
                <div class="stat-card-title">📊 Total des Rounds</div>
                <div class="stat-card-content">
                    <div>${totalData.wins}V / ${totalData.losses}D (Total: ${totalRounds})</div>
                    <div>Winrate: ${totalRate}%</div>
                </div>
            `;
            totalStatsDiv.appendChild(totalCard);
            display.appendChild(totalStatsDiv);
        }
    }

    /**
     * Calcule les statistiques de rounds
     */
    calculateRoundStats(filteredMatches = null) {
        const team = this.getTeam();
        if (!team) return {};
        
        const matches = filteredMatches || team.matches;
        
        const stats = {
            gun_rounds: { wins: 0, losses: 0 },
            eco_rounds: { wins: 0, losses: 0 },
            anti_eco_rounds: { wins: 0, losses: 0 },
            bonus_rounds: { wins: 0, losses: 0 },
            full_buy_rounds: { wins: 0, losses: 0 },
            force_buy_rounds: { wins: 0, losses: 0 },
            attack_rounds: { wins: 0, losses: 0 },
            defense_rounds: { wins: 0, losses: 0 },
            total_rounds: { wins: 0, losses: 0 }
        };
        
        matches.forEach(match => {
            match.rounds.forEach(round => {
                if (!round.winner) return;
                
                const isWin = round.winner === 'Nous';
                
                if (round.type) {
                    const typeKey = round.type.toLowerCase().replace(' ', '_') + '_rounds';
                    if (stats[typeKey]) {
                        if (isWin) stats[typeKey].wins++;
                        else stats[typeKey].losses++;
                    }
                }
                
                if (round.side) {
                    const sideKey = round.side === 'Attaque' ? 'attack_rounds' : 'defense_rounds';
                    if (isWin) stats[sideKey].wins++;
                    else stats[sideKey].losses++;
                }
                
                if (isWin) stats.total_rounds.wins++;
                else stats.total_rounds.losses++;
            });
        });
        
        return stats;
    }

    /**
     * Gère le changement de type de filtre de map
     */
    onMapFilterTypeChange() {
        const filterType = document.getElementById('mapFilterType');
        if (!filterType) return;
        
        const value = filterType.value;
        const valueGroup = document.getElementById('mapFilterValueGroup');
        const valueSelect = document.getElementById('mapFilterValue');
        
        this.mapFilterType = value;
        
        if (value === 'all') {
            if (valueGroup) valueGroup.style.display = 'none';
            this.mapFilterValue = '';
        } else {
            if (valueGroup) valueGroup.style.display = 'flex';
            
            // Remplir les options selon le type de filtre
            if (valueSelect) {
                valueSelect.innerHTML = '';
                const team = this.getTeam();
                if (!team) return;
                
                if (value === 'map') {
                    const maps = [...new Set(team.matches.map(m => m.map).filter(m => m))];
                    maps.forEach(map => {
                        const option = document.createElement('option');
                        option.value = map;
                        option.textContent = map;
                        valueSelect.appendChild(option);
                    });
                    if (maps.length > 0) {
                        this.mapFilterValue = maps[0];
                        valueSelect.value = maps[0];
                    }
                } else if (value === 'opponent') {
                    const opponents = [...new Set(team.matches.map(m => m.opponent).filter(o => o))];
                    opponents.forEach(opponent => {
                        const option = document.createElement('option');
                        option.value = opponent;
                        option.textContent = opponent;
                        valueSelect.appendChild(option);
                    });
                    if (opponents.length > 0) {
                        this.mapFilterValue = opponents[0];
                        valueSelect.value = opponents[0];
                    }
                }
            }
        }
    }

    /**
     * Applique le filtre de map
     */
    applyMapFilter() {
        const valueSelect = document.getElementById('mapFilterValue');
        if (valueSelect) {
            this.mapFilterValue = valueSelect.value;
        }
        this.updateMapStats();
    }

    /**
     * Réinitialise le filtre de map
     */
    resetMapFilter() {
        this.mapFilterType = 'all';
        this.mapFilterValue = '';
        const filterType = document.getElementById('mapFilterType');
        const valueGroup = document.getElementById('mapFilterValueGroup');
        if (filterType) filterType.value = 'all';
        if (valueGroup) valueGroup.style.display = 'none';
        this.updateMapStats();
    }

    /**
     * Gère le changement de type de filtre de round
     */
    onRoundFilterTypeChange() {
        const filterType = document.getElementById('roundFilterType');
        if (!filterType) return;
        
        const value = filterType.value;
        const valueGroup = document.getElementById('roundFilterValueGroup');
        const valueSelect = document.getElementById('roundFilterValue');
        
        this.roundFilterType = value;
        
        if (value === 'all') {
            if (valueGroup) valueGroup.style.display = 'none';
            this.roundFilterValue = '';
        } else {
            if (valueGroup) valueGroup.style.display = 'flex';
            
            // Remplir les options selon le type de filtre
            if (valueSelect) {
                valueSelect.innerHTML = '';
                const team = this.getTeam();
                if (!team) return;
                
                if (value === 'map') {
                    const maps = [...new Set(team.matches.map(m => m.map).filter(m => m))];
                    maps.forEach(map => {
                        const option = document.createElement('option');
                        option.value = map;
                        option.textContent = map;
                        valueSelect.appendChild(option);
                    });
                    if (maps.length > 0) {
                        this.roundFilterValue = maps[0];
                        valueSelect.value = maps[0];
                    }
                } else if (value === 'opponent') {
                    const opponents = [...new Set(team.matches.map(m => m.opponent).filter(o => o))];
                    opponents.forEach(opponent => {
                        const option = document.createElement('option');
                        option.value = opponent;
                        option.textContent = opponent;
                        valueSelect.appendChild(option);
                    });
                    if (opponents.length > 0) {
                        this.roundFilterValue = opponents[0];
                        valueSelect.value = opponents[0];
                    }
                }
            }
        }
    }

    /**
     * Applique le filtre de round
     */
    applyRoundFilter() {
        const valueSelect = document.getElementById('roundFilterValue');
        if (valueSelect) {
            this.roundFilterValue = valueSelect.value;
        }
        this.updateRoundStats();
    }

    /**
     * Réinitialise le filtre de round
     */
    resetRoundFilter() {
        this.roundFilterType = 'all';
        this.roundFilterValue = '';
        const filterType = document.getElementById('roundFilterType');
        const valueGroup = document.getElementById('roundFilterValueGroup');
        if (filterType) filterType.value = 'all';
        if (valueGroup) valueGroup.style.display = 'none';
        this.updateRoundStats();
    }

    /**
     * Obtient le label pour un type de round
     */
    getTypeLabel(type) {
        const labels = {
            gun_rounds: '🔫 Gun Rounds',
            eco_rounds: '💰 Eco Rounds',
            anti_eco_rounds: '🛡️ Anti-Eco Rounds',
            bonus_rounds: '💎 Bonus Rounds',
            full_buy_rounds: '💰 Full Buy Rounds',
            force_buy_rounds: '⚡ Force Buy Rounds'
        };
        return labels[type] || type;
    }

    /**
     * Obtient le label pour un côté
     */
    getSideLabel(side) {
        const labels = {
            attack_rounds: '⚔️ Attaque',
            defense_rounds: '🛡️ Défense'
        };
        return labels[side] || side;
    }

    /**
     * Met à jour les statistiques par période (utilise StatisticsService)
     */
    updatePeriodStats() {
        if (!this.statisticsService) return;
        const team = this.getTeam();
        if (!team) return;
        const stats = this.statisticsService.getStatsByPeriod(team, 'all');
        this.updatePeriodStatsDisplay(stats);
    }

    /**
     * Affiche les statistiques par période
     */
    updatePeriodStatsDisplay(stats) {
        const display = document.getElementById('periodStatsDisplay');
        if (!display) return;
        
        display.innerHTML = '';
        
        if (!stats || stats.matchesCount === 0) {
            display.innerHTML = '<div class="empty-state">Aucune donnée disponible pour cette période</div>';
            return;
        }
        
        const periodLabel = stats.period === 'all' ? 'Toutes les périodes' :
                            stats.period === 'week' ? '7 derniers jours' :
                            stats.period === 'month' ? '30 derniers jours' :
                            stats.period === 'year' ? '12 derniers mois' :
                            `${stats.startDate} - ${stats.endDate}`;
        
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.style.border = '2px solid var(--accent-color)';
        card.innerHTML = `
            <div class="stat-card-title">📅 Statistiques - ${periodLabel}</div>
            <div class="stat-card-content">
                <div><strong>Période:</strong> ${stats.startDate || 'Début'} - ${stats.endDate}</div>
                <div><strong>Matchs joués:</strong> ${stats.matchesCount}</div>
                <div><strong>Victoires:</strong> ${stats.victories} (${stats.winrate}%)</div>
                <div><strong>Défaites:</strong> ${stats.defeats} (${stats.lossrate}%)</div>
            </div>
        `;
        display.appendChild(card);
    }

    /**
     * Gère le changement de sélection de période
     */
    onPeriodSelectChange() {
        const periodSelect = document.getElementById('periodSelect');
        const customPeriodGroup = document.getElementById('customPeriodGroup');
        
        if (!periodSelect || !customPeriodGroup) return;
        
        if (periodSelect.value === 'custom') {
            customPeriodGroup.style.display = 'flex';
        } else {
            customPeriodGroup.style.display = 'none';
        }
    }

    /**
     * Applique le filtre de période
     */
    applyPeriodFilter() {
        if (!this.statisticsService) return;
        
        const periodSelect = document.getElementById('periodSelect');
        if (!periodSelect) return;
        
        const period = periodSelect.value;
        const team = this.getTeam();
        if (!team) return;
        
        let stats;
        if (period === 'custom') {
            const startDate = document.getElementById('periodStartDate');
            const endDate = document.getElementById('periodEndDate');
            
            if (!startDate || !endDate || !startDate.value || !endDate.value) {
                this.showNotification('Veuillez remplir les deux dates', 'error');
                return;
            }
            
            stats = this.statisticsService.getStatsByCustomPeriod(team, startDate.value, endDate.value);
            if (!stats) {
                this.showNotification('Format de date invalide (utilisez DD-MM-YYYY)', 'error');
                return;
            }
        } else {
            stats = this.statisticsService.getStatsByPeriod(team, period);
        }
        
        this.updatePeriodStatsDisplay(stats);
    }

    /**
     * Met à jour les statistiques temporelles
     */
    updateTemporalStats() {
        if (!this.statisticsService) return;
        const team = this.getTeam();
        if (!team) return;
        const analysis = this.statisticsService.getTemporalAnalysis(team, 'month');
        this.updateTemporalStatsDisplay(analysis);
        this.updateTemporalChart(analysis);
    }

    /**
     * Affiche les statistiques temporelles
     */
    updateTemporalStatsDisplay(analysis) {
        const display = document.getElementById('temporalStatsDisplay');
        if (!display) return;
        
        display.innerHTML = '';
        
        if (!analysis || analysis.periods.length === 0) {
            display.innerHTML = '<div class="empty-state">Aucune donnée disponible pour l\'analyse temporelle</div>';
            return;
        }
        
        // Créer un résumé
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'stats-section';
        summaryDiv.innerHTML = '<h4>Résumé de l\'évolution</h4>';
        
        const avgWinrate = analysis.winrate.length > 0 
            ? Math.round((analysis.winrate.reduce((a, b) => a + b, 0) / analysis.winrate.length) * 10) / 10
            : 0;
        
        const totalMatches = analysis.totalMatches.reduce((a, b) => a + b, 0);
        const totalVictories = analysis.victories.reduce((a, b) => a + b, 0);
        const totalDefeats = analysis.defeats.reduce((a, b) => a + b, 0);
        
        const summaryCard = document.createElement('div');
        summaryCard.className = 'stat-card';
        summaryCard.innerHTML = `
            <div class="stat-card-title">📊 Résumé</div>
            <div class="stat-card-content">
                <div><strong>Périodes analysées:</strong> ${analysis.periods.length}</div>
                <div><strong>Winrate moyen:</strong> ${avgWinrate}%</div>
                <div><strong>Total matchs:</strong> ${totalMatches}</div>
                <div><strong>Total victoires:</strong> ${totalVictories}</div>
                <div><strong>Total défaites:</strong> ${totalDefeats}</div>
            </div>
        `;
        summaryDiv.appendChild(summaryCard);
        display.appendChild(summaryDiv);
    }

    /**
     * Met à jour le graphique temporel
     */
    updateTemporalChart(analysis) {
        const chartDisplay = document.getElementById('temporalChartDisplay');
        if (!chartDisplay || !analysis || analysis.periods.length === 0) return;
        
        chartDisplay.innerHTML = '';
        
        const data = [
            {
                x: analysis.periods,
                y: analysis.winrate,
                name: 'Winrate (%)',
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: '#4CAF50', width: 3 },
                marker: { size: 8 }
            },
            {
                x: analysis.periods,
                y: analysis.victories,
                name: 'Victoires',
                type: 'bar',
                marker: { color: '#4CAF50', opacity: 0.6 },
                yaxis: 'y2'
            },
            {
                x: analysis.periods,
                y: analysis.defeats,
                name: 'Défaites',
                type: 'bar',
                marker: { color: '#F44336', opacity: 0.6 },
                yaxis: 'y2'
            }
        ];
        
        const layout = {
            title: '📈 Évolution Temporelle des Performances',
            xaxis: { title: 'Période' },
            yaxis: { 
                title: 'Winrate (%)',
                range: [0, 100]
            },
            yaxis2: {
                title: 'Nombre de Matchs',
                overlaying: 'y',
                side: 'right'
            },
            font: { size: 14 },
            hovermode: 'x unified'
        };
        
        if (typeof Plotly !== 'undefined') {
            Plotly.newPlot(chartDisplay, data, layout, { responsive: true });
        }
    }

    /**
     * Applique le filtre temporel
     */
    applyTemporalFilter() {
        if (!this.statisticsService) return;
        
        const granularitySelect = document.getElementById('temporalGranularity');
        if (!granularitySelect) return;
        
        const granularity = granularitySelect.value;
        const team = this.getTeam();
        if (!team) return;
        
        const analysis = this.statisticsService.getTemporalAnalysis(team, granularity);
        this.updateTemporalStatsDisplay(analysis);
        this.updateTemporalChart(analysis);
    }
}

// Rendre la classe disponible globalement
window.StatisticsUI = StatisticsUI;

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatisticsUI;
}

