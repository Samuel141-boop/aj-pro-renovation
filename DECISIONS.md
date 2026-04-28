# AJ PRO RÉNOVATION — Journal des décisions architecturales

> Format ADR (Architecture Decision Record) léger. Chaque entrée = une décision prise, son contexte, ses conséquences. Trié du plus récent au plus ancien.

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
