import { Router } from "express";
import { manageStatus, getSubmissions, addComment, getComments, createGradeConfig, getGradeConfig, manageFileStatus } from "./controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = new Router();

// Update status of a submission (approve, deny, pending) by ID
router.patch("/manage-status", authMiddleware, manageStatus);

// Get all submissions (for admin view)
router.get("/submissions", authMiddleware, getSubmissions);

//Add comment
router.post("/add-comment", authMiddleware, addComment);

//Fetch comments
router.get("/get-comments", authMiddleware, getComments);

// Create grade config
router.post("/create-grade-config", authMiddleware, createGradeConfig);

// Get grade config
router.get("/get-grade-config", authMiddleware, getGradeConfig);

export default router;
