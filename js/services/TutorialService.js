/**
 * Service de gestion des tutoriels et guides
 * Fournit les contenus des tutoriels, guides de démarrage et conseils stratégiques
 */
class TutorialService {
    constructor() {
        this.mapTips = this.initializeMapTips();
    }

    /**
     * Initialise les conseils stratégiques pour chaque map
     */
    initializeMapTips() {
        return {
            "Ascent": {
                description: "Map avec 2 sites (A et B) reliés par le Mid",
                tips: [
                    "Contrôlez le Mid pour avoir des rotations rapides",
                    "Sur le site A, contrôlez le Tree et les catwalks",
                    "Sur le site B, le Market et les Courtyard sont cruciaux",
                    "Utilisez des utilitaires pour nettoyer les angles serrés",
                    "Les ouvertures sur les sites sont nombreuses, coordonnez vos utilitaires"
                ],
                agents_recommended: ["Sova", "Jett", "Killjoy", "Omen"]
            },
            "Bind": {
                description: "Map avec 2 sites sans Mid, téléporteurs pour rotations",
                tips: [
                    "Maîtrisez les téléportateurs pour des rotations rapides",
                    "Le Hookah sur A et le U-Hall sur B sont des positions clés",
                    "Utilisez les smokes pour bloquer les lignes de vue longues",
                    "Les post-plant sont cruciaux, gardez des utilitaires",
                    "Surf flasquez avant d'entrer sur les sites"
                ],
                agents_recommended: ["Omen", "Brimstone", "Raze", "Sage"]
            },
            "Haven": {
                description: "Map unique avec 3 sites (A, B, C)",
                tips: [
                    "Avec 3 sites, la coordination est essentielle",
                    "Ne laissez jamais 2 sites non défendus",
                    "Le Mid (B) est central, contrôlez-le",
                    "Les rotations sont longues, communiquez",
                    "Les sites C et A sont plus ouverts, utilisez des smokes"
                ],
                agents_recommended: ["Omen", "Brimstone", "Cypher", "Sage"]
            },
            "Split": {
                description: "Map verticale avec beaucoup de hauteurs",
                tips: [
                    "Contrôlez les hauteurs (Ropes) pour avoir l'avantage",
                    "Les Ropes permettent des rotations rapides",
                    "Sur le site A, contrôlez le Screens et les Heaven",
                    "Sur le site B, le B-Heaven est crucial",
                    "Les utilitaires qui bloquent les hauteurs sont très efficaces"
                ],
                agents_recommended: ["Omen", "Raze", "Sage", "Cypher"]
            },
            "Breeze": {
                description: "Map très ouverte avec de longues lignes de vue",
                tips: [
                    "Les Opérators sont très efficaces sur cette map",
                    "Utilisez beaucoup de smokes pour réduire les angles",
                    "Les rotations sont longues, planifiez-les",
                    "Le site A est plus facile à défendre",
                    "Surf utilisez les utilitaires pour dégager les angles"
                ],
                agents_recommended: ["Viper", "Jett", "Sova", "Killjoy"]
            },
            "Icebox": {
                description: "Map avec beaucoup de hauteurs et zones verticales",
                tips: [
                    "Maîtrisez les hauteurs pour contrôler la map",
                    "Le site A a beaucoup de hauteurs à nettoyer",
                    "Le site B est plus simple mais nécessite de la coordination",
                    "Les utilitaires qui vérifient les hauteurs sont essentiels",
                    "Les rotations via le Tube sont rapides mais risquées"
                ],
                agents_recommended: ["Sage", "Jett", "Sova", "Viper"]
            },
            "Fracture": {
                description: "Map unique avec spawns des attaquants de chaque côté",
                tips: [
                    "Les attaquants peuvent venir de 2 directions",
                    "La communication est cruciale pour la défense",
                    "Le Mid est central pour les rotations",
                    "Les utilitaires pour vérifier plusieurs angles sont importants",
                    "Coordonnez les pushes sur les sites"
                ],
                agents_recommended: ["Breach", "Killjoy", "Omen", "Sage"]
            },
            "Pearl": {
                description: "Map avec beaucoup de chemins alternatifs",
                tips: [
                    "Il y a beaucoup de chemins vers chaque site",
                    "Contrôlez les Mid pour les rotations",
                    "Les utilitaires qui vérifient plusieurs angles sont cruciaux",
                    "Les post-plant sont difficiles, gardez des utilitaires",
                    "Coordonnez vos utilitaires pour les pushes"
                ],
                agents_recommended: ["Viper", "Jett", "Sova", "Cypher"]
            },
            "Lotus": {
                description: "Map avec 3 sites et portes rotatives",
                tips: [
                    "Maîtrisez les portes rotatives pour les rotations",
                    "Les 3 sites nécessitent une bonne coordination",
                    "Les utilitaires à travers les portes sont efficaces",
                    "Contrôlez le Mid pour les rotations rapides",
                    "Les sites sont assez ouverts, utilisez des smokes"
                ],
                agents_recommended: ["Omen", "Jett", "Killjoy", "Sova"]
            },
            "Sunset": {
                description: "Map avec un design unique et zones tactiques",
                tips: [
                    "Maîtrisez les zones tactiques clés",
                    "Les rotations sont importantes, communiquez",
                    "Utilisez les utilitaires pour nettoyer les angles",
                    "Les post-plant sont cruciaux, gardez des utilitaires",
                    "Coordonnez les pushes sur les sites"
                ],
                agents_recommended: ["Omen", "Raze", "Sage", "Cypher"]
            },
            "Abyss": {
                description: "Map avec des zones verticales et ouvertes",
                tips: [
                    "Contrôlez les hauteurs pour l'avantage",
                    "Les zones ouvertes nécessitent des smokes",
                    "Les rotations sont importantes",
                    "Coordonnez vos utilitaires",
                    "Les post-plant nécessitent de la coordination"
                ],
                agents_recommended: ["Jett", "Omen", "Sova", "Killjoy"]
            },
            "Corrode": {
                description: "Map tactique avec zones spécifiques",
                tips: [
                    "Maîtrisez les zones tactiques clés",
                    "Utilisez les utilitaires pour contrôler les zones",
                    "Les rotations sont importantes",
                    "Coordonnez les pushes",
                    "Les post-plant sont cruciaux"
                ],
                agents_recommended: ["Omen", "Raze", "Sage", "Cypher"]
            }
        };
    }

