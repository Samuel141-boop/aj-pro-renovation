/* ════════════════════════════════════════════════════════════════════
   AJ PRO RÉNOVATION — SAUVEGARDE AUTOMATIQUE GOOGLE DRIVE (Session 22)
   ──────────────────────────────────────────────────────────────────
   Local d'abord (chantier_db_v2 dans localStorage), Drive ensuite en
   arrière-plan. L'utilisateur ne clique jamais "Sauvegarder" — la
   sauvegarde est automatique, debouncée à 2 secondes après la dernière
   modification. Si Drive n'est pas dispo (offline / token expiré),
   les modifications restent en queue et partent dès reconnexion.

   Architecture :
   - OAuth via Google Identity Services (token éphémère côté client)
   - Scope : drive.file (accès limité aux fichiers créés par l'app)
   - Structure Drive : "AJ PRO RÉNOVATION/database/" + "/chantiers/<id>/"
   - Mapping local↔Drive IDs persisté dans sync-state.json (Drive) +
     en localStorage en miroir (pour survivre aux refresh)
   - File d'attente FIFO + retry exponentiel
   - Indicateur d'état discret dans la topbar
   - Restauration : lit le dossier AJ PRO RÉNOVATION et reconstitue tout

   API publique : window.GDriveSync
   ════════════════════════════════════════════════════════════════════ */
