const { app, BrowserWindow, Menu, dialog, ipcMain, protocol } = require('electron');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const Store = require('electron-store');
const https = require('https');
const http = require('http');

// Initialiser electron-store pour la persistance des données
const store = new Store({
  name: 'config',
  defaults: {
    last_team_file: null
  }
});

let mainWindow;
let overlayWindow = null;
const configPath = path.join(__dirname, 'Data', 'config.json');
const defaultTeamPath = path.join(__dirname, 'Data', 'team.json');

// Créer le dossier Data s'il n'existe pas
function ensureDataDirectory() {
  const dataDir = path.join(__dirname, 'Data');
  if (!fsSync.existsSync(dataDir)) {
    fsSync.mkdirSync(dataDir, { recursive: true });
    console.log('Dossier Data créé');
  }
  
  // Ne créer le fichier de configuration que s'il n'existe pas
  // Laisser le renderer décider s'il faut créer une nouvelle équipe
  if (!fsSync.existsSync(configPath)) {
    // Ne pas créer de fichier par défaut, laisser la modal gérer cela
    console.log('Fichier de configuration n\'existe pas, sera créé par la modal');
  }
  
  // Ne pas créer le fichier d'équipe par défaut automatiquement
  // Laisser la modal de configuration initiale le créer
  if (!fsSync.existsSync(defaultTeamPath)) {
    console.log('Fichier d\'équipe n\'existe pas, sera créé par la modal');
  }
}

// Charger la configuration de manière asynchrone (sans bloquer l'UI)
async function loadConfig() {
  try {
    const exists = await fs.access(configPath).then(() => true).catch(() => false);
    if (exists) {
      let data = await fs.readFile(configPath, 'utf-8');
      // Supprimer le BOM (Byte Order Mark) UTF-8 si présent
      if (data.charCodeAt(0) === 0xFEFF) {
        data = data.slice(1);
      }
      const config = JSON.parse(data);
      // Si la config existe mais le chemin d'équipe est invalide, retourner quand même l'objet config
      // (il sera mis à jour lors de la création d'une nouvelle équipe)
      if (config && typeof config === 'object') {
        return config;
      }
      // Si la config n'est pas valide, retourner un objet vide au lieu de null
      console.log('Configuration invalide, retour d\'un objet vide');
      return {};
    }
  } catch (err) {
    console.error('Erreur lors du chargement de la configuration:', err);
  }
  // Retourner un objet vide si le fichier n'existe pas (au lieu de null pour éviter les erreurs)
  return {};
}

// Charger la configuration de manière synchrone (pour compatibilité avec le code existant)
function loadConfigSync() {
  try {
    if (fsSync.existsSync(configPath)) {
      let data = fsSync.readFileSync(configPath, 'utf-8');
      // Supprimer le BOM (Byte Order Mark) UTF-8 si présent
      if (data.charCodeAt(0) === 0xFEFF) {
        data = data.slice(1);
      }
      const config = JSON.parse(data);
      if (config && typeof config === 'object') {
        return config;
      }
      console.log('Configuration invalide, retour d\'un objet vide');
      return {};
    }
  } catch (err) {
    console.error('Erreur lors du chargement de la configuration:', err);
  }
  return {};
}

// Sauvegarder la configuration de manière asynchrone (sans bloquer l'UI)
async function saveConfig(config) {
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), { encoding: 'utf8' });
    return { success: true };
  } catch (err) {
    console.error('Erreur lors de la sauvegarde de la configuration:', err);
    return { success: false, error: err.message };
  }
}

// Sauvegarder la configuration de manière synchrone (pour compatibilité avec le code existant)
function saveConfigSync(config) {
  try {
    fsSync.writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: 'utf8' });
  } catch (err) {
    console.error('Erreur lors de la sauvegarde de la configuration:', err);
  }
}

