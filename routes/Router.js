import { Router } from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";
import { postStudent, getStudentByGrade, getRoom, getRoomsSubmissions, manageStatus, getSubmissions, sendEmailNotification, addComment, createGradeConfigEndpoint, getGradeConfigEndpoint} from "../controllers/Student/controller.js";

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

router.post("/add-comment", authMiddleware, addComment);
router.post("/create-grade-config", authMiddleware, createGradeConfigEndpoint);
router.get("/get-grade-config", authMiddleware, getGradeConfigEndpoint);

export default router;
