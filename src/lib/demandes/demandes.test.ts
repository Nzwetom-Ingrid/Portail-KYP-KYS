/**
 * Tests du regroupement des demandes.
 *
 * Le point sensible est le prédicat `estPieceJustificative` : c'est lui qui
 * empêche une demande de réapparaître dans la liste des pièces, des deux côtés
 * de l'application. Une régression ici remettrait « Demande de revue » entre
 * deux justificatifs, avec des boutons Valider / Rejeter dépourvus de sens.
 */
import { describe, expect, it } from 'vitest';
import {
  compterOuvertes,
  construireDemandes,
  estDemande,
  estPieceJustificative,
  estReponse,
  demandeVisee,
  marqueurReponse,
  construireDemandesTable,
  fusionnerDemandes,
  DEMANDE_DV,
  type LigneDemande,
  STATUT_DEMANDE,
  TYPE_DEMANDE,
  type DocumentBrut,
} from './demandes';

function demande(p: Partial<DocumentBrut> = {}): DocumentBrut {
  return {
    afb_documentid: 'd1',
    afb_typededocument: TYPE_DEMANDE.revue,
    afb_motifderejet: 'J’ai remplacé mes statuts.',
    afb_statutdevalidite: STATUT_DEMANDE.ouverte,
    afb_datedeteleversement: '2026-08-21T09:00:00Z',
    ...p,
  };
}

function reponse(p: Partial<DocumentBrut> = {}): DocumentBrut {
  return {
    afb_documentid: 'r1',
    afb_typededocument: marqueurReponse('d1'),
    afb_motifderejet: 'Dossier repris en revue ce jour.',
    afb_datedeteleversement: '2026-08-21T14:00:00Z',
    ...p,
  };
}

describe('prédicats', () => {
  it('reconnaît les deux types de demandes', () => {
    expect(estDemande(demande())).toBe(true);
    expect(estDemande(demande({ afb_typededocument: TYPE_DEMANDE.document }))).toBe(true);
    expect(estDemande({ afb_typededocument: 'rccm' })).toBe(false);
    expect(estDemande({})).toBe(false);
  });

  it('reconnaît une réponse du back-office', () => {
    expect(estReponse(reponse())).toBe(true);
    expect(estReponse(demande())).toBe(false);
    expect(estReponse({})).toBe(false);
  });

  it('écarte demandes, réponses et compléments de la liste des pièces', () => {
    expect(estPieceJustificative({ afb_typededocument: 'rccm' })).toBe(true);
    expect(estPieceJustificative(demande())).toBe(false);
    expect(estPieceJustificative(reponse())).toBe(false);
    expect(estPieceJustificative({ afb_typededocument: 'reponse:facture' })).toBe(false);
    // Un enregistrement sans type reste une pièce : c'est le cas des fiches
    // anciennes, déposées avant l'introduction des marqueurs.
    expect(estPieceJustificative({})).toBe(true);
  });
});

