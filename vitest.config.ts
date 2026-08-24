/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import * as path from 'path';

/**
 * Configuration des tests — charte AFB_PS03 § 22.
 *
 * Séparée de vite.config.ts pour que la configuration de build reste lisible et
 * que les tests n'embarquent ni Tailwind ni le plugin React, inutiles ici : les
 * modules couverts sont des règles métier pures, sans rendu.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Ne mesurer que ce qui est réellement couvrable : le code généré et les
      // écrans ne sont pas encore testés, les inclure produirait un pourcentage
      // trompeur qui masquerait la couverture réelle des règles métier.
      include: ['src/lib/support/**/*.ts', 'src/lib/demandes/**/*.ts', 'src/lib/dossiers/**/*.ts', 'src/lib/tiers/**/*.ts', 'src/types/roles.ts'],
      thresholds: {
        // § 22.1 : 100 % exigé sur les modules portant une règle d'habilitation
        // ou une validation réglementaire. C'est précisément le périmètre inclus
        // ci-dessus — le seuil global du projet (80 %) s'appliquera quand la
        // couverture sera étendue aux écrans.
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
