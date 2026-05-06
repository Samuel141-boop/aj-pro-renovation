/* ════════════════════════════════════════════════════════════════════
   AJ PRO RÉNOVATION — SAUVEGARDE AUTOMATIQUE ONEDRIVE (Session 22 bis)
   ──────────────────────────────────────────────────────────────────
   Local d'abord (chantier_db_v2 dans localStorage), OneDrive ensuite
   en arrière-plan. L'utilisateur ne clique jamais "Sauvegarder" — la
   sauvegarde est automatique, debouncée à 2,5 secondes après la
   dernière modification.

   Architecture :
   - OAuth via MSAL.js (Microsoft Authentication Library)
   - Scope : Files.ReadWrite.AppFolder (l'app n'accède qu'à son propre
     dossier dans Apps/AJ PRO RÉNOVATION/)
   - API : Microsoft Graph (https://graph.microsoft.com/v1.0)
   - Structure OneDrive : Apps/AJ PRO RÉNOVATION/database/ + /chantiers/
   - Mapping local↔OneDrive IDs persisté dans sync-state.json
   - File d'attente FIFO + retry exponentiel
   - Indicateur d'état discret dans la topbar
   - Restauration : lit le dossier OneDrive et reconstitue tout

   API publique : window.OneDriveSync (mêmes méthodes que GDriveSync)
   ════════════════════════════════════════════════════════════════════ */
