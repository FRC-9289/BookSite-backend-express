// fetchStudentRouter.js
import { Router } from "express";
import fetchStudentSubmissions from "../controllers/submissions/fetchStudents.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

// GET /submissions/fetchStudentSubmissions?email=...
router.get("/fetchStudentSubmissions", authMiddleware, fetchStudentSubmissions);

export default router;
