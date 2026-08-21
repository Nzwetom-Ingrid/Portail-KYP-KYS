/**
 * Tests de la vue par tiers.
 *
 * Le point sensible est le choix du diagnostic représentatif d'une entreprise :
 * c'est le MEILLEUR de ses accès, pas le pire. Une inversion ferait passer en
 * rouge des entreprises parfaitement servies, et noierait celles qui n'ont
 * réellement personne — l'inverse de ce que le support cherche.
 */
import { describe, expect, it } from 'vitest';
import { agregerParTiers, diagnostiquerTiers, SANS_ENTREPRISE } from './accesParTiers';
import type { AccesPortail, TiersMinimal } from './accesPortail';
import type { Diagnostic, Severite } from './accessDiagnostic';

const T1 = 'tiers-1';
const T2 = 'tiers-2';

function diag(severite: Severite): Diagnostic {
  return { code: 'ok', severite, libelle: severite, symptome: '', action: '' };
}

function personne(p: Partial<AccesPortail> = {}): AccesPortail {
  return {
    email: 'jean@x.cm',
    entreprises: [{ id: T1, nom: 'SOCAPALM SA' }],
    canaux: ['contact'],
    diagnostic: diag('ok'),
    tentatives: 0,
    compteB2cCree: false,
    ...p,
  };
}

const TIERS: TiersMinimal[] = [
  { afb_tiersid: T1, afb_nomdupartenaire: 'SOCAPALM SA', afb_pays: 'Cameroun' },
  { afb_tiersid: T2, afb_nomdupartenaire: 'ETS PROVIDENCE' },
];

describe('diagnostiquerTiers', () => {
  it('signale une entreprise sans aucun accès', () => {
    const d = diagnostiquerTiers([]);
    expect(d.code).toBe('aucun-acces');
    expect(d.severite).toBe('bloquant');
  });

  it('retient le meilleur état, pas le pire', () => {
    // Un collègue a bloqué son mot de passe ; l'entreprise reste servie.
    const d = diagnostiquerTiers([
      personne({ diagnostic: diag('bloquant') }),
      personne({ diagnostic: diag('ok') }),
    ]);
    expect(d.severite).toBe('ok');
  });

  it('conserve le premier quand le suivant n’est pas meilleur', () => {
    const d = diagnostiquerTiers([
      personne({ diagnostic: diag('info') }),
      personne({ diagnostic: diag('attention') }),
    ]);
    expect(d.severite).toBe('info');
  });
});

describe('agregerParTiers', () => {
  it('produit une ligne par tiers, même sans aucun accès', () => {
    const lignes = agregerParTiers([], TIERS);
    expect(lignes.map((l) => l.nom)).toEqual(['ETS PROVIDENCE', 'SOCAPALM SA']);
    expect(lignes.every((l) => l.diagnostic.code === 'aucun-acces')).toBe(true);
    expect(lignes[1].pays).toBe('Cameroun');
  });

  it('raccroche chaque personne à toutes ses entreprises', () => {
    const mandataire = personne({
      email: 'mandataire@x.cm',
      entreprises: [
        { id: T1, nom: 'SOCAPALM SA' },
        { id: T2, nom: 'ETS PROVIDENCE' },
      ],
    });
    const lignes = agregerParTiers([mandataire], TIERS);
    expect(lignes.every((l) => l.personnes.length === 1)).toBe(true);
    expect(lignes.every((l) => l.accesPartage)).toBe(true);
  });

  it('distingue un accès dédié d’un accès partagé', () => {
    const lignes = agregerParTiers([personne()], TIERS);
    const socapalm = lignes.find((l) => l.tiersId === T1);
    expect(socapalm?.accesPartage).toBe(false);
  });

  it('empile plusieurs personnes sur la même entreprise', () => {
    const lignes = agregerParTiers(
      [personne({ email: 'a@x.cm' }), personne({ email: 'b@x.cm' })],
      TIERS,
    );
    expect(lignes.find((l) => l.tiersId === T1)?.personnes).toHaveLength(2);
  });

  it('classe les personnes en difficulté en tête', () => {
    const lignes = agregerParTiers(
      [
        personne({ email: 'ok@x.cm', diagnostic: diag('ok') }),
        personne({ email: 'bloque@x.cm', diagnostic: diag('bloquant') }),
      ],
      TIERS,
    );
    const socapalm = lignes.find((l) => l.tiersId === T1);
    expect(socapalm?.personnes[0].email).toBe('bloque@x.cm');
    expect(socapalm?.bloquees).toBe(1);
  });

  it('retient la connexion la plus récente et le pire compteur d’échecs', () => {
    const lignes = agregerParTiers(
      [
        personne({ email: 'a@x.cm', derniereConnexion: '2026-01-01T00:00:00Z', tentatives: 4 }),
        personne({ email: 'b@x.cm', derniereConnexion: '2026-08-01T00:00:00Z', tentatives: 1 }),
      ],
      TIERS,
    );
    const socapalm = lignes.find((l) => l.tiersId === T1);
    expect(socapalm?.derniereConnexion).toBe('2026-08-01T00:00:00Z');
    expect(socapalm?.tentatives).toBe(4);
  });

  it('ignore les dates absentes ou illisibles', () => {
    const lignes = agregerParTiers(
      [
        personne({ email: 'a@x.cm', derniereConnexion: undefined }),
        personne({ email: 'b@x.cm', derniereConnexion: 'pas-une-date' }),
        personne({ email: 'c@x.cm', derniereConnexion: '2026-03-03T00:00:00Z' }),
      ],
      TIERS,
    );
    expect(lignes.find((l) => l.tiersId === T1)?.derniereConnexion).toBe('2026-03-03T00:00:00Z');
  });

  it('laisse la date vide quand aucune n’est exploitable', () => {
    const lignes = agregerParTiers([personne({ derniereConnexion: undefined })], TIERS);
    expect(lignes.find((l) => l.tiersId === T1)?.derniereConnexion).toBeUndefined();
  });

  it('rassemble les identités sans entreprise dans une ligne de tête', () => {
    const orpheline = personne({ email: 'perdu@x.cm', entreprises: [] });
    const lignes = agregerParTiers([orpheline], TIERS);
    expect(lignes[0].tiersId).toBe(SANS_ENTREPRISE);
    expect(lignes[0].nom).toBe('Sans entreprise rattachée');
    expect(lignes[0].personnes).toHaveLength(1);
  });

  it('nomme les tiers dépourvus de raison sociale', () => {
    const lignes = agregerParTiers([], [{ afb_tiersid: T1 }]);
    expect(lignes[0].nom).toBe('Entreprise sans nom');
  });

  it('écarte les enregistrements sans identifiant', () => {
    const lignes = agregerParTiers([], [{ afb_tiersid: '', afb_nomdupartenaire: 'Fantôme' }]);
    expect(lignes).toHaveLength(0);
  });
});
