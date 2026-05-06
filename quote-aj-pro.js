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
    /* Format PDF AJ Pro : toujours 2 décimales avec virgule (1,00 / 13,90 / 27,80) */
    return rounded.toFixed(2).replace('.', ',');
  }

  /* Variante compacte (sans force 2 décimales) — utilisée dans l'éditeur et la sticky bar */
  function fmtQtyShort(n){
    if(n == null || isNaN(n)) return '';
    var rounded = Math.round(n * 100) / 100;
    var s = rounded.toFixed(2);
    s = s.replace(/\.?0+$/, '');
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

  /* Génère un numéro de devis tentatif au moment de la création (modifiable
     par l'utilisateur tant que le devis n'est pas émis). Compteur séparé du
     compteur strict d'émission — voir generateOfficialNumber() */
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

  /* Génère le numéro officiel STRICT à l'émission (jamais de gap, jamais
     ré-utilisé). Conformité légale française — chronologique sans trou.
     Compteur dédié `db.ajEmissionCounter` qui n'incrémente qu'à l'émission. */
  function generateOfficialNumber(){
    if(typeof dbLoad !== 'function' || typeof dbSave !== 'function') return null;
    var db = dbLoad();
    var year = new Date().getFullYear();
    db.ajEmissionCounter = db.ajEmissionCounter || { year: year, counter: 0 };
    if(db.ajEmissionCounter.year !== year){
      db.ajEmissionCounter = { year: year, counter: 0 };
    }
    db.ajEmissionCounter.counter += 1;
    dbSave(db);
    var seq = String(db.ajEmissionCounter.counter).padStart(4, '0');
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
      /* Émission verrouillée (Session 16) */
      locked: false,                /* true après émission officielle, plus jamais modifiable */
      emittedAt: null,              /* timestamp de l'émission */
      officialNumber: null,         /* numéro chronologique strict assigné à l'émission */
      lockedSnapshot: null,         /* JSON.stringify deep clone au moment de l'émission */
      parentQuoteId: null,          /* pour avenants/révisions : id du devis source */
      parentOfficialNumber: null,   /* pour avenants/révisions : numéro officiel du parent */
      createdAt: null,
      updatedAt: null
    };

    /* Renumérotation auto initiale */
    recomputeNumbers(quote);
    saveQuote(quote);
    return quote;
  }

  /* ─────────────────────────────────────────────────────────────────
     ÉMISSION VERROUILLÉE (Session 16)
     ──────────────────────────────────────────────────────────────────
     - emit(quoteId)            → fige le devis avec n° officiel chronologique
     - createAmendmentFrom(id)  → crée un avenant (devis vide, parent référencé)
     - createRevisionFrom(id)   → crée une révision (clone des lignes du parent)

     Une fois émis, un devis devient immutable :
     - locked: true, emittedAt: timestamp, officialNumber: 'D-YYYYNNNN'
     - lockedSnapshot: JSON deep clone au moment de l'émission
     - Pour corriger un devis émis : créer un avenant ou une révision
     ───────────────────────────────────────────────────────────────── */
  function emitQuote(quoteId){
    var quote = getQuote(quoteId);
    if(!quote) return { ok: false, error: 'Devis introuvable' };
    if(quote.locked) return { ok: false, error: 'Devis déjà émis' };
    /* Validation minimale : titre + au moins 1 ligne avec montant > 0 */
    var hasAnyValuedLine = false;
    (quote.sections || []).forEach(function(sec){
      (sec.lines || []).forEach(function(ln){
        if(ln.visible !== false && ln.totalHT && ln.totalHT !== 0) hasAnyValuedLine = true;
      });
    });
    if(!hasAnyValuedLine){
      return { ok: false, error: 'Aucune ligne avec un montant. L\'émission officielle nécessite au moins une ligne valorisée.' };
    }
    /* Recompute final */
    recomputeNumbers(quote);
    var totals = computeQuoteTotals(quote);
    /* Assigne le numéro officiel STRICT */
    var officialNum = generateOfficialNumber();
    if(!officialNum) return { ok: false, error: 'Impossible de générer un numéro officiel' };
    quote.officialNumber = officialNum;
    /* Le quoteNumber affiché est désormais l'officiel (écrase le tentatif) */
    quote.quoteNumber = officialNum;
    quote.locked = true;
    quote.emittedAt = Date.now();
    /* Snapshot immutable : deep clone JSON après tous les calculs/numérotations */
    quote.totalsAtEmission = totals;
    quote.lockedSnapshot = JSON.stringify({
      quoteNumber: quote.quoteNumber,
      officialNumber: quote.officialNumber,
      typeDocument: quote.typeDocument,
      quoteDate: quote.quoteDate,
      validityDate: quote.validityDate,
      revisionNumber: quote.revisionNumber,
      revisionDate: quote.revisionDate,
      title: quote.title,
      clientInfo: quote.clientInfo,
      chantierInfo: quote.chantierInfo,
      companyInfo: quote.companyInfo,
      vatRate: quote.vatRate,
      depositRate: quote.depositRate,
      paymentMethod: quote.paymentMethod,
      paymentDelay: quote.paymentDelay,
      showDiscountColumn: quote.showDiscountColumn,
      optionsIncludedInTotal: quote.optionsIncludedInTotal,
      sections: quote.sections,
      totals: totals,
      emittedAt: quote.emittedAt
    });
    saveQuote(quote);
    return { ok: true, officialNumber: officialNum, quote: quote };
  }

  /* Crée un avenant à partir d'un devis émis : devis vide pré-rempli avec
     les infos client/chantier du parent + référence parent.
     L'avenant lui-même peut ensuite être édité puis émis. */
  function createAmendmentFrom(parentQuoteId){
    var parent = getQuote(parentQuoteId);
    if(!parent){ alert('Devis source introuvable'); return null; }
    if(!parent.locked){ alert('Le devis source doit être émis avant de pouvoir créer un avenant.'); return null; }
    var amendment = createQuoteFromTemplate('tpl_aj_avenant_vide', parent.clientId);
    if(!amendment) return null;
    /* Reprend les infos client/chantier du parent (qui peuvent avoir été modifiées) */
    amendment.clientInfo = JSON.parse(JSON.stringify(parent.clientInfo || {}));
    amendment.chantierInfo = JSON.parse(JSON.stringify(parent.chantierInfo || {}));
    amendment.title = 'Travaux supplémentaires';
    amendment.parentQuoteId = parent.id;
    amendment.parentOfficialNumber = parent.officialNumber;
    amendment.vatRate = parent.vatRate;
    amendment.depositRate = parent.depositRate;
    amendment.showDiscountColumn = parent.showDiscountColumn;
    amendment.optionsIncludedInTotal = parent.optionsIncludedInTotal;
    saveQuote(amendment);
    return amendment;
  }

  /* Crée une révision : clone profond des sections/lignes du parent,
     avec typeDocument='revision' et numérotation incrémentale. */
  function createRevisionFrom(parentQuoteId){
    var parent = getQuote(parentQuoteId);
    if(!parent){ alert('Devis source introuvable'); return null; }
    if(!parent.locked){ alert('Le devis source doit être émis avant de pouvoir créer une révision.'); return null; }
    /* Compte les révisions existantes pour ce parent */
    var allQuotes = loadQuotes();
    var existingRevs = 0;
    Object.keys(allQuotes).forEach(function(k){
      var q = allQuotes[k];
      if(q.parentQuoteId === parent.id && q.typeDocument === 'revision') existingRevs += 1;
    });
    var revNum = existingRevs + 1;

    /* Clone profond du parent (sections + lignes), avec nouveaux ids */
    var revision = createQuoteFromTemplate('tpl_aj_vide', parent.clientId);
    if(!revision) return null;
    revision.typeDocument = 'revision';
    revision.title = parent.title;
    revision.sections = JSON.parse(JSON.stringify(parent.sections || []));
    /* Régénère ids pour éviter collision */
    revision.sections.forEach(function(sec){
      sec.id = uid('s_');
      (sec.lines || []).forEach(function(ln){ ln.id = uid('l_'); });
    });
    revision.clientInfo = JSON.parse(JSON.stringify(parent.clientInfo || {}));
    revision.chantierInfo = JSON.parse(JSON.stringify(parent.chantierInfo || {}));
    revision.vatRate = parent.vatRate;
    revision.depositRate = parent.depositRate;
    revision.showDiscountColumn = parent.showDiscountColumn;
    revision.optionsIncludedInTotal = parent.optionsIncludedInTotal;
    revision.parentQuoteId = parent.id;
    revision.parentOfficialNumber = parent.officialNumber;
    revision.revisionNumber = String(revNum);
    revision.revisionDate = todayISO();
    recomputeNumbers(revision);
    saveQuote(revision);
    return revision;
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
    /* Devis émis : refuse toute persistance (Session 16) */
    if(quote.locked){
      console.warn('[AJ Quotes] persist rejeté — devis verrouillé', quote.officialNumber);
      return;
    }
    recomputeNumbers(quote);
    computeQuoteTotals(quote);
    saveQuote(quote);
  }

  /* Helper : refuse l'édition si le devis est verrouillé (émis).
     Affiche un toast informatif. Retourne true si éditable, false sinon. */
  function _assertEditable(quote){
    if(!quote) return false;
    if(quote.locked){
      var msg = '🔒 Ce devis est émis (n° ' + (quote.officialNumber || '?') + ') — non modifiable. Pour corriger, créez un avenant ou une révision.';
      if(typeof showToast === 'function') showToast(msg);
      else alert(msg);
      return false;
    }
    return true;
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
          var totals = q.locked && q.totalsAtEmission ? q.totalsAtEmission : computeQuoteTotals(q);
          var typeDef = K.QUOTE_DOC_TYPES.find(function(d){ return d.id === q.typeDocument; });
          var typeLabel = typeDef ? typeDef.label : 'Devis';
          var dateFR = isoToFR(q.quoteDate);
          var nbLines = (q.sections || []).reduce(function(n, s){ return n + (s.lines || []).length; }, 0);
          var lockedBadge = q.locked
            ? '<span style="display:inline-block;background:#1d4d33;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;margin-left:6px;letter-spacing:0.4px;text-transform:uppercase;">🔒 Émis</span>'
            : '<span style="display:inline-block;background:rgba(122,136,150,0.12);color:#7a8896;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;margin-left:6px;letter-spacing:0.4px;text-transform:uppercase;">Brouillon</span>';
          var parentRef = q.parentOfficialNumber
            ? '<div style="font-size:11px;color:#7a5a30;margin-top:2px;">Lié au devis ' + esc(q.parentOfficialNumber) + '</div>'
            : '';
          /* Bouton suppression masqué pour les devis émis (intégrité légale) */
          var deleteBtn = q.locked
            ? ''
            : '<button class="ajqe-line__icon ajqe-line__icon--danger" title="Supprimer" ' +
              'onclick="event.stopPropagation();AJQuotes.deleteQuote(\'' + esc(q.id) + '\')" ' +
              'style="margin-left:8px;font-size:16px;">🗑</button>';
          return '<div class="ajqe-listcard" onclick="AJQuotes.openEditor(\'' + esc(q.id) + '\')">' +
            '<div class="ajqe-listcard__icon">' + (q.typeDocument === 'amendment' ? '📑' : (q.typeDocument === 'revision' ? '✏️' : '📄')) + '</div>' +
            '<div class="ajqe-listcard__body">' +
              '<div class="ajqe-listcard__title">' + esc(typeLabel) + ' n° ' + esc(q.quoteNumber || '—') + lockedBadge + '</div>' +
              '<div class="ajqe-listcard__sub">' + esc(dateFR) + ' · ' + nbLines + ' ligne' + (nbLines > 1 ? 's' : '') + ' · ' + esc(q.title || 'Sans titre') + '</div>' +
              parentRef +
            '</div>' +
            '<div class="ajqe-listcard__total">' + fmtMoney(totals.totalTTC) + ' €' +
              '<div style="font-size:10px;color:#7a8896;font-family:Inter,sans-serif;font-weight:500;text-align:right;margin-top:2px;">TTC</div>' +
            '</div>' +
            deleteBtn +
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
        /* Header minimal — juste un retour à la liste, le numéro de devis
           est désormais affiché et éditable directement dans le document A4 */
        '<div class="ajq-edit-topbar" data-edit-only style="display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap;">' +
          '<button class="ajqe-btn" onclick="AJQuotes.backToList()">← Liste des devis</button>' +
          '<div style="flex:1"></div>' +
          (_state.activeView === 'print'
            ? ''
            : '<span style="font-size:11px;color:#7a8896;font-style:italic">' +
                '💡 Clique directement sur le numéro, le titre, les lignes ou les prix pour les modifier' +
              '</span>') +
        '</div>' +
        '<div id="ajq-view-body"></div>' +
      '</div>';

    if(_state.activeView === 'print') renderPreviewView();
    else renderEditView();
  }

  /* ─────────────────────────────────────────────────────────────────
     VUE ÉDITION (Session 23 — refonte) : document A4 éditable directement
     Au lieu d'un formulaire séparé, l'utilisateur clique directement
     dans le devis pour modifier numéro, titre, lignes, prix, etc.
     C'est le MÊME composant visuel que la vue aperçu, juste avec des
     contrôles d'édition discrets visibles au survol.
     ───────────────────────────────────────────────────────────────── */
  function renderEditView(){
    var quote = getCurrentQuote();
    if(!quote) return;
    var view = document.getElementById('ajq-view-body');
    if(!view) return;
    /* Document A4 unifié rendu en mode 'edit' */
    renderUnifiedDocument(view, quote, 'edit');
  }

  /* Désactive en lecture-seule tous les contrôles dans la vue édition.
     Sont préservés : les boutons explicitement marqués `data-keep-locked` (Avenant, Révision, Aperçu) */
  function _applyLockedReadonly(rootEl){
    if(!rootEl) return;
    var inputs = rootEl.querySelectorAll('input, textarea, select, [contenteditable="true"]');
    inputs.forEach(function(el){
      if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'){
        el.disabled = true;
      } else {
        el.setAttribute('contenteditable', 'false');
      }
      el.style.cursor = 'not-allowed';
    });
    /* Boutons d'action interne (ajout/suppression/déplacement) : on les masque */
    rootEl.querySelectorAll('.ajqe-line__icon, .ajqe-section__addline, .ajqe-addsection, .ajq-row-controls, .ajq-section-controls').forEach(function(b){
      b.style.display = 'none';
    });
    /* Boutons "Marquer option / Masquer / Supprimer section" dans la barre de section */
    rootEl.querySelectorAll('.ajqe-section__actions .ajqe-btn').forEach(function(b){
      b.style.display = 'none';
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     SESSION 23 — DOCUMENT UNIFIÉ A4 (mode 'edit' OU 'print')
     ─────────────────────────────────────────────────────────────────
     Un seul composant, deux modes :
     - mode 'edit'  : champs éditables directement, contrôles au survol,
                      sticky bar totaux + actions principales, pas de
                      "@media print" appliqué (couleurs visibles)
     - mode 'print' : tout figé, aucun contrôle, prêt à imprimer
     ───────────────────────────────────────────────────────────────── */
  function renderUnifiedDocument(view, quote, mode){
    ensureCSSLoaded();
    var totals = computeQuoteTotals(quote);
    var company = quote.companyInfo ? Object.assign({}, K.AJ_PRO_COMPANY, quote.companyInfo) : K.AJ_PRO_COMPANY;
    var typeDef = K.QUOTE_DOC_TYPES.find(function(d){ return d.id === quote.typeDocument; }) || K.QUOTE_DOC_TYPES[0];
    var html = '';

    /* Toolbar + bandeau verrouillé en mode edit uniquement */
    if(mode === 'edit'){
      html += '<div class="ajq-edit-toolbar" data-edit-only>';

      /* Bandeau verrouillé (Session 16) — devis émis */
      if(quote.locked){
        var emittedDate = quote.emittedAt ? new Date(quote.emittedAt) : null;
        var dateStr = emittedDate
          ? String(emittedDate.getDate()).padStart(2,'0') + '/' +
            String(emittedDate.getMonth()+1).padStart(2,'0') + '/' +
            emittedDate.getFullYear()
          : '';
        html +=
          '<div class="ajqe-locked-banner">' +
            '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">' +
              '<div style="font-size:24px;">🔒</div>' +
              '<div style="flex:1;min-width:200px;">' +
                '<div style="font-weight:700;font-size:14px;color:#0f2030;">Devis officiel émis — non modifiable</div>' +
                '<div style="font-size:12px;color:#3a4a5c;margin-top:2px;line-height:1.5;">' +
                  'N° ' + esc(quote.officialNumber || '?') +
                  (dateStr ? ' · Émis le ' + esc(dateStr) : '') +
                  ' · Pour corriger : créer un avenant ou une révision' +
                '</div>' +
              '</div>' +
              '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
                '<button class="ajqe-btn" onclick="AJQuotes.createAmendmentFromCurrent()">📑 Avenant</button>' +
                '<button class="ajqe-btn" onclick="AJQuotes.createRevisionFromCurrent()">✏️ Révision</button>' +
              '</div>' +
            '</div>' +
          '</div>';
      }

      /* Mini bar : taux TVA + acompte + colonne remise + mode print */
      html +=
        '<div class="ajq-edit-quickbar">' +
          '<label class="ajq-edit-quickbar__field"><span>Type</span><select onchange="AJQuotes.setField(\'typeDocument\', this.value)">' +
            K.QUOTE_DOC_TYPES.map(function(t){ return '<option value="' + t.id + '"' + (quote.typeDocument === t.id ? ' selected' : '') + '>' + t.label + '</option>'; }).join('') +
          '</select></label>' +
          '<label class="ajq-edit-quickbar__field"><span>Validité</span><input type="date" value="' + esc(quote.validityDate || '') + '" onchange="AJQuotes.setField(\'validityDate\', this.value)" /></label>' +
          '<label class="ajq-edit-quickbar__field"><span>TVA %</span><input type="number" step="0.5" min="0" value="' + esc(quote.vatRate) + '" onchange="AJQuotes.setField(\'vatRate\', this.value, true)" /></label>' +
          '<label class="ajq-edit-quickbar__field"><span>Acompte %</span><input type="number" step="1" min="0" value="' + esc(quote.depositRate) + '" onchange="AJQuotes.setField(\'depositRate\', this.value, true)" /></label>' +
          '<label class="ajq-edit-quickbar__check"><input type="checkbox"' + (quote.showDiscountColumn ? ' checked' : '') + ' onchange="AJQuotes.setField(\'showDiscountColumn\', this.checked)" /> Colonne remise</label>' +
          '<label class="ajq-edit-quickbar__check"><input type="checkbox"' + (quote.optionsIncludedInTotal ? ' checked' : '') + ' onchange="AJQuotes.setField(\'optionsIncludedInTotal\', this.checked)" /> Options dans total</label>' +
          '<button class="ajqe-btn ajqe-btn--gold-outline" onclick="AJQuotes.setView(\'print\')" title="Mode aperçu / impression : masque les contrôles">📄 Mode impression</button>' +
        '</div>';

      html += '</div>'; /* /.ajq-edit-toolbar */
    } else {
      /* Mode print : juste une mini-barre haut avec retour édition + impression */
      html +=
        '<div class="ajq-print-toolbar" data-edit-only>' +
          '<button class="ajqe-btn" onclick="AJQuotes.setView(\'edit\')">← Mode édition</button>' +
          '<button class="ajqe-btn ajqe-btn--gold-outline" onclick="window.print()">🖨 Imprimer</button>' +
          (quote.locked
            ? '<span style="background:#1d4d33;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;letter-spacing:0.4px;">🔒 ÉMIS</span>'
            : '<span style="background:rgba(122,136,150,0.18);color:#3a4a5c;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;letter-spacing:0.4px;">BROUILLON</span>') +
        '</div>';
    }

    /* DOCUMENT A4 unifié (3 pages logiques : travaux + totaux + CGV) */
    html +=
      '<div class="ajq-preview-shell" data-mode="' + mode + '">' +
        renderPreviewPageTravaux(quote, company, typeDef, totals, mode) +
        renderPreviewPageTotaux(quote, company, typeDef, totals, mode) +
        renderPreviewPageCGV(quote, company, mode) +
      '</div>';

    /* Sticky bar totaux + bouton émission (mode edit uniquement) */
    if(mode === 'edit' && !quote.locked){
      html +=
        '<div class="ajqe-totalsbar" data-edit-only>' +
          '<div class="ajqe-totalsbar__col">' +
            '<div class="ajqe-totalsbar__lab">Total HT</div>' +
            '<div class="ajqe-totalsbar__val">' + fmtMoney(totals.totalHT) + ' €</div>' +
          '</div>' +
          '<div class="ajqe-totalsbar__col">' +
            '<div class="ajqe-totalsbar__lab">TVA ' + fmtQtyShort(totals.vatRate) + '%</div>' +
            '<div class="ajqe-totalsbar__val">' + fmtMoney(totals.vat) + ' €</div>' +
          '</div>' +
          '<div class="ajqe-totalsbar__col">' +
            '<div class="ajqe-totalsbar__lab">Total TTC</div>' +
            '<div class="ajqe-totalsbar__val ajqe-totalsbar__val--gold">' + fmtMoney(totals.totalTTC) + ' €</div>' +
          '</div>' +
          '<div class="ajqe-totalsbar__col">' +
            '<div class="ajqe-totalsbar__lab">Acompte ' + fmtQtyShort(totals.depositRate) + '%</div>' +
            '<div class="ajqe-totalsbar__val">' + fmtMoney(totals.deposit) + ' €</div>' +
          '</div>' +
          (totals.optionsTotalHT
            ? '<div class="ajqe-totalsbar__col">' +
                '<div class="ajqe-totalsbar__lab">Options HT (hors total)</div>' +
                '<div class="ajqe-totalsbar__val" style="color:#d8c595;">' + fmtMoney(totals.optionsTotalHT) + ' €</div>' +
              '</div>'
            : '') +
          '<div class="ajqe-totalsbar__actions">' +
            '<button class="ajqe-btn ajqe-btn--primary" onclick="AJQuotes.emitCurrent()" title="Verrouille le devis avec un n° officiel chronologique strict (irréversible)">📋 Émettre devis officiel</button>' +
          '</div>' +
        '</div>';
    }

    view.innerHTML = html;

    /* Listeners d'édition globaux (event delegation) — uniquement en mode edit */
    if(mode === 'edit' && !quote.locked){
      _attachEditListeners(view);
    }
    /* Lecture seule visuelle si verrouillé */
    if(quote.locked){
      _applyLockedReadonly(view);
    }
  }

  /* Ajout / suppression de section depuis la vue unifiée */
  function _renderAddSectionRow(quote){
    return '<tr class="ajq-row--add-section" data-edit-only>' +
      '<td colspan="99" style="text-align:center;padding:8mm 4mm;">' +
        '<button class="ajqe-btn" onclick="AJQuotes.addSection()" style="font-size:11px;">+ Ajouter une section</button>' +
      '</td>' +
    '</tr>';
  }

  /* ─────────────────────────────────────────────────────────────────
     LISTENERS D'ÉDITION (event delegation sur le container racine)
     ───────────────────────────────────────────────────────────────── */
  function _attachEditListeners(container){
    if(container.__ajq_edit_listeners) return; /* déjà attaché */
    container.__ajq_edit_listeners = true;

    /* Capture sur blur : sauvegarde la valeur modifiée */
    container.addEventListener('blur', function(e){
      var t = e.target;
      if(!t || !t.dataset || !t.dataset.edPath) return;
      var path = t.dataset.edPath;
      var isNumber = t.dataset.edNumber === '1';
      var value;
      if(t.tagName === 'INPUT' || t.tagName === 'SELECT'){
        value = t.type === 'checkbox' ? t.checked : t.value;
      } else {
        value = t.textContent;
      }
      _applyEdit(path, value, isNumber);
    }, true);

    /* Entrée → sortie du champ pour les inputs simples (pas multi-ligne) */
    container.addEventListener('keydown', function(e){
      var t = e.target;
      if(!t || !t.dataset || !t.dataset.edPath) return;
      if(e.key === 'Enter' && t.dataset.edMulti !== '1'){
        e.preventDefault();
        if(t.blur) t.blur();
      }
      if(e.key === 'Escape') t.blur();
    });
  }

  /* Applique la modification au quote courant et persiste.
     Path syntax :
       'quoteNumber'                            → quote.quoteNumber
       'title' / 'vatRate' / 'depositRate' / 'showDiscountColumn'
       'clientInfo.attentionA' / 'chantierInfo.adresse'
       'section.{secId}.title' / 'section.{secId}.isOption'
       'line.{lineId}.designation' / 'line.{lineId}.quantity'
       'line.{lineId}.unit' / 'line.{lineId}.unitPriceHT' / 'line.{lineId}.discountPercent'
       'line.{lineId}.description'
  */
  function _applyEdit(path, value, isNumber){
    var quote = getCurrentQuote(); if(!quote || quote.locked) return;
    if(isNumber) value = parseNum(value);

    if(path.indexOf('section.') === 0){
      var pp = path.split('.'); var secId = pp[1]; var field = pp.slice(2).join('.');
      var sec = (quote.sections||[]).find(function(s){return s.id===secId;});
      if(!sec) return;
      sec[field] = value;
    } else if(path.indexOf('line.') === 0){
      var pp2 = path.split('.'); var lineId = pp2[1]; var field2 = pp2.slice(2).join('.');
      var found = null;
      (quote.sections||[]).forEach(function(sec){
        (sec.lines||[]).forEach(function(ln){ if(ln.id === lineId) found = ln; });
      });
      if(!found) return;
      /* Si l'utilisateur tape un PUHT : on efface remise pour éviter recalcul incohérent */
      if(field2 === 'unitPriceHT'){
        found.unitPriceBeforeDiscount = null;
        found.discountPercent = 0;
      }
      found[field2] = value;
    } else if(path.indexOf('clientInfo.') === 0){
      quote.clientInfo = quote.clientInfo || {};
      quote.clientInfo[path.slice('clientInfo.'.length)] = value;
    } else if(path.indexOf('chantierInfo.') === 0){
      quote.chantierInfo = quote.chantierInfo || {};
      quote.chantierInfo[path.slice('chantierInfo.'.length)] = value;
    } else {
      quote[path] = value;
    }
    persistCurrent(quote);
    /* Re-render léger : on relance le rendu actuel (mode courant) sans
       perdre la sélection si possible. Le coût de rendu est faible. */
    renderEditorScreen();
  }

  /* Désactive en lecture-seule tous les contrôles dans la vue édition.
     Sont préservés : les boutons explicitement marqués `data-keep-locked` (Avenant, Révision, Aperçu) */
  function _applyLockedReadonly(rootEl){
    if(!rootEl) return;
    var inputs = rootEl.querySelectorAll('input, textarea, select');
    inputs.forEach(function(el){
      el.disabled = true;
      el.style.cursor = 'not-allowed';
    });
    /* Boutons d'action interne (ajout/suppression/déplacement) : on les masque */
    rootEl.querySelectorAll('.ajqe-line__icon, .ajqe-section__addline, .ajqe-addsection').forEach(function(b){
      b.style.display = 'none';
    });
    /* Boutons "Marquer option / Masquer / Supprimer section" dans la barre de section */
    rootEl.querySelectorAll('.ajqe-section__actions .ajqe-btn').forEach(function(b){
      b.style.display = 'none';
    });
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
      '<button class="ajqe-section__addline" onclick="AJQuotes.addLine(\'' + esc(sec.id) + '\')">+ Ajouter une ligne vide</button>' +
      '<button class="ajqe-section__addline" onclick="AJQuotes.openLibraryPicker(\'' + esc(sec.id) + '\')" style="margin-top:-4px;background:#faf3df;border-color:#c9a96e;color:#7a5a30;">📚 + Depuis la bibliothèque AJ Pro</button>' +
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
  /* Session 23 — accepte 'edit' / 'print' (et 'preview' alias 'print' pour
     rétrocompat). Le rendu est unifié, seul le mode change. */
  function setView(view){
    if(view === 'preview') view = 'print';
    _state.activeView = view;
    /* Re-render complet — l'overhead est faible et garantit la cohérence */
    renderEditorScreen();
  }

  function setField(field, value, isNumber){
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
    if(isNumber) value = parseNum(value);
    quote[field] = value;
    /* Effets de bord : si on change le type, mettre à jour le titre par défaut éventuel */
    persistCurrent(quote);
    renderEditorScreen();
  }

  function setClientField(field, value){
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
    quote.clientInfo = quote.clientInfo || {};
    quote.clientInfo[field] = value;
    persistCurrent(quote);
  }

  function setChantierField(field, value){
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
    quote.chantierInfo = quote.chantierInfo || {};
    quote.chantierInfo[field] = value;
    persistCurrent(quote);
  }

  function setSectionField(secId, field, value){
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec) return;
    sec[field] = value;
    persistCurrent(quote);
    renderEditView();
  }

  function setLineField(secId, lineId, field, value, isNumber){
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
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
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec) return;
    var ln = (sec.lines || []).find(function(l){ return l.id === lineId; });
    if(!ln) return;
    ln[flag] = !ln[flag];
    persistCurrent(quote);
    renderEditView();
  }

  function toggleLineVisible(secId, lineId){
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec) return;
    var ln = (sec.lines || []).find(function(l){ return l.id === lineId; });
    if(!ln) return;
    ln.visible = ln.visible === false ? true : false;
    persistCurrent(quote);
    renderEditView();
  }

  function moveLine(secId, lineId, delta){
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
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
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
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
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec || !sec.lines) return;
    if(!confirm('Supprimer cette ligne ?')) return;
    sec.lines = sec.lines.filter(function(l){ return l.id !== lineId; });
    persistCurrent(quote);
    renderEditView();
  }

  function addLine(secId, type){
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
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

  /* ─────────────────────────────────────────────────────────────────
     BIBLIOTHÈQUE DE LIGNES TYPES — picker modale (Session 17)
     ───────────────────────────────────────────────────────────────── */
  var _libraryPickerState = {
    targetSectionId: null,
    activeCategory: null,
    searchTerm: ''
  };

  function openLibraryPicker(secId){
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
    _libraryPickerState.targetSectionId = secId;
    _libraryPickerState.activeCategory = K.getLibraryCategories()[0] || null;
    _libraryPickerState.searchTerm = '';
    renderLibraryPicker();
  }

  function closeLibraryPicker(){
    _libraryPickerState.targetSectionId = null;
    var modal = document.getElementById('ajq-library-modal');
    if(modal && modal.parentNode) modal.parentNode.removeChild(modal);
  }

  function setLibraryCategory(cat){
    _libraryPickerState.activeCategory = cat;
    renderLibraryPicker();
  }

  function setLibrarySearch(term){
    _libraryPickerState.searchTerm = term || '';
    renderLibraryPickerList();
  }

  function addLineFromLibrary(libId){
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
    var secId = _libraryPickerState.targetSectionId;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec){ closeLibraryPicker(); return; }
    var ln = K.buildLineFromLibrary(libId);
    if(!ln){ alert('Ligne introuvable dans la bibliothèque'); return; }
    sec.lines = sec.lines || [];
    ln.order = sec.lines.length;
    sec.lines.push(ln);
    persistCurrent(quote);
    /* Garde la modale ouverte pour permettre l'insertion de plusieurs lignes d'un coup */
    renderLibraryPickerList(); /* rafraîchit juste la liste, pas la modale entière */
    renderEditView();
    /* Mais après render, le DOM modal a été préservé — on force une re-extraction */
    if(!document.getElementById('ajq-library-modal')) renderLibraryPicker();
  }

  function _filteredLibrary(){
    var lib = K.QUOTE_LINE_LIBRARY;
    var term = (_libraryPickerState.searchTerm || '').toLowerCase().trim();
    var cat = _libraryPickerState.activeCategory;
    return lib.filter(function(l){
      if(cat && l.category !== cat) return false;
      if(!term) return true;
      var hay = (l.designation + ' ' + (l.description || '')).toLowerCase();
      return hay.indexOf(term) !== -1;
    });
  }

  function renderLibraryPicker(){
    /* Crée la modale si absente */
    var modal = document.getElementById('ajq-library-modal');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'ajq-library-modal';
      modal.className = 'ajq-modal-backdrop';
      modal.addEventListener('click', function(e){
        if(e.target === modal) closeLibraryPicker();
      });
      document.body.appendChild(modal);
    }
    var cats = K.getLibraryCategories();
    var catChips = cats.map(function(c){
      var n = K.QUOTE_LINE_LIBRARY.filter(function(l){ return l.category === c; }).length;
      var active = c === _libraryPickerState.activeCategory;
      return '<button class="ajq-libcat' + (active ? ' active' : '') + '" onclick="AJQuotes.setLibraryCategory(\'' + esc(c).replace(/'/g, "\\'") + '\')">' +
        esc(c) + ' <span style="opacity:0.6;font-weight:500;">' + n + '</span>' +
      '</button>';
    }).join('');

    modal.innerHTML =
      '<div class="ajq-modal" style="max-width:780px;">' +
        '<div class="ajq-modal-head">' +
          '<div>' +
            '<div style="font-family:\'Cormorant Garamond\',Georgia,serif;font-size:22px;font-weight:600;color:#0f2030;">📚 Bibliothèque de lignes AJ Pro</div>' +
            '<div style="font-size:12.5px;color:#7a8896;margin-top:2px;">Cliquez sur une ligne pour l\'ajouter au devis. La modale reste ouverte pour en ajouter plusieurs.</div>' +
          '</div>' +
          '<button class="ajqe-btn" onclick="AJQuotes.closeLibraryPicker()">✕ Fermer</button>' +
        '</div>' +
        '<div style="padding:12px 18px;border-bottom:1px solid #e8e4d6;">' +
          '<input id="ajq-libsearch" class="ajqe-meta__input" placeholder="🔍 Rechercher dans la bibliothèque…" ' +
            'value="' + esc(_libraryPickerState.searchTerm) + '" ' +
            'oninput="AJQuotes.setLibrarySearch(this.value)" style="width:100%" />' +
          '<div class="ajq-libcats">' + catChips + '</div>' +
        '</div>' +
        '<div id="ajq-library-list" class="ajq-library-list"></div>' +
      '</div>';
    renderLibraryPickerList();
  }

  function renderLibraryPickerList(){
    var list = document.getElementById('ajq-library-list');
    if(!list) return;
    var items = _filteredLibrary();
    if(!items.length){
      list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#7a8896;font-size:13px;">Aucune ligne ne correspond à votre recherche.</div>';
      return;
    }
    list.innerHTML = items.map(function(l){
      var priceLbl = (l.defaultPrice === 0)
        ? '<span style="color:#7a8896;">0 €</span>'
        : fmtMoney(l.defaultPrice) + ' €';
      var supplyBadge = l.defaultSuppliedBy
        ? '<span style="background:rgba(13,70,144,0.10);color:#0d4690;font-size:10px;font-weight:600;padding:1px 6px;border-radius:99px;margin-left:6px;">' + (l.defaultSuppliedBy === 'aj_pro' ? 'AJ Pro' : (l.defaultSuppliedBy === 'client' ? 'Client' : '?')) + '</span>'
        : '';
      var statusBadge = (l.defaultStatus === 'option')
        ? '<span style="background:rgba(232,98,26,0.15);color:#9a4514;font-size:10px;font-weight:700;padding:1px 6px;border-radius:99px;margin-left:6px;letter-spacing:0.4px;">OPTION</span>'
        : '';
      var commentBadge = (l.defaultType === 'comment')
        ? '<span style="background:rgba(122,136,150,0.15);color:#3a4a5c;font-size:10px;font-weight:600;padding:1px 6px;border-radius:99px;margin-left:6px;font-style:italic;">commentaire</span>'
        : '';
      var descHtml = l.description
        ? '<div style="font-size:11.5px;color:#3a4a5c;margin-top:3px;white-space:pre-line;line-height:1.4;">' + esc(l.description) + '</div>'
        : '';
      return '<div class="ajq-libitem" onclick="AJQuotes.addLineFromLibrary(\'' + esc(l.id) + '\')">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-weight:600;color:#0f2030;font-size:13px;line-height:1.4;">' + esc(l.designation) + statusBadge + supplyBadge + commentBadge + '</div>' +
          descHtml +
        '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0;margin-left:14px;">' +
          '<div style="font-weight:700;color:#0f2030;font-size:13px;">' + priceLbl + '</div>' +
          '<div style="font-size:10.5px;color:#7a8896;">' + fmtQtyShort(l.defaultQty) + ' ' + esc(l.defaultUnit) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function addSection(){
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
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
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec) return;
    if(!confirm('Supprimer la section « ' + (sec.title || '') + ' » et toutes ses lignes ?')) return;
    quote.sections = quote.sections.filter(function(s){ return s.id !== secId; });
    persistCurrent(quote);
    renderEditView();
  }

  function moveSection(secId, delta){
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
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
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
    var sec = (quote.sections || []).find(function(s){ return s.id === secId; });
    if(!sec) return;
    sec.isOption = !sec.isOption;
    sec.optionLabel = sec.isOption ? 'Option' : '';
    persistCurrent(quote);
    renderEditView();
  }

  function toggleSectionVisible(secId){
    var quote = getCurrentQuote(); if(!_assertEditable(quote)) return;
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
    var q = getQuote(id);
    if(q && q.locked){
      alert('Ce devis est officiellement émis (n° ' + (q.officialNumber || '?') + ') et ne peut pas être supprimé. C\'est une exigence légale (intégrité de la chronologie des devis).');
      return;
    }
    if(!confirm('Supprimer définitivement ce devis ?')) return;
    deleteQuote(id);
    renderListScreen();
  }

  /* ─────────────────────────────────────────────────────────────────
     ÉMISSION & DÉRIVATION — handlers UI (Session 16)
     ───────────────────────────────────────────────────────────────── */
  function emitCurrent(){
    var q = getCurrentQuote();
    if(!q){ alert('Aucun devis ouvert'); return; }
    if(q.locked){ alert('Devis déjà émis'); return; }
    var totals = computeQuoteTotals(q);
    var typeDef = K.QUOTE_DOC_TYPES.find(function(d){ return d.id === q.typeDocument; });
    var label = typeDef ? typeDef.label : 'Devis';
    var msg =
      '⚠ Émission officielle du ' + label.toLowerCase() + '\n\n' +
      'Cette action est IRRÉVERSIBLE :\n' +
      '• Le devis sera figé avec un numéro officiel chronologique strict.\n' +
      '• Plus aucune modification ne sera possible (label, prix, lignes…).\n' +
      '• Pour corriger : il faudra créer un avenant ou une révision.\n\n' +
      'Total TTC : ' + fmtMoney(totals.totalTTC) + ' €\n\n' +
      'Confirmer l\'émission ?';
    if(!confirm(msg)) return;

    var res = emitQuote(q.id);
    if(!res.ok){
      alert('Émission impossible : ' + res.error);
      return;
    }
    alert('✅ Devis émis avec le numéro officiel ' + res.officialNumber + '.\n\nIl est désormais verrouillé.');
    /* Re-render — quote est désormais locked */
    renderEditorScreen();
  }

  function createAmendmentFromCurrent(){
    var q = getCurrentQuote();
    if(!q){ alert('Aucun devis ouvert'); return; }
    if(!q.locked){ alert('Le devis doit d\'abord être émis officiellement avant de créer un avenant.'); return; }
    var amendment = createAmendmentFrom(q.id);
    if(!amendment) return;
    openEditor(amendment.id);
  }

  function createRevisionFromCurrent(){
    var q = getCurrentQuote();
    if(!q){ alert('Aucun devis ouvert'); return; }
    if(!q.locked){ alert('Le devis doit d\'abord être émis officiellement avant de créer une révision.'); return; }
    var revision = createRevisionFrom(q.id);
    if(!revision) return;
    openEditor(revision.id);
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
    /* Session 23 — la vue aperçu utilise maintenant le même composant unifié
       en mode 'print' : aucune duplication, mêmes helpers, rendu identique
       au mode édition mais sans les contrôles. */
    renderUnifiedDocument(view, quote, 'print');
  }

  /* ─────────────────────────────────────────────────────────────────
     SESSION 23 — Helpers d'édition inline (champs invisibles en print)
     ───────────────────────────────────────────────────────────────── */
  /* Champ texte : statique en print, contenteditable en edit */
  function _ed(value, dataPath, mode, opts){
    opts = opts || {};
    var safe = esc(value || '');
    if(mode !== 'edit'){
      return safe || (opts.placeholder ? '<span style="color:#bbb;font-style:italic">' + esc(opts.placeholder) + '</span>' : '');
    }
    var classes = 'ajq-ed' + (opts.multiline ? ' ajq-ed--multi' : '') + (opts.cls ? ' ' + opts.cls : '');
    var attrs = ' contenteditable="true" data-ed-path="' + esc(dataPath) + '"';
    if(opts.multiline) attrs += ' data-ed-multi="1"';
    if(opts.placeholder) attrs += ' data-ed-placeholder="' + esc(opts.placeholder) + '"';
    return '<span class="' + classes + '"' + attrs + '>' + safe + '</span>';
  }
  /* Champ nombre : input invisible en edit, texte plat en print */
  function _edNum(value, dataPath, mode, opts){
    opts = opts || {};
    var fmt = opts.format || function(v){ return v == null ? '' : esc(String(v)); };
    if(mode !== 'edit'){
      return fmt(value);
    }
    var classes = 'ajq-ed-num' + (opts.cls ? ' ' + opts.cls : '');
    return '<input type="number" class="' + classes + '" ' +
      'data-ed-path="' + esc(dataPath) + '" data-ed-number="1" ' +
      'value="' + esc(value == null ? '' : value) + '" ' +
      'step="' + (opts.step || '0.01') + '" ' +
      (opts.min !== undefined ? 'min="' + opts.min + '" ' : '') +
      (opts.placeholder ? 'placeholder="' + esc(opts.placeholder) + '" ' : '') +
    '/>';
  }

  function renderHeaderBlock(quote, company, pageNum, totalPages, mode){
    return '<div class="ajq-header">' +
      '<div class="ajq-header__line1">' +
        esc(company.raisonSociale) + ' ' + esc(company.capitalPretty) + ' - Tel : ' + esc(company.tel) + ' - Email : ' + esc(company.email) +
      '</div>' +
      '<div class="ajq-header__num">' + _ed(quote.quoteNumber, 'quoteNumber', mode, { placeholder:'D-2026XXXX', cls:'ajq-ed--num' }) + '</div>' +
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

  function renderDocTitle(quote, typeDef, mode){
    /* En mode edit : on rend "Devis n° " statique + le numéro éditable +
       " du " statique + la date dans un <input type="date"> stylé.
       En mode print : tout statique. */
    var dateFR = isoToFR(quote.quoteDate);
    var line1;
    if(mode === 'edit'){
      line1 = typeDef.titlePrefix + ' ' +
        _ed(quote.quoteNumber, 'quoteNumber', mode, { cls:'ajq-ed--num', placeholder:'D-2026XXXX' }) +
        ' du <input type="date" class="ajq-ed-date" data-ed-path="quoteDate" value="' + esc(quote.quoteDate || '') + '" />';
    } else {
      line1 = typeDef.titlePrefix + ' ' + esc(quote.quoteNumber || '') + (dateFR ? ' du ' + esc(dateFR) : '');
    }
    var revLine = '';
    if(quote.typeDocument === 'revision' && quote.revisionNumber){
      revLine = 'Révision n° ' + esc(quote.revisionNumber) + (quote.revisionDate ? ' du ' + esc(isoToFR(quote.revisionDate)) : '');
    }
    /* Référence au devis parent pour avenants/révisions */
    var parentLine = '';
    if(quote.parentOfficialNumber && (quote.typeDocument === 'amendment' || quote.typeDocument === 'revision')){
      var label = quote.typeDocument === 'amendment' ? 'Avenant au devis' : 'Révision du devis';
      parentLine = label + ' n° ' + esc(quote.parentOfficialNumber);
    }
    return '<div class="ajq-doctitle">' + line1 +
      (revLine ? '<div class="ajq-doctitle__revline">' + revLine + '</div>' : '') +
      (parentLine ? '<div class="ajq-doctitle__revline">' + parentLine + '</div>' : '') +
    '</div>';
  }

  function renderClientChantierBlocks(quote, company, mode){
    var ci = quote.clientInfo || {};
    var ch = quote.chantierInfo || {};

    /* ─── BLOC CHANTIER (gauche) ─── */
    var chantierShort = ch.nom || ch.shortName || '';
    var chantierBlock =
      '<div class="ajq-block">' +
        '<div class="ajq-block__title">Chantier : ' +
          _ed(chantierShort, 'chantierInfo.nom', mode, { placeholder:'(optionnel) ex: BOULAY' }) +
        '</div>' +
        '<div class="ajq-block__line">' +
          _ed(ch.adresse, 'chantierInfo.adresse', mode, { placeholder:'Adresse chantier' }) +
        '</div>' +
        '<div class="ajq-block__line">' +
          _ed(ch.codePostal, 'chantierInfo.codePostal', mode, { placeholder:'CP', cls:'ajq-ed--cp' }) + ' ' +
          _ed(ch.ville, 'chantierInfo.ville', mode, { placeholder:'Ville', cls:'ajq-ed--ville' }) +
        '</div>' +
        '<div class="ajq-block__line">' + esc(company.pays || 'France') + '</div>' +
        '<div class="ajq-block__travaux">Travaux : ' +
          _ed(quote.title, 'title', mode, { placeholder:'Titre des travaux (ex: Rénovation salle de douche)', multiline:true }) +
        '</div>' +
      '</div>';

    /* ─── BLOC AJ PRO (centre) ─── */
    var ajproName = (company.raisonSociale || 'AJ Pro Rénovation').replace(/^Sarl\s+/i, '');
    var ajproBlock =
      '<div class="ajq-block">' +
        '<div class="ajq-block__line ajq-block__line--bold">' + esc(ajproName) + '</div>' +
        '<div class="ajq-block__line">' + esc(company.adresse) + '</div>' +
        '<div class="ajq-block__line">' + esc((company.codePostal || '') + ' ' + (company.ville || '') + ' ' + (company.pays || 'France')).trim() + '</div>' +
        '<div class="ajq-block__line">Email : ' + esc(company.email) + '</div>' +
        '<div class="ajq-block__line">Tél : ' + esc(company.tel) + '</div>' +
        '<div class="ajq-block__rcs">' + esc(company.rcs) + '</div>' +
      '</div>';

    /* ─── BLOC CLIENT (droite) ─── */
    var civNomComplet = '';
    if(ci.attentionA) civNomComplet = ci.attentionA;
    else if(ci.civilite || ci.prenom || ci.nom){
      civNomComplet = ((ci.civilite || '') + ' ' + (ci.prenom || '') + ' ' + (ci.nom || '')).replace(/\s+/g, ' ').trim();
    }

    /* Construction unique d'une ligne accès (étage / ascenseur / code / interphone)
       — éditable champ par champ en mode edit */
    var accessLine = '';
    if(mode === 'edit'){
      var bits = [];
      bits.push(_ed(ch.etage, 'chantierInfo.etage', mode, { placeholder:'Étage', cls:'ajq-ed--inline' }));
      bits.push(_ed(ch.ascenseur, 'chantierInfo.ascenseur', mode, { placeholder:'Ascenseur', cls:'ajq-ed--inline' }));
      bits.push(_ed(ch.codeAccess, 'chantierInfo.codeAccess', mode, { placeholder:'Code', cls:'ajq-ed--inline' }));
      bits.push(_ed(ch.interphone, 'chantierInfo.interphone', mode, { placeholder:'Interphone', cls:'ajq-ed--inline' }));
      accessLine = bits.join(' - ');
    } else {
      var bitsP = [];
      if(ch.etage){
        var lAcces = ch.etage;
        if(ch.etage.indexOf('étage') === -1) lAcces += ' étage';
        bitsP.push(lAcces);
      }
      if(ch.ascenseur) bitsP.push(ch.ascenseur);
      if(ch.codeAccess) bitsP.push('Code ' + ch.codeAccess);
      if(ch.interphone) bitsP.push('Interphone ' + ch.interphone);
      accessLine = bitsP.length ? esc(bitsP.join(' - ')) : '';
    }

    var clientBlock =
      '<div class="ajq-block">' +
        '<div class="ajq-block__line ajq-block__line--bold">' +
          _ed(civNomComplet, 'clientInfo.attentionA', mode, { placeholder:'Mme/M. NOM Prénom' }) +
        '</div>' +
        (mode === 'edit'
          ? '<div class="ajq-block__line" style="font-size:8pt;">A l\'attention de ' +
              _ed(ci.attentionA, 'clientInfo.attentionA', mode, { placeholder:'Nom complet client' }) +
            '</div>'
          : (ci.attentionA ? '<div class="ajq-block__line">A l\'attention de ' + esc(ci.attentionA) + '</div>' : '')) +
        '<div class="ajq-block__line">' +
          _ed(ci.adresse, 'clientInfo.adresse', mode, { placeholder:'Adresse client' }) +
        '</div>' +
        '<div class="ajq-block__line">' + accessLine + '</div>' +
        '<div class="ajq-block__line">' +
          _ed(ci.codePostal, 'clientInfo.codePostal', mode, { placeholder:'CP', cls:'ajq-ed--cp' }) + ' ' +
          _ed(ci.ville, 'clientInfo.ville', mode, { placeholder:'Ville', cls:'ajq-ed--ville' }) + ' ' +
          esc(company.pays === 'France' ? 'France' : '') +
        '</div>' +
        '<div class="ajq-block__line" style="margin-top:1mm;">' +
          _ed(ci.tel, 'clientInfo.tel', mode, { placeholder:'Téléphone' }) +
        '</div>' +
        (mode === 'edit' || ci.email
          ? '<div class="ajq-block__line">' +
              _ed(ci.email, 'clientInfo.email', mode, { placeholder:'Email (optionnel)' }) +
            '</div>'
          : '') +
      '</div>';

    return '<div class="ajq-blocks">' + chantierBlock + ajproBlock + clientBlock + '</div>';
  }

  function renderPreviewPageTravaux(quote, company, typeDef, totals, mode){
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
      (mode === 'edit' ? '<th class="ajq-th-ctrl" data-edit-only></th>' : '') +
    '</tr></thead>';

    var colsHtml = '<colgroup>' +
      '<col class="num"/>' +
      '<col class="des"/>' +
      '<col class="qty"/>' +
      '<col class="unit"/>' +
      (withDiscount ? '<col class="pu"/><col class="disc"/>' : '') +
      '<col class="puht"/>' +
      '<col class="total"/>' +
      (mode === 'edit' ? '<col class="ctrl"/>' : '') +
    '</colgroup>';

    var body = '';
    /* totalCols = colonnes du document final (mode print).
       En mode edit on ajoute une colonne contrôles (gérée à part dans le colspan). */
    var totalCols = withDiscount ? 8 : 6;
    var sectionTitleColspan = totalCols - 1;
    var subtotalLabelColspan = totalCols - 1;

    quote.sections.forEach(function(sec){
      if(sec.visible === false && mode !== 'edit') return;

      /* Titre de section — éditable directement, mention Option inline */
      var titleHtml = _ed(sec.title, 'section.' + sec.id + '.title', mode, { placeholder:'Titre de section' });
      var optionInline = sec.isOption ? ' <span class="ajq-option-pill">Option</span>' : '';
      body +=
        '<tr class="ajq-row--section" data-section-id="' + esc(sec.id) + '">' +
          '<td class="num">' + esc(sec.number) + '</td>' +
          '<td class="des" colspan="' + sectionTitleColspan + '">' + titleHtml + optionInline + '</td>' +
          (mode === 'edit'
            ? '<td class="ajq-row-ctrl" data-edit-only>' +
                _renderSectionControls(sec) +
              '</td>'
            : '') +
        '</tr>';

      /* Lignes */
      (sec.lines || []).forEach(function(ln){
        if(ln.visible === false && mode !== 'edit') return;
        body += renderPreviewLineRow(ln, sec, withDiscount, mode);
      });

      /* Bouton "+" en fin de section pour ajouter une ligne (mode edit) */
      if(mode === 'edit'){
        body +=
          '<tr class="ajq-row--add-line" data-edit-only>' +
            '<td class="des" colspan="' + (totalCols) + '" style="text-align:left;padding:1mm 2mm;">' +
              '<button class="ajq-add-line-btn" onclick="AJQuotes.addLine(\'' + esc(sec.id) + '\')">+ ligne</button> ' +
              '<button class="ajq-add-line-btn" onclick="AJQuotes.addLine(\'' + esc(sec.id) + '\', \'comment\')">+ commentaire</button> ' +
              '<button class="ajq-add-line-btn ajq-add-line-btn--lib" onclick="AJQuotes.openLibraryPicker(\'' + esc(sec.id) + '\')">📚 + depuis bibliothèque</button>' +
            '</td>' +
            '<td data-edit-only></td>' +
          '</tr>';
      }

      /* Sous-total section */
      var subtotal = computeSectionSubtotal(sec, { optionsIncludedInTotal: !!quote.optionsIncludedInTotal });
      var subTotalDisplay = subtotal === 0 ? '' : fmtMoney(subtotal);
      var subtotalLabel = 'Sous-total ' + (sec.title || '') + (sec.isOption ? ' Option' : '');
      body +=
        '<tr class="ajq-row--subtotal">' +
          '<td class="des" colspan="' + subtotalLabelColspan + '">' + esc(subtotalLabel) + '</td>' +
          '<td class="total">' + esc(subTotalDisplay) + '</td>' +
          (mode === 'edit' ? '<td data-edit-only></td>' : '') +
        '</tr>';
    });

    /* Bouton "+ section" en fin de tableau (mode edit) */
    if(mode === 'edit' && !quote.locked){
      body +=
        '<tr class="ajq-row--add-section" data-edit-only>' +
          '<td colspan="' + (totalCols + 1) + '" style="text-align:center;padding:4mm 2mm;">' +
            '<button class="ajqe-btn" onclick="AJQuotes.addSection()">+ Ajouter une section</button>' +
          '</td>' +
        '</tr>';
    }

    var draftClass = quote.locked ? '' : ' ajq-page--draft';
    return '<div class="ajq-page' + draftClass + '">' +
      renderHeaderBlock(quote, company, 1, totalPages, mode) +
      renderActivitiesBlock(company) +
      renderDocTitle(quote, typeDef, mode) +
      renderClientChantierBlocks(quote, company, mode) +
      (mode === 'edit' || quote.title
        ? '<div class="ajq-worktitle">' +
            _ed(quote.title, 'title', mode, { placeholder:'Titre des travaux (ex: Rénovation salle de douche dans un logement)', multiline:true }) +
          '</div>'
        : '') +
      '<table class="ajq-table' + (withDiscount ? ' ajq-table--with-discount' : ' ajq-table--no-discount') + (mode === 'edit' ? ' ajq-table--editable' : '') + '">' +
        colsHtml +
        headersHtml +
        '<tbody>' + body + '</tbody>' +
      '</table>' +
    '</div>';
  }

  /* Mini menu de contrôles pour une section (option / masquer / supprimer / monter / descendre) */
  function _renderSectionControls(sec){
    return '<div class="ajq-row-controls">' +
      '<button class="ajq-rc-btn" title="Marquer ' + (sec.isOption ? 'comme essentiel' : 'comme option') + '" onclick="AJQuotes.toggleSectionOption(\'' + esc(sec.id) + '\')">' + (sec.isOption ? '★' : '☆') + '</button>' +
      '<button class="ajq-rc-btn" title="Monter cette section" onclick="AJQuotes.moveSection(\'' + esc(sec.id) + '\', -1)">▲</button>' +
      '<button class="ajq-rc-btn" title="Descendre cette section" onclick="AJQuotes.moveSection(\'' + esc(sec.id) + '\', 1)">▼</button>' +
      '<button class="ajq-rc-btn ajq-rc-btn--danger" title="Supprimer cette section" onclick="AJQuotes.deleteSection(\'' + esc(sec.id) + '\')">🗑</button>' +
    '</div>';
  }

  /* Mini menu de contrôles pour une ligne */
  function _renderLineControls(sec, ln){
    return '<div class="ajq-row-controls">' +
      '<button class="ajq-rc-btn" title="Monter" onclick="AJQuotes.moveLine(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\',-1)">▲</button>' +
      '<button class="ajq-rc-btn" title="Descendre" onclick="AJQuotes.moveLine(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\',1)">▼</button>' +
      '<button class="ajq-rc-btn" title="Dupliquer" onclick="AJQuotes.duplicateLine(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\')">⎘</button>' +
      '<button class="ajq-rc-btn" title="' + (ln.visible === false ? 'Afficher' : 'Masquer') + '" onclick="AJQuotes.toggleLineVisible(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\')">' + (ln.visible === false ? '👁' : '🙈') + '</button>' +
      '<button class="ajq-rc-btn ajq-rc-btn--danger" title="Supprimer" onclick="AJQuotes.deleteLine(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\')">🗑</button>' +
    '</div>';
  }

  function renderPreviewLineRow(ln, sec, withDiscount, mode){
    var rowClass = 'ajq-row--line';
    if(ln.type === 'comment') rowClass += ' ajq-row--comment';
    if(ln.status === 'option') rowClass += ' ajq-row--option';
    if(ln.status === 'excluded') rowClass += ' ajq-row--excluded';
    if(ln.visible === false) rowClass += ' ajq-row--hidden';
    if(ln.highlighted && ln.highlightColor === 'red') rowClass += ' ajq-row--highlight-red';

    /* Désignation + description (multi-lignes éditables) */
    var designationHtml = '<div class="ajq-line__designation">' +
      _ed(ln.designation, 'line.' + ln.id + '.designation', mode, { placeholder:'Désignation', multiline:true }) +
    '</div>';
    if(mode === 'edit' || ln.description){
      designationHtml += '<div class="ajq-line__description">' +
        _ed(ln.description, 'line.' + ln.id + '.description', mode, { placeholder:'Description longue (optionnelle)', multiline:true }) +
      '</div>';
    }
    /* Indication "fourni client" / "à confirmer" : auto-affiché en print uniquement */
    if(mode === 'print'){
      var dlow = ((ln.designation || '') + ' ' + (ln.description || '')).toLowerCase();
      if(ln.suppliedBy === 'client' && dlow.indexOf('fourni') === -1 && dlow.indexOf('client') === -1){
        designationHtml += '<div class="ajq-line__description">--&gt; fourni / client</div>';
      } else if(ln.suppliedBy === 'to_confirm' && dlow.indexOf('confirmer') === -1){
        designationHtml += '<div class="ajq-line__description">--&gt; à confirmer</div>';
      }
    } else {
      /* Mode edit : sélecteur status + suppliedBy compact sous la description */
      designationHtml += '<div class="ajq-line__editmeta" data-edit-only>' +
        '<select class="ajq-ed-select" onchange="AJQuotes.setLineField(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\',\'status\',this.value)">' +
          K.QUOTE_LINE_STATUSES.map(function(s){ return '<option value="' + s.id + '"' + (ln.status === s.id ? ' selected' : '') + '>' + esc(s.label) + '</option>'; }).join('') +
        '</select>' +
        '<select class="ajq-ed-select" onchange="AJQuotes.setLineField(\'' + esc(sec.id) + '\',\'' + esc(ln.id) + '\',\'suppliedBy\',this.value)">' +
          '<option value="">Fourniture : non spécifiée</option>' +
          K.QUOTE_SUPPLIED_BY.map(function(b){ return '<option value="' + b.id + '"' + (ln.suppliedBy === b.id ? ' selected' : '') + '>Fourni par : ' + esc(b.label) + '</option>'; }).join('') +
        '</select>' +
      '</div>';
    }

    /* Cellules numériques */
    var qtyCell, unitCell, puCells = '', puhtCell, totalCell;

    if(mode === 'edit' && ln.type !== 'comment'){
      qtyCell = '<td class="qty">' + _edNum(ln.quantity, 'line.' + ln.id + '.quantity', mode, { format: fmtQty, step:'0.01' }) + '</td>';
      unitCell = '<td class="unit"><input type="text" class="ajq-ed-num ajq-ed-num--unit" data-ed-path="line.' + esc(ln.id) + '.unit" value="' + esc(ln.unit || 'U') + '" /></td>';
      if(withDiscount){
        var pub = ln.unitPriceBeforeDiscount != null ? ln.unitPriceBeforeDiscount : ln.unitPriceHT;
        puCells += '<td class="pu">' + _edNum(pub, 'line.' + ln.id + '.unitPriceBeforeDiscount', mode, { format: fmtMoneyOrEmpty }) + '</td>';
        puCells += '<td class="disc">' + _edNum(ln.discountPercent || 0, 'line.' + ln.id + '.discountPercent', mode, { format: function(v){ return v ? fmtQty(v)+'%' : ''; } }) + '</td>';
      }
      puhtCell = '<td class="puht">' + _edNum(ln.unitPriceHT, 'line.' + ln.id + '.unitPriceHT', mode, { format: fmtMoneyOrEmpty }) + '</td>';
      /* Total : calculé, non éditable directement */
      var tDisp = ln.unitPriceHT === 0 && ln.totalHT === 0 ? (ln.allowZeroPrice ? '0,00' : '') : fmtMoney(ln.totalHT);
      totalCell = '<td class="total">' + esc(tDisp) + '</td>';
    } else if(ln.type === 'comment'){
      qtyCell = '<td class="qty"></td>';
      unitCell = '<td class="unit"></td>';
      if(withDiscount){ puCells = '<td class="pu"></td><td class="disc"></td>'; }
      puhtCell = '<td class="puht"></td>';
      totalCell = '<td class="total"></td>';
    } else {
      /* mode print, ligne normale */
      var qty = ln.quantity == null ? '' : fmtQty(ln.quantity);
      qtyCell = '<td class="qty">' + esc(qty) + '</td>';
      unitCell = '<td class="unit">' + esc(ln.unit || '') + '</td>';
      if(withDiscount){
        var pubP = ln.unitPriceBeforeDiscount != null ? ln.unitPriceBeforeDiscount : ln.unitPriceHT;
        puCells += '<td class="pu">' + fmtMoneyOrEmpty(pubP) + '</td>';
        puCells += '<td class="disc">' + (ln.discountPercent ? fmtQty(ln.discountPercent) + '%' : '') + '</td>';
      }
      puhtCell = '<td class="puht">' + esc(fmtMoneyOrEmpty(ln.unitPriceHT)) + '</td>';
      var tDispP;
      if(ln.unitPriceHT === 0 && ln.totalHT === 0){ tDispP = ln.allowZeroPrice ? '0,00' : ''; }
      else { tDispP = fmtMoney(ln.totalHT); }
      totalCell = '<td class="total">' + esc(tDispP) + '</td>';
    }

    return '<tr class="' + rowClass + '" data-line-id="' + esc(ln.id) + '">' +
      '<td class="num">' +
        (mode === 'edit'
          ? '<input type="text" class="ajq-ed-num ajq-ed-num--ord" data-ed-path="line.' + esc(ln.id) + '.numberOverride" value="' + esc(ln.numberOverride || ln.number || '') + '" placeholder="' + esc(ln.number || '') + '" />'
          : esc(ln.number || '')) +
      '</td>' +
      '<td class="des">' + designationHtml + '</td>' +
      qtyCell + unitCell + puCells + puhtCell + totalCell +
      (mode === 'edit'
        ? '<td class="ajq-row-ctrl" data-edit-only>' + _renderLineControls(sec, ln) + '</td>'
        : '') +
    '</tr>';
  }

  function renderPreviewPageTotaux(quote, company, typeDef, totals, mode){
    var totalPages = 3;
    var draftClass = quote.locked ? '' : ' ajq-page--draft';
    var validityFR = isoToFR(quote.validityDate);
    var depositPct = fmtQty(totals.depositRate);

    return '<div class="ajq-page' + draftClass + '">' +
      renderHeaderBlock(quote, company, 2, totalPages, mode) +
      /* Attestation TVA */
      '<div class="ajq-tva-attestation">' + esc(K.AJ_PRO_TVA_ATTESTATION) + '</div>' +
      /* Bloc totaux — style PDF AJ Pro : 2 colonnes (label, valeur) sans col EUR séparée */
      '<div class="ajq-totals">' +
        '<div class="ajq-totals__title">' + esc(typeDef.label) + ' (EUR)</div>' +
        '<div class="ajq-totals__grid">' +
          '<div class="ajq-totals__row">' +
            '<div class="lab">Total H.T</div>' +
            '<div class="val">' + fmtMoney(totals.totalHT) + '</div>' +
          '</div>' +
          '<div class="ajq-totals__row">' +
            '<div class="lab">TVA</div>' +
            '<div class="val">' + fmtMoney(totals.vat) + '</div>' +
          '</div>' +
          '<div class="ajq-totals__row ajq-totals__row--ttc">' +
            '<div class="lab">Total T.T.C</div>' +
            '<div class="val">' + fmtMoney(totals.totalTTC) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      /* Tableau TVA — petit tableau aligné droite comme PDFs (width réglé en CSS) */
      '<table class="ajq-tva-table">' +
        '<tr><th>% TVA</th><th>Base</th><th>Total TVA</th></tr>' +
        '<tr><td>' + fmtQty(totals.vatRate) + '</td><td>' + fmtMoney(totals.totalHT) + '</td><td>' + fmtMoney(totals.vat) + '</td></tr>' +
      '</table>' +
      /* Bloc règlement — date + mode règlement éditables en mode edit */
      '<div class="ajq-payment">' +
        '<div class="ajq-payment__row"><strong>Validité du devis :</strong> ' +
          (mode === 'edit'
            ? '<input type="date" class="ajq-ed-date" data-ed-path="validityDate" value="' + esc(quote.validityDate || '') + '" />'
            : esc(validityFR)) +
        '</div>' +
        '<div class="ajq-payment__row"><strong>Délai de règlement :</strong></div>' +
        '<div class="ajq-payment__row"><strong>Mode de règlement :</strong> ' +
          _ed(quote.paymentMethod || 'Virement', 'paymentMethod', mode, { placeholder:'Virement' }) +
        '</div>' +
        '<div class="ajq-payment__row"><strong>Conditions de règlement :</strong></div>' +
        '<div class="ajq-payment__deposit">' +
          esc(depositPct) + '% à la signature à verser sur le compte IBAN : ' + esc(company.iban) + ', soit ' +
          fmtMoney(totals.deposit) + ' EUR TTC' +
        '</div>' +
        '<div class="ajq-payment__row"><strong>Délai de règlement :</strong> ' +
          _ed(quote.paymentDelay || 'Règlement comptant', 'paymentDelay', mode, { placeholder:'Règlement comptant' }) +
        '</div>' +
      '</div>' +
      /* Bloc assurance — figé (constantes AJ Pro) */
      '<div class="ajq-insurance">' +
        '<div><span class="ajq-insurance__title">Assurance Professionnelle :</span> ' + esc(company.assurance.assureur) + ' – ref contrat n°' + esc(company.assurance.reference) + ' depuis le ' + esc(company.assurance.depuis) + '</div>' +
        '<div>Activités couvertes : ' + esc(company.assurance.activitesCouvertes) + '</div>' +
        '<div>' + esc(company.assurance.mention) + '</div>' +
      '</div>' +
      /* Signature */
      (function(){
        var sigNum = quote.quoteNumber || '';
        if(quote.typeDocument === 'revision' && quote.revisionNumber){
          sigNum = sigNum + '-' + quote.revisionNumber;
        }
        return '<div class="ajq-signature">' +
          '<div>' +
            '<div class="ajq-signature__num">' + esc(typeDef.label) + ' n° ' + esc(sigNum) + '</div>' +
            '<div class="ajq-signature__mention">' + esc(K.AJ_PRO_SIGNATURE_MENTION) + '</div>' +
            '<div class="ajq-signature__box"></div>' +
          '</div>' +
          '<div>' +
            '<div class="ajq-signature__entreprise">Pour l\'Entreprise</div>' +
            '<div class="ajq-signature__box"></div>' +
          '</div>' +
        '</div>';
      })() +
    '</div>';
  }

  function renderPreviewPageCGV(quote, company, mode){
    var totalPages = 3;
    var draftClass = quote.locked ? '' : ' ajq-page--draft';

    var articlesHtml = K.AJ_PRO_TERMS_AND_CONDITIONS.map(function(art){
      var bullets = art.bullets ? '<ul class="ajq-cgv-article__bullets">' + art.bullets.map(function(b){ return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' : '';
      return '<div class="ajq-cgv-article">' +
        '<div class="ajq-cgv-article__title">Article ' + art.number + ' - ' + esc(art.title) + '</div>' +
        '<div class="ajq-cgv-article__body">' + esc(art.body) + '</div>' +
        bullets +
      '</div>';
    }).join('');

    return '<div class="ajq-page' + draftClass + '">' +
      renderHeaderBlock(quote, company, 3, totalPages, mode) +
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

    /* Émission verrouillée + dérivations (Session 16) */
    emitCurrent: emitCurrent,
    emit: emitQuote,
    createAmendmentFrom: createAmendmentFrom,
    createRevisionFrom: createRevisionFrom,
    createAmendmentFromCurrent: createAmendmentFromCurrent,
    createRevisionFromCurrent: createRevisionFromCurrent,

    /* Bibliothèque de lignes types (Session 17) */
    openLibraryPicker: openLibraryPicker,
    closeLibraryPicker: closeLibraryPicker,
    setLibraryCategory: setLibraryCategory,
    setLibrarySearch: setLibrarySearch,
    addLineFromLibrary: addLineFromLibrary,

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
