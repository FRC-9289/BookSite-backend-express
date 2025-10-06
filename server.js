import express from "express";
import "./db/db.js";
import userRoutes from "./routes/users.js";
import submissionRoutes from "./routes/fetchStudentRouter.js";
import studentRoutes from "./routes/studentRouter.js";
import roomsRoutes from "./routes/roomsRouter.js";
import cors from "cors";

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL, 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/rooms", roomsRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is healthy" });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});