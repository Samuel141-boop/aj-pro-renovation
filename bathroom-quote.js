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

  console.log('[AJ PRO Bath] Module Devis Salle de Bain chargé · ' + BATHROOM_TEMPLATE.sections.length + ' sections · ' + (function(){
    var n = 0;
    BATHROOM_TEMPLATE.sections.forEach(function(s){
      n += (s.items || []).length;
      (s.subSections || []).forEach(function(sub){ n += sub.items.length; });
    });
    return n;
  })() + ' lignes transcrites');
})();
