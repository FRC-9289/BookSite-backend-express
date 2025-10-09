import { Router } from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";
import { studentPOST, studentGET, roomGET, roomsGET } from "../controllers/controller.js";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get("/student-get", authMiddleware, studentGET);
router.post("/student-post", authMiddleware, upload.fields([
  { name: "file1", maxCount: 1 },
  { name: "file2", maxCount: 1 },
  { name: "file3", maxCount: 1 }
]), studentPOST);

router.get("/room-get", authMiddleware, roomGET);
router.get("/rooms-get", authMiddleware, roomsGET);

export default router;
