const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// =========================================
// IMPORT DES MODULES
// =========================================
// Les classes Player, Round, Match, Team sont maintenant dans js/models/
// Les constantes ALL_AGENTS, ALL_MAPS sont dans js/utils/constants.js
// Le StorageService est dans js/services/StorageService.js

// =========================================
// VARIABLES GLOBALES
// =========================================

let team = new Team('Nouvelle Equipe');
let currentTeamPath = null;
let selectedPlayer = null;
let selectedMatch = null;
let selectedProgressionEntry = null;

// Filtres pour les statistiques
let mapFilterType = 'all';
let mapFilterValue = '';
let roundFilterType = 'all';
let roundFilterValue = '';
let lastTeamWinrate = null;

// Services
let storageService = null;
let notificationService = null;
let exportService = null;
let themeService = null;
let resourceLoader = null;
let validationService = null;
let searchService = null;
let backupService = null;
let reportService = null;
let keyboardService = null;
let tutorialService = null;
let matchReminderTimers = [];
let profilerInterval = null;
let loggerService = null;
let statsWorker = null;
let csvWorker = null;
let comparisonTeamB = null;
let metricsService = null;
let chartsCurrentView = 'winrate';
let riotApiService = null;
let riotApiInFlightController = null;
let riotApiCache = {}; // { key: { ts, data, rate } }
const RIOT_API_CACHE_TTL = 30000; // 30s
let riotLastRequest = null; // { method, url, headers }

// =========================================
// INITIALISATION
// =========================================

// Fonctions globales pour la modal supprimées - remplacées par showNoTeamMessage()

document.addEventListener('DOMContentLoaded', async () => {
    // Initialiser les services
    storageService = new StorageService();
    notificationService = new NotificationService();
    // ExportService lazy: instancié à la demande
    themeService = new ThemeService();
    resourceLoader = new ResourceLoader();
    validationService = new ValidationService();
    searchService = new SearchService();
    backupService = new BackupService();
    keyboardService = new KeyboardService();
    
    // Enregistrer les raccourcis clavier
    registerKeyboardShortcuts();
    
    setupBackgroundVideo();
    await initializeApp();
    setupEventListeners();
    
    // AFFICHER IMMÉDIATEMENT L'INTERFACE POUR ÉVITER LE BLOQUAGE
    // Afficher le message "pas d'équipe" par défaut pour que l'UI soit utilisable
    showNoTeamMessage();
    
    // Écouter le message du processus principal avec le chemin du fichier
    ipcRenderer.on('team-file-ready', async (event, filePath) => {
        console.log('Chemin du fichier d\'équipe reçu du processus principal:', filePath);
        try {
            if (filePath) {
                await loadTeamFromPath(filePath);
                showHomeInterface();
                updateAllTabs();
            } else {
                showNoTeamMessage();
            }
        } catch (error) {
            console.error('Erreur lors du chargement de l\'équipe:', error);
            showNoTeamMessage();
        }
    });
    
    // Fallback: vérifier et charger l'équipe si le message n'est pas reçu (pour compatibilité)
    setTimeout(async () => {
        // Si l'équipe n'a pas été chargée après 1 seconde, essayer de la charger depuis la config
        if (!team || !team.name) {
            try {
                await checkAndLoadTeam();
            } catch (error) {
                console.error('Erreur lors du chargement initial:', error);
                // S'assurer que l'interface reste accessible même en cas d'erreur
                showNoTeamMessage();
            }
        }
    }, 1000);

    // Rendu des onglets informatifs
    try {
        renderTutorialsTab();
        renderStrategyTab();
    } catch (e) {
        console.warn('Rendu tutoriels/stratégies non critiques:', e);
    }

    // Programmer les rappels de matchs
    try {
        scheduleMatchReminders();
    } catch (e) {
        console.warn('Planification des rappels de matchs non disponible:', e);
    }
    
    // Précharger les ressources de manière asynchrone (ne bloque pas l'interface)
    resourceLoader.preloadAllResources().catch(err => {
        console.warn('Erreur lors du préchargement des ressources:', err);
    });
    
    // Appliquer le thème actif s'il est sauvegardé
    try {
        const rawActive = localStorage.getItem('activeTheme');
        if (rawActive) {
            const cfg = JSON.parse(rawActive);
            applyThemeConfig(cfg);
        }
    } catch {}

    // Charger RiotAPIService
    try {
        if (!window.RiotAPIService) {
            const s = document.createElement('script');
            s.src = 'js/services/RiotAPIService.js';
            await new Promise((res, rej) => { s.onload = res; s.onerror = rej; document.head.appendChild(s); });
        }
        riotApiService = new RiotAPIService();
        const savedKey = localStorage.getItem('riotApiKey') || '';
        if (savedKey) riotApiService.setKey(savedKey);
    } catch (e) {
        console.warn('RiotAPIService non chargé:', e);
    }
    
    // Activer la sauvegarde automatique (toutes les 30 secondes)
    storageService.enableAutoSave(async () => {
        try {
            // Ne sauvegarder automatiquement que si un chemin de fichier est défini
            // Sinon, on ne sauvegarde pas pour éviter les erreurs ENOTDIR
            if (!currentTeamPath || currentTeamPath.trim() === '') {
                // Sauvegarder le thème dans le profil actuel si un profil est sélectionné
                const sel = document.getElementById('profilesSelect');
                if (sel && sel.value && themeService) {
                    try {
                        const profiles = readProfiles();
                        const currentProfileName = sel.value;
                        if (profiles[currentProfileName]) {
                            const currentTheme = themeService.getCurrentTheme();
                            profiles[currentProfileName].theme = {
                                id: currentTheme.id,
                                accent: currentTheme.accent,
                                accentHover: currentTheme.accentHover,
                                bgPrimary: currentTheme.bgPrimary,
                                bgSecondary: currentTheme.bgSecondary,
                                bgTertiary: currentTheme.bgTertiary,
                                textPrimary: currentTheme.textPrimary,
                                textSecondary: currentTheme.textSecondary,
                                textTertiary: currentTheme.textTertiary
                            };
                            writeProfiles(profiles);
                        }
                    } catch (e) {
                        console.warn('Erreur lors de la sauvegarde automatique du thème:', e);
                    }
                }
                return; // Ne pas essayer de sauvegarder le fichier si pas de chemin
            }
            
            const result = await storageService.saveTeam(team.toJSON(), currentTeamPath);
            if (result && result.success) {
                notificationService.notifyAutoSave(true);
            } else {
                notificationService.notifyAutoSave(false);
            }
        } catch (error) {
            console.error('Erreur sauvegarde automatique:', error);
            // Ne pas afficher d'erreur si c'est ENOTDIR et qu'il n'y a pas de chemin
            if (error.code !== 'ENOTDIR' || (currentTeamPath && currentTeamPath.trim() !== '')) {
                notificationService.notifyAutoSave(false);
            }
        }
    }, 30000); // 30 secondes

    // Sauvegardes automatiques versionnées (toutes les 5 min)
    if (backupService && typeof backupService.enableAutoBackup === 'function') {
        backupService.enableAutoBackup(async () => {
            try {
                const backup = await backupService.createBackup(team.toJSON(), team.name || 'team');
                if (!backup) {
                    console.warn('Backup auto non créé (retour null)');
                }
            } catch (e) {
                // Ne pas afficher de notification pour les erreurs de backup automatique
                // car cela peut être dû au chiffrement qui échoue silencieusement
                console.warn('Backup auto non créé:', e);
            }
        }, 5 * 60 * 1000);
    }

    // Logger: chargement et hooks globaux
    try {
        if (!window.LoggerService) {
            const s = document.createElement('script');
            s.src = 'js/services/LoggerService.js';
            await new Promise((res, rej) => { s.onload = res; s.onerror = rej; document.head.appendChild(s); });
        }
        loggerService = new LoggerService();
        loggerService.logEvent('app_start', { version: window.APP_VERSION || 'dev' });
        window.addEventListener('error', (e) => {
            try { loggerService?.logError(e.error || new Error(e.message), { source: 'window.onerror', filename: e.filename, lineno: e.lineno, colno: e.colno }); } catch {}
        });
        window.addEventListener('unhandledrejection', (e) => {
            try { loggerService?.logError(e.reason || new Error('unhandledrejection'), { source: 'unhandledrejection' }); } catch {}
        });
    } catch (e) {
        console.warn('Logger non initialisé:', e);
    }

    // Metrics
    try {
        if (!window.MetricsService) {
            const s = document.createElement('script');
            s.src = 'js/services/MetricsService.js';
            await new Promise((res, rej) => { s.onload = res; s.onerror = rej; document.head.appendChild(s); });
        }
        metricsService = new MetricsService();
        metricsService.incr('app_start');
    } catch (e) {
        console.warn('Metrics non initialisé:', e);
    }
});

async function initializeApp() {
    // Remplir les selects
    const agentSelect = document.getElementById('playerAgentSelect');
    const matchMapSelect = document.getElementById('matchMapSelect');
    const playerFilterAgent = document.getElementById('playerFilterAgent');
    const matchFilterMap = document.getElementById('matchFilterMap');
    
    ALL_AGENTS.forEach(agent => {
        const option = document.createElement('option');
        option.value = agent;
        option.textContent = agent;
        if (agentSelect) agentSelect.appendChild(option.cloneNode(true));
        if (playerFilterAgent) playerFilterAgent.appendChild(option.cloneNode(true));
    });
    
    ALL_MAPS.forEach(map => {
        const option = document.createElement('option');
        option.value = map;
        option.textContent = map;
        if (matchMapSelect) matchMapSelect.appendChild(option.cloneNode(true));
        if (matchFilterMap) matchFilterMap.appendChild(option.cloneNode(true));
    });
}

// =========================================
// NOTIFICATIONS: RAPPELS DE MATCHS
// =========================================

function clearMatchReminders() {
    if (!Array.isArray(matchReminderTimers)) matchReminderTimers = [];
    matchReminderTimers.forEach(t => clearTimeout(t));
    matchReminderTimers = [];
}

function scheduleMatchReminders() {
    if (!notificationService || !team || !Array.isArray(team.matches)) return;
    clearMatchReminders();

    const now = Date.now();
    // Délais de rappel avant le match (en ms)
    const OFFSETS = [
        24 * 60 * 60 * 1000,   // 24h avant
        60 * 60 * 1000,        // 1h avant
        15 * 60 * 1000         // 15 min avant
    ];

    team.matches.forEach(match => {
        if (!match || !match.date) return;
        // Supporte formats JJ-MM-AAAA ou ISO
        let matchTime = NaN;
        if (/^\d{2}-\d{2}-\d{4}$/.test(match.date)) {
            const [dd, mm, yyyy] = match.date.split('-').map(x => parseInt(x, 10));
            matchTime = new Date(yyyy, mm - 1, dd, 20, 0, 0).getTime(); // défaut: 20:00 si heure absente
        } else {
            const parsed = new Date(match.date);
            matchTime = parsed.getTime();
        }
        if (isNaN(matchTime)) return;

        OFFSETS.forEach(offset => {
            const triggerAt = matchTime - offset;
            const delay = triggerAt - now;
            if (delay > 0) {
                const timer = setTimeout(() => {
                    try {
                        notificationService.show(
                            `⏰ Rappel match ${offset === OFFSETS[0] ? 'J-1' : offset === OFFSETS[1] ? 'dans 1h' : 'dans 15 min'} • ${match.opponent || 'Adversaire ?'} sur ${match.map || 'Map ?'}`,
                            'progress',
                            6000
                        );
                    } catch {}
                }, delay);
                matchReminderTimers.push(timer);
            }
        });
    });
}

function setupEventListeners() {
    // S'assurer que tous les éléments de la toolbar sont accessibles
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) {
        toolbar.style.pointerEvents = 'auto';
    }
    
    // S'assurer que tous les boutons de la toolbar sont cliquables
    document.querySelectorAll('.toolbar-btn-icon').forEach(btn => {
        btn.style.pointerEvents = 'auto';
        btn.style.cursor = 'pointer';
    });
    
    // Navigation par onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.style.pointerEvents = 'auto';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Boutons de la barre d'outils
    
    // Boutons joueurs (avec protection contre les erreurs)
    try {
        const addPlayerBtn = document.getElementById('addPlayerBtn');
        if (addPlayerBtn) addPlayerBtn.addEventListener('click', addPlayerFromFields);
        
        const editPlayerBtn = document.getElementById('editPlayerBtn');
        if (editPlayerBtn) editPlayerBtn.addEventListener('click', editPlayer);
        
        const deletePlayerBtn = document.getElementById('deletePlayerBtn');
        if (deletePlayerBtn) deletePlayerBtn.addEventListener('click', deletePlayer);
        
        const editAgentsBtn = document.getElementById('editAgentsBtn');
        if (editAgentsBtn) editAgentsBtn.addEventListener('click', editAgents);
        
        // Boutons matchs
        const addMatchBtn = document.getElementById('addMatchBtn');
        if (addMatchBtn) addMatchBtn.addEventListener('click', addMatchFromFields);
        
        const deleteMatchBtn = document.getElementById('deleteMatchBtn');
        if (deleteMatchBtn) deleteMatchBtn.addEventListener('click', deleteSelectedMatch);
        
        // Boutons progression
        const addProgressionBtn = document.getElementById('addProgressionBtn');
        if (addProgressionBtn) addProgressionBtn.addEventListener('click', addProgressionEntry);
        
        const deleteProgressionBtn = document.getElementById('deleteProgressionBtn');
        if (deleteProgressionBtn) deleteProgressionBtn.addEventListener('click', deleteProgressionEntry);
    } catch (error) {
        console.error('Erreur lors de l\'attachement des event listeners:', error);
    }
    
    // Boutons statistiques (avec protection)
    try {
        document.querySelectorAll('.stats-tab-btn').forEach(btn => {
            btn.style.pointerEvents = 'auto';
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.statsTab;
                switchStatsTab(tabName);
            });
        });
        
        const winrateChartBtn = document.getElementById('winrateChartBtn');
        if (winrateChartBtn) winrateChartBtn.addEventListener('click', showWinrateChart);
        
        const mapPerformanceChartBtn = document.getElementById('mapPerformanceChartBtn');
        if (mapPerformanceChartBtn) mapPerformanceChartBtn.addEventListener('click', showMapPerformanceChart);
        
        const roundsChartBtn = document.getElementById('roundsChartBtn');
        if (roundsChartBtn) roundsChartBtn.addEventListener('click', showRoundsChart);
        
        const timelineChartBtn = document.getElementById('timelineChartBtn');
        if (timelineChartBtn) timelineChartBtn.addEventListener('click', showTimelineChart);
        
        const agentsChartBtn = document.getElementById('agentsChartBtn');
        if (agentsChartBtn) agentsChartBtn.addEventListener('click', showAgentsChart);
    } catch (error) {
        console.error('Erreur lors de l\'attachement des event listeners statistiques:', error);
    }
    const downloadChartPngBtn = document.getElementById('downloadChartPngBtn');
    if (downloadChartPngBtn) downloadChartPngBtn.onclick = () => { downloadCurrentChartPNG(); try { metricsService?.incr('export_chart_png'); } catch {} };
    const bestMapChartBtn = document.getElementById('bestMapChartBtn');
    if (bestMapChartBtn) bestMapChartBtn.onclick = () => { chartsCurrentView = 'bestMap'; showBestMapChart(); };
    const topOpponentsChartBtn = document.getElementById('topOpponentsChartBtn');
    if (topOpponentsChartBtn) topOpponentsChartBtn.onclick = () => { chartsCurrentView = 'topOpponents'; showTopOpponentsChart(); };
    const chartsInsightsPeriod = document.getElementById('chartsInsightsPeriod');
    if (chartsInsightsPeriod && !chartsInsightsPeriod._wired) {
        chartsInsightsPeriod._wired = true;
        chartsInsightsPeriod.onchange = () => {
            // Re-afficher le dernier graphe demandé
            if (chartsCurrentView === 'bestMap') return showBestMapChart();
            if (chartsCurrentView === 'topOpponents') return showTopOpponentsChart();
            // Fallback: timeline ou winrate
            try { showTimelineChart(); } catch { try { showWinrateChart(); } catch {} }
        };
    }
    
    // Onglets graphiques comparatifs
    const chartsSubTabBtns = document.querySelectorAll('.charts-sub-tab-btn');
    if (chartsSubTabBtns.length > 0) {
        chartsSubTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const subTab = btn.dataset.chartsSubTab;
                switchChartsSubTab(subTab);
            });
        });
    }
    
    // Initialisation des graphiques comparatifs
    initComparativeCharts();
    
    // Filtres statistiques
    document.getElementById('mapFilterType').addEventListener('change', onMapFilterTypeChange);
    document.getElementById('applyMapFilterBtn').addEventListener('click', applyMapFilter);
    document.getElementById('resetMapFilterBtn').addEventListener('click', resetMapFilter);
    
    document.getElementById('roundFilterType').addEventListener('change', onRoundFilterTypeChange);
    document.getElementById('applyRoundFilterBtn').addEventListener('click', applyRoundFilter);
    document.getElementById('resetRoundFilterBtn').addEventListener('click', resetRoundFilter);

    // Exports ciblés et rapport thémé
    const exportMapStatsCsvBtn = document.getElementById('exportMapStatsCsvBtn');
    if (exportMapStatsCsvBtn) exportMapStatsCsvBtn.onclick = () => exportMapStatsCSV();
    const exportPlayerStatsCsvBtn = document.getElementById('exportPlayerStatsCsvBtn');
    if (exportPlayerStatsCsvBtn) exportPlayerStatsCsvBtn.onclick = () => exportPlayerStatsCSV();
    const exportPeriodStatsCsvBtn = document.getElementById('exportPeriodStatsCsvBtn');
    if (exportPeriodStatsCsvBtn) exportPeriodStatsCsvBtn.onclick = () => exportPeriodStatsCSV();
    const exportThemedHtmlBtn = document.getElementById('exportThemedHtmlBtn');
    if (exportThemedHtmlBtn) exportThemedHtmlBtn.onclick = () => exportThemedHTMLReport();
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) exportPdfBtn.onclick = () => { exportPDFReport(); try { metricsService?.incr('export_pdf'); } catch {} };
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    if (exportExcelBtn) exportExcelBtn.onclick = () => { exportExcelReport(); try { metricsService?.incr('export_excel'); } catch {} };
    const exportXmlBtn = document.getElementById('exportXmlBtn');
    if (exportXmlBtn) exportXmlBtn.onclick = () => { exportXMLReport(); try { metricsService?.incr('export_xml'); } catch {} };

    // Import CSV
    const importCsvBtn = document.getElementById('importCsvBtn');
    if (importCsvBtn) importCsvBtn.onclick = () => { openImportCsvModal(); try { metricsService?.incr('import_csv_open'); } catch {} };
    const closeImportCsvModal = document.getElementById('closeImportCsvModal');
    if (closeImportCsvModal) closeImportCsvModal.onclick = () => toggleImportCsvModal(false);
    const cancelCsvImportBtn = document.getElementById('cancelCsvImportBtn');
    if (cancelCsvImportBtn) cancelCsvImportBtn.onclick = () => toggleImportCsvModal(false);
    const csvFileInput = document.getElementById('csvFileInput');
    if (csvFileInput) csvFileInput.onchange = onCsvFileSelected;
    const confirmCsvImportBtn = document.getElementById('confirmCsvImportBtn');
    if (confirmCsvImportBtn) confirmCsvImportBtn.onclick = confirmCsvImport;

    // Comparaison
    const comparisonTeamAName = document.getElementById('comparisonTeamAName');
    if (comparisonTeamAName) comparisonTeamAName.value = team?.name || '';
    const comparisonTeamBFile = document.getElementById('comparisonTeamBFile');
    if (comparisonTeamBFile) comparisonTeamBFile.onchange = onComparisonTeamBSelected;
    const openComparisonFilePickerBtn = document.getElementById('openComparisonFilePickerBtn');
    if (openComparisonFilePickerBtn) openComparisonFilePickerBtn.onclick = () => comparisonTeamBFile && comparisonTeamBFile.click();
    const clearComparisonBtn = document.getElementById('clearComparisonBtn');
    if (clearComparisonBtn) clearComparisonBtn.onclick = () => { comparisonTeamB = null; updateComparisonTab(); };
    const exportComparisonHtmlBtn = document.getElementById('exportComparisonHtmlBtn');
    if (exportComparisonHtmlBtn) exportComparisonHtmlBtn.onclick = () => exportComparisonHTML();
    const exportComparisonPdfBtn = document.getElementById('exportComparisonPdfBtn');
    if (exportComparisonPdfBtn) exportComparisonPdfBtn.onclick = () => exportComparisonPDF();
    const exportComparisonCsvBtn = document.getElementById('exportComparisonCsvBtn');
    if (exportComparisonCsvBtn) exportComparisonCsvBtn.onclick = () => exportComparisonCSV();
    const exportComparisonExcelBtn = document.getElementById('exportComparisonExcelBtn');
    if (exportComparisonExcelBtn) exportComparisonExcelBtn.onclick = () => { exportComparisonExcel(); try { metricsService?.incr('export_comparison_excel'); } catch {} };
    const downloadComparisonChartPngBtn = document.getElementById('downloadComparisonChartPngBtn');
    if (downloadComparisonChartPngBtn) downloadComparisonChartPngBtn.onclick = () => { downloadComparisonChartPNG(); try { metricsService?.incr('export_chart_png'); } catch {} };

    // Options PDF: sections uniquement (logo retiré)

    // Peupler les sélecteurs d'export
    const exportPlayerSelect = document.getElementById('exportPlayerSelect');
    if (exportPlayerSelect) {
        exportPlayerSelect.innerHTML = '<option value="all">Tous joueurs</option>';
        (team.players || []).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            exportPlayerSelect.appendChild(opt);
        });
    }
    const exportMapSelect = document.getElementById('exportMapSelect');
    if (exportMapSelect) {
        exportMapSelect.innerHTML = '<option value="all">Toutes maps</option>';
        (window.OFFICIAL_MAPS || window.ALL_MAPS || []).forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            exportMapSelect.appendChild(opt);
        });
    }
    
    // Fermeture des modales
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('show');
        });
    });
    
    // Fermer les modales en cliquant à l'extérieur
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });
    
    // Raccourcis clavier (gérés par KeyboardService)
    document.addEventListener('keydown', (e) => {
        if (keyboardService) {
            keyboardService.checkShortcut(e);
        }
    });
    
    // Écouter les messages du menu
    ipcRenderer.on('menu-save', () => saveTeam());
    ipcRenderer.on('menu-import', (event, filePath) => {
        if (filePath) {
            loadTeamFromPath(filePath);
        }
    });
    ipcRenderer.on('menu-export', (event, filePath) => {
        if (filePath) {
            exportTeamToPath(filePath);
        }
    });
    ipcRenderer.on('menu-export-csv', () => exportToCSV());
    ipcRenderer.on('menu-export-xml', () => exportToXML());
    ipcRenderer.on('menu-export-stats-csv', () => exportStatsToCSV());
    ipcRenderer.on('menu-export-html-report', () => exportHTMLReport());
    ipcRenderer.on('menu-import-csv', () => importFromCSV());
    
    // Bouton de sauvegardes
    const backupBtn = document.getElementById('backupBtn');
    if (backupBtn) {
        backupBtn.addEventListener('click', showBackupModal);
    }
    
    // Bouton de rapport
    const reportBtn = document.getElementById('reportBtn');
    if (reportBtn) {
        reportBtn.addEventListener('click', () => {
            exportHTMLReport();
            try { metricsService?.incr('export_html'); } catch {}
        });
    }

    // OCR Scoreboard
    const ocrBtn = document.getElementById('ocrBtn');
    if (ocrBtn) {
        ocrBtn.addEventListener('click', () => {
            const modal = document.getElementById('ocrModal');
            if (modal) modal.classList.add('show');
            try { metricsService?.incr('ocr_open'); } catch {}
            wireOcrModal();
        });
    }

    // Préférences Notifications
    const notificationSettingsBtn = document.getElementById('notificationSettingsBtn');
    if (notificationSettingsBtn) {
        notificationSettingsBtn.addEventListener('click', () => openNotificationSettingsModal());
    }
    const closeNotificationSettingsModal = document.getElementById('closeNotificationSettingsModal');
    if (closeNotificationSettingsModal) closeNotificationSettingsModal.addEventListener('click', () => toggleNotificationSettingsModal(false));
    const cancelNotificationSettingsBtn = document.getElementById('cancelNotificationSettingsBtn');
    if (cancelNotificationSettingsBtn) cancelNotificationSettingsBtn.addEventListener('click', () => toggleNotificationSettingsModal(false));
    const saveNotificationSettingsBtn = document.getElementById('saveNotificationSettingsBtn');
    if (saveNotificationSettingsBtn) saveNotificationSettingsBtn.addEventListener('click', () => saveNotificationSettings());

    // Logs
    const logsBtn = document.getElementById('logsBtn');
    if (logsBtn) logsBtn.addEventListener('click', () => openLogsModal());
    const closeLogsModal = document.getElementById('closeLogsModal');
    if (closeLogsModal) closeLogsModal.addEventListener('click', () => toggleLogsModal(false));
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    if (clearLogsBtn) clearLogsBtn.addEventListener('click', () => { try { loggerService?.clear(); renderLogsTable(); } catch {} });
    const exportLogsBtn = document.getElementById('exportLogsBtn');
    if (exportLogsBtn) exportLogsBtn.addEventListener('click', () => { try { loggerService?.exportJSON(); } catch {} });

    // Journal d'alertes
    const alertsHistoryBtn = document.getElementById('alertsHistoryBtn');
    if (alertsHistoryBtn) alertsHistoryBtn.addEventListener('click', () => openAlertsModal());
    const closeAlertsModal = document.getElementById('closeAlertsModal');
    if (closeAlertsModal) closeAlertsModal.addEventListener('click', () => toggleAlertsModal(false));
    const clearAlertsBtn = document.getElementById('clearAlertsBtn');
    if (clearAlertsBtn) clearAlertsBtn.addEventListener('click', () => { try { notificationService?.clearAlerts(); renderAlertsTable(); } catch {} });
    const exportAlertsBtn = document.getElementById('exportAlertsBtn');
    if (exportAlertsBtn) exportAlertsBtn.addEventListener('click', () => { try { notificationService?.exportAlertsJSON(); } catch {} });

    // Métriques d’usage
    const metricsBtn = document.getElementById('metricsBtn');
    if (metricsBtn) metricsBtn.addEventListener('click', () => openMetricsModal());
    const closeMetricsModal = document.getElementById('closeMetricsModal');
    if (closeMetricsModal) closeMetricsModal.addEventListener('click', () => toggleMetricsModal(false));
    const resetMetricsBtn = document.getElementById('resetMetricsBtn');
    if (resetMetricsBtn) resetMetricsBtn.addEventListener('click', () => { try { metricsService?.reset(); renderMetricsTables(); } catch {} });
    const exportMetricsBtn = document.getElementById('exportMetricsBtn');
    if (exportMetricsBtn) exportMetricsBtn.addEventListener('click', () => { try { metricsService?.exportJSON(); } catch {} });

    // Profils
    const profilesBtn = document.getElementById('profilesBtn');
    if (profilesBtn) profilesBtn.addEventListener('click', () => openProfilesModal());
    
    // Bouton overlay
    const overlayBtn = document.getElementById('overlayBtn');
    if (overlayBtn) {
        overlayBtn.addEventListener('click', async () => {
            try {
                const result = await ipcRenderer.invoke('toggle-overlay');
                if (result.isOpen) {
                    showNotification('Mode Overlay activé', 'success');
                    overlayBtn.style.background = 'rgba(255, 70, 85, 0.3)';
                } else {
                    showNotification('Mode Overlay désactivé', 'info');
                    overlayBtn.style.background = '';
                }
            } catch (err) {
                console.error('Erreur lors du toggle overlay:', err);
                showNotification(`Erreur lors de l'activation de l'overlay: ${err.message || err}`, 'error');
            }
        });
        
        // Écouter les erreurs de l'overlay
        ipcRenderer.on('overlay-error', (event, payload) => {
            console.error('Erreur overlay reçue:', payload);
            showNotification(`Erreur overlay: ${payload.message || 'Erreur inconnue'}`, 'error');
        });
        
        // Raccourci clavier Ctrl+Shift+O
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'O') {
                e.preventDefault();
                overlayBtn.click();
            }
        });
    }
    
    // Écouter les actions de l'overlay
    ipcRenderer.on('overlay-action-received', (event, payload) => {
        switch (payload.action) {
            case 'add-match':
                // Ouvrir l'onglet matchs et déclencher l'ajout
                switchTab('matchesTab');
                setTimeout(() => {
                    const addMatchBtn = document.querySelector('#matchesTab .btn-primary');
                    if (addMatchBtn) addMatchBtn.click();
                }, 100);
                break;
            case 'view-stats':
                switchTab('statisticsTab');
                break;
            case 'view-players':
                switchTab('playersTab');
                break;
            case 'save-notes':
                // Sauvegarder les notes dans localStorage
                if (payload.data) {
                    localStorage.setItem('overlay-quick-notes', payload.data);
                    showNotification('Notes sauvegardées', 'success');
                }
                break;
            case 'create-match':
                // Créer un nouveau match depuis l'overlay
                if (payload.match) {
                    createMatchFromOverlay(payload.match);
                }
                break;
            case 'save-match':
                // Sauvegarder un match modifié depuis l'overlay
                if (payload.match) {
                    saveMatchFromOverlay(payload.match);
                }
                break;
        }
    });
    
    function createMatchFromOverlay(matchData) {
        if (!team) {
            showNotification('Aucune équipe chargée', 'error');
            return;
        }
        
        // Convertir les rounds en instances de Round
        const rounds = (matchData.rounds || []).map(r => {
            if (r instanceof Round) {
                return r;
            }
            return new Round(
                r.round_number || r.roundNumber || 0,
                r.winner || '',
                r.side || '',
                r.type || '',
                r.note || ''
            );
        });
        
        // Vérifier si un match avec les mêmes infos existe déjà
        const existingMatch = team.matches.find(m => 
            m.date === matchData.date && 
            m.map === matchData.map && 
            m.opponent === matchData.opponent
        );
        
        if (existingMatch) {
            // Mettre à jour le match existant
            existingMatch.rounds = rounds;
            showNotification('Match mis à jour', 'success');
        } else {
            // Créer un nouveau match
            const newMatch = new Match(
                matchData.date,
                matchData.map,
                matchData.opponent,
                matchData.score || '',
                matchData.result || '',
                rounds
            );
            team.matches.push(newMatch);
            showNotification('Match créé avec succès', 'success');
        }
        
        // Recalculer le score et le résultat
        if (rounds.length > 0) {
            const ourWins = rounds.filter(r => r.winner === 'Nous').length;
            const oppWins = rounds.filter(r => r.winner === 'Adversaire').length;
            
            if (ourWins > 0 || oppWins > 0) {
                const match = existingMatch || newMatch;
                match.score = `${ourWins}-${oppWins}`;
                match.result = ourWins > oppWins ? 'Victoire' : (ourWins < oppWins ? 'Défaite' : 'Nul');
            }
        }
        
        updateMatchesTab();
        updateHomeTab();
        saveTeam();
    }
    
    function saveMatchFromOverlay(matchData) {
        if (!team) {
            showNotification('Aucune équipe chargée', 'error');
            return;
        }
        
        // Convertir les rounds en instances de Round
        const rounds = (matchData.rounds || []).map(r => {
            if (r instanceof Round) {
                return r;
            }
            return new Round(
                r.round_number || r.roundNumber || 0,
                r.winner || '',
                r.side || '',
                r.type || '',
                r.note || ''
            );
        });
        
        // Trouver le match à mettre à jour
        const match = team.matches.find(m => 
            m.date === matchData.date && 
            m.map === matchData.map && 
            m.opponent === matchData.opponent
        );
        
        if (match) {
            match.rounds = rounds;
            
            // Recalculer le score et le résultat
            const ourWins = rounds.filter(r => r.winner === 'Nous').length;
            const oppWins = rounds.filter(r => r.winner === 'Adversaire').length;
            
            if (ourWins > 0 || oppWins > 0) {
                match.score = `${ourWins}-${oppWins}`;
                match.result = ourWins > oppWins ? 'Victoire' : (ourWins < oppWins ? 'Défaite' : 'Nul');
            }
            
            updateMatchesTab();
            updateHomeTab();
            saveTeam();
            showNotification('Rounds sauvegardés avec succès', 'success');
        } else {
            showNotification('Match introuvable', 'error');
        }
    }
    const closeProfilesModalBtn = document.getElementById('closeProfilesModal');
    if (closeProfilesModalBtn) closeProfilesModalBtn.addEventListener('click', () => toggleProfilesModal(false));
    const closeProfilesBtn = document.getElementById('closeProfilesBtn');
    if (closeProfilesBtn) closeProfilesBtn.addEventListener('click', () => toggleProfilesModal(false));
    const applyProfileBtn = document.getElementById('applyProfileBtn');
    if (applyProfileBtn) applyProfileBtn.addEventListener('click', applySelectedProfile);
    const deleteProfileBtn = document.getElementById('deleteProfileBtn');
    if (deleteProfileBtn) deleteProfileBtn.addEventListener('click', deleteSelectedProfile);
    const saveCurrentAsProfileBtn = document.getElementById('saveCurrentAsProfileBtn');
    if (saveCurrentAsProfileBtn) saveCurrentAsProfileBtn.addEventListener('click', saveCurrentAsProfile);
    const exportProfileBtn = document.getElementById('exportProfileBtn');
    if (exportProfileBtn) exportProfileBtn.addEventListener('click', exportSelectedProfile);
    const importProfileBtn = document.getElementById('importProfileBtn');
    const importProfileFile = document.getElementById('importProfileFile');
    if (importProfileBtn && importProfileFile) {
        importProfileBtn.addEventListener('click', () => importProfileFile.click());
        importProfileFile.addEventListener('change', importProfileFromFile);
    }

    // Profiling overlay
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.onclick = () => {
            if (document.getElementById('profilerOverlay')) {
                stopProfiler();
            } else {
                startProfiler();
            }
        };
    }

    // (mode présentation supprimé)

    // Bouton sécurité (chiffrement)
    const securityBtn = document.getElementById('securityBtn');
    if (securityBtn) {
        securityBtn.addEventListener('click', () => {
            const modal = document.getElementById('securityModal');
            const passInput = document.getElementById('securityPassphrase');
            const strength = document.getElementById('securityStrength');
            const toggleBtn = document.getElementById('togglePassVisibility');
            
            if (passInput) {
                // S'assurer que le champ est activé et focusable
                passInput.disabled = false;
                passInput.readOnly = false;
                passInput.style.pointerEvents = 'auto';
                passInput.style.opacity = '1';
                
                try { 
                    passInput.value = localStorage.getItem('encryptionPassphrase') || ''; 
                } catch {}
                
                // Focus sur le champ après un court délai pour s'assurer que le modal est visible
                setTimeout(() => {
                    passInput.focus();
                }, 100);
            }
            
            if (toggleBtn && passInput) {
                toggleBtn.onclick = () => { 
                    passInput.type = passInput.type === 'password' ? 'text' : 'password';
                    passInput.focus();
                };
            }
            
            if (strength && passInput) {
                const updateStrength = () => {
                    const v = passInput.value || '';
                    const score = (v.length > 12) + (/[A-Z]/.test(v)) + (/[0-9]/.test(v)) + (/[\W_]/.test(v));
                    const labels = ['faible', 'moyenne', 'bonne', 'excellente'];
                    strength.textContent = `Robustesse: ${labels[Math.max(0, score-1)]}`;
                };
                passInput.oninput = updateStrength;
                passInput.onkeyup = updateStrength;
                updateStrength();
            }
            
            if (modal) modal.classList.add('show');
        });
    }

    const securityModalClose = document.getElementById('securityModalClose');
    if (securityModalClose) {
        securityModalClose.onclick = () => {
            const modal = document.getElementById('securityModal');
            if (modal) modal.classList.remove('show');
        };
    }

    const saveSecurityBtn = document.getElementById('saveSecurityBtn');
    if (saveSecurityBtn) {
        saveSecurityBtn.onclick = async () => {
            const passInput = document.getElementById('securityPassphrase');
            const val = (passInput?.value || '').trim();
            try {
                if (val) {
                    // Tester le chiffrement avant de sauvegarder
                    try {
                        if (window.EncryptionService) {
                            const encService = new EncryptionService();
                            // Simuler un chiffrement pour vérifier que ça fonctionne
                            // Passer la phrase secrète directement car elle n'est pas encore dans localStorage
                            const testData = { test: 'data' };
                            await encService.encryptJson(testData, val);
                            
                            // Si le test réussit, sauvegarder la phrase secrète
                            localStorage.setItem('encryptionPassphrase', val);
                            showNotification('Phrase secrète enregistrée. Les prochains backups seront chiffrés.', 'success');
                        } else {
                            // Si EncryptionService n'est pas disponible, sauvegarder quand même
                            localStorage.setItem('encryptionPassphrase', val);
                            showNotification('Phrase secrète enregistrée (service de chiffrement non disponible).', 'warning');
                        }
                    } catch (encryptError) {
                        console.error('Erreur lors du test de chiffrement:', encryptError);
                        // Afficher plus de détails sur l'erreur pour le débogage
                        const errorMsg = encryptError.message || String(encryptError);
                        console.error('Détails de l\'erreur:', errorMsg);
                        showNotification(`Erreur: impossible d'utiliser cette phrase secrète pour le chiffrement. ${errorMsg}`, 'error');
                        return;
                    }
                } else {
                    localStorage.removeItem('encryptionPassphrase');
                    showNotification('Phrase secrète vide — chiffrement désactivé.', 'warning');
                }
            } catch (e) {
                console.error('Erreur lors de l\'enregistrement de la phrase secrète:', e);
                showNotification('Erreur lors de l\'enregistrement de la phrase secrète', 'error');
            }
            const modal = document.getElementById('securityModal');
            if (modal) modal.classList.remove('show');
        };
    }

    const clearPassphraseBtn = document.getElementById('clearPassphraseBtn');
    if (clearPassphraseBtn) {
        clearPassphraseBtn.onclick = () => {
            try { localStorage.removeItem('encryptionPassphrase'); } catch {}
            showNotification('Phrase secrète supprimée — chiffrement désactivé.', 'warning');
            const modal = document.getElementById('securityModal');
            if (modal) modal.classList.remove('show');
        };
    }
    
    // Bouton de raccourcis clavier
    const shortcutsBtn = document.getElementById('shortcutsBtn');
    if (shortcutsBtn) {
        shortcutsBtn.addEventListener('click', showShortcutsModal);
    }
    
    // Bouton de thème
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', showThemeModal);
    }
    
    // Bouton de gestion de chemin de fichier (toujours accessible, même sans équipe)
    const filePathBtn = document.getElementById('filePathBtn');
    if (filePathBtn) {
        filePathBtn.style.pointerEvents = 'auto';
        filePathBtn.style.cursor = 'pointer';
        filePathBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                showFilePathModal();
            } catch (error) {
                console.error('Erreur lors de l\'ouverture de la modal de gestion de fichier:', error);
                alert('Erreur lors de l\'ouverture de la modal de gestion de fichier. Veuillez réessayer.');
            }
        });
    }

    // Thèmes — sauvegarde/appliquer/import/export
    const savedThemesSelect = document.getElementById('savedThemesSelect');
    const applySavedThemeBtn = document.getElementById('applySavedThemeBtn');
    const deleteSavedThemeBtn = document.getElementById('deleteSavedThemeBtn');
    const saveThemeBtn = document.getElementById('saveThemeBtn');
    const exportThemeBtn = document.getElementById('exportThemeBtn');
    const importThemeBtn = document.getElementById('importThemeBtn');
    const importThemeFile = document.getElementById('importThemeFile');

    const readSavedThemes = () => {
        try { return JSON.parse(localStorage.getItem('savedThemes') || '{}'); } catch { return {}; }
    };
    const writeSavedThemes = (obj) => {
        try { localStorage.setItem('savedThemes', JSON.stringify(obj)); } catch {}
    };
    const populateSavedThemes = () => {
        if (!savedThemesSelect) return;
        const saved = readSavedThemes();
        savedThemesSelect.innerHTML = '';
        Object.keys(saved).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name; opt.textContent = name;
            savedThemesSelect.appendChild(opt);
        });
    };
    populateSavedThemes();

    if (applySavedThemeBtn) applySavedThemeBtn.onclick = () => {
        const saved = readSavedThemes();
        const name = savedThemesSelect?.value;
        if (!name || !saved[name]) return;
        applyThemeConfig(saved[name]);
        showNotification(`Thème "${name}" appliqué`, 'success');
    };
    if (deleteSavedThemeBtn) deleteSavedThemeBtn.onclick = () => {
        const saved = readSavedThemes();
        const name = savedThemesSelect?.value;
        if (!name || !saved[name]) return;
        delete saved[name]; writeSavedThemes(saved); populateSavedThemes();
        showNotification(`Thème "${name}" supprimé`, 'warning');
    };
    if (saveThemeBtn) saveThemeBtn.onclick = () => {
        const name = (document.getElementById('saveThemeNameInput')?.value || '').trim();
        if (!name) { showNotification('Nom de thème requis', 'error'); return; }
        const cfg = getCurrentThemeConfig();
        const saved = readSavedThemes(); saved[name] = cfg; writeSavedThemes(saved); populateSavedThemes();
        showNotification(`Thème "${name}" sauvegardé`, 'success');
    };
    if (exportThemeBtn) exportThemeBtn.onclick = () => {
        const cfg = getCurrentThemeConfig();
        const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json;charset=utf-8;' });
        const a = document.createElement('a'); const n = `theme_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
        a.href = URL.createObjectURL(blob); a.download = n; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
    };
    if (importThemeBtn && importThemeFile) {
        importThemeBtn.onclick = () => importThemeFile.click();
        importThemeFile.onchange = () => {
            const file = importThemeFile.files?.[0]; if (!file) return;
            const r = new FileReader();
            r.onload = () => {
                try {
                    const cfg = JSON.parse(String(r.result || '{}'));
                    applyThemeConfig(cfg);
                    showNotification('Thème importé et appliqué', 'success');
                } catch { showNotification('Fichier de thème invalide', 'error'); }
            };
            r.readAsText(file, 'utf-8');
        };
    }
        
        // Recherche et filtres joueurs
        const playerSearchInput = document.getElementById('playerSearchInput');
        if (playerSearchInput) {
            playerSearchInput.addEventListener('input', () => updatePlayersTab());
        }
        
        const clearPlayerSearchBtn = document.getElementById('clearPlayerSearchBtn');
        if (clearPlayerSearchBtn) {
            clearPlayerSearchBtn.addEventListener('click', () => {
                if (playerSearchInput) playerSearchInput.value = '';
                if (document.getElementById('playerFilterRole')) document.getElementById('playerFilterRole').value = 'all';
                if (document.getElementById('playerFilterRank')) document.getElementById('playerFilterRank').value = 'all';
                if (document.getElementById('playerFilterAgent')) document.getElementById('playerFilterAgent').value = 'all';
                updatePlayersTab();
            });
        }
        
        const playerFilterRole = document.getElementById('playerFilterRole');
        if (playerFilterRole) {
            playerFilterRole.addEventListener('change', () => updatePlayersTab());
        }
        
        const playerFilterRank = document.getElementById('playerFilterRank');
        if (playerFilterRank) {
            playerFilterRank.addEventListener('change', () => updatePlayersTab());
        }
        
        const playerFilterAgent = document.getElementById('playerFilterAgent');
        if (playerFilterAgent) {
            playerFilterAgent.addEventListener('change', () => updatePlayersTab());
        }
        
        const resetPlayerFiltersBtn = document.getElementById('resetPlayerFiltersBtn');
        if (resetPlayerFiltersBtn) {
            resetPlayerFiltersBtn.addEventListener('click', () => {
                if (playerSearchInput) playerSearchInput.value = '';
                if (playerFilterRole) playerFilterRole.value = 'all';
                if (playerFilterRank) playerFilterRank.value = 'all';
                if (playerFilterAgent) playerFilterAgent.value = 'all';
                updatePlayersTab();
            });
        }
        
        // Recherche et filtres matchs
        const matchSearchInput = document.getElementById('matchSearchInput');
        if (matchSearchInput) {
            matchSearchInput.addEventListener('input', () => updateMatchesTab());
        }
        
        const clearMatchSearchBtn = document.getElementById('clearMatchSearchBtn');
        if (clearMatchSearchBtn) {
            clearMatchSearchBtn.addEventListener('click', () => {
                if (matchSearchInput) matchSearchInput.value = '';
                updateMatchesTab();
            });
        }
        
        const matchFilterMap = document.getElementById('matchFilterMap');
        if (matchFilterMap) {
            matchFilterMap.addEventListener('change', () => updateMatchesTab());
        }
        
        const matchFilterResult = document.getElementById('matchFilterResult');
        if (matchFilterResult) {
            matchFilterResult.addEventListener('change', () => updateMatchesTab());
        }
        
        const matchFilterOpponent = document.getElementById('matchFilterOpponent');
        if (matchFilterOpponent) {
            matchFilterOpponent.addEventListener('input', () => updateMatchesTab());
        }
        
        const matchFilterDateFrom = document.getElementById('matchFilterDateFrom');
        if (matchFilterDateFrom) {
            matchFilterDateFrom.addEventListener('change', () => updateMatchesTab());
        }
        
        const matchFilterDateTo = document.getElementById('matchFilterDateTo');
        if (matchFilterDateTo) {
            matchFilterDateTo.addEventListener('change', () => updateMatchesTab());
        }
        
        const matchSortBy = document.getElementById('matchSortBy');
        if (matchSortBy) {
            matchSortBy.addEventListener('change', () => updateMatchesTab());
        }
        
        const matchSortOrder = document.getElementById('matchSortOrder');
        if (matchSortOrder) {
            matchSortOrder.addEventListener('change', () => updateMatchesTab());
        }
        
        const resetMatchFiltersBtn = document.getElementById('resetMatchFiltersBtn');
        if (resetMatchFiltersBtn) {
            resetMatchFiltersBtn.addEventListener('click', () => {
                if (matchSearchInput) matchSearchInput.value = '';
                if (matchFilterMap) matchFilterMap.value = 'all';
                if (matchFilterResult) matchFilterResult.value = 'all';
                if (matchFilterOpponent) matchFilterOpponent.value = '';
                if (matchFilterDateFrom) matchFilterDateFrom.value = '';
                if (matchFilterDateTo) matchFilterDateTo.value = '';
                if (matchSortBy) matchSortBy.value = 'date';
                if (matchSortOrder) matchSortOrder.value = 'desc';
                updateMatchesTab();
            });
        }
    
    // Gestion de la modale de thème
    const themeModalClose = document.getElementById('themeModalClose');
    if (themeModalClose) {
        themeModalClose.addEventListener('click', () => {
            document.getElementById('themeModal').classList.remove('show');
        });
    }
    
    const applyThemeBtn = document.getElementById('applyThemeBtn');
    if (applyThemeBtn) {
        applyThemeBtn.addEventListener('click', applyTheme);
    }
    
    const resetThemeBtn = document.getElementById('resetThemeBtn');
    if (resetThemeBtn) {
        resetThemeBtn.addEventListener('click', resetTheme);
    }
    
    // Écouter les changements de thème
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', onThemeSelectChange);
    }
    
    const customAccentColor = document.getElementById('customAccentColor');
    if (customAccentColor) {
        customAccentColor.addEventListener('input', onCustomColorChange);
    }
    
    const customAccentColorText = document.getElementById('customAccentColorText');
    if (customAccentColorText) {
        customAccentColorText.addEventListener('input', onCustomColorTextChange);
    }
}

// =========================================
// PROFILER (renderer)
// =========================================
function startProfiler() {
    if (document.getElementById('profilerOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'profilerOverlay';
    overlay.innerHTML = `
        <h4>Profiling (renderer)</h4>
        <div class="grid">
            <div>FPS</div><div id="profFps" class="muted">-</div>
            <div>RAM</div><div id="profMem" class="muted">-</div>
            <div>DOM</div><div id="profDom" class="muted">-</div>
            <div>Marks</div><div id="profMarks" class="muted">-</div>
        </div>
    `;
    document.body.appendChild(overlay);

    // FPS
    let last = performance.now();
    let frames = 0;
    let fps = 0;
    function tick() {
        const now = performance.now();
        frames++;
        if (now - last >= 1000) {
            fps = frames;
            frames = 0;
            last = now;
        }
        if (document.getElementById('profilerOverlay')) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    profilerInterval = setInterval(() => {
        const mem = performance.memory ? `${(performance.memory.usedJSHeapSize/1048576).toFixed(1)} MB` : 'n/a';
        const domCount = document.getElementsByTagName('*').length;
        const marks = performance.getEntriesByType('measure').slice(-5).map(m => `${m.name}:${m.duration.toFixed(1)}ms`).join(', ');
        const byId = id => document.getElementById(id);
        if (!byId('profilerOverlay')) return;
        byId('profFps').textContent = `${fps}`;
        byId('profMem').textContent = mem;
        byId('profDom').textContent = `${domCount}`;
        byId('profMarks').textContent = marks || '-';
    }, 500);
}

function stopProfiler() {
    const overlay = document.getElementById('profilerOverlay');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (profilerInterval) {
        clearInterval(profilerInterval);
        profilerInterval = null;
    }
}

// =========================================
// TUTORIELS & STRATÉGIE
// =========================================

async function renderTutorialsTab() {
    const container = document.getElementById('tutorialsContent');
    if (!container) return;

    const ensureTutorials = async () => {
        if (!window.TutorialService) {
            // Lazy load du service de tutoriels
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'js/services/TutorialService.js';
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }
        if (!tutorialService) {
            tutorialService = new TutorialService();
        }
    };

    // Générer après chargement éventuel
    let quickStart = null;
    try {
        // Essayer immédiat, sinon lazy
        if (!tutorialService) {
            // eslint-disable-next-line no-unused-expressions
            await ensureTutorials();
        }
        quickStart = tutorialService.getQuickStartGuide();
    } catch (e) {
        console.warn('Tutoriel non disponible pour le moment:', e);
    }

    let stepsHTML = '';
    if (quickStart && quickStart.steps && quickStart.steps.length) {
        stepsHTML = `
            <div class="card">
                <h3>${quickStart.title}</h3>
                <div class="steps-grid">
                    ${quickStart.steps.map((s, idx) => `
                        <div class="step-card">
                            <div class="step-number">${idx + 1}</div>
                            <div class="step-body">
                                <div class="step-title">${s.icon || '➡️'} ${s.title}</div>
                                <div class="step-desc">${s.description}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    let shortcutsHTML = '';
    if (keyboardService) {
        shortcutsHTML = `
            <div class="card">
                <h3>⌨️ Raccourcis Clavier</h3>
                ${keyboardService.generateHelpHTML()}
            </div>
        `;
    }

    container.innerHTML = `
        <div class="tutorials-grid">
            ${stepsHTML}
            ${shortcutsHTML}
        </div>
    `;
}

function renderStrategyTab() {
    // Gérer les sous-onglets de stratégie
    wireStrategySubTabs();
    
    // Rendre le contenu selon le sous-onglet actif
    const activeSubTab = document.querySelector('.strategy-tab-btn.active');
    if (activeSubTab) {
        const subTabName = activeSubTab.getAttribute('data-strategy-tab');
        if (subTabName === 'valoplants') {
            renderValoplantsTab();
        } else if (subTabName === 'antistrat') {
            renderAntistratTab();
        }
    }
}

function wireStrategySubTabs() {
    const strategyTabBtns = document.querySelectorAll('.strategy-tab-btn');
    strategyTabBtns.forEach(btn => {
        // Retirer les listeners existants pour éviter les doublons
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => {
            const tabName = newBtn.getAttribute('data-strategy-tab');
            switchStrategySubTab(tabName);
        });
    });
}

function switchStrategySubTab(tabName) {
    const targetTab = document.getElementById(`${tabName}SubTab`);
    const targetBtn = document.querySelector(`[data-strategy-tab="${tabName}"]`);
    
    if (!targetTab || !targetBtn) return;
    
    // Obtenir l'onglet actif actuel
    const currentActiveTab = document.querySelector('.strategy-sub-tab-content.active');
    
    // Animation de sortie
    if (currentActiveTab && currentActiveTab !== targetTab) {
        currentActiveTab.classList.remove('active');
    }
    
    // Désactiver tous les boutons
    document.querySelectorAll('.strategy-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Activer le nouveau bouton
    targetBtn.classList.add('active');
    
    // Animation d'entrée
    setTimeout(() => {
        targetTab.classList.add('active');
        
        // Rendre le contenu selon le sous-onglet
        if (tabName === 'valoplants') {
            renderValoplantsTab();
        } else if (tabName === 'antistrat') {
            renderAntistratTab();
        }
    }, 50);
}

function renderValoplantsTab() {
    // Banque d'images par map & side (upload/URL) + notes, actions en survol
    const mapSelect = document.getElementById('strategyMapSelect');
    const sideSelect = document.getElementById('strategySideSelect');
    const fileInput = document.getElementById('strategyImagesInput');
    const openPickerBtn = document.getElementById('openFilePickerBtn');
    const gallery = document.getElementById('strategyGallery');
    const imagePreviewModal = document.getElementById('imagePreviewModal');
    const imagePreview = document.getElementById('imagePreview');
    const imagePreviewClose = document.getElementById('imagePreviewClose');

    if (!gallery) return;

    // Peupler select maps
    const maps = (window.OFFICIAL_MAPS || window.ALL_MAPS || []);
    if (mapSelect && mapSelect.options.length === 0) {
        maps.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            mapSelect.appendChild(opt);
        });
    }
    const getCurrentMap = () => (mapSelect && mapSelect.value) || maps[0] || 'Ascent';

    // Helpers de persistance
    const loadImages = (key) => {
        try {
            const raw = localStorage.getItem(key);
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch {
            return [];
        }
    };
    const saveImages = (key, arr) => {
        localStorage.setItem(key, JSON.stringify(arr));
    };

    const keyFor = (kind, map) => `strategy_${kind}_images_${map}`;

    // { src, note }
    let images = [];

    const renderGallery = (container, arr, storageKey) => {
        container.innerHTML = arr.map((img, idx) => `
            <div class="image-item hover-actions">
                <img class="strategy-thumb" src="${img.src}" alt="strat">
                <div class="image-actions-float">
                    <button class="btn-secondary sm" data-action="edit" data-key="${storageKey}" data-idx="${idx}">Modifier</button>
                    <button class="btn-danger sm" data-action="del" data-key="${storageKey}" data-idx="${idx}">Supprimer</button>
                </div>
                <textarea class="image-note ${img.editing ? 'show' : ''}" data-key="${storageKey}" data-idx="${idx}" placeholder="Notes stratégie...">${img.note || ''}</textarea>
            </div>
        `).join('');

        // Suppression
        container.querySelectorAll('button[data-action="del"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const k = btn.getAttribute('data-key');
                const i = parseInt(btn.getAttribute('data-idx'), 10);
                images.splice(i, 1);
                saveImages(k, images);
                renderGallery(gallery, images, k);
            });
        });

        // Aperçu plein écran au clic sur l'image
        container.querySelectorAll('img.strategy-thumb').forEach(imgEl => {
            imgEl.addEventListener('click', () => {
                if (!imagePreviewModal || !imagePreview) return;
                imagePreview.src = imgEl.src;
                imagePreviewModal.classList.add('show');
            });
        });

        // Édition: toggle notes
        container.querySelectorAll('button[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const k = btn.getAttribute('data-key');
                const i = parseInt(btn.getAttribute('data-idx'), 10);
                images[i].editing = !images[i].editing;
                saveImages(k, images);
                renderGallery(gallery, images, k);
            });
        });

        // Notes (auto-save léger)
        let noteTimer;
        container.querySelectorAll('textarea.image-note').forEach(area => {
            area.addEventListener('input', () => {
                const k = area.getAttribute('data-key');
                const i = parseInt(area.getAttribute('data-idx'), 10);
                const value = area.value;
                if (images[i]) images[i].note = value;
                clearTimeout(noteTimer);
                noteTimer = setTimeout(() => saveImages(k, images), 300);
            });
        });
    };

    // Chargement/rendu selon map & side
    const refreshForMap = () => {
        const currentMap = getCurrentMap();
        const side = (sideSelect && sideSelect.value) || 'attack';
        const STORAGE_KEY = keyFor(side, currentMap);
        images = loadImages(STORAGE_KEY);
        renderGallery(gallery, images, STORAGE_KEY);
        wireHandlers(STORAGE_KEY);
    };

    // Ajout par fichiers
    const handleFiles = async (fileList, key) => {
        if (!fileList || fileList.length === 0) return;
        const toDataURL = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        for (const file of fileList) {
            try {
                const dataUrl = await toDataURL(file);
                images.push({ src: dataUrl, note: '', editing: true });
            } catch {}
        }
        saveImages(key, images);
        renderGallery(gallery, images, key);
    };

    // Handlers dynamiques (selon map/side)
    const wireHandlers = (STORAGE_KEY) => {
        fileInput && (fileInput.onchange = (e) => handleFiles(e.target.files, STORAGE_KEY));
        openPickerBtn && (openPickerBtn.onclick = () => fileInput && fileInput.click());

        // Drag & Drop sur la galerie
        if (gallery) {
            const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
            ['dragenter','dragover','dragleave','drop'].forEach(evt => gallery.addEventListener(evt, stop));
            gallery.addEventListener('dragenter', () => gallery.classList.add('drop-active'));
            gallery.addEventListener('dragover', () => gallery.classList.add('drop-active'));
            gallery.addEventListener('dragleave', () => gallery.classList.remove('drop-active'));
            gallery.addEventListener('drop', (e) => {
                gallery.classList.remove('drop-active');
                const files = e.dataTransfer?.files;
                if (files && files.length) handleFiles(files, STORAGE_KEY);
            });
        }

        // Coller une image (presse-papiers) dans l’onglet stratégie
        const onPaste = async (e) => {
            try {
                const items = e.clipboardData?.items || [];
                for (let i = 0; i < items.length; i++) {
                    const it = items[i];
                    if (it.type && it.type.indexOf('image') !== -1) {
                        const blob = it.getAsFile();
                        if (blob) {
                            await handleFiles([blob], STORAGE_KEY);
                            showNotification('Image collée ajoutée à la galerie', 'success');
                            break;
                        }
                    }
                }
            } catch {}
        };
        // Pour éviter les doublons, on nettoie puis on attache
        try { document.removeEventListener('paste', onPaste); } catch {}
        document.addEventListener('paste', onPaste);

        // Exports Valoplants (HTML/PDF) pour map/side courants
        const exportStrategyHtmlBtn = document.getElementById('exportStrategyHtmlBtn');
        if (exportStrategyHtmlBtn) exportStrategyHtmlBtn.onclick = () => exportStrategyHTML(STORAGE_KEY);
        const exportStrategyPdfBtn = document.getElementById('exportStrategyPdfBtn');
        if (exportStrategyPdfBtn) exportStrategyPdfBtn.onclick = () => exportStrategyPDF(STORAGE_KEY);
    };

    // Initial + changements map/side
    refreshForMap();
    mapSelect && mapSelect.addEventListener('change', refreshForMap);
    sideSelect && sideSelect.addEventListener('change', refreshForMap);

    // Fermeture de l’aperçu
    if (imagePreviewClose && imagePreviewModal) {
        imagePreviewClose.onclick = () => imagePreviewModal.classList.remove('show');
        imagePreviewModal.addEventListener('click', (e) => {
            if (e.target === imagePreviewModal) imagePreviewModal.classList.remove('show');
        });
    }
}

// Fonction principale pour gérer l'onglet Antistrat
function renderAntistratTab() {
    // Récupérer les éléments directement (sans setTimeout pour éviter les problèmes de timing)
    const teamsList = document.getElementById('antistratTeamsList');
    const addTeamBtn = document.getElementById('addAntistratTeamBtn');
    const profileView = document.getElementById('antistratProfileView');
    const teamNameInput = document.getElementById('antistratTeamName');
    const closeProfileBtn = document.getElementById('closeAntistratProfileBtn');
    const deleteTeamBtn = document.getElementById('deleteAntistratTeamBtn');
    const preferredMapSelect = document.getElementById('antistratPreferredMap');
    const mapsContainer = document.getElementById('antistratMapsContainer');
    const addMapBtn = document.getElementById('addAntistratMapBtn');

    if (!teamsList || !addTeamBtn) {
        console.warn('Éléments Antistrat non trouvés:', { teamsList: !!teamsList, addTeamBtn: !!addTeamBtn });
        // Réessayer après un court délai
        setTimeout(() => renderAntistratTab(), 200);
        return;
    }
    
    // Continuer avec le reste du code...
    renderAntistratTabContent(teamsList, addTeamBtn, profileView, teamNameInput, closeProfileBtn, deleteTeamBtn, preferredMapSelect, mapsContainer, addMapBtn);
}

// Variable pour suivre si les listeners ont été attachés
let antistratListenersAttached = false;

function renderAntistratTabContent(teamsList, addTeamBtn, profileView, teamNameInput, closeProfileBtn, deleteTeamBtn, preferredMapSelect, mapsContainer, addMapBtn) {

    let currentTeamName = null;

    // Helpers de persistance
    const loadAntistratData = () => {
        try {
            const raw = localStorage.getItem('antistrat_data');
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    };

    const saveAntistratData = (data) => {
        try {
            localStorage.setItem('antistrat_data', JSON.stringify(data));
        } catch (e) {
            console.error('Erreur lors de la sauvegarde des données antistrat:', e);
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                showNotification('Erreur: espace de stockage insuffisant pour sauvegarder les données antistrat.', 'error');
            }
        }
    };

    // Constantes
    const agents = window.ALL_AGENTS || [];
    const maps = window.OFFICIAL_MAPS || window.ALL_MAPS || [];

    // Peupler les selects
    const populateSelect = (select, options, placeholder = '-- Sélectionner --') => {
        if (!select) return;
        select.innerHTML = `<option value="">${placeholder}</option>`;
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            select.appendChild(option);
        });
    };

    // Peupler les selects de bans (maps)
    const banSelects = [
        document.getElementById('antistratBan1'),
        document.getElementById('antistratBan2'),
        document.getElementById('antistratBan3'),
        document.getElementById('antistratBan4'),
        document.getElementById('antistratBan5')
    ];
    banSelects.forEach((select, idx) => {
        if (select) {
            populateSelect(select, maps, `-- Ban ${idx + 1} --`);
        }
    });
    
    populateSelect(preferredMapSelect, maps, '-- Map préférée --');

    // Charger les données d'une équipe
    const loadTeamData = (teamName) => {
        if (!teamName) return null;
        const data = loadAntistratData();
        return data[teamName] || {
            bans: { ban1: '', ban2: '', ban3: '', ban4: '', ban5: '' },
            preferredMap: '',
            maps: {}
        };
    };

    // Sauvegarder les données d'une équipe
    const saveTeamData = (teamName, teamData) => {
        const data = loadAntistratData();
        data[teamName] = teamData;
        saveAntistratData(data);
    };

    // Rendre la liste des profils
    const renderTeamsList = () => {
        const antistratData = loadAntistratData();
        const allTeams = Object.keys(antistratData).sort();

        if (allTeams.length === 0) {
            teamsList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">Aucun profil antistrat créé. Cliquez sur "Créer un profil" pour commencer.</div>';
            return;
        }

        teamsList.innerHTML = allTeams.map(teamName => {
            const teamData = loadTeamData(teamName);
            const mapsCount = Object.keys(teamData.maps || {}).length;
            const bansCount = [teamData.bans?.ban1, teamData.bans?.ban2, teamData.bans?.ban3, teamData.bans?.ban4, teamData.bans?.ban5].filter(b => b).length;
            const bansList = [teamData.bans?.ban1, teamData.bans?.ban2, teamData.bans?.ban3, teamData.bans?.ban4, teamData.bans?.ban5].filter(b => b).join(', ') || 'Aucun';
            return `
                <div class="card" style="cursor: pointer; transition: transform 0.2s;" onclick="openAntistratProfile('${teamName.replace(/'/g, "\\'")}')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h3 style="margin: 0 0 8px 0;">${teamName}</h3>
                            <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">
                                ${mapsCount} map${mapsCount > 1 ? 's' : ''} • 
                                ${bansCount} ban${bansCount > 1 ? 's' : ''} de map${bansCount > 1 ? 's' : ''} (${bansList})
                                ${teamData.preferredMap ? ` • Map préférée: ${teamData.preferredMap}` : ''}
                            </p>
                        </div>
                        <button class="btn-primary" onclick="event.stopPropagation(); openAntistratProfile('${teamName.replace(/'/g, "\\'")}')">Ouvrir</button>
                    </div>
                </div>
            `;
        }).join('');
    };

    // Ouvrir un profil
    window.openAntistratProfile = (teamName) => {
        currentTeamName = teamName;
        const teamData = loadTeamData(teamName);
        
        // Afficher la vue profil et masquer la liste
        teamsList.style.display = 'none';
        profileView.style.display = 'block';
        
        // Remplir les champs
        if (teamNameInput) teamNameInput.value = teamName;
        banSelects.forEach((select, idx) => {
            if (select) {
                select.value = teamData.bans?.[`ban${idx + 1}`] || '';
            }
        });
        if (preferredMapSelect) preferredMapSelect.value = teamData.preferredMap || '';

        // Rendre les maps
        renderMapsForTeam(teamName);
    };

    // Rendre les maps pour une équipe
    const renderMapsForTeam = (teamName) => {
        const teamData = loadTeamData(teamName);
        const mapsData = teamData.maps || {};

        if (Object.keys(mapsData).length === 0) {
            mapsContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">Aucune map ajoutée. Cliquez sur "Ajouter une map" pour commencer.</div>';
            return;
        }

        mapsContainer.innerHTML = Object.keys(mapsData).sort().map(mapName => {
            const mapData = mapsData[mapName];
            return createMapCard(teamName, mapName, mapData);
        }).join('');

        // Attacher les event listeners pour chaque map
        Object.keys(mapsData).forEach(mapName => {
            attachMapListeners(teamName, mapName);
        });
    };

    // Créer une carte pour une map
    const createMapCard = (teamName, mapName, mapData) => {
        const compoList = (mapData.compo || []).filter(a => a).join(', ') || 'Aucune composition';
        const imagesCount = (mapData.images || []).length;
        
        return `
            <div class="card antistrat-map-card" data-map="${mapName}" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <h3 style="margin: 0;">🗺️ ${mapName}</h3>
                    <button class="btn-danger sm" onclick="deleteAntistratMap('${teamName.replace(/'/g, "\\'")}', '${mapName.replace(/'/g, "\\'")}')">🗑️ Supprimer</button>
                </div>

                <!-- Composition -->
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">👥 Composition:</label>
                    <div id="compo-${teamName}-${mapName}" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px;">
                        ${[0,1,2,3,4].map(i => `
                            <div>
                                <label style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; display: block;">Agent ${i+1}:</label>
                                <select class="antistrat-agent-select modern-select" data-team="${teamName}" data-map="${mapName}" data-index="${i}">
                                    <option value="">-- Agent ${i+1} --</option>
                                    ${agents.map(agent => `<option value="${agent}" ${(mapData.compo && mapData.compo[i] === agent) ? 'selected' : ''}>${agent}</option>`).join('')}
                                </select>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Notes -->
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">📝 Notes d'antistrat:</label>
                    <textarea class="antistrat-notes" data-team="${teamName}" data-map="${mapName}" rows="4" 
                        placeholder="Ajoutez vos notes d'antistrat pour cette map..." 
                        style="width: 100%; padding: 10px; border-radius: 6px; font-family: inherit; resize: vertical;">${mapData.notes || ''}</textarea>
                </div>

                <!-- Images -->
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <label style="font-weight: 600;">🖼️ Images de stratégies (${imagesCount}):</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="file" class="antistrat-images-input" data-team="${teamName}" data-map="${mapName}" accept="image/*" multiple style="display: none;">
                            <button class="btn-primary sm" onclick="document.querySelector('.antistrat-images-input[data-team=&quot;${teamName}&quot;][data-map=&quot;${mapName}&quot;]').click()">📷 Importer</button>
                            <button class="btn-secondary sm" onclick="enablePasteForMap('${teamName.replace(/'/g, "\\'")}', '${mapName.replace(/'/g, "\\'")}')">📋 Coller</button>
                        </div>
                    </div>
                    <div class="image-grid" id="gallery-${teamName}-${mapName}">
                        ${renderAntistratGallery(mapData.images || [], teamName, mapName)}
                    </div>
                </div>
            </div>
        `;
    };

    // Rendre la galerie d'images (modèle Valoplants avec notes)
    const renderAntistratGallery = (images, teamName, mapName) => {
        if (!images || images.length === 0) {
            return '<div style="text-align: center; padding: 20px; color: var(--text-secondary); font-size: 14px;">Aucune image. Importez ou collez des images pour créer vos stratégies.</div>';
        }
        const storageKey = `antistrat_${teamName}_${mapName}_images`;
        return images.map((img, idx) => `
            <div class="image-item hover-actions">
                <img class="strategy-thumb" src="${img.src || img}" alt="antistrat" data-key="${storageKey}" data-idx="${idx}">
                <div class="image-actions-float">
                    <button class="btn-secondary sm" data-action="edit" data-key="${storageKey}" data-idx="${idx}">Modifier</button>
                    <button class="btn-danger sm" data-action="del" data-key="${storageKey}" data-idx="${idx}">Supprimer</button>
                </div>
                <textarea class="image-note ${img.editing ? 'show' : ''}" data-key="${storageKey}" data-idx="${idx}" placeholder="Notes stratégie...">${img.note || ''}</textarea>
            </div>
        `).join('');
    };

    // Fonctions globales pour les event listeners
    window.deleteAntistratMap = (teamName, mapName) => {
        if (!confirm(`Supprimer la map "${mapName}" du profil "${teamName}" ?`)) return;
        const teamData = loadTeamData(teamName);
        if (teamData.maps) {
            delete teamData.maps[mapName];
            saveTeamData(teamName, teamData);
            renderMapsForTeam(teamName);
        }
    };

    // Fonction supprimée - maintenant gérée directement dans attachMapListeners

    window.enablePasteForMap = (teamName, mapName) => {
        showNotification('Appuyez sur Ctrl+V pour coller une image', 'info');
        const onPaste = async (e) => {
            try {
                const items = e.clipboardData?.items || [];
                for (let i = 0; i < items.length; i++) {
                    const it = items[i];
                    if (it.type && it.type.indexOf('image') !== -1) {
                        const blob = it.getAsFile();
                        if (blob) {
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                                const dataUrl = event.target.result;
                                const teamData = loadTeamData(teamName);
                                if (!teamData.maps) teamData.maps = {};
                                if (!teamData.maps[mapName]) teamData.maps[mapName] = { compo: ['', '', '', '', ''], notes: '', images: [] };
                                if (!teamData.maps[mapName].images) teamData.maps[mapName].images = [];
                                teamData.maps[mapName].images.push({ src: dataUrl, note: '', editing: true });
                                saveTeamData(teamName, teamData);
                                renderMapsForTeam(teamName);
                                showNotification('Image collée ajoutée', 'success');
                            };
                            reader.readAsDataURL(blob);
                            document.removeEventListener('paste', onPaste);
                            break;
                        }
                    }
                }
            } catch {}
        };
        document.addEventListener('paste', onPaste, { once: true });
    };

    // Attacher les event listeners pour une map
    const attachMapListeners = (teamName, mapName) => {
        // Agents
        document.querySelectorAll(`.antistrat-agent-select[data-team="${teamName}"][data-map="${mapName}"]`).forEach(select => {
            select.addEventListener('change', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'), 10);
                const teamData = loadTeamData(teamName);
                if (!teamData.maps) teamData.maps = {};
                if (!teamData.maps[mapName]) teamData.maps[mapName] = { compo: ['', '', '', '', ''], notes: '', images: [] };
                if (!teamData.maps[mapName].compo) teamData.maps[mapName].compo = ['', '', '', '', ''];
                teamData.maps[mapName].compo[idx] = e.target.value;
                saveTeamData(teamName, teamData);
            });
        });

        // Notes
        const notesTextarea = document.querySelector(`.antistrat-notes[data-team="${teamName}"][data-map="${mapName}"]`);
        if (notesTextarea) {
            let notesTimer;
            notesTextarea.addEventListener('input', () => {
                clearTimeout(notesTimer);
                notesTimer = setTimeout(() => {
                    const teamData = loadTeamData(teamName);
                    if (!teamData.maps) teamData.maps = {};
                    if (!teamData.maps[mapName]) teamData.maps[mapName] = { compo: ['', '', '', '', ''], notes: '', images: [] };
                    teamData.maps[mapName].notes = notesTextarea.value;
                    saveTeamData(teamName, teamData);
                }, 500);
            });
        }

        // Images
        const imagesInput = document.querySelector(`.antistrat-images-input[data-team="${teamName}"][data-map="${mapName}"]`);
        if (imagesInput) {
            imagesInput.addEventListener('change', async (e) => {
                if (!e.target.files || e.target.files.length === 0) return;
                const toDataURL = (file) => new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = event => resolve(event.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                const teamData = loadTeamData(teamName);
                if (!teamData.maps) teamData.maps = {};
                if (!teamData.maps[mapName]) teamData.maps[mapName] = { compo: ['', '', '', '', ''], notes: '', images: [] };
                if (!teamData.maps[mapName].images) teamData.maps[mapName].images = [];

                for (const file of Array.from(e.target.files)) {
                    try {
                        const dataUrl = await toDataURL(file);
                        teamData.maps[mapName].images.push({ src: dataUrl, note: '', editing: true });
                    } catch {}
                }
                saveTeamData(teamName, teamData);
                renderMapsForTeam(teamName);
            });
        }

        // Gestion de la galerie d'images (modèle Valoplants)
        const gallery = document.getElementById(`gallery-${teamName}-${mapName}`);
        if (gallery) {
            // Suppression d'images
            gallery.querySelectorAll('button[data-action="del"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-idx'), 10);
                    const teamData = loadTeamData(teamName);
                    if (teamData.maps && teamData.maps[mapName] && teamData.maps[mapName].images) {
                        teamData.maps[mapName].images.splice(idx, 1);
                        saveTeamData(teamName, teamData);
                        renderMapsForTeam(teamName);
                    }
                });
            });

            // Édition: toggle notes
            gallery.querySelectorAll('button[data-action="edit"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-idx'), 10);
                    const teamData = loadTeamData(teamName);
                    if (teamData.maps && teamData.maps[mapName] && teamData.maps[mapName].images && teamData.maps[mapName].images[idx]) {
                        teamData.maps[mapName].images[idx].editing = !teamData.maps[mapName].images[idx].editing;
                        saveTeamData(teamName, teamData);
                        renderMapsForTeam(teamName);
                    }
                });
            });

            // Notes (auto-save)
            let noteTimer;
            gallery.querySelectorAll('textarea.image-note').forEach(area => {
                area.addEventListener('input', () => {
                    const idx = parseInt(area.getAttribute('data-idx'), 10);
                    const value = area.value;
                    const teamData = loadTeamData(teamName);
                    if (teamData.maps && teamData.maps[mapName] && teamData.maps[mapName].images && teamData.maps[mapName].images[idx]) {
                        teamData.maps[mapName].images[idx].note = value;
                        clearTimeout(noteTimer);
                        noteTimer = setTimeout(() => {
                            saveTeamData(teamName, teamData);
                        }, 300);
                    }
                });
            });

            // Aperçu plein écran au clic sur l'image
            gallery.querySelectorAll('img.strategy-thumb').forEach(imgEl => {
                imgEl.addEventListener('click', () => {
                    const imagePreviewModal = document.getElementById('imagePreviewModal');
                    const imagePreview = document.getElementById('imagePreview');
                    if (!imagePreviewModal || !imagePreview) return;
                    imagePreview.src = imgEl.src;
                    if (window.modalsManager) {
                        window.modalsManager.open(imagePreviewModal);
                    } else {
                        imagePreviewModal.classList.add('show');
                    }
                });
            });
        }
    };

    // Fonction pour ouvrir la modal de création de profil
    const showCreateProfileModal = () => {
        const modal = document.getElementById('createAntistratProfileModal');
        const input = document.getElementById('antistratTeamNameInput');
        const confirmBtn = document.getElementById('confirmCreateAntistratProfile');
        const cancelBtn = document.getElementById('cancelCreateAntistratProfile');
        const closeBtn = document.getElementById('closeCreateAntistratProfileModal');
        
        if (!modal || !input) return;
        
        // Réinitialiser l'input
        input.value = '';
        
        // Ouvrir la modal
        if (window.modalsManager) {
            window.modalsManager.open(modal);
        } else {
            modal.classList.add('show');
        }
        
        // Focus sur l'input
        setTimeout(() => input.focus(), 100);
        
        // Fonction pour créer le profil
        const createProfile = () => {
            const teamName = input.value.trim();
            if (teamName) {
                const cleanName = teamName;
                const teamData = loadTeamData(cleanName);
                saveTeamData(cleanName, teamData);
                renderTeamsList();
                openAntistratProfile(cleanName);
                
                // Fermer la modal
                if (window.modalsManager) {
                    window.modalsManager.close(modal);
                } else {
                    modal.classList.remove('show');
                }
            }
        };
        
        // Event listeners pour la modal
        const handleConfirm = () => createProfile();
        const handleCancel = () => {
            if (window.modalsManager) {
                window.modalsManager.close(modal);
            } else {
                modal.classList.remove('show');
            }
        };
        
        // Retirer les anciens listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        const newCloseBtn = closeBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        
        // Attacher les nouveaux listeners
        newConfirmBtn.addEventListener('click', handleConfirm);
        newCancelBtn.addEventListener('click', handleCancel);
        newCloseBtn.addEventListener('click', handleCancel);
        
        // Créer le profil avec Enter
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                createProfile();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        };
    };

    // Event listeners principaux
    // Attacher les listeners seulement une fois
    if (!antistratListenersAttached) {
        // Utiliser onclick directement pour éviter les problèmes de listeners multiples
        if (addTeamBtn) {
            addTeamBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Bouton "Créer un profil" cliqué');
                showCreateProfileModal();
            };
            console.log('Event listener attaché au bouton "Créer un profil"');
            antistratListenersAttached = true;
        } else {
            console.error('Bouton addAntistratTeamBtn non trouvé');
        }
    } else {
        // Si les listeners sont déjà attachés, juste mettre à jour la référence du bouton
        const currentBtn = document.getElementById('addAntistratTeamBtn');
        if (currentBtn && currentBtn !== addTeamBtn) {
            currentBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                showCreateProfileModal();
            };
        }
    }

    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', () => {
            profileView.style.display = 'none';
            teamsList.style.display = 'grid';
            currentTeamName = null;
            renderTeamsList();
        });
    }

    if (deleteTeamBtn) {
        deleteTeamBtn.addEventListener('click', () => {
            if (!currentTeamName) return;
            if (confirm(`Supprimer complètement le profil "${currentTeamName}" ?`)) {
                const data = loadAntistratData();
                delete data[currentTeamName];
                saveAntistratData(data);
                profileView.style.display = 'none';
                teamsList.style.display = 'grid';
                currentTeamName = null;
                renderTeamsList();
            }
        });
    }

    if (teamNameInput) {
        let nameTimer;
        teamNameInput.addEventListener('input', () => {
            if (!currentTeamName) return;
            clearTimeout(nameTimer);
            nameTimer = setTimeout(() => {
                const newName = teamNameInput.value.trim();
                if (newName && newName !== currentTeamName) {
                    const teamData = loadTeamData(currentTeamName);
                    const data = loadAntistratData();
                    delete data[currentTeamName];
                    data[newName] = teamData;
                    saveAntistratData(data);
                    currentTeamName = newName;
                    renderTeamsList();
                }
            }, 500);
        });
    }

    // Sauvegarder les bans (maps)
    banSelects.forEach((select, idx) => {
        if (select) {
            select.addEventListener('change', () => {
                if (!currentTeamName) return;
                const teamData = loadTeamData(currentTeamName);
                if (!teamData.bans) teamData.bans = { ban1: '', ban2: '', ban3: '', ban4: '', ban5: '' };
                teamData.bans[`ban${idx + 1}`] = select.value;
                saveTeamData(currentTeamName, teamData);
            });
        }
    });

    // Sauvegarder la map préférée
    if (preferredMapSelect) {
        preferredMapSelect.addEventListener('change', () => {
            if (!currentTeamName) return;
            const teamData = loadTeamData(currentTeamName);
            teamData.preferredMap = preferredMapSelect.value;
            saveTeamData(currentTeamName, teamData);
        });
    }

    // Fonction pour ouvrir la modal d'ajout de map
    const showAddMapModal = () => {
        if (!currentTeamName) {
            if (window.NotificationService) {
                window.NotificationService.show('Veuillez d\'abord créer ou ouvrir un profil', 'warning');
            } else {
                alert('Veuillez d\'abord créer ou ouvrir un profil');
            }
            return;
        }

        const modal = document.getElementById('addAntistratMapModal');
        const select = document.getElementById('antistratMapNameSelect');
        const confirmBtn = document.getElementById('confirmAddAntistratMap');
        const cancelBtn = document.getElementById('cancelAddAntistratMap');
        const closeBtn = document.getElementById('closeAddAntistratMapModal');
        
        if (!modal || !select) return;

        // Peupler le select avec les maps disponibles
        select.innerHTML = '<option value="">-- Sélectionner une map --</option>';
        maps.forEach(map => {
            const option = document.createElement('option');
            option.value = map;
            option.textContent = map;
            select.appendChild(option);
        });

        // Vérifier quelles maps sont déjà ajoutées
        const teamData = loadTeamData(currentTeamName);
        const existingMaps = Object.keys(teamData.maps || {});
        select.querySelectorAll('option').forEach(option => {
            if (option.value && existingMaps.includes(option.value)) {
                option.disabled = true;
                option.textContent += ' (déjà ajoutée)';
            }
        });

        // Ouvrir la modal
        if (window.modalsManager) {
            window.modalsManager.open(modal);
        } else {
            modal.classList.add('show');
        }

        // Focus sur le select
        setTimeout(() => select.focus(), 100);

        // Fonction pour ajouter la map
        const addMap = () => {
            const mapName = select.value.trim();
            if (mapName) {
                const cleanMapName = mapName;
                const teamData = loadTeamData(currentTeamName);
                if (!teamData.maps) teamData.maps = {};
                if (!teamData.maps[cleanMapName]) {
                    teamData.maps[cleanMapName] = {
                        compo: ['', '', '', '', ''],
                        notes: '',
                        images: []
                    };
                }
                saveTeamData(currentTeamName, teamData);
                renderMapsForTeam(currentTeamName);
                
                // Fermer la modal
                if (window.modalsManager) {
                    window.modalsManager.close(modal);
                } else {
                    modal.classList.remove('show');
                }
            }
        };

        // Event listeners pour la modal
        const handleConfirm = () => addMap();
        const handleCancel = () => {
            if (window.modalsManager) {
                window.modalsManager.close(modal);
            } else {
                modal.classList.remove('show');
            }
        };

        // Retirer les anciens listeners en clonant les boutons
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        const newCloseBtn = closeBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

        // Attacher les nouveaux listeners
        newConfirmBtn.addEventListener('click', handleConfirm);
        newCancelBtn.addEventListener('click', handleCancel);
        newCloseBtn.addEventListener('click', handleCancel);

        // Ajouter la map avec Enter
        select.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addMap();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        };
    };

    // Ajouter une map
    if (addMapBtn) {
        addMapBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showAddMapModal();
        };
    }

    // Initialiser
    renderTeamsList();
}

function exportStrategyHTML(storageKey) {
    try {
        const raw = localStorage.getItem(storageKey);
        const arr = raw ? JSON.parse(raw) : [];
        const map = document.getElementById('strategyMapSelect')?.value || '';
        const side = document.getElementById('strategySideSelect')?.value || '';
        const title = `Valoplants — ${map} (${side === 'attack' ? 'Attaque' : 'Défense'})`;
        const css = `body{font-family:Arial, sans-serif;margin:24px;background:#fff;color:#111}h1{margin-bottom:12px} .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px} .card{border:1px solid rgba(0,0,0,.12);border-radius:10px;padding:10px;background:#fafafa} .card img{width:100%;border-radius:8px;object-fit:contain;background:#fff} .note{white-space:pre-wrap;font-size:12px;margin-top:6px;opacity:.85}`;
        const items = arr.map(it => `<div class="card"><img src="${it.src}"><div class="note">${(it.note || '').replace(/</g,'&lt;')}</div></div>`).join('');
        const html = `<html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body><h1>${title}</h1><div class="grid">${items}</div></body></html>`;
        const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
        const filename = `${(title).replace(/[^a-z0-9]/gi,'_')}.html`;
        if (!exportService) exportService = new ExportService();
        exportService.downloadFile(blob, filename, 'text/html;charset=utf-8;');
        showNotification('Export Valoplants (HTML) généré', 'success');
    } catch (e) {
        console.error(e);
        showNotification('Erreur export Valoplants HTML', 'error');
    }
}

function exportStrategyPDF(storageKey) {
    try {
        const raw = localStorage.getItem(storageKey);
        const arr = raw ? JSON.parse(raw) : [];
        const map = document.getElementById('strategyMapSelect')?.value || '';
        const side = document.getElementById('strategySideSelect')?.value || '';
        const title = `Valoplants — ${map} (${side === 'attack' ? 'Attaque' : 'Défense'})`;
        const css = `body{font-family:Arial, sans-serif;margin:24px;background:#fff;color:#111}h1{margin-bottom:12px} .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px} .card{border:1px solid rgba(0,0,0,.12);border-radius:10px;padding:10px;background:#fafafa;page-break-inside:avoid} .card img{width:100%;border-radius:8px;object-fit:contain;background:#fff} .note{white-space:pre-wrap;font-size:12px;margin-top:6px;opacity:.85} @media print {.no-print{display:none}}`;
        const items = arr.map(it => `<div class="card"><img src="${it.src}"><div class="note">${(it.note || '').replace(/</g,'&lt;')}</div></div>`).join('');
        const w = window.open('', '_blank', 'width=1200,height=800');
        if (!w) { showNotification('Fenêtre PDF bloquée', 'error'); return; }
        const html = `<html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body><div class="no-print" style="text-align:right;margin-bottom:8px;"><button onclick="window.print()">Imprimer / Exporter en PDF</button></div><h1>${title}</h1><div class="grid">${items}</div></body></html>`;
        w.document.open(); w.document.write(html); w.document.close();
        showNotification('Aperçu Valoplants prêt (PDF via Imprimer)', 'success');
    } catch (e) {
        console.error(e);
        showNotification('Erreur export Valoplants PDF', 'error');
    }
}

// =========================================
// GESTION DES ONGLETS
// =========================================

function switchTab(tabName) {
    try { loggerService?.logEvent('switch_tab', { tab: tabName }); } catch {}
    const targetTab = document.getElementById(`${tabName}Tab`);
    const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (!targetTab || !targetBtn) return;
    
    // Obtenir l'onglet actif actuel
    const currentActiveTab = document.querySelector('.tab-content.active');
    const currentActiveBtn = document.querySelector('.tab-btn.active');
    
    // Animation de sortie de l'onglet actuel
    if (currentActiveTab && currentActiveTab !== targetTab) {
        // Nettoyage mémoire: cloner/remplacer le noeud pour purger les listeners internes
        try {
            const parent = currentActiveTab.parentNode;
            if (parent) {
                const clone = currentActiveTab.cloneNode(true);
                // conserver la classe active le temps de l'anim puis enlever
                clone.classList.add('tab-exiting');
                parent.replaceChild(clone, currentActiveTab);
        setTimeout(() => {
                    clone.classList.remove('active', 'tab-exiting');
        }, 200);
            }
        } catch (e) {
            console.warn('Nettoyage listeners (clone) ignoré:', e);
        }
    } else if (currentActiveTab) {
        currentActiveTab.classList.remove('active');
    }
    
    // Désactiver tous les boutons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Activer le nouveau bouton avec animation
    targetBtn.classList.add('active');
    
    // Animation d'entrée du nouvel onglet
    targetTab.classList.add('tab-entering');
    setTimeout(() => {
        targetTab.classList.add('active');
        targetTab.classList.remove('tab-entering');
    }, 50);
    
    // Mettre à jour le contenu si nécessaire
    if (tabName === 'statistics') {
        // Lazy load Plotly + charts si nécessaire puis rendre l'onglet
        const loadScript = (src) => new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
        const ensureCharts = async () => {
            try {
                // Charger Plotly et les modules charts au besoin
                if (typeof Plotly === 'undefined') {
                    await loadScript('https://cdn.plot.ly/plotly-2.26.0.min.js');
                }
                // Charger logique statistiques si manquante
                if (!window.StatisticsUI) {
                    await loadScript('js/ui/statistics.js');
                }
                if (!window.ChartsManager) {
                    await loadScript('js/ui/charts.js');
                }
            } catch (e) {
                console.error('Erreur de lazy loading des graphiques:', e);
            } finally {
                // Rebrancher les contrôles et filtres de l'onglet statistiques
                try { wireStatisticsTabControls(); } catch (e) { console.warn('wireStatisticsTabControls error', e); }
                setTimeout(() => { updateStatisticsTab(); }, 50);
            }
        };
        ensureCharts();
    } else if (tabName === 'players') {
        setTimeout(() => {
            updatePlayersTab();
        }, 100);
    } else if (tabName === 'matches') {
        setTimeout(() => {
            updateMatchesTab();
        }, 100);
    } else if (tabName === 'progression') {
        setTimeout(() => {
            updateProgressionTab();
        }, 100);
    } else if (tabName === 'comparison') {
        setTimeout(() => {
            updateComparisonTab();
        }, 100);
    } else if (tabName === 'strategy') {
        setTimeout(() => {
            // Rebrancher les handlers (le clonage d’onglet purge les listeners)
            try { renderStrategyTab(); } catch (e) { console.warn('renderStrategyTab error', e); }
        }, 100);
    } else if (tabName === 'api') {
        setTimeout(() => {
            try { wireApiTab(); } catch (e) { console.warn('wireApiTab error', e); }
        }, 50);
    } else {
        // Si on quitte l’onglet API, annuler toute requête en cours et lever l’état busy s’il restait
        try { riotApiInFlightController?.abort(); } catch {}
        try {
            const apiTab = document.getElementById('apiTab');
            if (apiTab) apiTab.classList.remove('loading');
        } catch {}
    }
}

function switchStatsTab(tabName) {
    const targetTab = document.getElementById(`${tabName}StatsTab`);
    const targetBtn = document.querySelector(`[data-stats-tab="${tabName}"]`);
    
    if (!targetTab || !targetBtn) return;
    
    // Obtenir l'onglet actif actuel
    const currentActiveTab = document.querySelector('.stats-tab-content.active');
    
    // Animation de sortie
    if (currentActiveTab && currentActiveTab !== targetTab) {
        currentActiveTab.classList.add('tab-exiting');
        setTimeout(() => {
            currentActiveTab.classList.remove('active', 'tab-exiting');
        }, 200);
    } else if (currentActiveTab) {
        currentActiveTab.classList.remove('active');
    }
    
    // Désactiver tous les boutons
    document.querySelectorAll('.stats-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Activer le nouveau bouton
    targetBtn.classList.add('active');
    
    // Si on passe à l'onglet graphiques, mettre à jour la liste des adversaires pour les graphiques comparatifs
    if (tabName === 'charts') {
        setTimeout(() => {
            updateComparativeOpponentsList();
        }, 100);
    }
    
    // Animation d'entrée
    targetTab.classList.add('tab-entering');
    setTimeout(() => {
        targetTab.classList.add('active');
        targetTab.classList.remove('tab-entering');
    }, 50);
    
    // Mettre à jour le contenu
    if (tabName === 'map') {
        setTimeout(() => {
        updateMapStats();
        }, 100);
    } else if (tabName === 'rounds') {
        setTimeout(() => {
        updateRoundStats();
        }, 100);
    } else if (tabName === 'insights') {
        setTimeout(() => {
            updateInsightsStats();
        }, 100);
    }
}

// =========================================
// GESTION DES FICHIERS
// =========================================

async function checkAndLoadTeam() {
    try {
        console.log('Vérification des fichiers de configuration...');
        
        // Utiliser un timeout pour éviter que les appels IPC bloquent indéfiniment
        const IPC_TIMEOUT = 5000; // 5 secondes max par appel IPC
        
        const timeoutPromise = (promise, timeoutMs) => {
            return Promise.race([
                promise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
                )
            ]);
        };
        
        // Obtenir le chemin de l'application avec timeout
        let appPath;
        try {
            appPath = await timeoutPromise(ipcRenderer.invoke('get-app-path'), IPC_TIMEOUT);
            console.log('Chemin de l\'application:', appPath);
        } catch (err) {
            console.error('Timeout ou erreur lors de la récupération du chemin:', err);
            showNoTeamMessage();
            return;
        }
        
        const configPath = path.join(appPath, 'Data', 'config.json');
        console.log('Chemin de la config:', configPath);
        
        // Vérifier si le fichier de config existe avec timeout
        let configExists = false;
        try {
            configExists = await timeoutPromise(ipcRenderer.invoke('file-exists', configPath), IPC_TIMEOUT);
            console.log('Config existe?', configExists);
        } catch (err) {
            console.error('Timeout ou erreur lors de la vérification de la config:', err);
            showNoTeamMessage();
            return;
        }
        
        let config = null;
        let teamFilePath = null;
        let isFirstLaunch = false;
        
        if (configExists) {
            try {
                config = await timeoutPromise(ipcRenderer.invoke('load-config'), IPC_TIMEOUT);
                console.log('Config chargée:', config);
                teamFilePath = config?.last_team_file || null;
                console.log('Chemin de l\'équipe:', teamFilePath);
                
                // Vérifier si c'est un premier lancement (pas de chemin d'équipe configuré)
                if (!teamFilePath || !config.last_team_file) {
                    console.log('Aucun chemin d\'équipe configuré - premier lancement');
                    isFirstLaunch = true;
                }
            } catch (err) {
                console.error('Erreur lors du chargement de la config:', err);
                config = null;
                isFirstLaunch = true;
            }
        } else {
            console.log('Fichier de config n\'existe pas - premier lancement');
            isFirstLaunch = true;
        }
        
        // Vérifier si le fichier d'équipe existe et est valide (de manière asynchrone, sans bloquer l'UI)
        let teamFileExists = false;
        let teamData = null;
        
        if (teamFilePath) {
            try {
                teamFileExists = await timeoutPromise(ipcRenderer.invoke('file-exists', teamFilePath), IPC_TIMEOUT);
                console.log('Fichier d\'équipe existe?', teamFileExists);
            } catch (err) {
                console.error('Timeout ou erreur lors de la vérification du fichier d\'équipe:', err);
                showNoTeamMessage();
                return;
            }
            
            // Si le fichier existe, valider son contenu JSON
            if (teamFileExists) {
                try {
                    // Utiliser la validation améliorée avec timeout
                    const validation = await timeoutPromise(
                        ipcRenderer.invoke('validate-json-file', teamFilePath), 
                        IPC_TIMEOUT * 2 // Plus de temps pour la validation
                    );
                    console.log('Validation du fichier:', validation);
                    
                    if (validation.valid && validation.data) {
                        teamData = validation.data;
                        console.log('Données de l\'équipe validées:', teamData);
                        
                        // Vérifier si l'équipe est vide ou par défaut
                        // Ne considérer comme "première utilisation" que si le nom est "Nouvelle Equipe" ET qu'il n'y a pas de joueurs/matches
                        // Si l'équipe a un nom personnalisé, même sans joueurs/matches, c'est une équipe valide
                        if (!teamData.name) {
                            console.log('Équipe invalide (pas de nom) - premier lancement');
                            isFirstLaunch = true;
                        } else if (teamData.name === 'Nouvelle Equipe' && 
                                   (!teamData.players || teamData.players.length === 0) &&
                                   (!teamData.matches || teamData.matches.length === 0)) {
                            // Seulement si c'est le nom par défaut ET qu'il n'y a rien
                            console.log('Équipe par défaut vide détectée - premier lancement');
                            isFirstLaunch = true;
                        } else {
                            // L'équipe a un nom personnalisé, c'est valide même sans joueurs/matches
                            console.log('Équipe valide détectée:', teamData.name);
                        }
                    } else {
                        // Fichier invalide
                        console.log('Fichier JSON invalide:', validation.message || 'Erreur de validation');
                        isFirstLaunch = true;
                    }
                } catch (err) {
                    console.error('Erreur lors de la validation de l\'équipe:', err);
                    isFirstLaunch = true;
                }
            } else {
                console.log('Fichier d\'équipe n\'existe pas - premier lancement');
                isFirstLaunch = true;
            }
        } else {
            console.log('Aucun chemin d\'équipe défini - premier lancement');
            isFirstLaunch = true;
        }
        
        // Si le fichier d'équipe existe, charger l'équipe
        if (teamFileExists && teamFilePath && !isFirstLaunch) {
            console.log('Fichier d\'équipe existe, chargement de l\'équipe...');
            try {
                // Charger l'équipe normalement (même si teamData est null, loadTeam() gérera l'erreur)
                await loadTeam();
                // Afficher l'interface principale
                showHomeInterface();
                return;
            } catch (err) {
                console.error('Erreur lors du chargement de l\'équipe:', err);
                // En cas d'erreur, afficher le message de chargement
                showNoTeamMessage();
                return;
            }
        }
        
        // Si c'est un premier lancement (pas de fichier d'équipe), afficher le message
        if (isFirstLaunch || !configExists || !config || !teamFilePath || !teamFileExists) {
            console.log('Aucune équipe détectée, affichage du message de chargement...');
            showNoTeamMessage();
            return;
        }
        
        console.log('Configuration valide trouvée, chargement de l\'équipe...');
        // Charger l'équipe normalement
        try {
            await loadTeam();
            showHomeInterface();
        } catch (err) {
            console.error('Erreur lors du chargement de l\'équipe:', err);
            showNoTeamMessage();
        }
    } catch (error) {
        console.error('Erreur lors de la vérification des fichiers:', error);
        // En cas d'erreur, afficher le message et s'assurer que l'UI est accessible
        showNoTeamMessage();
    }
}

function showNoTeamMessage() {
    const noTeamMessage = document.getElementById('noTeamMessage');
    const homeContainer = document.getElementById('homeContainer');
    
    // S'assurer que l'UI est visible et accessible
    if (noTeamMessage) {
        noTeamMessage.style.display = 'block';
        noTeamMessage.style.pointerEvents = 'auto';
    }
    if (homeContainer) {
        homeContainer.style.display = 'none';
    }
    
    // S'assurer que tous les éléments de la toolbar sont accessibles
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) {
        toolbar.style.pointerEvents = 'auto';
    }
    
    // Attacher les gestionnaires d'événements pour les boutons
    const loadTeamFileBtn = document.getElementById('loadTeamFileBtn');
    const createNewTeamBtn = document.getElementById('createNewTeamBtn');
    
    if (loadTeamFileBtn && !loadTeamFileBtn._wired) {
        loadTeamFileBtn._wired = true;
        loadTeamFileBtn.addEventListener('click', async () => {
            try {
                const { ipcRenderer } = require('electron');
                const result = await ipcRenderer.invoke('show-open-dialog', {
                    title: 'Charger un fichier d\'équipe',
                    filters: [
                        { name: 'JSON', extensions: ['json'] },
                        { name: 'Tous les fichiers', extensions: ['*'] }
                    ],
                    properties: ['openFile']
                });
                
                if (!result.canceled && result.filePaths.length > 0) {
                    const filePath = result.filePaths[0];
                    await loadTeamFromPath(filePath);
                    
                    // Mettre à jour la configuration
                    let config = await ipcRenderer.invoke('load-config');
                    if (!config || typeof config !== 'object') {
                        config = {};
                    }
                    config.last_team_file = filePath;
                    await ipcRenderer.invoke('save-config', config);
                    
                    showHomeInterface();
                }
            } catch (error) {
                console.error('Erreur lors du chargement du fichier:', error);
                alert('Erreur lors du chargement du fichier: ' + error.message);
            }
        });
    }
    
    if (createNewTeamBtn && !createNewTeamBtn._wired) {
        createNewTeamBtn._wired = true;
        createNewTeamBtn.addEventListener('click', async () => {
            try {
                const { ipcRenderer } = require('electron');
                const result = await ipcRenderer.invoke('show-save-dialog', {
                    title: 'Créer un nouveau fichier d\'équipe',
                    defaultPath: 'team.json',
                    filters: [
                        { name: 'JSON', extensions: ['json'] },
                        { name: 'Tous les fichiers', extensions: ['*'] }
                    ]
                });
                
                if (!result.canceled && result.filePath) {
                    const teamName = prompt('Entrez le nom de l\'équipe:', 'Nouvelle Equipe');
                    if (teamName) {
                        const TeamClass = window.Team;
                        if (!TeamClass) {
                            alert('Erreur: La classe Team n\'est pas disponible.');
                            return;
                        }
                        
                        const newTeam = new TeamClass(teamName);
                        const saveResult = await ipcRenderer.invoke('save-team', newTeam.toJSON(), result.filePath);
                        
                        if (saveResult && saveResult.success) {
                            // Mettre à jour la configuration
                            let config = await ipcRenderer.invoke('load-config');
                            if (!config || typeof config !== 'object') {
                                config = {};
                            }
                            config.last_team_file = result.filePath;
                            await ipcRenderer.invoke('save-config', config);
                            
                            await loadTeamFromPath(result.filePath);
                            showHomeInterface();
                        } else {
                            alert('Erreur lors de la création de l\'équipe: ' + (saveResult?.error || 'Erreur inconnue'));
                        }
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la création de l\'équipe:', error);
                alert('Erreur lors de la création de l\'équipe: ' + error.message);
            }
        });
    }
}

function showHomeInterface() {
    const noTeamMessage = document.getElementById('noTeamMessage');
    const homeContainer = document.getElementById('homeContainer');
    
    if (noTeamMessage) {
        noTeamMessage.style.display = 'none';
    }
    if (homeContainer) {
        homeContainer.style.display = 'flex';
    }
}

async function loadTeam() {
    try {
        const config = await ipcRenderer.invoke('load-config');
        const filePath = config.last_team_file || null;
        
        if (filePath) {
            await loadTeamFromPath(filePath);
        } else {
            // Charger l'équipe par défaut
            const teamData = await ipcRenderer.invoke('load-team');
            if (teamData) {
                team = Team.fromJSON(teamData);
                currentTeamPath = null;
            }
            updateAllTabs();
            showHomeInterface(); // Afficher l'interface principale après chargement
        }
    } catch (error) {
        console.error('Erreur lors du chargement de l\'équipe:', error);
    }
}

// Fonctions globales pour la modal supprimées - remplacées par showNoTeamMessage()

// Fonction showInitialSetupModal() supprimée - remplacée par showNoTeamMessage()

async function loadTeamFromPath(filePath) {
    try {
        // Utiliser StorageService si disponible
        let teamData;
        if (storageService) {
            teamData = await storageService.loadTeam(filePath);
        } else {
            teamData = await ipcRenderer.invoke('load-team', filePath);
        }
        
        if (teamData) {
            // Valider les données avant de les charger
            if (validationService) {
                const validation = validationService.validateTeam(teamData);
                
                if (!validation.valid) {
                    // Afficher les erreurs
                    const errorMessage = `Erreurs de validation détectées:\n${validation.errors.join('\n')}`;
                    console.error('❌ Erreurs de validation:', validation.errors);
                    
                    if (notificationService) {
                        notificationService.show('Erreurs de validation détectées. Voir la console pour plus de détails.', 'error');
                    } else {
                        alert(errorMessage);
                    }
                    
                    // Essayer de nettoyer les données
                    const sanitized = validationService.sanitizeTeam(teamData);
                    if (sanitized) {
                        const sanitizedValidation = validationService.validateTeam(sanitized);
                        if (sanitizedValidation.valid) {
                            console.log('✅ Données nettoyées avec succès');
                            teamData = sanitized;
                            if (notificationService) {
                                notificationService.show('Données corrigées automatiquement', 'warning');
                            }
                        } else {
                            console.error('❌ Impossible de corriger les données');
                            if (notificationService) {
                                notificationService.notifyLoad(false);
                            }
                            return;
                        }
                    } else {
                        if (notificationService) {
                            notificationService.notifyLoad(false);
                        }
                        return;
                    }
                } else if (validation.warnings.length > 0) {
                    // Afficher les avertissements
                    console.warn('⚠️ Avertissements de validation:', validation.warnings);
                    if (notificationService) {
                        notificationService.show(`${validation.warnings.length} avertissement(s) détecté(s). Voir la console.`, 'warning');
                    }
                }
            }
            
            team = Team.fromJSON(teamData);
            currentTeamPath = filePath;
            updateAllTabs();
            showHomeInterface(); // Afficher l'interface principale après chargement
            
            // Notification de chargement réussi
            if (notificationService) {
                notificationService.notifyLoad(true, team.name);
            }
        } else {
            if (notificationService) {
                notificationService.notifyLoad(false);
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement de l\'équipe:', error);
        if (notificationService) {
            notificationService.notifyLoad(false);
        } else {
        alert('Erreur lors du chargement de l\'équipe: ' + error.message);
        }
    }
}

async function saveTeam() {
    try {
        // Calculer winrate précédent avant sauvegarde
        const prevWinrate = computeTeamWinrate();
        const teamData = team.toJSON();
        
        // Valider les données avant de sauvegarder
        if (validationService) {
            const validation = validationService.validateTeam(teamData);
            
            if (!validation.valid) {
                const errorMessage = `Erreurs de validation avant sauvegarde:\n${validation.errors.join('\n')}`;
                console.error('❌ Erreurs de validation:', validation.errors);
                
                if (notificationService) {
                    notificationService.show('Erreurs de validation détectées. La sauvegarde a été annulée.', 'error');
                } else {
                    alert(errorMessage);
                }
                return;
            } else if (validation.warnings.length > 0) {
                console.warn('⚠️ Avertissements de validation:', validation.warnings);
            }
        }

        // Contrôle d'intégrité complémentaire
        const integrityIssues = [];
        (teamData.matches || []).forEach((m, idx) => {
            if (!m.date) integrityIssues.push(`Match #${idx + 1} sans date`);
            if (!m.map) integrityIssues.push(`Match #${idx + 1} sans map`);
            if (!m.opponent) integrityIssues.push(`Match #${idx + 1} sans adversaire`);
        });
        if (integrityIssues.length > 0) {
            showNotification(`Avertissement intégrité: ${integrityIssues[0]}`, 'warning');
        }
        
        // Vérifier que le chemin est valide avant de sauvegarder
        let savePath = currentTeamPath;
        if (!savePath || savePath.trim() === '') {
            // Demander à l'utilisateur de choisir un fichier
            const result = await ipcRenderer.invoke('show-save-dialog', {
                title: 'Sauvegarder l\'équipe',
                defaultPath: `${team.name || 'equipe'}.json`,
                filters: [
                    { name: 'Fichiers JSON', extensions: ['json'] },
                    { name: 'Tous les fichiers', extensions: ['*'] }
                ]
            });
            
            if (result.canceled || !result.filePath) {
                showNotification('Sauvegarde annulée', 'warning');
                return;
            }
            
            savePath = result.filePath;
            currentTeamPath = savePath;
        }
        
        // Utiliser StorageService si disponible
        let result;
        if (storageService) {
            result = await storageService.saveTeam(teamData, savePath);
        } else {
            result = await ipcRenderer.invoke('save-team', teamData, savePath);
        }
        
        if (result && result.success) {
            // Créer une sauvegarde automatique
            if (backupService) {
                try { await backupService.createBackup(teamData, team.name); } catch {}
            }
            showNotification('Équipe sauvegardée avec succès', 'success');
            try {
                triggerProgressNotifications(prevWinrate);
            } catch {}
        } else {
            showNotification('Erreur lors de la sauvegarde: ' + (result?.error || 'Erreur inconnue'), 'error');
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        showNotification('Erreur lors de la sauvegarde: ' + error.message, 'error');
        try {
            const backups = backupService?.getAllBackups?.() || [];
            if (backups.length > 0) {
                showNotification('Des sauvegardes existent (💾) pour restaurer en cas de corruption.', 'warning');
            }
        } catch {}
    }
}

async function importTeam() {
    try {
        const result = await ipcRenderer.invoke('show-open-dialog');
        if (!result.canceled && result.filePaths.length > 0) {
            await loadTeamFromPath(result.filePaths[0]);
            showNotification('Équipe importée avec succès', 'success');
        }
    } catch (error) {
        console.error('Erreur lors de l\'import:', error);
        showNotification('Erreur lors de l\'import: ' + error.message, 'error');
    }
}

async function exportTeam() {
    try {
        const result = await ipcRenderer.invoke('show-save-dialog');
        if (!result.canceled && result.filePath) {
            await ipcRenderer.invoke('save-team', team.toJSON(), result.filePath);
            showNotification('Équipe exportée avec succès', 'success');
        }
    } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        showNotification('Erreur lors de l\'export: ' + error.message, 'error');
    }
}

async function exportToCSV() {
    try {
        await ensureExportService();
        const csv = exportService.exportToCSV(team);
        const filename = `${team.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        exportService.downloadFile(csv, filename, 'text/csv;charset=utf-8;');
        showNotification('Export CSV réussi', 'success');
    } catch (error) {
        console.error('Erreur lors de l\'export CSV:', error);
        showNotification('Erreur lors de l\'export CSV: ' + error.message, 'error');
    }
}

async function exportToXML() {
    try {
        await ensureExportService();
        const xml = exportService.exportToXML(team);
        const filename = `${team.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xml`;
        exportService.downloadFile(xml, filename, 'application/xml;charset=utf-8;');
        showNotification('Export XML réussi', 'success');
    } catch (error) {
        console.error('Erreur lors de l\'export XML:', error);
        showNotification('Erreur lors de l\'export XML: ' + error.message, 'error');
    }
}

async function exportStatsToCSV() {
    try {
        await ensureExportService();
        const matchesCount = Array.isArray(team?.matches) ? team.matches.length : 0;
        if (matchesCount > 1000 && typeof Worker !== 'undefined') {
            if (!csvWorker) csvWorker = new Worker('js/workers/exportCsvWorker.js');
            const t0 = performance.now();
            csvWorker.onmessage = (msg) => {
                const { ok, csv, error } = msg.data || {};
                if (!ok || !csv) {
                    console.warn('exportCsvWorker failed:', error);
                    const csvFallback = exportService.exportStatsToCSV(team);
                    const filename = `${team.name.replace(/[^a-z0-9]/gi, '_')}_stats_${new Date().toISOString().split('T')[0]}.csv`;
                    exportService.downloadFile(csvFallback, filename, 'text/csv;charset=utf-8;');
                    showNotification('Export CSV (fallback) terminé', 'warning');
                    return;
                }
                const filename = `${team.name.replace(/[^a-z0-9]/gi, '_')}_stats_${new Date().toISOString().split('T')[0]}.csv`;
                exportService.downloadFile(csv, filename, 'text/csv;charset=utf-8;');
                showNotification(`Export CSV (worker ${(performance.now()-t0).toFixed(0)}ms)`, 'success');
            };
            csvWorker.postMessage({ type: 'stats', team });
        } else {
        const csv = exportService.exportStatsToCSV(team);
        const filename = `${team.name.replace(/[^a-z0-9]/gi, '_')}_stats_${new Date().toISOString().split('T')[0]}.csv`;
        exportService.downloadFile(csv, filename, 'text/csv;charset=utf-8;');
        showNotification('Export statistiques CSV réussi', 'success');
        }
    } catch (error) {
        console.error('Erreur lors de l\'export statistiques:', error);
        showNotification('Erreur lors de l\'export statistiques: ' + error.message, 'error');
    }
}

async function exportHTMLReport() {
    try {
        if (!window.ReportService) {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'js/services/ReportService.js';
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }
        if (!reportService) reportService = new ReportService();
        reportService.downloadHTMLReport(team);
        showNotification('Rapport HTML généré avec succès', 'success');
    } catch (error) {
        console.error('Erreur lors de la génération du rapport:', error);
        showNotification('Erreur lors de la génération du rapport: ' + error.message, 'error');
    }
}

// ===============================
// Exports ciblés & rapport thémé
// ===============================
function exportMapStatsCSV() {
    try {
        if (!exportService) ensureExportService();
        const useWorker = typeof Worker !== 'undefined';
        if (useWorker) {
            const worker = new Worker('js/workers/statsWorker.js');
            const matches = team.matches || [];
            const p = new Promise((resolve, reject) => {
                const onMsg = (e) => {
                    if (e.data?.type === 'mapStats:done') {
                        worker.removeEventListener('message', onMsg);
                        worker.terminate();
                        resolve(e.data.payload.result);
                    } else if (e.data?.type === 'error') {
                        worker.removeEventListener('message', onMsg);
                        worker.terminate();
                        reject(new Error(e.data.payload?.message || 'Erreur worker'));
                    }
                };
                worker.addEventListener('message', onMsg);
                worker.postMessage({ type: 'mapStats', payload: { matches } });
            });

            p.then((stats) => {
                // Générer CSV à partir du résultat agrégé
                let csv = '=== STATISTIQUES PAR MAP ===\n';
                csv += 'Map,Matchs,Victoires,Défaites,Winrate\n';
                Object.entries(stats).forEach(([map, s]) => {
                    const total = (s.victories || 0) + (s.defeats || 0);
                    const winrate = total > 0 ? ((s.victories / total) * 100).toFixed(1) : '0';
                    csv += `${exportService.escapeCSV(map)},${s.matches || 0},${s.victories || 0},${s.defeats || 0},${winrate}%\n`;
                });
                const filename = `${team.name.replace(/[^a-z0-9]/gi, '_')}_maps_${new Date().toISOString().split('T')[0]}.csv`;
                exportService.downloadFile(csv, filename, 'text/csv;charset=utf-8;');
                showNotification('Export CSV par map réussi (worker)', 'success');
            }).catch(() => {
                // Fallback: service existant
                const csv = exportService.exportStatsToCSV(team);
                const filename = `${team.name.replace(/[^a-z0-9]/gi, '_')}_maps_${new Date().toISOString().split('T')[0]}.csv`;
                exportService.downloadFile(csv, filename, 'text/csv;charset=utf-8;');
                showNotification('Export CSV par map (fallback)', 'warning');
            });
        } else {
            const csv = exportService.exportStatsToCSV(team);
            const filename = `${team.name.replace(/[^a-z0-9]/gi, '_')}_maps_${new Date().toISOString().split('T')[0]}.csv`;
            exportService.downloadFile(csv, filename, 'text/csv;charset=utf-8;');
            showNotification('Export CSV par map réussi', 'success');
        }
    } catch (e) {
        showNotification('Erreur export CSV par map', 'error');
    }
}

function exportPlayerStatsCSV() {
    try {
        if (!exportService) exportService = new ExportService();
        const playerFilter = (document.getElementById('exportPlayerSelect')?.value || 'all');
        let players = team.players || [];
        if (playerFilter !== 'all') players = players.filter(p => p.name === playerFilter);

        let csv = '=== STATISTIQUES PAR JOUEUR ===\n';
        csv += 'Joueur,Agent,Rôle,Rang,Matchs\n';
        players.forEach(p => {
            const matches = (team.matches || []).length; // placeholder faute de data par joueur
            csv += `${exportService.escapeCSV(p.name)},${exportService.escapeCSV(p.agent)},${exportService.escapeCSV(p.role)},${exportService.escapeCSV(p.rank)},${matches}\n`;
        });
        const filename = `${team.name.replace(/[^a-z0-9]/gi, '_')}_players_${new Date().toISOString().split('T')[0]}.csv`;
        exportService.downloadFile(csv, filename, 'text/csv;charset=utf-8;');
        showNotification('Export CSV joueurs réussi', 'success');
    } catch (e) {
        showNotification('Erreur export CSV joueurs', 'error');
    }
}

function exportPeriodStatsCSV() {
    try {
        if (!exportService) exportService = new ExportService();
        // Intervalle via UI ou défaut 30j
        const fromStr = document.getElementById('exportFrom')?.value || '';
        const toStr = document.getElementById('exportTo')?.value || '';
        const mapFilter = (document.getElementById('exportMapSelect')?.value || 'all');
        const opt = {
            date: document.getElementById('csvOptDate')?.checked !== false,
            map: document.getElementById('csvOptMap')?.checked !== false,
            opponent: document.getElementById('csvOptOpponent')?.checked !== false,
            score: document.getElementById('csvOptScore')?.checked !== false,
            result: document.getElementById('csvOptResult')?.checked !== false,
        };
        const now = new Date();
        const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        const from = fromStr ? new Date(fromStr) : defaultFrom;
        // inclure la fin de journée pour to
        const to = toStr ? new Date(toStr + 'T23:59:59') : now;
        const inRange = team.matches.filter(m => {
            const d = parseDate(m.date);
            const inDate = d >= from && d <= to;
            const inMap = mapFilter === 'all' ? true : (m.map === mapFilter);
            return inDate && inMap;
        });
        let csv = '=== STATISTIQUES PÉRIODE ===\n';
        const headers = []
            .concat(opt.date ? ['Date'] : [])
            .concat(opt.map ? ['Map'] : [])
            .concat(opt.opponent ? ['Adversaire'] : [])
            .concat(opt.score ? ['Score'] : [])
            .concat(opt.result ? ['Résultat'] : []);
        csv += headers.join(',') + '\n';
        inRange.forEach(m => {
            const row = []
                .concat(opt.date ? [exportService.escapeCSV(m.date || '')] : [])
                .concat(opt.map ? [exportService.escapeCSV(m.map || '')] : [])
                .concat(opt.opponent ? [exportService.escapeCSV(m.opponent || '')] : [])
                .concat(opt.score ? [exportService.escapeCSV(m.score || '')] : [])
                .concat(opt.result ? [exportService.escapeCSV(m.result || '')] : []);
            csv += row.join(',') + '\n';
        });
        const filename = `${team.name.replace(/[^a-z0-9]/gi, '_')}_period_${new Date().toISOString().split('T')[0]}.csv`;
        exportService.downloadFile(csv, filename, 'text/csv;charset=utf-8;');
        showNotification('Export CSV période réussi', 'success');
    } catch (e) {
        showNotification('Erreur export CSV période', 'error');
    }
}

async function exportThemedHTMLReport(theme = 'dark') {
    try {
        if (!window.ReportService) {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'js/services/ReportService.js';
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }
        if (!reportService) reportService = new ReportService();
        // Beaucoup de services ignorent les paramètres supplémentaires: on passe le thème si supporté
        if (typeof reportService.downloadHTMLReport === 'function' && reportService.downloadHTMLReport.length >= 2) {
            reportService.downloadHTMLReport(team, { theme });
        } else {
            reportService.downloadHTMLReport(team);
        }
        showNotification('Rapport HTML thémé généré', 'success');
    } catch (e) {
        console.error(e);
        showNotification('Erreur génération rapport thémé', 'error');
    }
}

async function exportPDFReport(theme = 'dark') {
    try {
        try { loggerService?.logEvent('export_pdf', { theme }); } catch {}
        // Générer un HTML imprimable dans une nouvelle fenêtre
        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        if (!printWindow) {
            showNotification('Impossible d’ouvrir la fenêtre d’aperçu PDF', 'error');
            return;
        }

        const stats = team.getStats ? team.getStats() : { playersCount: team.players?.length || 0, matchesCount: team.matches?.length || 0 };
        const today = new Date().toLocaleString('fr-FR');
        const includeSummary = document.getElementById('pdfIncludeSummary')?.checked !== false;
        const includeMapStats = document.getElementById('pdfIncludeMapStats')?.checked !== false;
        const includeMatches = document.getElementById('pdfIncludeMatches')?.checked !== false;

        const css = `
            body { font-family: Inter, Arial, sans-serif; margin: 24px; color: ${theme === 'dark' ? '#eee' : '#111'}; background: ${theme === 'dark' ? '#121212' : '#fff'}; }
            .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
            .title { font-size: 24px; font-weight: 700; }
            .muted { opacity: .7; font-size: 12px; }
            .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(260px,1fr)); gap:12px; }
            .card { border: 1px solid ${theme === 'dark' ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.12)'}; border-radius:10px; padding:12px; background: ${theme === 'dark' ? 'rgba(255,255,255,.03)' : '#fafafa'}; }
            h3 { margin: 0 0 8px; font-size: 16px; }
            table { width:100%; border-collapse: collapse; font-size: 12px; }
            th, td { text-align:left; padding:6px 8px; border-bottom: 1px solid ${theme === 'dark' ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)'}; }
            .footer { margin-top:24px; font-size: 12px; opacity:.7; }
            .cover { display:flex; align-items:center; justify-content:center; height: 80vh; flex-direction:column; text-align:center; page-break-after: always; }
            .cover .title { font-size: 40px; margin-bottom: 8px; }
            .cover .subtitle { font-size: 16px; opacity:.75; }
            .logo { width: 120px; height: 120px; border-radius: 12px; margin-bottom: 16px; object-fit: cover; border: 1px solid ${theme === 'dark' ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.12)'}; }
            .section { page-break-inside: avoid; margin-bottom: 18px; }
            .page-break { page-break-before: always; }
            @media print { .no-print { display:none; } body { margin: 0; } }
        `;

        // Table stats par map (rapide)
        const mapAgg = {};
        (team.matches || []).forEach(m => {
            const map = m.map || 'Unknown';
            if (!mapAgg[map]) mapAgg[map] = { matches: 0, victories: 0, defeats: 0 };
            mapAgg[map].matches++;
            const res = (m.result || '').toLowerCase();
            if (res === 'win' || res === 'victoire') mapAgg[map].victories++;
            else if (res === 'loss' || res === 'défaite' || res === 'defaite') mapAgg[map].defeats++;
        });

        const mapRows = Object.entries(mapAgg).map(([map, s]) => {
            const total = (s.victories || 0) + (s.defeats || 0);
            const winrate = total > 0 ? ((s.victories / total) * 100).toFixed(1) + '%' : '0%';
            return `<tr><td>${map}</td><td>${s.matches || 0}</td><td>${s.victories || 0}</td><td>${s.defeats || 0}</td><td>${winrate}</td></tr>`;
        }).join('');

        // Liste des matchs (résumé)
        const matchRows = (team.matches || []).map(m => {
            return `<tr><td>${m.date || '-'}</td><td>${m.map || '-'}</td><td>${m.opponent || '-'}</td><td>${m.score || '-'}</td><td>${m.result || '-'}</td></tr>`;
        }).join('');

        // Logo si présent dans l'app (tentative d’extraction du DOM)
        // Logo retiré

        const html = `
            <html><head><meta charset="utf-8"><title>Rapport ${team.name}</title><style>${css}</style></head>
            <body>
                <div class="cover">
                    <div class="title">${team.name || 'Équipe'}</div>
                    <div class="subtitle">Rapport d'équipe — Généré le ${today}</div>
                    <div class="no-print" style="margin-top:16px;"><button onclick="window.print()">Imprimer / Exporter en PDF</button></div>
                </div>

                ${includeSummary ? `<div class="section">
                    <div class="grid">
                        <div class="card">
                            <h3>Résumé</h3>
                            <table>
                                <tr><th>Joueurs</th><td>${stats.playersCount || team.players?.length || 0}</td></tr>
                                <tr><th>Matchs</th><td>${stats.matchesCount || team.matches?.length || 0}</td></tr>
                                <tr><th>Victoires</th><td>${stats.victories ?? '-'}</td></tr>
                                <tr><th>Défaites</th><td>${stats.defeats ?? '-'}</td></tr>
                                <tr><th>Winrate</th><td>${stats.winrate ? stats.winrate + '%' : '-'}</td></tr>
                            </table>
                        </div>
                        ${includeMapStats ? `<div class="card">
                            <h3>Statistiques par Map</h3>
                            <table>
                                <thead><tr><th>Map</th><th>Matchs</th><th>Victoires</th><th>Défaites</th><th>Winrate</th></tr></thead>
                                <tbody>${mapRows}</tbody>
                            </table>
                        </div>` : ''}
                    </div>
                </div>` : ''}

                ${includeMatches ? `<div class="section page-break">
                    <div class="card">
                        <h3>Liste des Matchs</h3>
                        <table>
                            <thead><tr><th>Date</th><th>Map</th><th>Adversaire</th><th>Score</th><th>Résultat</th></tr></thead>
                            <tbody>${matchRows}</tbody>
                        </table>
                    </div>
                </div>` : ''}

                <div class="footer">Valorant Team Manager — Rapport thémé (${theme})</div>
            </body></html>
        `;
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        showNotification('Aperçu PDF prêt. Utilisez Imprimer pour exporter.', 'success');
    } catch (e) {
        console.error(e);
        try { loggerService?.logError(e, { action: 'export_pdf' }); } catch {}
        showNotification('Erreur export PDF', 'error');
    }
}

function exportExcelReport() {
    try {
        if (!exportService) exportService = new ExportService();
        try { loggerService?.logEvent('export_excel', { map: document.getElementById('exportMapSelect')?.value || 'all', player: document.getElementById('exportPlayerSelect')?.value || 'all' }); } catch {}
        // Appliquer filtres période/map
        const fromStr = document.getElementById('exportFrom')?.value || '';
        const toStr = document.getElementById('exportTo')?.value || '';
        const mapFilter = (document.getElementById('exportMapSelect')?.value || 'all');
        const playerFilter = (document.getElementById('exportPlayerSelect')?.value || 'all');
        const now = new Date();
        const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        const from = fromStr ? new Date(fromStr) : defaultFrom;
        const to = toStr ? new Date(toStr + 'T23:59:59') : now;
        const matches = (team.matches || []).filter(m => {
            const d = parseDate(m.date);
            const inDate = d >= from && d <= to;
            const inMap = mapFilter === 'all' ? true : (m.map === mapFilter);
            return inDate && inMap;
        });

        // Essayer XLSX (SheetJS) sinon fallback XLS (HTML table)
        const filenameBase = `${team.name.replace(/[^a-z0-9]/gi, '_')}_matches_${new Date().toISOString().split('T')[0]}`;
        const tryXLSX = async () => {
            if (typeof XLSX === 'undefined') {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
                    s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
                });
            }
            const wb = XLSX.utils.book_new();
            // Feuille Joueurs
            let players = team.players || [];
            if (playerFilter !== 'all') players = players.filter(p => p.name === playerFilter);
            const playerRows = [['Joueur','Agent','Rôle','Rang']].concat(players.map(p => [p.name||'', p.agent||'', p.role||'', p.rank||'']));
            const wsPlayers = XLSX.utils.aoa_to_sheet(playerRows);
            XLSX.utils.book_append_sheet(wb, wsPlayers, 'Joueurs');
            // Feuille Matchs
            const matchRows = [['Date','Map','Adversaire','Score','Résultat']].concat(matches.map(m => [m.date||'', m.map||'', m.opponent||'', m.score||'', m.result||'']));
            const wsMatches = XLSX.utils.aoa_to_sheet(matchRows);
            XLSX.utils.book_append_sheet(wb, wsMatches, 'Matchs');
            const wbout = XLSX.write(wb, { bookType:'xlsx', type:'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            exportService.downloadFile(blob, `${filenameBase}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        };
        const fallbackXLS = () => {
            let html = '<table><thead><tr><th>Joueur</th><th>Agent</th><th>Rôle</th><th>Rang</th></tr></thead><tbody>';
            (team.players || []).forEach(p => {
                html += `<tr><td>${exportService.escapeCSV(p.name || '')}</td><td>${exportService.escapeCSV(p.agent || '')}</td><td>${exportService.escapeCSV(p.role || '')}</td><td>${exportService.escapeCSV(p.rank || '')}</td></tr>`;
            });
            html += '</tbody></table><br/>';
            html += '<table><thead><tr><th>Date</th><th>Map</th><th>Adversaire</th><th>Score</th><th>Résultat</th></tr></thead><tbody>';
            matches.forEach(m => {
                html += `<tr><td>${exportService.escapeCSV(m.date || '')}</td><td>${exportService.escapeCSV(m.map || '')}</td><td>${exportService.escapeCSV(m.opponent || '')}</td><td>${exportService.escapeCSV(m.score || '')}</td><td>${exportService.escapeCSV(m.result || '')}</td></tr>`;
            });
            html += '</tbody></table>';
            const blob = new Blob([`\uFEFF${html}`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
            exportService.downloadFile(blob, `${filenameBase}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
        };
        tryXLSX().then(() => {
            showNotification('Export Excel (XLSX) généré', 'success');
        }).catch(() => {
            fallbackXLS();
            showNotification('Export Excel (XLS) généré (fallback)', 'warning');
        });
        showNotification('Export Excel généré', 'success');
    } catch (e) {
        console.error(e);
        try { loggerService?.logError(e, { action: 'export_excel' }); } catch {}
        showNotification('Erreur export Excel', 'error');
    }
}

function exportXMLReport() {
    try {
        if (!exportService) exportService = new ExportService();
        try { loggerService?.logEvent('export_xml'); } catch {}
        const xmlEsc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const playersXml = (team.players || []).map(p =>
            `    <player>
        <name>${xmlEsc(p.name)}</name>
        <agent>${xmlEsc(p.agent)}</agent>
        <role>${xmlEsc(p.role)}</role>
        <rank>${xmlEsc(p.rank)}</rank>
    </player>`).join('\n');
        const matchesXml = (team.matches || []).map(m =>
            `    <match>
        <date>${xmlEsc(m.date)}</date>
        <map>${xmlEsc(m.map)}</map>
        <opponent>${xmlEsc(m.opponent)}</opponent>
        <score>${xmlEsc(m.score)}</score>
        <result>${xmlEsc(m.result)}</result>
    </match>`).join('\n');
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<team name="${xmlEsc(team.name || 'Team')}">
  <players>
${playersXml}
  </players>
  <matches>
${matchesXml}
  </matches>
</team>`;
        const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
        const filename = `${(team.name || 'team').replace(/[^a-z0-9]/gi, '_')}_export_${new Date().toISOString().split('T')[0]}.xml`;
        exportService.downloadFile(blob, filename, 'application/xml;charset=utf-8;');
        showNotification('Export XML généré', 'success');
    } catch (e) {
        console.error(e);
        try { loggerService?.logError(e, { action: 'export_xml' }); } catch {}
        showNotification('Erreur export XML', 'error');
    }
}

// ---------- Import CSV (Matchs) ----------
let _csvParsedRows = [];

function openImportCsvModal() {
    try { loggerService?.logEvent('import_csv_modal_open'); } catch {}
    try { metricsService?.incr('import_csv_modal_open'); } catch {}
    _csvParsedRows = [];
    const preview = document.getElementById('csvPreview');
    if (preview) preview.innerHTML = '';
    const confirmBtn = document.getElementById('confirmCsvImportBtn');
    if (confirmBtn) confirmBtn.disabled = true;
    toggleImportCsvModal(true);
}

function toggleImportCsvModal(show) {
    const modal = document.getElementById('importCsvModal');
    if (!modal) return;
    if (show) modal.classList.remove('hidden'); else modal.classList.add('hidden');
}

function onCsvFileSelected(e) {
    try {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = String(reader.result || '');
                // Si gros fichier, passer par worker
                if (text.length > 500_000 && typeof Worker !== 'undefined') {
                    if (!csvWorker) csvWorker = new Worker('js/workers/csvWorker.js');
                    const t0 = performance.now();
                    csvWorker.onmessage = (msg) => {
                        const { ok, rows, error } = msg.data || {};
                        if (!ok) {
                            console.warn('CSV worker error:', error);
                            fallbackParse(text);
                            return;
                        }
                        _csvParsedRows = rows || [];
                        renderCsvPreview(_csvParsedRows.slice(0, 50));
                        const confirmBtn = document.getElementById('confirmCsvImportBtn');
                        if (confirmBtn) confirmBtn.disabled = _csvParsedRows.length === 0;
                        showNotification(`${_csvParsedRows.length} lignes prêtes (worker ${(performance.now()-t0).toFixed(0)}ms)`, 'success');
                    };
                    csvWorker.postMessage({ type: 'parse', text });
                } else {
                    fallbackParse(text);
                }
            } catch (err) {
                console.error(err);
                showNotification('CSV invalide', 'error');
            }
        };
        reader.readAsText(file, 'utf-8');
    } catch (err) {
        console.error(err);
        showNotification('Erreur lecture CSV', 'error');
    }
}

function fallbackParse(text) {
    const rows = parseCSVText(text);
    const normalized = normalizeMatchCsvRows(rows);
    _csvParsedRows = normalized;
    renderCsvPreview(normalized.slice(0, 50));
    const confirmBtn = document.getElementById('confirmCsvImportBtn');
    if (confirmBtn) confirmBtn.disabled = normalized.length === 0;
    showNotification(`${normalized.length} lignes prêtes à l’import`, 'success');
}

function renderCsvPreview(rows) {
    const container = document.getElementById('csvPreview');
    if (!container) return;
    if (!rows.length) {
        container.innerHTML = '<em>Aucune donnée détectée.</em>';
        return;
    }
    let html = '<table class="table"><thead><tr><th>Date</th><th>Map</th><th>Opponent</th><th>Score</th><th>Result</th></tr></thead><tbody>';
    rows.forEach(r => {
        html += `<tr><td>${r.date || ''}</td><td>${r.map || ''}</td><td>${r.opponent || ''}</td><td>${r.score || ''}</td><td>${r.result || ''}</td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function confirmCsvImport() {
    try {
        if (!_csvParsedRows.length) {
            showNotification('Aucune ligne à importer', 'warning');
            return;
        }
        const prevWinrate = computeTeamWinrate();
        const validRows = _csvParsedRows.filter(r => r.date && r.map);
        team.matches = Array.isArray(team.matches) ? team.matches : [];
        validRows.forEach(r => {
            team.matches.push({
                date: r.date,
                map: r.map,
                opponent: r.opponent || '',
                score: r.score || '',
                result: r.result || '',
            });
        });
        if (typeof saveTeam === 'function') saveTeam();
        toggleImportCsvModal(false);
        showNotification(`${validRows.length} match(s) importé(s)`, 'success');
        try { loggerService?.logEvent('import_csv_confirm', { rows: validRows.length }); } catch {}
        // rafraîchir UI si onglet statistiques actif
        if (typeof updateStatisticsTab === 'function') {
            performance.clearMarks('stats-update-start');
            performance.clearMeasures('updateStatisticsTab');
            setTimeout(() => updateStatisticsTab(), 50);
        }
        try { triggerProgressNotifications(prevWinrate); } catch {}
    } catch (e) {
        console.error(e);
        try { loggerService?.logError(e, { action: 'import_csv' }); } catch {}
        showNotification('Erreur pendant l’import', 'error');
    }
}

function parseCSVText(text) {
    // Support virgule ou point-virgule; gestion simple des guillemets
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (!lines.length) return [];
    const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
    const parseLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"'; i++; // escape ""
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === delimiter && !inQuotes) {
                result.push(current); current = '';
            } else {
                current += ch;
            }
        }
        result.push(current);
        return result.map(s => s.trim());
    };
    const header = parseLine(lines[0]).map(h => h.toLowerCase());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = parseLine(lines[i]);
        rows.push({ header, cols });
    }
    return rows;
}

function normalizeMatchCsvRows(rows) {
    const out = [];
    rows.forEach(r => {
        const h = r.header;
        const get = (name) => {
            const idx = h.indexOf(name);
            return idx >= 0 ? r.cols[idx] : '';
        };
        // alias possibles
        const date = get('date') || get('datetime') || get('jour');
        const map = get('map') || get('carte');
        const opponent = get('opponent') || get('adversaire');
        const score = get('score') || get('resultat');
        const result = get('result') || get('issue');
        out.push({ date, map, opponent, score, result });
    });
    return out;
}
async function importFromCSV() {
    try {
        const result = await ipcRenderer.invoke('show-open-dialog', {
            title: 'Importer depuis CSV',
            filters: [
                { name: 'CSV', extensions: ['csv'] },
                { name: 'Tous les fichiers', extensions: ['*'] }
            ],
            properties: ['openFile']
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
            const fs = require('fs');
            const csvText = fs.readFileSync(result.filePaths[0], 'utf-8');
            
            if (!exportService) {
                exportService = new ExportService();
            }
            
            const importedTeam = await exportService.importFromCSV(csvText);
            
            // Valider les données importées
            if (validationService && importedTeam) {
                const teamData = importedTeam.toJSON ? importedTeam.toJSON() : importedTeam;
                const validation = validationService.validateTeam(teamData);
                
                if (!validation.valid) {
                    console.error('❌ Erreurs de validation après import CSV:', validation.errors);
                    if (notificationService) {
                        notificationService.show('Erreurs de validation détectées après l\'import. Voir la console.', 'error');
                    }
                    
                    // Essayer de nettoyer
                    const sanitized = validationService.sanitizeTeam(teamData);
                    if (sanitized) {
                        importedTeam = Team.fromJSON(sanitized);
                        if (notificationService) {
                            notificationService.show('Données corrigées automatiquement', 'warning');
                        }
                    } else {
                        throw new Error('Impossible de corriger les données importées');
                    }
                } else if (validation.warnings.length > 0) {
                    console.warn('⚠️ Avertissements après import CSV:', validation.warnings);
                }
            }
            
            team = importedTeam instanceof Team ? importedTeam : Team.fromJSON(importedTeam);
            currentTeamPath = null;
            updateAllTabs();
            showNotification('Import CSV réussi', 'success');
        }
    } catch (error) {
        console.error('Erreur lors de l\'import CSV:', error);
        showNotification('Erreur lors de l\'import CSV: ' + error.message, 'error');
    }
}

async function exportTeamToPath(filePath) {
    try {
        await ipcRenderer.invoke('save-team', team.toJSON(), filePath);
        showNotification('Équipe exportée avec succès', 'success');
    } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        showNotification('Erreur lors de l\'export: ' + error.message, 'error');
    }
}

// =========================================
// MISE À JOUR DE L'INTERFACE
// =========================================

function updateAllTabs() {
    updateHomeTab();
    updatePlayersTab();
    updateMatchesTab();
    updateStatisticsTab();
    updateProgressionTab();
    updateTeamName();
}

function updateTeamName() {
    document.getElementById('teamName').textContent = team.name;
    document.getElementById('homeTeamName').textContent = team.name;
    document.getElementById('infoTeamName').textContent = team.name;
}

function updateHomeTab() {
    const playersCount = team.players.length;
    const matchesCount = team.matches.length;
    const victories = team.matches.filter(m => m.result === 'win' || m.result === 'Victoire').length;
    const defeats = team.matches.filter(m => m.result === 'loss' || m.result === 'Défaite').length;
    const totalMatches = victories + defeats;
    const winrate = totalMatches > 0 ? Math.round((victories / totalMatches) * 100 * 10) / 10 : 0;
    const lossrate = totalMatches > 0 ? Math.round((defeats / totalMatches) * 100 * 10) / 10 : 0;
    
    document.getElementById('infoPlayersCount').textContent = playersCount;
    document.getElementById('infoMatchesCount').textContent = matchesCount;
    document.getElementById('infoVictories').textContent = victories;
    document.getElementById('infoWinrate').textContent = winrate;
    document.getElementById('infoDefeats').textContent = defeats;
    document.getElementById('infoLossrate').textContent = lossrate;
    
    // Mettre à jour les statistiques rapides
    const quickStats = document.getElementById('quickStats');
    if (totalMatches > 0) {
        quickStats.innerHTML = `
            <div class="quick-stat-card">
                <div class="stat-value">${victories}</div>
                <div class="stat-label">Victoires (${winrate}%)</div>
            </div>
            <div class="quick-stat-card">
                <div class="stat-value">${defeats}</div>
                <div class="stat-label">Défaites (${lossrate}%)</div>
            </div>
            <div class="quick-stat-card">
                <div class="stat-value">${playersCount}</div>
                <div class="stat-label">Joueurs actifs</div>
            </div>
            <div class="quick-stat-card">
                <div class="stat-value">${matchesCount}</div>
                <div class="stat-label">Matchs au total</div>
            </div>
        `;
    } else {
        quickStats.innerHTML = `
            <div class="quick-stat-card">
                <div class="stat-value">${playersCount}</div>
                <div class="stat-label">Joueurs actifs</div>
            </div>
            <div class="quick-stat-card">
                <div class="stat-value">0</div>
                <div class="stat-label">Aucun match joué</div>
            </div>
        `;
    }
}

// =========================================
// GESTION DES JOUEURS
// =========================================

function addPlayerFromFields() {
    const name = document.getElementById('playerNameInput').value.trim();
    const agent = document.getElementById('playerAgentSelect').value;
    const role = document.getElementById('playerRoleSelect').value;
    const rank = document.getElementById('playerRankSelect').value;
    
    if (!name || !agent || !role || !rank) {
        showNotification('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    if (team.players.some(p => p.name === name)) {
        showNotification(`Un joueur avec le nom "${name}" existe déjà`, 'error');
        return;
    }
    
    const player = new Player(name, agent, role, rank);
    team.addPlayer(player);
    
    // Vider les champs
    document.getElementById('playerNameInput').value = '';
    document.getElementById('playerAgentSelect').value = '';
    document.getElementById('playerRoleSelect').value = '';
    document.getElementById('playerRankSelect').value = '';
    
    updatePlayersTab();
    updateHomeTab();
    saveTeam();
    showNotification(`Joueur ${name} ajouté avec succès`, 'success');
}

function updatePlayersTab() {
    const list = document.getElementById('playersList');
    const searchInput = document.getElementById('playerSearchInput');
    const filterRole = document.getElementById('playerFilterRole');
    const filterRank = document.getElementById('playerFilterRank');
    const filterAgent = document.getElementById('playerFilterAgent');
    const clearBtn = document.getElementById('clearPlayerSearchBtn');
    
    // Obtenir les filtres
    const filters = {
        search: searchInput ? searchInput.value : '',
        role: filterRole ? filterRole.value : 'all',
        rank: filterRank ? filterRank.value : 'all',
        agent: filterAgent ? filterAgent.value : 'all',
        map: 'all'
    };
    
    // Filtrer les joueurs
    let filteredPlayers = team.players;
    if (searchService) {
        filteredPlayers = searchService.filterPlayers(team.players, filters);
    }
    
    // Afficher/masquer le bouton de nettoyage
    if (clearBtn) {
        clearBtn.style.display = (filters.search || filters.role !== 'all' || filters.rank !== 'all' || filters.agent !== 'all') ? 'block' : 'none';
    }
    
    list.innerHTML = '';
    
    // Afficher le nombre de résultats
    if (filteredPlayers.length !== team.players.length) {
        const resultsCount = document.createElement('div');
        resultsCount.className = 'results-count';
        resultsCount.textContent = `${filteredPlayers.length} joueur(s) trouvé(s) sur ${team.players.length}`;
        list.appendChild(resultsCount);
    }
    
    if (filteredPlayers.length === 0) {
        if (team.players.length === 0) {
            list.innerHTML = '<p class="empty-message">Aucun joueur enregistré. Ajoutez un nouveau joueur ci-dessus.</p>';
        } else {
            list.innerHTML = '<p class="empty-message">Aucun joueur ne correspond aux critères de recherche.</p>';
        }
        // Masquer l'affichage des agents si aucun joueur ne correspond
        const agentsDisplay = document.getElementById('playerAgentsDisplay');
        if (agentsDisplay) {
            agentsDisplay.style.display = 'none';
        }
        return;
    }
    
    filteredPlayers.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        if (selectedPlayer === player) {
            item.classList.add('selected');
        }
        item.innerHTML = `
            <div class="item-content">
                <span class="item-icon">👤</span>
                <span class="item-text">
                    <strong>${player.name}</strong> - Agent: ${player.agent} | Rôle: ${player.role} | Rang: ${player.rank}
                </span>
            </div>
        `;
        item.addEventListener('click', () => {
            selectedPlayer = player;
            updatePlayersTab();
            updatePlayerAgentsDisplay();
        });
        list.appendChild(item);
    });
    
    // Mettre à jour l'affichage des agents si un joueur est sélectionné
    if (selectedPlayer) {
        updatePlayerAgentsDisplay();
    } else {
        const agentsDisplay = document.getElementById('playerAgentsDisplay');
        if (agentsDisplay) {
            agentsDisplay.style.display = 'none';
        }
    }
}

function updatePlayerAgentsDisplay() {
    const agentsDisplay = document.getElementById('playerAgentsDisplay');
    const agentsContent = document.getElementById('playerAgentsContent');
    const agentsTitle = document.getElementById('playerAgentsTitle');
    
    if (!selectedPlayer || !agentsDisplay || !agentsContent) {
        return;
    }
    
    // Afficher la section
    agentsDisplay.style.display = 'block';
    agentsTitle.textContent = `🎯 Agents de ${selectedPlayer.name} par Map`;
    
    // Vider le contenu
    agentsContent.innerHTML = '';
    
    // Vérifier si le joueur a des agents configurés
    const hasAgents = selectedPlayer.known_agents && Object.keys(selectedPlayer.known_agents).length > 0;
    
    if (!hasAgents) {
        agentsContent.innerHTML = `
            <div class="empty-agents-message">
                <p>Aucun agent configuré pour ce joueur.</p>
                <p>Cliquez sur "🎯 Éditer Agents" pour configurer les agents par map.</p>
            </div>
        `;
        return;
    }
    
    // Créer une grille pour afficher les agents par map
    const agentsGrid = document.createElement('div');
    agentsGrid.className = 'player-agents-grid';
    
    // Parcourir toutes les maps et afficher les agents du joueur
    ALL_MAPS.forEach(mapName => {
        const agents = selectedPlayer.known_agents[mapName] || [];
        
        const mapCard = document.createElement('div');
        mapCard.className = 'map-agent-card';
        
        const mapHeader = document.createElement('div');
        mapHeader.className = 'map-agent-header';
        mapHeader.innerHTML = `<span class="map-icon">🗺️</span> <strong>${mapName}</strong>`;
        
        const agentsList = document.createElement('div');
        agentsList.className = 'map-agents-list';
        
        if (agents.length === 0) {
            agentsList.innerHTML = '<span class="no-agents">Aucun agent</span>';
        } else {
            agents.forEach(agent => {
                const agentItem = document.createElement('div');
                agentItem.className = 'map-agent-item';
                
                const imagePath = getAgentImagePath(agent);
                
                agentItem.innerHTML = `
                    <div class="map-agent-image-container">
                        <img src="${imagePath}" alt="${agent}" class="map-agent-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <div class="map-agent-image-placeholder" style="display: none;">🎭</div>
                    </div>
                    <span class="map-agent-name">${agent}</span>
                `;
                
                agentsList.appendChild(agentItem);
            });
        }
        
        mapCard.appendChild(mapHeader);
        mapCard.appendChild(agentsList);
        agentsGrid.appendChild(mapCard);
    });
    
    agentsContent.appendChild(agentsGrid);
}

function editPlayer() {
    if (!selectedPlayer) {
        showNotification('Veuillez sélectionner un joueur à modifier', 'error');
        return;
    }
    
    showPlayerModal(selectedPlayer);
}

function deletePlayer() {
    if (!selectedPlayer) {
        showNotification('Veuillez sélectionner un joueur à supprimer', 'error');
        return;
    }
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer le joueur ${selectedPlayer.name} ?`)) {
        team.players = team.players.filter(p => p !== selectedPlayer);
        selectedPlayer = null;
        updatePlayersTab();
        updateHomeTab();
        saveTeam();
        showNotification('Joueur supprimé avec succès', 'success');
    }
}

function showPlayerModal(player = null) {
    const modal = document.getElementById('playerModal');
    const title = document.getElementById('playerModalTitle');
    const body = document.getElementById('playerModalBody');
    
    title.textContent = player ? `Modifier ${player.name}` : 'Ajouter un Joueur';
    
    body.innerHTML = `
        <div class="form-group">
            <label>Nom:</label>
            <input type="text" id="modalPlayerName" value="${player ? player.name : ''}" required>
        </div>
        <div class="form-group">
            <label>Agent:</label>
            <select id="modalPlayerAgent">${ALL_AGENTS.map(a => `<option value="${a}" ${player && player.agent === a ? 'selected' : ''}>${a}</option>`).join('')}</select>
        </div>
        <div class="form-group">
            <label>Rôle:</label>
            <select id="modalPlayerRole">
                <option value="">Sélectionner...</option>
                <option value="Duelist" ${player && player.role === 'Duelist' ? 'selected' : ''}>Duelist</option>
                <option value="Initiator" ${player && player.role === 'Initiator' ? 'selected' : ''}>Initiator</option>
                <option value="Controller" ${player && player.role === 'Controller' ? 'selected' : ''}>Controller</option>
                <option value="Sentinel" ${player && player.role === 'Sentinel' ? 'selected' : ''}>Sentinel</option>
            </select>
        </div>
        <div class="form-group">
            <label>Rang:</label>
            <select id="modalPlayerRank">
                <option value="">Sélectionner...</option>
                <option value="Iron" ${player && player.rank === 'Iron' ? 'selected' : ''}>Iron</option>
                <option value="Bronze" ${player && player.rank === 'Bronze' ? 'selected' : ''}>Bronze</option>
                <option value="Silver" ${player && player.rank === 'Silver' ? 'selected' : ''}>Silver</option>
                <option value="Gold" ${player && player.rank === 'Gold' ? 'selected' : ''}>Gold</option>
                <option value="Platinum" ${player && player.rank === 'Platinum' ? 'selected' : ''}>Platinum</option>
                <option value="Diamond" ${player && player.rank === 'Diamond' ? 'selected' : ''}>Diamond</option>
                <option value="Ascendant" ${player && player.rank === 'Ascendant' ? 'selected' : ''}>Ascendant</option>
                <option value="Immortal" ${player && player.rank === 'Immortal' ? 'selected' : ''}>Immortal</option>
                <option value="Radiant" ${player && player.rank === 'Radiant' ? 'selected' : ''}>Radiant</option>
            </select>
        </div>
        <div class="modal-actions">
            <button class="btn-primary" id="savePlayerBtn">💾 Enregistrer</button>
            <button class="btn-secondary" id="cancelPlayerBtn">❌ Annuler</button>
        </div>
    `;
    
    document.getElementById('savePlayerBtn').addEventListener('click', () => {
        const name = document.getElementById('modalPlayerName').value.trim();
        const agent = document.getElementById('modalPlayerAgent').value;
        const role = document.getElementById('modalPlayerRole').value;
        const rank = document.getElementById('modalPlayerRank').value;
        
        if (!name || !agent || !role || !rank) {
            showNotification('Veuillez remplir tous les champs', 'error');
            return;
        }
        
        if (player) {
            // Modifier le joueur existant
            player.name = name;
            player.agent = agent;
            player.role = role;
            player.rank = rank;
            showNotification(`Joueur ${name} modifié avec succès`, 'success');
        } else {
            // Ajouter un nouveau joueur
            if (team.players.some(p => p.name === name)) {
                showNotification(`Un joueur avec le nom "${name}" existe déjà`, 'error');
                return;
            }
            const newPlayer = new Player(name, agent, role, rank);
            team.addPlayer(newPlayer);
            showNotification(`Joueur ${name} ajouté avec succès`, 'success');
        }
        
        modal.classList.remove('show');
        updatePlayersTab();
        updateHomeTab();
        saveTeam();
    });
    
    document.getElementById('cancelPlayerBtn').addEventListener('click', () => {
        modal.classList.remove('show');
    });
    
    modal.classList.add('show');
}

function editAgents() {
    if (team.players.length === 0) {
        showNotification('Aucun joueur dans l\'équipe', 'error');
        return;
    }
    
    showAgentsModal();
}

function showAgentsModal() {
    const modal = document.getElementById('agentsModal');
    const body = document.getElementById('agentsModalBody');
    
    let currentPlayerIndex = 0;
    let currentMap = ALL_MAPS[0];
    
    function updateAgentsDisplay() {
        const currentPlayer = team.players[currentPlayerIndex];
        const knownAgents = currentPlayer.known_agents[currentMap] || [];
        
        body.innerHTML = `
            <div class="agents-controls">
                <div class="form-group">
                    <label>Joueur:</label>
                    <select id="agentsPlayerSelect">
                        ${team.players.map((p, i) => `<option value="${i}" ${i === currentPlayerIndex ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Map:</label>
                    <select id="agentsMapSelect">
                        ${ALL_MAPS.map(m => `<option value="${m}" ${m === currentMap ? 'selected' : ''}>${m}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="agents-grid" id="agentsGrid"></div>
            <div class="modal-actions">
                <button class="btn-primary" id="saveAgentsBtn">💾 Sauvegarder</button>
                <button class="btn-secondary" id="cancelAgentsBtn">❌ Annuler</button>
            </div>
        `;
        
        const grid = document.getElementById('agentsGrid');
        ALL_AGENTS.forEach(agent => {
            const agentItem = document.createElement('div');
            agentItem.className = 'agent-item';
            
            const imagePath = getAgentImagePath(agent);
            
            agentItem.innerHTML = `
                <div class="agent-image-container">
                    <img src="${imagePath}" alt="${agent}" class="agent-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div class="agent-image-placeholder" style="display: none;">🎭</div>
                </div>
                <div class="agent-checkbox">
                    <input type="checkbox" id="agent_${agent}" ${knownAgents.includes(agent) ? 'checked' : ''}>
                    <label for="agent_${agent}">${agent}</label>
                </div>
            `;
            
            // Ajouter un gestionnaire d'événement pour le clic sur l'image
            const checkbox = agentItem.querySelector(`#agent_${agent}`);
            agentItem.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
                    checkbox.checked = !checkbox.checked;
                }
            });
            
            grid.appendChild(agentItem);
        });
        
        document.getElementById('agentsPlayerSelect').addEventListener('change', (e) => {
            currentPlayerIndex = parseInt(e.target.value);
            updateAgentsDisplay();
        });
        
        document.getElementById('agentsMapSelect').addEventListener('change', (e) => {
            currentMap = e.target.value;
            updateAgentsDisplay();
        });
        
        document.getElementById('saveAgentsBtn').addEventListener('click', () => {
            const currentPlayer = team.players[currentPlayerIndex];
            if (!currentPlayer.known_agents[currentMap]) {
                currentPlayer.known_agents[currentMap] = [];
            }
            currentPlayer.known_agents[currentMap] = [];
            
            ALL_AGENTS.forEach(agent => {
                const checkbox = document.getElementById(`agent_${agent}`);
                if (checkbox.checked) {
                    currentPlayer.known_agents[currentMap].push(agent);
                }
            });
            
            modal.classList.remove('show');
            saveTeam();
            showNotification('Agents sauvegardés avec succès', 'success');
            
            // Mettre à jour l'affichage des agents du joueur si un joueur est sélectionné
            if (selectedPlayer) {
                updatePlayerAgentsDisplay();
            }
        });
        
        document.getElementById('cancelAgentsBtn').addEventListener('click', () => {
            modal.classList.remove('show');
        });
    }
    
    updateAgentsDisplay();
    modal.classList.add('show');
}

// =========================================
// GESTION DES MATCHS
// =========================================

function addMatchFromFields() {
    const date = document.getElementById('matchDateInput').value.trim();
    const map = document.getElementById('matchMapSelect').value;
    const opponent = document.getElementById('matchOpponentInput').value.trim();
    
    if (!date || !map || !opponent) {
        showNotification('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    const match = new Match(date, map, opponent);
    
    // Ajouter 24 rounds par défaut
    for (let i = 1; i <= 24; i++) {
        match.rounds.push(new Round(i));
    }
    
    team.addMatch(match);
    
    // Vider les champs
    document.getElementById('matchDateInput').value = '';
    document.getElementById('matchMapSelect').value = '';
    document.getElementById('matchOpponentInput').value = '';
    
    updateMatchesTab();
    updateHomeTab();
    saveTeam();
    try { scheduleMatchReminders(); } catch {}
    try { notificationService?.checkAgentPerformance?.(team, notificationService?.settings?.agentMinWinrate || 40); } catch {}
    showNotification('Match ajouté avec succès. Utilisez le bouton "✏️ Rounds" pour configurer les détails.', 'success');
}

function updateMatchesTab() {
    const list = document.getElementById('matchesList');
    const searchInput = document.getElementById('matchSearchInput');
    const filterMap = document.getElementById('matchFilterMap');
    const filterResult = document.getElementById('matchFilterResult');
    const filterOpponent = document.getElementById('matchFilterOpponent');
    const filterDateFrom = document.getElementById('matchFilterDateFrom');
    const filterDateTo = document.getElementById('matchFilterDateTo');
    const sortBy = document.getElementById('matchSortBy');
    const sortOrder = document.getElementById('matchSortOrder');
    const clearBtn = document.getElementById('clearMatchSearchBtn');
    
    // Obtenir les filtres
    const filters = {
        search: searchInput ? searchInput.value : '',
        map: filterMap ? filterMap.value : 'all',
        result: filterResult ? filterResult.value : 'all',
        opponent: filterOpponent ? filterOpponent.value : '',
        dateFrom: filterDateFrom ? filterDateFrom.value : '',
        dateTo: filterDateTo ? filterDateTo.value : '',
        sortBy: sortBy ? sortBy.value : 'date',
        sortOrder: sortOrder ? sortOrder.value : 'desc'
    };
    
    // Filtrer les matchs
    let filteredMatches = team.matches;
    if (searchService) {
        filteredMatches = searchService.filterMatches(team.matches, filters);
    }
    
    // Afficher/masquer le bouton de nettoyage
    if (clearBtn) {
        const hasFilters = filters.search || filters.map !== 'all' || filters.result !== 'all' || 
                          filters.opponent || filters.dateFrom || filters.dateTo;
        clearBtn.style.display = hasFilters ? 'block' : 'none';
    }
    
    list.innerHTML = '';
    
    // Afficher le nombre de résultats
    if (filteredMatches.length !== team.matches.length) {
        const resultsCount = document.createElement('div');
        resultsCount.className = 'results-count';
        resultsCount.textContent = `${filteredMatches.length} match(s) trouvé(s) sur ${team.matches.length}`;
        resultsCount.style.marginBottom = '15px';
        resultsCount.style.color = 'var(--text-secondary)';
        resultsCount.style.fontSize = '14px';
        list.appendChild(resultsCount);
    }
    
    if (filteredMatches.length === 0) {
        if (team.matches.length === 0) {
            list.innerHTML = '<p class="empty-message">Aucun match enregistré. Ajoutez un nouveau match ci-dessus.</p>';
        } else {
            list.innerHTML = '<p class="empty-message">Aucun match ne correspond aux critères de recherche.</p>';
        }
        return;
    }
    
    // Trier les matchs par date (plus récent en premier) si pas de tri personnalisé
    const sortedMatches = [...filteredMatches].sort((a, b) => {
        try {
            const dateA = parseDate(a.date);
            const dateB = parseDate(b.date);
            return dateB - dateA;
        } catch {
            return 0;
        }
    });
    
    sortedMatches.forEach(match => {
        const ourWins = match.rounds.filter(r => r.winner === 'Nous').length;
        const oppWins = match.rounds.filter(r => r.winner === 'Adversaire').length;
        const score = (ourWins > 0 || oppWins > 0) ? `${ourWins}-${oppWins}` : 'Non joué';
        const result = ourWins > oppWins ? 'Victoire' : (ourWins < oppWins ? 'Défaite' : (ourWins === 0 && oppWins === 0 ? 'À configurer' : 'Nul'));
        
        const item = document.createElement('div');
        item.className = 'list-item';
        if (selectedMatch === match) {
            item.classList.add('selected');
        }
        item.innerHTML = `
            <div class="item-content">
                <span class="item-icon">📊</span>
                <span class="item-text">
                    <strong>${match.date}</strong> - ${match.map} vs ${match.opponent} (${score}) - ${result}
                </span>
                <button class="btn-small" data-action="edit-rounds" data-match-index="${team.matches.indexOf(match)}">✏️ Rounds</button>
            </div>
        `;
        item.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                selectedMatch = match;
                updateMatchesTab();
            }
        });
        
        item.querySelector('[data-action="edit-rounds"]').addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(e.target.dataset.matchIndex);
            showMatchEditor(team.matches[index]);
        });
        
        list.appendChild(item);
    });
}

function parseDate(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return new Date(0);
}

function deleteSelectedMatch() {
    if (!selectedMatch) {
        showNotification('Veuillez sélectionner un match à supprimer', 'error');
        return;
    }
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer le match ${selectedMatch.date} vs ${selectedMatch.opponent} ?`)) {
        team.matches = team.matches.filter(m => m !== selectedMatch);
        selectedMatch = null;
        updateMatchesTab();
        updateHomeTab();
        saveTeam();
        try { scheduleMatchReminders(); } catch {}
        try { notificationService?.checkAgentPerformance?.(team, notificationService?.settings?.agentMinWinrate || 40); } catch {}
        showNotification('Match supprimé avec succès', 'success');
    }
}

function showMatchEditor(match) {
    const modal = document.getElementById('matchModal');
    const body = document.getElementById('matchModalBody');
    // Normaliser la structure des rounds pour éviter les erreurs et permettre l'ajout d'overtime
    if (!Array.isArray(match.rounds)) {
        match.rounds = Array.isArray(match.rounds?.rounds) ? match.rounds.rounds : [];
    }
    
    document.getElementById('matchModalTitle').textContent = `📊 Éditeur de Match - ${match.date} vs ${match.opponent}`;
    
    body.innerHTML = `
        <div class="match-info-editor">
            <div class="form-group">
                <label>Date:</label>
                <input type="text" id="editMatchDate" value="${match.date}">
            </div>
            <div class="form-group">
                <label>Map:</label>
                <select id="editMatchMap">${ALL_MAPS.map(m => `<option value="${m}" ${match.map === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
            </div>
            <div class="form-group">
                <label>Adversaire:</label>
                <input type="text" id="editMatchOpponent" value="${match.opponent}">
            </div>
            <div class="form-group">
                <label>Score:</label>
                <input type="text" id="editMatchScore" value="${match.score || ''}" placeholder="13-11">
            </div>
        </div>
        <div class="players-stats-editor">
            <h4>👥 Joueurs & Statistiques</h4>
            <div class="modern-table-container">
                <div class="table-wrapper">
                    <table class="modern-stats-table" id="playersStatsTable">
                        <thead>
                            <tr>
                                <th><span class="table-icon">👥</span> Équipe</th>
                                <th><span class="table-icon">🏷️</span> Nom</th>
                                <th><span class="table-icon">⚔️</span> K</th>
                                <th><span class="table-icon">💀</span> D</th>
                                <th><span class="table-icon">🤝</span> A</th>
                                <th><span class="table-icon">📊</span> ACS</th>
                                <th><span class="table-icon">💰</span> Éco</th>
                                <th><span class="table-icon">🩸</span> 1ers sangs</th>
                                <th><span class="table-icon">💣</span> Poses</th>
                                <th><span class="table-icon">✂️</span> Désamorçages</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="rounds-editor">
            <h4>🎯 Détail des Rounds</h4>
            <div class="rounds-table" id="roundsTable"></div>
            <button class="btn-secondary" id="addOvertimeBtn" type="button">➕ Ajouter Rounds Overtime</button>
        </div>
        <div class="modal-actions">
            <button class="btn-primary" id="saveMatchBtn">💾 Enregistrer</button>
            <button class="btn-secondary" id="cancelMatchBtn">❌ Annuler</button>
        </div>
    `;
    // Remplir tableau joueurs
    const psTbody = body.querySelector('#playersStatsTable tbody');
    const ps = Array.isArray(match.playersStats) ? match.playersStats : [];
    const rowsCount = Math.max(10, ps.length);
    for (let i = 0; i < rowsCount; i++) {
        const r = ps[i] || { team: i < 5 ? 'A' : 'B', name: '', k: '', d: '', a: '', acs: '', eco: '', firstBloods: '', plants: '', defuses: '' };
        const tr = document.createElement('tr');
        tr.className = 'stats-row';
        tr.innerHTML = `
            <td>
                <select class="ps-team modern-select-small">
                    <option value="A" ${r.team === 'A' ? 'selected' : ''}>Équipe A</option>
                    <option value="B" ${r.team === 'B' ? 'selected' : ''}>Équipe B</option>
                </select>
            </td>
            <td><input type="text" class="ps-name modern-input" value="${r.name || ''}" placeholder="Nom du joueur"></td>
            <td><input type="number" class="ps-k modern-input-number" value="${r.k ?? ''}" min="0" placeholder="0"></td>
            <td><input type="number" class="ps-d modern-input-number" value="${r.d ?? ''}" min="0" placeholder="0"></td>
            <td><input type="number" class="ps-a modern-input-number" value="${r.a ?? ''}" min="0" placeholder="0"></td>
            <td><input type="number" class="ps-acs modern-input-number" value="${r.acs ?? ''}" min="0" placeholder="0"></td>
            <td><input type="number" class="ps-eco modern-input-number" value="${r.eco ?? ''}" step="1" placeholder="0"></td>
            <td><input type="number" class="ps-fb modern-input-number" value="${r.firstBloods ?? ''}" min="0" placeholder="0"></td>
            <td><input type="number" class="ps-plants modern-input-number" value="${r.plants ?? ''}" min="0" placeholder="0"></td>
            <td><input type="number" class="ps-defuses modern-input-number" value="${r.defuses ?? ''}" min="0" placeholder="0"></td>
        `;
        psTbody.appendChild(tr);
    }
    
    const roundsTable = document.getElementById('roundsTable');
    roundsTable.innerHTML = `
        <div class="rounds-header">
            <div>Round</div>
            <div>Gagnant</div>
            <div>Côté</div>
            <div>Type</div>
            <div>Note</div>
        </div>
    `;

    const renderRoundRow = (round) => {
        const row = document.createElement('div');
        row.className = 'round-row';
        row.innerHTML = `
            <div>${round.round_number}</div>
            <select class="round-winner">
                <option value="">-</option>
                <option value="Nous" ${round.winner === 'Nous' ? 'selected' : ''}>Nous</option>
                <option value="Adversaire" ${round.winner === 'Adversaire' ? 'selected' : ''}>Adversaire</option>
            </select>
            <select class="round-side">
                <option value="">-</option>
                <option value="Attaque" ${round.side === 'Attaque' ? 'selected' : ''}>Attaque</option>
                <option value="Défense" ${round.side === 'Défense' ? 'selected' : ''}>Défense</option>
            </select>
            <select class="round-type">
                <option value="">-</option>
                <option value="Gun" ${round.type === 'Gun' ? 'selected' : ''}>Gun</option>
                <option value="Eco" ${round.type === 'Eco' ? 'selected' : ''}>Eco</option>
                <option value="Anti-eco" ${round.type === 'Anti-eco' ? 'selected' : ''}>Anti-eco</option>
                <option value="Bonus" ${round.type === 'Bonus' ? 'selected' : ''}>Bonus</option>
                <option value="Full Buy" ${round.type === 'Full Buy' ? 'selected' : ''}>Full Buy</option>
                <option value="Force Buy" ${round.type === 'Force Buy' ? 'selected' : ''}>Force Buy</option>
            </select>
            <textarea class="round-note" rows="3" placeholder="Notes détaillées sur ce round...">${round.note || ''}</textarea>
        `;
        roundsTable.appendChild(row);
    };

    match.rounds.forEach(renderRoundRow);
    
    const addOvertimeBtn = document.getElementById('addOvertimeBtn');
    if (addOvertimeBtn) {
        addOvertimeBtn.onclick = () => {
            // S’assurer que le tableau rounds existe
            if (!Array.isArray(match.rounds)) match.rounds = [];
            const lastNumber = match.rounds.length > 0
                ? (match.rounds[match.rounds.length - 1].round_number || match.rounds.length)
                : 0;
            const nextNumber = lastNumber + 1;
            const r = new Round(nextNumber, '', '', '', '');
            match.rounds.push(r);
            renderRoundRow(r);
        };
    }
    
    document.getElementById('saveMatchBtn').addEventListener('click', () => {
        match.date = document.getElementById('editMatchDate').value;
        match.map = document.getElementById('editMatchMap').value;
        match.opponent = document.getElementById('editMatchOpponent').value;
        match.score = document.getElementById('editMatchScore').value || match.score;
        
        // Sauvegarder stats joueurs
        const psRows = body.querySelectorAll('#playersStatsTable tbody tr');
        match.playersStats = Array.from(psRows).map(tr => ({
            team: tr.querySelector('.ps-team').value || 'A',
            name: tr.querySelector('.ps-name').value.trim(),
            k: toIntOrNull(tr.querySelector('.ps-k').value),
            d: toIntOrNull(tr.querySelector('.ps-d').value),
            a: toIntOrNull(tr.querySelector('.ps-a').value),
            acs: toIntOrNull(tr.querySelector('.ps-acs').value),
            eco: toIntOrNull(tr.querySelector('.ps-eco').value),
            firstBloods: toIntOrNull(tr.querySelector('.ps-fb').value),
            plants: toIntOrNull(tr.querySelector('.ps-plants').value),
            defuses: toIntOrNull(tr.querySelector('.ps-defuses').value)
        })).filter(r => r.name); // garder lignes nommées
        
        const rows = roundsTable.querySelectorAll('.round-row');
        rows.forEach((row, index) => {
            if (index < match.rounds.length) {
                match.rounds[index].winner = row.querySelector('.round-winner').value;
                match.rounds[index].side = row.querySelector('.round-side').value;
                match.rounds[index].type = row.querySelector('.round-type').value;
                const noteElement = row.querySelector('.round-note');
                match.rounds[index].note = noteElement ? noteElement.value : '';
            }
        });
        
        // Recalculer le score et le résultat
        const ourWins = match.rounds.filter(r => r.winner === 'Nous').length;
        const oppWins = match.rounds.filter(r => r.winner === 'Adversaire').length;
        
        if (ourWins > 0 || oppWins > 0) {
            match.score = `${ourWins}-${oppWins}`;
            match.result = ourWins > oppWins ? 'Victoire' : (ourWins < oppWins ? 'Défaite' : 'Nul');
        } else {
            match.score = '';
            match.result = '';
        }
        
        modal.classList.remove('show');
        updateMatchesTab();
        updateHomeTab();
        saveTeam();
        showNotification('Match enregistré avec succès', 'success');
    });
    
    document.getElementById('cancelMatchBtn').addEventListener('click', () => {
        modal.classList.remove('show');
    });
    
    modal.classList.add('show');
}

function toIntOrNull(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

// =========================================
// STATISTIQUES
// =========================================

// =========================================
// COMPARAISON D'ÉQUIPES
// =========================================
function onComparisonTeamBSelected(e) {
    try {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const json = JSON.parse(String(reader.result || '{}'));
                // Accepte format Team.toJSON() direct ou fichier brut déjà conforme
                comparisonTeamB = Team.fromJSON ? Team.fromJSON(json) : json;
                updateComparisonTab();
                showNotification('Équipe B importée', 'success');
            } catch (err) {
                console.error(err);
                showNotification('Fichier invalide', 'error');
            }
        };
        reader.readAsText(file, 'utf-8');
    } catch (err) {
        console.error(err);
        showNotification('Erreur lecture du fichier', 'error');
    }
}

function getTeamKPIs(t) {
    const playersCount = t?.players?.length || 0;
    const matchesCount = t?.matches?.length || 0;
    const wins = (t?.matches || []).filter(m => (m.result || '').toLowerCase() === 'win' || m.result === 'Victoire').length;
    const defeats = (t?.matches || []).filter(m => (m.result || '').toLowerCase() === 'loss' || m.result === 'Défaite' || m.result === 'defaite').length;
    const winrate = matchesCount > 0 ? Math.round((wins / matchesCount) * 1000) / 10 : 0;
    return { name: t?.name || '-', playersCount, matchesCount, wins, defeats, winrate };
}

async function ensurePlotly() {
    if (typeof Plotly !== 'undefined') return;
    await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.plot.ly/plotly-2.26.0.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

async function updateComparisonTab() {
    // Renseigner le nom de l'équipe A
    const teamAInput = document.getElementById('comparisonTeamAName');
    if (teamAInput) teamAInput.value = team?.name || '';

    const cardA = document.getElementById('comparisonTeamACard');
    const cardB = document.getElementById('comparisonTeamBCard');
    if (cardA) cardA.innerHTML = '';
    if (cardB) cardB.innerHTML = '';

    const a = getTeamKPIs(team);
    const b = comparisonTeamB ? getTeamKPIs(comparisonTeamB) : null;

    const renderCard = (el, k) => {
        if (!el) return;
        el.innerHTML = `
            <table class="table">
                <tr><th>Nom</th><td>${k.name}</td></tr>
                <tr><th>Joueurs</th><td>${k.playersCount}</td></tr>
                <tr><th>Matchs</th><td>${k.matchesCount}</td></tr>
                <tr><th>Victoires</th><td>${k.wins}</td></tr>
                <tr><th>Défaites</th><td>${k.defeats}</td></tr>
                <tr><th>Winrate</th><td>${k.winrate}%</td></tr>
            </table>
        `;
    };

    renderCard(cardA, a);
    if (b) renderCard(cardB, b); else if (cardB) cardB.innerHTML = '<em>Importez une équipe pour comparer.</em>';

    // Graphique comparatif
    try {
        await ensurePlotly();
        const chartDiv = document.getElementById('comparisonChart');
        if (chartDiv) {
            const typeSel = document.getElementById('comparisonChartType');
            const chartType = typeSel?.value || 'grouped';
            renderComparisonChart(chartType, a, b);
            if (typeSel) {
                // Retirer l'ancien listener s'il existe
                if (typeSel._wired) {
                    typeSel.removeEventListener('change', typeSel._changeHandler);
                }
                // Créer un nouveau handler
                typeSel._changeHandler = () => {
                    const newA = getTeamKPIs(team);
                    const newB = comparisonTeamB ? getTeamKPIs(comparisonTeamB) : null;
                    renderComparisonChart(typeSel.value, newA, newB);
                };
                typeSel.addEventListener('change', typeSel._changeHandler);
                typeSel._wired = true;
            }
            
            // Attacher les événements pour les sélecteurs de match waterfall si nécessaire
            const waterfallSelectA = document.getElementById('comparisonWaterfallMatchSelectA');
            const waterfallSelectB = document.getElementById('comparisonWaterfallMatchSelectB');
            if (waterfallSelectA) {
                if (waterfallSelectA._changeHandler) {
                    waterfallSelectA.removeEventListener('change', waterfallSelectA._changeHandler);
                }
                waterfallSelectA._changeHandler = () => {
                    const newA = getTeamKPIs(team);
                    const newB = comparisonTeamB ? getTeamKPIs(comparisonTeamB) : null;
                    renderComparisonChart(typeSel?.value || 'grouped', newA, newB);
                };
                waterfallSelectA.addEventListener('change', waterfallSelectA._changeHandler);
                waterfallSelectA._wired = true;
            }
            if (waterfallSelectB) {
                if (waterfallSelectB._changeHandler) {
                    waterfallSelectB.removeEventListener('change', waterfallSelectB._changeHandler);
                }
                waterfallSelectB._changeHandler = () => {
                    const newA = getTeamKPIs(team);
                    const newB = comparisonTeamB ? getTeamKPIs(comparisonTeamB) : null;
                    renderComparisonChart(typeSel?.value || 'grouped', newA, newB);
                };
                waterfallSelectB.addEventListener('change', waterfallSelectB._changeHandler);
                waterfallSelectB._wired = true;
            }
        }
    } catch (e) {
        console.warn('Plotly indisponible pour comparaison', e);
    }
}

function renderComparisonChart(chartType, a, b) {
    const chartDiv = document.getElementById('comparisonChart');
    if (!chartDiv || !b) {
        if (chartDiv && !b) {
            chartDiv.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">Importez une équipe B pour comparer</div>';
        }
        return;
    }
    
    const teamAName = a.name || 'Équipe A';
    const teamBName = b?.name || 'Équipe B';

    // Gérer les sélecteurs de match pour waterfall si nécessaire
    const waterfallLabelA = document.getElementById('comparisonWaterfallMatchLabel');
    const waterfallLabelB = document.getElementById('comparisonWaterfallMatchLabelB');
    if (waterfallLabelA && waterfallLabelB) {
        if (chartType === 'waterfall') {
            waterfallLabelA.style.display = 'flex';
            waterfallLabelB.style.display = 'flex';
            updateComparisonWaterfallMatches(team, comparisonTeamB);
        } else {
            waterfallLabelA.style.display = 'none';
            waterfallLabelB.style.display = 'none';
        }
    }

    let data, layout;

    switch (chartType) {
        case 'radar':
            {
                const categories = ['Joueurs','Matchs','Victoires','Défaites','Winrate'];
                const valsA = [a.playersCount, a.matchesCount, a.wins, a.defeats, a.winrate];
                const valsB = [b.playersCount, b.matchesCount, b.wins, b.defeats, b.winrate];
                // Normalisation 0-100 par catégorie pour comparaison
                const norm = (va, vb) => {
                    return va.map((v, i) => {
                        const max = Math.max(v, vb[i], 1);
                        return Math.round((v / max) * 100);
                    });
                };
                const na = norm(valsA, valsB);
                const nb = norm(valsB, valsA);
                const traceA = { type: 'scatterpolar', r: na, theta: categories, fill: 'toself', name: teamAName, line: { color: '#4CAF50' } };
                const traceB = { type: 'scatterpolar', r: nb, theta: categories, fill: 'toself', name: teamBName, line: { color: '#FF4655' } };
                layout = { 
                    title: '📡 Radar Comparatif',
                    polar: { radialaxis: { visible: true, range: [0,100] } }, 
                    showlegend: true, 
                    margin: { t: 40 },
                    font: { size: 14 }
                };
                data = [traceA, traceB];
            }
            break;

        case 'stacked':
            {
                const x = [teamAName, teamBName];
                const yWins = [a.wins, b.wins];
                const yDefeats = [a.defeats, b.defeats];
                const traceWins = { x, y: yWins, type: 'bar', name: 'Victoires', marker: { color: '#4CAF50' } };
                const traceDefeats = { x, y: yDefeats, type: 'bar', name: 'Défaites', marker: { color: '#F44336' } };
                layout = { 
                    title: '📊 Barres Empilées - Victoires/Défaites',
                    barmode: 'stack', 
                    margin: { t: 40 },
                    font: { size: 14 },
                    showlegend: true
                };
                data = [traceWins, traceDefeats];
            }
            break;

        case 'grouped':
            {
                const labels = ['Victoires', 'Défaites', 'Matchs'];
                const dataA = [a.wins, a.defeats, a.matchesCount];
                const dataB = [b.wins, b.defeats, b.matchesCount];
                const traceA = { x: labels, y: dataA, type: 'bar', name: teamAName, marker: { color: '#4CAF50' } };
                const traceB = { x: labels, y: dataB, type: 'bar', name: teamBName, marker: { color: '#FF4655' } };
                layout = { 
                    title: '📊 Barres Groupées - Comparaison',
                    barmode: 'group', 
                    margin: { t: 40 },
                    font: { size: 14 },
                    showlegend: true
                };
                data = [traceA, traceB];
            }
            break;

        case 'winrate':
            ({ data, layout } = generateComparisonWinrateChart(a, b, teamAName, teamBName));
            break;

        case 'mapPerformance':
            ({ data, layout } = generateComparisonMapPerformanceChart(team, comparisonTeamB, teamAName, teamBName));
            break;

        case 'timeline':
            ({ data, layout } = generateComparisonTimelineChart(team, comparisonTeamB, teamAName, teamBName));
            break;

        case 'heatmap':
            ({ data, layout } = generateComparisonHeatmapChart(team, comparisonTeamB, teamAName, teamBName));
            break;

        case 'scoreDistribution':
            ({ data, layout } = generateComparisonScoreDistributionChart(team, comparisonTeamB, teamAName, teamBName));
            break;

        case 'boxplot':
            ({ data, layout } = generateComparisonBoxplotChart(team, comparisonTeamB, teamAName, teamBName));
            break;

        case 'stackedBar':
            ({ data, layout } = generateComparisonStackedBarChart(team, comparisonTeamB, teamAName, teamBName));
            break;

        case 'area':
            ({ data, layout } = generateComparisonAreaChart(team, comparisonTeamB, teamAName, teamBName));
            break;

        case 'pie':
            ({ data, layout } = generateComparisonPieChart(a, b, teamAName, teamBName));
            break;

        default:
            // Fallback vers grouped
            const labels = ['Victoires', 'Défaites', 'Matchs'];
            const dataA = [a.wins, a.defeats, a.matchesCount];
            const dataB = [b.wins, b.defeats, b.matchesCount];
            const traceA = { x: labels, y: dataA, type: 'bar', name: teamAName, marker: { color: '#4CAF50' } };
            const traceB = { x: labels, y: dataB, type: 'bar', name: teamBName, marker: { color: '#FF4655' } };
            layout = { 
                title: '📊 Barres Groupées - Comparaison',
                barmode: 'group', 
                margin: { t: 40 },
                font: { size: 14 },
                showlegend: true
            };
            data = [traceA, traceB];
            break;
    }

    if (data && layout) {
        Plotly.react(chartDiv, data, layout, { responsive: true });
    }
}
function exportComparisonHTML() {
    try {
        const a = getTeamKPIs(team);
        const b = comparisonTeamB ? getTeamKPIs(comparisonTeamB) : null;
        const opts = getComparisonExportOptions();
        const css = `table{width:100%;border-collapse:collapse}th,td{padding:6px 8px;border-bottom:1px solid rgba(0,0,0,.1)}h2{margin-bottom:8px}`;
        const rowsFor = (k) => {
            let rows = `<tr><th>Nom</th><td>${k.name}</td></tr>`;
            if (opts.players) rows += `<tr><th>Joueurs</th><td>${k.playersCount}</td></tr>`;
            if (opts.matches) rows += `<tr><th>Matchs</th><td>${k.matchesCount}</td></tr>`;
            if (opts.wins) rows += `<tr><th>Victoires</th><td>${k.wins}</td></tr>`;
            if (opts.defeats) rows += `<tr><th>Défaites</th><td>${k.defeats}</td></tr>`;
            if (opts.winrate) rows += `<tr><th>Winrate</th><td>${k.winrate}%</td></tr>`;
            return rows;
        };
        const html = `
            <html><head><meta charset="utf-8"><title>Comparaison</title><style>${css}</style></head><body>
            <h2>Comparaison d'Équipes</h2>
            <h3>Équipe A: ${a.name}</h3>
            <table>${rowsFor(a)}</table>
            <h3>Équipe B: ${b?.name || '-'}</h3>
            <table>${rowsFor(b || { name:'-', playersCount:'-', matchesCount:'-', wins:'-', defeats:'-', winrate:'-' })}</table>
            </body></html>
        `;
        const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
        exportService.downloadFile(blob, `comparison_${new Date().toISOString().split('T')[0]}.html`, 'text/html;charset=utf-8;');
        showNotification('Comparaison exportée (HTML)', 'success');
    } catch (e) {
        console.error(e);
        showNotification('Erreur export comparaison HTML', 'error');
    }
}

function exportComparisonPDF() {
    try {
        const win = window.open('', '_blank', 'width=1000,height=800');
        if (!win) { showNotification('Fenêtre PDF bloquée', 'error'); return; }
        const a = getTeamKPIs(team);
        const b = comparisonTeamB ? getTeamKPIs(comparisonTeamB) : null;
        const opts = getComparisonExportOptions();
        const css = `body{font-family:Arial, sans-serif;margin:24px}table{width:100%;border-collapse:collapse}th,td{padding:6px 8px;border-bottom:1px solid rgba(0,0,0,.1)}h2{margin-bottom:8px}`;
        const rowsFor = (k) => {
            let rows = `<tr><th>Nom</th><td>${k.name}</td></tr>`;
            if (opts.players) rows += `<tr><th>Joueurs</th><td>${k.playersCount}</td></tr>`;
            if (opts.matches) rows += `<tr><th>Matchs</th><td>${k.matchesCount}</td></tr>`;
            if (opts.wins) rows += `<tr><th>Victoires</th><td>${k.wins}</td></tr>`;
            if (opts.defeats) rows += `<tr><th>Défaites</th><td>${k.defeats}</td></tr>`;
            if (opts.winrate) rows += `<tr><th>Winrate</th><td>${k.winrate}%</td></tr>`;
            return rows;
        };
        const html = `
            <html><head><meta charset="utf-8"><title>Comparaison PDF</title><style>${css}</style></head><body>
            <div class="cover" style="text-align:center; page-break-after: always;">
                <h1>Comparaison d'Équipes</h1>
                <div style="opacity:.7;">Généré le ${new Date().toLocaleString('fr-FR')}</div>
                <div class="no-print" style="margin-top:16px;"><button onclick="window.print()">Imprimer / Exporter en PDF</button></div>
            </div>
            <h2>Résumé</h2>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px,1fr)); gap:12px;">
                <div><h3>Équipe A: ${a.name}</h3><table>${rowsFor(a)}</table></div>
                <div><h3>Équipe B: ${b?.name || '-'}</h3><table>${rowsFor(b || { name:'-', playersCount:'-', matchesCount:'-', wins:'-', defeats:'-', winrate:'-' })}</table></div>
            </div>
            </body></html>
        `;
        win.document.open(); win.document.write(html); win.document.close();
        showNotification('Aperçu PDF prêt pour la comparaison', 'success');
    } catch (e) {
        console.error(e);
        showNotification('Erreur export comparaison PDF', 'error');
    }
}
// ==============================
// Notifications - Préférences
// ==============================
function openNotificationSettingsModal() {
    try {
        const s = notificationService?.settings || {};
        const setChecked = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };
        setChecked('notifEnabled', s.enabled);
        setChecked('notifProgress', s.showProgressAlerts);
        setChecked('notifPerformance', s.showPerformanceAlerts);
        setChecked('notifMatchReminders', s.showMatchReminders);
        setChecked('notifSound', s.soundEnabled);
        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? el.value; };
        setVal('notifWinrateThreshold', s.winrateThreshold);
        setVal('notifAgentMinWinrate', s.agentMinWinrate);
        setVal('notifAgentMinMatches', s.agentMinMatches);
        toggleNotificationSettingsModal(true);
    } catch {}
}
function toggleNotificationSettingsModal(show) {
    const modal = document.getElementById('notificationSettingsModal');
    if (!modal) return;
    if (show) modal.classList.add('show'); else modal.classList.remove('show');
}
function saveNotificationSettings() {
    try {
        const val = (id) => !!document.getElementById(id)?.checked;
        const num = (id, fallback) => {
            const raw = document.getElementById(id)?.value;
            const n = Number(raw);
            return Number.isFinite(n) ? n : fallback;
        };
        notificationService?.configure({
            enabled: val('notifEnabled'),
            showProgressAlerts: val('notifProgress'),
            showPerformanceAlerts: val('notifPerformance'),
            showMatchReminders: val('notifMatchReminders'),
            soundEnabled: val('notifSound'),
            winrateThreshold: num('notifWinrateThreshold', 10),
            agentMinWinrate: num('notifAgentMinWinrate', 40),
            agentMinMatches: num('notifAgentMinMatches', 3)
        });
        if (val('notifMatchReminders')) {
            scheduleMatchReminders();
        } else {
            clearMatchReminders();
        }
        showNotification('Préférences notifications enregistrées', 'success');
        toggleNotificationSettingsModal(false);
    } catch (e) {
        console.error(e);
        showNotification('Erreur enregistrement préférences', 'error');
    }
}

function exportComparisonCSV() {
    try {
        if (!exportService) exportService = new ExportService();
        const a = getTeamKPIs(team);
        const b = comparisonTeamB ? getTeamKPIs(comparisonTeamB) : null;
        const opts = getComparisonExportOptions();
        const headers = ['Equipe']
            .concat(opts.players ? ['Joueurs'] : [])
            .concat(opts.matches ? ['Matchs'] : [])
            .concat(opts.wins ? ['Victoires'] : [])
            .concat(opts.defeats ? ['Défaites'] : [])
            .concat(opts.winrate ? ['Winrate'] : []);
        const buildRow = (k) => {
            const base = [k.name];
            if (opts.players) base.push(k.playersCount);
            if (opts.matches) base.push(k.matchesCount);
            if (opts.wins) base.push(k.wins);
            if (opts.defeats) base.push(k.defeats);
            if (opts.winrate) base.push(`${k.winrate}%`);
            return base;
        };
        const rows = [buildRow(a), buildRow(b || { name: '-', playersCount: '-', matchesCount: '-', wins: '-', defeats: '-', winrate: '-' })];
        const toCSV = (arr) => arr.map(r => r.map(v => {
            const s = String(v ?? '');
            return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(';')).join('\n');
        const csv = toCSV([headers, ...rows]);
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const filename = `comparison_kpis_${new Date().toISOString().split('T')[0]}.csv`;
        exportService.downloadFile(blob, filename, 'text/csv;charset=utf-8;');
        showNotification('Comparaison exportée (CSV)', 'success');
    } catch (e) {
        console.error(e);
        showNotification('Erreur export comparaison CSV', 'error');
    }
}

function exportComparisonExcel() {
    try {
        if (!exportService) exportService = new ExportService();
        const a = getTeamKPIs(team);
        const b = comparisonTeamB ? getTeamKPIs(comparisonTeamB) : null;
        const opts = getComparisonExportOptions();
        const headers = ['Equipe']
            .concat(opts.players ? ['Joueurs'] : [])
            .concat(opts.matches ? ['Matchs'] : [])
            .concat(opts.wins ? ['Victoires'] : [])
            .concat(opts.defeats ? ['Défaites'] : [])
            .concat(opts.winrate ? ['Winrate'] : []);
        const buildRowAoA = (k) => {
            const base = [k.name];
            if (opts.players) base.push(k.playersCount);
            if (opts.matches) base.push(k.matchesCount);
            if (opts.wins) base.push(k.wins);
            if (opts.defeats) base.push(k.defeats);
            if (opts.winrate) base.push(`${k.winrate}%`);
            return base;
        };
        const tryXLSX = async () => {
            if (typeof XLSX === 'undefined') {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
                    s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
                });
            }
            const wb = XLSX.utils.book_new();
            const aoa = [headers, buildRowAoA(a), buildRowAoA(b || { name:'-', playersCount:'-', matchesCount:'-', wins:'-', defeats:'-', winrate:'-' })];
            const ws = XLSX.utils.aoa_to_sheet(aoa);
            XLSX.utils.book_append_sheet(wb, ws, 'Comparaison');
            const wbout = XLSX.write(wb, { bookType:'xlsx', type:'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            exportService.downloadFile(blob, `comparison_kpis_${new Date().toISOString().split('T')[0]}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        };
        const fallback = () => {
            let html = '<table><thead><tr>' + headers.map(h => `<th>${exportService.escapeCSV(h)}</th>`).join('') + '</tr></thead><tbody>';
            const buildRow = (k) => {
                let tds = `<td>${exportService.escapeCSV(k.name)}</td>`;
                if (opts.players) tds += `<td>${k.playersCount}</td>`;
                if (opts.matches) tds += `<td>${k.matchesCount}</td>`;
                if (opts.wins) tds += `<td>${k.wins}</td>`;
                if (opts.defeats) tds += `<td>${k.defeats}</td>`;
                if (opts.winrate) tds += `<td>${k.winrate}%</td>`;
                return `<tr>${tds}</tr>`;
            };
            html += buildRow(a);
            html += buildRow(b || { name: '-', playersCount: '-', matchesCount: '-', wins: '-', defeats: '-', winrate: '-' });
            html += '</tbody></table>';
            const blob = new Blob([`\uFEFF${html}`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
            exportService.downloadFile(blob, `comparison_kpis_${new Date().toISOString().split('T')[0]}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
        };
        tryXLSX().then(() => {
            showNotification('Comparaison exportée (XLSX)', 'success');
        }).catch(() => {
            fallback();
            showNotification('Comparaison exportée (XLS fallback)', 'warning');
        });
    } catch (e) {
        console.error(e);
        showNotification('Erreur export comparaison Excel', 'error');
    }
}

function getComparisonExportOptions() {
    const v = (id) => document.getElementById(id)?.checked !== false;
    return {
        players: v('compOptPlayers'),
        matches: v('compOptMatches'),
        wins: v('compOptWins'),
        defeats: v('compOptDefeats'),
        winrate: v('compOptWinrate'),
    };
}
// ==============================
// Logs - Journal
// ==============================
function openLogsModal() {
    try { renderLogsTable(); } catch {}
    toggleLogsModal(true);
}
function toggleLogsModal(show) {
    const modal = document.getElementById('logsModal');
    if (!modal) return;
    if (show) modal.classList.add('show'); else modal.classList.remove('show');
}
function renderLogsTable() {
    const container = document.getElementById('logsContainer');
    if (!container) return;
    const logs = loggerService?.getLogs?.() || [];
    if (!logs.length) {
        container.innerHTML = '<em>Aucun log enregistré.</em>';
        return;
    }
    let html = '<table class="table"><thead><tr><th>Heure</th><th>Type</th><th>Nom</th><th>Détails</th></tr></thead><tbody>';
    logs.slice().reverse().forEach(l => {
        const ts = l.ts || '';
        const type = l.type || '';
        const name = l.name || '';
        const details = l.type === 'error' ? (l.message || '') : JSON.stringify(l.data || {});
        html += `<tr><td>${ts}</td><td>${type}</td><td>${name}</td><td style="max-width:520px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${(details || '').replace(/"/g,'&quot;')}">${details}</td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ==============================
// Métriques - UI
// ==============================
function openMetricsModal() {
    try { renderMetricsTables(); } catch {}
    toggleMetricsModal(true);
}
function toggleMetricsModal(show) {
    const modal = document.getElementById('metricsModal');
    if (!modal) return;
    if (show) modal.classList.add('show'); else modal.classList.remove('show');
}
function renderMetricsTables() {
    const summaryEl = document.getElementById('metricsSummary');
    const container = document.getElementById('metricsContainer');
    if (!summaryEl || !container) return;
    const summary = metricsService?.getSummary?.() || { totalEvents: 0, counters: {} };
    const counters = summary.counters || {};
    // Summary
    let htmlSummary = '<table class="table"><thead><tr><th>Total événements</th><th>Distincts</th></tr></thead><tbody>';
    htmlSummary += `<tr><td>${summary.totalEvents}</td><td>${Object.keys(counters).length}</td></tr>`;
    htmlSummary += '</tbody></table>';
    summaryEl.innerHTML = htmlSummary;
    // Counters table
    const sortable = Object.entries(counters).sort((a,b) => b[1]-a[1]);
    let html = '<table class="table"><thead><tr><th>Événement</th><th>Compteur</th></tr></thead><tbody>';
    sortable.forEach(([k,v]) => { html += `<tr><td>${k}</td><td>${v}</td></tr>`; });
    html += '</tbody></table>';
    container.innerHTML = html;
}
// ==============================
// Alertes - Journal
// ==============================
function openAlertsModal() {
    try { renderAlertsTable(); } catch {}
    toggleAlertsModal(true);
}
function toggleAlertsModal(show) {
    const modal = document.getElementById('alertsModal');
    if (!modal) return;
    if (show) modal.classList.add('show'); else modal.classList.remove('show');
}
function renderAlertsTable() {
    const container = document.getElementById('alertsContainer');
    if (!container) return;
    const alerts = notificationService?.getAlerts?.() || [];
    if (!alerts.length) {
        container.innerHTML = '<em>Aucune alerte enregistrée.</em>';
        return;
    }
    let html = '<table class="table"><thead><tr><th>Heure</th><th>Type</th><th>Message</th></tr></thead><tbody>';
    alerts.slice().reverse().forEach(a => {
        html += `<tr><td>${a.ts || ''}</td><td>${a.type || ''}</td><td>${(a.message || '').replace(/</g,'&lt;')}</td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}
function wireStatisticsTabControls() {
    // Rebind des sous-onglets statistiques (après purge/clone)
    try {
        document.querySelectorAll('.stats-tab-btn').forEach(btn => {
            const tab = btn.getAttribute('data-stats-tab');
            btn.onclick = () => switchStatsTab(tab);
        });
    } catch {}

    // Filtres de stats (type)
    const mapType = document.getElementById('mapFilterType');
    if (mapType) mapType.onchange = onMapFilterTypeChange;
    const roundType = document.getElementById('roundFilterType');
    if (roundType) roundType.onchange = onRoundFilterTypeChange;

    // Boutons graphiques généraux
    const btns = [
        ['winrateChartBtn', showWinrateChart],
        ['mapPerformanceChartBtn', showMapPerformanceChart],
        ['roundsChartBtn', showRoundsChart],
        ['timelineChartBtn', showTimelineChart],
        ['agentsChartBtn', showAgentsChart],
        ['bestMapChartBtn', () => { chartsCurrentView = 'bestMap'; showBestMapChart(); }],
        ['topOpponentsChartBtn', () => { chartsCurrentView = 'topOpponents'; showTopOpponentsChart(); }],
        ['downloadChartPngBtn', () => { downloadCurrentChartPNG(); try { metricsService?.incr('export_chart_png'); } catch {} }],
    ];
    btns.forEach(([id, handler]) => {
        const el = document.getElementById(id);
        if (el) el.onclick = handler;
    });
    
    // Période pour les graphiques (ré-attacher à chaque fois car le DOM peut être cloné)
    const chartsInsightsPeriod = document.getElementById('chartsInsightsPeriod');
    if (chartsInsightsPeriod) {
        chartsInsightsPeriod.onchange = () => {
            if (chartsCurrentView === 'bestMap') return showBestMapChart();
            if (chartsCurrentView === 'topOpponents') return showTopOpponentsChart();
            try { showTimelineChart(); } catch { try { showWinrateChart(); } catch {} }
        };
    }
    
    // Onglets graphiques comparatifs
    const chartsSubTabBtns = document.querySelectorAll('.charts-sub-tab-btn');
    if (chartsSubTabBtns.length > 0) {
        chartsSubTabBtns.forEach(btn => {
            const subTab = btn.dataset.chartsSubTab;
            btn.onclick = () => switchChartsSubTab(subTab);
        });
        // S'assurer que l'onglet général est actif par défaut si aucun n'est actif
        const hasActive = Array.from(chartsSubTabBtns).some(b => b.classList.contains('active'));
        if (!hasActive) {
            const generalBtn = Array.from(chartsSubTabBtns).find(b => b.dataset.chartsSubTab === 'general');
            if (generalBtn) {
                generalBtn.classList.add('active');
                const generalTab = document.getElementById('generalChartsTab');
                const comparativeTab = document.getElementById('comparativeChartsTab');
                if (generalTab) {
                    generalTab.style.display = 'block';
                    generalTab.classList.add('active');
                }
                if (comparativeTab) {
                    comparativeTab.style.display = 'none';
                    comparativeTab.classList.remove('active');
                }
            }
        }
    }
    
    // Initialisation des graphiques comparatifs
    initComparativeCharts();

    // Boutons export / import dans Statistiques (rewire après remplacement DOM)
    const mapCsv = document.getElementById('exportMapStatsCsvBtn');
    if (mapCsv) mapCsv.onclick = () => exportMapStatsCSV && exportMapStatsCSV();
    const playerCsv = document.getElementById('exportPlayerStatsCsvBtn');
    if (playerCsv) playerCsv.onclick = () => exportPlayerStatsCSV && exportPlayerStatsCSV();
    const periodCsv = document.getElementById('exportPeriodStatsCsvBtn');
    if (periodCsv) periodCsv.onclick = () => exportPeriodStatsCSV && exportPeriodStatsCSV();
    const htmlBtn = document.getElementById('exportThemedHtmlBtn');
    if (htmlBtn) htmlBtn.onclick = () => exportThemedHTMLReport && exportThemedHTMLReport();
    const pdfBtn = document.getElementById('exportPdfBtn');
    if (pdfBtn) pdfBtn.onclick = () => exportPDFReport && exportPDFReport();
    const xlsBtn = document.getElementById('exportExcelBtn');
    if (xlsBtn) xlsBtn.onclick = () => exportExcelReport && exportExcelReport();
    const xmlBtn = document.getElementById('exportXmlBtn');
    if (xmlBtn) xmlBtn.onclick = () => exportXMLReport && exportXMLReport();
    const importCsvBtn = document.getElementById('importCsvBtn');
    if (importCsvBtn) importCsvBtn.onclick = () => openImportCsvModal && openImportCsvModal();

    // Boutons filtres (Map/Rounds)
    const applyMap = document.getElementById('applyMapFilterBtn');
    if (applyMap) applyMap.onclick = () => applyMapFilter();
    const resetMap = document.getElementById('resetMapFilterBtn');
    if (resetMap) resetMap.onclick = () => resetMapFilter();
    const applyRound = document.getElementById('applyRoundFilterBtn');
    if (applyRound) applyRound.onclick = () => applyRoundFilter();
    const resetRound = document.getElementById('resetRoundFilterBtn');
    if (resetRound) resetRound.onclick = () => resetRoundFilter();

    // Peupler les sélecteurs d'export à chaque entrée (DOM remplacé)
    const exportPlayerSelect = document.getElementById('exportPlayerSelect');
    if (exportPlayerSelect) {
        exportPlayerSelect.innerHTML = '<option value="all">Tous joueurs</option>';
        (team.players || []).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            exportPlayerSelect.appendChild(opt);
        });
    }
    const exportMapSelect = document.getElementById('exportMapSelect');
    if (exportMapSelect) {
        exportMapSelect.innerHTML = '<option value="all">Toutes maps</option>';
        (window.OFFICIAL_MAPS || window.ALL_MAPS || []).forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            exportMapSelect.appendChild(opt);
        });
    }
}

// ==============================
// API Tab - Riot API
// ==============================
function wireApiTab() {
    // Inputs
    const keyInput = document.getElementById('riotApiKeyInput');
    const saveKeyBtn = document.getElementById('saveRiotApiKeyBtn');
    const testBtn = document.getElementById('testRiotApiBtn');
    const statusEl = document.getElementById('riotApiStatus');
    const contentRegion = document.getElementById('riotContentRegion');
    const platformSel = document.getElementById('riotPlatform');
    const endpointSel = document.getElementById('riotEndpoint');
    const puuidInput = document.getElementById('riotPuuidInput');
    const matchIdInput = document.getElementById('riotMatchIdInput');
    const accountHostSel = document.getElementById('riotAccountHost');
    const gameNameInput = document.getElementById('riotGameNameInput');
    const tagLineInput = document.getElementById('riotTagLineInput');
    const sendBtn = document.getElementById('riotSendBtn');
    const exportBtn = document.getElementById('riotExportJsonBtn');
    const copyCurlBtn = document.getElementById('riotCopyCurlBtn');
    const resultContainer = document.getElementById('riotResultContainer');
    const prettyContainer = document.getElementById('riotResultPretty');
    const rawToggle = document.getElementById('riotRawToggle');
    const rateInfo = document.getElementById('riotRateInfo');
    const langSel = document.getElementById('riotLangSelect');
    const langLabel = document.getElementById('riotLangLabel');
    const startInput = document.getElementById('riotStartInput');
    const countInput = document.getElementById('riotCountInput');
    const startLabel = document.getElementById('riotStartLabel');
    const countLabel = document.getElementById('riotCountLabel');
    const prevBtn = document.getElementById('riotPrevBtn');
    const nextBtn = document.getElementById('riotNextBtn');
    const importMatchBtn = document.getElementById('riotImportMatchBtn');
    const applyPuuidBtn = document.getElementById('riotApplyPuuidBtn');
    const bulkImportBtn = document.getElementById('riotBulkImportBtn');

    if (!riotApiService) return;

    // Init values
    try {
        const savedKey = localStorage.getItem('riotApiKey') || '';
        if (keyInput && savedKey) {
            keyInput.value = savedKey;
            // S'assurer que le service a aussi la clé
            if (riotApiService) {
                riotApiService.setKey(savedKey.trim());
            }
        }
        const savedRegion = localStorage.getItem('riotContentRegion');
        if (contentRegion && savedRegion) contentRegion.value = savedRegion;
        const savedPlatform = localStorage.getItem('riotPlatform');
        if (platformSel && savedPlatform) platformSel.value = savedPlatform;
    } catch {}

    // Show/hide puuid field by endpoint
    const togglePuuid = () => {
        if (!endpointSel || !puuidInput) return;
        const isMatch = endpointSel.value === 'matchIdsByPuuid';
        const isMatchById = endpointSel.value === 'matchById';
        const isAccountByRiot = endpointSel.value === 'accountByRiotId';
        const isAccountByPuuid = endpointSel.value === 'accountByPuuid';
        puuidInput.style.display = isMatch ? 'inline-block' : 'none';
        if (matchIdInput) matchIdInput.style.display = isMatchById ? 'inline-block' : 'none';
        if (gameNameInput) gameNameInput.style.display = isAccountByRiot ? 'inline-block' : 'none';
        if (tagLineInput) tagLineInput.style.display = isAccountByRiot ? 'inline-block' : 'none';
        if (applyPuuidBtn) applyPuuidBtn.style.display = (isAccountByRiot || isAccountByPuuid) ? 'inline-block' : 'none';
        if (accountHostSel) accountHostSel.style.display = (isAccountByRiot || isAccountByPuuid) ? 'inline-block' : 'none';
        if (startInput && countInput && startLabel && countLabel && prevBtn && nextBtn) {
            startInput.style.display = isMatch ? 'inline-block' : 'none';
            countInput.style.display = isMatch ? 'inline-block' : 'none';
            startLabel.style.display = isMatch ? 'inline-block' : 'none';
            countLabel.style.display = isMatch ? 'inline-block' : 'none';
            prevBtn.style.display = isMatch ? 'inline-block' : 'none';
            nextBtn.style.display = isMatch ? 'inline-block' : 'none';
        }
        if (importMatchBtn) importMatchBtn.style.display = isMatchById ? 'inline-block' : 'none';
        if (bulkImportBtn) bulkImportBtn.style.display = isMatch ? 'inline-block' : 'none';
        // Langue pour contents/agents/maps
        const isContent = ['contents', 'agents', 'maps'].includes(endpointSel.value);
        if (langSel && langLabel) {
            langSel.style.display = isContent ? 'inline-block' : 'none';
            langLabel.style.display = isContent ? 'inline-block' : 'none';
        }
    };
    togglePuuid();
    if (endpointSel && !endpointSel._wired) { endpointSel._wired = true; endpointSel.onchange = togglePuuid; }

    if (saveKeyBtn && !saveKeyBtn._wired) {
        saveKeyBtn._wired = true;
        saveKeyBtn.onclick = () => {
            riotApiService.setKey(keyInput?.value || '');
            try { localStorage.setItem('riotApiKey', keyInput?.value || ''); } catch {}
            showNotification('Clé Riot API sauvegardée', 'success');
        };
    }

    const setBusy = (busy, note = 'Chargement...') => {
        const apiTab = document.getElementById('apiTab');
        if (!apiTab) return;
        if (busy) {
            apiTab.classList.add('loading');
            if (resultContainer) resultContainer.innerHTML = `<div class="muted">${note}</div>`;
            if (sendBtn) sendBtn.disabled = true;
            if (testBtn) testBtn.disabled = true;
        } else {
            apiTab.classList.remove('loading');
            if (sendBtn) sendBtn.disabled = false;
            if (testBtn) testBtn.disabled = false;
        }
    };

    if (testBtn && !testBtn._wired) {
        testBtn._wired = true;
        testBtn.onclick = async () => {
            try {
                setBusy(true, 'Test de connexion...');
                
                // S'assurer que la clé API est à jour
                const currentKey = keyInput?.value || localStorage.getItem('riotApiKey') || '';
                if (!currentKey || !currentKey.trim()) {
                    throw new Error('Clé API manquante. Veuillez entrer votre clé API Riot Games.');
                }
                
                // Mettre à jour la clé dans le service
                riotApiService.setKey(currentKey.trim());
                
                const platform = platformSel?.value || 'eu1';
                const { json, rate } = await riotApiService.getStatus(platform);
                if (statusEl) statusEl.textContent = `OK: ${json.name || platform}`;
                showResult(json, rate);
            } catch (e) {
                console.error('Erreur test API Riot:', e);
                const errorMsg = e.message || String(e);
                if (statusEl) statusEl.textContent = `Erreur: ${errorMsg}`;
                showNotification(`Erreur test API: ${errorMsg}`, 'error');
            } finally { setBusy(false); }
        };
    }

    if (contentRegion && !contentRegion._wired) {
        contentRegion._wired = true;
        contentRegion.onchange = () => { try { localStorage.setItem('riotContentRegion', contentRegion.value); } catch {} };
    }
    if (platformSel && !platformSel._wired) {
        platformSel._wired = true;
        platformSel.onchange = () => { try { localStorage.setItem('riotPlatform', platformSel.value); } catch {} };
    }

    // pagination
    const doPage = (dir) => {
        const step = parseInt(countInput?.value || '10', 10);
        const cur = parseInt(startInput?.value || '0', 10);
        const next = Math.max(0, cur + (dir * step));
        if (startInput) startInput.value = String(next);
        if (sendBtn) sendBtn.click();
    };
    if (prevBtn && !prevBtn._wired) { prevBtn._wired = true; prevBtn.onclick = () => doPage(-1); }
    if (nextBtn && !nextBtn._wired) { nextBtn._wired = true; nextBtn.onclick = () => doPage(1); }

    if (sendBtn && !sendBtn._wired) {
        sendBtn._wired = true;
        sendBtn.onclick = async () => {
            try {
                setBusy(true);
                
                // S'assurer que la clé API est à jour
                const currentKey = keyInput?.value || localStorage.getItem('riotApiKey') || '';
                if (!currentKey || !currentKey.trim()) {
                    throw new Error('Clé API manquante. Veuillez entrer votre clé API Riot Games.');
                }
                
                // Mettre à jour la clé dans le service
                riotApiService.setKey(currentKey.trim());
                
                // Annuler requête précédente si encore en cours
                try { riotApiInFlightController?.abort(); } catch {}
                riotApiInFlightController = new AbortController();
                const ep = endpointSel?.value || 'contents';
                const region = contentRegion?.value || 'eu';
                const platform = platformSel?.value || 'eu1';
                const lang = langSel?.value || 'fr-FR';
                const start = parseInt(startInput?.value || '0', 10);
                const count = parseInt(countInput?.value || '10', 10);
                const accountHost = accountHostSel?.value || 'europe';
                const cacheKey = JSON.stringify({ ep, region, platform, lang, start, count, puuid: puuidInput?.value || '' });
                const now = Date.now();
                // Cache TTL
                const cached = riotApiCache[cacheKey];
                if (cached && (now - cached.ts) < RIOT_API_CACHE_TTL) {
                    showResult(cached.data, cached.rate);
                    setBusy(false);
                    return;
                }
                let res;
                if (ep === 'contents') res = await riotApiService.getContents(region, { signal: riotApiInFlightController.signal });
                else if (ep === 'agents') res = await riotApiService.getAgents(region, { signal: riotApiInFlightController.signal });
                else if (ep === 'maps') res = await riotApiService.getMaps(region, { signal: riotApiInFlightController.signal });
                else if (ep === 'status') res = await riotApiService.getStatus(platform, { signal: riotApiInFlightController.signal });
                else if (ep === 'matchIdsByPuuid') {
                    const puuid = (puuidInput?.value || '').trim();
                    if (!puuid) { showNotification('PUUID requis', 'warning'); throw new Error('PUUID requis'); }
                    res = await riotApiService.getMatchIdsByPuuid(region, puuid, start, count, { signal: riotApiInFlightController.signal });
                } else if (ep === 'matchById') {
                    const matchId = (matchIdInput?.value || '').trim();
                    if (!matchId) { showNotification('matchId requis', 'warning'); throw new Error('matchId requis'); }
                    res = await riotApiService.getMatchById(region, matchId, { signal: riotApiInFlightController.signal });
                } else if (ep === 'accountByRiotId') {
                    const g = (gameNameInput?.value || '').trim();
                    const t = (tagLineInput?.value || '').trim();
                    if (!g || !t) { showNotification('gameName et tagLine requis', 'warning'); throw new Error('Riot ID requis'); }
                    res = await riotApiService.getAccountByRiotId(accountHost, g, t, { signal: riotApiInFlightController.signal });
                } else if (ep === 'accountByPuuid') {
                    const p = (puuidInput?.value || '').trim();
                    if (!p) { showNotification('PUUID requis', 'warning'); throw new Error('PUUID requis'); }
                    res = await riotApiService.getAccountByPuuid(accountHost, p, { signal: riotApiInFlightController.signal });
                }
                showResult(res.json, res.rate);
                riotApiCache[cacheKey] = { ts: now, data: res.json, rate: res.rate };
                try { riotLastRequest = window.__lastRiotRequest || null; } catch {}
            } catch (e) {
                const msg = (e && e.name === 'AbortError') ? 'Timeout de la requête' : (e.message || String(e));
                showResult({ error: msg }, e?.rate);
                if (statusEl) statusEl.textContent = `Erreur: ${msg}`;
            } finally { setBusy(false); }
        };
    }

    if (exportBtn && !exportBtn._wired) {
        exportBtn._wired = true;
        exportBtn.onclick = () => {
            const pre = resultContainer?.querySelector('pre');
            if (!pre) { showNotification('Aucun résultat à exporter', 'warning'); return; }
            const blob = new Blob([pre.textContent || ''], { type: 'application/json;charset=utf-8;' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `riot_api_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
        };
    }
    if (copyCurlBtn && !copyCurlBtn._wired) {
        copyCurlBtn._wired = true;
        copyCurlBtn.onclick = async () => {
            try {
                if (!riotLastRequest) { showNotification('Aucune requête à copier', 'warning'); return; }
                const h = Object.entries(riotLastRequest.headers || {}).map(([k,v]) => `-H "${k}: ${v}"`).join(' ');
                const curl = `curl -X GET ${h} "${riotLastRequest.url}"`;
                await navigator.clipboard.writeText(curl);
                showNotification('cURL copié dans le presse-papiers', 'success');
            } catch { showNotification('Impossible de copier le cURL', 'error'); }
        };
    }

    function showResult(obj, rate) {
        // Vue brute (pré)
        if (resultContainer) {
            let formatted = JSON.stringify(obj, null, 2);
            const MAX_LEN = 300000;
            let truncated = false;
            if (formatted.length > MAX_LEN) { formatted = formatted.slice(0, MAX_LEN) + '\n... (tronqué pour l’affichage)'; truncated = true; }
            resultContainer.innerHTML = `<pre style="white-space:pre; font-size:12px;">${formatted.replace(/</g,'&lt;')}</pre>${truncated ? '<div class="muted">Résultat tronqué à l’affichage. Utilisez “Exporter JSON” pour le contenu complet.</div>' : ''}`;
        }
        // Vue mise en forme
        if (prettyContainer) {
            prettyContainer.innerHTML = renderPrettyResult(endpointSel?.value || '', obj);
        }
        // Toggle brut
        if (rawToggle && resultContainer) {
            const showRaw = !!rawToggle.checked;
            resultContainer.style.display = showRaw ? 'block' : 'none';
        }
        if (rateInfo) {
            const parts = [];
            if (rate?.limit) parts.push(`AppLimit: ${rate.limit}`);
            if (rate?.count) parts.push(`AppCount: ${rate.count}`);
            if (rate?.methodLimit) parts.push(`MethodLimit: ${rate.methodLimit}`);
            if (rate?.methodCount) parts.push(`MethodCount: ${rate.methodCount}`);
            if (rate?.retryAfter) parts.push(`Retry-After: ${rate.retryAfter}s`);
            rateInfo.textContent = parts.length ? parts.join(' • ') : '';
        }
        // Pousser dans l'historique (limité à 20)
        try {
            const hist = JSON.parse(localStorage.getItem('riotHistory') || '[]');
            const entry = {
                ts: new Date().toISOString(),
                endpoint: (document.getElementById('riotEndpoint')?.value || ''),
                region: (document.getElementById('riotContentRegion')?.value || ''),
                platform: (document.getElementById('riotPlatform')?.value || ''),
                url: riotLastRequest?.url || '',
                params: {
                    lang: document.getElementById('riotLangSelect')?.value || '',
                    start: document.getElementById('riotStartInput')?.value || '',
                    count: document.getElementById('riotCountInput')?.value || '',
                    puuid: document.getElementById('riotPuuidInput')?.value || ''
                }
            };
            hist.unshift(entry);
            while (hist.length > 20) hist.pop();
            localStorage.setItem('riotHistory', JSON.stringify(hist));
            renderRiotHistory();
        } catch {}
    }

    if (rawToggle && !rawToggle._wired) {
        rawToggle._wired = true;
        rawToggle.onchange = () => {
            if (!resultContainer) return;
            resultContainer.style.display = rawToggle.checked ? 'block' : 'none';
        };
    }

    function renderPrettyResult(ep, data) {
        try {
            if (!data) return '<em>Aucun résultat.</em>';
            if (ep === 'accountByRiotId' || ep === 'accountByPuuid') {
                const puuid = data.puuid || data?.account?.puuid || '';
                const name = data.gameName || data?.account?.gameName || '';
                const tag = data.tagLine || data?.account?.tagLine || '';
                return `<div class="card"><h3>Compte</h3><div class="muted">${name ? `${name}#${tag}` : ''}</div><div><strong>PUUID:</strong> ${puuid || '<em>inconnu</em>'}</div></div>`;
            }
            if (ep === 'matchIdsByPuuid') {
                const ids = Array.isArray(data) ? data : (data.ids || []);
                if (!ids.length) return '<em>Aucun matchId.</em>';
                const rows = ids.slice(0, 50).map(id => `<tr><td style="font-family:monospace">${id}</td><td>
                    <button class="btn-secondary sm" data-action="copy-id" data-id="${id}">Copier</button>
                    <button class="btn-secondary sm" data-action="load-id" data-id="${id}">Charger</button>
                </td></tr>`).join('');
                setTimeout(() => {
                    prettyContainer?.querySelectorAll('button[data-action]').forEach(btn => {
                        btn.onclick = () => {
                            const id = btn.getAttribute('data-id');
                            const action = btn.getAttribute('data-action');
                            if (action === 'copy-id') navigator.clipboard.writeText(id);
                            if (action === 'load-id') {
                                if (matchIdInput) matchIdInput.value = id;
                                if (endpointSel) endpointSel.value = 'matchById';
                                togglePuuid();
                            }
                        };
                    });
                }, 0);
                return `<div class="card"><h3>Match IDs</h3><table class="table"><thead><tr><th>ID</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
            }
            if (ep === 'matchById') {
                const info = data?.info || {};
                const map = info?.mapId || info?.map || 'inconnu';
                const start = info?.gameStartMillis ? new Date(info.gameStartMillis).toLocaleString('fr-FR') : '';
                const t0 = info?.teams?.[0]; const t1 = info?.teams?.[1];
                const score = (t0 && t1) ? `${t0.numPoints ?? '?'} - ${t1.numPoints ?? '?'}` : '';
                return `<div class="card">
                    <h3>Détails du match</h3>
                    <div><strong>Map:</strong> ${map}</div>
                    <div><strong>Début:</strong> ${start}</div>
                    <div><strong>Score:</strong> ${score}</div>
                </div>`;
            }
            if (ep === 'status') {
                const s = data || {};
                const maint = s?.maintenances || [];
                const inc = s?.incidents || [];
                const m = maint.map(x => `<li>${x?.titles?.[0]?.content || 'Maintenance'} — ${x?.maintenance_status || ''}</li>`).join('');
                const i = inc.map(x => `<li>${x?.titles?.[0]?.content || 'Incident'} — ${x?.incident_severity || ''}</li>`).join('');
                return `<div class="card"><h3>Statut plateforme</h3><div><strong>Maintenances:</strong></div><ul>${m || '<li>Aucune</li>'}</ul><div><strong>Incidents:</strong></div><ul>${i || '<li>Aucun</li>'}</ul></div>`;
            }
            if (ep === 'agents' || ep === 'maps' || ep === 'contents') {
                // Affichage simple: compter et lister les 10 premiers noms trouvés
                const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
                const list = items.slice(0, 10).map(x => {
                    const name = x?.name || x?.localizedNames?.['fr-FR'] || x?.localizedNames?.['en-US'] || x?.displayName || '—';
                    return `<li>${name}</li>`;
                }).join('');
                const count = items.length || (typeof data === 'object' ? Object.keys(data || {}).length : 0);
                return `<div class="card"><h3>${ep.toUpperCase()}</h3><div class="muted">${count} élément(s)</div><ul>${list}</ul></div>`;
            }
            // Fallback: rien de spécifique → encourager “Vue brute”
            return `<div class="muted">Aucun rendu spécifique pour cet endpoint. Activez “Vue brute” pour voir le JSON.</div>`;
        } catch {
            return '<em>Impossible de formater le résultat.</em>';
        }
    }

    function renderRiotHistory() {
        const el = document.getElementById('riotHistory');
        if (!el) return;
        let hist = [];
        try { hist = JSON.parse(localStorage.getItem('riotHistory') || '[]'); } catch {}
        if (!hist.length) { el.innerHTML = '<em>Aucune requête récente.</em>'; return; }
        let html = '<table class="table"><thead><tr><th>Heure</th><th>Endpoint</th><th>Région/Plateforme</th><th>Actions</th></tr></thead><tbody>';
        hist.forEach((h, idx) => {
            html += `<tr>
                <td>${h.ts}</td>
                <td>${h.endpoint}</td>
                <td>${h.region || ''} ${h.platform ? ' / ' + h.platform : ''}</td>
                <td>
                    <button class="btn-secondary sm" data-idx="${idx}" data-action="rerun">Relancer</button>
                    <button class="btn-secondary sm" data-idx="${idx}" data-action="copy">cURL</button>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
        el.innerHTML = html;
        el.querySelectorAll('button').forEach(btn => {
            btn.onclick = async () => {
                const idx = parseInt(btn.getAttribute('data-idx'), 10);
                const action = btn.getAttribute('data-action');
                const h = hist[idx];
                if (!h) return;
                if (action === 'rerun') {
                    try {
                        // Renseigner UI depuis l’historique et exécuter
                        const epSel = document.getElementById('riotEndpoint'); if (epSel) epSel.value = h.endpoint;
                        const regSel = document.getElementById('riotContentRegion'); if (regSel) regSel.value = h.region;
                        const platSel = document.getElementById('riotPlatform'); if (platSel) platSel.value = h.platform;
                        const langSel = document.getElementById('riotLangSelect'); if (langSel && h.params?.lang) langSel.value = h.params.lang;
                        const sIn = document.getElementById('riotStartInput'); if (sIn && h.params?.start) sIn.value = h.params.start;
                        const cIn = document.getElementById('riotCountInput'); if (cIn && h.params?.count) cIn.value = h.params.count;
                        const pIn = document.getElementById('riotPuuidInput'); if (pIn && h.params?.puuid) pIn.value = h.params.puuid;
                        // Ajuster visibilité
                        if (document.getElementById('riotEndpoint')) document.getElementById('riotEndpoint').dispatchEvent(new Event('change'));
                        // Exécuter
                        document.getElementById('riotSendBtn')?.click();
                    } catch {}
                } else if (action === 'copy') {
                    try {
                        const curl = `curl -X GET -H "X-Riot-Token: ${localStorage.getItem('riotApiKey') || ''}" "${h.url}"`;
                        await navigator.clipboard.writeText(curl);
                        showNotification('cURL de l’historique copié', 'success');
                    } catch {
                        showNotification('Impossible de copier le cURL', 'error');
                    }
                }
            };
        });
    }

    // Rendu initial de l'historique
    renderRiotHistory();

    // Importer le match courant (si détail)
    if (importMatchBtn && !importMatchBtn._wired) {
        importMatchBtn._wired = true;
        importMatchBtn.onclick = () => {
            try {
                if (!riotLastMatchDetail) { showNotification('Aucun match détaillé à importer', 'warning'); return; }
                const m = convertRiotMatchToApp(riotLastMatchDetail);
                team.matches = Array.isArray(team.matches) ? team.matches : [];
                team.matches.push(m);
                updateMatchesTab();
                saveTeam();
                showNotification('Match importé avec succès', 'success');
            } catch (e) {
                console.error(e);
                showNotification('Erreur lors de l’import du match', 'error');
            }
        };
    }

    // Appliquer le PUUID extrait d'un résultat account
    if (applyPuuidBtn && !applyPuuidBtn._wired) {
        applyPuuidBtn._wired = true;
        applyPuuidBtn.onclick = () => {
            try {
                const pre = resultContainer?.querySelector('pre');
                if (!pre) { showNotification('Aucun résultat courant', 'warning'); return; }
                const data = JSON.parse(pre.textContent || '{}');
                const puuid = data?.puuid || data?.account?.puuid || '';
                if (!puuid) { showNotification('PUUID introuvable dans la réponse', 'warning'); return; }
                if (puuidInput) puuidInput.value = puuid;
                showNotification('PUUID appliqué', 'success');
            } catch { showNotification('Impossible d’extraire le PUUID', 'error'); }
        };
    }

    // Importer en masse une liste d'IDs (depuis la réponse matchIdsByPuuid)
    if (bulkImportBtn && !bulkImportBtn._wired) {
        bulkImportBtn._wired = true;
        bulkImportBtn.onclick = async () => {
            try {
                const pre = resultContainer?.querySelector('pre');
                if (!pre) { showNotification('Aucun résultat courant', 'warning'); return; }
                const data = JSON.parse(pre.textContent || '[]');
                const ids = Array.isArray(data) ? data : (data.ids || []);
                if (!ids.length) { showNotification('Aucun matchId détecté', 'warning'); return; }
                const region = contentRegion?.value || 'eu';
                const toImport = ids.slice(0, 10); // limite de sécurité
                let ok = 0;
                setBusy(true, 'Import des matchs...');
                for (let i = 0; i < toImport.length; i++) {
                    const id = toImport[i];
                    try {
                        const { json } = await riotApiService.getMatchById(region, id, { signal: riotApiInFlightController?.signal });
                        const m = convertRiotMatchToApp(json);
                        team.matches = Array.isArray(team.matches) ? team.matches : [];
                        team.matches.push(m);
                        ok++;
                    } catch (e) {
                        console.warn('Import match échoué:', id, e);
                    }
                }
                updateMatchesTab();
                saveTeam();
                showNotification(`${ok}/${toImport.length} match(s) importé(s)`, ok ? 'success' : 'warning');
            } catch (e) {
                console.error(e);
                showNotification('Erreur import en masse', 'error');
            } finally { setBusy(false); }
        };
    }
}

function convertRiotMatchToApp(detail) {
    const info = detail.matchInfo || {};
    const gameStart = info.gameStartMillis || Date.now();
    const d = new Date(gameStart);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;
    const map = info.mapId || info.map || 'Unknown';
    let score = '';
    try {
        const teams = detail.teams || [];
        if (teams.length >= 2) {
            const s0 = parseInt(teams[0].roundsWon || '0', 10);
            const s1 = parseInt(teams[1].roundsWon || '0', 10);
            score = `${isNaN(s0) ? 0 : s0}-${isNaN(s1) ? 0 : s1}`;
        }
    } catch {}
    const match = new Match(dateStr, map, '');
    match.score = score;
    match.result = '';
    return match;
}
// ==============================
// Profils - logique locale
// ==============================
function openProfilesModal() {
    populateProfilesSelect();
    updateProfilesInfo();
    toggleProfilesModal(true);
}
function toggleProfilesModal(show) {
    const modal = document.getElementById('profilesModal');
    if (!modal) return;
    if (show) modal.classList.add('show'); else modal.classList.remove('show');
}
function readProfiles() {
    try { return JSON.parse(localStorage.getItem('profiles') || '{}'); } catch { return {}; }
}
function writeProfiles(obj) {
    try { 
        localStorage.setItem('profiles', JSON.stringify(obj)); 
    } catch (e) {
        console.error('Erreur lors de l\'écriture des profils:', e);
        // Essayer de nettoyer localStorage si c'est un problème de quota
        try {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.warn('Quota localStorage dépassé, tentative de nettoyage...');
                // Supprimer les anciennes sauvegardes si nécessaire
                const backups = localStorage.getItem('team_backups');
                if (backups) {
                    try {
                        const backupArray = JSON.parse(backups);
                        if (backupArray.length > 5) {
                            // Garder seulement les 5 dernières sauvegardes
                            const trimmed = backupArray.slice(-5);
                            localStorage.setItem('team_backups', JSON.stringify(trimmed));
                        }
                    } catch {}
                }
                // Réessayer
                localStorage.setItem('profiles', JSON.stringify(obj));
            }
        } catch (retryError) {
            console.error('Impossible de sauvegarder les profils après nettoyage:', retryError);
            showNotification('Erreur: espace de stockage insuffisant. Veuillez supprimer des données.', 'error');
        }
    }
}
function populateProfilesSelect() {
    const sel = document.getElementById('profilesSelect');
    if (!sel) return;
    
    // Préserver la sélection actuelle
    const currentSelection = sel.value || '';
    const lastSelected = sel.dataset.lastSelectedProfile || currentSelection;
    
    const profiles = readProfiles();
    sel.innerHTML = '';
    Object.keys(profiles).forEach(name => {
        const opt = document.createElement('option'); 
        opt.value = name; 
        opt.textContent = name; 
        sel.appendChild(opt);
    });
    
    // Restaurer la sélection si elle existe toujours
    if (currentSelection && Object.keys(profiles).includes(currentSelection)) {
        sel.value = currentSelection;
        sel.dataset.lastSelectedProfile = currentSelection;
    } else if (lastSelected && Object.keys(profiles).includes(lastSelected)) {
        sel.value = lastSelected;
        sel.dataset.lastSelectedProfile = lastSelected;
    } else if (Object.keys(profiles).length > 0) {
        // Sélectionner le premier profil si la sélection précédente n'existe plus
        sel.value = Object.keys(profiles)[0];
        sel.dataset.lastSelectedProfile = Object.keys(profiles)[0];
    }
    
    // Mettre à jour les infos du profil sélectionné
    updateProfilesInfo();
}
function updateProfilesInfo() {
    const sel = document.getElementById('profilesSelect');
    const info = document.getElementById('profilesInfo');
    if (!sel || !info) return;
    const name = sel.value;
    const profiles = readProfiles();
    const data = profiles[name];
    if (!name || !data) { info.innerHTML = '<em>Aucun profil sélectionné.</em>'; return; }
    const players = (data.players || []).length;
    const matches = (data.matches || []).length;
    info.innerHTML = `<div class="card"><div><strong>Nom:</strong> ${name}</div><div><strong>Joueurs:</strong> ${players}</div><div><strong>Matchs:</strong> ${matches}</div></div>`;
}
function applySelectedProfile() {
    try {
        const sel = document.getElementById('profilesSelect');
        const name = sel?.value;
        if (!name) return;
        
        // Sauvegarder le thème actuel dans le profil précédent si un profil était sélectionné
        const previousSelection = sel.dataset.lastSelectedProfile;
        if (previousSelection && previousSelection !== name && themeService) {
            try {
                const profiles = readProfiles();
                if (profiles[previousSelection]) {
                    const currentTheme = themeService.getCurrentTheme();
                    profiles[previousSelection].theme = {
                        id: currentTheme.id,
                        accent: currentTheme.accent,
                        accentHover: currentTheme.accentHover,
                        bgPrimary: currentTheme.bgPrimary,
                        bgSecondary: currentTheme.bgSecondary,
                        bgTertiary: currentTheme.bgTertiary,
                        textPrimary: currentTheme.textPrimary,
                        textSecondary: currentTheme.textSecondary,
                        textTertiary: currentTheme.textTertiary
                    };
                    writeProfiles(profiles);
                }
            } catch (e) {
                console.warn('Erreur lors de la sauvegarde du thème du profil précédent:', e);
            }
        }
        
        const profiles = readProfiles();
        const data = profiles[name];
        if (!data) return;
        team = Team.fromJSON ? Team.fromJSON(data) : new Team(data.name || 'Équipe');
        currentTeamPath = null;
        
        // Appliquer le thème sauvegardé si présent
        if (data.theme && themeService) {
            try {
                // Créer un thème temporaire avec les couleurs sauvegardées
                const savedTheme = {
                    name: `Thème de ${name}`,
                    accent: data.theme.accent || '#ff4655',
                    accentHover: data.theme.accentHover || '#ff6b7a',
                    bgPrimary: data.theme.bgPrimary || '#171f26',
                    bgSecondary: data.theme.bgSecondary || '#1e2832',
                    bgTertiary: data.theme.bgTertiary || '#252f3a',
                    textPrimary: data.theme.textPrimary || '#ffffff',
                    textSecondary: data.theme.textSecondary || '#b0b8c0',
                    textTertiary: data.theme.textTertiary || '#6b7280'
                };
                
                // Appliquer le thème personnalisé
                themeService.themes.custom = savedTheme;
                themeService.applyTheme('custom');
            } catch (e) {
                console.warn('Erreur lors de l\'application du thème du profil:', e);
            }
        }
        
        // Mémoriser le profil sélectionné
        if (sel) {
            sel.dataset.lastSelectedProfile = name;
        }
        
        updateAllTabs();
        showNotification(`Profil "${name}" appliqué`, 'success');
        try { metricsService?.incr('profile_apply'); } catch {}
    } catch (e) {
        console.error(e);
        showNotification('Erreur application du profil', 'error');
    }
}
function deleteSelectedProfile() {
    const sel = document.getElementById('profilesSelect');
    const name = sel?.value;
    if (!name) return;
    const profiles = readProfiles();
    if (!profiles[name]) return;
    delete profiles[name];
    writeProfiles(profiles);
    populateProfilesSelect();
    updateProfilesInfo();
    showNotification(`Profil "${name}" supprimé`, 'warning');
    try { metricsService?.incr('profile_delete'); } catch {}
}
function saveCurrentAsProfile() {
    try {
        const name = (document.getElementById('newProfileNameInput')?.value || '').trim();
        if (!name) { showNotification('Nom de profil requis', 'error'); return; }
        const profiles = readProfiles();
        
        // Sauvegarder les données de l'équipe
        const profileData = team.toJSON ? team.toJSON() : team;
        
        // Ajouter le thème actuel au profil
        if (themeService) {
            const currentTheme = themeService.getCurrentTheme();
            profileData.theme = {
                id: currentTheme.id,
                accent: currentTheme.accent,
                accentHover: currentTheme.accentHover,
                bgPrimary: currentTheme.bgPrimary,
                bgSecondary: currentTheme.bgSecondary,
                bgTertiary: currentTheme.bgTertiary,
                textPrimary: currentTheme.textPrimary,
                textSecondary: currentTheme.textSecondary,
                textTertiary: currentTheme.textTertiary
            };
        }
        
        profiles[name] = profileData;
        writeProfiles(profiles);
        
        // Préserver la sélection actuelle lors du rafraîchissement
        const sel = document.getElementById('profilesSelect');
        const currentSelection = sel?.value || '';
        populateProfilesSelect();
        if (sel && currentSelection === name) {
            sel.value = name;
        }
        updateProfilesInfo();
        
        showNotification(`Profil "${name}" sauvegardé`, 'success');
        try { metricsService?.incr('profile_save'); } catch {}
    } catch (e) {
        console.error(e);
        showNotification('Erreur de sauvegarde du profil', 'error');
    }
}
function exportSelectedProfile() {
    try {
        const sel = document.getElementById('profilesSelect');
        const name = sel?.value;
        if (!name) { showNotification('Sélectionnez un profil', 'warning'); return; }
        const profiles = readProfiles();
        const data = profiles[name];
        if (!data) { showNotification('Profil introuvable', 'error'); return; }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `profile_${name.replace(/[^a-z0-9]/gi,'_')}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
        try { metricsService?.incr('profile_export'); } catch {}
    } catch (e) {
        console.error(e);
        showNotification('Erreur export du profil', 'error');
    }
}
function importProfileFromFile(e) {
    try {
        const file = e.target.files?.[0];
        if (!file) return;
        const r = new FileReader();
        r.onload = () => {
            try {
                const data = JSON.parse(String(r.result || '{}'));
                const name = (document.getElementById('newProfileNameInput')?.value || `Profil_${new Date().toISOString().split('T')[0]}`).trim();
                if (!name) { showNotification('Nom requis pour importer', 'error'); return; }
                const profiles = readProfiles();
                profiles[name] = data;
                writeProfiles(profiles);
                populateProfilesSelect();
                updateProfilesInfo();
                showNotification(`Profil "${name}" importé`, 'success');
                try { metricsService?.incr('profile_import'); } catch {}
            } catch {
                showNotification('Fichier de profil invalide', 'error');
            }
        };
        r.readAsText(file, 'utf-8');
    } catch (err) {
        console.error(err);
        showNotification('Erreur import du profil', 'error');
    }
}
function updateStatisticsTab() {
    // Rebrancher systématiquement les contrôles (au cas où le DOM a été remplacé)
    try { wireStatisticsTabControls(); } catch {}
    // Nettoyer les anciennes mesures/marks pour éviter l'accumulation dans le profiler
    try {
        performance.clearMeasures('updateStatisticsTab');
        performance.clearMarks('stats-update-start');
        performance.clearMarks('stats-update-end');
    } catch {}
    performance.mark('stats-update-start');
    // Initialiser les filtres
    onMapFilterTypeChange();
    onRoundFilterTypeChange();
    
    updateMapStats();
    updateRoundStats();
    performance.mark('stats-update-end');
    try {
        performance.measure('updateStatisticsTab', 'stats-update-start', 'stats-update-end');
        // Optionnel: nettoyer immédiatement pour garder l'historique court
        performance.clearMarks('stats-update-start');
        performance.clearMarks('stats-update-end');
        // Garder uniquement la dernière mesure pour éviter l'empilement
        const measures = performance.getEntriesByName('updateStatisticsTab');
        if (measures.length > 1) {
            performance.clearMeasures('updateStatisticsTab');
            // Re-créer la dernière mesure comme "snapshot" unique
            const lastDuration = measures[measures.length - 1].duration;
            performance.mark('stats-update-start');
            performance.mark('stats-update-end');
            performance.measure('updateStatisticsTab', 'stats-update-start', 'stats-update-end');
            // Ajustement: on ne peut pas setter la durée, mais on limite le nombre d'entrées
            performance.clearMarks('stats-update-start');
            performance.clearMarks('stats-update-end');
        }
    } catch {}
}

function updateMapStats() {
    const display = document.getElementById('mapStatsDisplay');
    display.innerHTML = '';
    
    // Filtrer les matchs selon les filtres actifs
    let filteredMatches = team.matches;
    if (mapFilterType === 'map' && mapFilterValue) {
        filteredMatches = filteredMatches.filter(m => m.map === mapFilterValue);
    } else if (mapFilterType === 'opponent' && mapFilterValue) {
        filteredMatches = filteredMatches.filter(m => m.opponent === mapFilterValue);
    }
    
    const renderFromMapStats = (mapStats) => {
    if (Object.keys(mapStats).length === 0) {
        display.innerHTML = '<div class="empty-state">Aucune donnée disponible avec les filtres sélectionnés</div>';
        return;
    }
    Object.entries(mapStats).forEach(([mapName, stats]) => {
            const wins = stats.wins || 0;
            const losses = stats.losses || 0;
            const total = wins + losses;
            const winrate = total > 0 ? Math.round((wins / total) * 100 * 10) / 10 : 0;
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
            <div class="stat-card-title">🗺️ ${mapName}</div>
            <div class="stat-card-content">
                    <div>${wins}V / ${losses}D (Total: ${total})</div>
                <div>Winrate: ${winrate}%</div>
            </div>
        `;
        display.appendChild(card);
    });
    };

    // Utiliser le worker si grosse volumétrie
    const needsWorker = filteredMatches.length > 300;
    if (needsWorker) {
        try {
            if (!statsWorker) statsWorker = new Worker('js/workers/statsWorker.js');
            const payload = { matches: filteredMatches.map(m => ({ map: m.map, result: m.result })) };
            const onMessage = (e) => {
                const { type, payload } = e.data || {};
                if (type === 'mapStats:done') {
                    const result = payload?.result || {};
                    // Adapter à structure locale wins/losses
                    const adapted = {};
                    Object.entries(result).forEach(([map, s]) => {
                        adapted[map] = { wins: s.victories || 0, losses: s.defeats || 0 };
                    });
                    try { renderFromMapStats(adapted); } finally {
                        statsWorker.removeEventListener('message', onMessage);
                    }
                }
            };
            statsWorker.addEventListener('message', onMessage);
            statsWorker.postMessage({ type: 'mapStats', payload });
            return;
        } catch (err) {
            console.warn('Worker mapStats indisponible, fallback local', err);
        }
    }

    const mapStats = {};
    filteredMatches.forEach(match => {
        const key = match.map || 'Unknown';
        if (!mapStats[key]) {
            mapStats[key] = { wins: 0, losses: 0 };
        }
        const res = (match.result || '').toLowerCase();
        if (res === 'victoire' || res === 'win') {
            mapStats[key].wins++;
        } else if (res === 'défaite' || res === 'defaite' || res === 'loss') {
            mapStats[key].losses++;
        }
    });
    
    renderFromMapStats(mapStats);
}

function onMapFilterTypeChange() {
    const filterType = document.getElementById('mapFilterType').value;
    const valueGroup = document.getElementById('mapFilterValueGroup');
    const valueSelect = document.getElementById('mapFilterValue');
    
    mapFilterType = filterType;
    
    if (filterType === 'all') {
        valueGroup.style.display = 'none';
        mapFilterValue = '';
    } else {
        valueGroup.style.display = 'flex';
        
        // Remplir les options selon le type de filtre
        valueSelect.innerHTML = '';
        if (filterType === 'map') {
            const maps = [...new Set(team.matches.map(m => m.map).filter(m => m))];
            maps.forEach(map => {
                const option = document.createElement('option');
                option.value = map;
                option.textContent = map;
                valueSelect.appendChild(option);
            });
            if (maps.length > 0) {
                mapFilterValue = maps[0];
                valueSelect.value = maps[0];
            }
        } else if (filterType === 'opponent') {
            const opponents = [...new Set(team.matches.map(m => m.opponent).filter(o => o))];
            opponents.forEach(opponent => {
                const option = document.createElement('option');
                option.value = opponent;
                option.textContent = opponent;
                valueSelect.appendChild(option);
            });
            if (opponents.length > 0) {
                mapFilterValue = opponents[0];
                valueSelect.value = opponents[0];
            }
        }
    }
}

function applyMapFilter() {
    mapFilterValue = document.getElementById('mapFilterValue').value;
    updateMapStats();
}

function resetMapFilter() {
    mapFilterType = 'all';
    mapFilterValue = '';
    document.getElementById('mapFilterType').value = 'all';
    document.getElementById('mapFilterValueGroup').style.display = 'none';
    updateMapStats();
}

function updateRoundStats() {
    const display = document.getElementById('roundsStatsDisplay');
    display.innerHTML = '';
    
    // Filtrer les matchs selon les filtres actifs
    let filteredMatches = team.matches;
    if (roundFilterType === 'map' && roundFilterValue) {
        filteredMatches = filteredMatches.filter(m => m.map === roundFilterValue);
    } else if (roundFilterType === 'opponent' && roundFilterValue) {
        filteredMatches = filteredMatches.filter(m => m.opponent === roundFilterValue);
    }
    
    // Vérifier s'il y a des matchs filtrés
    if (filteredMatches.length === 0) {
        display.innerHTML = '<div class="empty-state">Aucune donnée disponible avec les filtres sélectionnés</div>';
        return;
    }
    
    const renderFromStats = (stats) => {
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
                <div class="stat-card-title">${getTypeLabel(type)}</div>
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
                <div class="stat-card-title">${getSideLabel(side)}</div>
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
    };

    // Utiliser le worker si le volume est important
    const needsWorker = filteredMatches.length > 150;
    if (needsWorker) {
        try {
            if (!statsWorker) {
                statsWorker = new Worker('js/workers/statsWorker.js');
            }
            const payload = {
                matches: filteredMatches.map(m => ({
                    rounds: Array.isArray(m.rounds) ? m.rounds.map(r => ({ winner: r.winner, type: r.type, side: r.side })) : []
                }))
            };
            const onMessage = (e) => {
                const { type, payload } = e.data || {};
                if (type === 'roundStats:done') {
                    try { renderFromStats(payload.stats || {}); } finally {
                        statsWorker.removeEventListener('message', onMessage);
                    }
                }
            };
            statsWorker.addEventListener('message', onMessage);
            statsWorker.postMessage({ type: 'roundStats', payload });
            return;
        } catch (err) {
            console.warn('Worker roundStats indisponible, fallback local', err);
        }
    }

    const stats = calculateRoundStats(filteredMatches);

    renderFromStats(stats);
}

function onRoundFilterTypeChange() {
    const filterType = document.getElementById('roundFilterType').value;
    const valueGroup = document.getElementById('roundFilterValueGroup');
    const valueSelect = document.getElementById('roundFilterValue');
    
    roundFilterType = filterType;
    
    if (filterType === 'all') {
        valueGroup.style.display = 'none';
        roundFilterValue = '';
    } else {
        valueGroup.style.display = 'flex';
        
        // Remplir les options selon le type de filtre
        valueSelect.innerHTML = '';
        if (filterType === 'map') {
            const maps = [...new Set(team.matches.map(m => m.map).filter(m => m))];
            maps.forEach(map => {
                const option = document.createElement('option');
                option.value = map;
                option.textContent = map;
                valueSelect.appendChild(option);
            });
            if (maps.length > 0) {
                roundFilterValue = maps[0];
                valueSelect.value = maps[0];
            }
        } else if (filterType === 'opponent') {
            const opponents = [...new Set(team.matches.map(m => m.opponent).filter(o => o))];
            opponents.forEach(opponent => {
                const option = document.createElement('option');
                option.value = opponent;
                option.textContent = opponent;
                valueSelect.appendChild(option);
            });
            if (opponents.length > 0) {
                roundFilterValue = opponents[0];
                valueSelect.value = opponents[0];
            }
        }
    }
}

function applyRoundFilter() {
    roundFilterValue = document.getElementById('roundFilterValue').value;
    updateRoundStats();
}

function resetRoundFilter() {
    roundFilterType = 'all';
    roundFilterValue = '';
    document.getElementById('roundFilterType').value = 'all';
    document.getElementById('roundFilterValueGroup').style.display = 'none';
    updateRoundStats();
}

function calculateRoundStats(filteredMatches = null) {
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
        if (!match || !Array.isArray(match.rounds)) return;
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

function computeTeamWinrate() {
    try {
        const matches = (team.matches || []);
        const total = matches.length;
        if (total === 0) return 0;
        const wins = matches.filter(m => m.result === 'Victoire' || m.result === 'win').length;
        return Math.round((wins / total) * 100 * 10) / 10;
    } catch { return 0; }
}

function triggerProgressNotifications(prevWinrate) {
    if (!notificationService) return;
    const current = computeTeamWinrate();
    if (prevWinrate == null) {
        lastTeamWinrate = current;
        return;
    }
    const previousStats = { winrate: prevWinrate };
    const currentStats = { winrate: current };
    (team.players || []).forEach(p => {
        try { notificationService.checkPlayerProgress(p, previousStats, currentStats); } catch {}
    });
    lastTeamWinrate = current;
    try { notificationService.checkAgentPerformance?.(team, 40); } catch {}
}
function getTypeLabel(type) {
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

function getSideLabel(side) {
    const labels = {
        attack_rounds: '⚔️ Attaque',
        defense_rounds: '🛡️ Défense'
    };
    return labels[side] || side;
}

// =========================================
// GRAPHIQUES
// =========================================

function showWinrateChart() {
    const victories = team.matches.filter(m => m.result === 'Victoire').length;
    const defeats = team.matches.filter(m => m.result === 'Défaite').length;
    
    if (victories + defeats === 0) {
        showNotification('Aucune donnée de match disponible', 'error');
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
    
    displayChart(data, layout, 'winrate');
}

function showMapPerformanceChart() {
    const mapStats = {};
    team.matches.forEach(match => {
        if (!mapStats[match.map]) {
            mapStats[match.map] = { victories: 0, defeats: 0 };
        }
        if (match.result === 'Victoire') mapStats[match.map].victories++;
        else if (match.result === 'Défaite') mapStats[match.map].defeats++;
    });
    
    if (Object.keys(mapStats).length === 0) {
        showNotification('Aucune donnée de match disponible', 'error');
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
    
    displayChart(data, layout, 'map-performance');
}

function showRoundsChart() {
    const roundTypes = {};
    team.matches.forEach(match => {
        match.rounds.forEach(round => {
            if (round.type) {
                roundTypes[round.type] = (roundTypes[round.type] || 0) + 1;
            }
        });
    });
    
    if (Object.keys(roundTypes).length === 0) {
        showNotification('Aucune donnée de round disponible', 'error');
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
    
    displayChart(data, layout, 'rounds');
}

function showTimelineChart() {
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
        showNotification('Aucune donnée de match avec date valide', 'error');
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
    
    displayChart(data, layout, 'timeline');
}

function showAgentsChart() {
    const agentUsage = {};
    team.players.forEach(player => {
        Object.values(player.known_agents).forEach(agents => {
            agents.forEach(agent => {
                agentUsage[agent] = (agentUsage[agent] || 0) + 1;
            });
        });
    });
    
    if (Object.keys(agentUsage).length === 0) {
        showNotification('Aucune donnée d\'agent disponible', 'error');
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
    
    displayChart(data, layout, 'agents');
}

async function downloadCurrentChartPNG() {
    try {
        await ensurePlotlyAvailable();
        const chartDiv = document.getElementById('chartDisplay');
        const firstPlot = chartDiv?.querySelector('.js-plotly-plot');
        if (!firstPlot) {
            showNotification('Aucun graphique à exporter', 'warning');
            return;
        }
        const dataUrl = await Plotly.toImage(firstPlot, { format: 'png', width: 1280, height: 720 });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `graph_${new Date().toISOString().replace(/[:.]/g,'-')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showNotification('Graphique exporté (PNG)', 'success');
    } catch (e) {
        console.error(e);
        showNotification('Erreur export du graphique', 'error');
    }
}

async function ensurePlotlyAvailable() {
    if (typeof Plotly !== 'undefined') return;
    await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.plot.ly/plotly-2.26.0.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

// Fonctions de génération de graphiques comparatifs pour l'onglet Comparaison
function generateComparisonWinrateChart(a, b, teamAName, teamBName) {
    const data = [
        {
            x: [teamAName, teamBName],
            y: [a.winrate, b.winrate],
            type: 'bar',
            text: [`${a.winrate}%<br>(${a.wins}V/${a.defeats}D)`, `${b.winrate}%<br>(${b.wins}V/${b.defeats}D)`],
            textposition: 'auto',
            marker: { color: ['#4CAF50', '#FF4655'] },
            name: 'Winrate'
        }
    ];
    
    const layout = {
        title: '🏆 Winrate Comparatif',
        xaxis: { title: 'Équipes' },
        yaxis: { title: 'Winrate (%)', range: [0, 100], ticksuffix: '%' },
        font: { size: 14 },
        showlegend: false,
        margin: { t: 50 }
    };
    
    return { data, layout };
}

function generateComparisonMapPerformanceChart(teamA, teamB, teamAName, teamBName) {
    const allMapsA = [...new Set((teamA.matches || []).map(m => m.map).filter(m => m))];
    const allMapsB = [...new Set((teamB.matches || []).map(m => m.map).filter(m => m))];
    const allMaps = [...new Set([...allMapsA, ...allMapsB])].sort();
    
    const calcWinrate = (matches, map) => {
        const mapMatches = matches.filter(m => m.map === map);
        const victories = mapMatches.filter(m => (m.result || '').toLowerCase() === 'victoire' || (m.result || '').toLowerCase() === 'win').length;
        const defeats = mapMatches.filter(m => (m.result || '').toLowerCase() === 'défaite' || (m.result || '').toLowerCase() === 'loss' || (m.result || '').toLowerCase() === 'defaite').length;
        const total = victories + defeats;
        return total > 0 ? Math.round((victories / total) * 100 * 10) / 10 : 0;
    };
    
    const winratesA = allMaps.map(map => calcWinrate(teamA.matches || [], map));
    const winratesB = allMaps.map(map => calcWinrate(teamB.matches || [], map));
    
    const data = [
        {
            x: allMaps,
            y: winratesA,
            type: 'bar',
            name: teamAName,
            marker: { color: '#4CAF50' },
            text: winratesA.map(wr => `${wr}%`),
            textposition: 'auto'
        },
        {
            x: allMaps,
            y: winratesB,
            type: 'bar',
            name: teamBName,
            marker: { color: '#FF4655' },
            text: winratesB.map(wr => `${wr}%`),
            textposition: 'auto'
        }
    ];
    
    const layout = {
        title: '🗺️ Performance par Map - Comparaison',
        xaxis: { title: 'Maps' },
        yaxis: { title: 'Winrate (%)', range: [0, 100], ticksuffix: '%' },
        barmode: 'group',
        font: { size: 14 },
        showlegend: true,
        legend: { x: 1, y: 1 },
        margin: { t: 50 }
    };
    
    return { data, layout };
}

function generateComparisonTimelineChart(teamA, teamB, teamAName, teamBName) {
    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            if (parts[0].length === 4) return new Date(dateStr);
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
        return null;
    };
    
    const buildTimeline = (matches) => {
        const sortedMatches = [...(matches || [])].sort((a, b) => {
            const dateA = parseDate(a.date);
            const dateB = parseDate(b.date);
            if (!dateA || !dateB) return 0;
            return dateA - dateB;
        });
        
        const winrates = [];
        const dates = [];
        let wins = 0;
        let total = 0;
        
        sortedMatches.forEach(match => {
            const date = parseDate(match.date);
            if (date) {
                total++;
                const isWin = (match.result || '').toLowerCase() === 'victoire' || (match.result || '').toLowerCase() === 'win';
                if (isWin) wins++;
                const winrate = total > 0 ? Math.round((wins / total) * 100 * 10) / 10 : 0;
                winrates.push(winrate);
                dates.push(match.date || '');
            }
        });
        
        return { dates, winrates };
    };
    
    const timelineA = buildTimeline(teamA.matches);
    const timelineB = buildTimeline(teamB.matches);
    
    const data = [
        {
            x: timelineA.dates,
            y: timelineA.winrates,
            type: 'scatter',
            mode: 'lines+markers',
            name: teamAName,
            line: { color: '#4CAF50', width: 3 },
            marker: { size: 8 }
        },
        {
            x: timelineB.dates,
            y: timelineB.winrates,
            type: 'scatter',
            mode: 'lines+markers',
            name: teamBName,
            line: { color: '#FF4655', width: 3 },
            marker: { size: 8 }
        }
    ];
    
    const layout = {
        title: '📅 Évolution Temporelle du Winrate - Comparaison',
        xaxis: { title: 'Date' },
        yaxis: { title: 'Winrate Cumulé (%)', range: [0, 100], ticksuffix: '%' },
        font: { size: 14 },
        showlegend: true,
        legend: { x: 0, y: 1 },
        margin: { t: 50 }
    };
    
    return { data, layout };
}

function generateComparisonHeatmapChart(teamA, teamB, teamAName, teamBName) {
    const allMapsA = [...new Set((teamA.matches || []).map(m => m.map).filter(m => m))];
    const allMapsB = [...new Set((teamB.matches || []).map(m => m.map).filter(m => m))];
    const allMaps = [...new Set([...allMapsA, ...allMapsB])].sort();
    
    const calcWinrate = (matches, map) => {
        const mapMatches = matches.filter(m => m.map === map);
        const victories = mapMatches.filter(m => (m.result || '').toLowerCase() === 'victoire' || (m.result || '').toLowerCase() === 'win').length;
        const defeats = mapMatches.filter(m => (m.result || '').toLowerCase() === 'défaite' || (m.result || '').toLowerCase() === 'loss' || (m.result || '').toLowerCase() === 'defaite').length;
        const total = victories + defeats;
        return total > 0 ? Math.round((victories / total) * 100 * 10) / 10 : 0;
    };
    
    const z = [
        allMaps.map(map => calcWinrate(teamA.matches || [], map)),
        allMaps.map(map => calcWinrate(teamB.matches || [], map))
    ];
    
    const data = [{
        z: z,
        x: allMaps,
        y: [teamAName, teamBName],
        type: 'heatmap',
        colorscale: [[0, '#F44336'], [0.5, '#FFC107'], [1, '#4CAF50']],
        showscale: true,
        colorbar: { title: 'Winrate (%)' },
        text: z.map(row => row.map(wr => `${wr}%`)),
        texttemplate: '%{text}',
        textfont: { size: 12 }
    }];
    
    const layout = {
        title: '🔥 Heatmap Performance par Map - Comparaison',
        xaxis: { title: 'Maps' },
        yaxis: { title: 'Équipes' },
        font: { size: 14 },
        margin: { t: 50 }
    };
    
    return { data, layout };
}

function generateComparisonScoreDistributionChart(teamA, teamB, teamAName, teamBName) {
    const parseScore = (scoreStr) => {
        if (!scoreStr || typeof scoreStr !== 'string') return null;
        const parts = scoreStr.split('-');
        if (parts.length === 2) {
            const us = parseInt(parts[0], 10);
            const them = parseInt(parts[1], 10);
            if (!isNaN(us) && !isNaN(them)) return us;
        }
        return null;
    };
    
    const scoresA = (teamA.matches || []).map(m => parseScore(m.score)).filter(s => s !== null);
    const scoresB = (teamB.matches || []).map(m => parseScore(m.score)).filter(s => s !== null);
    
    const data = [
        {
            x: scoresA,
            type: 'histogram',
            name: teamAName,
            marker: { color: '#4CAF50', opacity: 0.7 },
            histnorm: 'probability'
        },
        {
            x: scoresB,
            type: 'histogram',
            name: teamBName,
            marker: { color: '#FF4655', opacity: 0.7 },
            histnorm: 'probability'
        }
    ];
    
    const layout = {
        title: '📈 Distribution des Scores - Comparaison',
        xaxis: { title: 'Score (nos points)' },
        yaxis: { title: 'Probabilité' },
        barmode: 'overlay',
        font: { size: 14 },
        showlegend: true,
        legend: { x: 1, y: 1 },
        margin: { t: 50 }
    };
    
    return { data, layout };
}

function generateComparisonBoxplotChart(teamA, teamB, teamAName, teamBName) {
    const parseScore = (scoreStr) => {
        if (!scoreStr || typeof scoreStr !== 'string') return null;
        const parts = scoreStr.split('-');
        if (parts.length === 2) {
            const us = parseInt(parts[0], 10);
            const them = parseInt(parts[1], 10);
            if (!isNaN(us) && !isNaN(them)) return us;
        }
        return null;
    };
    
    const scoresA = (teamA.matches || []).map(m => parseScore(m.score)).filter(s => s !== null);
    const scoresB = (teamB.matches || []).map(m => parseScore(m.score)).filter(s => s !== null);
    
    const data = [
        {
            y: scoresA,
            type: 'box',
            name: teamAName,
            marker: { color: '#4CAF50' }
        },
        {
            y: scoresB,
            type: 'box',
            name: teamBName,
            marker: { color: '#FF4655' }
        }
    ];
    
    const layout = {
        title: '📦 Box Plot des Scores - Comparaison',
        yaxis: { title: 'Score (nos points)' },
        font: { size: 14 },
        showlegend: true,
        margin: { t: 50 }
    };
    
    return { data, layout };
}

function generateComparisonStackedBarChart(teamA, teamB, teamAName, teamBName) {
    const allMapsA = [...new Set((teamA.matches || []).map(m => m.map).filter(m => m))];
    const allMapsB = [...new Set((teamB.matches || []).map(m => m.map).filter(m => m))];
    const allMaps = [...new Set([...allMapsA, ...allMapsB])].sort();
    
    const calcStats = (matches, map) => {
        const mapMatches = matches.filter(m => m.map === map);
        const victories = mapMatches.filter(m => (m.result || '').toLowerCase() === 'victoire' || (m.result || '').toLowerCase() === 'win').length;
        const defeats = mapMatches.filter(m => (m.result || '').toLowerCase() === 'défaite' || (m.result || '').toLowerCase() === 'loss' || (m.result || '').toLowerCase() === 'defaite').length;
        return { victories, defeats };
    };
    
    const winsA = allMaps.map(map => calcStats(teamA.matches || [], map).victories);
    const defeatsA = allMaps.map(map => calcStats(teamA.matches || [], map).defeats);
    const winsB = allMaps.map(map => calcStats(teamB.matches || [], map).victories);
    const defeatsB = allMaps.map(map => calcStats(teamB.matches || [], map).defeats);
    
    const data = [
        {
            x: allMaps,
            y: winsA,
            type: 'bar',
            name: `${teamAName} - Victoires`,
            marker: { color: '#4CAF50' }
        },
        {
            x: allMaps,
            y: defeatsA,
            type: 'bar',
            name: `${teamAName} - Défaites`,
            marker: { color: '#81C784' }
        },
        {
            x: allMaps,
            y: winsB,
            type: 'bar',
            name: `${teamBName} - Victoires`,
            marker: { color: '#FF4655' }
        },
        {
            x: allMaps,
            y: defeatsB,
            type: 'bar',
            name: `${teamBName} - Défaites`,
            marker: { color: '#FF8A95' }
        }
    ];
    
    const layout = {
        title: '📊 Barres Empilées par Map - Comparaison',
        xaxis: { title: 'Maps' },
        yaxis: { title: 'Nombre de Matchs' },
        barmode: 'group',
        font: { size: 14 },
        showlegend: true,
        legend: { x: 1, y: 1 },
        margin: { t: 50 }
    };
    
    return { data, layout };
}

function generateComparisonAreaChart(teamA, teamB, teamAName, teamBName) {
    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            if (parts[0].length === 4) return new Date(dateStr);
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
        return null;
    };
    
    const buildTimeline = (matches) => {
        const sortedMatches = [...(matches || [])].sort((a, b) => {
            const dateA = parseDate(a.date);
            const dateB = parseDate(b.date);
            if (!dateA || !dateB) return 0;
            return dateA - dateB;
        });
        
        const winrates = [];
        const dates = [];
        let wins = 0;
        let total = 0;
        
        sortedMatches.forEach(match => {
            const date = parseDate(match.date);
            if (date) {
                total++;
                const isWin = (match.result || '').toLowerCase() === 'victoire' || (match.result || '').toLowerCase() === 'win';
                if (isWin) wins++;
                const winrate = total > 0 ? Math.round((wins / total) * 100 * 10) / 10 : 0;
                winrates.push(winrate);
                dates.push(match.date || '');
            }
        });
        
        return { dates, winrates };
    };
    
    const timelineA = buildTimeline(teamA.matches);
    const timelineB = buildTimeline(teamB.matches);
    
    const data = [
        {
            x: timelineA.dates,
            y: timelineA.winrates,
            type: 'scatter',
            mode: 'lines',
            fill: 'tozeroy',
            name: teamAName,
            line: { color: '#4CAF50' },
            fillcolor: 'rgba(76, 175, 80, 0.3)'
        },
        {
            x: timelineB.dates,
            y: timelineB.winrates,
            type: 'scatter',
            mode: 'lines',
            fill: 'tozeroy',
            name: teamBName,
            line: { color: '#FF4655' },
            fillcolor: 'rgba(255, 70, 85, 0.3)'
        }
    ];
    
    const layout = {
        title: '📊 Aire - Winrate Cumulé - Comparaison',
        xaxis: { title: 'Date' },
        yaxis: { title: 'Winrate Cumulé (%)', range: [0, 100], ticksuffix: '%' },
        font: { size: 14 },
        showlegend: true,
        legend: { x: 0, y: 1 },
        margin: { t: 50 }
    };
    
    return { data, layout };
}

function generateComparisonPieChart(a, b, teamAName, teamBName) {
    const data = [
        {
            labels: ['Victoires', 'Défaites'],
            values: [a.wins, a.defeats],
            type: 'pie',
            name: teamAName,
            hole: 0.4,
            domain: { x: [0, 0.5], y: [0, 1] },
            marker: { colors: ['#4CAF50', '#F44336'] }
        },
        {
            labels: ['Victoires', 'Défaites'],
            values: [b.wins, b.defeats],
            type: 'pie',
            name: teamBName,
            hole: 0.4,
            domain: { x: [0.5, 1], y: [0, 1] },
            marker: { colors: ['#4CAF50', '#F44336'] }
        }
    ];
    
    const layout = {
        title: '🥧 Répartition Victoires/Défaites - Comparaison',
        font: { size: 14 },
        showlegend: true,
        annotations: [
            {
                font: { size: 16 },
                showarrow: false,
                text: teamAName,
                x: 0.25,
                y: 0.5
            },
            {
                font: { size: 16 },
                showarrow: false,
                text: teamBName,
                x: 0.75,
                y: 0.5
            }
        ],
        margin: { t: 50 }
    };
    
    return { data, layout };
}

function updateComparisonWaterfallMatches(teamA, teamB) {
    const selectA = document.getElementById('comparisonWaterfallMatchSelectA');
    const selectB = document.getElementById('comparisonWaterfallMatchSelectB');
    
    if (selectA) {
        const matchesA = (teamA.matches || []).filter(m => m.rounds && m.rounds.length > 0);
        selectA.innerHTML = '<option value="">Sélectionner un match...</option>';
        matchesA.forEach((match, idx) => {
            const option = document.createElement('option');
            option.value = idx;
            const date = match.date || 'Date inconnue';
            const map = match.map || 'Map inconnue';
            const score = match.score || 'Score inconnu';
            option.textContent = `${date} - ${map} (${score})`;
            selectA.appendChild(option);
        });
    }
    
    if (selectB) {
        const matchesB = (teamB.matches || []).filter(m => m.rounds && m.rounds.length > 0);
        selectB.innerHTML = '<option value="">Sélectionner un match...</option>';
        matchesB.forEach((match, idx) => {
            const option = document.createElement('option');
            option.value = idx;
            const date = match.date || 'Date inconnue';
            const map = match.map || 'Map inconnue';
            const score = match.score || 'Score inconnu';
            option.textContent = `${date} - ${map} (${score})`;
            selectB.appendChild(option);
        });
    }
}

async function downloadComparisonChartPNG() {
    try {
        await ensurePlotlyAvailable();
        const chartDiv = document.getElementById('comparisonChart');
        const firstPlot = chartDiv?.querySelector('.js-plotly-plot');
        if (!firstPlot) {
            showNotification('Graphique comparaison non disponible', 'warning');
            return;
        }
        const dataUrl = await Plotly.toImage(firstPlot, { format: 'png', width: 1280, height: 720 });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `comparison_${new Date().toISOString().replace(/[:.]/g,'-')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showNotification('Graphique comparaison exporté (PNG)', 'success');
    } catch (e) {
        console.error(e);
        showNotification('Erreur export graphique comparaison', 'error');
    }
}
function displayChart(data, layout, chartId) {
    const display = document.getElementById('chartDisplay');
    display.innerHTML = `<div id="chart_${chartId}" style="width: 100%; height: 500px;"></div>`;
    
    Plotly.newPlot(`chart_${chartId}`, data, layout, { responsive: true });
}

function getFilteredMatchesByChartsPeriod() {
    const sel = document.getElementById('chartsInsightsPeriod');
    const val = sel?.value || '6';
    const months = (val === 'all') ? null : parseInt(val, 10);
    const all = (team.matches || []).slice().sort((a,b) => new Date(a.date) - new Date(b.date));
    if (!months) return all;
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - months);
    return all.filter(m => parseDate(m.date) >= cutoff);
}

async function showBestMapChart() {
    try {
        await ensurePlotlyAvailable();
        chartsCurrentView = 'bestMap';
        const filtered = getFilteredMatchesByChartsPeriod();
        const byMap = {};
        filtered.forEach(m => {
            const k = m.map || 'Unknown';
            if (!byMap[k]) byMap[k] = { w: 0, l: 0 };
            const res = (m.result || '').toLowerCase();
            if (res === 'win' || res === 'victoire') byMap[k].w++; else if (res === 'loss' || res === 'défaite' || res === 'defaite') byMap[k].l++;
        });
        const data = Object.entries(byMap).map(([map, s]) => {
            const tot = s.w + s.l; const wr = tot ? Math.round((s.w / tot) * 1000) / 10 : 0;
            return { map, wr, tot };
        }).sort((a,b) => b.wr - a.wr);
        const x = data.map(d => d.map);
        const y = data.map(d => d.wr);
        const text = data.map(d => `${d.wr}% • ${d.tot} matchs`);
        const trace = { x, y, type: 'bar', text, textposition: 'auto', marker: { color: '#ff4655' } };
        const layout = { title: 'Meilleure map (winrate)', yaxis: { range: [0, 100], ticksuffix: '%' }, margin: { t: 40 } };
        Plotly.react(document.getElementById('chartDisplay'), [trace], layout, { displayModeBar: false });
    } catch (e) {
        console.error(e);
        showNotification('Erreur affichage Meilleure map', 'error');
    }
}

async function showTopOpponentsChart() {
    try {
        await ensurePlotlyAvailable();
        chartsCurrentView = 'topOpponents';
        const filtered = getFilteredMatchesByChartsPeriod();
        const byOpp = {};
        filtered.forEach(m => {
            const k = m.opponent || 'Inconnu';
            if (!byOpp[k]) byOpp[k] = { w: 0, l: 0, c: 0 };
            byOpp[k].c++;
            const res = (m.result || '').toLowerCase();
            if (res === 'win' || res === 'victoire') byOpp[k].w++; else if (res === 'loss' || res === 'défaite' || res === 'defaite') byOpp[k].l++;
        });
        const data = Object.entries(byOpp).map(([name, s]) => {
            const wr = (s.w + s.l) ? Math.round((s.w / (s.w + s.l)) * 1000) / 10 : 0;
            return { name, count: s.c, wr };
        }).sort((a,b) => b.count - a.count).slice(0, 10);
        const x = data.map(d => d.name);
        const y = data.map(d => d.count);
        const text = data.map(d => `${d.count} matchs • ${d.wr}% WR`);
        const trace = { x, y, type: 'bar', text, textposition: 'auto' };
        const layout = { title: 'Top adversaires (volume)', margin: { t: 40 } };
        Plotly.react(document.getElementById('chartDisplay'), [trace], layout, { displayModeBar: false });
    } catch (e) {
        console.error(e);
        showNotification('Erreur affichage Top adversaires', 'error');
    }
}

// =========================================
// GRAPHIQUES COMPARATIFS PAR ÉQUIPE
// =========================================

function switchChartsSubTab(subTab) {
    // Gérer les onglets
    document.querySelectorAll('.charts-sub-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.chartsSubTab === subTab);
    });
    
    document.querySelectorAll('.charts-sub-tab-content').forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
    });
    
    const activeContent = document.getElementById(subTab === 'general' ? 'generalChartsTab' : 'comparativeChartsTab');
    if (activeContent) {
        activeContent.style.display = 'block';
        activeContent.classList.add('active');
    }
    
    // Initialiser les adversaires si on passe à l'onglet comparatif
    if (subTab === 'comparative') {
        updateComparativeOpponentsList();
    }
}

function initComparativeCharts() {
    // Sélection/Désélection de tous les adversaires
    const selectAllBtn = document.getElementById('selectAllOpponentsBtn');
    const deselectAllBtn = document.getElementById('deselectAllOpponentsBtn');
    const generateBtn = document.getElementById('generateComparativeChartBtn');
    const exportBtn = document.getElementById('exportComparativeChartPngBtn');
    
    if (selectAllBtn) {
        selectAllBtn.onclick = () => {
            const select = document.getElementById('comparativeOpponentSelect');
            if (select) {
                Array.from(select.options).forEach(opt => opt.selected = true);
            }
        };
    }
    
    if (deselectAllBtn) {
        deselectAllBtn.onclick = () => {
            const select = document.getElementById('comparativeOpponentSelect');
            if (select) {
                Array.from(select.options).forEach(opt => opt.selected = false);
            }
        };
    }
    
    if (generateBtn) {
        generateBtn.onclick = generateComparativeChart;
    }
    
    if (exportBtn) {
        exportBtn.onclick = exportComparativeChartPNG;
    }
    
    // Mettre à jour le sélecteur de match quand le type de graphique change
    const chartTypeSelect = document.getElementById('comparativeChartType');
    if (chartTypeSelect) {
        chartTypeSelect.onchange = () => {
            const chartType = chartTypeSelect.value;
            const waterfallMatchSelectLabel = document.getElementById('waterfallMatchSelectLabel');
            if (waterfallMatchSelectLabel) {
                if (chartType === 'waterfall') {
                    waterfallMatchSelectLabel.style.display = 'flex';
                    const selectedOpponents = getSelectedOpponents();
                    if (selectedOpponents.length > 0) {
                        updateWaterfallMatchSelect(selectedOpponents);
                    }
                } else {
                    waterfallMatchSelectLabel.style.display = 'none';
                }
            }
        };
    }
    
    // Mettre à jour la liste des matchs quand les adversaires sélectionnés changent (pour waterfall)
    const opponentSelect = document.getElementById('comparativeOpponentSelect');
    if (opponentSelect) {
        opponentSelect.addEventListener('change', () => {
            const chartType = chartTypeSelect?.value;
            if (chartType === 'waterfall') {
                const selectedOpponents = getSelectedOpponents();
                if (selectedOpponents.length > 0) {
                    updateWaterfallMatchSelect(selectedOpponents);
                }
            }
        });
    }
    
    // Mettre à jour la liste des adversaires
    updateComparativeOpponentsList();
}

function updateComparativeOpponentsList() {
    const select = document.getElementById('comparativeOpponentSelect');
    if (!select || !team || !team.matches) return;
    
    // Récupérer tous les adversaires uniques
    const opponents = [...new Set(team.matches.map(m => m.opponent).filter(o => o && o.trim()))].sort();
    
    select.innerHTML = '';
    opponents.forEach(opponent => {
        const option = document.createElement('option');
        option.value = opponent;
        option.textContent = opponent;
        select.appendChild(option);
    });
    
    if (opponents.length === 0) {
        select.innerHTML = '<option disabled>Aucun adversaire trouvé</option>';
    }
}

function getSelectedOpponents() {
    const select = document.getElementById('comparativeOpponentSelect');
    if (!select) return [];
    return Array.from(select.selectedOptions).map(opt => opt.value).filter(v => v);
}

async function generateComparativeChart() {
    try {
        await ensurePlotlyAvailable();
        
        const selectedOpponents = getSelectedOpponents();
        if (selectedOpponents.length === 0) {
            showNotification('Veuillez sélectionner au moins une équipe adverse', 'warning');
            return;
        }
        
        const chartType = document.getElementById('comparativeChartType')?.value || 'winrate';
        const display = document.getElementById('comparativeChartDisplay');
        if (!display) return;
        
        // Gérer l'affichage du sélecteur de match pour le graphique waterfall
        const waterfallMatchSelectLabel = document.getElementById('waterfallMatchSelectLabel');
        const waterfallMatchSelect = document.getElementById('waterfallMatchSelect');
        
        let selectedMatchIndex = -1;
        
        if (chartType === 'waterfall') {
            if (waterfallMatchSelectLabel && waterfallMatchSelect) {
                waterfallMatchSelectLabel.style.display = 'flex';
                
                // Vérifier si la liste doit être mise à jour (si les adversaires ont changé)
                const currentMatches = team.matches.filter(m => selectedOpponents.includes(m.opponent) && m.rounds && m.rounds.length > 0);
                const currentOptionsCount = waterfallMatchSelect.options.length - 1; // -1 pour l'option vide
                
                // Ne mettre à jour que si le nombre de matchs a changé ou si la liste est vide
                if (currentOptionsCount !== currentMatches.length || currentOptionsCount === 0) {
                    // Sauvegarder la valeur actuelle AVANT de mettre à jour
                    const savedValue = waterfallMatchSelect.value;
                    updateWaterfallMatchSelect(selectedOpponents);
                    // Restaurer la sélection si elle était valide
                    if (savedValue && savedValue !== '' && parseInt(savedValue, 10) < currentMatches.length) {
                        waterfallMatchSelect.value = savedValue;
                    }
                }
                
                // Récupérer la valeur sélectionnée APRÈS avoir géré la mise à jour
                const matchValue = waterfallMatchSelect.value;
                if (matchValue !== '' && matchValue !== null && matchValue !== undefined) {
                    selectedMatchIndex = parseInt(matchValue, 10);
                    if (isNaN(selectedMatchIndex) || selectedMatchIndex < 0) {
                        selectedMatchIndex = -1;
                    }
                }
            }
        } else if (waterfallMatchSelectLabel) {
            waterfallMatchSelectLabel.style.display = 'none';
        }
        
        let data, layout;
        
        switch (chartType) {
            case 'winrate':
                ({ data, layout } = generateComparativeWinrateChart(selectedOpponents));
                break;
            case 'mapPerformance':
                ({ data, layout } = generateComparativeMapPerformanceChart(selectedOpponents));
                break;
            case 'timeline':
                ({ data, layout } = generateComparativeTimelineChart(selectedOpponents));
                break;
            case 'heatmap':
                ({ data, layout } = generateComparativeHeatmapChart(selectedOpponents));
                break;
            case 'radar':
                ({ data, layout } = generateComparativeRadarChart(selectedOpponents));
                break;
            case 'scatter':
                ({ data, layout } = generateComparativeScatterChart(selectedOpponents));
                break;
            case 'pie':
                ({ data, layout } = generateComparativePieChart(selectedOpponents));
                break;
            case 'sidePerformance':
                ({ data, layout } = generateComparativeSidePerformanceChart(selectedOpponents));
                break;
            case 'scoreDistribution':
                ({ data, layout } = generateComparativeScoreDistributionChart(selectedOpponents));
                break;
            case 'boxplot':
                ({ data, layout } = generateComparativeBoxplotChart(selectedOpponents));
                break;
            case 'stackedBar':
                ({ data, layout } = generateComparativeStackedBarChart(selectedOpponents));
                break;
            case 'area':
                ({ data, layout } = generateComparativeAreaChart(selectedOpponents));
                break;
            case 'sankey':
                ({ data, layout } = generateSankeyRoundTransitionsChart(selectedOpponents));
                break;
            case 'radarPlayers':
                ({ data, layout } = generateRadarPlayersChart(selectedOpponents));
                break;
            case 'clustering':
                ({ data, layout } = generateClusteringChart(selectedOpponents));
                break;
            case 'waterfall':
                ({ data, layout } = generateWaterfallRoundsChart(selectedOpponents, selectedMatchIndex));
                break;
            default:
                showNotification('Type de graphique non reconnu', 'error');
                return;
        }
        
        display.innerHTML = `<div id="comparative_chart" style="width: 100%; height: 600px;"></div>`;
        Plotly.newPlot('comparative_chart', data, layout, { responsive: true });
        
    } catch (e) {
        console.error('Erreur génération graphique comparatif:', e);
        showNotification('Erreur lors de la génération du graphique', 'error');
    }
}

function generateComparativeWinrateChart(opponents) {
    const traces = [];
    const colors = ['#4CAF50', '#FF4655', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#795548'];
    
    opponents.forEach((opponent, idx) => {
        const matches = team.matches.filter(m => m.opponent === opponent);
        const victories = matches.filter(m => m.result === 'Victoire' || m.result === 'Win').length;
        const defeats = matches.filter(m => m.result === 'Défaite' || m.result === 'Loss' || m.result === 'Defaite').length;
        const total = victories + defeats;
        const winrate = total > 0 ? Math.round((victories / total) * 100 * 10) / 10 : 0;
        
        traces.push({
            x: [opponent],
            y: [winrate],
            type: 'bar',
            name: opponent,
            text: [`${winrate}%<br>(${victories}V/${defeats}D)`],
            textposition: 'auto',
            marker: { color: colors[idx % colors.length] }
        });
    });
    
    const layout = {
        title: '🏆 Winrate Comparatif par Équipe Adverse',
        xaxis: { title: 'Équipes Adverses' },
        yaxis: { title: 'Winrate (%)', range: [0, 100], ticksuffix: '%' },
        barmode: 'group',
        font: { size: 14 },
        showlegend: true,
        legend: { x: 1, y: 1 }
    };
    
    return { data: traces, layout };
}

function generateComparativeMapPerformanceChart(opponents) {
    const allMaps = [...new Set(team.matches.map(m => m.map).filter(m => m))].sort();
    const colors = ['#4CAF50', '#FF4655', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#795548'];
    
    const traces = opponents.map((opponent, idx) => {
        const winrates = allMaps.map(map => {
            const matches = team.matches.filter(m => m.map === map && m.opponent === opponent);
            const victories = matches.filter(m => m.result === 'Victoire' || m.result === 'Win').length;
            const defeats = matches.filter(m => m.result === 'Défaite' || m.result === 'Loss' || m.result === 'Defaite').length;
            const total = victories + defeats;
            return total > 0 ? Math.round((victories / total) * 100 * 10) / 10 : 0;
        });
        
        return {
            x: allMaps,
            y: winrates,
            type: 'bar',
            name: opponent,
            marker: { color: colors[idx % colors.length] },
            text: winrates.map(wr => `${wr}%`),
            textposition: 'auto'
        };
    });
    
    const layout = {
        title: '🗺️ Performance par Map - Comparaison par Équipe Adverse',
        xaxis: { title: 'Maps' },
        yaxis: { title: 'Winrate (%)', range: [0, 100], ticksuffix: '%' },
        barmode: 'group',
        font: { size: 14 },
        showlegend: true,
        legend: { x: 1, y: 1 }
    };
    
    return { data: traces, layout };
}

function generateComparativeTimelineChart(opponents) {
    const monthlyStats = {};
    const colors = ['#4CAF50', '#FF4655', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#795548'];
    
    // Collecter les stats par mois et par adversaire
    team.matches.forEach(match => {
        if (!opponents.includes(match.opponent)) return;
        try {
            const parts = match.date.split('-');
            if (parts.length === 3) {
                const monthKey = `${parts[2]}-${parts[1].padStart(2, '0')}`;
                if (!monthlyStats[monthKey]) monthlyStats[monthKey] = {};
                if (!monthlyStats[monthKey][match.opponent]) {
                    monthlyStats[monthKey][match.opponent] = { victories: 0, defeats: 0 };
                }
                if (match.result === 'Victoire' || match.result === 'Win') {
                    monthlyStats[monthKey][match.opponent].victories++;
                } else if (match.result === 'Défaite' || match.result === 'Loss' || match.result === 'Defaite') {
                    monthlyStats[monthKey][match.opponent].defeats++;
                }
            }
        } catch (e) {}
    });
    
    const sortedMonths = Object.keys(monthlyStats).sort();
    
    const traces = opponents.map((opponent, idx) => {
        const winrates = sortedMonths.map(month => {
            const stats = monthlyStats[month]?.[opponent] || { victories: 0, defeats: 0 };
            const total = stats.victories + stats.defeats;
            return total > 0 ? Math.round((stats.victories / total) * 100 * 10) / 10 : null;
        });
        
        return {
            x: sortedMonths,
            y: winrates,
            name: opponent,
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: colors[idx % colors.length], width: 3 },
            marker: { size: 8, color: colors[idx % colors.length] }
        };
    });
    
    const layout = {
        title: '📅 Évolution Temporelle du Winrate - Comparaison par Équipe',
        xaxis: { title: 'Mois' },
        yaxis: { title: 'Winrate (%)', range: [0, 100], ticksuffix: '%' },
        font: { size: 14 },
        showlegend: true,
        legend: { x: 1, y: 1 }
    };
    
    return { data: traces, layout };
}

function generateComparativeHeatmapChart(opponents) {
    const allMaps = [...new Set(team.matches.map(m => m.map).filter(m => m))].sort();
    const z = [];
    const y = [];
    
    opponents.forEach(opponent => {
        const row = allMaps.map(map => {
            const matches = team.matches.filter(m => m.map === map && m.opponent === opponent);
            const victories = matches.filter(m => m.result === 'Victoire' || m.result === 'Win').length;
            const defeats = matches.filter(m => m.result === 'Défaite' || m.result === 'Loss' || m.result === 'Defaite').length;
            const total = victories + defeats;
            return total > 0 ? Math.round((victories / total) * 100 * 10) / 10 : null;
        });
        z.push(row);
        y.push(opponent);
    });
    
    const data = [{
        z: z,
        x: allMaps,
        y: y,
        type: 'heatmap',
        colorscale: [[0, '#F44336'], [0.5, '#FF9800'], [1, '#4CAF50']],
        colorbar: { title: 'Winrate (%)', titleside: 'right' },
        text: z.map(row => row.map(val => val !== null ? `${val}%` : 'N/A')),
        texttemplate: '%{text}',
        textfont: { color: 'white', size: 10 }
    }];
    
    const layout = {
        title: '🔥 Heatmap de Performance - Équipe vs Map',
        xaxis: { title: 'Maps' },
        yaxis: { title: 'Équipes Adverses' },
        font: { size: 14 },
        height: Math.max(400, opponents.length * 60)
    };
    
    return { data, layout };
}

function generateComparativeRadarChart(opponents) {
    const allMaps = [...new Set(team.matches.map(m => m.map).filter(m => m))].slice(0, 8); // Limiter à 8 maps
    const colors = ['#4CAF50', '#FF4655', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#795548'];
    
    const traces = opponents.map((opponent, idx) => {
        const winrates = allMaps.map(map => {
            const matches = team.matches.filter(m => m.map === map && m.opponent === opponent);
            const victories = matches.filter(m => m.result === 'Victoire' || m.result === 'Win').length;
            const defeats = matches.filter(m => m.result === 'Défaite' || m.result === 'Loss' || m.result === 'Defaite').length;
            const total = victories + defeats;
            return total > 0 ? Math.round((victories / total) * 100 * 10) / 10 : 0;
        });
        
        return {
            r: winrates,
            theta: allMaps,
            name: opponent,
            type: 'scatterpolar',
            fill: 'toself',
            line: { color: colors[idx % colors.length], width: 2 },
            marker: { color: colors[idx % colors.length], size: 6 }
        };
    });
    
    const layout = {
        title: '📡 Radar Comparatif - Performance par Map',
        polar: {
            radialaxis: {
                visible: true,
                range: [0, 100],
                ticksuffix: '%'
            },
            angularaxis: {
                tickmode: 'array',
                tickvals: allMaps
            }
        },
        font: { size: 14 },
        showlegend: true
    };
    
    return { data: traces, layout };
}

function generateComparativeScatterChart(opponents) {
    const colors = ['#4CAF50', '#FF4655', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#795548'];
    
    const traces = opponents.map((opponent, idx) => {
        const matches = team.matches.filter(m => m.opponent === opponent && m.date && m.score);
        const data = matches.map(match => {
            const [ourScore, theirScore] = (match.score || '0-0').split('-').map(s => parseInt(s, 10) || 0);
            const date = new Date(match.date);
            const winrate = match.result === 'Victoire' || match.result === 'Win' ? 100 : 0;
            return { date, score: ourScore, theirScore, winrate, map: match.map };
        });
        
        return {
            x: data.map(d => d.date),
            y: data.map(d => d.score),
            mode: 'markers',
            type: 'scatter',
            name: opponent,
            text: data.map(d => `${d.map}<br>${d.score}-${d.theirScore}`),
            marker: {
                color: colors[idx % colors.length],
                size: 10,
                line: { width: 1, color: 'white' }
            }
        };
    });
    
    const layout = {
        title: '📊 Dispersion des Scores - Évolution dans le Temps',
        xaxis: { title: 'Date' },
        yaxis: { title: 'Score (nos points)' },
        font: { size: 14 },
        showlegend: true,
        legend: { x: 1, y: 1 },
        hovermode: 'closest'
    };
    
    return { data: traces, layout };
}

function generateComparativePieChart(opponents) {
    const traces = [];
    const colors = ['#4CAF50', '#F44336', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#795548'];
    
    opponents.forEach((opponent, idx) => {
        const matches = team.matches.filter(m => m.opponent === opponent);
        const victories = matches.filter(m => m.result === 'Victoire' || m.result === 'Win').length;
        const defeats = matches.filter(m => m.result === 'Défaite' || m.result === 'Loss' || m.result === 'Defaite').length;
        const total = victories + defeats;
        
        if (total > 0) {
            traces.push({
                values: [victories, defeats],
                labels: ['Victoires', 'Défaites'],
                type: 'pie',
                name: opponent,
                domain: {
                    row: Math.floor(idx / 2),
                    column: idx % 2
                },
                marker: {
                    colors: [colors[idx % colors.length], colors[(idx + 4) % colors.length]]
                },
                hole: 0.3,
                textinfo: 'label+percent',
                textposition: 'auto'
            });
        }
    });
    
    const rows = Math.ceil(opponents.length / 2);
    const layout = {
        title: '🥧 Répartition Victoires/Défaites par Équipe',
        grid: { rows: rows, columns: 2, pattern: 'independent' },
        font: { size: 12 },
        showlegend: true,
        legend: { x: 1, y: 1 }
    };
    
    return { data: traces, layout };
}

function generateComparativeSidePerformanceChart(opponents) {
    const colors = ['#4CAF50', '#FF4655', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#795548'];
    
    const traces = opponents.map((opponent, idx) => {
        const matches = team.matches.filter(m => m.opponent === opponent);
        
        // Compter les rounds gagnés/perdus par side
        let attackWins = 0;
        let attackTotal = 0;
        let defenseWins = 0;
        let defenseTotal = 0;
        
        matches.forEach(match => {
            if (match.rounds && Array.isArray(match.rounds)) {
                match.rounds.forEach(round => {
                    const side = (round.side || '').toLowerCase();
                    const winner = (round.winner || '').toLowerCase();
                    
                    // Déterminer si notre équipe a gagné ce round
                    // On suppose que "us", "our", "team" ou le nom de l'équipe = victoire
                    const isWin = winner === 'us' || winner === 'our' || winner === 'team' || 
                                 (match.result && (match.result === 'Victoire' || match.result === 'Win'));
                    
                    if (side === 'attack' || side === 'attaque' || side === 'atk') {
                        attackTotal++;
                        if (isWin) attackWins++;
                    } else if (side === 'defense' || side === 'défense' || side === 'def' || side === 'defense') {
                        defenseTotal++;
                        if (isWin) defenseWins++;
                    }
                });
            }
        });
        
        // Si pas de données de rounds, utiliser une estimation basée sur le score moyen
        // ou afficher un message d'information
        let attackWR = 50;
        let defenseWR = 50;
        
        if (attackTotal > 0) {
            attackWR = Math.round((attackWins / attackTotal) * 100 * 10) / 10;
        } else {
            // Estimation basée sur les matchs gagnés (si on gagne souvent, on est probablement bon en attaque)
            const totalWins = matches.filter(m => m.result === 'Victoire' || m.result === 'Win').length;
            const totalMatches = matches.length;
            if (totalMatches > 0) {
                const overallWR = (totalWins / totalMatches) * 100;
                attackWR = overallWR; // Estimation
            }
        }
        
        if (defenseTotal > 0) {
            defenseWR = Math.round((defenseWins / defenseTotal) * 100 * 10) / 10;
        } else {
            // Même estimation
            const totalWins = matches.filter(m => m.result === 'Victoire' || m.result === 'Win').length;
            const totalMatches = matches.length;
            if (totalMatches > 0) {
                const overallWR = (totalWins / totalMatches) * 100;
                defenseWR = overallWR; // Estimation
            }
        }
        
        return {
            x: ['Attaque', 'Défense'],
            y: [attackWR, defenseWR],
            type: 'bar',
            name: opponent,
            marker: { color: colors[idx % colors.length] },
            text: [`${attackWR}%${attackTotal > 0 ? `<br>(${attackWins}/${attackTotal})` : ' (est.)'}`, 
                   `${defenseWR}%${defenseTotal > 0 ? `<br>(${defenseWins}/${defenseTotal})` : ' (est.)'}`],
            textposition: 'auto'
        };
    });
    
    const layout = {
        title: '⚔️ Performance par Side (Attaque/Défense)',
        xaxis: { title: 'Side' },
        yaxis: { title: 'Winrate (%)', range: [0, 100], ticksuffix: '%' },
        barmode: 'group',
        font: { size: 14 },
        showlegend: true,
        legend: { x: 1, y: 1 }
    };
    
    return { data: traces, layout };
}

function generateComparativeScoreDistributionChart(opponents) {
    const colors = ['#4CAF50', '#FF4655', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#795548'];
    
    const traces = opponents.map((opponent, idx) => {
        const matches = team.matches.filter(m => m.opponent === opponent && m.score);
        const scores = matches.map(match => {
            const [ourScore] = (match.score || '0-0').split('-').map(s => parseInt(s, 10) || 0);
            return ourScore;
        }).filter(s => s > 0);
        
        return {
            x: scores,
            type: 'histogram',
            name: opponent,
            marker: { color: colors[idx % colors.length], opacity: 0.7 },
            nbinsx: 13,
            histnorm: 'probability'
        };
    });
    
    const layout = {
        title: '📈 Distribution des Scores par Équipe',
        xaxis: { title: 'Score (nos points)' },
        yaxis: { title: 'Fréquence' },
        barmode: 'overlay',
        font: { size: 14 },
        showlegend: true,
        legend: { x: 1, y: 1 }
    };
    
    return { data: traces, layout };
}

function generateComparativeBoxplotChart(opponents) {
    const colors = ['#4CAF50', '#FF4655', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#795548'];
    
    const traces = opponents.map((opponent, idx) => {
        const matches = team.matches.filter(m => m.opponent === opponent && m.score);
        const scores = matches.map(match => {
            const [ourScore] = (match.score || '0-0').split('-').map(s => parseInt(s, 10) || 0);
            return ourScore;
        }).filter(s => s > 0);
        
        return {
            y: scores,
            type: 'box',
            name: opponent,
            marker: { color: colors[idx % colors.length] },
            boxpoints: 'outliers'
        };
    });
    
    const layout = {
        title: '📦 Box Plot - Distribution des Scores',
        xaxis: { title: 'Équipes Adverses' },
        yaxis: { title: 'Score (nos points)' },
        font: { size: 14 },
        showlegend: true
    };
    
    return { data: traces, layout };
}

function generateComparativeStackedBarChart(opponents) {
    const allMaps = [...new Set(team.matches.map(m => m.map).filter(m => m))].sort();
    const colors = ['#4CAF50', '#F44336', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#795548'];
    
    const victoryTraces = opponents.map((opponent, idx) => {
        const victories = allMaps.map(map => {
            const matches = team.matches.filter(m => m.map === map && m.opponent === opponent);
            return matches.filter(m => m.result === 'Victoire' || m.result === 'Win').length;
        });
        
        return {
            x: allMaps,
            y: victories,
            name: `${opponent} - Victoires`,
            type: 'bar',
            marker: { color: colors[idx % colors.length] }
        };
    });
    
    const defeatTraces = opponents.map((opponent, idx) => {
        const defeats = allMaps.map(map => {
            const matches = team.matches.filter(m => m.map === map && m.opponent === opponent);
            return matches.filter(m => m.result === 'Défaite' || m.result === 'Loss' || m.result === 'Defaite').length;
        });
        
        return {
            x: allMaps,
            y: defeats,
            name: `${opponent} - Défaites`,
            type: 'bar',
            marker: { color: colors[(idx + 4) % colors.length], opacity: 0.7 }
        };
    });
    
    const layout = {
        title: '📊 Barres Empilées - Victoires/Défaites par Map',
        xaxis: { title: 'Maps' },
        yaxis: { title: 'Nombre de Matchs' },
        barmode: 'stack',
        font: { size: 14 },
        showlegend: true,
        legend: { x: 1, y: 1 }
    };
    
    return { data: [...victoryTraces, ...defeatTraces], layout };
}

function generateComparativeAreaChart(opponents) {
    const monthlyStats = {};
    const colors = ['#4CAF50', '#FF4655', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#795548'];
    
    // Collecter les stats par mois et par adversaire
    team.matches.forEach(match => {
        if (!opponents.includes(match.opponent)) return;
        if (!match.date) return;
        
        try {
            // Gérer différents formats de date
            let dateObj;
            if (match.date.includes('-')) {
                const parts = match.date.split('-');
                if (parts.length === 3) {
                    // Format DD-MM-YYYY ou YYYY-MM-DD
                    if (parts[0].length === 4) {
                        // YYYY-MM-DD
                        dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    } else {
                        // DD-MM-YYYY
                        dateObj = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                    }
                } else {
                    dateObj = new Date(match.date);
                }
            } else {
                dateObj = new Date(match.date);
            }
            
            if (isNaN(dateObj.getTime())) return;
            
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const monthKey = `${year}-${month}`;
            
            if (!monthlyStats[monthKey]) monthlyStats[monthKey] = {};
            if (!monthlyStats[monthKey][match.opponent]) {
                monthlyStats[monthKey][match.opponent] = { victories: 0, defeats: 0 };
            }
            
            const res = (match.result || '').toLowerCase();
            if (res === 'victoire' || res === 'win') {
                monthlyStats[monthKey][match.opponent].victories++;
            } else if (res === 'défaite' || res === 'defaite' || res === 'loss') {
                monthlyStats[monthKey][match.opponent].defeats++;
            }
        } catch (e) {
            console.warn('Erreur parsing date:', match.date, e);
        }
    });
    
    const sortedMonths = Object.keys(monthlyStats).sort();
    
    if (sortedMonths.length === 0) {
        // Pas de données temporelles, utiliser un graphique simple basé sur tous les matchs
        const traces = opponents.map((opponent, idx) => {
            const matches = team.matches.filter(m => m.opponent === opponent);
            const victories = matches.filter(m => {
                const res = (m.result || '').toLowerCase();
                return res === 'victoire' || res === 'win';
            }).length;
            const defeats = matches.filter(m => {
                const res = (m.result || '').toLowerCase();
                return res === 'défaite' || res === 'defaite' || res === 'loss';
            }).length;
            const total = victories + defeats;
            const winrate = total > 0 ? Math.round((victories / total) * 100 * 10) / 10 : 0;
            
            return {
                x: [opponent],
                y: [winrate],
                name: opponent,
                type: 'bar',
                marker: { color: colors[idx % colors.length] },
                text: [`${winrate}%`],
                textposition: 'auto'
            };
        });
        
        return {
            data: traces,
            layout: {
                title: '📊 Winrate Cumulé (pas de données temporelles disponibles)',
                xaxis: { title: 'Équipes Adverses' },
                yaxis: { title: 'Winrate (%)', range: [0, 100], ticksuffix: '%' },
                font: { size: 14 },
                showlegend: true
            }
        };
    }
    
    // Calculer le winrate cumulé
    const cumulativeStats = {};
    opponents.forEach(opponent => {
        cumulativeStats[opponent] = [];
        let cumulativeWins = 0;
        let cumulativeTotal = 0;
        
        sortedMonths.forEach(month => {
            const stats = monthlyStats[month]?.[opponent] || { victories: 0, defeats: 0 };
            cumulativeWins += stats.victories;
            cumulativeTotal += stats.victories + stats.defeats;
            const winrate = cumulativeTotal > 0 ? Math.round((cumulativeWins / cumulativeTotal) * 100 * 10) / 10 : null;
            cumulativeStats[opponent].push(winrate !== null ? winrate : 0);
        });
    });
    
    const traces = opponents.map((opponent, idx) => {
        const yValues = cumulativeStats[opponent];
        // Filtrer les valeurs null/undefined
        const validY = yValues.filter(v => v !== null && v !== undefined);
        
        if (validY.length === 0) {
            // Pas de données pour cet adversaire
            return null;
        }
        
        return {
            x: sortedMonths,
            y: yValues,
            name: opponent,
            type: 'scatter',
            mode: 'lines',
            fill: 'tozeroy',
            line: { color: colors[idx % colors.length], width: 2 },
            fillcolor: colors[idx % colors.length] + '40'
        };
    }).filter(t => t !== null);
    
    if (traces.length === 0) {
        // Aucune trace valide
        return {
            data: [],
            layout: {
                title: '📊 Aire - Winrate Cumulé (aucune donnée disponible)',
                font: { size: 14 }
            }
        };
    }
    
    const layout = {
        title: '📊 Aire - Winrate Cumulé dans le Temps',
        xaxis: { title: 'Mois' },
        yaxis: { title: 'Winrate Cumulé (%)', range: [0, 100], ticksuffix: '%' },
        font: { size: 14 },
        showlegend: true,
        legend: { x: 1, y: 1 }
    };
    
    return { data: traces, layout };
}

// =========================================
// NOUVEAUX GRAPHIQUES AVANCÉS
// =========================================

function generateSankeyRoundTransitionsChart(opponents) {
    // Collecter toutes les transitions de rounds
    const transitions = {};
    const roundTypes = new Set();
    
    opponents.forEach(opponent => {
        const matches = team.matches.filter(m => m.opponent === opponent && m.rounds && m.rounds.length > 0);
        
        matches.forEach(match => {
            for (let i = 0; i < match.rounds.length - 1; i++) {
                const currentRound = match.rounds[i];
                const nextRound = match.rounds[i + 1];
                
                const currentType = (currentRound.type || 'unknown').toLowerCase();
                const nextType = (nextRound.type || 'unknown').toLowerCase();
                const currentWinner = (currentRound.winner || '').toLowerCase();
                const nextWinner = (nextRound.winner || '').toLowerCase();
                
                roundTypes.add(currentType);
                roundTypes.add(nextType);
                
                const key = `${currentType}→${nextType}`;
                if (!transitions[key]) {
                    transitions[key] = { count: 0, wins: 0, impact: 0 };
                }
                
                transitions[key].count++;
                
                // Calculer l'impact sur le score
                const isWin = currentWinner === 'nous' || currentWinner === 'us' || 
                             (match.result && (match.result === 'Victoire' || match.result === 'Win'));
                if (isWin) {
                    transitions[key].wins++;
                }
                
                // Impact = probabilité de gagner le round suivant après ce type
                const nextIsWin = nextWinner === 'nous' || nextWinner === 'us' || 
                                 (match.result && (match.result === 'Victoire' || match.result === 'Win'));
                if (nextIsWin) {
                    transitions[key].impact++;
                }
            }
        });
    });
    
    // Créer les nœuds et liens pour Sankey
    const nodeLabels = Array.from(roundTypes).sort();
    const nodeIndices = {};
    nodeLabels.forEach((label, idx) => {
        nodeIndices[label] = idx;
    });
    
    const source = [];
    const target = [];
    const value = [];
    const linkColors = [];
    
    Object.entries(transitions).forEach(([key, data]) => {
        const [from, to] = key.split('→');
        if (nodeIndices[from] !== undefined && nodeIndices[to] !== undefined) {
            source.push(nodeIndices[from]);
            target.push(nodeIndices[to]);
            
            // L'épaisseur est proportionnelle à l'impact (winrate du round suivant)
            const impactRate = data.count > 0 ? (data.impact / data.count) : 0;
            const thickness = data.count * (1 + impactRate * 2); // Amplifier l'impact
            
            value.push(thickness);
            
            // Couleur basée sur le winrate
            const winrate = data.count > 0 ? (data.wins / data.count) : 0;
            const colorIntensity = Math.round(winrate * 255);
            linkColors.push(`rgba(${255 - colorIntensity}, ${colorIntensity}, 100, 0.6)`);
        }
    });
    
    if (source.length === 0) {
        return {
            data: [],
            layout: {
                title: '🌊 Sankey - Transitions de Rounds (aucune donnée disponible)',
                font: { size: 14 }
            }
        };
    }
    
    const data = [{
        type: 'sankey',
        node: {
            pad: 15,
            thickness: 20,
            line: { color: 'black', width: 0.5 },
            label: nodeLabels.map(l => l.charAt(0).toUpperCase() + l.slice(1))
        },
        link: {
            source: source,
            target: target,
            value: value,
            color: linkColors
        }
    }];
    
    const layout = {
        title: '🌊 Sankey - Transitions de Rounds et Impact sur Score',
        font: { size: 14 },
        height: 600
    };
    
    return { data, layout };
}

function generateRadarPlayersChart(opponents) {
    // Grouper les joueurs par rôle
    const playersByRole = {};
    (team.players || []).forEach(player => {
        const role = player.role || 'Unknown';
        if (!playersByRole[role]) {
            playersByRole[role] = [];
        }
        playersByRole[role].push(player);
    });
    
    // Pour chaque adversaire, calculer les stats par joueur
    // Note: Les stats détaillées (KDA, ACS, etc.) ne sont pas encore dans la structure
    // On utilise les données disponibles : nombre de matchs, winrate, agents joués
    
    const colors = ['#4CAF50', '#FF4655', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#795548'];
    const traces = [];
    let colorIdx = 0;
    
    Object.entries(playersByRole).forEach(([role, players]) => {
        players.forEach(player => {
            // Calculer les stats disponibles
            const matches = team.matches.filter(m => 
                opponents.includes(m.opponent) && 
                m.rounds && m.rounds.length > 0
            );
            
            const victories = matches.filter(m => 
                m.result === 'Victoire' || m.result === 'Win'
            ).length;
            const totalMatches = matches.length;
            const winrate = totalMatches > 0 ? (victories / totalMatches) * 100 : 0;
            
            // Nombre d'agents différents joués
            const agentsPlayed = Object.keys(player.known_agents || {}).length;
            const totalAgentsKnown = Object.values(player.known_agents || {}).reduce((sum, arr) => sum + (arr?.length || 0), 0);
            
            // Estimation basée sur les données disponibles
            const metrics = {
                'Winrate': Math.min(winrate, 100),
                'Agents': Math.min((agentsPlayed / 10) * 100, 100), // Normalisé
                'Polyvalence': Math.min((totalAgentsKnown / 50) * 100, 100),
                'Maps': Math.min((totalMatches / 20) * 100, 100), // Normalisé
                'Consistance': winrate > 50 ? 70 : 30, // Estimation
                'Expérience': Math.min((totalMatches / 30) * 100, 100)
            };
            
            const theta = Object.keys(metrics);
            const r = Object.values(metrics);
            
            traces.push({
                r: r,
                theta: theta,
                name: `${player.name} (${role})`,
                type: 'scatterpolar',
                fill: 'toself',
                line: { color: colors[colorIdx % colors.length], width: 2 },
                marker: { color: colors[colorIdx % colors.length], size: 4 }
            });
            
            colorIdx++;
        });
    });
    
    if (traces.length === 0) {
        return {
            data: [],
            layout: {
                title: '📡 Radar Multiples - Joueurs (aucun joueur disponible)',
                font: { size: 14 }
            }
        };
    }
    
    const layout = {
        title: '📡 Radar Multiples - Comparaison Joueurs par Rôle',
        polar: {
            radialaxis: {
                visible: true,
                range: [0, 100],
                ticksuffix: '%'
            }
        },
        font: { size: 14 },
        showlegend: true,
        legend: { x: 1.1, y: 1 }
    };
    
    return { data: traces, layout };
}

function generateClusteringChart(opponents) {
    // Préparer les données pour le clustering
    // Utiliser les caractéristiques disponibles : winrate, nombre de matchs, agents, etc.
    const playerFeatures = [];
    const playerNames = [];
    
    (team.players || []).forEach(player => {
        const matches = team.matches.filter(m => opponents.includes(m.opponent));
        const victories = matches.filter(m => m.result === 'Victoire' || m.result === 'Win').length;
        const totalMatches = matches.length;
        const winrate = totalMatches > 0 ? (victories / totalMatches) : 0;
        
        const agentsPlayed = Object.keys(player.known_agents || {}).length;
        const totalAgentsKnown = Object.values(player.known_agents || {}).reduce((sum, arr) => sum + (arr?.length || 0), 0);
        
        // Features: [winrate, totalMatches, agentsPlayed, totalAgentsKnown, role_encoded]
        const roleEncoded = {
            'Duelist': 1,
            'Initiator': 2,
            'Controller': 3,
            'Sentinel': 4
        }[player.role] || 0;
        
        playerFeatures.push([
            winrate,
            totalMatches / 10, // Normalisé
            agentsPlayed,
            totalAgentsKnown / 10, // Normalisé
            roleEncoded
        ]);
        playerNames.push(player.name);
    });
    
    if (playerFeatures.length < 2) {
        return {
            data: [],
            layout: {
                title: '🎯 Clustering - Profils de Joueurs (minimum 2 joueurs requis)',
                font: { size: 14 }
            }
        };
    }
    
    // K-means simple (2 clusters)
    const k = Math.min(3, Math.floor(playerFeatures.length / 2));
    const clusters = simpleKMeans(playerFeatures, k);
    
    // PCA simple pour réduire à 2D
    const pcaData = simplePCA(playerFeatures, 2);
    
    // Créer les traces par cluster
    const colors = ['#4CAF50', '#FF4655', '#2196F3', '#FF9800', '#9C27B0'];
    const traces = [];
    
    for (let i = 0; i < k; i++) {
        const clusterPoints = [];
        const clusterNames = [];
        
        clusters.forEach((cluster, idx) => {
            if (cluster === i) {
                clusterPoints.push({
                    x: pcaData[idx][0],
                    y: pcaData[idx][1]
                });
                clusterNames.push(playerNames[idx]);
            }
        });
        
        if (clusterPoints.length > 0) {
            traces.push({
                x: clusterPoints.map(p => p.x),
                y: clusterPoints.map(p => p.y),
                mode: 'markers+text',
                type: 'scatter',
                name: `Cluster ${i + 1}`,
                text: clusterNames,
                textposition: 'top center',
                marker: {
                    color: colors[i % colors.length],
                    size: 12,
                    line: { width: 2, color: 'white' }
                }
            });
        }
    }
    
    const layout = {
        title: '🎯 Clustering - Profils de Joueurs (PCA 2D)',
        xaxis: { title: 'Composante Principale 1' },
        yaxis: { title: 'Composante Principale 2' },
        font: { size: 14 },
        showlegend: true,
        legend: { x: 1, y: 1 }
    };
    
    return { data: traces, layout };
}

function updateWaterfallMatchSelect(opponents) {
    const select = document.getElementById('waterfallMatchSelect');
    if (!select) return;
    
    const matches = team.matches.filter(m => opponents.includes(m.opponent) && m.rounds && m.rounds.length > 0);
    
    select.innerHTML = '<option value="">Sélectionner un match...</option>';
    
    matches.forEach((match, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        const date = match.date || 'Date inconnue';
        const map = match.map || 'Map inconnue';
        const score = match.score || 'Score inconnu';
        const roundsCount = match.rounds ? match.rounds.length : 0;
        option.textContent = `${date} - ${map} vs ${match.opponent} (${score}) - ${roundsCount} rounds`;
        select.appendChild(option);
    });
    
    // Sélectionner le premier match par défaut si disponible
    if (matches.length > 0 && select.value === '') {
        select.value = '0';
    }
}

function generateWaterfallRoundsChart(opponents, selectedMatchIndex = -1) {
    // Sélectionner les matchs disponibles
    const matches = team.matches.filter(m => opponents.includes(m.opponent) && m.rounds && m.rounds.length > 0);
    
    if (matches.length === 0) {
        return {
            data: [],
            layout: {
                title: '💧 Cascade - Évolution Score (aucune donnée de rounds)',
                font: { size: 14 }
            }
        };
    }
    
    // Utiliser le match sélectionné ou récupérer depuis le select directement si l'index n'est pas valide
    let selectedMatch;
    if (selectedMatchIndex >= 0 && selectedMatchIndex < matches.length) {
        selectedMatch = matches[selectedMatchIndex];
    } else {
        // Si aucun index valide, essayer de récupérer depuis le select directement
        const waterfallMatchSelect = document.getElementById('waterfallMatchSelect');
        if (waterfallMatchSelect && waterfallMatchSelect.value !== '' && waterfallMatchSelect.value !== null) {
            const directIndex = parseInt(waterfallMatchSelect.value, 10);
            if (!isNaN(directIndex) && directIndex >= 0 && directIndex < matches.length) {
                selectedMatch = matches[directIndex];
            }
        }
        
        // Si toujours pas de match, utiliser le premier par défaut
        if (!selectedMatch) {
            selectedMatch = matches[0];
        }
    }
    
    // Filtrer les rounds pour ne garder que ceux avec un gagnant défini
    const validRounds = selectedMatch.rounds.filter(round => {
        const winner = round.winner || '';
        return winner === 'Nous' || winner === 'Adversaire';
    });
    
    if (validRounds.length === 0) {
        return {
            data: [],
            layout: {
                title: `💧 Cascade - Évolution Score: ${selectedMatch.map} vs ${selectedMatch.opponent} (aucun round valide)`,
                font: { size: 14 }
            }
        };
    }
    
    let ourScore = 0;
    let theirScore = 0;
    const measures = [];
    const bases = [];
    const texts = [];
    const colors = [];
    const xLabels = [];
    
    validRounds.forEach((round, idx) => {
        const roundType = round.type || '-';
        const winner = round.winner || '';
        const isWin = winner === 'Nous';
        
        // Label de l'axe X : format simple pour compatibilité Plotly
        // Le type de round sera dans le texte de la barre
        xLabels.push(`R${idx + 1}`);
        
        const currentDiff = ourScore - theirScore;
        bases.push(currentDiff);
        
        // Texte affiché au-dessus/en dessous de la barre avec type de round
        const roundTypeDisplay = roundType !== '-' ? `<br><span style="font-size:10px;opacity:0.75;">${roundType}</span>` : '';
        
        if (isWin) {
            ourScore++;
            measures.push('relative');
            colors.push('#4CAF50');
            texts.push(`+1<br>${ourScore}-${theirScore}${roundTypeDisplay}`);
        } else {
            theirScore++;
            measures.push('relative');
            colors.push('#F44336');
            texts.push(`-1<br>${ourScore}-${theirScore}${roundTypeDisplay}`);
        }
    });
    
    // Calculer les valeurs y (différences)
    const yValues = [];
    validRounds.forEach((round) => {
        const winner = round.winner || '';
        const isWin = winner === 'Nous';
        yValues.push(isWin ? 1 : -1);
    });
    
    // Si Plotly ne supporte pas waterfall, utiliser un graphique en barres empilées
    const data = [{
        type: 'bar',
        x: xLabels,
        y: yValues,
        text: texts,
        textposition: 'outside',
        marker: {
            color: colors,
            line: { color: 'rgb(63, 63, 63)', width: 1 }
        },
        base: bases
    }];
    
    // Créer des annotations pour afficher les types de rounds sous l'axe X
    const annotations = validRounds.map((round, idx) => {
        const roundType = round.type || '-';
        if (roundType === '-') return null;
        
        return {
            x: idx,
            y: -0.15,
            yref: 'paper',
            text: roundType,
            showarrow: false,
            font: { size: 9, color: '#888' },
            xanchor: 'center',
            yanchor: 'top',
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            bordercolor: 'rgba(200, 200, 200, 0.5)',
            borderwidth: 1,
            borderpad: 2
        };
    }).filter(a => a !== null);
    
    const layout = {
        title: `💧 Cascade - Évolution Score: ${selectedMatch.map} vs ${selectedMatch.opponent}`,
        xaxis: { 
            title: 'Rounds',
            tickangle: 0,
            tickfont: { size: 10 }
        },
        yaxis: { title: 'Différence de Score (Nous - Eux)' },
        font: { size: 14 },
        showlegend: false,
        barmode: 'overlay',
        margin: { b: annotations.length > 0 ? 120 : 60, t: 60 }, // Augmenter la marge du bas pour les annotations de types de rounds
        annotations: annotations.length > 0 ? annotations : undefined
    };
    
    return { data, layout };
}

// =========================================
// ALGORITHMES D'AIDE POUR LE CLUSTERING
// =========================================

function simpleKMeans(data, k, maxIterations = 100) {
    if (data.length === 0 || k <= 0) return [];
    
    // Initialiser les centroïdes aléatoirement
    const centroids = [];
    for (let i = 0; i < k; i++) {
        const randomIdx = Math.floor(Math.random() * data.length);
        centroids.push([...data[randomIdx]]);
    }
    
    let clusters = new Array(data.length).fill(0);
    
    for (let iter = 0; iter < maxIterations; iter++) {
        const newClusters = [];
        
        // Assigner chaque point au centroïde le plus proche
        data.forEach((point, idx) => {
            let minDist = Infinity;
            let closestCentroid = 0;
            
            centroids.forEach((centroid, cIdx) => {
                const dist = euclideanDistance(point, centroid);
                if (dist < minDist) {
                    minDist = dist;
                    closestCentroid = cIdx;
                }
            });
            
            newClusters.push(closestCentroid);
        });
        
        // Vérifier la convergence
        let changed = false;
        for (let i = 0; i < clusters.length; i++) {
            if (clusters[i] !== newClusters[i]) {
                changed = true;
                break;
            }
        }
        
        if (!changed) break;
        
        clusters = newClusters;
        
        // Mettre à jour les centroïdes
        for (let c = 0; c < k; c++) {
            const clusterPoints = data.filter((_, idx) => clusters[idx] === c);
            if (clusterPoints.length > 0) {
                const dims = data[0].length;
                centroids[c] = [];
                for (let d = 0; d < dims; d++) {
                    const sum = clusterPoints.reduce((s, p) => s + p[d], 0);
                    centroids[c][d] = sum / clusterPoints.length;
                }
            }
        }
    }
    
    return clusters;
}

function simplePCA(data, dimensions) {
    if (data.length === 0) return [];
    
    const n = data.length;
    const m = data[0].length;
    
    // Centrer les données
    const mean = new Array(m).fill(0);
    data.forEach(point => {
        point.forEach((val, idx) => {
            mean[idx] += val;
        });
    });
    mean.forEach((val, idx) => mean[idx] = val / n);
    
    const centered = data.map(point => 
        point.map((val, idx) => val - mean[idx])
    );
    
    // Calculer la matrice de covariance
    const covariance = [];
    for (let i = 0; i < m; i++) {
        covariance[i] = [];
        for (let j = 0; j < m; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += centered[k][i] * centered[k][j];
            }
            covariance[i][j] = sum / (n - 1);
        }
    }
    
    // Calculer les valeurs propres et vecteurs propres (simplifié)
    // Pour 2D, on prend les 2 premières composantes principales
    const result = [];
    centered.forEach(point => {
        // Projection simplifiée sur les 2 premières dimensions
        result.push([point[0] || 0, point[1] || 0]);
    });
    
    return result;
}

function euclideanDistance(a, b) {
    if (a.length !== b.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
}

async function exportComparativeChartPNG() {
    try {
        await ensurePlotlyAvailable();
        const chartDiv = document.getElementById('comparativeChartDisplay');
        const firstPlot = chartDiv?.querySelector('.js-plotly-plot');
        if (!firstPlot) {
            showNotification('Aucun graphique comparatif à exporter', 'warning');
            return;
        }
        const dataUrl = await Plotly.toImage(firstPlot, { format: 'png', width: 1280, height: 720 });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `comparative_chart_${new Date().toISOString().replace(/[:.]/g,'-')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showNotification('Graphique comparatif exporté (PNG)', 'success');
    } catch (e) {
        console.error(e);
        showNotification('Erreur export du graphique comparatif', 'error');
    }
}

// =========================================
// PROGRESSION
// =========================================

function updateProgressionTab() {
    const list = document.getElementById('progressionList');
    list.innerHTML = '';
    
    if (!team.progression_entries || team.progression_entries.length === 0) {
        list.innerHTML = '<div class="empty-state">Aucune session enregistrée. Cliquez sur "➕ Ajouter une Session" pour commencer votre suivi.</div>';
        return;
    }
    
    [...team.progression_entries].reverse().forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'list-item progression-item';
        if (selectedProgressionEntry === entry) {
            item.classList.add('selected');
        }
        
        const resultColor = entry.result === 'Victoire' ? '#2d5f2d' : '#5f2d2d';
        const textColor = entry.result === 'Victoire' ? '#00ff00' : '#ff0000';
        
        item.innerHTML = `
            <div class="progression-header" style="background-color: ${resultColor};">
                <span class="progression-info">
                    📅 ${entry.date || 'N/A'} | 🗺️ ${entry.map || 'N/A'} | 🎭 ${entry.agent || 'N/A'} | 📊 KDA: ${entry.kda || 'N/A'}
                </span>
                <span class="progression-result" style="color: ${textColor};">
                    ${entry.result === 'Victoire' ? '✅' : '❌'} ${entry.result || 'N/A'}
                </span>
                <button class="btn-small" data-action="view-progression" data-index="${team.progression_entries.length - 1 - index}">👁️ Voir Détails</button>
            </div>
        `;
        
        item.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                selectedProgressionEntry = entry;
                updateProgressionTab();
            }
        });
        
        item.querySelector('[data-action="view-progression"]').addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(e.target.dataset.index);
            viewProgressionDetails(team.progression_entries[index]);
        });
        
        list.appendChild(item);
    });
}

function addProgressionEntry() {
    showProgressionModal();
}

function deleteProgressionEntry() {
    if (!selectedProgressionEntry) {
        showNotification('Veuillez sélectionner une session à supprimer', 'error');
        return;
    }
    
    if (confirm('Voulez-vous vraiment supprimer cette session de progression ?')) {
        team.progression_entries = team.progression_entries.filter(e => e !== selectedProgressionEntry);
        selectedProgressionEntry = null;
        updateProgressionTab();
        saveTeam();
        showNotification('Session supprimée avec succès', 'success');
    }
}

function showProgressionModal() {
    const modal = document.getElementById('progressionModal');
    const body = document.getElementById('progressionModalBody');
    
    body.innerHTML = `
        <div class="progression-form">
            <div class="form-section basic">
                <h4>📋 Informations de Base</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Date:</label>
                        <input type="text" id="progDate" placeholder="JJ-MM-AAAA">
                    </div>
                    <div class="form-group">
                        <label>Map:</label>
                        <select id="progMap">${ALL_MAPS.map(m => `<option value="${m}">${m}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>Agent:</label>
                        <select id="progAgent">${ALL_AGENTS.map(a => `<option value="${a}">${a}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>KDA:</label>
                        <input type="text" id="progKDA" placeholder="K/D/A (ex: 18/12/5)">
                    </div>
                    <div class="form-group">
                        <label>Résultat:</label>
                        <select id="progResult">
                            <option value="Victoire">Victoire</option>
                            <option value="Défaite">Défaite</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="form-section positive">
                <h4>✅ Points Positifs</h4>
                <div class="form-subsection">
                    <label>🧠 Mental:</label>
                    <textarea id="progMentalPos" rows="3" placeholder="Gestion du stress, du tilt, qualité des communications..."></textarea>
                </div>
                <div class="form-subsection">
                    <label>🗺️ Macro:</label>
                    <textarea id="progMacroPos" rows="3" placeholder="Vision de jeu, gestion de l'espace, adaptation..."></textarea>
                </div>
                <div class="form-subsection">
                    <label>🎯 Micro:</label>
                    <textarea id="progMicroPos" rows="3" placeholder="Mécaniques, positionnement, capacité à refrag..."></textarea>
                </div>
            </div>
            
            <div class="form-section negative">
                <h4>⚠️ Points Négatifs</h4>
                <div class="form-subsection">
                    <label>🧠 Mental:</label>
                    <textarea id="progMentalNeg" rows="3"></textarea>
                </div>
                <div class="form-subsection">
                    <label>🗺️ Macro:</label>
                    <textarea id="progMacroNeg" rows="3"></textarea>
                </div>
                <div class="form-subsection">
                    <label>🎯 Micro:</label>
                    <textarea id="progMicroNeg" rows="3"></textarea>
                </div>
            </div>
            
            <div class="form-section urgent">
                <h4>🚨 À Bosser en Urgence</h4>
                <textarea id="progUrgent" rows="4" placeholder="Voir ce qui est très récurrent en négatif et bosser dessus"></textarea>
            </div>
            
            <div class="form-section strength">
                <h4>💪 Gros Point Positif</h4>
                <textarea id="progStrength" rows="4" placeholder="Pour apprendre à connaître ses forces et en abuser"></textarea>
            </div>
            
            <div class="form-section vods">
                <h4>🎥 VODs</h4>
                <input type="text" id="progVods" placeholder="Liens vers les VODs (séparés par des virgules)">
            </div>
            
            <div class="modal-actions">
                <button class="btn-primary" id="saveProgressionBtn">💾 Enregistrer</button>
                <button class="btn-secondary" id="cancelProgressionBtn">❌ Annuler</button>
            </div>
        </div>
    `;
    
    document.getElementById('saveProgressionBtn').addEventListener('click', () => {
        const entry = {
            date: document.getElementById('progDate').value,
            map: document.getElementById('progMap').value,
            agent: document.getElementById('progAgent').value,
            kda: document.getElementById('progKDA').value,
            result: document.getElementById('progResult').value,
            mental_positif: document.getElementById('progMentalPos').value,
            macro_positif: document.getElementById('progMacroPos').value,
            micro_positif: document.getElementById('progMicroPos').value,
            mental_negatif: document.getElementById('progMentalNeg').value,
            macro_negatif: document.getElementById('progMacroNeg').value,
            micro_negatif: document.getElementById('progMicroNeg').value,
            urgent: document.getElementById('progUrgent').value,
            strength: document.getElementById('progStrength').value,
            vods: document.getElementById('progVods').value
        };
        
        if (!team.progression_entries) {
            team.progression_entries = [];
        }
        team.progression_entries.push(entry);
        
        modal.classList.remove('show');
        updateProgressionTab();
        saveTeam();
        showNotification('Session sauvegardée avec succès', 'success');
    });
    
    document.getElementById('cancelProgressionBtn').addEventListener('click', () => {
        modal.classList.remove('show');
    });
    
    modal.classList.add('show');
}

function viewProgressionDetails(entry) {
    const modal = document.getElementById('progressionModal');
    const body = document.getElementById('progressionModalBody');
    
    const resultColor = entry.result === 'Victoire' ? '#00ff00' : '#ff0000';
    
    body.innerHTML = `
        <div class="progression-details">
            <h3 style="color: ${resultColor};">Session du ${entry.date || 'N/A'} - ${entry.result || 'N/A'}</h3>
            <div class="progression-info-box">
                🗺️ Map: ${entry.map || 'N/A'} | 🎭 Agent: ${entry.agent || 'N/A'} | 📊 KDA: ${entry.kda || 'N/A'}
            </div>
            
            ${entry.mental_positif || entry.macro_positif || entry.micro_positif ? `
                <div class="progression-section positive">
                    <h4>✅ POINTS POSITIFS</h4>
                    ${entry.mental_positif ? `<p><strong>🧠 Mental:</strong> ${entry.mental_positif}</p>` : ''}
                    ${entry.macro_positif ? `<p><strong>🗺️ Macro:</strong> ${entry.macro_positif}</p>` : ''}
                    ${entry.micro_positif ? `<p><strong>🎯 Micro:</strong> ${entry.micro_positif}</p>` : ''}
                </div>
            ` : ''}
            
            ${entry.mental_negatif || entry.macro_negatif || entry.micro_negatif ? `
                <div class="progression-section negative">
                    <h4>⚠️ POINTS NÉGATIFS</h4>
                    ${entry.mental_negatif ? `<p><strong>🧠 Mental:</strong> ${entry.mental_negatif}</p>` : ''}
                    ${entry.macro_negatif ? `<p><strong>🗺️ Macro:</strong> ${entry.macro_negatif}</p>` : ''}
                    ${entry.micro_negatif ? `<p><strong>🎯 Micro:</strong> ${entry.micro_negatif}</p>` : ''}
                </div>
            ` : ''}
            
            ${entry.urgent ? `
                <div class="progression-section urgent">
                    <h4>🚨 À BOSSER EN URGENCE</h4>
                    <p>${entry.urgent}</p>
                </div>
            ` : ''}
            
            ${entry.strength ? `
                <div class="progression-section strength">
                    <h4>💪 GROS POINT POSITIF</h4>
                    <p>${entry.strength}</p>
                </div>
            ` : ''}
            
            ${entry.vods ? `
                <div class="progression-section vods">
                    <h4>🎥 VODs</h4>
                    <p>${entry.vods}</p>
                </div>
            ` : ''}
            
            <div class="modal-actions">
                <button class="btn-secondary" id="closeProgressionDetailsBtn">❌ Fermer</button>
            </div>
        </div>
    `;
    
    document.getElementById('closeProgressionDetailsBtn').addEventListener('click', () => {
        modal.classList.remove('show');
    });
    
    modal.classList.add('show');
}

// =========================================
// UTILITAIRES
// =========================================

// Fonction pour obtenir le chemin de l'image d'un agent
function getAgentImagePath(agentName) {
    // Mapper les noms d'agents aux noms de fichiers (certains fichiers ont des majuscules différentes)
    const agentFileMap = {
        'Jett': 'Jett.png',
        'Phoenix': 'Phoenix.png',
        'Raze': 'Raze.png',
        'Reyna': 'Reyna.png',
        'Omen': 'Omen.png',
        'Viper': 'Viper.png',
        'Killjoy': 'Killjoy.png',
        'Sage': 'Sage.png',
        'Sova': 'Sova.png',
        'Cypher': 'Cypher.png',
        'Astra': 'Astra.png',
        'Breach': 'Breach.png',
        'Brimstone': 'Brimstone.png',
        'Chamber': 'Chamber.png',
        'Clove': 'Clove.png',
        'Deadlock': 'Deadlock.png',
        'Fade': 'Fade.png',
        'Gekko': 'Gekko.png',
        'Harbor': 'Harbor.png',
        'Iso': 'Iso.png',
        'Kayo': 'KAYO.png',  // Note: le fichier est KAYO.png
        'KAY/O': 'KAYO.png', // alias pour l’orthographe officielle
        'Neon': 'Neon.png',
        'Skye': 'Skye.png',
        'Tejo': 'Tejo.png',
        'Veto': 'Veto.png',
        'Vyse': 'Vyse.png',
        'Waylay': 'Waylay.png',
        'Yoru': 'Yoru.png'
    };
    
    const fileName = agentFileMap[agentName] || `${agentName}.png`;
    // Utiliser le chemin relatif depuis le dossier de l'application
    // Dans Electron, __dirname pointe vers le dossier où se trouve le fichier renderer.js
    const imagePath = path.join(__dirname, 'assets', 'Agents', fileName);
    // Convertir en format file:// pour les chemins Windows
    return `file:///${imagePath.replace(/\\/g, '/')}`;
}

function setupBackgroundVideo() {
    const video = document.getElementById('background-video');
    if (!video) {
        console.error('❌ Élément vidéo non trouvé dans le DOM');
        return;
    }
    
    console.log('✅ Élément vidéo trouvé:', video);
    const source = video.querySelector('source');
    console.log('✅ Source vidéo:', source?.src);
    
    // La vidéo utilise app:// directement dans le HTML
    // Forcer le rechargement après un court délai pour s'assurer que le protocole est prêt
    setTimeout(() => {
        // Recharger la vidéo pour forcer le chargement
        video.load();
        console.log('🔄 Vidéo rechargée');
    
        // Essayer de jouer la vidéo
        video.play().then(() => {
            console.log('✅ Vidéo: Lecture démarrée');
        }).catch(err => {
            console.error('❌ Erreur lors de la lecture:', err);
        });
    }, 100);
    
    // Vérifier si la vidéo charge
    video.addEventListener('loadstart', () => {
        console.log('✅ Vidéo: Début du chargement');
    });
    
    video.addEventListener('error', (e) => {
        console.error('❌ Erreur vidéo:', video.error);
        console.error('❌ Code d\'erreur:', video.error?.code);
        console.error('❌ Message:', video.error?.message);
    });
    
    video.addEventListener('loadeddata', () => {
        console.log('✅ Vidéo: Données chargées');
    });
    
    video.addEventListener('canplay', () => {
        console.log('✅ Vidéo: Prête à jouer');
    });
}

function showNotification(message, type = 'info', duration = null) {
    // Utiliser NotificationService si disponible, sinon fallback
    if (notificationService) {
        // Durées par défaut selon le type si non spécifiée
        if (duration === null) {
            const defaultDurations = {
                info: 10000,      // 10 secondes
                success: 8000,   // 8 secondes
                warning: 12000,  // 12 secondes
                error: 15000,    // 15 secondes
                progress: 10000  // 10 secondes
            };
            duration = defaultDurations[type] || 10000;
        }
        notificationService.show(message, type, duration);
    } else {
        // Fallback pour compatibilité avec bouton de fermeture
        const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const notification = document.createElement('div');
        notification.id = notificationId;
        notification.className = `notification ${type}`;
        
        // Contenu
        const content = document.createElement('div');
        content.className = 'notification-content';
        content.textContent = message;
        
        // Bouton de fermeture
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Fermer');
        closeBtn.onclick = () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        };
        
        notification.appendChild(content);
        notification.appendChild(closeBtn);
        document.body.appendChild(notification);
        
        // Durées par défaut
        const defaultDurations = {
            info: 10000,
            success: 8000,
            warning: 12000,
            error: 15000,
            progress: 10000
        };
        const displayDuration = duration || defaultDurations[type] || 10000;
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, displayDuration);
    }
}

// =========================================
// GESTION DU THÈME
// =========================================

function showThemeModal() {
    const modal = document.getElementById('themeModal');
    const themeSelect = document.getElementById('themeSelect');
    const customColorGroup = document.getElementById('customColorGroup');
    const customAccentColor = document.getElementById('customAccentColor');
    const customAccentColorText = document.getElementById('customAccentColorText');
    
    if (!themeService) {
        themeService = new ThemeService();
    }
    
    // Charger le thème actuel
    const currentTheme = themeService.getCurrentTheme();
    themeSelect.value = currentTheme.id;
    
    // Afficher/masquer le groupe de couleur personnalisée
    if (currentTheme.id === 'custom') {
        customColorGroup.style.display = 'block';
        customAccentColor.value = currentTheme.accent;
        customAccentColorText.value = currentTheme.accent;
    } else {
        customColorGroup.style.display = 'none';
    }
    
    // Mettre à jour l'aperçu
    updateThemePreview();
    
    modal.classList.add('show');
}

function onThemeSelectChange() {
    const themeSelect = document.getElementById('themeSelect');
    const customColorGroup = document.getElementById('customColorGroup');
    const selectedTheme = themeSelect.value;
    
    if (selectedTheme === 'custom') {
        customColorGroup.style.display = 'block';
        if (themeService) {
            const currentTheme = themeService.getCurrentTheme();
            document.getElementById('customAccentColor').value = currentTheme.accent;
            document.getElementById('customAccentColorText').value = currentTheme.accent;
        }
    } else {
        customColorGroup.style.display = 'none';
        // Prévisualiser le thème sélectionné
        if (themeService) {
            const theme = themeService.themes[selectedTheme];
            applyThemePreview(theme);
        }
    }
}

function onCustomColorChange() {
    const colorInput = document.getElementById('customAccentColor');
    const textInput = document.getElementById('customAccentColorText');
    textInput.value = colorInput.value;
    updateThemePreview();
}

function onCustomColorTextChange() {
    const textInput = document.getElementById('customAccentColorText');
    const colorInput = document.getElementById('customAccentColor');
    const colorValue = textInput.value;
    
    // Valider le format hexadécimal
    if (/^#[0-9A-F]{6}$/i.test(colorValue)) {
        colorInput.value = colorValue;
        updateThemePreview();
    }
}

function updateThemePreview() {
    const themeSelect = document.getElementById('themeSelect');
    const selectedTheme = themeSelect.value;
    
    if (!themeService) return;
    
    if (selectedTheme === 'custom') {
        const customColor = document.getElementById('customAccentColor').value;
        const previewTheme = {
            accent: customColor,
            accentHover: themeService.lightenColor(customColor, 15),
            textPrimary: '#ffffff',
            textSecondary: '#b0b8c0'
        };
        applyThemePreview(previewTheme);
    } else {
        const theme = themeService.themes[selectedTheme];
        applyThemePreview(theme);
    }
}

// =========================================
// INSIGHTS (métriques avancées basiques)
// =========================================
function updateInsightsStats() {
    const grid = document.getElementById('insightsGrid');
    const oppo = document.getElementById('insightsOpponents');
    if (!grid || !oppo) return;
    grid.innerHTML = ''; oppo.innerHTML = '';

    const periodSel = document.getElementById('insightsPeriod');
    const months = (periodSel?.value === 'all') ? null : parseInt(periodSel?.value || '6', 10);
    const matches = (team.matches || []).slice().sort((a,b) => new Date(a.date) - new Date(b.date));
    const filtered = months ? matches.filter(m => {
        const d = parseDate(m.date);
        const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - months);
        return d >= cutoff;
    }) : matches;

    // Win/Loss
    const wins = filtered.filter(m => (m.result || '').toLowerCase() === 'win' || m.result === 'Victoire').length;
    const losses = filtered.filter(m => (m.result || '').toLowerCase() === 'loss' || m.result === 'Défaite' || m.result === 'defaite').length;
    const total = filtered.length;
    const winrate = total ? Math.round((wins / total) * 1000) / 10 : 0;

    // Best map by winrate
    const byMap = {};
    filtered.forEach(m => {
        const k = m.map || 'Unknown';
        if (!byMap[k]) byMap[k] = { w: 0, l: 0 };
        const res = (m.result || '').toLowerCase();
        if (res === 'win' || res === 'victoire') byMap[k].w++; else if (res === 'loss' || res === 'défaite' || res === 'defaite') byMap[k].l++;
    });
    let bestMap = { name: '-', wr: 0, w:0, l:0 };
    Object.entries(byMap).forEach(([map, s]) => {
        const tot = s.w + s.l;
        if (!tot) return;
        const wr = Math.round((s.w / tot) * 1000) / 10;
        if (wr > bestMap.wr && tot >= 3) bestMap = { name: map, wr, w: s.w, l: s.l };
    });

    // Trend (last N matches winrate)
    const lastN = Math.min(10, filtered.length);
    const recent = filtered.slice(-lastN);
    const recentWins = recent.filter(m => (m.result || '').toLowerCase() === 'win' || m.result === 'Victoire').length;
    const recentWr = lastN ? Math.round((recentWins / lastN) * 1000) / 10 : 0;

    // Top opponents by frequency and winrate
    const byOpp = {};
    filtered.forEach(m => {
        const k = m.opponent || 'Inconnu';
        if (!byOpp[k]) byOpp[k] = { w: 0, l: 0, c: 0 };
        byOpp[k].c++;
        const res = (m.result || '').toLowerCase();
        if (res === 'win' || res === 'victoire') byOpp[k].w++; else if (res === 'loss' || res === 'défaite' || res === 'defaite') byOpp[k].l++;
    });
    const topOpp = Object.entries(byOpp).map(([name, s]) => {
        const wr = (s.w + s.l) ? Math.round((s.w / (s.w + s.l)) * 1000) / 10 : 0;
        return { name, count: s.c, wr };
    }).sort((a,b) => b.count - a.count).slice(0, 8);

    // Render cards
    const card = (title, value, subtitle = '') => `
        <div class="card">
            <h3>${title}</h3>
            <div style="font-size:22px; font-weight:700;">${value}</div>
            ${subtitle ? `<div class="muted" style="margin-top:4px;">${subtitle}</div>` : ''}
        </div>`;
    grid.innerHTML = [
        card('Winrate global', `${winrate}%`, `${wins}V / ${losses}D • ${total} matchs`),
        card('Meilleure map', bestMap.name, `${bestMap.w}V / ${bestMap.l}D • ${bestMap.wr}%`),
        card('Tendance (10 derniers)', `${recentWr}%`, `${recentWins}V / ${lastN - recentWins}D • ${lastN} matchs`),
    ].join('');

    // Render opponents table
    let html = '<table class="table"><thead><tr><th>Adversaire</th><th>Matchs</th><th>Winrate</th></tr></thead><tbody>';
    topOpp.forEach(o => { html += `<tr><td>${o.name}</td><td>${o.count}</td><td>${o.wr}%</td></tr>`; });
    html += '</tbody></table>';
    oppo.innerHTML = html;
}

function exportInsightsCSV() {
    try {
        if (!exportService) exportService = new ExportService();
        const periodSel = document.getElementById('insightsPeriod');
        const months = (periodSel?.value === 'all') ? 'all' : parseInt(periodSel?.value || '6', 10);
        // Recalcule rapide pour exporter (réutiliser updateInsightsStats logique simplifiée)
        const matches = (team.matches || []).slice().sort((a,b) => new Date(a.date) - new Date(b.date));
        const filtered = months === 'all' ? matches : matches.filter(m => {
            const d = parseDate(m.date); const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - months); return d >= cutoff;
        });
        const wins = filtered.filter(m => (m.result || '').toLowerCase() === 'win' || m.result === 'Victoire').length;
        const losses = filtered.filter(m => (m.result || '').toLowerCase() === 'loss' || m.result === 'Défaite' || m.result === 'defaite').length;
        const total = filtered.length;
        const winrate = total ? Math.round((wins / total) * 1000) / 10 : 0;
        let csv = 'Metric,Value\n';
        csv += `Winrate global,${winrate}%\n`;
        csv += `Victoires,${wins}\n`;
        csv += `Défaites,${losses}\n`;
        csv += `Matchs,${total}\n`;
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        exportService.downloadFile(blob, `insights_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
        showNotification('Insights exportés (CSV)', 'success');
    } catch (e) {
        console.error(e);
        showNotification('Erreur export Insights CSV', 'error');
    }
}

function exportInsightsHTML() {
    try {
        const grid = document.getElementById('insightsGrid');
        const oppo = document.getElementById('insightsOpponents');
        const html = `
            <html><head><meta charset="utf-8"><title>Insights</title>
            <style>body{font-family:Arial,sans-serif;margin:24px} .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px} .card{border:1px solid rgba(0,0,0,.12);border-radius:10px;padding:10px;background:#fafafa}</style>
            </head><body>
            <h2>Insights — ${team.name || 'Équipe'}</h2>
            <div class="grid">${grid?.innerHTML || ''}</div>
            <h3 style="margin-top:16px;">Adversaires</h3>
            <div>${oppo?.innerHTML || ''}</div>
            </body></html>`;
        const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
        if (!exportService) exportService = new ExportService();
        exportService.downloadFile(blob, `insights_${new Date().toISOString().split('T')[0]}.html`, 'text/html;charset=utf-8;');
        showNotification('Insights exportés (HTML)', 'success');
    } catch (e) {
        console.error(e);
        showNotification('Erreur export Insights HTML', 'error');
    }
}
function applyThemePreview(theme) {
    const preview = document.getElementById('themePreview');
    if (preview) {
        preview.style.borderColor = theme.accent;
        const accentText = preview.querySelector('p');
        if (accentText) accentText.style.color = theme.accent;
        const button = preview.querySelector('button');
        if (button) button.style.background = theme.accent;
    }
}

function applyTheme() {
    const themeSelect = document.getElementById('themeSelect');
    const selectedTheme = themeSelect.value;
    
    if (!themeService) {
        themeService = new ThemeService();
    }
    
    if (selectedTheme === 'custom') {
        const customColor = document.getElementById('customAccentColor').value;
        themeService.setCustomAccentColor(customColor);
        themeService.applyTheme('custom');
    } else {
        themeService.applyTheme(selectedTheme);
    }

    // Persister comme thème actif
    try {
        const cfg = getCurrentThemeConfig();
        localStorage.setItem('activeTheme', JSON.stringify(cfg));
    } catch {}
    
    // Fermer la modale
    document.getElementById('themeModal').classList.remove('show');
    
    // Notification
    if (notificationService) {
        notificationService.show('Thème appliqué avec succès', 'success');
    }
}

function resetTheme() {
    if (!themeService) {
        themeService = new ThemeService();
    }
    
    themeService.applyTheme('default');
    document.getElementById('themeSelect').value = 'default';
    document.getElementById('customColorGroup').style.display = 'none';
    try { localStorage.removeItem('activeTheme'); } catch {}
    
    if (notificationService) {
        notificationService.show('Thème réinitialisé', 'info');
    }
}

function getCurrentThemeConfig() {
    const themeSelect = document.getElementById('themeSelect');
    const selectedTheme = themeSelect?.value || 'default';
    let accent = null;
    if (selectedTheme === 'custom') {
        accent = document.getElementById('customAccentColor')?.value || '#ff4655';
    } else if (themeService) {
        accent = themeService.themes[selectedTheme]?.accent || '#ff4655';
    }
    return { preset: selectedTheme, accent };
}

function applyThemeConfig(cfg) {
    if (!cfg) return;
    if (!themeService) themeService = new ThemeService();
    if (cfg.preset === 'custom' && cfg.accent) {
        themeService.setCustomAccentColor(cfg.accent);
        themeService.applyTheme('custom');
        const cg = document.getElementById('customColorGroup');
        if (cg) cg.style.display = 'block';
        const ci = document.getElementById('customAccentColor');
        const ti = document.getElementById('customAccentColorText');
        if (ci) ci.value = cfg.accent;
        if (ti) ti.value = cfg.accent;
        const ts = document.getElementById('themeSelect');
        if (ts) ts.value = 'custom';
    } else {
        themeService.applyTheme(cfg.preset || 'default');
        const ts = document.getElementById('themeSelect');
        if (ts) ts.value = cfg.preset || 'default';
        const cg = document.getElementById('customColorGroup');
        if (cg) cg.style.display = cfg.preset === 'custom' ? 'block' : 'none';
    }
    try { localStorage.setItem('activeTheme', JSON.stringify(cfg)); } catch {}
}

// =========================================
// GESTION DES SAUVEGARDES
// =========================================

function showBackupModal() {
    const modal = document.getElementById('backupModal');
    if (!modal) return;
    
    updateBackupModal();
    modal.classList.add('show');
}

function updateBackupModal() {
    if (!backupService) return;
    
    const statsEl = document.getElementById('backupStats');
    const listContent = document.getElementById('backupListContent');
    
    // Afficher les statistiques
    const stats = backupService.getBackupStats();
    if (statsEl) {
        statsEl.innerHTML = `
            <div class="backup-stat-item">
                <span class="stat-label">Nombre de sauvegardes:</span>
                <span class="stat-value">${stats.count} / ${stats.maxBackups}</span>
            </div>
            <div class="backup-stat-item">
                <span class="stat-label">Taille totale:</span>
                <span class="stat-value">${stats.totalSizeFormatted}</span>
            </div>
            ${stats.oldestBackup ? `
                <div class="backup-stat-item">
                    <span class="stat-label">Plus ancienne:</span>
                    <span class="stat-value">${backupService.formatDate(stats.oldestBackup)}</span>
                </div>
            ` : ''}
            ${stats.newestBackup ? `
                <div class="backup-stat-item">
                    <span class="stat-label">Plus récente:</span>
                    <span class="stat-value">${backupService.formatDate(stats.newestBackup)}</span>
                </div>
            ` : ''}
        `;
    }
    
    // Afficher la liste des sauvegardes
    const backups = backupService.getAllBackups();
    if (listContent) {
        if (backups.length === 0) {
            listContent.innerHTML = '<p class="empty-message">Aucune sauvegarde disponible</p>';
        } else {
            listContent.innerHTML = backups.reverse().map((backup, index) => {
                const displayIndex = backups.length - 1 - index;
                return `
                    <div class="backup-item">
                        <div class="backup-info">
                            <div class="backup-header">
                                <span class="backup-version">${backup.version || 'N/A'}</span>
                                <span class="backup-date">${backupService.formatDate(backup.timestamp)}</span>
                            </div>
                            <div class="backup-details">
                                <span class="backup-team-name">${backup.teamName || 'Équipe'}</span>
                            </div>
                        </div>
                        <div class="backup-actions">
                            <button class="btn-icon restore-backup-btn" data-index="${displayIndex}" title="Restaurer cette sauvegarde">↩️</button>
                            <button class="btn-icon delete-backup-btn" data-index="${displayIndex}" title="Supprimer cette sauvegarde">🗑️</button>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Ajouter les event listeners
            listContent.querySelectorAll('.restore-backup-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.currentTarget.dataset.index);
                    restoreBackup(index);
                });
            });
            
            listContent.querySelectorAll('.delete-backup-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.currentTarget.dataset.index);
                    deleteBackup(index);
                });
            });
        }
    }
    
    // Event listeners pour les boutons
    const createBackupBtn = document.getElementById('createBackupBtn');
    if (createBackupBtn) {
        createBackupBtn.onclick = () => {
            if (backupService) {
                const backup = backupService.createBackup(team.toJSON(), team.name);
                if (backup) {
                    showNotification(`Sauvegarde ${backup.version} créée avec succès`, 'success');
                    updateBackupModal();
                }
            }
        };
    }
    
    const exportBackupsBtn = document.getElementById('exportBackupsBtn');
    if (exportBackupsBtn) {
        exportBackupsBtn.onclick = () => {
            if (backupService && exportService) {
                const backupsJson = backupService.exportBackups();
                const filename = `backups_${new Date().toISOString().split('T')[0]}.json`;
                exportService.downloadFile(backupsJson, filename, 'application/json;charset=utf-8;');
                showNotification('Sauvegardes exportées avec succès', 'success');
            }
        };
    }

    // Restaurer via sélecteur
    const backupSelect = document.getElementById('backupSelect');
    const restoreBackupBtn = document.getElementById('restoreBackupBtn');
    if (backupSelect) {
        // Remplir le sélecteur
        try {
            const backups = backupService.getAllBackups();
            backupSelect.innerHTML = '';
            backups.forEach((b, idx) => {
                const opt = document.createElement('option');
                const label = `${backupService.formatDate ? backupService.formatDate(b.timestamp || b.date) : (b.timestamp || '')} — ${b.teamName || ''}`;
                opt.value = String(idx);
                opt.textContent = label;
                backupSelect.appendChild(opt);
            });
        } catch {}
    }
    if (restoreBackupBtn) {
        restoreBackupBtn.onclick = () => {
            try {
                const idx = parseInt(document.getElementById('backupSelect')?.value || '-1', 10);
                if (Number.isNaN(idx) || idx < 0) { showNotification('Aucune sauvegarde sélectionnée', 'warning'); return; }
                restoreBackup(idx);
            } catch (e) {
                console.error(e);
                showNotification('Erreur lors de la restauration', 'error');
            }
        };
    }
    
    const importBackupsBtn = document.getElementById('importBackupsBtn');
    if (importBackupsBtn) {
        importBackupsBtn.onclick = async () => {
            try {
                const result = await ipcRenderer.invoke('show-open-dialog', {
                    title: 'Importer des sauvegardes',
                    filters: [
                        { name: 'JSON', extensions: ['json'] },
                        { name: 'Tous les fichiers', extensions: ['*'] }
                    ],
                    properties: ['openFile']
                });
                
                if (!result.canceled && result.filePaths.length > 0) {
                    const fs = require('fs');
                    const backupsJson = fs.readFileSync(result.filePaths[0], 'utf-8');
                    
                    if (backupService) {
                        const success = backupService.importBackups(backupsJson);
                        if (success) {
                            showNotification('Sauvegardes importées avec succès', 'success');
                            updateBackupModal();
                        } else {
                            showNotification('Erreur lors de l\'import des sauvegardes', 'error');
                        }
                    }
                }
            } catch (error) {
                console.error('Erreur lors de l\'import:', error);
                showNotification('Erreur lors de l\'import: ' + error.message, 'error');
            }
        };
    }
    
    const clearBackupsBtn = document.getElementById('clearBackupsBtn');
    if (clearBackupsBtn) {
        clearBackupsBtn.onclick = () => {
            if (confirm('Êtes-vous sûr de vouloir supprimer toutes les sauvegardes ? Cette action est irréversible.')) {
                if (backupService) {
                    backupService.clearAllBackups();
                    showNotification('Toutes les sauvegardes ont été supprimées', 'info');
                    updateBackupModal();
                }
            }
        };
    }
    
    // Fermer la modale
    const backupModalClose = document.getElementById('backupModalClose');
    if (backupModalClose) {
        backupModalClose.onclick = () => {
            document.getElementById('backupModal').classList.remove('show');
        };
    }
}

function restoreBackup(index) {
    if (!backupService) return;
    
    const backup = backupService.getBackup(index);
    if (!backup) {
        showNotification('Sauvegarde introuvable', 'error');
        return;
    }
    
    if (confirm(`Êtes-vous sûr de vouloir restaurer la sauvegarde ${backup.version} du ${backupService.formatDate(backup.timestamp)} ?\n\nLes données actuelles seront remplacées.`)) {
        try {
            const restoredData = backupService.restoreBackup(backup);
            if (restoredData) {
                team = Team.fromJSON(restoredData);
                currentTeamPath = null;
                updateAllTabs();
                showNotification(`Sauvegarde ${backup.version} restaurée avec succès`, 'success');
                document.getElementById('backupModal').classList.remove('show');
            }
        } catch (error) {
            console.error('Erreur lors de la restauration:', error);
            showNotification('Erreur lors de la restauration: ' + error.message, 'error');
        }
    }
}

function deleteBackup(index) {
    if (!backupService) return;
    
    const backup = backupService.getBackup(index);
    if (!backup) {
        showNotification('Sauvegarde introuvable', 'error');
        return;
    }
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer la sauvegarde ${backup.version} du ${backupService.formatDate(backup.timestamp)} ?`)) {
        if (backupService.deleteBackup(index)) {
            showNotification('Sauvegarde supprimée avec succès', 'success');
            updateBackupModal();
        } else {
            showNotification('Erreur lors de la suppression', 'error');
        }
    }
}

// =========================================
// GESTION DES RACCOURCIS CLAVIER
// =========================================

function registerKeyboardShortcuts() {
    if (!keyboardService) return;

    // Raccourcis Fichier
    keyboardService.register('Ctrl+S', () => {
        saveTeam();
    }, 'Sauvegarder l\'équipe');

    keyboardService.register('Ctrl+O', () => {
        importTeam();
    }, 'Importer une équipe');

    keyboardService.register('Ctrl+E', () => {
        exportTeam();
    }, 'Exporter l\'équipe');

    keyboardService.register('Ctrl+Shift+S', () => {
        if (backupService) {
            const backup = backupService.createBackup(team.toJSON(), team.name);
            if (backup) {
                showNotification(`Sauvegarde ${backup.version} créée`, 'success');
            }
        }
    }, 'Créer une sauvegarde');

    // Raccourcis Navigation
    keyboardService.register('Ctrl+1', () => {
        switchTab('home');
    }, 'Aller à l\'onglet Home');

    keyboardService.register('Ctrl+2', () => {
        switchTab('players');
    }, 'Aller à l\'onglet Joueurs');

    keyboardService.register('Ctrl+3', () => {
        switchTab('matches');
    }, 'Aller à l\'onglet Matchs');

    keyboardService.register('Ctrl+4', () => {
        switchTab('statistics');
    }, 'Aller à l\'onglet Statistiques');

    keyboardService.register('Ctrl+5', () => {
        switchTab('progression');
    }, 'Aller à l\'onglet Progression');

    // Raccourcis Actions
    keyboardService.register('Ctrl+N', () => {
        const currentTab = document.querySelector('.tab-content.active');
        if (currentTab && currentTab.id === 'playersTab') {
            const nameInput = document.getElementById('playerNameInput');
            if (nameInput) {
                nameInput.focus();
            }
        } else if (currentTab && currentTab.id === 'matchesTab') {
            const dateInput = document.getElementById('matchDateInput');
            if (dateInput) {
                dateInput.focus();
            }
        }
    }, 'Nouvel élément (joueur/match selon l\'onglet)');

    keyboardService.register('Ctrl+F', () => {
        const currentTab = document.querySelector('.tab-content.active');
        if (currentTab && currentTab.id === 'playersTab') {
            const searchInput = document.getElementById('playerSearchInput');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        } else if (currentTab && currentTab.id === 'matchesTab') {
            const searchInput = document.getElementById('matchSearchInput');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    }, 'Rechercher (focus sur la barre de recherche)');

    keyboardService.register('Ctrl+Shift+F', () => {
        const currentTab = document.querySelector('.tab-content.active');
        if (currentTab && currentTab.id === 'playersTab') {
            const searchInput = document.getElementById('playerSearchInput');
            const filterRole = document.getElementById('playerFilterRole');
            const filterRank = document.getElementById('playerFilterRank');
            const filterAgent = document.getElementById('playerFilterAgent');
            if (searchInput) searchInput.value = '';
            if (filterRole) filterRole.value = 'all';
            if (filterRank) filterRank.value = 'all';
            if (filterAgent) filterAgent.value = 'all';
            updatePlayersTab();
        } else if (currentTab && currentTab.id === 'matchesTab') {
            const searchInput = document.getElementById('matchSearchInput');
            const filterMap = document.getElementById('matchFilterMap');
            const filterResult = document.getElementById('matchFilterResult');
            const filterOpponent = document.getElementById('matchFilterOpponent');
            if (searchInput) searchInput.value = '';
            if (filterMap) filterMap.value = 'all';
            if (filterResult) filterResult.value = 'all';
            if (filterOpponent) filterOpponent.value = '';
            updateMatchesTab();
        }
    }, 'Réinitialiser les filtres');

    // Raccourcis Utilitaires
    keyboardService.register('Ctrl+?', () => {
        showShortcutsModal();
    }, 'Afficher l\'aide des raccourcis');

    keyboardService.register('Ctrl+H', () => {
        showShortcutsModal();
    }, 'Afficher l\'aide des raccourcis');

    // Profiling toggle
    keyboardService.register('Ctrl+Shift+P', () => {
        const enabled = !!localStorage.getItem('perf_enabled');
        if (enabled) {
            localStorage.removeItem('perf_enabled');
            showNotification('Profiling désactivé', 'success');
        } else {
            localStorage.setItem('perf_enabled', '1');
            showNotification('Profiling activé', 'success');
        }
    }, 'Activer/Désactiver le profiling (console)');

    keyboardService.register('Escape', () => {
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });
    }, 'Fermer les modales');

    // Raccourcis Rapides
    keyboardService.register('Ctrl+R', () => {
        exportHTMLReport();
    }, 'Générer un rapport HTML');

    keyboardService.register('Ctrl+B', () => {
        showBackupModal();
    }, 'Ouvrir la gestion des sauvegardes');

    keyboardService.register('Ctrl+T', () => {
        showThemeModal();
    }, 'Ouvrir la personnalisation du thème');
}

function showShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    if (!modal) return;

    const content = document.getElementById('shortcutsContent');
    if (content && keyboardService) {
        content.innerHTML = keyboardService.generateHelpHTML();
    }

    const shortcutsModalClose = document.getElementById('shortcutsModalClose');
    if (shortcutsModalClose) {
        shortcutsModalClose.onclick = () => {
            modal.classList.remove('show');
        };
    }

    modal.classList.add('show');
}

// =========================================
// PERF & LAZY HELPERS
// =========================================

function withPerf(name, fn) {
    const enabled = !!localStorage.getItem('perf_enabled');
    if (!enabled) return fn();
    try {
        const markStart = `${name}_start`;
        const markEnd = `${name}_end`;
        performance.mark(markStart);
        const res = fn();
        if (res && typeof res.then === 'function') {
            return res.finally(() => {
                performance.mark(markEnd);
                performance.measure(name, markStart, markEnd);
                console.debug(`[PERF] ${name}`, performance.getEntriesByName(name).pop()?.duration?.toFixed(1), 'ms');
            });
        }
        performance.mark(markEnd);
        performance.measure(name, markStart, markEnd);
        console.debug(`[PERF] ${name}`, performance.getEntriesByName(name).pop()?.duration?.toFixed(1), 'ms');
        return res;
    } catch (e) {
        return fn();
    }
}

async function ensureExportService() {
    if (exportService) return exportService;
    if (!window.ExportService) {
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'js/services/ExportService.js';
            s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
        });
    }
    exportService = new ExportService();
    return exportService;
}

// =========================================
// OCR SCOREBOARD (MVP)
// =========================================

function wireOcrModal() {
    const modal = document.getElementById('ocrModal');
    if (!modal || modal._wired) return;
    modal._wired = true;

    const closeBtn = document.getElementById('closeOcrModal');
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('show');

    const fileInput = document.getElementById('ocrFileInput');
    const chooseBtn = document.getElementById('ocrChooseBtn');
    const dropZone = document.getElementById('ocrDropZone');
    const runBtn = document.getElementById('ocrRunBtn');
    const clearBtn = document.getElementById('ocrClearBtn');
    const mapBtn = document.getElementById('ocrMapBtn');
    const prefillBtn = document.getElementById('ocrPrefillMatchBtn');
    const threshold = document.getElementById('ocrThreshold');
    const thresholdVal = document.getElementById('ocrThresholdVal');

    // ROI interactions
    const canvas = document.getElementById('ocrPreviewCanvas');
    if (canvas && !canvas._roiWired) {
        canvas._roiWired = true;
        canvas._roi = null; // {x,y,w,h} in canvas coords
        let start = null;
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            start = { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
        });
        canvas.addEventListener('mousemove', (e) => {
            if (!start) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX, y = (e.clientY - rect.top) * scaleY;
            const x0 = Math.max(0, Math.min(start.x, x));
            const y0 = Math.max(0, Math.min(start.y, y));
            const w = Math.min(canvas.width, Math.max(start.x, x)) - x0;
            const h = Math.min(canvas.height, Math.max(start.y, y)) - y0;
            canvas._roi = { x: Math.round(x0), y: Math.round(y0), w: Math.round(w), h: Math.round(h) };
            drawOcrCanvasOverlay(canvas);
        });
        window.addEventListener('mouseup', () => { start = null; });
    }

    if (chooseBtn && fileInput) {
        chooseBtn.onclick = () => fileInput.click();
    }
    if (fileInput) {
        fileInput.onchange = async (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) await ocrLoadImageToCanvas(file);
        };
    }
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag');
            const file = e.dataTransfer.files && e.dataTransfer.files[0];
            if (file) await ocrLoadImageToCanvas(file);
        });
    }
    if (runBtn) runBtn.onclick = () => runOcrOnCanvas();
    if (clearBtn) clearBtn.onclick = () => clearOcrModal();
    if (mapBtn) mapBtn.onclick = () => ocrMapExtractedFields();
    if (prefillBtn) prefillBtn.onclick = () => ocrPrefillMatch();

    if (threshold && thresholdVal) {
        threshold.oninput = () => {
            const v = parseInt(threshold.value, 10);
            thresholdVal.textContent = v > 0 ? String(v) : 'auto';
        };
    }
}

async function ocrLoadImageToCanvas(file) {
    const canvas = document.getElementById('ocrPreviewCanvas');
    if (!canvas) return;
    const url = URL.createObjectURL(file);
    await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const maxW = 1920, maxH = 1080;
            let w = img.width, h = img.height;
            const ratio = Math.min(maxW / w, maxH / h, 1);
            w = Math.round(w * ratio); h = Math.round(h * ratio);
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            applyOcrPreprocess(canvas);
            try { canvas._baseImageData = ctx.getImageData(0, 0, w, h); } catch {}
            URL.revokeObjectURL(url);
            resolve();
        };
        img.onerror = reject;
        img.src = url;
    });
    const resultText = document.getElementById('ocrResultText');
    if (resultText) resultText.value = '';
    const mapBtn = document.getElementById('ocrMapBtn');
    if (mapBtn) mapBtn.disabled = true;
    const prefillBtn2 = document.getElementById('ocrPrefillMatchBtn');
    if (prefillBtn2) prefillBtn2.disabled = true;
    if (canvas) { canvas._roi = null; drawOcrCanvasOverlay(canvas); }
}

function applyOcrPreprocess(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    const { width: w, height: h } = canvas;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const grayscale = document.getElementById('ocrGrayscale')?.checked;
    const enhance = document.getElementById('ocrEnhanceContrast')?.checked;
    const denoise = document.getElementById('ocrDenoise')?.checked;
    const slider = document.getElementById('ocrThreshold');
    const thresholdVal = slider ? parseInt(slider.value, 10) : 0;
    const thresholdFactor = typeof opts.thresholdFactor === 'number' ? opts.thresholdFactor : 0.95;

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];
        let R = r, G = g, B = b;
        if (grayscale) {
            const y = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
            R = G = B = y;
        }
        if (enhance || opts.strong) {
            // simple contrast stretch
            const c = opts.strong ? 1.5 : 1.2;
            R = Math.max(0, Math.min(255, ((R - 128) * c + 128) | 0));
            G = Math.max(0, Math.min(255, ((G - 128) * c + 128) | 0));
            B = Math.max(0, Math.min(255, ((B - 128) * c + 128) | 0));
        }
        data[i] = R; data[i + 1] = G; data[i + 2] = B;
    }
    ctx.putImageData(imgData, 0, 0);

    if (denoise || opts.strong) {
        // léger flou boîte 3x3
        try {
            const tmp = ctx.getImageData(0, 0, w, h);
            const out = ctx.createImageData(w, h);
            const td = tmp.data, od = out.data;
            for (let y = 1; y < h - 1; y++) {
                for (let x = 1; x < w - 1; x++) {
                    let r = 0, g = 0, b = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const idx = ((y + dy) * w + (x + dx)) * 4;
                            r += td[idx]; g += td[idx + 1]; b += td[idx + 2];
                        }
                    }
                    const idx0 = (y * w + x) * 4;
                    od[idx0] = (r / 9) | 0;
                    od[idx0 + 1] = (g / 9) | 0;
                    od[idx0 + 2] = (b / 9) | 0;
                    od[idx0 + 3] = 255;
                }
            }
            ctx.putImageData(out, 0, 0);
        } catch {}
    }

    if (opts.strong) {
        // Binarisation simple (seuil global basé sur la moyenne)
        try {
            const img = ctx.getImageData(0, 0, w, h);
            const d = img.data;
            let sum = 0, count = 0;
            for (let i = 0; i < d.length; i += 4) {
                sum += d[i]; // gris
                count++;
            }
            const mean = sum / count;
            const T = thresholdVal > 0 ? thresholdVal : (mean * thresholdFactor);
            for (let i = 0; i < d.length; i += 4) {
                const v = d[i] > T ? 255 : 0;
                d[i] = d[i + 1] = d[i + 2] = v;
                d[i + 3] = 255;
            }
            ctx.putImageData(img, 0, 0);
        } catch {}
    }

    // Inversion optionnelle (utile si texte clair sur fond clair/faible contraste alterné)
    if (opts.invert) {
        try {
            const img = ctx.getImageData(0, 0, w, h);
            const d = img.data;
            for (let i = 0; i < d.length; i += 4) {
                d[i] = 255 - d[i];
                d[i + 1] = 255 - d[i + 1];
                d[i + 2] = 255 - d[i + 2];
                d[i + 3] = 255;
            }
            ctx.putImageData(img, 0, 0);
        } catch {}
    }
}

async function ensureTesseractLoaded() {
    if (window.Tesseract) return;
    await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

async function runOcrOnCanvas() {
    const canvas = document.getElementById('ocrPreviewCanvas');
    const selectedLocale = document.getElementById('ocrLocale')?.value || 'eng';
    const locale = selectedLocale === 'fra' ? 'eng+fra' : selectedLocale; // combiner pour robustesse
    const template = document.getElementById('ocrTemplate')?.value || 'auto';
    if (!canvas || !canvas.width) {
        showNotification('Veuillez charger une image.', 'warning');
        return;
    }
    try { metricsService?.incr('ocr_run'); } catch {}
    try {
        await ensureTesseractLoaded();

        // Créer un canvas de travail (recadrage + suréchantillonnage + reprocesse)
        const work = document.createElement('canvas');
        const roi = canvas._roi;
        if (roi && roi.w > 10 && roi.h > 10) {
            // Utiliser la ROI dessinée par l’utilisateur
            const wctx = work.getContext('2d');
            work.width = roi.w; work.height = roi.h;
            wctx.drawImage(canvas, roi.x, roi.y, roi.w, roi.h, 0, 0, roi.w, roi.h);
        } else {
            cropScoreboardRegion(canvas, work, template);
        }
        // suréchantillonnage (plus fort si ROI)
        const upscale = (roi && roi.w > 10 && roi.h > 10) ? 2.0 : 1.5;
        const up = document.createElement('canvas');
        up.width = Math.round(work.width * upscale);
        up.height = Math.round(work.height * upscale);
        const upctx = up.getContext('2d');
        upctx.imageSmoothingEnabled = true;
        upctx.imageSmoothingQuality = 'high';
        upctx.drawImage(work, 0, 0, up.width, up.height);
        applyOcrPreprocess(up);

        const { data } = await Tesseract.recognize(
            up,
            locale,
            {
                logger: () => {},
                // Paramètres utiles à Tesseract (passés au moteur)
                tessedit_pageseg_mode: '6', // Assume un bloc de texte
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-:/()[]\'" .,%+|',
                user_defined_dpi: '300',
                preserve_interword_spaces: '1'
            }
        );
        const rawText = (data && data.text) ? data.text : '';
        const lines = rawText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

        // OCR ciblé header (scores) et bandeau carte
        const header = document.createElement('canvas');
        cropHeaderRegion(canvas, header);
        const headerUp = scaleCanvas(header, 2);
        applyOcrPreprocess(headerUp, { strong: true });
        const { data: headerData } = await Tesseract.recognize(
            headerUp, locale,
            { logger: () => {}, tessedit_pageseg_mode: '7', tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -', user_defined_dpi: '300' }
        );
        const headerText = (headerData && headerData.text) ? headerData.text : '';

        const mapBand = document.createElement('canvas');
        cropMapLabelRegion(canvas, mapBand);
        const mapUp = scaleCanvas(mapBand, 2);
        applyOcrPreprocess(mapUp, { strong: true });
        const { data: mapData } = await Tesseract.recognize(
            mapUp, locale,
            { logger: () => {}, tessedit_pageseg_mode: '6', user_defined_dpi: '300' }
        );
        const mapBandText = (mapData && mapData.text) ? mapData.text : '';

        let parsed = parseOcrText(rawText + '\n' + headerText + '\n' + mapBandText, lines);
        parsed.players = extractPlayerRows(lines);
        // Fallback: si peu de lignes détectées et une ROI était active, relancer sur la zone tableau par défaut
        if ((!parsed.players || parsed.players.length < 3) && canvas._roi) {
            try {
                const fallbackWork = document.createElement('canvas');
                cropScoreboardRegion(canvas, fallbackWork, template);
                const up2 = scaleCanvas(fallbackWork, 1.5);
                applyOcrPreprocess(up2);
                const { data: data2 } = await Tesseract.recognize(up2, locale, { logger: () => {}, tessedit_pageseg_mode: '6', user_defined_dpi: '300' });
                const text2 = (data2 && data2.text) ? data2.text : '';
                const lines2 = text2.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                const bandPlayers = await ocrPlayersByBands(up2, locale);
                const players2 = bandPlayers.length ? bandPlayers : extractPlayerRows(lines2);
                if (players2 && players2.length >= (parsed.players || []).length) {
                    parsed.players = players2;
                }
            } catch {}
        }
        // Dernière tentative: lecture par bandes sur l'image up courante
        if (!parsed.players || parsed.players.length < 3) {
            try {
                const bandPlayers = await ocrPlayersByBands(up, locale);
                if (bandPlayers.length >= (parsed.players || []).length) parsed.players = bandPlayers;
            } catch {}
        }
        const result = { rawText, lines, headerText, mapBandText, parsed };
        const txt = document.getElementById('ocrResultText');
        if (txt) txt.value = JSON.stringify(result, null, 2);
        const mapBtn = document.getElementById('ocrMapBtn');
        if (mapBtn) mapBtn.disabled = false;
        const prefillBtn3 = document.getElementById('ocrPrefillMatchBtn');
        if (prefillBtn3) prefillBtn3.disabled = false; // toujours possible de préremplir (même sans joueurs)
        showNotification('OCR terminé', 'success');
    } catch (e) {
        console.error('OCR error:', e);
        showNotification('Erreur OCR: ' + (e?.message || e), 'error');
    }
}

function cropScoreboardRegion(srcCanvas, dstCanvas, template) {
    // Recadrage approximatif de la zone centrale contenant le tableau
    // Post-match: le tableau occupe ~ de 22% à 88% en X et de 28% à 86% en Y selon résolutions
    const w = srcCanvas.width, h = srcCanvas.height;
    let x0 = Math.round(w * 0.12), x1 = Math.round(w * 0.88);
    let y0 = Math.round(h * 0.22), y1 = Math.round(h * 0.90);
    if (template === 'valorant_ingame') {
        // en jeu: le panneau est souvent plus bas
        y0 = Math.round(h * 0.30);
        y1 = Math.round(h * 0.92);
    } else if (template === 'valorant_postmatch') {
        // par défaut déjà adapté
    }
    const cw = Math.max(1, x1 - x0);
    const ch = Math.max(1, y1 - y0);
    dstCanvas.width = cw; dstCanvas.height = ch;
    const dctx = dstCanvas.getContext('2d');
    dctx.drawImage(srcCanvas, x0, y0, cw, ch, 0, 0, cw, ch);
}

function cropHeaderRegion(srcCanvas, dstCanvas) {
    // Bandeau supérieur central: scores + état (VICTOIRE/DEFAITE)
    const w = srcCanvas.width, h = srcCanvas.height;
    const x0 = Math.round(w * 0.30);
    const x1 = Math.round(w * 0.70);
    const y0 = Math.round(h * 0.06);
    const y1 = Math.round(h * 0.20);
    const cw = Math.max(1, x1 - x0);
    const ch = Math.max(1, y1 - y0);
    dstCanvas.width = cw; dstCanvas.height = ch;
    const ctx = dstCanvas.getContext('2d');
    ctx.drawImage(srcCanvas, x0, y0, cw, ch, 0, 0, cw, ch);
}

function cropMapLabelRegion(srcCanvas, dstCanvas) {
    // Haut-gauche: “CARTE - SPLIT” etc.
    const w = srcCanvas.width, h = srcCanvas.height;
    const x0 = Math.round(w * 0.03);
    const x1 = Math.round(w * 0.26);
    const y0 = Math.round(h * 0.04);
    const y1 = Math.round(h * 0.16);
    const cw = Math.max(1, x1 - x0);
    const ch = Math.max(1, y1 - y0);
    dstCanvas.width = cw; dstCanvas.height = ch;
    const ctx = dstCanvas.getContext('2d');
    ctx.drawImage(srcCanvas, x0, y0, cw, ch, 0, 0, cw, ch);
}

function scaleCanvas(src, factor) {
    const dst = document.createElement('canvas');
    dst.width = Math.round(src.width * factor);
    dst.height = Math.round(src.height * factor);
    const ctx = dst.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, dst.width, dst.height);
    return dst;
}

function parseOcrText(rawText, lines) {
    const MAPS = (window.OFFICIAL_MAPS || window.ALL_MAPS || []).map(m => String(m).toLowerCase());
    let opponent = null, score = null, map = null;

    // score: e.g. "13 - 8" / "13:8"
    const scoreRe = /(\b\d{1,2})\s*[-:]\s*(\d{1,2}\b)/;
    for (const line of lines) {
        const m = line.match(scoreRe);
        if (m) { score = { us: parseInt(m[1], 10), them: parseInt(m[2], 10), raw: m[0] }; break; }
    }
    // fallback: deux grands nombres sur première ligne (ex: 13 VICTOIRE 11) -> chercher deux nombres séparés
    if (!score) {
        const joined = lines.slice(0, 6).join(' ');
        const nums = [...joined.matchAll(/\b(\d{1,2})\b/g)].map(x => parseInt(x[1], 10)).slice(0, 2);
        if (nums.length === 2) score = { us: nums[0], them: nums[1], raw: nums.join('-') };
    }
    // opponent: line containing 'vs', pick the word after
    for (const line of lines) {
        const vs = line.toLowerCase().indexOf('vs');
        if (vs >= 0) {
            const parts = line.split(/\s+/);
            const idx = parts.findIndex(p => p.toLowerCase() === 'vs');
            if (idx >= 0 && parts[idx + 1]) {
                opponent = parts.slice(idx + 1).join(' ').replace(/[^A-Za-z0-9_\-\s]/g, '').trim();
                if (opponent) break;
            }
        }
    }
    // map: détecter "CARTE - X" (fr) ou "MAP - X" (en) et matcher parmi les maps connues
    const lowText = stripAccents(rawText).toLowerCase();
    const mapLine = lines.find(l => /carte\s*[-:]/i.test(stripAccents(l)) || /map\s*[-:]/i.test(l));
    if (mapLine) {
        const clean = stripAccents(mapLine).toLowerCase();
        const after = clean.split(/carte\s*[-:]\s*|map\s*[-:]\s*/i).pop();
        if (after) {
            for (const m of MAPS) {
                if (after.includes(m)) { map = m; break; }
            }
        }
    }
    // sinon, chercher toute occurrence des maps connues
    const candidates = [];
    for (const m of MAPS) {
        if (m && lowText.includes(m.toLowerCase())) candidates.push(m);
    }
    if (!map && candidates.length) map = candidates[0];

    return { fields: { opponent, score, map }, candidates: { map: candidates } };
}

function stripAccents(s) {
    try { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch { return s; }
}

function extractPlayerRows(lines) {
    // Heuristique: ligne contenant "x / y / z" pour K/D/A, avec un nombre 2-3 chiffres (ACS) à proximité
    const rows = [];
    for (let raw of lines) {
        const clean = stripAccents(raw).replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim();
        // tolérer les "/" remplacés par ":" ou espaces (OCR)
        const kda = clean.match(/\b(\d{1,2})\s*[\/:]\s*(\d{1,2})\s*[\/:]\s*(\d{1,2})\b/) || clean.match(/\b(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\b/);
        if (!kda) continue;
        // Chercher ACS: un nombre 2-3 chiffres avant le K/D/A; puis colonnes après KDA: ecoScore (peut être négatif), FB, plants, defuses
        let acs = null, eco = null, fb = null, plants = null, defuses = null;
        const pre = clean.slice(0, kda.index).trim();
        const post = clean.slice(kda.index + kda[0].length).trim();
        const mAcs = pre.match(/(\d{2,3})\s*$/);
        if (mAcs) acs = parseInt(mAcs[1], 10);
        const cols = post.split(/\s+/);
        // Cherche un nombre (positif ou négatif) pour eco, puis 3 entiers pour fb/poses/defuses
        for (let i = 0; i < cols.length; i++) {
            const ecoM = cols[i].match(/^-?\d{1,3}$/);
            if (ecoM) {
                eco = parseInt(ecoM[0], 10);
                if (Number.isFinite(parseInt(cols[i + 1], 10)) && Number.isFinite(parseInt(cols[i + 2], 10)) && Number.isFinite(parseInt(cols[i + 3], 10))) {
                    fb = parseInt(cols[i + 1], 10);
                    plants = parseInt(cols[i + 2], 10);
                    defuses = parseInt(cols[i + 3], 10);
                }
                break;
            }
        }
        // Nom joueur: partie textuelle au début de la ligne (retirer nombres)
        let name = pre.replace(/[\d/:\-]+/g, '').trim();
        name = name.replace(/^\W+|\W+$/g, '').trim();
        if (!name) {
            // fallback: prendre un bloc alphabétique près du début
            const mName = clean.match(/^[A-Za-z][A-Za-z0-9 _.\-\[\]]{2,}/);
            if (mName) name = mName[0].trim();
        }
        rows.push({
            name,
            k: parseInt(kda[1], 10),
            d: parseInt(kda[2], 10),
            a: parseInt(kda[3], 10),
            acs,
            eco,
            firstBloods: fb,
            plants,
            defuses
        });
    }
    return rows;
}

async function ocrPlayersByBands(srcCanvas, locale) {
    const bands = 10;
    const players = [];
    const h = srcCanvas.height, w = srcCanvas.width;
    const bandH = Math.floor(h / bands);
    for (let i = 0; i < bands; i++) {
        const y0 = Math.max(0, i * bandH);
        const y1 = (i === bands - 1) ? h : (i + 1) * bandH;
        const ch = Math.max(1, y1 - y0);
        if (ch < 12) continue; // éviter les bandes trop fines
        const band = document.createElement('canvas');
        band.width = w;
        band.height = ch;
        const bctx = band.getContext('2d');
        bctx.drawImage(srcCanvas, 0, y0, w, ch, 0, 0, w, ch);
        // léger upscale et prétraitement
        const up = scaleCanvas(band, 2.0);
        // Utiliser un seuil un peu plus bas sur les bandes impaires (souvent plus claires)
        const thresholdFactor = (i % 2 === 1) ? 0.85 : 0.95;
        applyOcrPreprocess(up, { strong: true, thresholdFactor });
        try {
            // OCR normal
            const { data } = await Tesseract.recognize(up, locale, { logger: () => {}, tessedit_pageseg_mode: '7', user_defined_dpi: '300' });
            const text = (data && data.text) ? data.text : '';
            const line = stripAccents(text).replace(/\s+/g, ' ').trim();
            let row = parsePlayerLine(line);
            if (!row || !row.name) {
                // Essayer version inversée
                const inv = scaleCanvas(band, 2.0);
                applyOcrPreprocess(inv, { strong: true, thresholdFactor, invert: true });
                const { data: d2 } = await Tesseract.recognize(inv, locale, { logger: () => {}, tessedit_pageseg_mode: '7', user_defined_dpi: '300' });
                const t2 = (d2 && d2.text) ? d2.text : '';
                const l2 = stripAccents(t2).replace(/\s+/g, ' ').trim();
                row = parsePlayerLine(l2);
            }
            if (row && row.name) players.push(row);
        } catch {}
    }
    return players;
}

function parsePlayerLine(clean) {
    if (!clean) return null;
    // 1) Essayer un motif structuré complet (Nom ... ACS K/D/A Eco FB Plants Defuses)
    const mFull = clean.match(/^(?<name>.+?)\s+(?<acs>\d{2,3})\s+(?<k>\d{1,2})\s*[\/:]\s*(?<d>\d{1,2})\s*[\/:]\s*(?<a>\d{1,2})\s+(?<eco>-?\d{1,3})\s+(?<fb>\d{1,2})\s+(?<pl>\d{1,2})\s+(?<df>\d{1,2})\b/);
    if (mFull && mFull.groups) {
        const g = mFull.groups;
        return {
            name: g.name.trim().replace(/\s{2,}/g, ' '),
            k: parseInt(g.k, 10),
            d: parseInt(g.d, 10),
            a: parseInt(g.a, 10),
            acs: parseInt(g.acs, 10),
            eco: parseInt(g.eco, 10),
            firstBloods: parseInt(g.fb, 10),
            plants: parseInt(g.pl, 10),
            defuses: parseInt(g.df, 10)
        };
    }

    // 2) Sinon, repérer strictement K/D/A avec slashs et dériver autour
    const kda = clean.match(/\b(\d{1,2})\s*[\/:]\s*(\d{1,2})\s*[\/:]\s*(\d{1,2})\b/);
    if (!kda) return null;
    let acs = null, eco = null, fb = null, plants = null, defuses = null;
    const pre = clean.slice(0, kda.index).trim();
    const post = clean.slice(kda.index + kda[0].length).trim();
    const mAcs = pre.match(/(\d{2,3})\s*$/);
    if (mAcs) acs = parseInt(mAcs[1], 10);
    const cols = post.split(/\s+/);
    // Chercher l'éco puis trois entiers
    for (let i = 0; i < cols.length; i++) {
        const ecoM = cols[i].match(/^-?\d{1,3}$/);
        if (ecoM) {
            eco = parseInt(ecoM[0], 10);
            if (Number.isFinite(parseInt(cols[i + 1], 10)) && Number.isFinite(parseInt(cols[i + 2], 10)) && Number.isFinite(parseInt(cols[i + 3], 10))) {
                fb = parseInt(cols[i + 1], 10);
                plants = parseInt(cols[i + 2], 10);
                defuses = parseInt(cols[i + 3], 10);
            }
            break;
        }
    }
    let name = pre.replace(/[\d/:\-]+/g, '').trim();
    name = name.replace(/^\W+|\W+$/g, '').trim();
    if (!name) {
        const mName = clean.match(/^[A-Za-z][A-Za-z0-9 _.\-\[\]]{2,}/);
        if (mName) name = mName[0].trim();
    }
    return {
        name,
        k: parseInt(kda[1], 10),
        d: parseInt(kda[2], 10),
        a: parseInt(kda[3], 10),
        acs, eco, firstBloods: fb, plants, defuses
    };
}
function ocrMapExtractedFields() {
    const txt = document.getElementById('ocrResultText');
    if (!txt || !txt.value) return;
    try {
        const obj = JSON.parse(txt.value);
        const fields = obj?.parsed?.fields || {};
        const mapName = normalizeMapForSelect(fields.map);
        if (mapName) {
            const matchMapSelect = document.getElementById('matchMapSelect');
            if (matchMapSelect) matchMapSelect.value = findClosestMap(mapName) || matchMapSelect.value;
        }
        if (fields.opponent) {
            const matchOpponentInput = document.getElementById('matchOpponentInput');
            if (matchOpponentInput) matchOpponentInput.value = fields.opponent;
        }
        showNotification('Champs mis à jour depuis l’OCR', 'success');
        try { metricsService?.incr('ocr_map_fields'); } catch {}
    } catch (e) {
        console.warn('OCR mapping error:', e);
        showNotification('Impossible de mapper les champs depuis le JSON OCR.', 'warning');
    }
}

function ocrPrefillMatch() {
    const txt = document.getElementById('ocrResultText');
    if (!txt || !txt.value) return;
    try {
        const obj = JSON.parse(txt.value);
        const fields = obj?.parsed?.fields || {};
        const players = obj?.parsed?.players || [];
        // Créer un match brouillon
        const date = new Date().toLocaleDateString('fr-FR');
        const map = findClosestMap(normalizeMapForSelect(fields.map)) || '';
        const opponent = fields.opponent || '';
        const scoreObj = fields.score;
        const scoreStr = (scoreObj && Number.isFinite(scoreObj.us) && Number.isFinite(scoreObj.them)) ? `${scoreObj.us}-${scoreObj.them}` : '';
        const resultStr = (scoreObj && Number.isFinite(scoreObj.us) && Number.isFinite(scoreObj.them))
            ? (scoreObj.us > scoreObj.them ? 'Victoire' : (scoreObj.us < scoreObj.them ? 'Défaite' : 'Nul'))
            : '';
        const m = new Match(date, map, opponent, scoreStr, resultStr);
        // playersStats: 10 lignes max, assignation A/B par index (0-4 A, 5-9 B) modifiable dans l’éditeur
        m.playersStats = players.slice(0, 10).map((p, idx) => ({
            team: idx < 5 ? 'A' : 'B',
            name: p.name || '',
            k: p.k ?? null,
            d: p.d ?? null,
            a: p.a ?? null,
            acs: p.acs ?? null,
            eco: p.eco ?? null,
            firstBloods: p.firstBloods ?? null,
            plants: p.plants ?? null,
            defuses: p.defuses ?? null
        }));
        showMatchEditor(m);
        showNotification('Match prérempli à partir de l’OCR', 'success');
    } catch (e) {
        console.warn('OCR prefill match error:', e);
        showNotification('Erreur lors du préremplissage du match.', 'error');
    }
}
function ocrApplyPlayers() {
    const txt = document.getElementById('ocrResultText');
    if (!txt || !txt.value) return;
    try {
        const obj = JSON.parse(txt.value);
        const players = obj?.parsed?.players || [];
        if (!Array.isArray(players) || players.length === 0) {
            showNotification('Aucune ligne joueur détectée.', 'warning');
            return;
        }
        let added = 0;
        players.forEach(p => {
            if (!p?.name) return;
            const exists = (team.players || []).some(x => String(x.name).toLowerCase() === String(p.name).toLowerCase());
            if (!exists) {
                try {
                    const player = new Player(p.name, '', '', '');
                    team.addPlayer(player);
                    added++;
                } catch {}
            }
        });
        // Sauvegarde + rafraîchis UI
        try { updatePlayersTab(); } catch {}
        try { updateHomeTab(); } catch {}
        try { saveTeam(); } catch {}
        showNotification(`Import joueurs terminé: ${added} ajoutés, ${players.length - added} déjà présents.`, 'success');
        try { metricsService?.incr('ocr_import_players'); } catch {}
    } catch (e) {
        console.warn('OCR players import error:', e);
        showNotification('Erreur lors de l’import des joueurs détectés.', 'error');
    }
}

function drawOcrCanvasOverlay(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // Repeindre la base pour éviter l'empilement de rectangles
    try {
        if (canvas._baseImageData) {
            ctx.putImageData(canvas._baseImageData, 0, 0);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    } catch {}
    const roi = canvas._roi;
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;
    if (roi && roi.w > 0 && roi.h > 0) {
        ctx.strokeStyle = 'rgba(255, 70, 85, 0.9)';
        ctx.strokeRect(roi.x + 0.5, roi.y + 0.5, roi.w, roi.h);
    }
    ctx.restore();
}
function normalizeMapForSelect(name) {
    if (!name) return null;
    return String(name).trim();
}

function findClosestMap(name) {
    const maps = (window.OFFICIAL_MAPS || window.ALL_MAPS || []);
    const low = name.toLowerCase();
    for (const m of maps) {
        if (String(m).toLowerCase() === low) return m;
    }
    // fallback: contains
    for (const m of maps) {
        if (low.includes(String(m).toLowerCase())) return m;
    }
    return null;
}

// Modal de gestion du chemin de fichier
async function showFilePathModal() {
    const modal = document.getElementById('filePathModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Charger le chemin actuel depuis la config
    try {
        const config = await ipcRenderer.invoke('load-config');
        const currentPath = config?.last_team_file || currentTeamPath || '';
        const pathInput = document.getElementById('currentTeamPath');
        if (pathInput) {
            pathInput.value = currentPath;
        }
        
        // Vérifier le fichier et mettre à jour le statut
        await checkFilePathStatus(currentPath);
    } catch (error) {
        console.error('Erreur lors du chargement du chemin:', error);
        updateFilePathStatus('error', 'Erreur lors du chargement du chemin');
    }
    
    // Attacher les gestionnaires d'événements
    wireFilePathModal();
}

function wireFilePathModal() {
    const modal = document.getElementById('filePathModal');
    if (!modal) return;
    
    // Bouton de fermeture
    const closeBtn = document.getElementById('filePathModalClose');
    if (closeBtn && !closeBtn._wired) {
        closeBtn._wired = true;
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            modal.classList.remove('show');
        });
    }
    
    // Clic sur le fond pour fermer
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    });
    
    // Bouton Parcourir
    const browseBtn = document.getElementById('browseTeamPathBtn');
    if (browseBtn && !browseBtn._wired) {
        browseBtn._wired = true;
        browseBtn.addEventListener('click', async () => {
            try {
                const result = await ipcRenderer.invoke('show-open-dialog', {
                    title: 'Sélectionner un fichier d\'équipe',
                    filters: [
                        { name: 'JSON', extensions: ['json'] },
                        { name: 'Tous les fichiers', extensions: ['*'] }
                    ],
                    properties: ['openFile']
                });
                
                if (!result.canceled && result.filePaths.length > 0) {
                    const filePath = result.filePaths[0];
                    const pathInput = document.getElementById('currentTeamPath');
                    if (pathInput) {
                        pathInput.value = filePath;
                    }
                    
                    // Vérifier le nouveau fichier
                    await checkFilePathStatus(filePath);
                    
                    // Mettre à jour la configuration
                    let config = await ipcRenderer.invoke('load-config');
                    if (!config || typeof config !== 'object') {
                        config = {};
                    }
                    config.last_team_file = filePath;
                    await ipcRenderer.invoke('save-config', config);
                    currentTeamPath = filePath;
                }
            } catch (error) {
                console.error('Erreur lors de la sélection du fichier:', error);
                updateFilePathStatus('error', 'Erreur lors de la sélection du fichier: ' + error.message);
            }
        });
    }
    
    // Bouton Valider
    const validateBtn = document.getElementById('validateFileBtn');
    if (validateBtn && !validateBtn._wired) {
        validateBtn._wired = true;
        validateBtn.addEventListener('click', async () => {
            const pathInput = document.getElementById('currentTeamPath');
            if (!pathInput || !pathInput.value) {
                showNotification('Veuillez sélectionner un fichier', 'warning');
                return;
            }
            
            const filePath = pathInput.value.trim();
            updateFilePathStatus('progress', 'Validation en cours...');
            
            try {
                // Valider le fichier
                const validation = await ipcRenderer.invoke('validate-json-file', filePath);
                
                if (validation.valid) {
                    // Mettre à jour la configuration
                    let config = await ipcRenderer.invoke('load-config');
                    if (!config || typeof config !== 'object') {
                        config = {};
                    }
                    config.last_team_file = filePath;
                    await ipcRenderer.invoke('save-config', config);
                    currentTeamPath = filePath;
                    
                    // Charger l'équipe
                    await loadTeamFromPath(filePath);
                    
                    // Fermer la modal
                    modal.style.display = 'none';
                    modal.classList.remove('show');
                    
                    showNotification('Fichier chargé avec succès', 'success');
                    updateAllTabs();
                    showHomeInterface();
                } else {
                    updateFilePathStatus('error', validation.message || 'Le fichier n\'est pas valide');
                }
            } catch (error) {
                console.error('Erreur lors de la validation:', error);
                updateFilePathStatus('error', 'Erreur lors de la validation: ' + error.message);
            }
        });
    }
}

async function checkFilePathStatus(filePath) {
    if (!filePath) {
        updateFilePathStatus('warning', 'Aucun chemin de fichier configuré');
        clearFilePathInfo();
        return;
    }
    
    updateFilePathStatus('progress', 'Vérification en cours...');
    
    try {
        // Vérifier si le fichier existe
        const exists = await ipcRenderer.invoke('file-exists', filePath);
        
        if (!exists) {
            updateFilePathStatus('error', 'Le fichier n\'existe pas à cet emplacement');
            clearFilePathInfo();
            return;
        }
        
        // Valider le fichier JSON
        const validation = await ipcRenderer.invoke('validate-json-file', filePath);
        
        if (validation.valid && validation.data) {
            updateFilePathStatus('success', 'Fichier valide et accessible');
            updateFilePathInfo(validation.data, filePath);
        } else {
            updateFilePathStatus('error', validation.message || 'Le fichier JSON n\'est pas valide');
            clearFilePathInfo();
        }
    } catch (error) {
        console.error('Erreur lors de la vérification:', error);
        updateFilePathStatus('error', 'Erreur lors de la vérification: ' + error.message);
        clearFilePathInfo();
    }
}

function updateFilePathStatus(type, message) {
    const statusDiv = document.getElementById('filePathStatus');
    const statusIcon = document.getElementById('filePathStatusIcon');
    const statusText = document.getElementById('filePathStatusText');
    
    if (!statusDiv || !statusIcon || !statusText) return;
    
    // Retirer les classes précédentes
    statusDiv.classList.remove('success', 'error', 'warning');
    
    // Ajouter la nouvelle classe
    if (type !== 'progress') {
        statusDiv.classList.add(type);
    }
    
    // Mettre à jour l'icône et le message
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        progress: '⏳'
    };
    
    statusIcon.textContent = icons[type] || '⏳';
    statusText.textContent = message;
}

function updateFilePathInfo(teamData, filePath) {
    const teamName = document.getElementById('fileTeamName');
    const playersCount = document.getElementById('filePlayersCount');
    const matchesCount = document.getElementById('fileMatchesCount');
    const lastModified = document.getElementById('fileLastModified');
    
    if (teamName) {
        teamName.textContent = teamData.name || '-';
        teamName.classList.remove('muted');
    }
    
    if (playersCount) {
        const count = Array.isArray(teamData.players) ? teamData.players.length : 0;
        playersCount.textContent = count.toString();
        playersCount.classList.remove('muted');
    }
    
    if (matchesCount) {
        const count = Array.isArray(teamData.matches) ? teamData.matches.length : 0;
        matchesCount.textContent = count.toString();
        matchesCount.classList.remove('muted');
    }
    
    if (lastModified && filePath) {
        // Obtenir la date de modification du fichier
        ipcRenderer.invoke('get-file-stats', filePath).then(stats => {
            if (stats && stats.mtime) {
                const date = new Date(stats.mtime);
                lastModified.textContent = date.toLocaleString('fr-FR');
                lastModified.classList.remove('muted');
            } else {
                lastModified.textContent = '-';
                lastModified.classList.add('muted');
            }
        }).catch(() => {
            lastModified.textContent = '-';
            lastModified.classList.add('muted');
        });
    }
}

function clearFilePathInfo() {
    const teamName = document.getElementById('fileTeamName');
    const playersCount = document.getElementById('filePlayersCount');
    const matchesCount = document.getElementById('fileMatchesCount');
    const lastModified = document.getElementById('fileLastModified');
    
    if (teamName) {
        teamName.textContent = '-';
        teamName.classList.add('muted');
    }
    if (playersCount) {
        playersCount.textContent = '-';
        playersCount.classList.add('muted');
    }
    if (matchesCount) {
        matchesCount.textContent = '-';
        matchesCount.classList.add('muted');
    }
    if (lastModified) {
        lastModified.textContent = '-';
        lastModified.classList.add('muted');
    }
}

function clearOcrModal() {
    const canvas = document.getElementById('ocrPreviewCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = canvas.height = 0;
    }
    const txt = document.getElementById('ocrResultText');
    if (txt) txt.value = '';
    const mapBtn = document.getElementById('ocrMapBtn');
    if (mapBtn) mapBtn.disabled = true;
}

