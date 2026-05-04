# AJ PRO RÉNOVATION — Journal des décisions architecturales

> Format ADR (Architecture Decision Record) léger. Chaque entrée = une décision prise, son contexte, ses conséquences. Trié du plus récent au plus ancien.

---

## ADR-019 — 5e méta-champ « Statut devis » + édition photos/notes/croquis dans le récap

**Date** : 2026-05-02
**Statut** : ✅ Accepté · Commit `08eb4db` (Session 14)

**Contexte** : Après les 4 méta-champs IA-ready (Session 12), il manquait l'orientation explicite « comment cette info doit aller dans le devis » (vs `certaintyLevel` qui dit juste si c'est sûr). Et photos/notes/croquis avaient les méta en localStorage mais pas d'UI éditable.

**Décision** :
- Ajout 5e méta : `quoteStatus` (`included` / `option` / `to_confirm` / `excluded`)
- Ajout champ `comment` optionnel (input court sous chaque rangée meta)
- Mapping rétro-compat : items avec `status` legacy (Session 11) → `quoteStatus`
- 2 nouveaux helpers `recapMetaRowPiece(pieceId, collectionName, item)` et `recapMetaRowCroquis(pieceId, croquisMeta)` pour l'édition au niveau pièce
- Rendu `<details>` repliés par défaut sous photos/croquis/msNotes dans le Récap par pièce → zéro alourdissement visuel
- Migration douce : photos/notes anciennes sans `id` reçoivent un id auto-généré au render

**Conséquences** :
- ✅ Toutes les structures sont 100% IA-ready (pour génération devis future)
- ✅ Aucun champ existant supprimé/renommé, rétro-compat totale
- ⚠ Édition meta sur photos/notes/croquis uniquement dans le Récap (pas dans la fiche pièce) — choix volontaire pour ne pas alourdir l'UI terrain
- ⚠ `workItemsMeta` (méta par travail coché) stocké mais UI pas encore exposée

---

## ADR-018 — Module Devis AJ Pro = template canonique réutilisé, pas refait

**Date** : 2026-05-02
**Statut** : ✅ Accepté · Commit `f15ee81` (Session 13)

**Contexte** : Le user demande un module Devis basé sur le PDF officiel AJ Pro $002612, exactement structuré comme le PDF, modifiable ligne par ligne. Tentation : tout recoder. Réalité : `quote-template-sdb.js` (Commit A IA Session 1) modélise déjà EXACTEMENT le PDF (18 sections, 148 lignes, mentions légales, CGV, infos AJ Pro, prix par défaut). `bathroom-quote.js` (Session B IA) fournit déjà l'éditeur tabulaire complet + génération PDF officiel `DEV-2026-XXX`.

**Décision** : Pas recréer — **réactiver** ce qui était caché en Session 6 (`bathroomNav: false → true`). Renommer label « Devis salle de bain » → « Devis ». Ajouter 2 ponts seulement :
- Bouton « 📋 Créer un devis depuis le modèle type AJ Pro » dans le Récap → `recapCreateDevisFromTemplate()` qui crée un draft, pré-remplit infos client, ouvre direct l'éditeur (étape 12)
- Bouton « 👁 Aperçu PDF » sur l'éditeur étape 12 → `wizardPreviewPDF()` qui génère un PDF avec filigrane « Brouillon » sans réserver de numéro ni persister snapshot

**Conséquences** :
- ✅ Réponse complète au brief en 147 lignes seulement (au lieu de potentiellement 1500+)
- ✅ Toute la richesse du Commit A IA est exploitée : 8 groupes d'alternatives, semanticKey, déductions, etc.
- ⚠ Aperçu PDF s'ouvre comme téléchargement (jsPDF.save) plutôt qu'inline
- ⚠ Le wizard 12 étapes reste accessible (non retiré, peut servir de saisie pas-à-pas)

---

## ADR-017 — Structure « IA-ready » : 4 (puis 5) méta-champs sur tous les éléments importants

**Date** : 2026-05-02
**Statut** : ✅ Accepté · Commits `708b616` (Session 12) + `08eb4db` (Session 14)

**Contexte** : Pour qu'une IA future génère un devis fiable depuis le récap, elle doit pouvoir distinguer **vu / coché / mesuré / supposé / à confirmer** sur chaque info. Sans cette structure, l'IA inventerait des lignes ou confondrait hypothèse et fait.

