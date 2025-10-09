import express from "express";
import "./db/db.js"; // MongoDB connection
import wolfRoutes from "./routes/Router.js";
import cors from "cors";

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

app.use(express.json());

app.use('/api', wolfRoutes)

app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is healthy" });
});

const server = app.listen(8000, () => {
  const port = server.address().port;
  console.log(`Server running on http://localhost:${port}`);
});