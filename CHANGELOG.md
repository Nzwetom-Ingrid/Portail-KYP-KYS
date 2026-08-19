# Journal des modifications

Toutes les évolutions notables du projet Portail KYP/KYS sont consignées ici.

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Versionnage : [Semantic Versioning](https://semver.org/lang/fr/) — charte AFB_PS03 § 23.5.

La partie fonctionnelle de chaque entrée doit rester compréhensible par un
lecteur non technique.

## [Non publié]

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