**Décision** : Ajout de **5 méta-champs centralisés** (constantes JS exposées) sur tous les éléments importants du chantier :
- `informationSource` : `manual` / `note` / `photo` / `sketch` / `checkbox` / `measurement` / `client_statement` / `other` (auto-renseigné selon le module d'origine, jamais demandé manuellement à l'utilisateur)
- `certaintyLevel` : `confirmed` / `probable` / `to_check` / `not_planned`
- `concernedElement` : 24 valeurs métier (`shower` / `bathtub` / `toilet` / `drain` / `tiling` / `painting` / etc.)
- `plannedAction` : 15 valeurs (`remove` / `keep` / `replace` / `install` / `repair_or_rework` / `check` / etc.)
- `quoteStatus` : `included` / `option` / `to_confirm` / `excluded`
- `comment` (texte libre court, optionnel)

11 collections enrichies via `recapEnsureItemMeta` à la lecture (8 collections client + photos/msNotes/croquisMeta des pièces). Helpers réutilisables `recapMetaRow` / `recapMetaRowPiece` / `recapMetaRowCroquis` pour l'édition compacte (5 selects + input commentaire).

**Conséquences** :
- ✅ Une IA branchée plus tard pourra lire le récap et générer un devis structuré sans inventer
- ✅ Migration totalement douce : tous les champs créés à la volée à la lecture, jamais imposés
- ⚠ Édition se fait via dropdowns dans le Récap (pas de modal complexe, pas de batch)
- ⚠ Mesures pas encore individualisées (objet plat `piece.mesures` — pas urgent)

---

## ADR-016 — Récap = fiche chantier interne, pas export PDF/devis

**Date** : 2026-05-02
**Statut** : ✅ Accepté · Commits `2bde5e1` (Session 9) + `31f065b` (Session 10) + `d46aa2a` (Session 11)

**Contexte** : Le module Récap était caché en Session 5 (`recap: false`) avec un contenu basique (juste mesures et travaux). Le user veut maintenant **réactiver mais transformer** : pas un export PDF client, pas un brouillon de devis — une **fiche chantier interne** complète, lisible, organisée par pièce, qui servira plus tard d'entrée à une IA générant un devis brouillon.

**Décision** : Réactiver `recap: true` + refondre `showRecap()` en 12 sections + score de complétude :
1. Informations client & logistique
2. Demande du client (textarea + budgetLevel/priorités/délai/préférences)
3. Contexte chantier (type, complexité, contraintes techniques, urgence)
4. Contraintes chantier (liste structurée)
5. Récap par pièce (état actuel, objectif, mesures, travaux avec **statut Inclus/Option/À confirmer/Non inclus**, photos miniatures, croquis, points liés)
6. Notes terrain globales
7. Points sensibles (renommé de « Points techniques importants »)
8. Points à vérifier avant devis (avec checkbox de résolution)
9. Options proposées (titre + objectif + contenu détaillé + badge)
10. Fournitures à prévoir (qty/unité/dimensions/marque/finition + suppliedBy AJ Pro/Client/À confirmer + status)
11. Main-d'œuvre à prévoir (intervention + difficulté + durée estimée)
12. Commentaires / réserves devis (13 commentaires types pré-définis cochables + custom)
13. Notes terrain
+ **Score « Devis prêt »** 0-100% pondéré (~125 points max), affiché en gros (32px) avec code couleur, bandeau de complétude détaillé en dessous

**Conséquences** :
- ✅ Fiche chantier exhaustive sans nécessiter d'IA active (toutes les saisies humaines structurées)
- ✅ Compatibilité localStorage totale — `recapEnsureClient` / `recapEnsurePiece` créent les champs à la volée
- ⚠ Saisie d'items de listes via `window.prompt()` — minimal, mais suffit pour V1
- ⚠ Liaison `roomId` pour matériel/main-d'œuvre via match de nom (pas de sélecteur visuel)

---

## ADR-015 — Onglet Croquis transformé en carnet stylet Samsung S Pen

**Date** : 2026-05-02
**Statut** : ✅ Accepté · Commit `71d1cac` (Session 8)

**Contexte** : Le user travaille principalement sur tablette Samsung avec stylet. L'onglet Croquis avait une palette 5 couleurs et un bouton secondaire « Analyser comme croquis géométrique » qui parasitait l'usage carnet de notes manuscrites.

