# Sauvegarde automatique OneDrive — Configuration

L'application AJ PRO RÉNOVATION peut sauvegarder automatiquement toutes tes données (clients, pièces, mesures, travaux, photos, croquis, notes, devis…) dans ton OneDrive Microsoft personnel, **sans bouton "Sauvegarder"** à cliquer.

Côté code, tout est en place. Il te reste **5 minutes de configuration côté Microsoft Azure** la première fois.

---

## Ce que ça fait

- 🟢 **Sauvegarde locale immédiate** à chaque modification (zéro perte si tu fermes l'app)
- ☁️ **Synchronisation OneDrive automatique** ~2,5 secondes après ton dernier changement (debouncée)
- 📡 **Mode hors ligne** : continue à sauvegarder en local, pousse vers OneDrive dès que la connexion revient
- 🗂️ **Structure de dossiers automatique** dans OneDrive :
  ```
  Apps/
    AJ PRO RÉNOVATION/             ← AppFolder (créé auto, isolé du reste de ton OneDrive)
      ├── database/                  ← clients.json, pieces.json, mesures.json, etc.
      └── chantiers/
          └── 2026-05-06 - Mr Dupont - Paris/
              ├── sauvegarde-chantier.json   ← tout le chantier en 1 fichier
              ├── photos-originales/
              ├── photos-annotees/
              ├── croquis/
              └── documents/
  ```
- 🔄 **Restauration en 1 clic** depuis n'importe quelle tablette / ordinateur
- 🛡 **Anti-doublon** : les fichiers OneDrive existants sont mis à jour (PUT par chemin), pas dupliqués
- 👁 **Indicateur visible discret** dans la topbar (✓ / ↻ / ⚠ / ✈)
- 🔐 **Aucune clé secrète dans le code** — tu colles ton OAuth Client ID au premier lancement
- 🛡 **Scope `Files.ReadWrite.AppFolder`** : l'app n'accède **qu'à son propre dossier** dans `Apps/`, pas au reste de ton OneDrive personnel

---

## Étape 1 — Te connecter au portail Azure

1. Va sur https://portal.azure.com
2. Connecte-toi avec ton compte Microsoft (le même que celui utilisé pour OneDrive)
3. Le portail Azure est gratuit pour ce type d'utilisation (création d'app cliente)

> Pas besoin d'abonnement Azure payant — la création d'une app SPA est incluse gratuitement avec n'importe quel compte Microsoft.

## Étape 2 — Aller dans Microsoft Entra ID (anciennement Azure AD)

1. Dans la barre de recherche en haut, tape **"Microsoft Entra ID"** → clique sur le résultat
2. Dans le menu latéral, clique sur **"Inscriptions d'applications"** (ou **"App registrations"** en anglais)
3. En haut, clique sur **"+ Nouvelle inscription"** (ou **"+ New registration"**)

## Étape 3 — Enregistrer l'application

Remplis le formulaire :

- **Nom** : `AJ PRO RÉNOVATION` (ce nom apparaîtra comme nom du dossier `Apps/AJ PRO RÉNOVATION/` dans ton OneDrive)
- **Types de comptes pris en charge** : choisis selon ton compte :
  - 🏠 Compte Hotmail / Outlook personnel : sélectionne **"Comptes personnels Microsoft uniquement"**
  - 🏢 Compte Microsoft 365 entreprise : sélectionne **"Comptes dans tout annuaire organisationnel et comptes Microsoft personnels"**
  - Si tu ne sais pas, prends le 2ème (le plus permissif)
- **URI de redirection** : choisis le type **"Application monopage (SPA)"** (PAS "Web") → entre la valeur :
  ```
  https://aj-pro-renovation.vercel.app
  ```
  (sans slash final)
- Clique **"S'inscrire"** en bas

## Étape 4 — Récupérer l'Application (client) ID

Tu arrives sur la page de l'app fraîchement créée :

