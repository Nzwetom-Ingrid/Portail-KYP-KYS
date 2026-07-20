# Flow Power Automate — Invitation d'un nouveau tiers

> **Nom** : `AFB - KYP/KYS - Invitation Tiers`
> **Type** : Flow de cloud automatisé (Solution `afb_kyp_kys`)
> **Connecteurs** : Dataverse, Office 365 Outlook
> **Module métier ciblé** : § 4.2 Module 1 — REF & ONBOARDING (Doc de Conception V1.1)

Ce flow automatise les étapes 1 → 3 du workflow d'entrée en relation :

1. Le chargé de relation crée la fiche `afb_tiers` côté Power App `afb_kyp_kys`.
2. **Ce flow** détecte la création → crée le `contact` Power Pages, l'associe
   à la fiche, génère une invitation et envoie l'e-mail avec lien sécurisé.
3. Le tiers redeem l'invitation → est authentifié sur le portail React
   et résolu automatiquement par `getCurrentTiers()` côté code site.

---

## ⚠️ ADDENDUM (mise à jour schéma réel) — à lire avant d'implémenter

> Le corps détaillé plus bas a été écrit AVANT le réalignement du portail sur le
> vrai schéma Dataverse (modèles générés `src/generated`). Deux corrections sont
> **obligatoires** pour que la communication portail ↔ Power App fonctionne.

**1. Noms de colonnes `afb_tiers` réels** (le déclencheur et les expressions doivent les utiliser) :

