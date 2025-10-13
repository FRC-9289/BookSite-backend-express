import { Router } from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";
import { postStudent, getStudentByGrade, getRoom, getRoomsSubmissions, manageStatus, getSubmissions, sendEmailNotification} from "../controllers/Student/controller.js";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get("/student-get", authMiddleware, getStudentByGrade);
router.post("/student-post", authMiddleware, upload.fields([
  { name: "file1", maxCount: 1 },
  { name: "file2", maxCount: 1 },
  { name: "file3", maxCount: 1 }
]), postStudent);

router.get("/submissions", authMiddleware, getSubmissions);

router.get("/room-get", authMiddleware, getRoom);
router.get("/rooms-get", authMiddleware, getRoomsSubmissions);

router.patch("/manage-status",authMiddleware,manageStatus);

router.post("/send-email", authMiddleware, sendEmailNotification);

export default router;
