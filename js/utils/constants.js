/**
 * Constantes de l'application
 */

const ALL_AGENTS = [
    "Jett", "Phoenix", "Raze", "Reyna", "Omen", "Viper", "Killjoy", 
    "Sage", "Sova", "Cypher", "Astra", "Breach", "Brimstone", 
    "Chamber", "Clove", "Deadlock", "Fade", "Gekko", "Harbor", 
    "Iso", "Kayo", "Neon", "Skye", "Tejo", "Veto", "Vyse", "Waylay", "Yoru"
];

const ALL_MAPS = [
    "Abyss", "Ascent", "Bind", "Corrode", "Haven", "Lotus", 
    "Sunset", "Icebox", "Breeze", "Fracture", "Pearl", "Split"
];

// Maps officielles utilisées pour les agents par map et les matchs
// Cette constante ne sera jamais modifiée par la synchronisation API
const OFFICIAL_MAPS = [...ALL_MAPS];

const ROLES = ["Duelist", "Initiator", "Controller", "Sentinel"];

const RANKS = [
    "Iron", "Bronze", "Silver", "Gold", "Platinum", 
    "Diamond", "Ascendant", "Immortal", "Radiant"
];

// Rendre les constantes disponibles globalement pour compatibilité
window.ALL_AGENTS = ALL_AGENTS;
window.ALL_MAPS = ALL_MAPS;
window.OFFICIAL_MAPS = OFFICIAL_MAPS; // Maps officielles (non modifiables par API)
window.ROLES = ROLES;
window.RANKS = RANKS;

// Export pour Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ALL_AGENTS,
        ALL_MAPS,
        OFFICIAL_MAPS,
        ROLES,
        RANKS
    };
}

