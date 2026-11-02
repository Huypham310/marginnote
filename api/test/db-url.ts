// same postgres as docker compose (port 5433), separate database so dev data is never touched
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://marginnote:marginnote@localhost:5433/marginnote_test";
