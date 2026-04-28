/* ════════════════════════════════════════════════════════════════════
   AJ PRO RÉNOVATION — MOTEUR DE FUSION INTELLIGENT (Commit C IA)
   100 % local, 0 dépendance, prêt pour brancher Claude API plus tard.

   Entrée : tout ce qui est connu d'un chantier (travaux cochés, brouillon
   wizard, notes texte, mesures, photos, croquis).
   Sortie : lignes de devis classées par confiance + anti-doublons par
   semanticKey + détection conflits alternatives + drapeaux à confirmer.

   Source de vérité du modèle : window.QUOTE_TEMPLATE_SDB (Commit A).

   ─── EXEMPLE D'UTILISATION ─────────────────────────────────────────
   var fusion = window.QUOTE_FUSION.analyze({
     pieceType: 'salle-de-bain',
     travauxCoches: ['sol-carrelage', 'elec-prises'],
     brouillonFormData: { 'douche.plomberie': true },
     notesTexte: 'Douche italienne 80x120 + niche carrelée H30',
     mesures: { longueur: 2.5, largeur: 1.5 },
     photos: [{ id: 'p1', zone: 'douche' }],
     croquis: []
   });
   // → { lignesSures, lignesProbables, lignesAConfirmer,
   //     doublons, conflits, drapeaux, meta }
   ──────────────────────────────────────────────────────────────────── */

