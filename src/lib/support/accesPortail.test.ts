/**
 * Tests de la vue consolidée des accès au portail.
 *
 * Ces règles décident de ce que le support IT lit au téléphone : une erreur de
 * priorité lui fait chercher au mauvais endroit. Elles sont donc verrouillées
 * ici, y compris les branches qui n'ont l'air de rien (adresse vide, doublon de
 * fiche Contact, entreprise inconnue du référentiel).
 */
import { describe, expect, it } from 'vitest';
import {
  agregerAcces,
  diagnostiquerAcces,
  CANAL_LABEL,
  type AccesPortail,
  type CompteB2c,
  type ContactPortail,
  type TiersMinimal,
} from './accesPortail';

const MAINTENANT = new Date('2026-08-21T10:00:00Z');

const T1 = 'aaaaaaaa-0000-0000-0000-000000000001';
const T2 = 'aaaaaaaa-0000-0000-0000-000000000002';

const TIERS: TiersMinimal[] = [
  { afb_tiersid: T1, afb_nomdupartenaire: 'SOCAPALM SA' },
  { afb_tiersid: T2, afb_nomdupartenaire: 'ETS PROVIDENCE' },
];

function contact(p: Partial<ContactPortail> = {}): ContactPortail {
  return {
    contactid: 'c1',
    emailaddress1: 'jean@socapalm.cm',
    fullname: 'Jean Eboa',
    statecode: 0,
    _afb_tiers_value: T1,
    adx_identity_logonenabled: true,
    adx_identity_emailaddress1confirmed: true,
    adx_identity_lastsuccessfullogin: '2026-08-20T08:00:00Z',
    adx_identity_accessfailedcount: 0,
    ...p,
  };
}

function base(entreprises = [{ id: T1, nom: 'SOCAPALM SA' }]): Omit<AccesPortail, 'diagnostic'> {
  return {
    email: 'jean@socapalm.cm',
    entreprises,
    canaux: ['contact'],
    tentatives: 0,
    compteB2cCree: false,
  };
}

describe('diagnostiquerAcces', () => {
  it('signale en premier l’absence de toute entreprise', () => {
    // Priorité absolue : la connexion réussit et le portail reste vide. Même un
    // contact désactivé passe après — c'est le symptôme que le partenaire décrit.
    const d = diagnostiquerAcces(base([]), contact({ statecode: 1 }), undefined, MAINTENANT);
    expect(d.code).toBe('tiers-non-rattache');
    expect(d.severite).toBe('bloquant');
  });

  it('détecte une fiche Contact désactivée', () => {
    const d = diagnostiquerAcces(base(), contact({ statecode: 1 }), undefined, MAINTENANT);
    expect(d.code).toBe('contact-desactive');
  });

  it('détecte la connexion portail désactivée', () => {
    const d = diagnostiquerAcces(
      base(),
      contact({ adx_identity_logonenabled: false }),
      undefined,
      MAINTENANT,
    );
    expect(d.code).toBe('connexion-desactivee');
  });

  it('détecte un verrouillage dont la date de fin est à venir', () => {
    const d = diagnostiquerAcces(
      base(),
      contact({ adx_identity_lockoutenddate: '2026-08-21T12:00:00Z' }),
      undefined,
      MAINTENANT,
    );
    expect(d.code).toBe('compte-bloque');
  });

  it('ignore un verrouillage déjà expiré', () => {
    const d = diagnostiquerAcces(
      base(),
      contact({ adx_identity_lockoutenddate: '2026-08-21T09:00:00Z' }),
      undefined,
      MAINTENANT,
    );
    expect(d.code).toBe('ok');
  });

  it('ignore une date de verrouillage illisible', () => {
    const d = diagnostiquerAcces(
      base(),
      contact({ adx_identity_lockoutenddate: 'pas-une-date' }),
      undefined,
      MAINTENANT,
    );
    expect(d.code).toBe('ok');
  });

  it('bloque au seuil de tentatives même sans date de verrouillage', () => {
    const d = diagnostiquerAcces(
      base(),
      contact({ adx_identity_accessfailedcount: 5 }),
      undefined,
      MAINTENANT,
    );
    expect(d.code).toBe('compte-bloque');
    expect(d.symptome).toContain('5');
  });

  it('compte zéro tentative quand le compteur est absent', () => {
    const d = diagnostiquerAcces(
      base(),
      contact({ adx_identity_accessfailedcount: undefined }),
      undefined,
      MAINTENANT,
    );
    expect(d.code).toBe('ok');
  });

  it('distingue l’invitation non utilisée d’un simple « jamais connecté »', () => {
    const jamaisOuvert = diagnostiquerAcces(
      base(),
      contact({
        adx_identity_lastsuccessfullogin: undefined,
        adx_identity_emailaddress1confirmed: false,
      }),
      undefined,
      MAINTENANT,
    );
    expect(jamaisOuvert.code).toBe('email-non-confirme');
    expect(jamaisOuvert.severite).toBe('attention');

    const pasEncoreVenu = diagnostiquerAcces(
      base(),
      contact({ adx_identity_lastsuccessfullogin: undefined }),
      undefined,
      MAINTENANT,
    );
    expect(pasEncoreVenu.code).toBe('jamais-connecte');
    expect(pasEncoreVenu.severite).toBe('info');
  });

  it('renvoie « opérationnel » quand rien ne cloche', () => {
    expect(diagnostiquerAcces(base(), contact(), undefined, MAINTENANT).code).toBe('ok');
  });

  it('délègue à l’identité externe en l’absence de fiche Contact', () => {
    const compte: CompteB2c = {
      afb_tiersexterneb2cid: 'b1',
      afb_emaildauthentification: 'jean@socapalm.cm',
      afb_datedinvitation: '2026-01-01T00:00:00Z',
    };
    const d = diagnostiquerAcces(base(), undefined, compte, MAINTENANT);
    // Invitation vieille de plus de 72 h et jamais consommée.
    expect(d.code).toBe('invitation-expiree');
  });

  it('ne fait pas ressortir « non rattaché » quand le tiers vient d’une autre voie', () => {
    // L'identité externe n'a pas de lookup tiers, mais l'entreprise est connue
    // par ailleurs : c'est le piège que corrige la neutralisation du test amont.
    const compte: CompteB2c = {
      afb_tiersexterneb2cid: 'b1',
      afb_emaildauthentification: 'jean@socapalm.cm',
      afb_datedinvitation: '2026-08-20T09:00:00Z',
    };
    const d = diagnostiquerAcces(base(), undefined, compte, MAINTENANT);
    expect(d.code).toBe('inscription-inachevee');
  });

  it('signale l’absence totale de compte de connexion', () => {
    const d = diagnostiquerAcces(base(), undefined, undefined, MAINTENANT);
    expect(d.code).toBe('aucun-compte-portail');
    expect(d.severite).toBe('bloquant');
  });

  it('utilise l’horloge système par défaut', () => {
    // Le paramètre `maintenant` est injectable ; sans lui, le diagnostic doit
    // rester cohérent (ici aucune date n'entre en jeu).
    expect(diagnostiquerAcces(base([]), undefined, undefined).code).toBe('tiers-non-rattache');
  });
});

