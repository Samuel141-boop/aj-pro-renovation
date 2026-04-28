/* ════════════════════════════════════════════════════════════════════
   AJ PRO RÉNOVATION — HOOK API IA (Commit F IA)

   Interface unique pour brancher PLUS TARD une vraie IA cloud
   (Claude API, GPT-4 Vision, etc.) sans toucher au reste du code.

   État actuel :
   - Mode 'local' (défaut) : retourne le payload tel quel (no-op).
     L'analyse repose 100% sur quote-fusion.js (heuristiques locales).
   - Mode 'claude' : prêt à câbler, mais BLOC d'appel commenté.
     L'utilisateur doit fournir une clé API + un proxy serverless
     Vercel (CORS, sécurité clé). Voir comment activer plus bas.

   Pourquoi un proxy serverless ?
   - L'API Claude exige un header Authorization avec la clé secrète.
   - Exposer cette clé dans le bundle JS = fuite immédiate.
   - Solution : déployer un endpoint /api/claude sur Vercel
     (functions/api/claude.js) qui forward la requête en gardant la clé
     dans process.env.ANTHROPIC_API_KEY.

   Voir au bas du fichier : exemple complet de proxy + de prompts.
   ──────────────────────────────────────────────────────────────────── */

(function(){
  if(window.AI_BRIDGE){ return; }

  /* ─── ÉTAT INTERNE ──────────────────────────────────────────── */
  var STATE = {
    mode          : 'local',          // 'local' | 'claude' | 'mock'
    isEnabled     : false,             // false par défaut → bouton "Analyser avec IA" caché
    endpoint      : null,              // ex: '/api/claude'
    model         : 'claude-sonnet-4-5',
    timeout       : 30000,
    stats         : { calls: 0, errors: 0, lastError: null, lastCallMs: null }
  };

  /* ─── CONFIGURATION ─────────────────────────────────────────── */

  /* Configure le bridge (appelé depuis la console ou un futur écran Paramètres) */
  function configure(opts){
    opts = opts || {};
    if(opts.mode != null)      STATE.mode = opts.mode;
    if(opts.isEnabled != null) STATE.isEnabled = !!opts.isEnabled;
    if(opts.endpoint)          STATE.endpoint = opts.endpoint;
    if(opts.model)             STATE.model = opts.model;
    if(opts.timeout)           STATE.timeout = opts.timeout;
    return getConfig();
  }

  function getConfig(){
    return {
      mode      : STATE.mode,
      isEnabled : STATE.isEnabled,
      endpoint  : STATE.endpoint,
      model     : STATE.model,
      timeout   : STATE.timeout
    };
  }

  function getStats(){ return Object.assign({}, STATE.stats); }

  /* ─── INTERFACE PRINCIPALE ─────────────────────────────────────
     enrichAnalysis(payload, opts) → Promise<enrichment>

     payload : {
       pieceType, travauxCoches, brouillonFormData, notesTexte,
       mesures, photos[], croquis[],
       fusionResult: <résultat de quote-fusion.js> (pour contexte)
     }

     Retour : {
       mode             : 'local' | 'claude' | 'mock',
       lignesMissing    : [{ templateKey, semanticKey, label, raison, confidence }]
       flagsAdd         : [{ type, message, raison }]
       suggestionsAjustement: [{ templateKey, action: 'qty'|'price'|'unit', valeurSuggeree, raison }]
       notes            : string,    // commentaire libre de l'IA
       durationMs       : number,
       error?           : string
     }

     Si mode 'local' : enrichment vide, no-op (la fusion locale a déjà tout fait).
     Si mode 'claude' : appel API via proxy serverless (à câbler).
     Si mode 'mock' : retour fictif pour tester l'UI sans coût.
  ─────────────────────────────────────────────────────────────── */
  function enrichAnalysis(payload, opts){
    opts = opts || {};
    var t0 = Date.now();
    STATE.stats.calls++;

    return new Promise(function(resolve){

      /* ─── MODE LOCAL : no-op (renvoie un enrichissement vide) ─── */
      if(STATE.mode === 'local' || !STATE.isEnabled){
        STATE.stats.lastCallMs = Date.now() - t0;
        return resolve({
          mode             : 'local',
          lignesMissing    : [],
          flagsAdd         : [],
          suggestionsAjustement: [],
          notes            : 'Analyse locale uniquement (heuristiques quote-fusion.js). IA cloud non activée.',
          durationMs       : Date.now() - t0
        });
      }

      /* ─── MODE MOCK : enrichissement simulé pour tester l'UI ─── */
      if(STATE.mode === 'mock'){
        setTimeout(function(){
          STATE.stats.lastCallMs = Date.now() - t0;
          resolve({
            mode             : 'mock',
            lignesMissing    : [
              { templateKey:'2.27', semanticKey:'sdb.ventilation.bouche-vmc', label:'Remplacement bouche VMC', raison:'Suggéré par IA mock car notes mentionnent VMC', confidence:0.78 }
            ],
            flagsAdd         : [
              { type:'mock-info', message:'Ce sont des suggestions de test (mode mock).', raison:'Mode mock activé' }
            ],
            suggestionsAjustement: [],
            notes            : 'Mode MOCK — réponse fictive. Active mode "claude" + endpoint pour de vraies suggestions IA.',
            durationMs       : Date.now() - t0
          });
        }, 250);
        return;
      }

      /* ─── MODE CLAUDE : appel API via proxy serverless ───────────
         À ACTIVER : décommenter le bloc fetch ci-dessous + déployer
         le proxy /api/claude sur Vercel (voir exemple en bas du fichier). */

      if(STATE.mode === 'claude' && STATE.endpoint){
        /* TODO Commit Claude-API : décommenter pour activer
        var body = {
          model    : STATE.model,
          max_tokens: 2000,
          system   : buildSystemPrompt(),
          messages : [{ role:'user', content: buildUserPrompt(payload) }]
        };
        var ctrl = new AbortController();
        var to = setTimeout(function(){ ctrl.abort(); }, STATE.timeout);
        fetch(STATE.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: ctrl.signal
        })
        .then(function(r){ clearTimeout(to); return r.json(); })
        .then(function(json){
          STATE.stats.lastCallMs = Date.now() - t0;
          var parsed = parseClaudeResponse(json);
          parsed.mode = 'claude';
          parsed.durationMs = Date.now() - t0;
          resolve(parsed);
        })
        .catch(function(err){
          STATE.stats.errors++;
          STATE.stats.lastError = err.message || String(err);
          resolve({
            mode             : 'claude',
            error            : STATE.stats.lastError,
            lignesMissing    : [],
            flagsAdd         : [{ type:'erreur-ia', message:'Échec appel IA : ' + STATE.stats.lastError, raison:'API down ou clé invalide' }],
            suggestionsAjustement: [],
            notes            : 'Erreur IA — fallback heuristiques locales.',
            durationMs       : Date.now() - t0
          });
        });
        return;
        */

        /* En attendant l'activation : retourne un placeholder explicite */
        STATE.stats.lastCallMs = Date.now() - t0;
        return resolve({
          mode             : 'claude',
          lignesMissing    : [],
          flagsAdd         : [{ type:'config', message:'Mode "claude" sélectionné mais bloc fetch encore commenté. Suis la procédure dans ai-bridge.js pour activer.', raison:'À configurer' }],
          suggestionsAjustement: [],
          notes            : 'Stub Claude prêt mais désactivé. Voir ai-bridge.js pour activation.',
          durationMs       : Date.now() - t0
        });
      }

      /* Fallback : aucun mode valide */
      STATE.stats.lastCallMs = Date.now() - t0;
      resolve({
        mode             : STATE.mode,
        lignesMissing    : [],
        flagsAdd         : [{ type:'config', message:'Mode AI bridge inconnu : ' + STATE.mode, raison:'Mauvaise config' }],
        suggestionsAjustement: [],
        notes            : 'Aucun mode actif.',
        durationMs       : Date.now() - t0
      });
    });
  }

  /* ─── PROMPTS POUR CLAUDE (utilisés par le bloc fetch ci-dessus) ──
     Documentés ici pour que l'activation soit triviale. */

  function buildSystemPrompt(){
    return [
      'Tu es un expert artisan rénovation salle de bain pour AJ PRO RÉNOVATION.',
      'Tu analyses le relevé d\'un chantier (notes, photos, croquis, travaux cochés)',
      'et tu COMPLÈTES une analyse heuristique locale qui a déjà identifié des lignes',
      'de devis depuis notre modèle SDB de 148 lignes (PDF $002612).',
      '',
      'Ta mission : trouver UNIQUEMENT ce que les heuristiques locales ont MANQUÉ.',
      'Ne re-suggère JAMAIS ce qui est déjà dans `fusionResult.lignesSures` ou',
      '`lignesProbables` ou `lignesAConfirmer`. Anti-doublon STRICT.',
      '',
      'Réponds UNIQUEMENT en JSON valide avec cette structure exacte :',
      '{',
      '  "lignesMissing": [{ "templateKey": "...", "raison": "...", "confidence": 0.X }],',
      '  "flagsAdd": [{ "type": "...", "message": "..." }],',
      '  "suggestionsAjustement": [{ "templateKey": "...", "action": "qty|price|unit", "valeurSuggeree": ..., "raison": "..." }],',
      '  "notes": "commentaire libre éventuel"',
      '}',
      '',
      'Les templateKey valides sont uniquement : 1.1, 2.1...2.29, 3.1...3.13, 4.1...4.11,',
      '5.1.1...5.8.13, 6.1, 7.1, 8.1...8.5, 9.1, 10.1...10.3, 11.1, 11.2, 12.1,',
      '13.1...13.5, 14.1, 15.1, 16.1...16.5, 17.1...17.13, 18.1.',
      '',
      'Reste pragmatique : si les heuristiques ont bien fait le job, retourne des arrays vides.',
      'Pas de bla-bla. Pas de lignes inventées hors template. JSON strict.'
    ].join('\n');
  }

  function buildUserPrompt(payload){
    /* Compresse le payload pour minimiser les tokens.
       Les photos ne sont PAS envoyées en V1 (vision = cher).
       Pour activer la vision : remplacer content par un array
       [{type:'text', text:...}, {type:'image', source:{type:'base64', media_type:'image/jpeg', data:...}}]. */
    var fr = payload.fusionResult || {};
    return JSON.stringify({
      pieceType        : payload.pieceType,
      mesures          : payload.mesures,
      travauxCoches    : payload.travauxCoches,
      brouillonKeys    : Object.keys(payload.brouillonFormData || {}).filter(function(k){ return payload.brouillonFormData[k] === true; }),
      notesTexte       : (payload.notesTexte || '').slice(0, 4000),
      nbPhotos         : (payload.photos || []).length,
      nbCroquis        : (payload.croquis || []).length,
      fusionResume     : {
        lignesSures      : (fr.lignesSures || []).map(function(l){ return l.templateKey; }),
        lignesProbables  : (fr.lignesProbables || []).map(function(l){ return l.templateKey; }),
        lignesAConfirmer : (fr.lignesAConfirmer || []).map(function(l){ return l.templateKey; }),
        drapeauxDeja     : (fr.drapeaux || []).map(function(d){ return d.type; }),
        meta             : fr.meta
      }
    }, null, 2);
  }

  /* Parse la réponse Claude et la normalise */
  function parseClaudeResponse(json){
    /* Format attendu de l'API Claude : { content: [{ type:'text', text:'...' }] } */
    var text = '';
    try {
      if(json.content && json.content[0] && json.content[0].text) text = json.content[0].text;
      /* Extrait le JSON même si entouré de prose */
      var m = text.match(/\{[\s\S]*\}/);
      if(m) text = m[0];
      var parsed = JSON.parse(text);
      return {
        lignesMissing        : parsed.lignesMissing || [],
        flagsAdd             : parsed.flagsAdd || [],
        suggestionsAjustement: parsed.suggestionsAjustement || [],
        notes                : parsed.notes || ''
      };
    } catch(e){
      return {
        lignesMissing        : [],
        flagsAdd             : [{ type:'parse-error', message:'Réponse IA non parsable : ' + e.message }],
        suggestionsAjustement: [],
        notes                : 'Erreur parsing : ' + (text.slice(0, 200) + '...')
      };
    }
  }

  /* ─── TEST DE CONNECTION (placeholder) ────────────────────── */
  function testConnection(){
    return new Promise(function(resolve){
      if(STATE.mode === 'local') return resolve({ ok:true, mode:'local', message:'Mode local, aucune connection externe.' });
      if(STATE.mode === 'mock')  return resolve({ ok:true, mode:'mock',  message:'Mode mock, aucune connection externe.' });
      if(!STATE.endpoint)        return resolve({ ok:false, mode:STATE.mode, message:'Endpoint non configuré.' });
      /* TODO : ping le proxy avec un payload minimal */
      resolve({ ok:false, mode:STATE.mode, message:'Test de connection non implémenté en V1.' });
    });
  }

  /* ─── EXPOSE ─────────────────────────────────────────────────── */
  window.AI_BRIDGE = {
    enrichAnalysis : enrichAnalysis,
    configure      : configure,
    getConfig      : getConfig,
    getStats       : getStats,
    testConnection : testConnection,
    /* Internals exposés pour debug */
    buildSystemPrompt: buildSystemPrompt,
    buildUserPrompt  : buildUserPrompt,
    parseClaudeResponse: parseClaudeResponse,
    VERSION        : '1.0.0'
  };

  console.log('[AI_BRIDGE] Hook IA prêt · mode=' + STATE.mode + ' · enabled=' + STATE.isEnabled +
              ' · pour activer Claude API : voir ai-bridge.js (proxy + decommenter bloc fetch) · v' + window.AI_BRIDGE.VERSION);
})();