(function(){
  if(window.QUOTE_FUSION){ return; }

  /* ─── CONFIDENCE THRESHOLDS ──────────────────────────────────── */
  var CONF_HIGH    = 0.85;   // ≥ → "sûres"
  var CONF_MEDIUM  = 0.55;   // ≥ → "probables"
  /* < CONF_MEDIUM → "à confirmer" */

  /* ─── PRIORITÉ DES SOURCES (poids fusion) ─────────────────────
     Plus le poids est haut, plus la source domine en cas de doublon. */
  var SOURCE_PRIORITY = {
    'obligatoire' : 110,    // lignes mandatory du template (toujours en haut)
    'travaux'     : 100,    // catégories cochées dans le module Travaux
    'brouillon'   : 90,     // formData déjà saisi dans le wizard SDB
    'notes'       : 60,     // mots-clés des notes texte
    'croquis'     : 40,     // métadonnées zone des croquis
    'photos'      : 30      // métadonnées zone des photos
  };

  /* Conversion confidence string (legacy chantier-analysis) → number */
  var CONF_LEGACY_TO_NUM = {
    'haute'   : 0.92,
    'moyenne' : 0.65,
    'faible'  : 0.40
  };

  /* ─── TABLES DE MAPPING ──────────────────────────────────────────
     Source : chantier-analysis.js — gardées synchronisées par
     construction. Au commit D, chantier-analysis.js consommera ces
     tables (devenant la source unique) pour éviter la duplication. */

  /* Catégories du module Travaux → templateKeys (avec confidence legacy) */
  var WORKS_TO_TEMPLATE = {
    /* Maçonnerie */
    'mac-depose-cloison' : [{ k:'7.1',  c:'haute'   }],
    'mac-crea-cloison'   : [{ k:'10.1', c:'moyenne' }],
    'mac-depose-fp'      : [{ k:'8.1',  c:'haute'   }],
    'mac-crea-fp'        : [{ k:'8.1',  c:'haute'   }, { k:'8.2', c:'moyenne' }, { k:'8.4', c:'faible' }],
    'mac-pose-porte'     : [{ k:'17.1', c:'moyenne' }],
    'mac-ouverture'      : [{ k:'2.7',  c:'moyenne' }],
    /* Électricité */
    'elec-prise-rpl'     : [{ k:'4.2',  c:'haute'   }, { k:'13.5', c:'faible' }],
    'elec-inter-rpl'     : [{ k:'13.5', c:'moyenne' }],
    'elec-prises'        : [{ k:'4.7',  c:'haute'   }, { k:'5.8.3', c:'moyenne' }, { k:'5.8.4', c:'moyenne' }],
    'elec-inter'         : [{ k:'5.8.5',c:'moyenne' }, { k:'5.8.6', c:'moyenne' }],
    'elec-volet'         : [{ k:'13.3', c:'haute'   }],
    'elec-ecl'           : [{ k:'4.3',  c:'haute'   }, { k:'4.9',   c:'haute'   }],
    'elec-tab'           : [{ k:'13.1', c:'haute'   }],
    'elec-radiateur'     : [{ k:'4.5',  c:'haute'   }, { k:'4.11',  c:'haute'   }, { k:'5.5.3', c:'haute' }],
    /* Sol */
    'sol-depose-rev'     : [{ k:'7.1',  c:'haute'   }],
    'sol-ragreage'       : [{ k:'7.1',  c:'moyenne' }],
    'sol-carrelage'      : [{ k:'2.16', c:'haute'   }, { k:'2.17',  c:'haute'   }, { k:'5.1.1', c:'haute' }, { k:'5.1.2', c:'haute' }],
    'sol-par-seuil'      : [{ k:'2.18', c:'haute'   }, { k:'5.8.1', c:'haute'   }],
    'sol-par-baguette'   : [{ k:'2.23', c:'haute'   }, { k:'5.8.2', c:'haute'   }],
    /* Portes & Fenêtres */
    'pf-porte-rpl'       : [{ k:'17.1', c:'moyenne' }]
  };

  /* Éléments peints → templateKeys (peinture SDB toujours sur 2.29) */
  var PAINT_TO_TEMPLATE = {
    'plafond'   : [{ k:'2.29', c:'haute'   }],
    'mur'       : [{ k:'2.29', c:'haute'   }],
    'plinthe'   : [{ k:'2.29', c:'haute'   }],
    'porte'     : [{ k:'2.29', c:'moyenne' }],
    'fenetre'   : [{ k:'2.29', c:'moyenne' }],
    'placard'   : [{ k:'2.29', c:'faible'  }],
    'radiateur' : [{ k:'2.29', c:'faible'  }],
    'biblio'    : [{ k:'2.29', c:'faible'  }],
    'corniche'  : [{ k:'2.29', c:'faible'  }]
  };

  /* Mots-clés notes/observations → templateKeys.
     Ordre important : règles spécifiques en premier (douche italienne
     avant douche générique) pour éviter les faux positifs. */
  var KEYWORD_RULES = [
    { label:'Douche italienne / receveur extra-plat',
      patterns:[/douche\s*italienne/i, /douche\s*extra[\s-]?plate?/i, /receveur\s*extra[\s-]?plat/i],
      keys:[
        {k:'2.9',c:'haute'},{k:'2.10',c:'moyenne'},{k:'3.1',c:'haute'},
        {k:'3.2',c:'haute'},{k:'5.2.1',c:'haute'},{k:'5.2.6',c:'haute'},
        {k:'5.2.8',c:'moyenne'}
      ]
    },
    { label:'Douche (générique)',
      patterns:[/\bdouche\b/i, /\breceveur\b/i, /\bparoi\b/i],
      keys:[{k:'3.1',c:'moyenne'},{k:'3.2',c:'moyenne'},{k:'5.2.1',c:'moyenne'},{k:'5.2.6',c:'moyenne'}]
    },
    { label:'Baignoire',
      patterns:[/baignoire/i, /\bsabot\b/i, /\bbain\b/i],
      keys:[
        {k:'2.11',c:'haute'},{k:'2.12',c:'moyenne'},{k:'3.3',c:'haute'},
        {k:'3.4',c:'moyenne'},{k:'5.3.1',c:'haute'},{k:'5.3.5',c:'haute'},
        {k:'5.3.7',c:'moyenne'}
      ]
    },
    { label:'WC suspendu',
      patterns:[/wc\s*suspendu/i, /cuvette\s*suspendue/i, /geberit/i, /\bsigma\b/i],
      keys:[{k:'2.13',c:'haute'},{k:'3.7',c:'haute'},{k:'5.6.1',c:'haute'},{k:'5.6.3',c:'haute'},{k:'5.6.4',c:'haute'}]
    },
    { label:'WC à poser',
      patterns:[/wc\s*[àa]\s*poser/i, /pack\s*wc/i],
      keys:[{k:'3.8',c:'haute'},{k:'5.6.5',c:'haute'}]
    },
    { label:'Vasque double',
      patterns:[/vasque\s*double/i, /double\s*vasque/i, /(2|deux)\s*vasques/i],
      keys:[{k:'3.10',c:'haute'},{k:'5.4.2',c:'haute'}]
    },
    { label:'Vasque simple',
      patterns:[/\bvasque\b/i, /\blavabo\b/i],
      keys:[{k:'3.9',c:'haute'},{k:'2.24',c:'haute'},{k:'5.4.1',c:'haute'},{k:'5.4.2',c:'haute'},{k:'5.4.5',c:'haute'}]
    },
    { label:'Sèche-serviettes eau chaude',
      patterns:[/s[èe]che[\s-]?serviettes?\s*eau\s*chaude/i, /radiateur\s*eau\s*chaude/i],
      keys:[{k:'3.11',c:'moyenne'},{k:'5.5.1',c:'moyenne'},{k:'5.5.2',c:'moyenne'}]
    },
    { label:'Sèche-serviettes électrique',
      patterns:[/s[èe]che[\s-]?serviettes?\s*[ée]lectrique/i, /radiateur\s*[ée]lectrique\s*(sdb|salle\s*de\s*bain)/i],
      keys:[{k:'4.11',c:'haute'},{k:'5.5.3',c:'haute'}]
    },
    { label:'Ballon ECS',
      patterns:[/\bballon\b/i, /chauffe[\s-]?eau/i, /\bcumulus\b/i],
      keys:[{k:'3.13',c:'haute'},{k:'5.7.1',c:'moyenne'},{k:'5.7.2',c:'haute'}]
    },
    { label:'Lave-linge',
      patterns:[/lave[\s-]?linge/i, /machine\s*[àa]\s*laver/i],
      keys:[{k:'3.5',c:'haute'}]
    },
    { label:'Sèche-linge',
      patterns:[/s[èe]che[\s-]?linge/i],
      keys:[{k:'3.6',c:'haute'}]
    },
    { label:'Carrelage mural',
      patterns:[/carrelage\s*mural/i, /\bfa[ïi]ence\b/i, /carrelage\s*muraux/i],
      keys:[{k:'2.19',c:'haute'},{k:'5.1.4',c:'haute'}]
    },
    { label:'Carrelage sol',
      patterns:[/carrelage\s*sol/i, /carrelage\s*au\s*sol/i],
      keys:[{k:'2.16',c:'haute'},{k:'5.1.1',c:'haute'}]
    },
    { label:'Niche carrelée',
      patterns:[/niche\s*carrel[ée]e?/i, /niche\s*carrelage/i, /niche\s*douche/i],
      keys:[{k:'10.1',c:'haute'},{k:'10.2',c:'haute'},{k:'10.3',c:'moyenne'}]
    },
    { label:'Plafond suspendu / spots',
      patterns:[/plafond\s*suspendu/i, /faux\s*plafond/i, /spots?\s*encastr[ée]s?/i, /spots?\s*led/i],
      keys:[{k:'8.1',c:'haute'},{k:'8.2',c:'haute'},{k:'8.4',c:'moyenne'}]
    },
    { label:'Coffrage / masquage tuyaux',
      patterns:[/coffrage\s*tuyau/i, /coffrage\s*colonne/i, /masqu(?:age|er)\s*tuyaux/i],
      keys:[{k:'11.1',c:'haute'},{k:'11.2',c:'moyenne'}]
    },
    { label:'Vanne d\'isolement',
      patterns:[/vanne\s*(?:arr[êe]t|isolement)/i, /remplacement\s*vanne/i],
      keys:[{k:'12.1',c:'haute'}]
    },
    { label:'PMR / accessibilité',
      patterns:[/\bpmr\b/i, /mobilit[ée]\s*r[ée]duite/i, /\bhandicap/i, /barre\s*appui/i, /si[èe]ge\s*douche\s*pmr/i],
      keys:[{k:'16.1',c:'haute'},{k:'16.2',c:'haute'},{k:'16.3',c:'moyenne'}]
    },
    { label:'Porte galandage',
      patterns:[/galandage/i, /porte\s*coulissante\s*encastr[ée]e?/i],
      keys:[{k:'17.1',c:'moyenne'}]
    },
    { label:'Placard sur mesure',
      patterns:[/placard\s*sur\s*mesure/i, /placard\s*wc/i],
      keys:[{k:'15.1',c:'moyenne'}]
    },
    { label:'Mise en teinte',
      patterns:[/mise\s*en\s*teinte/i, /peinture\s*couleur/i, /teinte\s*personnalis[ée]e?/i],
      keys:[{k:'14.1',c:'haute'}]
    },
    { label:'Ventilation / extracteur',
      patterns:[/\bvmc\b/i, /extracteur/i, /\bventilation\b/i, /bouche\s*a[ée]ration/i],
      keys:[{k:'4.6',c:'haute'},{k:'4.10',c:'haute'},{k:'5.8.11',c:'haute'}]
    }
  ];

  /* ─── RÈGLES DE COHÉRENCE MÉTIER (Commit G IA) ────────────────
     Détectent les incohérences ou oublis probables APRÈS construction
     de la fusion. Permettent d'avertir l'utilisateur en RDV ou avant
     l'émission ("Tu as la baignoire mais pas la plomberie. Oubli ?"). */
  var COHERENCE_RULES = [
    {
      id: 'douche-sans-plomberie',
      trigger: function(keys){ return (keys['2.9'] || keys['2.10'] || keys['5.2.1']) && !keys['3.1']; },
      severite: 'attention',
      message: 'Création douche / receveur présent mais aucune ligne plomberie douche (3.1). Oubli probable.'
    },
    {
      id: 'plomberie-douche-sans-paroi',
      trigger: function(keys){ return keys['3.1'] && !keys['3.2'] && !keys['5.2.8'] && !keys['5.2.9']; },
      severite: 'info',
      message: 'Plomberie douche posée sans aucune paroi (3.2 / 5.2.8 / 5.2.9). Confirmer la configuration douche ouverte.'
    },
    {
      id: 'baignoire-sans-plomberie',
      trigger: function(keys){ return (keys['2.11'] || keys['5.3.1']) && !keys['3.3']; },
      severite: 'attention',
      message: 'Baignoire / tablier baignoire présent mais aucune ligne plomberie baignoire (3.3). Oubli probable.'
    },
    {
      id: 'baignoire-et-douche',
      trigger: function(keys){ return keys['3.1'] && keys['3.3']; },
      severite: 'info',
      message: 'Baignoire ET douche cochées dans la même pièce — confirmer la configuration (assez d\'espace).'
    },
    {
      id: 'carrelage-mural-sans-ba13',
      trigger: function(keys){ return keys['2.19'] && !keys['2.8']; },
      severite: 'info',
      message: 'Pose carrelage mural sans reprise BA13 hydro (2.8). Mur déjà sain et plan ? Sinon ajouter 2.8.'
    },
    {
      id: 'seche-serviettes-eau-sans-tes',
      trigger: function(keys){ return keys['5.5.1'] && !keys['5.5.2']; },
      severite: 'attention',
      message: 'Sèche-serviettes eau chaude (5.5.1) sans tés de raccordement + robinet thermostatique (5.5.2). Manque la fourniture.'
    },
    {
      id: 'plafond-suspendu-sans-annulation',
      trigger: function(keys){ return (keys['8.1'] || keys['8.2']) && !keys['8.5']; },
      severite: 'info',
      message: 'Plafond suspendu créé. La pose plafonnier 4.9 doit-elle être annulée via ligne 8.5 (déduction −60 €) ?'
    },
    {
      id: 'option-depose-sol-sans-pose',
      trigger: function(keys){ return keys['7.1'] && !keys['2.16']; },
      severite: 'attention',
      message: 'Dépose carrelage sol cochée (option 7.1) mais aucune pose carrelage sol (2.16). Sol final = ?'
    },
    {
      id: 'meuble-vasque-sans-miroir',
      trigger: function(keys){ return (keys['2.24'] || keys['5.4.1']) && !keys['2.25'] && !keys['5.4.8']; },
      severite: 'info',
      message: 'Meuble vasque sans miroir (2.25 ou 5.4.8). Oubli ou choix client ?'
    },
    {
      id: 'wc-suspendu-sans-chassis',
      trigger: function(keys){ return keys['3.7'] && !keys['5.6.1']; },
      severite: 'info',
      message: 'Plomberie WC suspendu (3.7) cochée mais châssis Geberit (5.6.1) à 0. Confirmer la fourniture châssis.'
    },
    {
      id: 'ballon-sans-securite',
      trigger: function(keys){ return keys['3.13'] && !keys['5.7.2']; },
      severite: 'attention',
      message: 'Remplacement ballon (3.13) sans groupe de sécurité (5.7.2). Manque la fourniture obligatoire.'
    },
    {
      id: 'lave-linge-sans-prise',
      trigger: function(keys){ return keys['3.5'] && !keys['4.7']; },
      severite: 'info',
      message: 'Évacuation lave-linge (3.5) sans alimentation électrique appareil (4.7). Vérifier ligne existante.'
    }
  ];

  /* Drapeaux critiques (mots-clés → message à valider) */
  var FLAG_RULES = [
    { patterns:[/copro/i, /copropri[ée]t[ée]/i, /\bsyndic\b/i],
      type:'copro',
      message:'Travaux en copropriété — accord syndic / chauffagiste à anticiper (vannes immeuble, horaires, accès gardien).' },
    { patterns:[/\bamiante\b/i, /\bplomb\b/i],
      type:'diagnostic',
      message:'Mention amiante/plomb détectée — diagnostic obligatoire avant intervention.' },
    { patterns:[/sans\s*ascenseur/i, /pas\s*d[\'’]ascenseur/i],
      type:'logistique',
      message:'Logement sans ascenseur — surcoût acheminement matériaux à prévoir.' },
    { patterns:[/[àa]\s*confirmer/i, /[àa]\s*voir/i, /[àa]\s*valider/i, /[àa]\s*pr[ée]ciser/i, /[àa]\s*mesurer/i],
      type:'aconfirmer',
      message:'Élément marqué « à confirmer » dans les notes — voir détails dans le relevé.' },
    { patterns:[/humidit[ée]/i, /infiltration/i, /moisi/i, /champignon/i],
      type:'humidite',
      message:'Problème d\'humidité signalé — diagnostic + traitement à envisager AVANT pose carrelage.' },
    { patterns:[/fissure/i, /lézarde/i, /\blezard/i],
      type:'structurel',
      message:'Fissures signalées — diagnostic structurel à envisager.' }
  ];

  /* ─── HELPERS INTERNES ──────────────────────────────────────── */

  /* Récupère le template canonique (chargé par quote-template-sdb.js) */
  function getTpl(){
    var T = window.QUOTE_TEMPLATE_SDB;
    if(!T) throw new Error('quote-fusion: window.QUOTE_TEMPLATE_SDB non chargé. Ajouter <script src="/quote-template-sdb.js"> AVANT quote-fusion.js.');
    return T;
  }

  /* Tri naturel par templateKey ('1.1' < '2.16' < '5.6.3' < '17.1') */
  function naturalSortKey(a, b){
    var ka = a.templateKey.split('.').map(function(p){ return parseInt(p, 10) || 0; });
    var kb = b.templateKey.split('.').map(function(p){ return parseInt(p, 10) || 0; });
    for(var i = 0; i < Math.max(ka.length, kb.length); i++){
      var da = ka[i] || 0, db = kb[i] || 0;
      if(da !== db) return da - db;
    }
    return 0;
  }

  /* Cherche dans quelle section se trouve une key (et si elle est option) */
  function findSectionInfo(key){
    var T = getTpl();
    var found = null;
    T.sections.forEach(function(sec){
      if(found) return;
      var inDirect = (sec.items || []).some(function(it){ return it.key === key; });
      var inSub = (sec.subSections || []).some(function(sub){
        return (sub.items || []).some(function(it){ return it.key === key; });
      });
      if(inDirect || inSub){
        found = { sectionId: sec.id, sectionTitle: sec.title, sectionNum: sec.num, isOption: !!sec.isOption };
      }
    });
    return found || { sectionId: null, sectionTitle: '?', sectionNum: '?', isOption: false };
  }

  /* Convertit un trigger formData en semanticKey (via le template) */
  var _triggerCache = null;
  function buildTriggerCache(){
    var T = getTpl();
    var cache = {};
    T.forEachLine(function(line){
      if(line.trigger && line.semanticKey){
        cache[line.trigger] = { sk: line.semanticKey, key: line.key };
      }
    });
    _triggerCache = cache;
  }
  function triggerToSk(trigger){
    if(!_triggerCache) buildTriggerCache();
    return _triggerCache[trigger] || null;
  }

  /* Convertit un templateKey en semanticKey (via le template) */
  function keyToSk(key){
    var line = getTpl().getLine(key);
    return line ? line.semanticKey : null;
  }

  /* Détecte les warnings de cohérence à partir d'un set de templateKey actifs */
  function detectCoherenceWarnings(activeTemplateKeys){
    var keys = {};
    (activeTemplateKeys || []).forEach(function(k){ keys[k] = true; });
    var out = [];
    COHERENCE_RULES.forEach(function(rule){
      try {
        if(rule.trigger(keys)){
          out.push({ id: rule.id, severite: rule.severite, message: rule.message });
        }
      } catch(e){ /* ignore une règle cassée */ }
    });
    return out;
  }

  /* Détecte les drapeaux dans un texte */
  function detectFlags(text){
    var out = [];
    if(!text) return out;
    FLAG_RULES.forEach(function(rule){
      var matched = false;
      var matchStr = '';
      for(var i = 0; i < rule.patterns.length; i++){
        var m = text.match(rule.patterns[i]);
        if(m){ matched = true; matchStr = m[0]; break; }
      }
      if(matched){
        out.push({ type: rule.type, message: rule.message, match: matchStr });
      }
    });
    return out;
  }

  /* ─── MOTEUR PRINCIPAL ──────────────────────────────────────── */

  function analyze(input){
    var t0 = Date.now();
    var T = getTpl();
    input = input || {};

    /* Map<semanticKey, { line, sources:[], maxPriority, totalConfidence }> */
    var candidates = {};

    function addCandidate(sk, source, sourceDetail, confidence, weightBoost){
      if(!sk) return;
      var line = T.getLineBySemanticKey(sk);
      if(!line) return;  // semanticKey inconnue (fail-safe)
      if(!candidates[sk]){
        candidates[sk] = { line: line, sources: [], maxPriority: 0, totalConfidence: 0 };
      }
      var prio = (SOURCE_PRIORITY[source] || 0) + (weightBoost || 0);
      candidates[sk].sources.push({
        source: source,
        detail: sourceDetail,
        confidence: confidence,
        priority: prio
      });
      if(prio > candidates[sk].maxPriority) candidates[sk].maxPriority = prio;
      /* Confidence : on prend le max des sources + bonus de cumul */
      var newMax = Math.max(candidates[sk].totalConfidence, confidence);
      var bonus = Math.min(0.07, (candidates[sk].sources.length - 1) * 0.04);
      candidates[sk].totalConfidence = Math.min(0.98, newMax + bonus);
    }

    /* Helper : ajoute via templateKey (raccourci pour les tables WORKS/PAINT/KEYWORD) */
    function addByKey(key, conf, source, detail){
      var sk = keyToSk(key);
      if(sk) addCandidate(sk, source, detail, conf);
    }

    /* === Source 1 : Lignes obligatoires ============================ */
    T.getMandatoryLines().forEach(function(line){
      if(line.semanticKey){
        addCandidate(line.semanticKey, 'obligatoire', 'Ligne obligatoire du modèle', 1.0);
      }
    });

    /* === Source 2 : Travaux cochés (priorité max) ================== */
    var travauxCoches = input.travauxCoches || input.travaux || [];
    travauxCoches.forEach(function(cat){
      var rules = WORKS_TO_TEMPLATE[cat];
      if(!rules) return;
      rules.forEach(function(r){
        var conf = CONF_LEGACY_TO_NUM[r.c] || 0.5;
        addByKey(r.k, conf, 'travaux', 'Travail coché : ' + cat);
      });
    });

    /* Éléments peints (sous-cas de Travaux) */
    var paintElems = input.elementsPeints || input.peinture || [];
    paintElems.forEach(function(elem){
      var rules = PAINT_TO_TEMPLATE[elem];
      if(!rules) return;
      rules.forEach(function(r){
        var conf = CONF_LEGACY_TO_NUM[r.c] || 0.5;
        addByKey(r.k, conf, 'travaux', 'Élément peint : ' + elem);
      });
    });

    /* === Source 3 : Brouillon formData ============================= */
    var fd = input.brouillonFormData || input.formData || {};
    Object.keys(fd).forEach(function(path){
      var v = fd[path];
      if(v !== true && v !== 'true') return;
      var hit = triggerToSk(path);
      if(hit) addCandidate(hit.sk, 'brouillon', 'Brouillon : ' + path, 0.90);
    });

    /* === Source 4 : Notes texte (regex matching) =================== */
    var notes = (input.notesTexte || input.notes || '').toString();
    if(notes.length > 0){
      KEYWORD_RULES.forEach(function(rule){
        var matched = false;
        var matchStr = '';
        for(var i = 0; i < rule.patterns.length; i++){
          var m = notes.match(rule.patterns[i]);
          if(m){ matched = true; matchStr = m[0]; break; }
        }
        if(matched){
          rule.keys.forEach(function(k){
            var conf = CONF_LEGACY_TO_NUM[k.c] || 0.5;
            addByKey(k.k, conf, 'notes', 'Mot-clé « ' + matchStr + ' » → ' + rule.label);
          });
        }
      });
    }

    /* === Source 5 : Croquis (boost confidence pour zones connues) === */
    var croquis = input.croquis || [];
    croquis.forEach(function(c){
      if(!c || !c.zone) return;
      var zoneLines = T.getLinesByZone(c.zone);
      zoneLines.forEach(function(line){
        if(line.semanticKey && candidates[line.semanticKey]){
          /* Renforce une candidate existante mais ne crée pas de candidate seule */
          candidates[line.semanticKey].sources.push({
            source: 'croquis',
            detail: 'Croquis zone : ' + c.zone + (c.label ? ' (' + c.label + ')' : ''),
            confidence: 0.40,
            priority: SOURCE_PRIORITY.croquis
          });
          /* Boost mineur de la confidence */
          candidates[line.semanticKey].totalConfidence = Math.min(0.98, candidates[line.semanticKey].totalConfidence + 0.03);
        }
      });
    });

    /* === Source 6 : Photos (idem croquis, poids plus faible) ======= */
    var photos = input.photos || [];
    photos.forEach(function(p){
      if(!p || !p.zone) return;
      var zoneLines = T.getLinesByZone(p.zone);
      zoneLines.forEach(function(line){
        if(line.semanticKey && candidates[line.semanticKey]){
          candidates[line.semanticKey].sources.push({
            source: 'photos',
            detail: 'Photo zone : ' + p.zone + (p.label ? ' (' + p.label + ')' : ''),
            confidence: 0.30,
            priority: SOURCE_PRIORITY.photos
          });
          candidates[line.semanticKey].totalConfidence = Math.min(0.98, candidates[line.semanticKey].totalConfidence + 0.02);
        }
      });
    });

    /* ─── DÉTECTION CONFLITS PAR ALTGROUP ─────────────────────── */
    var altGroups = {};
    Object.keys(candidates).forEach(function(sk){
      var line = candidates[sk].line;
      if(line.altGroupId){
        if(!altGroups[line.altGroupId]) altGroups[line.altGroupId] = [];
        altGroups[line.altGroupId].push({ sk: sk, line: line, candidate: candidates[sk] });
      }
    });
    var conflits = [];
    Object.keys(altGroups).forEach(function(gid){
      if(altGroups[gid].length <= 1) return;
      /* Ordonne par priorité maxPriority puis confidence */
      altGroups[gid].sort(function(a, b){
        if(b.candidate.maxPriority !== a.candidate.maxPriority){
          return b.candidate.maxPriority - a.candidate.maxPriority;
        }
        return b.candidate.totalConfidence - a.candidate.totalConfidence;
      });
      var retenu = altGroups[gid][0];
      var rejetes = altGroups[gid].slice(1);
      conflits.push({
        altGroupId: gid,
        altGroupLabel: (T.alternativeGroups[gid] && T.alternativeGroups[gid].label) || gid,
        candidats: altGroups[gid].map(function(c){
          return { semanticKey: c.sk, templateKey: c.line.key, label: c.line.label, confidence: c.candidate.totalConfidence };
        }),
        retenu: { semanticKey: retenu.sk, templateKey: retenu.line.key }
      });
      /* Supprime les rejetés des candidates principaux (mais traçables dans `conflits`) */
      rejetes.forEach(function(r){ delete candidates[r.sk]; });
    });

    /* ─── DÉTECTION DOUBLONS (multi-sources sur même semanticKey) ─ */
    var doublons = [];
    Object.keys(candidates).forEach(function(sk){
      var c = candidates[sk];
      if(c.sources.length <= 1) return;
      var srcSet = {};
      c.sources.forEach(function(s){ srcSet[s.source] = true; });
      var srcList = Object.keys(srcSet);
      if(srcList.length > 1){
        var sorted = c.sources.slice().sort(function(a, b){ return b.priority - a.priority; });
        doublons.push({
          semanticKey: sk,
          templateKey: c.line.key,
          label: c.line.label,
          sources: srcList,
          retenu: sorted[0].source,
          retenuDetail: sorted[0].detail
        });
      }
    });

    /* ─── BUILD OUTPUT LINES + CATÉGORISATION ─────────────────── */
    function toOutput(sk, c){
      var sortedSources = c.sources.slice().sort(function(a, b){ return b.priority - a.priority; });
      var primary = sortedSources[0];
      var secInfo = findSectionInfo(c.line.key);
      return {
        templateKey   : c.line.key,
        semanticKey   : sk,
        label         : c.line.label,
        unit          : c.line.unit,
        defaultQty    : c.line.defaultQty,
        defaultPrice  : c.line.defaultPrice,
        zone          : c.line.zone || null,
        action        : c.line.action || null,
        tags          : c.line.tags || [],
        priceMode     : c.line.priceMode || 'standard',
        altGroupId    : c.line.altGroupId || null,
        sectionId     : secInfo.sectionId,
        sectionNum    : secInfo.sectionNum,
        sectionTitle  : secInfo.sectionTitle,
        isOption      : secInfo.isOption,
        isMandatory   : !!c.line.isMandatory,
        trigger       : c.line.trigger || null,
        confidence    : Math.round(c.totalConfidence * 100) / 100,
        source        : primary.source,
        sourceDetail  : primary.detail,
        sources       : sortedSources.map(function(s){ return { source:s.source, detail:s.detail, confidence:s.confidence }; })
      };
    }

    var lignesSures = [], lignesProbables = [], lignesAConfirmer = [];
    Object.keys(candidates).forEach(function(sk){
      var line = toOutput(sk, candidates[sk]);
      if(line.confidence >= CONF_HIGH)        lignesSures.push(line);
      else if(line.confidence >= CONF_MEDIUM) lignesProbables.push(line);
      else                                     lignesAConfirmer.push(line);
    });

    /* Tri naturel (1.1 < 2.16 < 5.6.3 < 17.1) */
    [lignesSures, lignesProbables, lignesAConfirmer].forEach(function(arr){ arr.sort(naturalSortKey); });

    /* Drapeaux critiques (depuis notes seulement pour V1) */
    var drapeaux = detectFlags(notes);

    /* Commit G IA : warnings de cohérence métier (douche sans plomberie, etc.) */
    var allActiveKeys = lignesSures.concat(lignesProbables).concat(lignesAConfirmer).map(function(l){ return l.templateKey; });
    var coherenceWarnings = detectCoherenceWarnings(allActiveKeys);

    /* Comptage des sources non-vides (pour meta) */
    var nbSources = 0;
    if(travauxCoches.length) nbSources++;
    if(paintElems.length)    nbSources++;
    if(Object.keys(fd).length) nbSources++;
    if(notes.length > 0)     nbSources++;
    if(croquis.length)       nbSources++;
    if(photos.length)        nbSources++;

    return {
      pieceType         : input.pieceType || 'salle-de-bain',
      lignesSures       : lignesSures,
      lignesProbables   : lignesProbables,
      lignesAConfirmer  : lignesAConfirmer,
      doublons          : doublons,
      conflits          : conflits,
      drapeaux          : drapeaux,
      coherenceWarnings : coherenceWarnings,
      meta              : {
        nbSources       : nbSources,
        nbLignesSures   : lignesSures.length,
        nbLignesProbables: lignesProbables.length,
        nbLignesAConfirmer: lignesAConfirmer.length,
        nbLignesTotal   : lignesSures.length + lignesProbables.length + lignesAConfirmer.length,
        nbDoublons      : doublons.length,
        nbConflits      : conflits.length,
        nbDrapeaux      : drapeaux.length,
        nbCoherenceWarnings: coherenceWarnings.length,
        durationMs      : Date.now() - t0,
        engine          : 'local-heuristics-v1',
        engineVersion   : '1.1.0'
      }
    };
  }

  /* Version asynchrone — interface unique pour brancher Claude API
     plus tard (Commit F). Pour l'instant : wrapper sync → Promise. */
  function analyzeAsync(input){
    return new Promise(function(resolve, reject){
      try { resolve(analyze(input)); }
      catch(e){ reject(e); }
    });
  }

  /* ─── PRÉ-REMPLISSAGE D'UN BROUILLON ─────────────────────────
     Convertit le résultat d'analyse en formData wizard SDB pour
     pré-remplir un draft. Active les triggers + applique les
     overrides éventuels (qty/price si suggérés). */
  function buildDraftFormData(analysisResult, options){
    options = options || {};
    var includeProbables = options.includeProbables !== false;  // défaut: oui
    var includeAConfirmer = options.includeAConfirmer === true; // défaut: non

    var fd = {};
    function applyLine(line){
      if(line.trigger){
        fd[line.trigger] = true;
      }
    }
    analysisResult.lignesSures.forEach(applyLine);
    if(includeProbables)   analysisResult.lignesProbables.forEach(applyLine);
    if(includeAConfirmer)  analysisResult.lignesAConfirmer.forEach(applyLine);

    return fd;
  }

  /* ─── EXPOSE ─────────────────────────────────────────────────── */
  window.QUOTE_FUSION = {
    /* Moteur */
    analyze         : analyze,
    analyzeAsync    : analyzeAsync,
    buildDraftFormData: buildDraftFormData,

    /* Tables (exposées pour debug + commit D enrichissement) */
    WORKS_TO_TEMPLATE : WORKS_TO_TEMPLATE,
    PAINT_TO_TEMPLATE : PAINT_TO_TEMPLATE,
    KEYWORD_RULES     : KEYWORD_RULES,
    FLAG_RULES        : FLAG_RULES,
    COHERENCE_RULES   : COHERENCE_RULES,
    SOURCE_PRIORITY   : SOURCE_PRIORITY,

    /* Helpers */
    findSectionInfo   : findSectionInfo,
    detectFlags       : detectFlags,
    detectCoherenceWarnings: detectCoherenceWarnings,

    /* Constantes */
    CONF_HIGH         : CONF_HIGH,
    CONF_MEDIUM       : CONF_MEDIUM,
    VERSION           : '1.1.0'
  };

  console.log('[QUOTE_FUSION] Moteur de fusion local chargé · ' +
              Object.keys(WORKS_TO_TEMPLATE).length + ' cats Travaux · ' +
              KEYWORD_RULES.length + ' règles mots-clés · ' +
              FLAG_RULES.length + ' drapeaux · ' +
              COHERENCE_RULES.length + ' règles cohérence · v' + window.QUOTE_FUSION.VERSION);
})();
