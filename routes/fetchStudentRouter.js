import { Router } from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";
import { fetchStudentSubmissions, postSubmissions } from "../controllers/submissions/submission.js";

const router = Router();

// Use memory storage
const upload = multer({ storage: multer.memoryStorage() });

router.get("/fetchStudentSubmissions", authMiddleware, fetchStudentSubmissions);
// POST /post-students
router.post("/post-students", authMiddleware, upload.any(), postSubmissions);

export default router;