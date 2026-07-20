# Flow Power Automate — Archivage SharePoint d'une pièce téléversée

> **Nom** : `AFB - KYP/KYS - Document vers SharePoint`
> **Type** : Flow de cloud automatisé (Solution `afb_kyp_kys`)
> **Connecteurs** : Dataverse, SharePoint
> **Module métier ciblé** : § 4.12 Module 11 — BIBLIOTHÈQUE (Doc de Conception V1.1)

Ce flow termine le téléversement initié par le partenaire sur le portail React.

**Rappel du contrat côté portail** (`KypKysPage/src/services/portal.js → uploadDocument`) :
1. Le partenaire dépose un fichier + choisit une **catégorie**.
2. Le portail crée l'enregistrement `afb_document` avec tous les champs requis,
   et **`afb_urlsharepoint = "pending://<nomfichier>"`** (marqueur d'attente).
3. Le binaire est attaché en **note Dataverse** (`annotation`) sur ce document.
4. **Ce flow** détecte la création → pousse le binaire vers SharePoint →
   renseigne la vraie `afb_urlsharepoint` → supprime la note (le binaire ne vit
   alors que dans SharePoint, conformément au cahier des charges : Dataverse =
   métadonnées, SharePoint = stockage 10 ans).

> Pourquoi un flow et pas un upload direct : Power Pages ne peut pas écrire dans
> SharePoint depuis le navigateur. La note Dataverse sert de relais (< 30 Mo).

---

## Schéma d'orchestration

```
   ┌────────────────────────────────┐
   │ Création d'un afb_document     │  déclencheur Dataverse (Added)
   │ filtre : afb_urlsharepoint     │  startswith 'pending://'
   │         + source = Déposé tiers│
   └───────────────┬────────────────┘
                   ▼
   ┌────────────────────────────────┐
   │ 1) Get row afb_document        │  + expand tiers & catégorie
   │    (nom tiers, année, catégorie)│
   └───────────────┬────────────────┘
                   ▼
   ┌────────────────────────────────┐
   │ 2) List annotations            │  _objectid_value eq <docid>
   │    (documentbody base64)       │  isdocument eq true, top 1
   └───────────────┬────────────────┘
                   ▼
   ┌────────────────────────────────┐
   │ 3) SharePoint — Create file    │  /Bibliothèque/<Tiers>/<Année>/<Catégorie>/
   │    base64ToBinary(documentbody)│
   └───────────────┬────────────────┘
                   ▼
   ┌────────────────────────────────┐
   │ 4) Update afb_document         │  afb_urlsharepoint = <url SharePoint>
   └───────────────┬────────────────┘
                   ▼
   ┌────────────────────────────────┐
   │ 5) Delete annotation           │  binaire conservé en SharePoint seul
   └────────────────────────────────┘
```

---

## Création pas à pas dans Power Automate

> `make.powerapps.com` → environnement **AFB-KYP-KYS-DEV** → Solutions →
> `AFB KYP KYS SOL` → ➕ Nouveau → Automatisation → Flow de cloud → **Automatisé**.

### Déclencheur — `When a row is added, modified or deleted` (Dataverse)

| Paramètre           | Valeur |
|---------------------|--------|
| Change type         | **Added** (uniquement — évite la boucle lors du PATCH de l'étape 4) |
| Table name          | DOCUMENTS (`afb_document`) |
| Scope               | Organization |
| Select columns      | `afb_documentid,afb_nomdufichier,afb_anneededepot,afb_urlsharepoint,afb_sourcedudepot` |
| Filter rows (OData) | `startswith(afb_urlsharepoint,'pending://') and afb_sourcedudepot eq 747010000` |

> `747010000` = `afb_sourcedudepot` « Déposé par tiers » (cf. `CHOICES.documentSource.Tiers`
> dans `KypKysPage/src/config/dataverse.js`). On ne traite que les dépôts portail en attente.

### Action 1 — `Get a row by ID` (afb_document, pour les expands)

**Connecteur** : Microsoft Dataverse → **Get a row by ID**

| Champ        | Valeur |
|--------------|--------|
| Table name   | DOCUMENTS |
| Row ID       | `@{triggerOutputs()?['body/afb_documentid']}` |
| Select columns | `afb_nomdufichier,afb_anneededepot` |
| Expand Query | `afb_tiers($select=afb_nomdupartenaire),afb_categorie($select=afb_codedudocument,afb_libelle)` |

> Donne le nom du tiers et le libellé de catégorie pour construire l'arborescence.

### Action 2 — `List rows` (annotations — récupérer le binaire)

**Connecteur** : Microsoft Dataverse → **List rows**

| Champ          | Valeur |
|----------------|--------|
| Table name     | Notes (`annotation`) |
| Select columns | `annotationid,filename,mimetype,documentbody` |
| Filter rows    | `_objectid_value eq @{triggerOutputs()?['body/afb_documentid']} and isdocument eq true` |
| Row count      | 1 |

> Le portail crée cette note dans `uploadDocument` (subject « Pièce jointe partenaire »).

### Action 3 — `Create file` (SharePoint)

**Connecteur** : SharePoint → **Create file**

| Champ        | Valeur |
|--------------|--------|
| Site Address | `https://afrilandfirstbank.sharepoint.com/sites/KYP-KYS` (à adapter) |
| Folder Path  | voir expression ci-dessous |
| File Name    | `@{first(outputs('List_rows')?['body/value'])?['filename']}` |
| File Content | `@{base64ToBinary(first(outputs('List_rows')?['body/value'])?['documentbody'])}` |

**Folder Path** (arborescence Tiers / Année / Catégorie) :

```
@{concat(
  'Bibliotheque/',
  outputs('Get_a_row_by_ID')?['body/afb_tiers/afb_nomdupartenaire'], '/',
  string(outputs('Get_a_row_by_ID')?['body/afb_anneededepot']), '/',
  coalesce(outputs('Get_a_row_by_ID')?['body/afb_categorie/afb_codedudocument'], 'AUTRES')
)}
```

> Crée automatiquement les dossiers manquants. Active le versionnement de la
> bibliothèque SharePoint pour couvrir l'exigence « Remplacée le … » (§ 4.12).

### Action 4 — `Update a row` (renseigner l'URL réelle)

**Connecteur** : Microsoft Dataverse → **Update a row**

| Champ             | Valeur |
|-------------------|--------|
| Table name        | DOCUMENTS |
| Row ID            | `@{triggerOutputs()?['body/afb_documentid']}` |
| `afb_urlsharepoint` | `@{outputs('Create_file')?['body/{Link}']}` |

> Dès cet instant, le portail (`mapDocument`) et le Power App lisent la même URL
> SharePoint pointant sur le binaire. La communication est bouclée.

### Action 5 — `Delete a row` (supprimer la note relais) — *optionnel*

**Connecteur** : Microsoft Dataverse → **Delete a row**

| Champ      | Valeur |
|------------|--------|
| Table name | Notes (`annotation`) |
| Row ID     | `@{first(outputs('List_rows')?['body/value'])?['annotationid']}` |

> Recommandé : évite de stocker le binaire deux fois (Dataverse + SharePoint).
> À NE PAS activer si vous préférez garder un cache Dataverse du fichier.

---

## Tests à exécuter après publication

1. Sur le portail (déployé, pas en localhost) : page **Mes documents** →
   choisir une catégorie + déposer un PDF.
2. Vérifier dans **Run history** que les 5 actions sont vertes.
3. Dataverse : l'enregistrement `afb_document` a `afb_urlsharepoint` qui ne
   commence plus par `pending://` mais pointe sur SharePoint ; la note a disparu.
4. SharePoint : le fichier est rangé sous `Bibliotheque/<Tiers>/<Année>/<Code catégorie>/`.
5. Power App interne : ouvrir la fiche du tiers → la pièce est visible et
   téléchargeable via son URL SharePoint.

---

## Variante REFRESH (échéances d'expiration)

La colonne `afb_datedexpiration` (renseignée à l'upload via le champ ajouté au
portail) alimente le module REFRESH (§ 4.8) : un second flow planifié quotidien
peut lister les `afb_document` dont `afb_datedexpiration` tombe à J-60 / J-30 / J-7
et notifier le partenaire. (Hors périmètre de ce flow — à créer séparément.)

---

## Annexe — Squelette JSON exportable

```json
{
  "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
  "contentVersion": "1.0.0.0",
  "triggers": {
    "When_a_document_is_added": {
      "type": "OpenApiConnectionWebhook",
      "inputs": {
        "host": { "connectionName": "shared_commondataserviceforapps", "operationId": "SubscribeWebhookTrigger" },
        "parameters": {
          "subscriptionRequest/message": 1,
          "subscriptionRequest/entityname": "afb_document",
          "subscriptionRequest/scope": 4,
          "subscriptionRequest/filterexpression": "startswith(afb_urlsharepoint,'pending://') and afb_sourcedudepot eq 747010000"
        }
      }
    }
  },
  "actions": {
    "Get_document": {
      "type": "OpenApiConnection",
      "inputs": {
        "host": { "connectionName": "shared_commondataserviceforapps", "operationId": "GetItem" },
        "parameters": {
          "entityName": "afb_documents",
          "recordId": "@triggerOutputs()?['body/afb_documentid']",
          "$select": "afb_nomdufichier,afb_anneededepot",
          "$expand": "afb_tiers($select=afb_nomdupartenaire),afb_categorie($select=afb_codedudocument,afb_libelle)"
        }
      }
    },
    "List_annotations": {
      "type": "OpenApiConnection",
      "runAfter": { "Get_document": ["Succeeded"] },
      "inputs": {
        "host": { "connectionName": "shared_commondataserviceforapps", "operationId": "ListRecords" },
        "parameters": {
          "entityName": "annotations",
          "$select": "annotationid,filename,mimetype,documentbody",
          "$filter": "@concat('_objectid_value eq ', triggerOutputs()?['body/afb_documentid'], ' and isdocument eq true')",
          "$top": 1
        }
      }
    },
    "Create_file_SharePoint": {
      "type": "OpenApiConnection",
      "runAfter": { "List_annotations": ["Succeeded"] },
      "inputs": {
        "host": { "connectionName": "shared_sharepointonline", "operationId": "CreateFile" },
        "parameters": {
          "dataset": "https://afrilandfirstbank.sharepoint.com/sites/KYP-KYS",
          "folderPath": "@concat('Bibliotheque/', outputs('Get_document')?['body/afb_tiers/afb_nomdupartenaire'], '/', string(outputs('Get_document')?['body/afb_anneededepot']), '/', coalesce(outputs('Get_document')?['body/afb_categorie/afb_codedudocument'], 'AUTRES'))",
          "name": "@first(outputs('List_annotations')?['body/value'])?['filename']",
          "body": "@base64ToBinary(first(outputs('List_annotations')?['body/value'])?['documentbody'])"
        }
      }
    },
    "Update_document_url": {
      "type": "OpenApiConnection",
      "runAfter": { "Create_file_SharePoint": ["Succeeded"] },
      "inputs": {
        "host": { "connectionName": "shared_commondataserviceforapps", "operationId": "UpdateRecord" },
        "parameters": {
          "entityName": "afb_documents",
          "recordId": "@triggerOutputs()?['body/afb_documentid']",
          "item/afb_urlsharepoint": "@outputs('Create_file_SharePoint')?['body/{Link}']"
        }
      }
    },
    "Delete_annotation": {
      "type": "OpenApiConnection",
      "runAfter": { "Update_document_url": ["Succeeded"] },
      "inputs": {
        "host": { "connectionName": "shared_commondataserviceforapps", "operationId": "DeleteRecord" },
        "parameters": {
          "entityName": "annotations",
          "recordId": "@first(outputs('List_annotations')?['body/value'])?['annotationid']"
        }
      }
    }
  }
}
```

> ⚠️ Adapter le **Site Address** SharePoint et le chemin de bibliothèque à votre
> environnement avant publication.
