/**
 * Service de validation et contrôle d'intégrité des fichiers JSON
 * Vérifie la structure et la validité des données avant chargement
 */
class ValidationService {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Valide la structure d'une équipe
     */
    validateTeam(teamData) {
        this.errors = [];
        this.warnings = [];

        if (!teamData) {
            this.errors.push('Les données de l\'équipe sont vides ou nulles');
            return { valid: false, errors: this.errors, warnings: this.warnings };
        }

        // Vérifier que c'est un objet
        if (typeof teamData !== 'object' || Array.isArray(teamData)) {
            this.errors.push('Les données de l\'équipe doivent être un objet');
            return { valid: false, errors: this.errors, warnings: this.warnings };
        }

        // Vérifier le nom de l'équipe
        if (!teamData.name || typeof teamData.name !== 'string') {
            this.errors.push('Le nom de l\'équipe est manquant ou invalide');
        }

        // Vérifier que players est un tableau
        if (!Array.isArray(teamData.players)) {
            this.errors.push('Le champ "players" doit être un tableau');
        } else {
            // Valider chaque joueur
            teamData.players.forEach((player, index) => {
                const playerValidation = this.validatePlayer(player, index);
                if (!playerValidation.valid) {
                    this.errors.push(...playerValidation.errors);
                }
                if (playerValidation.warnings.length > 0) {
                    this.warnings.push(...playerValidation.warnings);
                }
            });
        }

        // Vérifier que matches est un tableau
        if (!Array.isArray(teamData.matches)) {
            this.errors.push('Le champ "matches" doit être un tableau');
        } else {
            // Valider chaque match
            teamData.matches.forEach((match, index) => {
                const matchValidation = this.validateMatch(match, index);
                if (!matchValidation.valid) {
                    this.errors.push(...matchValidation.errors);
                }
                if (matchValidation.warnings.length > 0) {
                    this.warnings.push(...matchValidation.warnings);
                }
            });
        }

        // Vérifier que progression_entries est un tableau
        if (!Array.isArray(teamData.progression_entries)) {
            this.warnings.push('Le champ "progression_entries" devrait être un tableau');
        } else {
            // Valider chaque entrée de progression
            teamData.progression_entries.forEach((entry, index) => {
                const entryValidation = this.validateProgressionEntry(entry, index);
                if (!entryValidation.valid) {
                    this.warnings.push(...entryValidation.errors);
                }
            });
        }

        return {
            valid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        };
    }

