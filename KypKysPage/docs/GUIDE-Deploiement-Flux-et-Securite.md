# Guide pas-à-pas — Flux Power Automate, connexions, URLs & sécurité

Ce guide vous fait construire les **3 flux** du portail, brancher les **connexions**,
adapter les **URLs** (SharePoint + portail) et **durcir la sécurité** de la résolution
d'identité. Suivez les sections dans l'ordre.

## Valeurs de VOTRE environnement (déjà connues)

| Élément | Valeur |
|---|---|
| Environment ID | `4283f926-de81-e59f-8be5-52cb50bca1fd` (région **prod**) |
| Organisation Dataverse | `org40a0a528.crm12.dynamics.com` |
| Application (code app) | `AFB_KYP_KYS` — `09bb04dc-2cf6-4650-afa7-4bb7d29f82ed` |
| Connexion Dataverse (réf.) | `d458b77a-5f7d-4e0a-a32c-28ce5ed2f15a` |
| Site Power Pages | `kypkyspage` — website id `79dd5594-cba6-42b2-99a9-6016365b8678` |
| Rôle web tiers externe | `4afb0001-0001-4001-8001-000000000001` |

À COMPLÉTER par vous (sections 1 et 2) :

| Élément | Où le trouver | Notez-le ici |
|---|---|---|
| **URL du portail** | `make.powerpages.microsoft.com` → site `kypkyspage` → bouton **Preview / Browse website** | `https://__________.powerappsportals.com` |
| **Adresse du site SharePoint** | section 2 ci-dessous | `https://afrilandfirstbank.sharepoint.com/sites/______` |

---

## ÉTAPE 0 — Se placer dans le bon environnement

1. Ouvrez **https://make.powerapps.com**.
2. En haut à droite, **sélecteur d'environnement** → choisissez celui dont l'ID
   est `4283f926-de81-e59f-8be5-52cb50bca1fd` (le même que la Power App).
   > ⚠️ Tous les flux DOIVENT être dans CET environnement, sinon ils ne voient pas
   > les tables `afb_*`.
3. Menu gauche → **Solutions** → ouvrez la solution qui contient l'app `AFB_KYP_KYS`
   (créez-la si besoin : **+ Nouvelle solution** → « AFB KYP KYS SOL », éditeur par défaut).
   > Mettre les flux dans une solution = portable entre DEV/UAT/PROD.

---

## ÉTAPE 1 — Créer les 3 connexions

Menu gauche → **Connexions** → **+ Nouvelle connexion**. Créez ces trois-là
(une seule fois, réutilisables par tous les flux) :

1. **Microsoft Dataverse** → s'authentifier avec un compte admin/maker AFB.
2. **SharePoint** → même compte (doit avoir accès au site SharePoint de la section 2).
3. **Office 365 Outlook** → un compte autorisé à envoyer des e-mails (idéalement une
   **boîte partagée** type `noreply.kypkys@afrilandfirstbank.com`).

> Vous brancherez ces connexions sur chaque action lors de la construction des flux.

---

## ÉTAPE 2 — Préparer SharePoint (stockage des pièces)

1. Allez sur **https://afrilandfirstbank.sharepoint.com** → **+ Créer un site** →
   **Site d'équipe** → nommez-le par ex. **KYP-KYS**.
   → l'adresse devient `https://afrilandfirstbank.sharepoint.com/sites/KYP-KYS`.
   **Notez cette adresse** (c'est le *Site Address* des flux).
2. Dans ce site → **+ Nouveau → Bibliothèque de documents** → nommez-la **Bibliotheque**.
3. Ouvrez la bibliothèque → **Paramètres ⚙ → Paramètres de la bibliothèque →
   Paramètres de version** → activez **l'historique des versions** (exigence
   « Remplacée le … » du cahier des charges).

> Le flux « Document → SharePoint » rangera les fichiers sous
> `Bibliotheque/<NomTiers>/<Année>/<CodeCatégorie>/`.

---

## ÉTAPE 3 — Trouver et adapter l'URL du portail

1. Ouvrez **https://make.powerpages.microsoft.com** → environnement correct →
   site **kypkyspage** → **Browse website** : l'URL qui s'ouvre est l'URL du portail.
2. Notez-la (table en tête de guide). Vous la collerez dans les e-mails des flux
   (boutons « Accéder à mon espace » / « Mettre à jour ma pièce »), en remplacement de
   `https://VOTRE-PORTAIL.powerappsportals.com/`.

---

## ÉTAPE 4 — Construire les flux

Pour chaque flux : **Solution → + Nouveau → Automatisation → Flux cloud → (type)**.
Suivez la spec détaillée correspondante, action par action, et **sur chaque action
Dataverse/SharePoint/Outlook, sélectionnez la connexion** créée à l'étape 1.

| # | Flux | Type | Spec détaillée |
|---|---|---|---|
| 1 | Invitation tiers + lien d'identité B2C | Automatisé (Dataverse *Added* sur `afb_tiers`) | [PowerAutomate-Onboarding-Flow.md](./PowerAutomate-Onboarding-Flow.md) — **lire l'ADDENDUM en tête** |
| 2 | Document → SharePoint | Automatisé (Dataverse *Added* sur `afb_document`) | [PowerAutomate-Document-SharePoint-Flow.md](./PowerAutomate-Document-SharePoint-Flow.md) |
| 3 | REFRESH (relances J-60/30/7) | Planifié (quotidien) | [PowerAutomate-Refresh-Flow.md](./PowerAutomate-Refresh-Flow.md) |

