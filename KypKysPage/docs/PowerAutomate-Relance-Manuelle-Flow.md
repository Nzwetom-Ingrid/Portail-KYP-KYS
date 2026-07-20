# Flux Power Automate — Relance manuelle de document

## Objectif

Quand un chargé de conformité clique sur **« Relancer »** (unitaire ou groupée) dans
la page *Calendrier des expirations* du back-office, l'application pose la date du jour
dans la colonne `afb_datederelancemanuelle` du document concerné.

Ce flux **détecte ce changement** et envoie **un e-mail de relance réel** au tiers
propriétaire du document, puis trace l'action.

> C'est le pendant « action manuelle » du flux **REFRESH** (qui, lui, envoie les
> relances automatiques J-7 / J-30 / J-60 sur échéance). Voir
> [PowerAutomate-Refresh-Flow.md](./PowerAutomate-Refresh-Flow.md).

---

## Prérequis — colonne à créer dans le Maker

Dans **make.powerapps.com → Tables → Document (`afb_document`) → Colonnes → + Nouvelle colonne** :

| Propriété            | Valeur                                   |
| -------------------- | ---------------------------------------- |
| Nom d'affichage      | Date de relance manuelle                 |
| Nom logique          | `afb_datederelancemanuelle`                |
| Type de données      | Date et heure                            |
| Format               | Date et heure                            |
| Comportement         | Fuseau utilisateur (User Local)          |
| Requis               | Optionnel                                |

Publier la table après création.

> Le code back-office écrit déjà cette colonne (cast localisé dans
> `CalendarExpirations.tsx → markRelance`). Tant que la colonne n'existe pas, le bouton
> renverra une erreur Dataverse visible dans la notification — c'est normal.

---

## Construction du flux (make.powerapps.com → Flux de cloud → + Flux automatisé)

### 1. Déclencheur — « Lorsqu'une ligne est ajoutée, modifiée ou supprimée »

| Champ                  | Valeur                                            |
| ---------------------- | ------------------------------------------------- |
| Type de modification   | **Modifiée**                                       |
| Nom de la table        | Documents (`afb_document`)                          |
| Étendue (Portée)       | Organisation                                       |
| Sélectionner des colonnes | `afb_datederelancemanuelle`                       |
| Filtrer les colonnes   | *(laisser vide)*                                   |

> « Sélectionner des colonnes » = `afb_datederelancemanuelle` garantit que le flux ne se
> déclenche **que** lorsque la date de relance change, pas à chaque modification du
> document.

### 2. Condition — la date de relance est bien renseignée

Ajouter une action **Condition** :

```
@empty(triggerOutputs()?['body/afb_datederelancemanuelle'])  est égal à  false
```

- Branche **Si oui** → suite ci-dessous.
- Branche **Si non** → ne rien faire (Terminer / succès).

### 3. (Si oui) Récupérer le tiers du document

Action **Dataverse → Récupérer une ligne par ID** :

| Champ            | Valeur                                                         |
| ---------------- | ------------------------------------------------------------- |
| Nom de la table  | Tiers (`afb_tiers`)                                            |
| ID de ligne      | `triggerOutputs()?['body/_afb_tiers_value']`                  |
| Sélectionner colonnes | `afb_nomdupartenaire,afb_emailcontactprincipal`           |

> Adapter `_afb_tiers_value` au vrai nom du lookup Document → Tiers de votre table
> (vérifier dans Colonnes du document si ce n'est pas `_afb_tiersexterne_value`).

### 4. (Si oui) Envoyer l'e-mail — « Envoyer un e-mail (V2) » (Office 365 Outlook)

| Champ        | Valeur                                                                        |
| ------------ | ----------------------------------------------------------------------------- |
| À            | `outputs('Récupérer_le_tiers')?['body/afb_emailcontactprincipal']`            |
| Objet        | `Afriland First Bank — Relance : document à mettre à jour`                     |
| Corps        | voir gabarit ci-dessous                                                         |

Gabarit du corps (HTML, vue Code) :

```html
<p>Bonjour,</p>
<p>
  Dans le cadre du suivi de votre dossier de conformité (KYP/KYS), nous vous
  invitons à mettre à jour le document suivant, dont l'échéance approche ou est
  dépassée :
</p>
<ul>
  <li><b>Type de document :</b> @{triggerOutputs()?['body/afb_typededocumentname']}</li>
  <li><b>Référence :</b> @{triggerOutputs()?['body/afb_referencedocument']}</li>
  <li><b>Date d'expiration :</b> @{formatDateTime(triggerOutputs()?['body/afb_datedexpiration'], 'dd/MM/yyyy')}</li>
</ul>
<p>
  Merci de déposer la version à jour depuis votre espace partenaire :
  <a href="https://VOTRE-PORTAIL.powerappsportals.com/documents">Accéder à mon espace</a>.
</p>
<p>Cordialement,<br/>Direction de la Conformité — Afriland First Bank</p>
```

> Remplacer `VOTRE-PORTAIL.powerappsportals.com` par l'URL réelle du portail.
> Adapter les noms de colonnes (`afb_typededocumentname`, `afb_referencedocument`,
> `afb_datedexpiration`) si vos logiques diffèrent.

### 5. (Si oui) Tracer la relance — Journal d'audit *(optionnel mais recommandé)*

Action **Dataverse → Ajouter une nouvelle ligne** sur `afb_journalaudit` (ou votre
table de traces) :

| Champ              | Valeur                                                      |
| ------------------ | ----------------------------------------------------------- |
| Action             | `Relance manuelle envoyée`                                  |
| Entité concernée   | `afb_document`                                              |
| ID enregistrement  | `triggerOutputs()?['body/afb_documentid']`                 |
| Détail             | `Relance manuelle envoyée à @{outputs('Récupérer_le_tiers')?['body/afb_emailcontactprincipal']}` |

---

## Test

1. Créer la colonne `afb_datederelancemanuelle`, publier.
2. Enregistrer + activer le flux.
3. Dans le back-office, page **Calendrier des expirations**, cliquer **Relancer** sur
   un document.
4. Vérifier : l'historique d'exécution du flux montre un run réussi, l'e-mail arrive
   à l'adresse du tiers, et une ligne d'audit est créée.

---

## Récapitulatif des actions côté Maker (à faire par l'admin)

- [ ] Créer la colonne `afb_datederelancemanuelle` (Date et heure) sur `afb_document`.
- [ ] Construire et activer ce flux.
- [ ] Vérifier le nom réel du lookup Document → Tiers.
- [ ] Renseigner l'URL réelle du portail dans le gabarit d'e-mail.
