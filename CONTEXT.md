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
| `bathroom-quote.js` | 1 983 | Module Devis SDB. **Le template inline a été extrait** vers `quote-template-sdb.js` ; ce fichier consomme `window.QUOTE_TEMPLATE_SDB.toLegacy()`. Reste responsable du wizard 12 étapes, récap éditable, génération PDF officiel verrouillé `DEV-2026-XXX`. |
| `chantier-analysis.js` | 1 081 | Module Analyse rendez-vous (Commit 1/3 session 3) : moteur de mapping cats/notes/keywords → suggestions du template SDB, écran de validation, création brouillon. Continue à consommer `window.AJBath.TEMPLATE` (qui pointe désormais vers la source canonique via toLegacy). |
| `sw.js` | ~115 | Service Worker offline-first, runtime cache versionné (v9-template-canon). |
| `manifest.json` | 27 | PWA installable |
| `vercel.json` | 41 | Headers no-cache pour HTML / SW / JS modules |
| `_drafts/catalog-v0.json` | 2 731 | Brouillon S1 — extraction normalisée des 148 lignes du template SDB vers schéma unifié. **Non chargé par l'app**, prêt pour S1. |

## Sidebar actuelle (après nettoyage Tâche 3)

Visibles : Tableau de bord · Clients · Pièces · Mesures · Travaux · Photos · Notes manuscrites · **Documents émis** · **Devis salle de bain** · **Analyse rendez-vous** (← nouveau Commit 1) · Statistiques · Paramètres devis · Base de données · Mode sombre · Tutoriel guidé.

**Désactivés via `window.FEATURES_ENABLED`** : Carte · Comparateur · Planning · Récapitulatif · Suggestions par type de pièce. Code conservé, réactivable par flag.

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

## État au 2026-04-28

Voir `DECISIONS.md` pour l'historique des choix architecturaux. La session a porté sur :

- ✅ Bug fix barre checklist sticky (transparence + chevauchement)
- ✅ Désactivation suggestions Phase 10
- ✅ Désactivation 4 modules (Carte, Comparateur, Planning, Récap) via FEATURES_ENABLED
- ✅ Adaptation S Pen / tablette : zones de dessin 600px sur ≥768px, palm rejection 200ms
- ✅ Export chantier complet (PDF + JSON LLM-friendly)
- ✅ **Module Analyse rendez-vous (Commit 1/3)** — moteur de mapping + écran de validation + création brouillon
- ✅ **Couche IA — Commit A : Template SDB canonique** (`quote-template-sdb.js`). 148 lignes du PDF $002612 modélisées avec schéma enrichi (zone, action, semanticKey, alternatives, déductions). bathroom-quote.js refactoré pour consommer cette source unique. Aucun changement fonctionnel visible — fondation pour les commits B-G.

## Roadmap couche IA (validée Session 4)

Plan séquencé en 7 commits courts, ordre de bataille pour ROI temps maximum :

- ✅ **A. Template SDB canonique** — `quote-template-sdb.js` source de vérité unique
- ⏳ **B. Éditeur de devis direct** — étape 12 récap → éditeur tabulaire complet (drag-drop, ajout/suppression lignes/sections, toggle Option, sous-totaux temps réel). Plus gros gain temps utilisateur immédiat.
- ⏳ **C. Moteur de fusion intelligent** — `quote-fusion.js`, anti-doublon par semanticKey, priorité Travaux > Brouillon > Notes > Croquis > Photos
- ⏳ **D. Écran Analyse chantier enrichi** — pastilles confiance + badges source + bouton « Générer le brouillon » → ouvre l'éditeur B
- ⏳ **E. Catalogue produits + alternatives** — `catalog-products.js`, ~80-120 réfs, bouton « ⇄ Alternative » + « 🔍 Google »
- ⏳ **F. Hook API IA prêt mais débranché** — `ai-bridge.js`, interface `enrichAnalysis()`, stub Claude API documenté
- ⏳ **G. Garde-fous + cohérence** — avertissements, indicateurs de confiance, traçabilité, tests RDV historiques

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
