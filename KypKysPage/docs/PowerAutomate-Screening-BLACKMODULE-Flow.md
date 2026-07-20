# Flow Power Automate — Screening via BLACKMODULE (moteur interne AFB)

> **Nom** : `AFB - KYP/KYS - Screening BLACKMODULE`
> **Type** : Flow de cloud automatisé (Solution `afb_kyp_kys`)
> **Connecteurs** : Dataverse, **HTTP** (premium)
> **Module métier ciblé** : § 4.6 Module 5 — SCREENING AUTOMATIQUE (Doc de Conception V1.1)
> **Remplace** : `PowerAutomate-Screening-UBO-Flow.md` (moteur OpenSanctions)

BLACKMODULE est l'application de filtrage sanctions/PPE développée en interne
(FastAPI + PostgreSQL, dockerisée). Elle joue le rôle du « service externe de
screening — équivalent CEMAC » prévu au § 4.6.3 de la conception. Ce flow interroge
son API REST au lieu d'OpenSanctions, puis crée un enregistrement
**`afb_resultatscreening`** — **strictement identique** au flow existant côté Dataverse.

```
Création afb_ubo ──▶ Flow ──▶ API BLACKMODULE ──▶ crée afb_resultatscreening
                                                        │
                          Page Screening (back-office) ◀┘  → analyste valide/rejette
```

> ⚠️ **Migration depuis OpenSanctions** : seuls l'**action HTTP** et le **parsing de la
> réponse** changent. Le déclencheur, l'écriture Dataverse, la gestion d'erreur, la page
> back-office et les mappers (`screeningMappers.ts`) restent inchangés.

---

## ⚠️ Prérequis & sécurité (à lire)

1. **HTTPS — ✅ fait (juillet 2026).** Le service est exposé en HTTPS via
   **Nginx + Let's Encrypt** sous `https://blackmodule.diaspora-onboarding.com`. L'ancienne
   URL `http://80.65.211.49:10000/...` **ne doit plus être utilisée** (port 10000 = interne
   127.0.0.1 ; accès officiel via Nginx en 443).
2. **Clé API côté serveur.** Stocker la clé dans une **variable d'environnement Dataverse**
   `afb_BlackmoduleApiKey` (ou Azure Key Vault) — jamais en dur, jamais côté Power Pages.
   C'est exactement la note sécurité du Guide API BLACKMODULE.
3. **Renouvellement SSL** (côté équipe BLACKMODULE) : automatiser via
   `certbot-dns-cloudflare` et tester `certbot renew --dry-run` — sinon l'appel cassera à
   l'expiration du certificat (point de vigilance du rapport BLACKMODULE).
4. **Connecteur HTTP** : action premium — vérifier la licence Power Automate.
5. **Gouvernance.** BLACKMODULE est un prototype V1 « démonstration interne ». Son usage
   comme moteur de conformité opposable doit être validé par DCONF + RSSI en phase 1
   (§ 9.1 conception — choix du prestataire de screening).

---

## Contrat d'API BLACKMODULE

**Endpoint** : `POST https://blackmodule.diaspora-onboarding.com/api/matching/check-client`
**Headers** : `Content-Type: application/json` · `X-API-Key: <clé>`

**Corps (requête)** :
```json
{
  "client_reference": "UBO-<guid>",
  "nom": "SHILKIN",
  "prenom": "GRIGORY VLADIMIROVICH",
  "nom_complet": "GRIGORY VLADIMIROVICH SHILKIN",
  "date_naissance": "1976-10-20",
  "nationalite": "RU",
  "pays": "RU"
}
```
> Seuls `client_reference`, `nom`, `nom_complet` sont obligatoires. `prenom`,
> `date_naissance`, `nationalite`, `pays` affinent le matching.

**Réponse** :
```json
{
  "client_reference": "UBO-<guid>",
  "client_name": "GRIGORY VLADIMIROVICH SHILKIN",
  "status": "ALERTE_EXACTE",
  "highest_score": 100.0,
  "action": "BLOQUER_OPERATION",
  "matches": [ { "source": "OFAC", "name": "...", "score": 100 } ]
}
```
> `highest_score` est **déjà sur 100** (pas de ×100, contrairement à OpenSanctions).
> `status` ∈ { AUCUNE_ALERTE, ALERTE_POSSIBLE, ALERTE_PROBABLE, ALERTE_EXACTE }.
> `action` ∈ { AUTORISER_OPERATION, SURVEILLANCE_RENFORCEE, REVUE_CONFORMITE, BLOQUER_OPERATION }.

---

## Mapping des champs

### Dataverse (déclencheur `afb_ubo`) → requête BLACKMODULE

