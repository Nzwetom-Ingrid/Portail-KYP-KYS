# Flow Power Automate — Screening d'un UBO (OpenSanctions)

> ⛔ **REMPLACÉ — ne plus utiliser en production.** Le moteur de screening retenu est
> désormais **BLACKMODULE** (application interne AFB). Voir
> [`PowerAutomate-Screening-BLACKMODULE-Flow.md`](./PowerAutomate-Screening-BLACKMODULE-Flow.md).
> Ce document est conservé à titre de référence historique (structure Dataverse identique).


> **Nom** : `AFB - KYP/KYS - Screening UBO`
> **Type** : Flow de cloud automatisé (Solution `afb_kyp_kys`)
> **Connecteurs** : Dataverse, **HTTP** (premium)
> **Module métier ciblé** : § 4.6 Module 5 — SCREENING AUTOMATIQUE (Doc de Conception V1.1)

À chaque création d'un bénéficiaire effectif (`afb_ubo`), ce flow interroge en temps
réel les listes de sanctions et de PPE via l'API **OpenSanctions** (OFAC, ONU, UE,
listes PEP), puis crée un enregistrement **`afb_resultatscreening`**. L'alerte apparaît
alors dans la page **Screening** du back-office, où l'analyste valide / rejette
(décisions branchées dans `src/pages/Screening.tsx`).

```
Création afb_ubo ──▶ Flow ──▶ API OpenSanctions ──▶ crée afb_resultatscreening
                                                          │
                            Page Screening (back-office) ◀┘  → analyste valide/rejette
```

---

## ⚠️ Prérequis & licence (à lire)

1. **Clé API OpenSanctions** : créez un compte sur `https://www.opensanctions.org/`
   → section API → générez une **clé API**. Niveau gratuit suffisant pour le **pilote**
   (faible volume).
2. **Licence pour la production** : les données OpenSanctions sont sous CC-BY, mais
   l'**usage commercial** (banque) peut nécessiter une **licence de données** ou
   l'auto-hébergement du moteur open-source **`yente`**. À valider par la Direction
   Juridique avant la généralisation. *(Alternative 100 % libre : interroger
   directement la liste OFAC SDN — domaine public — mais matching à construire soi-même.)*
3. **Connecteur HTTP** : action premium. Vérifiez que votre licence Power Automate
   l'autorise (sinon : custom connector ou Azure Function).
4. Stockez la clé API dans une **variable d'environnement** Dataverse
   (`afb_OpenSanctionsApiKey`), pas en dur dans le flow.

---

## Schéma d'orchestration

```
   ┌────────────────────────────────┐
   │ Création d'un afb_ubo          │  déclencheur Dataverse (Créer)
   └───────────────┬────────────────┘
                   ▼
   ┌────────────────────────────────┐
   │ 1) Schéma de l'entité          │  Personne (physique) / Société (morale)
   └───────────────┬────────────────┘
                   ▼
   ┌────────────────────────────────┐
   │ 2) HTTP POST OpenSanctions      │  /match/default — nom + nationalité
   │    (Scope : try / catch)        │
   └───────────────┬────────────────┘
                   ▼
   ┌────────────────────────────────┐
   │ 3) Calcul du résultat           │  score → Négatif / Match faible / Match positif
   └───────────────┬────────────────┘
                   ▼
   ┌────────────────────────────────┐
   │ 4) Create afb_resultatscreening │  lié au tiers parent de l'UBO
   └───────────────┬────────────────┘
                   ▼
   ┌────────────────────────────────┐
   │ 5) (si Match positif) e-mail    │  alerte immédiate au chargé de conformité
   │    d'alerte DCONF               │
   └────────────────────────────────┘
```

---

## Création pas à pas dans Power Automate

> `make.powerapps.com` → Solutions → `AFB KYP KYS SOL` → ➕ Nouveau → Automatisation →
> Flux de cloud → **Automatisé**.

### Déclencheur — `When a row is added` (Dataverse)

| Paramètre        | Valeur |
|------------------|--------|
| Change type      | **Créer** |
| Table name       | UBO (`afb_ubo`) |
| Scope            | Organization |

> À la création, le déclencheur renvoie : `afb_uboid`, `afb_nomouraisonsociale`,
> `afb_nationalite`, `afb_typedentite` (1 = physique, 0 = morale), `_afb_tiersparent_value`.

### Action 1 — `Compose` (varSchema)

L'API attend un **schéma** : `Person` (personne physique) ou `Company` (personne morale).

```
@{if(equals(triggerOutputs()?['body/afb_typedentite'], 1), 'Person', 'Company')}
```

### Action 2 — `Étendue` (Scope) « TryScreening » → action HTTP

Mettez l'action HTTP dans une **Étendue (Scope)** nommée `TryScreening` (pour gérer
l'échec API à l'étape 4).

**HTTP** :

| Champ | Valeur |
|---|---|
| Method | `POST` |
| URI | `https://api.opensanctions.org/match/default` |
| Headers | `Content-Type: application/json` ; `Authorization: ApiKey @{...env var clé...}` |
| Body | voir ci-dessous |

