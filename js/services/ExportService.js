/**
 * Service d'export/import de données
 * Supporte CSV, XML et JSON
 */
class ExportService {
    constructor() {
        this.csvDelimiter = ',';
        this.csvLineBreak = '\n';
    }

    /**
     * Exporte une équipe en CSV
     */
    exportToCSV(team) {
        let csv = '';
        
        // En-tête
        csv += '=== VALORANT TEAM MANAGER - EXPORT CSV ===\n';
        csv += `Équipe: ${team.name}\n`;
        csv += `Date d'export: ${new Date().toLocaleString('fr-FR')}\n\n`;
        
        // Section Joueurs
        csv += '=== JOUEURS ===\n';
        csv += 'Nom,Agent,Rôle,Rang\n';
        team.players.forEach(player => {
            csv += `${this.escapeCSV(player.name)},${this.escapeCSV(player.agent)},${this.escapeCSV(player.role)},${this.escapeCSV(player.rank)}\n`;
        });
        csv += '\n';
        
        // Section Matchs
        csv += '=== MATCHS ===\n';
        csv += 'Date,Map,Adversaire,Score,Résultat,Nb Rounds\n';
        team.matches.forEach(match => {
            csv += `${this.escapeCSV(match.date)},${this.escapeCSV(match.map)},${this.escapeCSV(match.opponent)},${this.escapeCSV(match.score)},${this.escapeCSV(match.result)},${match.rounds.length}\n`;
        });
        csv += '\n';
        
        // Section Statistiques
        csv += '=== STATISTIQUES GLOBALES ===\n';
        const stats = team.getStats();
        csv += `Nombre de joueurs,${stats.playersCount}\n`;
        csv += `Nombre de matchs,${stats.matchesCount}\n`;
        csv += `Victoires,${stats.victories}\n`;
        csv += `Défaites,${stats.defeats}\n`;
        csv += `Winrate,${stats.winrate}%\n`;
        csv += `Lossrate,${stats.lossrate}%\n`;
        
        return csv;
    }

    /**
     * Exporte une équipe en XML
     */
    exportToXML(team) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<valorant-team-manager>\n';
        xml += `  <team name="${this.escapeXML(team.name)}" export-date="${new Date().toISOString()}">\n`;
        
        // Joueurs
        xml += '    <players>\n';
        team.players.forEach(player => {
            xml += '      <player>\n';
            xml += `        <name>${this.escapeXML(player.name)}</name>\n`;
            xml += `        <agent>${this.escapeXML(player.agent)}</agent>\n`;
            xml += `        <role>${this.escapeXML(player.role)}</role>\n`;
            xml += `        <rank>${this.escapeXML(player.rank)}</rank>\n`;
            if (Object.keys(player.known_agents || {}).length > 0) {
                xml += '        <known-agents>\n';
                Object.entries(player.known_agents || {}).forEach(([map, agents]) => {
                    xml += `          <map-agents map="${this.escapeXML(map)}">\n`;
                    agents.forEach(agent => {
                        xml += `            <agent>${this.escapeXML(agent)}</agent>\n`;
                    });
                    xml += '          </map-agents>\n';
                });
                xml += '        </known-agents>\n';
            }
            xml += '      </player>\n';
        });
        xml += '    </players>\n';
        
        // Matchs
        xml += '    <matches>\n';
        team.matches.forEach(match => {
            xml += '      <match>\n';
            xml += `        <date>${this.escapeXML(match.date)}</date>\n`;
            xml += `        <map>${this.escapeXML(match.map)}</map>\n`;
            xml += `        <opponent>${this.escapeXML(match.opponent)}</opponent>\n`;
            xml += `        <score>${this.escapeXML(match.score)}</score>\n`;
            xml += `        <result>${this.escapeXML(match.result)}</result>\n`;
            if (match.rounds && match.rounds.length > 0) {
                xml += '        <rounds>\n';
                match.rounds.forEach(round => {
                    xml += '          <round>\n';
                    xml += `            <number>${round.round_number}</number>\n`;
                    xml += `            <winner>${this.escapeXML(round.winner)}</winner>\n`;
                    xml += `            <side>${this.escapeXML(round.side)}</side>\n`;
                    xml += `            <type>${this.escapeXML(round.type)}</type>\n`;
                    xml += `            <note>${this.escapeXML(round.note)}</note>\n`;
                    xml += '          </round>\n';
                });
                xml += '        </rounds>\n';
            }
            xml += '      </match>\n';
        });
        xml += '    </matches>\n';
        