// Enregistrer le protocole personnalisé pour servir les fichiers locaux
function registerCustomProtocol() {
  // Utiliser registerFileProtocol qui est plus simple et fiable pour les fichiers locaux
  protocol.registerFileProtocol('app', (request, callback) => {
    try {
      const url = request.url.substr(6); // Enlever "app://"
      // Normaliser l'URL (enlever les paramètres de requête et fragments)
      const cleanUrl = url.split('?')[0].split('#')[0];
      let filePath = path.join(__dirname, cleanUrl);
      
      // Gérer le cas où l'application est dans app.asar (Electron packagé)
      // Dans ce cas, __dirname pointe vers app.asar, mais les fichiers sont extraits
      if (filePath.includes('app.asar')) {
        // Remplacer app.asar par app.asar.unpacked ou le répertoire parent
        filePath = filePath.replace(/app\.asar[\/\\]?/, '');
        // Si le fichier n'existe pas, essayer avec app.asar
        if (!fsSync.existsSync(filePath)) {
          filePath = path.join(__dirname, cleanUrl);
        }
      }
      
      const normalizedPath = path.normalize(filePath);
      
      // Vérifier que le fichier existe
      if (!fsSync.existsSync(normalizedPath)) {
        console.error('Fichier non trouvé:', normalizedPath, '(url originale:', request.url, ')');
        callback({ error: -6 }); // FILE_NOT_FOUND
        return;
      }
      
      // Retourner le chemin du fichier
      callback({ path: normalizedPath });
    } catch (error) {
      console.error('Erreur dans registerFileProtocol:', error, 'URL:', request.url);
      callback({ error: -6 });
    }
  });
  
  console.log('Protocole app:// enregistré avec succès');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1450,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#171f26',
    webPreferences: {
      nodeIntegration: true,           // TODO: à désactiver après mise en place du preload sécurisé
      contextIsolation: false,         // TODO: passer à true avec preload
      webSecurity: false,              // Désactivé temporairement pour permettre le chargement des fichiers JS locaux
      webviewTag: false,               // interdit <webview>
      allowRunningInsecureContent: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  // Charger index.html avec le chemin absolu pour éviter les problèmes de résolution
  const indexPath = path.join(__dirname, 'index.html');
  console.log('Chargement de index.html depuis:', indexPath);
  mainWindow.loadFile(indexPath);

  // Ouvrir les DevTools au démarrage (pour le débogage)
  // mainWindow.webContents.openDevTools();

  // Créer le menu
  createMenu();

  // Gestion cycle de vie
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.webContents.on('render-process-gone', (e, details) => {
    console.error('Renderer crash/detach:', details);
  });
  
  // Activer le raccourci F12 pour ouvrir les DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
  });
}

// Créer la fenêtre overlay
function createOverlayWindow() {
  try {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.focus();
      return;
    }

    // Vérifier que le fichier overlay.html existe
    const overlayPath = path.join(__dirname, 'overlay.html');
    if (!fsSync.existsSync(overlayPath)) {
      console.error('Fichier overlay.html introuvable:', overlayPath);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('overlay-error', {
          message: 'Fichier overlay.html introuvable. Vérifiez que le fichier existe dans le répertoire de l\'application.'
        });
      }
      return;
    }

    console.log('Création de la fenêtre overlay...');
    overlayWindow = new BrowserWindow({
      width: 500,
      height: 700,
      minWidth: 400,
      minHeight: 500,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      transparent: true,
      resizable: true,
      backgroundColor: '#00000000', // Transparent
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: false
      },
      icon: path.join(__dirname, 'assets', 'icon.png'),
      show: false // Ne pas afficher immédiatement
    });

    // Gestion des erreurs de chargement
    overlayWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Erreur lors du chargement de l\'overlay:', errorCode, errorDescription, validatedURL);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('overlay-error', {
          message: `Erreur lors du chargement: ${errorDescription} (Code: ${errorCode})`
        });
      }
    });

    // Gestion des erreurs de rendu
    overlayWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('Erreur du processus de rendu overlay:', details);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('overlay-error', {
          message: 'Erreur du processus de rendu de l\'overlay'
        });
      }
    });

    // Charger le fichier
    console.log('Chargement du fichier overlay:', overlayPath);
    overlayWindow.loadFile(overlayPath).catch(err => {
      console.error('Erreur lors du loadFile:', err);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('overlay-error', {
          message: `Erreur lors du chargement du fichier: ${err.message}`
        });
      }
    });

    // Afficher la fenêtre une fois prête
    overlayWindow.once('ready-to-show', () => {
      console.log('Overlay prêt à être affiché');
      overlayWindow.show();
      
      // Position par défaut (coin supérieur droit)
      try {
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        overlayWindow.setPosition(width - 520, 20);
      } catch (err) {
        console.error('Erreur lors du positionnement:', err);
      }
    });

    overlayWindow.on('closed', () => {
      console.log('Fenêtre overlay fermée');
      overlayWindow = null;
    });

    // Permettre de déplacer la fenêtre en cliquant n'importe où
    overlayWindow.setIgnoreMouseEvents(false);

    // Raccourci pour fermer l'overlay (Ctrl+Shift+O)
    overlayWindow.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.shift && input.key === 'O') {
        overlayWindow.close();
      }
      if (input.key === 'F12') {
        overlayWindow.webContents.toggleDevTools();
      }
    });

    console.log('Fenêtre overlay créée avec succès');
  } catch (err) {
    console.error('Erreur lors de la création de la fenêtre overlay:', err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('overlay-error', {
        message: `Erreur lors de la création: ${err.message}`
      });
    }
  }
}

function createMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Sauvegarder',
          accelerator: 'Ctrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save');
          }
        },
        {
          label: 'Importer',
          accelerator: 'Ctrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              title: 'Ouvrir une équipe',
              filters: [
                { name: 'JSON', extensions: ['json'] },
                { name: 'Tous les fichiers', extensions: ['*'] }
              ],
              properties: ['openFile']
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send('menu-import', result.filePaths[0]);
            }
          }
        },
            {
              label: 'Exporter',
              accelerator: 'Ctrl+E',
              submenu: [
                {
                  label: 'Exporter en JSON',
                  click: async () => {
                    const result = await dialog.showSaveDialog(mainWindow, {
                      title: 'Sauvegarder l\'équipe',
                      defaultPath: 'team.json',
                      filters: [
                        { name: 'JSON', extensions: ['json'] },
                        { name: 'Tous les fichiers', extensions: ['*'] }
                      ]
                    });
                    
                    if (!result.canceled && result.filePath) {
                      mainWindow.webContents.send('menu-export', result.filePath);
                    }
                  }
                },
                {
                  label: 'Exporter en CSV',
                  click: () => {
                    mainWindow.webContents.send('menu-export-csv');
                  }
                },
                {
                  label: 'Exporter en XML',
                  click: () => {
                    mainWindow.webContents.send('menu-export-xml');
                  }
                },
                {
                  label: 'Exporter statistiques en CSV',
                  click: () => {
                    mainWindow.webContents.send('menu-export-stats-csv');
                  }
                },
                { type: 'separator' },
                {
                  label: 'Générer rapport HTML',
                  click: () => {
                    mainWindow.webContents.send('menu-export-html-report');
                  }
                }
              ]
            },
        {
          label: 'Importer depuis CSV',
          accelerator: 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.send('menu-import-csv');
          }
        },
        { type: 'separator' },
        {
          label: 'Quitter',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Équipe',
      submenu: [
        {
          label: 'Ajouter un joueur',
          accelerator: 'Ctrl+N',
          click: () => {
            mainWindow.webContents.send('menu-add-player');
          }
        },
        {
          label: 'Ajouter un match',
          accelerator: 'Ctrl+M',
          click: () => {
            mainWindow.webContents.send('menu-add-match');
          }
        }
      ]
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'À propos',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'À propos',
              message: 'Valorant Team Manager',
              detail: 'Gestionnaire d\'équipe Valorant avec statistiques et progression\nVersion 1.0.0'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
function isTrustedEvent(event) {
  try {
    const url = event?.senderFrame?.url || '';
    // N’autoriser que l’UI locale (app://) ou file:// pendant transition
    return url.startsWith('app://') || url.startsWith('file://');
  } catch {
    return false;
  }
}

// Charger un fichier JSON de manière asynchrone (sans bloquer l'UI)
async function loadJsonFile(filePath) {
  try {
    // Vérifier que le fichier existe
    await fs.access(filePath);
    
    // Lire le fichier de manière asynchrone
    let data = await fs.readFile(filePath, 'utf-8');
    
    // Supprimer le BOM (Byte Order Mark) UTF-8 si présent
    if (data.length > 0 && data.charCodeAt(0) === 0xFEFF) {
      data = data.slice(1);
    }
    
    // Parser le JSON
    const parsed = JSON.parse(data);
    return { success: true, data: parsed };
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('Fichier non trouvé:', filePath);
      return { success: false, error: 'FILE_NOT_FOUND', message: 'Le fichier n\'existe pas' };
    } else if (err instanceof SyntaxError) {
      console.error('Erreur de parsing JSON:', err);
      return { success: false, error: 'INVALID_JSON', message: 'Le fichier JSON est invalide' };
    } else {
      console.error('Erreur lors du chargement du fichier JSON:', err);
      return { success: false, error: 'READ_ERROR', message: err.message };
    }
  }
}