| Champ BLACKMODULE | Source Dataverse |
|---|---|
| `client_reference` | `@concat('UBO-', triggerOutputs()?['body/afb_uboid'])` |
| `nom` | `afb_nomouraisonsociale` |
| `nom_complet` | `afb_nomouraisonsociale` |
| `prenom` | `null` (le nom complet porte déjà le matching) |
| `date_naissance` | `afb_datedenaissance` *(personne physique — champ confirmé)* |
| `nationalite` | `afb_nationalite` |
| `pays` | `afb_paysderesidencefiscale` *(à défaut : `afb_nationalite`)* |

### Réponse BLACKMODULE → `afb_resultatscreening`

| Colonne Dataverse | Valeur |
|---|---|
| `afb_scoredeconfiance` | `highest_score` **tel quel** (déjà 0–100) |
| `afb_resultatducontrole` | dérivé de `status` (voir table ci-dessous) |
| `afb_listesinterrogees` | `join(matches[].source, ', ')` |
| `afb_detaildumatch` | `concat(action, ' | ', client_name)` |

### Table de décision `status` → `afb_resultatducontrole`

| BLACKMODULE `status` | Code | Libellé Dataverse | Statut back-office |
|---|---|---|---|
| `AUCUNE_ALERTE` | `0` | Négatif | Faux positif / propre |
| `ALERTE_POSSIBLE` | `1` | Match faible | En revue |
| `ALERTE_PROBABLE` | `747010001` | Match positif | Confirmé |
| `ALERTE_EXACTE` | `747010001` | Match positif | Confirmé |
| *(échec API)* | `2` | ErreurAPI | Nouveau |

> Alternative provider-agnostique : garder les seuils de score du flow existant
> (< 50 → 0 · 50–84 → 1 · ≥ 85 → 747010001), en **retirant simplement le ×100**.

---

## Actions du flow (deltas vs flow OpenSanctions)

### Déclencheur — inchangé
`When a row is added` · Table `afb_ubo` · Scope Organization.
Renvoie `afb_uboid`, `afb_nomouraisonsociale`, `afb_datedenaissance`, `afb_nationalite`,
`afb_paysderesidencefiscale`, `afb_typedentite` (**1 = physique, 0 = morale**),
`_afb_tiersparent_value`.

### Action HTTP — **remplacée**

| Champ | Valeur |
|---|---|
| Method | `POST` |
| URI | `https://blackmodule.diaspora-onboarding.com/api/matching/check-client` |
| Headers | `Content-Type: application/json` · `X-API-Key: @{parameters('afb_BlackmoduleApiKey (afb_BlackmoduleApiKey)')}` |
| Body | JSON plat (cf. mapping ci-dessus) |

À placer dans une **Étendue (Scope) `TryScreening`** pour capter l'échec API.

### Compose du résultat — **simplifié**

- `varScore` = `@body('HTTP')?['highest_score']` *(plus de ×100)*
- `varStatus` = `@body('HTTP')?['status']`
- `varResultat` :
```
@{if(equals(outputs('Compose_varStatus'),'AUCUNE_ALERTE'), 0,
   if(equals(outputs('Compose_varStatus'),'ALERTE_POSSIBLE'), 1, 747010001))}
```
- `varListes` = `@{join(body('HTTP')?['matches'], ', ')}` *(ou map sur `.source`)*
- `varDetail` = `@{concat(body('HTTP')?['action'], ' | ', body('HTTP')?['client_name'])}`

### Create `afb_resultatscreening` — **quasi inchangé**

Identique au flow OpenSanctions, avec :

| Colonne | Valeur |
|---|---|
| `afb_identifiantducontrole` | `@concat('SCR-UBO-', formatDateTime(utcNow(),'yyyyMMddHHmmss'))` |
| `afb_identifiantentite` | `@triggerOutputs()?['body/afb_uboid']` |
| `afb_naturedelentite` | `747010001` (UBO) |
| `afb_typedecontrole` | `0` (Initial) |
| `afb_resultatducontrole` | `@outputs('Compose_varResultat')` |
| `afb_scoredeconfiance` | `@outputs('Compose_varScore')` |
| `afb_listesinterrogees` | `@outputs('Compose_varListes')` |
| `afb_detaildumatch` | `@outputs('Compose_varDetail')` |
| `afb_datedexecution` | `@utcNow()` |
| `afb_nomdutiers@odata.bind` | `/afb_tierses(@{triggerOutputs()?['body/_afb_tiersparent_value']})` |

### (option) Update `afb_ubo` — pointeur dernier screening
Après le Create, un `Update a row` sur `afb_ubo` peut renseigner
`afb_dernierresultatdescreening@odata.bind` = `/afb_resultatscreenings(<id créé>)`,
et basculer `afb_statutppe` à `747010001` (Détectée par screening) si Match positif.

