/**
 * Tests du type affiché d'un tiers.
 *
 * L'ancienne règle — direction porteuse DMG = Fournisseur — classait tout le
 * monde en « Partenaire », puisque la création de dossier écrit toujours DCONF.
 * Ces tests verrouillent la nouvelle : elle lit la famille d'institution, et
 * retombe sur « Partenaire » plutôt que de se taire quand le référentiel est
 * illisible.
 */
import { describe, expect, it } from 'vitest';
import { FAMILLE } from '@/lib/entity-types';
import {
  indexerFamilles,
  STATUT_CIBLE,
  typeDuTiers,
  type TypePartenaire,
} from './typeTiers';

const BANQUE = 'pt-banque';
const SARL = 'pt-sarl';
const EMF = 'pt-emf';

const TYPES: TypePartenaire[] = [
  { afb_partnertypeid: BANQUE, afb_familledinstitution: FAMILLE.BanqueCorrespondante },
  { afb_partnertypeid: EMF, afb_familledinstitution: FAMILLE.EMF },
  { afb_partnertypeid: SARL, afb_familledinstitution: FAMILLE.SocieteCommerciale },
];

const INDEX = indexerFamilles(TYPES);

describe('indexerFamilles', () => {
  it('indexe les types exploitables', () => {
    expect(INDEX.get(BANQUE)).toBe(FAMILLE.BanqueCorrespondante);
    expect(INDEX.size).toBe(3);
  });

  it('écarte les enregistrements incomplets', () => {
    const index = indexerFamilles([
      { afb_partnertypeid: undefined, afb_familledinstitution: FAMILLE.EMF },
      { afb_partnertypeid: 'x', afb_familledinstitution: undefined },
    ]);
    expect(index.size).toBe(0);
  });
});

describe('typeDuTiers', () => {
  it('range les contreparties financières en Partenaire', () => {
    expect(typeDuTiers({ _afb_typejuridique_value: BANQUE }, INDEX)).toBe('Partenaire');
    expect(typeDuTiers({ _afb_typejuridique_value: EMF }, INDEX)).toBe('Partenaire');
  });

  it('range le reste en Fournisseur', () => {
    expect(typeDuTiers({ _afb_typejuridique_value: SARL }, INDEX)).toBe('Fournisseur');
  });

  it('fait primer le statut Cible sur la nature de l’entité', () => {
    // Une cible est un état d'avancement, pas un type d'entité : elle prime.
    expect(
      typeDuTiers({ afb_statutdutiers: STATUT_CIBLE, _afb_typejuridique_value: SARL }, INDEX),
    ).toBe('Cible');
  });

  it('retombe sur Partenaire quand le référentiel est illisible', () => {
    expect(typeDuTiers({ _afb_typejuridique_value: 'inconnu' }, INDEX)).toBe('Partenaire');
    expect(typeDuTiers({ _afb_typejuridique_value: undefined }, INDEX)).toBe('Partenaire');
    expect(typeDuTiers({}, new Map())).toBe('Partenaire');
  });

  it('n’interprète pas un autre statut comme une cible', () => {
    expect(typeDuTiers({ afb_statutdutiers: 0, _afb_typejuridique_value: SARL }, INDEX)).toBe(
      'Fournisseur',
    );
  });
});
