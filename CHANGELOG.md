# Journal des modifications

Toutes les évolutions notables du projet Portail KYP/KYS sont consignées ici.

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Versionnage : [Semantic Versioning](https://semver.org/lang/fr/) — charte AFB_PS03 § 23.5.

La partie fonctionnelle de chaque entrée doit rester compréhensible par un
lecteur non technique.

## [Non publié]

### À traiter — relevé, non corrigé

- **Authentification du portail : plusieurs portes ouvertes.** Les paramètres
  du site autorisent simultanément la connexion locale par mot de passe
  (`LocalLoginEnabled`), Azure AD, les fournisseurs externes, **et
  l'inscription libre** (`OpenRegistrationEnabled`) — alors que le portail est
  conçu pour Azure AD B2C avec code à usage unique, sur invitation. En l'état,
  un inconnu peut créer un compte sur le portail KYC de la banque.
  Aucune page de réinitialisation de mot de passe n'existe par ailleurs : si la
  connexion locale reste ouverte, un utilisateur qui perd son mot de passe n'a
  aucun recours en libre-service.
  Décision attendue : fermer la connexion locale et l'inscription libre (voie
  recommandée, conforme au § 12 de la charte et sans développement), ou bien
  mettre en place le parcours complet de réinitialisation.
- **Flux « Invitation Tiers » : contacts dupliqués.** Le déclencheur est réglé
  sur « Créer ou mettre à jour » de la table TIERS, sans filtre de colonnes, et
  l'étape de création de contact est inconditionnelle. Toute modification d'un
  tiers crée donc un contact supplémentaire et renvoie une invitation. Le
  portail écrivant deux fois sur la fiche à chaque soumission d'onboarding, une
  seule soumission produit deux doublons et deux e-mails.

### Ajouté

- Référentiel des secteurs d'activité : 110 secteurs groupés par section
  CITI/NACE, en remplacement de la saisie libre.
- Écran de chargement au dépôt des pièces, avec le nom du fichier en cours et
  une progression `n/total`.
- Contrôle du format des numéros de téléphone (format international E.164),
  signalé à la sortie du champ.
- Contrôle des fichiers avant envoi : format et taille, avec un message
  indiquant ce qu'il faut corriger.
- Socle de projet conforme à la charte : `.nvmrc`, `.editorconfig`,
  `.gitattributes`, `.env.example`, champ `engines`, présent journal.
- Mode strict TypeScript activé sur les deux configurations de compilation.
- Console support « accès partenaires » : diagnostic automatique de huit
  situations de connexion, avec la manœuvre à effectuer pour chacune.
- Outillage de tests (Vitest) et première couverture : matrice des
  habilitations et diagnostic d'accès, à 100 %.

### Modifié

- Recherche élargie à toutes les colonnes affichées sur les cinq écrans du
  portail, désormais insensible aux accents et acceptant plusieurs termes.
- « N° RCCM / Certificate of incorporation » devient « Numéro de registre de
  commerce », utilisable hors zone OHADA.
- La pièce d'identité du représentant légal n'est plus acceptée qu'en PDF.
- La configuration d'authentification est lue depuis l'environnement au lieu
  d'être écrite dans le code.

### Corrigé

- **Les décisions de conformité étaient journalisées au nom de la mauvaise
  personne.** L'auteur enregistré au registre des décisions était résolu depuis
  un contexte de démonstration, et retombait en pratique sur le premier
  utilisateur interne de la liste. Il correspond désormais à l'utilisateur
  réellement connecté.
- La zone de dépôt de « Mes documents » n'appliquait aucun filtre de type de
  fichier : n'importe quelle extension était acceptée.
- Clé de traduction en double dans le dictionnaire anglais, qui faisait échouer
  l'analyse statique.

### Retiré

- Action « Reprendre l'onboarding » sur l'espace partenaire.
- Contexte de rôle obsolète de l'application interne, remplacé par le magasin
  de rôles et conservé jusqu'ici sans usage réel.

## [1.0.0] — 2026-07-20

Version de référence soumise à la recette (fiche V1.1). Repère Git :
`v1.0-ingrid`.