**Body** :
```json
{
  "queries": {
    "ubo": {
      "schema": "@{outputs('Compose_varSchema')}",
      "properties": {
        "name": ["@{triggerOutputs()?['body/afb_nomouraisonsociale']}"],
        "nationality": ["@{triggerOutputs()?['body/afb_nationalite']}"]
      }
    }
  }
}
```

> L'API renvoie `responses.ubo.results[]` triés par `score` (0 → 1) décroissant, chacun
> avec `score`, `match` (bool), `caption`, `datasets[]`, `properties.topics[]`
> (ex. `sanction`, `role.pep`).

### Action 3 — `Compose` du résultat (après le Scope, runAfter = Succeeded)

#### 3.a — `Compose` (varTop) : meilleur candidat
```
@{first(body('HTTP')?['responses']?['ubo']?['results'])}
```

#### 3.b — `Compose` (varScore) : score 0–100
```
@{if(empty(outputs('Compose_varTop')), 0, mul(coalesce(outputs('Compose_varTop')?['score'], 0), 100))}
```

#### 3.c — `Compose` (varResultat) : code du choix afb_resultatducontrole
```
@{if(less(outputs('Compose_varScore'), 50), 0,
     if(less(outputs('Compose_varScore'), 85), 1, 747010001))}
```
*(< 50 → Négatif `0` · 50–84 → Match faible `1` · ≥ 85 → Match positif `747010001`)*

#### 3.d — `Compose` (varListes) : sources / sujets du match
```
@{if(empty(outputs('Compose_varTop')), 'OpenSanctions (default)',
     concat(join(outputs('Compose_varTop')?['datasets'], ', '),
            ' | ', join(outputs('Compose_varTop')?['properties']?['topics'], ', ')))}
```

### Action 4 — `Add a new row` (afb_resultatscreening)

**Connecteur** : Microsoft Dataverse → **Add a new row**

| Champ | Valeur |
|---|---|
| Table name | RESULTAT SCREENING (`afb_resultatscreening`) |
| `afb_identifiantducontrole` | `@{concat('SCR-UBO-', formatDateTime(utcNow(),'yyyyMMddHHmmss'))}` |
| `afb_identifiantentite` | `@{triggerOutputs()?['body/afb_uboid']}` |
| `afb_naturedelentite` | `747010001` (UBO) |
| `afb_typedecontrole` | `0` (Initial) |
| `afb_resultatducontrole` | `@{outputs('Compose_varResultat')}` |
| `afb_scoredeconfiance` | `@{outputs('Compose_varScore')}` |
| `afb_listesinterrogees` | `@{outputs('Compose_varListes')}` |
| `afb_detaildumatch` | `@{if(empty(outputs('Compose_varTop')),'Aucun match',outputs('Compose_varTop')?['caption'])}` |
| `afb_datedexecution` | `@{utcNow()}` |
| **`afb_nomdutiers@odata.bind`** | `/afb_tierses(@{triggerOutputs()?['body/_afb_tiersparent_value']})` |

> Le résultat est rattaché au **tiers parent** de l'UBO → il remonte dans la vue 360°
> du tiers et dans la page Screening (filtre par tiers).

### Action 4-bis — Gestion de l'échec API (Erreur API)

Ajoutez une **2ᵉ action `Add a new row`** configurée **« exécuter après »** le Scope
`TryScreening` = **a échoué / a expiré**, identique à l'Action 4 mais :

| Champ | Valeur |
|---|---|
| `afb_resultatducontrole` | `2` (ErreurAPI) |
| `afb_scoredeconfiance` | `0` |
| `afb_listesinterrogees` | `OpenSanctions — indisponible` |
| `afb_detaildumatch` | `Échec de l'appel API — à rejouer` |

### Action 5 — (option) `Send an email (V2)` si Match positif

Condition : `outputs('Compose_varResultat')` est égal à `747010001` →
e-mail au chargé de conformité (boîte DCONF) avec nom de l'UBO, score, listes,
et lien vers la page Screening du back-office.

---

## Boucle fermée avec le back-office

1. Le flow crée `afb_resultatscreening` (Négatif / Match faible / Match positif).
2. La page **Screening** (`resultatsScreening.useList`) l'affiche — le `statut` est
   **dérivé du résultat** (Match positif → *Confirmé*, Match faible → *En revue*,
   Négatif → *Faux positif*).
3. L'analyste **valide** (faux positif → résultat passe à Négatif) ou **confirme**
   (Match positif + escalade RCSI) — mutations déjà branchées (`resultatsScreening.useUpdate`).

> **Screening du tiers et des dirigeants** : dupliquez ce flow sur `afb_tiers` (Créer)
> avec `afb_naturedelentite = 0` (Tiers), et sur les dirigeants si modélisés. Le
> **batch nocturne** (§ 4.6) = un flow planifié quotidien qui re-screene le portefeuille
> actif (même logique, déclencheur Récurrence + List rows).

---

## Annexe — Squelette JSON exportable