ipcMain.handle('load-team', async (event, filePath) => {
  if (!isTrustedEvent(event)) return { success: false, error: 'untrusted_sender' };
  try {
    const teamPath = filePath || defaultTeamPath;
    const result = await loadJsonFile(teamPath);
    
    if (result.success) {
      return result.data;
    } else {
      console.error('Erreur lors du chargement de l\'équipe:', result.message);
      return null;
    }
  } catch (err) {
    console.error('Erreur lors du chargement de l\'équipe:', err);
    return null;
  }
});

ipcMain.handle('save-team', async (event, teamData, filePath) => {
  if (!isTrustedEvent(event)) return { success: false, error: 'untrusted_sender' };
  try {
    const teamPath = filePath || defaultTeamPath;
    
    // Créer le répertoire parent s'il n'existe pas
    const dir = path.dirname(teamPath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
    
    // Sauvegarder sans BOM (UTF-8 sans BOM)
    await fs.writeFile(teamPath, JSON.stringify(teamData, null, 2), { encoding: 'utf8' });
    
    // Mettre à jour le chemin dans electron-store
    store.set('last_team_file', teamPath);
    
    return { success: true };
  } catch (err) {
    console.error('Erreur lors de la sauvegarde de l\'équipe:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-config', async () => {
  // Retourner la config depuis electron-store (pour compatibilité avec le code existant)
  // On retourne un objet avec last_team_file depuis electron-store
  return {
    last_team_file: store.get('last_team_file')
  };
});

ipcMain.handle('save-config', async (event, config) => {
  if (!isTrustedEvent(event)) return { success: false, error: 'untrusted_sender' };
  // Sauvegarder last_team_file dans electron-store si présent
  if (config && config.last_team_file) {
    store.set('last_team_file', config.last_team_file);
  }
  return { success: true };
});

// Vérifier l'existence d'un fichier de manière asynchrone
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Vérifier si un fichier JSON est valide
async function validateJsonFile(filePath) {
  const result = await loadJsonFile(filePath);
  if (!result.success) {
    return { valid: false, error: result.error, message: result.message };
  }
  
  // Vérifier que c'est bien un fichier d'équipe (a au moins un champ 'name')
  if (result.data && typeof result.data === 'object' && result.data.name) {
    return { valid: true, data: result.data };
  }
  
  return { valid: false, error: 'INVALID_FORMAT', message: 'Le fichier ne semble pas être un fichier d\'équipe valide' };
}

ipcMain.handle('file-exists', async (event, filePath) => {
  if (!isTrustedEvent(event)) return false;
  try {
    return await fileExists(filePath);
  } catch (err) {
    console.error('Erreur lors de la vérification du fichier:', err);
    return false;
  }
});

ipcMain.handle('validate-json-file', async (event, filePath) => {
  if (!isTrustedEvent(event)) return { valid: false, error: 'untrusted_sender' };
  try {
    return await validateJsonFile(filePath);
  } catch (err) {
    console.error('Erreur lors de la validation du fichier:', err);
    return { valid: false, error: 'VALIDATION_ERROR', message: err.message };
  }
});

// Obtenir les statistiques d'un fichier (date de modification, etc.)
ipcMain.handle('get-file-stats', async (event, filePath) => {
  if (!isTrustedEvent(event)) return null;
  try {
    const stats = await fs.stat(filePath);
    return {
      mtime: stats.mtime.toISOString(),
      size: stats.size,
      isFile: stats.isFile()
    };
  } catch (err) {
    console.error('Erreur lors de la récupération des stats du fichier:', err);
    return null;
  }
});

ipcMain.handle('get-app-path', async () => {
  return __dirname;
});

ipcMain.handle('show-save-dialog', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Sauvegarder l\'équipe',
    defaultPath: 'team.json',
    filters: [
      { name: 'JSON', extensions: ['json'] },
      { name: 'Tous les fichiers', extensions: ['*'] }
    ]
  });
  
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  if (!isTrustedEvent(event)) return { canceled: true, filePaths: [] };
  const defaultOptions = {
    title: 'Ouvrir une équipe',
    filters: [
      { name: 'JSON', extensions: ['json'] },
      { name: 'Tous les fichiers', extensions: ['*'] }
    ],
    properties: ['openFile']
  };
  
  const result = await dialog.showOpenDialog(mainWindow, options || defaultOptions);
  return result;
});

// Riot proxy to bypass browser CORS with security guards
ipcMain.handle('riot-proxy', async (event, payload) => {
  // Vérification de sécurité plus permissive pour l'API Riot
  try {
    const senderUrl = event?.senderFrame?.url || event?.sender?.getURL() || '';
    // Autoriser les requêtes depuis l'application locale
    if (!senderUrl.startsWith('app://') && !senderUrl.startsWith('file://') && !senderUrl.includes('localhost')) {
      console.warn('Riot proxy: requête depuis une source non autorisée:', senderUrl);
      // Ne pas bloquer complètement, mais logger l'avertissement
    }
  } catch (e) {
    console.warn('Riot proxy: erreur lors de la vérification de l\'URL:', e);
  }
  
  try {
    const { url, headers } = payload || {};
    if (!url || typeof url !== 'string') {
      return { ok: false, status: 0, error: 'invalid_url', body: '' };
    }
    
    // Vérifier que l'URL est bien une URL Riot Games
    if (!url.includes('api.riotgames.com')) {
      return { ok: false, status: 0, error: 'invalid_domain', body: 'Seules les requêtes vers api.riotgames.com sont autorisées' };
    }
    
    // Vérifier que les headers sont présents et contiennent la clé API
    const normalizedHeaders = headers || {};
    let apiKey = normalizedHeaders['X-Riot-Token'] || normalizedHeaders['x-riot-token'] || normalizedHeaders['X-Riot-API-Key'] || normalizedHeaders['x-riot-api-key'] || '';
    
    // Nettoyer et vérifier la clé
    apiKey = (apiKey || '').trim();
    
    if (!apiKey) {
      console.error('[Riot Proxy] Aucune clé API trouvée dans les headers:', Object.keys(normalizedHeaders));
      return { 
        ok: false, 
        status: 401, 
        error: 'missing_api_key', 
        body: JSON.stringify({ 
          status: { 
            message: 'Cannot process request apikey or authorization header is empty', 
            status_code: 401 
          } 
        }) 
      };
    }
    
    // Normaliser les headers (assurer que la casse est correcte et la clé est trimmée)
    const finalHeaders = {};
    if (normalizedHeaders['X-Riot-Token'] || normalizedHeaders['x-riot-token']) {
      finalHeaders['X-Riot-Token'] = apiKey;
    } else {
      finalHeaders['X-Riot-API-Key'] = apiKey;
    }
    
    console.log('[Riot Proxy] Requête vers:', url);
    console.log('[Riot Proxy] Headers envoyés:', Object.keys(finalHeaders));
    console.log('[Riot Proxy] Clé API (premiers caractères):', apiKey.substring(0, 10) + '...');
    
    // Utiliser https natif si fetch n'est pas disponible
    if (typeof fetch === 'function') {
      try {
        const res = await fetch(url, { 
          headers: finalHeaders,
          method: 'GET'
        });
        const text = await res.text();
        const headersObj = {};
        res.headers.forEach((v, k) => { headersObj[k] = v; });
        return { ok: res.ok, status: res.status, headers: headersObj, body: text };
      } catch (fetchErr) {
        console.warn('Fetch échoué, utilisation de https natif:', fetchErr);
        // Fallback vers https natif
      }
    }
    
    // Fallback: utiliser https/http natif de Node.js
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      // Utiliser les headers normalisés (déjà normalisés plus haut)
      // finalHeaders et apiKey sont déjà définis dans le scope parent
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: finalHeaders  // Utiliser les headers déjà normalisés
      };
      
      console.log('[Riot Proxy] Requête https native vers:', urlObj.hostname + urlObj.pathname);
      console.log('[Riot Proxy] Headers https native:', Object.keys(finalHeaders));
      
      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          const headersObj = {};
          Object.keys(res.headers).forEach(k => { headersObj[k] = res.headers[k]; });
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode || 0,
            headers: headersObj,
            body: data
          });
        });
      });
      
      req.on('error', (err) => {
        resolve({ ok: false, status: 0, error: String(err && err.message || err), body: '' });
      });
      
      req.setTimeout(15000, () => {
        req.destroy();
        resolve({ ok: false, status: 0, error: 'timeout', body: '' });
      });
      
      req.end();
    });
  } catch (err) {
    return { ok: false, status: 0, error: String(err && err.message || err), body: '' };
  }
});

