import { Router } from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";
import { getAllSubmissions, getStudentSubmissions, postSubmissions } from "../controllers/submissions/submission.js";
import { fetchStudentByEmail } from "../db/dbFunctions.js";

const router = Router();

// Use memory storage
const upload = multer({ storage: multer.memoryStorage() });

router.get('/',authMiddleware, getAllSubmissions);

router.get("/fetchStudentSubmissions", authMiddleware, getStudentSubmissions);
// POST /post-students
router.post("/post-students", authMiddleware, upload.any(), postSubmissions);




export default router;