1. Tu vois en haut **"ID d'application (client)"** (Application (client) ID), format :
   ```
   12345678-abcd-1234-abcd-1234567890ab
   ```
2. **Clique sur l'icône copier** à côté → tu en as besoin à l'étape 6.

## Étape 5 — Configurer les permissions API (Microsoft Graph)

1. Dans le menu latéral de ton app, clique sur **"Autorisations API"** (ou **"API permissions"**)
2. Tu devrais déjà voir **`User.Read`** par défaut. C'est OK.
3. Clique **"+ Ajouter une autorisation"** → **"Microsoft Graph"** → **"Autorisations déléguées"**
4. Cherche et coche **`Files.ReadWrite.AppFolder`** (sous la catégorie Files)
5. Clique **"Ajouter les autorisations"**
6. Tu vois maintenant 2 permissions : `User.Read` + `Files.ReadWrite.AppFolder`
7. **Aucun consentement administrateur n'est requis** pour ces permissions (ce sont des scopes "user").

## Étape 6 — Connecter OneDrive dans l'application

1. Ouvre AJ PRO RÉNOVATION (sur ta tablette ou ton ordi)
2. En haut à droite dans la topbar, tu vois un badge gris **○ OneDrive non connecté**
3. **Clique dessus** (ou va dans **Mes chantiers enregistrés** → bouton **"☁️ Connecter OneDrive"**)
4. Une boîte de dialogue te demande ton OAuth Client ID
5. Colle l'ID de l'étape 4 → OK
6. Une popup Microsoft s'ouvre → choisis ton compte Microsoft → **"Oui, autoriser"**
7. Le badge passe en **↻ Synchronisation…** puis **✓ Synchronisé**

✅ **C'est fini.** À partir de maintenant toutes tes modifications sont sauvegardées automatiquement dans ton OneDrive.

---

## Comment fonctionne la sauvegarde automatique

| Action utilisateur | Ce qui se passe |
|---|---|
| Crée/modifie un client, une pièce, une mesure… | Sauvegarde locale **immédiate** + ajout en file d'attente OneDrive |
| 2,5 secondes sans nouvelle modification | La file part vers OneDrive (en arrière-plan) |
| Ajoute une photo / croquis | Upload du fichier binaire dans le bon sous-dossier OneDrive |
| Internet coupe en plein RDV | Le badge passe en **✈ Hors ligne**, modifications stockées en local |
| Internet revient | La queue se vide automatiquement vers OneDrive |
| Token Microsoft expire (~1h) | Refresh silencieux automatique tant que MSAL a la session en cache |
| Tu fermes la tablette + tu rouvres demain | Reconnexion silencieuse si tu n'as pas révoqué l'accès |
| Conflit (modif OneDrive + modif locale) | Le local gagne par défaut (modifs récentes prioritaires) |

---

## Comment fonctionne le mode hors ligne

L'app continue à fonctionner exactement pareil sans Internet :
- Toutes les données sont sauvegardées en `localStorage` (clé `chantier_db_v2`)
- La file d'attente de synchronisation est aussi persistée localement (`aj-onedrive-state-v1`)
- Dès que `navigator.onLine` redevient vrai, la file se vide automatiquement

**Tu ne perds rien.** Même si la tablette est en mode avion toute la journée du RDV, tout sera poussé sur OneDrive le soir au retour au bureau.

---

## Comment restaurer depuis OneDrive

Sur n'importe quel autre appareil (autre tablette, ordinateur de bureau, neuf après crash) :

1. Ouvre AJ PRO RÉNOVATION
2. Connecte OneDrive (étape 6 ci-dessus)
3. Va dans la sidebar → **Mes chantiers enregistrés**
4. Clique sur **« 🔄 Restaurer depuis OneDrive »**
5. Confirme → l'app télécharge `clients.json` + `pieces.json` du dossier `database/` et remplace ta base locale

⚠ La restauration **remplace** ta base locale. Si tu as déjà des chantiers locaux non synchronisés, exporte-les d'abord via le bouton « 💾 Exporter » classique.