(function(){
  if(window.__AJ_ONEDRIVE_LOADED) return;
  window.__AJ_ONEDRIVE_LOADED = true;

  /* ─────────────────────────────────────────────────────────────────
     CONSTANTES & ÉTAT
     ───────────────────────────────────────────────────────────────── */
  var GRAPH_API = 'https://graph.microsoft.com/v1.0';
  var APPROOT = '/me/drive/special/approot';   /* dossier dédié à l'app, créé auto */
  var DB_FOLDER_NAME = 'database';
  var CHANTIERS_FOLDER_NAME = 'chantiers';
  /* Files.ReadWrite.AppFolder : isolation maximale, l'app ne voit que
     son dossier dans Apps/. User.Read pour avoir le profil minimum.
     offline_access pour le refresh silencieux. */
  var SCOPES = ['Files.ReadWrite.AppFolder', 'User.Read', 'offline_access'];
  var DEBOUNCE_MS = 2500;
  var RETRY_BASE_MS = 4000;
  var MAX_RETRIES = 5;
  var STATE_KEY = 'aj-onedrive-state-v1';
  var TOKEN_KEY = 'aj-onedrive-token-v1';
  var JSON_MIME = 'application/json';

  /* État interne (mêmes champs que gdrive-sync pour compatibilité UX) */
  var S = {
    clientId: null,
    msalApp: null,
    accessToken: null,
    expiresAt: 0,
    isAuthenticated: false,
    account: null,            /* l'objet Account MSAL */
    /* Mapping persisté : sert à éviter doublons + retrouver les fichiers */
    mapping: {
      database: {},           /* { 'clients.json': itemId, ... } */
      chantiers: {},          /* { clientId: { folderId, files: { ... }, subfolders: {} } } */
      medias: {}              /* { localMediaId: itemId } */
    },
    queue: [],
    isProcessing: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastSyncAt: null,
    status: 'disconnected',
    statusMessage: '',
    debounceTimer: null,
    retryTimer: null,
    /* IDs des dossiers principaux (cachés pour éviter de re-chercher à chaque fois) */
    dbFolderId: null,
    chantiersFolderId: null
  };

  /* ─────────────────────────────────────────────────────────────────
     PERSISTANCE LOCALE
     ───────────────────────────────────────────────────────────────── */
  function _saveState(){
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({
        clientId: S.clientId,
        mapping: S.mapping,
        queue: S.queue,
        lastSyncAt: S.lastSyncAt,
        dbFolderId: S.dbFolderId,
        chantiersFolderId: S.chantiersFolderId
      }));
    } catch(e){ console.warn('[OneDrive] saveState échoué', e); }
  }

  function _loadState(){
    try {
      var raw = localStorage.getItem(STATE_KEY);
      if(!raw) return;
      var s = JSON.parse(raw);
      S.clientId = s.clientId || null;
      S.mapping = s.mapping || { database: {}, chantiers: {}, medias: {} };
      S.queue = Array.isArray(s.queue) ? s.queue : [];
      S.lastSyncAt = s.lastSyncAt || null;
      S.dbFolderId = s.dbFolderId || null;
      S.chantiersFolderId = s.chantiersFolderId || null;
    } catch(e){ console.warn('[OneDrive] loadState échoué', e); }
  }

  /* ─────────────────────────────────────────────────────────────────
     INDICATEUR D'ÉTAT — badge discret dans la topbar
     ───────────────────────────────────────────────────────────────── */
  var STATUS_LABELS = {
    'disconnected': { label: 'OneDrive non connecté', icon: '○',  color: '#7a8896', bg: 'rgba(122,136,150,0.15)' },
    'connecting':   { label: 'Connexion OneDrive…',   icon: '⏳', color: '#0d4690', bg: 'rgba(13,70,144,0.15)' },
    'idle':         { label: 'Synchronisé',           icon: '✓',  color: '#1d4d33', bg: 'rgba(45,106,79,0.15)' },
    'syncing':      { label: 'Synchronisation…',      icon: '↻',  color: '#0d4690', bg: 'rgba(13,70,144,0.15)' },
    'queued':       { label: 'Sauvegarde en attente', icon: '⌛', color: '#7a5a30', bg: 'rgba(201,169,110,0.18)' },
    'offline':      { label: 'Hors ligne',            icon: '✈',  color: '#7a5a30', bg: 'rgba(201,169,110,0.18)' },
    'error':        { label: 'Erreur OneDrive',       icon: '⚠',  color: '#c62828', bg: 'rgba(198,40,40,0.10)' }
  };

  function _updateStatusBadge(){
    var el = document.getElementById('aj-onedrive-status');
    if(!el) return;
    var def = STATUS_LABELS[S.status] || STATUS_LABELS.disconnected;
    var queueInfo = S.queue.length ? ' · ' + S.queue.length + ' en attente' : '';
    el.innerHTML =
      '<span aria-hidden="true">' + def.icon + '</span>' +
      '<span style="font-size:11px;font-weight:600">' + def.label + queueInfo + '</span>';
    el.style.background = def.bg;
    el.style.color = def.color;
    el.title = (S.statusMessage || def.label) + (S.lastSyncAt ? ' · Dernière sync : ' + new Date(S.lastSyncAt).toLocaleTimeString('fr-FR') : '');
  }

  function _setStatus(status, message){
    S.status = status;
    S.statusMessage = message || '';
    _updateStatusBadge();
  }

  function _injectStatusBadge(){
    if(document.getElementById('aj-onedrive-status')) return;
    var topbar = document.querySelector('.topbar-actions');
    if(!topbar) {
      setTimeout(_injectStatusBadge, 500);
      return;
    }
    var badge = document.createElement('div');
    badge.id = 'aj-onedrive-status';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');
    badge.style.cssText =
      'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;' +
      'border-radius:99px;font-family:Inter,system-ui,sans-serif;font-size:11px;' +
      'cursor:pointer;transition:all 0.15s;margin-right:6px;';
    badge.onclick = function(){
      if(S.status === 'disconnected'){ window.OneDriveSync.connect(); }
      else if(S.status === 'error' || S.queue.length){ window.OneDriveSync.processQueue(true); }
      else if(S.isAuthenticated){
        if(typeof showToast === 'function') showToast('OneDrive connecté · ' + S.queue.length + ' en attente · Dernière sync : ' + (S.lastSyncAt ? new Date(S.lastSyncAt).toLocaleTimeString('fr-FR') : 'jamais'));
      }
    };
    topbar.insertBefore(badge, topbar.firstChild);
    _updateStatusBadge();
  }

  /* ─────────────────────────────────────────────────────────────────
     OAUTH MSAL.JS (Microsoft Authentication Library)
     ───────────────────────────────────────────────────────────────── */
  function _isMSALLoaded(){
    return !!(window.msal && window.msal.PublicClientApplication);
  }

  function _waitForMSAL(){
    return new Promise(function(resolve, reject){
      if(_isMSALLoaded()) return resolve();
      var attempts = 0;
      var iv = setInterval(function(){
        attempts++;
        if(_isMSALLoaded()){ clearInterval(iv); resolve(); }
        else if(attempts > 80){ clearInterval(iv); reject(new Error('MSAL.js non chargé après 8s — vérifie la connexion ou recharge la page')); }
      }, 100);
    });
  }

  function _initMsalApp(){
    if(!S.clientId) throw new Error('OAuth Client ID non configuré');
    if(!_isMSALLoaded()) throw new Error('MSAL.js non disponible');
    if(S.msalApp) return S.msalApp;
    var redirectUri = window.location.origin;
    S.msalApp = new msal.PublicClientApplication({
      auth: {
        clientId: S.clientId,
        /* "common" accepte comptes Microsoft personnels ET pro Entra ID */
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: redirectUri
      },
      cache: {
        cacheLocation: 'localStorage', /* pour survivre aux refresh */
        storeAuthStateInCookie: false
      }
    });
    /* Init obligatoire en MSAL v3+ pour gérer les redirects */
    if(typeof S.msalApp.initialize === 'function'){
      S.msalApp.initialize().catch(function(err){ console.warn('[OneDrive] MSAL init', err); });
    }
    return S.msalApp;
  }

  function _isTokenValid(){
    return !!S.accessToken && Date.now() < S.expiresAt;
  }

  function _getAccount(){
    if(!S.msalApp) return null;
    if(S.account) return S.account;
    var accounts = S.msalApp.getAllAccounts();
    if(accounts && accounts.length){ S.account = accounts[0]; return S.account; }
    return null;
  }

  function _refreshTokenIfNeeded(){
    return new Promise(function(resolve, reject){
      if(_isTokenValid()) return resolve(S.accessToken);
      try {
        _initMsalApp();
        var acc = _getAccount();
        if(!acc){
          return reject(new Error('Pas de compte connecté — reconnexion nécessaire'));
        }
        S.msalApp.acquireTokenSilent({
          scopes: SCOPES,
          account: acc
        }).then(function(resp){
          if(resp && resp.accessToken){
            S.accessToken = resp.accessToken;
            S.expiresAt = (resp.expiresOn ? new Date(resp.expiresOn).getTime() : Date.now() + 3600000) - 60000;
            S.isAuthenticated = true;
            try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken: S.accessToken, expiresAt: S.expiresAt })); } catch(e){}
            resolve(S.accessToken);
          } else {
            reject(new Error('Token vide'));
          }
        }).catch(function(err){
          /* InteractionRequiredAuthError → besoin de redemander à l'utilisateur */
          if(err && (err.errorCode === 'interaction_required' || err.name === 'InteractionRequiredAuthError')){
            console.info('[OneDrive] Refresh silencieux échoué, popup nécessaire');
          }
          reject(err);
        });
      } catch(e){
        reject(e);
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     APPELS REST MICROSOFT GRAPH API
     ───────────────────────────────────────────────────────────────── */
  function _apiCall(method, url, opts){
    opts = opts || {};
    var fullUrl = url.indexOf('http') === 0 ? url : (GRAPH_API + url);
    return _refreshTokenIfNeeded().then(function(token){
      var headers = Object.assign({
        'Authorization': 'Bearer ' + token
      }, opts.headers || {});
      return fetch(fullUrl, {
        method: method,
        headers: headers,
        body: opts.body || undefined
      });
    }).then(function(r){
      if(!r.ok){
        return r.text().then(function(text){
          var err = new Error('Graph API ' + r.status + ' ' + r.statusText + ' — ' + text.slice(0, 300));
          err.status = r.status;
          err.body = text;
          throw err;
        });
      }
      if(r.status === 204) return null; /* No Content */
      var ct = r.headers.get('content-type') || '';
      if(ct.indexOf('application/json') !== -1) return r.json();
      return r.text();
    });
  }

  /* Path API : OneDrive permet d'adresser un fichier par chemin
     (plus simple qu'avec Drive). Path = relatif à l'AppFolder.
     Ex: 'database/clients.json' → /me/drive/special/approot:/database/clients.json: */
  function _approotPath(relPath){
    if(!relPath) return APPROOT;
    /* Encode chaque segment du chemin (préserve les "/") */
    var encoded = relPath.split('/').map(encodeURIComponent).join('/');
    return APPROOT + ':/' + encoded + ':';
  }

  /* Crée un dossier (ou le retourne s'il existe). Anti-doublon natif :
     conflictBehavior=replace écrase, =fail erreur si existe. On utilise
     "rename" pour ne JAMAIS dupliquer mais d'abord on vérifie. */
  function _findOrCreateFolder(name, parentRelPath){
    var fullPath = parentRelPath ? (parentRelPath + '/' + name) : name;
    /* Tente de récupérer le dossier par path */
    return _apiCall('GET', _approotPath(fullPath))
      .then(function(item){
        if(item && item.folder) return item.id;
        /* Conflit : un fichier porte ce nom — exception très rare */
        return null;
      })
      .catch(function(err){
        if(err.status !== 404) throw err;
        /* 404 → créer le dossier */
        var parentEndpoint = parentRelPath
          ? _approotPath(parentRelPath) + '/children'
          : APPROOT + '/children';
        return _apiCall('POST', parentEndpoint, {
          headers: { 'Content-Type': JSON_MIME },
          body: JSON.stringify({
            name: name,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'replace'
          })
        }).then(function(item){ return item.id; });
      });
  }

  /* Upload simple PUT (max 4 Mo). Pour les fichiers > 4 Mo on fait
     une session d'upload (résumable). */
  function _uploadByPath(relPath, contentBlob, mimeType, isLargeFile){
    if(isLargeFile === undefined){
      isLargeFile = contentBlob.size > 3.9 * 1024 * 1024;
    }
    if(isLargeFile){
      return _uploadLargeFile(relPath, contentBlob, mimeType);
    }
    var endpoint = _approotPath(relPath) + '/content';
    return _apiCall('PUT', endpoint, {
      headers: { 'Content-Type': mimeType || 'application/octet-stream' },
      body: contentBlob
    }).then(function(item){
      return item;
    });
  }

  /* Upload de gros fichiers via session resumable */
  function _uploadLargeFile(relPath, blob, mimeType){
    var endpoint = _approotPath(relPath) + '/createUploadSession';
    return _apiCall('POST', endpoint, {
      headers: { 'Content-Type': JSON_MIME },
      body: JSON.stringify({
        item: { '@microsoft.graph.conflictBehavior': 'replace' }
      })
    }).then(function(session){
      var uploadUrl = session.uploadUrl;
      var size = blob.size;
      var chunkSize = 320 * 1024 * 10; /* 3,2 Mo (multiple de 320 KiB requis) */
      var p = Promise.resolve();
      for(var start = 0; start < size; start += chunkSize){
        (function(s){
          var end = Math.min(s + chunkSize, size);
          p = p.then(function(){
            return fetch(uploadUrl, {
              method: 'PUT',
              headers: {
                'Content-Length': String(end - s),
                'Content-Range': 'bytes ' + s + '-' + (end - 1) + '/' + size
              },
              body: blob.slice(s, end)
            }).then(function(r){
              if(!r.ok && r.status !== 202){
                throw new Error('Upload chunk failed ' + r.status);
              }
              if(r.status === 200 || r.status === 201) return r.json();
              return null;
            });
          });
        })(start);
      }
      return p;
    });
  }

  function _uploadJSON(relPath, jsonData){
    var blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: JSON_MIME });
    return _uploadByPath(relPath, blob, JSON_MIME, false);
  }

  function _downloadJSON(relPath){
    return _apiCall('GET', _approotPath(relPath) + '/content');
  }

  function _findItemByPath(relPath){
    return _apiCall('GET', _approotPath(relPath))
      .catch(function(err){
        if(err.status === 404) return null;
        throw err;
      });
  }

  /* ─────────────────────────────────────────────────────────────────
     STRUCTURE DE DOSSIERS (création paresseuse, anti-doublon)
     ───────────────────────────────────────────────────────────────── */
  function _ensureRootStructure(){
    /* Le AppFolder lui-même est créé automatiquement par Microsoft Graph
       à la première écriture. On crée juste les sous-dossiers. */
    return Promise.all([
      _findOrCreateFolder(DB_FOLDER_NAME, null),
      _findOrCreateFolder(CHANTIERS_FOLDER_NAME, null)
    ]).then(function(ids){
      S.dbFolderId = ids[0];
      S.chantiersFolderId = ids[1];
      _saveState();
      return S;
    });
  }

  function _ensureChantierFolder(client){
    var folderName = _slugifyChantierName(client);
    var key = client.id;
    if(S.mapping.chantiers[key] && S.mapping.chantiers[key].folderName === folderName){
      return Promise.resolve(S.mapping.chantiers[key]);
    }
    var basePath = CHANTIERS_FOLDER_NAME + '/' + folderName;
    return _findOrCreateFolder(folderName, CHANTIERS_FOLDER_NAME).then(function(folderId){
      return Promise.all([
        _findOrCreateFolder('photos-originales', basePath),
        _findOrCreateFolder('photos-annotees', basePath),
        _findOrCreateFolder('croquis', basePath),
        _findOrCreateFolder('documents', basePath)
      ]).then(function(){
        var entry = {
          folderId: folderId,
          folderName: folderName,
          basePath: basePath,
          files: (S.mapping.chantiers[key] && S.mapping.chantiers[key].files) || {}
        };
        S.mapping.chantiers[key] = entry;
        _saveState();
        return entry;
      });
    });
  }

  function _slugifyChantierName(client){
    var date = (client.date || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
    var nom = ((client.prenom||'') + ' ' + (client.nom||'')).trim() || 'Sans nom';
    var ville = '';
    var match = (client.adresse||'').match(/\b(\d{4,5})\s+([A-Za-zÀ-ÿ\-\s]+)$/);
    if(match) ville = match[2].trim();
    /* OneDrive : caractères interdits dans noms : \ / : * ? " < > | # % */
    var safe = function(s){ return String(s).replace(/[\\\/:*?"<>|#%]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80); };
    return safe(date + ' - ' + nom + (ville ? ' - ' + ville : ''));
  }

  /* ─────────────────────────────────────────────────────────────────
     CONSTRUCTION DU PAYLOAD DEPUIS LA BASE LOCALE (identique gdrive)
     ───────────────────────────────────────────────────────────────── */
  function _buildDatabasePayload(){
    var db = (typeof dbLoad === 'function') ? dbLoad() : { clients:{}, pieces:{} };
    return {
      'clients.json':    { clients: db.clients || {} },
      'pieces.json':     { pieces:  db.pieces  || {} },
      'chantiers.json':  { chantiers: db.clients || {} },
      'mesures.json':    _extractFromPieces(db.pieces, 'mesures'),
      'travaux.json':    _extractFromPieces(db.pieces, 'travaux'),
      'notes.json':      _extractNotesAndCroquisRefs(db.pieces),
      'medias.json':     _extractMediasIndex(db.pieces),
      'index.json':      {
        nbClients: Object.keys(db.clients||{}).length,
        nbPieces:  Object.keys(db.pieces||{}).length,
        lastBuiltAt: Date.now(),
        appVersion: 'aj-pro-v31',
        formatVersion: 1
      },
      'sync-state.json': {
        mapping: S.mapping,
        lastSyncAt: S.lastSyncAt,
        version: 1
      }
    };
  }

  function _extractFromPieces(pieces, key){
    var out = {};
    Object.keys(pieces||{}).forEach(function(pid){
      var p = pieces[pid];
      if(p && p[key] !== undefined) out[pid] = p[key];
    });
    return { byPiece: out, version: 1 };
  }

  function _extractNotesAndCroquisRefs(pieces){
    var out = {};
    Object.keys(pieces||{}).forEach(function(pid){
      var p = pieces[pid];
      if(!p) return;
      out[pid] = {
        notes: p.notes || '',
        msNotes: (p.msNotes||[]).map(function(n){ return { id: n.id, text: n.text || n.ocrText || '' }; }),
        croquisMeta: p.croquisMeta || null,
        hasCroquis: !!(p.croquis || (p.croquisStrokes && p.croquisStrokes.length))
      };
    });
    return { byPiece: out, version: 1 };
  }

  function _extractMediasIndex(pieces){
    var index = [];
    Object.keys(pieces||{}).forEach(function(pid){
      var p = pieces[pid]; if(!p) return;
      (p.photos||[]).forEach(function(ph){
        var localId = ph.id || ('ph_' + pid + '_' + index.length);
        index.push({
          localId: localId,
          pieceId: pid,
          clientId: p.clientId,
          type: 'photo',
          oneDriveItemId: S.mapping.medias[localId] || null,
          comment: ph.comment || '',
          informationSource: ph.informationSource || 'photo',
          certaintyLevel: ph.certaintyLevel || null,
          quoteStatus: ph.quoteStatus || null
        });
      });
      if(p.croquis || (p.croquisStrokes && p.croquisStrokes.length)){
        var croquisId = 'croq_' + pid;
        index.push({
          localId: croquisId,
          pieceId: pid,
          clientId: p.clientId,
          type: 'croquis',
          oneDriveItemId: S.mapping.medias[croquisId] || null
        });
      }
    });
    return { items: index, version: 1 };
  }

  function _buildChantierFullPayload(client, db){
    var pieces = Object.values(db.pieces||{}).filter(function(p){ return p.clientId === client.id; });
    return {
      formatVersion: 1,
      exportedAt: Date.now(),
      client: client,
      pieces: pieces,
      summary: {
        nbPieces: pieces.length,
        statut: client.statut,
        priorite: client.priorite,
        dateCreation: client.createdAt,
        dateModification: Date.now()
      }
    };
  }

  /* ─────────────────────────────────────────────────────────────────
     SYNC PRINCIPAL
     ───────────────────────────────────────────────────────────────── */
  function _syncDatabase(){
    return _ensureRootStructure().then(function(){
      var payload = _buildDatabasePayload();
      var fileNames = Object.keys(payload);
      var p = Promise.resolve();
      fileNames.forEach(function(name){
        p = p.then(function(){
          return _uploadJSON(DB_FOLDER_NAME + '/' + name, payload[name]).then(function(item){
            if(item && item.id) S.mapping.database[name] = item.id;
          });
        });
      });
      return p;
    }).then(function(){
      S.lastSyncAt = Date.now();
      _saveState();
    });
  }

  function _syncChantier(clientId){
    var db = (typeof dbLoad === 'function') ? dbLoad() : { clients:{}, pieces:{} };
    var client = (db.clients||{})[clientId];
    if(!client) return Promise.resolve();
    return _ensureChantierFolder(client).then(function(entry){
      var fullPayload = _buildChantierFullPayload(client, db);
      var path = entry.basePath + '/sauvegarde-chantier.json';
      return _uploadJSON(path, fullPayload).then(function(item){
        if(item && item.id){
          entry.files = entry.files || {};
          entry.files['sauvegarde-chantier.json'] = item.id;
          S.mapping.chantiers[client.id] = entry;
          _saveState();
        }
      });
    });
  }

  function _syncMedia(op){
    var db = (typeof dbLoad === 'function') ? dbLoad() : { clients:{}, pieces:{} };
    var client = (db.clients||{})[op.clientId];
    if(!client) return Promise.resolve();
    return _ensureChantierFolder(client).then(function(entry){
      var subfolderName = op.mediaType === 'croquis' ? 'croquis'
        : op.mediaType === 'photo-annotee' ? 'photos-annotees'
        : 'photos-originales';
      var blob = _dataURLtoBlob(op.dataUrl);
      if(!blob) throw new Error('dataUrl invalide pour ' + op.mediaId);
      var mime = blob.type || 'image/jpeg';
      var ext = mime.indexOf('png') !== -1 ? 'png' : 'jpg';
      var name = (op.mediaId || ('media_' + Date.now())) + '.' + ext;
      var fullPath = entry.basePath + '/' + subfolderName + '/' + name;
      return _uploadByPath(fullPath, blob, mime).then(function(item){
        if(item && item.id){
          S.mapping.medias[op.mediaId] = item.id;
          _saveState();
        }
      });
    });
  }

  function _dataURLtoBlob(dataUrl){
    if(!dataUrl || typeof dataUrl !== 'string') return null;
    var parts = dataUrl.split(',');
    if(parts.length !== 2) return null;
    var meta = parts[0].match(/data:(.*?);base64/);
    if(!meta) return null;
    try {
      var bin = atob(parts[1]);
      var arr = new Uint8Array(bin.length);
      for(var i=0; i<bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: meta[1] });
    } catch(e){ return null; }
  }

  /* ─────────────────────────────────────────────────────────────────
     QUEUE & DEBOUNCE (identique gdrive)
     ───────────────────────────────────────────────────────────────── */
  function _enqueue(op){
    var dedupKey = op.type + ':' + (op.id || '');
    var existingIdx = S.queue.findIndex(function(o){ return (o.type + ':' + (o.id || '')) === dedupKey; });
    op.attempts = 0;
    op.addedAt = Date.now();
    if(existingIdx >= 0) S.queue[existingIdx] = op;
    else S.queue.push(op);
    _saveState();
    _updateStatusBadge();
  }

  function processQueue(immediate){
    if(S.isProcessing) return Promise.resolve();
    if(!S.isOnline){ _setStatus('offline'); return Promise.resolve(); }
    if(!S.isAuthenticated){ return Promise.resolve(); }
    if(S.debounceTimer){ clearTimeout(S.debounceTimer); S.debounceTimer = null; }
    if(!immediate){
      S.debounceTimer = setTimeout(function(){ S.debounceTimer = null; processQueue(true); }, DEBOUNCE_MS);
      _setStatus('queued');
      return Promise.resolve();
    }
    if(!S.queue.length){ _setStatus('idle'); return Promise.resolve(); }

    S.isProcessing = true;
    _setStatus('syncing');

    return _refreshTokenIfNeeded()
      .then(_ensureRootStructure)
      .then(function(){ return _processNext(); })
      .then(function(){
        S.isProcessing = false;
        S.lastSyncAt = Date.now();
        _saveState();
        if(S.queue.length){
          _setStatus('queued', S.queue.length + ' opération(s) en attente');
          setTimeout(function(){ processQueue(true); }, 1000);
        } else {
          _setStatus('idle');
        }
      })
      .catch(function(err){
        S.isProcessing = false;
        console.error('[OneDrive] Sync error', err);
        _setStatus('error', err.message);
        if(S.retryTimer) clearTimeout(S.retryTimer);
        var attempts = S.queue[0] ? S.queue[0].attempts || 0 : 0;
        if(attempts < MAX_RETRIES){
          var delay = RETRY_BASE_MS * Math.pow(2, attempts);
          S.retryTimer = setTimeout(function(){ processQueue(true); }, delay);
        }
      });
  }

  function _processNext(){
    if(!S.queue.length) return Promise.resolve();
    var op = S.queue[0];
    op.attempts = (op.attempts || 0) + 1;
    var task;
    switch(op.type){
      case 'database': task = _syncDatabase(); break;
      case 'chantier': task = _syncChantier(op.id); break;
      case 'media':    task = _syncMedia(op.payload); break;
      default:         task = Promise.resolve();
    }
    return task.then(function(){
      S.queue.shift();
      _saveState();
      _updateStatusBadge();
      return _processNext();
    }).catch(function(err){
      if(op.attempts >= MAX_RETRIES){
        console.error('[OneDrive] Operation abandonnée après ' + MAX_RETRIES + ' essais', op, err);
        S.queue.shift();
        _saveState();
      }
      throw err;
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     API PUBLIQUE
     ───────────────────────────────────────────────────────────────── */
  function markDirty(scope, id){
    _enqueue({ type: 'database' });
    if(scope === 'chantier' && id){
      _enqueue({ type: 'chantier', id: id });
    } else if(scope === 'all'){
      var db = (typeof dbLoad === 'function') ? dbLoad() : { clients:{} };
      Object.keys(db.clients||{}).forEach(function(cid){
        _enqueue({ type: 'chantier', id: cid });
      });
    }
    if(S.isAuthenticated && S.isOnline) processQueue(false);
  }

  function markMediaDirty(mediaId, pieceId, clientId, dataUrl, mediaType){
    _enqueue({
      type: 'media',
      id: mediaId,
      payload: { mediaId: mediaId, pieceId: pieceId, clientId: clientId, dataUrl: dataUrl, mediaType: mediaType || 'photo' }
    });
    if(S.isAuthenticated && S.isOnline) processQueue(false);
  }

  function connect(){
    if(!S.clientId){
      var prompt1 = window.prompt(
        'Pour activer la sauvegarde automatique sur OneDrive :\n\n' +
        '1. Crée une app dans Microsoft Entra ID (Azure Portal, gratuit)\n' +
        '2. Type : Single-page application (SPA)\n' +
        '3. Redirect URI : ' + window.location.origin + '\n' +
        '4. Permissions : Files.ReadWrite.AppFolder + User.Read\n' +
        '5. Colle ici l\'Application (client) ID\n\n' +
        '(Voir ONEDRIVE_AUTO_SYNC_SETUP.md pour le détail)\n\nClient ID :'
      );
      if(!prompt1 || !prompt1.trim()){ return; }
      S.clientId = prompt1.trim();
      _saveState();
    }
    _setStatus('connecting');
    _waitForMSAL()
      .then(function(){
        _initMsalApp();
        return S.msalApp.loginPopup({
          scopes: SCOPES,
          prompt: 'select_account'
        });
      })
      .then(function(resp){
        if(resp && resp.account){
          S.account = resp.account;
          S.accessToken = resp.accessToken;
          S.expiresAt = (resp.expiresOn ? new Date(resp.expiresOn).getTime() : Date.now() + 3600000) - 60000;
          S.isAuthenticated = true;
          try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken: S.accessToken, expiresAt: S.expiresAt })); } catch(e){}
          _setStatus('syncing', 'Authentification réussie');
          return _ensureRootStructure();
        }
      })
      .then(function(){
        _setStatus('idle');
        processQueue(true);
      })
      .catch(function(err){
        console.error('[OneDrive] connect error', err);
        var msg = err.errorCode || err.message || 'Authentification refusée';
        _setStatus('error', msg);
        if(typeof showToast === 'function') showToast('⚠ ' + msg);
      });
  }

  function disconnect(){
    var acc = _getAccount();
    if(S.msalApp && acc){
      try {
        S.msalApp.logoutPopup({ account: acc, mainWindowRedirectUri: window.location.origin });
      } catch(e){}
    }
    S.accessToken = null;
    S.expiresAt = 0;
    S.isAuthenticated = false;
    S.account = null;
    try { sessionStorage.removeItem(TOKEN_KEY); } catch(e){}
    _setStatus('disconnected');
    if(typeof showToast === 'function') showToast('OneDrive déconnecté · Sauvegarde locale active');
  }

  function changeClientId(){
    var newId = window.prompt('Nouveau Client ID OAuth OneDrive (Microsoft Entra ID) :', S.clientId || '');
    if(newId && newId.trim()){
      S.clientId = newId.trim();
      S.msalApp = null;
      _saveState();
      if(typeof showToast === 'function') showToast('Client ID mis à jour. Cliquez sur le badge pour vous reconnecter.');
    }
  }

  function getStatus(){
    return {
      status: S.status,
      message: S.statusMessage,
      isAuthenticated: S.isAuthenticated,
      isOnline: S.isOnline,
      queueSize: S.queue.length,
      lastSyncAt: S.lastSyncAt,
      clientIdConfigured: !!S.clientId,
      account: S.account ? S.account.username : null
    };
  }

  /* ─────────────────────────────────────────────────────────────────
     RESTAURATION DEPUIS ONEDRIVE
     ───────────────────────────────────────────────────────────────── */
  function restoreFromDrive(){
    if(!S.isAuthenticated){
      if(typeof showToast === 'function') showToast('Connecte d\'abord OneDrive');
      else alert('Connecte d\'abord OneDrive');
      return Promise.reject(new Error('Not authenticated'));
    }
    var doRestore = function(){
      _setStatus('syncing', 'Restauration en cours…');
      return _ensureRootStructure().then(function(){
        return Promise.all([
          _downloadJSON(DB_FOLDER_NAME + '/clients.json'),
          _downloadJSON(DB_FOLDER_NAME + '/pieces.json')
        ]);
      }).then(function(blobs){
        var clientsBlob = typeof blobs[0] === 'string' ? JSON.parse(blobs[0]) : blobs[0];
        var piecesBlob = typeof blobs[1] === 'string' ? JSON.parse(blobs[1]) : blobs[1];
        if(!clientsBlob || !piecesBlob) throw new Error('Fichiers OneDrive introuvables — OneDrive vide ?');
        if(typeof dbLoad !== 'function' || typeof dbSave !== 'function') throw new Error('App API indisponible');
        var newDb = {
          clients: clientsBlob.clients || {},
          pieces: piecesBlob.pieces || {}
        };
        var currentDb = dbLoad();
        if(currentDb.ajQuoteCounter)    newDb.ajQuoteCounter    = currentDb.ajQuoteCounter;
        if(currentDb.ajEmissionCounter) newDb.ajEmissionCounter = currentDb.ajEmissionCounter;
        if(currentDb.ajQuotes)          newDb.ajQuotes          = currentDb.ajQuotes;
        dbSave(newDb);
        _setStatus('idle');
        if(typeof showToast === 'function') showToast('✓ Restauration OneDrive réussie · ' + Object.keys(newDb.clients).length + ' clients');
        if(typeof renderHome === 'function') renderHome();
        if(typeof renderClientsList === 'function') renderClientsList();
      }).catch(function(err){
        console.error('[OneDrive] Restore error', err);
        _setStatus('error', err.message);
        if(typeof showToast === 'function') showToast('⚠ Restauration échouée : ' + err.message);
      });
    };
    if(typeof customConfirm === 'function'){
      customConfirm(
        'Cette action remplacera tes clients et pièces locaux par ceux stockés sur OneDrive. Les devis et l\'IA restent inchangés. Continuer ?',
        doRestore,
        { title: 'Restaurer depuis OneDrive ?', okLabel: 'Restaurer' }
      );
    } else if(window.confirm('Remplacer la base locale par celle de OneDrive ?')) {
      doRestore();
    }
  }

  /* ─────────────────────────────────────────────────────────────────
     HOOKS dbSave + dbSaveClient + dbSavePiece
     ───────────────────────────────────────────────────────────────── */
  function _installDbHooks(){
    if(typeof window.dbSave === 'function' && !window.dbSave.__ajOneDriveWrapped){
      var origSave = window.dbSave;
      window.dbSave = function(db){
        var r = origSave.apply(this, arguments);
        if(r !== false){ markDirty('database'); }
        return r;
      };
      /* On marque mais on ne casse pas un marqueur précédent (gdrive-sync) */
      window.dbSave.__ajOneDriveWrapped = true;
    }
    if(typeof window.dbSaveClient === 'function' && !window.dbSaveClient.__ajOneDriveWrapped){
      var origSaveClient = window.dbSaveClient;
      window.dbSaveClient = function(c){
        var r = origSaveClient.apply(this, arguments);
        if(r !== false && c && c.id) markDirty('chantier', c.id);
        return r;
      };
      window.dbSaveClient.__ajOneDriveWrapped = true;
    }
    if(typeof window.dbSavePiece === 'function' && !window.dbSavePiece.__ajOneDriveWrapped){
      var origSavePiece = window.dbSavePiece;
      window.dbSavePiece = function(p){
        var r = origSavePiece.apply(this, arguments);
        if(r !== false && p && p.clientId) markDirty('chantier', p.clientId);
        return r;
      };
      window.dbSavePiece.__ajOneDriveWrapped = true;
    }
  }

  /* ─────────────────────────────────────────────────────────────────
     ONLINE/OFFLINE LISTENERS
     ───────────────────────────────────────────────────────────────── */
  function _installNetworkListeners(){
    window.addEventListener('online', function(){
      S.isOnline = true;
      if(S.isAuthenticated){ _setStatus('idle'); processQueue(true); }
      else { _setStatus('disconnected'); }
    });
    window.addEventListener('offline', function(){
      S.isOnline = false;
      _setStatus('offline');
    });
    window.addEventListener('focus', function(){
      if(S.isAuthenticated && S.queue.length) processQueue(false);
    });
    window.addEventListener('beforeunload', function(){
      if(S.queue.length && S.isAuthenticated && S.isOnline){
        _saveState();
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     EXPOSE API (mêmes signatures que GDriveSync)
     ───────────────────────────────────────────────────────────────── */
  window.OneDriveSync = {
    connect: connect,
    disconnect: disconnect,
    changeClientId: changeClientId,
    markDirty: markDirty,
    markMediaDirty: markMediaDirty,
    processQueue: processQueue,
    restoreFromDrive: restoreFromDrive,
    getStatus: getStatus,
    _state: S,
    _ensureRootStructure: _ensureRootStructure,
    VERSION: '1.0.0'
  };

  /* Alias pour compat avec les boutons HTML qui appellent GDriveSync.* */
  if(!window.GDriveSync){ window.GDriveSync = window.OneDriveSync; }

  /* ─────────────────────────────────────────────────────────────────
     BOOT
     ───────────────────────────────────────────────────────────────── */
  function boot(){
    _loadState();
    try {
      var raw = sessionStorage.getItem(TOKEN_KEY);
      if(raw){
        var t = JSON.parse(raw);
        if(t && t.accessToken && Date.now() < (t.expiresAt || 0)){
          S.accessToken = t.accessToken;
          S.expiresAt = t.expiresAt;
          S.isAuthenticated = true;
        }
      }
    } catch(e){}

    _injectStatusBadge();
    _installDbHooks();
    _installNetworkListeners();

    if(S.clientId){
      /* Tente le silent sign-in si MSAL a déjà un compte en cache */
      _waitForMSAL().then(function(){
        try {
          _initMsalApp();
          var acc = _getAccount();
          if(acc){
            return S.msalApp.acquireTokenSilent({ scopes: SCOPES, account: acc })
              .then(function(resp){
                if(resp && resp.accessToken){
                  S.accessToken = resp.accessToken;
                  S.expiresAt = (resp.expiresOn ? new Date(resp.expiresOn).getTime() : Date.now() + 3600000) - 60000;
                  S.isAuthenticated = true;
                  _setStatus('idle', 'Reconnexion silencieuse OK');
                  if(S.queue.length) processQueue(true);
                }
              })
              .catch(function(){
                _setStatus('disconnected', 'Reconnexion nécessaire');
              });
          }
        } catch(e){}
      }).catch(function(){
        /* MSAL pas chargé — on reste en disconnected, l'utilisateur cliquera */
      });
    }

    if(S.isAuthenticated){
      _setStatus('idle');
      if(S.queue.length) setTimeout(function(){ processQueue(true); }, 1500);
    } else {
      _setStatus('disconnected');
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 600); });
  } else {
    setTimeout(boot, 600);
  }
})();
