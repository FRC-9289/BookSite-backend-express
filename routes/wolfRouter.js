import { Router } from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";
import { studentGET, studentsGET, studentPOST, studentPATCH, roomGET, roomsGET, roomsPOST } from "../controllers/wolf.js";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get("/student-get", authMiddleware, studentGET);
router.get("/students-get", authMiddleware, studentsGET)
router.post("/student-post", authMiddleware, upload.fields([
  { name: "file1", maxCount: 1 },
  { name: "file2", maxCount: 1 },
  { name: "file3", maxCount: 1 }
]), studentPOST);
router.patch("/student-patch", authMiddleware, studentPATCH);

router.get("/room-get", authMiddleware, roomGET);
router.get("/rooms-get", authMiddleware, roomsGET);
router.post("/rooms-post", authMiddleware, roomsPOST);

export default router;
//Wolfram121