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

- **Gérants multiples à l’onboarding, et visibles par la conformité.** L’étape
  « Représentant légal » ne prévoyait qu’une personne — dont aucun champ n’était
  enregistré. Elle devient « Direction » : le nombre de gérants se saisit à
  l’étape précédente et commande le nombre de fiches, corrigeables sur place. Un
  seul représentant légal peut être désigné. Le tiroir du dossier affiche
  désormais cette direction, nationalité et date de naissance comprises — sans
  elles, un contrôle de sanctions sur le seul nom est inexploitable.
- **Déclaration des bénéficiaires effectifs dans l’onboarding.** Nouvelle étape
  après la direction, appuyée sur les services existants : le menu « Mes
  bénéficiaires » reste en place, l’onboarding propose seulement la déclaration
  au bon moment. Non bloquante.

- **Le portail se met à jour tout seul.** Le partenaire devait recharger la
  page pour découvrir que son dossier avait été validé ou qu'une pièce avait
  changé de statut — sans que rien ne lui suggère que l'information avait
  vieilli. Les six écrans se relisent désormais au retour sur l’onglet, puis
  chaque minute tant qu’il reste visible. Un changement de statut du dossier
  est annoncé par une notification : une mise à jour silencieuse serait passée
  inaperçue, et le mécanisme n’aurait servi à rien.
  Trois garde-fous : la relecture s’arrête quand l’onglet passe en arrière-plan
  (un onglet oublié interrogerait Dataverse des centaines de fois pour
  personne), elle se suspend pendant un téléversement ou un formulaire ouvert
  (remplacer les données sous les doigts de l’utilisateur ferait plus de dégâts
  que la fraîcheur n’apporte), et elle n’affiche jamais d’écran d’attente —
  seul le premier chargement en montre un.

- **Rubrique « Demandes », avec réponse de la conformité.** Une demande de
  revue n'est pas une pièce justificative : elle s'affichait pourtant parmi
  elles, avec un statut « En attente » et des boutons Valider / Rejeter
  dépourvus de sens pour un message. Surtout, personne ne pouvait y répondre —
  le partenaire écrivait dans le vide. Le dossier porte désormais un onglet
  « Demandes » où la conformité lit le message, répond, et classe la demande.
  Le compteur de l’onglet porte sur les demandes sans réponse : le reste à
  traiter, pas l'historique.
- **Le partenaire voit la réponse.** « Mon espace » affiche le fil de ses
  demandes sous le formulaire qui les émet, avec la réponse de la conformité et
  sa date, ou la mention qu'elle n'est pas encore venue.

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

- **Une permission manquante ne peut plus vider un écran.** Les trois dernières
  requêtes qui enrichissaient leurs résultats par une expansion `$expand` —
  documents, documents reçus, questionnaires — se rejouent sans elle en cas de
  refus. Dataverse rejette la requête ENTIÈRE quand la table expansée n’est pas
  autorisée, et désigne la table interrogée plutôt que la vraie fautive : c’est
  ce mécanisme qui avait bloqué le dépôt de pièces pendant deux jours. Le
  libellé de catégorie ou le titre du questionnaire se perdent alors, l’écran
  non.

- **Les demandes ont enfin leur table.** Elles vivaient dans `afb_document` avec
  un marqueur de type et une URL `request://`, faute de mieux. La table
  `afb_demandederevue` les accueille désormais, avec un vrai lookup pour le fil
  des réponses au lieu d’une convention de nommage. Les demandes émises avant
  ne sont pas migrées : elles restent lues depuis `afb_document` et fusionnées
  aux nouvelles. Une reprise de données pour une poignée d’enregistrements
  ferait courir plus de risques qu’elle n’en éviterait — et le back-office sait
  répondre dans l’une comme dans l’autre.

- Recherche élargie à toutes les colonnes affichées sur les cinq écrans du
  portail, désormais insensible aux accents et acceptant plusieurs termes.
- « N° RCCM / Certificate of incorporation » devient « Numéro de registre de
  commerce », utilisable hors zone OHADA.
- La pièce d'identité du représentant légal n'est plus acceptée qu'en PDF.
- La configuration d'authentification est lue depuis l'environnement au lieu
  d'être écrite dans le code.

### Corrigé

- **Tous les tiers ressortaient « Partenaire » sur deux écrans.** Le partage de
  documents et l’affectation de questionnaires déduisaient le type de la
  direction porteuse — DMG valait Fournisseur. Or la création de dossier écrit
  systématiquement DCONF : aucun fournisseur ne pouvait donc être reconnu, et le
  filtre par type ne filtrait rien. Ces écrans lisent désormais la famille
  d’institution du type de partenaire, comme le reste de l’application.

