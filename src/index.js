import express from "express";

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || "127.0.0.1";

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello from Express" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/echo", (req, res) => {
  res.json({ body: req.body });
});

app.listen(port, host, () => {
  console.log(`API listening at http://${host}:${port}`);
});
