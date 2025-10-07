
import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getStudentByEmail } from "../controllers/submissions/submission.js";

const router = Router();


router.get('/students',authMiddleware, getStudentByEmail);

export default router;