describe('construireDemandes', () => {
  it('rattache les réponses à leur demande', () => {
    const fils = construireDemandes([demande(), reponse()]);
    expect(fils).toHaveLength(1);
    expect(fils[0].reponses).toHaveLength(1);
    expect(fils[0].reponses[0].texte).toBe('Dossier repris en revue ce jour.');
  });

  it('classe les réponses dans l’ordre où elles ont été écrites', () => {
    const fils = construireDemandes([
      demande(),
      reponse({ afb_documentid: 'r2', afb_datedeteleversement: '2026-08-22T10:00:00Z', afb_motifderejet: 'seconde' }),
      reponse({ afb_documentid: 'r1', afb_datedeteleversement: '2026-08-21T14:00:00Z', afb_motifderejet: 'première' }),
    ]);
    expect(fils[0].reponses.map((r) => r.texte)).toEqual(['première', 'seconde']);
  });

  it('place la demande la plus récente en tête', () => {
    const fils = construireDemandes([
      demande({ afb_documentid: 'vieille', afb_datedeteleversement: '2026-01-01T00:00:00Z' }),
      demande({ afb_documentid: 'recente', afb_datedeteleversement: '2026-08-01T00:00:00Z' }),
    ]);
    expect(fils.map((f) => f.id)).toEqual(['recente', 'vieille']);
  });

  it('range les demandes sans date exploitable en dernier', () => {
    const fils = construireDemandes([
      demande({ afb_documentid: 'sansDate', afb_datedeteleversement: undefined, createdon: undefined }),
      demande({ afb_documentid: 'datee' }),
      demande({ afb_documentid: 'illisible', afb_datedeteleversement: 'pas-une-date' }),
    ]);
    expect(fils[0].id).toBe('datee');
    expect(fils.slice(1).map((f) => f.id).sort()).toEqual(['illisible', 'sansDate']);
  });

  it('se rabat sur createdon quand la date de dépôt manque', () => {
    const fils = construireDemandes([
      demande({ afb_datedeteleversement: undefined, createdon: '2026-07-07T08:00:00Z' }),
    ]);
    expect(fils[0].date).toBe('2026-07-07T08:00:00Z');
  });

  it('ignore une réponse orpheline ou dépourvue d’identifiant', () => {
    const fils = construireDemandes([
      demande(),
      // Marqueur tronqué : plus aucune demande visée.
      reponse({ afb_documentid: 'r9', afb_typededocument: 'reponse-demande:' }),
      reponse({ afb_documentid: undefined }),
    ]);
    expect(fils[0].reponses).toHaveLength(0);
  });

  it('extrait la demande visée du marqueur', () => {
    expect(demandeVisee({ afb_typededocument: marqueurReponse('abc') })).toBe('abc');
    expect(demandeVisee({ afb_typededocument: 'rccm' })).toBeUndefined();
    expect(demandeVisee({})).toBeUndefined();
  });

  it('écarte les enregistrements sans identifiant', () => {
    expect(construireDemandes([demande({ afb_documentid: undefined })])).toHaveLength(0);
  });

  it('nomme les demandes et reporte leur statut', () => {
    const fils = construireDemandes([
      demande({ afb_documentid: 'a', afb_statutdevalidite: STATUT_DEMANDE.traitee }),
      demande({ afb_documentid: 'b', afb_typededocument: TYPE_DEMANDE.document, afb_datedeteleversement: '2026-08-20T09:00:00Z' }),
    ]);
    expect(fils.find((f) => f.id === 'a')?.traitee).toBe(true);
    expect(fils.find((f) => f.id === 'a')?.libelle).toBe('Demande de revue du dossier');
    expect(fils.find((f) => f.id === 'b')?.libelle).toBe('Demande de document à la banque');
  });

  it('supporte un message vide', () => {
    const fils = construireDemandes([
      demande({ afb_motifderejet: undefined }),
    ]);
    expect(fils[0].message).toBe('');
  });

  it('conserve l’auteur d’une réponse quand il est connu', () => {
    const fils = construireDemandes([demande(), reponse({ owneridname: 'Patricia M.' })]);
    expect(fils[0].reponses[0].auteur).toBe('Patricia M.');
    const sansTexte = construireDemandes([demande(), reponse({ afb_motifderejet: undefined })]);
    expect(sansTexte[0].reponses[0].texte).toBe('');
  });
});

describe('compterOuvertes', () => {
  it('ne compte que les demandes non traitées', () => {
    const fils = construireDemandes([
      demande({ afb_documentid: 'a' }),
      demande({ afb_documentid: 'b', afb_statutdevalidite: STATUT_DEMANDE.traitee }),
    ]);
    expect(compterOuvertes(fils)).toBe(1);
  });
});

