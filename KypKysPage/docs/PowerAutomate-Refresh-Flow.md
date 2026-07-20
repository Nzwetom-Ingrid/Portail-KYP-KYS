# Flow Power Automate — REFRESH (relances d'expiration des pièces)

> **Nom** : `AFB - KYP/KYS - Refresh échéances`
> **Type** : Flow de cloud **planifié** (Solution `afb_kyp_kys`)
> **Connecteurs** : Dataverse, Office 365 Outlook
> **Module métier ciblé** : § 4.8 Module 7 — REFRESH (Doc de Conception V1.1)

Chaque jour, ce flow détecte les pièces (`afb_document`) qui arrivent à expiration
à **J-60, J-30 et J-7** (colonne `afb_datedexpiration`, renseignée à l'upload par le
portail) et relance le partenaire. Il marque aussi en **« Expiré »** les pièces dont
la date est dépassée, ce qui se reflète immédiatement côté portail (badge rouge dans
*Mes documents*) et côté Power App.

> La colonne `afb_datedexpiration` est alimentée par le champ « Date d'expiration »
> ajouté au téléversement (`KypKysPage/src/pages/Documents.jsx`).

---

## Schéma d'orchestration

```
   ┌──────────────────────────┐
   │ Récurrence : tous les jours│  06:00 (Afrique/Douala, UTC+1)
   └────────────┬─────────────┘
                ▼
   ┌──────────────────────────────────────────────┐
   │ Pour chaque fenêtre [60, 30, 7] :            │
   │  List afb_document expirant dans N jours      │
   │   → e-mail de relance au partenaire           │
   └────────────┬─────────────────────────────────┘
                ▼
   ┌──────────────────────────────────────────────┐
   │ List afb_document déjà expirés (date < auj.)  │
   │   et encore « Valide »                         │
   │   → Update afb_statutdevalidite = 747010001    │  (Expiré)
   │   → e-mail d'alerte « pièce expirée »          │
   └──────────────────────────────────────────────┘
```

---

## Création pas à pas dans Power Automate

> `make.powerapps.com` → environnement **AFB-KYP-KYS-DEV** → Solutions →
> `AFB KYP KYS SOL` → ➕ Nouveau → Automatisation → Flow de cloud → **Planifié**.
> Récurrence : **1 jour**, heure de départ **06:00**, fuseau **(UTC+01:00) Afrique de l'Ouest**.

### Action 1 — `Initialize variable` (varFenetres)

| Champ | Valeur |
|-------|--------|
| Name  | `varFenetres` |
| Type  | Array |
| Value | `[60, 30, 7]` |

### Action 2 — `Apply to each` sur `@variables('varFenetres')`

Pour chaque valeur `N` (item) :

#### 2.a — `Compose` (date cible)

```
@{formatDateTime(addDays(utcNow(), item()), 'yyyy-MM-dd')}
```

#### 2.b — `List rows` (documents expirant ce jour-là)

**Connecteur** : Microsoft Dataverse → **List rows**

| Champ          | Valeur |
|----------------|--------|
| Table name     | DOCUMENTS (`afb_document`) |
| Select columns | `afb_documentid,afb_nomdufichier,afb_datedexpiration` |
| Expand Query   | `afb_tiers($select=afb_nomdupartenaire,afb_emailcontactprincipal)` |
| Filter rows    | `afb_datedexpiration eq @{outputs('Compose')} and afb_statutdevalidite eq 0` |

> `afb_statutdevalidite eq 0` = pièce « Valide » uniquement (on ne relance pas les rejetées).

#### 2.c — `Apply to each` (documents trouvés) → `Send an email (V2)`

| Champ | Valeur |
|-------|--------|
| To    | `@{items('Apply_to_each_doc')?['afb_tiers/afb_emailcontactprincipal']}` |
| Subject | `Pièce à renouveler sous @{item()} jours — @{items('Apply_to_each_doc')?['afb_nomdufichier']}` |
| Body  | rappel + lien vers le portail (cf. modèle HTML plus bas) |

### Action 3 — `List rows` (pièces déjà expirées à régulariser)

| Champ          | Valeur |
|----------------|--------|
| Table name     | DOCUMENTS |
| Select columns | `afb_documentid,afb_nomdufichier` |
| Expand Query   | `afb_tiers($select=afb_nomdupartenaire,afb_emailcontactprincipal)` |
| Filter rows    | `afb_datedexpiration lt @{formatDateTime(utcNow(),'yyyy-MM-dd')} and afb_statutdevalidite eq 0` |

### Action 4 — `Apply to each` (pièces expirées) → 2 actions

#### 4.a — `Update a row`

| Champ | Valeur |
|-------|--------|
| Table name | DOCUMENTS |
| Row ID | `@{items('Apply_to_each_expired')?['afb_documentid']}` |
| `afb_statutdevalidite` | `747010001` (Expiré) |

#### 4.b — `Send an email (V2)` — alerte « pièce expirée »

| Champ | Valeur |
|-------|--------|
| To | `@{items('Apply_to_each_expired')?['afb_tiers/afb_emailcontactprincipal']}` |
| Subject | `Pièce expirée à renouveler — @{items('Apply_to_each_expired')?['afb_nomdufichier']}` |

