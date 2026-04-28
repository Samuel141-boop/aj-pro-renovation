/* ════════════════════════════════════════════════════════════════════
   AJ PRO RÉNOVATION — TEMPLATE SDB CANONIQUE (source de vérité unique)
   Modélisé d'après le PDF $002612 sdbv2 (rev. 2026-04-20).
   Consommé par : bathroom-quote.js, chantier-analysis.js, et les futurs
   modules quote-fusion / quote-editor / catalog-products.

   ─── SCHÉMA D'UNE LIGNE ─────────────────────────────────────────────
   Champs LEGACY (consommés par bathroom-quote.js generateLines) :
     key            : '2.16'           — identifiant stable
     label          : str
     description?   : str              — détail multi-ligne
     notes?         : [str]            — puces (commentaires multi-ligne)
     unit           : 'U'|'m²'|'ml'
     defaultQty     : number           — qty par défaut (peut être 0 ou négatif)
     defaultPrice   : number           — PUHT par défaut
     trigger?       : str              — chemin formData wizard pour activation
     qtyFormula?    : str              — formule auto-calcul depuis mesures
     isMandatory?   : true             — toujours présent
     displayOnly?   : true             — exclu du calcul total
     showWhenZero?  : true             — affiché même si total = 0
     isNegative?    : true             — ligne négative (déduction)

   Champs ENRICHIS (pour fusion, catalogue, éditeur, IA) :
     zone           : 'douche'|'baignoire'|'vasque'|'wc'|'general'|
                      'tuyaux'|'plafond'|'porte'|'sol'|'electrique'|
                      'ventilation'|'chauffage'|'ballon'
     action         : 'depose'|'pose'|'creation'|'reprise'|'masquage'|
                      'protection'|'fourniture'|'commentaire'|'remplacement'|
                      'evacuation'|'habillage'|'mise-en-securite'|'peinture'|
                      'deduction'
     semanticKey    : str              — clé unique pour anti-doublon (fusion)
     tags           : [str]            — facets de recherche/filtrage
     priceMode      : 'standard'|'included'|'tbd'|'client'|'free'|'deduction'
     altGroupId?    : str              — groupe d'alternatives mutuellement exclusives
     altDefault?    : true|false       — alternative cochée par défaut du groupe
     deductionFor?  : str (key)        — référence à la ligne dont on déduit
     fusionTriggers?: { categories?, options?, keywords? }
                                       — règles de mapping pour le moteur de fusion
                                         (commit C — enrichi au fur et à mesure)
   ──────────────────────────────────────────────────────────────────── */
