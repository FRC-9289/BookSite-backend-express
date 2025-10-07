import express from "express";
import "./db/db.js"; // MongoDB connection
import userRoutes from "./routes/users.js";
import submissionRoutes from "./routes/fetchStudentRouter.js";
import wolfRoutes from "./routes/wolfRouter.js";
import cors from "cors";

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,   // React frontend
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,  // if you’re sending cookies/auth
}));

app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/submissions", submissionRoutes);
app.use('/api/wolf', wolfRoutes)

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is healthy" });
});

const server = app.listen(8000, () => {
  const port = server.address().port;
  console.log(`Server running on http://localhost:${port}`);
});