describe('agregerAcces', () => {
  it('regroupe une personne pilotant plusieurs entreprises sur une seule ligne', () => {
    const contacts: ContactPortail[] = [
      contact({ contactid: 'c1', _afb_tiers_value: T1 }),
      contact({ contactid: 'c2', _afb_tiers_value: T2 }),
    ];
    const lignes = agregerAcces(contacts, [], TIERS, MAINTENANT);
    expect(lignes).toHaveLength(1);
    expect(lignes[0].entreprises.map((e) => e.nom)).toEqual(['ETS PROVIDENCE', 'SOCAPALM SA']);
  });

  it('fusionne les trois voies d’accès sur la même adresse', () => {
    const lignes = agregerAcces(
      [contact()],
      [
        {
          afb_tiersexterneb2cid: 'b1',
          afb_emaildauthentification: 'JEAN@Socapalm.cm',
          _afb_nomdutiers_value: T2,
          afb_identifiantb2c: 'azure-1',
          afb_datedinvitation: '2026-05-01T00:00:00Z',
        },
      ],
      [...TIERS, { afb_tiersid: T2, afb_emailcontactprincipal: ' Jean@socapalm.cm ' }],
      MAINTENANT,
    );
    expect(lignes).toHaveLength(1);
    expect(lignes[0].email).toBe('jean@socapalm.cm');
    expect(lignes[0].canaux).toEqual(['contact', 'identite-externe', 'email-principal']);
    expect(lignes[0].compteB2cCree).toBe(true);
    expect(lignes[0].compteB2cId).toBe('b1');
    expect(lignes[0].invitation).toBe('2026-05-01T00:00:00Z');
  });

  it('privilégie la fiche Contact qui porte une trace de connexion', () => {
    const lignes = agregerAcces(
      [
        contact({ contactid: 'muet', adx_identity_lastsuccessfullogin: undefined, fullname: '' }),
        contact({ contactid: 'actif', adx_identity_lastsuccessfullogin: '2026-08-19T07:00:00Z' }),
      ],
      [],
      TIERS,
      MAINTENANT,
    );
    expect(lignes[0].contactId).toBe('actif');
    expect(lignes[0].derniereConnexion).toBe('2026-08-19T07:00:00Z');
    // Le nom vient de la première fiche qui en porte un.
    expect(lignes[0].nom).toBe('Jean Eboa');
  });

  it('conserve la première fiche quand aucune n’a de trace de connexion', () => {
    const lignes = agregerAcces(
      [
        contact({ contactid: 'un', adx_identity_lastsuccessfullogin: undefined }),
        contact({ contactid: 'deux', adx_identity_lastsuccessfullogin: undefined }),
      ],
      [],
      TIERS,
      MAINTENANT,
    );
    expect(lignes[0].contactId).toBe('un');
  });

  it('laisse le nom vide quand aucune fiche n’en porte', () => {
    const lignes = agregerAcces([contact({ fullname: undefined })], [], TIERS, MAINTENANT);
    expect(lignes[0].nom).toBeUndefined();
  });

  it('ignore les enregistrements sans adresse exploitable', () => {
    const lignes = agregerAcces(
      [contact({ emailaddress1: undefined }), contact({ emailaddress1: '   ' })],
      [{ afb_tiersexterneb2cid: 'b1' }],
      [
        { afb_tiersid: T1, afb_nomdupartenaire: 'SOCAPALM SA' },
        { afb_tiersid: '', afb_emailcontactprincipal: 'orphelin@x.cm' },
      ],
      MAINTENANT,
    );
    expect(lignes).toHaveLength(0);
  });

  it('garde la première identité externe en cas de doublon', () => {
    const lignes = agregerAcces(
      [],
      [
        { afb_tiersexterneb2cid: 'b1', afb_emaildauthentification: 'x@y.cm', _afb_nomdutiers_value: T1 },
        { afb_tiersexterneb2cid: 'b2', afb_emaildauthentification: 'x@y.cm' },
      ],
      TIERS,
      MAINTENANT,
    );
    expect(lignes[0].compteB2cId).toBe('b1');
  });

  it('nomme les entreprises absentes du référentiel', () => {
    const lignes = agregerAcces(
      [contact({ _afb_tiers_value: 'inconnu' })],
      [],
      [{ afb_tiersid: T1, afb_nomdupartenaire: 'SOCAPALM SA' }],
      MAINTENANT,
    );
    expect(lignes[0].entreprises[0].nom).toBe('Entreprise inconnue');
  });

  it('nomme les entreprises sans raison sociale', () => {
    const lignes = agregerAcces(
      [contact({ _afb_tiers_value: T1 })],
      [],
      [{ afb_tiersid: T1, afb_emailcontactprincipal: 'jean@socapalm.cm' }],
      MAINTENANT,
    );
    expect(lignes[0].entreprises[0].nom).toBe('Entreprise sans nom');
  });

  it('nomme aussi les entreprises inconnues venues d’une identité externe', () => {
    const lignes = agregerAcces(
      [],
      [
        {
          afb_tiersexterneb2cid: 'b1',
          afb_emaildauthentification: 'x@y.cm',
          _afb_nomdutiers_value: 'tiers-supprime',
        },
      ],
      TIERS,
      MAINTENANT,
    );
    expect(lignes[0].entreprises[0].nom).toBe('Entreprise inconnue');
  });

  it('remonte un contact sans entreprise rattachée', () => {
    const lignes = agregerAcces([contact({ _afb_tiers_value: undefined })], [], TIERS, MAINTENANT);
    expect(lignes[0].entreprises).toHaveLength(0);
    expect(lignes[0].diagnostic.code).toBe('tiers-non-rattache');
  });

  it('reprend le compteur d’échecs de l’identité externe faute de fiche Contact', () => {
    const lignes = agregerAcces(
      [],
      [
        {
          afb_tiersexterneb2cid: 'b1',
          afb_emaildauthentification: 'x@y.cm',
          _afb_nomdutiers_value: T1,
          afb_nombredetentativesechouees: 3,
          afb_derniereconnexion: '2026-08-01T00:00:00Z',
          afb_identifiantb2c: 'azure',
          afb_datedinvitation: '2026-07-01T00:00:00Z',
        },
      ],
      TIERS,
      MAINTENANT,
    );
    expect(lignes[0].tentatives).toBe(3);
    expect(lignes[0].derniereConnexion).toBe('2026-08-01T00:00:00Z');
  });

  it('retombe à zéro quand aucune source ne compte les échecs', () => {
    const lignes = agregerAcces(
      [],
      [],
      [{ afb_tiersid: T1, afb_nomdupartenaire: 'SOCAPALM SA', afb_emailcontactprincipal: 'a@b.cm' }],
      MAINTENANT,
    );
    expect(lignes[0].tentatives).toBe(0);
    expect(lignes[0].diagnostic.code).toBe('aucun-compte-portail');
  });

  it('trie les lignes par adresse', () => {
    const lignes = agregerAcces(
      [contact({ emailaddress1: 'zoe@x.cm' }), contact({ contactid: 'c2', emailaddress1: 'ana@x.cm' })],
      [],
      TIERS,
      MAINTENANT,
    );
    expect(lignes.map((l) => l.email)).toEqual(['ana@x.cm', 'zoe@x.cm']);
  });

  it('utilise l’horloge système par défaut', () => {
    expect(agregerAcces([contact()], [], TIERS)).toHaveLength(1);
  });

  it('libelle les trois canaux', () => {
    expect(Object.keys(CANAL_LABEL)).toHaveLength(3);
  });
});
