import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit does not read .env files; load api/.env when present (Node >= 20.12).
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://fellow:fellow@localhost:5432/fellow_owners',
  },
  strict: true,
  verbose: true,
});
