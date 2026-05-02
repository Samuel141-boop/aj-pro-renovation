# AJ PRO RÉNOVATION — Contexte projet

> Document de continuation entre sessions. Lu en début de session pour reprendre le fil.

## Pitch en 1 ligne

Outil métier de relevé chantier sur tablette Samsung avec stylet, qui transforme un rendez-vous client en devis chiffré PDF officiel.

## Utilisateur

**Pouleur Samuel** — chef de chantier / artisan rénovation. Cible primaire : tablette Samsung 10"+ avec S Pen, en RDV client. Cible secondaire : ordinateur 1280px+ au bureau. **Smartphone déprioritisé** depuis Session 2.

## Stack effective

> ⚠ Pas Next.js, pas React, pas TypeScript, pas de backend. Plusieurs prompts entrants supposent du React/TS — c'est faux. Garder la vanilla actuelle.

- **Front-end** : HTML monolithique + JS vanilla, **0 framework**
- **Hosting** : Vercel (static)
- **Stockage** : `localStorage` (DB principale, clé `chantier_db_v2`) + **IndexedDB opt-in** pour les photos volumineuses
- **PDF** : `jsPDF` 2.5.1 chargé depuis CDN à la demande
- **OCR** : `Tesseract.js` chargé à la demande (lourd, ~5 Mo)
- **Voice** : Web Speech API natif (pas Whisper, pas d'audio externe)
- **Auth** : mot de passe partagé hashé SHA-256 en localStorage (`Jérome0307`)
- **PWA** : `manifest.json` + Service Worker `sw.js` (offline first, cache versionné `v8-analysis`)

## Fichiers du repo

| Fichier | Lignes | Rôle |
|---|---:|---|
| `index.html` | ~12 300 | App principale, monolithique. Contient toutes les phases 1-21 + correctif légal + bloc FEATURES_ENABLED + Tâche 5 export. |
| `quote-template-sdb.js` | ~720 | **★ Source de vérité du modèle SDB** (Commit A IA). 148 lignes du PDF $002612 modélisées avec champs enrichis : `zone`, `action`, `semanticKey` (anti-doublon), `tags`, `priceMode`, `altGroupId`/`altDefault` (8 groupes d'alternatives), `deductionFor` (déductions négatives type 8.5). Helpers : `getLine`, `getLinesByZone`, `getLinesByAction`, `getLineBySemanticKey`, `getMandatoryLines`, `getDeductionLines`, `getAlternativeGroups`. Adapter `toLegacy()` pour rétro-compat avec bathroom-quote.js. Consommé par bathroom-quote.js, chantier-analysis.js (à venir) et futurs modules quote-fusion / quote-editor / catalog-products. |
| `quote-fusion.js` | ~480 | **★ Moteur de fusion intelligent** (Commit C IA), 100% local. Entrée { travauxCochés, brouillon, notes, mesures, photos, croquis } → sortie { lignesSûres, lignesProbables, lignesÀConfirmer, doublons, conflits, drapeaux }. Anti-doublon par semanticKey. Priorité Travaux(100) > Brouillon(90) > Notes(60) > Croquis(40) > Photos(30). 20 cats Travaux + 23 règles regex + 6 drapeaux critiques. Conflits altGroupId résolus auto. Interface `analyzeAsync()` Promise prête pour brancher Claude API (Commit F). Helper `buildDraftFormData()` pour pré-remplir un draft. |
| `bathroom-quote.js` | 2 464 | Module Devis SDB. Template extrait vers `quote-template-sdb.js`. Wizard 12 étapes + **éditeur de devis direct (Commit B)** sur l'étape 12 : édition inline label/qté/unité/PUHT, ajout/suppression lignes/sections, drag-drop, toggle Option, totaux temps réel sticky. Génération PDF officiel verrouillé `DEV-2026-XXX`. |
| `chantier-analysis.js` | 1 081 | Module Analyse rendez-vous (Commit 1/3 session 3) : moteur de mapping cats/notes/keywords → suggestions du template SDB, écran de validation, création brouillon. Continue à consommer `window.AJBath.TEMPLATE` (qui pointe désormais vers la source canonique via toLegacy). |
| `sw.js` | ~115 | Service Worker offline-first, runtime cache versionné (v9-template-canon). |
| `manifest.json` | 27 | PWA installable |
| `vercel.json` | 41 | Headers no-cache pour HTML / SW / JS modules |
| `_drafts/catalog-v0.json` | 2 731 | Brouillon S1 — extraction normalisée des 148 lignes du template SDB vers schéma unifié. **Non chargé par l'app**, prêt pour S1. |

## Sidebar actuelle (après simplification Session 6, 2026-04-30)

Visibles : **Tableau de bord · Clients · Pièces · Mesures · Photos · Notes** (6 items — Travaux retiré en Session 6, recentrée sur la prise de note chantier au stylet Samsung).

**Désactivés via `window.FEATURES_ENABLED`** (code conservé, réactivable par flag) :
- Anciens : Carte · Comparateur · Planning · Récapitulatif · Suggestions par type de pièce
- Session 5 : Documents émis (`documentsNav`) · Devis salle de bain (`bathroomNav`) · Analyse rendez-vous (`analysisNav`) · Statistiques (`statsNav`) · Synthèse devis (`syntheseNav`) · Paramètres devis (`settingsNav`) · Tutoriel guidé (`tutorialBtn`) · Carte « Besoin d'aide ? » footer (`helpFooter`) · Carte « Prochaine action » dashboard (`dashNextAction`) · Barre quick-actions fiche pièce (`pieceQuickActions`) · Checklist 0/5 fiche pièce (`pieceChecklist`)
- **Session 6 : Travaux sidebar (`travauxNav`) · Boutons PDF Synthèse + fiche client (`pdfButtons`) · Bon de visite (`bonDeVisiteBtn`) · Export complet (`exportCompletBtn`) · Barre flottante FAB photo/croquis/note/✓ (`floatingActionBar`) · Tous les micros 🎙 dictée vocale (`micButtons`) · Calcul rapide des murs Mesures (`calculRapideMurs`) · Annotations libres sous Croquis (`croquisAnnotations`)**

Pour tout réactiver : `Object.assign(window.FEATURES_ENABLED, {syntheseNav:true, statsNav:true, settingsNav:true, documentsNav:true, bathroomNav:true, analysisNav:true, tutorialBtn:true, helpFooter:true, dashNextAction:true, pieceQuickActions:true, pieceChecklist:true, travauxNav:true, pdfButtons:true, bonDeVisiteBtn:true, exportCompletBtn:true, floatingActionBar:true, micButtons:true, calculRapideMurs:true, croquisAnnotations:true}); location.reload();`

## Workflow utilisateur cible

1. **En RDV** : ouvre l'app installée → crée client → ajoute pièce(s) → mesures + croquis (S Pen) + photos + notes manuscrites + cats du module Travaux
2. **Au bureau** : sidebar **Analyse rendez-vous** → vérifie les suggestions automatiques par pièce → coche celles à inclure → **« Créer brouillon de devis »** → arrive sur le récap éditable du wizard SDB → ajuste les prix/labels → **« Émettre devis officiel »** → PDF `DEV-2026-XXX` téléchargé, verrouillé, immutable
3. **Alternative** : sidebar **Devis salle de bain** pour démarrer un wizard 12 étapes from scratch (sans analyse préalable)
4. **Export brut** : sur fiche client, bouton **« 📦 Export complet »** → PDF lisible + JSON LLM-friendly (à coller dans ChatGPT/Claude pour brouillon devis externe)

## Comment tester en local

L'app est purement statique. Ouvrir `index.html` directement dans un navigateur fonctionne *partiellement* (le SW ne s'enregistre pas en `file://`). Pour test complet :

```bash
# depuis la racine du repo
npx serve .          # ou python3 -m http.server 8000
# puis ouvrir http://localhost:3000 (ou :8000)
```

Mot de passe d'accès : `Jérome0307`.

## Lien live

- **Production** : https://aj-pro-renovation.vercel.app
- **Repo** : https://github.com/Samuel141-boop/aj-pro-renovation
- **Vercel auto-deploy** sur push vers `main`.

## État au 2026-05-02 (Session 7 — restauration Travaux dans la fiche pièce + ajout Résumé)

Suite logique : la sidebar reste à 6 items (Travaux toujours masqué via `travauxNav:false`) **mais** dans la fiche pièce on restaure l'onglet **Travaux** + on ajoute un **Résumé** final.

**Nouvel ordre des onglets dans `screen-piece` :**
1. **Infos** (`step-0`)
2. **Photos** (`step-1`) ← anciennement step-4
3. **Croquis** (`step-2`) ← anciennement step-1
4. **Travaux** (`step-3`) ← inchangé, contenu intact (toutes les sous-options du module Travaux préservées : maçonnerie, électricité, plomberie, sol, peinture, etc.)
5. **Mesures** (`step-4`) ← anciennement step-2
6. **Notes** (`step-5`) ← inchangé
7. **Résumé** (`step-6`) ← **NOUVEAU**

Logique du parcours : on identifie la pièce → photos → croquis stylet → travaux à prévoir → mesures → notes → résumé final → Enregistrer.

**Ce qui a changé techniquement :**
- Renommage atomique des `<div id="step-N">` (dual-pass sed avec marqueurs temporaires pour éviter collision step-1↔step-2↔step-4) — DOM physique inchangé, juste les ids alignés sur l'ordre visuel
- `step-nav` HTML : 6 → **7 boutons**, ordre Infos/Photos/Croquis/Travaux/Mesures/Notes/Résumé
- `switchStep(n)` : loop `i<6` → `i<7`, init canvas Croquis remappé `n===1` → `n===2`, hook `n===6` → render dynamique du résumé
- `setTool` / `setColor` selectors : `#step-1` → `#step-2` (Croquis a changé d'id)
- 2 références FAB (`step-btn[1/4]`) corrigées vers les nouveaux indices (FAB toujours désactivé mais le code est cohérent)
- 5 boutons « Suivant → » mis à jour pour suivre le nouveau workflow
- Nouvelle fonction `renderPieceResume()` : génère un récap dynamique de la pièce avec **boutons « ↺ Modifier »** qui sautent à l'onglet correspondant. Affiche : nom + état + mesures (longueur/largeur/HSP + surface au sol + surface murs brut) + travaux cochés (compte + liste compacte) + photos + croquis + notes manuscrites + extrait notes texte. Persiste les données via `persistPiece()` avant render pour avoir les dernières valeurs

**Compatibilité localStorage** : aucun champ de données renommé ni structure changée. Les pièces déjà sauvegardées (`db.pieces[X]` avec `nom`, `etat`, `mesures`, `travaux`, `photos`, `msNotes`, `notes`, `croquis`, `croquisNotes`) restent **100 % compatibles**.

**Régressions vérifiées** : tous les 8 flags Session 6 conservés à `false` (sidebar Travaux + boutons PDF/Bon visite/Export + FAB + micros + calcul rapide murs + annotations libres). Aucune réactivation IA / Analyse RDV / Synthèse devis / Devis SDB / Documents émis / Statistiques.

**SW bumpé `v14-simplification2` → `v15-travaux-restored`** — vide le cache SW au reload.

## État au 2026-04-30 (Session 6 — recentrage prise de note tablette/stylet)

Suite logique de la Session 5 : on continue d'enlever tout ce qui parasite la prise de note chantier. Code conservé via `FEATURES_ENABLED`.

- ✅ **Sidebar** — item « Travaux » masqué via `travauxNav`. Sidebar passe de 7 → 6 items (Tableau de bord, Clients, Pièces, Mesures, Photos, Notes).
- ✅ **Fiche client** — boutons « 📄 PDF », « ✍ Bon de visite » et « 📦 Export complet » masqués (3 flags : `pdfButtons`, `bonDeVisiteBtn`, `exportCompletBtn`). Le code de génération PDF/JSON reste fonctionnel pour le jour où on en aura besoin.
- ✅ **Barre flottante (FAB)** — la pastille basse (📷✏️📝✓) en mode rendez-vous est masquée via `floatingActionBar`.
- ✅ **Micros / dictée vocale** — `injectMicButtons` désactivé globalement via `micButtons`. Nettoie aussi les éventuels boutons 🎙 déjà injectés. **Plus aucun micro visible dans tout le logiciel.**
- ✅ **Mesures** — bloc « ⚡ Calcul rapide — Surface des murs » masqué via `calculRapideMurs`. Le bloc « Dimensions complètes » reste accessible.
- ✅ **Bloc Croquis (step-1) — amélioration majeure pour stylet Samsung** :
  - Hauteur canvas **340px → 600px** (espace d'écriture quasi doublé)
  - Fond canvas explicitement blanc (`background:#fff`)
  - Bouton « ⛶ **Ouvrir en grand pour écrire au stylet** » mis **plein largeur, en btn-primary doré, 16px de padding** (CTA principal)
  - Bouton « Analyser comme croquis géométrique de pièce » dégradé en btn-secondary fin (action secondaire)
  - Description recadrée pour l'usage stylet ("écris au stylet, prends tes notes manuscrites")
  - Section « Annotations libres » **masquée** via `croquisAnnotations` (textarea conservé en DOM pour préserver les données existantes des users)
- 🔄 SW bumpé `v13-simplification` → `v14-simplification2`. Vide le cache Application → SW au reload.

## État au 2026-04-30 (Session 5 — simplification fonctionnelle)

Recentrage UI sur la prise de notes chantier, sans refonte design. Code des modules avancés (devis, statistiques, etc.) conservé intact.

- ✅ **Sidebar** allégée à 7 items (Tableau de bord, Clients, Pièces, Mesures, Travaux, Photos, **Notes** — renommé). 9 modules masqués via `FEATURES_ENABLED`.
- ✅ **Dashboard** — carte « Prochaine action sur le chantier » masquée (`.dash-banner` cachée via flag `dashNextAction`).
- ✅ **Sidebar footer** — carte « Besoin d'aide ? » et bouton « Tutoriel guidé » masqués (flags `helpFooter`, `tutorialBtn`).
- ✅ **Création client** — micro retiré du textarea Observations générales (`data-aj-no-mic="1"`). `createClient()` redirige maintenant vers `screen-add-piece` au lieu de `screen-client` → enchaînement client → pièce direct.
- ✅ **Fiche pièce** — barre du haut (Peinture standard / Rénovation complète / Template / Sauver template) ET checklist 0/5 sticky **masquées** via flags `pieceQuickActions` et `pieceChecklist`. Les onglets métier `step-nav` (Infos / Croquis / Mesures / Travaux / Photos / Notes) **conservés intacts**.
- ✅ **Onglet Notes** — fusion Notes texte + Notes manuscrites en une seule section « Notes ». Ancien bloc « Bloc-notes étendu » retiré (rôle absorbé par l'onglet Croquis). Canvas `#bloc-canvas` conservé masqué pour rétro-compat des handlers JS.
- ✅ **Onglet Croquis** — devient un **bloc-notes visuel polyvalent** : titre changé en « Croquis & bloc-notes visuel », hauteur canvas augmentée 280→340px, ajout d'un textarea **Annotations libres** persisté via `p.croquisNotes` pour légendes/cotes/remarques générales.
- 🔄 SW bumpé `v12-aibridge` → `v13-simplification`. Vide le cache Application → SW au reload.

## État au 2026-04-28

Voir `DECISIONS.md` pour l'historique des choix architecturaux. La session a porté sur :

- ✅ Bug fix barre checklist sticky (transparence + chevauchement)
- ✅ Désactivation suggestions Phase 10
- ✅ Désactivation 4 modules (Carte, Comparateur, Planning, Récap) via FEATURES_ENABLED
- ✅ Adaptation S Pen / tablette : zones de dessin 600px sur ≥768px, palm rejection 200ms
- ✅ Export chantier complet (PDF + JSON LLM-friendly)
- ✅ **Module Analyse rendez-vous (Commit 1/3)** — moteur de mapping + écran de validation + création brouillon
- ✅ **Couche IA — Commit A : Template SDB canonique** (`quote-template-sdb.js`). 148 lignes du PDF $002612 modélisées avec schéma enrichi (zone, action, semanticKey, alternatives, déductions). bathroom-quote.js refactoré pour consommer cette source unique. Aucun changement fonctionnel visible — fondation pour les commits B-G.
- ✅ **Couche IA — Commit B : Éditeur de devis direct sur étape 12.** Récapitulatif transformé en éditeur tabulaire complet : édition inline label/qté/unité/PUHT (input transparent → bordé doré au focus), ajout/suppression lignes (template = soft-delete via override.deleted, custom = hard), ajout de sections personnalisées, bascule Option↔Essentiel par section, drag-drop HTML5 natif (limité à la même section) + boutons ▲▼ tactiles, sous-totaux + Total HT/TVA/TTC/acompte sticky en temps réel. Helpers exposés sur `AJBath._editor`. `generateLines()` étendu pour `override.X.unit/.deleted`, `override.<sec>.isOption/.title`, `_customLines`, `_customSections`, `_order`, `_sectionOrder`. **Aucune régression** sur le wizard 1-11 ni sur l'émission PDF officiel.

## Roadmap couche IA (validée Session 4)

Plan séquencé en 7 commits courts, ordre de bataille pour ROI temps maximum :

- ✅ **A. Template SDB canonique** — `quote-template-sdb.js` source de vérité unique
- ✅ **B. Éditeur de devis direct** — étape 12 transformée en éditeur tabulaire complet (édition inline + drag-drop + ajout/suppression + toggle Option + totaux sticky temps réel)
- ✅ **C. Moteur de fusion intelligent** — `quote-fusion.js` 100% local, anti-doublon par semanticKey, priorité Travaux > Brouillon > Notes > Croquis > Photos. 20 cats + 23 règles regex + 6 drapeaux. Performance : 30 lignes en 1ms.
- ✅ **D. Écran Analyse chantier enrichi** — `chantier-analysis.js` consomme maintenant `quote-fusion` en parallèle du moteur legacy. Badges sources visuels (✋📋📝✏️📸🔒) sur chaque suggestion, bandeau global « Drapeaux à confirmer absolument », box « Alternatives arbitrées » par pièce, badge compact « 🔀 N fusionnés ». Cas RDV réel : 40 lignes en 3ms, 15 doublons fusionnés, drapeaux propagés au global.
- ✅ **E. Catalogue produits + alternatives** — `catalog-products.js` : **75 produits** mappés sur 34 lignes du template SDB, **25 lignes avec alternatives**. Marques : Hansgrohe / Grohe / Jacob Delafon / Geberit / Roca / Ideal Standard / Acova / Atlantic / Legrand / Schneider / etc. Fournisseurs : Leroy Merlin (42), Cedeo (29), Castorama (4). Bouton « ⇄ » dans l'éditeur (étape 12) sur les lignes 5.x → modal alternatives avec bouton « ✓ Appliquer » (override label/price/unit) + lien fournisseur direct + lien « 🔍 Google ». Helpers `searchProduct(query)`, `buildSupplierUrl(p)`, `buildSearchUrl(p)` — interface unique extensible pour API fournisseur (Commit F).
- ✅ **F. Hook API IA prêt mais débranché** — `ai-bridge.js`, interface unique `AI_BRIDGE.enrichAnalysis(payload) → Promise<enrichment>`. 3 modes : `local` (no-op, défaut), `mock` (suggestions fictives pour tester l'UI), `claude` (stub avec bloc fetch commenté + procédure d'activation complète documentée : proxy serverless Vercel `/api/claude`, env var `ANTHROPIC_API_KEY`, prompts system/user déjà rédigés). Coût estimé ~0,02€/RDV. Bouton « 🤖 Analyser avec IA » dans l'écran Analyse, caché derrière `window.FEATURES_ENABLED.aiAnalysis = true`. Prompts JSON-strict avec anti-doublon vs résultat fusion local.
- ✅ **G. Garde-fous + cohérence finale** — `quote-fusion.js` v1.1.0 avec **12 règles de cohérence métier** (douche sans plomberie, sèche-serviettes eau sans tés, ballon sans groupe sécurité, plafond suspendu sans annulation 8.5, dépose sans pose, meuble vasque sans miroir, etc.) catégorisées `attention` ou `info`. Dans l'éditeur étape 12 : **bandeau cohérence** avec liste warnings + **score de confiance global** (0-100%) calculé en temps réel sur sticky totals (Excellent ≥90 / À ajuster ≥70 / À revoir <70). Badge ✏️ doré sur les lignes modifiées manuellement (traçabilité visuelle). Warnings cohérence aussi propagés dans le bandeau global de l'écran Analyse. Performance : 0.25ms/analyse complète.

## Reste à faire (autres priorités)

1. **S1 catalogue prix central** : intégrer `_drafts/catalog-v0.json` → écran édition + import/export CSV + branchement synthèse devis. Wireframe validé, non commencé. *Sera probablement absorbé par le Commit E.*
2. **Tests terrain** : aucune session de RDV réel n'a confirmé le bon fonctionnement bout-en-bout. Priorité avant nouveaux ajouts.
3. ~~Commits 2/3 du module Analyse (préfill + catalogue)~~ → **remplacés et étendus** par la roadmap couche IA ci-dessus.

## Anti-roadmap (à NE PAS faire)

- Pas de migration Next.js / React / TypeScript
- Pas de Supabase / sync cloud (S4, plus tard)
- Pas d'IA cloud (Whisper/OpenAI Vision)
- Pas de gestion planning / RH / paie
- Pas de refonte du module Travaux split (existe et marche)
- Pas de refonte du croquis intelligent (existe et marche)

## Convention git

Identité commits : `Pouleur Samuel <pouleursamuel@MacBook-Air-de-Samuel.local>` (passée en `-c user.email -c user.name` à chaque commit, jamais via `git config --global`).
Format messages : conventional (`feat:`, `fix:`, `refactor:`, `chore:`).
