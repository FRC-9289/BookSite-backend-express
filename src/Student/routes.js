// src/features/student/student.routes.js

import { Router } from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";

import {
  postStudent,
  getStudentByGrade,
  getRoom,
  getRoomsSubmissions
} from "./controller.js";

const router = Router();

// Use memory storage for in-memory file handling
const upload = multer({ storage: multer.memoryStorage() });

// Routes

// Get a student's submission data by grade/email
router.get("/student-get", authMiddleware, getStudentByGrade);

// Submit student data + PDFs
router.post("/student-post",authMiddleware, upload.fields([
    { name: "file1", maxCount: 1 },
    { name: "file2", maxCount: 1 },
    { name: "file3", maxCount: 1 }
  ]), postStudent);

// Get students in a specific room
router.get("/room-get", authMiddleware, getRoom);

// Get all rooms for a given grade
router.get("/rooms-get", authMiddleware, getRoomsSubmissions);

export default router;