        // Progression
        if (team.progression_entries && team.progression_entries.length > 0) {
            xml += '    <progression>\n';
            team.progression_entries.forEach(entry => {
                xml += '      <entry>\n';
                if (entry.date) xml += `        <date>${this.escapeXML(entry.date)}</date>\n`;
                if (entry.mental_positif) xml += `        <mental-positif>${this.escapeXML(entry.mental_positif)}</mental-positif>\n`;
                if (entry.mental_negatif) xml += `        <mental-negatif>${this.escapeXML(entry.mental_negatif)}</mental-negatif>\n`;
                if (entry.macro_positif) xml += `        <macro-positif>${this.escapeXML(entry.macro_positif)}</macro-positif>\n`;
                if (entry.macro_negatif) xml += `        <macro-negatif>${this.escapeXML(entry.macro_negatif)}</macro-negatif>\n`;
                if (entry.micro_positif) xml += `        <micro-positif>${this.escapeXML(entry.micro_positif)}</micro-positif>\n`;
                if (entry.micro_negatif) xml += `        <micro-negatif>${this.escapeXML(entry.micro_negatif)}</micro-negatif>\n`;
                if (entry.urgent) xml += `        <urgent>${this.escapeXML(entry.urgent)}</urgent>\n`;
                if (entry.strength) xml += `        <strength>${this.escapeXML(entry.strength)}</strength>\n`;
                if (entry.vods) xml += `        <vods>${this.escapeXML(entry.vods)}</vods>\n`;
                xml += '      </entry>\n';
            });
            xml += '    </progression>\n';
        }
        
        xml += '  </team>\n';
        xml += '</valorant-team-manager>';
        
        return xml;
    }

    /**
     * Exporte les statistiques en CSV
     */
    exportStatsToCSV(team) {
        let csv = '';
        csv += '=== STATISTIQUES PAR MAP ===\n';
        csv += 'Map,Matchs,Victoires,Défaites,Winrate\n';
        
        const mapStats = {};
        team.matches.forEach(match => {
            if (!mapStats[match.map]) {
                mapStats[match.map] = { matches: 0, victories: 0, defeats: 0 };
            }
            mapStats[match.map].matches++;
            if (match.result === 'win' || match.result === 'Victoire') {
                mapStats[match.map].victories++;
            } else if (match.result === 'loss' || match.result === 'Défaite') {
                mapStats[match.map].defeats++;
            }
        });
        
        Object.entries(mapStats).forEach(([map, stats]) => {
            const total = stats.victories + stats.defeats;
            const winrate = total > 0 ? ((stats.victories / total) * 100).toFixed(1) : '0';
            csv += `${this.escapeCSV(map)},${stats.matches},${stats.victories},${stats.defeats},${winrate}%\n`;
        });
        
        return csv;
    }

    /**
     * Importe depuis CSV (format simplifié)
     */
    async importFromCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        const team = new Team('Équipe Importée');
        
        let currentSection = '';
        let headerSkipped = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Détecter les sections
            if (line.startsWith('=== JOUEURS ===')) {
                currentSection = 'players';
                headerSkipped = false;
                continue;
            } else if (line.startsWith('=== MATCHS ===')) {
                currentSection = 'matches';
                headerSkipped = false;
                continue;
            } else if (line.startsWith('===')) {
                currentSection = '';
                continue;
            }
            
            // Parser selon la section
            if (currentSection === 'players' && !headerSkipped) {
                headerSkipped = true;
                continue; // Skip header
            } else if (currentSection === 'players') {
                const parts = this.parseCSVLine(line);
                if (parts.length >= 4) {
                    const player = new Player(parts[0], parts[1], parts[2], parts[3]);
                    team.addPlayer(player);
                }
            } else if (currentSection === 'matches' && !headerSkipped) {
                headerSkipped = true;
                continue; // Skip header
            } else if (currentSection === 'matches') {
                const parts = this.parseCSVLine(line);
                if (parts.length >= 5) {
                    const match = new Match(parts[0], parts[1], parts[2], parts[3], parts[4]);
                    team.addMatch(match);
                }
            }
        }
        
        return team;
    }

    /**
     * Échappe les caractères spéciaux pour CSV
     */
    escapeCSV(text) {
        if (text === null || text === undefined) return '';
        const str = String(text);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    /**
     * Échappe les caractères spéciaux pour XML
     */
    escapeXML(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Parse une ligne CSV en tenant compte des guillemets
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        
        return result;
    }

    /**
     * Télécharge un fichier
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// Rendre le service disponible globalement
window.ExportService = ExportService;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportService;
}

