/**
 * Diagnostic d'accès partenaire — charte AFB_PS03 § 22.1.
 *
 * L'ordre des règles est une décision métier : on renvoie toujours la cause la
 * plus en amont, celle qu'il faut traiter en premier. Les tests de priorité
 * ci-dessous verrouillent cet ordre, qu'un simple déplacement de bloc casserait.
 */
import { describe, expect, it } from 'vitest';
import {
  compterParSeverite,
  diagnostiquer,
  INVITATION_VALIDITE_HEURES,
  STATUT_COMPTE,
  TENTATIVES_AVANT_BLOCAGE,
  type CompteExterne,
  type Diagnostic,
} from './accessDiagnostic';

const MAINTENANT = new Date('2026-08-19T12:00:00Z');
/** Horodatage situé n heures avant l'instant de référence. */
const ilYA = (heures: number) =>
  new Date(MAINTENANT.getTime() - heures * 3_600_000).toISOString();

/** Compte sain : chaque test ne dégrade qu'un aspect à la fois. */
const compteSain: CompteExterne = {
  _afb_nomdutiers_value: 'guid-tiers',
  afb_statutducompte: STATUT_COMPTE.actif,
  afb_emaildauthentification: 'contact@partenaire.cm',
  afb_identifiantb2c: 'b2c-0001',
  afb_datedinvitation: ilYA(200),
  afb_derniereconnexion: ilYA(3),
  afb_nombredetentativesechouees: 0,
};

const codeDe = (patch: Partial<CompteExterne>) =>
  diagnostiquer({ ...compteSain, ...patch }, MAINTENANT).code;

describe('cas nominal', () => {
  it('ne signale rien sur un compte qui fonctionne', () => {
    const d = diagnostiquer(compteSain, MAINTENANT);
    expect(d.code).toBe('ok');
    expect(d.severite).toBe('ok');
  });

  it('utilise l’heure courante par défaut', () => {
    // Garantit que le paramètre `maintenant` est bien optionnel en production.
    expect(diagnostiquer(compteSain).code).toBe('ok');
  });
});

describe('détection de chaque situation', () => {
  it('signale un tiers non rattaché', () => {
    expect(codeDe({ _afb_nomdutiers_value: undefined })).toBe('tiers-non-rattache');
  });

  it('signale un compte désactivé', () => {
    expect(codeDe({ afb_statutducompte: STATUT_COMPTE.desactive })).toBe('compte-desactive');
  });

  it('signale un compte bloqué par son statut', () => {
    expect(codeDe({ afb_statutducompte: STATUT_COMPTE.bloque })).toBe('compte-bloque');
  });

  it('signale un compte bloqué par le nombre de tentatives', () => {
    expect(codeDe({ afb_nombredetentativesechouees: TENTATIVES_AVANT_BLOCAGE })).toBe(
      'compte-bloque',
    );
  });

  it('laisse passer un nombre de tentatives encore sous le seuil', () => {
    expect(codeDe({ afb_nombredetentativesechouees: TENTATIVES_AVANT_BLOCAGE - 1 })).toBe('ok');
  });

  it('traite un compteur de tentatives absent comme zéro', () => {
    // Dataverse ne renvoie pas les colonnes numériques jamais renseignées.
    expect(codeDe({ afb_nombredetentativesechouees: undefined })).toBe('ok');
  });

  it('signale une invitation jamais envoyée', () => {
    expect(codeDe({ afb_datedinvitation: undefined })).toBe('invitation-jamais-envoyee');
  });

  it('signale une inscription non finalisée tant que le lien court', () => {
    expect(
      codeDe({
        afb_identifiantb2c: undefined,
        afb_datedinvitation: ilYA(INVITATION_VALIDITE_HEURES - 1),
        afb_derniereconnexion: undefined,
      }),
    ).toBe('inscription-inachevee');
  });

  it('signale une invitation expirée passé le délai de validité', () => {
    expect(
      codeDe({
        afb_identifiantb2c: undefined,
        afb_datedinvitation: ilYA(INVITATION_VALIDITE_HEURES + 1),
        afb_derniereconnexion: undefined,
      }),
    ).toBe('invitation-expiree');
  });

  it('traite la limite exacte de validité comme non expirée', () => {
    expect(
      codeDe({
        afb_identifiantb2c: undefined,
        afb_datedinvitation: ilYA(INVITATION_VALIDITE_HEURES),
        afb_derniereconnexion: undefined,
      }),
    ).toBe('inscription-inachevee');
  });

  it('signale un compte créé mais jamais utilisé', () => {
    expect(codeDe({ afb_derniereconnexion: undefined })).toBe('jamais-connecte');
  });

  it('tolère une date d’invitation illisible sans planter', () => {
    expect(
      codeDe({
        afb_identifiantb2c: undefined,
        afb_datedinvitation: 'pas-une-date',
        afb_derniereconnexion: undefined,
      }),
    ).toBe('inscription-inachevee');
  });
});

