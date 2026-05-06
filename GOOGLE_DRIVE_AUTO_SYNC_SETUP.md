# Sauvegarde automatique Google Drive — Configuration

L'application AJ PRO RÉNOVATION peut sauvegarder automatiquement toutes tes données (clients, pièces, mesures, travaux, photos, croquis, notes, devis…) dans ton Google Drive personnel, **sans bouton "Sauvegarder"** à cliquer.

Côté code, tout est en place. Il te reste **3 minutes de configuration côté Google Cloud** la première fois.

---

## Ce que ça fait

- 🟢 **Sauvegarde locale immédiate** à chaque modification (zéro perte si tu fermes l'app)
- ☁️ **Synchronisation Drive automatique** ~2,5 secondes après ton dernier changement (debouncée)
- 📡 **Mode hors ligne** : continue à sauvegarder en local, pousse vers Drive dès que la connexion revient
- 🗂️ **Structure de dossiers automatique** dans Drive :
  ```
  AJ PRO RÉNOVATION/
    ├── database/                    ← clients.json, pieces.json, mesures.json, etc.
    └── chantiers/
        └── 2026-05-06 - Mr Dupont - Paris/
            ├── sauvegarde-chantier.json   ← tout le chantier en 1 fichier
            ├── photos-originales/
            ├── photos-annotees/
            ├── croquis/
            └── documents/
  ```
- 🔄 **Restauration en 1 clic** depuis n'importe quelle tablette / ordinateur
- 🛡 **Anti-doublon** : les fichiers Drive existants sont mis à jour, pas dupliqués
- 👁 **Indicateur visible discret** dans la topbar (✓ / ↻ / ⚠ / ✈)
- 🔐 **Aucune clé secrète dans le code** — tu colles ton OAuth Client ID au premier lancement

---

## Étape 1 — Créer un projet Google Cloud (gratuit)

1. Va sur https://console.cloud.google.com/
2. En haut à gauche, clique sur le sélecteur de projet → **Nouveau projet**
3. Nom : `AJ PRO RÉNOVATION` (ou ce que tu veux)
4. Pas besoin d'organisation, clique **Créer**

## Étape 2 — Activer l'API Google Drive

1. Sélectionne ton projet (en haut)
2. Menu latéral ☰ → **API et services** → **Bibliothèque**
3. Cherche `Google Drive API`
4. Clique dessus → bouton **Activer** (gratuit, quota largement suffisant)

## Étape 3 — Configurer l'écran de consentement OAuth

1. Menu latéral ☰ → **API et services** → **Écran de consentement OAuth**
2. Type d'utilisateur : **Externe** → **Créer**
3. Remplis les champs minimums :
   - Nom de l'application : `AJ PRO RÉNOVATION`
   - E-mail d'assistance utilisateur : ton email
   - Coordonnées du développeur : ton email
4. Clique **Enregistrer et continuer**
5. Sur la page **Champs d'application** : pas besoin d'ajouter de scope ici (l'app utilise `drive.file` qui est non sensible) → **Enregistrer et continuer**
6. Sur la page **Utilisateurs de test** : ajoute ton adresse Gmail → **Enregistrer et continuer**
7. Récapitulatif → **Retour au tableau de bord**

> ⚠ Tant que l'app est en mode "test", seuls les utilisateurs ajoutés en utilisateurs de test peuvent l'utiliser. Pour toi seul ça suffit largement.

## Étape 4 — Créer un OAuth Client ID type "Application Web"

1. Menu latéral ☰ → **API et services** → **Identifiants**
2. **+ Créer des identifiants** → **ID client OAuth**
3. Type d'application : **Application Web**
4. Nom : `AJ PRO Web Client`
5. **Origines JavaScript autorisées** — clique **Ajouter un URI**, et ajoute ces URIs **EXACTEMENT** (sans slash final) :
   - `https://aj-pro-renovation.vercel.app`
   - `http://localhost:8765` (pour les tests en local éventuels)
6. **URI de redirection autorisés** : pas besoin (on utilise le flow implicite via Google Identity Services)
7. Clique **Créer**
8. **Une popup affiche ton Client ID**, format : `123456789012-abcdefghijklmnop.apps.googleusercontent.com`

→ **Copie ce Client ID, tu en as besoin à l'étape suivante.**

## Étape 5 — Connecter Google Drive dans l'application

1. Ouvre AJ PRO RÉNOVATION (sur ta tablette ou ton ordi)
2. En haut à droite dans la topbar, tu vois un badge gris **○ Drive non connecté**
3. **Clique dessus**
4. Une boîte de dialogue te demande ton OAuth Client ID
5. Colle le Client ID de l'étape 4 → OK
6. Une popup Google s'ouvre → choisis ton compte Google → autorise l'accès
7. Le badge passe en **↻ Synchronisation…** puis **✓ Synchronisé**

✅ **C'est fini.** À partir de maintenant toutes tes modifications sont sauvegardées automatiquement.

---

## Comment fonctionne la sauvegarde automatique

| Action utilisateur | Ce qui se passe |
|---|---|
| Crée/modifie un client, une pièce, une mesure… | Sauvegarde locale **immédiate** + ajout en file d'attente Drive |
| 2,5 secondes sans nouvelle modification | La file part vers Drive (en arrière-plan, n'interrompt pas l'usage) |
| Ajoute une photo / croquis | Upload du fichier binaire dans le bon sous-dossier Drive |
| Internet coupe en plein RDV | Le badge passe en **✈ Hors ligne**, modifications stockées en local |
| Internet revient | La queue se vide automatiquement vers Drive |
| Token Google expire (~1h) | Refresh silencieux automatique tant que le navigateur a la session |
| Tu fermes la tablette + tu rouvres demain | Reconnexion silencieuse si tu n'as pas révoqué l'accès |
| Conflit (modif Drive + modif locale) | Le local gagne par défaut (modifs récentes prioritaires) |

---

## Comment fonctionne le mode hors ligne

L'app continue à fonctionner exactement pareil sans Internet :
- Toutes les données sont sauvegardées en `localStorage` (clé `chantier_db_v2`)
- La file d'attente de synchronisation est aussi persistée localement (`aj-gdrive-state-v1`)
- Dès que `navigator.onLine` redevient vrai, la file se vide automatiquement

**Tu ne perds rien.** Même si la tablette est en mode avion toute la journée du RDV, tout sera poussé sur Drive le soir au retour au bureau.

---

## Comment restaurer depuis Drive

Sur n'importe quel autre appareil (autre tablette, ordinateur de bureau, neuf après crash) :

1. Ouvre AJ PRO RÉNOVATION
2. Connecte Google Drive (étape 5 ci-dessus)
3. Va dans la sidebar → **Mes chantiers enregistrés** (ou base de données)
4. Clique sur **« 🔄 Restaurer depuis Google Drive »**
5. Confirme → l'app télécharge `clients.json` + `pieces.json` du dossier `database/` et remplace ta base locale

⚠ La restauration **remplace** ta base locale. Si tu as déjà des chantiers locaux non synchronisés, exporte-les d'abord via le bouton « 💾 Exporter » classique.

---

## Que faire si la synchronisation échoue

Le badge passe en **⚠ Erreur Drive** :

| Cause possible | Solution |
|---|---|
| Token expiré | Clique le badge → reconnexion silencieuse |
| Internet coupé | Attends que ça revienne, la queue reprendra seule |
| Quota Drive dépassé (15 Go gratuits par compte Google) | Vide la corbeille Drive ou nettoie d'autres fichiers |
| Client ID révoqué côté Google Cloud | Reconnecte-toi : badge → nouveau prompt OAuth |
| Fichier Drive supprimé manuellement | L'app le recrée automatiquement à la prochaine sync |

Pour réinitialiser proprement et repartir de zéro :
1. Console JS du navigateur (F12)
2. Tape : `localStorage.removeItem('aj-gdrive-state-v1'); GDriveSync.disconnect();`
3. Recharge la page → reconfiguration depuis l'étape 5

---

## Variables d'environnement (.env)

**Aucune.** Tout est côté frontend, le Client ID est saisi par l'utilisateur à la 1ère connexion et stocké dans `localStorage`. Aucun secret côté serveur.

Si tu veux automatiser le déploiement, tu peux pré-remplir le Client ID en éditant directement `localStorage.setItem('aj-gdrive-state-v1', JSON.stringify({clientId: 'xxx.apps.googleusercontent.com', mapping:{database:{},chantiers:{},medias:{}}, queue:[]}))` mais ce n'est pas nécessaire.

---

## Sécurité

| Mesure | Effet |
|---|---|
| Scope OAuth `drive.file` | L'app ne voit QUE les fichiers qu'elle a créés. Elle ne peut pas lire ton Drive personnel. |
| Token éphémère (1h) | Stocké dans `sessionStorage`, vidé à la fermeture du navigateur |
| Client ID public | Pas un secret, mais protégé par la liste blanche d'origines (étape 4) |
| Origines autorisées strictes | Seul `aj-pro-renovation.vercel.app` peut utiliser ce Client ID |
| Aucune clé serveur | Pas de risque de fuite, l'OAuth est entièrement côté navigateur |

---

## Limites connues

- 🚫 **Quota Drive 15 Go** : suffisant pour ~1000 chantiers avec photos compressées. Si tu satures, il faudra payer Google One.
- 🚫 **Photos non compressées** : V1 envoie les photos telles quelles. Compression en V2 si nécessaire (économie ~5×).
- 🚫 **Pas de chiffrement bout-en-bout** : Google a accès aux fichiers (comme tout Drive). Pour des données ultra-sensibles, ne pas utiliser.
- 🚫 **1 seul utilisateur Drive à la fois** : pas de partage multi-utilisateurs en V1.

---

## En cas de problème — diagnostic rapide

Ouvre la console du navigateur (F12 sur ordi · `chrome://inspect` sur tablette branchée USB) et tape :

```js
GDriveSync.getStatus()
```

Tu obtiens :
```js
{
  status: 'idle',           // 'idle' = OK
  isAuthenticated: true,
  isOnline: true,
  queueSize: 0,             // 0 = tout est synchronisé
  lastSyncAt: 1715000000000,
  clientIdConfigured: true
}
```

Pour forcer une sync immédiate :
```js
GDriveSync.processQueue(true)
```

Pour tout déconnecter et repartir propre :
```js
GDriveSync.disconnect()
```
