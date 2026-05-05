/* ════════════════════════════════════════════════════════════════════
   AJ PRO RÉNOVATION — SERVICE D'ANALYSE IA (Session 18)
   ──────────────────────────────────────────────────────────────────
   Orchestre l'analyse IA complète d'un chantier :
   1) Collecte toutes les données (client, pièces, photos, croquis,
      notes, mesures, travaux, méta IA-ready)
   2) Construit le prompt système + payload structuré
   3) Appelle l'API Claude via /api/claude (proxy Vercel)
      ou fallback automatique sur le moteur local quote-fusion
   4) Parse la réponse JSON normalisée AiAnalysisResult
   5) Mappe vers une structure compatible avec AJQuotes (devis brouillon)

   Tout résultat reste un BROUILLON modifiable — aucune validation
   automatique, aucune émission. L'humain valide toujours.

   API publique : window.AIAnalysis
   - collectContext(clientId)            → payload prêt pour l'IA
   - runAnalysis(clientId, opts)         → Promise<AiAnalysisResult>
   - createQuoteDraftFromAnalysis(res)   → crée un devis dans AJQuotes
   ════════════════════════════════════════════════════════════════════ */
(function(){
  if(window.AIAnalysis) return;

  /* ─────────────────────────────────────────────────────────────────
     UTILITAIRES INTERNES
     ───────────────────────────────────────────────────────────────── */
  function _trim(s, n){ if(!s) return ''; s = String(s); return s.length > n ? s.slice(0, n) + '…' : s; }

  /* ─────────────────────────────────────────────────────────────────
     1. COLLECTE DU CONTEXTE CHANTIER
     ───────────────────────────────────────────────────────────────── */
  function collectContext(clientId){
    if(typeof dbLoad !== 'function'){ throw new Error('dbLoad indisponible — chargement app non fini'); }
    var db = dbLoad();
    var client = (db.clients || {})[clientId];
    if(!client) throw new Error('Client introuvable: ' + clientId);

    var pieces = Object.values(db.pieces || {})
      .filter(function(p){ return p.clientId === clientId; })
      .sort(function(a, b){ return (a.createdAt || 0) - (b.createdAt || 0); });

    /* Bibliothèque de lignes types (Session 17) — fournie comme référence */
    var library = [];
    if(window.AJ_QUOTE_CONSTANTS && window.AJ_QUOTE_CONSTANTS.QUOTE_LINE_LIBRARY){
      library = window.AJ_QUOTE_CONSTANTS.QUOTE_LINE_LIBRARY.map(function(l){
        return {
          libId: l.id,
          category: l.category,
          designation: l.designation,
          description: l.description || '',
          unit: l.defaultUnit,
          price: l.defaultPrice,
          status: l.defaultStatus,
          suppliedBy: l.defaultSuppliedBy
        };
      });
    }

    /* Templates dispo */
    var templates = [];
    if(window.AJ_QUOTE_CONSTANTS && window.AJ_QUOTE_CONSTANTS.listTemplates){
      templates = window.AJ_QUOTE_CONSTANTS.listTemplates();
    }

    /* Méta IA-ready Sessions 12-14 sur le client */
    var clientMeta = {
      contexte: client.contexte || {},
      clientRequest: client.clientRequest || '',
      notesTerrain: client.notesTerrain || '',
      siteConstraints: client.siteConstraints || [],
      technicalPoints: client.technicalPoints || [],
      pointsToCheck: client.pointsToCheck || [],
      workOptions: client.workOptions || [],
      plannedMaterials: client.plannedMaterials || [],
      plannedLabor: client.plannedLabor || [],
      removalItems: client.removalItems || [],
      devisReserves: client.devisReserves || []
    };

    /* Pour chaque pièce : collecte enrichie */
    var piecesPayload = pieces.map(function(p){
      /* Photos — méta IA-ready (informationSource, certaintyLevel,
         concernedElement, plannedAction, quoteStatus, comment) */
      var photos = (p.photos || []).map(function(ph, i){
        return {
          id: ph.id || 'ph_' + i,
          /* On NE met PAS les data:image en payload (trop gros + cher en tokens
             et l'API standard "messages" ne fait pas de vision auto). */
          hasContent: !!(ph.dataUrl || ph.thumbDataUrl || ph.dataURL),
          informationSource: ph.informationSource || 'photo',
          certaintyLevel: ph.certaintyLevel || 'to_check',
          concernedElement: ph.concernedElement || null,
          plannedAction: ph.plannedAction || null,
          quoteStatus: ph.quoteStatus || 'to_confirm',
          comment: _trim(ph.comment || '', 300)
        };
      });

      /* Notes manuscrites (msNotes) */
      var msNotes = (p.msNotes || []).map(function(n, i){
        return {
          id: n.id || 'msn_' + i,
          /* Pas de strokes en payload — juste le texte OCR si dispo + méta */
          text: _trim(n.ocrText || n.text || '', 800),
          informationSource: n.informationSource || 'note',
          certaintyLevel: n.certaintyLevel || 'to_check',
          concernedElement: n.concernedElement || null,
          plannedAction: n.plannedAction || null,
          quoteStatus: n.quoteStatus || 'to_confirm',
          comment: _trim(n.comment || '', 300)
        };
      });

      /* Croquis méta */
      var croquisMeta = p.croquisMeta || null;
      var hasCroquis = !!(p.croquis || (p.croquisStrokes && p.croquisStrokes.length));

      /* Travaux cochés — extraction des cats */
      var travaux = p.travaux || {};
      var travauxCoches = [];
      Object.keys(travaux).forEach(function(k){
        var t = travaux[k];
        if(!t) return;
        if(typeof t === 'object'){
          /* Plafond, plinthe, biblio, fenetre… avec types[] */
          if(t.types && t.types.length) travauxCoches.push({ cat: k, types: t.types });
          /* Murs[] */
          if(Array.isArray(t)){
            t.forEach(function(item, idx){
              if(item && item.types && item.types.length){
                travauxCoches.push({ cat: k + '[' + idx + ']', types: item.types });
              }
            });
          }
        } else if(t === true){
          travauxCoches.push({ cat: k, value: true });
        }
      });

      return {
        id: p.id,
        nom: p.nom || '',
        icon: p.icon || '',
        etat: p.etat || '',
        etatActuel: _trim(p.etatActuel || '', 800),
        objectifTravaux: _trim(p.objectifTravaux || '', 800),
        mesures: p.mesures || {},
        nbPhotos: photos.length,
        photos: photos,
        notes: _trim(p.notes || '', 1500),
        nbMsNotes: msNotes.length,
        msNotes: msNotes,
        hasCroquis: hasCroquis,
        croquisMeta: croquisMeta,
        travauxCoches: travauxCoches,
        workItemsStatus: p.workItemsStatus || {},
        workItemsMeta: p.workItemsMeta || {}
      };
    });

    return {
      version: 'aj-ia-1',
      timestamp: Date.now(),
      client: {
        id: client.id,
        prenom: client.prenom || '',
        nom: client.nom || '',
        civilite: client.civilite || '',
        tel: client.tel || client.telephone || '',
        email: client.email || '',
        adresse: client.adresse || '',
        cp: client.cp || client.codePostal || '',
        ville: client.ville || '',
        type: client.type || client.typeLogement || '',
        etage: client.etage || '',
        ascenseur: client.ascenseur || '',
        codeAccess: client.codeAccess || client.codePortail || '',
        interphone: client.interphone || '',
        observations: _trim(client.observations || '', 1000)
      },
      meta: clientMeta,
      pieces: piecesPayload,
      catalog: {
        templates: templates,
        libraryCategoriesSummary: (function(){
          if(!window.AJ_QUOTE_CONSTANTS || !window.AJ_QUOTE_CONSTANTS.getLibraryCategories) return [];
          var cats = window.AJ_QUOTE_CONSTANTS.getLibraryCategories();
          return cats.map(function(c){
            var n = library.filter(function(l){ return l.category === c; }).length;
            return { category: c, count: n };
          });
        })(),
        /* On envoie la lib complète mais compactée pour limiter les tokens */
        library: library
      }
    };
  }

  /* ─────────────────────────────────────────────────────────────────
     2. PROMPT BUILDER — système + user (chargé depuis ai-prompt-builder.js)
     ───────────────────────────────────────────────────────────────── */
  function buildSystemPrompt(){
    if(window.AIPromptBuilder && window.AIPromptBuilder.systemPrompt){
      return window.AIPromptBuilder.systemPrompt();
    }
    /* Fallback minimal si ai-prompt-builder.js pas chargé */
    return 'Tu es un assistant expert en rénovation AJ Pro. Analyse le chantier et produis un JSON strict avec rooms, missingInformation, quoteDraft.';
  }

  function buildUserPayload(context){
    if(window.AIPromptBuilder && window.AIPromptBuilder.userPayload){
      return window.AIPromptBuilder.userPayload(context);
    }
    return JSON.stringify(context, null, 2);
  }

  /* ─────────────────────────────────────────────────────────────────
     3. APPEL API CLAUDE (via proxy Vercel) — avec fallback local
     ───────────────────────────────────────────────────────────────── */
  function callClaudeAPI(systemPrompt, userPayload, opts){
    opts = opts || {};
    var endpoint = opts.endpoint || '/api/claude';
    var model = opts.model || 'claude-sonnet-4-5';
    var maxTokens = opts.maxTokens || 4000;
    var timeout = opts.timeout || 60000;

    return new Promise(function(resolve, reject){
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = setTimeout(function(){
        if(ctrl) ctrl.abort();
        reject(new Error('Timeout après ' + timeout + 'ms'));
      }, timeout);

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPayload }]
        }),
        signal: ctrl ? ctrl.signal : undefined
      })
      .then(function(r){
        clearTimeout(timer);
        return r.json().then(function(json){ return { status: r.status, json: json }; });
      })
      .then(function(res){
        if(res.status === 503){
          /* Pas de clé API configurée — c'est attendu, on bascule fallback */
          var err = new Error('IA non configurée — fallback local');
          err.code = 'NO_API_KEY';
          err.upstream = res.json;
          reject(err);
          return;
        }
        if(res.status >= 400){
          var err2 = new Error('API error ' + res.status + ': ' + JSON.stringify(res.json).slice(0, 300));
          err2.code = 'API_ERROR';
          reject(err2);
          return;
        }
        resolve(res.json);
      })
      .catch(function(err){
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /* Parse la réponse Claude (format messages.content[0].text contenant du JSON) */
  function parseClaudeResponse(json){
    var text = '';
    if(json && Array.isArray(json.content) && json.content[0] && json.content[0].text){
      text = json.content[0].text;
    } else if(typeof json === 'string'){
      text = json;
    }
    /* Extrait le JSON même si entouré de prose ou de code fences ```json ... ``` */
    var clean = text;
    var fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if(fenceMatch) clean = fenceMatch[1];
    var braceMatch = clean.match(/\{[\s\S]*\}/);
    if(braceMatch) clean = braceMatch[0];
    try {
      return JSON.parse(clean);
    } catch(e){
      throw new Error('Réponse IA non parsable comme JSON : ' + e.message + ' · extrait : ' + clean.slice(0, 200));
    }
  }

  /* ─────────────────────────────────────────────────────────────────
     4. FALLBACK LOCAL — utilise quote-fusion si dispo, sinon génère
        un récap basique depuis les données collectées
     ───────────────────────────────────────────────────────────────── */
  function runLocalFallback(context){
    /* Génère une AiAnalysisResult cohérente à partir des heuristiques locales */
    var rooms = (context.pieces || []).map(function(p){
      /* État existant : agrégation des notes/photos commentées + état déclaré */
      var existingBits = [];
      if(p.etatActuel) existingBits.push(p.etatActuel);
      if(p.etat) existingBits.push('État déclaré : ' + p.etat);
      p.photos.forEach(function(ph){
        if(ph.comment) existingBits.push('Photo : ' + ph.comment);
      });
      p.msNotes.forEach(function(n){
        if(n.text && n.certaintyLevel === 'confirmed') existingBits.push('Note : ' + n.text);
      });

      /* Travaux prévus : agrégation des cats cochées */
      var plannedBits = [];
      if(p.objectifTravaux) plannedBits.push(p.objectifTravaux);
      p.travauxCoches.forEach(function(t){
        plannedBits.push(t.cat + (t.types ? ' (' + t.types.join(', ') + ')' : ''));
      });

      /* Mesures utiles */
      var mesuresBits = [];
      if(p.mesures){
        ['longueur', 'largeur', 'hsp', 'surfaceSol', 'surfaceMurs'].forEach(function(k){
          if(p.mesures[k]) mesuresBits.push(k + ' : ' + p.mesures[k]);
        });
      }

      /* Points à vérifier déduits des notes "to_check" */
      var pointsToCheck = [];
      p.msNotes.forEach(function(n){
        if(n.certaintyLevel === 'to_check' && n.text) pointsToCheck.push(n.text);
      });
      p.photos.forEach(function(ph){
        if(ph.certaintyLevel === 'to_check' && ph.comment) pointsToCheck.push(ph.comment);
      });

      return {
        roomId: p.id,
        roomName: p.nom,
        existingState: existingBits.join('\n'),
        plannedWorks: plannedBits.join('; '),
        measurements: mesuresBits.join(', '),
        sourcesUsed: {
          photos: p.nbPhotos,
          msNotes: p.nbMsNotes,
          croquis: p.hasCroquis ? 1 : 0,
          travauxCoches: p.travauxCoches.length
        },
        pointsToCheck: pointsToCheck,
        risks: [],
        options: []
      };
    });

    /* Points à vérifier globaux : tout ce qui est "to_confirm" / "to_check" sur le client */
    var missingInformation = [];
    (context.meta.pointsToCheck || []).forEach(function(p){
      if(p.status !== 'resolved') missingInformation.push({
        category: 'Points à vérifier',
        text: p.text,
        severity: 'medium'
      });
    });
    /* Points piece-level */
    rooms.forEach(function(r){
      r.pointsToCheck.forEach(function(t){
        missingInformation.push({ category: 'Pièce ' + r.roomName, text: t, severity: 'medium' });
      });
    });
    /* Si pas de mesures pour une pièce, alerter */
    rooms.forEach(function(r){
      if(!r.measurements){
        missingInformation.push({
          category: 'Mesures', text: 'Pièce « ' + r.roomName + ' » sans mesures — quantités du devis seront à confirmer', severity: 'high'
        });
      }
    });

    /* Devis brouillon : sélectionne un template par défaut + sections vides
       L'humain affinera dans le module Devis */
    var hasSDB = (context.pieces || []).some(function(p){
      var nom = (p.nom || '').toLowerCase();
      return nom.indexOf('salle de bain') !== -1 || nom.indexOf('sdb') !== -1 || nom.indexOf('douche') !== -1;
    });
    var hasPeintureSeule = (context.pieces || []).every(function(p){
      var travaux = p.travauxCoches.map(function(t){ return t.cat; }).join(' ').toLowerCase();
      return travaux.indexOf('peinture') !== -1 || travaux.indexOf('mur') !== -1 || travaux.indexOf('plafond') !== -1;
    }) && (context.pieces || []).length >= 1;

    var suggestedTemplateId;
    var documentType = 'quote';
    if(hasSDB){
      suggestedTemplateId = 'tpl_aj_sdb_enrichie';
    } else if(hasPeintureSeule){
      suggestedTemplateId = 'tpl_aj_peinture';
    } else {
      suggestedTemplateId = 'tpl_aj_vide';
    }

    /* Quote draft : indique juste le template suggéré + avertissements */
    var quoteDraft = {
      title: hasSDB
        ? 'Rénovation d\'une salle de bain dans un logement'
        : (hasPeintureSeule ? 'Travaux de peinture dans un logement' : 'Travaux dans un logement'),
      documentType: documentType,
      suggestedTemplateId: suggestedTemplateId,
      sections: [],
      assumptions: [
        'Analyse locale (sans IA cloud) : devis pré-rempli depuis le template suggéré, à affiner manuellement.',
        'Pour activer l\'IA Claude : configurer ANTHROPIC_API_KEY dans Vercel → Project → Settings.'
      ],
      warnings: missingInformation.length
        ? ['Plusieurs informations sont à vérifier avant émission (' + missingInformation.length + ' points)']
        : []
    };

    return {
      mode: 'local',
      timestamp: Date.now(),
      summary: 'Analyse locale (' + rooms.length + ' pièce' + (rooms.length > 1 ? 's' : '') + ' analysée' + (rooms.length > 1 ? 's' : '') + '). IA Claude non configurée — pour l\'activer voir api/claude.js.',
      rooms: rooms,
      globalFindings: [],
      missingInformation: missingInformation,
      quoteDraft: quoteDraft,
      confidence: 0.5,
      warnings: ['Mode local : qualité de l\'analyse limitée par rapport à une vraie IA Claude.']
    };
  }

  /* ─────────────────────────────────────────────────────────────────
     5. POINT D'ENTRÉE : runAnalysis(clientId, opts) → Promise<result>
     ───────────────────────────────────────────────────────────────── */
  function runAnalysis(clientId, opts){
    opts = opts || {};
    return new Promise(function(resolve){
      var t0 = Date.now();
      var context;
      try {
        context = collectContext(clientId);
      } catch(e){
        resolve({ mode: 'error', error: e.message, durationMs: Date.now() - t0 });
        return;
      }

      /* Si le user force le mode local, ou si on est en dev local sans /api */
      if(opts.forceMode === 'local'){
        var local = runLocalFallback(context);
        local.durationMs = Date.now() - t0;
        local.context = context; // attaché pour debug + UI
        resolve(local);
        return;
      }

      /* Tentative IA Claude */
      var system = buildSystemPrompt();
      var user = buildUserPayload(context);

      callClaudeAPI(system, user, opts)
        .then(function(json){
          try {
            var parsed = parseClaudeResponse(json);
            parsed.mode = 'claude';
            parsed.durationMs = Date.now() - t0;
            parsed.context = context;
            /* Stats utilisation API si dispo */
            if(json.usage){
              parsed.usage = {
                input_tokens: json.usage.input_tokens,
                output_tokens: json.usage.output_tokens
              };
            }
            resolve(parsed);
          } catch(parseErr){
            console.warn('[AIAnalysis] Parse failed, fallback local', parseErr);
            var fallback = runLocalFallback(context);
            fallback.mode = 'local-fallback-parse';
            fallback.parseError = parseErr.message;
            fallback.durationMs = Date.now() - t0;
            fallback.context = context;
            resolve(fallback);
          }
        })
        .catch(function(err){
          console.info('[AIAnalysis] Claude indisponible, fallback local', err.code || err.message);
          var fallback = runLocalFallback(context);
          fallback.mode = (err.code === 'NO_API_KEY') ? 'local' : 'local-fallback-error';
          fallback.fallbackReason = err.message;
          fallback.durationMs = Date.now() - t0;
          fallback.context = context;
          resolve(fallback);
        });
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     6. CRÉATION DU DEVIS BROUILLON depuis le résultat IA
     ───────────────────────────────────────────────────────────────── */
  function createQuoteDraftFromAnalysis(analysisResult, opts){
    opts = opts || {};
    if(!window.AJQuotes || typeof window.AJQuotes.createFromTemplate !== 'function'){
      alert('Module Devis (AJQuotes) non chargé');
      return null;
    }
    var clientId = opts.clientId || (analysisResult.context && analysisResult.context.client && analysisResult.context.client.id);
    if(!clientId){
      alert('Client introuvable pour créer le devis');
      return null;
    }

    /* Stratégie :
       1) Détermine un template de base (suggéré par l'IA ou par défaut SDB enrichie)
       2) Crée le devis depuis ce template (template = squelette de sections + lignes types)
       3) Si l'IA a fourni des sections custom dans quoteDraft.sections, on les ajoute
          en plus (et on marque les lignes "to_confirm" si confidence basse) */
    var templateId = (analysisResult.quoteDraft && analysisResult.quoteDraft.suggestedTemplateId)
      || opts.templateId
      || 'tpl_aj_sdb_enrichie';

    /* Crée un draft vide depuis le template */
    var quote = window.AJQuotes.createFromTemplate(templateId);
    if(!quote){
      alert('Impossible de créer le devis depuis le template ' + templateId);
      return null;
    }

    /* Si l'IA a fourni un titre custom, on l'utilise */
    if(analysisResult.quoteDraft && analysisResult.quoteDraft.title){
      quote.title = analysisResult.quoteDraft.title;
    }
    if(analysisResult.quoteDraft && analysisResult.quoteDraft.documentType){
      quote.typeDocument = analysisResult.quoteDraft.documentType;
    }

    /* Ajoute les sections IA en plus du template (à la fin) — si fournies */
    if(analysisResult.quoteDraft && Array.isArray(analysisResult.quoteDraft.sections) && analysisResult.quoteDraft.sections.length){
      analysisResult.quoteDraft.sections.forEach(function(secIA){
        var lines = (secIA.lines || []).map(function(ln){
          return {
            id: 'l_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            number: '',
            designation: ln.designation || 'Ligne IA',
            description: ln.description || '',
            quantity: ln.quantity != null ? Number(ln.quantity) : 1,
            unit: ln.unit || 'U',
            unitPriceBeforeDiscount: null,
            discountPercent: 0,
            unitPriceHT: ln.unitPriceHT != null ? Number(ln.unitPriceHT) : 0,
            totalHT: 0,
            type: ln.type || 'normal',
            status: ln.status || (ln.confidence != null && ln.confidence < 0.6 ? 'to_confirm' : 'included'),
            suppliedBy: ln.suppliedBy || null,
            visible: true,
            order: 0,
            allowNegativeQuantity: false,
            allowZeroPrice: true,
            highlighted: ln.confidence != null && ln.confidence < 0.4,
            highlightColor: null,
            metadata: {
              fromAI: true,
              source: ln.source || 'ai',
              reason: ln.reason || '',
              confidence: ln.confidence != null ? ln.confidence : null
            }
          };
        });
        quote.sections.push({
          id: 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          number: '',
          title: (secIA.title || 'Section IA') + ' (proposition IA — à valider)',
          type: secIA.type || 'custom',
          parentId: null,
          order: quote.sections.length,
          isOption: !!secIA.isOption,
          optionLabel: secIA.isOption ? 'Option' : '',
          visible: true,
          lines: lines,
          metadata: { fromAI: true }
        });
      });
    }

    /* Sauvegarde + ouverture éditeur */
    if(window.AJQuotes.recomputeNumbers) window.AJQuotes.recomputeNumbers(quote);
    if(window.AJQuotes.save) window.AJQuotes.save(quote);
    if(window.AJQuotes.openEditor) window.AJQuotes.openEditor(quote.id);
    return quote;
  }

  /* ─────────────────────────────────────────────────────────────────
     EXPOSE
     ───────────────────────────────────────────────────────────────── */
  window.AIAnalysis = {
    collectContext: collectContext,
    runAnalysis: runAnalysis,
    createQuoteDraftFromAnalysis: createQuoteDraftFromAnalysis,
    /* Internals exposés pour debug/test */
    _runLocalFallback: runLocalFallback,
    _callClaudeAPI: callClaudeAPI,
    _parseClaudeResponse: parseClaudeResponse,
    VERSION: '1.0.0'
  };
})();