### Gestion d'erreur — inchangée
2ᵉ `Add a new row`, « exécuter après » le Scope = **a échoué / expiré**,
`afb_resultatducontrole = 2`, `afb_listesinterrogees = 'BLACKMODULE — indisponible'`.

### Alerte DCONF — inchangée
`Send an email (V2)` si `varResultat = 747010001` (nom UBO, score, `action`, lien page Screening).

---

## Screening du tiers, des dirigeants et batch nocturne

- **Tiers** : dupliquer le flow sur `afb_tiers` (Créer), `afb_naturedelentite = 0`.
- **Dirigeants** : idem avec `afb_naturedelentite = 1` si modélisés.
- **Batch nocturne** (§ 4.6) : flow planifié (Récurrence quotidienne) + `List rows` du
  portefeuille actif → boucle → même appel BLACKMODULE → `afb_typedecontrole = 1`
  (Batchnocturne). Attention volume (§ 10.1 recette — perfs listes volumineuses).

---

## Ce qui reste strictement identique (aucune modif)

- Entité `afb_resultatscreening` et toutes ses colonnes.
- `src/lib/dataverse/screeningMappers.ts` — la table `RESULT_TO_STATUT` marche telle quelle.
- Page back-office `src/pages/Screening.tsx` (validation / rejet analyste).
- La boucle fermée : Match positif → *Confirmé* + escalade RCSI ; faux positif → *Négatif*.

---

## Annexe — Squelette JSON complet (importable / référence)

> Définition de flux prête à servir de référence. `afb_BlackmoduleApiKey` doit exister
> comme variable d'environnement Dataverse (la clé n'est **jamais** en dur). Remplacer le
> `connectionName` par celui de votre connexion Dataverse si l'import le demande.

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
    "TryScreening": {
      "type": "Scope",
      "actions": {
        "HTTP": {
          "type": "Http",
          "inputs": {
            "method": "POST",
            "uri": "https://blackmodule.diaspora-onboarding.com/api/matching/check-client",
            "headers": {
              "Content-Type": "application/json",
              "X-API-Key": "@parameters('afb_BlackmoduleApiKey (afb_BlackmoduleApiKey)')"
            },
            "body": {
              "client_reference": "@concat('UBO-', triggerOutputs()?['body/afb_uboid'])",
              "nom": "@triggerOutputs()?['body/afb_nomouraisonsociale']",
              "nom_complet": "@triggerOutputs()?['body/afb_nomouraisonsociale']",
              "date_naissance": "@if(empty(triggerOutputs()?['body/afb_datedenaissance']), null, formatDateTime(triggerOutputs()?['body/afb_datedenaissance'], 'yyyy-MM-dd'))",
              "nationalite": "@triggerOutputs()?['body/afb_nationalite']",
              "pays": "@triggerOutputs()?['body/afb_paysderesidencefiscale']"
            }
          }
        }
      }
    },
    "Compose_varStatus": {
      "type": "Compose",
      "runAfter": { "TryScreening": ["Succeeded"] },
      "inputs": "@body('HTTP')?['status']"
    },
    "Compose_varScore": {
      "type": "Compose",
      "runAfter": { "Compose_varStatus": ["Succeeded"] },
      "inputs": "@coalesce(body('HTTP')?['highest_score'], 0)"
    },
    "Compose_varResultat": {
      "type": "Compose",
      "runAfter": { "Compose_varScore": ["Succeeded"] },
      "inputs": "@if(equals(outputs('Compose_varStatus'),'AUCUNE_ALERTE'), 0, if(equals(outputs('Compose_varStatus'),'ALERTE_POSSIBLE'), 1, 747010001))"
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
          "item/afb_listesinterrogees": "OFAC, ONU, UE, FR_GEL, UKSL, AFB_PPE",
          "item/afb_detaildumatch": "@concat(coalesce(body('HTTP')?['action'],''), ' | ', coalesce(body('HTTP')?['client_name'],''))",
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
          "item/afb_listesinterrogees": "BLACKMODULE — indisponible",
          "item/afb_detaildumatch": "Échec de l'appel API — à rejouer",
          "item/afb_datedexecution": "@utcNow()",
          "item/afb_nomdutiers@odata.bind": "@concat('/afb_tierses(', triggerOutputs()?['body/_afb_tiersparent_value'], ')')"
        }
      }
    }
  }
}
```

> **Note score** : `highest_score` peut être un décimal (ex. `100.0`). Si la colonne
> `afb_scoredeconfiance` est de type *nombre entier*, envelopper : `@int(coalesce(body('HTTP')?['highest_score'], 0))`.