| Ancien (doc ci-dessous) | Réel (à utiliser) |
|-------------------------|-------------------|
| `afb_nom`               | `afb_nomdupartenaire` |
| `afb_email`             | `afb_emailcontactprincipal` |
| `afb_rep_email`         | *(pas de champ représentant ; utiliser l'e-mail du contact principal)* |
| `afb_statut` (texte)    | `afb_statutdutiers` (choix : 0 Partenaireactif, 1 Cible…) |

**2. Étape CRITIQUE manquante — créer le lien d'identité `afb_tiersexterneb2c`.**

Le portail (`getCurrentTiers`) ne résout PAS le tiers via un lookup `contact.afb_Tiers`,
mais via la table **`afb_tiersexterneb2c`** (`afb_emaildauthentification` → lookup
`afb_nomdutiers`). **Sans cette ligne, le partenaire connecté n'est rattaché à aucun
tiers et le portail reste vide.** Ajouter cette action après la création de la fiche :

**Action — `Add a new row` (afb_tiersexterneb2c)** :

| Champ | Valeur |
|-------|--------|
| Table name | Tiers Externe B2C (`afb_tiersexterneb2c`) |
| `afb_emaildauthentification` | e-mail d'invitation du partenaire (= login B2C) |
| `afb_identifiantb2c` | `@{variables('varInvitationCode')}` (ou l'OID B2C une fois connu) |
| `afb_typedorganisation` | `0` Banque corresp. / `1` EMF / `2` Fournisseur (selon le tiers) |
| `afb_statutducompte` | `0` (Actif) |
| `afb_datedinvitation` | `@{utcNow()}` |
| `afb_datedecreation` | `@{utcNow()}` |
| `afb_nombredetentativesechouees` | `0` |
| **`afb_nomdutiers@odata.bind`** | `afb_tierses(@{triggerOutputs()?['body/afb_tiersid']})` |

> Le `afb_typedorganisation` détermine côté portail si le tiers est « KYS » (Fournisseur)
> ou « KYP » (autres) — cf. `mapTiers` dans `portal.js`.

> **Voie sécurisée recommandée** : créer aussi le lookup `contact.afb_Tiers` et le
> renseigner ici (`item/afb_Tiers@odata.bind = afb_tierses(<id du tiers>)`). Le portail
> le lit en PRIORITÉ (lecture de SA seule fiche, sans lecture globale), et la ligne
> `afb_tiersexterneb2c` devient un simple repli. Procédure :
> `docs/GUIDE-Deploiement-Flux-et-Securite.md` § 5.

---

## Schéma d'orchestration

```
   ┌──────────────────────────┐
   │ Création d'un afb_tiers  │   (déclencheur Dataverse)
   └────────────┬─────────────┘
                ▼
   ┌──────────────────────────┐
   │ 1) Créer le contact      │   firstname/lastname/email du représentant
   └────────────┬─────────────┘
                ▼
   ┌──────────────────────────┐
   │ 2) Lier contact.afb_Tiers│   PATCH /contacts(<id>) Associate
   │    → afb_tiers           │
   └────────────┬─────────────┘
                ▼
   ┌──────────────────────────┐
   │ 3) Assigner Web Role     │   Add Relationship vers
   │    « Tiers externe »     │   adx_contact_webrole
   └────────────┬─────────────┘
                ▼
   ┌──────────────────────────┐
   │ 4) Créer adx_invitation  │   code généré + lien 72h
   └────────────┬─────────────┘
                ▼
   ┌──────────────────────────┐
   │ 5) Envoyer e-mail HTML   │   lien de redemption
   └──────────────────────────┘
```

---

## Création pas à pas dans Power Automate

> Ouvrir `make.powerapps.com` → environnement **AFB-KYP-KYS-DEV** →
> Solutions → `AFB KYP KYS SOL` → ➕ Nouveau → Automatisation → Flow de cloud → **Automatisé**.

### Déclencheur

**When a row is added, modified or deleted (Microsoft Dataverse)**

| Paramètre              | Valeur                          |
|------------------------|---------------------------------|
| Change type            | Added                           |
| Table name             | TIERS (`afb_tiers`)             |
| Scope                  | Organization                    |
| Select columns         | `afb_nom,afb_email,afb_rep_nom,afb_rep_email,afb_type` |
| Filter rows (OData)    | `statecode eq 0`                |

> Pourquoi un filtre : éviter de re-déclencher sur les imports/migrations.

### Action 1 — `Initialize variable` (varInvitationCode)

| Champ | Valeur |
|-------|--------|
| Name  | `varInvitationCode` |
| Type  | String |
| Value | `@{guid()}` |

### Action 2 — `Add a new row` (créer le contact)

**Connecteur** : Microsoft Dataverse → **Add a new row**

| Champ                  | Valeur |
|------------------------|--------|
| Table name             | Contacts |
| First Name             | `@{triggerOutputs()?['body/afb_rep_prenom']}` (sinon premier mot de `afb_rep_nom`) |
| Last Name              | `@{triggerOutputs()?['body/afb_rep_nom']}` |
| Email                  | `@{triggerOutputs()?['body/afb_rep_email']}` |
| Company Name           | `@{triggerOutputs()?['body/afb_nom']}` |
| **Tiers (afb_Tiers)**  | `afb_tierses(@{triggerOutputs()?['body/afb_tiersid']})` |

> Le champ `afb_Tiers` est le **lookup** à ajouter sur la table contact
> (cf. POWERPAGES_SETUP.md §4). Si vous le créez avec un autre nom logique,
> ajuster ici.

### Action 3 — `Relate rows` (assigner le Web Role)

**Connecteur** : Microsoft Dataverse → **Relate rows**

| Champ                | Valeur |
|----------------------|--------|
| Table name           | Contacts |
| Row ID               | `@{outputs('Add_a_new_row')?['body/contactid']}` |
| Relationship         | `adx_webrole_contact` |
| Related Table        | Web Roles (`adx_webroles`) |
| Relate With          | `adx_webroles(4afb0001-0001-4001-8001-000000000001)` |

> Le GUID `4afb0001-…` est celui du Web Role
> `Tiers externe (KYP/KYS)` défini dans
> `.powerpages-site/web-roles/Tiers-externe-KYP-KYS.webrole.yml`.

### Action 4 — `Add a new row` (créer l'invitation)

**Connecteur** : Microsoft Dataverse → **Add a new row**

| Champ                       | Valeur |
|-----------------------------|--------|
| Table name                  | Invitations (`adx_invitations`) |
| Invitation Code             | `@{variables('varInvitationCode')}` |
| Name                        | `Invitation @{triggerOutputs()?['body/afb_nom']}` |
| Type                        | `1` (Single — un usage) |
| Invitation Expiry Date      | `@{addDays(utcNow(), 3)}` |
| Invitor                     | `systemusers(@{workflow()['run']['userid']})` |
| Invite Contact (intersect)  | À configurer via l'action **Relate rows** suivante |

### Action 5 — `Relate rows` (rattacher l'invitation au contact)

| Champ        | Valeur |
|--------------|--------|
| Table name   | Invitations |
| Row ID       | `@{outputs('Add_invitation')?['body/adx_invitationid']}` |
| Relationship | `adx_invitation_invitecontacts` |
| Related Table| Contacts |
| Relate With  | `contacts(@{outputs('Add_a_new_row')?['body/contactid']})` |

### Action 6 — `Send an email (V2)` (Office 365 Outlook)

| Champ | Valeur |
|-------|--------|
| To    | `@{triggerOutputs()?['body/afb_rep_email']}` |
| Subject | `Bienvenue sur le portail KYP/KYS d'Afriland First Bank` |
| Body (HTML) | voir bloc ci-dessous |
| From (Send as) | `noreply.kypkys@afrilandfirstbank.com` (boîte partagée) |

#### Corps de l'e-mail (HTML)

```html
<table width="100%" cellpadding="0" cellspacing="0" style="font-family:'Segoe UI',sans-serif;background:#f4f5f7;padding:24px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.06);">
      <tr><td style="background:linear-gradient(115deg,#16181c,#7c0c1b,#c8102e);padding:24px;color:#fff;">
        <strong style="font-size:18px;">Afriland First Bank — Portail KYP/KYS</strong>
      </td></tr>
      <tr><td style="padding:28px;color:#181a1e;font-size:14px;line-height:1.55;">
        <h2 style="margin:0 0 12px;font-family:'Sora',sans-serif;color:#181a1e;">Bonjour @{triggerOutputs()?['body/afb_rep_nom']},</h2>
        <p>La <strong>Direction de la Conformité</strong> d'Afriland First Bank vous invite à compléter le dossier KYP/KYS de
        <strong>@{triggerOutputs()?['body/afb_nom']}</strong> via notre portail sécurisé.</p>
        <p style="text-align:center;margin:28px 0;">
          <a href="https://afb-kyp-kys-dev.powerappsportals.com/Account/Login/Redeem?invitation=@{variables('varInvitationCode')}"
             style="display:inline-block;background:#c8102e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:600;">
            Accéder à mon espace
          </a>
        </p>
        <p style="color:#525660;font-size:12.5px;">Ce lien d'invitation est valable <strong>72 heures</strong>. Au-delà, contactez votre interlocuteur AFB pour obtenir une nouvelle invitation.</p>
      </td></tr>
      <tr><td style="background:#f7f8fa;padding:18px;color:#8b9099;font-size:11.5px;text-align:center;">
        © Afriland First Bank — Direction de la Conformité (DCONF)
      </td></tr>
    </table>
  </td></tr>
</table>
```

> ⚠️ Remplacer l'URL du portail (`afb-kyp-kys-dev.powerappsportals.com`)
> par celle de votre environnement.

### Action 7 — `Update a row` (tracer l'invitation côté tiers)

**Connecteur** : Microsoft Dataverse → **Update a row**

| Champ            | Valeur |
|------------------|--------|
| Table name       | TIERS  |
| Row ID           | `@{triggerOutputs()?['body/afb_tiersid']}` |
| `afb_date_invitation` | `@{utcNow()}` |
| `afb_statut`     | `EnAttenteRedemption` |

(Ajouter ces deux colonnes sur `afb_tiers` si elles n'existent pas.)

---

## Tests à exécuter après publication

1. **Création manuelle d'un afb_tiers** dans la Power App `afb_kyp_kys`
   avec un `afb_rep_email` que vous consultez.
2. Vérifier dans **Run history** du flow que les 7 actions sont vertes.
3. Vérifier dans Dataverse :
   - un `contact` créé, lookup `afb_Tiers` renseigné ;
   - le contact apparaît dans le Web Role « Tiers externe (KYP/KYS) » ;
   - une `adx_invitation` créée, expirant à J+3.
4. Ouvrir l'e-mail reçu → cliquer sur **Accéder à mon espace** → atterrir
   sur le portail React, authentifié, avec ses données visibles.
5. Dans la console du navigateur :
   ```js
   await fetch('/_api/contacts?$select=fullname,_afb_tiers_value&$top=1', { credentials:'include' }).then(r=>r.json())
   ```
   doit retourner le contact courant avec `_afb_tiers_value` peuplé.

---

## Annexe — Squelette JSON exportable

Le bloc suivant est un squelette JSON minimal compatible avec
l'export `definition.json` d'un flow Power Automate. Importez-le dans
votre solution via l'interface (Solutions → Importer une solution),
puis re-configurez les connexions.

```json
{
  "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
  "contentVersion": "1.0.0.0",
  "triggers": {
    "When_a_row_is_added": {
      "type": "OpenApiConnectionWebhook",
      "inputs": {
        "host": { "connectionName": "shared_commondataserviceforapps", "operationId": "SubscribeWebhookTrigger" },
        "parameters": {
          "subscriptionRequest/message": 1,
          "subscriptionRequest/entityname": "afb_tiers",
          "subscriptionRequest/scope": 4,
          "subscriptionRequest/filteringattributes": "afb_nom,afb_rep_email,afb_type"
        }
      }
    }
  },
  "actions": {
    "Init_invitation_code": {
      "type": "InitializeVariable",
      "inputs": { "variables": [{ "name": "varInvitationCode", "type": "string", "value": "@{guid()}" }] }
    },
    "Create_contact": {
      "type": "OpenApiConnection",
      "runAfter": { "Init_invitation_code": ["Succeeded"] },
      "inputs": {
        "host": { "connectionName": "shared_commondataserviceforapps", "operationId": "CreateRecord" },
        "parameters": {
          "entityName": "contacts",
          "item/firstname": "@triggerOutputs()?['body/afb_rep_prenom']",
          "item/lastname":  "@triggerOutputs()?['body/afb_rep_nom']",
          "item/emailaddress1": "@triggerOutputs()?['body/afb_rep_email']",
          "item/afb_Tiers@odata.bind": "@concat('afb_tierses(', triggerOutputs()?['body/afb_tiersid'], ')')"
        }
      }
    },
    "Assign_web_role": {
      "type": "OpenApiConnection",
      "runAfter": { "Create_contact": ["Succeeded"] },
      "inputs": {
        "host": { "connectionName": "shared_commondataserviceforapps", "operationId": "AssociateEntities" },
        "parameters": {
          "entityName": "contacts",
          "recordId": "@outputs('Create_contact')?['body/contactid']",
          "associationName": "adx_webrole_contact",
          "relateEntityName": "adx_webroles",
          "item/@odata.id": "adx_webroles(4afb0001-0001-4001-8001-000000000001)"
        }
      }
    },
    "Create_invitation": {
      "type": "OpenApiConnection",
      "runAfter": { "Assign_web_role": ["Succeeded"] },
      "inputs": {
        "host": { "connectionName": "shared_commondataserviceforapps", "operationId": "CreateRecord" },
        "parameters": {
          "entityName": "adx_invitations",
          "item/adx_invitationcode": "@variables('varInvitationCode')",
          "item/adx_name": "@concat('Invitation ', triggerOutputs()?['body/afb_nom'])",
          "item/adx_type": 1,
          "item/adx_expirydate": "@addDays(utcNow(), 3)"
        }
      }
    },
    "Relate_invitation_to_contact": {
      "type": "OpenApiConnection",
      "runAfter": { "Create_invitation": ["Succeeded"] },
      "inputs": {
        "host": { "connectionName": "shared_commondataserviceforapps", "operationId": "AssociateEntities" },
        "parameters": {
          "entityName": "adx_invitations",
          "recordId": "@outputs('Create_invitation')?['body/adx_invitationid']",
          "associationName": "adx_invitation_invitecontacts",
          "relateEntityName": "contacts",
          "item/@odata.id": "@concat('contacts(', outputs('Create_contact')?['body/contactid'], ')')"
        }
      }
    },
    "Send_invitation_email": {
      "type": "OpenApiConnection",
      "runAfter": { "Relate_invitation_to_contact": ["Succeeded"] },
      "inputs": {
        "host": { "connectionName": "shared_office365", "operationId": "SendEmailV2" },
        "parameters": {
          "emailMessage/To": "@triggerOutputs()?['body/afb_rep_email']",
          "emailMessage/Subject": "Bienvenue sur le portail KYP/KYS d'Afriland First Bank",
          "emailMessage/Body": "<!-- corps HTML — voir spec ci-dessus -->",
          "emailMessage/Importance": "Normal"
        }
      }
    },
    "Update_tiers_status": {
      "type": "OpenApiConnection",
      "runAfter": { "Send_invitation_email": ["Succeeded"] },
      "inputs": {
        "host": { "connectionName": "shared_commondataserviceforapps", "operationId": "UpdateRecord" },
        "parameters": {
          "entityName": "afb_tierses",
          "recordId": "@triggerOutputs()?['body/afb_tiersid']",
          "item/afb_statut": "EnAttenteRedemption",
          "item/afb_date_invitation": "@utcNow()"
        }
      }
    }
  }
}
```