    /**
     * Retourne les conseils pour une map spécifique
     */
    getMapTips(mapName) {
        return this.mapTips[mapName] || {
            description: "Conseils généraux pour cette map",
            tips: [
                "Communiquez avec votre équipe",
                "Coordonnez vos utilitaires",
                "Contrôlez les zones clés de la map",
                "Les rotations sont importantes",
                "Gardez des utilitaires pour le post-plant"
            ],
            agents_recommended: []
        };
    }

    /**
     * Retourne le guide de démarrage rapide
     */
    getQuickStartGuide() {
        return {
            title: "Guide de Démarrage Rapide",
            steps: [
                {
                    step: 1,
                    title: "Créer votre équipe",
                    description: "Définissez le nom de votre équipe dans l'onglet Home. C'est la première étape pour commencer à suivre vos performances.",
                    icon: "🏠"
                },
                {
                    step: 2,
                    title: "Ajouter vos joueurs",
                    description: "Allez dans l'onglet 'Joueurs' et cliquez sur 'Ajouter un Joueur'. Remplissez les informations : nom, agent principal, rôle et rang.",
                    icon: "👥"
                },
                {
                    step: 3,
                    title: "Gérer les agents par map",
                    description: "Pour chaque joueur, vous pouvez éditer les agents qu'il sait jouer sur chaque map. Cliquez sur '🎯 Éditer Agents' pour configurer les agents par map.",
                    icon: "🎭"
                },
                {
                    step: 4,
                    title: "Enregistrer vos matchs",
                    description: "Dans l'onglet 'Matchs', ajoutez vos matchs (date, map, adversaire, score, résultat) et détaillez les rounds. Vous pouvez ajouter des rounds overtime depuis l'éditeur de match.",
                    icon: "📊"
                },
                {
                    step: 5,
                    title: "Analyser vos statistiques",
                    description: "L'onglet 'Statistiques' affiche cartes, rounds détaillés et graphiques (winrate, meilleure map, top adversaires). Utilisez les filtres et exports (CSV/HTML/PDF/Excel) pour affiner vos analyses.",
                    icon: "📈"
                },
                {
                    step: 6,
                    title: "Suivre votre progression",
                    description: "Utilisez l'onglet 'Progression' pour noter vos forces, faiblesses et axes d'amélioration après chaque session de jeu.",
                    icon: "🎯"
                },
                {
                    step: 7,
                    title: "Exploitations avancées & exports",
                    description: "Via le menu 'Fichier' et l'onglet 'Statistiques', exportez vos données en CSV/XML/JSON/Excel ou générez des rapports HTML/PDF thémés. Les exports volumineux utilisent des Web Workers pour garder l’UI fluide.",
                    icon: "📤"
                },
                {
                    step: 8,
                    title: "Sauvegarder régulièrement",
                    description: "L'application sauvegarde automatiquement toutes les 30 secondes et crée des backups versionnés (💾). Vous pouvez chiffrer les sauvegardes locales via la modale Sécurité (🔒).",
                    icon: "💾"
                },
                {
                    step: 9,
                    title: "Utiliser les intégrations Riot API",
                    description: "Dans l’onglet 'API', saisissez votre clé Riot officielle, choisissez région/plateforme et endpoint puis cliquez sur Exécuter. Vous pouvez importer des matchs, copier la requête cURL et consulter l’historique.",
                    icon: "🛠️"
                },
                {
                    step: 10,
                    title: "Importer un scoreboard via OCR",
                    description: "Avec le bouton '🧠 OCR', importez une capture de scoreboard Valorant, lancez l’OCR puis utilisez 'Préremplir le match' pour créer un match avec joueurs/score pré-remplis.",
                    icon: "🧠"
                },
                {
                    step: 11,
                    title: "Gérer vos stratégies (Valoplants)",
                    description: "Dans l’onglet 'Stratégie', importez vos captures (drag & drop ou bouton), ajoutez des notes par image et exportez vos 'Valoplants' en HTML/PDF pour les partager à l’équipe.",
                    icon: "🧠"
                },
                {
                    step: 12,
                    title: "Comparer et personnaliser vos profils",
                    description: "Utilisez l’onglet 'Comparaison' pour comparer deux équipes (JSON) et le module 'Profils' pour gérer plusieurs équipes/profils locaux (import/export).",
                    icon: "⚖️"
                },
                {
                    step: 13,
                    title: "Notifications, métriques et logs",
                    description: "Configurez les notifications (🔔), consultez le journal des alertes, les logs (🧾) et les métriques d’usage (📈) pour suivre la santé de l’app et vos habitudes d’utilisation.",
                    icon: "📡"
                },
                {
                    step: 14,
                    title: "Personnaliser l’apparence",
                    description: "Ouvrez la modale Thème (🎨) pour choisir un preset, définir une couleur d’accent personnalisée et sauvegarder vos propres thèmes (import/export).",
                    icon: "🎨"
                }
            ]
        };
    }

