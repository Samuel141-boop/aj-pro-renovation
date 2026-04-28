/* ════════════════════════════════════════════════════════════════════
   AJ PRO RÉNOVATION — MODULE DEVIS SALLE DE BAIN
   Transcrit fidèlement le devis modèle $002612 (rev. 2026-04-20)
   Commit A : template JSON + structure DB + nav-item + écran placeholder
   Commit B (à venir) : wizard 12 étapes + logique transformation + récap
   Commit C (à venir) : génération PDF fidèle au modèle + émission verrouillée
   ════════════════════════════════════════════════════════════════════ */
(function(){
  if(window.__AJ_BATH_LOADED) return;
  window.__AJ_BATH_LOADED = true;

  /* ─────────────────────────────────────────────────────────────────
     INFOS ÉMETTEUR (pré-remplies depuis le PDF source — modifiables
     via l'écran "Documents émis → Infos émetteur" déjà en place)
     ───────────────────────────────────────────────────────────────── */
  var DEFAULT_EMETTEUR = {
    raisonSociale: 'Sarl AJ Pro Rénovation',
    adresse: '95/97 rue Gallieni, 92500 Rueil-Malmaison France',
    tel: '01 78 53 30 08',
    email: 'contact@ajprorenovation.com',
    siret: '487 953 465 00035',
    tvaIntracom: 'FR39487953465',
    ape: '4120A',
    capital: '7 500,00 €',
    rcs: 'RCS NANTERRE 487 953 465',
    iban: 'FR76 3000 4014 0300 0101 6001 532',
    bic: 'BNPAFRPPXXX',
    activites: 'Peinture - Plomberie - Electricité - Carrelage - Parquet - PVC - Rénovation parquets anciens - Pose parquets neufs - Rénovation complète de Salles de bain - Travaux préalables à l\'installation de cuisines équipées',
    assurance: 'AXA France – ref contrat n°0000021932511804 depuis le 01/01/2025',
    assuranceActivites: 'Plomberie, peinture, électricité, parquet, menuiserie, cloisons, carrelage',
    mediateur: 'CM2C - 14, rue Saint-Jean - 75017 PARIS — www.cm2c.net',
    /* slot logo : remplacé automatiquement si /logo-ajpro.png existe */
    logoUrl: null
  };

  /* ─────────────────────────────────────────────────────────────────
     TEMPLATE — source de vérité externalisée dans quote-template-sdb.js
     (consommée aussi par chantier-analysis.js et les futurs modules
     quote-fusion / quote-editor / catalog-products).
     Le fichier quote-template-sdb.js DOIT être chargé avant celui-ci.
     ───────────────────────────────────────────────────────────────── */
  if(!window.QUOTE_TEMPLATE_SDB){
    console.error('[AJ PRO Bath] quote-template-sdb.js doit être chargé AVANT bathroom-quote.js — module non initialisé');
    return;
  }
  var BATHROOM_TEMPLATE = window.QUOTE_TEMPLATE_SDB.toLegacy();

  /* ─────────────────────────────────────────────────────────────────
     STORAGE — db.quotes (brouillons et devis émis)
     db.quoteTemplates (template courant + futures versions)
     ───────────────────────────────────────────────────────────────── */
  var TPL_KEY = 'aj-quote-templates-v1';

  function loadTemplates(){
    try {
      var raw = localStorage.getItem(TPL_KEY);
      if(!raw) return null;
      var parsed = JSON.parse(raw);
      if(parsed && Array.isArray(parsed.templates)) return parsed.templates;
    } catch(e){}
    return null;
  }

  function saveTemplate(template){
    var current = loadTemplates() || [];
    var idx = current.findIndex(function(t){ return t.templateId === template.templateId; });
    if(idx >= 0) current[idx] = template;
    else current.push(template);
    try {
      localStorage.setItem(TPL_KEY, JSON.stringify({ templates: current, version: 1, updatedAt: Date.now() }));
      return true;
    } catch(e){
      if(typeof showToast === 'function') showToast('⚠ Erreur sauvegarde template');
      return false;
    }
  }

  function getBathroomTemplate(){
    var all = loadTemplates();
    if(all){
      var found = all.find(function(t){ return t.templateId === BATHROOM_TEMPLATE.templateId; });
      if(found) return found;
    }
    /* Premier chargement : on persiste le template par défaut */
    saveTemplate(BATHROOM_TEMPLATE);
    return BATHROOM_TEMPLATE;
  }

  /* Brouillons de devis (db.quotes avec status='draft' ou 'in-progress') */
  function getDrafts(){
    if(typeof dbLoad !== 'function') return [];
    var db = dbLoad();
    return (db.quotes || []).filter(function(q){ return q.status !== 'emis' && q.templateType === 'salle-de-bain'; });
  }

  function saveDraft(quote){
    if(typeof dbLoad !== 'function' || typeof safeSave !== 'function') return false;
    var db = dbLoad();
    db.quotes = db.quotes || [];
    var idx = db.quotes.findIndex(function(q){ return q.id === quote.id; });
    quote.updatedAt = Date.now();
    if(idx >= 0) db.quotes[idx] = quote;
    else { quote.createdAt = Date.now(); db.quotes.push(quote); }
    return safeSave(db);
  }

  function deleteDraft(quoteId){
    if(typeof dbLoad !== 'function' || typeof safeSave !== 'function') return false;
    var db = dbLoad();
    db.quotes = (db.quotes || []).filter(function(q){ return q.id !== quoteId; });
    return safeSave(db);
  }

  function newDraft(){
    return {
      id: 'qbath_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      templateId: BATHROOM_TEMPLATE.templateId,
      templateType: 'salle-de-bain',
      status: 'draft',
      currentStep: 1,
      formData: {},   /* sera rempli par le wizard étape par étape */
      lines: [],      /* sera calculé au moment de la finalisation */
      totals: null,   /* idem */
      createdAt: null,
      updatedAt: null
    };
  }

  /* ─────────────────────────────────────────────────────────────────
     INFOS ÉMETTEUR (lecture/écriture localStorage)
     Réutilise la clé `aj-emetteur-v1` mise en place dans Phase Légal,
     enrichie avec les infos du PDF si vide.
     ───────────────────────────────────────────────────────────────── */
  function getEmetteur(){
    try {
      var raw = localStorage.getItem('aj-emetteur-v1');
      if(raw){
        var saved = JSON.parse(raw);
        if(saved && saved.nom) return Object.assign({}, DEFAULT_EMETTEUR, {
          nom: saved.nom, adresse: saved.adresse, tel: saved.tel,
          email: saved.email, siret: saved.siret, tva: saved.tva
        });
      }
    } catch(e){}
    /* Première fois : on pré-remplit depuis le PDF source */
    var prefill = {
      nom: DEFAULT_EMETTEUR.raisonSociale,
      adresse: DEFAULT_EMETTEUR.adresse,
      tel: DEFAULT_EMETTEUR.tel,
      email: DEFAULT_EMETTEUR.email,
      siret: DEFAULT_EMETTEUR.siret,
      tva: DEFAULT_EMETTEUR.tvaIntracom
    };
    try { localStorage.setItem('aj-emetteur-v1', JSON.stringify(prefill)); } catch(e){}
    return Object.assign({}, DEFAULT_EMETTEUR, prefill);
  }

  /* ─────────────────────────────────────────────────────────────────
     NAV-ITEM SIDEBAR + ÉCRAN PLACEHOLDER
     ───────────────────────────────────────────────────────────────── */
  function injectBathroomNav(){
    var nav = document.querySelector('.sidebar-nav');
    if(!nav || document.getElementById('aj-nav-bathroom')) return;
    var item = document.createElement('div');
    item.className = 'nav-item';
    item.id = 'aj-nav-bathroom';
    item.setAttribute('data-screen','screen-bathroom-quote');
    item.innerHTML =
      '<span class="nav-item-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M5 12V7a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3"/>' +
        '<line x1="3" y1="12" x2="21" y2="12"/>' +
        '<path d="M5 12v3a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-3"/>' +
        '<line x1="7" y1="19" x2="7" y2="21"/>' +
        '<line x1="17" y1="19" x2="17" y2="21"/>' +
      '</svg></span>' +
      '<span>Devis salle de bain</span>';
    item.onclick = function(){
      if(typeof closeSidebar === 'function' && window.innerWidth <= 980) closeSidebar();
      if(typeof screenHistory !== 'undefined') screenHistory = [];
      ensureBathroomScreen();
      if(typeof showScreen === 'function') showScreen('screen-bathroom-quote');
      renderBathroomScreen();
    };
    /* Insère après "Documents émis" si présent, sinon en fin */
    var docsNav = document.getElementById('aj-nav-docs');
    if(docsNav && docsNav.parentNode === nav){
      nav.insertBefore(item, docsNav.nextSibling);
    } else {
      nav.appendChild(item);
    }
  }

  function ensureBathroomScreen(){
    if(document.getElementById('screen-bathroom-quote')) return;
    var mc = document.querySelector('.main-content');
    if(!mc) return;
    var s = document.createElement('div');
    s.className = 'screen';
    s.id = 'screen-bathroom-quote';
    s.innerHTML =
      '<div style="padding:0 0 80px;">' +
        '<div style="margin-bottom:18px;">' +
          '<div style="font-family:Cormorant Garamond,Georgia,serif;font-size:30px;font-weight:600;color:#0f2030;">Devis salle de bain</div>' +
          '<div style="font-size:13px;color:#3a4a5c;margin-top:4px;">Prise d\'informations chez le client → devis structuré</div>' +
        '</div>' +
        '<div id="aj-bath-body"></div>' +
      '</div>';
    mc.appendChild(s);
  }

  function safeEsc(s){
    if(typeof esc === 'function') return esc(s);
    if(s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renderBathroomScreen(){
    ensureBathroomScreen();
    var body = document.getElementById('aj-bath-body');
    if(!body) return;
    var template = getBathroomTemplate();
    var drafts = getDrafts();

    /* Stats du template */
    var sectionsBase = template.sections.filter(function(s){ return !s.isOption; });
    var sectionsOption = template.sections.filter(function(s){ return s.isOption; });
    var totalItemsBase = sectionsBase.reduce(function(n, s){
      var inSubs = (s.subSections || []).reduce(function(m, sub){ return m + sub.items.length; }, 0);
      return n + (s.items ? s.items.length : 0) + inSubs;
    }, 0);
    var totalItemsOption = sectionsOption.reduce(function(n, s){ return n + (s.items ? s.items.length : 0); }, 0);

    /* Total HT théorique (toutes lignes base à leur defaultQty × defaultPrice) */
    var totalHTTheoriqueBase = 0;
    sectionsBase.forEach(function(sec){
      (sec.items || []).forEach(function(it){
        totalHTTheoriqueBase += (it.defaultQty || 0) * (it.defaultPrice || 0);
      });
      (sec.subSections || []).forEach(function(sub){
        sub.items.forEach(function(it){
          totalHTTheoriqueBase += (it.defaultQty || 0) * (it.defaultPrice || 0);
        });
      });
    });

    body.innerHTML =
      /* ── Bandeau KPI ── */
      '<div style="background:linear-gradient(135deg,#0f2030,#1a3349);color:#fff;border-radius:14px;padding:22px 24px;margin-bottom:20px;font-family:Inter,sans-serif;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:16px;">' +
          '<div>' +
            '<div style="font-family:Cormorant Garamond,Georgia,serif;font-size:13px;color:#c9a96e;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Module Devis</div>' +
            '<div style="font-family:Cormorant Garamond,Georgia,serif;font-size:26px;font-weight:600;color:#fff;line-height:1.1;margin-top:4px;">Rénovation salle de bain</div>' +
            '<div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px;">Modèle basé sur le devis $002612 — 18 lots, ' + totalItemsBase + ' prestations + ' + totalItemsOption + ' options</div>' +
          '</div>' +
          '<div style="text-align:right;">' +
            '<div style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.6px;font-weight:500;">Total HT moyen</div>' +
            '<div style="font-family:Cormorant Garamond,Georgia,serif;font-size:32px;font-weight:600;color:#c9a96e;line-height:1;">' + totalHTTheoriqueBase.toLocaleString('fr-FR', {maximumFractionDigits:0}) + ' €</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;border-top:1px solid rgba(255,255,255,0.12);padding-top:14px;">' +
          '<div><div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.5px;">Lots base</div><div style="font-size:20px;font-weight:600;margin-top:2px;">' + sectionsBase.length + '</div></div>' +
          '<div><div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.5px;">Lots options</div><div style="font-size:20px;font-weight:600;margin-top:2px;color:#c9a96e;">' + sectionsOption.length + '</div></div>' +
          '<div><div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.5px;">Prestations</div><div style="font-size:20px;font-weight:600;margin-top:2px;">' + totalItemsBase + '</div></div>' +
          '<div><div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.5px;">Brouillons</div><div style="font-size:20px;font-weight:600;margin-top:2px;color:#c9a96e;">' + drafts.length + '</div></div>' +
        '</div>' +
      '</div>' +

      /* ── CTA principal ── */
      '<div style="background:#fff;border:1px solid var(--c-border,#e3dccc);border-radius:14px;padding:28px 24px;margin-bottom:18px;font-family:Inter,sans-serif;text-align:center;">' +
        '<div style="font-size:48px;margin-bottom:12px;">🚿</div>' +
        '<div style="font-family:Cormorant Garamond,Georgia,serif;font-size:22px;font-weight:600;color:#0f2030;margin-bottom:6px;">Nouveau devis salle de bain</div>' +
        '<div style="font-size:13px;color:#3a4a5c;margin-bottom:20px;line-height:1.5;max-width:480px;margin-left:auto;margin-right:auto;">Wizard 12 étapes : prise d\'informations chez le client → récap éditable → PDF officiel verrouillé (DEV-2026-XXX).</div>' +
        '<button onclick="if(window.AJBath)window.AJBath.wizardStartNew()" style="padding:14px 28px;background:#c9a96e;color:#0f2030;border:none;border-radius:10px;font-weight:700;font-size:15px;cursor:pointer;font-family:Inter,sans-serif;box-shadow:0 4px 12px rgba(201,169,110,0.30);">+ Démarrer un nouveau devis</button>' +
      '</div>' +

      /* ── Inspecteur du template ── */
      '<div style="background:#fff;border:1px solid var(--c-border,#e3dccc);border-radius:14px;padding:18px 20px;font-family:Inter,sans-serif;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;">' +
          '<div style="font-weight:700;color:#0f2030;font-size:15px;">Aperçu du template</div>' +
          '<div style="font-size:11px;color:#7a8896;font-family:monospace;">' + template.templateId + ' · v' + template.version + '</div>' +
        '</div>' +
        '<div style="font-size:13px;color:#3a4a5c;line-height:1.6;">' +
        template.sections.map(function(sec){
          var optBadge = sec.isOption ? '<span style="background:rgba(232,98,26,0.15);color:#9a4514;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;margin-left:8px;letter-spacing:0.5px;">OPTION</span>' : '';
          var foundBadge = sec.isFourniture ? '<span style="background:rgba(13,70,144,0.10);color:#0d4690;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;margin-left:6px;">FOURNITURES</span>' : '';
          var nbItems = (sec.items ? sec.items.length : 0) + (sec.subSections || []).reduce(function(m, sub){ return m + sub.items.length; }, 0);
          var sousTotal = 0;
          (sec.items || []).forEach(function(it){ sousTotal += (it.defaultQty || 0) * (it.defaultPrice || 0); });
          (sec.subSections || []).forEach(function(sub){ sub.items.forEach(function(it){ sousTotal += (it.defaultQty || 0) * (it.defaultPrice || 0); }); });
          return '<div style="padding:9px 0;border-bottom:1px solid rgba(15,32,48,0.06);">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">' +
              '<div style="flex:1;min-width:240px;"><span style="font-weight:600;color:#0f2030;">' + sec.num + '. ' + safeEsc(sec.title) + '</span>' + optBadge + foundBadge + '</div>' +
              '<div style="font-size:11px;color:#7a8896;font-family:Inter,sans-serif;">' + nbItems + ' ligne' + (nbItems > 1 ? 's' : '') + ' · ' + sousTotal.toLocaleString('fr-FR') + ' €' + (sec.isOption ? ' (hors total)' : '') + '</div>' +
            '</div>' +
          '</div>';
        }).join('') +
        '</div>' +
      '</div>' +

      /* ── Infos techniques ── */
      '<div style="background:rgba(201,169,110,0.08);border:1px solid rgba(201,169,110,0.25);border-radius:10px;padding:14px 16px;margin-top:14px;font-family:Inter,sans-serif;font-size:12px;color:#7a5a30;">' +
        '<b>Commit A livré (template + structure).</b><br>' +
        'Prochain commit (B) : wizard 12 étapes + logique de transformation form → devis + récap éditable.<br>' +
        'Commit final (C) : génération PDF fidèle au modèle + émission verrouillée (DEV-2026-XXX).' +
      '</div>';
  }

  /* ─────────────────────────────────────────────────────────────────
     INIT — patches + chargement
     ───────────────────────────────────────────────────────────────── */

  /* On force la persistance du template + ré-init des infos émetteur si vide */
  setTimeout(function(){
    getBathroomTemplate();   /* persiste le template par défaut si absent */
    getEmetteur();           /* pré-remplit les infos émetteur AJ PRO */
  }, 200);

  /* Nav-item + écran */
  setTimeout(injectBathroomNav, 1200);

  /* Patch updateNav pour activer le nav-item */
  var _origUpdateNav = window.updateNav;
  if(_origUpdateNav){
    window.updateNav = function(){
      var r = _origUpdateNav.apply(this, arguments);
      var item = document.getElementById('aj-nav-bathroom');
      if(item){ item.classList.toggle('active', currentScreen === 'screen-bathroom-quote'); }
      return r;
    };
  }

  /* Patch showScreen pour render */
  var _origShowScreen = window.showScreen;
  if(_origShowScreen){
    window.showScreen = function(id){
      var r = _origShowScreen.apply(this, arguments);
      if(id === 'screen-bathroom-quote') setTimeout(renderBathroomScreen, 50);
      return r;
    };
  }

  /* Expose pour les commits suivants + debugging console */
  window.AJBath = {
    /* Constantes */
    TEMPLATE: BATHROOM_TEMPLATE,
    DEFAULT_EMETTEUR: DEFAULT_EMETTEUR,
    /* Storage */
    getTemplate: getBathroomTemplate,
    saveTemplate: saveTemplate,
    getDrafts: getDrafts,
    saveDraft: saveDraft,
    deleteDraft: deleteDraft,
    newDraft: newDraft,
    getEmetteur: getEmetteur,
    /* UI */
    injectNav: injectBathroomNav,
    ensureScreen: ensureBathroomScreen,
    renderScreen: renderBathroomScreen
  };

  /* ═══════════════════════════════════════════════════════════════════
     ════════════════════ COMMIT B — WIZARD 12 ÉTAPES ══════════════════
     ═══════════════════════════════════════════════════════════════════ */

  /* ─── HELPERS DE CALCUL ─── */
  function pf(v){ if(v == null) return 0; var n = parseFloat(String(v).replace(',','.')); return isNaN(n) ? 0 : n; }
  function fmtEur(v){ if(v == null || isNaN(v)) return '— €'; return v.toLocaleString('fr-FR', {maximumFractionDigits:2, minimumFractionDigits: v % 1 === 0 ? 0 : 2}) + ' €'; }
  function r2(v){ return Math.round(v * 100) / 100; }

  function computeMeasurements(fd){
    var L = pf(fd['mesures.longueur']);
    var l = pf(fd['mesures.largeur']);
    var H = pf(fd['mesures.hsp']);
    var nbPortes = parseInt(fd['mesures.nbPortes'], 10); if(isNaN(nbPortes)) nbPortes = 1;
    var nbFenetres = parseInt(fd['mesures.nbFenetres'], 10); if(isNaN(nbFenetres)) nbFenetres = 0;
    var hauteurCarrelage = pf(fd['carrelage.hauteurMurale']) || H;
    var chutesPct = pf(fd['carrelage.chutesPct']) || 10;
    var ba13Surface = pf(fd['demolition.ba13SurfaceM2']) || 0;

    var surfaceSol = L * l;
    var surfacePlafond = L * l;
    var perimetre = 2 * (L + l);
    var surfaceMursBrute = perimetre * H;
    var deductPortes = nbPortes * 1.62;
    var deductFenetres = nbFenetres * 1.44;
    var surfaceMursNette = Math.max(0, surfaceMursBrute - deductPortes - deductFenetres);
    var surfaceMurale = Math.max(0, perimetre * hauteurCarrelage - deductPortes - deductFenetres);
    var plinthesML = Math.max(0, perimetre - (nbPortes * 0.83));

    return {
      L:L, l:l, H:H,
      surfaceSol: r2(surfaceSol),
      surfacePlafond: r2(surfacePlafond),
      perimetre: r2(perimetre),
      surfaceMursBrute: r2(surfaceMursBrute),
      surfaceMursNette: r2(surfaceMursNette),
      surfaceMurale: r2(surfaceMurale),
      plinthesML: r2(plinthesML),
      surfaceSolAvecChutes: r2(surfaceSol * (1 + chutesPct/100)),
      plinthesMLAvecChutes: r2(plinthesML * (1 + chutesPct/100)),
      surfaceMuraleAvecChutes: r2(surfaceMurale * (1 + chutesPct/100)),
      ba13Surface: r2(ba13Surface)
    };
  }

  function evaluateTrigger(triggerPath, formData){
    if(!triggerPath) return false;
    var v = formData[triggerPath];
    if(v === true) return true;
    if(typeof v === 'string'){
      if(!v) return false;
      if(v === 'aucun' || v === 'non' || v === '0' || v === 'false') return false;
      return true;
    }
    if(typeof v === 'number') return v > 0;
    return false;
  }

  function generateLines(template, formData){
    var measures = computeMeasurements(formData);
    var sections = [];

    template.sections.forEach(function(sec){
      var sectionLines = [];

      var processItem = function(it){
        var qty = it.defaultQty != null ? it.defaultQty : 0;
        var price = it.defaultPrice != null ? it.defaultPrice : 0;
        var include = false;
        var displayLabel = it.label;

        /* Logique d'inclusion */
        if(it.isMandatory){
          include = true;
        } else if(it.displayOnly){
          /* Lignes informatives (commentaires, mise en sécurité) toujours affichées */
          include = true;
        } else if(it.trigger){
          if(evaluateTrigger(it.trigger, formData)){
            include = true;
          } else if(it.showWhenZero){
            /* Affichée à 0 € pour montrer ce qui a été discuté */
            include = true; price = 0;
          }
        }

        if(!include) return;

        /* Quantité auto via formule */
        if(it.qtyFormula && measures[it.qtyFormula] != null){
          qty = measures[it.qtyFormula];
        }

        /* "Fourni par client" → prix à 0 + suffixe */
        var fourniClientPath = it.trigger ? it.trigger + '.fourniClient' : null;
        if(fourniClientPath && formData[fourniClientPath] === true){
          price = 0;
          displayLabel = it.label + ' (fourni par le client)';
        }

        /* Override utilisateur depuis le récap */
        var ovQty = formData['override.' + it.key + '.qty'];
        var ovPrice = formData['override.' + it.key + '.price'];
        var ovLabel = formData['override.' + it.key + '.label'];
        if(ovQty != null && ovQty !== '') qty = pf(ovQty);
        if(ovPrice != null && ovPrice !== '') price = pf(ovPrice);
        if(ovLabel) displayLabel = ovLabel;

        /* Cas négatif (annulation, ex: 8.5) */
        var total = qty * price;
        if(it.isNegative) total = -Math.abs(total);

        sectionLines.push({
          key: it.key,
          label: displayLabel,
          description: it.description || '',
          unit: it.unit,
          qty: r2(qty),
          price: r2(price),
          total: r2(total),
          isFourniture: it.isFourniture || sec.isFourniture || false,
          showWhenZero: !!it.showWhenZero,
          displayOnly: !!it.displayOnly
        });
      };

      (sec.items || []).forEach(processItem);
      (sec.subSections || []).forEach(function(sub){
        sub.items.forEach(processItem);
      });

      if(sectionLines.length){
        var sousTotal = sectionLines.reduce(function(s, l){ return s + l.total; }, 0);
        sections.push({
          sectionId: sec.id,
          sectionNum: sec.num,
          sectionTitle: sec.title,
          isOption: !!sec.isOption,
          isFourniture: !!sec.isFourniture,
          items: sectionLines,
          sousTotal: r2(sousTotal)
        });
      }
    });

    return sections;
  }

  function computeTotals(lineSections, settings){
    var s = Object.assign({ vatRate: 10, depositPct: 30 }, settings || {});
    var totalHT = 0, totalOptionsHT = 0;
    lineSections.forEach(function(sec){
      if(sec.isOption) totalOptionsHT += sec.sousTotal;
      else totalHT += sec.sousTotal;
    });
    var tva = totalHT * s.vatRate / 100;
    var totalTTC = totalHT + tva;
    var acompte = totalTTC * s.depositPct / 100;
    return {
      totalHT: r2(totalHT),
      totalOptionsHT: r2(totalOptionsHT),
      tva: r2(tva),
      totalTTC: r2(totalTTC),
      acompte: r2(acompte),
      solde: r2(totalTTC - acompte),
      vatRate: s.vatRate,
      depositPct: s.depositPct
    };
  }

  /* ─── HELPERS DE BIND DOM (data-aj-bind) ─── */
  var BindCtx = (function(){
    function valOf(path){
      if(!_currentDraft) return '';
      var v = _currentDraft.formData[path];
      return v == null ? '' : v;
    }
    function checked(path){ return _currentDraft && _currentDraft.formData[path] === true; }
    function escAttr(s){ return String(s == null ? '' : s).replace(/"/g, '&quot;'); }
    var iCount = 0;
    function uniqId(p){ return 'b_' + (++iCount); }

    function input(path, label, type, opts){
      type = type || 'text';
      opts = opts || {};
      var v = valOf(path);
      var attrs = '';
      if(opts.placeholder) attrs += ' placeholder="' + escAttr(opts.placeholder) + '"';
      if(opts.step) attrs += ' step="' + opts.step + '"';
      if(opts.min != null) attrs += ' min="' + opts.min + '"';
      if(opts.max != null) attrs += ' max="' + opts.max + '"';
      if(type === 'number') attrs += ' inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*"';
      var suffix = opts.suffix ? '<span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#7a8896;font-size:13px;pointer-events:none;font-family:Inter,sans-serif;">' + escAttr(opts.suffix) + '</span>' : '';
      return '<div class="aj-fg" style="display:flex;flex-direction:column;gap:6px;">' +
        (label ? '<label style="font-size:11px;color:#3a4a5c;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;">' + safeEsc(label) + '</label>' : '') +
        '<div style="position:relative;">' +
          '<input type="' + type + '" data-aj-bind="' + escAttr(path) + '" value="' + escAttr(v) + '"' + attrs + ' style="width:100%;padding:11px 14px' + (opts.suffix ? ' 11px 14px;padding-right:50px' : '') + ';border:1px solid var(--c-border,#e3dccc);border-radius:8px;font-size:14px;font-family:Inter,sans-serif;background:#fff;color:#0f2030;outline:none;" />' +
          suffix +
        '</div>' +
      '</div>';
    }

    function textarea(path, label, opts){
      opts = opts || {};
      var v = valOf(path);
      return '<div class="aj-fg" style="display:flex;flex-direction:column;gap:6px;grid-column:1/-1;">' +
        (label ? '<label style="font-size:11px;color:#3a4a5c;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;">' + safeEsc(label) + '</label>' : '') +
        '<textarea data-aj-bind="' + escAttr(path) + '"' + (opts.placeholder ? ' placeholder="' + escAttr(opts.placeholder) + '"' : '') + ' rows="' + (opts.rows || 3) + '" style="width:100%;padding:11px 14px;border:1px solid var(--c-border,#e3dccc);border-radius:8px;font-size:14px;font-family:Inter,sans-serif;background:#fff;color:#0f2030;outline:none;resize:vertical;">' + safeEsc(v) + '</textarea>' +
      '</div>';
    }

    function check(path, label, sub){
      var c = checked(path);
      return '<label class="aj-check" data-aj-check-wrap="' + escAttr(path) + '" style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:' + (c ? 'rgba(201,169,110,0.12)' : '#fff') + ';border:1.5px solid ' + (c ? '#c9a96e' : 'var(--c-border,#e3dccc)') + ';border-radius:10px;cursor:pointer;font-family:Inter,sans-serif;transition:all 0.15s;">' +
        '<input type="checkbox" data-aj-bind="' + escAttr(path) + '"' + (c ? ' checked' : '') + ' style="width:20px;height:20px;margin:0;flex-shrink:0;accent-color:#c9a96e;cursor:pointer;" />' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-weight:600;font-size:13px;color:#0f2030;">' + safeEsc(label) + '</div>' +
          (sub ? '<div style="font-size:11px;color:#7a8896;margin-top:2px;">' + safeEsc(sub) + '</div>' : '') +
        '</div>' +
      '</label>';
    }

    function toggle(path, label, options){
      var v = valOf(path);
      var html = (label ? '<div style="font-size:11px;color:#3a4a5c;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:6px;">' + safeEsc(label) + '</div>' : '') +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;" data-aj-toggle-group="' + escAttr(path) + '">' +
        options.map(function(opt){
          var optVal = typeof opt === 'string' ? opt : opt.value;
          var optLabel = typeof opt === 'string' ? opt : opt.label;
          var sel = String(v) === String(optVal);
          return '<button type="button" data-aj-toggle-bind="' + escAttr(path) + '" data-aj-toggle-val="' + escAttr(optVal) + '" style="flex:1;min-width:90px;padding:10px 14px;border:1.5px solid ' + (sel ? '#c9a96e' : 'var(--c-border,#e3dccc)') + ';background:' + (sel ? 'rgba(201,169,110,0.18)' : '#fff') + ';color:#0f2030;border-radius:8px;cursor:pointer;font-family:Inter,sans-serif;font-size:13px;font-weight:' + (sel ? '700' : '500') + ';transition:all 0.15s;">' + safeEsc(optLabel) + '</button>';
        }).join('') +
        '</div>';
      return '<div class="aj-fg">' + html + '</div>';
    }

    function select(path, label, options, opts){
      opts = opts || {};
      var v = valOf(path);
      return '<div class="aj-fg" style="display:flex;flex-direction:column;gap:6px;">' +
        (label ? '<label style="font-size:11px;color:#3a4a5c;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;">' + safeEsc(label) + '</label>' : '') +
        '<select data-aj-bind="' + escAttr(path) + '" style="width:100%;padding:11px 14px;border:1px solid var(--c-border,#e3dccc);border-radius:8px;font-size:14px;font-family:Inter,sans-serif;background:#fff;color:#0f2030;outline:none;">' +
        (opts.placeholder ? '<option value="">' + safeEsc(opts.placeholder) + '</option>' : '') +
        options.map(function(o){
          var ov = typeof o === 'string' ? o : o.value;
          var ol = typeof o === 'string' ? o : o.label;
          return '<option value="' + escAttr(ov) + '"' + (String(v) === String(ov) ? ' selected' : '') + '>' + safeEsc(ol) + '</option>';
        }).join('') +
        '</select>' +
      '</div>';
    }

    function helpBox(text, color){
      var c = color || '#c9a96e';
      return '<div style="background:rgba(201,169,110,0.08);border-left:3px solid ' + c + ';padding:10px 14px;border-radius:6px;font-family:Inter,sans-serif;font-size:12px;color:#3a4a5c;line-height:1.5;">' + text + '</div>';
    }

    return { input:input, textarea:textarea, check:check, toggle:toggle, select:select, helpBox:helpBox, valOf:valOf, checked:checked };
  })();

  /* ─── DÉFINITION DES 12 ÉTAPES ─── */
  var STEPS = [
    {
      id: 'step-1-client', num: 1, title: 'Client & chantier', icon: '👤',
      render: function(draft){
        var b = BindCtx;
        return '<div style="display:flex;flex-direction:column;gap:14px;">' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">' +
            b.input('client.prenom', 'Prénom') +
            b.input('client.nom', 'Nom') +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">' +
            b.input('client.tel', 'Téléphone', 'tel') +
            b.input('client.email', 'Email', 'email') +
          '</div>' +
          b.input('client.adresseChantier', 'Adresse du chantier', 'text', { placeholder: 'N°, rue, code postal, ville' }) +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;">' +
            b.input('client.etage', 'Étage') +
            b.toggle('client.ascenseur', 'Ascenseur', ['Oui','Non']) +
            b.input('client.codeAcces', 'Code d\'accès') +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;">' +
            b.toggle('client.typeLogement', 'Type', ['Appartement','Maison','Copropriété']) +
            b.toggle('client.occupe', 'Logement occupé', ['Oui','Non']) +
          '</div>' +
          b.textarea('client.observations', 'Observations générales', { placeholder: 'Particularités d\'accès, contraintes copro, dispo client...', rows: 3 });
      }
    },

    {
      id: 'step-2-mesures', num: 2, title: 'Mesures pièce', icon: '📐',
      render: function(draft){
        var b = BindCtx;
        var measures = computeMeasurements(draft.formData);
        var hasMeasures = measures.L > 0 && measures.l > 0;
        return '<div style="display:flex;flex-direction:column;gap:14px;">' +
          b.toggle('mesures.typeProjet', 'Type de projet', [
            { value:'complete', label:'Rénovation complète' },
            { value:'partielle', label:'Rénovation partielle' }
          ]) +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;">' +
            b.input('mesures.longueur', 'Longueur', 'number', { suffix:'m', step:'0.05' }) +
            b.input('mesures.largeur', 'Largeur', 'number', { suffix:'m', step:'0.05' }) +
            b.input('mesures.hsp', 'Hauteur sous plafond', 'number', { suffix:'m', step:'0.05' }) +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;">' +
            b.input('mesures.nbPortes', 'Nombre de portes', 'number', { step:'1', min:'0', max:'5' }) +
            b.input('mesures.nbFenetres', 'Nombre de fenêtres', 'number', { step:'1', min:'0', max:'5' }) +
          '</div>' +
          (hasMeasures ?
            '<div style="background:#fbf8f2;border:1px solid var(--c-border,#e3dccc);border-radius:10px;padding:14px;font-family:Inter,sans-serif;">' +
              '<div style="font-size:11px;color:#7a8896;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:10px;">Calculs automatiques</div>' +
              '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;font-size:13px;">' +
                '<div><div style="color:#7a8896;font-size:11px;">Surface sol</div><div style="font-weight:600;color:#0f2030;">' + measures.surfaceSol + ' m²</div></div>' +
                '<div><div style="color:#7a8896;font-size:11px;">Périmètre</div><div style="font-weight:600;color:#0f2030;">' + measures.perimetre + ' ml</div></div>' +
                '<div><div style="color:#7a8896;font-size:11px;">Surface murs (brute)</div><div style="font-weight:600;color:#0f2030;">' + measures.surfaceMursBrute + ' m²</div></div>' +
                '<div><div style="color:#7a8896;font-size:11px;">Surface murs (nette)</div><div style="font-weight:600;color:#c9a96e;">' + measures.surfaceMursNette + ' m²</div></div>' +
              '</div>' +
            '</div>'
            : b.helpBox('Saisis longueur, largeur et HSP : les surfaces et le périmètre se calculent automatiquement.')
          ) +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">' +
            b.toggle('mesures.carrelageMuralExistant', 'Carrelage mural existant ?', ['Oui','Non']) +
            b.toggle('mesures.carrelageSolExistant', 'Carrelage sol existant ?', ['Oui','Non']) +
          '</div>';
      }
    },

    {
      id: 'step-3-demolition', num: 3, title: 'Démolition / préparation', icon: '🔨',
      render: function(draft){
        var b = BindCtx;
        return '<div style="display:flex;flex-direction:column;gap:10px;">' +
          b.helpBox('Coche tout ce qui est nécessaire avant les travaux. Protection sols et évacuation gravats sont déjà obligatoires.') +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">' +
            b.check('demolition.deposeSanitaires', 'Dépose appareils sanitaires + mobilier', '300 €') +
            b.check('demolition.deposeWcSuspendu', 'Dépose toilettes suspendues', 'inclus') +
            b.check('demolition.deposeCarrelageMural', 'Dépose carrelage mural + plinthes', 'inclus') +
            b.check('demolition.deposeCoffrages', 'Dépose des coffrages tuyaux', '80 €') +
            b.check('demolition.repriseAlignements', 'Reprise alignements murs', '220 €') +
            b.check('demolition.ba13Hydro', 'Reprise murs avec BA13 hydro', '90 €/m²') +
          '</div>' +
          (b.checked('demolition.ba13Hydro') ? b.input('demolition.ba13SurfaceM2', 'Surface BA13 à reprendre', 'number', { suffix:'m²', step:'0.5' }) : '');
      }
    },

    {
      id: 'step-4-douche-baignoire', num: 4, title: 'Douche / baignoire', icon: '🚿',
      render: function(draft){
        var b = BindCtx;
        var choix = draft.formData['equipement.choix'] || '';
        var html = '<div style="display:flex;flex-direction:column;gap:14px;">' +
          b.toggle('equipement.choix', 'Choix de l\'équipement', [
            { value:'douche', label:'Douche' },
            { value:'baignoire', label:'Baignoire' },
            { value:'douche-baignoire', label:'Douche + Baignoire' },
            { value:'aucun', label:'Aucun' }
          ]);

        if(choix === 'douche' || choix === 'douche-baignoire'){
          /* Active automatiquement les triggers douche */
          html += '<div style="background:rgba(13,70,144,0.04);border:1px solid rgba(13,70,144,0.20);border-radius:10px;padding:14px;">' +
            '<div style="font-weight:700;color:#0d4690;margin-bottom:10px;font-family:Inter,sans-serif;">🚿 Douche</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">' +
              b.check('douche.plomberie', 'Pose receveur + raccordement (1200 €)') +
              b.check('douche.paroi', 'Paroi / porte de douche (280 €)') +
              b.check('douche.tablier', 'Création tablier receveur (120 €)') +
              b.check('douche.margelle', 'Création margelle (100 €)') +
              b.check('fournitures.receveurDouche', 'Receveur extraplat 80x120 (240 €)') +
              b.check('fournitures.mitigeurDouche', 'Mitigeur Hansgrohe (149 €)') +
              b.check('fournitures.kitBarreDouche', 'Kit barre + pommeau (69 €)') +
              b.check('fournitures.paroiFixe', 'Paroi fixe verre L80 (190 €)') +
              b.check('fournitures.paroiPivotante', 'Paroi pivotante (130 €)') +
              b.check('fournitures.grilleControle', 'Grille de contrôle (17 €)') +
            '</div>' +
          '</div>';
        }
        if(choix === 'baignoire' || choix === 'douche-baignoire'){
          html += '<div style="background:rgba(45,106,79,0.04);border:1px solid rgba(45,106,79,0.20);border-radius:10px;padding:14px;">' +
            '<div style="font-weight:700;color:#1d4d33;margin-bottom:10px;font-family:Inter,sans-serif;">🛁 Baignoire</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">' +
              b.check('baignoire.plomberie', 'Pose baignoire + raccordement (1200 €)') +
              b.check('baignoire.ecran', 'Écran de baignoire (95 €)') +
              b.check('baignoire.tablier', 'Création tablier baignoire (250 €)') +
              b.check('baignoire.margelle', 'Création margelle (100 €)') +
              b.check('fournitures.baignoire', 'Baignoire 170x70 (190 €)') +
              b.check('fournitures.mitigeurBain', 'Mitigeur Hansgrohe (179 €)') +
              b.check('fournitures.vidageBaignoire', 'Vidage automatique (75,30 €)') +
              b.check('fournitures.trappeAcces', 'Trappe d\'accès (67 €)') +
              b.check('fournitures.ecranBaignoire', 'Écran baignoire 70x140 (99 €)') +
            '</div>' +
          '</div>';
        }
        if(!choix || choix === 'aucun'){
          html += b.helpBox('Sélectionne le type d\'équipement bain pour faire apparaître les options.');
        }
        return html + '</div>';
      }
    },

    {
      id: 'step-5-toilettes', num: 5, title: 'Toilettes', icon: '🚽',
      render: function(draft){
        var b = BindCtx;
        var type = draft.formData['wc.type'] || '';
        var html = '<div style="display:flex;flex-direction:column;gap:14px;">' +
          b.toggle('wc.type', 'Type de WC', [
            { value:'aucun', label:'Aucun' },
            { value:'suspendu', label:'WC suspendu' },
            { value:'a-poser', label:'WC à poser' }
          ]);

        if(type === 'suspendu'){
          /* triggers : wc.suspendu.* */
          html += '<div style="background:rgba(74,53,101,0.04);border:1px solid rgba(74,53,101,0.20);border-radius:10px;padding:14px;">' +
            '<div style="font-weight:700;color:#4a3565;margin-bottom:10px;font-family:Inter,sans-serif;">🚽 WC suspendu</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">' +
              b.check('wc.suspendu.plomberie', 'Pose châssis + cuvette + plaque (630 €)') +
              b.check('wc.suspendu.habillage', 'Habillage du châssis (270 €)') +
              b.check('fournitures.chassisGeberit', 'Châssis Geberit UP320 (290 €)') +
              b.check('fournitures.plaqueSigma20', 'Plaque Sigma 20 chromé (115 €)') +
              b.check('fournitures.cuvetteSuspendue', 'Cuvette carénée + abattant (180 €)') +
            '</div>' +
          '</div>';
        } else if(type === 'a-poser'){
          html += '<div style="background:rgba(13,70,144,0.04);border:1px solid rgba(13,70,144,0.20);border-radius:10px;padding:14px;">' +
            '<div style="font-weight:700;color:#0d4690;margin-bottom:10px;font-family:Inter,sans-serif;">🚽 WC à poser</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">' +
              b.check('wc.aPoser.plomberie', 'Pose + raccordement + abattant (280 €)') +
              b.check('fournitures.packWcAPoser', 'Pack WC + abattant frein (180 €)') +
            '</div>' +
          '</div>';
        }
        return html + '</div>';
      }
    },

    {
      id: 'step-6-vasque', num: 6, title: 'Vasque & mobilier', icon: '🪞',
      render: function(draft){
        var b = BindCtx;
        var nbVasques = draft.formData['vasque.nombre'] || '';
        return '<div style="display:flex;flex-direction:column;gap:14px;">' +
          b.toggle('vasque.nombre', 'Nombre de vasques', [
            { value:'aucune', label:'Aucune' },
            { value:'simple', label:'Simple' },
            { value:'double', label:'Double' }
          ]) +
          (nbVasques === 'simple' ? '<div data-aj-trigger-set="vasque.plomberie.simple:true"></div>' : '') +
          (nbVasques === 'double' ? '<div data-aj-trigger-set="vasque.plomberie.double:true"></div>' : '') +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">' +
            b.check('vasque.plomberie.simple', 'Plomberie vasque simple (350 €)') +
            b.check('vasque.plomberie.double', 'Plomberie vasque double (450 €)') +
            b.check('vasque.meuble', 'Pose meuble sous-vasque (250 €)') +
            b.check('vasque.miroir', 'Pose miroir / armoire (80 €)') +
            b.check('vasque.colonneRangement', 'Pose colonne rangement (90 €)') +
            b.check('vasque.accessoires', 'Pose accessoires (80 €)') +
          '</div>' +
          '<div style="font-size:12px;color:#3a4a5c;font-weight:600;margin-top:6px;">Fournitures mobilier</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">' +
            b.check('fournitures.meubleSousVasque', 'Meuble sous-vasque L80 (350 €)') +
            b.check('fournitures.vasque', 'Vasque (120 €)') +
            b.check('fournitures.piedsMeuble', 'Lot 2 pieds meuble (29 €)') +
            b.check('fournitures.colonne', 'Colonne L30 H180 (160 €)') +
            b.check('fournitures.mitigeurLavabo', 'Mitigeur lavabo (89 €)') +
            b.check('fournitures.miroirSansEclairage', 'Miroir sans éclairage (80 €)') +
            b.check('fournitures.eclairageMiroir', 'Éclairage miroir LED (55 €)') +
            b.check('fournitures.bondeAuto', 'Bonde automatique (25 €)') +
            b.check('fournitures.deportSiphon', 'Déport siphon (19 €)') +
          '</div>';
      }
    },

    {
      id: 'step-7-carrelage', num: 7, title: 'Carrelage', icon: '🟫',
      render: function(draft){
        var b = BindCtx;
        var measures = computeMeasurements(draft.formData);
        return '<div style="display:flex;flex-direction:column;gap:14px;">' +
          b.helpBox('Surface sol et murale calculées depuis les mesures (étape 2). Modifie la hauteur de carrelage si besoin (défaut = HSP).') +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;">' +
            b.input('carrelage.hauteurMurale', 'Hauteur carrelage mural', 'number', { suffix:'m', step:'0.05', placeholder: String(measures.H) }) +
            b.input('carrelage.chutesPct', 'Chutes (% à ajouter)', 'number', { suffix:'%', step:'1', min:'0', max:'30' }) +
            b.input('carrelage.formatMural', 'Format mural', 'text', { placeholder:'30x60cm' }) +
            b.input('carrelage.formatSol', 'Format sol', 'text', { placeholder:'60x60cm' }) +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">' +
            b.check('carrelage.sol', 'Pose carrelage sol (' + measures.surfaceSol + ' m² × 140 €)') +
            b.check('carrelage.mural', 'Pose carrelage mural (' + measures.surfaceMurale + ' m² × 140 €)') +
            b.check('carrelage.plinthes', 'Plinthes carrelage (' + measures.plinthesML + ' ml × 28 €)') +
            b.check('carrelage.barreSeuil', 'Barre de seuil (25 €)') +
            b.check('carrelage.baguetteFinition', 'Baguette finition d\'angle (30 €)') +
            b.check('carrelage.poseTablier', 'Carrelage tablier (90 €)') +
            b.check('carrelage.poseMargelle', 'Carrelage margelle (90 €)') +
          '</div>' +
          '<div style="font-size:12px;color:#3a4a5c;font-weight:600;margin-top:6px;">Fournitures carrelage</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">' +
            b.check('fournitures.carrelageSol', 'Carrelage sol (' + measures.surfaceSolAvecChutes + ' m² × 30 €)') +
            b.check('fournitures.carrelageMural', 'Carrelage mural (' + measures.surfaceMuraleAvecChutes + ' m² × 35 €)') +
            b.check('fournitures.plinthesCarrelage', 'Plinthes carrelage (12 €/ml)') +
            b.check('fournitures.barreSeuil', 'Barre de seuil (20 €)') +
            b.check('fournitures.baguetteFinition', 'Baguette finition Alu mat (26 €)') +
          '</div>' +
          b.toggle('carrelage.fourniClient', 'Carrelage fourni par le client ?', ['Oui','Non']) +
          (BindCtx.valOf('carrelage.fourniClient') === 'Oui' ? b.helpBox('💡 Coché : les lignes de fourniture carrelage seront mises à 0 € avec mention "(fourni par le client)" dans le devis.', '#0d4690') : '');
      }
    },

    {
      id: 'step-8-plomberie', num: 8, title: 'Plomberie supplémentaire', icon: '🔧',
      render: function(draft){
        var b = BindCtx;
        var typeChaudiere = draft.formData['plomberie.chaudiere'] || '';
        return '<div style="display:flex;flex-direction:column;gap:14px;">' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">' +
            b.check('plomberie.laveLinge', 'Arrivée + évac lave-linge (180 €)') +
            b.check('plomberie.secheLinge', 'Évac sèche-linge (80 €)') +
            b.check('plomberie.ballonElectrique', 'Remplacement ballon électrique (450 €)') +
            b.check('options.remplacementVanne', 'Remplacement vanne d\'isolement (240 €)') +
          '</div>' +
          b.toggle('plomberie.chaudiere', 'Sèche-serviettes : type de chaudière', [
            { value:'aucun', label:'Aucun sèche-serv.' },
            { value:'individuelle', label:'Chaudière individuelle' },
            { value:'collective', label:'Chaudière collective' },
            { value:'electrique', label:'Sèche-serv. électrique' }
          ]) +
          (typeChaudiere === 'individuelle' ? '<div data-aj-trigger-set="plomberie.secheServiettesIndiv:true,fournitures.secheServiettesEauChaude:true,fournitures.tesRaccordement:true"></div>' : '') +
          (typeChaudiere === 'collective' ? '<div data-aj-trigger-set="plomberie.secheServiettesColl:true,fournitures.secheServiettesEauChaude:true,fournitures.tesRaccordement:true"></div><div style="background:rgba(232,98,26,0.08);border-left:3px solid #e8621a;padding:10px 14px;border-radius:6px;font-family:Inter,sans-serif;font-size:12px;color:#9a4514;">⚠ Intervention chauffagiste de l\'immeuble nécessaire avant et après notre intervention.</div>' : '') +
          (typeChaudiere === 'electrique' ? '<div data-aj-trigger-set="electricite.poseSecheServiettesElec:true,fournitures.secheServiettesElec:true"></div>' : '');
      }
    },

    {
      id: 'step-9-electricite', num: 9, title: 'Électricité', icon: '⚡',
      render: function(draft){
        var b = BindCtx;
        return '<div style="display:flex;flex-direction:column;gap:14px;">' +
          b.helpBox('Mise en sécurité électrique de la pièce toujours incluse (0 €).') +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">' +
            b.check('electricite.priseCredence', 'Reprise prise crédence (90 €)') +
            b.check('electricite.eclairagePlafond', 'Reprise éclairage plafond (135 €)') +
            b.check('electricite.eclairageMiroir', 'Reprise éclairage miroir (90 €)') +
            b.check('electricite.radiateur', 'Reprise radiateur (135 €)') +
            b.check('electricite.extracteur', 'Reprise extracteur d\'air (135 €)') +
            b.check('electricite.electromenager', 'Reprise alim. électroménager (135 €)') +
            b.check('electricite.poseEclairageMiroir', 'Pose éclairage miroir (60 €)') +
            b.check('electricite.posePlafonnier', 'Pose plafonnier (70 €)') +
            b.check('electricite.poseExtracteur', 'Pose extracteur (60 €)') +
          '</div>' +
          '<div style="font-size:12px;color:#3a4a5c;font-weight:600;margin-top:6px;">Fournitures électricité</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">' +
            b.check('fournitures.priseSimple', 'Prise simple LEGRAND (14,63 €)') +
            b.check('fournitures.priseDouble', 'Prise double LEGRAND (34,20 €)') +
            b.check('fournitures.interSimple', 'Inter simple LEGRAND (17,44 €)') +
            b.check('fournitures.interDouble', 'Inter double LEGRAND (32,51 €)') +
            b.check('fournitures.extracteurHygro', 'Extracteur hygrométrique (159 €)') +
            b.check('fournitures.boucheVMC', 'Bouche aération VMC (29 €)') +
          '</div>';
      }
    },

    {
      id: 'step-10-options', num: 10, title: 'Options (devis)', icon: '✨',
      render: function(draft){
        var b = BindCtx;
        return '<div style="display:flex;flex-direction:column;gap:10px;">' +
          b.helpBox('Les options apparaîtront dans le devis comme "lots optionnels" et n\'entreront pas dans le total HT principal. Le client peut les valider à la signature.', '#0d4690') +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px;">' +
            b.check('options.deposeCarrelageSol', '🔨 Dépose carrelage sol (450 €)', 'Si sol existant à enlever') +
            b.check('options.plafondSuspendu', '☁ Plafond suspendu (~905 €)', '210 €/m² + spots') +
            b.check('options.meubleSupplementaire', '📦 Meuble supplémentaire (90 €)', 'Pose colonne en plus') +
            b.check('options.nicheCarrelee', '⏹ Doublage + niche carrelée (916 €)', 'Coffrage BA13 + niche') +
            b.check('options.masquageTuyaux', '🔧 Masquage tuyaux apparents (460 €)', 'Coffrage + carrelage') +
            b.check('options.disjoncteurDifferentiel', '⚡ Disjoncteur diff. 30mA 63A (225 €)', 'Si non compris au tableau') +
            b.check('options.miseEnTeinte', '🎨 Mise en teinte peintures (180 €)', 'Au lieu de Blanc satiné') +
            b.check('options.placardSurMesure', '🚪 Placard sur mesure WC (520 €)', '2 portes MDF + étagères') +
            b.check('options.poigneePMR', '♿ Accessoires PMR (~200 €)', 'Poignée + siège PMR') +
            b.check('options.galandageAvecCadre', '➡ Porte galandage AVEC cadre (950 €)') +
            b.check('options.galandageSansCadre', '➡ Porte galandage SANS cadre (1380 €)') +
            b.check('options.porteApplique', '➡ Porte coulissante en applique (à chiffrer)') +
          '</div>';
      }
    },

    {
      id: 'step-11-fournitures', num: 11, title: 'Fournitures (mode)', icon: '📦',
      render: function(draft){
        var b = BindCtx;
        return '<div style="display:flex;flex-direction:column;gap:14px;">' +
          b.helpBox('Pour chaque catégorie de fournitures, choisis le mode : tu inclus dans le devis, le client fournit lui-même, ou à préciser plus tard.') +
          ['Carrelage','Douche','Baignoire','Mobilier','Radiateur','Toilettes','Ballon','Accessoires divers'].map(function(cat){
            var key = 'fourniture.mode.' + cat.toLowerCase().replace(/\s+/g,'-');
            return '<div style="background:#fff;border:1px solid var(--c-border,#e3dccc);border-radius:10px;padding:12px 14px;">' +
              '<div style="font-weight:700;color:#0f2030;font-family:Inter,sans-serif;font-size:13px;margin-bottom:8px;">' + safeEsc(cat) + '</div>' +
              b.toggle(key, '', [
                { value:'inclus', label:'Inclus dans le devis' },
                { value:'client', label:'Fourni par le client' },
                { value:'a-preciser', label:'À préciser plus tard' }
              ]) +
            '</div>';
          }).join('');
      }
    },

    {
      id: 'step-12-recap', num: 12, title: 'Récapitulatif & génération', icon: '✅',
      render: function(draft){
        return renderRecap(draft);
      }
    }
  ];

  /* ─── ÉTAPE 12 : RÉCAPITULATIF ÉDITABLE ─── */
  function renderRecap(draft){
    var template = getBathroomTemplate();
    var lines = generateLines(template, draft.formData);
    var settings = { vatRate: template.vatRate, depositPct: template.depositPct };
    var totals = computeTotals(lines, settings);

    /* Stocke résultat sur le draft pour le commit C */
    draft.lines = lines;
    draft.totals = totals;

    var hasOptions = lines.some(function(s){ return s.isOption; });

    return '<div style="display:flex;flex-direction:column;gap:14px;">' +
      /* Bandeau client */
      '<div style="background:#fbf8f2;border:1px solid var(--c-border,#e3dccc);border-radius:10px;padding:14px 16px;font-family:Inter,sans-serif;">' +
        '<div style="font-size:11px;color:#7a8896;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:4px;">Client</div>' +
        '<div style="font-weight:700;color:#0f2030;font-size:15px;">' + safeEsc((draft.formData['client.prenom']||'') + ' ' + (draft.formData['client.nom']||'') || '— à compléter étape 1') + '</div>' +
        '<div style="font-size:12px;color:#3a4a5c;">' + safeEsc(draft.formData['client.adresseChantier']||'') + '</div>' +
      '</div>' +

      /* Tableau des lignes */
      lines.map(function(sec){
        var optBadge = sec.isOption ? '<span style="background:rgba(232,98,26,0.15);color:#9a4514;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;margin-left:8px;">OPTION</span>' : '';
        return '<div style="background:#fff;border:1px solid var(--c-border,#e3dccc);border-radius:10px;overflow:hidden;font-family:Inter,sans-serif;">' +
          '<div style="background:#fbf8f2;padding:10px 14px;border-bottom:1px solid var(--c-border,#e3dccc);display:flex;justify-content:space-between;align-items:center;">' +
            '<div style="font-weight:700;color:#0f2030;font-size:13px;">' + sec.sectionNum + '. ' + safeEsc(sec.sectionTitle) + optBadge + '</div>' +
            '<div style="font-weight:700;color:#0f2030;font-size:13px;">' + fmtEur(sec.sousTotal) + '</div>' +
          '</div>' +
          '<div>' +
          sec.items.map(function(it){
            return '<div style="display:grid;grid-template-columns:80px 1fr 70px 90px 100px;gap:8px;align-items:center;padding:8px 14px;border-bottom:1px solid rgba(15,32,48,0.05);font-size:12px;">' +
              '<div style="color:#7a8896;font-family:monospace;">' + safeEsc(it.key) + '</div>' +
              '<div style="color:#0f2030;line-height:1.4;"><input type="text" data-aj-bind="override.' + it.key + '.label" value="' + (it.label || '').replace(/"/g,'&quot;') + '" style="width:100%;background:transparent;border:none;font-family:Inter,sans-serif;font-size:12px;color:#0f2030;padding:2px 4px;border-radius:4px;" /></div>' +
              '<div><input type="number" data-aj-bind="override.' + it.key + '.qty" value="' + it.qty + '" step="0.01" style="width:100%;text-align:right;padding:4px 6px;border:1px solid var(--c-border,#e3dccc);border-radius:4px;font-family:Inter,sans-serif;font-size:12px;background:#fff;" /></div>' +
              '<div><input type="number" data-aj-bind="override.' + it.key + '.price" value="' + it.price + '" step="0.01" style="width:100%;text-align:right;padding:4px 6px;border:1px solid var(--c-border,#e3dccc);border-radius:4px;font-family:Inter,sans-serif;font-size:12px;background:#fff;" /> <span style="color:#7a8896;font-size:10px;">' + safeEsc(it.unit) + '</span></div>' +
              '<div style="text-align:right;font-weight:600;color:' + (it.total < 0 ? '#c62828' : '#0f2030') + ';">' + fmtEur(it.total) + '</div>' +
            '</div>';
          }).join('') +
          '</div>' +
        '</div>';
      }).join('') +

      /* Bandeau totaux */
      '<div style="background:linear-gradient(135deg,#0f2030,#1a3349);color:#fff;border-radius:14px;padding:20px 24px;font-family:Inter,sans-serif;">' +
        '<div style="font-family:Cormorant Garamond,Georgia,serif;font-size:14px;color:#c9a96e;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;margin-bottom:14px;">Totaux</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">' +
          '<div><div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;">Total HT</div><div style="font-size:22px;font-weight:600;margin-top:2px;">' + fmtEur(totals.totalHT) + '</div></div>' +
          '<div><div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;">TVA ' + totals.vatRate + '%</div><div style="font-size:22px;font-weight:600;margin-top:2px;">' + fmtEur(totals.tva) + '</div></div>' +
          '<div><div style="font-size:11px;color:#c9a96e;text-transform:uppercase;font-weight:600;">Total TTC</div><div style="font-size:26px;font-weight:700;margin-top:2px;color:#c9a96e;">' + fmtEur(totals.totalTTC) + '</div></div>' +
          '<div><div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;">Acompte ' + totals.depositPct + '%</div><div style="font-size:18px;font-weight:600;margin-top:2px;">' + fmtEur(totals.acompte) + '</div></div>' +
        '</div>' +
        (hasOptions ? '<div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.15);font-size:12px;color:rgba(255,255,255,0.75);">+ <b style="color:#c9a96e;">' + fmtEur(totals.totalOptionsHT) + '</b> en options HT (à valider par le client à la signature)</div>' : '') +
      '</div>' +

      /* Boutons d'action */
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">' +
        '<button onclick="AJBath.wizardSaveDraft()" style="flex:1;min-width:160px;padding:14px;background:#fff;border:1px solid var(--c-border,#e3dccc);border-radius:10px;cursor:pointer;font-weight:600;color:#0f2030;font-family:Inter,sans-serif;font-size:14px;">💾 Enregistrer brouillon</button>' +
        '<button onclick="AJBath.wizardEmit()" style="flex:2;min-width:200px;padding:14px;background:#1d4d33;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-family:Inter,sans-serif;font-size:14px;">📋 Émettre devis officiel (commit C)</button>' +
      '</div>' +
      '<div style="font-size:11px;color:#7a8896;text-align:center;font-family:Inter,sans-serif;font-style:italic;">L\'émission verrouillée + génération PDF arrivent au commit C. Pour l\'instant tu peux saisir et enregistrer un brouillon.</div>';
  }

  /* ─── MACHINE D'ÉTAT WIZARD ─── */
  var _currentDraft = null;
  var _currentStepIdx = 0;

  function wizardStartNew(){
    /* IMPORTANT : créer l'écran AVANT showScreen (sinon crash dans le DOM) */
    ensureWizardScreen();
    _currentDraft = newDraft();
    _currentStepIdx = 0;
    saveDraft(_currentDraft);
    if(typeof showScreen === 'function') showScreen('screen-bathroom-wizard');
    setTimeout(wizardRender, 30);
  }

  function wizardOpen(draftId){
    /* IMPORTANT : créer l'écran AVANT showScreen */
    ensureWizardScreen();
    var drafts = getDrafts();
    var d = drafts.find(function(q){ return q.id === draftId; });
    if(!d){ showToast('Brouillon introuvable'); return; }
    _currentDraft = d;
    _currentStepIdx = (d.currentStep || 1) - 1;
    if(typeof showScreen === 'function') showScreen('screen-bathroom-wizard');
    setTimeout(wizardRender, 30);
  }

  function wizardClose(){
    if(_currentDraft) saveDraft(_currentDraft);
    _currentDraft = null;
    if(typeof showScreen === 'function') showScreen('screen-bathroom-quote');
  }

  function wizardSetField(path, value){
    if(!_currentDraft) return;
    if(value === '' || value == null){
      delete _currentDraft.formData[path];
    } else {
      _currentDraft.formData[path] = value;
    }
    /* Auto-save debounced */
    clearTimeout(wizardSetField._t);
    wizardSetField._t = setTimeout(function(){
      saveDraft(_currentDraft);
      /* Refresh récap si on est dessus */
      if(_currentStepIdx === STEPS.length - 1) wizardRender();
    }, 350);
  }

  function wizardNext(){
    if(_currentStepIdx < STEPS.length - 1){
      _currentStepIdx++;
      _currentDraft.currentStep = _currentStepIdx + 1;
      saveDraft(_currentDraft);
      wizardRender();
      window.scrollTo(0, 0);
    }
  }

  function wizardPrev(){
    if(_currentStepIdx > 0){
      _currentStepIdx--;
      _currentDraft.currentStep = _currentStepIdx + 1;
      saveDraft(_currentDraft);
      wizardRender();
      window.scrollTo(0, 0);
    }
  }

  function wizardGoTo(idx){
    if(idx < 0 || idx >= STEPS.length) return;
    _currentStepIdx = idx;
    _currentDraft.currentStep = idx + 1;
    saveDraft(_currentDraft);
    wizardRender();
    window.scrollTo(0, 0);
  }

  function wizardSaveDraft(){
    if(!_currentDraft) return;
    saveDraft(_currentDraft);
    showToast('Brouillon enregistré ✓');
  }

  /* ─── ÉMISSION DU DEVIS OFFICIEL (Commit C) ─── */
  function reserveDevisNumber(){
    if(typeof dbLoad !== 'function' || typeof safeSave !== 'function') return null;
    var db = dbLoad();
    db.numbering = db.numbering || {};
    var year = new Date().getFullYear();
    var current = db.numbering.devis || { year: year, counter: 0 };
    if(current.year !== year) current = { year: year, counter: 0 };
    current.counter++;
    db.numbering.devis = current;
    safeSave(db);
    return 'DEV-' + year + '-' + String(current.counter).padStart(3, '0');
  }

  function wizardEmit(){
    if(!_currentDraft){ showToast('Aucun brouillon en cours'); return; }
    /* Validation minimale */
    var fd = _currentDraft.formData;
    if(!fd['client.nom'] && !fd['client.prenom']){
      showToast('⚠ Saisis au moins un nom client (étape 1)');
      _currentStepIdx = 0; wizardRender();
      return;
    }
    var template = getBathroomTemplate();
    var lines = generateLines(template, fd);
    if(!lines.length){
      showToast('⚠ Aucune prestation cochée — passe par les étapes pour activer des lignes');
      return;
    }
    var totals = computeTotals(lines, { vatRate: template.vatRate, depositPct: template.depositPct });

    var msg = 'Vous êtes sur le point d\'émettre un DEVIS OFFICIEL avec un numéro chronologique.\n\n' +
              '⚠ Une fois émis :\n' +
              '• Le numéro est réservé permanently\n' +
              '• Le contenu est verrouillé (snapshot immutable)\n' +
              '• Pour corriger, vous devrez créer un nouveau devis ou un avoir\n\n' +
              'Total TTC : ' + fmtEur(totals.totalTTC) + '\n' +
              'Acompte ' + totals.depositPct + '% : ' + fmtEur(totals.acompte);

    customConfirm(msg,
      function(){
        var number = reserveDevisNumber();
        if(!number){ showToast('⚠ Erreur réservation numéro'); return; }

        /* Snapshot immutable */
        var emetteur = getEmetteur();
        var snapshot = {
          formData: JSON.parse(JSON.stringify(fd)),
          lines: JSON.parse(JSON.stringify(lines)),
          totals: JSON.parse(JSON.stringify(totals)),
          template: { templateId: template.templateId, version: template.version, vatRate: template.vatRate, depositPct: template.depositPct },
          emetteur: emetteur,
          legalMentions: template.legalMentions,
          cgv: template.cgv,
          timestamp: Date.now()
        };

        var doc = {
          id: 'doc_bath_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
          type: 'devis',
          subtype: 'bathroom',
          number: number,
          date: new Date().toISOString().slice(0, 10),
          emittedAt: Date.now(),
          clientId: null, /* devis SDB n'a pas de clientId (formData inline) */
          snapshot: snapshot,
          totals: { totalHT: totals.totalHT, htMarge: totals.totalHT, ttc: totals.totalTTC, tva: totals.tva, marge: 0 },
          locked: true,
          status: 'emis'
        };

        var db = dbLoad();
        db.documents = db.documents || [];
        db.documents.push(doc);

        /* Marque le brouillon comme émis */
        if(_currentDraft){
          _currentDraft.status = 'emis';
          _currentDraft.emittedDocId = doc.id;
          _currentDraft.emittedNumber = number;
          var idx = (db.quotes || []).findIndex(function(q){ return q.id === _currentDraft.id; });
          if(idx >= 0) db.quotes[idx] = _currentDraft;
        }
        safeSave(db);

        showToast('✓ Devis ' + number + ' émis et verrouillé');
        setTimeout(function(){ ajBathGeneratePDF(doc.id); }, 300);
        setTimeout(function(){
          wizardClose();
          renderBathroomScreen();
        }, 600);
      },
      { title: 'Émettre devis officiel ?', okLabel: 'Émettre — verrouillage immédiat' });
  }

  /* ─── GÉNÉRATION PDF FIDÈLE AU MODÈLE $002612 ─── */
  function loadJsPDF(cb){
    if(window.jspdf && window.jspdf.jsPDF) return cb();
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.crossOrigin = 'anonymous';
    s.onload = function(){ if(window.jspdf && window.jspdf.jsPDF) cb(); else showToast('⚠ Erreur jsPDF'); };
    s.onerror = function(){ showToast('⚠ Échec chargement jsPDF (vérifiez Internet)'); };
    document.body.appendChild(s);
  }

  /* Strip emojis + caractères non supportés par Helvetica */
  function pdfClean(s){
    if(s == null) return '';
    return String(s)
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F0FF}]/gu, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* Couleurs AJ PRO (RGB) */
  var PDF_COLORS = {
    night:   [15, 32, 48],
    primary: [26, 51, 73],
    gold:    [201, 169, 110],
    cream:   [251, 248, 242],
    border:  [227, 220, 204],
    text:    [15, 32, 48],
    muted:   [122, 136, 150],
    light:   [228, 228, 228],
    danger:  [198, 40, 40],
    headerBg:[44, 90, 160]
  };

  /* Charge le logo si /logo-ajpro.png existe (silencieux si absent) */
  function loadLogo(cb){
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){
      try {
        var canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        cb(canvas.toDataURL('image/png'));
      } catch(e){ cb(null); }
    };
    img.onerror = function(){ cb(null); };
    img.src = '/logo-ajpro.png';
  }

  window.ajBathGeneratePDF = function(docId){
    var db = dbLoad();
    var doc = (db.documents || []).find(function(d){ return d.id === docId; });
    if(!doc){ showToast('Document introuvable'); return; }
    if(!doc.snapshot){ showToast('⚠ Snapshot manquant'); return; }
    showToast('Génération PDF...');
    loadJsPDF(function(){
      loadLogo(function(logoDataURL){
        try { buildBathPDF(doc, logoDataURL); }
        catch(e){
          console.error(e);
          showToast('⚠ Erreur PDF : ' + (e.message || e));
        }
      });
    });
  };

  function buildBathPDF(doc, logoDataURL){
    var snap = doc.snapshot;
    var emetteur = snap.emetteur;
    var fd = snap.formData;
    var lines = snap.lines;
    var totals = snap.totals;
    var legal = snap.legalMentions || {};
    var cgv = snap.cgv || [];

    var pdf = new window.jspdf.jsPDF({ unit:'mm', format:'a4', compress:true });
    var pageW = 210, pageH = 297;
    var marginX = 12, marginTop = 10, marginBottom = 18;
    var contentW = pageW - 2*marginX;

    var setText = function(c){ pdf.setTextColor(c[0], c[1], c[2]); };
    var setFill = function(c){ pdf.setFillColor(c[0], c[1], c[2]); };
    var setDraw = function(c){ pdf.setDrawColor(c[0], c[1], c[2]); };

    /* ─── Filigrane "Brouillon" si statut autre qu'émis (devrait pas arriver ici puisqu'on émet, mais pour sécurité) ─── */
    var isBrouillon = doc.status !== 'emis';
    function drawWatermark(){
      if(!isBrouillon) return;
      try {
        pdf.saveGraphicsState();
        pdf.setGState(new pdf.GState({opacity: 0.12}));
        setText(PDF_COLORS.danger);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(110);
        pdf.text('Brouillon', pageW/2, pageH/2 + 30, { align:'center', angle: 30 });
        pdf.restoreGraphicsState();
      } catch(e){
        /* Fallback sans GState */
        pdf.setTextColor(248, 215, 218);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(100);
        pdf.text('Brouillon', pageW/2, pageH/2 + 30, { align:'center', angle: 30 });
      }
    }

    /* ─── Header de page (n=1 : full header ; n>1 : header compact) ─── */
    function drawPageHeader(isFirst){
      drawWatermark();

      if(isFirst){
        /* Bandeau supérieur : fond blanc, séparateur or */
        /* Logo zone gauche */
        if(logoDataURL){
          try { pdf.addImage(logoDataURL, 'PNG', marginX, marginTop, 32, 22); }
          catch(e){ drawLogoText(); }
        } else {
          drawLogoText();
        }

        /* Titre devis + chantier zone droite */
        setText(PDF_COLORS.text);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.text('Devis n° ' + pdfClean(doc.number) + ' du ' + new Date(doc.date).toLocaleDateString('fr-FR'), pageW - marginX, marginTop + 4, { align:'right' });
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        setText(PDF_COLORS.muted);
        pdf.text('Chantier :', pageW - marginX, marginTop + 11, { align:'right' });
        setText(PDF_COLORS.text);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        var chantier = pdfClean((fd['client.prenom'] || '') + ' ' + (fd['client.nom'] || ''));
        if(chantier) pdf.text(chantier, pageW - marginX, marginTop + 16, { align:'right' });
        if(fd['client.adresseChantier']){
          var addr = pdf.splitTextToSize(pdfClean(fd['client.adresseChantier']), 80);
          pdf.text(addr, pageW - marginX, marginTop + 21, { align:'right' });
        }

        /* Activités sous le logo */
        setText(PDF_COLORS.text);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        var activitesLines = pdf.splitTextToSize(pdfClean(emetteur.activites), 90);
        pdf.text(activitesLines.slice(0, 4), marginX, marginTop + 28);

        /* Bloc émetteur encadré (zone gauche, plus bas) */
        var emY = 60;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        setText(PDF_COLORS.text);
        pdf.text(pdfClean(emetteur.raisonSociale || emetteur.nom || 'AJ PRO RÉNOVATION'), marginX, emY);
        emY += 6;
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(9);
        setText(PDF_COLORS.muted);
        var addrParts = (emetteur.adresse || '').split(',').map(function(p){ return p.trim(); });
        addrParts.forEach(function(p){
          pdf.text(pdfClean(p), marginX, emY);
          emY += 4;
        });
        if(emetteur.email) { pdf.text('Email : ' + pdfClean(emetteur.email), marginX, emY); emY += 4; }
        if(emetteur.tel) { pdf.text('Tél : ' + pdfClean(emetteur.tel), marginX, emY); emY += 4; }
        emY += 2;
        pdf.text(pdfClean(emetteur.rcs || ''), marginX, emY);

        return 95; /* y de départ pour le tableau */
      } else {
        /* Pages suivantes : header compact */
        setText(PDF_COLORS.text);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('Devis n° ' + pdfClean(doc.number), marginX, marginTop + 5);
        setText(PDF_COLORS.muted);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        var chantier = pdfClean((fd['client.prenom'] || '') + ' ' + (fd['client.nom'] || ''));
        pdf.text(chantier, pageW - marginX, marginTop + 5, { align:'right' });
        return marginTop + 12;
      }
    }

    function drawLogoText(){
      setFill(PDF_COLORS.night);
      pdf.rect(marginX, marginTop, 32, 22, 'F');
      setText(PDF_COLORS.gold);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('AJ', marginX + 16, marginTop + 9, { align:'center' });
      pdf.setFontSize(7);
      setText([255,255,255]);
      pdf.text('PRO', marginX + 16, marginTop + 14, { align:'center' });
      pdf.setFontSize(5);
      setText(PDF_COLORS.gold);
      pdf.text('RÉNOVATION', marginX + 16, marginTop + 19, { align:'center' });
    }

    /* ─── En-tête tableau ─── */
    function drawTableHeader(y){
      setFill(PDF_COLORS.headerBg);
      pdf.rect(marginX, y, contentW, 7, 'F');
      setText([255,255,255]);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.text('N°', marginX + 2, y + 5);
      pdf.text('Désignation', marginX + 16, y + 5);
      pdf.text('Qté', marginX + contentW - 60, y + 5, { align:'right' });
      pdf.text('U', marginX + contentW - 47, y + 5, { align:'right' });
      pdf.text('PUHT', marginX + contentW - 28, y + 5, { align:'right' });
      pdf.text('Total H.T', marginX + contentW - 2, y + 5, { align:'right' });
      return y + 7;
    }

    /* ─── Footer ─── */
    function drawFooter(){
      setText(PDF_COLORS.muted);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      var footY = pageH - 12;
      var line1 = 'Sarl ' + pdfClean(emetteur.raisonSociale || 'AJ Pro Rénovation') + ' au capital de ' + pdfClean(emetteur.capital || '7 500 €') + ' - Tel : ' + pdfClean(emetteur.tel || '') + ' - Email : ' + pdfClean(emetteur.email || '');
      var line2 = 'APE : ' + pdfClean(emetteur.ape || '4120A') + ' - SIRET : ' + pdfClean(emetteur.siret || '') + ' - TVA intracommunautaire : ' + pdfClean(emetteur.tvaIntracom || emetteur.tva || '');
      var line3 = 'IBAN : ' + pdfClean(emetteur.iban || '') + ' - BIC : ' + pdfClean(emetteur.bic || '');
      pdf.text(line1, pageW/2, footY, { align:'center' });
      pdf.text(line2, pageW/2, footY + 3, { align:'center' });
      pdf.text(line3, pageW/2, footY + 6, { align:'center' });
      pdf.text(pdfClean(doc.number), marginX, footY + 6);
      var totalPages = pdf.internal.getNumberOfPages();
      var currentPage = pdf.internal.getCurrentPageInfo().pageNumber;
      pdf.text('page ' + currentPage + ' sur ' + totalPages, pageW - marginX, footY + 6, { align:'right' });
    }

    /* ─── Dessine une ligne du tableau ─── */
    function drawTableRow(item, num, y, alt){
      var rowH = 0;
      /* Calcule la hauteur nécessaire selon la longueur de la désignation */
      var labelLines = pdf.splitTextToSize(pdfClean(item.label), contentW - 90);
      rowH = Math.max(6, labelLines.length * 3.4 + 2);
      var descLines = [];
      if(item.description){
        var desc = pdfClean(item.description);
        if(desc && desc !== pdfClean(item.label)){
          descLines = pdf.splitTextToSize(desc, contentW - 90);
          rowH += descLines.length * 3.0;
        }
      }
      rowH += 2; /* padding */

      /* Saut de page si nécessaire */
      if(y + rowH > pageH - marginBottom - 10){
        drawFooter();
        pdf.addPage();
        y = drawPageHeader(false);
        y = drawTableHeader(y);
      }

      /* Fond alterné */
      if(alt){ setFill([249, 247, 243]); pdf.rect(marginX, y, contentW, rowH, 'F'); }

      /* Bordures */
      setDraw(PDF_COLORS.border);
      pdf.setLineWidth(0.1);
      pdf.line(marginX, y + rowH, marginX + contentW, y + rowH);

      /* N° */
      setText(PDF_COLORS.text);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.text(pdfClean(num), marginX + 2, y + 4);

      /* Désignation */
      var dy = y + 4;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.text(labelLines, marginX + 16, dy);
      dy += labelLines.length * 3.4;
      if(descLines.length){
        pdf.setFontSize(7.5);
        setText(PDF_COLORS.muted);
        pdf.text(descLines, marginX + 16, dy);
      }

      /* Qté */
      setText(PDF_COLORS.text);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      var qtyStr = item.qty != null ? String(item.qty).replace('.', ',') : '';
      pdf.text(qtyStr, marginX + contentW - 60, y + 4, { align:'right' });

      /* Unité */
      pdf.text(pdfClean(item.unit || ''), marginX + contentW - 47, y + 4, { align:'right' });

      /* PUHT */
      var puhtStr = item.price ? Number(item.price).toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2}) : '';
      pdf.text(puhtStr, marginX + contentW - 28, y + 4, { align:'right' });

      /* Total HT (rouge si négatif) */
      if(item.total < 0) setText(PDF_COLORS.danger);
      var totalStr = (item.total != null && item.total !== 0)
        ? Number(item.total).toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2})
        : (item.total === 0 && (item.showWhenZero || item.displayOnly) ? '0,00' : '');
      pdf.text(totalStr, marginX + contentW - 2, y + 4, { align:'right' });
      setText(PDF_COLORS.text);

      return y + rowH;
    }

    /* ─── En-tête de section ─── */
    function drawSectionHeader(sec, y){
      var rowH = 7;
      if(y + rowH > pageH - marginBottom - 10){
        drawFooter();
        pdf.addPage();
        y = drawPageHeader(false);
        y = drawTableHeader(y);
      }
      setFill(PDF_COLORS.cream);
      pdf.rect(marginX, y, contentW, rowH, 'F');
      setDraw(PDF_COLORS.border);
      pdf.line(marginX, y + rowH, marginX + contentW, y + rowH);

      setText(PDF_COLORS.text);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text(String(sec.sectionNum), marginX + 2, y + 5);
      var titleLines = pdf.splitTextToSize(pdfClean(sec.sectionTitle), contentW - 60);
      pdf.text(titleLines[0] || '', marginX + 16, y + 5);

      if(sec.isOption){
        setFill([232, 98, 26]);
        pdf.rect(marginX + contentW - 30, y + 1.5, 28, 4, 'F');
        setText([255,255,255]);
        pdf.setFontSize(7);
        pdf.text('OPTION', marginX + contentW - 16, y + 4.5, { align:'center' });
      }
      return y + rowH;
    }

    /* ─── Sous-total de section ─── */
    function drawSectionTotal(sec, y){
      var rowH = 7;
      if(y + rowH > pageH - marginBottom - 10){
        drawFooter();
        pdf.addPage();
        y = drawPageHeader(false);
        y = drawTableHeader(y);
      }
      setFill(PDF_COLORS.light);
      pdf.rect(marginX, y, contentW, rowH, 'F');
      setText(PDF_COLORS.text);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      var lbl = 'Sous-total ' + pdfClean(sec.sectionTitle);
      var lblLines = pdf.splitTextToSize(lbl, contentW - 50);
      pdf.text(lblLines[0] || lbl, marginX + 16, y + 5);
      if(sec.isOption){
        pdf.setFontSize(7);
        pdf.text('Option', marginX + contentW - 35, y + 5, { align:'right' });
        pdf.setFontSize(8.5);
      }
      var totStr = sec.sousTotal !== 0
        ? Number(sec.sousTotal).toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2})
        : '';
      pdf.text(totStr, marginX + contentW - 2, y + 5, { align:'right' });
      return y + rowH + 1;
    }

    /* ═══ CONSTRUCTION DU PDF ═══ */
    var y = drawPageHeader(true);
    y = drawTableHeader(y);

    var altRow = false;
    lines.forEach(function(sec){
      y = drawSectionHeader(sec, y);
      sec.items.forEach(function(item){
        y = drawTableRow(item, item.key, y, altRow);
        altRow = !altRow;
      });
      y = drawSectionTotal(sec, y);
      altRow = false;
    });

    /* ═══ Encart totaux ═══ */
    if(y + 70 > pageH - marginBottom){
      drawFooter();
      pdf.addPage();
      y = drawPageHeader(false);
    }
    y += 4;

    /* Mention TVA légale */
    setText(PDF_COLORS.text);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    var tvaLines = pdf.splitTextToSize(pdfClean(legal.tvaText || ''), contentW * 0.55);
    pdf.text(tvaLines, marginX, y + 4);

    /* Encart totaux à droite */
    var boxX = marginX + contentW * 0.6;
    var boxW = contentW * 0.4;
    var boxY = y;
    setDraw(PDF_COLORS.text);
    pdf.setLineWidth(0.3);
    pdf.rect(boxX, boxY, boxW, 26);
    setText(PDF_COLORS.text);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('Devis (EUR)', boxX + 3, boxY + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    var boxLineY = boxY + 10;
    pdf.text('Total H.T', boxX + 3, boxLineY);
    pdf.text(totals.totalHT.toLocaleString('fr-FR', {minimumFractionDigits:2}), boxX + boxW - 3, boxLineY, { align:'right' });
    boxLineY += 5;
    pdf.text('TVA', boxX + 3, boxLineY);
    pdf.text(totals.tva.toLocaleString('fr-FR', {minimumFractionDigits:2}), boxX + boxW - 3, boxLineY, { align:'right' });
    boxLineY += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total T.T.C', boxX + 3, boxLineY);
    pdf.text(totals.totalTTC.toLocaleString('fr-FR', {minimumFractionDigits:2}), boxX + boxW - 3, boxLineY, { align:'right' });

    /* Tableau % TVA / Base / Total TVA */
    var tvaTblY = boxY + 28;
    setFill(PDF_COLORS.cream);
    pdf.rect(boxX, tvaTblY, boxW, 5, 'F');
    setText(PDF_COLORS.text);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.text('% TVA', boxX + 3, tvaTblY + 3.5);
    pdf.text('Base', boxX + boxW/2, tvaTblY + 3.5, { align:'center' });
    pdf.text('Total TVA', boxX + boxW - 3, tvaTblY + 3.5, { align:'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.text(totals.vatRate.toFixed(2).replace('.',',') + '%', boxX + 3, tvaTblY + 9);
    pdf.text(totals.totalHT.toLocaleString('fr-FR', {minimumFractionDigits:2}), boxX + boxW/2, tvaTblY + 9, { align:'center' });
    pdf.text(totals.tva.toLocaleString('fr-FR', {minimumFractionDigits:2}), boxX + boxW - 3, tvaTblY + 9, { align:'right' });

    y = tvaTblY + 14;

    /* Validité, mode règlement, conditions */
    setText(PDF_COLORS.text);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Validité du devis : ' + new Date(doc.date).toLocaleDateString('fr-FR'), marginX, y);
    y += 4;
    pdf.text('Délai de règlement :', marginX, y);
    y += 4;
    pdf.text('Mode de règlement : ' + pdfClean(legal.paymentMode || 'Virement'), marginX, y);
    y += 4;
    pdf.text('Conditions de règlement :', marginX, y);
    y += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text('  • ' + (totals.depositPct || 30) + ',00% à la signature à verser sur le compte IBAN : ' + pdfClean(emetteur.iban || ''), marginX + 2, y);
    y += 4;
    pdf.text('    soit ' + totals.acompte.toLocaleString('fr-FR', {minimumFractionDigits:2}) + ' EUR TTC', marginX + 2, y);
    y += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Délai de règlement : Règlement comptant', marginX, y);
    y += 6;

    /* Assurance */
    pdf.setFontSize(8.5);
    pdf.text('Assurance Professionnelle : ' + pdfClean(emetteur.assurance || ''), marginX, y);
    y += 4;
    pdf.text('Activités couvertes : ' + pdfClean(emetteur.assuranceActivites || ''), marginX, y);
    y += 4;
    pdf.text('Attestation fournie sur simple demande', marginX, y);
    y += 8;

    /* Bloc signature */
    if(y + 40 > pageH - marginBottom){
      drawFooter(); pdf.addPage(); y = drawPageHeader(false);
    }
    setDraw(PDF_COLORS.border);
    pdf.setLineWidth(0.3);
    pdf.rect(marginX, y, contentW * 0.6, 38);
    setText(PDF_COLORS.text);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('Devis n° ' + pdfClean(doc.number), marginX + 3, y + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    var sigText = pdf.splitTextToSize(pdfClean(legal.signatureText || ''), contentW * 0.55);
    pdf.text(sigText, marginX + 3, y + 11);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    setText(PDF_COLORS.text);
    pdf.text('Pour l\'Entreprise', marginX + contentW * 0.65, y + 5);

    drawFooter();

    /* ═══ PAGE CGV ═══ */
    pdf.addPage();
    drawWatermark();
    var cgvY = marginTop + 4;
    setText(PDF_COLORS.text);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('Conditions générales de vente', pageW/2, cgvY, { align:'center' });
    cgvY += 8;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    var introCgv = pdf.splitTextToSize(pdfClean('Toute commande de travaux implique de la part du client l\'acceptation sans réserve des conditions générales ci-dessous et la renonciation à ses propres conditions, sauf convention spéciale contraire écrite.'), contentW);
    pdf.text(introCgv, marginX, cgvY);
    cgvY += introCgv.length * 3.2 + 2;

    cgv.forEach(function(article){
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      var articleText = 'Article ' + pdfClean(article.article);
      pdf.text(articleText, marginX, cgvY);
      cgvY += 4;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      var bodyLines = pdf.splitTextToSize(pdfClean(article.text), contentW);
      if(cgvY + bodyLines.length * 3 > pageH - marginBottom - 6){
        drawFooter();
        pdf.addPage();
        drawWatermark();
        cgvY = marginTop + 4;
      }
      pdf.text(bodyLines, marginX, cgvY);
      cgvY += bodyLines.length * 3 + 2;
    });

    drawFooter();

    /* ═══ Re-pass pour numéroter toutes les pages avec le bon total ═══ */
    var totalPages = pdf.internal.getNumberOfPages();
    for(var p = 1; p <= totalPages; p++){
      pdf.setPage(p);
      /* On efface l'ancien footer en redessinant un fond blanc dessus */
      setFill([255,255,255]);
      pdf.rect(0, pageH - 13, pageW, 13, 'F');
      drawFooter();
    }

    /* Sauvegarde */
    var nameSafe = pdfClean(fd['client.nom'] || 'client').replace(/[^a-zA-Z0-9-]/g, '-');
    var fname = doc.number + '-' + nameSafe + '.pdf';
    pdf.save(fname);
    showToast('PDF ' + doc.number + ' téléchargé ✓');
  }

  /* ─── Override ajGenerateLegalPDF pour rediriger les devis SDB ───
     Différé via setTimeout : la Phase Légal (qui définit ajGenerateLegalPDF
     dans index.html) s'exécute APRÈS bathroom-quote.js. Sans setTimeout,
     notre override serait écrasé. */
  setTimeout(function(){
    if(window.__AJ_BATH_LEGAL_PATCHED) return;
    window.__AJ_BATH_LEGAL_PATCHED = true;
    var _origLegalPDF = window.ajGenerateLegalPDF;
    window.ajGenerateLegalPDF = function(docId){
      try {
        var db = dbLoad();
        var d = (db.documents || []).find(function(x){ return x.id === docId; });
        if(d && d.subtype === 'bathroom'){
          return ajBathGeneratePDF(docId);
        }
      } catch(e){}
      if(typeof _origLegalPDF === 'function') return _origLegalPDF.apply(this, arguments);
    };
  }, 1500);

  function wizardDelete(draftId){
    customConfirm('Ce brouillon sera définitivement supprimé.',
      function(){
        deleteDraft(draftId);
        if(_currentDraft && _currentDraft.id === draftId){
          _currentDraft = null;
        }
        showToast('Brouillon supprimé');
        if(typeof showScreen === 'function') showScreen('screen-bathroom-quote');
        renderBathroomScreen();
      },
      { title:'Supprimer ce brouillon ?', danger:true, okLabel:'Supprimer' });
  }

  /* ─── ÉCRAN WIZARD ─── */
  function ensureWizardScreen(){
    if(document.getElementById('screen-bathroom-wizard')) return;
    var mc = document.querySelector('.main-content');
    if(!mc) return;
    var s = document.createElement('div');
    s.className = 'screen';
    s.id = 'screen-bathroom-wizard';
    s.innerHTML = '<div id="aj-wizard-body" style="padding:0 0 100px;"></div>';
    mc.appendChild(s);
  }

  function wizardRender(){
    ensureWizardScreen();
    var body = document.getElementById('aj-wizard-body');
    if(!body || !_currentDraft) return;
    var step = STEPS[_currentStepIdx];
    var pct = ((_currentStepIdx + 1) / STEPS.length) * 100;

    var draftMeta = _currentDraft.formData['client.nom'] || 'Nouveau devis';
    if(_currentDraft.formData['client.prenom']) draftMeta = (_currentDraft.formData['client.prenom'] + ' ' + (_currentDraft.formData['client.nom'] || '')).trim();

    body.innerHTML =
      /* En-tête : titre + bouton fermer + barre progression */
      '<div style="position:sticky;top:72px;background:#f4efe7;z-index:30;padding:14px 0 10px;margin:-12px -12px 14px;padding-left:12px;padding-right:12px;border-bottom:1px solid var(--c-border,#e3dccc);">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;">' +
          '<button onclick="AJBath.wizardClose()" style="background:transparent;border:none;color:#7a8896;cursor:pointer;font-family:Inter,sans-serif;font-size:13px;padding:6px 8px;">← Quitter</button>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-family:Cormorant Garamond,Georgia,serif;font-size:20px;font-weight:600;color:#0f2030;line-height:1;">' + step.icon + ' ' + safeEsc(step.title) + '</div>' +
            '<div style="font-size:11px;color:#7a8896;margin-top:2px;font-family:Inter,sans-serif;">Étape ' + (_currentStepIdx + 1) + ' / ' + STEPS.length + ' · ' + safeEsc(draftMeta) + '</div>' +
          '</div>' +
          '<button onclick="AJBath.wizardSaveDraft()" style="background:#fff;border:1px solid var(--c-border,#e3dccc);color:#0f2030;cursor:pointer;font-family:Inter,sans-serif;font-size:12px;padding:7px 12px;border-radius:7px;font-weight:600;">💾 Sauver</button>' +
        '</div>' +
        /* Barre progression cliquable */
        '<div style="display:flex;gap:3px;height:6px;">' +
        STEPS.map(function(s, i){
          var bg = i < _currentStepIdx ? '#1d4d33' : (i === _currentStepIdx ? '#c9a96e' : 'rgba(15,32,48,0.10)');
          return '<div onclick="AJBath.wizardGoTo(' + i + ')" title="' + safeEsc(s.title) + '" style="flex:1;background:' + bg + ';border-radius:3px;cursor:pointer;transition:background 0.2s;"></div>';
        }).join('') +
        '</div>' +
      '</div>' +

      /* Contenu de l'étape */
      '<div style="background:#fff;border:1px solid var(--c-border,#e3dccc);border-radius:14px;padding:20px;margin-bottom:14px;">' +
        step.render(_currentDraft) +
      '</div>' +

      /* Boutons navigation */
      '<div style="position:sticky;bottom:14px;display:flex;gap:10px;background:rgba(244,239,231,0.97);backdrop-filter:blur(8px);padding:14px;border-radius:12px;border:1px solid var(--c-border,#e3dccc);box-shadow:0 4px 16px rgba(0,0,0,0.08);">' +
        (_currentStepIdx > 0 ? '<button onclick="AJBath.wizardPrev()" style="flex:1;padding:14px;background:#fff;border:1px solid var(--c-border,#e3dccc);border-radius:10px;cursor:pointer;font-weight:600;color:#3a4a5c;font-family:Inter,sans-serif;font-size:14px;">‹ Précédent</button>' : '') +
        (_currentStepIdx < STEPS.length - 1 ? '<button onclick="AJBath.wizardNext()" style="flex:2;padding:14px;background:#c9a96e;color:#0f2030;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-family:Inter,sans-serif;font-size:14px;">Suivant ›</button>' : '') +
      '</div>';
  }

  /* ─── EVENT DELEGATION POUR DATA-AJ-BIND ─── */
  document.addEventListener('input', function(e){
    var t = e.target;
    var path = t.getAttribute && t.getAttribute('data-aj-bind');
    if(!path || !_currentDraft) return;
    var v;
    if(t.type === 'checkbox'){ v = t.checked; }
    else if(t.type === 'number'){ v = t.value; /* gardé en string pour préserver l'édition partielle */ }
    else { v = t.value; }
    wizardSetField(path, v);
  });

  document.addEventListener('change', function(e){
    var t = e.target;
    var path = t.getAttribute && t.getAttribute('data-aj-bind');
    if(!path || !_currentDraft) return;
    if(t.tagName === 'SELECT' || t.type === 'checkbox'){
      var v = t.type === 'checkbox' ? t.checked : t.value;
      wizardSetField(path, v);
      /* Re-render pour les UI conditionnelles (ex: étape 4 douche/baignoire) */
      var step = STEPS[_currentStepIdx];
      if(step && (step.id === 'step-4-douche-baignoire' || step.id === 'step-5-toilettes' || step.id === 'step-6-vasque' || step.id === 'step-8-plomberie')){
        setTimeout(wizardRender, 100);
      }
    }
  });

  /* Toggle buttons (data-aj-toggle-bind) */
  document.addEventListener('click', function(e){
    var t = e.target.closest('[data-aj-toggle-bind]');
    if(!t || !_currentDraft) return;
    e.preventDefault();
    var path = t.getAttribute('data-aj-toggle-bind');
    var val = t.getAttribute('data-aj-toggle-val');
    wizardSetField(path, val);
    /* Re-render immédiat pour les toggles (UI conditionnelle) */
    setTimeout(wizardRender, 50);
  });

  /* Trigger sets auto (data-aj-trigger-set) — applique au render */
  function applyAutoTriggers(){
    if(!_currentDraft) return;
    var triggers = document.querySelectorAll('[data-aj-trigger-set]');
    triggers.forEach(function(el){
      var spec = el.getAttribute('data-aj-trigger-set');
      spec.split(',').forEach(function(pair){
        var parts = pair.split(':');
        if(parts.length !== 2) return;
        var path = parts[0].trim();
        var val = parts[1].trim();
        if(val === 'true') val = true;
        else if(val === 'false') val = false;
        if(_currentDraft.formData[path] !== val){
          _currentDraft.formData[path] = val;
        }
      });
    });
  }
  /* Hook après chaque render */
  var _origRender = wizardRender;
  wizardRender = function(){
    _origRender.apply(this, arguments);
    setTimeout(applyAutoTriggers, 30);
  };

  /* ─── LISTE DES BROUILLONS SUR ÉCRAN D'ACCUEIL ─── */
  var _origRenderBath = renderBathroomScreen;
  renderBathroomScreen = function(){
    _origRenderBath.apply(this, arguments);
    /* Ajoute la liste des brouillons en cours */
    setTimeout(function(){
      var drafts = getDrafts();
      if(!drafts.length) return;
      var body = document.getElementById('aj-bath-body');
      if(!body) return;
      if(body.querySelector('[data-aj-drafts]')) return;
      var draftsHtml = '<div data-aj-drafts style="background:#fff;border:1px solid var(--c-border,#e3dccc);border-radius:14px;padding:18px 20px;margin-top:14px;font-family:Inter,sans-serif;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">' +
          '<div style="font-weight:700;color:#0f2030;font-size:15px;">📂 Brouillons en cours</div>' +
          '<div style="font-size:11px;color:#7a8896;">' + drafts.length + '</div>' +
        '</div>' +
        drafts.sort(function(a,b){ return (b.updatedAt||0) - (a.updatedAt||0); }).map(function(d){
          var name = (d.formData['client.prenom']||'') + ' ' + (d.formData['client.nom']||'');
          name = name.trim() || 'Sans nom';
          var step = d.currentStep || 1;
          return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid rgba(15,32,48,0.06);font-family:Inter,sans-serif;">' +
            '<div style="flex:1;min-width:0;cursor:pointer;" onclick="AJBath.wizardOpen(\'' + d.id + '\')">' +
              '<div style="font-weight:600;color:#0f2030;font-size:13px;">' + safeEsc(name) + '</div>' +
              '<div style="font-size:11px;color:#7a8896;">Étape ' + step + '/' + STEPS.length + ' · maj ' + new Date(d.updatedAt || d.createdAt || Date.now()).toLocaleDateString('fr-FR') + '</div>' +
            '</div>' +
            '<button onclick="AJBath.wizardOpen(\'' + d.id + '\')" style="padding:7px 12px;background:#c9a96e;color:#0f2030;border:none;border-radius:7px;cursor:pointer;font-weight:600;font-size:12px;">Reprendre</button>' +
            '<button onclick="AJBath.wizardDelete(\'' + d.id + '\')" title="Supprimer" style="padding:7px 10px;background:transparent;border:1px solid rgba(198,40,40,0.3);color:#c62828;border-radius:7px;cursor:pointer;font-size:12px;">×</button>' +
          '</div>';
        }).join('') +
      '</div>';
      body.insertAdjacentHTML('beforeend', draftsHtml);
    }, 100);
  };

  /* Patch showScreen pour gérer screen-bathroom-wizard */
  var _origShowScreen2 = window.showScreen;
  window.showScreen = function(id){
    var r = _origShowScreen2.apply(this, arguments);
    if(id === 'screen-bathroom-wizard') setTimeout(wizardRender, 50);
    return r;
  };

  /* Expose wizard API */
  window.AJBath = Object.assign(window.AJBath || {}, {
    /* Wizard */
    wizardStartNew: wizardStartNew,
    wizardOpen: wizardOpen,
    wizardClose: wizardClose,
    wizardNext: wizardNext,
    wizardPrev: wizardPrev,
    wizardGoTo: wizardGoTo,
    wizardSaveDraft: wizardSaveDraft,
    wizardEmit: wizardEmit,
    wizardDelete: wizardDelete,
    /* Calculs (utilisables depuis console + commit C) */
    computeMeasurements: computeMeasurements,
    generateLines: generateLines,
    computeTotals: computeTotals,
    STEPS: STEPS
  });

  console.log('[AJ PRO Bath] Module Devis Salle de Bain chargé · ' + BATHROOM_TEMPLATE.sections.length + ' sections · ' + (function(){
    var n = 0;
    BATHROOM_TEMPLATE.sections.forEach(function(s){
      n += (s.items || []).length;
      (s.subSections || []).forEach(function(sub){ n += sub.items.length; });
    });
    return n;
  })() + ' lignes · wizard ' + STEPS.length + ' étapes');
})();