describe('construireDemandesTable', () => {
  function ligne(p: Partial<LigneDemande> = {}): LigneDemande {
    return {
      afb_demandederevueid: 'x1',
      afb_typededemande: DEMANDE_DV.type.revue,
      afb_messagedelademande: 'Mes statuts ont changé.',
      afb_statut: DEMANDE_DV.statut.ouverte,
      afb_datedemission: '2026-08-23T09:00:00Z',
      ...p,
    };
  }

  it('marque la provenance, pour savoir où répondre', () => {
    expect(construireDemandesTable([ligne()])[0].source).toBe('table');
    expect(construireDemandes([demande()])[0].source).toBe('document');
  });

  it('rattache les réponses par le lookup parent', () => {
    const fils = construireDemandesTable([
      ligne(),
      ligne({
        afb_demandederevueid: 'r1',
        _afb_demandeparente_value: 'x1',
        afb_messagedelademande: 'Dossier repris.',
        afb_auteurinternename: 'Patricia M.',
        afb_datedemission: '2026-08-23T14:00:00Z',
      }),
    ]);
    expect(fils).toHaveLength(1);
    expect(fils[0].reponses[0].texte).toBe('Dossier repris.');
    expect(fils[0].reponses[0].auteur).toBe('Patricia M.');
  });

  it('supporte une réponse sans texte ni date d’émission', () => {
    const fils = construireDemandesTable([
      ligne(),
      ligne({
        afb_demandederevueid: 'r1',
        _afb_demandeparente_value: 'x1',
        afb_messagedelademande: undefined,
        afb_datedemission: undefined,
        createdon: '2026-08-23T15:00:00Z',
      }),
    ]);
    expect(fils[0].reponses[0].texte).toBe('');
    expect(fils[0].reponses[0].date).toBe('2026-08-23T15:00:00Z');

    const sansDate = construireDemandesTable([
      ligne(),
      ligne({ afb_demandederevueid: 'r2', _afb_demandeparente_value: 'x1', afb_datedemission: undefined, createdon: undefined }),
    ]);
    expect(sansDate[0].reponses[0].date).toBeUndefined();
  });

  it('classe les réponses dans l’ordre où elles ont été écrites', () => {
    const fils = construireDemandesTable([
      ligne(),
      ligne({ afb_demandederevueid: 'b', _afb_demandeparente_value: 'x1', afb_messagedelademande: 'seconde', afb_datedemission: '2026-08-24T10:00:00Z' }),
      ligne({ afb_demandederevueid: 'a', _afb_demandeparente_value: 'x1', afb_messagedelademande: 'première', afb_datedemission: '2026-08-23T10:00:00Z' }),
    ]);
    expect(fils[0].reponses.map((r) => r.texte)).toEqual(['première', 'seconde']);
  });

  it('ignore une réponse orpheline ou sans identifiant', () => {
    const fils = construireDemandesTable([
      ligne(),
      ligne({ afb_demandederevueid: 'r9', _afb_demandeparente_value: undefined, afb_statut: DEMANDE_DV.statut.traitee }),
      ligne({ afb_demandederevueid: undefined, _afb_demandeparente_value: 'x1' }),
    ]);
    // La deuxième ligne n'a pas de parent : c'est une demande, pas une réponse.
    expect(fils).toHaveLength(2);
    expect(fils.find((f) => f.id === 'x1')?.reponses).toHaveLength(0);
  });

  it('considère traitée et classée sans suite comme réglées', () => {
    const traitee = construireDemandesTable([ligne({ afb_statut: DEMANDE_DV.statut.traitee })]);
    const classee = construireDemandesTable([ligne({ afb_statut: DEMANDE_DV.statut.classee })]);
    const enCours = construireDemandesTable([ligne({ afb_statut: DEMANDE_DV.statut.enCours })]);
    expect(traitee[0].traitee).toBe(true);
    expect(classee[0].traitee).toBe(true);
    expect(enCours[0].traitee).toBe(false);
  });

  it('nomme chaque type, et se rabat sur « Demande »', () => {
    expect(construireDemandesTable([ligne({ afb_typededemande: DEMANDE_DV.type.document })])[0].libelle)
      .toBe('Demande de document à la banque');
    expect(construireDemandesTable([ligne({ afb_typededemande: undefined })])[0].libelle).toBe('Demande');
    expect(construireDemandesTable([ligne({ afb_typededemande: 999 })])[0].libelle).toBe('Demande');
  });

  it('se rabat sur createdon, puis laisse la date vide', () => {
    expect(construireDemandesTable([ligne({ afb_datedemission: undefined, createdon: '2026-01-01T00:00:00Z' })])[0].date)
      .toBe('2026-01-01T00:00:00Z');
    expect(construireDemandesTable([ligne({ afb_datedemission: undefined, createdon: undefined })])[0].date)
      .toBeUndefined();
    expect(construireDemandesTable([ligne({ afb_messagedelademande: undefined })])[0].message).toBe('');
  });

  it('place la plus récente en tête', () => {
    const fils = construireDemandesTable([
      ligne({ afb_demandederevueid: 'vieille', afb_datedemission: '2026-01-01T00:00:00Z' }),
      ligne({ afb_demandederevueid: 'recente', afb_datedemission: '2026-08-01T00:00:00Z' }),
    ]);
    expect(fils.map((f) => f.id)).toEqual(['recente', 'vieille']);
  });
});

describe('fusionnerDemandes', () => {
  it('entrelace les deux sources par date', () => {
    const table = construireDemandesTable([
      { afb_demandederevueid: 'neuve', afb_datedemission: '2026-08-20T00:00:00Z' },
    ]);
    const docs = construireDemandes([
      demande({ afb_documentid: 'ancienne', afb_datedeteleversement: '2026-08-22T00:00:00Z' }),
    ]);
    expect(fusionnerDemandes(table, docs).map((d) => d.id)).toEqual(['ancienne', 'neuve']);
  });
});
