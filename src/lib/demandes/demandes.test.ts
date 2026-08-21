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