// Vérifier ou créer le fichier d'équipe AVANT de créer la fenêtre
async function checkOrCreateTeamFile() {
  try {
    // Récupérer le chemin depuis electron-store
    let teamFilePath = store.get('last_team_file');
    
    console.log('🔍 Vérification du fichier d\'équipe...');
    console.log('📁 Chemin dans electron-store:', teamFilePath);
    
    // Vérifier si le fichier existe et est valide
    if (teamFilePath && fsSync.existsSync(teamFilePath)) {
      console.log('✅ Fichier trouvé, validation...');
      // Vérifier que le fichier est valide
      try {
        let data = fsSync.readFileSync(teamFilePath, 'utf-8');
        // Supprimer le BOM si présent
        if (data.length > 0 && data.charCodeAt(0) === 0xFEFF) {
          data = data.slice(1);
        }
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && parsed.name) {
          console.log('✅ Fichier d\'équipe valide trouvé:', teamFilePath);
          console.log('👥 Nom de l\'équipe:', parsed.name);
          return { success: true, filePath: teamFilePath, isNew: false };
        } else {
          console.log('⚠️ Fichier JSON invalide (pas de champ name)');
          // Nettoyer le chemin invalide
          store.delete('last_team_file');
        }
      } catch (err) {
        console.error('❌ Erreur lors de la validation du fichier:', err.message);
        // Le fichier existe mais est invalide, nettoyer le chemin
        store.delete('last_team_file');
      }
    } else {
      if (teamFilePath) {
        console.log('⚠️ Fichier non trouvé à l\'emplacement:', teamFilePath);
        // Le fichier n'existe pas, nettoyer le chemin
        store.delete('last_team_file');
      } else {
        console.log('⚠️ Aucun chemin de fichier dans electron-store');
      }
    }
    
    // Si aucun fichier valide n'est trouvé, demander à l'utilisateur
    console.log('📝 Aucun fichier d\'équipe valide trouvé, demande à l\'utilisateur...');
    
    // Créer le dossier Data s'il n'existe pas
    ensureDataDirectory();
    
    // Proposer de créer ou sélectionner un fichier
    const defaultPath = path.join(__dirname, 'Data', 'team.json');
    const result = await dialog.showSaveDialog({
      title: 'Créer ou sélectionner un fichier d\'équipe',
      defaultPath: defaultPath,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'Tous les fichiers', extensions: ['*'] }
      ],
      message: 'Pour commencer, veuillez créer un nouveau fichier d\'équipe ou sélectionner un fichier existant.'
    });
    
    if (result.canceled || !result.filePath) {
      console.log('❌ Utilisateur a annulé la création du fichier');
      return { success: false, canceled: true };
    }
    
    const filePath = result.filePath;
    
    // Si le fichier n'existe pas, créer un fichier par défaut
    if (!fsSync.existsSync(filePath)) {
      console.log('📄 Création d\'un nouveau fichier d\'équipe...');
      const defaultTeam = {
        name: 'Nouvelle Equipe',
        players: [],
        matches: [],
        progression_entries: []
      };
      
      // Créer le répertoire parent s'il n'existe pas
      const dir = path.dirname(filePath);
      if (!fsSync.existsSync(dir)) {
        fsSync.mkdirSync(dir, { recursive: true });
      }
      
      // Écrire le fichier par défaut
      fsSync.writeFileSync(filePath, JSON.stringify(defaultTeam, null, 2), { encoding: 'utf8' });
      console.log('✅ Fichier d\'équipe créé:', filePath);
    } else {
      // Vérifier que le fichier existant est valide
      console.log('📄 Fichier existant trouvé, validation...');
      try {
        let data = fsSync.readFileSync(filePath, 'utf-8');
        // Supprimer le BOM si présent
        if (data.length > 0 && data.charCodeAt(0) === 0xFEFF) {
          data = data.slice(1);
        }
        const parsed = JSON.parse(data);
        if (!parsed || typeof parsed !== 'object' || !parsed.name) {
          throw new Error('Fichier JSON invalide (pas de champ name)');
        }
        console.log('✅ Fichier d\'équipe existant validé:', filePath);
        console.log('👥 Nom de l\'équipe:', parsed.name);
      } catch (err) {
        console.error('❌ Fichier existant invalide:', err.message);
        // Créer un nouveau fichier par défaut
        const defaultTeam = {
          name: 'Nouvelle Equipe',
          players: [],
          matches: [],
          progression_entries: []
        };
        fsSync.writeFileSync(filePath, JSON.stringify(defaultTeam, null, 2), { encoding: 'utf8' });
        console.log('✅ Fichier d\'équipe recréé avec valeurs par défaut:', filePath);
      }
    }
    
    // Sauvegarder le chemin dans electron-store
    store.set('last_team_file', filePath);
    console.log('💾 Chemin du fichier sauvegardé dans electron-store:', filePath);
    
    return { success: true, filePath: filePath, isNew: true };
  } catch (error) {
    console.error('❌ Erreur lors de la vérification/création du fichier d\'équipe:', error);
    return { success: false, error: error.message };
  }
}