```json
{
  "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
  "contentVersion": "1.0.0.0",
  "triggers": {
    "When_an_UBO_is_added": {
      "type": "OpenApiConnectionWebhook",
      "inputs": {
        "host": { "connectionName": "shared_commondataserviceforapps", "operationId": "SubscribeWebhookTrigger" },
        "parameters": { "subscriptionRequest/message": 1, "subscriptionRequest/entityname": "afb_ubo", "subscriptionRequest/scope": 4 }
      }
    }
  },
  "actions": {
    "Compose_varSchema": {
      "type": "Compose",
      "inputs": "@if(equals(triggerOutputs()?['body/afb_typedentite'], 1), 'Person', 'Company')"
    },
    "TryScreening": {
      "type": "Scope",
      "runAfter": { "Compose_varSchema": ["Succeeded"] },
      "actions": {
        "HTTP": {
          "type": "Http",
          "inputs": {
            "method": "POST",
            "uri": "https://api.opensanctions.org/match/default",
            "headers": { "Content-Type": "application/json", "Authorization": "ApiKey @{...}" },
            "body": {
              "queries": {
                "ubo": {
                  "schema": "@{outputs('Compose_varSchema')}",
                  "properties": {
                    "name": ["@{triggerOutputs()?['body/afb_nomouraisonsociale']}"],
                    "nationality": ["@{triggerOutputs()?['body/afb_nationalite']}"]
                  }
                }
              }
            }
          }
        }
      }
    },
    "Compose_varTop": {
      "type": "Compose",
      "runAfter": { "TryScreening": ["Succeeded"] },
      "inputs": "@first(body('HTTP')?['responses']?['ubo']?['results'])"
    },
    "Compose_varScore": {
      "type": "Compose",
      "runAfter": { "Compose_varTop": ["Succeeded"] },
      "inputs": "@if(empty(outputs('Compose_varTop')), 0, mul(coalesce(outputs('Compose_varTop')?['score'], 0), 100))"
    },
    "Compose_varResultat": {
      "type": "Compose",
      "runAfter": { "Compose_varScore": ["Succeeded"] },
      "inputs": "@if(less(outputs('Compose_varScore'), 50), 0, if(less(outputs('Compose_varScore'), 85), 1, 747010001))"
    },
    "Create_resultat_screening": {
      "type": "OpenApiConnection",
      "runAfter": { "Compose_varResultat": ["Succeeded"] },
      "inputs": {
        "host": { "connectionName": "shared_commondataserviceforapps", "operationId": "CreateRecord" },
        "parameters": {
          "entityName": "afb_resultatscreenings",
          "item/afb_identifiantducontrole": "@concat('SCR-UBO-', formatDateTime(utcNow(),'yyyyMMddHHmmss'))",
          "item/afb_identifiantentite": "@triggerOutputs()?['body/afb_uboid']",
          "item/afb_naturedelentite": 747010001,
          "item/afb_typedecontrole": 0,
          "item/afb_resultatducontrole": "@outputs('Compose_varResultat')",
          "item/afb_scoredeconfiance": "@outputs('Compose_varScore')",
          "item/afb_listesinterrogees": "@if(empty(outputs('Compose_varTop')), 'OpenSanctions (default)', join(outputs('Compose_varTop')?['datasets'], ', '))",
          "item/afb_detaildumatch": "@if(empty(outputs('Compose_varTop')), 'Aucun match', outputs('Compose_varTop')?['caption'])",
          "item/afb_datedexecution": "@utcNow()",
          "item/afb_nomdutiers@odata.bind": "@concat('/afb_tierses(', triggerOutputs()?['body/_afb_tiersparent_value'], ')')"
        }
      }
    },
    "Create_resultat_erreur": {
      "type": "OpenApiConnection",
      "runAfter": { "TryScreening": ["Failed", "TimedOut"] },
      "inputs": {
        "host": { "connectionName": "shared_commondataserviceforapps", "operationId": "CreateRecord" },
        "parameters": {
          "entityName": "afb_resultatscreenings",
          "item/afb_identifiantducontrole": "@concat('SCR-UBO-ERR-', formatDateTime(utcNow(),'yyyyMMddHHmmss'))",
          "item/afb_identifiantentite": "@triggerOutputs()?['body/afb_uboid']",
          "item/afb_naturedelentite": 747010001,
          "item/afb_typedecontrole": 0,
          "item/afb_resultatducontrole": 2,
          "item/afb_scoredeconfiance": 0,
          "item/afb_listesinterrogees": "OpenSanctions — indisponible",
          "item/afb_detaildumatch": "Échec de l'appel API — à rejouer",
          "item/afb_datedexecution": "@utcNow()",
          "item/afb_nomdutiers@odata.bind": "@concat('/afb_tierses(', triggerOutputs()?['body/_afb_tiersparent_value'], ')')"
        }
      }
    }
  }
}
```

> ⚠️ Remplacer `ApiKey @{...}` par votre vraie clé (idéalement via la variable
> d'environnement `afb_OpenSanctionsApiKey`).
