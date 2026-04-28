/* ════════════════════════════════════════════════════════════════════
   AJ PRO RÉNOVATION — CATALOGUE PRODUITS + ALTERNATIVES (Commit E IA)

   Catalogue interne V1 : produits par défaut (depuis le PDF $002612)
   + alternatives par marque/fournisseur. Permet de switcher facilement
   un produit Hansgrohe vers Grohe ou Jacob Delafon en 2 clics.

   Architecture extensible :
   - searchProduct(query) → interface unique pour brancher plus tard
     une vraie API fournisseur (Leroy Merlin, Cedeo, Point P).
   - buildSearchUrl(product) → URL Google pré-remplie pour ouvrir
     une recherche dans le navigateur (V1 : pas d'API requise).

   Conventions :
   - Chaque produit s'attache à un templateKey du modèle SDB ($002612).
   - isDefault: true → produit présent par défaut dans le devis modèle.
   - alternatives → autres options proposées dans la modal d'éditeur.
   ──────────────────────────────────────────────────────────────────── */

(function(){
  if(window.QUOTE_CATALOG){ return; }

  /* ─── META ──────────────────────────────────────────────────── */
  var META = {
    catalogId       : 'aj-pro-catalog-v1',
    catalogVersion  : '1.0.0',
    sourceDocument  : '$002612 sdbv2.pdf',
    fournisseurs    : ['Leroy Merlin', 'Cedeo', 'Point P', 'Castorama', 'Brico Dépôt'],
    fournisseursPrioritaires: ['Leroy Merlin', 'Cedeo', 'Point P']
  };

  /* ─── HELPERS DE CONSTRUCTION ─────────────────────────────── */
  var pidCounter = 0;
  function P(opts){
    pidCounter++;
    return {
      id           : 'prod-' + (opts.marque || 'x').toLowerCase().replace(/[^a-z0-9]/g,'') + '-' + pidCounter,
      templateKey  : opts.templateKey,
      marque       : opts.marque || null,
      modele       : opts.modele || '',
      ref          : opts.ref || null,
      prixHT       : opts.prixHT || 0,
      unit         : opts.unit || 'U',
      fournisseur  : opts.fournisseur || 'Leroy Merlin',
      url          : opts.url || null,
      searchQuery  : opts.searchQuery || ((opts.marque || '') + ' ' + (opts.modele || '')).trim(),
      isDefault    : !!opts.isDefault,
      tags         : opts.tags || []
    };
  }

  /* ─── PRODUITS ─────────────────────────────────────────────────
     Couverture : toutes les lignes 5.x du PDF $002612 ont un produit
     par défaut + 1 à 3 alternatives sur les positions critiques
     (mitigeurs, receveurs, parois, sèche-serviettes, WC, vasques). */

  var PRODUCTS = [

    /* ═══ 5.2 DOUCHE ═══ */
    /* 5.2.1 Receveur de douche extraplat 80x120cm */
    P({ templateKey:'5.2.1', marque:'AURLANE', modele:'Receveur extra-plat 80x120 résine blanc', prixHT:240, fournisseur:'Leroy Merlin', isDefault:true, tags:['receveur','extraplat','80x120'] }),
    P({ templateKey:'5.2.1', marque:'JACOB DELAFON', modele:'Receveur Surface 80x120 acrylique', prixHT:280, fournisseur:'Cedeo', tags:['receveur','extraplat'] }),
    P({ templateKey:'5.2.1', marque:'GEBERIT', modele:'Setaplano receveur 80x120 antidérapant', prixHT:340, fournisseur:'Cedeo', tags:['receveur','antiderapant'] }),

    /* 5.2.2 Vidage receveur TurboFlow */
    P({ templateKey:'5.2.2', marque:'WIRQUIN', modele:'Vidage TurboFlow capot chromé Ø90', prixHT:67, fournisseur:'Leroy Merlin', isDefault:true, tags:['vidage','turboflow'] }),
    P({ templateKey:'5.2.2', marque:'GEBERIT', modele:'Vidage Bonde douche extraplate', prixHT:79, fournisseur:'Cedeo', tags:['vidage'] }),

    /* 5.2.3 Pieds réglables receveur */
    P({ templateKey:'5.2.3', marque:'WIRQUIN', modele:'Lot de 2 pieds réglables receveur', prixHT:15, fournisseur:'Leroy Merlin', isDefault:true, tags:['pieds','receveur'] }),

    /* 5.2.6 Mitigeur de douche HANSGROHE */
    P({ templateKey:'5.2.6', marque:'HANSGROHE', modele:'Logis mitigeur de douche', ref:'71600000', prixHT:149, fournisseur:'Leroy Merlin', isDefault:true, tags:['mitigeur','douche','hansgrohe'] }),
    P({ templateKey:'5.2.6', marque:'GROHE', modele:'BauEdge mitigeur de douche', ref:'23335000', prixHT:115, fournisseur:'Leroy Merlin', tags:['mitigeur','douche','grohe'] }),
    P({ templateKey:'5.2.6', marque:'JACOB DELAFON', modele:'Aleo+ mitigeur douche chromé', prixHT:139, fournisseur:'Cedeo', tags:['mitigeur','douche'] }),
    P({ templateKey:'5.2.6', marque:'IDEAL STANDARD', modele:'Cerafine mitigeur douche', prixHT:99, fournisseur:'Cedeo', tags:['mitigeur','douche','entree-de-gamme'] }),

    /* 5.2.7 Kit barre de douche */
    P({ templateKey:'5.2.7', marque:'HANSGROHE', modele:'Crometta Vario kit barre + flexible', prixHT:69, fournisseur:'Leroy Merlin', isDefault:true, tags:['barre-douche','pommeau'] }),
    P({ templateKey:'5.2.7', marque:'GROHE', modele:'Tempesta 100 kit douche barre', prixHT:55, fournisseur:'Leroy Merlin', tags:['barre-douche'] }),

    /* 5.2.8 Paroi de douche fixe L80 */
    P({ templateKey:'5.2.8', marque:'AURLANE', modele:'Paroi fixe verre 8mm chromé L80 H200', prixHT:190, fournisseur:'Leroy Merlin', isDefault:true, tags:['paroi','fixe','L80'] }),
    P({ templateKey:'5.2.8', marque:'KINEDO', modele:'Smart Design paroi fixe L80', prixHT:235, fournisseur:'Cedeo', tags:['paroi','fixe','premium'] }),
    P({ templateKey:'5.2.8', marque:'JACOB DELAFON', modele:'Contra paroi fixe verre L80', prixHT:280, fournisseur:'Cedeo', tags:['paroi','fixe'] }),

    /* 5.2.9 Paroi pivotante L40 */
    P({ templateKey:'5.2.9', marque:'AURLANE', modele:'Déflecteur paroi pivotante L40 verre 6mm', prixHT:130, fournisseur:'Leroy Merlin', isDefault:true, tags:['paroi','pivotante','deflecteur'] }),

    /* ═══ 5.3 BAIGNOIRE ═══ */
    /* 5.3.1 Baignoire acrylique 170x70 */
    P({ templateKey:'5.3.1', marque:'JACOB DELAFON', modele:'Baignoire Sofa 170x70 acrylique blanc', prixHT:190, fournisseur:'Leroy Merlin', isDefault:true, tags:['baignoire','170x70'] }),
    P({ templateKey:'5.3.1', marque:'ROCA', modele:'Baignoire Continental 170x70', prixHT:215, fournisseur:'Cedeo', tags:['baignoire','170x70'] }),
    P({ templateKey:'5.3.1', marque:'IDEAL STANDARD', modele:'Connect baignoire 170x70', prixHT:240, fournisseur:'Cedeo', tags:['baignoire','170x70','premium'] }),

    /* 5.3.2 Vidage baignoire HANSGROHE */
    P({ templateKey:'5.3.2', marque:'HANSGROHE', modele:'Vidage automatique baignoire Exafill', prixHT:75.30, fournisseur:'Leroy Merlin', isDefault:true, tags:['vidage','baignoire'] }),
    P({ templateKey:'5.3.2', marque:'WIRQUIN', modele:'Vidage automatique baignoire chromé', prixHT:55, fournisseur:'Leroy Merlin', tags:['vidage'] }),

    /* 5.3.5 Mitigeur bain/douche HANSGROHE */
    P({ templateKey:'5.3.5', marque:'HANSGROHE', modele:'Logis mitigeur bain/douche', ref:'71400000', prixHT:179, fournisseur:'Leroy Merlin', isDefault:true, tags:['mitigeur','bain','hansgrohe'] }),
    P({ templateKey:'5.3.5', marque:'GROHE', modele:'BauEdge mitigeur bain/douche', prixHT:135, fournisseur:'Leroy Merlin', tags:['mitigeur','bain','grohe'] }),
    P({ templateKey:'5.3.5', marque:'JACOB DELAFON', modele:'Aleo+ mitigeur bain/douche', prixHT:165, fournisseur:'Cedeo', tags:['mitigeur','bain'] }),

    /* 5.3.7 Écran de baignoire 70x140 */
    P({ templateKey:'5.3.7', marque:'AURLANE', modele:'Écran baignoire pivotant 70x140 verre 6mm', prixHT:99, fournisseur:'Leroy Merlin', isDefault:true, tags:['ecran','baignoire'] }),
    P({ templateKey:'5.3.7', marque:'KINEDO', modele:'Écran baignoire 70x140 transparent', prixHT:149, fournisseur:'Cedeo', tags:['ecran','baignoire','premium'] }),

    /* ═══ 5.4 MOBILIER ═══ */
    /* 5.4.1 Meuble sous-vasque L80 */
    P({ templateKey:'5.4.1', marque:'COOKE & LEWIS', modele:'Meuble sous-vasque Imandra L80 blanc', prixHT:350, fournisseur:'Castorama', isDefault:true, tags:['meuble','sous-vasque','L80'] }),
    P({ templateKey:'5.4.1', marque:'PORCHER', modele:'Meuble sous-vasque Studio L80 chêne', prixHT:420, fournisseur:'Cedeo', tags:['meuble','premium'] }),
    P({ templateKey:'5.4.1', marque:'LEROY MERLIN', modele:'Meuble Vasque Easy L80 blanc laqué', prixHT:299, fournisseur:'Leroy Merlin', tags:['meuble','entree-de-gamme'] }),

    /* 5.4.2 Vasque compatible meuble */
    P({ templateKey:'5.4.2', marque:'COOKE & LEWIS', modele:'Vasque céramique L80 blanc', prixHT:120, fournisseur:'Castorama', isDefault:true, tags:['vasque','ceramique'] }),
    P({ templateKey:'5.4.2', marque:'JACOB DELAFON', modele:'Vasque Réuni 80 céramique', prixHT:189, fournisseur:'Cedeo', tags:['vasque','premium'] }),

    /* 5.4.4 Colonne de rangement L30 H180 */
    P({ templateKey:'5.4.4', marque:'COOKE & LEWIS', modele:'Colonne Imandra L30 H180 blanche', prixHT:160, fournisseur:'Castorama', isDefault:true, tags:['colonne','rangement'] }),
    P({ templateKey:'5.4.4', marque:'LEROY MERLIN', modele:'Colonne Easy L30 H180 chêne', prixHT:179, fournisseur:'Leroy Merlin', tags:['colonne','rangement'] }),

    /* 5.4.5 Mitigeur lavabo HANSGROHE */
    P({ templateKey:'5.4.5', marque:'HANSGROHE', modele:'Logis mitigeur lavabo', ref:'71100000', prixHT:89, fournisseur:'Leroy Merlin', isDefault:true, tags:['mitigeur','lavabo','hansgrohe'] }),
    P({ templateKey:'5.4.5', marque:'GROHE', modele:'BauEdge mitigeur lavabo', prixHT:65, fournisseur:'Leroy Merlin', tags:['mitigeur','lavabo','grohe'] }),
    P({ templateKey:'5.4.5', marque:'JACOB DELAFON', modele:'Aleo+ mitigeur lavabo', prixHT:79, fournisseur:'Cedeo', tags:['mitigeur','lavabo'] }),
    P({ templateKey:'5.4.5', marque:'IDEAL STANDARD', modele:'Cerafine mitigeur lavabo', prixHT:55, fournisseur:'Cedeo', tags:['mitigeur','lavabo','entree-de-gamme'] }),

    /* 5.4.8 Miroir sans éclairage */
    P({ templateKey:'5.4.8', marque:'CASTORAMA', modele:'Miroir Bali rectangulaire 60x80', prixHT:80, fournisseur:'Castorama', isDefault:true, tags:['miroir'] }),

    /* 5.4.9 Éclairage miroir LED */
    P({ templateKey:'5.4.9', marque:'PHILIPS', modele:'Réglette LED Adore 30cm chromé', prixHT:55, fournisseur:'Leroy Merlin', isDefault:true, tags:['eclairage','miroir','led'] }),
    P({ templateKey:'5.4.9', marque:'PAULMANN', modele:'Applique LED Galeria 30cm', prixHT:75, fournisseur:'Leroy Merlin', tags:['eclairage','miroir','led','premium'] }),

    /* ═══ 5.5 RADIATEUR ═══ */
    /* 5.5.1 Sèche-serviettes eau chaude */
    P({ templateKey:'5.5.1', marque:'ACOVA', modele:'Cala sèche-serviettes eau chaude H140 L50 blanc', prixHT:280, fournisseur:'Leroy Merlin', isDefault:true, tags:['seche-serviettes','eau-chaude','acova'] }),
    P({ templateKey:'5.5.1', marque:'ATLANTIC', modele:'2012 sèche-serviettes eau chaude H140 L50', prixHT:320, fournisseur:'Cedeo', tags:['seche-serviettes','eau-chaude'] }),

    /* 5.5.3 Sèche-serviettes électrique */
    P({ templateKey:'5.5.3', marque:'ACOVA', modele:'Cala électrique 500W H100 L50 blanc', prixHT:180, fournisseur:'Leroy Merlin', isDefault:true, tags:['seche-serviettes','electrique','acova'] }),
    P({ templateKey:'5.5.3', marque:'ATLANTIC', modele:'2012 électrique 500W H100 L50', prixHT:215, fournisseur:'Cedeo', tags:['seche-serviettes','electrique'] }),
    P({ templateKey:'5.5.3', marque:'CAYENNE', modele:'Étroit chauffage soufflant 500W', prixHT:139, fournisseur:'Leroy Merlin', tags:['seche-serviettes','electrique','entree-de-gamme'] }),

    /* ═══ 5.6 TOILETTES ═══ */
    /* 5.6.1 Châssis Geberit UP320 (alternatif) */
    P({ templateKey:'5.6.1', marque:'GEBERIT', modele:'Bâti-support Duofix Sigma UP320', ref:'111.300.00.5', prixHT:290, fournisseur:'Cedeo', isDefault:true, tags:['chassis','wc','geberit','sigma'] }),
    P({ templateKey:'5.6.1', marque:'ROCA', modele:'Bâti-support Active réservoir 9L', prixHT:240, fournisseur:'Cedeo', tags:['chassis','wc'] }),
    P({ templateKey:'5.6.1', marque:'GROHE', modele:'Rapid SL bâti-support WC suspendu', prixHT:250, fournisseur:'Leroy Merlin', tags:['chassis','wc'] }),

    /* 5.6.3 Plaque déclenchement Sigma 20 */
    P({ templateKey:'5.6.3', marque:'GEBERIT', modele:'Plaque Sigma 20 blanc/chromé brillant', ref:'115.882.KJ.1', prixHT:115, fournisseur:'Cedeo', isDefault:true, tags:['plaque','sigma','wc','geberit'] }),
    P({ templateKey:'5.6.3', marque:'GEBERIT', modele:'Plaque Sigma 30 blanc/chromé', prixHT:189, fournisseur:'Cedeo', tags:['plaque','sigma','premium'] }),
    P({ templateKey:'5.6.3', marque:'GEBERIT', modele:'Plaque Sigma 50 verre noir', prixHT:295, fournisseur:'Cedeo', tags:['plaque','sigma','premium','design'] }),

    /* 5.6.4 Cuvette suspendue */
    P({ templateKey:'5.6.4', marque:'GEBERIT', modele:'iCon cuvette suspendue carénée + abattant frein', prixHT:180, fournisseur:'Cedeo', isDefault:true, tags:['cuvette','suspendue','geberit'] }),
    P({ templateKey:'5.6.4', marque:'ROCA', modele:'The Gap cuvette suspendue Rimless + abattant', prixHT:215, fournisseur:'Cedeo', tags:['cuvette','suspendue','rimless'] }),
    P({ templateKey:'5.6.4', marque:'JACOB DELAFON', modele:'Vox cuvette suspendue', prixHT:240, fournisseur:'Cedeo', tags:['cuvette','suspendue','premium'] }),

    /* 5.6.5 Pack WC à poser */
    P({ templateKey:'5.6.5', marque:'GROHE', modele:'Bau Edge pack WC à poser sortie horizontale', prixHT:180, fournisseur:'Leroy Merlin', isDefault:true, tags:['pack-wc','a-poser'] }),
    P({ templateKey:'5.6.5', marque:'ROCA', modele:'The Gap pack WC à poser', prixHT:165, fournisseur:'Leroy Merlin', tags:['pack-wc','a-poser'] }),

    /* ═══ 5.7 BALLON ÉLECTRIQUE ═══ */
    /* 5.7.1 Ballon électrique (prix tbd) */
    P({ templateKey:'5.7.1', marque:'ATLANTIC', modele:'Chauffeo 100L vertical mural', prixHT:250, fournisseur:'Leroy Merlin', isDefault:true, tags:['ballon','100L'] }),
    P({ templateKey:'5.7.1', marque:'ATLANTIC', modele:'Chauffeo 150L vertical mural', prixHT:320, fournisseur:'Leroy Merlin', tags:['ballon','150L'] }),
    P({ templateKey:'5.7.1', marque:'THERMOR', modele:'Slim Concept 200L mural', prixHT:485, fournisseur:'Cedeo', tags:['ballon','200L','plat'] }),
    P({ templateKey:'5.7.1', marque:'ARISTON', modele:'Velis Tech Dry 80L', prixHT:380, fournisseur:'Cedeo', tags:['ballon','80L','plat'] }),

    /* 5.7.2 Groupe de sécurité */
    P({ templateKey:'5.7.2', marque:'WATTS', modele:'Groupe de sécurité M3/4 laiton', prixHT:35, fournisseur:'Leroy Merlin', isDefault:true, tags:['groupe-securite'] }),

    /* 5.7.4 Raccords di-électriques */
    P({ templateKey:'5.7.4', marque:'WATTS', modele:'Raccord di-électrique M/F 20x27', prixHT:12.30, fournisseur:'Leroy Merlin', isDefault:true, tags:['raccord','dielectrique'] }),

    /* ═══ 5.8 ACCESSOIRES DIVERS ═══ */
    /* 5.8.1 Barre de seuil */
    P({ templateKey:'5.8.1', marque:'DINAC', modele:'Barre de seuil alu mat 83cm', prixHT:20, fournisseur:'Leroy Merlin', isDefault:true, tags:['barre-seuil','alu'] }),

    /* 5.8.2 Baguette de finition d'angle */
    P({ templateKey:'5.8.2', marque:'SCHLUTER', modele:'Jolly profilé d\'angle alu mat', prixHT:26, fournisseur:'Cedeo', isDefault:true, tags:['baguette','angle'] }),

    /* 5.8.3 Prise simple Legrand Céliane */
    P({ templateKey:'5.8.3', marque:'LEGRAND', modele:'Céliane prise simple blanc', ref:'68111+68301', prixHT:14.63, fournisseur:'Leroy Merlin', isDefault:true, tags:['prise','simple','legrand','celiane'] }),
    P({ templateKey:'5.8.3', marque:'SCHNEIDER', modele:'Odace prise simple blanc', prixHT:11.50, fournisseur:'Leroy Merlin', tags:['prise','simple'] }),

    /* 5.8.4 Prise double Legrand Céliane */
    P({ templateKey:'5.8.4', marque:'LEGRAND', modele:'Céliane prise double blanc', prixHT:34.20, fournisseur:'Leroy Merlin', isDefault:true, tags:['prise','double','legrand','celiane'] }),
    P({ templateKey:'5.8.4', marque:'SCHNEIDER', modele:'Odace prise double blanc', prixHT:26, fournisseur:'Leroy Merlin', tags:['prise','double'] }),

    /* 5.8.5 Interrupteur simple Legrand */
    P({ templateKey:'5.8.5', marque:'LEGRAND', modele:'Céliane interrupteur simple blanc', prixHT:17.44, fournisseur:'Leroy Merlin', isDefault:true, tags:['interrupteur','simple','legrand'] }),
    P({ templateKey:'5.8.5', marque:'SCHNEIDER', modele:'Odace interrupteur simple blanc', prixHT:13, fournisseur:'Leroy Merlin', tags:['interrupteur','simple'] }),

    /* 5.8.6 Interrupteur double Legrand */
    P({ templateKey:'5.8.6', marque:'LEGRAND', modele:'Céliane interrupteur double blanc', prixHT:32.51, fournisseur:'Leroy Merlin', isDefault:true, tags:['interrupteur','double','legrand'] }),

    /* 5.8.9 Bouche aération VMC */
    P({ templateKey:'5.8.9', marque:'NATHER', modele:'Bouche VMC autoréglable Ø100', prixHT:29, fournisseur:'Leroy Merlin', isDefault:true, tags:['bouche','vmc'] }),

    /* 5.8.11 Extracteur d'air hygrométrique */
    P({ templateKey:'5.8.11', marque:'AIRTÈS', modele:'Extracteur hygro permanent Ø100 Silentec', prixHT:159, fournisseur:'Leroy Merlin', isDefault:true, tags:['extracteur','hygro','silencieux'] }),
    P({ templateKey:'5.8.11', marque:'ALDES', modele:'EasyHome PureAir hygroréglable Ø100', prixHT:189, fournisseur:'Cedeo', tags:['extracteur','hygro','premium'] }),
    P({ templateKey:'5.8.11', marque:'NATHER', modele:'Aspio extracteur classique Ø100', prixHT:79, fournisseur:'Leroy Merlin', tags:['extracteur','entree-de-gamme'] })

  ];

  /* ─── INDEX (templateKey → produits) ────────────────────────── */
  var BY_KEY = {};
  PRODUCTS.forEach(function(p){
    if(!BY_KEY[p.templateKey]) BY_KEY[p.templateKey] = [];
    BY_KEY[p.templateKey].push(p);
  });

  /* ─── HELPERS ─────────────────────────────────────────────── */

  /* Tous les produits associés à une ligne du template (default + alternatives) */
  function getProductsForKey(templateKey){
    return (BY_KEY[templateKey] || []).slice();
  }

  /* Le produit par défaut associé à une ligne (s'il existe) */
  function getDefaultProduct(templateKey){
    var prods = BY_KEY[templateKey] || [];
    for(var i = 0; i < prods.length; i++){
      if(prods[i].isDefault) return prods[i];
    }
    return prods[0] || null;
  }

  /* Liste des alternatives (sans le défaut) */
  function getAlternatives(templateKey){
    return (BY_KEY[templateKey] || []).filter(function(p){ return !p.isDefault; });
  }

  /* Recherche full-text dans le catalogue (interface unique pour
     brancher plus tard une vraie API fournisseur — Commit F) */
  function searchProduct(query, opts){
    opts = opts || {};
    var max = opts.max || 20;
    if(!query || !query.trim()) return [];
    var q = query.toLowerCase().trim();
    var tokens = q.split(/\s+/).filter(function(t){ return t.length >= 2; });
    if(!tokens.length) return [];
    var results = PRODUCTS.filter(function(p){
      var hay = ((p.marque||'') + ' ' + (p.modele||'') + ' ' + (p.ref||'') + ' ' + (p.tags||[]).join(' ') + ' ' + (p.fournisseur||'')).toLowerCase();
      return tokens.every(function(t){ return hay.indexOf(t) >= 0; });
    });
    return results.slice(0, max);
  }

  /* URL Google pour rechercher un produit (V1 : pas d'API requise) */
  function buildSearchUrl(product){
    if(!product) return null;
    var query = product.searchQuery || ((product.marque || '') + ' ' + (product.modele || '')).trim();
    if(product.fournisseur) query += ' ' + product.fournisseur;
    return 'https://www.google.com/search?q=' + encodeURIComponent(query);
  }

  /* URL fournisseur si connue, sinon URL recherche du fournisseur */
  function buildSupplierUrl(product){
    if(!product) return null;
    if(product.url) return product.url;
    /* Construit une URL de recherche directement chez le fournisseur si dispo */
    var query = ((product.marque || '') + ' ' + (product.modele || '')).trim();
    if(!query) return null;
    var encoded = encodeURIComponent(query);
    if(product.fournisseur === 'Leroy Merlin') return 'https://www.leroymerlin.fr/v3/search/search.do?keyword=' + encoded;
    if(product.fournisseur === 'Castorama')    return 'https://www.castorama.fr/search?term=' + encoded;
    if(product.fournisseur === 'Cedeo')        return 'https://www.cedeo.fr/recherche?searchTerm=' + encoded;
    if(product.fournisseur === 'Point P')      return 'https://www.pointp.fr/search?q=' + encoded;
    if(product.fournisseur === 'Brico Dépôt')  return 'https://www.bricodepot.fr/recherche?keyword=' + encoded;
    return buildSearchUrl(product);
  }

  /* Produit minimal pour une ligne template qui n'a pas de catalogue.
     Utile pour afficher un placeholder dans la modal. */
  function placeholderForKey(templateKey, line){
    return {
      id: 'placeholder-' + templateKey,
      templateKey: templateKey,
      marque: '—',
      modele: line ? line.label : 'Produit non catalogué',
      ref: null,
      prixHT: line ? line.defaultPrice : 0,
      unit: line ? line.unit : 'U',
      fournisseur: null,
      url: null,
      searchQuery: line ? line.label : '',
      isDefault: false,
      tags: ['placeholder']
    };
  }

  /* Statistiques sur le catalogue (pour debug + footer log) */
  function getStats(){
    var nbDefaults = PRODUCTS.filter(function(p){ return p.isDefault; }).length;
    var keysWithProducts = Object.keys(BY_KEY).length;
    var keysWithAlternatives = Object.keys(BY_KEY).filter(function(k){
      return BY_KEY[k].length >= 2;
    }).length;
    var fournisseurs = {};
    PRODUCTS.forEach(function(p){ if(p.fournisseur) fournisseurs[p.fournisseur] = (fournisseurs[p.fournisseur]||0) + 1; });
    return {
      nbProducts: PRODUCTS.length,
      nbDefaults: nbDefaults,
      keysWithProducts: keysWithProducts,
      keysWithAlternatives: keysWithAlternatives,
      fournisseurs: fournisseurs
    };
  }

  /* ─── EXPOSE ─────────────────────────────────────────────────── */
  window.QUOTE_CATALOG = {
    /* Données */
    meta              : META,
    PRODUCTS          : PRODUCTS,

    /* Lookup */
    getProductsForKey : getProductsForKey,
    getDefaultProduct : getDefaultProduct,
    getAlternatives   : getAlternatives,
    placeholderForKey : placeholderForKey,

    /* Recherche / URLs */
    searchProduct     : searchProduct,
    buildSearchUrl    : buildSearchUrl,
    buildSupplierUrl  : buildSupplierUrl,

    /* Stats / debug */
    getStats          : getStats,
    VERSION           : META.catalogVersion
  };

  var stats = getStats();
  console.log('[QUOTE_CATALOG] Catalogue produits chargé · ' +
              stats.nbProducts + ' produits · ' +
              stats.keysWithProducts + ' keys · ' +
              stats.keysWithAlternatives + ' avec alternatives · ' +
              Object.keys(stats.fournisseurs).length + ' fournisseurs · v' + META.catalogVersion);
})();
