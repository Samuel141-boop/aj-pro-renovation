/* ════════════════════════════════════════════════════════════════════
   AJ PRO RÉNOVATION — MODULE ANALYSE CHANTIER (Commit 1)

   Surcouche intelligente qui agrège ce que l'utilisateur a déjà capturé
   sur un chantier (cats cochées, paint elems, mesures, notes manuscrites
   OCR, observations) et propose un brouillon de devis basé sur le template
   SDB existant.

   Principes :
   - Aucune ligne n'est écrite dans un devis sans validation explicite.
   - Niveau de confiance par suggestion (haute / moyenne / faible).
   - 5 catégories : certains / probables / options / fournitures / a-confirmer.
   - Architecture extensible (TEMPLATE_REGISTRY par type de pièce, SDB seul
     pour l'instant — cuisine/salon/etc. à brancher plus tard).
   - Ne touche pas au système existant (Travaux split, wizard SDB, synthèse
     devis). Ajout pur en parallèle.

   Plan : Commit 1 (ce fichier) = moteur + écran + brouillon.
          Commit 2 (à venir) = catalogue produits fournisseurs.
          Commit 3 (à venir) = pont préfill complet vers wizard SDB.
   ════════════════════════════════════════════════════════════════════ */
(function(){
  if(window.__AJ_ANALYSIS_LOADED) return;
  window.__AJ_ANALYSIS_LOADED = true;

  /* ─────────────────────────────────────────────────────────────────
     REGISTRY DES TEMPLATES PAR TYPE DE PIÈCE
     Permet d'ajouter cuisine / salon / chambre plus tard sans refactor.
     ───────────────────────────────────────────────────────────────── */
  var TEMPLATE_REGISTRY = {
    'salle-de-bain': {
      label: 'Salle de bain',
      icon: '🚿',
      getTemplate: function(){
        return (window.AJBath && window.AJBath.TEMPLATE) || null;
      },
      mappingTablesKey: 'sdb'
    }
    /* Plus tard :
    'cuisine':   { label:'Cuisine', icon:'🍳', getTemplate: ..., mappingTablesKey:'cuisine' },
    'salon':     { label:'Salon',   icon:'🛋️', getTemplate: ..., mappingTablesKey:'salon' },
    */
  };

  /* ─────────────────────────────────────────────────────────────────
     DÉTECTION DU TYPE DE PIÈCE depuis son nom
     ───────────────────────────────────────────────────────────────── */
  function detectPieceType(piece){
    var nom = (piece.nom || '').toLowerCase();
    if(/(salle\s*de\s*bain|salle\s*d['e]eau|sdb|salle\s*de\s*douche|wc|toilettes|douche|bain)/.test(nom)){
      return 'salle-de-bain';
    }
    return null;
  }

  /* ─────────────────────────────────────────────────────────────────
     TABLES DE MAPPING — SALLE DE BAIN
     Convertit les inputs utilisateur (cats, paint elems, keywords notes)
     en suggestions de lignes du BATHROOM_TEMPLATE.

     Format : { templateKey, confidence, category }
       confidence : 'haute' | 'moyenne' | 'faible'
       category   : 'certains' | 'probables' | 'options' | 'fournitures' | 'a-confirmer'
     ───────────────────────────────────────────────────────────────── */

  /* Lignes obligatoires SDB (toujours dans le devis) */
  var MANDATORY_SDB = ['1.1', '2.1', '2.6', '4.1', '6.1'];

  /* Cats du module Travaux original → keys du template SDB */
  var SDB_CATS_TO_TEMPLATE = {
    /* Maçonnerie */
    'mac-depose-cloison': [
      { templateKey: '7.1',  confidence: 'haute',   category: 'options' }
    ],
    'mac-crea-cloison': [
      { templateKey: '10.1', confidence: 'moyenne', category: 'options' }
    ],
    'mac-depose-fp': [
      { templateKey: '8.1',  confidence: 'haute',   category: 'options' }
    ],
    'mac-crea-fp': [
      { templateKey: '8.1',  confidence: 'haute',   category: 'options' },
      { templateKey: '8.2',  confidence: 'moyenne', category: 'options' },
      { templateKey: '8.4',  confidence: 'faible',  category: 'options' }
    ],
    'mac-pose-porte': [
      { templateKey: '17.1', confidence: 'moyenne', category: 'options' }
    ],
    'mac-ouverture': [
      { templateKey: '2.7',  confidence: 'moyenne', category: 'probables' }
    ],

    /* Électricité */
    'elec-prise-rpl': [
      { templateKey: '4.2',  confidence: 'haute',   category: 'certains' },
      { templateKey: '13.5', confidence: 'faible',  category: 'options' }
    ],
    'elec-inter-rpl': [
      { templateKey: '13.5', confidence: 'moyenne', category: 'options' }
    ],
    'elec-prises': [
      { templateKey: '4.7',  confidence: 'haute',   category: 'certains' },
      { templateKey: '5.8.3',confidence: 'moyenne', category: 'fournitures' },
      { templateKey: '5.8.4',confidence: 'moyenne', category: 'fournitures' }
    ],
    'elec-inter': [
      { templateKey: '5.8.5',confidence: 'moyenne', category: 'fournitures' },
      { templateKey: '5.8.6',confidence: 'moyenne', category: 'fournitures' }
    ],
    'elec-volet': [
      { templateKey: '13.3', confidence: 'haute',   category: 'options' }
    ],
    'elec-ecl': [
      { templateKey: '4.3',  confidence: 'haute',   category: 'certains' },
      { templateKey: '4.9',  confidence: 'haute',   category: 'certains' }
    ],
    'elec-tab': [
      { templateKey: '13.1', confidence: 'haute',   category: 'options' }
    ],
    'elec-radiateur': [
      { templateKey: '4.5',  confidence: 'haute',   category: 'certains' },
      { templateKey: '4.11', confidence: 'haute',   category: 'certains' },
      { templateKey: '5.5.3',confidence: 'haute',   category: 'fournitures' }
    ],

    /* Sol */
    'sol-depose-rev': [
      { templateKey: '7.1',  confidence: 'haute',   category: 'options' }
    ],
    'sol-ragreage': [
      { templateKey: '7.1',  confidence: 'moyenne', category: 'options' }
    ],
    'sol-carrelage': [
      { templateKey: '2.16', confidence: 'haute',   category: 'certains' },
      { templateKey: '2.17', confidence: 'haute',   category: 'certains' },
      { templateKey: '5.1.1',confidence: 'haute',   category: 'fournitures' },
      { templateKey: '5.1.2',confidence: 'haute',   category: 'fournitures' }
    ],
    'sol-par-seuil': [
      { templateKey: '2.18', confidence: 'haute',   category: 'certains' },
      { templateKey: '5.8.1',confidence: 'haute',   category: 'fournitures' }
    ],
    'sol-par-baguette': [
      { templateKey: '2.23', confidence: 'haute',   category: 'certains' },
      { templateKey: '5.8.2',confidence: 'haute',   category: 'fournitures' }
    ],

    /* Portes & Fenêtres */
    'pf-porte-rpl': [
      { templateKey: '17.1', confidence: 'moyenne', category: 'options' }
    ]
  };

  /* Paint elems → keys du template SDB.
     En SDB, la peinture pièce humide est une ligne unique (2.29). */
  var SDB_PAINT_TO_TEMPLATE = {
    'plafond':     [{ templateKey: '2.29', confidence: 'haute', category: 'certains' }],
    'mur':         [{ templateKey: '2.29', confidence: 'haute', category: 'certains' }],
    'plinthe':     [{ templateKey: '2.29', confidence: 'haute', category: 'certains' }],
    'porte':       [{ templateKey: '2.29', confidence: 'moyenne', category: 'probables' }],
    'fenetre':     [{ templateKey: '2.29', confidence: 'moyenne', category: 'probables' }],
    'placard':     [{ templateKey: '2.29', confidence: 'faible',  category: 'probables' }],
    'radiateur':   [{ templateKey: '2.29', confidence: 'faible',  category: 'probables' }],
    'biblio':      [{ templateKey: '2.29', confidence: 'faible',  category: 'probables' }],
    'corniche':    [{ templateKey: '2.29', confidence: 'faible',  category: 'probables' }]
  };

  /* Mots-clés dans observations + notes manuscrites OCR + plomberie texte
     → keys du template SDB. Ordre d'évaluation important : règles
     plus spécifiques en premier pour éviter les faux positifs. */
  var SDB_KEYWORDS = [
    {
      label: 'Douche italienne / receveur extra-plat',
      keywords: ['douche italienne', 'douche extra-plate', 'douche extra plate', 'receveur extraplat', 'receveur extra-plat'],
      suggestions: [
        { templateKey: '2.9',  confidence: 'haute',   category: 'certains' },
        { templateKey: '2.10', confidence: 'moyenne', category: 'probables' },
        { templateKey: '3.1',  confidence: 'haute',   category: 'certains' },
        { templateKey: '3.2',  confidence: 'haute',   category: 'certains' },
        { templateKey: '5.2.1',confidence: 'haute',   category: 'fournitures' },
        { templateKey: '5.2.6',confidence: 'haute',   category: 'fournitures' },
        { templateKey: '5.2.8',confidence: 'moyenne', category: 'fournitures' }
      ]
    },
    {
      label: 'Douche (générique)',
      keywords: ['douche', 'receveur', 'paroi'],
      suggestions: [
        { templateKey: '3.1',  confidence: 'moyenne', category: 'probables' },
        { templateKey: '3.2',  confidence: 'moyenne', category: 'probables' },
        { templateKey: '5.2.1',confidence: 'moyenne', category: 'fournitures' },
        { templateKey: '5.2.6',confidence: 'moyenne', category: 'fournitures' }
      ]
    },
    {
      label: 'Baignoire',
      keywords: ['baignoire', 'sabot', 'bain'],
      suggestions: [
        { templateKey: '2.11', confidence: 'haute',   category: 'certains' },
        { templateKey: '2.12', confidence: 'moyenne', category: 'probables' },
        { templateKey: '3.3',  confidence: 'haute',   category: 'certains' },
        { templateKey: '3.4',  confidence: 'moyenne', category: 'probables' },
        { templateKey: '5.3.1',confidence: 'haute',   category: 'fournitures' },
        { templateKey: '5.3.5',confidence: 'haute',   category: 'fournitures' },
        { templateKey: '5.3.7',confidence: 'moyenne', category: 'fournitures' }
      ]
    },
    {
      label: 'WC suspendu',
      keywords: ['wc suspendu', 'cuvette suspendue', 'geberit', 'sigma'],
      suggestions: [
        { templateKey: '2.13', confidence: 'haute',   category: 'certains' },
        { templateKey: '3.7',  confidence: 'haute',   category: 'certains' },
        { templateKey: '5.6.1',confidence: 'haute',   category: 'fournitures' },
        { templateKey: '5.6.3',confidence: 'haute',   category: 'fournitures' },
        { templateKey: '5.6.4',confidence: 'haute',   category: 'fournitures' }
      ]
    },
    {
      label: 'WC à poser',
      keywords: ['wc à poser', 'wc a poser', 'pack wc'],
      suggestions: [
        { templateKey: '3.8',  confidence: 'haute',   category: 'certains' },
        { templateKey: '5.6.5',confidence: 'haute',   category: 'fournitures' }
      ]
    },
    {
      label: 'Vasque double',
      keywords: ['vasque double', '2 vasques', 'deux vasques', 'double vasque'],
      suggestions: [
        { templateKey: '3.10', confidence: 'haute',   category: 'certains' },
        { templateKey: '5.4.2',confidence: 'haute',   category: 'fournitures' }
      ]
    },
    {
      label: 'Vasque simple',
      keywords: ['vasque', 'lavabo'],
      suggestions: [
        { templateKey: '3.9',  confidence: 'haute',   category: 'certains' },
        { templateKey: '2.24', confidence: 'haute',   category: 'certains' },
        { templateKey: '5.4.1',confidence: 'haute',   category: 'fournitures' },
        { templateKey: '5.4.2',confidence: 'haute',   category: 'fournitures' },
        { templateKey: '5.4.5',confidence: 'haute',   category: 'fournitures' }
      ]
    },
    {
      label: 'Sèche-serviettes eau chaude',
      keywords: ['sèche-serviettes eau chaude', 'sèche serviettes eau chaude', 'radiateur eau chaude'],
      suggestions: [
        { templateKey: '3.11', confidence: 'moyenne', category: 'probables' },
        { templateKey: '5.5.1',confidence: 'moyenne', category: 'fournitures' },
        { templateKey: '5.5.2',confidence: 'moyenne', category: 'fournitures' }
      ]
    },
    {
      label: 'Sèche-serviettes électrique',
      keywords: ['sèche-serviettes électrique', 'sèche serviettes électrique', 'radiateur électrique sdb'],
      suggestions: [
        { templateKey: '4.11', confidence: 'haute',   category: 'certains' },
        { templateKey: '5.5.3',confidence: 'haute',   category: 'fournitures' }
      ]
    },
    {
      label: 'Ballon ECS',
      keywords: ['ballon', 'chauffe-eau', 'cumulus'],
      suggestions: [
        { templateKey: '3.13', confidence: 'haute',   category: 'certains' },
        { templateKey: '5.7.1',confidence: 'moyenne', category: 'fournitures' },
        { templateKey: '5.7.2',confidence: 'haute',   category: 'fournitures' }
      ]
    },
    {
      label: 'Lave-linge',
      keywords: ['lave-linge', 'lave linge', 'machine à laver'],
      suggestions: [
        { templateKey: '3.5',  confidence: 'haute',   category: 'certains' }
      ]
    },
    {
      label: 'Sèche-linge',
      keywords: ['sèche-linge', 'sèche linge'],
      suggestions: [
        { templateKey: '3.6',  confidence: 'haute',   category: 'certains' }
      ]
    },
    {
      label: 'Carrelage mural',
      keywords: ['carrelage mural', 'faïence', 'carrelage muraux'],
      suggestions: [
        { templateKey: '2.19', confidence: 'haute',   category: 'certains' },
        { templateKey: '5.1.4',confidence: 'haute',   category: 'fournitures' }
      ]
    },
    {
      label: 'Carrelage sol',
      keywords: ['carrelage sol', 'carrelage au sol'],
      suggestions: [
        { templateKey: '2.16', confidence: 'haute',   category: 'certains' },
        { templateKey: '5.1.1',confidence: 'haute',   category: 'fournitures' }
      ]
    },
    {
      label: 'Niche carrelée',
      keywords: ['niche carrelée', 'niche carrelage', 'niche douche'],
      suggestions: [
        { templateKey: '10.1', confidence: 'haute',   category: 'options' },
        { templateKey: '10.2', confidence: 'haute',   category: 'options' },
        { templateKey: '10.3', confidence: 'moyenne', category: 'options' }
      ]
    },
    {
      label: 'Plafond suspendu / spots',
      keywords: ['plafond suspendu', 'faux plafond', 'spots encastrés', 'spots led'],
      suggestions: [
        { templateKey: '8.1',  confidence: 'haute',   category: 'options' },
        { templateKey: '8.2',  confidence: 'haute',   category: 'options' },
        { templateKey: '8.4',  confidence: 'moyenne', category: 'options' }
      ]
    },
    {
      label: 'Coffrage tuyaux',
      keywords: ['coffrage tuyau', 'coffrage colonne', 'masquage tuyaux', 'masquer tuyaux'],
      suggestions: [
        { templateKey: '11.1', confidence: 'haute',   category: 'options' },
        { templateKey: '11.2', confidence: 'moyenne', category: 'options' }
      ]
    },
    {
      label: 'Vanne d\'isolement',
      keywords: ['vanne arrêt', 'vanne isolement', 'remplacement vanne'],
      suggestions: [
        { templateKey: '12.1', confidence: 'haute',   category: 'options' }
      ]
    },
    {
      label: 'PMR / accessibilité',
      keywords: ['pmr', 'mobilité réduite', 'handicap', 'barre appui', 'siège douche pmr'],
      suggestions: [
        { templateKey: '16.1', confidence: 'haute',   category: 'options' },
        { templateKey: '16.2', confidence: 'haute',   category: 'options' },
        { templateKey: '16.3', confidence: 'moyenne', category: 'options' }
      ]
    },
    {
      label: 'Porte galandage',
      keywords: ['galandage', 'porte coulissante encastrée'],
      suggestions: [
        { templateKey: '17.1', confidence: 'moyenne', category: 'options' }
      ]
    },
    {
      label: 'Placard sur mesure',
      keywords: ['placard sur mesure', 'placard wc'],
      suggestions: [
        { templateKey: '15.1', confidence: 'moyenne', category: 'options' }
      ]
    },
    {
      label: 'Mise en teinte',
      keywords: ['mise en teinte', 'peinture couleur', 'teinte personnalisée'],
      suggestions: [
        { templateKey: '14.1', confidence: 'haute',   category: 'options' }
      ]
    },
    {
      label: 'Ventilation / extracteur',
      keywords: ['vmc', 'extracteur', 'ventilation', 'bouche aération'],
      suggestions: [
        { templateKey: '4.6',  confidence: 'haute',   category: 'certains' },
        { templateKey: '4.10', confidence: 'haute',   category: 'certains' },
        { templateKey: '5.8.11',confidence: 'haute',  category: 'fournitures' }
      ]
    }
  ];

  /* Items "à confirmer" : règles qui détectent des éléments ambigus
     ou critiques à valider explicitement avec le client. */
  var SDB_FLAGS_A_CONFIRMER = [
    {
      keywords: ['copro', 'copropriété', 'syndic'],
      message: 'Travaux en copropriété — accord syndic / chauffagiste à anticiper (vannes immeuble, horaires, accès gardien).'
    },
    {
      keywords: ['amiante', 'plomb'],
      message: 'Mention amiante/plomb détectée — diagnostic obligatoire avant intervention.'
    },
    {
      keywords: ['sans ascenseur', 'pas d\'ascenseur'],
      message: 'Logement sans ascenseur — surcoût acheminement matériaux à prévoir.'
    },
    {
      keywords: ['à confirmer', 'à voir', 'à valider', 'à préciser', 'à mesurer'],
      message: 'Élément marqué "à confirmer" dans les notes — voir détails dans les notes manuscrites.'
    }
  ];

  /* ─────────────────────────────────────────────────────────────────
     UTILITAIRES
     ───────────────────────────────────────────────────────────────── */
  function pf(v){ if(v == null) return 0; var n = parseFloat(String(v).replace(',','.')); return isNaN(n) ? 0 : n; }
  function safeEsc(s){
    if(typeof esc === 'function') return esc(s);
    if(s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function confidenceLevel(c){
    return { 'haute': 3, 'moyenne': 2, 'faible': 1 }[c] || 0;
  }

  /* Trouve un item dans le template par sa key (ex: '2.16' ou '5.6.4'). */
  function findTemplateItem(template, key){
    if(!template || !template.sections) return null;
    for(var i = 0; i < template.sections.length; i++){
      var sec = template.sections[i];
      if(sec.items){
        for(var j = 0; j < sec.items.length; j++){
          if(sec.items[j].key === key) return { item: sec.items[j], section: sec };
        }
      }
      if(sec.subSections){
        for(var k = 0; k < sec.subSections.length; k++){
          var sub = sec.subSections[k];
          for(var l = 0; l < sub.items.length; l++){
            if(sub.items[l].key === key) return { item: sub.items[l], section: sec, subSection: sub };
          }
        }
      }
    }
    return null;
  }

  /* ─────────────────────────────────────────────────────────────────
     MOTEUR DE MAPPING POUR UNE PIÈCE
     Retourne un tableau de suggestions :
       { templateKey, confidence, category, sources: [...], item }
     ───────────────────────────────────────────────────────────────── */
  function mapPieceToSuggestions(piece, template){
    var suggestions = [];
    var seen = {};

    function add(s){
      if(!s.templateKey) return;
      var item = findTemplateItem(template, s.templateKey);
      if(!item) return; /* templateKey orpheline */

      if(seen[s.templateKey] != null){
        var existing = suggestions[seen[s.templateKey]];
        /* Garde le meilleur niveau de confiance */
        if(confidenceLevel(s.confidence) > confidenceLevel(existing.confidence)){
          existing.confidence = s.confidence;
          existing.category = s.category; /* la meilleure source impose sa catégorie */
        }
        if(s.source && existing.sources.indexOf(s.source) === -1){
          existing.sources.push(s.source);
        }
        return;
      }
      seen[s.templateKey] = suggestions.length;
      suggestions.push({
        templateKey: s.templateKey,
        confidence: s.confidence || 'moyenne',
        category: s.category || 'probables',
        sources: s.source ? [s.source] : [],
        item: item.item,
        section: item.section,
        subSection: item.subSection || null
      });
    }

    /* 1. Lignes obligatoires */
    MANDATORY_SDB.forEach(function(key){
      add({ templateKey: key, confidence: 'haute', category: 'certains', source: 'Obligatoire' });
    });

    /* 2. Cats du module Travaux original */
    var cats = (piece.travaux && piece.travaux.cats) || {};
    Object.keys(cats).forEach(function(catKey){
      if(cats[catKey] !== true) return;
      var rules = SDB_CATS_TO_TEMPLATE[catKey];
      if(!rules) return;
      rules.forEach(function(rule){
        add({
          templateKey: rule.templateKey,
          confidence: rule.confidence,
          category: rule.category,
          source: 'Travail coché : ' + catKey
        });
      });
    });

    /* 3. Paint elems */
    var paintElems = (piece.travaux && piece.travaux.paintElems) || [];
    paintElems.forEach(function(pe){
      var rules = SDB_PAINT_TO_TEMPLATE[pe];
      if(!rules) return;
      rules.forEach(function(rule){
        add({
          templateKey: rule.templateKey,
          confidence: rule.confidence,
          category: rule.category,
          source: 'Peinture : ' + pe
        });
      });
    });

    /* 4. Mots-clés dans observations + notes manuscrites OCR + plomberie texte */
    var corpus = '';
    if(piece.obs) corpus += ' ' + piece.obs;
    if(piece.travaux && piece.travaux.plomberie) corpus += ' ' + piece.travaux.plomberie;
    (piece.msNotes || []).forEach(function(n){
      if(n.title) corpus += ' ' + n.title;
      if(n.ocrText) corpus += ' ' + n.ocrText;
    });
    corpus = corpus.toLowerCase();

    SDB_KEYWORDS.forEach(function(rule){
      var matchedKeyword = null;
      for(var i = 0; i < rule.keywords.length; i++){
        if(corpus.indexOf(rule.keywords[i].toLowerCase()) >= 0){
          matchedKeyword = rule.keywords[i];
          break;
        }
      }
      if(!matchedKeyword) return;
      rule.suggestions.forEach(function(s){
        add({
          templateKey: s.templateKey,
          confidence: s.confidence,
          category: s.category,
          source: 'Mot-clé : "' + matchedKeyword + '"'
        });
      });
    });

    return suggestions;
  }

  /* Détecte les éléments à confirmer (ambigus, critiques) */
  function detectAConfirmer(piece){
    var alerts = [];
    var corpus = '';
    if(piece.obs) corpus += ' ' + piece.obs;
    (piece.msNotes || []).forEach(function(n){
      if(n.ocrText) corpus += ' ' + n.ocrText;
    });
    corpus = corpus.toLowerCase();

    SDB_FLAGS_A_CONFIRMER.forEach(function(rule){
      var hit = rule.keywords.some(function(kw){ return corpus.indexOf(kw.toLowerCase()) >= 0; });
      if(hit) alerts.push(rule.message);
    });

    /* Mesures manquantes */
    var m = piece.mesures || {};
    if(!m.long || !m.larg){
      alerts.push('Mesures manquantes (longueur / largeur) — surfaces et carrelages non chiffrables précisément.');
    }
    if(!m.haut){
      alerts.push('HSP (hauteur sous plafond) manquante — surface murale non chiffrable précisément.');
    }

    return alerts;
  }

  /* ─────────────────────────────────────────────────────────────────
     ANALYSE GLOBALE D'UN CHANTIER
     ───────────────────────────────────────────────────────────────── */
  function buildChantierAnalysis(clientId){
    var db = (typeof dbLoad === 'function') ? dbLoad() : null;
    if(!db || !db.clients[clientId]) return null;
    var client = db.clients[clientId];

    var pieces = Object.values(db.pieces || {})
      .filter(function(p){ return p.clientId === clientId; })
      .sort(function(a,b){ return (a.createdAt||0) - (b.createdAt||0); });

    var allFlags = [];  // agrégat global pour le bandeau "Drapeaux à confirmer"
    var totalDoublons = 0;
    var totalConflits = 0;

    var pieceAnalyses = pieces.map(function(p){
      var pieceType = detectPieceType(p);
      var registryEntry = pieceType ? TEMPLATE_REGISTRY[pieceType] : null;
      var template = registryEntry ? registryEntry.getTemplate() : null;
      var supported = !!(pieceType && template);

      var suggestions = supported ? mapPieceToSuggestions(p, template) : [];
      var aConfirmer = detectAConfirmer(p);

      /* Commit D IA : enrichissement via quote-fusion en parallèle (sans casser le moteur legacy) */
      var fusionResult = supported ? runFusionForPiece(p) : null;
      var fusionMeta = null;
      if(fusionResult){
        var sourcesMap = buildSourcesMap(fusionResult);
        /* Attache les sources structurées à chaque suggestion existante */
        suggestions.forEach(function(sug){
          var fs = sourcesMap[sug.templateKey];
          if(fs && fs.length) sug._fusionSources = fs;
        });
        fusionMeta = {
          conflits: fusionResult.conflits || [],
          doublons: fusionResult.doublons || [],
          drapeaux: fusionResult.drapeaux || [],
          engineMeta: fusionResult.meta || {}
        };
        totalDoublons += fusionMeta.doublons.length;
        totalConflits += fusionMeta.conflits.length;
        /* Propage les drapeaux au niveau global (avec contexte pièce) */
        fusionMeta.drapeaux.forEach(function(d){
          allFlags.push({ type:d.type, message:d.message, pieceNom:p.nom });
        });
      }

      return {
        pieceId: p.id,
        nom: p.nom,
        icon: p.icon || (registryEntry ? registryEntry.icon : '🏠'),
        pieceType: pieceType,
        templateLabel: registryEntry ? registryEntry.label : null,
        supported: supported,
        notSupportedReason: !pieceType ? 'Type de pièce non reconnu' : (!template ? 'Template non chargé' : null),
        mesures: p.mesures || {},
        nbPhotos: (p.photos || []).length,
        nbNotes: (p.msNotes || []).length,
        hasCroquis: !!p.croquis,
        observations: p.obs || '',
        catsActives: Object.keys((p.travaux||{}).cats||{}).filter(function(k){ return p.travaux.cats[k]===true; }),
        paintElems: (p.travaux||{}).paintElems || [],
        plomberie: (p.travaux||{}).plomberie || '',
        suggestions: suggestions,
        aConfirmer: aConfirmer,
        fusionMeta: fusionMeta
      };
    });

    return {
      client: client,
      pieces: pieceAnalyses,
      allFlags: allFlags,
      stats: {
        totalPieces: pieces.length,
        supportedPieces: pieceAnalyses.filter(function(p){ return p.supported; }).length,
        totalSuggestions: pieceAnalyses.reduce(function(n, p){ return n + p.suggestions.length; }, 0),
        totalPhotos: pieceAnalyses.reduce(function(n, p){ return n + p.nbPhotos; }, 0),
        totalNotes: pieceAnalyses.reduce(function(n, p){ return n + p.nbNotes; }, 0),
        totalDoublons: totalDoublons,
        totalConflits: totalConflits,
        totalFlags: allFlags.length
      },
      generatedAt: Date.now()
    };
  }

  /* ─────────────────────────────────────────────────────────────────
     UI — ÉCRAN ANALYSE CHANTIER
     ───────────────────────────────────────────────────────────────── */
  function ensureAnalysisScreen(){
    if(document.getElementById('screen-chantier-analysis')) return;
    var mc = document.querySelector('.main-content');
    if(!mc) return;
    var s = document.createElement('div');
    s.className = 'screen';
    s.id = 'screen-chantier-analysis';
    s.innerHTML = '<div id="aj-analysis-body" style="padding: 0 0 100px;"></div>';
    mc.appendChild(s);
  }

  /* Couleurs/icônes par catégorie de suggestion */
  var CAT_STYLE = {
    'certains':    { color:'#1d4d33', bg:'rgba(45,106,79,0.10)',   label:'Travaux certains',     icon:'✓' },
    'probables':   { color:'#9a4514', bg:'rgba(232,98,26,0.10)',    label:'Travaux probables',    icon:'⏳' },
    'options':     { color:'#4a3565', bg:'rgba(106,74,142,0.10)',   label:'Options suggérées',    icon:'💡' },
    'fournitures': { color:'#0d4690', bg:'rgba(13,70,144,0.10)',    label:'Fournitures suggérées',icon:'📦' },
    'a-confirmer': { color:'#8a1e1e', bg:'rgba(198,40,40,0.10)',    label:'À confirmer',          icon:'⚠' }
  };
  var CONF_BADGE = {
    'haute':   { color:'#1d4d33', bg:'rgba(45,106,79,0.18)',  label:'Haute' },
    'moyenne': { color:'#9a4514', bg:'rgba(232,98,26,0.15)',   label:'Moyenne' },
    'faible':  { color:'#7a8896', bg:'rgba(15,32,48,0.08)',   label:'Faible' }
  };

  /* ─── Commit D IA : enrichissements via quote-fusion ─────────── */

  /* Mapping source → icône visuelle (badges des suggestions) */
  var SOURCE_ICONS = {
    'obligatoire': { icon:'🔒', label:'Obligatoire (modèle)' },
    'travaux'    : { icon:'✋', label:'Travail coché' },
    'brouillon'  : { icon:'📋', label:'Brouillon déjà saisi' },
    'notes'      : { icon:'📝', label:'Note / observation' },
    'croquis'    : { icon:'✏️', label:'Croquis' },
    'photos'     : { icon:'📸', label:'Photo' }
  };

  function renderConfidenceBadge(conf){
    var d = CONF_BADGE[conf] || CONF_BADGE.moyenne;
    return '<span style="display:inline-block;padding:1px 7px;border-radius:99px;background:'+d.bg+';color:'+d.color+';font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">'+d.label+'</span>';
  }

  /* Badges des sources d'une suggestion (issues de quote-fusion) */
  function renderSourceBadges(sources){
    if(!sources || !sources.length) return '';
    var unique = {};
    sources.forEach(function(s){ unique[s.source || s] = true; });
    return Object.keys(unique).map(function(src){
      var d = SOURCE_ICONS[src] || { icon:'·', label:src };
      return '<span title="' + safeEsc(d.label) + '" style="display:inline-block;font-size:11px;margin-right:3px;line-height:1;">' + d.icon + '</span>';
    }).join('');
  }

  /* Bandeau global "Drapeaux à confirmer absolument" */
  function renderGlobalFlagsBanner(allFlags){
    if(!allFlags || !allFlags.length) return '';
    var seen = {};
    var unique = allFlags.filter(function(f){
      var k = f.type + '|' + f.message;
      if(seen[k]) return false;
      seen[k] = true;
      return true;
    });
    if(!unique.length) return '';
    return '<div style="background:rgba(232,98,26,0.08);border:1px solid rgba(232,98,26,0.28);border-radius:14px;padding:14px 18px;margin-bottom:14px;font-family:Inter,sans-serif;">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
        '<div style="font-weight:700;color:#9a4514;font-size:13px;">⚠ Points à confirmer absolument</div>' +
        '<span style="background:rgba(232,98,26,0.20);color:#9a4514;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;">' + unique.length + '</span>' +
      '</div>' +
      '<ul style="margin:0;padding-left:18px;font-size:12px;color:#3a4a5c;line-height:1.6;">' +
      unique.map(function(f){
        return '<li><b style="color:#9a4514;">' + safeEsc(f.type.toUpperCase()) + ' :</b> ' + safeEsc(f.message) + '</li>';
      }).join('') +
      '</ul>' +
    '</div>';
  }

  /* Conflits altGroup (alternatives mutuellement exclusives résolues) */
  function renderConflictsBox(conflits){
    if(!conflits || !conflits.length) return '';
    return '<div style="background:rgba(106,74,142,0.06);border:1px solid rgba(106,74,142,0.22);border-radius:10px;padding:10px 14px;margin-bottom:10px;font-family:Inter,sans-serif;">' +
      '<div style="font-weight:700;color:#4a3565;font-size:12px;margin-bottom:6px;">⚖ Alternatives arbitrées automatiquement</div>' +
      conflits.map(function(c){
        return '<div style="font-size:11px;color:#3a4a5c;line-height:1.55;">' +
          '<b>' + safeEsc(c.altGroupLabel) + '</b> : retenu ' +
          '<code style="background:rgba(0,0,0,0.06);padding:1px 5px;border-radius:3px;font-size:10.5px;">' + safeEsc(c.retenu.templateKey) + '</code>' +
          ' parmi ' + c.candidats.map(function(cd){ return '<code style="background:rgba(0,0,0,0.04);padding:1px 4px;border-radius:3px;font-size:10.5px;">' + safeEsc(cd.templateKey) + '</code>'; }).join(', ') +
        '</div>';
      }).join('') +
    '</div>';
  }

  /* Badge compact pour les doublons fusionnés (sources multiples) */
  function renderDoublonsBadge(doublons){
    if(!doublons || !doublons.length) return '';
    return '<span title="Lignes détectées par plusieurs sources et fusionnées intelligemment (anti-doublon par semanticKey)" style="background:rgba(13,70,144,0.10);color:#0d4690;padding:3px 9px;border-radius:99px;font-size:11px;font-weight:600;font-family:Inter,sans-serif;">🔀 ' + doublons.length + ' fusionné' + (doublons.length>1?'s':'') + '</span>';
  }

  /* Lance quote-fusion sur une pièce, retourne le résultat structuré */
  function runFusionForPiece(piece){
    if(!window.QUOTE_FUSION) return null;
    var notesParts = [];
    if(piece.obs) notesParts.push(piece.obs);
    if((piece.travaux||{}).plomberie) notesParts.push(piece.travaux.plomberie);
    (piece.msNotes || []).forEach(function(n){
      if(n.title) notesParts.push(n.title);
      if(n.ocrText) notesParts.push(n.ocrText);
    });

    try {
      return window.QUOTE_FUSION.analyze({
        pieceType: 'salle-de-bain',
        travauxCoches: Object.keys((piece.travaux||{}).cats||{}).filter(function(k){ return piece.travaux.cats[k] === true; }),
        elementsPeints: (piece.travaux||{}).paintElems || [],
        notesTexte: notesParts.join(' '),
        mesures: piece.mesures || {},
        photos: (piece.photos || []).map(function(p){ return { id:p.id, zone: p.zone || null, label: p.title || null }; }),
        croquis: piece.croquis ? [{ id:'sketch-'+piece.id, zone: piece.croquisZone || null, label: 'Croquis' }] : []
      });
    } catch(e){
      console.warn('[QUOTE_FUSION] erreur sur pièce', piece.id, e);
      return null;
    }
  }

  /* Construit une map { templateKey → sources structurées } depuis un résultat fusion */
  function buildSourcesMap(fusionResult){
    var map = {};
    if(!fusionResult) return map;
    ['lignesSures', 'lignesProbables', 'lignesAConfirmer'].forEach(function(cat){
      (fusionResult[cat] || []).forEach(function(line){
        map[line.templateKey] = line.sources || [];
      });
    });
    return map;
  }

  function renderSuggestionRow(sug){
    var item = sug.item;
    if(!item) return '';
    var label = safeEsc(item.label || item.key);
    var unit = safeEsc(item.unit || '');
    var price = item.defaultPrice || 0;
    var qty = item.defaultQty != null ? item.defaultQty : 1;
    /* Sources : priorité aux sources structurées de fusion (avec icônes), fallback sur les strings legacy */
    var sourcesIconsHTML = sug._fusionSources ? renderSourceBadges(sug._fusionSources) : '';
    var sourcesText = (sug.sources || []).map(safeEsc).join(' · ');
    return '<label class="aj-sug-row" style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(15,32,48,0.06);cursor:pointer;font-family:Inter,sans-serif;">' +
      '<input type="checkbox" data-aj-sug data-tk="'+safeEsc(sug.templateKey)+'" data-cat="'+safeEsc(sug.category)+'" data-conf="'+safeEsc(sug.confidence)+'" checked style="margin-top:3px;width:18px;height:18px;accent-color:#c9a96e;flex-shrink:0;cursor:pointer;" />' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
          '<span style="font-family:monospace;font-size:11px;color:#7a8896;">'+safeEsc(sug.templateKey)+'</span>' +
          renderConfidenceBadge(sug.confidence) +
          (sourcesIconsHTML ? '<span style="display:inline-flex;align-items:center;gap:1px;">'+sourcesIconsHTML+'</span>' : '') +
        '</div>' +
        '<div style="font-size:13px;color:#0f2030;font-weight:500;margin-top:2px;line-height:1.4;">'+label+'</div>' +
        '<div style="font-size:11px;color:#7a8896;margin-top:2px;">'+sourcesText+'</div>' +
      '</div>' +
      '<div style="text-align:right;flex-shrink:0;font-family:Inter,sans-serif;">' +
        '<div style="font-size:11px;color:#7a8896;">'+(qty)+' '+unit+'</div>' +
        '<div style="font-size:13px;font-weight:700;color:#0f2030;">'+(price ? price.toLocaleString('fr-FR')+' €' : '—')+'</div>' +
      '</div>' +
    '</label>';
  }

  function renderSuggestionGroup(category, suggestions){
    if(!suggestions.length) return '';
    var s = CAT_STYLE[category] || CAT_STYLE.probables;
    return '<div style="background:#fff;border:1px solid var(--c-border,#e3dccc);border-left:4px solid '+s.color+';border-radius:10px;margin-bottom:10px;overflow:hidden;font-family:Inter,sans-serif;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:'+s.bg+';">' +
        '<div style="font-weight:700;color:'+s.color+';font-size:13px;">'+s.icon+' '+s.label+'</div>' +
        '<div style="font-size:11px;color:'+s.color+';font-weight:600;">'+suggestions.length+' suggestion'+(suggestions.length>1?'s':'')+'</div>' +
      '</div>' +
      '<div>' + suggestions.map(renderSuggestionRow).join('') + '</div>' +
    '</div>';
  }

  function renderPieceCard(pa){
    var m = pa.mesures || {};
    var dimsParts = [];
    if(m.long && m.larg) dimsParts.push(m.long + ' × ' + m.larg + ' m');
    if(m.haut) dimsParts.push('HSP ' + m.haut + ' m');
    var dims = dimsParts.join(' · ');

    var aConfirmerHTML = '';
    if(pa.aConfirmer && pa.aConfirmer.length){
      aConfirmerHTML = '<div style="background:rgba(198,40,40,0.06);border:1px solid rgba(198,40,40,0.20);border-radius:10px;padding:12px 14px;margin-bottom:10px;font-family:Inter,sans-serif;">' +
        '<div style="font-weight:700;color:#8a1e1e;font-size:13px;margin-bottom:6px;">⚠ À confirmer pour cette pièce</div>' +
        '<ul style="margin:0;padding-left:18px;font-size:12px;color:#3a4a5c;line-height:1.6;">' +
        pa.aConfirmer.map(function(a){ return '<li>'+safeEsc(a)+'</li>'; }).join('') +
        '</ul>' +
      '</div>';
    }

    if(!pa.supported){
      return '<div data-aj-piece="'+safeEsc(pa.pieceId)+'" style="background:#fbf8f2;border:1px dashed var(--c-border,#e3dccc);border-radius:14px;padding:18px 20px;margin-bottom:14px;font-family:Inter,sans-serif;">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">' +
          '<div style="font-size:24px;">'+safeEsc(pa.icon)+'</div>' +
          '<div style="flex:1;"><div style="font-weight:700;color:#0f2030;font-size:15px;">'+safeEsc(pa.nom)+'</div>' +
          '<div style="font-size:11px;color:#7a8896;">'+safeEsc(pa.notSupportedReason || 'Type non supporté')+'</div></div>' +
        '</div>' +
        '<div style="font-size:12px;color:#7a8896;font-style:italic;">L\'analyse intelligente est disponible uniquement pour les salles de bain (template SDB chargé). Les autres types de pièces (cuisine, salon, chambre…) seront supportés dans une prochaine mise à jour.</div>' +
      '</div>';
    }

    /* Groupe les suggestions par catégorie */
    var byCategory = { 'certains':[], 'probables':[], 'options':[], 'fournitures':[] };
    pa.suggestions.forEach(function(sug){
      if(byCategory[sug.category]) byCategory[sug.category].push(sug);
      else byCategory.probables.push(sug);
    });
    /* Tri par confiance dans chaque groupe */
    Object.keys(byCategory).forEach(function(k){
      byCategory[k].sort(function(a,b){ return confidenceLevel(b.confidence) - confidenceLevel(a.confidence); });
    });

    /* Commit D IA : extras de fusion (conflits + badge doublons) */
    var conflictsHTML = pa.fusionMeta ? renderConflictsBox(pa.fusionMeta.conflits) : '';
    var doublonsBadge = pa.fusionMeta ? renderDoublonsBadge(pa.fusionMeta.doublons) : '';

    return '<div data-aj-piece="'+safeEsc(pa.pieceId)+'" style="background:#fff;border:1px solid var(--c-border,#e3dccc);border-radius:14px;padding:18px 20px;margin-bottom:14px;font-family:Inter,sans-serif;">' +
      /* Header pièce */
      '<div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:14px;flex-wrap:wrap;">' +
        '<div style="font-size:32px;">'+safeEsc(pa.icon)+'</div>' +
        '<div style="flex:1;min-width:200px;">' +
          '<div style="font-family:Cormorant Garamond,Georgia,serif;font-size:22px;font-weight:600;color:#0f2030;line-height:1.1;">'+safeEsc(pa.nom)+'</div>' +
          (dims ? '<div style="font-size:12px;color:#3a4a5c;margin-top:3px;">'+safeEsc(dims)+'</div>' : '') +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;font-size:11px;font-family:Inter,sans-serif;align-items:center;">' +
          (pa.hasCroquis ? '<span style="background:rgba(201,169,110,0.12);color:#7a5a30;padding:3px 9px;border-radius:99px;font-weight:600;">✏️ Croquis</span>' : '') +
          (pa.nbPhotos ? '<span style="background:rgba(13,70,144,0.10);color:#0d4690;padding:3px 9px;border-radius:99px;font-weight:600;">📷 '+pa.nbPhotos+' photo'+(pa.nbPhotos>1?'s':'')+'</span>' : '') +
          (pa.nbNotes ? '<span style="background:rgba(106,74,142,0.10);color:#4a3565;padding:3px 9px;border-radius:99px;font-weight:600;">📝 '+pa.nbNotes+' note'+(pa.nbNotes>1?'s':'')+'</span>' : '') +
          (pa.catsActives.length ? '<span style="background:rgba(45,106,79,0.10);color:#1d4d33;padding:3px 9px;border-radius:99px;font-weight:600;">✓ '+pa.catsActives.length+' cat. cochée'+(pa.catsActives.length>1?'s':'')+'</span>' : '') +
          doublonsBadge +
        '</div>' +
      '</div>' +

      /* Bandeau "À confirmer" si présent */
      aConfirmerHTML +
      /* Bandeau conflits altGroup résolus */
      conflictsHTML +

      /* Aucune suggestion ? */
      (pa.suggestions.length === 0 ?
        '<div style="text-align:center;padding:24px;color:#7a8896;font-size:13px;font-style:italic;">Aucune suggestion : ajoute des notes, des photos, ou coche des travaux dans le module Travaux pour que l\'analyse propose des lignes de devis.</div>'
        :
        /* Suggestions par catégorie */
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;font-family:Inter,sans-serif;">' +
          '<div style="font-weight:700;color:#0f2030;font-size:13px;">'+pa.suggestions.length+' suggestion'+(pa.suggestions.length>1?'s':'')+'</div>' +
          '<div style="display:flex;gap:6px;">' +
            '<button type="button" data-aj-piece-toggle="all-on" data-pid="'+safeEsc(pa.pieceId)+'" style="padding:5px 10px;background:#fff;border:1px solid var(--c-border,#e3dccc);border-radius:6px;cursor:pointer;font-size:11px;color:#1d4d33;font-weight:600;">✓ Tout cocher</button>' +
            '<button type="button" data-aj-piece-toggle="all-off" data-pid="'+safeEsc(pa.pieceId)+'" style="padding:5px 10px;background:#fff;border:1px solid var(--c-border,#e3dccc);border-radius:6px;cursor:pointer;font-size:11px;color:#7a8896;font-weight:600;">○ Tout décocher</button>' +
          '</div>' +
        '</div>' +
        renderSuggestionGroup('certains',    byCategory.certains) +
        renderSuggestionGroup('probables',   byCategory.probables) +
        renderSuggestionGroup('options',     byCategory.options) +
        renderSuggestionGroup('fournitures', byCategory.fournitures)
      ) +
    '</div>';
  }

  function renderEmptyClient(){
    return '<div style="background:#fff;border:1px solid var(--c-border,#e3dccc);border-radius:14px;padding:40px 20px;text-align:center;font-family:Inter,sans-serif;">' +
      '<div style="font-size:48px;margin-bottom:12px;">🔍</div>' +
      '<div style="font-family:Cormorant Garamond,Georgia,serif;font-size:22px;font-weight:600;color:#0f2030;margin-bottom:8px;">Aucun chantier sélectionné</div>' +
      '<div style="font-size:13px;color:#3a4a5c;line-height:1.5;max-width:480px;margin:0 auto;">Ouvre un client depuis la sidebar ou crée-en un nouveau, puis reviens ici pour analyser le rendez-vous.</div>' +
    '</div>';
  }

  function renderAnalysisHeader(a){
    var c = a.client;
    return '<div style="background:linear-gradient(135deg,#0f2030,#1a3349);color:#fff;border-radius:14px;padding:22px 24px;margin-bottom:18px;font-family:Inter,sans-serif;">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">' +
        '<div style="flex:1;min-width:200px;">' +
          '<div style="font-family:Cormorant Garamond,Georgia,serif;font-size:13px;color:#c9a96e;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;margin-bottom:4px;">Analyse rendez-vous</div>' +
          '<div style="font-family:Cormorant Garamond,Georgia,serif;font-size:26px;font-weight:600;color:#fff;line-height:1.1;">'+safeEsc((c.prenom||'')+' '+(c.nom||''))+'</div>' +
          (c.adresse ? '<div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;">'+safeEsc(c.adresse)+'</div>' : '') +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.6px;">Visite</div>' +
          '<div style="font-size:14px;color:#fff;margin-top:2px;">'+(c.date ? new Date(c.date).toLocaleDateString('fr-FR') : '—')+'</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;border-top:1px solid rgba(255,255,255,0.12);padding-top:14px;margin-top:14px;">' +
        '<div><div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;">Pièces</div><div style="font-size:22px;font-weight:600;margin-top:2px;">'+a.stats.totalPieces+'</div></div>' +
        '<div><div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;">Analysées</div><div style="font-size:22px;font-weight:600;margin-top:2px;color:#c9a96e;">'+a.stats.supportedPieces+' / '+a.stats.totalPieces+'</div></div>' +
        '<div><div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;">Photos</div><div style="font-size:22px;font-weight:600;margin-top:2px;">'+a.stats.totalPhotos+'</div></div>' +
        '<div><div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;">Notes</div><div style="font-size:22px;font-weight:600;margin-top:2px;">'+a.stats.totalNotes+'</div></div>' +
        '<div><div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;">Suggestions</div><div style="font-size:22px;font-weight:600;margin-top:2px;color:#c9a96e;">'+a.stats.totalSuggestions+'</div></div>' +
      '</div>' +
    '</div>';
  }

  function renderActionBar(){
    return '<div id="aj-analysis-action-bar" style="position:sticky;bottom:14px;display:flex;gap:10px;align-items:center;background:rgba(244,239,231,0.97);backdrop-filter:blur(8px);padding:14px;border-radius:12px;border:1px solid var(--c-border,#e3dccc);box-shadow:0 4px 16px rgba(0,0,0,0.08);font-family:Inter,sans-serif;flex-wrap:wrap;margin-top:14px;">' +
      '<div style="flex:1;min-width:200px;">' +
        '<div style="font-weight:700;color:#0f2030;font-size:14px;">Brouillon de devis</div>' +
        '<div id="aj-analysis-counter" style="font-size:12px;color:#7a8896;margin-top:2px;">— sélectionne les suggestions à inclure</div>' +
      '</div>' +
      '<button type="button" onclick="window.AJAnalysis.refresh()" style="padding:11px 16px;background:#fff;border:1px solid var(--c-border,#e3dccc);border-radius:10px;cursor:pointer;font-weight:600;color:#0f2030;font-size:13px;">↻ Réanalyser</button>' +
      '<button type="button" id="aj-analysis-create-draft" style="padding:13px 22px;background:#1d4d33;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:14px;">📝 Créer brouillon de devis</button>' +
    '</div>';
  }

  function renderAnalysisScreen(){
    ensureAnalysisScreen();
    var body = document.getElementById('aj-analysis-body');
    if(!body) return;

    /* Auto-select dernier client si aucun */
    if(!window.currentClientId){
      var db = (typeof dbLoad === 'function') ? dbLoad() : { clients:{} };
      var clients = Object.values(db.clients || {}).sort(function(a,b){ return (b.createdAt||0) - (a.createdAt||0); });
      if(clients.length) window.currentClientId = clients[0].id;
    }

    if(!window.currentClientId){
      body.innerHTML = renderEmptyClient();
      return;
    }

    var analysis = buildChantierAnalysis(window.currentClientId);
    if(!analysis){
      body.innerHTML = '<div style="padding:40px;text-align:center;font-family:Inter,sans-serif;color:#7a8896;">Erreur d\'analyse — client introuvable.</div>';
      return;
    }
    if(!analysis.pieces.length){
      body.innerHTML = renderAnalysisHeader(analysis) +
        '<div style="background:#fff;border:1px solid var(--c-border,#e3dccc);border-radius:14px;padding:40px 20px;text-align:center;font-family:Inter,sans-serif;">' +
          '<div style="font-size:48px;margin-bottom:12px;">🏠</div>' +
          '<div style="font-family:Cormorant Garamond,Georgia,serif;font-size:20px;font-weight:600;color:#0f2030;margin-bottom:8px;">Aucune pièce relevée</div>' +
          '<div style="font-size:13px;color:#3a4a5c;">Ajoute des pièces et fais ton relevé (mesures, croquis, photos, notes) avant de revenir analyser.</div>' +
        '</div>';
      return;
    }

    var html = renderAnalysisHeader(analysis) +
      renderGlobalFlagsBanner(analysis.allFlags) +
      analysis.pieces.map(renderPieceCard).join('') +
      renderActionBar();

    body.innerHTML = html;

    /* Stocke l'analyse pour pouvoir la consulter au moment de la création du brouillon */
    window._ajCurrentAnalysis = analysis;

    /* Wire events */
    setTimeout(wireAnalysisEvents, 50);
  }

  /* Compteur dynamique des suggestions cochées */
  function refreshSelectedCounter(){
    var checked = document.querySelectorAll('#aj-analysis-body input[data-aj-sug]:checked');
    var total = document.querySelectorAll('#aj-analysis-body input[data-aj-sug]');
    var counter = document.getElementById('aj-analysis-counter');
    if(counter){
      counter.textContent = checked.length + ' / ' + total.length + ' suggestion(s) sélectionnée(s)';
    }
    var btn = document.getElementById('aj-analysis-create-draft');
    if(btn){
      btn.disabled = checked.length === 0;
      btn.style.opacity = checked.length === 0 ? '0.5' : '1';
      btn.style.cursor = checked.length === 0 ? 'not-allowed' : 'pointer';
    }
  }

  function wireAnalysisEvents(){
    /* Toggle all par pièce */
    document.querySelectorAll('[data-aj-piece-toggle]').forEach(function(btn){
      btn.onclick = function(){
        var pid = btn.getAttribute('data-pid');
        var mode = btn.getAttribute('data-aj-piece-toggle');
        var pieceCard = document.querySelector('[data-aj-piece="'+pid+'"]');
        if(!pieceCard) return;
        pieceCard.querySelectorAll('input[data-aj-sug]').forEach(function(inp){
          inp.checked = (mode === 'all-on');
        });
        refreshSelectedCounter();
      };
    });

    /* Suivi sélection */
    document.querySelectorAll('input[data-aj-sug]').forEach(function(inp){
      inp.addEventListener('change', refreshSelectedCounter);
    });

    /* Bouton Créer brouillon */
    var btn = document.getElementById('aj-analysis-create-draft');
    if(btn){
      btn.onclick = createDraftFromAnalysis;
    }

    refreshSelectedCounter();
  }

  /* ─────────────────────────────────────────────────────────────────
     CRÉATION DU BROUILLON DE DEVIS (Commit 1 — version basique)
     Pour chaque suggestion cochée, on récupère l'item du template et
     on le map vers le formData du wizard SDB via son trigger.
     Au prochain wizardOpen, le récap éditable montrera les bonnes lignes.
     ───────────────────────────────────────────────────────────────── */
  function createDraftFromAnalysis(){
    var analysis = window._ajCurrentAnalysis;
    if(!analysis){ if(typeof showToast==='function') showToast('Réanalysez avant'); return; }
    if(typeof window.AJBath === 'undefined' || typeof window.AJBath.newDraft !== 'function'){
      if(typeof showToast==='function') showToast('⚠ Module SDB non chargé');
      return;
    }

    var checkedInputs = document.querySelectorAll('#aj-analysis-body input[data-aj-sug]:checked');
    if(!checkedInputs.length){
      if(typeof showToast==='function') showToast('Coche au moins une suggestion');
      return;
    }

    /* Crée un draft via l'API existante du module SDB */
    var draft = window.AJBath.newDraft();
    draft.formData = draft.formData || {};
    draft.fromAnalysis = true;
    draft.analysisClientId = analysis.client.id;

    /* Pré-remplit les champs client depuis l'analyse */
    if(analysis.client.prenom) draft.formData['client.prenom'] = analysis.client.prenom;
    if(analysis.client.nom)    draft.formData['client.nom'] = analysis.client.nom;
    if(analysis.client.tel)    draft.formData['client.tel'] = analysis.client.tel;
    if(analysis.client.email)  draft.formData['client.email'] = analysis.client.email;
    if(analysis.client.adresse) draft.formData['client.adresseChantier'] = analysis.client.adresse;
    if(analysis.client.etage)  draft.formData['client.etage'] = analysis.client.etage;
    if(analysis.client.code)   draft.formData['client.codeAcces'] = analysis.client.code;
    if(analysis.client.type)   draft.formData['client.typeLogement'] = analysis.client.type;

    /* Pré-remplit les mesures depuis la première pièce SDB */
    var firstSdb = analysis.pieces.find(function(p){ return p.supported; });
    if(firstSdb && firstSdb.mesures){
      var m = firstSdb.mesures;
      if(m.long) draft.formData['mesures.longueur'] = m.long;
      if(m.larg) draft.formData['mesures.largeur'] = m.larg;
      if(m.haut) draft.formData['mesures.hsp'] = m.haut;
      if(m.qcPP) draft.formData['mesures.nbPortes'] = m.qcPP;
      if(m.qcFen) draft.formData['mesures.nbFenetres'] = m.qcFen;
    }

    /* Pour chaque suggestion cochée : trouve le trigger du template et l'active */
    var template = window.AJBath.TEMPLATE;
    var ignoredKeys = [];
    var appliedKeys = [];
    Array.prototype.forEach.call(checkedInputs, function(inp){
      var tk = inp.getAttribute('data-tk');
      var found = findTemplateItem(template, tk);
      if(!found){ ignoredKeys.push(tk); return; }
      var item = found.item;
      if(item.trigger){
        draft.formData[item.trigger] = true;
        appliedKeys.push(tk);
      } else if(item.isMandatory || item.displayOnly){
        /* Lignes obligatoires : pas de trigger nécessaire, elles entrent toujours */
        appliedKeys.push(tk);
      } else {
        ignoredKeys.push(tk);
      }
    });

    /* Sauve le draft */
    if(typeof window.AJBath.saveDraft === 'function'){
      window.AJBath.saveDraft(draft);
    }

    /* Toast récap */
    if(typeof showToast==='function'){
      showToast('Brouillon créé : ' + appliedKeys.length + ' lignes appliquées' + (ignoredKeys.length ? ' (' + ignoredKeys.length + ' ignorées)' : ''));
    }

    /* Ouvre le wizard sur l'étape récap directement (étape 12, index 11) */
    setTimeout(function(){
      if(typeof window.AJBath.wizardOpen === 'function'){
        window.AJBath.wizardOpen(draft.id);
        /* Tente d'aller direct à l'étape récap si possible */
        setTimeout(function(){
          if(typeof window.AJBath.wizardGoTo === 'function'){
            window.AJBath.wizardGoTo(11); /* étape 12 (récap), index 11 */
          }
        }, 250);
      } else {
        /* Fallback : redirige vers l'écran SDB */
        if(typeof showScreen === 'function') showScreen('screen-bathroom-quote');
      }
    }, 600);
  }

  /* ─────────────────────────────────────────────────────────────────
     NAV-ITEM SIDEBAR
     ───────────────────────────────────────────────────────────────── */
  function injectAnalysisNav(){
    var nav = document.querySelector('.sidebar-nav');
    if(!nav || document.getElementById('aj-nav-analysis')) return;
    var item = document.createElement('div');
    item.className = 'nav-item';
    item.id = 'aj-nav-analysis';
    item.setAttribute('data-screen', 'screen-chantier-analysis');
    item.innerHTML =
      '<span class="nav-item-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="11" cy="11" r="7"/>' +
        '<line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
        '<path d="M11 8v6"/><path d="M8 11h6"/>' +
      '</svg></span>' +
      '<span>Analyse rendez-vous</span>';
    item.onclick = function(){
      if(typeof closeSidebar === 'function' && window.innerWidth <= 980) closeSidebar();
      if(typeof window.screenHistory !== 'undefined') window.screenHistory = [];
      ensureAnalysisScreen();
      if(typeof showScreen === 'function') showScreen('screen-chantier-analysis');
      renderAnalysisScreen();
    };
    /* Insère après "Devis salle de bain" si présent, sinon après "Documents émis", sinon en fin */
    var ref = document.getElementById('aj-nav-bathroom') ||
              document.getElementById('aj-nav-docs') ||
              null;
    if(ref && ref.parentNode === nav){
      nav.insertBefore(item, ref.nextSibling);
    } else {
      nav.appendChild(item);
    }
  }

  /* Patch updateNav pour activer le nav-item */
  setTimeout(function(){
    var _origUpdateNav = window.updateNav;
    if(_origUpdateNav){
      window.updateNav = function(){
        var r = _origUpdateNav.apply(this, arguments);
        var item = document.getElementById('aj-nav-analysis');
        if(item){ item.classList.toggle('active', window.currentScreen === 'screen-chantier-analysis'); }
        return r;
      };
    }
  }, 1500);

  /* Patch showScreen pour render au switch */
  setTimeout(function(){
    var _origShowScreen = window.showScreen;
    if(_origShowScreen){
      window.showScreen = function(id){
        var r = _origShowScreen.apply(this, arguments);
        if(id === 'screen-chantier-analysis') setTimeout(renderAnalysisScreen, 50);
        return r;
      };
    }
  }, 1500);

  setTimeout(injectAnalysisNav, 1400);

  /* ─────────────────────────────────────────────────────────────────
     API EXPOSÉE pour le debugging et les commits suivants
     ───────────────────────────────────────────────────────────────── */
  window.AJAnalysis = {
    TEMPLATE_REGISTRY: TEMPLATE_REGISTRY,
    detectPieceType: detectPieceType,
    mapPieceToSuggestions: mapPieceToSuggestions,
    detectAConfirmer: detectAConfirmer,
    buildChantierAnalysis: buildChantierAnalysis,
    findTemplateItem: findTemplateItem,
    refresh: renderAnalysisScreen,
    createDraftFromAnalysis: createDraftFromAnalysis,
    /* Tables exposées pour extension future */
    SDB_CATS_TO_TEMPLATE: SDB_CATS_TO_TEMPLATE,
    SDB_PAINT_TO_TEMPLATE: SDB_PAINT_TO_TEMPLATE,
    SDB_KEYWORDS: SDB_KEYWORDS,
    SDB_FLAGS_A_CONFIRMER: SDB_FLAGS_A_CONFIRMER,
    MANDATORY_SDB: MANDATORY_SDB
  };

  console.log('[AJ PRO Analysis] Module Analyse Chantier chargé · ' +
    Object.keys(SDB_CATS_TO_TEMPLATE).length + ' règles cats · ' +
    SDB_KEYWORDS.length + ' règles mots-clés');
})();
