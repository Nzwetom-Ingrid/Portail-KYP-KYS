# Journal des modifications

Toutes les évolutions notables du projet Portail KYP/KYS sont consignées ici.

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Versionnage : [Semantic Versioning](https://semver.org/lang/fr/) — charte AFB_PS03 § 23.5.

La partie fonctionnelle de chaque entrée doit rester compréhensible par un
lecteur non technique.

## [Non publié]

### À traiter — relevé, non corrigé

- **Demande de revue : invisible côté conformité.** Depuis le portail, la
  demande est désormais enregistrée et horodatée, mais elle n'apparaît dans
  aucun écran de l'application interne et ne déclenche aucune notification.
  La DCONF ne la découvre qu'en interrogeant la table des documents, sur le
  marqueur `demande-revue`. Reste à construire : l'écran de traitement
  côté back-office, et l'envoi depuis l'adresse de la banque.

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

- **Déconnexion du portail.** Le portail n'offrait aucun moyen de fermer sa
  session : sur un poste partagé, elle restait ouverte pour le suivant. Un menu
  sur l'avatar propose « Se déconnecter » ; l'entreprise active mémorisée est
  effacée au passage, pour que le suivant ne débarque pas sur une société qui
  n'est pas la sienne.

- **Type de dossier choisi au back-office : KYP ou KYS.** Le formulaire de
  création propose un type déduit du référentiel, mais le chargé de relation
  peut désormais le corriger. La règle est rappelée sous le champ : KYP pour une
  contrepartie financière — banque correspondante ou établissement de
  microfinance ; KYS pour une entreprise qui livre des biens ou des services à
  la banque. Ce choix fixe le préfixe de la référence, que le portail relit pour
  afficher son type au tiers.
- **Diligence renforcée préservée pour les banques correspondantes.** Le type de
  dossier et le niveau de diligence sont désormais deux axes distincts : une
  banque correspondante ouvre un dossier KYP ordinaire, mais sa checklist reste
  celle des exigences renforcées (Wolfsberg CBDDQ, FATCA/CRS, Patriot Act).
- **Console support : une ligne par tiers.** La population de départ est la
  table des tiers, et non plus les adresses de connexion : une entreprise dont
  personne ne peut ouvrir le portail apparaît désormais, alors qu'elle était
  purement et simplement absente. Chaque ligne indique qui peut s'y connecter,
  avec une mention « partagé » lorsque l'interlocuteur pilote plusieurs
  entreprises, et un filtre « Accès partagé / Accès dédié / Aucun accès ». Le
  détail liste les interlocuteurs, les plus en difficulté d'abord, chacun avec
  son diagnostic et son bouton de déblocage.
- **Identités sans entreprise rattachée.** Elles s'authentifient sans erreur et
  tombent sur un portail vide. Regroupées en tête de la console plutôt que
  perdues entre deux vues.
- **Déblocage d'un accès depuis l'application.** L'action réactive la fiche
  Contact, vide le verrouillage Power Pages et remet le compteur d'échecs à
  zéro, sans passer par Dataverse.

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

- **Une permission de table manquante ne se distinguait pas d'une absence de
  données.** Les trois voies de rattachement au tiers étaient explorées avec un
  `catch` muet : un refus d’autorisation et « aucune fiche trouvée » donnaient
  le même écran vide. Ce sont pourtant deux pannes opposées — l'une se corrige
  dans les autorisations du rôle web, l'autre sur la fiche du tiers. L'issue de
  chaque voie est désormais conservée, et le portail nomme la table dont la
  lecture a été refusée.

- **Le choix de fichiers par la boîte de dialogue ne remontait rien.** Seul le
  glisser-déposer alimentait la file d'attente. `e.target.files` est une
  FileList vivante, liée à l'input : réarmer `value` — nécessaire pour pouvoir
  resélectionner le même fichier après une erreur — la vidait avant même
  qu'elle soit lue. Le glisser-déposer, qui passe par `dataTransfer.files`,
  échappait à l'effet de bord. La sélection est désormais matérialisée avant le
  réarmement.
- **Bouton « Soumettre » grisé sans un mot d'explication.** Lorsque le compte
  n'est rattaché à aucune entreprise, le dépôt est impossible : la pièce
  n'aurait pas de dossier où être rangée. L'écran grisait le bouton en silence,
  ce qui se lisait comme une panne. La cause est maintenant nommée en tête de
  page, avec la marche à suivre.

- **Console support branchée sur la table qui authentifie réellement.** L'écran
  ne lisait que `afb_tiersexterneb2c`, un miroir alimenté par le flux
  d'invitation : cinq lignes s'affichaient pour une quarantaine de tiers, et
  aucune trace de connexion n'était disponible. L'authentification Power Pages
  repose sur la table **Contact** et ses colonnes `adx_identity_*` (connexion
  autorisée, verrouillage, dernière connexion réussie, échecs). L'écran fusionne
  désormais les trois voies d'accès que le portail explore lui-même, et affiche
  une ligne par personne au lieu d'une ligne par enregistrement. Quatre
  diagnostics nouveaux en découlent : contact désactivé, connexion portail
  désactivée, invitation non utilisée, aucun compte portail.

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
