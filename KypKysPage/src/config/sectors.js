// Référentiel des secteurs d’activité — structure alignée sur les sections de la
// nomenclature internationale CITI/NACE (Rév. 4), libellés en français.
//
// Pourquoi une liste fermée plutôt qu’une saisie libre : le secteur alimente le
// profil de risque du tiers côté conformité. Tant que chaque partenaire écrit ce
// qu’il veut (« transport », « Transport & logistique », « logistique »), aucun
// regroupement ni filtrage n’est possible en back-office.
//
// La valeur STOCKÉE dans afb_secteurdactivite est le libellé (`label`), pas le
// code : la colonne Dataverse est un champ texte partagé avec l’application
// interne, et elle contient déjà des libellés. Le `code` sert au regroupement
// dans la liste déroulante et à un éventuel passage en option set plus tard.

export const SECTOR_GROUPS = [
  {
    code: 'A',
    label: 'Agriculture, sylviculture et pêche',
    items: [
      'Cultures vivrières',
      'Cultures de rente (cacao, café, coton)',
      'Élevage',
      'Sylviculture et exploitation forestière',
      'Pêche et aquaculture',
      'Services de soutien à l’agriculture',
    ],
  },
  {
    code: 'B',
    label: 'Industries extractives',
    items: [
      'Extraction de pétrole brut et de gaz naturel',
      'Extraction de minerais métalliques',
      'Extraction de pierres, sables et argiles',
      'Services de soutien aux industries extractives',
    ],
  },
  {
    code: 'C',
    label: 'Industrie manufacturière',
    items: [
      'Industries agroalimentaires',
      'Boissons',
      'Tabac',
      'Textile, habillement et cuir',
      'Travail du bois et fabrication de meubles',
      'Papier, carton et imprimerie',
      'Cokéfaction et raffinage',
      'Industrie chimique',
      'Industrie pharmaceutique',
      'Caoutchouc et plastique',
      'Ciment, verre et matériaux de construction',
      'Métallurgie et travail des métaux',
      'Équipements électriques et électroniques',
      'Machines et équipements',
      'Industrie automobile et matériel de transport',
      'Autres industries manufacturières',
    ],
  },
  {
    code: 'D',
    label: 'Énergie',
    items: [
      'Production et distribution d’électricité',
      'Production et distribution de gaz',
      'Énergies renouvelables',
    ],
  },
  {
    code: 'E',
    label: 'Eau, assainissement et déchets',
    items: [
      'Captage, traitement et distribution d’eau',
      'Assainissement et traitement des eaux usées',
      'Collecte et traitement des déchets',
      'Dépollution et gestion environnementale',
    ],
  },
  {
    code: 'F',
    label: 'Construction et BTP',
    items: [
      'Construction de bâtiments',
      'Génie civil et travaux publics',
      'Travaux de construction spécialisés',
      'Promotion immobilière',
    ],
  },
  {
    code: 'G',
    label: 'Commerce et distribution',
    items: [
      'Commerce de gros',
      'Commerce de détail',
      'Commerce et réparation d’automobiles',
      'Import-export',
      'Négoce de matières premières',
      'Commerce électronique',
    ],
  },
  {
    code: 'H',
    label: 'Transport et logistique',
    items: [
      'Transport routier de marchandises',
      'Transport routier de voyageurs',
      'Transport ferroviaire',
      'Transport maritime et fluvial',
      'Transport aérien',
      'Entreposage et manutention',
      'Transit et commission en douane',
      'Courrier et messagerie',
    ],
  },
  {
    code: 'I',
    label: 'Hébergement et restauration',
    items: [
      'Hôtellerie',
      'Restauration',
      'Traiteur et restauration collective',
      'Débits de boissons',
    ],
  },
  {
    code: 'J',
    label: 'Information et communication',
    items: [
      'Édition et médias',
      'Production audiovisuelle',
      'Télécommunications',
      'Développement logiciel et services informatiques',
      'Hébergement, données et infogérance',
      'Services d’information en ligne',
    ],
  },
  {
    code: 'K',
    label: 'Activités financières et d’assurance',
    items: [
      'Banque commerciale',
      'Banque d’investissement',
      'Établissement de microfinance (EMF)',
      'Établissement de paiement et monnaie électronique',
      'Transfert de fonds',
      'Bureau de change',
      'Crédit-bail et financement spécialisé',
      'Assurance et réassurance',
      'Courtage en assurance',
      'Gestion d’actifs et fonds d’investissement',
      'Société de bourse et intermédiation financière',
      'Crypto-actifs et actifs numériques',
      'Holding financière',
    ],
  },
  {
    code: 'L',
    label: 'Activités immobilières',
    items: [
      'Location et exploitation de biens immobiliers',
      'Agences immobilières',
      'Administration de biens et syndic',
    ],
  },
  {
    code: 'M',
    label: 'Activités spécialisées, scientifiques et techniques',
    items: [
      'Activités juridiques',
      'Comptabilité, audit et conseil fiscal',
      'Conseil en gestion et stratégie',
      'Architecture et ingénierie',
      'Recherche et développement',
      'Publicité et études de marché',
      'Activités vétérinaires',
      'Autres activités de conseil',
    ],
  },
  {
    code: 'N',
    label: 'Services administratifs et de soutien',
    items: [
      'Location et location-bail',
      'Agences de travail temporaire et recrutement',
      'Agences de voyage et tour-opérateurs',
      'Sécurité privée et surveillance',
      'Nettoyage et services aux bâtiments',
      'Centres d’appels et services administratifs',
    ],
  },
  {
    code: 'O',
    label: 'Administration publique',
    items: [
      'Administration centrale et collectivités',
      'Organismes et établissements publics',
      'Sécurité sociale obligatoire',
      'Défense et sécurité',
    ],
  },
  {
    code: 'P',
    label: 'Enseignement',
    items: [
      'Enseignement primaire et secondaire',
      'Enseignement supérieur',
      'Formation professionnelle continue',
      'Autres activités d’enseignement',
    ],
  },
  {
    code: 'Q',
    label: 'Santé et action sociale',
    items: [
      'Activités hospitalières',
      'Pratique médicale et dentaire',
      'Laboratoires d’analyses',
      'Hébergement médico-social',
      'Action sociale sans hébergement',
    ],
  },
  {
    code: 'R',
    label: 'Arts, spectacles et loisirs',
    items: [
      'Arts du spectacle et création artistique',
      'Bibliothèques, musées et patrimoine',
      'Jeux de hasard et paris',
      'Activités sportives et récréatives',
    ],
  },
  {
    code: 'S',
    label: 'Autres activités de services',
    items: [
      'Organisations associatives et ONG',
      'Organisations religieuses',
      'Organisations politiques et syndicales',
      'Réparation d’équipements domestiques',
      'Blanchisserie, coiffure et soins du corps',
      'Pompes funèbres',
    ],
  },
  {
    code: 'U',
    label: 'Organisations extraterritoriales',
    items: [
      'Organisations internationales et diplomatiques',
      'Bailleurs de fonds et institutions de développement',
    ],
  },
]

// Liste à plat des libellés — c’est ce qui est stocké dans afb_secteurdactivite.
export const SECTORS = SECTOR_GROUPS.flatMap((g) => g.items)

// Retrouve le groupe d’un libellé (contexte affiché dans le récapitulatif).
export function sectorGroupOf(label) {
  if (!label) return null
  const g = SECTOR_GROUPS.find((grp) => grp.items.includes(label))
  return g ? g.label : null
}

// Vrai si le libellé fait partie du référentiel. Les fiches créées avant la
// mise en place de la liste contiennent du texte libre : on les tolère en
// lecture (pré-remplissage) sans les considérer comme valides à la soumission.
export function isKnownSector(label) {
  return SECTORS.includes(label)
}
