import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import wolfRoutes from "./routes/wolfRouter.js";
import cors from "cors";

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));
app.use(express.json());

app.use("/api/wolf", wolfRoutes);
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is healthy" });
});

const mongoURL = process.env.MONGO_URL;

mongoose.connect(mongoURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on("connected", () => {
  console.log("MongoDB connected");

  const server = app.listen(8000, () => {
    const port = server.address().port;
    console.log(`Server running on http://localhost:${port}`);
  });
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
  process.exit(1);
});
//Wolfram121