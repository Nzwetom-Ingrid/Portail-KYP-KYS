# Demande à l'administrateur Azure — Débloquer l'accès IP au portail KYP/KYS

## Contexte

Le portail partenaire **KYP/KYS** (Power Pages) utilise Azure AD B2C pour la connexion
des tiers externes. L'authentification fonctionne **de bout en bout**, sauf une dernière
étape : à la connexion, B2C renvoie l'erreur :

> **Requests from this IP are not allowed.**
> (endpoint : `login.microsoftonline.com/extservice/cpim`)

C'est une **restriction de sécurité au niveau du tenant** (Accès conditionnel ou
restriction IP dans la custom policy). Comme c'est un **portail externe**, les
partenaires se connectent depuis Internet, depuis **n'importe quelle IP** → cette
restriction bloquerait **tous les tiers**, pas seulement le poste de test.

## Informations techniques

| Élément | Valeur |
| --- | --- |
| Tenant B2C | `afrilandfirstbankcmr.onmicrosoft.com` |
| Application (client_id) | `4829629c-4ae8-42a5-9def-bd28fbfd6992` |
| User flow / policy | `B2X_1_KYP` (custom policy — endpoint `cpim`) |
| URL du portail | `https://site-dxjrf.powerappsportals.com` |

---

## Solution recommandée (réglage UNIQUE, valable pour tous les utilisateurs)

### Option A — Accès conditionnel (vérifier au BON endroit)

> ⚠️ Dans un tenant **B2C**, l'Accès conditionnel a sa **propre entrée**, distincte de
> Microsoft Entra ID classique. Si on ne trouve rien sous « Microsoft Entra ID →
> Conditional Access », chercher ici :

1. Barre de recherche Azure → **« Azure AD B2C »** → ouvrir **le service Azure AD B2C**.
2. Menu → **Security** → **Conditional Access** → **Policies**.
3. Ouvrir **TOUTES** les politiques (y compris *Report-only* et noms génériques) →
   **Conditions** → **Locations**.
4. Vérifier aussi : **User flows → `B2X_1_KYP` → Properties → Conditional Access**.
5. Pour chaque politique concernée :
   - **Exclure l'application** `4829629c-4ae8-42a5-9def-bd28fbfd6992`
     (Assignments → Cloud apps → Exclude), **ou**
   - **Désactiver la restriction IP** pour ce portail.

> Pour un **portail partenaire externe**, le plus simple et correct est d'**exclure
> l'app du portail** de toute restriction basée sur l'IP — sinon les partenaires
> légitimes seront bloqués.

### Option B — Si une restriction IP doit être conservée (named locations)

1. **Microsoft Entra ID** → **Security** → **Named locations**.
2. **+ IP ranges location** → ajouter les plages d'IP autorisées (ex. réseau de la
   banque + IP de test), marquer comme **Trusted** si pertinent.
3. Mettre à jour la politique d'accès conditionnel pour **autoriser** ces emplacements
   et **bloquer le reste** (si telle est l'intention).

### ⭐ Option PRIORITAIRE — Message codé dans la custom policy `B2X_1_KYP`

> « Requests from this IP are not allowed » **n'est pas une erreur Azure standard**
> (celles-ci ont un code `AADB2C90xxx`). C'est une **phrase personnalisée**, donc
> **écrite dans le XML de la custom policy**. C'est pourquoi on ne la trouve dans aucun
> menu Azure : ce n'est pas un réglage, c'est du code de policy.

Clickpath exact :
1. **portal.azure.com** → recherche **« Azure AD B2C »** → ouvrir le service.
2. Menu gauche → **Identity Experience Framework** → **Custom policies**.
3. Télécharger les fichiers XML (surtout **`TrustFrameworkExtensions`** et la relying
   party **`B2X_1_KYP` / SignUpOrSignin**).
4. **Ctrl+F** dans le XML sur le texte exact : `Requests from this IP are not allowed`.
5. La balise contenant ce message = la restriction → typiquement un `<TechnicalProfile>`
   **RESTful** validant l'IP, ou un `RestrictionGroups` / une `Precondition` sur l'IP.
6. **Retirer / désactiver** ce TechnicalProfile (et l'OrchestrationStep qui l'appelle dans
   le User Journey), puis **ré-uploader** la policy.

> Portail externe → aucune restriction IP ne doit s'appliquer aux connexions partenaires.

### Option C — Restriction IP dans la custom policy `B2X_1_KYP`

Si le blocage ne vient pas de l'Accès conditionnel, vérifier la custom policy
elle-même :

1. **Azure AD B2C** → **Identity Experience Framework** → **Custom policies**.
2. Ouvrir/inspecter la policy `B2X_1_KYP` (et ses fichiers de base) à la recherche
   d'une restriction d'IP (`RestrictionGroups`, technical profile RESTful filtrant
   l'IP, etc.) et l'assouplir pour les connexions du portail.

---

## Résultat attendu

Une fois la restriction levée/ajustée (**réglage unique**), **tous les tiers**
pourront se connecter au portail depuis n'importe quelle IP. Aucune action n'est à
répéter par utilisateur ni par connexion.

## Pour tester après modification

1. Attendre quelques minutes (propagation).
2. Ouvrir une fenêtre **navigation privée** → `https://site-dxjrf.powerappsportals.com/`
   → **Se connecter**.
3. L'écran de connexion B2C doit s'afficher (saisie e-mail / mot de passe), sans
   l'erreur « Requests from this IP are not allowed ».