- **L’onboarding et « Mes documents » ne disaient pas la même chose.** L’étape
  des pièces s’appuyait sur un état local, gardé dans le navigateur : une pièce
  déposée depuis « Mes documents » n’y apparaissait pas, et une pièce supprimée
  ailleurs y restait marquée « Ajouté ». Deux écrans, deux vérités. Les deux
  lisent désormais Dataverse.
- **Aucune action sur une pièce déjà déposée à l’onboarding.** Elle affichait
  « Ajouté » et rien d’autre — impossible de la consulter, de la remplacer ou de
  la retirer sans passer par un autre écran. Les trois actions sont là, avec le
  statut réel de la pièce. Une pièce déjà validée ne se supprime pas : elle se
  remplace, ce qui laisse une trace et relance la revue.

- **L’onboarding montrait quatre pièces, quel que soit le partenaire.** RCCM,
  statuts, attestation fiscale, pièce d’identité — une liste écrite en dur. Une
  banque correspondante en attend dix, dont le questionnaire Wolfsberg et le
  formulaire FATCA : elle ne découvrait donc jamais, au moment de constituer son
  dossier, ce qu’on lui demandait vraiment. L’étape lit désormais la checklist du
  dossier, celle que le chargé de relation a établie à la création.
- **Les pièces déposées à l’onboarding ne cochaient rien.** Le téléversement
  n’emportait pas la clé de la pièce : le document arrivait sans rattachement, et
  le suivi « X/Y fournies » restait à zéro alors que le partenaire venait de tout
  déposer. La clé est désormais transmise.

- **Une pièce remplacée porte enfin son propre statut.** Elle recevait « Expiré »,
  faute de valeur adéquate — ce qui laissait croire à un document périmé alors
  qu'il était simplement supplanté par une version plus récente ; la nuance
  compte devant un auditeur. La valeur « Remplacé » (`747010003`) a été créée
  sur `afb_statutdevalidite`, et les deux applications l’affichent d’un ton
  neutre : ce n’est pas une anomalie, c’est l’historique d’un dépôt qui s’est
  bien passé.

- **Un dossier incomplet ne peut plus être validé.** Le bouton « Valider »
  était cliquable quoi qu’il manque. Le tiroir affichait bien « 3/7 pièces
  fournies », mais ce compteur informait sans protéger : une décision de
  conformité prise sur un dossier auquel manque le registre du commerce n’a
  aucune valeur devant le régulateur. La validation exige désormais les pièces
  obligatoires de la checklist et quatre champs d’identité — raison sociale,
  pays, numéro RCCM, e-mail de contact. Une bannière en tête du tiroir énumère
  ce qui manque, et « Demander complément » reste la voie normale pour le
  réclamer. Ville, téléphone et secteur ne bloquent pas : une règle qui refuse
  un dossier complet pour un numéro de téléphone se fait contourner.
- **Remplacer une pièce validée remet le dossier en revue.** Le dossier restait
  validé sur la foi d’un document qui n’était plus celui examiné. Le
  remplacement d’une pièce déjà validée le ramène en revue ; remplacer une
  pièce encore en attente ne change rien, l’examen n’ayant pas eu lieu.
- **Les pièces sont versionnées.** La table `afb_documentversion` existait avec
  son service généré, et aucun écran ne l’utilisait : la version examinée par
  la conformité disparaissait au profit de la nouvelle. Chaque remplacement
  écrit désormais son lien antérieur → courant, son numéro de version et sa
  date. La pièce remplacée sort du jeu courant, sans quoi le partenaire verrait
  deux fois la même, l’une validée et l’autre en attente.

- **Les demandes n’encombrent plus la liste des pièces.** Le tri entre pièce,
  demande et réponse était réécrit à la main dans chaque écran, avec des règles
  qui divergeaient : le portail écartait « demande-revue », le back-office non.
  Un prédicat unique, testé, fait foi des deux côtés de l'application.

- **RÉGRESSION — le dépôt de pièces était devenu impossible.** L'expansion
  `$expand=afb_typejuridique(...)`, ajoutée aux trois requêtes de rattachement
  pour afficher correctement « Partenaire / Fournisseur », lit la table
  `afb_partnertype`. Sans autorisation de table sur celle-ci, Dataverse refuse
  la requête ENTIÈRE — pas seulement l'expansion. Le portail ne retrouvait donc
  plus l'entreprise du partenaire, et le bouton « Soumettre » restait grisé.
  Une commodité d'affichage bloquait une résolution essentielle. Les trois
  voies réessaient désormais sans cette expansion en cas de refus ; le type
  retombe sur le préfixe de la référence du dossier, qui le porte déjà.

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
