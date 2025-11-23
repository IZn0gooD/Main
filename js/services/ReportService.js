/**
 * Service de génération de rapports détaillés (HTML)
 * Permet de créer des rapports HTML formatés avec toutes les statistiques
 */
class ReportService {
    constructor() {
        this.template = null;
    }

    /**
     * Génère un rapport HTML complet
     */
    generateHTMLReport(team) {
        const date = new Date().toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport - ${team.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
            color: #333;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #ff4655;
        }
        .header h1 {
            color: #ff4655;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .header .date {
            color: #666;
            font-size: 1.1em;
        }
        .section {
            margin-bottom: 40px;
        }
        .section-title {
            color: #ff4655;
            font-size: 1.8em;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #ff4655;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #ff4655;
            text-align: center;
        }
        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #ff4655;
            margin-bottom: 5px;
        }
        .stat-label {
            color: #666;
            font-size: 0.9em;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background: white;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #ff4655;
            color: white;
            font-weight: bold;
        }
        tr:hover {
            background: #f8f9fa;
        }
        .win {
            color: #4CAF50;
            font-weight: bold;
        }
        .loss {
            color: #F44336;
            font-weight: bold;
        }
        .player-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            border-left: 4px solid #ff4655;
        }
        .player-name {
            font-size: 1.3em;
            font-weight: bold;
            color: #ff4655;
            margin-bottom: 10px;
        }
        .player-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            color: #666;
        }
        .map-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        .map-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #ff4655;
        }
        .map-name {
            font-size: 1.3em;
            font-weight: bold;
            color: #ff4655;
            margin-bottom: 15px;
        }
        .progression-entry {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #ff4655;
        }
        .progression-date {
            font-weight: bold;
            color: #ff4655;
            margin-bottom: 10px;
        }
        .progression-section {
            margin-top: 15px;
        }
        .progression-section h4 {
            color: #333;
            margin-bottom: 10px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #ddd;
            color: #666;
        }
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .container {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Rapport d'Équipe</h1>
            <h2>${team.name}</h2>
            <p class="date">Généré le ${date}</p>
        </div>

        ${this.generateOverviewSection(team)}
        ${this.generatePlayersSection(team)}
        ${this.generateMatchesSection(team)}
        ${this.generateMapStatsSection(team)}
        ${this.generateProgressionSection(team)}

        <div class="footer">
            <p>Rapport généré par Valorant Team Manager</p>
        </div>
    </div>
</body>
</html>
        `;

        return html;
    }

    /**
     * Génère la section Vue d'ensemble
     */
    generateOverviewSection(team) {
        const playersCount = team.players.length;
        const matchesCount = team.matches.length;
        const victories = team.matches.filter(m => m.result === 'Victoire' || m.result === 'win').length;
        const defeats = team.matches.filter(m => m.result === 'Défaite' || m.result === 'loss').length;
        const totalMatches = victories + defeats;
        const winrate = totalMatches > 0 ? ((victories / totalMatches) * 100).toFixed(1) : 0;

        return `
        <div class="section">
            <h2 class="section-title">📈 Vue d'Ensemble</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${playersCount}</div>
                    <div class="stat-label">Joueurs</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${matchesCount}</div>
                    <div class="stat-label">Matchs Joués</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${victories}</div>
                    <div class="stat-label">Victoires</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${defeats}</div>
                    <div class="stat-label">Défaites</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${winrate}%</div>
                    <div class="stat-label">Winrate</div>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Génère la section Joueurs
     */
    generatePlayersSection(team) {
        if (team.players.length === 0) {
            return `
            <div class="section">
                <h2 class="section-title">👥 Joueurs</h2>
                <p>Aucun joueur enregistré.</p>
            </div>
            `;
        }

        const playersHTML = team.players.map(player => {
            const agentsCount = Object.values(player.known_agents || {}).reduce((sum, agents) => sum + agents.length, 0);
            return `
            <div class="player-card">
                <div class="player-name">${player.name}</div>
                <div class="player-details">
                    <div><strong>Agent:</strong> ${player.agent || 'N/A'}</div>
                    <div><strong>Rôle:</strong> ${player.role || 'N/A'}</div>
                    <div><strong>Rang:</strong> ${player.rank || 'N/A'}</div>
                    <div><strong>Agents connus:</strong> ${agentsCount}</div>
                </div>
            </div>
            `;
        }).join('');

        return `
        <div class="section">
            <h2 class="section-title">👥 Joueurs (${team.players.length})</h2>
            ${playersHTML}
        </div>
        `;
    }

    /**
     * Génère la section Matchs
     */
    generateMatchesSection(team) {
        if (team.matches.length === 0) {
            return `
            <div class="section">
                <h2 class="section-title">📊 Matchs</h2>
                <p>Aucun match enregistré.</p>
            </div>
            `;
        }

        const matchesHTML = team.matches.map(match => {
            const resultClass = (match.result === 'Victoire' || match.result === 'win') ? 'win' : 'loss';
            const resultText = (match.result === 'Victoire' || match.result === 'win') ? 'Victoire' : 'Défaite';
            return `
            <tr>
                <td>${match.date}</td>
                <td>${match.map}</td>
                <td>${match.opponent}</td>
                <td>${match.score || 'N/A'}</td>
                <td class="${resultClass}">${resultText}</td>
            </tr>
            `;
        }).join('');

        return `
        <div class="section">
            <h2 class="section-title">📊 Matchs (${team.matches.length})</h2>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Map</th>
                        <th>Adversaire</th>
                        <th>Score</th>
                        <th>Résultat</th>
                    </tr>
                </thead>
                <tbody>
                    ${matchesHTML}
                </tbody>
            </table>
        </div>
        `;
    }

    /**
     * Génère la section Statistiques par Map
     */
    generateMapStatsSection(team) {
        const mapStats = {};
        team.matches.forEach(match => {
            if (!mapStats[match.map]) {
                mapStats[match.map] = { wins: 0, losses: 0, total: 0 };
            }
            mapStats[match.map].total++;
            if (match.result === 'Victoire' || match.result === 'win') {
                mapStats[match.map].wins++;
            } else {
                mapStats[match.map].losses++;
            }
        });

        if (Object.keys(mapStats).length === 0) {
            return `
            <div class="section">
                <h2 class="section-title">🗺️ Statistiques par Map</h2>
                <p>Aucune statistique disponible.</p>
            </div>
            `;
        }

        const mapsHTML = Object.keys(mapStats).map(mapName => {
            const stats = mapStats[mapName];
            const winrate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0;
            return `
            <div class="map-card">
                <div class="map-name">${mapName}</div>
                <div class="player-details">
                    <div><strong>Victoires:</strong> ${stats.wins}</div>
                    <div><strong>Défaites:</strong> ${stats.losses}</div>
                    <div><strong>Total:</strong> ${stats.total}</div>
                    <div><strong>Winrate:</strong> ${winrate}%</div>
                </div>
            </div>
            `;
        }).join('');

        return `
        <div class="section">
            <h2 class="section-title">🗺️ Statistiques par Map</h2>
            <div class="map-stats">
                ${mapsHTML}
            </div>
        </div>
        `;
    }

    /**
     * Génère la section Progression
     */
    generateProgressionSection(team) {
        if (team.progression_entries.length === 0) {
            return `
            <div class="section">
                <h2 class="section-title">🎯 Progression</h2>
                <p>Aucune entrée de progression enregistrée.</p>
            </div>
            `;
        }

        const entriesHTML = team.progression_entries.map(entry => {
            return `
            <div class="progression-entry">
                <div class="progression-date">Session du ${entry.date}</div>
                ${entry.mental_positif || entry.macro_positif || entry.micro_positif ? `
                    <div class="progression-section">
                        <h4>✅ Points Positifs</h4>
                        ${entry.mental_positif ? `<p><strong>🧠 Mental:</strong> ${entry.mental_positif}</p>` : ''}
                        ${entry.macro_positif ? `<p><strong>🗺️ Macro:</strong> ${entry.macro_positif}</p>` : ''}
                        ${entry.micro_positif ? `<p><strong>🎯 Micro:</strong> ${entry.micro_positif}</p>` : ''}
                    </div>
                ` : ''}
                ${entry.mental_negatif || entry.macro_negatif || entry.micro_negatif ? `
                    <div class="progression-section">
                        <h4>⚠️ Points Négatifs</h4>
                        ${entry.mental_negatif ? `<p><strong>🧠 Mental:</strong> ${entry.mental_negatif}</p>` : ''}
                        ${entry.macro_negatif ? `<p><strong>🗺️ Macro:</strong> ${entry.macro_negatif}</p>` : ''}
                        ${entry.micro_negatif ? `<p><strong>🎯 Micro:</strong> ${entry.micro_negatif}</p>` : ''}
                    </div>
                ` : ''}
                ${entry.urgent ? `
                    <div class="progression-section">
                        <h4>🚨 À Bosser en Urgence</h4>
                        <p>${entry.urgent}</p>
                    </div>
                ` : ''}
                ${entry.strength ? `
                    <div class="progression-section">
                        <h4>💪 Gros Point Positif</h4>
                        <p>${entry.strength}</p>
                    </div>
                ` : ''}
                ${entry.vods ? `
                    <div class="progression-section">
                        <h4>🎥 VODs</h4>
                        <p>${entry.vods}</p>
                    </div>
                ` : ''}
            </div>
            `;
        }).join('');

        return `
        <div class="section">
            <h2 class="section-title">🎯 Progression (${team.progression_entries.length} sessions)</h2>
            ${entriesHTML}
        </div>
        `;
    }

    /**
     * Télécharge le rapport HTML
     */
    downloadHTMLReport(team) {
        const html = this.generateHTMLReport(team);
        const filename = `${team.name.replace(/[^a-z0-9]/gi, '_')}_rapport_${new Date().toISOString().split('T')[0]}.html`;
        
        // Utiliser ExportService pour télécharger
        if (typeof ExportService !== 'undefined') {
            const exportService = new ExportService();
            exportService.downloadFile(html, filename, 'text/html;charset=utf-8;');
        } else {
            // Fallback si ExportService n'est pas disponible
            const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
}

// Rendre le service disponible globalement
window.ReportService = ReportService;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportService;
}