    /**
     * Retourne la liste des raccourcis clavier
     */
    getKeyboardShortcuts() {
        return {
            title: "Raccourcis Clavier",
            shortcuts: [
                {
                    key: "Ctrl + 1",
                    description: "Aller à l'onglet Home",
                    category: "Navigation"
                },
                {
                    key: "Ctrl + 2",
                    description: "Aller à l'onglet Joueurs",
                    category: "Navigation"
                },
                {
                    key: "Ctrl + 3",
                    description: "Aller à l'onglet Matchs",
                    category: "Navigation"
                },
                {
                    key: "Ctrl + 4",
                    description: "Aller à l'onglet Statistiques",
                    category: "Navigation"
                },
                {
                    key: "Ctrl + 5",
                    description: "Aller à l'onglet Progression",
                    category: "Navigation"
                },
                {
                    key: "Ctrl + S",
                    description: "Sauvegarder l'équipe",
                    category: "Actions"
                },
                {
                    key: "Ctrl + O",
                    description: "Ouvrir une équipe",
                    category: "Actions"
                },
                {
                    key: "Ctrl + E",
                    description: "Exporter l'équipe",
                    category: "Actions"
                },
                {
                    key: "Ctrl + Shift + I",
                    description: "Importer depuis CSV",
                    category: "Actions"
                },
                {
                    key: "Escape",
                    description: "Fermer les modales",
                    category: "Interface"
                }
            ]
        };
    }
}

// Rendre le service disponible globalement
window.TutorialService = TutorialService;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TutorialService;
}

