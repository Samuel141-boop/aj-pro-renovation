/* ════════════════════════════════════════════════════════════════════
   AJ PRO RÉNOVATION — MODULE DEVIS AJ PRO
   ──────────────────────────────────────────────────────────────────
   Module devis manuel modifiable, fidèle à la forme des PDF AJ Pro.
   Remplace l'ancien module bathroom-quote.js (wizard 12 étapes).

   Rôle :
   1) Data layer (CRUD sur db.ajQuotes — un devis par id, lié à clientId)
   2) Sidebar nav-item « Devis »
   3) 2 écrans :
      - screen-ajquote-list : liste des devis du chantier courant + picker template
      - screen-ajquote-editor : 2 vues (Édition / Aperçu)
   4) Vue Édition  : tableau dense, édition inline, ajout/suppression/déplacement
   5) Vue Aperçu   : reproduction HTML/CSS A4 fidèle des PDF AJ Pro
   6) API window.AJQuotes pour intégrations externes (récap, etc.)

   Dépendances : quote-aj-pro-constants.js + quote-aj-pro.css
   Fonctions de l'app : dbLoad, dbSave, showScreen, navTo, currentClientId
   ════════════════════════════════════════════════════════════════════ */
(function(){
  if(window.__AJ_QUOTES_LOADED) return;
  window.__AJ_QUOTES_LOADED = true;

  if(!window.AJ_QUOTE_CONSTANTS){
    console.error('[AJ Quotes] quote-aj-pro-constants.js doit être chargé AVANT quote-aj-pro.js — module non initialisé');
    return;
  }

  var K = window.AJ_QUOTE_CONSTANTS;

  /* ─────────────────────────────────────────────────────────────────
     UTILITAIRES
     ───────────────────────────────────────────────────────────────── */
  function uid(prefix){
    return (prefix || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function esc(s){
    if(s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtMoney(n){
    if(n == null || isNaN(n)) return '';
    /* Style PDF AJ Pro : 1 234,56 (espace pour milliers, virgule décimale) */
    var sign = n < 0 ? '-' : '';
    var abs = Math.abs(n);
    var rounded = Math.round(abs * 100) / 100;
    var parts = rounded.toFixed(2).split('.');
    var int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return sign + int + ',' + parts[1];
  }

  function fmtMoneyOrEmpty(n){
    /* Pour les lignes à 0 € le PDF n'affiche pas de montant — préserve cette convention */
    if(n === 0 || n == null) return '';
    return fmtMoney(n);
  }

  function fmtQty(n){
    if(n == null || isNaN(n)) return '';
    var rounded = Math.round(n * 100) / 100;
    var s = rounded.toFixed(2);
    s = s.replace(/\.?0+$/, ''); /* "1.00" -> "1", "1.50" -> "1.5", "1.25" -> "1.25" */
    return s.replace('.', ',');
  }

  function parseNum(v){
    if(v == null || v === '') return 0;
    var s = String(v).replace(/\s+/g, '').replace(',', '.');
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  function todayISO(){
    var d = new Date();
    var pad = function(n){ return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function todayFR(){
    return isoToFR(todayISO());
  }

  function isoToFR(iso){
    if(!iso) return '';
    var p = String(iso).split('-');
    if(p.length !== 3) return iso;
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function frToISO(fr){
    if(!fr) return '';
    var p = String(fr).split('/');
    if(p.length !== 3) return fr;
    return p[2] + '-' + p[1] + '-' + p[0];
  }

  function addDaysISO(iso, days){
    var d = new Date(iso + 'T00:00:00');
    if(isNaN(d.getTime())) return iso;
    d.setDate(d.getDate() + days);
    var pad = function(n){ return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* Génère un numéro de devis style D-2026XXXX en fonction du compteur année */
  function generateQuoteNumber(){
    var db = (typeof dbLoad === 'function') ? dbLoad() : { ajQuoteCounter: null };
    var year = new Date().getFullYear();
    db.ajQuoteCounter = db.ajQuoteCounter || { year: year, counter: 0 };
    if(db.ajQuoteCounter.year !== year){
      db.ajQuoteCounter = { year: year, counter: 0 };
    }
    db.ajQuoteCounter.counter += 1;
    if(typeof dbSave === 'function') dbSave(db);
    var seq = String(db.ajQuoteCounter.counter).padStart(4, '0');
    return 'D-' + year + seq;
  }

  /* ─────────────────────────────────────────────────────────────────
     DATA LAYER — db.ajQuotes (object indexé par id)
     ───────────────────────────────────────────────────────────────── */
  function loadQuotes(){
    if(typeof dbLoad !== 'function') return {};
    var db = dbLoad();
    db.ajQuotes = db.ajQuotes || {};
    return db.ajQuotes;
  }

  function saveQuote(q){
    if(typeof dbLoad !== 'function' || typeof dbSave !== 'function') return false;
    var db = dbLoad();
    db.ajQuotes = db.ajQuotes || {};
    q.updatedAt = Date.now();
    if(!q.createdAt) q.createdAt = Date.now();
    db.ajQuotes[q.id] = q;
    dbSave(db);
    return true;
  }

  function deleteQuote(id){
    if(typeof dbLoad !== 'function' || typeof dbSave !== 'function') return false;
    var db = dbLoad();
    if(!db.ajQuotes) return false;
    delete db.ajQuotes[id];
    dbSave(db);
    return true;
  }

  function getQuote(id){
    var all = loadQuotes();
    return all[id] || null;
  }

  function getQuotesForClient(clientId){
    var all = loadQuotes();
    var out = [];
    for(var k in all){
      if(all.hasOwnProperty(k) && all[k].clientId === clientId) out.push(all[k]);
    }
    out.sort(function(a, b){ return (b.updatedAt || 0) - (a.updatedAt || 0); });
    return out;
  }

  /* Crée un nouveau devis depuis un template (clone deep), pré-rempli avec
     les infos du client courant si dispo */
  function createQuoteFromTemplate(templateId, clientId){
    var src = K.buildTemplate(templateId);
    if(!src){ console.error('[AJ Quotes] template inconnu', templateId); return null; }

    var clientInfo = { nom: '', prenom: '', attentionA: '', adresse: '', codePostal: '', ville: '', tel: '', email: '' };
    var chantierInfo = { adresse: '', codePostal: '', ville: '', etage: '', ascenseur: '', codeAccess: '', interphone: '', observations: '' };

    if(clientId && typeof dbLoad === 'function'){
      var db = dbLoad();
      var client = (db.clients || {})[clientId];
      if(client){
        clientInfo.nom = client.nom || '';
        clientInfo.prenom = client.prenom || '';
        clientInfo.attentionA = (client.civilite ? client.civilite + ' ' : '') + ((client.prenom || '') + ' ' + (client.nom || '')).trim();
        clientInfo.adresse = client.adresse || '';
        clientInfo.codePostal = client.cp || client.codePostal || '';
        clientInfo.ville = client.ville || '';
        clientInfo.tel = client.tel || client.telephone || '';
        clientInfo.email = client.email || '';
        chantierInfo.adresse = client.adresseChantier || client.adresse || '';
        chantierInfo.codePostal = client.cpChantier || client.cp || '';
        chantierInfo.ville = client.villeChantier || client.ville || '';
        chantierInfo.etage = client.etage || '';
        chantierInfo.ascenseur = client.ascenseur || '';
        chantierInfo.codeAccess = client.codeAccess || client.codePortail || '';
        chantierInfo.interphone = client.interphone || '';
        chantierInfo.observations = client.observations || '';
      }
    }

    var todayIso = todayISO();
    var validityIso = addDaysISO(todayIso, K.QUOTE_DEFAULT_SETTINGS.validityDays);

    var quote = {
      id: uid('q_'),
      clientId: clientId || null,
      typeDocument: src.typeDocument || 'quote',
      quoteNumber: generateQuoteNumber(),
      quoteDate: todayIso,
      revisionNumber: '',
      revisionDate: '',
      validityDate: validityIso,
      showDiscountColumn: K.QUOTE_DEFAULT_SETTINGS.showDiscountColumn,
      vatRate: K.QUOTE_DEFAULT_SETTINGS.vatRate,
      depositRate: K.QUOTE_DEFAULT_SETTINGS.depositRate,
      paymentMethod: K.QUOTE_DEFAULT_SETTINGS.paymentMethod,
      paymentDelay: K.QUOTE_DEFAULT_SETTINGS.paymentDelay,
      optionsIncludedInTotal: K.QUOTE_DEFAULT_SETTINGS.optionsIncludedInTotal,
      companyInfo: null, /* null = utilise AJ_PRO_COMPANY par défaut */
      clientInfo: clientInfo,
      chantierInfo: chantierInfo,
      title: src.title || '',
      sourceTemplateId: src.id,
      sourceTemplateLabel: src.label,
      sections: src.sections || [],
      termsMode: 'default',
      termsCustom: null,
      createdAt: null,
      updatedAt: null
    };

    /* Renumérotation auto initiale */
    recomputeNumbers(quote);
    saveQuote(quote);
    return quote;
  }

  /* ─────────────────────────────────────────────────────────────────
     NUMÉROTATION AUTO (2 niveaux : section.number = N, ligne = N.M)
     numberOverride sur section ou ligne prend toujours le pas
     ───────────────────────────────────────────────────────────────── */
  function recomputeNumbers(quote){
    if(!quote || !quote.sections) return;
    var sIdx = 0;
    quote.sections.forEach(function(sec){
      if(!sec.visible && sec.visible !== undefined && sec.visible === false){
        /* Une section masquée garde son numéro vide jusqu'à réactivation */
        sec.number = '';
        return;
      }
      sIdx += 1;
      sec.number = sec.numberOverride && String(sec.numberOverride).trim()
        ? String(sec.numberOverride).trim()
        : String(sIdx);
      var lineIdx = 0;
      (sec.lines || []).forEach(function(ln){
        if(ln.visible === false){
          ln.number = '';
          return;
        }
        lineIdx += 1;
        ln.number = ln.numberOverride && String(ln.numberOverride).trim()
          ? String(ln.numberOverride).trim()
          : sec.number + '.' + lineIdx;
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     CALCULS — total ligne, sous-total section, totaux globaux
     ───────────────────────────────────────────────────────────────── */
  function computeLineTotal(line){
    if(!line) return 0;
    var pu = (line.unitPriceHT != null) ? Number(line.unitPriceHT) : 0;
    /* Si remise active : PUHT = PU avant remise × (1 - remise%) */
    if(line.unitPriceBeforeDiscount != null && line.discountPercent){
      var pub = Number(line.unitPriceBeforeDiscount);
      var d = Number(line.discountPercent) / 100;
      pu = pub * (1 - d);
      line.unitPriceHT = Math.round(pu * 100) / 100;
    }
    var qty = Number(line.quantity || 0);
    var t = qty * pu;
    line.totalHT = Math.round(t * 100) / 100;
    return line.totalHT;
  }

  function computeSectionSubtotal(section, options){
    options = options || {};
    if(!section || !section.lines) return 0;
    var sum = 0;
    section.lines.forEach(function(ln){
      if(ln.visible === false) return;
      computeLineTotal(ln);
      var inc = isLineIncludedInTotals(ln, section, options);
      if(inc) sum += ln.totalHT;
    });
    return Math.round(sum * 100) / 100;
  }

  /* Une ligne est-elle comptée dans le total ?
     - section masquée → non
     - section option ET optionsIncludedInTotal=false → non
     - status='option' / 'to_confirm' / 'excluded' → non (sauf optionsIncluded)
     - sinon : oui */
  function isLineIncludedInTotals(line, section, options){
    if(!line || line.visible === false) return false;
    if(section && section.visible === false) return false;
    var statusDef = K.QUOTE_LINE_STATUSES.find(function(s){ return s.id === line.status; });
    var statusInc = statusDef ? statusDef.includedInTotal : true;
    if(!statusInc){
      if(options.optionsIncludedInTotal && line.status === 'option') return true;
      return false;
    }
    if(section && section.isOption && !options.optionsIncludedInTotal) return false;
    return true;
  }

  function computeQuoteTotals(quote){
    if(!quote || !quote.sections){
      return { totalHT: 0, vat: 0, totalTTC: 0, deposit: 0, optionsTotalHT: 0 };
    }
    var totalHT = 0;
    var optionsHT = 0;
    var opts = { optionsIncludedInTotal: !!quote.optionsIncludedInTotal };

    quote.sections.forEach(function(sec){
      if(sec.visible === false) return;
      (sec.lines || []).forEach(function(ln){
        if(ln.visible === false) return;
        computeLineTotal(ln);
        if(isLineIncludedInTotals(ln, sec, opts)){
          totalHT += ln.totalHT;
        } else {
          /* Lignes options (et to_confirm/excluded) → sont accumulées
             à part, jamais dans le HT principal sauf bascule */
          if(ln.status === 'option' || (sec.isOption)){
            optionsHT += ln.totalHT;
          }
        }
      });
    });

    totalHT = Math.round(totalHT * 100) / 100;
    var vatRate = Number(quote.vatRate != null ? quote.vatRate : K.QUOTE_DEFAULT_SETTINGS.vatRate);
    var vat = Math.round(totalHT * vatRate) / 100;
    var totalTTC = Math.round((totalHT + vat) * 100) / 100;
    var depositRate = Number(quote.depositRate != null ? quote.depositRate : K.QUOTE_DEFAULT_SETTINGS.depositRate);
    var deposit = Math.round(totalTTC * depositRate) / 100;
    return {
      totalHT: totalHT,
      vat: vat,
      totalTTC: totalTTC,
      deposit: deposit,
      optionsTotalHT: Math.round(optionsHT * 100) / 100,
      vatRate: vatRate,
      depositRate: depositRate
    };
  }

  /* ─────────────────────────────────────────────────────────────────
     CSS LOADER (charge quote-aj-pro.css depuis racine)
     ───────────────────────────────────────────────────────────────── */
  function ensureCSSLoaded(){
    if(document.getElementById('aj-quotes-css')) return;
    var link = document.createElement('link');
    link.id = 'aj-quotes-css';
    link.rel = 'stylesheet';
    link.href = '/quote-aj-pro.css';
    document.head.appendChild(link);
  }

  /* ─────────────────────────────────────────────────────────────────
     NAV-ITEM SIDEBAR
     ───────────────────────────────────────────────────────────────── */
  function injectNav(){
    /* Le flag quotesNav remplace l'ancien bathroomNav */
    var FF = window.FEATURES_ENABLED || {};
    if(FF.quotesNav === false) return; /* opt-out explicite */
    var nav = document.querySelector('.sidebar-nav');
    if(!nav || document.getElementById('aj-nav-quotes')) return;

    /* Retire l'ancien nav-item (au cas où l'ancien module bathroom reste chargé) */
    var oldNav = document.getElementById('aj-nav-bathroom');
    if(oldNav && oldNav.parentNode) oldNav.parentNode.removeChild(oldNav);

    var item = document.createElement('div');
    item.className = 'nav-item';
    item.id = 'aj-nav-quotes';
    item.setAttribute('data-screen', 'screen-ajquote-list');
    item.innerHTML =
      '<span class="nav-item-icon">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
          '<polyline points="14 2 14 8 20 8"/>' +
          '<line x1="9" y1="13" x2="15" y2="13"/>' +
          '<line x1="9" y1="17" x2="15" y2="17"/>' +
          '<line x1="9" y1="9" x2="11" y2="9"/>' +
        '</svg>' +
      '</span>' +
      '<span>Devis</span>';

    item.onclick = function(){
      if(typeof closeSidebar === 'function' && window.innerWidth <= 980) closeSidebar();
      ensureListScreen();
      if(typeof showScreen === 'function') showScreen('screen-ajquote-list');
      renderListScreen();
    };

    /* Insère après le nav-item Récap si présent */
    var recapNav = nav.querySelector('[data-section="recap"]');
    if(recapNav && recapNav.parentNode === nav){
      nav.insertBefore(item, recapNav.nextSibling);
    } else {
      nav.appendChild(item);
    }
  }

  /* ─────────────────────────────────────────────────────────────────
     ÉCRANS — création paresseuse
     ───────────────────────────────────────────────────────────────── */
  function ensureListScreen(){
    if(document.getElementById('screen-ajquote-list')) return;
    var mc = document.querySelector('.main-content');
    if(!mc) return;
    var s = document.createElement('div');
    s.className = 'screen';
    s.id = 'screen-ajquote-list';
    s.innerHTML = '<div class="ajqe-shell" id="ajq-list-body"></div>';
    mc.appendChild(s);
  }

  function ensureEditorScreen(){
    if(document.getElementById('screen-ajquote-editor')) return;
    var mc = document.querySelector('.main-content');
    if(!mc) return;
    var s = document.createElement('div');
    s.className = 'screen';
    s.id = 'screen-ajquote-editor';
    s.innerHTML = '<div id="ajq-editor-body"></div>';
    mc.appendChild(s);
  }

  /* ─────────────────────────────────────────────────────────────────
     STATE TRANSIENT (édition courante, vue active)
     ───────────────────────────────────────────────────────────────── */
  var _state = {
    currentQuoteId: null,
    activeView: 'edit' /* 'edit' | 'preview' */
  };

  function getCurrentQuote(){
    if(!_state.currentQuoteId) return null;
    return getQuote(_state.currentQuoteId);
  }

  function persistCurrent(quote){
    if(!quote) return;
    recomputeNumbers(quote);
    computeQuoteTotals(quote);
    saveQuote(quote);
  }

  /* ─────────────────────────────────────────────────────────────────
     VUE LISTE — picker template + liste devis du chantier courant
     ───────────────────────────────────────────────────────────────── */
  function renderListScreen(){
    ensureListScreen();
    var body = document.getElementById('ajq-list-body');
    if(!body) return;

    var clientId = window.currentClientId || null;
    var clientName = '';
    if(clientId && typeof dbLoad === 'function'){
      var c = dbLoad().clients[clientId];
      if(c) clientName = ((c.civilite ? c.civilite + ' ' : '') + (c.prenom || '') + ' ' + (c.nom || '')).trim();
    }

    var allQuotes = clientId ? getQuotesForClient(clientId) : [];

    /* Header */
    var html =
      '<div style="margin-bottom:18px;">' +
        '<div style="font-family:\'Cormorant Garamond\', Georgia, serif;font-size:30px;font-weight:600;color:#0f2030;">Devis AJ Pro</div>' +
        '<div style="font-size:13px;color:#3a4a5c;margin-top:4px;">' +
          (clientName
            ? 'Chantier : <strong>' + esc(clientName) + '</strong> · ' + allQuotes.length + ' devis'
            : '<span style="color:#c62828;">Aucun chantier sélectionné. </span>' +
              '<button onclick="navTo(\'screen-clients\',null)" style="background:transparent;border:none;color:#c9a96e;cursor:pointer;font-weight:600;font-size:13px;text-decoration:underline;">Choisir un client</button>') +
        '</div>' +
      '</div>';

    /* Picker templates — toujours visible */
    var tpls = K.listTemplates();
    html +=
      '<div style="background:#fff;border:1px solid #e3dccc;border-radius:14px;padding:18px 20px;margin-bottom:20px;">' +
        '<div style="font-weight:700;color:#0f2030;font-size:15px;margin-bottom:4px;">Créer un devis</div>' +
        '<div style="font-size:12px;color:#7a8896;margin-bottom:14px;">Choisir un modèle de départ — toutes les lignes resteront modifiables.</div>' +
        '<div class="ajqe-tplgrid">' +
          tpls.map(function(t){
            var typeDef = K.QUOTE_DOC_TYPES.find(function(d){ return d.id === t.typeDocument; });
            var typeLabel = typeDef ? typeDef.label : 'Devis';
            return '<button class="ajqe-tplcard" onclick="AJQuotes.createFromTemplate(\'' + t.id + '\')">' +
              '<div class="ajqe-tplcard__icon">' + (t.icon || '📄') + '</div>' +
              '<div class="ajqe-tplcard__title">' + esc(t.label) + '</div>' +
              '<div class="ajqe-tplcard__desc">' + esc(t.description) + '</div>' +
              '<div class="ajqe-tplcard__type">' + typeLabel + '</div>' +
            '</button>';
          }).join('') +
        '</div>' +
      '</div>';

    /* Liste des devis du chantier */
    if(clientId){
      html += '<div style="font-weight:700;color:#0f2030;font-size:15px;margin-bottom:10px;">Devis du chantier</div>';
      if(!allQuotes.length){
        html +=
          '<div style="background:#fff;border:1px dashed #e3dccc;border-radius:12px;padding:24px;text-align:center;color:#7a8896;font-size:13px;">' +
            'Aucun devis pour ce chantier. Choisissez un modèle au-dessus pour démarrer.' +
          '</div>';
      } else {
        html += allQuotes.map(function(q){
          var totals = computeQuoteTotals(q);
          var typeDef = K.QUOTE_DOC_TYPES.find(function(d){ return d.id === q.typeDocument; });
          var typeLabel = typeDef ? typeDef.label : 'Devis';
          var dateFR = isoToFR(q.quoteDate);
          var nbLines = (q.sections || []).reduce(function(n, s){ return n + (s.lines || []).length; }, 0);
          return '<div class="ajqe-listcard" onclick="AJQuotes.openEditor(\'' + esc(q.id) + '\')">' +
            '<div class="ajqe-listcard__icon">' + (q.typeDocument === 'amendment' ? '📑' : (q.typeDocument === 'revision' ? '✏️' : '📄')) + '</div>' +
            '<div class="ajqe-listcard__body">' +
              '<div class="ajqe-listcard__title">' + esc(typeLabel) + ' n° ' + esc(q.quoteNumber || '—') + '</div>' +
              '<div class="ajqe-listcard__sub">' + esc(dateFR) + ' · ' + nbLines + ' ligne' + (nbLines > 1 ? 's' : '') + ' · ' + esc(q.title || 'Sans titre') + '</div>' +
            '</div>' +
            '<div class="ajqe-listcard__total">' + fmtMoney(totals.totalTTC) + ' €' +
              '<div style="font-size:10px;color:#7a8896;font-family:Inter,sans-serif;font-weight:500;text-align:right;margin-top:2px;">TTC</div>' +
            '</div>' +
            '<button class="ajqe-line__icon ajqe-line__icon--danger" title="Supprimer" ' +
              'onclick="event.stopPropagation();AJQuotes.deleteQuote(\'' + esc(q.id) + '\')" ' +
              'style="margin-left:8px;font-size:16px;">🗑</button>' +
          '</div>';
        }).join('');
      }
    }

    body.innerHTML = html;
  }

  /* ─────────────────────────────────────────────────────────────────
     VUE ÉDITEUR — Tabs Édition / Aperçu + chargement quote courant
     ───────────────────────────────────────────────────────────────── */
  function renderEditorScreen(){
    ensureEditorScreen();
    var body = document.getElementById('ajq-editor-body');
    if(!body) return;
    var quote = getCurrentQuote();
    if(!quote){
      body.innerHTML =
        '<div style="padding:40px;text-align:center;color:#7a8896;font-family:Inter,sans-serif;">' +
          '<div style="font-size:14px;margin-bottom:10px;">Aucun devis ouvert.</div>' +
          '<button class="ajqe-btn ajqe-btn--primary" onclick="AJQuotes.backToList()">← Retour à la liste</button>' +
        '</div>';
      return;
    }
    persistCurrent(quote);

    var typeDef = K.QUOTE_DOC_TYPES.find(function(d){ return d.id === quote.typeDocument; });
    var typeLabel = typeDef ? typeDef.label : 'Devis';

    body.innerHTML =
      '<div class="ajqe-shell">' +
        /* Header devis */
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap;">' +
          '<button class="ajqe-btn" onclick="AJQuotes.backToList()">← Liste</button>' +
          '<div style="flex:1;min-width:200px;">' +
            '<div style="font-family:\'Cormorant Garamond\',Georgia,serif;font-size:24px;font-weight:600;color:#0f2030;line-height:1.1;">' + esc(typeLabel) + ' n° ' + esc(quote.quoteNumber || '—') + '</div>' +
            '<div style="font-size:12px;color:#7a8896;margin-top:2px;">' + esc(quote.title || 'Sans titre') + '</div>' +
          '</div>' +
        '</div>' +

        /* Tabs */
        '<div class="ajqe-tabs">' +
          '<button class="ajqe-tab' + (_state.activeView === 'edit' ? ' active' : '') + '" onclick="AJQuotes.setView(\'edit\')">✏️ Édition</button>' +
          '<button class="ajqe-tab' + (_state.activeView === 'preview' ? ' active' : '') + '" onclick="AJQuotes.setView(\'preview\')">📄 Aperçu AJ Pro</button>' +
        '</div>' +

        '<div id="ajq-view-body"></div>' +
      '</div>';

    if(_state.activeView === 'edit') renderEditView();
    else renderPreviewView();
  }

  /* ─────────────────────────────────────────────────────────────────
     VUE ÉDITION — métadonnées + sections + lignes + sticky totaux
     ───────────────────────────────────────────────────────────────── */
  function renderEditView(){
    var quote = getCurrentQuote();
    if(!quote) return;
    var view = document.getElementById('ajq-view-body');
    if(!view) return;
    var totals = computeQuoteTotals(quote);

    var html = '';

    /* Bandeau métadonnées doc */
    html += renderMetaBlock(quote);

    /* Bloc client / chantier */
    html += renderClientBlock(quote);

    /* Sections */
    quote.sections.forEach(function(sec){
      html += renderSectionEditor(quote, sec);
    });

    /* Bouton ajout section */
    html += '<button class="ajqe-addsection" onclick="AJQuotes.addSection()">+ Ajouter une section</button>';

    /* Sticky bar totaux */
    html +=
      '<div class="ajqe-totalsbar">' +
        '<div class="ajqe-totalsbar__col">' +
          '<div class="ajqe-totalsbar__lab">Total HT</div>' +
          '<div class="ajqe-totalsbar__val">' + fmtMoney(totals.totalHT) + ' €</div>' +
        '</div>' +
        '<div class="ajqe-totalsbar__col">' +
          '<div class="ajqe-totalsbar__lab">TVA ' + fmtQty(totals.vatRate) + '%</div>' +
          '<div class="ajqe-totalsbar__val">' + fmtMoney(totals.vat) + ' €</div>' +
        '</div>' +
        '<div class="ajqe-totalsbar__col">' +
          '<div class="ajqe-totalsbar__lab">Total TTC</div>' +
          '<div class="ajqe-totalsbar__val ajqe-totalsbar__val--gold">' + fmtMoney(totals.totalTTC) + ' €</div>' +
        '</div>' +
        '<div class="ajqe-totalsbar__col">' +
          '<div class="ajqe-totalsbar__lab">Acompte ' + fmtQty(totals.depositRate) + '%</div>' +
          '<div class="ajqe-totalsbar__val">' + fmtMoney(totals.deposit) + ' €</div>' +
        '</div>' +
        (totals.optionsTotalHT
          ? '<div class="ajqe-totalsbar__col">' +
              '<div class="ajqe-totalsbar__lab">Options HT (hors total)</div>' +
              '<div class="ajqe-totalsbar__val" style="color:#d8c595;">' + fmtMoney(totals.optionsTotalHT) + ' €</div>' +
            '</div>'
          : '') +
        '<div class="ajqe-totalsbar__actions">' +
          '<button class="ajqe-btn ajqe-btn--gold-outline" onclick="AJQuotes.setView(\'preview\')">📄 Aperçu AJ Pro</button>' +
        '</div>' +
      '</div>';

    view.innerHTML = html;
  }

  function renderMetaBlock(quote){
    var typeOpts = K.QUOTE_DOC_TYPES.map(function(t){
      return '<option value="' + t.id + '"' + (quote.typeDocument === t.id ? ' selected' : '') + '>' + t.label + '</option>';
    }).join('');

    return '<div class="ajqe-meta">' +
      '<div class="ajqe-meta__field">' +
        '<label class="ajqe-meta__label">Type</label>' +
        '<select class="ajqe-meta__select" onchange="AJQuotes.setField(\'typeDocument\', this.value)">' + typeOpts + '</select>' +
      '</div>' +
      '<div class="ajqe-meta__field">' +
        '<label class="ajqe-meta__label">Numéro</label>' +
        '<input class="ajqe-meta__input" value="' + esc(quote.quoteNumber || '') + '" onchange="AJQuotes.setField(\'quoteNumber\', this.value)" />' +
      '</div>' +
      '<div class="ajqe-meta__field">' +
        '<label class="ajqe-meta__label">Date</label>' +
        '<input type="date" class="ajqe-meta__input" value="' + esc(quote.quoteDate || '') + '" onchange="AJQuotes.setField(\'quoteDate\', this.value)" />' +
      '</div>' +
      '<div class="ajqe-meta__field">' +
        '<label class="ajqe-meta__label">Validité</label>' +
        '<input type="date" class="ajqe-meta__input" value="' + esc(quote.validityDate || '') + '" onchange="AJQuotes.setField(\'validityDate\', this.value)" />' +
      '</div>' +
      (quote.typeDocument === 'revision'
        ? '<div class="ajqe-meta__field">' +
            '<label class="ajqe-meta__label">N° révision</label>' +
            '<input class="ajqe-meta__input" value="' + esc(quote.revisionNumber || '') + '" onchange="AJQuotes.setField(\'revisionNumber\', this.value)" placeholder="ex : 1, 2, 3" />' +
          '</div>' +
          '<div class="ajqe-meta__field">' +
            '<label class="ajqe-meta__label">Date révision</label>' +
            '<input type="date" class="ajqe-meta__input" value="' + esc(quote.revisionDate || '') + '" onchange="AJQuotes.setField(\'revisionDate\', this.value)" />' +
          '</div>'
        : '') +
      '<div class="ajqe-meta__field" style="grid-column:1/-1">' +
        '<label class="ajqe-meta__label">Titre des travaux</label>' +
        '<input class="ajqe-meta__input" value="' + esc(quote.title || '') + '" onchange="AJQuotes.setField(\'title\', this.value)" placeholder="ex : Rénovation d\'une salle de douche dans un logement" />' +
      '</div>' +
      '<div class="ajqe-meta__field">' +
        '<label class="ajqe-meta__label">Taux TVA (%)</label>' +
        '<input type="number" class="ajqe-meta__input" value="' + esc(quote.vatRate) + '" min="0" step="0.5" onchange="AJQuotes.setField(\'vatRate\', this.value, true)" />' +
      '</div>' +
      '<div class="ajqe-meta__field">' +
        '<label class="ajqe-meta__label">Acompte (%)</label>' +
        '<input type="number" class="ajqe-meta__input" value="' + esc(quote.depositRate) + '" min="0" step="1" onchange="AJQuotes.setField(\'depositRate\', this.value, true)" />' +
      '</div>' +
      '<div class="ajqe-meta__field">' +
        '<label class="ajqe-meta__label">Mode de règlement</label>' +
        '<input class="ajqe-meta__input" value="' + esc(quote.paymentMethod || '') + '" onchange="AJQuotes.setField(\'paymentMethod\', this.value)" />' +
      '</div>' +
      '<div class="ajqe-meta__field" style="display:flex;flex-direction:row;gap:8px;align-items:center;">' +
        '<input type="checkbox" id="ajq-toggle-disc" ' + (quote.showDiscountColumn ? 'checked' : '') + ' onchange="AJQuotes.setField(\'showDiscountColumn\', this.checked)" />' +
        '<label for="ajq-toggle-disc" style="font-size:13px;color:#0f2030;cursor:pointer;">Afficher la colonne <strong>Remise</strong></label>' +
      '</div>' +
      '<div class="ajqe-meta__field" style="display:flex;flex-direction:row;gap:8px;align-items:center;">' +
        '<input type="checkbox" id="ajq-toggle-opt" ' + (quote.optionsIncludedInTotal ? 'checked' : '') + ' onchange="AJQuotes.setField(\'optionsIncludedInTotal\', this.checked)" />' +
        '<label for="ajq-toggle-opt" style="font-size:13px;color:#0f2030;cursor:pointer;">Compter les options dans le total principal</label>' +
      '</div>' +
    '</div>';
  }

  function renderClientBlock(quote){
    var ci = quote.clientInfo || {};
    var ch = quote.chantierInfo || {};
    return '<div class="ajqe-meta">' +
      '<div class="ajqe-meta__field">' +
        '<label class="ajqe-meta__label">Client (à l\'attention de)</label>' +
        '<input class="ajqe-meta__input" value="' + esc(ci.attentionA || '') + '" onchange="AJQuotes.setClientField(\'attentionA\', this.value)" placeholder="ex : Mme BOULAY Nathalie" />' +
      '</div>' +
      '<div class="ajqe-meta__field">' +
        '<label class="ajqe-meta__label">Téléphone client</label>' +
        '<input class="ajqe-meta__input" value="' + esc(ci.tel || '') + '" onchange="AJQuotes.setClientField(\'tel\', this.value)" />' +
      '</div>' +
      '<div class="ajqe-meta__field">' +
        '<label class="ajqe-meta__label">Email client</label>' +
        '<input class="ajqe-meta__input" value="' + esc(ci.email || '') + '" onchange="AJQuotes.setClientField(\'email\', this.value)" />' +
      '</div>' +
      '<div class="ajqe-meta__field" style="grid-column:1/-1">' +
        '<label class="ajqe-meta__label">Adresse client</label>' +
        '<input class="ajqe-meta__input" value="' + esc(ci.adresse || '') + '" onchange="AJQuotes.setClientField(\'adresse\', this.value)" />' +
      '</div>' +
      '<div class="ajqe-meta__field">' +
        '<label class="ajqe-meta__label">CP client</label>' +
        '<input class="ajqe-meta__input" value="' + esc(ci.codePostal || '') + '" onchange="AJQuotes.setClientField(\'codePostal\', this.value)" />' +
      '</div>' +
      '<div class="ajqe-meta__field">' +
        '<label class="ajqe-meta__label">Ville client</label>' +
        '<input class="ajqe-meta__input" value="' + esc(ci.ville || '') + '" onchange="AJQuotes.setClientField(\'ville\', this.value)" />' +
      '</div>' +
      '<div class="ajqe-meta__field" style="grid-column:1/-1">' +
        '<label class="ajqe-meta__label">Adresse chantier (si différente)</label>' +
        '<input class="ajqe-meta__input" value="' + esc(ch.adresse || '') + '" onchange="AJQuotes.setChantierField(\'adresse\', this.value)" />' +
      '</div>' +
      '<div class="ajqe-meta__field">' +
        '<label class="ajqe-meta__label">Étage</label>' +
        '<input class="ajqe-meta__input" value="' + esc(ch.etage || '') + '" onchange="AJQuotes.setChantierField(\'etage\', this.value)" />' +
      '</div>' +
      '<div class="ajqe-meta__field">' +
        '<label class="ajqe-meta__label">Ascenseur / accès</label>' +
        '<input class="ajqe-meta__input" value="' + esc(ch.ascenseur || '') + '" onchange="AJQuotes.setChantierField(\'ascenseur\', this.value)" placeholder="ex : ascenseur · Code Portail 1397" />' +
      '</div>' +
      '<div class="ajqe-meta__field">' +
        '<label class="ajqe-meta__label">Code accès</label>' +
        '<input class="ajqe-meta__input" value="' + esc(ch.codeAccess || '') + '" onchange="AJQuotes.setChantierField(\'codeAccess\', this.value)" />' +
      '</div>' +
      '<div class="ajqe-meta__field">' +
        '<label class="ajqe-meta__label">Interphone</label>' +
        '<input class="ajqe-meta__input" value="' + esc(ch.interphone || '') + '" onchange="AJQuotes.setChantierField(\'interphone\', this.value)" />' +
      '</div>' +
    '</div>';
  }

  function renderSectionEditor(quote, sec){
    var withDiscount = !!quote.showDiscountColumn;
    var statusOpts = K.QUOTE_LINE_STATUSES;
    var supplyOpts = K.QUOTE_SUPPLIED_BY;

    var headerHtml =
      '<div class="ajqe-section__head">' +
        '<div class="ajqe-section__num">' + esc(sec.number || '—') + '</div>' +
        '<input class="ajqe-section__title" value="' + esc(sec.title || '') + '" onchange="AJQuotes.setSectionField(\'' + esc(sec.id) + '\', \'title\', this.value)" />' +
        (sec.isOption ? '<span class="ajqe-section__pill">Option</span>' : '') +
        '<div class="ajqe-section__actions">' +
          '<button class="ajqe-btn" onclick="AJQuotes.toggleSectionOption(\'' + esc(sec.id) + '\')" title="Bascule Option / Essentiel">' + (sec.isOption ? '↩ Marquer essentiel' : '⤴ Marquer comme option') + '</button>' +
          '<button class="ajqe-btn" onclick="AJQuotes.toggleSectionVisible(\'' + esc(sec.id) + '\')" title="Masquer / Afficher">' + (sec.visible === false ? '👁 Afficher' : '🙈 Masquer') + '</button>' +
          '<button class="ajqe-btn" onclick="AJQuotes.moveSection(\'' + esc(sec.id) + '\', -1)" title="Monter">▲</button>' +
          '<button class="ajqe-btn" onclick="AJQuotes.moveSection(\'' + esc(sec.id) + '\', 1)" title="Descendre">▼</button>' +
          '<button class="ajqe-btn ajqe-btn--danger" onclick="AJQuotes.deleteSection(\'' + esc(sec.id) + '\')" title="Supprimer la section">🗑</button>' +
        '</div>' +
      '</div>';

    var thRow =
      '<tr>' +
        '<th class="num" style="width:60px">N°</th>' +
        '<th class="des">Désignation</th>' +
        '<th class="r" style="width:70px">Qté</th>' +
        '<th class="r" style="width:60px">Unité</th>' +
        (withDiscount ? '<th class="r" style="width:90px">PU</th><th class="r" style="width:60px">R(%)</th>' : '') +
        '<th class="r" style="width:90px">PUHT</th>' +
        '<th class="r" style="width:100px">Total HT</th>' +
        '<th class="c" style="width:120px">Actions</th>' +
      '</tr>';

    var rowsHtml = (sec.lines || []).map(function(ln){
      return renderLineRow(quote, sec, ln, withDiscount, statusOpts, supplyOpts);
    }).join('');

    var addLineBtn =
      '<button class="ajqe-section__addline" onclick="AJQuotes.addLine(\'' + esc(sec.id) + '\')">+ Ajouter une ligne</button>' +
      '<button class="ajqe-section__addline" onclick="AJQuotes.addLine(\'' + esc(sec.id) + '\', \'comment\')" style="margin-top:-4px;">+ Ajouter un commentaire</button>';

    var sectionClass = 'ajqe-section' + (sec.isOption ? ' ajqe-section--option' : '');
    if(sec.visible === false) sectionClass += ' ajqe-section--hidden';

    return '<div class="' + sectionClass + '" data-section-id="' + esc(sec.id) + '">' +
      headerHtml +
      '<div style="overflow-x:auto;">' +
        '<table class="ajqe-table" style="min-width:760px;">' +
          '<thead>' + thRow + '</thead>' +
          '<tbody>' + rowsHtml + '</tbody>' +
        '</table>' +
      '</div>' +
      addLineBtn +
    '</div>';
  }

  function renderLineRow(quote, sec, ln, withDiscount, statusOpts, supplyOpts){
    var rowClass = 'ajqe-line__row';
    if(ln.status === 'option') rowClass += ' ajqe-line__row--option';
    if(ln.status === 'excluded') rowClass += ' ajqe-line__row--excluded';
    if(ln.visible === false) rowClass += ' ajqe-line__row--hidden';
    if(ln.highlighted && ln.highlightColor === 'red') rowClass += ' ajqe-line__row--highlight-red';
    if(ln.type === 'comment') rowClass += ' ajqe-line__row--comment';

    var statusOptsHtml = statusOpts.map(function(s){
      return '<option value="' + s.id + '"' + (ln.status === s.id ? ' selected' : '') + '>' + s.label + '</option>';
    }).join('');
    var supplyOptsHtml = '<option value="">— —</option>' + supplyOpts.map(function(s){
      return '<option value="' + s.id + '"' + (ln.suppliedBy === s.id ? ' selected' : '') + '>' + s.short + '</option>';
    }).join('');

    var qtyAttrs = ln.allowNegativeQuantity ? '' : ' min="0"';
    if(!ln.allowNegativeQuantity && Number(ln.quantity) < 0){
      /* Si la ligne a une qty négative, on autorise quand même l'affichage sans "min" trop strict */
      qtyAttrs = '';
    }

    /* Cell PU avant remise (visible si remise active) */
    var pubCell = '';
    if(withDiscount){
      pubCell =
        '<td class="ajqe-line__cell">' +
          '<input type="number" step="0.01" class="r pu" value="' + esc(ln.unitPriceBeforeDiscount != null ? ln.unitPriceBeforeDiscount : ln.unitPriceHT) + '" ' +
            'onchange="AJQuotes.setLineField(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\',\'unitPriceBeforeDiscount\',this.value,true)" />' +
        '</td>' +
        '<td class="ajqe-line__cell">' +
          '<input type="number" step="0.01" min="0" max="100" class="r disc" value="' + esc(ln.discountPercent || 0) + '" ' +
            'onchange="AJQuotes.setLineField(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\',\'discountPercent\',this.value,true)" />' +
        '</td>';
    }

    var lineTotalDisplay = '';
    if(ln.type === 'comment'){
      lineTotalDisplay = ''; /* Commentaires : pas de total */
    } else if(ln.totalHT === 0 && (ln.unitPriceHT === 0 || !ln.unitPriceHT)){
      lineTotalDisplay = '0,00';
    } else {
      lineTotalDisplay = fmtMoney(ln.totalHT);
    }

    return '<tr class="' + rowClass + '" data-line-id="' + esc(ln.id) + '">' +
      /* Numéro */
      '<td class="ajqe-line__cell">' +
        '<input class="r" value="' + esc(ln.numberOverride || ln.number || '') + '" ' +
          'onchange="AJQuotes.setLineField(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\',\'numberOverride\',this.value)" ' +
          'placeholder="' + esc(ln.number || '') + '" style="text-align:left;font-weight:700;color:#0f2030;width:60px" />' +
      '</td>' +
      /* Désignation + Description */
      '<td class="ajqe-line__cell">' +
        '<textarea class="ajqe-line__designation" rows="1" ' +
          'onchange="AJQuotes.setLineField(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\',\'designation\',this.value)">' + esc(ln.designation || '') + '</textarea>' +
        '<textarea class="ajqe-line__description" rows="1" ' +
          'placeholder="Description longue (optionnelle)" ' +
          'onchange="AJQuotes.setLineField(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\',\'description\',this.value)">' + esc(ln.description || '') + '</textarea>' +
        /* Statuts inline (status / suppliedBy / type) */
        '<div class="ajqe-line__statusrow">' +
          '<select onchange="AJQuotes.setLineField(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\',\'status\',this.value)">' + statusOptsHtml + '</select>' +
          '<select onchange="AJQuotes.setLineField(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\',\'suppliedBy\',this.value)">' + supplyOptsHtml + '</select>' +
          (ln.type !== 'normal' && ln.type !== 'comment'
            ? '<span style="color:#7a8896;align-self:center;">type : ' + esc(ln.type) + '</span>'
            : '') +
        '</div>' +
      '</td>' +
      /* Qté */
      '<td class="ajqe-line__cell">' +
        '<input type="number" step="0.01"' + qtyAttrs + ' class="r qty" value="' + esc(ln.quantity != null ? ln.quantity : 1) + '" ' +
          'onchange="AJQuotes.setLineField(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\',\'quantity\',this.value,true)" />' +
        (ln.allowNegativeQuantity
          ? '<div style="font-size:10px;color:#7a5a30;margin-top:2px;">⇄ négatif autorisé</div>'
          : '<div style="font-size:10px;color:#c9a96e;margin-top:2px;cursor:pointer;" onclick="AJQuotes.toggleLineFlag(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\',\'allowNegativeQuantity\')">+ permettre négatif</div>') +
      '</td>' +
      /* Unité */
      '<td class="ajqe-line__cell">' +
        '<input class="unit" value="' + esc(ln.unit || 'U') + '" list="ajq-units" ' +
          'onchange="AJQuotes.setLineField(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\',\'unit\',this.value)" />' +
      '</td>' +
      pubCell +
      /* PUHT */
      '<td class="ajqe-line__cell">' +
        '<input type="number" step="0.01" class="r pu" value="' + esc(ln.unitPriceHT != null ? ln.unitPriceHT : 0) + '" ' +
          'onchange="AJQuotes.setLineField(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\',\'unitPriceHT\',this.value,true)" />' +
      '</td>' +
      /* Total HT calculé */
      '<td class="ajqe-line__total">' + esc(lineTotalDisplay) + ' €</td>' +
      /* Actions */
      '<td>' +
        '<div class="ajqe-line__actions">' +
          '<button class="ajqe-line__icon" title="Monter" onclick="AJQuotes.moveLine(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\',-1)">▲</button>' +
          '<button class="ajqe-line__icon" title="Descendre" onclick="AJQuotes.moveLine(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\',1)">▼</button>' +
          '<button class="ajqe-line__icon" title="Dupliquer" onclick="AJQuotes.duplicateLine(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\')">⎘</button>' +
          '<button class="ajqe-line__icon" title="' + (ln.visible === false ? 'Afficher' : 'Masquer') + '" onclick="AJQuotes.toggleLineVisible(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\')">' + (ln.visible === false ? '👁' : '🙈') + '</button>' +
          '<button class="ajqe-line__icon ajqe-line__icon--danger" title="Supprimer" onclick="AJQuotes.deleteLine(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\')">🗑</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }

  /* ─────────────────────────────────────────────────────────────────
     ACTIONS — handlers exposés via window.AJQuotes
     ───────────────────────────────────────────────────────────────── */
  function setView(view){
    _state.activeView = view;
    if(view === 'edit') renderEditView();
    else renderPreviewView();
    /* Met à jour les onglets actifs sans tout re-rendre */
    var tabs = document.querySelectorAll('.ajqe-tab');
    tabs.forEach(function(t){ t.classList.remove('active'); });
    if(tabs.length){
      var idx = view === 'edit' ? 0 : 1;
      if(tabs[idx]) tabs[idx].classList.add('active');
    }
  }

  function setField(field, value, isNumber){
    var quote = getCurrentQuote(); if(!quote) return;
    if(isNumber) value = parseNum(value);
    quote[field] = value;
    /* Effets de bord : si on change le type, mettre à jour le titre par défaut éventuel */
    persistCurrent(quote);
    renderEditorScreen();
  }

  function setClientField(field, value){
    var quote = getCurrentQuote(); if(!quote) return;
    quote.clientInfo = quote.clientInfo || {};
    quote.clientInfo[field] = value;
    persistCurrent(quote);
  }

  function setChantierField(field, value){
    var quote = getCurrentQuote(); if(!quote) return;
    quote.chantierInfo = quote.chantierInfo || {};
    quote.chantierInfo[field] = value;
    persistCurrent(quote);
  }

  function setSectionField(secId, field, value){
    var quote = getCurrentQuote(); if(!quote) return;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec) return;
    sec[field] = value;
    persistCurrent(quote);
    renderEditView();
  }

  function setLineField(secId, lineId, field, value, isNumber){
    var quote = getCurrentQuote(); if(!quote) return;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec) return;
    var ln = (sec.lines || []).find(function(l){ return l.id === lineId; });
    if(!ln) return;
    if(isNumber) value = parseNum(value);
    ln[field] = value;
    /* Si l'utilisateur saisit unitPriceHT manuellement, on efface unitPriceBeforeDiscount */
    if(field === 'unitPriceHT'){
      ln.unitPriceBeforeDiscount = null;
      ln.discountPercent = 0;
    }
    persistCurrent(quote);
    renderEditView();
  }

  function toggleLineFlag(secId, lineId, flag){
    var quote = getCurrentQuote(); if(!quote) return;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec) return;
    var ln = (sec.lines || []).find(function(l){ return l.id === lineId; });
    if(!ln) return;
    ln[flag] = !ln[flag];
    persistCurrent(quote);
    renderEditView();
  }

  function toggleLineVisible(secId, lineId){
    var quote = getCurrentQuote(); if(!quote) return;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec) return;
    var ln = (sec.lines || []).find(function(l){ return l.id === lineId; });
    if(!ln) return;
    ln.visible = ln.visible === false ? true : false;
    persistCurrent(quote);
    renderEditView();
  }

  function moveLine(secId, lineId, delta){
    var quote = getCurrentQuote(); if(!quote) return;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec || !sec.lines) return;
    var idx = sec.lines.findIndex(function(l){ return l.id === lineId; });
    if(idx < 0) return;
    var newIdx = idx + delta;
    if(newIdx < 0 || newIdx >= sec.lines.length) return;
    var ln = sec.lines.splice(idx, 1)[0];
    sec.lines.splice(newIdx, 0, ln);
    persistCurrent(quote);
    renderEditView();
  }

  function duplicateLine(secId, lineId){
    var quote = getCurrentQuote(); if(!quote) return;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec || !sec.lines) return;
    var idx = sec.lines.findIndex(function(l){ return l.id === lineId; });
    if(idx < 0) return;
    var clone = JSON.parse(JSON.stringify(sec.lines[idx]));
    clone.id = uid('l_');
    clone.numberOverride = '';
    sec.lines.splice(idx + 1, 0, clone);
    persistCurrent(quote);
    renderEditView();
  }

  function deleteLine(secId, lineId){
    var quote = getCurrentQuote(); if(!quote) return;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec || !sec.lines) return;
    if(!confirm('Supprimer cette ligne ?')) return;
    sec.lines = sec.lines.filter(function(l){ return l.id !== lineId; });
    persistCurrent(quote);
    renderEditView();
  }

  function addLine(secId, type){
    var quote = getCurrentQuote(); if(!quote) return;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec) return;
    sec.lines = sec.lines || [];
    var ln = {
      id: uid('l_'),
      number: '',
      designation: type === 'comment' ? 'Commentaire à compléter' : 'Nouvelle ligne',
      description: '',
      quantity: type === 'comment' ? 1 : 1,
      unit: 'U',
      unitPriceBeforeDiscount: null,
      discountPercent: 0,
      unitPriceHT: 0,
      totalHT: 0,
      type: type || 'normal',
      status: 'included',
      suppliedBy: null,
      visible: true,
      order: sec.lines.length,
      allowNegativeQuantity: false,
      allowZeroPrice: true,
      highlighted: false,
      highlightColor: null,
      metadata: {}
    };
    sec.lines.push(ln);
    persistCurrent(quote);
    renderEditView();
  }

  function addSection(){
    var quote = getCurrentQuote(); if(!quote) return;
    var title = prompt('Titre de la nouvelle section ?', 'Nouvelle section');
    if(title == null) return; /* annulé */
    quote.sections = quote.sections || [];
    quote.sections.push({
      id: uid('s_'),
      number: '',
      title: title || 'Nouvelle section',
      type: 'custom',
      parentId: null,
      order: quote.sections.length,
      isOption: false,
      optionLabel: '',
      visible: true,
      lines: []
    });
    persistCurrent(quote);
    renderEditView();
  }

  function deleteSection(secId){
    var quote = getCurrentQuote(); if(!quote) return;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec) return;
    if(!confirm('Supprimer la section « ' + (sec.title || '') + ' » et toutes ses lignes ?')) return;
    quote.sections = quote.sections.filter(function(s){ return s.id !== secId; });
    persistCurrent(quote);
    renderEditView();
  }

  function moveSection(secId, delta){
    var quote = getCurrentQuote(); if(!quote) return;
    var idx = quote.sections.findIndex(function(s){ return s.id === secId; });
    if(idx < 0) return;
    var newIdx = idx + delta;
    if(newIdx < 0 || newIdx >= quote.sections.length) return;
    var sec = quote.sections.splice(idx, 1)[0];
    quote.sections.splice(newIdx, 0, sec);
    persistCurrent(quote);
    renderEditView();
  }

  function toggleSectionOption(secId){
    var quote = getCurrentQuote(); if(!quote) return;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec) return;
    sec.isOption = !sec.isOption;
    sec.optionLabel = sec.isOption ? 'Option' : '';
    persistCurrent(quote);
    renderEditView();
  }

  function toggleSectionVisible(secId){
    var quote = getCurrentQuote(); if(!quote) return;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec) return;
    sec.visible = sec.visible === false ? true : false;
    persistCurrent(quote);
    renderEditView();
  }

  /* ─────────────────────────────────────────────────────────────────
     OUVERTURE / FERMETURE / CRÉATION
     ───────────────────────────────────────────────────────────────── */
  function openEditor(quoteId){
    var q = getQuote(quoteId);
    if(!q){
      alert('Devis introuvable');
      return;
    }
    _state.currentQuoteId = quoteId;
    _state.activeView = 'edit';
    ensureEditorScreen();
    if(typeof showScreen === 'function') showScreen('screen-ajquote-editor');
    renderEditorScreen();
  }

  function backToList(){
    ensureListScreen();
    if(typeof showScreen === 'function') showScreen('screen-ajquote-list');
    renderListScreen();
  }

  function createFromTemplate(templateId){
    var clientId = window.currentClientId || null;
    if(!clientId){
      alert('Veuillez sélectionner un client / chantier avant de créer un devis.');
      if(typeof navTo === 'function') navTo('screen-clients', null);
      return null;
    }
    var q = createQuoteFromTemplate(templateId, clientId);
    if(!q) return null;
    openEditor(q.id);
    return q;
  }

  function deleteQuoteAction(id){
    if(!confirm('Supprimer définitivement ce devis ?')) return;
    deleteQuote(id);
    renderListScreen();
  }

  /* ─────────────────────────────────────────────────────────────────
     VUE APERÇU AJ PRO — reproduction HTML/CSS A4
     ───────────────────────────────────────────────────────────────── */

  /* Découpe les sections en pages : pour V1 on met TOUT sur une seule "page"
     longue qui imite A4 (la pagination physique est gérée à l'impression
     via @page). On affiche aussi page séparée pour CGV en fin. */
  function renderPreviewView(){
    var quote = getCurrentQuote();
    if(!quote) return;
    var view = document.getElementById('ajq-view-body');
    if(!view) return;

    ensureCSSLoaded();

    var totals = computeQuoteTotals(quote);
    var company = quote.companyInfo ? Object.assign({}, K.AJ_PRO_COMPANY, quote.companyInfo) : K.AJ_PRO_COMPANY;
    var typeDef = K.QUOTE_DOC_TYPES.find(function(d){ return d.id === quote.typeDocument; }) || K.QUOTE_DOC_TYPES[0];

    /* Estimation pages : 1 = devis (peut couler sur plusieurs A4), 1 = totaux+signature, 1 = CGV */
    /* Pour le rendu visuel, on construit 3 "pages" distinctes mais le tableau central
       peut continuer naturellement si très long (V1 simple) */

    var html = '';

    /* Toolbar (non imprimée) */
    html +=
      '<div class="ajq-preview-shell">' +
        '<div class="ajq-preview-toolbar">' +
          '<div><strong>' + esc(typeDef.label) + ' n° ' + esc(quote.quoteNumber) + '</strong> · ' + esc(isoToFR(quote.quoteDate)) + ' · Total TTC ' + fmtMoney(totals.totalTTC) + ' €</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button class="ajqe-btn" onclick="AJQuotes.setView(\'edit\')">← Retour à l\'édition</button>' +
            '<button class="ajqe-btn ajqe-btn--gold-outline" onclick="window.print()">🖨 Imprimer</button>' +
          '</div>' +
        '</div>' +
        renderPreviewPageTravaux(quote, company, typeDef, totals) +
        renderPreviewPageTotaux(quote, company, typeDef, totals) +
        renderPreviewPageCGV(quote, company) +
      '</div>';

    view.innerHTML = html;
  }

  function renderHeaderBlock(quote, company, pageNum, totalPages){
    return '<div class="ajq-header">' +
      '<div class="ajq-header__line1">' +
        esc(company.raisonSociale) + ' ' + esc(company.capitalPretty) + ' - Tel : ' + esc(company.tel) + ' - Email : ' + esc(company.email) +
      '</div>' +
      '<div class="ajq-header__num">' + esc(quote.quoteNumber || '') + '</div>' +
      '<div class="ajq-header__line2">' +
        'APE : ' + esc(company.ape) + ' - SIRET : ' + esc(company.siret) + ' - TVA intracommunautaire : ' + esc(company.tvaIntracom) +
      '</div>' +
      '<div class="ajq-header__line3">' +
        'IBAN : ' + esc(company.iban) + ' - BIC : ' + esc(company.bic) +
      '</div>' +
      '<div class="ajq-header__pagenum">page ' + pageNum + ' sur ' + totalPages + '</div>' +
    '</div>';
  }

  function renderActivitiesBlock(company){
    return '<div class="ajq-activities">' +
      company.activitesAffichage.map(function(line){ return '<div>' + esc(line) + '</div>'; }).join('') +
    '</div>';
  }

  function renderDocTitle(quote, typeDef){
    var dateFR = isoToFR(quote.quoteDate);
    var line1 = typeDef.titlePrefix + ' ' + esc(quote.quoteNumber || '') + (dateFR ? ' du ' + esc(dateFR) : '');
    var revLine = '';
    if(quote.typeDocument === 'revision' && quote.revisionNumber){
      revLine = 'Révision n° ' + esc(quote.revisionNumber) + (quote.revisionDate ? ' du ' + esc(isoToFR(quote.revisionDate)) : '');
    }
    return '<div class="ajq-doctitle">' + line1 +
      (revLine ? '<div class="ajq-doctitle__revline">' + revLine + '</div>' : '') +
    '</div>';
  }

  function renderClientChantierBlocks(quote, company){
    var ci = quote.clientInfo || {};
    var ch = quote.chantierInfo || {};
    var clientLines = [];
    if(ci.attentionA) clientLines.push('<strong>' + esc(ci.attentionA) + '</strong>');
    else if(ci.nom || ci.prenom) clientLines.push('<strong>' + esc(((ci.prenom || '') + ' ' + (ci.nom || '')).trim()) + '</strong>');
    if(ci.attentionA) clientLines.push('A l\'attention de ' + esc(ci.attentionA));
    if(ci.adresse) clientLines.push(esc(ci.adresse));
    if(ci.codePostal || ci.ville) clientLines.push(esc((ci.codePostal || '') + ' ' + (ci.ville || '')).trim());
    if(ci.tel) clientLines.push(esc(ci.tel));
    if(ci.email) clientLines.push(esc(ci.email));

    var chantierLines = [];
    var clientFullName = ((ci.prenom || '') + ' ' + (ci.nom || '')).trim() || ci.attentionA || '';
    if(clientFullName) chantierLines.push(esc(clientFullName));
    if(ch.adresse) chantierLines.push(esc(ch.adresse));
    if(ch.etage || ch.ascenseur) {
      chantierLines.push(esc((ch.etage ? ch.etage + (ch.etage.indexOf('étage') > -1 ? '' : ' étage') : '') + (ch.ascenseur ? (ch.etage ? ' - ' : '') + ch.ascenseur : '')));
    }
    if(ch.codeAccess) chantierLines.push('Code : ' + esc(ch.codeAccess));
    if(ch.interphone) chantierLines.push('Interphone : ' + esc(ch.interphone));
    if(ch.codePostal || ch.ville) chantierLines.push(esc((ch.codePostal || '') + ' ' + (ch.ville || '')).trim());

    return '<div class="ajq-blocks">' +
      /* BLOC CHANTIER */
      '<div class="ajq-block">' +
        '<div class="ajq-block__title">Chantier :</div>' +
        chantierLines.map(function(l){ return '<div class="ajq-block__line">' + l + '</div>'; }).join('') +
      '</div>' +
      /* BLOC AJ PRO */
      '<div class="ajq-block">' +
        '<div class="ajq-block__title">' + esc(company.raisonSociale.replace('Sarl ', '')) + '</div>' +
        '<div class="ajq-block__line">' + esc(company.adresse) + '</div>' +
        '<div class="ajq-block__line">' + esc(company.codePostal + ' ' + company.ville + ' ' + company.pays) + '</div>' +
        '<div class="ajq-block__line">Email : ' + esc(company.email) + '</div>' +
        '<div class="ajq-block__line">Tél : ' + esc(company.tel) + '</div>' +
        '<div class="ajq-block__rcs">' + esc(company.rcs) + '</div>' +
      '</div>' +
      /* BLOC CLIENT */
      '<div class="ajq-block">' +
        clientLines.map(function(l){ return '<div class="ajq-block__line">' + l + '</div>'; }).join('') +
      '</div>' +
    '</div>';
  }

  function renderPreviewPageTravaux(quote, company, typeDef, totals){
    var totalPages = 3;
    var withDiscount = !!quote.showDiscountColumn;

    var headersHtml = '<thead><tr>' +
      '<th class="num">N°</th>' +
      '<th class="des">Désignation</th>' +
      '<th class="qty">Qté</th>' +
      '<th class="unit">U</th>' +
      (withDiscount ? '<th class="pu">PU</th><th class="disc">R(%)</th>' : '') +
      '<th class="puht">PUHT</th>' +
      '<th class="total">Total H.T</th>' +
    '</tr></thead>';

    var colsHtml = '<colgroup>' +
      '<col class="num"/>' +
      '<col class="des"/>' +
      '<col class="qty"/>' +
      '<col class="unit"/>' +
      (withDiscount ? '<col class="pu"/><col class="disc"/>' : '') +
      '<col class="puht"/>' +
      '<col class="total"/>' +
    '</colgroup>';

    var body = '';
    quote.sections.forEach(function(sec){
      if(sec.visible === false) return;
      /* Titre de section */
      var titlePiece = (sec.title || '');
      var pillHtml = sec.isOption ? '<span class="ajq-option-pill">Option</span>' : '';
      var colspan = withDiscount ? 7 : 5;
      body +=
        '<tr class="ajq-row--section">' +
          '<td class="num">' + esc(sec.number) + '</td>' +
          '<td class="des" colspan="' + colspan + '">' + esc(titlePiece) + pillHtml + '</td>' +
        '</tr>';

      /* Lignes */
      (sec.lines || []).forEach(function(ln){
        if(ln.visible === false) return;
        body += renderPreviewLineRow(ln, sec, withDiscount);
      });

      /* Sous-total section */
      var subtotal = computeSectionSubtotal(sec, { optionsIncludedInTotal: !!quote.optionsIncludedInTotal });
      var subTotalDisplay = subtotal === 0 ? '' : fmtMoney(subtotal);
      var subColspan = withDiscount ? 6 : 4;
      body +=
        '<tr class="ajq-row--subtotal">' +
          '<td></td>' +
          '<td class="des" colspan="' + subColspan + '">Sous-total ' + esc(sec.title || '') + (sec.isOption ? ' Option' : '') + '</td>' +
          '<td class="total">' + esc(subTotalDisplay) + '</td>' +
        '</tr>';
    });

    var draftClass = quote.status === 'emis' ? '' : ' ajq-page--draft';
    return '<div class="ajq-page' + draftClass + '">' +
      renderHeaderBlock(quote, company, 1, totalPages) +
      renderActivitiesBlock(company) +
      renderDocTitle(quote, typeDef) +
      renderClientChantierBlocks(quote, company) +
      (quote.title ? '<div class="ajq-worktitle">' + esc(quote.title) + '</div>' : '') +
      '<table class="ajq-table' + (withDiscount ? ' ajq-table--with-discount' : ' ajq-table--no-discount') + '">' +
        colsHtml +
        headersHtml +
        '<tbody>' + body + '</tbody>' +
      '</table>' +
    '</div>';
  }

  function renderPreviewLineRow(ln, sec, withDiscount){
    var rowClass = 'ajq-row--line';
    if(ln.type === 'comment') rowClass += ' ajq-row--comment';
    if(ln.status === 'option') rowClass += ' ajq-row--option';
    if(ln.status === 'excluded') rowClass += ' ajq-row--excluded';
    if(ln.highlighted && ln.highlightColor === 'red') rowClass += ' ajq-row--highlight-red';

    var designationHtml = '<div class="ajq-line__designation">' + esc(ln.designation || '') + '</div>';
    if(ln.description) designationHtml += '<div class="ajq-line__description">' + esc(ln.description) + '</div>';
    if(ln.suppliedBy === 'client') designationHtml += '<div class="ajq-line__description" style="font-style:italic;">Fourni par le client</div>';
    if(ln.suppliedBy === 'to_confirm') designationHtml += '<div class="ajq-line__description" style="font-style:italic;color:#7a5a30;">Fourniture à confirmer</div>';

    var qty = (ln.type === 'comment' || ln.quantity == null) ? '' : fmtQty(ln.quantity);
    var unit = (ln.type === 'comment') ? '' : (ln.unit || '');
    var puCells = '';

    if(withDiscount){
      var pub = ln.unitPriceBeforeDiscount != null ? ln.unitPriceBeforeDiscount : ln.unitPriceHT;
      puCells += '<td class="pu">' + (ln.type === 'comment' ? '' : fmtMoneyOrEmpty(pub)) + '</td>';
      puCells += '<td class="disc">' + (ln.type === 'comment' ? '' : (ln.discountPercent ? fmtQty(ln.discountPercent) + '%' : '')) + '</td>';
    }

    var puhtDisplay = ln.type === 'comment' ? '' : fmtMoneyOrEmpty(ln.unitPriceHT);
    var totalDisplay;
    if(ln.type === 'comment'){
      totalDisplay = '';
    } else if(ln.unitPriceHT === 0 && ln.totalHT === 0){
      /* Le PDF source affiche souvent "0,00" — on met 0,00 si la ligne est explicitement à 0€ */
      totalDisplay = ln.allowZeroPrice ? '0,00' : '';
    } else {
      totalDisplay = fmtMoney(ln.totalHT);
    }

    return '<tr class="' + rowClass + '">' +
      '<td class="num">' + esc(ln.number || '') + '</td>' +
      '<td class="des">' + designationHtml + '</td>' +
      '<td class="qty">' + esc(qty) + '</td>' +
      '<td class="unit">' + esc(unit) + '</td>' +
      puCells +
      '<td class="puht">' + esc(puhtDisplay) + '</td>' +
      '<td class="total">' + esc(totalDisplay) + '</td>' +
    '</tr>';
  }

  function renderPreviewPageTotaux(quote, company, typeDef, totals){
    var totalPages = 3;
    var draftClass = quote.status === 'emis' ? '' : ' ajq-page--draft';
    var validityFR = isoToFR(quote.validityDate);
    var depositPct = fmtQty(totals.depositRate);

    return '<div class="ajq-page' + draftClass + '">' +
      renderHeaderBlock(quote, company, 2, totalPages) +
      /* Attestation TVA */
      '<div class="ajq-tva-attestation">' + esc(K.AJ_PRO_TVA_ATTESTATION) + '</div>' +
      /* Bloc totaux */
      '<div class="ajq-totals">' +
        '<div class="ajq-totals__title">' + esc(typeDef.label) + ' (EUR)</div>' +
        '<div class="ajq-totals__grid">' +
          '<div class="ajq-totals__row">' +
            '<div class="lab">Total H.T</div>' +
            '<div class="val">' + fmtMoney(totals.totalHT) + '</div>' +
            '<div class="cur">EUR</div>' +
          '</div>' +
          '<div class="ajq-totals__row">' +
            '<div class="lab">TVA</div>' +
            '<div class="val">' + fmtMoney(totals.vat) + '</div>' +
            '<div class="cur">EUR</div>' +
          '</div>' +
          '<div class="ajq-totals__row ajq-totals__row--ttc">' +
            '<div class="lab">Total T.T.C</div>' +
            '<div class="val">' + fmtMoney(totals.totalTTC) + '</div>' +
            '<div class="cur">EUR</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      /* Tableau TVA */
      '<table class="ajq-tva-table" style="width:60%;margin-top:3mm;">' +
        '<tr><th>% TVA</th><th>Base</th><th>Total TVA</th></tr>' +
        '<tr><td>' + fmtQty(totals.vatRate) + '</td><td>' + fmtMoney(totals.totalHT) + '</td><td>' + fmtMoney(totals.vat) + '</td></tr>' +
      '</table>' +
      /* Bloc règlement */
      '<div class="ajq-payment">' +
        (validityFR ? '<div class="ajq-payment__row"><strong>Validité du devis :</strong> ' + esc(validityFR) + '</div>' : '') +
        '<div class="ajq-payment__row"><strong>Délai de règlement :</strong></div>' +
        '<div class="ajq-payment__row"><strong>Mode de règlement :</strong> ' + esc(quote.paymentMethod || 'Virement') + '</div>' +
        '<div class="ajq-payment__row"><strong>Conditions de règlement :</strong></div>' +
        '<div class="ajq-payment__deposit">' +
          esc(depositPct) + '% à la signature à verser sur le compte IBAN : ' + esc(company.iban) + ', soit ' +
          fmtMoney(totals.deposit) + ' EUR TTC' +
        '</div>' +
        '<div class="ajq-payment__row"><strong>Délai de règlement :</strong> ' + esc(quote.paymentDelay || 'Règlement comptant') + '</div>' +
      '</div>' +
      /* Bloc assurance */
      '<div class="ajq-insurance">' +
        '<div><span class="ajq-insurance__title">Assurance Professionnelle :</span> ' + esc(company.assurance.assureur) + ' – ref contrat n°' + esc(company.assurance.reference) + ' depuis le ' + esc(company.assurance.depuis) + '</div>' +
        '<div>Activités couvertes : ' + esc(company.assurance.activitesCouvertes) + '</div>' +
        '<div>' + esc(company.assurance.mention) + '</div>' +
      '</div>' +
      /* Signature */
      '<div class="ajq-signature">' +
        '<div>' +
          '<div class="ajq-signature__num">' + esc(typeDef.label) + ' n° ' + esc(quote.quoteNumber || '') + '</div>' +
          '<div class="ajq-signature__mention">' + esc(K.AJ_PRO_SIGNATURE_MENTION) + '</div>' +
          '<div class="ajq-signature__box"></div>' +
        '</div>' +
        '<div>' +
          '<div class="ajq-signature__entreprise">Pour l\'Entreprise</div>' +
          '<div class="ajq-signature__box"></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderPreviewPageCGV(quote, company){
    var totalPages = 3;
    var draftClass = quote.status === 'emis' ? '' : ' ajq-page--draft';

    var articlesHtml = K.AJ_PRO_TERMS_AND_CONDITIONS.map(function(art){
      var bullets = art.bullets ? '<ul class="ajq-cgv-article__bullets">' + art.bullets.map(function(b){ return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' : '';
      return '<div class="ajq-cgv-article">' +
        '<div class="ajq-cgv-article__title">Article ' + art.number + ' - ' + esc(art.title) + '</div>' +
        '<div class="ajq-cgv-article__body">' + esc(art.body) + '</div>' +
        bullets +
      '</div>';
    }).join('');

    return '<div class="ajq-page' + draftClass + '">' +
      renderHeaderBlock(quote, company, 3, totalPages) +
      '<div class="ajq-cgv-title">Conditions générales de vente</div>' +
      '<div class="ajq-cgv-intro">' + esc(K.AJ_PRO_TERMS_INTRO) + '</div>' +
      articlesHtml +
    '</div>';
  }

  /* ─────────────────────────────────────────────────────────────────
     INSTALLATION DATALIST UNITS (pour autocomplétion dans l'éditeur)
     ───────────────────────────────────────────────────────────────── */
  function ensureUnitsDatalist(){
    if(document.getElementById('ajq-units')) return;
    var dl = document.createElement('datalist');
    dl.id = 'ajq-units';
    K.QUOTE_UNITS.forEach(function(u){
      var o = document.createElement('option');
      o.value = u;
      dl.appendChild(o);
    });
    document.body.appendChild(dl);
  }

  /* ─────────────────────────────────────────────────────────────────
     INTÉGRATION AVEC LE SHOWSCREEN GLOBAL
     ───────────────────────────────────────────────────────────────── */
  function patchShowScreen(){
    if(!window.showScreen) return;
    var orig = window.showScreen;
    window.showScreen = function(id){
      var r = orig.apply(this, arguments);
      if(id === 'screen-ajquote-list') setTimeout(renderListScreen, 30);
      if(id === 'screen-ajquote-editor') setTimeout(renderEditorScreen, 30);
      return r;
    };
  }

  function patchUpdateNav(){
    if(!window.updateNav) return;
    var orig = window.updateNav;
    window.updateNav = function(){
      var r = orig.apply(this, arguments);
      var item = document.getElementById('aj-nav-quotes');
      if(item){
        var on = (window.currentScreen === 'screen-ajquote-list' || window.currentScreen === 'screen-ajquote-editor');
        item.classList.toggle('active', on);
      }
      return r;
    };
  }

  /* ─────────────────────────────────────────────────────────────────
     EXPORT API
     ───────────────────────────────────────────────────────────────── */
  window.AJQuotes = {
    /* CRUD */
    create: function(clientId){ return createQuoteFromTemplate('tpl_aj_vide', clientId); },
    createFromTemplate: createFromTemplate,
    get: getQuote,
    list: getQuotesForClient,
    save: saveQuote,
    delete: deleteQuoteAction,
    deleteQuote: deleteQuoteAction,

    /* Navigation */
    openEditor: openEditor,
    backToList: backToList,
    setView: setView,

    /* Edit handlers */
    setField: setField,
    setClientField: setClientField,
    setChantierField: setChantierField,
    setSectionField: setSectionField,
    setLineField: setLineField,
    toggleLineFlag: toggleLineFlag,
    toggleLineVisible: toggleLineVisible,
    moveLine: moveLine,
    duplicateLine: duplicateLine,
    deleteLine: deleteLine,
    addLine: addLine,
    addSection: addSection,
    deleteSection: deleteSection,
    moveSection: moveSection,
    toggleSectionOption: toggleSectionOption,
    toggleSectionVisible: toggleSectionVisible,

    /* Calc helpers exposés (pour le récap, etc.) */
    computeTotals: computeQuoteTotals,
    recomputeNumbers: recomputeNumbers,

    /* Constantes */
    constants: K
  };

  /* ─────────────────────────────────────────────────────────────────
     BOOT
     ───────────────────────────────────────────────────────────────── */
  function boot(){
    ensureCSSLoaded();
    ensureUnitsDatalist();
    injectNav();
    patchShowScreen();
    patchUpdateNav();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 100); });
  } else {
    setTimeout(boot, 100);
  }
})();
