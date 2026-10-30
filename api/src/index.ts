import cors from "cors";
import express from "express";

const app = express();
const port = Number(process.env.PORT ?? 4000);

// the extension calls the API from chrome-extension:// origins, so CORS stays open for now
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`marginnote api on http://localhost:${port}`);
});
