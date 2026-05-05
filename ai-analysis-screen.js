/* ════════════════════════════════════════════════════════════════════
   AJ PRO RÉNOVATION — ÉCRAN ANALYSE IA (Session 18)
   ──────────────────────────────────────────────────────────────────
   Interface utilisateur de l'analyse IA :
   - Bouton "🤖 Analyser avec l'IA" injecté dans la sidebar
   - Écran avec 3 onglets : Récap IA / Points à vérifier / Devis brouillon
   - Bouton "Créer le devis brouillon dans le module Devis"

   Dépend de :
   - window.AIAnalysis (ai-analysis-service.js)
   - window.AJQuotes  (quote-aj-pro.js)
   - dbLoad / showScreen / currentClientId (index.html)
   ════════════════════════════════════════════════════════════════════ */
(function(){
  if(window.__AJ_AI_SCREEN_LOADED) return;
  window.__AJ_AI_SCREEN_LOADED = true;

  /* ─────────────────────────────────────────────────────────────────
     ÉTAT TRANSIENT
     ───────────────────────────────────────────────────────────────── */
  var _state = {
    activeTab: 'recap',  // 'recap' | 'check' | 'draft'
    lastResult: null,
    isRunning: false,
    resolvedPoints: {}   // { idx: true } — points à vérifier marqués comme résolus
  };

  /* ─────────────────────────────────────────────────────────────────
     ESCAPE HTML
     ───────────────────────────────────────────────────────────────── */
  function esc(s){
    if(s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ─────────────────────────────────────────────────────────────────
     NAV-ITEM SIDEBAR
     ───────────────────────────────────────────────────────────────── */
  function injectNav(){
    var FF = window.FEATURES_ENABLED || {};
    if(FF.aiAnalysis === false) return;
    var nav = document.querySelector('.sidebar-nav');
    if(!nav || document.getElementById('aj-nav-ai')) return;

    var item = document.createElement('div');
    item.className = 'nav-item';
    item.id = 'aj-nav-ai';
    item.setAttribute('data-screen', 'screen-ai-analysis');
    item.innerHTML =
      '<span class="nav-item-icon">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="12" cy="12" r="9"/>' +
          '<circle cx="9" cy="10" r="1.2" fill="currentColor"/>' +
          '<circle cx="15" cy="10" r="1.2" fill="currentColor"/>' +
          '<path d="M9 15c1 1 2 1.5 3 1.5s2-.5 3-1.5"/>' +
        '</svg>' +
      '</span>' +
      '<span>Analyse IA</span>';

    item.onclick = function(){
      if(typeof closeSidebar === 'function' && window.innerWidth <= 980) closeSidebar();
      ensureScreen();
      if(typeof showScreen === 'function') showScreen('screen-ai-analysis');
      render();
    };

    /* Insère après "Devis" si présent, sinon en fin */
    var devisNav = document.getElementById('aj-nav-quotes');
    if(devisNav && devisNav.parentNode === nav){
      nav.insertBefore(item, devisNav.nextSibling);
    } else {
      nav.appendChild(item);
    }
  }

  /* ─────────────────────────────────────────────────────────────────
     ÉCRAN — création paresseuse
     ───────────────────────────────────────────────────────────────── */
  function ensureScreen(){
    if(document.getElementById('screen-ai-analysis')) return;
    var mc = document.querySelector('.main-content');
    if(!mc) return;
    var s = document.createElement('div');
    s.className = 'screen';
    s.id = 'screen-ai-analysis';
    s.innerHTML = '<div id="aj-ai-body" style="padding:0 0 80px;font-family:Inter,system-ui,sans-serif;"></div>';
    mc.appendChild(s);
  }

  /* ─────────────────────────────────────────────────────────────────
     RENDU PRINCIPAL
     ───────────────────────────────────────────────────────────────── */
  function render(){
    ensureScreen();
    var body = document.getElementById('aj-ai-body');
    if(!body) return;
    var clientId = window.currentClientId || null;

    /* Header */
    var clientName = '';
    if(clientId && typeof dbLoad === 'function'){
      var c = dbLoad().clients[clientId];
      if(c) clientName = ((c.civilite ? c.civilite + ' ' : '') + (c.prenom || '') + ' ' + (c.nom || '')).trim();
    }

    var html =
      '<div style="margin-bottom:18px;">' +
        '<div style="font-family:\'Cormorant Garamond\',Georgia,serif;font-size:30px;font-weight:600;color:#0f2030;">🤖 Analyse IA du chantier</div>' +
        '<div style="font-size:13px;color:#3a4a5c;margin-top:4px;">' +
          (clientName
            ? 'Chantier : <strong>' + esc(clientName) + '</strong>'
            : '<span style="color:#c62828;">Aucun chantier sélectionné. </span>' +
              '<button onclick="navTo(\'screen-clients\',null)" style="background:transparent;border:none;color:#c9a96e;cursor:pointer;font-weight:600;font-size:13px;text-decoration:underline;">Choisir un client</button>') +
        '</div>' +
      '</div>';

    if(!clientId){
      body.innerHTML = html;
      return;
    }

    /* CTA Lancer l'analyse */
    if(!_state.lastResult){
      html +=
        '<div style="background:linear-gradient(135deg,#0f2030,#1a3349);color:#fff;border-radius:14px;padding:28px 24px;margin-bottom:20px;text-align:center;">' +
          '<div style="font-size:48px;margin-bottom:14px;">🤖</div>' +
          '<div style="font-family:\'Cormorant Garamond\',Georgia,serif;font-size:24px;font-weight:600;margin-bottom:6px;">Analyser le chantier avec l\'IA</div>' +
          '<div style="font-size:13px;color:rgba(255,255,255,0.75);margin-bottom:22px;line-height:1.55;max-width:560px;margin-left:auto;margin-right:auto;">' +
            'L\'IA va lire toutes les informations prises sur place (photos, croquis, notes manuscrites, mesures, travaux cochés, méta-données) et produire un récapitulatif structuré + un devis brouillon AJ Pro modifiable.' +
          '</div>' +
          '<button onclick="AIAnalysisScreen.run()" ' +
            (_state.isRunning ? 'disabled ' : '') +
            'style="padding:14px 32px;background:#c9a96e;color:#0f2030;border:none;border-radius:10px;font-weight:700;font-size:15px;cursor:' + (_state.isRunning ? 'wait' : 'pointer') + ';font-family:Inter,sans-serif;box-shadow:0 4px 12px rgba(201,169,110,0.30);">' +
            (_state.isRunning ? '⏳ Analyse en cours…' : '🤖 Lancer l\'analyse IA') +
          '</button>' +
          '<div style="font-size:11.5px;color:rgba(255,255,255,0.55);margin-top:14px;">' +
            'L\'analyse reste un brouillon — vous validez tout avant émission. Aucune donnée n\'est partagée si l\'IA cloud n\'est pas configurée (mode local automatique).' +
          '</div>' +
        '</div>';
      body.innerHTML = html;
      return;
    }

    /* Résultat dispo : mode + tabs */
    var r = _state.lastResult;
    var modeLabel, modeColor, modeNote;
    if(r.mode === 'claude'){
      modeLabel = '🟢 IA Claude';
      modeColor = '#1d4d33';
      modeNote = r.usage ? (r.usage.input_tokens + ' tokens entrée, ' + r.usage.output_tokens + ' sortie') : '';
    } else if(r.mode === 'local'){
      modeLabel = '🔵 Analyse locale';
      modeColor = '#0d4690';
      modeNote = 'IA Claude non configurée — voir api/claude.js pour activer.';
    } else if(r.mode === 'local-fallback-error' || r.mode === 'local-fallback-parse'){
      modeLabel = '🟠 Fallback local';
      modeColor = '#9a4514';
      modeNote = 'IA cloud appelée mais a échoué : ' + (r.fallbackReason || r.parseError || 'inconnu');
    } else if(r.mode === 'error'){
      modeLabel = '🔴 Erreur';
      modeColor = '#c62828';
      modeNote = r.error || 'Erreur inconnue';
    } else {
      modeLabel = r.mode;
      modeColor = '#7a8896';
      modeNote = '';
    }

    var nbRooms = (r.rooms || []).length;
    var nbCheck = (r.missingInformation || []).length;
    var nbCheckResolved = Object.keys(_state.resolvedPoints).length;
    var draftSecCount = (r.quoteDraft && r.quoteDraft.sections && r.quoteDraft.sections.length) || 0;

    html +=
      /* Bandeau résultat */
      '<div style="background:#fff;border:1px solid #e3dccc;border-radius:14px;padding:14px 18px;margin-bottom:16px;display:flex;flex-wrap:wrap;align-items:center;gap:12px;justify-content:space-between;">' +
        '<div style="flex:1;min-width:220px;">' +
          '<div style="font-weight:700;color:#0f2030;font-size:14px;">' +
            '<span style="background:' + modeColor + ';color:#fff;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:0.4px;margin-right:8px;">' + esc(modeLabel) + '</span>' +
            esc(r.summary || 'Analyse terminée') +
          '</div>' +
          (modeNote ? '<div style="font-size:11.5px;color:#7a8896;margin-top:4px;">' + esc(modeNote) + (r.durationMs ? ' · ' + r.durationMs + 'ms' : '') + '</div>' : '') +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button onclick="AIAnalysisScreen.run(true)" style="padding:8px 14px;background:#fff;border:1px solid #e3dccc;color:#3a4a5c;border-radius:7px;cursor:pointer;font-family:Inter,sans-serif;font-size:12.5px;font-weight:600;">↻ Relancer l\'analyse</button>' +
          '<button onclick="AIAnalysisScreen.reset()" style="padding:8px 14px;background:#fff;border:1px solid #e3dccc;color:#7a8896;border-radius:7px;cursor:pointer;font-family:Inter,sans-serif;font-size:12.5px;font-weight:600;">Effacer</button>' +
        '</div>' +
      '</div>' +

      /* Tabs */
      '<div style="display:flex;gap:2px;margin-bottom:16px;border-bottom:1px solid #e3dccc;flex-wrap:wrap;">' +
        _tab('recap', '📋 Récapitulatif IA', nbRooms) +
        _tab('check', '⚠ Points à vérifier', nbCheck - nbCheckResolved) +
        _tab('draft', '📄 Devis brouillon', draftSecCount) +
      '</div>' +

      '<div id="aj-ai-tab-body"></div>';

    body.innerHTML = html;
    renderActiveTab();
  }

  function _tab(id, label, badge){
    var active = _state.activeTab === id;
    var badgeHtml = (badge != null && badge > 0)
      ? ' <span style="background:' + (active ? '#c9a96e' : 'rgba(122,136,150,0.2)') + ';color:' + (active ? '#0f2030' : '#3a4a5c') + ';padding:1px 7px;border-radius:99px;font-size:10.5px;font-weight:700;margin-left:4px;">' + badge + '</span>'
      : '';
    return '<button onclick="AIAnalysisScreen.setTab(\'' + id + '\')" style="' +
      'padding:10px 18px;background:transparent;border:none;border-bottom:2px solid ' + (active ? '#c9a96e' : 'transparent') + ';' +
      'cursor:pointer;font-family:inherit;font-size:14px;font-weight:600;color:' + (active ? '#0f2030' : '#7a8896') + ';' +
      'transition:all 0.12s;">' + label + badgeHtml + '</button>';
  }

  /* ─────────────────────────────────────────────────────────────────
     RENDU DES ONGLETS
     ───────────────────────────────────────────────────────────────── */
  function renderActiveTab(){
    var body = document.getElementById('aj-ai-tab-body');
    if(!body || !_state.lastResult) return;
    if(_state.activeTab === 'recap')      body.innerHTML = renderTabRecap();
    else if(_state.activeTab === 'check') body.innerHTML = renderTabCheck();
    else if(_state.activeTab === 'draft') body.innerHTML = renderTabDraft();
  }

  function renderTabRecap(){
    var r = _state.lastResult;
    var rooms = r.rooms || [];

    var globalHtml = '';
    if(r.globalFindings && r.globalFindings.length){
      globalHtml =
        '<div style="background:#fff;border:1px solid #e3dccc;border-radius:12px;padding:14px 18px;margin-bottom:14px;">' +
          '<div style="font-weight:700;color:#0f2030;font-size:14px;margin-bottom:8px;">🌐 Constats généraux</div>' +
          '<ul style="margin:0;padding-left:20px;font-size:13px;color:#3a4a5c;line-height:1.6;">' +
            r.globalFindings.map(function(f){ return '<li>' + esc(f) + '</li>'; }).join('') +
          '</ul>' +
        '</div>';
    }

    if(!rooms.length){
      return globalHtml +
        '<div style="background:#fff;border:1px dashed #e3dccc;border-radius:12px;padding:30px;text-align:center;color:#7a8896;font-size:13px;">' +
        'Aucune pièce analysée. Ajoutez des pièces au chantier puis relancez l\'analyse.</div>';
    }

    return globalHtml + rooms.map(function(room){
      var srcs = room.sourcesUsed || {};
      var srcHtml = '';
      if(srcs.photos)        srcHtml += '<span style="margin-right:10px;">📸 ' + srcs.photos + '</span>';
      if(srcs.msNotes)       srcHtml += '<span style="margin-right:10px;">📝 ' + srcs.msNotes + '</span>';
      if(srcs.croquis)       srcHtml += '<span style="margin-right:10px;">✏️ ' + srcs.croquis + '</span>';
      if(srcs.travauxCoches) srcHtml += '<span style="margin-right:10px;">✓ ' + srcs.travauxCoches + ' travaux</span>';

      function _bullets(arr, fallback){
        if(!arr || !arr.length) return '<div style="color:#7a8896;font-size:12px;font-style:italic;">' + fallback + '</div>';
        return '<ul style="margin:0;padding-left:18px;font-size:12.5px;color:#3a4a5c;line-height:1.55;">' +
          arr.map(function(t){ return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
      }

      return '<details open style="background:#fff;border:1px solid #e3dccc;border-radius:12px;margin-bottom:12px;overflow:hidden;">' +
        '<summary style="padding:12px 16px;cursor:pointer;font-weight:700;color:#0f2030;font-size:14.5px;background:linear-gradient(180deg,#fafaf6,#f6f4ec);border-bottom:1px solid #e8e4d6;list-style:none;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
          '<span style="flex:1;">' + esc(room.roomName || 'Pièce') + '</span>' +
          (srcHtml ? '<span style="font-size:11px;color:#7a8896;font-weight:500;">' + srcHtml + '</span>' : '') +
        '</summary>' +
        '<div style="padding:14px 18px;display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:14px;">' +
          '<div>' +
            '<div style="font-weight:600;color:#0f2030;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">État existant</div>' +
            '<div style="font-size:12.5px;color:#3a4a5c;line-height:1.55;white-space:pre-line;">' + esc(room.existingState || '— non décrit') + '</div>' +
          '</div>' +
          '<div>' +
            '<div style="font-weight:600;color:#0f2030;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Travaux prévus</div>' +
            '<div style="font-size:12.5px;color:#3a4a5c;line-height:1.55;white-space:pre-line;">' + esc(room.plannedWorks || '— aucun') + '</div>' +
          '</div>' +
          '<div>' +
            '<div style="font-weight:600;color:#0f2030;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Mesures utiles</div>' +
            '<div style="font-size:12.5px;color:#3a4a5c;line-height:1.55;">' + esc(room.measurements || '— aucune') + '</div>' +
          '</div>' +
          '<div>' +
            '<div style="font-weight:600;color:#0f2030;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Fournitures</div>' +
            _bullets(room.supplies, 'Aucune') +
          '</div>' +
          '<div>' +
            '<div style="font-weight:600;color:#9a4514;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Options possibles</div>' +
            _bullets(room.options, 'Aucune') +
          '</div>' +
          '<div>' +
            '<div style="font-weight:600;color:#c62828;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Risques / sensibles</div>' +
            _bullets(room.risks, 'Aucun') +
          '</div>' +
          (room.pointsToCheck && room.pointsToCheck.length
            ? '<div style="grid-column:1/-1;background:rgba(232,98,26,0.06);border:1px solid rgba(232,98,26,0.25);border-radius:8px;padding:10px 12px;">' +
                '<div style="font-weight:600;color:#9a4514;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">⚠ À vérifier dans cette pièce</div>' +
                _bullets(room.pointsToCheck, '') +
              '</div>'
            : '') +
        '</div>' +
      '</details>';
    }).join('');
  }

  function renderTabCheck(){
    var r = _state.lastResult;
    var items = r.missingInformation || [];
    if(!items.length){
      return '<div style="background:#fff;border:1px dashed #e3dccc;border-radius:12px;padding:30px;text-align:center;color:#7a8896;font-size:13px;">' +
        '✓ Aucun point particulier à vérifier d\'après l\'analyse.</div>';
    }

    /* Groupement par catégorie */
    var byCat = {};
    items.forEach(function(it, i){ (byCat[it.category || 'Autre'] = byCat[it.category || 'Autre'] || []).push({ it: it, idx: i }); });

    var html = '<div style="font-size:12.5px;color:#3a4a5c;margin-bottom:14px;line-height:1.5;">' +
      '<strong>' + items.length + ' point' + (items.length > 1 ? 's' : '') + ' à vérifier</strong> avant validation du devis. ' +
      'Cliquez sur ✓ pour marquer un point comme résolu (purement local — n\'affecte pas l\'analyse).' +
      '</div>';

    Object.keys(byCat).forEach(function(cat){
      html += '<div style="background:#fff;border:1px solid #e3dccc;border-radius:12px;padding:14px 16px;margin-bottom:12px;">' +
        '<div style="font-weight:700;color:#0f2030;font-size:13px;margin-bottom:10px;">' + esc(cat) + '</div>';
      byCat[cat].forEach(function(entry){
        var it = entry.it;
        var resolved = !!_state.resolvedPoints[entry.idx];
        var sevColor = it.severity === 'high' ? '#c62828' : (it.severity === 'low' ? '#7a8896' : '#9a4514');
        html += '<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-top:1px solid #f1eee2;' + (resolved ? 'opacity:0.5;text-decoration:line-through;' : '') + '">' +
          '<button onclick="AIAnalysisScreen.toggleResolved(' + entry.idx + ')" ' +
            'style="flex-shrink:0;background:' + (resolved ? '#1d4d33' : '#fff') + ';border:1.5px solid ' + (resolved ? '#1d4d33' : '#c9a96e') + ';color:' + (resolved ? '#fff' : '#c9a96e') + ';border-radius:50%;width:24px;height:24px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">' +
            (resolved ? '✓' : '○') +
          '</button>' +
          '<div style="flex:1;font-size:13px;color:#0f2030;line-height:1.5;">' + esc(it.text) + '</div>' +
          '<span style="background:' + sevColor + ';color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;flex-shrink:0;">' + esc(it.severity || 'medium').toUpperCase() + '</span>' +
        '</div>';
      });
      html += '</div>';
    });

    return html;
  }

  function renderTabDraft(){
    var r = _state.lastResult;
    var qd = r.quoteDraft || {};
    var sections = qd.sections || [];

    var headerHtml =
      '<div style="background:#fff;border:1px solid #e3dccc;border-radius:12px;padding:16px 18px;margin-bottom:14px;">' +
        '<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;">' +
          '<div style="flex:1;min-width:200px;">' +
            '<div style="font-size:11px;color:#7a8896;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Type de document</div>' +
            '<div style="font-weight:700;color:#0f2030;font-size:15px;margin-top:2px;">' +
              ({ quote:'Devis', amendment:'Avenant', revision:'Révision' })[qd.documentType] || 'Devis' +
            '</div>' +
            '<div style="font-size:13px;color:#3a4a5c;margin-top:4px;">' + esc(qd.title || 'Travaux dans un logement') + '</div>' +
          '</div>' +
          '<div>' +
            '<button onclick="AIAnalysisScreen.createQuoteDraft()" style="padding:13px 22px;background:#c9a96e;color:#0f2030;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;font-family:Inter,sans-serif;box-shadow:0 4px 12px rgba(201,169,110,0.30);">' +
              '📋 Créer le devis brouillon dans le module Devis →' +
            '</button>' +
          '</div>' +
        '</div>' +
        (qd.suggestedTemplateId
          ? '<div style="font-size:11.5px;color:#7a8896;margin-top:8px;">Template suggéré : <code style="background:#f6f4ec;padding:1px 6px;border-radius:3px;font-family:monospace;">' + esc(qd.suggestedTemplateId) + '</code> (sera créé puis enrichi des sections IA si fournies)</div>'
          : '') +
      '</div>';

    /* Hypothèses + warnings IA */
    var assumptionsHtml = '';
    if(qd.assumptions && qd.assumptions.length){
      assumptionsHtml +=
        '<div style="background:rgba(13,70,144,0.06);border:1px solid rgba(13,70,144,0.20);border-radius:10px;padding:12px 14px;margin-bottom:12px;font-size:12.5px;color:#0d4690;line-height:1.55;">' +
          '<div style="font-weight:700;margin-bottom:6px;">💡 Hypothèses faites par l\'IA</div>' +
          '<ul style="margin:0;padding-left:18px;">' + qd.assumptions.map(function(a){ return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' +
        '</div>';
    }
    if(qd.warnings && qd.warnings.length){
      assumptionsHtml +=
        '<div style="background:rgba(232,98,26,0.06);border:1px solid rgba(232,98,26,0.30);border-radius:10px;padding:12px 14px;margin-bottom:12px;font-size:12.5px;color:#9a4514;line-height:1.55;">' +
          '<div style="font-weight:700;margin-bottom:6px;">⚠ Avertissements</div>' +
          '<ul style="margin:0;padding-left:18px;">' + qd.warnings.map(function(w){ return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' +
        '</div>';
    }

    if(!sections.length){
      return headerHtml + assumptionsHtml +
        '<div style="background:#fff;border:1px dashed #e3dccc;border-radius:12px;padding:24px;text-align:center;color:#7a8896;font-size:13px;line-height:1.6;">' +
          (r.mode === 'local'
            ? '<strong>Mode local</strong> — l\'IA Claude n\'a pas été appelée, donc pas de sections custom générées.<br>' +
              'En cliquant sur le bouton « Créer le devis brouillon » ci-dessus, on créera un devis depuis le template suggéré <code>' + esc(qd.suggestedTemplateId || 'tpl_aj_vide') + '</code> que vous pourrez ensuite enrichir manuellement (incluant la bibliothèque de 153 lignes).'
            : 'L\'IA a estimé que le template suggéré suffisait — pas de section personnalisée à ajouter au-delà du squelette AJ Pro standard.') +
        '</div>';
    }

    /* Sections proposées */
    var sectionsHtml = sections.map(function(sec){
      var lines = (sec.lines || []).map(function(ln){
        var statusColor = ({
          included:'#1d4d33', option:'#9a4514', to_confirm:'#7a5a30', excluded:'#7a8896'
        })[ln.status] || '#3a4a5c';
        var statusLabel = ({
          included:'Inclus', option:'Option', to_confirm:'À confirmer', excluded:'Non inclus'
        })[ln.status] || ln.status;
        var supplyBadge = ln.suppliedBy
          ? '<span style="background:rgba(13,70,144,0.12);color:#0d4690;font-size:10px;font-weight:600;padding:1px 6px;border-radius:99px;margin-left:6px;">' +
            ({aj_pro:'AJ Pro', client:'Client', to_confirm:'?'})[ln.suppliedBy] + '</span>'
          : '';
        var confidenceBar = ln.confidence != null
          ? '<div style="display:inline-flex;align-items:center;gap:4px;margin-left:8px;font-size:10px;color:#7a8896;">' +
            '<span style="width:30px;height:4px;background:rgba(122,136,150,0.2);border-radius:2px;display:inline-block;position:relative;overflow:hidden;">' +
              '<span style="position:absolute;left:0;top:0;height:100%;width:' + Math.round(ln.confidence * 100) + '%;background:' + (ln.confidence > 0.7 ? '#1d4d33' : ln.confidence > 0.4 ? '#9a4514' : '#c62828') + ';"></span>' +
            '</span>' + Math.round(ln.confidence * 100) + '%' +
          '</div>'
          : '';
        var totalDisplay = ln.unitPriceHT ? (ln.quantity || 1) * ln.unitPriceHT : 0;
        return '<div style="display:flex;align-items:flex-start;gap:10px;padding:9px 12px;border-top:1px solid #f1eee2;">' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-weight:600;color:#0f2030;font-size:13px;line-height:1.4;">' + esc(ln.designation) + supplyBadge + confidenceBar + '</div>' +
            (ln.description ? '<div style="font-size:11.5px;color:#3a4a5c;margin-top:3px;white-space:pre-line;">' + esc(ln.description) + '</div>' : '') +
            (ln.reason ? '<div style="font-size:11px;color:#7a8896;margin-top:3px;font-style:italic;">↪ ' + esc(ln.reason) + '</div>' : '') +
          '</div>' +
          '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0;font-size:11.5px;">' +
            '<div style="color:#0f2030;font-weight:700;">' + (totalDisplay ? totalDisplay.toLocaleString('fr-FR') + ' €' : '<span style="color:#7a8896;">—</span>') + '</div>' +
            '<div style="color:#7a8896;">' + (ln.quantity || 1) + ' ' + esc(ln.unit || 'U') + '</div>' +
            '<span style="background:' + statusColor + ';color:#fff;font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:99px;letter-spacing:0.4px;text-transform:uppercase;">' + esc(statusLabel) + '</span>' +
          '</div>' +
        '</div>';
      }).join('');

      var optBadge = sec.isOption ? '<span style="background:rgba(232,98,26,0.15);color:#9a4514;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;margin-left:8px;letter-spacing:0.4px;text-transform:uppercase;">Option</span>' : '';
      return '<details open style="background:#fff;border:1px solid #e3dccc;border-radius:12px;margin-bottom:10px;overflow:hidden;">' +
        '<summary style="padding:12px 14px;cursor:pointer;font-weight:700;color:#0f2030;font-size:14px;background:linear-gradient(180deg,#fafaf6,#f6f4ec);border-bottom:1px solid #e8e4d6;list-style:none;">' +
          esc(sec.title || 'Section') + optBadge +
          '<span style="font-size:11px;color:#7a8896;font-weight:500;margin-left:8px;">(' + (sec.lines || []).length + ' ligne' + ((sec.lines||[]).length > 1 ? 's' : '') + ')</span>' +
        '</summary>' +
        lines +
      '</details>';
    }).join('');

    return headerHtml + assumptionsHtml + sectionsHtml;
  }

  /* ─────────────────────────────────────────────────────────────────
     ACTIONS
     ───────────────────────────────────────────────────────────────── */
  function run(force){
    var clientId = window.currentClientId || null;
    if(!clientId){ alert('Sélectionnez un chantier d\'abord'); return; }
    if(_state.isRunning && !force) return;
    if(!window.AIAnalysis){
      alert('Service AIAnalysis non chargé');
      return;
    }
    _state.isRunning = true;
    render(); /* affiche le spinner sur le bouton */

    window.AIAnalysis.runAnalysis(clientId)
      .then(function(result){
        _state.isRunning = false;
        _state.lastResult = result;
        _state.activeTab = 'recap';
        _state.resolvedPoints = {};
        render();
      })
      .catch(function(err){
        _state.isRunning = false;
        alert('Erreur analyse : ' + (err.message || String(err)));
        render();
      });
  }

  function setTab(tabId){
    _state.activeTab = tabId;
    /* Re-render tabs (active state) + body */
    render();
  }

  function toggleResolved(idx){
    if(_state.resolvedPoints[idx]) delete _state.resolvedPoints[idx];
    else _state.resolvedPoints[idx] = true;
    render();
  }

  function reset(){
    if(_state.lastResult && !confirm('Effacer le résultat actuel ?')) return;
    _state.lastResult = null;
    _state.resolvedPoints = {};
    render();
  }

  function createQuoteDraft(){
    if(!_state.lastResult){ alert('Aucune analyse disponible'); return; }
    if(!window.AIAnalysis || !window.AIAnalysis.createQuoteDraftFromAnalysis){
      alert('Module création devis indisponible');
      return;
    }
    var clientId = window.currentClientId;
    var quote = window.AIAnalysis.createQuoteDraftFromAnalysis(_state.lastResult, { clientId: clientId });
    if(quote){
      /* L'éditeur Devis s'ouvre automatiquement via createFromTemplate → openEditor */
      console.log('[AI] Devis brouillon créé:', quote.id);
    }
  }

  /* ─────────────────────────────────────────────────────────────────
     PATCHES SHOWSCREEN/UPDATENAV
     ───────────────────────────────────────────────────────────────── */
  function patchShowScreen(){
    if(!window.showScreen) return;
    var orig = window.showScreen;
    window.showScreen = function(id){
      var r = orig.apply(this, arguments);
      if(id === 'screen-ai-analysis') setTimeout(render, 30);
      return r;
    };
  }

  function patchUpdateNav(){
    if(!window.updateNav) return;
    var orig = window.updateNav;
    window.updateNav = function(){
      var r = orig.apply(this, arguments);
      var item = document.getElementById('aj-nav-ai');
      if(item){
        item.classList.toggle('active', window.currentScreen === 'screen-ai-analysis');
      }
      return r;
    };
  }

  /* ─────────────────────────────────────────────────────────────────
     EXPOSE
     ───────────────────────────────────────────────────────────────── */
  window.AIAnalysisScreen = {
    run: run,
    setTab: setTab,
    toggleResolved: toggleResolved,
    reset: reset,
    createQuoteDraft: createQuoteDraft,
    render: render,
    VERSION: '1.0.0'
  };

  /* ─────────────────────────────────────────────────────────────────
     BOOT
     ───────────────────────────────────────────────────────────────── */
  function boot(){
    injectNav();
    patchShowScreen();
    patchUpdateNav();
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 200); });
  } else {
    setTimeout(boot, 200);
  }
})();
