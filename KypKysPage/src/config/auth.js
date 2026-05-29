// =============================================================
// Configuration d'authentification — Azure AD B2C (Option A)
// =============================================================
// Onboarding B2C DIRECT, sans code d'invitation : le Contact
// Power Pages est pré-créé et lié à afb_tiers par Power Automate,
// le Web Role « Tiers externe » est pré-assigné. Le tiers se
// contente de s'authentifier via Azure AD B2C + OTP.
//
// Ce fichier ne contient QUE des valeurs susceptibles de varier
// d'un environnement à l'autre (DEV / UAT / PROD).
// =============================================================

// ⚠️ À RENSEIGNER — valeur « Authentication Type » du fournisseur
// Azure AD B2C tel que configuré dans le portail :
//   Power Pages → Sécurité → Fournisseurs d'identité → (votre B2C)
//   = site setting "Authentication/Registration/LoginButtonAuthenticationType".
//
// • Si renseignée  → le bouton « Se connecter » POST directement vers
//   /Account/Login/ExternalLogin et redirige SANS page intermédiaire
//   vers Azure AD B2C (parcours le plus court).
// • Si laissée vide → repli GET vers /SignIn (page de connexion
//   standard Power Pages, qui redirige vers le fournisseur par défaut).
export const B2C_PROVIDER = ''

// URL de retour après authentification réussie.
// La racine "/" charge l'espace du tiers (vue « Mon espace »).
export const LOGIN_RETURN_URL = '/'
