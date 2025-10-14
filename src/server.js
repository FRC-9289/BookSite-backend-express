import express from "express";
import "./utils/db/db.js"; // MongoDB connection
import studentRouter from './Student/routes.js';
import adminRouter from './Admin/routes.js';
import cors from "cors";

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  credentials: true,
}));

app.use(express.json());

app.use('/api/student', studentRouter);
app.use('/api/admin', adminRouter)

app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is healthy" });
});


const server = app.listen(8000, () => {
  const port = server.address().port;
  console.log(`Server running on http://localhost:${port}`);
});