### Méthode A — Construction manuelle (recommandée, fiable)

Ajoutez les actions une à une depuis l'interface en recopiant les tableaux de chaque
spec. Les expressions `@{...}` se collent dans l'éditeur d'expression (onglet **Fx**).

### Méthode B — Réutiliser le squelette JSON (pour aller plus vite)

Chaque spec finit par un **squelette JSON** (`definition.json`). Il sert de référence
de structure : recréez les actions avec les mêmes `operationId`, filtres et expressions.
> Note : ce JSON n'est PAS une solution `.zip` importable en un clic — il documente la
> définition. La voie sûre reste la construction manuelle (Méthode A) en s'y référant.

### Points d'adaptation à ne pas oublier

- **Flux 1** : bien ajouter l'action **« Add a new row → afb_tiersexterneb2c »**
  (ADDENDUM) : sans elle, le portail ne retrouve pas le tiers du partenaire.
- **Flux 2** : *Site Address* = votre site SharePoint (étape 2) ; vérifier le
  *Folder Path*.
- **Flux 2 & 3** : remplacer l'URL du portail dans le corps des e-mails (étape 3).

Après chaque flux : **Enregistrer** → **Activer** (toggle en haut) → onglet **Détails**
pour confirmer « Activé ».

---

## ÉTAPE 5 — Durcir la sécurité de la résolution d'identité

Objectif : que le portail résolve le tiers du partenaire connecté via **le lookup
Contact** (lecture de SA seule fiche) plutôt que par lecture globale de la table
d'identité B2C. Le code (`getCurrentTiers`) essaie **déjà** cette voie en priorité ;
il reste à créer le lookup et à le peupler.

### 5.1 — Créer le lookup `afb_Tiers` sur la table Contact

1. `make.powerapps.com` → **Tables** → recherchez **Contact** (table standard).
2. **+ Nouveau → Colonne** :
   - Nom d'affichage : **Tiers**
   - Type de données : **Recherche (Lookup)**
   - Table associée : **Tiers** (`afb_tiers`)
   - **Enregistrer**.
3. Vérifiez le **nom logique de la relation** générée : il doit être
   **`afb_contact_Tiers_afb_tiers`** (c'est celui qu'attend la permission
   `Tiers-son-propre`). S'il diffère, alignez la permission
   (`.powerpages-site/table-permissions/Tiers-son-propre.tablepermission.yml`,
   champ `contactrelationship`) sur le nom réel, puis re-uploadez le site.

### 5.2 — Peupler le lookup à l'invitation

Dans le **Flux 1** (onboarding), ajoutez/complétez l'action **Update contact** (ou
au moment du « Create contact ») pour renseigner :

```
item/afb_Tiers@odata.bind = afb_tierses(<id du tiers>)
```

> Ainsi chaque contact partenaire pointe vers SA fiche tiers. Le portail lit alors
> `contacts(<moi>)?$expand=afb_Tiers` (permission `Tiers-son-propre`, scope **Contact**),
> sans aucune lecture globale.

### 5.3 — Retirer la permission de lecture globale B2C

Une fois 5.1 et 5.2 en place et testés :

1. Supprimez le fichier
   `.powerpages-site/table-permissions/TiersExterneB2C-lecture.tablepermission.yml`
   (permission scope **Global** — la faille à fermer).
2. **Optionnel** : désactivez aussi le Web API de cette table en passant
   `.powerpages-site/site-settings/Webapi-afb_tiersexterneb2c-enabled.sitesetting.yml`
   à `value: 'false'` (le portail n'en a plus besoin une fois la voie Contact active).
3. Re-uploadez le site Power Pages :
   ```powershell
   pac powerpages upload --path "KypKysPage\.powerpages-site"
   ```

> Tant que 5.1/5.2 ne sont pas faits, **gardez** la permission B2C : c'est le repli
> qui fait fonctionner le portail en attendant.

---

## ÉTAPE 6 — Tests de bout en bout

1. **Identité** : dans la Power App, créez un `afb_tiers` + déclenchez l'invitation
   (Flux 1). Connectez-vous au portail avec l'e-mail invité → l'espace s'ouvre avec
   le bon nom de partenaire (preuve que `getCurrentTiers` résout).
2. **Document → SharePoint** : portail → *Mes documents* → choisir une catégorie +
   déposer un PDF. Vérifiez : `afb_urlsharepoint` ne commence plus par `pending://`,
   le fichier est dans SharePoint, la note Dataverse a disparu.
3. **REFRESH** : créez un document `afb_datedexpiration = aujourd'hui + 7 j` →
   exécutez le flux manuellement → e-mail de relance reçu. Avec une date passée →
   statut bascule en **Expiré** (badge rouge dans *Mes documents*).
4. **Boucle inverse** : dans la Power App, validez un document → le portail affiche
   le statut « Validé ». Les deux apps lisent/écrivent bien les mêmes données.

---

## Récapitulatif des fichiers de référence

- Spécifications de flux : `docs/PowerAutomate-*.md` (Onboarding, Document-SharePoint, Refresh)
- Contrat de données partagé : `src/services/portal.js` (couche anti-corruption) +
  `src/config/dataverse.js` (`SETS`, `LOGICAL`, `CHOICES`)
- Permissions & Web API : `.powerpages-site/table-permissions/` et `.powerpages-site/site-settings/`