(function(){
  if(window.QUOTE_TEMPLATE_SDB){ return; }

  /* ─── META : entreprise + paramètres devis (PDF $002612) ─────────── */
  var META = {
    templateId       : 'sdb-renovation-complete-v1',
    templateName     : 'Rénovation salle de bain — modèle complet',
    templateVersion  : '1.0.0',
    sourceDocument   : '$002612 sdbv2.pdf',
    pieceType        : 'salle-de-bain',
    createdAt        : '2026-04-20',

    /* Devis */
    vatRate          : 10,                      // art. 278-0 bis A CGI
    vatArticle       : '278-0 bis A du CGI',
    depositPct       : 30,
    validityMonths   : 3,
    paymentMode      : 'Virement',
    paymentDelay     : 'Règlement comptant',
    numberingType    : 'devis',                 // → DEV-2026-XXX

    /* Émetteur (pré-rempli, modifiable depuis "Documents émis → Infos émetteur") */
    company: {
      raisonSociale     : 'Sarl AJ Pro Rénovation',
      capital           : '7 500,00 €',
      adresse           : '95/97 rue Gallieni, 92500 Rueil-Malmaison France',
      tel               : '01 78 53 30 08',
      email             : 'contact@ajprorenovation.com',
      siret             : '487 953 465 00035',
      ape               : '4120A',
      tvaIntracom       : 'FR39487953465',
      iban              : 'FR76 3000 4014 0300 0101 6001 532',
      bic               : 'BNPAFRPPXXX',
      rcs               : 'RCS NANTERRE 487 953 465',
      activites         : 'Peinture - Plomberie - Electricité - Carrelage - Parquet - PVC - Rénovation parquets anciens - Pose parquets neufs - Rénovation complète de Salles de bain - Travaux préalables à l\'installation de cuisines équipées',
      assurance         : 'AXA France – ref contrat n°0000021932511804 depuis le 01/01/2025',
      assuranceActivites: 'Plomberie, peinture, électricité, parquet, menuiserie, cloisons, carrelage',
      mediateur         : 'CM2C - 14, rue Saint-Jean - 75017 PARIS — www.cm2c.net',
      logoUrl           : null
    }
  };

  /* ─── GROUPES D'ALTERNATIVES MUTUELLEMENT EXCLUSIVES ──────────────
     Identifiants utilisés dans le champ altGroupId des lignes.
     Permet à l'éditeur d'afficher un sélecteur "soit/soit" et au moteur
     de fusion de ne jamais proposer 2 alternatives du même groupe. */
  var ALTERNATIVE_GROUPS = {
    'wc.installation' : { label:'Installation WC',           keys:['3.7', '3.8'],            zone:'wc' },
    'wc.plaque'       : { label:'Plaque de déclenchement',   keys:['5.6.2', '5.6.3'],         zone:'wc' },
    'wc.cuvette'      : { label:'Type de cuvette WC',        keys:['5.6.4', '5.6.5'],         zone:'wc' },
    'vasque.nombre'   : { label:'Vasque simple ou double',   keys:['3.9', '3.10'],            zone:'vasque' },
    'radiateur.chauffage' : { label:'Type de chaudière',     keys:['3.11', '3.12'],           zone:'chauffage' },
    'radiateur.energie': { label:'Énergie sèche-serviettes', keys:['5.5.1', '5.5.3'],         zone:'chauffage' },
    'paroi.douche'    : { label:'Type de paroi de douche',   keys:['5.2.8', '5.2.9'],         zone:'douche' },
    'porte.galandage.cadre' : { label:'Galandage avec/sans conservation cadre', keys:['17.1', '17.5'], zone:'porte' }
  };

  /* ─── SECTIONS ──────────────────────────────────────────────────── */
  /* Convention semanticKey : sdb.<sujet>.<action> ou sdb.<zone>.<element>.<action>
     Reste stable entre versions du template — ne jamais renommer une fois publiée. */

  var SECTIONS = [

    /* ╔═══ 1. COMMENTAIRES (avertissements client, hors total) ═══╗ */
    {
      id: 'sec-1-commentaires',
      num: 1,
      title: 'Commentaires',
      kind: 'comments',
      isOption: false,
      includeInGrandTotal: false,
      items: [
        {
          key:'1.1', label:'Avertissements travaux',
          description:'Vérifier le bon fonctionnement des vannes d\'arrêt du logement AVANT notre intervention. Malgré tout le soin que nous apportons à notre travail, la dépose de carrelage peut entrainer des dégâts sur les enduits et peinture des pièces attenantes ; si c\'est le cas, des travaux de réparations et de peinture devront être évalués.',
          notes:[
            'Vérifier le bon fonctionnement des vannes d\'arrêt du logement AVANT notre intervention',
            'Malgré tout le soin que nous apportons à notre travail, la dépose de carrelage peut entrainer des dégâts sur les enduits et peinture des pièces attenantes ; si c\'est le cas, des travaux de réparations et de peinture devront être évalués'
          ],
          unit:'U', defaultQty:1, defaultPrice:0,
          isMandatory:true, displayOnly:true,
          zone:'general', action:'commentaire', priceMode:'free',
          semanticKey:'sdb.comment.garde-fou', tags:['preventif','garde-fou']
        }
      ]
    },

    /* ╔═══ 2. DÉMOLITION / MAÇONNERIE / PLÂTRERIE / PEINTURE / MENUISERIES ═══╗ */
    {
      id: 'sec-2-demolition',
      num: 2,
      title: 'Salle de bain - Démolition, maçonnerie, plâtrerie, peinture et menuiseries',
      kind: 'works',
      isOption: false,
      includeInGrandTotal: true,
      items: [
        { key:'2.1', label:'Protection des sols et des accès, nettoyage usuel de fin de chantier',
          unit:'U', defaultQty:1, defaultPrice:100, isMandatory:true,
          zone:'general', action:'protection', priceMode:'standard',
          semanticKey:'sdb.protection.sols', tags:['protection','prepa'] },

        { key:'2.2', label:'Dépose des appareils sanitaires et du mobilier sans conservation',
          unit:'U', defaultQty:1, defaultPrice:300, trigger:'demolition.deposeSanitaires',
          zone:'general', action:'depose', priceMode:'standard',
          semanticKey:'sdb.depose.sanitaires', tags:['demolition','sanitaires'] },

        { key:'2.3', label:'Dépose des toilettes suspendues',
          unit:'U', defaultQty:1, defaultPrice:0, trigger:'demolition.deposeWcSuspendu', showWhenZero:true,
          zone:'wc', action:'depose', priceMode:'standard',
          semanticKey:'sdb.depose.wc-suspendu', tags:['demolition','wc'] },

        { key:'2.4', label:'Dépose carrelage mural et des plinthes',
          unit:'U', defaultQty:1, defaultPrice:0, trigger:'demolition.deposeCarrelageMural', showWhenZero:true,
          zone:'general', action:'depose', priceMode:'standard',
          semanticKey:'sdb.depose.carrelage-mural', tags:['demolition','carrelage','mural'] },

        { key:'2.5', label:'Dépose des coffrages tuyaux',
          unit:'U', defaultQty:1, defaultPrice:80, trigger:'demolition.deposeCoffrages',
          zone:'tuyaux', action:'depose', priceMode:'standard',
          semanticKey:'sdb.depose.coffrages', tags:['demolition','coffrage','tuyaux'] },

        { key:'2.6', label:'Evacuation des gravats et mise en déchetterie',
          unit:'U', defaultQty:1, defaultPrice:160, isMandatory:true,
          zone:'general', action:'evacuation', priceMode:'standard',
          semanticKey:'sdb.evacuation.gravats', tags:['logistique','dechetterie'] },

        { key:'2.7', label:'Reprise des alignements des murs suite à démolition',
          unit:'U', defaultQty:1, defaultPrice:220, trigger:'demolition.repriseAlignements',
          zone:'general', action:'reprise', priceMode:'standard',
          semanticKey:'sdb.maconnerie.alignements', tags:['maconnerie','reprise'] },

        { key:'2.8', label:'Reprise des murs avec BA13 hydro suite à dépose carrelage',
          unit:'m²', defaultQty:1, defaultPrice:90, trigger:'demolition.ba13Hydro', qtyFormula:'ba13Surface',
          zone:'general', action:'reprise', priceMode:'standard',
          semanticKey:'sdb.maconnerie.ba13-hydro', tags:['maconnerie','ba13','reprise','mural'] },

        { key:'2.9', label:'Douche: Création d\'un tablier receveur avec trappe de contrôle',
          unit:'U', defaultQty:1, defaultPrice:120, trigger:'douche.tablier',
          zone:'douche', action:'creation', priceMode:'standard',
          semanticKey:'sdb.douche.tablier-receveur', tags:['douche','tablier','maconnerie'] },

        { key:'2.10', label:'Douche: Création d\'une margelle alignée sur le receveur',
          unit:'U', defaultQty:1, defaultPrice:100, trigger:'douche.margelle',
          zone:'douche', action:'creation', priceMode:'standard',
          semanticKey:'sdb.douche.margelle', tags:['douche','margelle','maconnerie'] },

        { key:'2.11', label:'Baignoire: Création d\'un tablier de baignoire avec trappe d\'accès à carreler',
          unit:'U', defaultQty:1, defaultPrice:250, trigger:'baignoire.tablier',
          zone:'baignoire', action:'creation', priceMode:'standard',
          semanticKey:'sdb.baignoire.tablier', tags:['baignoire','tablier','maconnerie'] },

        { key:'2.12', label:'Baignoire: Création d\'une margelle alignée sur baignoire',
          unit:'U', defaultQty:1, defaultPrice:100, trigger:'baignoire.margelle',
          zone:'baignoire', action:'creation', priceMode:'standard',
          semanticKey:'sdb.baignoire.margelle', tags:['baignoire','margelle','maconnerie'] },

        { key:'2.13', label:'Toilettes suspendues: Habillage du châssis (hors enduit/peinture)',
          unit:'U', defaultQty:1, defaultPrice:270, trigger:'wc.suspendu.habillage',
          zone:'wc', action:'habillage', priceMode:'standard',
          semanticKey:'sdb.wc.suspendu.habillage', tags:['wc','suspendu','habillage'] },

        { key:'2.14', label:'Coffrage vertical toute hauteur pour masquer colonne d\'eau',
          unit:'U', defaultQty:1, defaultPrice:220, trigger:'maconnerie.coffrageVertical',
          zone:'tuyaux', action:'creation', priceMode:'standard',
          semanticKey:'sdb.coffrage.vertical', tags:['coffrage','tuyaux','vertical'] },

        { key:'2.15', label:'Coffrage horizontal pour masquer tuyaux',
          unit:'U', defaultQty:1, defaultPrice:220, trigger:'maconnerie.coffrageHorizontal',
          zone:'tuyaux', action:'creation', priceMode:'standard',
          semanticKey:'sdb.coffrage.horizontal', tags:['coffrage','tuyaux','horizontal'] },

        { key:'2.16', label:'Pose carrelage sol - pose droite - carrelage de type 60x60cm',
          unit:'m²', defaultQty:1, defaultPrice:140, trigger:'carrelage.sol', qtyFormula:'surfaceSol',
          zone:'sol', action:'pose', priceMode:'standard',
          semanticKey:'sdb.carrelage.sol.pose', tags:['carrelage','sol','pose'] },

        { key:'2.17', label:'Plinthes carrelage : Pose des plinthes assorties carrelage sol',
          unit:'ml', defaultQty:1, defaultPrice:28, trigger:'carrelage.plinthes', qtyFormula:'plinthesML',
          zone:'sol', action:'pose', priceMode:'standard',
          semanticKey:'sdb.carrelage.plinthes.pose', tags:['carrelage','plinthes','sol'] },

        { key:'2.18', label:'Pose barre de seuil',
          unit:'U', defaultQty:1, defaultPrice:25, trigger:'carrelage.barreSeuil',
          zone:'sol', action:'pose', priceMode:'standard',
          semanticKey:'sdb.carrelage.barre-seuil', tags:['carrelage','seuil','finition'] },

        { key:'2.19', label:'Carrelage mural : Pose carrelage mural - pose droite - toute hauteur - 30x60cm (mur de la vasque, murs intérieurs baignoire/receveur, arrêt au droit de l\'espace bain/douche)',
          unit:'m²', defaultQty:12, defaultPrice:140, trigger:'carrelage.mural', qtyFormula:'surfaceMurale',
          zone:'general', action:'pose', priceMode:'standard',
          semanticKey:'sdb.carrelage.mural.pose', tags:['carrelage','mural','pose'] },

        { key:'2.20', label:'Carrelage tablier : Pose carrelage tablier',
          unit:'U', defaultQty:1, defaultPrice:90, trigger:'carrelage.poseTablier',
          zone:'douche', action:'pose', priceMode:'standard',
          semanticKey:'sdb.carrelage.tablier.pose', tags:['carrelage','tablier','douche','baignoire'] },

        { key:'2.21', label:'Carrelage margelle : Pose carrelage margelle',
          unit:'U', defaultQty:1, defaultPrice:90, trigger:'carrelage.poseMargelle',
          zone:'douche', action:'pose', priceMode:'standard',
          semanticKey:'sdb.carrelage.margelle.pose', tags:['carrelage','margelle'] },

        { key:'2.22', label:'Carrelage tablier + margelle : Pose carrelage tablier + margelle',
          unit:'U', defaultQty:1, defaultPrice:90, trigger:'carrelage.poseTablierMargelle',
          zone:'douche', action:'pose', priceMode:'standard',
          semanticKey:'sdb.carrelage.tablier-margelle.pose', tags:['carrelage','tablier','margelle'] },

        { key:'2.23', label:'Baguette de finition d\'angle carrelage',
          unit:'U', defaultQty:1, defaultPrice:30, trigger:'carrelage.baguetteFinition',
          zone:'general', action:'pose', priceMode:'standard',
          semanticKey:'sdb.carrelage.baguette-finition', tags:['carrelage','finition','angle'] },

        { key:'2.24', label:'Meuble sous-vasque : Montage et pose d\'1 meuble sous vasque',
          unit:'U', defaultQty:1, defaultPrice:250, trigger:'vasque.meuble',
          zone:'vasque', action:'pose', priceMode:'standard',
          semanticKey:'sdb.vasque.meuble.pose', tags:['vasque','meuble','mobilier'] },

        { key:'2.25', label:'Miroir / Armoire de toilettes : Pose d\'1 Miroir / Armoire de toilettes',
          unit:'U', defaultQty:1, defaultPrice:80, trigger:'vasque.miroir',
          zone:'vasque', action:'pose', priceMode:'standard',
          semanticKey:'sdb.vasque.miroir.pose', tags:['miroir','vasque'] },

        { key:'2.26', label:'Colonne de rangement / rangement supplémentaire : Montage et pose d\'1 colonne de rangement',
          unit:'U', defaultQty:1, defaultPrice:90, trigger:'vasque.colonneRangement',
          zone:'vasque', action:'pose', priceMode:'standard',
          semanticKey:'sdb.vasque.colonne-rangement', tags:['mobilier','rangement','colonne'] },

        { key:'2.27', label:'Remplacement d\'1 bouche de ventilation',
          unit:'U', defaultQty:1, defaultPrice:20, trigger:'ventilation.boucheVMC',
          zone:'ventilation', action:'remplacement', priceMode:'standard',
          semanticKey:'sdb.ventilation.bouche-vmc', tags:['vmc','ventilation'] },

        { key:'2.28', label:'Pose accessoires',
          unit:'U', defaultQty:1, defaultPrice:80, trigger:'vasque.accessoires',
          zone:'vasque', action:'pose', priceMode:'standard',
          semanticKey:'sdb.accessoires.pose', tags:['accessoires'] },

        { key:'2.29', label:'Peinture salle de bain : Préparation des supports avant peinture + mise en peinture Blanc satiné - pièce humide',
          unit:'U', defaultQty:1, defaultPrice:750, trigger:'peinture.complete',
          zone:'general', action:'peinture', priceMode:'standard',
          semanticKey:'sdb.peinture.complete', tags:['peinture','finition'] }
      ]
    },

    /* ╔═══ 3. PLOMBERIE ═══╗ */
    {
      id: 'sec-3-plomberie',
      num: 3,
      title: 'Salle de bain - Plomberie',
      kind: 'works',
      isOption: false,
      includeInGrandTotal: true,
      items: [
        { key:'3.1', label:'Receveur de douche : Création des arrivées EC EF et Evacuation du receveur (saignée cloison) + Pose et raccordement d\'1 receveur de douche sur pieds + Pose et raccordement robinet / colonne de douche',
          unit:'U', defaultQty:1, defaultPrice:1200, trigger:'douche.plomberie',
          zone:'douche', action:'creation', priceMode:'standard',
          semanticKey:'sdb.douche.plomberie', tags:['plomberie','douche','receveur'] },

        { key:'3.2', label:'Paroi / porte de douche : Montage et pose d\'1 paroi/porte de douche',
          unit:'U', defaultQty:1, defaultPrice:280, trigger:'douche.paroi',
          zone:'douche', action:'pose', priceMode:'standard',
          semanticKey:'sdb.douche.paroi.pose', tags:['douche','paroi'] },

        { key:'3.3', label:'Baignoire : Création des arrivées EC EF et Evacuation de la baignoire + Pose et raccordement d\'1 baignoire sur pieds + Pose et raccordement robinet / colonne de douche',
          unit:'U', defaultQty:1, defaultPrice:1200, trigger:'baignoire.plomberie',
          zone:'baignoire', action:'creation', priceMode:'standard',
          semanticKey:'sdb.baignoire.plomberie', tags:['plomberie','baignoire'] },

        { key:'3.4', label:'Ecran de baignoire : Montage et pose d\'1 écran de baignoire',
          unit:'U', defaultQty:1, defaultPrice:95, trigger:'baignoire.ecran',
          zone:'baignoire', action:'pose', priceMode:'standard',
          semanticKey:'sdb.baignoire.ecran.pose', tags:['baignoire','ecran'] },

        { key:'3.5', label:'Electroménager Lave-linge : Création arrivée EF et Evacuation Lave Linge - hors branchement',
          unit:'U', defaultQty:1, defaultPrice:180, trigger:'plomberie.laveLinge',
          zone:'general', action:'creation', priceMode:'standard',
          semanticKey:'sdb.electromenager.lave-linge', tags:['plomberie','electromenager','lave-linge'] },

        { key:'3.6', label:'Electroménager Sèche-linge : Création Evacuation Sèche Linge - hors branchement',
          unit:'U', defaultQty:1, defaultPrice:80, trigger:'plomberie.secheLinge',
          zone:'general', action:'creation', priceMode:'standard',
          semanticKey:'sdb.electromenager.seche-linge', tags:['plomberie','electromenager','seche-linge'] },

        { key:'3.7', label:'Toilettes suspendues : Reprise des arrivées EF et Evacuation + Pose châssis avec renforts + Pose cuvette suspendue avec abattant et plaque de déclenchement',
          unit:'U', defaultQty:1, defaultPrice:630, trigger:'wc.suspendu.plomberie',
          zone:'wc', action:'pose', priceMode:'standard',
          semanticKey:'sdb.wc.suspendu.plomberie',
          altGroupId:'wc.installation', altDefault:true,
          tags:['plomberie','wc','suspendu'] },

        { key:'3.8', label:'Toilettes à poser : Reprise des arrivées EF et Evacuation + Pose et raccordement des toilettes + Pose abattant',
          unit:'U', defaultQty:1, defaultPrice:280, trigger:'wc.aPoser.plomberie',
          zone:'wc', action:'pose', priceMode:'standard',
          semanticKey:'sdb.wc.a-poser.plomberie',
          altGroupId:'wc.installation', altDefault:false,
          tags:['plomberie','wc','a-poser'] },

        { key:'3.9', label:'Vasque SIMPLE : Reprise des arrivées EC EF et Evacuation vasque + Pose et raccordement vasque avec robinetterie',
          unit:'U', defaultQty:1, defaultPrice:350, trigger:'vasque.plomberie.simple',
          zone:'vasque', action:'pose', priceMode:'standard',
          semanticKey:'sdb.vasque.plomberie.simple',
          altGroupId:'vasque.nombre', altDefault:true,
          tags:['plomberie','vasque','simple'] },

        { key:'3.10', label:'Vasque DOUBLE : Reprise des arrivées EC EF et Evacuation vasques doubles + Pose et raccordement vasques doubles avec robinetteries',
          unit:'U', defaultQty:1, defaultPrice:450, trigger:'vasque.plomberie.double',
          zone:'vasque', action:'pose', priceMode:'standard',
          semanticKey:'sdb.vasque.plomberie.double',
          altGroupId:'vasque.nombre', altDefault:false,
          tags:['plomberie','vasque','double'] },

        { key:'3.11', label:'Remplacement d\'1 Sèche-serviettes - Chaudière INDIVIDUELLE : Vidange du réseau, dépose radiateur, modification du raccordement, pose et raccordement, purge et essais',
          unit:'U', defaultQty:1, defaultPrice:350, trigger:'plomberie.secheServiettesIndiv',
          zone:'chauffage', action:'remplacement', priceMode:'standard',
          semanticKey:'sdb.seche-serviettes.indiv',
          altGroupId:'radiateur.chauffage', altDefault:true,
          tags:['plomberie','radiateur','seche-serviettes','individuel'] },

        { key:'3.12', label:'Remplacement d\'1 Sèche-serviettes - Chaudière COLLECTIVE : Vidange du réseau, dépose radiateur, modification du raccordement, pose et raccordement, purge et essais. NB : Intervention chauffagiste de l\'immeuble nécessaire avant et après notre intervention.',
          unit:'U', defaultQty:1, defaultPrice:450, trigger:'plomberie.secheServiettesColl',
          zone:'chauffage', action:'remplacement', priceMode:'standard',
          semanticKey:'sdb.seche-serviettes.coll',
          altGroupId:'radiateur.chauffage', altDefault:false,
          tags:['plomberie','radiateur','seche-serviettes','collectif','copro'] },

        { key:'3.13', label:'Remplacement / Déplacement d\'1 Ballon électrique : Dépose ancien ballon + évacuation, reprise des arrivées EC EF et Evacuation, reprise de la ligne électrique, pose et raccordement, mise en eau et essais',
          unit:'U', defaultQty:1, defaultPrice:450, trigger:'plomberie.ballonElectrique',
          zone:'ballon', action:'remplacement', priceMode:'standard',
          semanticKey:'sdb.ballon.remplacement', tags:['plomberie','ballon','electrique'] }
      ]
    },

    /* ╔═══ 4. ÉLECTRICITÉ ═══╗ */
    {
      id: 'sec-4-electricite',
      num: 4,
      title: 'Salle de bain - Electricité',
      kind: 'works',
      isOption: false,
      includeInGrandTotal: true,
      items: [
        { key:'4.1', label:'Mise en sécurité électrique de la pièce',
          unit:'U', defaultQty:1, defaultPrice:0, isMandatory:true, displayOnly:true, showWhenZero:true,
          zone:'electrique', action:'mise-en-securite', priceMode:'free',
          semanticKey:'sdb.elec.mise-en-securite', tags:['electricite','securite'] },

        { key:'4.2', label:'Reprise ligne pour déplacement d\'1 Prise électrique crédence',
          unit:'U', defaultQty:1, defaultPrice:90, trigger:'electricite.priseCredence',
          zone:'electrique', action:'reprise', priceMode:'standard',
          semanticKey:'sdb.elec.prise-credence.reprise', tags:['electricite','prise','credence'] },

        { key:'4.3', label:'Reprise ligne électrique pour éclairage plafond',
          unit:'U', defaultQty:1, defaultPrice:135, trigger:'electricite.eclairagePlafond',
          zone:'plafond', action:'reprise', priceMode:'standard',
          semanticKey:'sdb.elec.eclairage-plafond.reprise', tags:['electricite','eclairage','plafond'] },

        { key:'4.4', label:'Reprise ligne électrique pour éclairage miroir - Hauteur 180cm',
          unit:'U', defaultQty:1, defaultPrice:90, trigger:'electricite.eclairageMiroir',
          zone:'vasque', action:'reprise', priceMode:'standard',
          semanticKey:'sdb.elec.eclairage-miroir.reprise', tags:['electricite','eclairage','miroir'] },

        { key:'4.5', label:'Reprise ligne électrique pour déplacement Radiateur électrique',
          unit:'U', defaultQty:1, defaultPrice:135, trigger:'electricite.radiateur',
          zone:'chauffage', action:'reprise', priceMode:'standard',
          semanticKey:'sdb.elec.radiateur.reprise', tags:['electricite','radiateur'] },

        { key:'4.6', label:'Reprise ligne électrique pour alimentation extracteur d\'air',
          unit:'U', defaultQty:1, defaultPrice:135, trigger:'electricite.extracteur',
          zone:'ventilation', action:'reprise', priceMode:'standard',
          semanticKey:'sdb.elec.extracteur.reprise', tags:['electricite','extracteur','ventilation'] },

        { key:'4.7', label:'Reprise ligne électrique pour alimentation appareil électroménager',
          unit:'U', defaultQty:1, defaultPrice:135, trigger:'electricite.electromenager',
          zone:'general', action:'reprise', priceMode:'standard',
          semanticKey:'sdb.elec.electromenager.reprise', tags:['electricite','electromenager'] },

        { key:'4.8', label:'Pose et raccordement éclairage miroir',
          unit:'U', defaultQty:1, defaultPrice:60, trigger:'electricite.poseEclairageMiroir',
          zone:'vasque', action:'pose', priceMode:'standard',
          semanticKey:'sdb.elec.eclairage-miroir.pose', tags:['electricite','eclairage','miroir'] },

        { key:'4.9', label:'Pose et raccordement plafonnier / applique murale',
          unit:'U', defaultQty:1, defaultPrice:70, trigger:'electricite.posePlafonnier',
          zone:'plafond', action:'pose', priceMode:'standard',
          semanticKey:'sdb.elec.plafonnier.pose', tags:['electricite','plafonnier','applique'] },

        { key:'4.10', label:'Pose et raccordement extracteur d\'air',
          unit:'U', defaultQty:1, defaultPrice:60, trigger:'electricite.poseExtracteur',
          zone:'ventilation', action:'pose', priceMode:'standard',
          semanticKey:'sdb.elec.extracteur.pose', tags:['electricite','extracteur'] },

        { key:'4.11', label:'Pose et raccordement d\'1 sèche-serviettes électrique',
          unit:'U', defaultQty:1, defaultPrice:80, trigger:'electricite.poseSecheServiettesElec',
          zone:'chauffage', action:'pose', priceMode:'standard',
          semanticKey:'sdb.elec.seche-serviettes.pose', tags:['electricite','seche-serviettes'] }
      ]
    },

    /* ╔═══ 5. FOURNITURES (8 sous-sections) ═══╗ */
    {
      id: 'sec-5-fournitures',
      num: 5,
      title: 'Salle de bain - Fournitures (Budget à préciser en fonction des choix du client)',
      kind: 'supplies',
      isOption: false,
      isFourniture: true,
      includeInGrandTotal: true,
      subSections: [

        /* ── 5.1 Carrelage ── */
        { id:'5.1', num:'5.1', title:'Carrelage', items:[
          { key:'5.1.1', label:'Carrelage sol (y compris chutes)',
            unit:'m²', defaultQty:1, defaultPrice:30, trigger:'fournitures.carrelageSol', qtyFormula:'surfaceSolAvecChutes',
            zone:'sol', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.carrelage-sol', tags:['fourniture','carrelage','sol'] },

          { key:'5.1.2', label:'Plinthes assorties au carrelage sol (y compris chutes)',
            unit:'ml', defaultQty:1, defaultPrice:12, trigger:'fournitures.plinthesCarrelage', qtyFormula:'plinthesMLAvecChutes',
            zone:'sol', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.plinthes-carrelage', tags:['fourniture','plinthes','carrelage'] },

          { key:'5.1.3', label:'Carrelage coffrage et tablier receveur (y compris chutes) - inclus dans le sol',
            unit:'m²', defaultQty:1, defaultPrice:0, trigger:'fournitures.carrelageCoffrage', showWhenZero:true,
            zone:'douche', action:'fourniture', priceMode:'included',
            semanticKey:'sdb.fourniture.carrelage-coffrage', tags:['fourniture','carrelage','coffrage'] },

          { key:'5.1.4', label:'Carrelage mural (y compris chutes)',
            unit:'m²', defaultQty:1, defaultPrice:35, trigger:'fournitures.carrelageMural', qtyFormula:'surfaceMuraleAvecChutes',
            zone:'general', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.carrelage-mural', tags:['fourniture','carrelage','mural'] }
        ]},

        /* ── 5.2 Douche ── */
        { id:'5.2', num:'5.2', title:'Douche', items:[
          { key:'5.2.1', label:'Receveur de douche extraplat - 80x120cm',
            unit:'U', defaultQty:1, defaultPrice:240, trigger:'fournitures.receveurDouche',
            zone:'douche', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.receveur-douche', tags:['fourniture','douche','receveur'] },

          { key:'5.2.2', label:'Vidage receveur Capot Chromé - type "TurboFlow" - Ecoulement très rapide',
            unit:'U', defaultQty:1, defaultPrice:67, trigger:'fournitures.vidageReceveur',
            zone:'douche', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.vidage-receveur', tags:['fourniture','douche','vidage'] },

          { key:'5.2.3', label:'Lot de 2 Pieds réglables pour receveur de douche',
            unit:'U', defaultQty:5, defaultPrice:15, trigger:'fournitures.piedsReceveur',
            zone:'douche', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.pieds-receveur', tags:['fourniture','douche','pieds'] },

          { key:'5.2.4', label:'Lot de 2 réhausses pour pieds receveur',
            unit:'U', defaultQty:5, defaultPrice:9.50, trigger:'fournitures.rehausesReceveur',
            zone:'douche', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.rehausses-receveur', tags:['fourniture','douche','rehausses'] },

          { key:'5.2.5', label:'Grille de contrôle / ventilation',
            unit:'U', defaultQty:1, defaultPrice:17, trigger:'fournitures.grilleControle',
            zone:'douche', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.grille-controle-douche', tags:['fourniture','grille','controle'] },

          { key:'5.2.6', label:'Mitigeur de douche - HANSGROHE',
            unit:'U', defaultQty:1, defaultPrice:149, trigger:'fournitures.mitigeurDouche',
            zone:'douche', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.mitigeur-douche', tags:['fourniture','mitigeur','hansgrohe','robinetterie'] },

          { key:'5.2.7', label:'Kit Barre de douche avec pommeau et flexible',
            unit:'U', defaultQty:1, defaultPrice:69, trigger:'fournitures.kitBarreDouche',
            zone:'douche', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.kit-barre-douche', tags:['fourniture','barre','pommeau'] },

          { key:'5.2.8', label:'Paroi de douche Fixe - Verre Transparent - Profilés Chromés brillants - L80cm',
            unit:'U', defaultQty:1, defaultPrice:190, trigger:'fournitures.paroiFixe',
            zone:'douche', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.paroi-fixe',
            altGroupId:'paroi.douche', altDefault:true,
            tags:['fourniture','paroi','fixe'] },

          { key:'5.2.9', label:'Paroi de douche pivotante - Déflecteur L40cm',
            unit:'U', defaultQty:1, defaultPrice:130, trigger:'fournitures.paroiPivotante',
            zone:'douche', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.paroi-pivotante',
            altGroupId:'paroi.douche', altDefault:false,
            tags:['fourniture','paroi','pivotante'] }
        ]},

        /* ── 5.3 Baignoire ── */
        { id:'5.3', num:'5.3', title:'Baignoire', items:[
          { key:'5.3.1', label:'Baignoire acrylique renforcée Blanche 170cmx70cm avec pieds',
            unit:'U', defaultQty:1, defaultPrice:190, trigger:'fournitures.baignoire',
            zone:'baignoire', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.baignoire', tags:['fourniture','baignoire','acrylique'] },

          { key:'5.3.2', label:'Vidage automatique baignoire avec capot ABS Chromé HANSGROHE',
            unit:'U', defaultQty:1, defaultPrice:75.30, trigger:'fournitures.vidageBaignoire',
            zone:'baignoire', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.vidage-baignoire', tags:['fourniture','vidage','hansgrohe'] },

          { key:'5.3.3', label:'Lot de 2 Colonnettes Chromées LUXE',
            unit:'U', defaultQty:1, defaultPrice:49, trigger:'fournitures.colonnettes',
            zone:'baignoire', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.colonnettes', tags:['fourniture','colonnettes'] },

          { key:'5.3.4', label:'Trappe d\'accès à carreler',
            unit:'U', defaultQty:1, defaultPrice:67, trigger:'fournitures.trappeAcces',
            zone:'baignoire', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.trappe-acces', tags:['fourniture','trappe'] },

          { key:'5.3.5', label:'Mitigeur de Bain/Douche - Chromé - HANSGROHE',
            unit:'U', defaultQty:1, defaultPrice:179, trigger:'fournitures.mitigeurBain',
            zone:'baignoire', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.mitigeur-bain', tags:['fourniture','mitigeur','hansgrohe','robinetterie'] },

          { key:'5.3.6', label:'Kit Barre de douche avec pommeau et flexible',
            unit:'U', defaultQty:1, defaultPrice:69, trigger:'fournitures.kitBarreDoucheBaignoire',
            zone:'baignoire', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.kit-barre-douche-baignoire', tags:['fourniture','barre','pommeau'] },

          { key:'5.3.7', label:'Ecran de baignoire L70cm H140cm',
            unit:'U', defaultQty:1, defaultPrice:99, trigger:'fournitures.ecranBaignoire',
            zone:'baignoire', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.ecran-baignoire', tags:['fourniture','ecran','baignoire'] }
        ]},

        /* ── 5.4 Mobilier ── */
        { id:'5.4', num:'5.4', title:'Mobilier', items:[
          { key:'5.4.1', label:'Meuble Sous-Vasque - Valider nécessité renforts avec PIEDS - L 80CM',
            unit:'U', defaultQty:1, defaultPrice:350, trigger:'fournitures.meubleSousVasque',
            zone:'vasque', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.meuble-sous-vasque', tags:['fourniture','mobilier','meuble'] },

          { key:'5.4.2', label:'Vasque compatible avec le meuble sous vasque',
            unit:'U', defaultQty:1, defaultPrice:120, trigger:'fournitures.vasque',
            zone:'vasque', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.vasque', tags:['fourniture','vasque'] },

          { key:'5.4.3', label:'Lot de 2 pieds pour Meuble vasque - Nécessaire si mur NON PORTEUR',
            unit:'U', defaultQty:1, defaultPrice:29, trigger:'fournitures.piedsMeuble',
            zone:'vasque', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.pieds-meuble', tags:['fourniture','pieds','mobilier'] },

          { key:'5.4.4', label:'Colonne de rangement L30cm H180cm',
            unit:'U', defaultQty:1, defaultPrice:160, trigger:'fournitures.colonne',
            zone:'vasque', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.colonne-rangement', tags:['fourniture','colonne','rangement'] },

          { key:'5.4.5', label:'Mitigeur Lavabo - HANSGROHE',
            unit:'U', defaultQty:1, defaultPrice:89, trigger:'fournitures.mitigeurLavabo',
            zone:'vasque', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.mitigeur-lavabo', tags:['fourniture','mitigeur','hansgrohe','robinetterie'] },

          { key:'5.4.6', label:'Déport Siphon - Gain de place',
            unit:'U', defaultQty:1, defaultPrice:19, trigger:'fournitures.deportSiphon',
            zone:'vasque', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.deport-siphon', tags:['fourniture','siphon'] },

          { key:'5.4.7', label:'Bonde Automatique Chromée',
            unit:'U', defaultQty:1, defaultPrice:25, trigger:'fournitures.bondeAuto',
            zone:'vasque', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.bonde-auto', tags:['fourniture','bonde'] },

          { key:'5.4.8', label:'Miroir - SANS ECLAIRAGE',
            unit:'U', defaultQty:1, defaultPrice:80, trigger:'fournitures.miroirSansEclairage',
            zone:'vasque', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.miroir-sans-eclairage', tags:['fourniture','miroir'] },

          { key:'5.4.9', label:'Eclairage Miroir L30cm Chromé Brillant - LED',
            unit:'U', defaultQty:1, defaultPrice:55, trigger:'fournitures.eclairageMiroir',
            zone:'vasque', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.eclairage-miroir', tags:['fourniture','eclairage','miroir','led'] }
        ]},

        /* ── 5.5 Radiateur ── */
        { id:'5.5', num:'5.5', title:'Radiateur', items:[
          { key:'5.5.1', label:'Sèche-Serviettes Eau chaude - Eprouvé 6-8 bars à valider avec le chauffagiste de l\'immeuble',
            unit:'U', defaultQty:1, defaultPrice:280, trigger:'fournitures.secheServiettesEauChaude',
            zone:'chauffage', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.seche-serviettes-eau',
            altGroupId:'radiateur.energie', altDefault:true,
            tags:['fourniture','seche-serviettes','eau-chaude'] },

          { key:'5.5.2', label:'Tés de raccordement + robinet thermostatique radiateur',
            unit:'U', defaultQty:1, defaultPrice:67, trigger:'fournitures.tesRaccordement',
            zone:'chauffage', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.tes-raccordement', tags:['fourniture','raccordement','thermostatique'] },

          { key:'5.5.3', label:'Sèche-Serviettes Electrique L50CM H100CM - 500W',
            unit:'U', defaultQty:1, defaultPrice:180, trigger:'fournitures.secheServiettesElec',
            zone:'chauffage', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.seche-serviettes-elec',
            altGroupId:'radiateur.energie', altDefault:false,
            tags:['fourniture','seche-serviettes','electrique'] }
        ]},

        /* ── 5.6 Toilettes ── */
        { id:'5.6', num:'5.6', title:'Toilettes', items:[
          { key:'5.6.1', label:'CHASSIS SUSPENDU GEBERIT UP320',
            unit:'U', defaultQty:0, defaultPrice:290, trigger:'fournitures.chassisGeberit', showWhenZero:true,
            zone:'wc', action:'fourniture', priceMode:'tbd',
            semanticKey:'sdb.fourniture.chassis-geberit', tags:['fourniture','wc','chassis','geberit','alternative'] },

          { key:'5.6.2', label:'Plaque de déclenchement Coloris Blanc SIGMA',
            unit:'U', defaultQty:0, defaultPrice:69, trigger:'fournitures.plaqueSigma', showWhenZero:true,
            zone:'wc', action:'fourniture', priceMode:'tbd',
            semanticKey:'sdb.fourniture.plaque-sigma',
            altGroupId:'wc.plaque', altDefault:false,
            tags:['fourniture','wc','plaque','sigma','alternative'] },

          { key:'5.6.3', label:'Plaque de déclenchement WC Duofix Sigma 20 blanc contours boutons chromés',
            unit:'U', defaultQty:1, defaultPrice:115, trigger:'fournitures.plaqueSigma20',
            zone:'wc', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.plaque-sigma-20',
            altGroupId:'wc.plaque', altDefault:true,
            tags:['fourniture','wc','plaque','sigma','duofix'] },

          { key:'5.6.4', label:'Cuvette suspendue carénée avec abattant frein de chute',
            unit:'U', defaultQty:1, defaultPrice:180, trigger:'fournitures.cuvetteSuspendue',
            zone:'wc', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.cuvette-suspendue',
            altGroupId:'wc.cuvette', altDefault:true,
            tags:['fourniture','wc','cuvette','suspendue'] },

          { key:'5.6.5', label:'Pack WC à poser avec abattant frein de chute',
            unit:'U', defaultQty:1, defaultPrice:180, trigger:'fournitures.packWcAPoser',
            zone:'wc', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.pack-wc-a-poser',
            altGroupId:'wc.cuvette', altDefault:false,
            tags:['fourniture','wc','pack','a-poser'] }
        ]},

        /* ── 5.7 Ballon électrique ── */
        { id:'5.7', num:'5.7', title:'Ballon électrique', items:[
          { key:'5.7.1', label:'Ballon électrique',
            unit:'U', defaultQty:1, defaultPrice:0, trigger:'fournitures.ballonElectrique', showWhenZero:true,
            zone:'ballon', action:'fourniture', priceMode:'tbd',
            semanticKey:'sdb.fourniture.ballon-elec', tags:['fourniture','ballon','electrique'] },

          { key:'5.7.2', label:'Groupe de sécurité',
            unit:'U', defaultQty:1, defaultPrice:35, trigger:'fournitures.groupeSecurite',
            zone:'ballon', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.groupe-securite', tags:['fourniture','ballon','securite'] },

          { key:'5.7.3', label:'Siphon Ballon électrique',
            unit:'U', defaultQty:1, defaultPrice:12, trigger:'fournitures.siphonBallon',
            zone:'ballon', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.siphon-ballon', tags:['fourniture','ballon','siphon'] },

          { key:'5.7.4', label:'Raccords di-électriques - diminution corrosion / calcaire',
            unit:'U', defaultQty:2, defaultPrice:12.30, trigger:'fournitures.raccordsDiElec',
            zone:'ballon', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.raccords-dielec', tags:['fourniture','ballon','raccords'] }
        ]},

        /* ── 5.8 Accessoires divers ── */
        { id:'5.8', num:'5.8', title:'Accessoires divers', items:[
          { key:'5.8.1', label:'Barre de seuil',
            unit:'U', defaultQty:1, defaultPrice:20, trigger:'fournitures.barreSeuil',
            zone:'sol', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.barre-seuil', tags:['fourniture','seuil','sol'] },

          { key:'5.8.2', label:'Baguette de finition d\'angle carrelage - Alu mat',
            unit:'U', defaultQty:1, defaultPrice:26, trigger:'fournitures.baguetteFinition',
            zone:'general', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.baguette-finition', tags:['fourniture','baguette','finition'] },

          { key:'5.8.3', label:'Prise électrique simple LEGRAND Céliane Blanc',
            unit:'U', defaultQty:1, defaultPrice:14.63, trigger:'fournitures.priseSimple',
            zone:'electrique', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.prise-simple', tags:['fourniture','prise','legrand','celiane'] },

          { key:'5.8.4', label:'Prise électrique double LEGRAND Céliane Blanc',
            unit:'U', defaultQty:1, defaultPrice:34.20, trigger:'fournitures.priseDouble',
            zone:'electrique', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.prise-double', tags:['fourniture','prise','legrand','celiane'] },

          { key:'5.8.5', label:'Interrupteur Simple LEGRAND Céliane Blanc',
            unit:'U', defaultQty:1, defaultPrice:17.44, trigger:'fournitures.interSimple',
            zone:'electrique', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.inter-simple', tags:['fourniture','interrupteur','legrand','celiane'] },

          { key:'5.8.6', label:'Interrupteur Double LEGRAND Céliane Blanc',
            unit:'U', defaultQty:1, defaultPrice:32.51, trigger:'fournitures.interDouble',
            zone:'electrique', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.inter-double', tags:['fourniture','interrupteur','legrand','celiane'] },

          { key:'5.8.7', label:'Prise saillie SIMPLE',
            unit:'U', defaultQty:1, defaultPrice:12.50, trigger:'fournitures.priseSaillieSimple',
            zone:'electrique', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.prise-saillie-simple', tags:['fourniture','prise','saillie'] },

          { key:'5.8.8', label:'Prise saillie DOUBLE',
            unit:'U', defaultQty:1, defaultPrice:22.90, trigger:'fournitures.priseSaillieDouble',
            zone:'electrique', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.prise-saillie-double', tags:['fourniture','prise','saillie'] },

          { key:'5.8.9', label:'Bouche d\'aération VMC',
            unit:'U', defaultQty:1, defaultPrice:29, trigger:'fournitures.boucheVMC',
            zone:'ventilation', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.bouche-vmc', tags:['fourniture','vmc','aeration'] },

          { key:'5.8.10', label:'Grille de contrôle / ventilation',
            unit:'U', defaultQty:1, defaultPrice:17, trigger:'fournitures.grilleControleAcc',
            zone:'ventilation', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.grille-controle-acc', tags:['fourniture','grille','controle'] },

          { key:'5.8.11', label:'Extracteur d\'air Hygrométrique',
            unit:'U', defaultQty:1, defaultPrice:159, trigger:'fournitures.extracteurHygro',
            zone:'ventilation', action:'fourniture', priceMode:'standard',
            semanticKey:'sdb.fourniture.extracteur-hygro', tags:['fourniture','extracteur','hygrometrique'] },

          { key:'5.8.12', label:'Plafonnier / Applique murale → fourni / client',
            unit:'U', defaultQty:1, defaultPrice:0, trigger:'fournitures.plafonnierFourniClient', showWhenZero:true,
            zone:'plafond', action:'fourniture', priceMode:'client',
            semanticKey:'sdb.fourniture.plafonnier-client', tags:['fourniture','plafonnier','client'] },

          { key:'5.8.13', label:'Patères / porte-serviettes / porte savon → fourni / client',
            unit:'U', defaultQty:1, defaultPrice:0, trigger:'fournitures.pateresFourniClient', showWhenZero:true,
            zone:'general', action:'fourniture', priceMode:'client',
            semanticKey:'sdb.fourniture.pateres-client', tags:['fourniture','accessoires','client'] }
        ]}
      ]
    },

    /* ╔═══ 6. LIVRAISON ═══╗ */
    {
      id: 'sec-6-livraison',
      num: 6,
      title: 'LIVRAISON',
      kind: 'delivery',
      isOption: false,
      includeInGrandTotal: true,
      items: [
        { key:'6.1', label:'Participation aux frais de livraison - y compris acheminement dans le logement',
          unit:'U', defaultQty:1, defaultPrice:200, isMandatory:true,
          zone:'general', action:'fourniture', priceMode:'standard',
          semanticKey:'sdb.livraison.participation', tags:['livraison','logistique'] }
      ]
    },

    /* ╔═══════════════════════════════════════════════════════════
       OPTIONS (7 à 18) — sous-totaux séparés, hors total HT principal
       ═══════════════════════════════════════════════════════════╗ */

    /* ── 7. DÉPOSE CARRELAGE SOL ── */
    {
      id: 'sec-7-depose-carrelage-sol',
      num: 7,
      title: 'Dépose carrelage sol - salle de bain',
      kind: 'option',
      isOption: true,
      includeInGrandTotal: false,
      items: [
        { key:'7.1', label:'Dépose carrelage sol / Evacuation des gravats / mise en déchetterie / Ragréage du sol avant carrelage',
          unit:'U', defaultQty:1, defaultPrice:450, trigger:'options.deposeCarrelageSol',
          zone:'sol', action:'depose', priceMode:'standard',
          semanticKey:'sdb.option.depose-carrelage-sol', tags:['option','depose','carrelage','sol','ragreage'] }
      ]
    },

    /* ── 8. PLAFOND SUSPENDU ── */
    {
      id: 'sec-8-plafond-suspendu',
      num: 8,
      title: 'Plafond suspendu - salle de bain',
      kind: 'option',
      isOption: true,
      includeInGrandTotal: false,
      items: [
        { key:'8.1', label:'Création d\'1 plafond suspendu : ossature métallique + plaques de plâtre + bandes de jonction Placo',
          unit:'m²', defaultQty:3, defaultPrice:210, trigger:'options.plafondSuspendu', qtyFormula:'surfacePlafond',
          zone:'plafond', action:'creation', priceMode:'standard',
          semanticKey:'sdb.option.plafond-suspendu.creation', tags:['option','plafond','suspendu','ba13'] },

        { key:'8.2', label:'Installation de spots encastrés dans le faux plafond - y compris fournitures - Reprise distribution électrique des spots',
          unit:'U', defaultQty:1, defaultPrice:210, trigger:'options.spotsInstallation',
          zone:'plafond', action:'pose', priceMode:'standard',
          semanticKey:'sdb.option.spots-installation', tags:['option','spots','plafond','electricite'] },

        { key:'8.3', label:'Spot encastré ETANCHE Blanc 220V - LED - BLANC CHAUD',
          unit:'U', defaultQty:1, defaultPrice:55, trigger:'options.spotEtanche',
          zone:'plafond', action:'fourniture', priceMode:'standard',
          semanticKey:'sdb.option.spot-etanche', tags:['option','fourniture','spot','etanche','led'] },

        { key:'8.4', label:'Spot encastré Blanc 220V - LED - BLANC CHAUD',
          unit:'U', defaultQty:2, defaultPrice:35, trigger:'options.spotsStandard',
          zone:'plafond', action:'fourniture', priceMode:'standard',
          semanticKey:'sdb.option.spot-standard', tags:['option','fourniture','spot','led'] },

        { key:'8.5', label:'Pose et raccordement plafonnier / applique murale (annulation si remplacé par spots)',
          unit:'U', defaultQty:-1, defaultPrice:60, trigger:'options.annulationPlafonnier', isNegative:true,
          zone:'plafond', action:'deduction', priceMode:'deduction',
          semanticKey:'sdb.option.annulation-plafonnier',
          deductionFor:'4.9',
          tags:['option','deduction','plafonnier'] }
      ]
    },

    /* ── 9. COLONNE / MEUBLE SUPPLÉMENTAIRE ── */
    {
      id: 'sec-9-meuble-supp',
      num: 9,
      title: 'Colonne de rangement / meuble supplémentaire',
      kind: 'option',
      isOption: true,
      includeInGrandTotal: false,
      items: [
        { key:'9.1', label:'Montage et pose d\'1 meuble supplémentaire',
          unit:'U', defaultQty:1, defaultPrice:90, trigger:'options.meubleSupplementaire',
          zone:'general', action:'pose', priceMode:'standard',
          semanticKey:'sdb.option.meuble-supplementaire', tags:['option','mobilier','meuble','supplementaire'] }
      ]
    },

    /* ── 10. DOUBLAGE + NICHE CARRELÉE ── */
    {
      id: 'sec-10-niche-carrelee',
      num: 10,
      title: 'Doublage + création d\'1 niche carrelée - salle de bain',
      kind: 'option',
      isOption: true,
      includeInGrandTotal: false,
      items: [
        { key:'10.1', label:'Création d\'1 coffrage en BA13 hydrofuge sur ossature métallique au droit de la douche/baignoire - Toute hauteur',
          unit:'m²', defaultQty:2, defaultPrice:220, trigger:'options.coffrageNiche',
          zone:'douche', action:'creation', priceMode:'standard',
          semanticKey:'sdb.option.coffrage-niche', tags:['option','coffrage','ba13','niche'] },

        { key:'10.2', label:'Création d\'1 niche carrelée dans coffrage avec pose baguette de finition d\'angle. NB: Niche alignée sur carrelage si possible L25-50cm / H 30cm max conseillé.',
          unit:'U', defaultQty:1, defaultPrice:450, trigger:'options.nicheCarrelee',
          zone:'douche', action:'creation', priceMode:'standard',
          semanticKey:'sdb.option.niche-carrelee', tags:['option','niche','carrelee','rangement'] },

        { key:'10.3', label:'Baguette de finition d\'angle carrelage - Alu Mat',
          unit:'U', defaultQty:1, defaultPrice:26, trigger:'options.baguetteNiche',
          zone:'douche', action:'fourniture', priceMode:'standard',
          semanticKey:'sdb.option.baguette-niche', tags:['option','fourniture','baguette','finition'] }
      ]
    },

    /* ── 11. MASQUAGE TUYAUX ── */
    {
      id: 'sec-11-masquage-tuyaux',
      num: 11,
      title: 'Masquage des tuyaux apparents',
      kind: 'option',
      isOption: true,
      includeInGrandTotal: false,
      items: [
        { key:'11.1', label:'Masquage tuyaux : création d\'1 coffrage vertical ou horizontal sur 1 pan de mur - si possible',
          unit:'U', defaultQty:1, defaultPrice:220, trigger:'options.masquageTuyaux',
          zone:'tuyaux', action:'masquage', priceMode:'standard',
          semanticKey:'sdb.option.masquage-tuyaux', tags:['option','masquage','tuyaux','coffrage'] },

        { key:'11.2', label:'Pose carrelage sur coffrage + pose baguette d\'angle carrelage',
          unit:'U', defaultQty:1, defaultPrice:240, trigger:'options.carrelageCoffrageMasquage',
          zone:'tuyaux', action:'pose', priceMode:'standard',
          semanticKey:'sdb.option.carrelage-coffrage-masquage', tags:['option','carrelage','coffrage'] }
      ]
    },

    /* ── 12. REMPLACEMENT VANNE D'ISOLEMENT ── */
    {
      id: 'sec-12-vanne-isolement',
      num: 12,
      title: 'Remplacement d\'1 vanne d\'isolement du logement',
      kind: 'option',
      isOption: true,
      includeInGrandTotal: false,
      items: [
        { key:'12.1', label:'Remplacement d\'1 vanne d\'isolement : Coupure et vidange de la colonne (accord copropriété/gardien et accès vannes immeuble nécessaire) + Fourniture et pose d\'1 vanne d\'arrêt + Mise en service et essais',
          unit:'U', defaultQty:1, defaultPrice:240, trigger:'options.remplacementVanne',
          zone:'general', action:'remplacement', priceMode:'standard',
          semanticKey:'sdb.option.vanne-isolement', tags:['option','plomberie','vanne','copro'] }
      ]
    },

    /* ── 13. ÉLECTRICITÉ SUPPLÉMENTAIRE ── */
    {
      id: 'sec-13-electricite-supp',
      num: 13,
      title: 'Electricité - si nécessaire - si non compris',
      kind: 'option',
      isOption: true,
      includeInGrandTotal: false,
      items: [
        { key:'13.1', label:'Ajout d\'1 disjoncteur différentiel 30mA 63A de type AC',
          unit:'U', defaultQty:1, defaultPrice:225, trigger:'options.disjoncteurDifferentiel',
          zone:'electrique', action:'pose', priceMode:'standard',
          semanticKey:'sdb.option.disjoncteur-differentiel', tags:['option','electricite','disjoncteur','tableau'] },

        { key:'13.2', label:'Déplacement d\'1 point électrique sur le même mur < 60cm NON PORTEUR',
          unit:'U', defaultQty:1, defaultPrice:90, trigger:'options.deplacementPointProche',
          zone:'electrique', action:'reprise', priceMode:'standard',
          semanticKey:'sdb.option.deplacement-point-proche', tags:['option','electricite','deplacement'] },

        { key:'13.3', label:'Déplacement d\'1 point électrique sur un autre mur ou à plus de 60cm et jusqu\'à 150cm',
          unit:'U', defaultQty:1, defaultPrice:135, trigger:'options.deplacementPointEloigne',
          zone:'electrique', action:'reprise', priceMode:'standard',
          semanticKey:'sdb.option.deplacement-point-eloigne', tags:['option','electricite','deplacement'] },

        { key:'13.4', label:'Pose et raccordement plafonnier / applique murale',
          unit:'U', defaultQty:1, defaultPrice:70, trigger:'options.posePlafonnierSupp',
          zone:'plafond', action:'pose', priceMode:'standard',
          semanticKey:'sdb.option.plafonnier-supp', tags:['option','electricite','plafonnier'] },

        { key:'13.5', label:'Remplacement d\'1 prise ou d\'1 interrupteur - hors fournitures',
          unit:'U', defaultQty:1, defaultPrice:15, trigger:'options.remplacementPriseInter',
          zone:'electrique', action:'remplacement', priceMode:'standard',
          semanticKey:'sdb.option.remplacement-prise-inter', tags:['option','electricite','prise','interrupteur'] }
      ]
    },

    /* ── 14. MISE EN TEINTE ── */
    {
      id: 'sec-14-mise-en-teinte',
      num: 14,
      title: 'Mise en teinte',
      kind: 'option',
      isOption: true,
      includeInGrandTotal: false,
      items: [
        { key:'14.1', label:'Mise en teinte des peintures de la pièce d\'eau',
          unit:'U', defaultQty:1, defaultPrice:180, trigger:'options.miseEnTeinte',
          zone:'general', action:'peinture', priceMode:'standard',
          semanticKey:'sdb.option.mise-en-teinte', tags:['option','peinture','teinte'] }
      ]
    },

    /* ── 15. PLACARD SUR MESURE ── */
    {
      id: 'sec-15-placard-sur-mesure',
      num: 15,
      title: 'Placard sur mesure - au-dessus des toilettes',
      kind: 'option',
      isOption: true,
      includeInGrandTotal: false,
      items: [
        { key:'15.1', label:'Création d\'1 placard sur mesures : 2 portes en MDF à peindre avec charnières + 2-3 étagères + pose des poignées (fournies par le client) + Retombée (et déport de la VMC si nécessaire) + Mise en peinture intérieur / extérieur placard',
          unit:'U', defaultQty:1, defaultPrice:520, trigger:'options.placardSurMesure',
          zone:'wc', action:'creation', priceMode:'standard',
          semanticKey:'sdb.option.placard-sur-mesure', tags:['option','placard','mdf','sur-mesure','rangement'] }
      ]
    },

    /* ── 16. ACCESSOIRES PMR ── */
    {
      id: 'sec-16-accessoires-pmr',
      num: 16,
      title: 'Accessoires PMR (Personnes à mobilité réduite)',
      kind: 'option',
      isOption: true,
      includeInGrandTotal: false,
      items: [
        { key:'16.1', label:'Pose d\'1 Poignée PMR',
          unit:'U', defaultQty:2, defaultPrice:60, trigger:'options.poigneePMR',
          zone:'general', action:'pose', priceMode:'standard',
          semanticKey:'sdb.option.poignee-pmr', tags:['option','pmr','poignee','accessibilite'] },

        { key:'16.2', label:'Pose d\'1 siège amovible PMR',
          unit:'U', defaultQty:1, defaultPrice:80, trigger:'options.siegePMR',
          zone:'douche', action:'pose', priceMode:'standard',
          semanticKey:'sdb.option.siege-pmr', tags:['option','pmr','siege','accessibilite'] },

        { key:'16.3', label:'Barre d\'appui grip antidérapant à fixer, acier inoxydable blanc, 30cm',
          unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.barre30PMR', showWhenZero:true,
          zone:'general', action:'fourniture', priceMode:'tbd',
          semanticKey:'sdb.option.barre-30-pmr', tags:['option','pmr','barre','accessibilite'] },

        { key:'16.4', label:'Barre d\'appui coudée à fixer, acier inoxydable blanc, 40cm',
          unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.barre40PMR', showWhenZero:true,
          zone:'general', action:'fourniture', priceMode:'tbd',
          semanticKey:'sdb.option.barre-40-pmr', tags:['option','pmr','barre','accessibilite'] },

        { key:'16.5', label:'Siège de douche à fixer relevable, aluminium epoxy blanc',
          unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.siegeDouchePMR', showWhenZero:true,
          zone:'douche', action:'fourniture', priceMode:'tbd',
          semanticKey:'sdb.option.siege-douche-pmr', tags:['option','pmr','siege','accessibilite'] }
      ]
    },

    /* ── 17. PORTE À GALANDAGE ── */
    {
      id: 'sec-17-porte-galandage',
      num: 17,
      title: 'Porte à galandage',
      kind: 'option',
      isOption: true,
      includeInGrandTotal: false,
      items: [
        { key:'17.1', label:'Pose porte coulissante à galandage AVEC CONSERVATION ANCIEN CADRE : châssis à galandage en applique + habillage BA13 hydro + bandes jonction et enduit + façonnage et pose porte coulissante isoplane pré-peinte + habillage + poignée et accessoires',
          unit:'U', defaultQty:1, defaultPrice:950, trigger:'options.galandageAvecCadre',
          zone:'porte', action:'pose', priceMode:'standard',
          semanticKey:'sdb.option.galandage-avec-cadre',
          altGroupId:'porte.galandage.cadre', altDefault:true,
          tags:['option','porte','galandage','menuiserie'] },

        { key:'17.2', label:'Electricité : Reprise / déplacement interrupteur / prise',
          unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.galandageElectricite', showWhenZero:true,
          zone:'electrique', action:'reprise', priceMode:'tbd',
          semanticKey:'sdb.option.galandage-electricite', tags:['option','electricite','galandage'] },

        { key:'17.3', label:'Peinture : Enduit général + peinture du panneau',
          unit:'m²', defaultQty:1, defaultPrice:0, trigger:'options.galandagePeinture', showWhenZero:true,
          zone:'porte', action:'peinture', priceMode:'tbd',
          semanticKey:'sdb.option.galandage-peinture', tags:['option','peinture','galandage'] },

        { key:'17.4', label:'Fourniture et pose plinthes en MDF à peindre',
          unit:'ml', defaultQty:1, defaultPrice:24, trigger:'options.galandagePlinthesMDF',
          zone:'porte', action:'pose', priceMode:'standard',
          semanticKey:'sdb.option.galandage-plinthes-mdf', tags:['option','plinthes','mdf','galandage'] },

        { key:'17.5', label:'Porte coulissante à galandage SANS CONSERVATION ANCIEN CADRE : dépose porte + encadrement + cloison partiellement + évacuation + montage châssis + habillage BA13 hydro intérieur/classique extérieur + façonnage et pose porte + habillage + poignée et accessoires',
          unit:'U', defaultQty:1, defaultPrice:1380, trigger:'options.galandageSansCadre',
          zone:'porte', action:'pose', priceMode:'standard',
          semanticKey:'sdb.option.galandage-sans-cadre',
          altGroupId:'porte.galandage.cadre', altDefault:false,
          tags:['option','porte','galandage','menuiserie'] },

        { key:'17.6', label:'Electricité : Reprise / déplacement interrupteur / prise',
          unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.galandage17_6', showWhenZero:true,
          zone:'electrique', action:'reprise', priceMode:'tbd',
          semanticKey:'sdb.option.galandage-electricite-2', tags:['option','electricite','galandage'] },

        { key:'17.7', label:'Peinture : Enduit général + peinture du panneau',
          unit:'m²', defaultQty:1, defaultPrice:0, trigger:'options.galandage17_7', showWhenZero:true,
          zone:'porte', action:'peinture', priceMode:'tbd',
          semanticKey:'sdb.option.galandage-peinture-2', tags:['option','peinture','galandage'] },

        { key:'17.8', label:'Fourniture et pose plinthes en MDF à peindre',
          unit:'ml', defaultQty:1, defaultPrice:24, trigger:'options.galandagePlinthesSansCadre',
          zone:'porte', action:'pose', priceMode:'standard',
          semanticKey:'sdb.option.galandage-plinthes-sans-cadre', tags:['option','plinthes','mdf','galandage'] },

        { key:'17.9', label:'Châssis porte à galandage',
          unit:'m²', defaultQty:1, defaultPrice:0, trigger:'options.galandageChassis', showWhenZero:true,
          zone:'porte', action:'fourniture', priceMode:'tbd',
          semanticKey:'sdb.option.galandage-chassis', tags:['option','fourniture','chassis'] },

        { key:'17.10', label:'Porte coulissante Isoplane Pré-peintre',
          unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.galandagePorteIso', showWhenZero:true,
          zone:'porte', action:'fourniture', priceMode:'tbd',
          semanticKey:'sdb.option.galandage-porte-iso', tags:['option','fourniture','porte','isoplane'] },

        { key:'17.11', label:'Kit habillage de porte à galandage - Finition "à peindre"',
          unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.galandageKit', showWhenZero:true,
          zone:'porte', action:'fourniture', priceMode:'tbd',
          semanticKey:'sdb.option.galandage-kit', tags:['option','fourniture','habillage'] },

        { key:'17.12', label:'Poignée encastrable à condamnation',
          unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.galandagePoignee', showWhenZero:true,
          zone:'porte', action:'fourniture', priceMode:'tbd',
          semanticKey:'sdb.option.galandage-poignee', tags:['option','fourniture','poignee'] },

        { key:'17.13', label:'Amortisseur',
          unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.galandageAmortisseur', showWhenZero:true,
          zone:'porte', action:'fourniture', priceMode:'tbd',
          semanticKey:'sdb.option.galandage-amortisseur', tags:['option','fourniture','amortisseur'] }
      ]
    },

    /* ── 18. PORTE EN APPLIQUE ── */
    {
      id: 'sec-18-porte-applique',
      num: 18,
      title: 'Porte en applique - Porte coulissante sur rail en applique mural',
      kind: 'option',
      isOption: true,
      includeInGrandTotal: false,
      items: [
        { key:'18.1', label:'Porte coulissante EN APPLIQUE SUR RAIL APPARENT : dépose ancienne porte (CONSERVATION DU CADRE) + Pose rail en applique sur le mur + Façonnage et pose porte coulissante + Pose poignée et accessoires',
          unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.porteApplique', showWhenZero:true,
          zone:'porte', action:'pose', priceMode:'tbd',
          semanticKey:'sdb.option.porte-applique', tags:['option','porte','applique','coulissante'] }
      ]
    }
  ];

  /* ─── MENTIONS LÉGALES ────────────────────────────────────────── */
  var LEGAL = {
    tvaText        : 'Le client, signataire du devis, certifie, en qualité de preneur de la prestation, que les travaux réalisés concernent des locaux à usage d\'habitation achevés depuis plus de deux ans et qu\'ils n\'ont pas eu pour effet, sur une période de deux ans au plus, de concourir à la production d\'un immeuble neuf au sens du 2° du 2 du I de l\'article 257 du CGI, ni d\'entraîner une augmentation de la surface de plancher des locaux existants supérieure à 10% et/ou qu\'ils ont la nature de travaux de rénovation énergétique. Ceci annule et remplace l\'attestation de TVA selon l\'article 278-0 bis A du CGI modifié par l\'article 41 de la loi n° 2025-127 du 14 février 2025 de finances pour 2025.',
    validityText   : 'Validité du devis : 3 mois',
    paymentMode    : 'Virement',
    paymentDelay   : 'Règlement comptant',
    depositText    : '30,00% à la signature à verser sur le compte IBAN : FR76 3000 4014 0300 0101 6001 532',
    signatureText  : 'Date et signature précédées de la mention "Devis reçu avant l\'exécution des travaux, Bon pour accord".'
  };

  /* ─── CGV (page 9) ────────────────────────────────────────────── */
  var CGV = [
    { article:'1 - VALIDITE', text:'Notre offre est valable pour une durée de 3 mois pour des travaux à effectuer dans les 3 mois de son acceptation signée du client. Toute commande passée après ce délai de 3 mois du jour de notre proposition doit entraîner une confirmation de notre part. La signature par le client du devis ou de la commande l\'engage de façon ferme et définitive. Les travaux sont expressément limités à ceux qui sont spécifiés dans l\'offre, le devis ou la commande. Les travaux supplémentaires ainsi que les travaux d\'entretien éventuels feront l\'objet d\'un devis complémentaire accepté au préalable.' },
    { article:'2 - PROPRIETE DES DEVIS ET DES PLANS', text:'Nos devis, dessins, plans, maquettes, descriptifs et documents de travail restent notre propriété exclusive. Leur communication à d\'autres entreprises ou tiers est interdite et passible de dommages-intérêts. Ils doivent être rendus s\'ils ne sont pas suivis d\'une commande.' },
    { article:'3 - DELAIS', text:'Les délais de livraison ne sont donnés qu\'à titre indicatif sauf stipulation contraire indiquée sur le devis. Nous sommes dégagés de tout engagement relatif aux délais de livraison dans le cas : où les conditions de paiement n\'ont pas été observées par le client, de retard apporté à la remise de l\'ordre d\'exécution, de modification du programme des travaux, de retard des autres corps d\'Etat, de travaux supplémentaires, où les locaux à aménager ne sont pas mis à notre disposition à la date prévue, de force majeure ou d\'événements tels que : guerre, grève de l\'entreprise ou de l\'un de ses fournisseurs, empêchement de transport, incendie, intempéries, ou encore rupture de stock du fournisseur.' },
    { article:'4 - CONDITIONS D\'EXECUTION', text:'Nous ne sommes tenus de commencer les travaux que dans le cadre des délais prévus par notre offre. La pose de nos ouvrages ne pourra s\'effectuer qu\'après achèvement des emplacements réservés à cet effet et après siccité complète de maçonneries, plâtreries, et carrelages. Pour la menuiserie : La tenue des bois dépend essentiellement du degré hygrométrique des locaux dans lesquels sont placées les menuiseries. Nous ne pourrons être tenus pour responsables des déformations, gauchissements ou retraits des bois survenus par suite de variation de taux d\'hygrométrie.' },
    { article:'5 - RECEPTIONS – RECLAMATIONS', text:'Les travaux seront réceptionnés au plus tard 15 jours après leur achèvement. A défaut de cette réception dans les 30 jours suivant l\'achèvement des travaux, ceux-ci seront considérés comme acceptés sans réserve. En cas de différend relatif à l\'exécution du contrat/marché de travaux, les Parties rechercheront, avant toute action contentieuse, un accord amiable et se communiqueront à cet effet tous les éléments d\'information nécessaires. Le Centre de la Médiation de la Consommation de Conciliateurs de Justice (CM2C) est le médiateur de la consommation désigné par l\'entreprise. En cas de litige, le client consommateur adresse une réclamation par écrit à l\'entreprise avant toute saisine éventuelle du médiateur de la consommation. En cas d\'échec de la réclamation, le client peut soumettre le différend à ce médiateur de la consommation, au plus tard un an après sa réclamation écrite, à l\'adresse suivante : CM2C - 14, rue Saint-Jean - 75017 PARIS ou en ligne sur www.cm2c.net' },
    { article:'6 - PAIEMENT', text:'Nos travaux étant entièrement exécutés sur commande, leur paiement s\'effectue comme suit : à la commande : 30 % - Acomptes suivants selon avancement des travaux sur notre demande - le solde à la date d\'échéance figurant sur la facture, sans escompte ni rabais, ni retenue de quelque nature.' },
    { article:'7 - SUSPENSION DES TRAVAUX', text:'En cas de non-observation des conditions de paiement, l\'entreprise se réserve le droit de suspendre les travaux trois jours après avoir mis le client en demeure de tenir ses engagements.' },
    { article:'8 - CLAUSES PENALES', text:'En cas de rupture du contrat, imputable au client, avant la réalisation des travaux commandés, l\'acompte versé à la commande sera conservé à titre d\'indemnisation forfaitaire. A cette somme s\'ajoutera le montant des fournitures et du matériel déjà commandés. En cas de rupture du contrat en cours de réalisation des travaux s\'ajoutera à la facturation des travaux réalisés une somme forfaitaire égale à 15% du montant TTC du devis ou de la commande. Conformément à l\'article L441-6 du code de commerce, des pénalités de retard sont obligatoirement appliquées dans le cas où les sommes dues sont versées après la date de paiement figurant sur la facture. Le taux de ces intérêts de retard est égal à 1% par mois de retard. Après mise en demeure, ils courent à partir de la date de règlement et sont calculés par mois, le mois entamé comptant pour un mois entier.' },
    { article:'9 - RESERVE DE PROPRIETE', text:'La marchandise livrée reste notre propriété jusqu\'à paiement intégral du prix. Toutefois, les risques sont transférés dès la livraison. Dans le cas où le paiement n\'interviendrait pas dans le délai prévu, nous nous réservons le droit de reprendre la chose livrée et, si bon nous semble, de résoudre le contrat.' },
    { article:'10 - ATTRIBUTION DE COMPETENCE', text:'En cas de contestation, il est fait attribution de compétences aux tribunaux du siège social de notre entreprise.' }
  ];

  /* ─── HELPERS ─────────────────────────────────────────────────── */

  /* Itère toutes les lignes du template (sections + sous-sections), sans recopie. */
  function forEachLine(cb){
    SECTIONS.forEach(function(sec){
      (sec.items || []).forEach(function(item){ cb(item, sec, null); });
      (sec.subSections || []).forEach(function(sub){
        (sub.items || []).forEach(function(item){ cb(item, sec, sub); });
      });
    });
  }

  /* Retourne la ligne pour une key donnée (ex: '5.6.3'), ou null. */
  function getLine(key){
    var found = null;
    forEachLine(function(item){ if(item.key === key && !found) found = item; });
    return found;
  }

  /* Retourne toutes les lignes d'une zone (ex: 'douche'). */
  function getLinesByZone(zone){
    var out = [];
    forEachLine(function(item){ if(item.zone === zone) out.push(item); });
    return out;
  }

  /* Retourne toutes les lignes pour une action (ex: 'depose'). */
  function getLinesByAction(action){
    var out = [];
    forEachLine(function(item){ if(item.action === action) out.push(item); });
    return out;
  }

  /* Retourne la ligne pour une semanticKey donnée (clé métier stable). */
  function getLineBySemanticKey(sk){
    var found = null;
    forEachLine(function(item){ if(item.semanticKey === sk && !found) found = item; });
    return found;
  }

  /* Retourne les lignes obligatoires (toujours présentes dans le devis). */
  function getMandatoryLines(){
    var out = [];
    forEachLine(function(item){ if(item.isMandatory) out.push(item); });
    return out;
  }

  /* Retourne les lignes négatives / déductions (pour audit cohérence). */
  function getDeductionLines(){
    var out = [];
    forEachLine(function(item){ if(item.isNegative || item.priceMode === 'deduction') out.push(item); });
    return out;
  }

  /* Retourne tous les groupes d'alternatives + les lignes de chaque groupe. */
  function getAlternativeGroups(){
    var out = {};
    Object.keys(ALTERNATIVE_GROUPS).forEach(function(gid){
      var group = ALTERNATIVE_GROUPS[gid];
      out[gid] = {
        id      : gid,
        label   : group.label,
        zone    : group.zone,
        keys    : group.keys.slice(),
        lines   : group.keys.map(getLine).filter(Boolean),
        defaultKey: (function(){
          var def = null;
          group.keys.forEach(function(k){
            var l = getLine(k);
            if(l && l.altDefault && !def) def = k;
          });
          return def;
        })()
      };
    });
    return out;
  }

  /* Total estimé du devis modèle (toutes lignes obligatoires + triggers
     activés par défaut, hors options). Sert de baseline pour debug. */
  function getDefaultGrandTotalHT(){
    var total = 0;
    SECTIONS.forEach(function(sec){
      if(!sec.includeInGrandTotal) return;
      (sec.items || []).forEach(function(item){
        if(item.displayOnly) return;
        if(item.isMandatory) total += (item.defaultQty || 0) * (item.defaultPrice || 0);
      });
      (sec.subSections || []).forEach(function(sub){
        (sub.items || []).forEach(function(item){
          if(item.displayOnly || item.isMandatory) {
            if(item.isMandatory) total += (item.defaultQty || 0) * (item.defaultPrice || 0);
          }
        });
      });
    });
    return total;
  }

  /* ─── ADAPTER LEGACY ──────────────────────────────────────────────
     Reconstruit la structure BATHROOM_TEMPLATE attendue par
     bathroom-quote.js generateLines(). Préserve les champs legacy
     (key/label/unit/defaultQty/defaultPrice/trigger/qtyFormula/
      isMandatory/displayOnly/showWhenZero/isNegative/description)
     et ignore les champs enrichis (consommés directement par les
     futurs modules via window.QUOTE_TEMPLATE_SDB). */
  function toLegacyTemplate(){
    function legacyItem(item){
      var out = {
        key          : item.key,
        label        : item.label,
        unit         : item.unit,
        defaultQty   : item.defaultQty,
        defaultPrice : item.defaultPrice
      };
      if(item.description)  out.description  = item.description;
      if(item.trigger)      out.trigger      = item.trigger;
      if(item.qtyFormula)   out.qtyFormula   = item.qtyFormula;
      if(item.isMandatory)  out.isMandatory  = true;
      if(item.displayOnly)  out.displayOnly  = true;
      if(item.showWhenZero) out.showWhenZero = true;
      if(item.isNegative)   out.isNegative   = true;
      return out;
    }
    function legacySection(sec){
      var out = {
        id       : sec.id,
        num      : sec.num,
        title    : sec.title,
        isOption : !!sec.isOption
      };
      if(sec.isFourniture) out.isFourniture = true;
      if(sec.subSections){
        out.subSections = sec.subSections.map(function(sub){
          return {
            id    : sub.id,
            num   : sub.num,
            title : sub.title,
            items : (sub.items || []).map(legacyItem)
          };
        });
      }
      if(sec.items){
        out.items = sec.items.map(legacyItem);
      }
      return out;
    }

    return {
      templateId      : META.templateId,
      name            : 'Rénovation salle de bain — modèle complet',
      description     : 'Modèle de devis fidèle au standard AJ PRO RÉNOVATION pour la rénovation complète d\'une salle de bain, incluant démolition, plomberie, électricité, carrelage, mobilier, fournitures et 12 lots optionnels.',
      type            : META.pieceType,
      version         : 1,
      createdAt       : META.createdAt,
      sourceDevis     : '$002612',
      vatRate         : META.vatRate,
      depositPct      : META.depositPct,
      validityMonths  : META.validityMonths,
      paymentMode     : META.paymentMode,
      paymentDelay    : META.paymentDelay,
      numberingType   : META.numberingType,
      sections        : SECTIONS.map(legacySection),
      legalMentions   : LEGAL,
      cgv             : CGV
    };
  }

  /* ─── EXPOSE ─────────────────────────────────────────────────── */
  window.QUOTE_TEMPLATE_SDB = {
    /* Données canoniques */
    meta              : META,
    sections          : SECTIONS,
    legal             : LEGAL,
    cgv               : CGV,
    alternativeGroups : ALTERNATIVE_GROUPS,

    /* Helpers */
    forEachLine          : forEachLine,
    getLine              : getLine,
    getLinesByZone       : getLinesByZone,
    getLinesByAction     : getLinesByAction,
    getLineBySemanticKey : getLineBySemanticKey,
    getMandatoryLines    : getMandatoryLines,
    getDeductionLines    : getDeductionLines,
    getAlternativeGroups : getAlternativeGroups,
    getDefaultGrandTotalHT: getDefaultGrandTotalHT,

    /* Adapter compat bathroom-quote.js */
    toLegacy             : toLegacyTemplate
  };

  /* Stat de chargement (utile pour vérifier la fondation) */
  var lineCount = 0;
  forEachLine(function(){ lineCount++; });
  console.log('[QUOTE_TEMPLATE_SDB] Template canonique chargé · ' +
              SECTIONS.length + ' sections · ' + lineCount + ' lignes · ' +
              Object.keys(ALTERNATIVE_GROUPS).length + ' groupes d\'alternatives · v' + META.templateVersion);
})();