**Décision** : Refonte ciblée du step-2 (Croquis) en carnet stylet pur :
- Titre « Croquis & bloc-notes visuel » → **« Croquis & notes au stylet »**
- Toolbar : retrait palette couleurs, ajout **Annuler / Rétablir** (branchés sur `canvas._ajUndo` / `_ajRedo` de Phase 1)
- Bouton « Analyser comme croquis géométrique » retiré (cohérent avec « pas de reconnaissance automatique »). La fonction `analyzeCroquis()` reste dans le code pour préservation
- Canvas hauteur **600px**, fond blanc explicite
- Bouton CTA principal « **⛶ Ouvrir en grand pour écrire au stylet** » plein largeur, btn-primary doré
- Message confirm clear adapté : « Effacer tout le croquis ? Cette action supprimera le dessin actuel. »
- Reset stacks `undoStack`/`redoStack` après clear

**Conséquences** :
- ✅ Réutilise totalement le moteur Phase 1 (HiDPI, palm rejection 200ms, snapshot auto, stylo pression)
- ✅ Simple à comprendre : 5 boutons (Stylo / Gomme / Annuler / Rétablir / Effacer), 1 CTA principal
- ⚠ Couleur unique noir bleuté `#1a1a2e` (variable `curColor` reste lue par moteur de dessin)

---

## ADR-014 — Réorganisation des onglets fiche pièce + ajout step Résumé

**Date** : 2026-05-02
**Statut** : ✅ Accepté · Commit `5394bc0` (Session 7)

**Contexte** : Workflow naturel d'un RDV chantier = identifier la pièce → photos → croquis stylet → travaux à prévoir → mesures → notes → résumé. L'ordre actuel (Infos / Croquis / Mesures / Travaux / Photos / Notes) ne reflétait pas ce flux.

**Décision** : Réordonner les `step-btn` HTML statiques + renommer atomiquement les ids `step-N` (dual-pass sed avec marqueurs temporaires pour éviter collision step-1↔step-2↔step-4). Nouvel ordre : **Infos (0) → Photos (1) → Croquis (2) → Travaux (3) → Mesures (4) → Notes (5) → Résumé (6)**. Ajout d'un step-6 dynamique (« Résumé ») qui affiche un récap pièce avec boutons « ↺ Modifier » sautant à l'onglet correspondant.

