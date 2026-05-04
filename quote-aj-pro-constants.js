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

  var QUOTE_TEMPLATES = [
    _tplVide(),
    _tplAvenantVide(),
    _tplIntervention(),
    _tplPeinture(),
    _tplSdbSimple()
  ];

  /* ─────────────────────────────────────────────────────────────────
     UNITÉS USUELLES (pour datalist dans l'éditeur)
     ───────────────────────────────────────────────────────────────── */
  var QUOTE_UNITS = ['U', 'm²', 'ml', 'h', 'j', 'forfait', 'kg', 'L', 'lot', 'ens'];

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
    }
  };
})();
