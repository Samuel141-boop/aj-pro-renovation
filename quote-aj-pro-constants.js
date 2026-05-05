/* ════════════════════════════════════════════════════════════════════
   AJ PRO RÉNOVATION — MODULE DEVIS AJ PRO (constantes)
   ──────────────────────────────────────────────────────────────────
   Source de vérité pour :
   - infos entreprise AJ Pro (en-tête, RCS, IBAN, assurance, etc.)
   - texte fixe : attestation TVA + 10 articles CGV
   - énumérations (statut ligne, fournisseur, type doc, etc.)
   - réglages par défaut (TVA 10%, acompte 30%, virement)
   - 5 templates de départ : vide, avenant vide, intervention, peinture, SDB simple

   Reproduit le contenu textuel exact des PDF AJ Pro analysés
   ($002612 sdbv2, D-20260112, D-20260242).
   ════════════════════════════════════════════════════════════════════ */
(function(){
  if(window.AJ_QUOTE_CONSTANTS) return;

  /* ─────────────────────────────────────────────────────────────────
     INFOS ENTREPRISE AJ PRO (préremplies, modifiables par devis)
     ───────────────────────────────────────────────────────────────── */
  var AJ_PRO_COMPANY = {
    raisonSociale: 'Sarl AJ Pro Rénovation',
    capital: '7500.00 €',
    capitalPretty: 'au capital de 7500.00 €',
    tel: '01 78 53 30 08',
    email: 'contact@ajprorenovation.com',
    adresse: '95/97 rue Gallieni',
    codePostal: '92500',
    ville: 'Rueil-Malmaison',
    pays: 'France',
    ape: '4120A',
    siret: '487953465 00035',
    siretPretty: '487 953 465 00035',
    tvaIntracom: 'FR39487953465',
    iban: 'FR76 3000 4014 0300 0101 6001 532',
    bic: 'BNPAFRPPXXX',
    rcs: 'RCS NANTERRE 487 953 465',
    activites: [
      'Peinture',
      'Plomberie',
      'Electricité',
      'Carrelage',
      'Parquet',
      'PVC',
      'Rénovation parquets anciens',
      'Pose parquets neufs',
      'Rénovation complète de Salles de bain',
      'Travaux préalables à l\'installation de cuisines équipées'
    ],
    /* Telle que reproduite sur les PDFs (deux lignes) */
    activitesAffichage: [
      'Peinture - Plomberie - Electricité - Carrelage - Parquet',
      'PVC - Rénovation parquets anciens - Pose parquets neufs',
      'Rénovation complète de Salles de bain -',
      'Travaux préalables à l\'installation de cuisines équipées'
    ],
    assurance: {
      assureur: 'AXA France',
      reference: '0000021932511804',
      depuis: '01/01/2025',
      activitesCouvertes: 'Plomberie, peinture, électricité, parquet, menuiserie, cloisons, carrelage',
      mention: 'Attestation fournie sur simple demande'
    },
    mediateur: {
      nom: 'CM2C',
      adresse: '14, rue Saint-Jean - 75017 PARIS',
      site: 'www.cm2c.net'
    },
    logoUrl: null
  };

  /* ─────────────────────────────────────────────────────────────────
     ATTESTATION TVA — texte exact issu des PDFs
     Apparaît juste avant les totaux dans les devis
     ───────────────────────────────────────────────────────────────── */
  var AJ_PRO_TVA_ATTESTATION =
    'Le client, signataire du devis, certifie, en qualité de preneur de la prestation, que ' +
    'les travaux réalisés concernent des locaux à usage d’habitation achevés depuis ' +
    'plus de deux ans et qu’ils n’ont pas eu pour effet, sur une période de deux ans ' +
    'au plus, de concourir à la production d’un immeuble neuf au sens du 2° du 2 du I ' +
    'de l’article 257 du CGI, ni d’entraîner une augmentation de la surface de ' +
    'plancher des locaux existants supérieure à 10% et/ou qu’ils ont la nature de ' +
    'travaux de rénovation énergétique.\n' +
    'Ceci annule et remplace l’attestation de TVA selon l’article 278-0 bis A du CGI ' +
    'modifié par l’article 41 de la loi n° 2025-127 du 14 février 2025 de finances pour ' +
    '2025';

  /* ─────────────────────────────────────────────────────────────────
     MENTION DE SIGNATURE — texte exact issu des PDFs
     ───────────────────────────────────────────────────────────────── */
  var AJ_PRO_SIGNATURE_MENTION =
    'Date et signature précédées de la mention "Devis reçu avant ' +
    'l\'exécution des travaux, Bon pour accord".';

  /* ─────────────────────────────────────────────────────────────────
     CONDITIONS GÉNÉRALES DE VENTE — 10 articles
     Texte intégral reproduit fidèlement des PDFs AJ Pro
     ───────────────────────────────────────────────────────────────── */
  var AJ_PRO_TERMS_INTRO =
    'Toute commande de travaux implique de la part du client l’acceptation sans réserve des conditions générales ci-dessous et la renonciation à ' +
    'ses propres conditions, sauf convention spéciale contraire écrite.';

  var AJ_PRO_TERMS_AND_CONDITIONS = [
    {
      number: 1,
      title: 'VALIDITE',
      body:
        'Notre offre est valable pour une durée de 3 mois pour des travaux à effectuer dans les 3 mois de son acceptation signée du client. Toute commande ' +
        'passée après ce délai de 3 mois du jour de notre proposition doit entraîner une confirmation de notre part. La signature par le client du devis ou de la ' +
        'commande l’engage de façon ferme et définitive. Les travaux sont expressément limités à ceux qui sont spécifiés dans l’offre, le devis ou la commande. ' +
        'Les travaux supplémentaires ainsi que les travaux d’entretien éventuels feront l’objet d’un devis complémentaire accepté au préalable.'
    },
    {
      number: 2,
      title: 'PROPRIETE DES DEVIS ET DES PLANS',
      body:
        'Nos devis, dessins, plans, maquettes, descriptifs et documents de travail restent notre propriété exclusive. Leur communication à d’autres entreprises ou ' +
        'tiers est interdite et passible de dommages-intérêts. Ils doivent être rendus s’ils ne sont pas suivis d’une commande.'
    },
    {
      number: 3,
      title: 'DELAIS',
      body:
        'Les délais de livraison ne sont donnés qu’à titre indicatif sauf stipulation contraire indiquée sur le devis. Nous sommes dégagés de tout engagement ' +
        'relatif aux délais de livraison dans le cas :',
      bullets: [
        'où les conditions de paiement n’ont pas été observées par le client,',
        'de retard apporté à la remise de l’ordre d’exécution,',
        'de modification du programme des travaux,',
        'de retard des autres corps d’Etat,',
        'de travaux supplémentaires,',
        'où les locaux à aménager ne sont pas mis à notre disposition à la date prévue,',
        'de force majeure ou d’événements tels que : guerre, grève de l’entreprise ou de l’un de ses fournisseurs, empêchement de transport, incendie, intempéries, ou encore rupture de stock du fournisseur.'
      ]
    },
    {
      number: 4,
      title: 'CONDITIONS D’EXECUTION',
      body:
        'Nous ne sommes tenus de commencer les travaux que dans le cadre des délais prévus par notre offre. La pose de nos ouvrages ne pourra s’effectuer ' +
        'qu’après achèvement des emplacements réservés à cet effet et après siccité complète de maçonneries, plâtreries, et carrelages.\n' +
        'Pour la menuiserie: La tenue des bois dépend essentiellement du degré hygrométrique des locaux dans lesquels sont placées les menuiseries. Nous ne ' +
        'pourrons être tenus pour responsables des déformations, gauchissements ou retraits des bois survenus par suite de variation de taux d’hygrométrie.'
    },
    {
      number: 5,
      title: 'RECEPTIONS – RECLAMATIONS',
      body:
        'Les travaux seront réceptionnés au plus tard 15 jours après leur achèvement. A défaut de cette réception dans les 30 jours suivant l’achèvement des ' +
        'travaux, ceux-ci seront considérés comme acceptés sans réserve.\n' +
        'En cas de différend relatif à l\'exécution du contrat/marché de travaux, les Parties rechercheront, avant toute action contentieuse, un accord amiable et ' +
        'se communiqueront à cet effet tous les éléments d\'information nécessaires. Le Centre de la Médiation de la Consommation de Conciliateurs de Justice ' +
        '(CM2C) est le médiateur de la consommation désigné par l’entreprise. En cas de litige, le client consommateur adresse une réclamation par écrit à ' +
        'l\'entreprise avant toute saisine éventuelle du médiateur de la consommation. En cas d\'échec de la réclamation, le client peut soumettre le différend à ce ' +
        'médiateur de la consommation, au plus tard un an après sa réclamation écrite, à l’adresse suivante: CM2C - 14, rue Saint-Jean - 75017 PARIS ou en ' +
        'ligne sur www.cm2c.net'
    },
    {
      number: 6,
      title: 'PAIEMENT',
      body: 'Nos travaux étant entièrement exécutés sur commande, leur paiement s’effectue comme suit :',
      bullets: [
        'à la commande : 30 %',
        'Acomptes suivants selon avancement des travaux sur notre demande',
        'le solde à la date d’échéance figurant sur la facture, sans escompte ni rabais, ni retenue de quelque nature.'
      ]
    },
    {
      number: 7,
      title: 'SUSPENSION DES TRAVAUX',
      body:
        'En cas de non-observation des conditions de paiement, l’entreprise se réserve le droit de suspendre les travaux trois jours après avoir mis le client en ' +
        'demeure de tenir ses engagements.'
    },
    {
      number: 8,
      title: 'CLAUSES PENALES',
      body:
        'En cas de rupture du contrat, imputable au client, avant la réalisation des travaux commandés, l’acompte versé à la commande sera conservé à titre ' +
        'd’indemnisation forfaitaire. A cette somme s’ajoutera le montant des fournitures et du matériel déjà commandés. En cas de rupture du contrat en cours ' +
        'de réalisation des travaux s’ajoutera à la facturation des travaux réalisés une somme forfaitaire égale à 15% du montant TTC du devis ou de la ' +
        'commande.\n' +
        'Conformément à l’article L441-6 du code de commerce, des pénalités de retard sont obligatoirement appliquées dans le cas où les sommes dues sont ' +
        'versées après la date de paiement figurant sur la facture.\n' +
        'Le taux de ces intérêts de retard est égal à 1% par mois de retard. Après mise en demeure, ils courent à partir de la date de règlement et sont calculés ' +
        'par mois, le mois entamé comptant pour un mois entier.'
    },
    {
      number: 9,
      title: 'RESERVE DE PROPRIETE',
      body:
        'La marchandise livrée reste notre propriété jusqu’à paiement intégral du prix. Toutefois, les risques sont transférés dès la livraison.\n' +
        'Dans le cas où le paiement n’interviendrait pas dans le délai prévu, nous nous réservons le droit de reprendre la chose livrée et, si bon nous semble, de ' +
        'résoudre le contrat.'
    },
    {
      number: 10,
      title: 'ATTRIBUTION DE COMPETENCE',
      body: 'En cas de contestation, il est fait attribution de compétences aux tribunaux du siège social de notre entreprise.'
    }
  ];

  /* ─────────────────────────────────────────────────────────────────
     ÉNUMÉRATIONS
     ───────────────────────────────────────────────────────────────── */
  var QUOTE_DOC_TYPES = [
    { id: 'quote',     label: 'Devis',    titlePrefix: 'Devis n°' },
    { id: 'amendment', label: 'Avenant',  titlePrefix: 'Avenant n°' },
    { id: 'revision',  label: 'Révision', titlePrefix: 'Révision n°' }
  ];

  var QUOTE_LINE_STATUSES = [
    { id: 'included',    label: 'Inclus',       color: '#1d4d33', includedInTotal: true  },
    { id: 'option',      label: 'Option',       color: '#9a4514', includedInTotal: false },
    { id: 'to_confirm',  label: 'À confirmer',  color: '#7a5a30', includedInTotal: false },
    { id: 'excluded',    label: 'Non inclus',   color: '#7a8896', includedInTotal: false }
  ];

  var QUOTE_SUPPLIED_BY = [
    { id: 'aj_pro',     label: 'AJ Pro',       short: 'AJ Pro' },
    { id: 'client',     label: 'Client',       short: 'Client' },
    { id: 'to_confirm', label: 'À confirmer',  short: '?' }
  ];

  var QUOTE_LINE_TYPES = [
    { id: 'normal',   label: 'Ligne standard' },
    { id: 'comment',  label: 'Commentaire'    },
    { id: 'title',    label: 'Titre'          },
    { id: 'subtotal', label: 'Sous-total'     },
    { id: 'supply',   label: 'Fourniture'     },
    { id: 'discount', label: 'Remise'         },
    { id: 'note',     label: 'Note'           }
  ];

  var QUOTE_SECTION_TYPES = [
    { id: 'section',    label: 'Section'             },
    { id: 'subsection', label: 'Sous-section'        },
    { id: 'option',     label: 'Option'              },
    { id: 'comment',    label: 'Commentaires'        },
    { id: 'supplies',   label: 'Fournitures'         },
    { id: 'delivery',   label: 'Livraison'           },
    { id: 'custom',     label: 'Personnalisée'       }
  ];

  /* ─────────────────────────────────────────────────────────────────
     RÉGLAGES PAR DÉFAUT
     ───────────────────────────────────────────────────────────────── */
  var QUOTE_DEFAULT_SETTINGS = {
    vatRate: 10,
    depositRate: 30,
    paymentMethod: 'Virement',
    paymentDelay: 'Règlement comptant',
    validityDays: 90,
    showDiscountColumn: false,
    optionsIncludedInTotal: false /* défaut : options affichées hors total */
  };

  /* ─────────────────────────────────────────────────────────────────
     TEMPLATES DE DÉPART (5 modèles minimaux modifiables)
     ───────────────────────────────────────────────────────────────── */

  /* Helper : génère un id unique, on évite la collision avec l'app */
  function _id(prefix){
    return (prefix || 'id_') + Math.random().toString(36).slice(2, 9);
  }

  /* Construit une section vide */
  function _emptySection(title, opts){
    opts = opts || {};
    return {
      id: _id('s_'),
      number: '',
      title: title,
      type: opts.type || 'section',
      parentId: opts.parentId || null,
      order: opts.order || 0,
      isOption: !!opts.isOption,
      optionLabel: opts.optionLabel || (opts.isOption ? 'Option' : ''),
      visible: true,
      lines: opts.lines || []
    };
  }

  /* Construit une ligne par défaut */
  function _line(designation, opts){
    opts = opts || {};
    return {
      id: _id('l_'),
      number: '',
      designation: designation || '',
      description: opts.description || '',
      quantity: opts.quantity != null ? opts.quantity : 1,
      unit: opts.unit || 'U',
      unitPriceBeforeDiscount: opts.unitPriceBeforeDiscount != null ? opts.unitPriceBeforeDiscount : null,
      discountPercent: opts.discountPercent != null ? opts.discountPercent : 0,
      unitPriceHT: opts.unitPriceHT != null ? opts.unitPriceHT : 0,
      totalHT: 0,
      type: opts.type || 'normal',
      status: opts.status || 'included',
      suppliedBy: opts.suppliedBy || null,
      visible: opts.visible !== false,
      order: opts.order || 0,
      allowNegativeQuantity: !!opts.allowNegativeQuantity,
      allowZeroPrice: opts.allowZeroPrice !== false,
      highlighted: !!opts.highlighted,
      highlightColor: opts.highlightColor || null,
      metadata: opts.metadata || {}
    };
  }

  /* TEMPLATE 1 — Devis vide AJ Pro */
  function _tplVide(){
    return {
      id: 'tpl_aj_vide',
      label: 'Devis vide AJ Pro',
      description: '4 sections vides : Commentaires, Travaux, Fournitures, Livraison',
      icon: '📄',
      typeDocument: 'quote',
      title: '',
      sections: [
        _emptySection('Commentaires',  { type: 'comment'  }),
        _emptySection('Travaux',       { type: 'section'  }),
        _emptySection('Fournitures',   { type: 'supplies' }),
        _emptySection('LIVRAISON',     { type: 'delivery' })
      ]
    };
  }

  /* TEMPLATE 2 — Avenant vide AJ Pro */
  function _tplAvenantVide(){
    return {
      id: 'tpl_aj_avenant_vide',
      label: 'Avenant vide AJ Pro',
      description: 'Structure identique au devis vide, type Avenant',
      icon: '📑',
      typeDocument: 'amendment',
      title: 'Travaux supplémentaires',
      sections: [
        _emptySection('Commentaires',  { type: 'comment'  }),
        _emptySection('Travaux supplémentaires', { type: 'section' }),
        _emptySection('Fournitures',   { type: 'supplies' }),
        _emptySection('LIVRAISON',     { type: 'delivery' })
      ]
    };
  }

  /* TEMPLATE 3 — Petit devis intervention simple */
  function _tplIntervention(){
    return {
      id: 'tpl_aj_intervention',
      label: 'Petit devis intervention',
      description: 'Forfait intervention + 1 fourniture optionnelle',
      icon: '🔧',
      typeDocument: 'quote',
      title: 'Intervention dans un logement',
      sections: [
        _emptySection('Intervention', {
          type: 'section',
          lines: [
            _line('Forfait intervention + déplacement', {
              quantity: 1, unit: 'U', unitPriceHT: 90, status: 'included'
            }),
            _line('Recherche de panne et diagnostic', {
              description: 'Diagnostic sur place et chiffrage si nécessaire',
              quantity: 1, unit: 'U', unitPriceHT: 60, status: 'included'
            })
          ]
        }),
        _emptySection('Fournitures (si nécessaire)', {
          type: 'supplies',
          isOption: true,
          optionLabel: 'Option',
          lines: [
            _line('Fourniture à préciser', {
              quantity: 1, unit: 'U', unitPriceHT: 0, status: 'to_confirm',
              suppliedBy: 'to_confirm', allowZeroPrice: true
            })
          ]
        })
      ]
    };
  }

  /* TEMPLATE 4 — Devis peinture simple */
  function _tplPeinture(){
    return {
      id: 'tpl_aj_peinture',
      label: 'Devis peinture simple',
      description: 'Pièce — protection + plafond + murs et boiseries',
      icon: '🎨',
      typeDocument: 'quote',
      title: 'Travaux de peinture dans un logement',
      sections: [
        _emptySection('Commentaires', {
          type: 'comment',
          lines: [
            _line('Travaux exécutés meubles couverts ou écartés', {
              type: 'comment', quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true
            })
          ]
        }),
        _emptySection('Peinture - Pièce', {
          type: 'section',
          lines: [
            _line('Protection des sols et des accès, nettoyage usuel de fin de chantier', {
              quantity: 1, unit: 'U', unitPriceHT: 100, status: 'included'
            }),
            _line('Plafond - Mise en peinture - 2 couches blanc velours', {
              description: 'Préparation du support avant peinture - Enduit Partiel\nMise en peinture du plafond - 2 couches blanc Velours',
              quantity: 1, unit: 'm²', unitPriceHT: 22, status: 'included'
            }),
            _line('Murs et boiseries - Enduit général + 2 couches', {
              description: 'Préparation des murs et boiseries avant peinture - Enduit Général\n' +
                           'Mise en peinture des murs - 2 couches blanc Velours Lessivable\n' +
                           'Mise en peinture des boiseries - 2 couches blanc Velours Lessivable',
              quantity: 1, unit: 'm²', unitPriceHT: 60, status: 'included'
            })
          ]
        }),
        _emptySection('Mise en teinte', {
          type: 'section',
          isOption: true,
          optionLabel: 'Option',
          lines: [
            _line('Mise en teinte des peintures', {
              quantity: 1, unit: 'U', unitPriceHT: 180, status: 'option'
            })
          ]
        })
      ]
    };
  }

  /* TEMPLATE 5 — Devis salle de bain simple
     Squelette inspiré du PDF $002612 — sections principales seulement,
     PAS la bibliothèque complète des 148 lignes */
  function _tplSdbSimple(){
    return {
      id: 'tpl_aj_sdb_simple',
      label: 'Devis salle de bain simple',
      description: 'Squelette SDB : commentaires, démolition, plomberie, élec, fournitures, livraison + options',
      icon: '🚿',
      typeDocument: 'quote',
      title: 'Rénovation d\'une salle de bain dans un logement',
      sections: [
        _emptySection('Commentaires', {
          type: 'comment',
          lines: [
            _line('Vérifier le bon fonctionnement des vannes d\'arrêt du logement AVANT notre intervention', {
              type: 'comment', quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true
            }),
            _line('Malgré tout le soin apporté, la dépose de carrelage peut entraîner des dégâts sur les enduits et peintures attenants. Si tel est le cas, des travaux de réparation devront être évalués', {
              type: 'comment', quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true
            })
          ]
        }),
        _emptySection('Salle de bain - Démolition, maçonnerie, plâtrerie, peinture et menuiseries', {
          type: 'section',
          lines: [
            _line('Protection des sols et des accès, nettoyage usuel de fin de chantier', {
              quantity: 1, unit: 'U', unitPriceHT: 100
            }),
            _line('Dépose des appareils sanitaires et du mobilier sans conservation', {
              quantity: 1, unit: 'U', unitPriceHT: 300
            }),
            _line('Evacuation des gravats et mise en déchetterie', {
              quantity: 1, unit: 'U', unitPriceHT: 160
            }),
            _line('Pose carrelage sol - pose droite', {
              description: 'Carrelage de type 60X60cm',
              quantity: 1, unit: 'm²', unitPriceHT: 140
            }),
            _line('Peinture salle de bain - Préparation + mise en peinture pièce humide', {
              quantity: 1, unit: 'U', unitPriceHT: 750
            })
          ]
        }),
        _emptySection('Salle de bain - Plomberie', {
          type: 'section',
          lines: [
            _line('Receveur de douche - création arrivées EC EF + évacuation + pose et raccordement', {
              quantity: 1, unit: 'U', unitPriceHT: 1200
            }),
            _line('Toilettes suspendues - reprise EF/évacuation + pose châssis et cuvette', {
              quantity: 1, unit: 'U', unitPriceHT: 630
            }),
            _line('Vasque simple - reprise EC EF/évacuation + pose et raccordement', {
              quantity: 1, unit: 'U', unitPriceHT: 350
            })
          ]
        }),
        _emptySection('Salle de bain - Electricité', {
          type: 'section',
          lines: [
            _line('Mise en sécurité électrique de la pièce', {
              quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true
            }),
            _line('Reprise ligne électrique pour éclairage plafond', {
              quantity: 1, unit: 'U', unitPriceHT: 135
            }),
            _line('Reprise ligne électrique pour éclairage miroir', {
              quantity: 1, unit: 'U', unitPriceHT: 90
            })
          ]
        }),
        _emptySection('Salle de bain - Fournitures (Budget à préciser en fonction des choix du client)', {
          type: 'supplies',
          lines: [
            _line('Carrelage sol (y compris chutes)', {
              quantity: 1, unit: 'm²', unitPriceHT: 30, suppliedBy: 'aj_pro'
            }),
            _line('Carrelage mural (y compris chutes)', {
              quantity: 1, unit: 'm²', unitPriceHT: 35, suppliedBy: 'aj_pro'
            }),
            _line('Receveur de douche extraplat', {
              quantity: 1, unit: 'U', unitPriceHT: 240, suppliedBy: 'aj_pro'
            }),
            _line('Mitigeur de douche', {
              quantity: 1, unit: 'U', unitPriceHT: 149, suppliedBy: 'aj_pro'
            })
          ]
        }),
        _emptySection('LIVRAISON', {
          type: 'delivery',
          lines: [
            _line('Participation aux frais de livraison - y compris acheminement dans le logement', {
              quantity: 1, unit: 'U', unitPriceHT: 200
            })
          ]
        }),
        _emptySection('Plafond suspendu - salle de bain', {
          type: 'section', isOption: true, optionLabel: 'Option',
          lines: [
            _line('Création d\'un plafond suspendu BA13', {
              description: 'Fourniture et pose ossature métallique + plaques de plâtre + bandes de jonction',
              quantity: 3, unit: 'm²', unitPriceHT: 210, status: 'option'
            })
          ]
        }),
        _emptySection('Masquage des tuyaux apparents', {
          type: 'section', isOption: true, optionLabel: 'Option',
          lines: [
            _line('Création d\'un coffrage vertical ou horizontal', {
              quantity: 1, unit: 'U', unitPriceHT: 220, status: 'option'
            }),
            _line('Pose carrelage sur coffrage + baguette d\'angle', {
              quantity: 1, unit: 'U', unitPriceHT: 240, status: 'option'
            })
          ]
        })
      ]
    };
  }

  /* TEMPLATE 6 — Plomberie dépannage / intervention */
  function _tplPlomberieDepannage(){
    return {
      id: 'tpl_aj_plomberie_depannage',
      label: 'Plomberie dépannage',
      description: 'Intervention plombier sur fuite, débouchage, remplacement robinet…',
      icon: '🔧',
      typeDocument: 'quote',
      title: 'Intervention dégorgement dans un logement',
      sections: [
        _emptySection('Commentaires', {
          type: 'comment',
          lines: [
            _line('Vérifier que la vanne d\'arrêt d\'eau générale fonctionne avant intervention', {
              type: 'comment', quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true
            })
          ]
        }),
        _emptySection('Intervention plomberie', {
          type: 'section',
          lines: [
            _line('Forfait intervention + déplacement Plombier', {
              quantity: 1, unit: 'U', unitPriceHT: 90, status: 'included'
            }),
            _line('Recherche de fuite / diagnostic', {
              description: 'Diagnostic sur place et chiffrage si réparation complémentaire nécessaire',
              quantity: 1, unit: 'h', unitPriceHT: 75, status: 'included'
            }),
            _line('Débouchage canalisation', {
              quantity: 1, unit: 'U', unitPriceHT: 120, status: 'to_confirm'
            }),
            _line('Remplacement robinet d\'arrêt', {
              quantity: 1, unit: 'U', unitPriceHT: 80, status: 'to_confirm'
            })
          ]
        }),
        _emptySection('Fournitures (si nécessaire)', {
          type: 'supplies', isOption: true, optionLabel: 'Option',
          lines: [
            _line('Forfait produit déboucheur - si nécessaire', {
              quantity: 1, unit: 'U', unitPriceHT: 18, status: 'option', suppliedBy: 'aj_pro'
            }),
            _line('Joint / petite fourniture plomberie - si nécessaire', {
              quantity: 1, unit: 'U', unitPriceHT: 0, status: 'to_confirm', allowZeroPrice: true
            })
          ]
        })
      ]
    };
  }

  /* TEMPLATE 7 — Remplacement WC complet */
  function _tplRemplacementWC(){
    return {
      id: 'tpl_aj_remplacement_wc',
      label: 'Remplacement WC',
      description: 'Dépose toilettes existantes + pose pack WC + raccordement',
      icon: '🚽',
      typeDocument: 'quote',
      title: 'Remplacement d\'un toilette complet dans un logement',
      sections: [
        _emptySection('Commentaires', {
          type: 'comment',
          lines: [
            _line('Vérifier que la vanne d\'arrêt d\'eau générale fonctionne avant intervention', {
              type: 'comment', quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true
            })
          ]
        }),
        _emptySection('Remplacement des toilettes', {
          type: 'section',
          lines: [
            _line('Dépose des toilettes existantes + évacuation gravats', {
              quantity: 1, unit: 'U', unitPriceHT: 80
            }),
            _line('Toilettes à poser : reprise EF et évacuation, pose et raccordement, pose abattant', {
              description: 'Reprise des arrivées EF et Evacuation pour les toilettes\nPose et raccordement des toilettes\nPose abattant',
              quantity: 1, unit: 'U', unitPriceHT: 280
            })
          ]
        }),
        _emptySection('Fournitures', {
          type: 'supplies',
          lines: [
            _line('Pack WC à poser avec abattant frein de chute', {
              quantity: 1, unit: 'U', unitPriceHT: 180, suppliedBy: 'aj_pro'
            }),
            _line('Pipe de raccordement PVC', {
              quantity: 1, unit: 'U', unitPriceHT: 12, suppliedBy: 'aj_pro'
            }),
            _line('Robinet d\'arrêt toilettes', {
              quantity: 1, unit: 'U', unitPriceHT: 18, suppliedBy: 'aj_pro'
            })
          ]
        })
      ]
    };
  }

  /* TEMPLATE 8 — Peinture suite dégât des eaux */
  function _tplPeintureDegatEaux(){
    return {
      id: 'tpl_aj_peinture_dgt_eaux',
      label: 'Peinture dégât des eaux',
      description: 'Reprise enduits + peinture pièce sinistrée, séchages compris',
      icon: '💧',
      typeDocument: 'quote',
      title: 'Rénovation des peintures suite à un dégât des eaux dans un logement',
      sections: [
        _emptySection('Commentaires', {
          type: 'comment',
          lines: [
            _line('Travaux d\'enduit et de peinture à l\'identique', {
              type: 'comment', quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true
            }),
            _line('Taux d\'humidité du support à constater avant intervention', {
              type: 'comment', quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true
            }),
            _line('Plusieurs déplacements nécessaires pour respecter les temps de séchage', {
              type: 'comment', quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true
            })
          ]
        }),
        _emptySection('Peinture - Pièce concernée', {
          type: 'section',
          lines: [
            _line('Protection des sols et des accès, nettoyage usuel de fin de chantier', {
              quantity: 1, unit: 'U', unitPriceHT: 100
            }),
            _line('Grattage des fissures, impression, enduit partiel, ponçage', {
              description: 'Préparation du support sinistré : grattage, impression, enduit partiel, ponçage',
              quantity: 1, unit: 'm²', unitPriceHT: 32
            }),
            _line('Plafond - Toile + enduit général + 2 couches', {
              description: 'Fourniture et pose de toile à enduire\nPréparation du support avant peinture - Enduit Général\nMise en peinture support - 2 couches blanc velours',
              quantity: 1, unit: 'm²', unitPriceHT: 60
            }),
            _line('Murs et boiseries - Enduit général + 2 couches blanc velours', {
              description: 'Préparation des murs et boiseries avant peinture - Enduit Général\nMise en peinture des murs - 2 couches blanc Velours Lessivable\nMise en peinture des boiseries - 2 couches blanc Velours Lessivable',
              quantity: 1, unit: 'm²', unitPriceHT: 60
            })
          ]
        }),
        _emptySection('Recherche de teinte', {
          type: 'section', isOption: true, optionLabel: 'Option',
          lines: [
            _line('Plus-value mise en teinte', {
              description: 'Recherche de teinte chez le fournisseur + application en lieu et place du blanc velours standard',
              quantity: 1, unit: 'U', unitPriceHT: 180, status: 'option'
            })
          ]
        })
      ]
    };
  }

  /* TEMPLATE 9 — Salle de bain enrichie (lignes types complètes du brief) */
  function _tplSdbEnrichie(){
    return {
      id: 'tpl_aj_sdb_enrichie',
      label: 'Salle de bain rénovation complète',
      description: 'SDB complète avec lignes types démolition + plomberie + élec + fournitures + options',
      icon: '🛁',
      typeDocument: 'quote',
      title: 'Rénovation d\'une salle de bain dans un logement',
      sections: [
        _emptySection('Commentaires', {
          type: 'comment',
          lines: [
            _line('Vérifier le bon fonctionnement des vannes d\'arrêt du logement AVANT notre intervention', {
              type: 'comment', quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true
            }),
            _line('Risque de dégâts sur les enduits et peintures des pièces attenantes lors de la dépose de carrelage — réparations à évaluer si besoin', {
              type: 'comment', quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true
            }),
            _line('Dimensions des éléments à confirmer avant commande des fournitures', {
              type: 'comment', quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true
            }),
            _line('Support à vérifier après dépose carrelage', {
              type: 'comment', quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true
            }),
            _line('Accord copropriété / gardien nécessaire si intervention sur colonnes communes', {
              type: 'comment', quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true
            })
          ]
        }),
        _emptySection('Salle de bain - Démolition, maçonnerie, plâtrerie, peinture et menuiseries', {
          type: 'section',
          lines: [
            _line('Protection des sols et des accès, nettoyage usuel de fin de chantier', { quantity: 1, unit: 'U', unitPriceHT: 100 }),
            _line('Dépose des appareils sanitaires et du mobilier sans conservation', { quantity: 1, unit: 'U', unitPriceHT: 300 }),
            _line('Dépose des toilettes à poser', { quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true }),
            _line('Dépose carrelage mural et des plinthes', { quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true }),
            _line('Dépose carrelage sol', { quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true }),
            _line('Evacuation des gravats et mise en déchetterie', { quantity: 1, unit: 'U', unitPriceHT: 160 }),
            _line('Reprise des alignements des murs suite à démolition', { quantity: 1, unit: 'U', unitPriceHT: 220 }),
            _line('Reprise des murs avec BA13 hydro suite à dépose carrelage', { quantity: 1, unit: 'm²', unitPriceHT: 90 }),
            _line('Création d\'un tablier receveur avec trappe de contrôle', { quantity: 1, unit: 'U', unitPriceHT: 120 }),
            _line('Création d\'une margelle alignée sur le receveur', { quantity: 1, unit: 'U', unitPriceHT: 100 }),
            _line('Toile imperméable avant carrelage', {
              description: 'Fourniture et pose d\'une toile imperméable sur les supports humides',
              quantity: 1, unit: 'm²', unitPriceHT: 28
            }),
            _line('Pose carrelage sol - pose droite', {
              description: 'Carrelage de type 60×60cm',
              quantity: 1, unit: 'm²', unitPriceHT: 140
            }),
            _line('Pose des plinthes assorties carrelage sol', { quantity: 1, unit: 'ml', unitPriceHT: 28 }),
            _line('Pose barre de seuil', { quantity: 1, unit: 'U', unitPriceHT: 25 }),
            _line('Pose carrelage mural - pose droite, toute hauteur', {
              description: 'Carrelage de type 30×60cm\n - mur de la vasque\n - murs intérieurs baignoire / receveur\n - arrêt au droit de l\'espace bain/douche',
              quantity: 1, unit: 'm²', unitPriceHT: 140
            }),
            _line('Pose baguette de finition d\'angle carrelage', { quantity: 1, unit: 'U', unitPriceHT: 30 }),
            _line('Montage et pose meuble sous-vasque', { quantity: 1, unit: 'U', unitPriceHT: 250 }),
            _line('Pose miroir / armoire de toilettes', { quantity: 1, unit: 'U', unitPriceHT: 80 }),
            _line('Remplacement bouche de ventilation', { quantity: 1, unit: 'U', unitPriceHT: 20 }),
            _line('Pose accessoires (porte-serviettes, patères, porte-savon)', { quantity: 1, unit: 'U', unitPriceHT: 80 }),
            _line('Peinture salle de bain - Préparation + mise en peinture pièce humide', {
              description: 'Préparation des supports avant peinture + mise en peinture Blanc satiné - pièce humide',
              quantity: 1, unit: 'U', unitPriceHT: 750
            })
          ]
        }),
        _emptySection('Salle de bain - Plomberie', {
          type: 'section',
          lines: [
            _line('Receveur de douche - création arrivées EC EF + évacuation + pose et raccordement', {
              description: 'Création des arrivées EC EF et Evacuation du receveur de douche (saignée cloison)\nPose et raccordement d\'1 receveur de douche sur pieds\nPose et raccordement robinet / colonne de douche',
              quantity: 1, unit: 'U', unitPriceHT: 1200
            }),
            _line('Paroi / porte de douche - montage et pose', { quantity: 1, unit: 'U', unitPriceHT: 280 }),
            _line('Toilettes suspendues - reprise EF/évacuation + pose châssis et cuvette', {
              description: 'Reprise des arrivées EF et Evacuation pour les toilettes\nPose et raccordement du châssis avec renforts\nPose et raccordement cuvette suspendue avec abattant et plaque de déclenchement',
              quantity: 1, unit: 'U', unitPriceHT: 630
            }),
            _line('Toilettes à poser - reprise EF/évacuation + pose et raccordement', { quantity: 1, unit: 'U', unitPriceHT: 280 }),
            _line('Vasque SIMPLE - reprise EC EF/évacuation + pose et raccordement', {
              description: 'Reprise des arrivées EC EF et Evacuation vasque\nPose et raccordement vasque avec robinetterie',
              quantity: 1, unit: 'U', unitPriceHT: 350
            }),
            _line('Ballon électrique - pose, raccordement, mise en eau et essais', { quantity: 1, unit: 'U', unitPriceHT: 450 }),
            _line('Lave-linge - création arrivée EF et évacuation (hors branchement)', { quantity: 1, unit: 'U', unitPriceHT: 180 })
          ]
        }),
        _emptySection('Salle de bain - Electricité', {
          type: 'section',
          lines: [
            _line('Mise en sécurité électrique de la pièce', { quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true }),
            _line('Reprise ligne électrique pour éclairage plafond', { quantity: 1, unit: 'U', unitPriceHT: 135 }),
            _line('Reprise ligne électrique pour éclairage miroir', { quantity: 1, unit: 'U', unitPriceHT: 90 }),
            _line('Reprise ligne pour déplacement d\'une prise électrique', { quantity: 1, unit: 'U', unitPriceHT: 90 }),
            _line('Reprise ligne électrique pour radiateur électrique', { quantity: 1, unit: 'U', unitPriceHT: 135 }),
            _line('Pose et raccordement éclairage miroir', { quantity: 1, unit: 'U', unitPriceHT: 60 }),
            _line('Pose et raccordement plafonnier / applique murale', { quantity: 1, unit: 'U', unitPriceHT: 70 }),
            _line('Pose et raccordement sèche-serviettes électrique', { quantity: 1, unit: 'U', unitPriceHT: 80 })
          ]
        }),
        _emptySection('Salle de bain - Fournitures (Budget à préciser en fonction des choix du client)', {
          type: 'supplies',
          lines: [
            _line('Carrelage sol (y compris chutes)', { quantity: 1, unit: 'm²', unitPriceHT: 30, suppliedBy: 'aj_pro' }),
            _line('Plinthes assorties au carrelage sol (y compris chutes)', { quantity: 1, unit: 'ml', unitPriceHT: 12, suppliedBy: 'aj_pro' }),
            _line('Carrelage mural (y compris chutes)', { quantity: 1, unit: 'm²', unitPriceHT: 35, suppliedBy: 'aj_pro' }),
            _line('Receveur de douche extraplat 80×120cm', { quantity: 1, unit: 'U', unitPriceHT: 240, suppliedBy: 'aj_pro' }),
            _line('Bonde / vidage receveur', { quantity: 1, unit: 'U', unitPriceHT: 67, suppliedBy: 'aj_pro' }),
            _line('Lot de pieds réglables pour receveur', { quantity: 1, unit: 'U', unitPriceHT: 15, suppliedBy: 'aj_pro' }),
            _line('Mitigeur de douche', { quantity: 1, unit: 'U', unitPriceHT: 149, suppliedBy: 'aj_pro' }),
            _line('Kit barre de douche avec pommeau et flexible', { quantity: 1, unit: 'U', unitPriceHT: 69, suppliedBy: 'aj_pro' }),
            _line('Paroi de douche fixe verre transparent', { quantity: 1, unit: 'U', unitPriceHT: 190, suppliedBy: 'aj_pro' }),
            _line('Meuble sous-vasque avec pieds', { quantity: 1, unit: 'U', unitPriceHT: 350, suppliedBy: 'aj_pro' }),
            _line('Vasque compatible avec le meuble', { quantity: 1, unit: 'U', unitPriceHT: 120, suppliedBy: 'aj_pro' }),
            _line('Mitigeur lavabo', { quantity: 1, unit: 'U', unitPriceHT: 89, suppliedBy: 'aj_pro' }),
            _line('Bonde automatique chromée', { quantity: 1, unit: 'U', unitPriceHT: 25, suppliedBy: 'aj_pro' }),
            _line('Miroir SANS éclairage', { quantity: 1, unit: 'U', unitPriceHT: 80, suppliedBy: 'aj_pro' }),
            _line('Sèche-serviettes électrique 500W', { quantity: 1, unit: 'U', unitPriceHT: 180, suppliedBy: 'aj_pro' }),
            _line('Pack WC à poser avec abattant frein de chute', { quantity: 1, unit: 'U', unitPriceHT: 180, suppliedBy: 'aj_pro' }),
            _line('Bouche d\'aération VMC', { quantity: 1, unit: 'U', unitPriceHT: 29, suppliedBy: 'aj_pro' }),
            _line('Plafonnier / applique murale', {
              description: 'Plafonnier / applique murale --> fourni / client',
              quantity: 1, unit: 'U', unitPriceHT: 0, suppliedBy: 'client', allowZeroPrice: true
            }),
            _line('Patères / porte-serviettes / porte-savon', {
              description: 'Patères / porte-serviettes / porte savon --> fourni / client',
              quantity: 1, unit: 'U', unitPriceHT: 0, suppliedBy: 'client', allowZeroPrice: true
            })
          ]
        }),
        _emptySection('LIVRAISON', {
          type: 'delivery',
          lines: [
            _line('Participation aux frais de livraison - y compris acheminement dans le logement', { quantity: 1, unit: 'U', unitPriceHT: 200 })
          ]
        }),
        _emptySection('Dépose carrelage sol - salle de bain', {
          type: 'section', isOption: true, optionLabel: 'Option',
          lines: [
            _line('Dépose carrelage sol / Evacuation gravats / Ragréage du sol avant carrelage', {
              quantity: 1, unit: 'U', unitPriceHT: 450, status: 'option'
            })
          ]
        }),
        _emptySection('Plafond suspendu - salle de bain', {
          type: 'section', isOption: true, optionLabel: 'Option',
          lines: [
            _line('Création d\'un plafond suspendu (ossature + plaques + bandes)', {
              description: 'Fourniture et pose ossature métallique + plaques de plâtre + acheminement matériaux + bandes de jonction Placo',
              quantity: 3, unit: 'm²', unitPriceHT: 210, status: 'option'
            }),
            _line('Installation de spots encastrés dans le faux plafond', {
              description: 'Reprise ligne pour création de la distribution électrique des spots\nPose et raccordement des spots encastrés',
              quantity: 1, unit: 'U', unitPriceHT: 210, status: 'option'
            }),
            _line('Spot encastré ÉTANCHE Blanc 220V LED', { quantity: 1, unit: 'U', unitPriceHT: 55, status: 'option', suppliedBy: 'aj_pro' })
          ]
        }),
        _emptySection('Doublage + niche carrelée - salle de bain', {
          type: 'section', isOption: true, optionLabel: 'Option',
          lines: [
            _line('Création coffrage BA13 hydrofuge sur ossature au droit de la douche/baignoire', {
              quantity: 2, unit: 'm²', unitPriceHT: 220, status: 'option'
            }),
            _line('Création d\'1 niche carrelée dans coffrage avec baguette de finition', {
              description: 'Niche alignée sur carrelage si possible — L25-50cm / H 30cm max conseillé',
              quantity: 1, unit: 'U', unitPriceHT: 450, status: 'option'
            })
          ]
        }),
        _emptySection('Masquage des tuyaux apparents', {
          type: 'section', isOption: true, optionLabel: 'Option',
          lines: [
            _line('Masquage tuyaux : création coffrage vertical/horizontal sur 1 pan de mur', {
              quantity: 1, unit: 'U', unitPriceHT: 220, status: 'option'
            }),
            _line('Pose carrelage sur coffrage + baguette d\'angle carrelage', {
              quantity: 1, unit: 'U', unitPriceHT: 240, status: 'option'
            })
          ]
        }),
        _emptySection('Remplacement vanne d\'isolement du logement', {
          type: 'section', isOption: true, optionLabel: 'Option',
          lines: [
            _line('Remplacement d\'1 vanne d\'isolement du logement', {
              description: 'Coupure et vidange de la colonne (accord copropriété / gardien nécessaire)\nFourniture et pose d\'1 vanne d\'arrêt\nMise en service et essais',
              quantity: 1, unit: 'U', unitPriceHT: 240, status: 'option'
            })
          ]
        }),
        _emptySection('Accessoires PMR (Personnes à Mobilité Réduite)', {
          type: 'section', isOption: true, optionLabel: 'Option',
          lines: [
            _line('Pose poignée PMR', { quantity: 2, unit: 'U', unitPriceHT: 60, status: 'option' }),
            _line('Pose siège amovible PMR', { quantity: 1, unit: 'U', unitPriceHT: 80, status: 'option' }),
            _line('Barre d\'appui grip antidérapant 30cm', { quantity: 1, unit: 'U', unitPriceHT: 0, status: 'option', suppliedBy: 'client', allowZeroPrice: true })
          ]
        })
      ]
    };
  }

  /* TEMPLATE 10 — Rénovation complète logement (squelette) */
  function _tplRenovationComplete(){
    return {
      id: 'tpl_aj_renovation_complete',
      label: 'Rénovation complète logement',
      description: 'Squelette tous corps d\'état : démolition / cloisons / carrelage / peinture / menuiserie / élec / plomberie / fournitures',
      icon: '🏠',
      typeDocument: 'quote',
      title: 'Rénovation d\'un logement',
      sections: [
        _emptySection('Commentaires', {
          type: 'comment',
          lines: [
            _line('Vérifier le bon fonctionnement des vannes d\'arrêt du logement AVANT intervention', {
              type: 'comment', quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true
            }),
            _line('Diagnostic plomb / amiante à fournir avant démarrage si logement antérieur à 1949 / 1997', {
              type: 'comment', quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true
            }),
            _line('Accord copropriété nécessaire pour modification cloisons porteuses ou colonnes communes', {
              type: 'comment', quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true
            })
          ]
        }),
        _emptySection('Démolition, dépose et déchetterie', {
          type: 'section',
          lines: [
            _line('Protection des sols, des accès et nettoyage usuel de fin de chantier', { quantity: 1, unit: 'U', unitPriceHT: 250 }),
            _line('Dépose revêtements sols et plinthes', { quantity: 1, unit: 'm²', unitPriceHT: 18 }),
            _line('Dépose carrelage mural existant', { quantity: 1, unit: 'm²', unitPriceHT: 22 }),
            _line('Dépose appareils sanitaires + mobilier sanitaires', { quantity: 1, unit: 'U', unitPriceHT: 300 }),
            _line('Evacuation des gravats et mise en déchetterie', { quantity: 1, unit: 'U', unitPriceHT: 280 })
          ]
        }),
        _emptySection('Maçonnerie', {
          type: 'section',
          lines: [
            _line('Reprise des alignements de murs suite à démolition', { quantity: 1, unit: 'U', unitPriceHT: 220 }),
            _line('Réagréage de sol avant pose nouveau revêtement', { quantity: 1, unit: 'm²', unitPriceHT: 18 })
          ]
        }),
        _emptySection('Cloisons', {
          type: 'section',
          lines: [
            _line('Création cloison BA13 ossature métallique', {
              description: 'Fourniture et pose ossature + plaques de plâtre BA13 + bandes de jonction',
              quantity: 1, unit: 'm²', unitPriceHT: 95
            }),
            _line('Reprise BA13 hydro pièces humides', { quantity: 1, unit: 'm²', unitPriceHT: 90 })
          ]
        }),
        _emptySection('Carrelage', {
          type: 'section',
          lines: [
            _line('Pose carrelage sol pose droite', { quantity: 1, unit: 'm²', unitPriceHT: 60 }),
            _line('Pose carrelage mural pièce humide', { quantity: 1, unit: 'm²', unitPriceHT: 140 }),
            _line('Pose des plinthes carrelage', { quantity: 1, unit: 'ml', unitPriceHT: 28 })
          ]
        }),
        _emptySection('Enduits et peinture', {
          type: 'section',
          lines: [
            _line('Préparation murs + plafonds, enduit général, ponçage', { quantity: 1, unit: 'm²', unitPriceHT: 22 }),
            _line('Mise en peinture plafonds 2 couches blanc velours', { quantity: 1, unit: 'm²', unitPriceHT: 18 }),
            _line('Mise en peinture murs 2 couches blanc velours lessivable', { quantity: 1, unit: 'm²', unitPriceHT: 22 }),
            _line('Mise en peinture boiseries (portes + plinthes + encadrements)', { quantity: 1, unit: 'U', unitPriceHT: 120 })
          ]
        }),
        _emptySection('Menuiserie', {
          type: 'section',
          lines: [
            _line('Dépose / repose plinthes MDF à peindre', { quantity: 1, unit: 'ml', unitPriceHT: 24 }),
            _line('Pose porte intérieure pré-peinte (huisserie + bloc-porte)', { quantity: 1, unit: 'U', unitPriceHT: 280 })
          ]
        }),
        _emptySection('Electricité', {
          type: 'section',
          lines: [
            _line('Mise en sécurité électrique du logement', { quantity: 1, unit: 'U', unitPriceHT: 0, allowZeroPrice: true }),
            _line('Création point lumineux supplémentaire (saignée + tirage + raccordement)', { quantity: 1, unit: 'U', unitPriceHT: 135 }),
            _line('Création prise supplémentaire 16A', { quantity: 1, unit: 'U', unitPriceHT: 90 }),
            _line('Mise aux normes tableau électrique (par disjoncteur ajouté)', { quantity: 1, unit: 'U', unitPriceHT: 225 })
          ]
        }),
        _emptySection('Plomberie', {
          type: 'section',
          lines: [
            _line('Reprise alimentations EC/EF + évacuations point d\'eau', { quantity: 1, unit: 'U', unitPriceHT: 350 }),
            _line('Pose ballon électrique + groupe de sécurité', { quantity: 1, unit: 'U', unitPriceHT: 450 })
          ]
        }),
        _emptySection('Fournitures', {
          type: 'supplies',
          lines: [
            _line('Carrelage sol logement (y compris chutes)', { quantity: 1, unit: 'm²', unitPriceHT: 30, suppliedBy: 'aj_pro' }),
            _line('Carrelage mural pièces humides', { quantity: 1, unit: 'm²', unitPriceHT: 35, suppliedBy: 'aj_pro' }),
            _line('Bloc-porte intérieur pré-peint', { quantity: 1, unit: 'U', unitPriceHT: 180, suppliedBy: 'aj_pro' }),
            _line('Peinture blanche velours lessivable (10L)', { quantity: 1, unit: 'U', unitPriceHT: 75, suppliedBy: 'aj_pro' })
          ]
        }),
        _emptySection('LIVRAISON', {
          type: 'delivery',
          lines: [
            _line('Participation aux frais de livraison', { quantity: 1, unit: 'U', unitPriceHT: 350 })
          ]
        }),
        _emptySection('Mise en teinte', {
          type: 'section', isOption: true, optionLabel: 'Option',
          lines: [
            _line('Mise en teinte des peintures par pièce', { quantity: 1, unit: 'U', unitPriceHT: 180, status: 'option' })
          ]
        })
      ]
    };
  }

  var QUOTE_TEMPLATES = [
    _tplVide(),
    _tplAvenantVide(),
    _tplIntervention(),
    _tplPlomberieDepannage(),
    _tplRemplacementWC(),
    _tplPeinture(),
    _tplPeintureDegatEaux(),
    _tplSdbSimple(),
    _tplSdbEnrichie(),
    _tplRenovationComplete()
  ];

  /* ─────────────────────────────────────────────────────────────────
     UNITÉS USUELLES (pour datalist dans l'éditeur)
     ───────────────────────────────────────────────────────────────── */
  var QUOTE_UNITS = ['U', 'm²', 'ml', 'h', 'j', 'forfait', 'kg', 'L', 'lot', 'ens'];

  /* ─────────────────────────────────────────────────────────────────
     BIBLIOTHÈQUE DE LIGNES TYPES — formulations fréquentes des PDF AJ Pro
     L'utilisateur peut insérer une ligne depuis cette bibliothèque dans
     n'importe quelle section. Chaque ligne reste modifiable après ajout.
     ───────────────────────────────────────────────────────────────── */
  function _lib(category, designation, opts){
    opts = opts || {};
    return {
      id: 'lib_' + Math.random().toString(36).slice(2, 9),
      category: category,
      designation: designation,
      description: opts.description || '',
      defaultQty: opts.qty != null ? opts.qty : 1,
      defaultUnit: opts.unit || 'U',
      defaultPrice: opts.price != null ? opts.price : 0,
      defaultStatus: opts.status || 'included',
      defaultSuppliedBy: opts.suppliedBy || null,
      defaultType: opts.type || 'normal',
      allowZeroPrice: opts.allowZeroPrice !== false
    };
  }

  var QUOTE_LINE_LIBRARY = [
    /* ─── Commentaires (lignes à 0€ explicatives) ─── */
    _lib('Commentaires', 'Vérifier le bon fonctionnement des vannes d\'arrêt du logement AVANT notre intervention', { type: 'comment', price: 0 }),
    _lib('Commentaires', 'Risque de dégâts sur les enduits et peintures des pièces attenantes lors de la dépose de carrelage', { type: 'comment', price: 0 }),
    _lib('Commentaires', 'Dimensions des éléments à confirmer avant commande', { type: 'comment', price: 0 }),
    _lib('Commentaires', 'Support à vérifier après dépose', { type: 'comment', price: 0 }),
    _lib('Commentaires', 'Accord copropriété / gardien nécessaire si intervention sur colonnes communes', { type: 'comment', price: 0 }),
    _lib('Commentaires', 'Plusieurs déplacements nécessaires pour respecter les temps de séchage', { type: 'comment', price: 0 }),
    _lib('Commentaires', 'Diagnostic plomb / amiante à fournir avant démarrage si logement antérieur à 1949 / 1997', { type: 'comment', price: 0 }),
    _lib('Commentaires', 'Travaux d\'enduit et de peinture à l\'identique', { type: 'comment', price: 0 }),
    _lib('Commentaires', 'Taux d\'humidité du support à constater avant intervention', { type: 'comment', price: 0 }),

    /* ─── Peinture ─── */
    _lib('Peinture', 'Protection des sols et des accès, nettoyage usuel de fin de chantier', { unit: 'U', price: 100 }),
    _lib('Peinture', 'Plafond - Enduit partiel + 2 couches blanc velours', {
      description: 'Préparation partielle du plafond + Mise en peinture - 2 couches blanc Velours',
      unit: 'm²', price: 18
    }),
    _lib('Peinture', 'Plafond - Enduit général + 2 couches blanc velours', {
      description: 'Préparation complète plafond - Enduit Général\nMise en peinture - 2 couches blanc Velours',
      unit: 'm²', price: 28
    }),
    _lib('Peinture', 'Plafond - Toile + enduit général + 2 couches', {
      description: 'Fourniture et pose de toile à enduire\nPréparation du support avant peinture - Enduit Général\nMise en peinture support - 2 couches blanc velours',
      unit: 'm²', price: 60
    }),
    _lib('Peinture', 'Murs et boiseries - Enduit partiel + 2 couches blanc velours lessivable', {
      description: 'Préparation des murs et boiseries avant peinture - Enduit Partiel\nMise en peinture des murs - 2 couches blanc Velours Lessivable\nMise en peinture des boiseries - 2 couches blanc Velours Lessivable',
      unit: 'm²', price: 34
    }),
    _lib('Peinture', 'Murs et boiseries - Enduit général + 2 couches blanc velours lessivable', {
      description: 'Préparation complète murs + boiseries - Enduit Général\nMise en peinture des murs - 2 couches blanc Velours Lessivable\nMise en peinture des boiseries - 2 couches blanc Velours Lessivable',
      unit: 'm²', price: 60
    }),
    _lib('Peinture', 'Murs - Toile + enduit général + 2 couches', {
      description: 'Fourniture et pose de toile à enduire\nPréparation du support - Enduit Général\nMise en peinture - 2 couches blanc velours',
      unit: 'm²', price: 60
    }),
    _lib('Peinture', 'Plus-value mise en teinte', {
      description: 'Recherche de teinte chez le fournisseur + application en lieu et place du blanc velours standard',
      unit: 'U', price: 180
    }),
    _lib('Peinture', 'Peinture porte et encadrement (2 faces + chambranle)', { unit: 'U', price: 220 }),
    _lib('Peinture', 'Plus-value protection mobilier (couverture/écartement)', { unit: 'U', price: 80 }),
    _lib('Peinture', 'Uniformisation intérieur d\'1 placard - ponçage léger + peinture sans enduits', { unit: 'U', price: 220 }),

    /* ─── Dégât des eaux ─── */
    _lib('Dégât des eaux', 'Grattage des fissures, impression, enduit partiel, ponçage', {
      description: 'Préparation du support sinistré : grattage, impression, enduit partiel, ponçage',
      unit: 'm²', price: 32
    }),
    _lib('Dégât des eaux', 'Dépose revêtement mural sinistré (tissu mural, isolation liège…)', { unit: 'm²', price: 18 }),
    _lib('Dégât des eaux', 'Travaux à l\'identique en peinture blanche velours', { unit: 'm²', price: 60 }),

    /* ─── SDB - Démolition / maçonnerie ─── */
    _lib('SDB - Démolition', 'Dépose des appareils sanitaires et du mobilier sans conservation', { unit: 'U', price: 300 }),
    _lib('SDB - Démolition', 'Dépose des toilettes suspendues', { unit: 'U', price: 0, allowZeroPrice: true }),
    _lib('SDB - Démolition', 'Dépose des toilettes à poser', { unit: 'U', price: 0, allowZeroPrice: true }),
    _lib('SDB - Démolition', 'Dépose carrelage mural et des plinthes', { unit: 'U', price: 0, allowZeroPrice: true }),
    _lib('SDB - Démolition', 'Dépose carrelage sol / Evacuation gravats / Ragréage avant carrelage', { unit: 'U', price: 450 }),
    _lib('SDB - Démolition', 'Dépose des coffrages tuyaux', { unit: 'U', price: 80 }),
    _lib('SDB - Démolition', 'Evacuation des gravats et mise en déchetterie', { unit: 'U', price: 160 }),
    _lib('SDB - Démolition', 'Reprise des alignements des murs suite à démolition', { unit: 'U', price: 220 }),
    _lib('SDB - Démolition', 'Reprise des murs avec BA13 hydro suite à dépose carrelage', { unit: 'm²', price: 90 }),
    _lib('SDB - Démolition', 'Création tablier receveur avec trappe de contrôle', { unit: 'U', price: 120 }),
    _lib('SDB - Démolition', 'Création margelle alignée sur le receveur', { unit: 'U', price: 100 }),
    _lib('SDB - Démolition', 'Création tablier baignoire avec trappe d\'accès à carreler', { unit: 'U', price: 250 }),
    _lib('SDB - Démolition', 'Habillage châssis toilettes suspendues (hors enduit/peinture)', { unit: 'U', price: 270 }),
    _lib('SDB - Démolition', 'Création coffrage vertical toute hauteur (masquage colonne d\'eau)', { unit: 'U', price: 220 }),
    _lib('SDB - Démolition', 'Création coffrage horizontal (masquage tuyaux horizontaux)', { unit: 'U', price: 220 }),
    _lib('SDB - Démolition', 'Toile imperméable avant carrelage', {
      description: 'Fourniture et pose d\'une toile imperméable sur supports humides',
      unit: 'm²', price: 28
    }),

    /* ─── SDB - Carrelage / pose ─── */
    _lib('Carrelage', 'Pose carrelage sol pose droite', { description: 'Carrelage de type 60×60cm', unit: 'm²', price: 140 }),
    _lib('Carrelage', 'Pose plinthes carrelage assorties', { unit: 'ml', price: 28 }),
    _lib('Carrelage', 'Pose carrelage mural pose droite toute hauteur', {
      description: 'Carrelage de type 30×60cm\n - mur vasque\n - murs intérieurs baignoire/receveur\n - arrêt au droit espace bain/douche',
      unit: 'm²', price: 140
    }),
    _lib('Carrelage', 'Pose carrelage tablier', { unit: 'U', price: 90 }),
    _lib('Carrelage', 'Pose carrelage margelle', { unit: 'U', price: 90 }),
    _lib('Carrelage', 'Pose baguette de finition d\'angle carrelage', { unit: 'U', price: 30 }),
    _lib('Carrelage', 'Pose barre de seuil', { unit: 'U', price: 25 }),

    /* ─── SDB - Plomberie ─── */
    _lib('Plomberie', 'Receveur de douche - création EC EF + évacuation + pose receveur sur pieds + colonne', {
      description: 'Création des arrivées EC EF et Evacuation du receveur de douche (saignée cloison)\nPose et raccordement d\'1 receveur de douche sur pieds\nPose et raccordement robinet / colonne de douche',
      unit: 'U', price: 1200
    }),
    _lib('Plomberie', 'Paroi / porte de douche - montage et pose', { unit: 'U', price: 280 }),
    _lib('Plomberie', 'Baignoire - création EC EF + évacuation + pose baignoire sur pieds + robinetterie', {
      description: 'Création des arrivées EC EF et Evacuation de la baignoire\nPose et raccordement d\'1 baignoire sur pieds\nPose et raccordement robinet / colonne de douche',
      unit: 'U', price: 1200
    }),
    _lib('Plomberie', 'Ecran de baignoire - montage et pose', { unit: 'U', price: 95 }),
    _lib('Plomberie', 'Toilettes suspendues - reprise EF/évacuation + châssis + cuvette + plaque', {
      description: 'Reprise des arrivées EF et Evacuation pour les toilettes\nPose et raccordement du châssis avec renforts\nPose et raccordement cuvette suspendue avec abattant et plaque de déclenchement',
      unit: 'U', price: 630
    }),
    _lib('Plomberie', 'Toilettes à poser - reprise EF/évacuation + pose et raccordement + abattant', { unit: 'U', price: 280 }),
    _lib('Plomberie', 'Vasque SIMPLE - reprise EC EF/évacuation + pose et raccordement + robinetterie', { unit: 'U', price: 350 }),
    _lib('Plomberie', 'Vasque DOUBLE - reprise EC EF/évacuation + pose et raccordement vasques doubles + robinetteries', { unit: 'U', price: 450 }),
    _lib('Plomberie', 'Lave-linge - création EF + évacuation (hors branchement)', { unit: 'U', price: 180 }),
    _lib('Plomberie', 'Sèche-linge - création évacuation (hors branchement)', { unit: 'U', price: 80 }),
    _lib('Plomberie', 'Remplacement sèche-serviettes EAU CHAUDE - chaudière individuelle', {
      description: 'Vidange du réseau de chauffage\nDépose radiateur\nModification du raccordement\nPose et raccordement d\'1 radiateur\nPurge et remise en eau du réseau - essais',
      unit: 'U', price: 350
    }),
    _lib('Plomberie', 'Remplacement sèche-serviettes EAU CHAUDE - chaudière collective', {
      description: 'Vidange du réseau de chauffage\nDépose radiateur\nModification du raccordement\nPose et raccordement d\'1 radiateur\nPurge et remise en eau du réseau - essais\nNB : intervention chauffagiste de l\'immeuble nécessaire pour couper et remettre en eau',
      unit: 'U', price: 450
    }),
    _lib('Plomberie', 'Remplacement / déplacement ballon électrique', {
      description: 'Dépose ancien ballon + évacuation et mise en déchetterie\nReprise des arrivées EC EF et Evacuation\nReprise de la ligne électrique\nPose et raccordement du ballon\nMise en eau et essais',
      unit: 'U', price: 450
    }),
    _lib('Plomberie', 'Forfait intervention + déplacement Plombier', { unit: 'U', price: 90 }),
    _lib('Plomberie', 'Recherche de fuite / diagnostic plomberie', { unit: 'h', price: 75 }),
    _lib('Plomberie', 'Débouchage canalisation', { unit: 'U', price: 120 }),
    _lib('Plomberie', 'Remplacement robinet d\'arrêt', { unit: 'U', price: 80 }),

    /* ─── Electricité ─── */
    _lib('Electricité', 'Mise en sécurité électrique de la pièce', { unit: 'U', price: 0, allowZeroPrice: true }),
    _lib('Electricité', 'Reprise ligne pour déplacement d\'une prise électrique', { unit: 'U', price: 90 }),
    _lib('Electricité', 'Reprise ligne électrique pour éclairage plafond', { unit: 'U', price: 135 }),
    _lib('Electricité', 'Reprise ligne électrique pour éclairage miroir', { unit: 'U', price: 90 }),
    _lib('Electricité', 'Reprise ligne pour déplacement radiateur électrique', { unit: 'U', price: 135 }),
    _lib('Electricité', 'Reprise ligne pour alimentation extracteur d\'air', { unit: 'U', price: 135 }),
    _lib('Electricité', 'Reprise ligne pour alimentation appareil électroménager', { unit: 'U', price: 135 }),
    _lib('Electricité', 'Pose et raccordement éclairage miroir', { unit: 'U', price: 60 }),
    _lib('Electricité', 'Pose et raccordement plafonnier / applique murale', { unit: 'U', price: 70 }),
    _lib('Electricité', 'Pose et raccordement extracteur d\'air', { unit: 'U', price: 60 }),
    _lib('Electricité', 'Pose et raccordement sèche-serviettes électrique', { unit: 'U', price: 80 }),
    _lib('Electricité', 'Ajout disjoncteur différentiel 30mA 63A type AC', { unit: 'U', price: 225 }),
    _lib('Electricité', 'Déplacement point électrique sur même mur < 60cm NON PORTEUR', { unit: 'U', price: 90 }),
    _lib('Electricité', 'Déplacement point électrique sur autre mur ou >60cm', { unit: 'U', price: 135 }),
    _lib('Electricité', 'Remplacement prise ou interrupteur (hors fournitures)', { unit: 'U', price: 15 }),
    _lib('Electricité', 'Forfait intervention + déplacement Electricien', { unit: 'U', price: 90 }),

    /* ─── Sol / parquet ─── */
    _lib('Sol / parquet', 'Dépose plinthes existantes', { unit: 'ml', price: 8 }),
    _lib('Sol / parquet', 'Pose plinthes MDF à peindre', { unit: 'ml', price: 24 }),
    _lib('Sol / parquet', 'Ragréage de sol avant pose nouveau revêtement', { unit: 'm²', price: 18 }),
    _lib('Sol / parquet', 'Pose parquet flottant clipsable', { unit: 'm²', price: 35 }),
    _lib('Sol / parquet', 'Rénovation parquet ancien (ponçage + vitrification)', { unit: 'm²', price: 45 }),

    /* ─── Menuiserie ─── */
    _lib('Menuiserie', 'Pose porte intérieure pré-peinte (huisserie + bloc-porte)', { unit: 'U', price: 280 }),
    _lib('Menuiserie', 'Dépose porte + encadrement + cloison partielle', { unit: 'U', price: 180 }),
    _lib('Menuiserie', 'Pose porte coulissante à galandage AVEC conservation cadre', {
      description: 'Pose châssis à galandage en applique\nHabillage châssis BA13 hydro\nBandes jonction et enduit général\nFaçonnage et pose porte coulissante isoplane pré-peinte\nPose poignée et accessoires',
      unit: 'U', price: 950
    }),
    _lib('Menuiserie', 'Pose porte coulissante à galandage SANS conservation cadre', {
      description: 'Dépose porte + encadrement + cloison partielle\nEvacuation gravats\nMontage et pose châssis Galandage\nHabillage BA13 hydro intérieur / classique extérieur\nFaçonnage et pose porte coulissante Isoplane Pré-peinte\nPose poignée et accessoires',
      unit: 'U', price: 1380
    }),
    _lib('Menuiserie', 'Pose porte coulissante en applique sur rail apparent', { unit: 'U', price: 0, allowZeroPrice: true }),
    _lib('Menuiserie', 'Création placard sur mesure (2 portes MDF + étagères)', {
      description: '2 portes MDF à peindre avec charnières\n2-3 étagères\nPose poignées (fournies client)\nMise en peinture intérieur/extérieur',
      unit: 'U', price: 520
    }),

    /* ─── Fournitures SDB ─── */
    _lib('Fournitures', 'Carrelage sol (y compris chutes)', { unit: 'm²', price: 30, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Plinthes assorties au carrelage sol', { unit: 'ml', price: 12, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Carrelage mural (y compris chutes)', { unit: 'm²', price: 35, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Receveur de douche extraplat 80×120cm', { unit: 'U', price: 240, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Vidage receveur capot chromé "TurboFlow"', { unit: 'U', price: 67, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Lot de pieds réglables pour receveur', { unit: 'U', price: 15, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Mitigeur de douche', { unit: 'U', price: 149, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Kit barre de douche pommeau + flexible', { unit: 'U', price: 69, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Paroi de douche fixe verre transparent profilés chromés L80cm', { unit: 'U', price: 190, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Paroi de douche pivotante déflecteur L40cm', { unit: 'U', price: 130, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Baignoire acrylique renforcée 170×70cm avec pieds', { unit: 'U', price: 190, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Mitigeur bain/douche chromé', { unit: 'U', price: 179, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Ecran de baignoire L70 H140cm', { unit: 'U', price: 99, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Meuble sous-vasque avec pieds L80cm', { unit: 'U', price: 350, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Vasque compatible meuble', { unit: 'U', price: 120, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Mitigeur lavabo', { unit: 'U', price: 89, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Bonde automatique chromée', { unit: 'U', price: 25, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Déport siphon (gain de place)', { unit: 'U', price: 19, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Miroir SANS éclairage', { unit: 'U', price: 80, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Eclairage miroir L30cm chromé LED', { unit: 'U', price: 55, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Colonne de rangement L30 H180cm', { unit: 'U', price: 160, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Sèche-serviettes eau chaude (à valider chauffagiste)', { unit: 'U', price: 280, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Sèche-serviettes électrique L50 H100 500W', { unit: 'U', price: 180, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Tés de raccordement + robinet thermostatique radiateur', { unit: 'U', price: 67, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Châssis suspendu Geberit UP320', { unit: 'U', price: 290, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Plaque de déclenchement Sigma blanche', { unit: 'U', price: 69, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Cuvette suspendue carénée + abattant frein de chute', { unit: 'U', price: 180, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Pack WC à poser + abattant frein de chute', { unit: 'U', price: 180, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Ballon électrique', { unit: 'U', price: 0, suppliedBy: 'aj_pro', allowZeroPrice: true }),
    _lib('Fournitures', 'Groupe de sécurité ballon', { unit: 'U', price: 35, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Siphon ballon électrique', { unit: 'U', price: 12, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Raccords di-électriques', { unit: 'U', price: 12.30, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Barre de seuil', { unit: 'U', price: 20, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Baguette finition angle carrelage alu mat', { unit: 'U', price: 26, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Prise électrique simple Legrand Céliane blanc', { unit: 'U', price: 14.63, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Prise électrique double Legrand Céliane blanc', { unit: 'U', price: 34.20, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Interrupteur simple Legrand Céliane blanc', { unit: 'U', price: 17.44, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Bouche d\'aération VMC', { unit: 'U', price: 29, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Grille de contrôle / ventilation', { unit: 'U', price: 17, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Extracteur d\'air hygrométrique', { unit: 'U', price: 159, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Plafonnier / applique murale - FOURNI CLIENT', {
      description: 'Plafonnier / applique murale --> fourni / client',
      unit: 'U', price: 0, suppliedBy: 'client', allowZeroPrice: true
    }),
    _lib('Fournitures', 'Patères / porte-serviettes / porte-savon - FOURNI CLIENT', {
      description: 'Patères / porte-serviettes / porte savon --> fourni / client',
      unit: 'U', price: 0, suppliedBy: 'client', allowZeroPrice: true
    }),
    _lib('Fournitures', 'Pipe de raccordement PVC', { unit: 'U', price: 12, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Robinet d\'arrêt toilettes', { unit: 'U', price: 18, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Bloc-porte intérieur pré-peint', { unit: 'U', price: 180, suppliedBy: 'aj_pro' }),
    _lib('Fournitures', 'Peinture blanche velours lessivable 10L', { unit: 'U', price: 75, suppliedBy: 'aj_pro' }),

    /* ─── Livraison ─── */
    _lib('Livraison', 'Participation aux frais de livraison - y compris acheminement dans le logement', { unit: 'U', price: 200 }),
    _lib('Livraison', 'Livraison fournitures rénovation complète logement', { unit: 'U', price: 350 }),

    /* ─── Options ─── */
    _lib('Options', 'Plafond suspendu (ossature + plaques + bandes)', {
      description: 'Fourniture et pose ossature métallique + plaques de plâtre + acheminement matériaux + bandes de jonction Placo',
      unit: 'm²', price: 210, status: 'option'
    }),
    _lib('Options', 'Spots encastrés dans le faux plafond - distribution + pose et raccordement', { unit: 'U', price: 210, status: 'option' }),
    _lib('Options', 'Spot encastré ÉTANCHE blanc 220V LED', { unit: 'U', price: 55, status: 'option', suppliedBy: 'aj_pro' }),
    _lib('Options', 'Doublage + niche carrelée (BA13 hydro + niche)', {
      description: 'Création coffrage en BA13 hydrofuge sur ossature au droit de la douche/baignoire toute hauteur\nCréation d\'1 niche carrelée dans coffrage avec baguette de finition d\'angle',
      unit: 'U', price: 916, status: 'option'
    }),
    _lib('Options', 'Masquage tuyaux apparents (coffrage + carrelage + baguette)', { unit: 'U', price: 460, status: 'option' }),
    _lib('Options', 'Remplacement vanne d\'isolement du logement', {
      description: 'Coupure et vidange de la colonne (accord copropriété nécessaire)\nFourniture et pose d\'1 vanne d\'arrêt\nMise en service et essais',
      unit: 'U', price: 240, status: 'option'
    }),
    _lib('Options', 'Mise en teinte des peintures', { unit: 'U', price: 180, status: 'option' }),
    _lib('Options', 'Pose poignée PMR', { unit: 'U', price: 60, status: 'option' }),
    _lib('Options', 'Pose siège amovible PMR', { unit: 'U', price: 80, status: 'option' }),
    _lib('Options', 'Création placard sur mesure (au-dessus toilettes)', {
      description: '2 portes MDF à peindre avec charnières + 2-3 étagères + pose poignées (fournies client) + mise en peinture',
      unit: 'U', price: 520, status: 'option'
    }),

    /* ─── Dépannage ─── */
    _lib('Dépannage', 'Forfait intervention + déplacement Plombier', { unit: 'U', price: 90 }),
    _lib('Dépannage', 'Forfait intervention + déplacement Electricien', { unit: 'U', price: 90 }),
    _lib('Dépannage', 'Recherche de panne / diagnostic', { unit: 'h', price: 75 }),
    _lib('Dépannage', 'Forfait produit déboucheur (si nécessaire)', { unit: 'U', price: 18, status: 'to_confirm' }),
    _lib('Dépannage', 'Recherche de panne radiateur électrique + réparation mineure si possible', { unit: 'U', price: 90 })
  ];

  /* Renvoie la liste unique des catégories de la bibliothèque */
  function getLibraryCategories(){
    var cats = [];
    QUOTE_LINE_LIBRARY.forEach(function(l){
      if(cats.indexOf(l.category) === -1) cats.push(l.category);
    });
    return cats;
  }

  /* ─────────────────────────────────────────────────────────────────
     EXPORTS
     ───────────────────────────────────────────────────────────────── */
  window.AJ_QUOTE_CONSTANTS = {
    AJ_PRO_COMPANY: AJ_PRO_COMPANY,
    AJ_PRO_TVA_ATTESTATION: AJ_PRO_TVA_ATTESTATION,
    AJ_PRO_SIGNATURE_MENTION: AJ_PRO_SIGNATURE_MENTION,
    AJ_PRO_TERMS_INTRO: AJ_PRO_TERMS_INTRO,
    AJ_PRO_TERMS_AND_CONDITIONS: AJ_PRO_TERMS_AND_CONDITIONS,
    QUOTE_DOC_TYPES: QUOTE_DOC_TYPES,
    QUOTE_LINE_STATUSES: QUOTE_LINE_STATUSES,
    QUOTE_SUPPLIED_BY: QUOTE_SUPPLIED_BY,
    QUOTE_LINE_TYPES: QUOTE_LINE_TYPES,
    QUOTE_SECTION_TYPES: QUOTE_SECTION_TYPES,
    QUOTE_DEFAULT_SETTINGS: QUOTE_DEFAULT_SETTINGS,
    QUOTE_TEMPLATES: QUOTE_TEMPLATES,
    QUOTE_UNITS: QUOTE_UNITS,
    QUOTE_LINE_LIBRARY: QUOTE_LINE_LIBRARY,
    getLibraryCategories: getLibraryCategories,
    /* Helpers exposés (build templates au runtime, fresh ids) */
    buildTemplate: function(templateId){
      var src = QUOTE_TEMPLATES.find(function(t){ return t.id === templateId; });
      if(!src) return null;
      /* Deep clone + nouveaux ids pour chaque section et ligne */
      var copy = JSON.parse(JSON.stringify(src));
      copy.sections.forEach(function(sec){
        sec.id = _id('s_');
        (sec.lines || []).forEach(function(ln){ ln.id = _id('l_'); });
      });
      return copy;
    },
    listTemplates: function(){
      return QUOTE_TEMPLATES.map(function(t){
        return { id: t.id, label: t.label, description: t.description, icon: t.icon, typeDocument: t.typeDocument };
      });
    },
    /* Convertit une entrée bibliothèque en ligne de devis (avec id frais) */
    buildLineFromLibrary: function(libId){
      var src = QUOTE_LINE_LIBRARY.find(function(l){ return l.id === libId; });
      if(!src) return null;
      return {
        id: _id('l_'),
        number: '',
        designation: src.designation,
        description: src.description || '',
        quantity: src.defaultQty,
        unit: src.defaultUnit,
        unitPriceBeforeDiscount: null,
        discountPercent: 0,
        unitPriceHT: src.defaultPrice,
        totalHT: 0,
        type: src.defaultType || 'normal',
        status: src.defaultStatus || 'included',
        suppliedBy: src.defaultSuppliedBy || null,
        visible: true,
        order: 0,
        allowNegativeQuantity: false,
        allowZeroPrice: src.allowZeroPrice !== false,
        highlighted: false,
        highlightColor: null,
        metadata: { fromLibrary: src.id }
      };
    }
  };
})();
