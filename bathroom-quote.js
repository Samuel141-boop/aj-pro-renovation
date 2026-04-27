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
     TEMPLATE COMPLET — 18 sections, ~120 lignes transcrites du PDF
     ───────────────────────────────────────────────────────────────── */
  var BATHROOM_TEMPLATE = {
    templateId: 'sdb-renovation-complete-v1',
    name: 'Rénovation salle de bain — modèle complet',
    description: 'Modèle de devis fidèle au standard AJ PRO RÉNOVATION pour la rénovation complète d\'une salle de bain, incluant démolition, plomberie, électricité, carrelage, mobilier, fournitures et 12 lots optionnels.',
    type: 'salle-de-bain',
    version: 1,
    createdAt: '2026-04-20',
    sourceDevis: '$002612',

    /* Paramètres devis par défaut */
    vatRate: 10,           /* TVA rénovation logement > 2 ans (art. 278-0 bis A CGI) */
    depositPct: 30,        /* acompte 30% à la signature */
    validityMonths: 3,     /* validité du devis */
    paymentMode: 'Virement',
    paymentDelay: 'Règlement comptant',

    /* Numérotation : géré par le système Phase Légal (DEV-2026-XXX) */
    numberingType: 'devis',

    /* ═══════════════════════════════════════════════════════════════
       SECTIONS PRINCIPALES (1 à 6) — entrent dans le total HT
       ═══════════════════════════════════════════════════════════════ */
    sections: [

      /* ── 1. COMMENTAIRES (avertissements client, 0€) ── */
      {
        id: 'sec-1-commentaires',
        num: 1,
        title: 'Commentaires',
        isOption: false,
        items: [
          {
            key: '1.1',
            label: 'Avertissements travaux',
            description: 'Vérifier le bon fonctionnement des vannes d\'arrêt du logement AVANT notre intervention. Malgré tout le soin que nous apportons à notre travail, la dépose de carrelage peut entrainer des dégâts sur les enduits et peinture des pièces attenantes ; si c\'est le cas, des travaux de réparations et de peinture devront être évalués.',
            unit: 'U',
            defaultQty: 1,
            defaultPrice: 0,
            isMandatory: true,
            displayOnly: true
          }
        ]
      },

      /* ── 2. DÉMOLITION / MAÇONNERIE / PLÂTRERIE / PEINTURE / MENUISERIES ── */
      {
        id: 'sec-2-demolition',
        num: 2,
        title: 'Salle de bain - Démolition, maçonnerie, plâtrerie, peinture et menuiseries',
        isOption: false,
        items: [
          { key:'2.1',  label:'Protection des sols et des accès, nettoyage usuel de fin de chantier', unit:'U', defaultQty:1, defaultPrice:100, isMandatory:true },
          { key:'2.2',  label:'Dépose des appareils sanitaires et du mobilier sans conservation',     unit:'U', defaultQty:1, defaultPrice:300, trigger:'demolition.deposeSanitaires' },
          { key:'2.3',  label:'Dépose des toilettes suspendues',                                       unit:'U', defaultQty:1, defaultPrice:0,   trigger:'demolition.deposeWcSuspendu', showWhenZero:true },
          { key:'2.4',  label:'Dépose carrelage mural et des plinthes',                                unit:'U', defaultQty:1, defaultPrice:0,   trigger:'demolition.deposeCarrelageMural', showWhenZero:true },
          { key:'2.5',  label:'Dépose des coffrages tuyaux',                                           unit:'U', defaultQty:1, defaultPrice:80,  trigger:'demolition.deposeCoffrages' },
          { key:'2.6',  label:'Evacuation des gravats et mise en déchetterie',                         unit:'U', defaultQty:1, defaultPrice:160, isMandatory:true },
          { key:'2.7',  label:'Reprise des alignements des murs suite à démolition',                   unit:'U', defaultQty:1, defaultPrice:220, trigger:'demolition.repriseAlignements' },
          { key:'2.8',  label:'Reprise des murs avec BA13 hydro suite à dépose carrelage',             unit:'m²', defaultQty:1, defaultPrice:90,  trigger:'demolition.ba13Hydro', qtyFormula:'ba13Surface' },
          { key:'2.9',  label:'Douche: Création d\'un tablier receveur avec trappe de contrôle',       unit:'U', defaultQty:1, defaultPrice:120, trigger:'douche.tablier' },
          { key:'2.10', label:'Douche: Création d\'une margelle alignée sur le receveur',              unit:'U', defaultQty:1, defaultPrice:100, trigger:'douche.margelle' },
          { key:'2.11', label:'Baignoire: Création d\'un tablier de baignoire avec trappe d\'accès à carreler', unit:'U', defaultQty:1, defaultPrice:250, trigger:'baignoire.tablier' },
          { key:'2.12', label:'Baignoire: Création d\'une margelle alignée sur baignoire',             unit:'U', defaultQty:1, defaultPrice:100, trigger:'baignoire.margelle' },
          { key:'2.13', label:'Toilettes suspendues: Habillage du châssis (hors enduit/peinture)',     unit:'U', defaultQty:1, defaultPrice:270, trigger:'wc.suspendu.habillage' },
          { key:'2.14', label:'Coffrage vertical toute hauteur pour masquer colonne d\'eau',           unit:'U', defaultQty:1, defaultPrice:220, trigger:'maconnerie.coffrageVertical' },
          { key:'2.15', label:'Coffrage horizontal pour masquer tuyaux',                               unit:'U', defaultQty:1, defaultPrice:220, trigger:'maconnerie.coffrageHorizontal' },
          { key:'2.16', label:'Pose carrelage sol - pose droite - carrelage de type 60x60cm',          unit:'m²', defaultQty:1, defaultPrice:140, trigger:'carrelage.sol', qtyFormula:'surfaceSol' },
          { key:'2.17', label:'Plinthes carrelage : Pose des plinthes assorties carrelage sol',        unit:'ml', defaultQty:1, defaultPrice:28, trigger:'carrelage.plinthes', qtyFormula:'plinthesML' },
          { key:'2.18', label:'Pose barre de seuil',                                                    unit:'U', defaultQty:1, defaultPrice:25, trigger:'carrelage.barreSeuil' },
          { key:'2.19', label:'Carrelage mural : Pose carrelage mural - pose droite - toute hauteur - 30x60cm (mur de la vasque, murs intérieurs baignoire/receveur, arrêt au droit de l\'espace bain/douche)', unit:'m²', defaultQty:12, defaultPrice:140, trigger:'carrelage.mural', qtyFormula:'surfaceMurale' },
          { key:'2.20', label:'Carrelage tablier : Pose carrelage tablier',                            unit:'U', defaultQty:1, defaultPrice:90, trigger:'carrelage.poseTablier' },
          { key:'2.21', label:'Carrelage margelle : Pose carrelage margelle',                          unit:'U', defaultQty:1, defaultPrice:90, trigger:'carrelage.poseMargelle' },
          { key:'2.22', label:'Carrelage tablier + margelle : Pose carrelage tablier + margelle',      unit:'U', defaultQty:1, defaultPrice:90, trigger:'carrelage.poseTablierMargelle' },
          { key:'2.23', label:'Baguette de finition d\'angle carrelage',                               unit:'U', defaultQty:1, defaultPrice:30, trigger:'carrelage.baguetteFinition' },
          { key:'2.24', label:'Meuble sous-vasque : Montage et pose d\'1 meuble sous vasque',          unit:'U', defaultQty:1, defaultPrice:250, trigger:'vasque.meuble' },
          { key:'2.25', label:'Miroir / Armoire de toilettes : Pose d\'1 Miroir / Armoire de toilettes', unit:'U', defaultQty:1, defaultPrice:80, trigger:'vasque.miroir' },
          { key:'2.26', label:'Colonne de rangement / rangement supplémentaire : Montage et pose d\'1 colonne de rangement', unit:'U', defaultQty:1, defaultPrice:90, trigger:'vasque.colonneRangement' },
          { key:'2.27', label:'Remplacement d\'1 bouche de ventilation',                               unit:'U', defaultQty:1, defaultPrice:20, trigger:'ventilation.boucheVMC' },
          { key:'2.28', label:'Pose accessoires',                                                       unit:'U', defaultQty:1, defaultPrice:80, trigger:'vasque.accessoires' },
          { key:'2.29', label:'Peinture salle de bain : Préparation des supports avant peinture + mise en peinture Blanc satiné - pièce humide', unit:'U', defaultQty:1, defaultPrice:750, trigger:'peinture.complete' }
        ]
      },

      /* ── 3. PLOMBERIE ── */
      {
        id: 'sec-3-plomberie',
        num: 3,
        title: 'Salle de bain - Plomberie',
        isOption: false,
        items: [
          { key:'3.1',  label:'Receveur de douche : Création des arrivées EC EF et Evacuation du receveur (saignée cloison) + Pose et raccordement d\'1 receveur de douche sur pieds + Pose et raccordement robinet / colonne de douche', unit:'U', defaultQty:1, defaultPrice:1200, trigger:'douche.plomberie' },
          { key:'3.2',  label:'Paroi / porte de douche : Montage et pose d\'1 paroi/porte de douche', unit:'U', defaultQty:1, defaultPrice:280, trigger:'douche.paroi' },
          { key:'3.3',  label:'Baignoire : Création des arrivées EC EF et Evacuation de la baignoire + Pose et raccordement d\'1 baignoire sur pieds + Pose et raccordement robinet / colonne de douche', unit:'U', defaultQty:1, defaultPrice:1200, trigger:'baignoire.plomberie' },
          { key:'3.4',  label:'Ecran de baignoire : Montage et pose d\'1 écran de baignoire', unit:'U', defaultQty:1, defaultPrice:95, trigger:'baignoire.ecran' },
          { key:'3.5',  label:'Electroménager Lave-linge : Création arrivée EF et Evacuation Lave Linge - hors branchement', unit:'U', defaultQty:1, defaultPrice:180, trigger:'plomberie.laveLinge' },
          { key:'3.6',  label:'Electroménager Sèche-linge : Création Evacuation Sèche Linge - hors branchement', unit:'U', defaultQty:1, defaultPrice:80, trigger:'plomberie.secheLinge' },
          { key:'3.7',  label:'Toilettes suspendues : Reprise des arrivées EF et Evacuation + Pose châssis avec renforts + Pose cuvette suspendue avec abattant et plaque de déclenchement', unit:'U', defaultQty:1, defaultPrice:630, trigger:'wc.suspendu.plomberie' },
          { key:'3.8',  label:'Toilettes à poser : Reprise des arrivées EF et Evacuation + Pose et raccordement des toilettes + Pose abattant', unit:'U', defaultQty:1, defaultPrice:280, trigger:'wc.aPoser.plomberie' },
          { key:'3.9',  label:'Vasque SIMPLE : Reprise des arrivées EC EF et Evacuation vasque + Pose et raccordement vasque avec robinetterie', unit:'U', defaultQty:1, defaultPrice:350, trigger:'vasque.plomberie.simple' },
          { key:'3.10', label:'Vasque DOUBLE : Reprise des arrivées EC EF et Evacuation vasques doubles + Pose et raccordement vasques doubles avec robinetteries', unit:'U', defaultQty:1, defaultPrice:450, trigger:'vasque.plomberie.double' },
          { key:'3.11', label:'Remplacement d\'1 Sèche-serviettes - Chaudière INDIVIDUELLE : Vidange du réseau, dépose radiateur, modification du raccordement, pose et raccordement, purge et essais', unit:'U', defaultQty:1, defaultPrice:350, trigger:'plomberie.secheServiettesIndiv' },
          { key:'3.12', label:'Remplacement d\'1 Sèche-serviettes - Chaudière COLLECTIVE : Vidange du réseau, dépose radiateur, modification du raccordement, pose et raccordement, purge et essais. NB : Intervention chauffagiste de l\'immeuble nécessaire avant et après notre intervention.', unit:'U', defaultQty:1, defaultPrice:450, trigger:'plomberie.secheServiettesColl' },
          { key:'3.13', label:'Remplacement / Déplacement d\'1 Ballon électrique : Dépose ancien ballon + évacuation, reprise des arrivées EC EF et Evacuation, reprise de la ligne électrique, pose et raccordement, mise en eau et essais', unit:'U', defaultQty:1, defaultPrice:450, trigger:'plomberie.ballonElectrique' }
        ]
      },

      /* ── 4. ÉLECTRICITÉ ── */
      {
        id: 'sec-4-electricite',
        num: 4,
        title: 'Salle de bain - Electricité',
        isOption: false,
        items: [
          { key:'4.1',  label:'Mise en sécurité électrique de la pièce', unit:'U', defaultQty:1, defaultPrice:0, isMandatory:true, displayOnly:true, showWhenZero:true },
          { key:'4.2',  label:'Reprise ligne pour déplacement d\'1 Prise électrique crédence', unit:'U', defaultQty:1, defaultPrice:90, trigger:'electricite.priseCredence' },
          { key:'4.3',  label:'Reprise ligne électrique pour éclairage plafond', unit:'U', defaultQty:1, defaultPrice:135, trigger:'electricite.eclairagePlafond' },
          { key:'4.4',  label:'Reprise ligne électrique pour éclairage miroir - Hauteur 180cm', unit:'U', defaultQty:1, defaultPrice:90, trigger:'electricite.eclairageMiroir' },
          { key:'4.5',  label:'Reprise ligne électrique pour déplacement Radiateur électrique', unit:'U', defaultQty:1, defaultPrice:135, trigger:'electricite.radiateur' },
          { key:'4.6',  label:'Reprise ligne électrique pour alimentation extracteur d\'air', unit:'U', defaultQty:1, defaultPrice:135, trigger:'electricite.extracteur' },
          { key:'4.7',  label:'Reprise ligne électrique pour alimentation appareil électroménager', unit:'U', defaultQty:1, defaultPrice:135, trigger:'electricite.electromenager' },
          { key:'4.8',  label:'Pose et raccordement éclairage miroir', unit:'U', defaultQty:1, defaultPrice:60, trigger:'electricite.poseEclairageMiroir' },
          { key:'4.9',  label:'Pose et raccordement plafonnier / applique murale', unit:'U', defaultQty:1, defaultPrice:70, trigger:'electricite.posePlafonnier' },
          { key:'4.10', label:'Pose et raccordement extracteur d\'air', unit:'U', defaultQty:1, defaultPrice:60, trigger:'electricite.poseExtracteur' },
          { key:'4.11', label:'Pose et raccordement d\'1 sèche-serviettes électrique', unit:'U', defaultQty:1, defaultPrice:80, trigger:'electricite.poseSecheServiettesElec' }
        ]
      },

      /* ── 5. FOURNITURES (8 sous-catégories) ── */
      {
        id: 'sec-5-fournitures',
        num: 5,
        title: 'Salle de bain - Fournitures (Budget à préciser en fonction des choix du client)',
        isOption: false,
        isFourniture: true,
        subSections: [

          { id:'5.1', num:'5.1', title:'Carrelage', items:[
            { key:'5.1.1', label:'Carrelage sol (y compris chutes)',                              unit:'m²', defaultQty:1, defaultPrice:30, trigger:'fournitures.carrelageSol', qtyFormula:'surfaceSolAvecChutes' },
            { key:'5.1.2', label:'Plinthes assorties au carrelage sol (y compris chutes)',        unit:'ml', defaultQty:1, defaultPrice:12, trigger:'fournitures.plinthesCarrelage', qtyFormula:'plinthesMLAvecChutes' },
            { key:'5.1.3', label:'Carrelage coffrage et tablier receveur (y compris chutes) - inclus dans le sol', unit:'m²', defaultQty:1, defaultPrice:0, trigger:'fournitures.carrelageCoffrage', showWhenZero:true },
            { key:'5.1.4', label:'Carrelage mural (y compris chutes)',                            unit:'m²', defaultQty:1, defaultPrice:35, trigger:'fournitures.carrelageMural', qtyFormula:'surfaceMuraleAvecChutes' }
          ]},

          { id:'5.2', num:'5.2', title:'Douche', items:[
            { key:'5.2.1', label:'Receveur de douche extraplat - 80x120cm',                       unit:'U', defaultQty:1, defaultPrice:240, trigger:'fournitures.receveurDouche' },
            { key:'5.2.2', label:'Vidage receveur Capot Chromé - type "TurboFlow" - Ecoulement très rapide', unit:'U', defaultQty:1, defaultPrice:67, trigger:'fournitures.vidageReceveur' },
            { key:'5.2.3', label:'Lot de 2 Pieds réglables pour receveur de douche',              unit:'U', defaultQty:5, defaultPrice:15, trigger:'fournitures.piedsReceveur' },
            { key:'5.2.4', label:'Lot de 2 réhausses pour pieds receveur',                        unit:'U', defaultQty:5, defaultPrice:9.50, trigger:'fournitures.rehausesReceveur' },
            { key:'5.2.5', label:'Grille de contrôle / ventilation',                              unit:'U', defaultQty:1, defaultPrice:17, trigger:'fournitures.grilleControle' },
            { key:'5.2.6', label:'Mitigeur de douche - HANSGROHE',                                unit:'U', defaultQty:1, defaultPrice:149, trigger:'fournitures.mitigeurDouche' },
            { key:'5.2.7', label:'Kit Barre de douche avec pommeau et flexible',                  unit:'U', defaultQty:1, defaultPrice:69, trigger:'fournitures.kitBarreDouche' },
            { key:'5.2.8', label:'Paroi de douche Fixe - Verre Transparent - Profilés Chromés brillants - L80cm', unit:'U', defaultQty:1, defaultPrice:190, trigger:'fournitures.paroiFixe' },
            { key:'5.2.9', label:'Paroi de douche pivotante - Déflecteur L40cm',                  unit:'U', defaultQty:1, defaultPrice:130, trigger:'fournitures.paroiPivotante' }
          ]},

          { id:'5.3', num:'5.3', title:'Baignoire', items:[
            { key:'5.3.1', label:'Baignoire acrylique renforcée Blanche 170cmx70cm avec pieds',   unit:'U', defaultQty:1, defaultPrice:190, trigger:'fournitures.baignoire' },
            { key:'5.3.2', label:'Vidage automatique baignoire avec capot ABS Chromé HANSGROHE',  unit:'U', defaultQty:1, defaultPrice:75.30, trigger:'fournitures.vidageBaignoire' },
            { key:'5.3.3', label:'Lot de 2 Colonnettes Chromées LUXE',                            unit:'U', defaultQty:1, defaultPrice:49, trigger:'fournitures.colonnettes' },
            { key:'5.3.4', label:'Trappe d\'accès à carreler',                                    unit:'U', defaultQty:1, defaultPrice:67, trigger:'fournitures.trappeAcces' },
            { key:'5.3.5', label:'Mitigeur de Bain/Douche - Chromé - HANSGROHE',                  unit:'U', defaultQty:1, defaultPrice:179, trigger:'fournitures.mitigeurBain' },
            { key:'5.3.6', label:'Kit Barre de douche avec pommeau et flexible',                  unit:'U', defaultQty:1, defaultPrice:69, trigger:'fournitures.kitBarreDoucheBaignoire' },
            { key:'5.3.7', label:'Ecran de baignoire L70cm H140cm',                               unit:'U', defaultQty:1, defaultPrice:99, trigger:'fournitures.ecranBaignoire' }
          ]},

          { id:'5.4', num:'5.4', title:'Mobilier', items:[
            { key:'5.4.1', label:'Meuble Sous-Vasque - Valider nécessité renforts avec PIEDS - L 80CM', unit:'U', defaultQty:1, defaultPrice:350, trigger:'fournitures.meubleSousVasque' },
            { key:'5.4.2', label:'Vasque compatible avec le meuble sous vasque',                  unit:'U', defaultQty:1, defaultPrice:120, trigger:'fournitures.vasque' },
            { key:'5.4.3', label:'Lot de 2 pieds pour Meuble vasque - Nécessaire si mur NON PORTEUR', unit:'U', defaultQty:1, defaultPrice:29, trigger:'fournitures.piedsMeuble' },
            { key:'5.4.4', label:'Colonne de rangement L30cm H180cm',                             unit:'U', defaultQty:1, defaultPrice:160, trigger:'fournitures.colonne' },
            { key:'5.4.5', label:'Mitigeur Lavabo - HANSGROHE',                                   unit:'U', defaultQty:1, defaultPrice:89, trigger:'fournitures.mitigeurLavabo' },
            { key:'5.4.6', label:'Déport Siphon - Gain de place',                                 unit:'U', defaultQty:1, defaultPrice:19, trigger:'fournitures.deportSiphon' },
            { key:'5.4.7', label:'Bonde Automatique Chromée',                                     unit:'U', defaultQty:1, defaultPrice:25, trigger:'fournitures.bondeAuto' },
            { key:'5.4.8', label:'Miroir - SANS ECLAIRAGE',                                       unit:'U', defaultQty:1, defaultPrice:80, trigger:'fournitures.miroirSansEclairage' },
            { key:'5.4.9', label:'Eclairage Miroir L30cm Chromé Brillant - LED',                  unit:'U', defaultQty:1, defaultPrice:55, trigger:'fournitures.eclairageMiroir' }
          ]},

          { id:'5.5', num:'5.5', title:'Radiateur', items:[
            { key:'5.5.1', label:'Sèche-Serviettes Eau chaude - Eprouvé 6-8 bars à valider avec le chauffagiste de l\'immeuble', unit:'U', defaultQty:1, defaultPrice:280, trigger:'fournitures.secheServiettesEauChaude' },
            { key:'5.5.2', label:'Tés de raccordement + robinet thermostatique radiateur',        unit:'U', defaultQty:1, defaultPrice:67, trigger:'fournitures.tesRaccordement' },
            { key:'5.5.3', label:'Sèche-Serviettes Electrique L50CM H100CM - 500W',               unit:'U', defaultQty:1, defaultPrice:180, trigger:'fournitures.secheServiettesElec' }
          ]},

          { id:'5.6', num:'5.6', title:'Toilettes', items:[
            { key:'5.6.1', label:'CHASSIS SUSPENDU GEBERIT UP320',                                unit:'U', defaultQty:0, defaultPrice:290, trigger:'fournitures.chassisGeberit', showWhenZero:true },
            { key:'5.6.2', label:'Plaque de déclenchement Coloris Blanc SIGMA',                   unit:'U', defaultQty:0, defaultPrice:69, trigger:'fournitures.plaqueSigma', showWhenZero:true },
            { key:'5.6.3', label:'Plaque de déclenchement WC Duofix Sigma 20 blanc contours boutons chromés', unit:'U', defaultQty:1, defaultPrice:115, trigger:'fournitures.plaqueSigma20' },
            { key:'5.6.4', label:'Cuvette suspendue carénée avec abattant frein de chute',        unit:'U', defaultQty:1, defaultPrice:180, trigger:'fournitures.cuvetteSuspendue' },
            { key:'5.6.5', label:'Pack WC à poser avec abattant frein de chute',                  unit:'U', defaultQty:1, defaultPrice:180, trigger:'fournitures.packWcAPoser' }
          ]},

          { id:'5.7', num:'5.7', title:'Ballon électrique', items:[
            { key:'5.7.1', label:'Ballon électrique',                                              unit:'U', defaultQty:1, defaultPrice:0, trigger:'fournitures.ballonElectrique', showWhenZero:true },
            { key:'5.7.2', label:'Groupe de sécurité',                                             unit:'U', defaultQty:1, defaultPrice:35, trigger:'fournitures.groupeSecurite' },
            { key:'5.7.3', label:'Siphon Ballon électrique',                                       unit:'U', defaultQty:1, defaultPrice:12, trigger:'fournitures.siphonBallon' },
            { key:'5.7.4', label:'Raccords di-électriques - diminution corrosion / calcaire',     unit:'U', defaultQty:2, defaultPrice:12.30, trigger:'fournitures.raccordsDiElec' }
          ]},

          { id:'5.8', num:'5.8', title:'Accessoires divers', items:[
            { key:'5.8.1',  label:'Barre de seuil',                                                unit:'U', defaultQty:1, defaultPrice:20, trigger:'fournitures.barreSeuil' },
            { key:'5.8.2',  label:'Baguette de finition d\'angle carrelage - Alu mat',             unit:'U', defaultQty:1, defaultPrice:26, trigger:'fournitures.baguetteFinition' },
            { key:'5.8.3',  label:'Prise électrique simple LEGRAND Céliane Blanc',                 unit:'U', defaultQty:1, defaultPrice:14.63, trigger:'fournitures.priseSimple' },
            { key:'5.8.4',  label:'Prise électrique double LEGRAND Céliane Blanc',                 unit:'U', defaultQty:1, defaultPrice:34.20, trigger:'fournitures.priseDouble' },
            { key:'5.8.5',  label:'Interrupteur Simple LEGRAND Céliane Blanc',                     unit:'U', defaultQty:1, defaultPrice:17.44, trigger:'fournitures.interSimple' },
            { key:'5.8.6',  label:'Interrupteur Double LEGRAND Céliane Blanc',                     unit:'U', defaultQty:1, defaultPrice:32.51, trigger:'fournitures.interDouble' },
            { key:'5.8.7',  label:'Prise saillie SIMPLE',                                          unit:'U', defaultQty:1, defaultPrice:12.50, trigger:'fournitures.priseSaillieSimple' },
            { key:'5.8.8',  label:'Prise saillie DOUBLE',                                          unit:'U', defaultQty:1, defaultPrice:22.90, trigger:'fournitures.priseSaillieDouble' },
            { key:'5.8.9',  label:'Bouche d\'aération VMC',                                        unit:'U', defaultQty:1, defaultPrice:29, trigger:'fournitures.boucheVMC' },
            { key:'5.8.10', label:'Grille de contrôle / ventilation',                              unit:'U', defaultQty:1, defaultPrice:17, trigger:'fournitures.grilleControleAcc' },
            { key:'5.8.11', label:'Extracteur d\'air Hygrométrique',                               unit:'U', defaultQty:1, defaultPrice:159, trigger:'fournitures.extracteurHygro' },
            { key:'5.8.12', label:'Plafonnier / Applique murale → fourni / client',                 unit:'U', defaultQty:1, defaultPrice:0, trigger:'fournitures.plafonnierFourniClient', showWhenZero:true },
            { key:'5.8.13', label:'Patères / porte-serviettes / porte savon → fourni / client',     unit:'U', defaultQty:1, defaultPrice:0, trigger:'fournitures.pateresFourniClient', showWhenZero:true }
          ]}
        ]
      },

      /* ── 6. LIVRAISON ── */
      {
        id: 'sec-6-livraison',
        num: 6,
        title: 'LIVRAISON',
        isOption: false,
        items: [
          { key:'6.1', label:'Participation aux frais de livraison - y compris acheminement dans le logement', unit:'U', defaultQty:1, defaultPrice:200, isMandatory:true }
        ]
      },

      /* ═══════════════════════════════════════════════════════════════
         OPTIONS (7 à 18) — non incluses dans le total HT
         ═══════════════════════════════════════════════════════════════ */

      /* ── 7. DÉPOSE CARRELAGE SOL (Option) ── */
      {
        id: 'sec-7-depose-carrelage-sol',
        num: 7,
        title: 'Dépose carrelage sol - salle de bain',
        isOption: true,
        items: [
          { key:'7.1', label:'Dépose carrelage sol / Evacuation des gravats / mise en déchetterie / Ragréage du sol avant carrelage', unit:'U', defaultQty:1, defaultPrice:450, trigger:'options.deposeCarrelageSol' }
        ]
      },

      /* ── 8. PLAFOND SUSPENDU (Option) ── */
      {
        id: 'sec-8-plafond-suspendu',
        num: 8,
        title: 'Plafond suspendu - salle de bain',
        isOption: true,
        items: [
          { key:'8.1', label:'Création d\'1 plafond suspendu : ossature métallique + plaques de plâtre + bandes de jonction Placo', unit:'m²', defaultQty:3, defaultPrice:210, trigger:'options.plafondSuspendu', qtyFormula:'surfacePlafond' },
          { key:'8.2', label:'Installation de spots encastrés dans le faux plafond - y compris fournitures - Reprise distribution électrique des spots', unit:'U', defaultQty:1, defaultPrice:210, trigger:'options.spotsInstallation' },
          { key:'8.3', label:'Spot encastré ETANCHE Blanc 220V - LED - BLANC CHAUD',                  unit:'U', defaultQty:1, defaultPrice:55, trigger:'options.spotEtanche' },
          { key:'8.4', label:'Spot encastré Blanc 220V - LED - BLANC CHAUD',                          unit:'U', defaultQty:2, defaultPrice:35, trigger:'options.spotsStandard' },
          { key:'8.5', label:'Pose et raccordement plafonnier / applique murale (annulation si remplacé par spots)', unit:'U', defaultQty:-1, defaultPrice:60, trigger:'options.annulationPlafonnier', isNegative:true }
        ]
      },

      /* ── 9. COLONNE DE RANGEMENT / MEUBLE SUPPLÉMENTAIRE (Option) ── */
      {
        id: 'sec-9-meuble-supp',
        num: 9,
        title: 'Colonne de rangement / meuble supplémentaire',
        isOption: true,
        items: [
          { key:'9.1', label:'Montage et pose d\'1 meuble supplémentaire', unit:'U', defaultQty:1, defaultPrice:90, trigger:'options.meubleSupplementaire' }
        ]
      },

      /* ── 10. DOUBLAGE + NICHE CARRELÉE (Option) ── */
      {
        id: 'sec-10-niche-carrelee',
        num: 10,
        title: 'Doublage + création d\'1 niche carrelée - salle de bain',
        isOption: true,
        items: [
          { key:'10.1', label:'Création d\'1 coffrage en BA13 hydrofuge sur ossature métallique au droit de la douche/baignoire - Toute hauteur', unit:'m²', defaultQty:2, defaultPrice:220, trigger:'options.coffrageNiche' },
          { key:'10.2', label:'Création d\'1 niche carrelée dans coffrage avec pose baguette de finition d\'angle. NB: Niche alignée sur carrelage si possible L25-50cm / H 30cm max conseillé.', unit:'U', defaultQty:1, defaultPrice:450, trigger:'options.nicheCarrelee' },
          { key:'10.3', label:'Baguette de finition d\'angle carrelage - Alu Mat', unit:'U', defaultQty:1, defaultPrice:26, trigger:'options.baguetteNiche' }
        ]
      },

      /* ── 11. MASQUAGE TUYAUX (Option) ── */
      {
        id: 'sec-11-masquage-tuyaux',
        num: 11,
        title: 'Masquage des tuyaux apparents',
        isOption: true,
        items: [
          { key:'11.1', label:'Masquage tuyaux : création d\'1 coffrage vertical ou horizontal sur 1 pan de mur - si possible', unit:'U', defaultQty:1, defaultPrice:220, trigger:'options.masquageTuyaux' },
          { key:'11.2', label:'Pose carrelage sur coffrage + pose baguette d\'angle carrelage', unit:'U', defaultQty:1, defaultPrice:240, trigger:'options.carrelageCoffrageMasquage' }
        ]
      },

      /* ── 12. REMPLACEMENT VANNE D'ISOLEMENT (Option) ── */
      {
        id: 'sec-12-vanne-isolement',
        num: 12,
        title: 'Remplacement d\'1 vanne d\'isolement du logement',
        isOption: true,
        items: [
          { key:'12.1', label:'Remplacement d\'1 vanne d\'isolement : Coupure et vidange de la colonne (accord copropriété/gardien et accès vannes immeuble nécessaire) + Fourniture et pose d\'1 vanne d\'arrêt + Mise en service et essais', unit:'U', defaultQty:1, defaultPrice:240, trigger:'options.remplacementVanne' }
        ]
      },

      /* ── 13. ÉLECTRICITÉ SUPPLÉMENTAIRE (Option) ── */
      {
        id: 'sec-13-electricite-supp',
        num: 13,
        title: 'Electricité - si nécessaire - si non compris',
        isOption: true,
        items: [
          { key:'13.1', label:'Ajout d\'1 disjoncteur différentiel 30mA 63A de type AC', unit:'U', defaultQty:1, defaultPrice:225, trigger:'options.disjoncteurDifferentiel' },
          { key:'13.2', label:'Déplacement d\'1 point électrique sur le même mur < 60cm NON PORTEUR', unit:'U', defaultQty:1, defaultPrice:90, trigger:'options.deplacementPointProche' },
          { key:'13.3', label:'Déplacement d\'1 point électrique sur un autre mur ou à plus de 60cm et jusqu\'à 150cm', unit:'U', defaultQty:1, defaultPrice:135, trigger:'options.deplacementPointEloigne' },
          { key:'13.4', label:'Pose et raccordement plafonnier / applique murale', unit:'U', defaultQty:1, defaultPrice:70, trigger:'options.posePlafonnierSupp' },
          { key:'13.5', label:'Remplacement d\'1 prise ou d\'1 interrupteur - hors fournitures', unit:'U', defaultQty:1, defaultPrice:15, trigger:'options.remplacementPriseInter' }
        ]
      },

      /* ── 14. MISE EN TEINTE (Option) ── */
      {
        id: 'sec-14-mise-en-teinte',
        num: 14,
        title: 'Mise en teinte',
        isOption: true,
        items: [
          { key:'14.1', label:'Mise en teinte des peintures de la pièce d\'eau', unit:'U', defaultQty:1, defaultPrice:180, trigger:'options.miseEnTeinte' }
        ]
      },

      /* ── 15. PLACARD SUR MESURE (Option) ── */
      {
        id: 'sec-15-placard-sur-mesure',
        num: 15,
        title: 'Placard sur mesure - au-dessus des toilettes',
        isOption: true,
        items: [
          { key:'15.1', label:'Création d\'1 placard sur mesures : 2 portes en MDF à peindre avec charnières + 2-3 étagères + pose des poignées (fournies par le client) + Retombée (et déport de la VMC si nécessaire) + Mise en peinture intérieur / extérieur placard', unit:'U', defaultQty:1, defaultPrice:520, trigger:'options.placardSurMesure' }
        ]
      },

      /* ── 16. ACCESSOIRES PMR (Option) ── */
      {
        id: 'sec-16-accessoires-pmr',
        num: 16,
        title: 'Accessoires PMR (Personnes à mobilité réduite)',
        isOption: true,
        items: [
          { key:'16.1', label:'Pose d\'1 Poignée PMR',                                              unit:'U', defaultQty:2, defaultPrice:60, trigger:'options.poigneePMR' },
          { key:'16.2', label:'Pose d\'1 siège amovible PMR',                                       unit:'U', defaultQty:1, defaultPrice:80, trigger:'options.siegePMR' },
          { key:'16.3', label:'Barre d\'appui grip antidérapant à fixer, acier inoxydable blanc, 30cm', unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.barre30PMR', showWhenZero:true },
          { key:'16.4', label:'Barre d\'appui coudée à fixer, acier inoxydable blanc, 40cm',        unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.barre40PMR', showWhenZero:true },
          { key:'16.5', label:'Siège de douche à fixer relevable, aluminium epoxy blanc',           unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.siegeDouchePMR', showWhenZero:true }
        ]
      },

      /* ── 17. PORTE À GALANDAGE (Option) ── */
      {
        id: 'sec-17-porte-galandage',
        num: 17,
        title: 'Porte à galandage',
        isOption: true,
        items: [
          { key:'17.1', label:'Pose porte coulissante à galandage AVEC CONSERVATION ANCIEN CADRE : châssis à galandage en applique + habillage BA13 hydro + bandes jonction et enduit + façonnage et pose porte coulissante isoplane pré-peinte + habillage + poignée et accessoires', unit:'U', defaultQty:1, defaultPrice:950, trigger:'options.galandageAvecCadre' },
          { key:'17.2', label:'Electricité : Reprise / déplacement interrupteur / prise',          unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.galandageElectricite', showWhenZero:true },
          { key:'17.3', label:'Peinture : Enduit général + peinture du panneau',                    unit:'m²', defaultQty:1, defaultPrice:0, trigger:'options.galandagePeinture', showWhenZero:true },
          { key:'17.4', label:'Fourniture et pose plinthes en MDF à peindre',                       unit:'ml', defaultQty:1, defaultPrice:24, trigger:'options.galandagePlinthesMDF' },
          { key:'17.5', label:'Porte coulissante à galandage SANS CONSERVATION ANCIEN CADRE : dépose porte + encadrement + cloison partiellement + évacuation + montage châssis + habillage BA13 hydro intérieur/classique extérieur + façonnage et pose porte + habillage + poignée et accessoires', unit:'U', defaultQty:1, defaultPrice:1380, trigger:'options.galandageSansCadre' },
          { key:'17.6', label:'Electricité : Reprise / déplacement interrupteur / prise',           unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.galandage17_6', showWhenZero:true },
          { key:'17.7', label:'Peinture : Enduit général + peinture du panneau',                    unit:'m²', defaultQty:1, defaultPrice:0, trigger:'options.galandage17_7', showWhenZero:true },
          { key:'17.8', label:'Fourniture et pose plinthes en MDF à peindre',                       unit:'ml', defaultQty:1, defaultPrice:24, trigger:'options.galandagePlinthesSansCadre' },
          { key:'17.9', label:'Châssis porte à galandage',                                          unit:'m²', defaultQty:1, defaultPrice:0, trigger:'options.galandageChassis', showWhenZero:true },
          { key:'17.10', label:'Porte coulissante Isoplane Pré-peintre',                            unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.galandagePorteIso', showWhenZero:true },
          { key:'17.11', label:'Kit habillage de porte à galandage - Finition "à peindre"',         unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.galandageKit', showWhenZero:true },
          { key:'17.12', label:'Poignée encastrable à condamnation',                                unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.galandagePoignee', showWhenZero:true },
          { key:'17.13', label:'Amortisseur',                                                        unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.galandageAmortisseur', showWhenZero:true }
        ]
      },

      /* ── 18. PORTE EN APPLIQUE (Option) ── */
      {
        id: 'sec-18-porte-applique',
        num: 18,
        title: 'Porte en applique - Porte coulissante sur rail en applique mural',
        isOption: true,
        items: [
          { key:'18.1', label:'Porte coulissante EN APPLIQUE SUR RAIL APPARENT : dépose ancienne porte (CONSERVATION DU CADRE) + Pose rail en applique sur le mur + Façonnage et pose porte coulissante + Pose poignée et accessoires', unit:'U', defaultQty:1, defaultPrice:0, trigger:'options.porteApplique', showWhenZero:true }
        ]
      }
    ],

    /* ─── MENTIONS LÉGALES ─── */
    legalMentions: {
      tvaText: 'Le client, signataire du devis, certifie, en qualité de preneur de la prestation, que les travaux réalisés concernent des locaux à usage d\'habitation achevés depuis plus de deux ans et qu\'ils n\'ont pas eu pour effet, sur une période de deux ans au plus, de concourir à la production d\'un immeuble neuf au sens du 2° du 2 du I de l\'article 257 du CGI, ni d\'entraîner une augmentation de la surface de plancher des locaux existants supérieure à 10% et/ou qu\'ils ont la nature de travaux de rénovation énergétique. Ceci annule et remplace l\'attestation de TVA selon l\'article 278-0 bis A du CGI modifié par l\'article 41 de la loi n° 2025-127 du 14 février 2025 de finances pour 2025.',
      validityText: 'Validité du devis : 3 mois',
      paymentMode: 'Virement',
      paymentDelay: 'Règlement comptant',
      depositText: '30,00% à la signature à verser sur le compte IBAN : FR76 3000 4014 0300 0101 6001 532',
      signatureText: 'Date et signature précédées de la mention "Devis reçu avant l\'exécution des travaux, Bon pour accord".'
    },

    /* ─── CONDITIONS GÉNÉRALES DE VENTE (page 9) ─── */
    cgv: [
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
    ]
  };

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

      /* ── CTA principal (placeholder Commit B) ── */
      '<div style="background:#fff;border:1px solid var(--c-border,#e3dccc);border-radius:14px;padding:28px 24px;margin-bottom:18px;font-family:Inter,sans-serif;text-align:center;">' +
        '<div style="font-size:48px;margin-bottom:12px;">🚿</div>' +
        '<div style="font-family:Cormorant Garamond,Georgia,serif;font-size:22px;font-weight:600;color:#0f2030;margin-bottom:6px;">Nouveau devis salle de bain</div>' +
        '<div style="font-size:13px;color:#3a4a5c;margin-bottom:20px;line-height:1.5;max-width:480px;margin-left:auto;margin-right:auto;">Wizard 12 étapes pour la prise d\'informations chez le client.<br><span style="color:#c9a96e;font-weight:600;">Disponible au commit B</span> — pour l\'instant le template est chargé et inspectable ci-dessous.</div>' +
        '<button disabled style="padding:14px 28px;background:#c9a96e;color:#0f2030;border:none;border-radius:10px;font-weight:700;font-size:15px;cursor:not-allowed;opacity:0.5;font-family:Inter,sans-serif;">+ Démarrer un nouveau devis</button>' +
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
    _currentDraft = newDraft();
    _currentStepIdx = 0;
    saveDraft(_currentDraft);
    if(typeof showScreen === 'function') showScreen('screen-bathroom-wizard');
    ensureWizardScreen();
    setTimeout(wizardRender, 30);
  }

  function wizardOpen(draftId){
    var drafts = getDrafts();
    var d = drafts.find(function(q){ return q.id === draftId; });
    if(!d){ showToast('Brouillon introuvable'); return; }
    _currentDraft = d;
    _currentStepIdx = (d.currentStep || 1) - 1;
    if(typeof showScreen === 'function') showScreen('screen-bathroom-wizard');
    ensureWizardScreen();
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

  function wizardEmit(){
    if(typeof showToast === 'function') showToast('⚙ Émission verrouillée + PDF arrivent au commit C');
  }

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

  /* ─── ACTIVATION DU CTA + LISTE DES BROUILLONS SUR ÉCRAN D'ACCUEIL ─── */
  var _origRenderBath = renderBathroomScreen;
  renderBathroomScreen = function(){
    _origRenderBath.apply(this, arguments);
    /* Active le bouton CTA */
    setTimeout(function(){
      var disabledBtn = document.querySelector('#aj-bath-body button[disabled]');
      if(disabledBtn){
        disabledBtn.disabled = false;
        disabledBtn.style.cursor = 'pointer';
        disabledBtn.style.opacity = '1';
        disabledBtn.textContent = '+ Démarrer un nouveau devis';
        disabledBtn.onclick = function(){ wizardStartNew(); };
      }
      /* Ajoute la liste des brouillons */
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