// Enregistrer le protocole AVANT que l'app soit prête
app.whenReady().then(async () => {
  registerCustomProtocol();
  ensureDataDirectory();
  
  // Vérifier ou créer le fichier d'équipe AVANT de créer la fenêtre
  const teamFileResult = await checkOrCreateTeamFile();
  
  if (!teamFileResult.success) {
    if (teamFileResult.canceled) {
      console.log('Application fermée par l\'utilisateur');
      app.quit();
      return;
    } else {
      console.error('Impossible de vérifier/créer le fichier d\'équipe, création de la fenêtre quand même');
    }
  }
  
  // Créer la fenêtre seulement après avoir vérifié/créé le fichier
  createWindow();
  
  // Passer le chemin du fichier au renderer une fois que la fenêtre est prête
  if (teamFileResult.success && teamFileResult.filePath && mainWindow) {
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('Fenêtre chargée, envoi du chemin du fichier d\'équipe au renderer:', teamFileResult.filePath);
      // Attendre un peu pour s'assurer que le renderer est complètement initialisé
      setTimeout(() => {
        mainWindow.webContents.send('team-file-ready', teamFileResult.filePath);
      }, 100);
    });
  } else if (!teamFileResult.success && !teamFileResult.canceled) {
    // Si le fichier n'a pas pu être créé mais que l'utilisateur n'a pas annulé, 
    // envoyer un message pour indiquer qu'il faut afficher le message "pas d'équipe"
    if (mainWindow) {
      mainWindow.webContents.once('did-finish-load', () => {
        console.log('Aucun fichier d\'équipe disponible, envoi du message au renderer');
        setTimeout(() => {
          mainWindow.webContents.send('team-file-ready', null);
        }, 100);
      });
    }
  }
  
  // Attendre que la fenêtre soit prête avant d'envoyer des messages
  if (mainWindow) {
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('Fenêtre chargée, prête pour l\'initialisation');
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handlers IPC pour l'overlay
ipcMain.handle('toggle-overlay', async () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
    return { isOpen: false };
  } else {
    createOverlayWindow();
    return { isOpen: true };
  }
});

ipcMain.handle('overlay-is-open', async () => {
  return { isOpen: overlayWindow && !overlayWindow.isDestroyed() };
});

ipcMain.handle('close-overlay', async () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
  }
  return { success: true };
});

// Obtenir les données pour l'overlay
ipcMain.handle('get-overlay-data', async () => {
  try {
    const config = loadConfigSync();
    const teamPath = config.team_file || defaultTeamPath;
    
    if (fsSync.existsSync(teamPath)) {
      let data = fsSync.readFileSync(teamPath, 'utf-8');
      // Supprimer le BOM si présent
      if (data.charCodeAt(0) === 0xFEFF) {
        data = data.slice(1);
      }
      const team = JSON.parse(data);
      return { team, success: true };
    }
    return { team: null, success: false };
  } catch (err) {
    console.error('Erreur lors de la récupération des données overlay:', err);
    return { team: null, success: false, error: err.message };
  }
});

// Écouter les actions de l'overlay
ipcMain.on('overlay-action', (event, payload) => {
  // Envoyer l'action à la fenêtre principale
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('overlay-action-received', payload);
  }
});

