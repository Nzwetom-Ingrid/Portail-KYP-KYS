# Table Permissions — Portail KYP/KYS

Ces fichiers YAML déclarent les autorisations Dataverse que le portail
Power Pages applique aux requêtes Web API (`/_api/...`) du code site React.

## Convention de nommage

`<NomLisible>.tablepermission.yml`

## Champs principaux

| Champ                  | Rôle |
|------------------------|------|
| `id`                   | GUID stable — celui des fichiers livrés respecte le motif `4afb1001-…` |
| `name`                 | Libellé affiché dans Power Pages Management |
| `entityname`           | Logical name de la table cible (ex. `afb_document`) |
| `scope`                | `1`=Global · `2`=Contact · `3`=Account · `4`=Parent · `5`=Self |
| `contactrelationship`  | Si `scope=Contact` — schema name de la relation `contact ↔ entité` |
| `parentrelationship`   | Si `scope=Parent` — schema name de la relation `parent ↔ entité` |
| `parentpermission`     | Si `scope=Parent` — GUID de la Table Permission parente |
| `read/write/create/delete/append/appendto` | Privilèges OData |
| `webrole`              | GUID du Web Role bénéficiaire (ici : `4afb0001-…` = Tiers externe) |

## Permissions livrées

| Fichier | Table | Scope | CRUD |
|---------|-------|-------|------|
| `Tiers-son-propre.tablepermission.yml`             | `afb_tiers`                   | Contact | R/W |
| `Dossier-son-propre.tablepermission.yml`           | `afb_dossierkypkys`           | Parent  | R/W/C |
| `Document-son-propre.tablepermission.yml`          | `afb_document`                | Parent  | R/W/C/D |
| `Annotation-sur-ses-documents.tablepermission.yml` | `annotation`                  | Parent  | R/W/C/D |
| `Assignment-son-propre.tablepermission.yml`        | `afb_questionnaireassignment` | Parent  | R/W |
| `Response-sa-propre.tablepermission.yml`           | `afb_questionnaireresponse`   | Parent  | R/W/C |
| `QuestionResponse-sa-propre.tablepermission.yml`   | `afb_questionresponse`        | Parent  | R/W/C |
| `Questionnaire-template-global.tablepermission.yml`| `afb_questionnaire`           | Global  | R (template publié) |
| `Questions-options-sections-global.tablepermission.yml` | `afb_question`           | Global  | R |
| `Referentiels-KYC-global.tablepermission.yml`      | `afb_documentcategory`        | Global  | R |

## À ajuster avant le premier `pac pages upload-code-site`

Les noms des relations (`contactrelationship`, `parentrelationship`) sont
des placeholders. Pour récupérer le schema name EXACT de chaque relation :

```powershell
# Exemple : récupérer le nom de la relation afb_tiers → afb_document
pac data list-tables --select schemaname,logicalname
# puis, sur make.powerapps.com :
# table afb_document → Relationships → afb_tiers_document → schema name
```

À copier dans le champ `parentrelationship:` (ou `contactrelationship:`)
du YAML correspondant.

## Permissions complémentaires à créer si besoin

- `afb_questionnairesection` (Global, R) — si la table est interrogée directement.
- `afb_questionoption` (Global, R) — idem (sinon accédée via `$expand` de Question).
- `afb_questionlogic` (Global, R) — pour les règles de follow-up dynamiques.
- `afb_questionnaireclarification` (Parent sur Response, R/W) — pour les demandes de clarification.
- `afb_partnertype`, `afb_kycchecklist`, `afb_kycchecklistitem` (Global, R) — référentiels KYC.
- `afb_documentversion` (Parent sur Document, R) — pour le versionnement.
- `contact` (Self, R/W) — pour que le tiers édite son propre profil.

Dupliquer simplement l'un des YAMLs existants en adaptant `entityname`,
`scope`, `parentrelationship` et l'`id` (incrémenter le suffixe).
