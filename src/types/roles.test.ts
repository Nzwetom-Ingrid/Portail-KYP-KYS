/**
 * Matrice des habilitations — charte AFB_PS03 § 22.1 : couverture 100 % exigée
 * sur les modules portant une règle d'habilitation.
 *
 * Ces tests ne vérifient pas « le code fait ce qu'il fait ». Ils verrouillent des
 * décisions métier qui ont été prises explicitement, et qu'une modification
 * distraite du tableau des rôles ferait sauter sans bruit.
 */
import { describe, expect, it } from 'vitest';
import { DEMO_ROLES, hasPermission, type Permission, type Role } from './roles';

const role = (id: string): Role => {
  const r = DEMO_ROLES.find((x) => x.id === id);
  if (!r) throw new Error(`Rôle introuvable : ${id}`);
  return r;
};

describe('composition de la matrice', () => {
  it('expose exactement les cinq rôles de la réorganisation', () => {
    expect(DEMO_ROLES.map((r) => r.id)).toEqual([
      'super-admin',
      'admin-direction',
      'charge-kyc',
      'utilisateur-afb',
      'auditeur-externe',
    ]);
  });

  it('n’a aucun identifiant en double', () => {
    const ids = DEMO_ROLES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('donne à chaque rôle un libellé et une description non vides', () => {
    for (const r of DEMO_ROLES) {
      expect(r.label.trim()).not.toBe('');
      expect(r.description.trim()).not.toBe('');
    }
  });
});

describe('double validation des dossiers', () => {
  // Règle métier : le Chargé KYC PROPOSE une décision, l'Admin Direction la rend
  // effective. Le mécanisme repose entièrement sur l'absence de cette permission
  // — DossiersValidation teste can('dossiers.confirm') pour décider s'il écrit
  // le statut du dossier ou s'il enregistre une simple proposition.
  it('refuse à Chargé KYC la confirmation, tout en lui permettant de proposer', () => {
    const kyc = role('charge-kyc');
    expect(hasPermission(kyc, 'dossiers.validate')).toBe(true);
    expect(hasPermission(kyc, 'dossiers.reject')).toBe(true);
    expect(hasPermission(kyc, 'dossiers.confirm')).toBe(false);
  });

  it('réserve la confirmation à l’Admin Direction et au Super Admin', () => {
    const confirmateurs = DEMO_ROLES.filter((r) => hasPermission(r, 'dossiers.confirm')).map(
      (r) => r.id,
    );
    expect(confirmateurs).toEqual(['super-admin', 'admin-direction']);
  });
});

describe('rôles en lecture seule', () => {
  const ECRITURES: Permission[] = [
    'partners.create',
    'partners.edit',
    'partners.delete',
    'dossiers.validate',
    'dossiers.reject',
    'dossiers.confirm',
    'screening.run',
    'ubo.validate',
    'questionnaires.create',
    'questionnaires.assign',
    'users.create',
    'users.manage',
    'roles.create',
    'roles.manage',
    'admin.full',
  ];

  it.each(['utilisateur-afb', 'auditeur-externe'])('%s ne peut rien modifier', (id) => {
    const r = role(id);
    for (const p of ECRITURES) {
      expect(hasPermission(r, p), `${id} ne doit pas avoir ${p}`).toBe(false);
    }
  });

  it('donne à Auditeur externe exactement les droits d’un Utilisateur AFB', () => {
    // Décision assumée : les deux rôles sont distingués pour la traçabilité des
    // accès régulateur, pas par leurs droits. Si les listes divergent un jour,
    // c'est une décision à prendre, pas un effet de bord.
    expect([...role('auditeur-externe').permissions].sort()).toEqual(
      [...role('utilisateur-afb').permissions].sort(),
    );
  });

  it('leur laisse malgré tout la consultation', () => {
    for (const id of ['utilisateur-afb', 'auditeur-externe']) {
      expect(hasPermission(role(id), 'partners.view')).toBe(true);
      expect(hasPermission(role(id), 'dashboard.view')).toBe(true);
    }
  });
});

describe('hasPermission', () => {
  it('accorde tout au porteur de admin.full sans l’énumérer', () => {
    const su = role('super-admin');
    expect(su.permissions).toEqual(['admin.full']);
    expect(hasPermission(su, 'roles.manage')).toBe(true);
    expect(hasPermission(su, 'screening.run')).toBe(true);
    expect(hasPermission(su, 'partners.delete')).toBe(true);
  });

  it('s’en tient à la liste pour les autres rôles', () => {
    expect(hasPermission(role('charge-kyc'), 'users.manage')).toBe(false);
    expect(hasPermission(role('admin-direction'), 'screening.run')).toBe(false);
  });
});

describe('séparation des pouvoirs', () => {
  it('n’accorde la gestion des utilisateurs qu’aux niveaux 1 et 2', () => {
    for (const r of DEMO_ROLES) {
      if (hasPermission(r, 'users.manage')) {
        expect(r.level, `${r.id} gère les utilisateurs`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('ne laisse aucun rôle de niveau 3 confirmer une décision', () => {
    for (const r of DEMO_ROLES.filter((x) => x.level === 3)) {
      expect(hasPermission(r, 'dossiers.confirm'), `${r.id} confirme`).toBe(false);
    }
  });
});
