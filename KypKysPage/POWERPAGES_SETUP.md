# Configuration Power Pages ↔ Dataverse

Ce guide décrit ce qu'il faut activer dans le portail Power Pages
`AFB-KYP-KYS-DEV` pour que le code site React (`KypKysPage`) puisse
lire et écrire dans les tables Dataverse de la solution `afb_kyp_kys`.

Sans cette configuration, le navigateur reçoit `403 Forbidden` ou
`401 Unauthorized` sur tout appel à `/_api/<entity>`.

> Toutes les étapes sont à faire depuis **Power Pages Management**
> (https://make.powerpages.microsoft.com → site → ⚙ Paramètres → Power Pages Management),
> ou en mode pro-code via la solution exportée.

---

## 1 · Activer la Web API pour chaque table

Aller dans **Power Pages Management → Site Settings** et créer
les paramètres ci-dessous pour le site `AFB-KYP-KYS-DEV` :

| Nom du paramètre                                      | Valeur |
|--------------------------------------------------------|--------|
| `Webapi/afb_tiers/enabled`                             | `true` |
| `Webapi/afb_tiers/fields`                              | `*`    |
| `Webapi/afb_dossierkypkys/enabled`                     | `true` |
| `Webapi/afb_dossierkypkys/fields`                      | `*`    |
| `Webapi/afb_document/enabled`                          | `true` |
| `Webapi/afb_document/fields`                           | `*`    |
| `Webapi/afb_documentcategory/enabled`                  | `true` |
| `Webapi/afb_documentcategory/fields`                   | `*`    |
| `Webapi/afb_questionnaire/enabled`                     | `true` |
| `Webapi/afb_questionnaire/fields`                      | `*`    |
| `Webapi/afb_questionnairesection/enabled`              | `true` |
| `Webapi/afb_questionnairesection/fields`               | `*`    |
| `Webapi/afb_question/enabled`                          | `true` |
| `Webapi/afb_question/fields`                           | `*`    |
| `Webapi/afb_questionoption/enabled`                    | `true` |
| `Webapi/afb_questionoption/fields`                     | `*`    |
| `Webapi/afb_questionnaireassignment/enabled`           | `true` |
| `Webapi/afb_questionnaireassignment/fields`            | `*`    |
| `Webapi/afb_questionnaireresponse/enabled`             | `true` |
| `Webapi/afb_questionnaireresponse/fields`              | `*`    |
| `Webapi/afb_questionresponse/enabled`                  | `true` |
| `Webapi/afb_questionresponse/fields`                   | `*`    |
| `Webapi/annotation/enabled`                            | `true` |
| `Webapi/annotation/fields`                             | `subject,filename,mimetype,documentbody,notetext,objectid,objecttypecode` |
| `Webapi/error/innererror/enabled`                      | `true` |

> 🔒 **Sécurité** : en production, remplacez `*` par la liste explicite
> des champs accessibles côté portail (principe du moindre privilège).
> Ne jamais exposer les colonnes sensibles non destinées au tiers.

---

## 2 · Créer un Web Role « Tiers externe »

**Power Pages Management → Web Roles → New** :

- **Name** : `Tiers externe (KYP/KYS)`
- **Authenticated Users Role** : `Yes`
- **Anonymous Users Role** : `No`

Associer ce Web Role :
- aux **Contacts** authentifiés via Azure AD B2C (depuis le profil
  contact → onglet *Web Roles* → ajouter le rôle).

---

## 3 · Déclarer les Table Permissions

Pour chaque table accédée par le portail, créer une **Table Permission**
liée au Web Role `Tiers externe (KYP/KYS)`.

| Table Permission              | Table                       | Scope     | Privileges                | Lien |
|-------------------------------|-----------------------------|-----------|---------------------------|------|
| `Tiers — son propre`          | `afb_tiers`                 | Contact   | Read, Write               | via lookup contact → afb_tiers |
| `Dossier — son propre`        | `afb_dossierkypkys`         | Parent    | Read, Write, Create       | parent = `afb_tiers` |
| `Document — son propre`       | `afb_document`              | Parent    | Read, Write, Create, Delete | parent = `afb_tiers` |
| `Annotation — sur ses docs`   | `annotation`                | Parent    | Read, Write, Create       | parent = `afb_document` |
| `Document Category`           | `afb_documentcategory`      | Global    | Read                      | référentiel partagé |
| `Questionnaire (template)`    | `afb_questionnaire`         | Global    | Read                      | publié à tous |
| `Section / Question / Option` | `afb_questionnairesection`, `afb_question`, `afb_questionoption` | Global | Read | sous-éléments du template |
| `Assignment — son propre`     | `afb_questionnaireassignment` | Parent  | Read, Write               | parent = `afb_tiers` |
| `Response — sa propre`        | `afb_questionnaireresponse` | Parent    | Read, Write, Create       | parent = `afb_questionnaireassignment` |
| `QuestionResponse — sa propre`| `afb_questionresponse`      | Parent    | Read, Write, Create       | parent = `afb_questionnaireresponse` |
| `PartnerType` & `KYCChecklist`| `afb_partnertype`, `afb_kycchecklist`, `afb_kycchecklistitem` | Global | Read | référentiel |

> **Scopes utiles** :
> - `Contact` : enregistrement lié au contact connecté
> - `Parent` : enregistrements rattachés à un parent déjà autorisé
> - `Global` : tous les enregistrements (référentiel partagé en lecture)
> - `Account` : enregistrements du compte du contact (non utilisé ici)

---

## 4 · Lier le Contact à un Tiers (afb_tiers)

Le portail identifie un partenaire via le **Contact** Power Pages.
Ajoutez sur la table `contact` un **lookup `afb_tiers`** (champ `afb_tiers`,
schema name `afb_Tiers`). À la création d'un compte B2C :

1. Le chargé de relation crée la fiche `afb_tiers` côté Power Apps.
2. Le contact correspondant est créé/lié manuellement OU via Power Automate
   (déclenché sur l'invitation envoyée à l'étape 1 du module REF & ONBOARDING).
3. Le champ `contact.afb_Tiers` pointe vers le bon `afb_tiersid`.

Le code React résout cette association automatiquement via :
```js
GET /_api/contacts(<contactid>)?$expand=afb_tiers_Contact
```

---

## 5 · Anti-forgery & CORS

- **Anti-forgery** : Power Pages exige le header `__RequestVerificationToken`
  en écriture. Le client (`src/services/dataverse.js`) le récupère
  automatiquement via `window.shell.getTokenDeferred()`, sinon via
  `/_services/auth/token`. Aucune config supplémentaire requise.
- **CORS** : sans objet — le code site est servi sur la **même origine**
  que la Web API.

---

## 6 · Vérifications de bout en bout

Une fois 1 → 4 en place, ouvrir le site déployé et tester depuis la console
du navigateur :

```js
// 1) Le token doit s'obtenir
await fetch('/_services/auth/token', { credentials: 'include' }).then(r => r.text())

// 2) Lister vos documents (l'utilisateur doit être connecté)
await fetch('/_api/afb_documents?$top=1', { credentials: 'include' })
  .then(r => r.json())
```

Réponses attendues :
- `200 OK` avec `{ value: [ ... ] }` → la chaîne complète fonctionne.
- `403 Forbidden` → Table Permission manquante ou Web Role non assigné au contact.
- `401 Unauthorized` → le contact n'est pas authentifié (vérifier Azure AD B2C).
- `400` sur `Web API …/fields` → le paramètre `Webapi/<table>/fields` est absent.

---

## 7 · Côté code React

| Fichier                                  | Rôle |
|------------------------------------------|------|
| `src/config/dataverse.js`                | Bascule MOCK ↔ DATAVERSE + noms des sets OData |
| `src/services/dataverse.js`              | Client bas niveau (auth + CRUD) |
| `src/services/portal.js`                 | Opérations métier (loadDossier, loadDocuments, uploadDocument, …) |
| `src/services/mock.js`                   | Données factices pour `npm run dev` (localhost) |

L'application **détecte automatiquement** son contexte d'exécution :
- sur `localhost` → mode MOCK (aucune dépendance à Dataverse) ;
- sur le portail Power Pages → mode DATAVERSE (toutes les requêtes
  partent vers `/_api/`).

Pour forcer le mode DATAVERSE en local (test), modifier `USE_DATAVERSE`
dans `src/config/dataverse.js`.

---

## 8 · Bascule des set names si vos pluriels diffèrent

Dataverse génère le set OData à partir du *Plural name* défini à la
création de la table. Si vos pluriels diffèrent (ex. `afb_tiers` →
`afb_tiers` au lieu de `afb_tierses`), modifier l'objet `SETS` dans
`src/config/dataverse.js`. Pour vérifier le set exact d'une table :

```
GET https://<votre-environnement>.crm4.dynamics.com/api/data/v9.2/EntityDefinitions(LogicalName='afb_tiers')?$select=EntitySetName
```
