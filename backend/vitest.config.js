import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { fileURLToPath } from 'node:url';

const migrationsPath = fileURLToPath(new URL('./migrations', import.meta.url));

export default defineConfig(async () => {
  const migrations = await readD1Migrations(migrationsPath);
  return {
    test: {
      setupFiles: ['./test/apply-migrations.js']
    },
    plugins: [
      cloudflareTest({
        main: './src/index.js',
        miniflare: {
          bindings: {
            ADMIN_TOKEN: 'test-admin-token',
            ALLOWED_ORIGINS: 'http://localhost:8000,http://127.0.0.1:8000',
            TEST_MIGRATIONS: migrations
          },
          d1Databases: { DB: '00000000-0000-0000-0000-000000000001' }
        }
      })
    ]
  };
});