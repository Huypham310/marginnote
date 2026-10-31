import { createApp } from "./app.js";
import { migrate } from "./db/migrate.js";
import { createPool } from "./db/pool.js";

const port = Number(process.env.PORT ?? 4000);
const pool = createPool();

// tự chạy migration lúc khởi động cho tiện, project nhỏ nên không cần bước deploy riêng
await migrate(pool);

const app = createApp({ pool, apiToken: process.env.API_TOKEN || undefined });
const server = app.listen(port, () => {
  console.log(`marginnote api on http://localhost:${port}`);
});

// close the pool on Ctrl+C / docker stop so connections don't linger
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => pool.end().then(() => process.exit(0)));
  });
}
