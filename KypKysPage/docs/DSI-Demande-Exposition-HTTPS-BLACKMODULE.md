# Demande DSI — Exposition sécurisée (HTTPS) du service de screening BLACKMODULE

> ✅ **RÉSOLU (juillet 2026).** L'équipe BLACKMODULE a exposé le service en HTTPS via
> Nginx + Let's Encrypt sous `https://blackmodule.diaspora-onboarding.com`. Cette demande
> DSI n'est plus nécessaire — document conservé à titre de référence / traçabilité.
> URL d'intégration retenue : `https://blackmodule.diaspora-onboarding.com/api/matching/check-client`.


> **À l'attention de** : DSI — équipe système / réseau
> **De la part de** : équipe projet Portail KYP/KYS (DCONF + DEI)
> **Objet** : Créer un sous-domaine + activer HTTPS devant l'API de screening BLACKMODULE

---

## En 2 phrases (résumé pour décideur pressé)

Le portail KYP/KYS doit appeler automatiquement l'application interne **BLACKMODULE**
pour filtrer les tiers contre les listes de sanctions (obligation COBAC). Cet appel doit
se faire en **HTTPS** — je demande donc un **sous-domaine** `afrilandfirstbank.com` et
l'**activation du chiffrement TLS** devant un serveur **déjà exposé** aujourd'hui en HTTP
non sécurisé (ce qui, au passage, corrige une faille de sécurité existante).

---

## 1. À quoi ça sert

Le **Portail KYP/KYS** (Power Platform, porté par la DCONF) comporte un **Module 5 —
Screening automatique** qui doit vérifier chaque tiers, dirigeant et bénéficiaire effectif
(UBO) contre les listes **ONU / OFAC / UE + PPE**.

Ce screening est réalisé par **BLACKMODULE**, l'application développée en interne
(FastAPI + PostgreSQL, déjà déployée sur le serveur `80.65.211.49`, port `10000`).

Le portail (hébergé dans le **cloud Microsoft Power Platform**) appelle l'API de
BLACKMODULE via **Power Automate**. Pour que cet appel fonctionne et soit sécurisé, l'API
doit être joignable en **HTTPS** sous un nom de domaine de la banque.

```
Portail KYP/KYS (Power Automate, cloud Microsoft)
        │  appel API REST
        ▼
https://screening.afrilandfirstbank.com  ──▶  BLACKMODULE (serveur 80.65.211.49)
```

## 2. Pourquoi ce doit être en HTTPS (et pas l'actuel HTTP)

Aujourd'hui l'API répond en `http://80.65.211.49:10000` — **HTTP en clair**. C'est
problématique pour trois raisons :

1. **Sécurité des données.** La clé API et les données clients (noms, dates de naissance,
   nationalités) transiteraient **en clair sur Internet** — inacceptable pour des données
   bancaires. Le HTTPS chiffre ce flux.
2. **Blocage technique.** La politique **DLP de Power Platform** (et les bonnes pratiques
   Microsoft) **bloquent** les appels sortants vers des URL HTTP non chiffrées. Sans HTTPS,
   le flux ne partira tout simplement pas.
3. **Exigence réglementaire et interne.** Le Document de Conception du portail impose
   **TLS 1.2 minimum** (§ 6.2 Politique de sécurité) ; le screening sanctions est une
   obligation **COBAC R-2023/01, Art. 43-47 & 89-97**.

> **Point important à souligner à la DSI** : le serveur est **déjà exposé publiquement**
> en HTTP (port 10000 ouvert sur Internet). Ma demande ne crée **pas** une nouvelle
> exposition — elle **sécurise** une exposition qui existe déjà, et permet de la
> **restreindre** aux seules adresses de Microsoft (voir § 4).

## 3. Ce que je demande concrètement

Deux options — la DSI choisit selon sa politique de sécurité :

### Option A — Certificat fourni par la DSI (recommandé si la banque a une PKI)
1. **Enregistrement DNS type A** : `screening.afrilandfirstbank.com` → `80.65.211.49`
   *(le nom de sous-domaine est modifiable : `kyp-screening`, `sanctions`, etc.)*
2. **Certificat TLS** pour ce sous-domaine — soit un certificat dédié, soit le
   **wildcard `*.afrilandfirstbank.com`** s'il existe déjà. Nous l'installons côté serveur.
3. **Ouverture du port HTTPS entrant** (voir § 4) vers `80.65.211.49`.

### Option B — Certificat automatique Let's Encrypt (si pas de PKI interne)
1. Même enregistrement DNS type A que ci-dessus.
2. **Ouverture des ports 80 et 443 entrants** — le serveur génère et renouvelle le
   certificat tout seul (reverse-proxy Caddy). Aucun certificat à fournir par la DSI.

## 4. Sécurité de l'exposition (à rassurer la DSI)

- **Restriction par IP** : l'accès entrant peut être **limité aux plages d'adresses IP
  sortantes de Power Automate** (publiées officiellement par Microsoft) — le service n'est
  donc **pas** ouvert à tout Internet.
- **Authentification** : l'API exige déjà un header secret **`X-API-Key`** ; la clé est
  stockée côté serveur / dans une variable d'environnement sécurisée.
- **Port** : idéalement **443** ; si la politique réseau impose un port ≥ 10000, le HTTPS
  peut être servi sur un port ≥ 10000 (ex. `10443`) — à préciser par la DSI.
- **Pentest** : un test d'intrusion est prévu avant la mise en production (§ 6.2 conception).

## 5. Pourquoi c'est urgent

Sans cette exposition sécurisée, le **screening automatique du portail ne peut pas
fonctionner**, ce qui bloque :
- la conformité **COBAC** (screening obligatoire des tiers actifs — indicateur C3 : 100 %
  des tiers screenés, fraîcheur < 30 jours) ;
- l'avancement du projet KYP/KYS (le Module 5 est un livrable de phase MVP).

## 6. Résultat attendu

Une URL HTTPS fonctionnelle du type :
**`https://screening.afrilandfirstbank.com/api/matching/check-client`**

C'est la seule chose dont l'équipe projet a besoin pour brancher le screening.

---

## Tableau récapitulatif de la demande

| Élément demandé | Détail | Qui exécute |
|---|---|---|
| Enregistrement DNS (A) | `screening.afrilandfirstbank.com` → `80.65.211.49` | DSI réseau |
| Certificat TLS | dédié ou wildcard `*.afrilandfirstbank.com` (Option A) | DSI PKI *(ou auto Let's Encrypt, Option B)* |
| Ouverture port entrant | `443` (ou port ≥ 10000), restreint aux IP Power Automate | DSI réseau |
| Installation reverse-proxy | Caddy/nginx devant BLACKMODULE (port 10000) | Équipe BLACKMODULE (accès serveur) |

## Version courte (à copier dans un e-mail à la DSI)

> Bonjour,
> Dans le cadre du portail KYP/KYS (DCONF), nous devons exposer en **HTTPS** l'API de
> screening BLACKMODULE, hébergée sur le serveur `80.65.211.49` (actuellement en HTTP
> non sécurisé). Merci de :
> 1. créer un **DNS A** : `screening.afrilandfirstbank.com` → `80.65.211.49` ;
> 2. fournir un **certificat TLS** pour ce sous-domaine (ou le wildcard existant) ;
> 3. **ouvrir le port HTTPS entrant** (443 ou ≥ 10000), que nous restreindrons aux plages
>    IP de Power Automate.
> Objectif : sécuriser un service déjà exposé et permettre le screening sanctions
> obligatoire (COBAC R-2023/01). Nous restons disponibles pour toute précision technique.
