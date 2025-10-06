import express from "express";
import "./db/db.js"; // MongoDB connection
import userRoutes from "./routes/users.js";
import submissionRoutes from "./routes/fetchStudentRouter.js";

const app = express();

app.use(express.json());

app.use("/users", userRoutes);
app.use("/submissions", submissionRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is healthy" });
});

const server = app.listen(8000, () => {
  const port = server.address().port;
  console.log(`Server running on http://localhost:${port}`);
});
