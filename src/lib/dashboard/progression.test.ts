import { describe, expect, it } from 'vitest';
import { construireProgression, type DossierDate } from './progression';

// Référence fixe : sans elle, la série glisserait d'un mois à chaque exécution.
const MAINTENANT = new Date(2026, 7, 20); // 20 août 2026

describe('construireProgression', () => {
  it('renvoie autant de points que de mois demandés, mois courant inclus', () => {
    const serie = construireProgression([], 8, MAINTENANT);
    expect(serie).toHaveLength(8);
    expect(serie[7].mois).toBe('Août');
    expect(serie[0].mois).toBe('Jan');
  });

  it('renvoie des zéros plutôt que rien quand la base est vide', () => {
    // Un graphique vide est honnête ; un graphique absent laisse croire à un bug.
    const serie = construireProgression([], 3, MAINTENANT);
    expect(serie.every((p) => p.recus === 0 && p.traites === 0)).toBe(true);
  });

  it('compte un dossier dans le mois de sa soumission', () => {
    const dossiers: DossierDate[] = [
      { afb_datedesoumission: '2026-08-03T10:00:00Z' },
      { afb_datedesoumission: '2026-08-28T10:00:00Z' },
      { afb_datedesoumission: '2026-07-15T10:00:00Z' },
    ];
    const serie = construireProgression(dossiers, 3, MAINTENANT);
    expect(serie.map((p) => p.recus)).toEqual([0, 1, 2]); // juin, juillet, août
  });

  it('retombe sur la date de création quand la soumission est absente', () => {
    const serie = construireProgression([{ createdon: '2026-08-05T10:00:00Z' }], 2, MAINTENANT);
    expect(serie[1].recus).toBe(1);
  });

  it('compte reçus et traités indépendamment', () => {
    // Un dossier reçu en juillet et validé en août pèse dans les deux mois,
    // sur deux courbes différentes : ce sont deux événements distincts.
    const serie = construireProgression(
      [{ afb_datedesoumission: '2026-07-10T10:00:00Z', afb_datededernierevalidation: '2026-08-02T10:00:00Z' }],
      3,
      MAINTENANT,
    );
    expect(serie[1]).toMatchObject({ recus: 1, traites: 0 }); // juillet
    expect(serie[2]).toMatchObject({ recus: 0, traites: 1 }); // août
  });

  it('ne confond pas le même mois de deux années différentes', () => {
    const serie = construireProgression([{ afb_datedesoumission: '2025-08-10T10:00:00Z' }], 8, MAINTENANT);
    expect(serie.every((p) => p.recus === 0)).toBe(true);
  });

  it('ignore les dates illisibles sans planter', () => {
    const serie = construireProgression(
      [{ afb_datedesoumission: 'pas-une-date' }, { afb_datedesoumission: null }, {}],
      2,
      MAINTENANT,
    );
    expect(serie.every((p) => p.recus === 0)).toBe(true);
  });

  it('n’oublie aucun mois même en partant d’un 31', () => {
    // Le 31 mars moins un mois donnerait le 3 mars : février serait sauté.
    const serie = construireProgression([], 3, new Date(2026, 2, 31));
    expect(serie.map((p) => p.mois)).toEqual(['Jan', 'Fév', 'Mar']);
  });
});