---

## Que faire si la synchronisation échoue

Le badge passe en **⚠ Erreur OneDrive** :

| Cause possible | Solution |
|---|---|
| Token expiré | Clique le badge → reconnexion silencieuse |
| Internet coupé | Attends que ça revienne, la queue reprendra seule |
| Quota OneDrive dépassé (5 Go gratuit / 1 To Microsoft 365) | Vide la corbeille OneDrive ou nettoie d'autres fichiers |
| Client ID révoqué côté Azure | Reconnecte-toi : badge → nouveau prompt OAuth |
| Permissions modifiées dans Azure | Refais l'étape 5 (`Files.ReadWrite.AppFolder` + `User.Read`) |

Pour réinitialiser proprement et repartir de zéro :
1. Console JS du navigateur (F12)
2. Tape : `localStorage.removeItem('aj-onedrive-state-v1'); OneDriveSync.disconnect();`
3. Recharge la page → reconfiguration depuis l'étape 6

---

## Variables d'environnement

**Aucune.** Tout est côté frontend, le Client ID est saisi par l'utilisateur à la 1ère connexion et stocké dans `localStorage`. Aucun secret côté serveur.

---

## Sécurité

| Mesure | Effet |
|---|---|
| Scope OAuth `Files.ReadWrite.AppFolder` | L'app ne voit QUE son propre dossier dans `Apps/AJ PRO RÉNOVATION/`. Elle ne peut PAS lire ton OneDrive personnel. |
| Token éphémère (1h) | Géré par MSAL.js avec cache `localStorage` pour le refresh silencieux |
| Client ID public | Pas un secret, mais protégé par la liste blanche d'origines (étape 3) |
| Origines autorisées strictes | Seul `aj-pro-renovation.vercel.app` peut utiliser ce Client ID |
| Aucune clé serveur | Pas de risque de fuite, l'OAuth est entièrement côté navigateur |
| PKCE auto | MSAL.js v2/v3 utilise PKCE (Proof Key for Code Exchange) automatiquement |

---

## Limites connues

- 🚫 **Quota OneDrive 5 Go gratuit** par compte Microsoft (1 To si abonnement Microsoft 365). Suffisant pour ~300 chantiers avec photos compressées en gratuit, pratiquement illimité avec 365.
- 🚫 **Photos non re-compressées avant upload** : V1 envoie comme stocké en local. Compression supplémentaire possible en V2.
- 🚫 **Pas de chiffrement bout-en-bout** : Microsoft a accès aux fichiers (comme tout OneDrive). Pour des données ultra-sensibles, ne pas utiliser.
- 🚫 **1 seul utilisateur OneDrive à la fois** : pas de partage multi-utilisateurs en V1.

---

## En cas de problème — diagnostic rapide

Ouvre la console du navigateur (F12 sur ordi · `chrome://inspect` sur tablette branchée USB) et tape :

```js
OneDriveSync.getStatus()
```

Tu obtiens :
```js
{
  status: 'idle',                       // 'idle' = OK
  isAuthenticated: true,
  isOnline: true,
  queueSize: 0,                         // 0 = tout est synchronisé
  lastSyncAt: 1715000000000,
  clientIdConfigured: true,
  account: 'pouleursamuel@outlook.com'  // ton compte Microsoft connecté
}
```

Pour forcer une sync immédiate :
```js
OneDriveSync.processQueue(true)
```

Pour tout déconnecter et repartir propre :
```js
OneDriveSync.disconnect()
```

---

## Différences avec Google Drive

Si tu as déjà configuré Google Drive précédemment :
- L'ancien module `gdrive-sync.js` est toujours dans le code mais n'est plus chargé
- Tu peux ignorer le badge Google s'il apparaît
- Les données déjà sauvegardées sur Google Drive restent là, intactes
- Cette nouvelle sync OneDrive démarre depuis zéro (la base locale est resynchro vers OneDrive)