> **Escalade (option)** : ajouter ici une branche « si toujours expiré après J+7 →
> notifier le chargé de relation (afb_chargederelation du tiers) puis le RCSI »,
> conformément au § 4.8 (escalade automatique).

#### Corps d'e-mail de relance (HTML, réutilisable)

```html
<table width="100%" cellpadding="0" cellspacing="0" style="font-family:'Segoe UI',sans-serif;background:#f4f5f7;padding:24px;">
  <tr><td align="center">
    <table width="600" style="background:#fff;border-radius:14px;overflow:hidden;">
      <tr><td style="background:linear-gradient(115deg,#16181c,#7c0c1b,#c8102e);padding:22px;color:#fff;">
        <strong>Afriland First Bank — Portail KYP/KYS</strong>
      </td></tr>
      <tr><td style="padding:26px;color:#181a1e;font-size:14px;line-height:1.55;">
        <p>Bonjour,</p>
        <p>La pièce <strong>@{items('Apply_to_each_doc')?['afb_nomdufichier']}</strong> de votre dossier
        arrive à expiration. Merci de déposer une version à jour depuis votre espace.</p>
        <p style="text-align:center;margin:26px 0;">
          <a href="https://VOTRE-PORTAIL.powerappsportals.com/" style="display:inline-block;background:#c8102e;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:600;">
            Mettre à jour ma pièce
          </a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

> Remplacer `https://VOTRE-PORTAIL.powerappsportals.com/` par l'URL réelle du portail.

---

## Tests à exécuter après publication

1. Créer un `afb_document` de test avec `afb_datedexpiration = aujourd'hui + 7 jours`
   et `afb_statutdevalidite = 0`.
2. Exécuter le flow manuellement (**Test → Manually**).
3. Vérifier la réception de l'e-mail de relance « sous 7 jours ».
4. Créer un document avec `afb_datedexpiration = hier` → après exécution, vérifier que
   `afb_statutdevalidite` passe à `747010001` (Expiré) et que le badge devient rouge
   dans *Mes documents* sur le portail.

---

## Annexe — Squelette JSON exportable

```json
{
  "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
  "contentVersion": "1.0.0.0",
  "triggers": {
    "Recurrence": {
      "type": "Recurrence",
      "recurrence": { "frequency": "Day", "interval": 1, "timeZone": "W. Central Africa Standard Time", "startTime": "2026-06-10T06:00:00" }
    }
  },
  "actions": {
    "Init_fenetres": {
      "type": "InitializeVariable",
      "inputs": { "variables": [{ "name": "varFenetres", "type": "array", "value": [60, 30, 7] }] }
    },
    "Pour_chaque_fenetre": {
      "type": "Foreach",
      "runAfter": { "Init_fenetres": ["Succeeded"] },
      "foreach": "@variables('varFenetres')",
      "actions": {
        "Date_cible": {
          "type": "Compose",
          "inputs": "@formatDateTime(addDays(utcNow(), item()), 'yyyy-MM-dd')"
        },
        "List_docs_expirant": {
          "type": "OpenApiConnection",
          "runAfter": { "Date_cible": ["Succeeded"] },
          "inputs": {
            "host": { "connectionName": "shared_commondataserviceforapps", "operationId": "ListRecords" },
            "parameters": {
              "entityName": "afb_documents",
              "$select": "afb_documentid,afb_nomdufichier,afb_datedexpiration",
              "$expand": "afb_tiers($select=afb_nomdupartenaire,afb_emailcontactprincipal)",
              "$filter": "@concat('afb_datedexpiration eq ', outputs('Date_cible'), ' and afb_statutdevalidite eq 0')"
            }
          }
        }
      }
    },
    "List_docs_expires": {
      "type": "OpenApiConnection",
      "runAfter": { "Pour_chaque_fenetre": ["Succeeded"] },
      "inputs": {
        "host": { "connectionName": "shared_commondataserviceforapps", "operationId": "ListRecords" },
        "parameters": {
          "entityName": "afb_documents",
          "$select": "afb_documentid,afb_nomdufichier",
          "$expand": "afb_tiers($select=afb_nomdupartenaire,afb_emailcontactprincipal)",
          "$filter": "@concat('afb_datedexpiration lt ', formatDateTime(utcNow(),'yyyy-MM-dd'), ' and afb_statutdevalidite eq 0')"
        }
      }
    },
    "Marquer_expires": {
      "type": "Foreach",
      "runAfter": { "List_docs_expires": ["Succeeded"] },
      "foreach": "@outputs('List_docs_expires')?['body/value']",
      "actions": {
        "Update_statut_expire": {
          "type": "OpenApiConnection",
          "inputs": {
            "host": { "connectionName": "shared_commondataserviceforapps", "operationId": "UpdateRecord" },
            "parameters": {
              "entityName": "afb_documents",
              "recordId": "@items('Marquer_expires')?['afb_documentid']",
              "item/afb_statutdevalidite": 747010001
            }
          }
        }
      }
    }
  }
}
```