    /**
     * Valide un joueur
     */
    validatePlayer(player, index = -1) {
        const errors = [];
        const warnings = [];
        const prefix = index >= 0 ? `Joueur #${index + 1}` : 'Joueur';

        if (!player || typeof player !== 'object') {
            errors.push(`${prefix}: Les données du joueur sont invalides`);
            return { valid: false, errors, warnings };
        }

        // Vérifier le nom
        if (!player.name || typeof player.name !== 'string' || player.name.trim() === '') {
            errors.push(`${prefix}: Le nom du joueur est manquant ou invalide`);
        }

        // Vérifier l'agent
        if (!player.agent || typeof player.agent !== 'string') {
            errors.push(`${prefix}: L'agent du joueur est manquant ou invalide`);
        }

        // Vérifier le rôle
        if (player.role && typeof player.role !== 'string') {
            warnings.push(`${prefix}: Le rôle devrait être une chaîne de caractères`);
        }

        // Vérifier le rang
        if (player.rank && typeof player.rank !== 'string') {
            warnings.push(`${prefix}: Le rang devrait être une chaîne de caractères`);
        }

        // Vérifier known_agents
        if (player.known_agents) {
            if (typeof player.known_agents !== 'object' || Array.isArray(player.known_agents)) {
                warnings.push(`${prefix}: "known_agents" devrait être un objet`);
            } else {
                // Vérifier que les valeurs sont des tableaux
                Object.keys(player.known_agents).forEach(map => {
                    if (!Array.isArray(player.known_agents[map])) {
                        warnings.push(`${prefix}: "known_agents.${map}" devrait être un tableau`);
                    }
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Valide un match
     */
    validateMatch(match, index = -1) {
        const errors = [];
        const warnings = [];
        const prefix = index >= 0 ? `Match #${index + 1}` : 'Match';

        if (!match || typeof match !== 'object') {
            errors.push(`${prefix}: Les données du match sont invalides`);
            return { valid: false, errors, warnings };
        }

        // Vérifier la date
        if (!match.date || typeof match.date !== 'string') {
            errors.push(`${prefix}: La date du match est manquante ou invalide`);
        } else {
            // Vérifier le format de la date (format attendu: dd-MM-aaaa ou ISO)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$|^\d{2}-\d{2}-\d{4}$/;
            if (!dateRegex.test(match.date)) {
                warnings.push(`${prefix}: Le format de la date semble incorrect (${match.date})`);
            }
        }

        // Vérifier la map
        if (!match.map || typeof match.map !== 'string') {
            errors.push(`${prefix}: La map est manquante ou invalide`);
        }

        // Vérifier l'adversaire
        if (!match.opponent || typeof match.opponent !== 'string') {
            errors.push(`${prefix}: L'adversaire est manquant ou invalide`);
        }

        // Vérifier le score
        if (!match.score || typeof match.score !== 'string') {
            warnings.push(`${prefix}: Le score est manquant ou invalide`);
        } else {
            // Vérifier le format du score (ex: "13-10")
            const scoreRegex = /^\d+-\d+$/;
            if (!scoreRegex.test(match.score)) {
                warnings.push(`${prefix}: Le format du score semble incorrect (${match.score})`);
            }
        }

        // Vérifier le résultat
        if (!match.result || typeof match.result !== 'string') {
            warnings.push(`${prefix}: Le résultat est manquant ou invalide`);
        }

        // Vérifier les rounds
        if (match.rounds) {
            if (!Array.isArray(match.rounds)) {
                warnings.push(`${prefix}: "rounds" devrait être un tableau`);
            } else {
                match.rounds.forEach((round, roundIndex) => {
                    const roundValidation = this.validateRound(round, roundIndex);
                    if (!roundValidation.valid) {
                        warnings.push(...roundValidation.errors);
                    }
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Valide un round
     */
    validateRound(round, index = -1) {
        const errors = [];
        const prefix = index >= 0 ? `Round #${index + 1}` : 'Round';

        if (!round || typeof round !== 'object') {
            errors.push(`${prefix}: Les données du round sont invalides`);
            return { valid: false, errors, warnings: [] };
        }

        // Vérifier le numéro du round
        if (round.round_number === undefined || typeof round.round_number !== 'number') {
            errors.push(`${prefix}: Le numéro du round est manquant ou invalide`);
        }

        // Vérifier le gagnant
        if (!round.winner || typeof round.winner !== 'string') {
            errors.push(`${prefix}: Le gagnant est manquant ou invalide`);
        } else if (!['Nous', 'Adversaire'].includes(round.winner)) {
            warnings.push(`${prefix}: Le gagnant devrait être "Nous" ou "Adversaire" (${round.winner})`);
        }

        // Vérifier le côté
        if (!round.side || typeof round.side !== 'string') {
            errors.push(`${prefix}: Le côté est manquant ou invalide`);
        } else if (!['Attaque', 'Défense'].includes(round.side)) {
            warnings.push(`${prefix}: Le côté devrait être "Attaque" ou "Défense" (${round.side})`);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings: []
        };
    }

    /**
     * Valide une entrée de progression
     */
    validateProgressionEntry(entry, index = -1) {
        const errors = [];
        const warnings = [];
        const prefix = index >= 0 ? `Progression #${index + 1}` : 'Progression';

        if (!entry || typeof entry !== 'object') {
            errors.push(`${prefix}: Les données de progression sont invalides`);
            return { valid: false, errors, warnings };
        }

        // Vérifier la date
        if (!entry.date || typeof entry.date !== 'string') {
            errors.push(`${prefix}: La date est manquante ou invalide`);
        }

        // Les autres champs sont optionnels, donc on ne génère que des warnings
        const optionalFields = ['mental_positif', 'mental_negatif', 'macro_positif', 'macro_negatif', 
                               'micro_positif', 'micro_negatif', 'urgent', 'strength', 'vods'];
        
        optionalFields.forEach(field => {
            if (entry[field] !== undefined && typeof entry[field] !== 'string') {
                warnings.push(`${prefix}: Le champ "${field}" devrait être une chaîne de caractères`);
            }
        });

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Nettoie et corrige les données d'une équipe
     */
    sanitizeTeam(teamData) {
        if (!teamData || typeof teamData !== 'object') {
            return null;
        }

        const sanitized = {
            name: typeof teamData.name === 'string' ? teamData.name.trim() : 'Nouvelle Equipe',
            players: Array.isArray(teamData.players) ? teamData.players.map(p => this.sanitizePlayer(p)).filter(p => p !== null) : [],
            matches: Array.isArray(teamData.matches) ? teamData.matches.map(m => this.sanitizeMatch(m)).filter(m => m !== null) : [],
            progression_entries: Array.isArray(teamData.progression_entries) ? teamData.progression_entries.map(e => this.sanitizeProgressionEntry(e)).filter(e => e !== null) : []
        };

        return sanitized;
    }

    /**
     * Nettoie un joueur
     */
    sanitizePlayer(player) {
        if (!player || typeof player !== 'object') {
            return null;
        }

        return {
            name: typeof player.name === 'string' ? player.name.trim() : '',
            agent: typeof player.agent === 'string' ? player.agent : '',
            role: typeof player.role === 'string' ? player.role : '',
            rank: typeof player.rank === 'string' ? player.rank : '',
            known_agents: player.known_agents && typeof player.known_agents === 'object' && !Array.isArray(player.known_agents)
                ? player.known_agents
                : {}
        };
    }

    /**
     * Nettoie un match
     */
    sanitizeMatch(match) {
        if (!match || typeof match !== 'object') {
            return null;
        }

        return {
            date: typeof match.date === 'string' ? match.date.trim() : '',
            map: typeof match.map === 'string' ? match.map : '',
            opponent: typeof match.opponent === 'string' ? match.opponent.trim() : '',
            score: typeof match.score === 'string' ? match.score.trim() : '',
            result: typeof match.result === 'string' ? match.result : '',
            rounds: Array.isArray(match.rounds) ? match.rounds.map(r => this.sanitizeRound(r)).filter(r => r !== null) : []
        };
    }

    /**
     * Nettoie un round
     */
    sanitizeRound(round) {
        if (!round || typeof round !== 'object') {
            return null;
        }

        return {
            round_number: typeof round.round_number === 'number' ? round.round_number : 1,
            winner: typeof round.winner === 'string' ? round.winner : 'Nous',
            side: typeof round.side === 'string' ? round.side : 'Attaque',
            type: typeof round.type === 'string' ? round.type.trim() : '',
            note: typeof round.note === 'string' ? round.note.trim() : ''
        };
    }

    /**
     * Nettoie une entrée de progression
     */
    sanitizeProgressionEntry(entry) {
        if (!entry || typeof entry !== 'object') {
            return null;
        }

        return {
            date: typeof entry.date === 'string' ? entry.date.trim() : '',
            mental_positif: typeof entry.mental_positif === 'string' ? entry.mental_positif.trim() : '',
            mental_negatif: typeof entry.mental_negatif === 'string' ? entry.mental_negatif.trim() : '',
            macro_positif: typeof entry.macro_positif === 'string' ? entry.macro_positif.trim() : '',
            macro_negatif: typeof entry.macro_negatif === 'string' ? entry.macro_negatif.trim() : '',
            micro_positif: typeof entry.micro_positif === 'string' ? entry.micro_positif.trim() : '',
            micro_negatif: typeof entry.micro_negatif === 'string' ? entry.micro_negatif.trim() : '',
            urgent: typeof entry.urgent === 'string' ? entry.urgent.trim() : '',
            strength: typeof entry.strength === 'string' ? entry.strength.trim() : '',
            vods: typeof entry.vods === 'string' ? entry.vods.trim() : ''
        };
    }

    /**
     * Vérifie l'intégrité d'un fichier JSON avant de le charger
     */
    async validateJSONFile(filePath, fs) {
        try {
            // Lire le fichier
            let data = await fs.readFile(filePath, 'utf-8');
            
            // Supprimer le BOM si présent
            if (data.charCodeAt(0) === 0xFEFF) {
                data = data.slice(1);
            }

            // Parser le JSON
            let jsonData;
            try {
                jsonData = JSON.parse(data);
            } catch (parseError) {
                return {
                    valid: false,
                    errors: [`Erreur de syntaxe JSON: ${parseError.message}`],
                    warnings: [],
                    data: null
                };
            }

            // Valider la structure
            const validation = this.validateTeam(jsonData);

            return {
                valid: validation.valid,
                errors: validation.errors,
                warnings: validation.warnings,
                data: validation.valid ? jsonData : null
            };
        } catch (error) {
            return {
                valid: false,
                errors: [`Erreur lors de la lecture du fichier: ${error.message}`],
                warnings: [],
                data: null
            };
        }
    }
}

// Rendre le service disponible globalement
window.ValidationService = ValidationService;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationService;
}

