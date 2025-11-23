/**
 * Module de gestion des graphiques
 * Gère l'affichage des graphiques interactifs avec Plotly
 */

/**
 * Classe pour gérer les graphiques
 */
class ChartsManager {
    constructor(options = {}) {
        this.getTeam = options.getTeam || (() => null);
        this.showNotification = options.showNotification || (() => {});
    }

    /**
     * Affiche un graphique dans un conteneur
     * @param {Array} data - Données du graphique (format Plotly)
     * @param {Object} layout - Configuration du layout (format Plotly)
     * @param {string} chartId - Identifiant unique du graphique
     */
    displayChart(data, layout, chartId) {
        const display = document.getElementById('chartDisplay');
        if (!display) {
            console.warn('Élément chartDisplay non trouvé');
            return;
        }
        
        display.innerHTML = `<div id="chart_${chartId}" style="width: 100%; height: 500px;"></div>`;
        
        if (typeof Plotly !== 'undefined') {
            Plotly.newPlot(`chart_${chartId}`, data, layout, { responsive: true });
        } else {
            console.error('Plotly n\'est pas chargé');
            display.innerHTML = '<div class="empty-state">Erreur: Bibliothèque Plotly non chargée</div>';
        }
    }

    /**
     * Affiche le graphique de winrate (camembert)
     */
    showWinrateChart() {
        const team = this.getTeam();
        if (!team) return;
        
        const victories = team.matches.filter(m => m.result === 'Victoire').length;
        const defeats = team.matches.filter(m => m.result === 'Défaite').length;
        
        if (victories + defeats === 0) {
            this.showNotification('Aucune donnée de match disponible', 'error');
            return;
        }
        
        const data = [{
            values: [victories, defeats],
            labels: ['Victoires', 'Défaites'],
            type: 'pie',
            marker: {
                colors: ['#4CAF50', '#F44336']
            },
            hole: 0.3
        }];
        
        const layout = {
            title: '🏆 Répartition Victoires/Défaites',
            font: { size: 16 }
        };
        
        this.displayChart(data, layout, 'winrate');
    }

    /**
     * Affiche le graphique de performance par map
     */
    showMapPerformanceChart() {
        const team = this.getTeam();
        if (!team) return;
        
        const mapStats = {};
        team.matches.forEach(match => {
            if (!mapStats[match.map]) {
                mapStats[match.map] = { victories: 0, defeats: 0 };
            }
            if (match.result === 'Victoire') mapStats[match.map].victories++;
            else if (match.result === 'Défaite') mapStats[match.map].defeats++;
        });
        
        if (Object.keys(mapStats).length === 0) {
            this.showNotification('Aucune donnée de match disponible', 'error');
            return;
        }
        
        const maps = Object.keys(mapStats);
        const victories = maps.map(m => mapStats[m].victories);
        const defeats = maps.map(m => mapStats[m].defeats);
        
        const data = [
            {
                x: maps,
                y: victories,
                name: 'Victoires',
                type: 'bar',
                marker: { color: '#4CAF50' }
            },
            {
                x: maps,
                y: defeats,
                name: 'Défaites',
                type: 'bar',
                marker: { color: '#F44336' }
            }
        ];
        
        const layout = {
            title: '🗺️ Performance par Map',
            barmode: 'group',
            xaxis: { title: 'Maps' },
            yaxis: { title: 'Nombre de Matchs' },
            font: { size: 14 }
        };
        
        this.displayChart(data, layout, 'map-performance');
    }

    /**
     * Affiche le graphique de répartition des types de rounds
     */
    showRoundsChart() {
        const team = this.getTeam();
        if (!team) return;
        
        const roundTypes = {};
        team.matches.forEach(match => {
            match.rounds.forEach(round => {
                if (round.type) {
                    roundTypes[round.type] = (roundTypes[round.type] || 0) + 1;
                }
            });
        });
        
        if (Object.keys(roundTypes).length === 0) {
            this.showNotification('Aucune donnée de round disponible', 'error');
            return;
        }
        
        const data = [{
            x: Object.keys(roundTypes),
            y: Object.values(roundTypes),
            type: 'bar',
            marker: { color: '#2196F3' }
        }];
        
        const layout = {
            title: '🎯 Répartition des Types de Rounds',
            xaxis: { title: 'Type de Round' },
            yaxis: { title: 'Nombre de Rounds' },
            font: { size: 14 }
        };
        
        this.displayChart(data, layout, 'rounds');
    }

    /**
     * Affiche le graphique d'évolution temporelle
     */
    showTimelineChart() {
        const team = this.getTeam();
        if (!team) return;
        
        const monthlyStats = {};
        team.matches.forEach(match => {
            try {
                const parts = match.date.split('-');
                if (parts.length === 3) {
                    const monthKey = `${parts[2]}-${parts[1].padStart(2, '0')}`;
                    if (!monthlyStats[monthKey]) {
                        monthlyStats[monthKey] = { victories: 0, defeats: 0 };
                    }
                    if (match.result === 'Victoire') monthlyStats[monthKey].victories++;
                    else if (match.result === 'Défaite') monthlyStats[monthKey].defeats++;
                }
            } catch (e) {
                // Ignorer les dates invalides
            }
        });
        
        if (Object.keys(monthlyStats).length === 0) {
            this.showNotification('Aucune donnée de match avec date valide', 'error');
            return;
        }
        
        const sortedMonths = Object.keys(monthlyStats).sort();
        const victories = sortedMonths.map(m => monthlyStats[m].victories);
        const defeats = sortedMonths.map(m => monthlyStats[m].defeats);
        
        const data = [
            {
                x: sortedMonths,
                y: victories,
                name: 'Victoires',
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: '#4CAF50', width: 3 },
                marker: { size: 8 }
            },
            {
                x: sortedMonths,
                y: defeats,
                name: 'Défaites',
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: '#F44336', width: 3 },
                marker: { size: 8 }
            }
        ];
        
        const layout = {
            title: '📅 Évolution Temporelle des Performances',
            xaxis: { title: 'Mois' },
            yaxis: { title: 'Nombre de Matchs' },
            font: { size: 14 }
        };
        
        this.displayChart(data, layout, 'timeline');
    }

    /**
     * Affiche le graphique d'utilisation des agents
     */
    showAgentsChart() {
        const team = this.getTeam();
        if (!team) return;
        
        const agentUsage = {};
        team.players.forEach(player => {
            if (player.known_agents) {
                Object.values(player.known_agents).forEach(agents => {
                    if (Array.isArray(agents)) {
                        agents.forEach(agent => {
                            agentUsage[agent] = (agentUsage[agent] || 0) + 1;
                        });
                    }
                });
            }
        });
        
        if (Object.keys(agentUsage).length === 0) {
            this.showNotification('Aucune donnée d\'agent disponible', 'error');
            return;
        }
        
        const sortedAgents = Object.entries(agentUsage)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15); // Top 15
        
        const data = [{
            y: sortedAgents.map(a => a[0]),
            x: sortedAgents.map(a => a[1]),
            type: 'bar',
            orientation: 'h',
            marker: { color: '#9C27B0' }
        }];
        
        const layout = {
            title: '🎭 Utilisation des Agents',
            xaxis: { title: 'Nombre d\'Utilisations' },
            yaxis: { title: 'Agents' },
            font: { size: 14 }
        };
        
        this.displayChart(data, layout, 'agents');
    }
}

// Rendre la classe disponible globalement
window.ChartsManager = ChartsManager;

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartsManager;
}

