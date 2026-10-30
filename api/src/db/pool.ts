import pg from "pg";

// one shared pool per process; tests create their own with a different url
export function createPool(connectionString = process.env.DATABASE_URL): pg.Pool {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set (see api/.env.example)");
  }
  return new pg.Pool({ connectionString, max: 10 });
}