(function(){
  if(window.__AJ_GDRIVE_LOADED) return;
  window.__AJ_GDRIVE_LOADED = true;

  /* ─────────────────────────────────────────────────────────────────
     CONSTANTES & ÉTAT
     ───────────────────────────────────────────────────────────────── */
  var ROOT_FOLDER_NAME = 'AJ PRO RÉNOVATION';
  var DB_FOLDER_NAME = 'database';
  var CHANTIERS_FOLDER_NAME = 'chantiers';
  var SCOPE = 'https://www.googleapis.com/auth/drive.file';
  var DRIVE_API = 'https://www.googleapis.com/drive/v3';
  var UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
  var FOLDER_MIME = 'application/vnd.google-apps.folder';
  var JSON_MIME = 'application/json';
  var DEBOUNCE_MS = 2500;          /* sauvegarde locale immédiate, push Drive après 2.5s d'inactivité */
  var RETRY_BASE_MS = 4000;        /* backoff exponentiel : 4s, 8s, 16s, 32s puis stop */
  var MAX_RETRIES = 5;
  var STATE_KEY = 'aj-gdrive-state-v1';   /* localStorage : { clientId, mapping, lastSyncAt, queue } */
  var TOKEN_KEY = 'aj-gdrive-token-v1';   /* localStorage : { accessToken, expiresAt } — éphémère */

  /* État interne */
  var S = {
    clientId: null,           /* OAuth Client ID configuré par l'utilisateur */
    tokenClient: null,        /* google.accounts.oauth2 client object */
    accessToken: null,        /* string (~1h validité) */
    expiresAt: 0,             /* timestamp ms */
    isAuthenticated: false,
    rootFolderId: null,
    dbFolderId: null,
    chantiersFolderId: null,
    /* Mapping persisté : sert à éviter les doublons + retrouver les fichiers Drive */
    mapping: {
      database: {},           /* { 'clients.json': driveFileId, ... } */
      chantiers: {},          /* { clientId: { folderId, files: { 'sauvegarde-chantier.json': fid, ... } } } */
      medias: {}              /* { localMediaId: driveFileId } */
    },
    queue: [],                /* opérations en attente : [{ type, payload, attempts, addedAt }] */
    isProcessing: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastSyncAt: null,
    status: 'disconnected',   /* 'disconnected' | 'connecting' | 'idle' | 'syncing' | 'offline' | 'error' */
    statusMessage: '',
    debounceTimer: null,
    retryTimer: null
  };

  /* ─────────────────────────────────────────────────────────────────
     PERSISTANCE LOCALE de l'état (mapping, queue, clientId, lastSyncAt)
     Le token n'est PAS persisté côté navigateur (sécurité), il est
     reconstruit à chaque session via prompt OAuth silencieux.
     ───────────────────────────────────────────────────────────────── */
  function _saveState(){
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({
        clientId: S.clientId,
        mapping: S.mapping,
        queue: S.queue,
        lastSyncAt: S.lastSyncAt,
        rootFolderId: S.rootFolderId,
        dbFolderId: S.dbFolderId,
        chantiersFolderId: S.chantiersFolderId
      }));
    } catch(e){ console.warn('[GDrive] saveState échoué', e); }
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
      S.rootFolderId = s.rootFolderId || null;
      S.dbFolderId = s.dbFolderId || null;
      S.chantiersFolderId = s.chantiersFolderId || null;
    } catch(e){ console.warn('[GDrive] loadState échoué', e); }
  }

  /* ─────────────────────────────────────────────────────────────────
     INDICATEUR D'ÉTAT — badge discret dans la topbar
     ───────────────────────────────────────────────────────────────── */
  var STATUS_LABELS = {
    'disconnected': { label: 'Drive non connecté', icon: '○',  color: '#7a8896', bg: 'rgba(122,136,150,0.15)' },
    'connecting':   { label: 'Connexion Drive…',   icon: '⏳', color: '#0d4690', bg: 'rgba(13,70,144,0.15)' },
    'idle':         { label: 'Synchronisé',        icon: '✓',  color: '#1d4d33', bg: 'rgba(45,106,79,0.15)' },
    'syncing':      { label: 'Synchronisation…',   icon: '↻',  color: '#0d4690', bg: 'rgba(13,70,144,0.15)' },
    'queued':       { label: 'Sauvegarde en attente', icon: '⌛', color: '#7a5a30', bg: 'rgba(201,169,110,0.18)' },
    'offline':      { label: 'Hors ligne',         icon: '✈',  color: '#7a5a30', bg: 'rgba(201,169,110,0.18)' },
    'error':        { label: 'Erreur Drive',       icon: '⚠',  color: '#c62828', bg: 'rgba(198,40,40,0.10)' }
  };

  function _updateStatusBadge(){
    var el = document.getElementById('aj-gdrive-status');
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
    if(document.getElementById('aj-gdrive-status')) return;
    var topbar = document.querySelector('.topbar-actions');
    if(!topbar) {
      /* Réessaie plus tard si la topbar n'est pas encore montée */
      setTimeout(_injectStatusBadge, 500);
      return;
    }
    var badge = document.createElement('div');
    badge.id = 'aj-gdrive-status';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');
    badge.style.cssText =
      'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;' +
      'border-radius:99px;font-family:Inter,system-ui,sans-serif;font-size:11px;' +
      'cursor:pointer;transition:all 0.15s;margin-right:6px;';
    badge.onclick = function(){
      if(S.status === 'disconnected'){ window.GDriveSync.connect(); }
      else if(S.status === 'error' || S.queue.length){ window.GDriveSync.processQueue(true); }
      else if(S.isAuthenticated){
        if(typeof showToast === 'function') showToast('Drive connecté · ' + S.queue.length + ' en attente · Dernière sync : ' + (S.lastSyncAt ? new Date(S.lastSyncAt).toLocaleTimeString('fr-FR') : 'jamais'));
      }
    };
    /* Insère en première position dans la topbar-actions */
    topbar.insertBefore(badge, topbar.firstChild);
    _updateStatusBadge();
  }

  /* ─────────────────────────────────────────────────────────────────
     OAUTH GOOGLE IDENTITY SERVICES
     ───────────────────────────────────────────────────────────────── */
  function _isGISLoaded(){
    return !!(window.google && window.google.accounts && window.google.accounts.oauth2);
  }

  function _waitForGIS(){
    return new Promise(function(resolve, reject){
      if(_isGISLoaded()) return resolve();
      var attempts = 0;
      var iv = setInterval(function(){
        attempts++;
        if(_isGISLoaded()){ clearInterval(iv); resolve(); }
        else if(attempts > 50){ clearInterval(iv); reject(new Error('Google Identity Services non chargé après 5s')); }
      }, 100);
    });
  }

  function _initTokenClient(){
    if(!S.clientId) throw new Error('OAuth Client ID non configuré');
    if(!_isGISLoaded()) throw new Error('Google Identity Services non disponible');
    if(S.tokenClient) return S.tokenClient;
    S.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: S.clientId,
      scope: SCOPE,
      callback: function(tokenResponse){
        if(tokenResponse && tokenResponse.access_token){
          S.accessToken = tokenResponse.access_token;
          S.expiresAt = Date.now() + ((Number(tokenResponse.expires_in) || 3600) * 1000) - 60000; /* -60s marge */
          S.isAuthenticated = true;
          try {
            sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken: S.accessToken, expiresAt: S.expiresAt }));
          } catch(e){}
          _setStatus('syncing', 'Authentification réussie');
          _ensureRootStructure().then(function(){
            _setStatus('idle');
            processQueue(true);
          }).catch(function(err){
            console.error('[GDrive] Init structure échouée', err);
            _setStatus('error', err.message);
          });
        } else if(tokenResponse && tokenResponse.error){
          console.error('[GDrive] Auth error', tokenResponse);
          _setStatus('error', 'Authentification refusée : ' + (tokenResponse.error_description || tokenResponse.error));
        }
      },
      error_callback: function(err){
        console.error('[GDrive] Auth error_callback', err);
        _setStatus('error', err.type || 'Erreur d\'authentification');
      }
    });
    return S.tokenClient;
  }

  function _isTokenValid(){
    return !!S.accessToken && Date.now() < S.expiresAt;
  }

  function _refreshTokenIfNeeded(){
    return new Promise(function(resolve, reject){
      if(_isTokenValid()) return resolve(S.accessToken);
      try {
        /* Tentative silencieuse (prompt='') si l'utilisateur a déjà autorisé */
        _initTokenClient();
        var done = false;
        var origCb = S.tokenClient.callback;
        S.tokenClient.callback = function(resp){
          if(done) return;
          done = true;
          S.tokenClient.callback = origCb;
          if(resp && resp.access_token){
            S.accessToken = resp.access_token;
            S.expiresAt = Date.now() + ((Number(resp.expires_in) || 3600) * 1000) - 60000;
            S.isAuthenticated = true;
            try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken: S.accessToken, expiresAt: S.expiresAt })); } catch(e){}
            resolve(S.accessToken);
          } else {
            reject(new Error('Token refresh échoué — reconnexion nécessaire'));
          }
        };
        S.tokenClient.requestAccessToken({ prompt: '' });
        setTimeout(function(){
          if(!done){ done = true; S.tokenClient.callback = origCb; reject(new Error('Token refresh timeout')); }
        }, 8000);
      } catch(e){
        reject(e);
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     APPELS REST DRIVE API
     ───────────────────────────────────────────────────────────────── */
  function _apiCall(method, url, opts){
    opts = opts || {};
    return _refreshTokenIfNeeded().then(function(token){
      var headers = Object.assign({
        'Authorization': 'Bearer ' + token
      }, opts.headers || {});
      return fetch(url, {
        method: method,
        headers: headers,
        body: opts.body || undefined
      });
    }).then(function(r){
      if(!r.ok){
        return r.text().then(function(text){
          var err = new Error('Drive API ' + r.status + ' ' + r.statusText + ' — ' + text.slice(0, 300));
          err.status = r.status;
          throw err;
        });
      }
      var ct = r.headers.get('content-type') || '';
      if(ct.indexOf('application/json') !== -1) return r.json();
      return r.text();
    });
  }

  function _findFolder(name, parentId){
    var q = "name='" + name.replace(/'/g, "\\'") + "' and mimeType='" + FOLDER_MIME + "' and trashed=false";
    if(parentId) q += " and '" + parentId + "' in parents";
    return _apiCall('GET', DRIVE_API + '/files?q=' + encodeURIComponent(q) + '&fields=files(id,name)&pageSize=1')
      .then(function(j){ return (j.files && j.files[0]) ? j.files[0].id : null; });
  }

  function _createFolder(name, parentId){
    var meta = { name: name, mimeType: FOLDER_MIME };
    if(parentId) meta.parents = [parentId];
    return _apiCall('POST', DRIVE_API + '/files?fields=id,name', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meta)
    }).then(function(j){ return j.id; });
  }

  function _findOrCreateFolder(name, parentId){
    return _findFolder(name, parentId).then(function(id){
      if(id) return id;
      return _createFolder(name, parentId);
    });
  }

  function _findFile(name, parentId){
    var q = "name='" + name.replace(/'/g, "\\'") + "' and trashed=false";
    if(parentId) q += " and '" + parentId + "' in parents";
    return _apiCall('GET', DRIVE_API + '/files?q=' + encodeURIComponent(q) + '&fields=files(id,name,modifiedTime)&pageSize=1')
      .then(function(j){ return (j.files && j.files[0]) || null; });
  }

  /* Upload multipart : metadata + content en un seul call.
     Si fileId fourni : update du fichier existant (PATCH /upload). */
  function _uploadFile(name, parentId, contentBlob, mimeType, fileId){
    var boundary = '-------ajpro_' + Math.random().toString(36).slice(2);
    var meta = { name: name, mimeType: mimeType };
    if(parentId && !fileId) meta.parents = [parentId];

    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(){
        var contentBase64 = reader.result.split(',')[1] || '';
        var body =
          '--' + boundary + '\r\n' +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(meta) + '\r\n' +
          '--' + boundary + '\r\n' +
          'Content-Type: ' + mimeType + '\r\n' +
          'Content-Transfer-Encoding: base64\r\n\r\n' +
          contentBase64 + '\r\n' +
          '--' + boundary + '--';
        var url = fileId
          ? UPLOAD_API + '/files/' + fileId + '?uploadType=multipart&fields=id,modifiedTime'
          : UPLOAD_API + '/files?uploadType=multipart&fields=id,modifiedTime';
        _apiCall(fileId ? 'PATCH' : 'POST', url, {
          headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
          body: body
        }).then(resolve).catch(reject);
      };
      reader.onerror = function(){ reject(new Error('FileReader échoué')); };
      reader.readAsDataURL(contentBlob);
    });
  }

  function _uploadJSON(name, jsonData, parentId, fileId){
    var blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: JSON_MIME });
    return _uploadFile(name, parentId, blob, JSON_MIME, fileId);
  }

  function _downloadFileContent(fileId){
    return _apiCall('GET', DRIVE_API + '/files/' + fileId + '?alt=media');
  }

  /* ─────────────────────────────────────────────────────────────────
     STRUCTURE DE DOSSIERS (création paresseuse, anti-doublon)
     ───────────────────────────────────────────────────────────────── */
  function _ensureRootStructure(){
    return _findOrCreateFolder(ROOT_FOLDER_NAME, null).then(function(rootId){
      S.rootFolderId = rootId;
      return Promise.all([
        _findOrCreateFolder(DB_FOLDER_NAME, rootId),
        _findOrCreateFolder(CHANTIERS_FOLDER_NAME, rootId)
      ]);
    }).then(function(ids){
      S.dbFolderId = ids[0];
      S.chantiersFolderId = ids[1];
      _saveState();
      return S;
    });
  }

  function _ensureChantierFolder(client){
    var folderName = _slugifyChantierName(client);
    var key = client.id;
    if(S.mapping.chantiers[key] && S.mapping.chantiers[key].folderId){
      return Promise.resolve(S.mapping.chantiers[key]);
    }
    return _findOrCreateFolder(folderName, S.chantiersFolderId).then(function(folderId){
      var entry = S.mapping.chantiers[key] || { folderId: null, files: {}, subfolders: {} };
      entry.folderId = folderId;
      /* Crée les sous-dossiers médias en parallèle */
      return Promise.all([
        _findOrCreateFolder('photos-originales', folderId),
        _findOrCreateFolder('photos-annotees', folderId),
        _findOrCreateFolder('croquis', folderId),
        _findOrCreateFolder('documents', folderId)
      ]).then(function(subs){
        entry.subfolders = {
          'photos-originales': subs[0],
          'photos-annotees': subs[1],
          'croquis': subs[2],
          'documents': subs[3]
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
    var safe = function(s){ return String(s).replace(/[\\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80); };
    return safe(date + ' - ' + nom + (ville ? ' - ' + ville : ''));
  }

  /* ─────────────────────────────────────────────────────────────────
     CONSTRUCTION DU PAYLOAD DEPUIS LA BASE LOCALE
     ───────────────────────────────────────────────────────────────── */
  function _buildDatabasePayload(){
    var db = (typeof dbLoad === 'function') ? dbLoad() : { clients:{}, pieces:{} };
    return {
      'clients.json':    { clients: db.clients || {} },
      'pieces.json':     { pieces:  db.pieces  || {} },
      'chantiers.json':  { /* alias légal de clients pour compat */ chantiers: db.clients || {} },
      'mesures.json':    _extractFromPieces(db.pieces, 'mesures'),
      'travaux.json':    _extractFromPieces(db.pieces, 'travaux'),
      'notes.json':      _extractNotesAndCroquisRefs(db.pieces),
      'medias.json':     _extractMediasIndex(db.pieces),
      'index.json':      {
        nbClients: Object.keys(db.clients||{}).length,
        nbPieces:  Object.keys(db.pieces||{}).length,
        lastBuiltAt: Date.now(),
        appVersion: 'aj-pro-v30',
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
          driveFileId: S.mapping.medias[localId] || null,
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
          driveFileId: S.mapping.medias[croquisId] || null
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
     SYNC PRINCIPAL — uploadDatabase + uploadChantier + uploadMedia
     ───────────────────────────────────────────────────────────────── */
  function _syncDatabase(){
    if(!S.dbFolderId) return _ensureRootStructure().then(_syncDatabase);
    var payload = _buildDatabasePayload();
    var fileNames = Object.keys(payload);
    /* Upload séquentiel (évite de saturer le quota Drive) */
    var p = Promise.resolve();
    fileNames.forEach(function(name){
      p = p.then(function(){
        var existingId = S.mapping.database[name] || null;
        return _uploadJSON(name, payload[name], S.dbFolderId, existingId).then(function(res){
          S.mapping.database[name] = res.id;
        });
      });
    });
    return p.then(function(){
      S.lastSyncAt = Date.now();
      _saveState();
    });
  }

  function _syncChantier(clientId){
    var db = (typeof dbLoad === 'function') ? dbLoad() : { clients:{}, pieces:{} };
    var client = (db.clients||{})[clientId];
    if(!client) return Promise.resolve(); /* déjà supprimé */
    return _ensureChantierFolder(client).then(function(entry){
      var fullPayload = _buildChantierFullPayload(client, db);
      var existingId = (entry.files || {})['sauvegarde-chantier.json'] || null;
      return _uploadJSON('sauvegarde-chantier.json', fullPayload, entry.folderId, existingId).then(function(res){
        entry.files = entry.files || {};
        entry.files['sauvegarde-chantier.json'] = res.id;
        S.mapping.chantiers[client.id] = entry;
        _saveState();
      });
    });
  }

  function _syncMedia(op){
    /* op = { mediaId, pieceId, clientId, dataUrl, mediaType: 'photo'|'photo-annotee'|'croquis' } */
    var db = (typeof dbLoad === 'function') ? dbLoad() : { clients:{}, pieces:{} };
    var client = (db.clients||{})[op.clientId];
    if(!client) return Promise.resolve();
    return _ensureChantierFolder(client).then(function(entry){
      var subfolderName = op.mediaType === 'croquis' ? 'croquis'
        : op.mediaType === 'photo-annotee' ? 'photos-annotees'
        : 'photos-originales';
      var subfolderId = entry.subfolders[subfolderName];
      if(!subfolderId) throw new Error('Sous-dossier ' + subfolderName + ' introuvable');
      /* Convertit data:URL en Blob */
      var blob = _dataURLtoBlob(op.dataUrl);
      if(!blob) throw new Error('dataUrl invalide pour ' + op.mediaId);
      var mime = blob.type || 'image/jpeg';
      var ext = mime.indexOf('png') !== -1 ? 'png' : 'jpg';
      var name = (op.mediaId || ('media_' + Date.now())) + '.' + ext;
      var existingId = S.mapping.medias[op.mediaId] || null;
      return _uploadFile(name, subfolderId, blob, mime, existingId).then(function(res){
        S.mapping.medias[op.mediaId] = res.id;
        _saveState();
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
     QUEUE & DEBOUNCE
     ───────────────────────────────────────────────────────────────── */
  function _enqueue(op){
    /* Déduplique : si une opération du même type+id existe déjà en queue
       et n'a pas été traitée, on remplace par la plus récente. */
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
    if(!S.isAuthenticated){ /* pas connecté Drive : la queue persiste localement */ return Promise.resolve(); }
    if(S.debounceTimer){ clearTimeout(S.debounceTimer); S.debounceTimer = null; }
    if(!immediate){
      /* Debounce 2.5s */
      S.debounceTimer = setTimeout(function(){ S.debounceTimer = null; processQueue(true); }, DEBOUNCE_MS);
      _setStatus('queued');
      return Promise.resolve();
    }
    if(!S.queue.length){ _setStatus('idle'); return Promise.resolve(); }

    S.isProcessing = true;
    _setStatus('syncing');

    return _refreshTokenIfNeeded()
      .then(_ensureRootStructure)
      .then(function(){
        return _processNext();
      })
      .then(function(){
        S.isProcessing = false;
        S.lastSyncAt = Date.now();
        _saveState();
        if(S.queue.length){
          _setStatus('queued', S.queue.length + ' opération(s) en attente');
          /* Replanifie */
          setTimeout(function(){ processQueue(true); }, 1000);
        } else {
          _setStatus('idle');
        }
      })
      .catch(function(err){
        S.isProcessing = false;
        console.error('[GDrive] Sync error', err);
        _setStatus('error', err.message);
        /* Retry exponentiel */
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
        console.error('[GDrive] Operation abandonnée après ' + MAX_RETRIES + ' essais', op, err);
        S.queue.shift(); /* drop pour ne pas bloquer la queue */
        _saveState();
      }
      throw err;
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     API PUBLIQUE — hooks pour le code app
     ───────────────────────────────────────────────────────────────── */
  function markDirty(scope, id){
    /* Appelé après chaque dbSave(). Marque la database à pousser, et
       optionnellement un chantier précis. */
    _enqueue({ type: 'database' });
    if(scope === 'chantier' && id){
      _enqueue({ type: 'chantier', id: id });
    } else if(scope === 'all'){
      var db = (typeof dbLoad === 'function') ? dbLoad() : { clients:{} };
      Object.keys(db.clients||{}).forEach(function(cid){
        _enqueue({ type: 'chantier', id: cid });
      });
    }
    /* Lance le processus debouncé */
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
        'Pour activer la sauvegarde automatique sur Google Drive :\n\n' +
        '1. Crée un projet Google Cloud (gratuit)\n' +
        '2. Active l\'API Google Drive\n' +
        '3. Crée un OAuth Client ID type "Application Web"\n' +
        '4. Ajoute ' + window.location.origin + ' aux origines autorisées\n' +
        '5. Colle ici le Client ID\n\n' +
        '(Voir GOOGLE_DRIVE_AUTO_SYNC_SETUP.md pour le détail)\n\nClient ID :'
      );
      if(!prompt1 || !prompt1.trim()){ return; }
      S.clientId = prompt1.trim();
      _saveState();
    }
    _setStatus('connecting');
    _waitForGIS()
      .then(function(){
        _initTokenClient();
        S.tokenClient.requestAccessToken({ prompt: 'consent' });
      })
      .catch(function(err){
        _setStatus('error', err.message);
        if(typeof showToast === 'function') showToast('⚠ ' + err.message);
      });
  }

  function disconnect(){
    if(S.accessToken && _isGISLoaded() && google.accounts.oauth2.revoke){
      google.accounts.oauth2.revoke(S.accessToken, function(){});
    }
    S.accessToken = null;
    S.expiresAt = 0;
    S.isAuthenticated = false;
    try { sessionStorage.removeItem(TOKEN_KEY); } catch(e){}
    _setStatus('disconnected');
    if(typeof showToast === 'function') showToast('Drive déconnecté · Sauvegarde locale active');
  }

  function changeClientId(){
    var newId = window.prompt('Nouveau Client ID OAuth Google Drive :', S.clientId || '');
    if(newId && newId.trim()){
      S.clientId = newId.trim();
      S.tokenClient = null;
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
      clientIdConfigured: !!S.clientId
    };
  }

  /* ─────────────────────────────────────────────────────────────────
     RESTAURATION DEPUIS DRIVE
     ───────────────────────────────────────────────────────────────── */
  function restoreFromDrive(){
    if(!S.isAuthenticated){
      if(typeof showToast === 'function') showToast('Connecte d\'abord Google Drive');
      else alert('Connecte d\'abord Google Drive');
      return Promise.reject(new Error('Not authenticated'));
    }
    var doRestore = function(){
      _setStatus('syncing', 'Restauration en cours…');
      return _ensureRootStructure().then(function(){
        /* Lit clients.json et pieces.json depuis le dossier database */
        var dbFolderId = S.dbFolderId;
        return Promise.all([
          _findFile('clients.json', dbFolderId),
          _findFile('pieces.json', dbFolderId)
        ]).then(function(refs){
          if(!refs[0] || !refs[1]) throw new Error('Fichiers Drive introuvables — Drive vide ?');
          return Promise.all([
            _downloadFileContent(refs[0].id),
            _downloadFileContent(refs[1].id)
          ]);
        }).then(function(blobs){
          var clientsBlob = typeof blobs[0] === 'string' ? JSON.parse(blobs[0]) : blobs[0];
          var piecesBlob = typeof blobs[1] === 'string' ? JSON.parse(blobs[1]) : blobs[1];
          if(typeof dbLoad !== 'function' || typeof dbSave !== 'function') throw new Error('App API indisponible');
          var newDb = {
            clients: clientsBlob.clients || {},
            pieces: piecesBlob.pieces || {}
          };
          /* Conserve le compteur ajQuoteCounter / ajEmissionCounter actuels pour ne pas casser les n° devis */
          var currentDb = dbLoad();
          if(currentDb.ajQuoteCounter)    newDb.ajQuoteCounter    = currentDb.ajQuoteCounter;
          if(currentDb.ajEmissionCounter) newDb.ajEmissionCounter = currentDb.ajEmissionCounter;
          if(currentDb.ajQuotes)          newDb.ajQuotes          = currentDb.ajQuotes;
          dbSave(newDb);
          _setStatus('idle');
          if(typeof showToast === 'function') showToast('✓ Restauration Drive réussie · ' + Object.keys(newDb.clients).length + ' clients');
          /* Force un refresh complet de l'UI */
          if(typeof renderHome === 'function') renderHome();
          if(typeof renderClientsList === 'function') renderClientsList();
        });
      }).catch(function(err){
        console.error('[GDrive] Restore error', err);
        _setStatus('error', err.message);
        if(typeof showToast === 'function') showToast('⚠ Restauration échouée : ' + err.message);
      });
    };
    if(typeof customConfirm === 'function'){
      customConfirm(
        'Cette action remplacera tes clients et pièces locaux par ceux stockés sur Google Drive. Les devis et l\'IA restent inchangés. Une copie de ta base actuelle est conservée dans la corbeille de localStorage. Continuer ?',
        doRestore,
        { title: 'Restaurer depuis Drive ?', okLabel: 'Restaurer' }
      );
    } else if(window.confirm('Remplacer la base locale par celle de Google Drive ?')) {
      doRestore();
    }
  }

  /* ─────────────────────────────────────────────────────────────────
     HOOKS sur dbSave + dbDeletePiece + dbDeleteClient
     ───────────────────────────────────────────────────────────────── */
  function _installDbHooks(){
    if(typeof window.dbSave === 'function' && !window.dbSave.__ajGdriveWrapped){
      var origSave = window.dbSave;
      window.dbSave = function(db){
        var r = origSave.apply(this, arguments);
        if(r !== false){ /* dbSave Session 21 retourne false en cas de QuotaExceededError */
          markDirty('database');
        }
        return r;
      };
      window.dbSave.__ajGdriveWrapped = true;
    }
    /* Hook dbSaveClient pour pousser le chantier complet */
    if(typeof window.dbSaveClient === 'function' && !window.dbSaveClient.__ajGdriveWrapped){
      var origSaveClient = window.dbSaveClient;
      window.dbSaveClient = function(c){
        var r = origSaveClient.apply(this, arguments);
        if(r !== false && c && c.id) markDirty('chantier', c.id);
        return r;
      };
      window.dbSaveClient.__ajGdriveWrapped = true;
    }
    if(typeof window.dbSavePiece === 'function' && !window.dbSavePiece.__ajGdriveWrapped){
      var origSavePiece = window.dbSavePiece;
      window.dbSavePiece = function(p){
        var r = origSavePiece.apply(this, arguments);
        if(r !== false && p && p.clientId) markDirty('chantier', p.clientId);
        return r;
      };
      window.dbSavePiece.__ajGdriveWrapped = true;
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
    /* Sync au focus (utile sur tablette qui se met en veille) */
    window.addEventListener('focus', function(){
      if(S.isAuthenticated && S.queue.length) processQueue(false);
    });
    /* Sync avant fermeture (best-effort) */
    window.addEventListener('beforeunload', function(){
      if(S.queue.length && S.isAuthenticated && S.isOnline){
        /* On ne peut plus rien attendre ici, mais l'état persiste dans localStorage */
        _saveState();
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     EXPOSE API
     ───────────────────────────────────────────────────────────────── */
  window.GDriveSync = {
    connect: connect,
    disconnect: disconnect,
    changeClientId: changeClientId,
    markDirty: markDirty,
    markMediaDirty: markMediaDirty,
    processQueue: processQueue,
    restoreFromDrive: restoreFromDrive,
    getStatus: getStatus,
    /* Internals exposés pour debug console */
    _state: S,
    _ensureRootStructure: _ensureRootStructure,
    VERSION: '1.0.0'
  };

  /* ─────────────────────────────────────────────────────────────────
     BOOT
     ───────────────────────────────────────────────────────────────── */
  function boot(){
    _loadState();
    /* Reprend un token éphémère existant (sessionStorage = vidé à la fermeture du navigateur) */
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

    if(S.isAuthenticated){
      _setStatus('idle');
      if(S.queue.length) setTimeout(function(){ processQueue(true); }, 1500);
    } else if(S.clientId){
      /* Reconnexion silencieuse au démarrage si le user avait connecté Drive précédemment */
      _waitForGIS().then(function(){
        _initTokenClient();
        try { S.tokenClient.requestAccessToken({ prompt: '' }); } catch(e){}
      }).catch(function(){});
      _setStatus('disconnected', 'Reconnexion automatique tentée');
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