describe('priorité entre causes', () => {
  // Un compte cumulant plusieurs anomalies ne doit renvoyer que la plus en amont :
  // inutile d'envoyer le support relancer une invitation si le compte est désactivé.
  it('place l’absence de tiers avant toute autre cause', () => {
    expect(
      codeDe({
        _afb_nomdutiers_value: undefined,
        afb_statutducompte: STATUT_COMPTE.desactive,
        afb_datedinvitation: undefined,
      }),
    ).toBe('tiers-non-rattache');
  });

  it('place la désactivation avant le blocage', () => {
    expect(
      codeDe({
        afb_statutducompte: STATUT_COMPTE.desactive,
        afb_nombredetentativesechouees: 99,
      }),
    ).toBe('compte-desactive');
  });

  it('place le blocage avant l’absence d’invitation', () => {
    expect(
      codeDe({ afb_statutducompte: STATUT_COMPTE.bloque, afb_datedinvitation: undefined }),
    ).toBe('compte-bloque');
  });
});

describe('qualité des messages rendus au support', () => {
  const tousLesCas: Partial<CompteExterne>[] = [
    { _afb_nomdutiers_value: undefined },
    { afb_statutducompte: STATUT_COMPTE.desactive },
    { afb_statutducompte: STATUT_COMPTE.bloque },
    { afb_datedinvitation: undefined },
    { afb_identifiantb2c: undefined, afb_datedinvitation: ilYA(1), afb_derniereconnexion: undefined },
    { afb_identifiantb2c: undefined, afb_datedinvitation: ilYA(500), afb_derniereconnexion: undefined },
    { afb_derniereconnexion: undefined },
    {},
  ];

  it('renseigne systématiquement libellé, symptôme et action', () => {
    for (const patch of tousLesCas) {
      const d = diagnostiquer({ ...compteSain, ...patch }, MAINTENANT);
      expect(d.libelle.trim(), d.code).not.toBe('');
      expect(d.symptome.trim(), d.code).not.toBe('');
      expect(d.action.trim(), d.code).not.toBe('');
    }
  });

  it('marque comme bloquant tout ce qui empêche réellement l’accès', () => {
    const bloquants = ['tiers-non-rattache', 'compte-desactive', 'compte-bloque', 'invitation-jamais-envoyee', 'invitation-expiree'];
    for (const patch of tousLesCas) {
      const d = diagnostiquer({ ...compteSain, ...patch }, MAINTENANT);
      if (bloquants.includes(d.code)) expect(d.severite, d.code).toBe('bloquant');
    }
  });
});

describe('compterParSeverite', () => {
  it('renvoie tous les compteurs à zéro sur une liste vide', () => {
    expect(compterParSeverite([])).toEqual({ bloquant: 0, attention: 0, info: 0, ok: 0 });
  });

  it('additionne par sévérité', () => {
    const faux = (severite: Diagnostic['severite']) => ({ severite }) as Diagnostic;
    expect(compterParSeverite([faux('bloquant'), faux('bloquant'), faux('ok')])).toEqual({
      bloquant: 2,
      attention: 0,
      info: 0,
      ok: 1,
    });
  });
});