**Conséquences** :
- ✅ DOM physique inchangé (un seul step visible à la fois — l'ordre des divs ne se voit pas)
- ✅ Ids alignés sur l'ordre visuel pour faciliter `switchStep(n)` simple `display step-n`
- ✅ Compatibilité localStorage : aucun champ de données renommé
- ⚠ Item Travaux **dans la fiche pièce** est restauré, mais l'item Travaux **sidebar** reste masqué (cohérent avec « recentrage prise de notes »)

---

## ADR-013 — Allègement UI radical via FEATURES_ENABLED (recentrage tablette/stylet terrain)

**Date** : 2026-04-30
**Statut** : ✅ Accepté · Commits `bc55bce` (Session 5) + `e236412` (Session 6)

**Contexte** : L'app accumule 20+ modules développés au fil des sessions (devis SDB, analyse, synthèse, statistiques, etc.). En usage terrain réel sur tablette Samsung avec stylet, ces modules **parasitent** la prise de note chantier — l'utilisateur veut une expérience simple, rapide, fiable.

**Décision** : Centraliser tous les flags dans `window.FEATURES_ENABLED`. Désactiver par défaut **18 modules / éléments UI** sans toucher au code profond :
- Sidebar : Documents émis · Devis SDB · Analyse RDV · Synthèse · Statistiques · Paramètres devis · **Travaux** · Tutoriel guidé · Carte « Besoin d'aide ? »
- Dashboard : Carte « Prochaine action »
- Fiche pièce : Barre quick-actions (Peinture standard / Reno complète / Template / Sauver) · Checklist 0/5 sticky · Section « Annotations libres » sous le croquis
- Création client : micro 🎙 sur Observations
- Mesures : Calcul rapide des murs
- Tout le logiciel : **Tous les micros 🎙 dictée vocale** (suppression globale)
- Boutons : 📄 PDF / ✍ Bon de visite / 📦 Export complet
- Barre flottante FAB photo/croquis/note/✓
- Création client : redirection directe vers Ajout pièce (au lieu de la fiche client)
- Notes (step-5) : fusion « Notes texte + Notes manuscrites » en une seule section « Notes »

**Conséquences** :
- ✅ Sidebar passe de 13+ items à **7 items minimum** (Tableau de bord · Clients · Pièces · Mesures · Photos · Notes · Devis depuis Session 13)
- ✅ Tout reste réactivable en une ligne console (`Object.assign(FEATURES_ENABLED, {...:true}); location.reload();`)
- ✅ Code conservé intact pour réactivation future (modules avancés Session 13+ ont remis `bathroomNav` puis `recap` à `true`)
- ⚠ Le user pense parfois devoir tout recréer alors que tout existe sous le capot — d'où l'importance de DECISIONS.md à jour

---

## ADR-012 — Module Analyse rendez-vous en parallèle (pas de remplacement)

**Date** : 2026-04-28
**Statut** : ✅ Accepté · Commit 1/3 livré (`e97950b`)

**Contexte** : Workflow utilisateur en RDV génère plusieurs sources d'info (cats cochées dans Travaux split, paint elems, notes manuscrites OCR, croquis, mesures, photos). Le wizard SDB existe mais oblige à re-cocher 12 étapes alors que la plupart des données sont déjà capturées. Pas de pont.

**Décision** : Ajouter un nouveau module **Analyse rendez-vous** comme surcouche intelligente :
- Moteur de mapping `cats / paint / keywords notes → keys du template SDB`
- 5 catégories de suggestions (certains, probables, options, fournitures, à confirmer)
- Niveau de confiance par ligne (haute / moyenne / faible)
- Validation explicite par checkbox individuelle (jamais d'auto-injection)
- Architecture extensible (`TEMPLATE_REGISTRY` par type de pièce, SDB seul pour l'instant)

**Conséquences** :
- ✅ Système Travaux split, wizard SDB, synthèse devis, PDF, émission verrouillée → **intacts**
- ✅ Extension future possible (cuisine, salon, chambre) sans refactor
- ⚠ Commit 2 (catalogue produits) et Commit 3 (préfill étapes 1-11) restent à livrer

---

## ADR-011 — Numérotation chronologique DEV-2026-XXX et verrouillage immutable

**Date** : 2026-04-27
**Statut** : ✅ Accepté · livré (`72a246d`)

**Contexte** : Conformité légale française minimale. Devis et factures doivent avoir une numérotation chronologique sans gap, et être immutables après émission.

**Décision** : Compteur annuel partagé dans `db.numbering[type] = { year, counter }`. Reset auto au passage d'année. Bouton **« Émettre devis officiel »** prend un snapshot complet (formData + lines + totals + emetteur + CGV + mentions légales) dans `db.documents[].snapshot` avec `locked: true`. Pour corriger un devis émis : il faut créer un nouveau devis ou un avoir, jamais modifier l'ancien.

**Conséquences** :
- ✅ Conformité légale minimale française pour les devis
- ✅ PDF re-téléchargeable à l'identique depuis n'importe quel snapshot émis
- ⚠ Nécessite "Infos émetteur" remplies (raison sociale, SIRET, TVA, adresse) — modal dédiée disponible

---

## ADR-010 — Cible primaire tablette + S Pen, smartphone déprioritisé

**Date** : 2026-04-28
**Statut** : ✅ Accepté · livré (`2325698`)

**Contexte** : L'utilisateur travaille principalement avec une tablette Samsung 10"+ et un S Pen en RDV client. Le smartphone n'est plus pertinent pour le cas d'usage principal.

**Décision** :
- Zones de dessin (croquis, plomberie) passent à **600px** sur viewport ≥ 768px (vs 280px avant)
- Bloc-notes garde 800px (déjà confortable)
- Palm rejection : variable `lastPenEventAt` track le dernier evt pen ; tout `pointerType:'touch'` est rejeté tant que pen actif **OU** dans les 200ms suivant le dernier evt pen, **OU** si `e.width × e.height > 1500 px²` dans la fenêtre 500ms post-pen
- Pression du stylet : déjà géré nativement via `e.pressure` (Phase 1)
- Layouts ≥ 768px peuvent passer en 2 colonnes (densité d'info plus élevée)
- Smartphone : aucune optimisation active sous 768px, mais aucune régression non plus

**Conséquences** :
- ✅ Confort d'écriture S Pen significativement amélioré
- ✅ Mobile préservé (helper retourne le default sur < 768px)
- ⚠ Tests terrain réels manquants pour valider les seuils 200ms / 500ms / 1500 px²

---

## ADR-009 — Feature flags centralisés pour modules désactivés

**Date** : 2026-04-28
**Statut** : ✅ Accepté · livré (`53dacc1`, `62b5e2b`)

**Contexte** : Plusieurs modules pollutent l'UI sans apporter de valeur dans le workflow actuel : Carte (Leaflet), Comparateur, Planning, Récapitulatif, et Suggestions par type de pièce (Phase 10). Mais le code marche et peut servir plus tard.

**Décision** : Bloc `window.FEATURES_ENABLED` centralisé en haut du dernier `<script>` de `index.html`. Flags : `suggestions`, `carte`, `comparateur`, `planning`, `recap`. Tous à `false`. Chaque IIFE concernée fait un `return early` si flag désactivé. Le code des modules n'est **pas supprimé**.

**Conséquences** :
- ✅ Sidebar nettoyée, focus sur le workflow Devis
- ✅ Réactivation possible en 1 ligne : `window.FEATURES_ENABLED.X = true; location.reload();`
- ✅ Leaflet (Carte) plus jamais chargé inutilement
- ⚠ Console log au boot pour chaque module désactivé (4 lignes) — à retirer si jugé bruyant

---

## ADR-008 — RGPD local-only par défaut, sync cloud en opt-in strict

**Date** : 2026-04-27
**Statut** : 📋 Validé, **non implémenté** (sera S4)

**Contexte** : Données client = données personnelles (RGPD). Volonté d'éviter la complexité légale (DPO, registre des traitements) tant que possible.

**Décision** : Tout le stockage en `localStorage` + IndexedDB sur la tablette de l'utilisateur, sans backend. La sync cloud Supabase sera ajoutée en **opt-in strict** dans S4, avec consentement explicite au moment de l'activation. Magic link auth + RLS strictes côté Supabase.

**Conséquences** :
- ✅ Pas de DPO requis, pas d'obligation déclaration CNIL
- ✅ Aucune donnée client transite par un tiers tant que cloud désactivé
- ⚠ Risque de perte de données si tablette cassée → bouton **Export sauvegarde** (`db.json`) recommandé hebdo
- ⚠ Multi-appareils impossible tant que sync cloud non activée

---

## ADR-007 — Voice = Web Speech API, pas de Whisper

**Date** : 2026-04-28
**Statut** : ✅ Accepté · livré (Phase 3, conservé)

**Contexte** : Whisper API d'OpenAI offre une qualité de transcription supérieure mais coûte ~0.006 $/min, envoie l'audio à OpenAI (problème RGPD), et nécessite une clé API + backend ou exposition de la clé.

**Décision** : Garder la dictée Web Speech API native (gratuit, local, fonctionne sur Chrome / Samsung Internet). Whisper réévalué seulement si tests terrain montrent que la qualité actuelle est insuffisante.

**Conséquences** :
- ✅ Aucun coût API
- ✅ Aucune donnée audio externe
- ⚠ Qualité variable selon navigateur et accent
- ❌ Pas de transcription en arrière-plan (Web Speech ne marche que pendant l'enregistrement actif)

---

## ADR-006 — Modificateurs contextuels en mode additif, pas multiplicatif

**Date** : 2026-04-28
**Statut** : 📋 Validé, **non implémenté** (sera S1)

**Contexte** : Pour le catalogue prix central, il faut un système de majoration contextuelle (pièce humide, étage sans ascenseur, copropriété stricte, etc.). Deux options : multiplicatif (`×1.15 × 1.10 = ×1.265`) ou additif (`+15% +10% = +25%`).

**Décision** : **Additif par défaut**. Plus naturel en BTP français. Multiplicatif possible en option avancée plus tard.

**Conséquences** :
- ✅ Plus lisible pour l'utilisateur final
- ✅ Calcul mental simple
- ⚠ Diffère légèrement du résultat multiplicatif (négligeable sous 30% de majoration cumulée)

---

## ADR-005 — Catalogue prix central, snapshot strict au moment d'entrée dans le devis

**Date** : 2026-04-28
**Statut** : 📋 Validé, **non implémenté** (sera S1)

**Contexte** : Quand l'utilisateur modifie un prix dans le catalogue, faut-il propager aux brouillons existants ?

**Décision** : **Snapshot strict (option C2)**. Quand une ligne du catalogue entre dans un brouillon de devis, son prix est figé. Modifier le catalogue plus tard ne change PAS les brouillons existants. Bouton **« Synchroniser avec prix actuels »** prévu pour P2 si besoin.

**Conséquences** :
- ✅ Pas de mauvaise surprise : un brouillon présenté au client ne change pas dans son dos
- ✅ Audit trail clair : chaque ligne sait à quel prix elle est entrée
- ⚠ Si l'utilisateur change un prix dans le catalogue, il doit recréer le brouillon pour que la nouvelle valeur s'applique

---

## ADR-004 — Stack vanilla conservée, refus du Plan B (Next.js / React / TS)

**Date** : 2026-04-27
**Statut** : ✅ Accepté

**Contexte** : Un prompt utilisateur entrant supposait que la stack actuelle était Next.js / React / TypeScript et demandait une "refonte conservant la stack". Après audit, la stack effective est vanilla JS + HTML monolithique.

**Décision** : Garder la vanilla. Refuser la refonte Next.js (estimée 150-200h, jeterait les 27 commits déjà investis). 95% du périmètre demandé est déjà construit. Quand modularisation sera nécessaire, splitter en modules ES6, pas migrer vers un framework.

**Conséquences** :
- ✅ 0 ligne de code jetée
- ✅ Risque faible (l'existant marche)
- ⚠ Dette technique acceptée : 1 fichier HTML 12k lignes monolithique. Acceptable pour 1 utilisateur, tendu si ouverture multi-utilisateurs prévue.
- ⚠ Pas de TypeScript, pas de tests Playwright (le prompt initial en demandait)

---

## ADR-003 — Bug d'ordre DOM checklist/quick-actions

**Date** : 2026-04-28
**Statut** : ✅ Accepté · livré (`b62ebcd`)

**Contexte** : La barre checklist sticky (5 chips Croquis/Mesures/Travaux/Photos/Notes) chevauchait visuellement les cartes quick-actions (Peinture standard, Rénovation complète, etc.) pendant le scroll. Cause : ordre DOM `checklist (sticky) → qab (flow normal)`. Quand sticky s'enclenche, qab passe sous la checklist et apparaît coupée.

**Décision** : Inverser l'ordre DOM. `qab AVANT checklist`. Les quick-actions sortent du viewport naturellement avant que le sticky ne s'enclenche. Plus de chevauchement.

**Conséquences** :
- ✅ Comportement sticky propre, pas de "cartes coupées"
- ✅ Aucun changement CSS
- ✅ 2 modifications coordonnées (refreshChecklist + injectQuickActionsBar)

---

## ADR-002 — Conservation totale du système Travaux split existant

**Date** : 2026-04-28
**Statut** : ✅ Accepté

**Contexte** : Plusieurs prompts utilisateur ont demandé d'ajouter de nouvelles couches métier (catalogue prix, suggestions intelligentes, analyse rendez-vous). Risque de doublon avec le module Travaux split existant.

**Décision** : Toute nouvelle couche s'ajoute **en parallèle**, jamais en remplacement. Les ponts entre nouvelle couche et existant sont explicites (mapping, non-destructif). Le système original reste source de vérité pour les cats / sous-options / paint elems.

**Conséquences** :
- ✅ Pas de risque de régression sur le workflow existant
- ✅ Utilisateur peut basculer entre l'ancien et le nouveau workflow librement
- ⚠ Duplication apparente (saisie cat dans Travaux split → suggérée dans Analyse) — résolue par les ponts (Commit 3 du module Analyse à venir)

---

## ADR-001 — Ajout S1 catalogue prix reporté tant que tests terrain manquants

**Date** : 2026-04-28
**Statut** : ⏸ Reporté

**Contexte** : Wireframe S1 (catalogue prix central éditable) validé avec 4 ajustements (édition inline, suppression hors modal, virtualisation pas pagination, modifiers additifs). Extraction normalisée de 148 lignes prête dans `_drafts/catalog-v0.json`. Mais l'utilisateur n'a pas encore confirmé que l'app actuelle marche en condition réelle de RDV.

**Décision** : Ne PAS démarrer l'implémentation S1 tant que :
1. Au moins 1 RDV réel de test a été fait avec l'app actuelle
2. Les 25 lignes orphelines ont été chiffrées
3. Les frictions terrain ont été remontées

**Conséquences** :
- ✅ Évite de coder un écran qui sera obsolète après les retours terrain
- ✅ Force la priorisation usage > features
- ⚠ Catalogue reste éparpillé (template SDB avec prix hard-codés) jusqu'au déclenchement S1

---

*Format : à chaque décision majeure, ajouter une nouvelle entrée ADR-XXX en haut. Garder court (~10-15 lignes par entrée).*