/* ════════════════════════════════════════════════════════════════════
   PROCÉDURE D'ACTIVATION CLAUDE API (à faire plus tard)
   ════════════════════════════════════════════════════════════════════

   1. CRÉER LE PROXY SERVERLESS sur Vercel :
   ───────────────────────────────────────
   Dans le repo, ajouter :
     api/claude.js          (Vercel detecte automatiquement)

   Contenu de api/claude.js :
   --------------------------
   export default async function handler(req, res) {
     if (req.method !== 'POST') return res.status(405).end();
     try {
       const r = await fetch('https://api.anthropic.com/v1/messages', {
         method: 'POST',
         headers: {
           'Content-Type'    : 'application/json',
           'x-api-key'       : process.env.ANTHROPIC_API_KEY,
           'anthropic-version': '2023-06-01'
         },
         body: JSON.stringify(req.body)
       });
       const json = await r.json();
       res.status(200).json(json);
     } catch (e) {
       res.status(500).json({ error: e.message });
     }
   }

   2. DÉFINIR LA CLÉ DANS VERCEL :
   ───────────────────────────────
   Dashboard Vercel → Project → Settings → Environment Variables
   → Add ANTHROPIC_API_KEY = sk-ant-...

   3. ACTIVER LE BRIDGE depuis la console JS :
   ────────────────────────────────────────────
   AI_BRIDGE.configure({ mode:'claude', isEnabled:true, endpoint:'/api/claude' });

   4. DÉCOMMENTER LE BLOC fetch dans enrichAnalysis() ci-dessus.

   5. DANS L'ÉCRAN ANALYSE : afficher le bouton "🤖 Analyser avec IA"
      qui appelle AI_BRIDGE.enrichAnalysis(payload).
      Actuellement caché derrière le feature flag.

   COÛT ESTIMÉ par chantier (Sonnet 4.5, prompt ~3k tokens, réponse ~500) :
   ~ 0.01 € / appel (3000 input * 3$/Mtok + 500 output * 15$/Mtok) ≈ 0.017 $.

   Si tu veux ajouter la VISION (photos) : enrichir buildUserPrompt
   pour envoyer les photos en base64. Coût × 5 environ.
   ════════════════════════════════════════════════════════════════════ */
