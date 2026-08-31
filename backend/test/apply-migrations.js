import { beforeAll } from 'vitest';
import { env } from 'cloudflare:test';
import { applyD1Migrations } from 'cloudflare:test';

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});