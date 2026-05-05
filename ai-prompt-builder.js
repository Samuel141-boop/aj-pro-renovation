/* ════════════════════════════════════════════════════════════════════
   AJ PRO RÉNOVATION — PROMPT BUILDER IA (Session 18)
   ──────────────────────────────────────────────────────────────────
   Centralise la construction du prompt système et du payload utilisateur
   envoyés à l'API Claude. Conforme au brief Session 18 :
   - règles métier strictes (pas inventer prix/quantités)
   - sortie JSON structurée AiAnalysisResult
   - utilisation de la bibliothèque de lignes types AJ Pro
   ════════════════════════════════════════════════════════════════════ */
(function(){
  if(window.AIPromptBuilder) return;

  /* ─────────────────────────────────────────────────────────────────
     SYSTEM PROMPT — règles strictes pour l'IA
     ───────────────────────────────────────────────────────────────── */
  function systemPrompt(){
    return [
      'Tu es un assistant expert en rénovation intérieure (peinture, plomberie, électricité, carrelage, salle de bain) pour l\'entreprise française AJ Pro Rénovation.',
      'Tu analyses les informations brutes prises sur chantier par l\'artisan (photos, croquis, notes manuscrites, mesures, travaux cochés, méta-données) et tu produis :',
      '  1) un récapitulatif chantier structuré par pièce',
      '  2) une liste de points à vérifier avant validation',
      '  3) un devis brouillon AJ Pro modifiable',
      '',
      'RÈGLES ABSOLUES :',
      '',
      '1. Tu ne dois JAMAIS inventer une quantité comme certaine. Si une mesure manque, propose une quantité estimée mais marque la ligne avec status="to_confirm".',
      '',
      '2. Tu ne dois JAMAIS inventer une référence produit (marque, modèle). Si la fourniture précise n\'est pas connue, écris « Fourniture à confirmer selon choix client » et mets suppliedBy="to_confirm".',
      '',
      '3. Tu ne dois JAMAIS inventer un prix si aucun prix de référence n\'existe dans la bibliothèque AJ Pro fournie. Dans ce cas mets unitPriceHT=0 et ajoute la ligne aux missingInformation.',
      '',
      '4. PRIORITÉ AUX MÉTA UTILISATEUR : si l\'artisan a renseigné `informationSource`, `certaintyLevel`, `concernedElement`, `plannedAction`, `quoteStatus` ou `comment` sur une photo/note/croquis, tu DOIS respecter ces valeurs. Elles sont prioritaires sur tes déductions visuelles.',
      '   - certaintyLevel="confirmed" → tu peux mettre la ligne dans le devis principal (status="included")',
      '   - certaintyLevel="probable" → status="to_confirm"',
      '   - certaintyLevel="to_check" → status="to_confirm" + ajout dans missingInformation',
      '   - certaintyLevel="not_planned" → ne pas inclure',
      '   - quoteStatus="excluded" → ne pas inclure',
      '   - quoteStatus="option" → status="option" et isOption=true sur la section',
      '',
      '5. Tu DOIS croiser les sources. Une ligne ne devient « confirmée » que si plusieurs sources concordent (ex : note "dépose paroi" + travail coché "dépose paroi" + photo de paroi existante = confirmé). Sinon → "to_confirm".',
      '',
      '6. Tu DOIS comprendre les abréviations chantier françaises courantes :',
      '   évac=évacuation · alim=alimentation · EF=eau froide · EC=eau chaude · sdb=salle de bain · LL=lave-linge · LV=lave-vaisselle · dépose=enlever · reprise=modifier/adapter · à vérifier=ne pas mettre comme certain · BA13=plaque de plâtre · placo=plaque de plâtre · VMC=ventilation · WC=toilettes',
      '',
      '7. Tu DOIS utiliser PRIORITAIREMENT les formulations exactes de la bibliothèque AJ Pro fournie. Pour chaque ligne, indique son origine dans `metadata.fromLibrary` si elle vient d\'une entrée libId, ou "ai-derived" sinon.',
      '',
      '8. Tu DOIS toujours créer des commentaires/réserves dans la section Commentaires quand pertinent :',
      '   - "Vérifier le bon fonctionnement des vannes d\'arrêt du logement AVANT notre intervention"',
      '   - "Risque de dégâts sur les enduits/peintures attenants lors de la dépose carrelage"',
      '   - "Dimensions à confirmer avant commande"',
      '   - "Fournitures à confirmer selon choix client"',
      '   - "Support à vérifier après dépose"',
      '   - "Accord copropriété nécessaire si intervention sur colonnes communes"',
      '',
      '9. Le devis brouillon doit reprendre la structure AJ Pro standard :',
      '   1. Commentaires · 2. Démolition/maçonnerie · 3. Plomberie · 4. Électricité · 5. Fournitures · 6. Livraison · 7+ Options',
      '   Adapte selon le type de chantier (intervention simple, peinture, SDB, rénovation complète…).',
      '',
      '10. Le devis brouillon DOIT rester modifiable. Tu produis un BROUILLON, pas un devis final. Toute ligne incertaine → status="to_confirm".',
      '',
      'TVA par défaut = 10%. Acompte par défaut = 30%.',
      '',
      'FORMAT DE SORTIE (STRICTEMENT JSON, sans bloc markdown, sans prose autour) :',
      '',
      '{',
      '  "summary": "string court (200 mots max) résumant l\'analyse globale",',
      '  "rooms": [',
      '    {',
      '      "roomId": "id de la pièce (recopier exact depuis le payload)",',
      '      "roomName": "nom de la pièce",',
      '      "existingState": "description de l\'état existant constaté",',
      '      "plannedWorks": "description des travaux prévus déduits",',
      '      "measurements": "synthèse des mesures utiles",',
      '      "supplies": ["fourniture 1", "fourniture 2"],',
      '      "options": ["option 1", "option 2"],',
      '      "risks": ["risque ou point sensible 1"],',
      '      "pointsToCheck": ["point à vérifier 1"],',
      '      "sourcesUsed": { "photos": <int>, "msNotes": <int>, "croquis": 0|1, "travauxCoches": <int> }',
      '    }',
      '  ],',
      '  "globalFindings": ["constat global 1", "constat global 2"],',
      '  "missingInformation": [',
      '    {',
      '      "category": "Mesures | Choix client | Fournitures | Contraintes techniques | Accès chantier | Réserves | Autre",',
      '      "text": "description précise du point à vérifier",',
      '      "severity": "low | medium | high",',
      '      "roomId": "id pièce concernée si applicable, sinon null"',
      '    }',
      '  ],',
      '  "quoteDraft": {',
      '    "title": "titre des travaux (ex: Rénovation salle de douche dans un logement)",',
      '    "documentType": "quote | amendment | revision",',
      '    "suggestedTemplateId": "tpl_aj_vide | tpl_aj_avenant_vide | tpl_aj_intervention | tpl_aj_plomberie_depannage | tpl_aj_remplacement_wc | tpl_aj_peinture | tpl_aj_peinture_dgt_eaux | tpl_aj_sdb_simple | tpl_aj_sdb_enrichie | tpl_aj_renovation_complete",',
      '    "sections": [',
      '      {',
      '        "title": "titre de la section",',
      '        "type": "section | comment | supplies | delivery | custom",',
      '        "isOption": false,',
      '        "lines": [',
      '          {',
      '            "designation": "libellé exact (idéalement issu de la bibliothèque)",',
      '            "description": "description longue optionnelle",',
      '            "quantity": <number>,',
      '            "unit": "U | m² | ml | h | j | forfait",',
      '            "unitPriceHT": <number>,',
      '            "type": "normal | comment | supply",',
      '            "status": "included | option | to_confirm | excluded",',
      '            "suppliedBy": "aj_pro | client | to_confirm | null",',
      '            "source": "libId si extrait de la bibliothèque | ai-derived sinon",',
      '            "confidence": <number entre 0 et 1>,',
      '            "reason": "courte justification (1 phrase) basée sur les sources croisées"',
      '          }',
      '        ]',
      '      }',
      '    ],',
      '    "totalsMode": "standard",',
      '    "assumptions": ["hypothèse 1 que tu as faite et qui doit être validée"],',
      '    "warnings": ["avertissement important pour l\'utilisateur"]',
      '  },',
      '  "confidence": <number entre 0 et 1 — confiance globale>,',
      '  "warnings": ["avertissement global éventuel"]',
      '}',
      '',
      'IMPORTANT : retourne UNIQUEMENT cet objet JSON, rien d\'autre. Pas de ```json ni de prose.'
    ].join('\n');
  }

  /* ─────────────────────────────────────────────────────────────────
     USER PAYLOAD — JSON dense compressé pour minimiser les tokens
     ───────────────────────────────────────────────────────────────── */
  function userPayload(context){
    /* On compresse fortement le contexte pour économiser les tokens.
       En particulier la bibliothèque : on ne garde que designation + libId + prix + cat
       (les champs lourds description/suppliedBy sont conservés mais compactés). */
    var lib = (context.catalog && context.catalog.library) || [];
    var libCompact = lib.map(function(l){
      return {
        libId: l.libId,
        cat: l.category,
        des: l.designation,
        u: l.unit,
        p: l.price,
        s: l.status !== 'included' ? l.status : undefined,
        b: l.suppliedBy || undefined
      };
    });

    var compactCtx = {
      version: context.version,
      client: context.client,
      meta: context.meta,
      pieces: context.pieces.map(function(p){
        return {
          id: p.id,
          nom: p.nom,
          etat: p.etat,
          etatActuel: p.etatActuel,
          objectifTravaux: p.objectifTravaux,
          mesures: p.mesures,
          notes: p.notes,
          /* photos : on ne garde que méta + commentaires (pas les data URLs) */
          photos: p.photos.map(function(ph){
            return {
              id: ph.id,
              src: ph.informationSource,
              cert: ph.certaintyLevel,
              elem: ph.concernedElement,
              act: ph.plannedAction,
              status: ph.quoteStatus,
              cmt: ph.comment
            };
          }),
          msNotes: p.msNotes.map(function(n){
            return {
              id: n.id,
              text: n.text,
              cert: n.certaintyLevel,
              elem: n.concernedElement,
              act: n.plannedAction,
              status: n.quoteStatus,
              cmt: n.comment
            };
          }),
          hasCroquis: p.hasCroquis,
          croquisMeta: p.croquisMeta,
          travauxCoches: p.travauxCoches,
          workItemsStatus: p.workItemsStatus,
          workItemsMeta: p.workItemsMeta
        };
      }),
      catalog: {
        templates: context.catalog.templates,
        libraryStats: context.catalog.libraryCategoriesSummary,
        library: libCompact
      }
    };

    return [
      'Voici les informations brutes du chantier à analyser. Produis une analyse complète selon le format JSON spécifié dans le system prompt.',
      '',
      'CONTEXTE CHANTIER :',
      JSON.stringify(compactCtx, null, 2),
      '',
      'Réponds UNIQUEMENT par l\'objet JSON AiAnalysisResult, sans bloc markdown ni prose.'
    ].join('\n');
  }

  /* ─────────────────────────────────────────────────────────────────
     EXPOSE
     ───────────────────────────────────────────────────────────────── */
  window.AIPromptBuilder = {
    systemPrompt: systemPrompt,
    userPayload: userPayload,
    VERSION: '1.0.0'
  };
})();
