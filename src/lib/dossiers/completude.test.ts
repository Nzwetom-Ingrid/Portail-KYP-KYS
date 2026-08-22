/**
 * Tests de la règle de complétude.
 *
 * Cette règle décide si une décision de conformité peut être prise. Un faux
 * « validable » laisserait valider un dossier auquel il manque le registre du
 * commerce ; un faux blocage pousserait à contourner la règle. Les deux sont
 * verrouillés ici, y compris les valeurs de remplissage (« — ») que les écrans
 * affichent à la place d'un champ vide et qui trompaient l'œil.
 */
import { describe, expect, it } from 'vitest';
import {
  CHAMPS_REQUIS,
  evaluerCompletude,
  motifDeBlocage,
  type DossierAControler,
  type PieceAttendue,
} from './completude';

function dossier(p: Partial<DossierAControler> = {}): DossierAControler {
  return {
    entite: 'SOCAPALM SA',
    pays: 'Cameroun',
    email: 'contact@socapalm.cm',
    onboarding: { rccm: 'RC/DLA/2019/B/123' },
    ...p,
  };
}

function piece(p: Partial<PieceAttendue> = {}): PieceAttendue {
  return { key: 'rccm', name: 'Registre du commerce (RCCM)', mandatory: true, fourni: true, ...p };
}

describe('evaluerCompletude', () => {
  it('valide un dossier dont tout est renseigné et fourni', () => {
    const c = evaluerCompletude(dossier(), [piece()]);
    expect(c.validable).toBe(true);
    expect(c.champsManquants).toEqual([]);
    expect(c.piecesManquantes).toEqual([]);
    expect(motifDeBlocage(c)).toBeNull();
  });

  it('bloque sur une pièce obligatoire absente', () => {
    const c = evaluerCompletude(dossier(), [piece({ fourni: false })]);
    expect(c.validable).toBe(false);
    expect(c.piecesManquantes).toEqual(['Registre du commerce (RCCM)']);
    expect(c.piecesFournies).toBe(0);
    expect(c.piecesAttendues).toBe(1);
  });

  it('ignore les pièces facultatives', () => {
    // La checklist est éditable à la création : ce que le chargé de relation a
    // décoché ne doit pas revenir bloquer la validation.
    const c = evaluerCompletude(dossier(), [
      piece(),
      piece({ key: 'rib', name: 'RIB', mandatory: false, fourni: false }),
    ]);
    expect(c.validable).toBe(true);
    expect(c.piecesAttendues).toBe(1);
  });

  it('bloque sur chacun des champs d’identité requis', () => {
    expect(evaluerCompletude(dossier({ entite: '' }), []).champsManquants).toEqual(['Raison sociale']);
    expect(evaluerCompletude(dossier({ pays: undefined }), []).champsManquants).toEqual(['Pays']);
    expect(evaluerCompletude(dossier({ email: '' }), []).champsManquants).toEqual([
      'E-mail de contact principal',
    ]);
    expect(evaluerCompletude(dossier({ onboarding: {} }), []).champsManquants).toEqual([
      'Numéro RCCM / immatriculation',
    ]);
  });

  it('traite l’absence totale de fiche d’onboarding', () => {
    const c = evaluerCompletude(dossier({ onboarding: undefined }), []);
    expect(c.champsManquants).toEqual(['Numéro RCCM / immatriculation']);
  });

  it('ne se laisse pas tromper par les tirets de remplissage', () => {
    // Les écrans affichent « — » à la place d'un champ vide ; cette valeur
    // remontait jusqu'ici et passait pour une saisie.
    expect(evaluerCompletude(dossier({ pays: '—' }), []).champsManquants).toEqual(['Pays']);
    expect(evaluerCompletude(dossier({ pays: '-' }), []).champsManquants).toEqual(['Pays']);
    expect(evaluerCompletude(dossier({ pays: '   ' }), []).champsManquants).toEqual(['Pays']);
  });

  it('n’exige ni ville, ni téléphone, ni secteur', () => {
    const c = evaluerCompletude(
      dossier({ onboarding: { rccm: 'RC/1', ville: '', telephone: '', secteur: '' } }),
      [],
    );
    expect(c.validable).toBe(true);
  });

  it('accepte un dossier sans aucune pièce attendue', () => {
    const c = evaluerCompletude(dossier(), []);
    expect(c.validable).toBe(true);
    expect(c.piecesAttendues).toBe(0);
  });

  it('cumule pièces et champs manquants', () => {
    const c = evaluerCompletude(dossier({ email: '', pays: '' }), [
      piece({ fourni: false }),
      piece({ key: 'statuts', name: 'Statuts', fourni: false }),
    ]);
    expect(c.piecesManquantes).toHaveLength(2);
    expect(c.champsManquants).toHaveLength(2);
    expect(c.validable).toBe(false);
  });
});

describe('motifDeBlocage', () => {
  it('nomme la pièce unique qui manque', () => {
    const c = evaluerCompletude(dossier(), [piece({ fourni: false })]);
    expect(motifDeBlocage(c)).toBe(
      'Validation impossible — pièce obligatoire manquante : Registre du commerce (RCCM).',
    );
  });

  it('compte et énumère au-delà d’une pièce', () => {
    const c = evaluerCompletude(dossier(), [
      piece({ fourni: false }),
      piece({ key: 'statuts', name: 'Statuts', fourni: false }),
    ]);
    expect(motifDeBlocage(c)).toContain('2 pièces obligatoires manquantes');
    expect(motifDeBlocage(c)).toContain('Statuts');
  });

  it('nomme le champ unique qui manque', () => {
    const c = evaluerCompletude(dossier({ email: '' }), []);
    expect(motifDeBlocage(c)).toBe(
      'Validation impossible — champ non renseigné : E-mail de contact principal.',
    );
  });

  it('énumère les champs au-delà d’un', () => {
    const c = evaluerCompletude(dossier({ email: '', pays: '' }), []);
    expect(motifDeBlocage(c)).toContain('champs non renseignés');
  });

  it('joint les deux familles de manques', () => {
    const c = evaluerCompletude(dossier({ email: '' }), [piece({ fourni: false })]);
    const m = motifDeBlocage(c) ?? '';
    expect(m).toContain('pièce obligatoire manquante');
    expect(m).toContain(' ; ');
    expect(m).toContain('champ non renseigné');
  });
});

describe('CHAMPS_REQUIS', () => {
  it('ne retient que les quatre champs identifiants', () => {
    expect(CHAMPS_REQUIS.map((c) => c.cle)).toEqual(['entite', 'pays', 'rccm', 'email']);
  });
});
