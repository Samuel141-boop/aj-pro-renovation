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
| `bathroom-quote.js` | 2 397 | Module Devis SDB (template 148 lignes du PDF $002612, wizard 12 étapes, récap éditable, génération PDF officiel verrouillé `DEV-2026-XXX`) |
| `chantier-analysis.js` | 1 081 | **Nouveau module session 3** : Analyse rendez-vous, moteur de mapping cats/notes/keywords → suggestions du template SDB, écran de validation, création brouillon |
| `sw.js` | ~115 | Service Worker offline-first, runtime cache versionné |
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

## Reste à faire (priorités)

1. **Commit 2 module Analyse** : catalogue produits fournisseurs (~80 produits Hansgrohe/Grohe/Geberit/etc.) + UI « ⇄ Alternative » sur fournitures
2. **Commit 3 module Analyse** : préfill complet des étapes 1-11 du wizard SDB depuis suggestions acceptées (pour l'instant ouvre direct sur étape 12 récap)
3. **S1 catalogue prix central** : intégrer `_drafts/catalog-v0.json` → écran édition + import/export CSV + branchement synthèse devis. Wireframe validé, non commencé.
4. **Tests terrain** : aucune session de RDV réel n'a confirmé le bon fonctionnement bout-en-bout. Priorité avant nouveaux ajouts.

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
