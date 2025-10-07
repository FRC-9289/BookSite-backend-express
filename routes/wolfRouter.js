import { Router } from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";
import { studentPOST, studentGET } from "../controllers/wolf.js";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get("/student-get", authMiddleware, studentGET);
router.post("/student-post", authMiddleware, upload.fields([
  { name: "file1", maxCount: 1 },
  { name: "file2", maxCount: 1 },
  { name: "file3", maxCount: 1 }
]), studentPOST);

export default router;