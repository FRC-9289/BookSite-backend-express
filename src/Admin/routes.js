import { Router } from "express";
import { manageStatus, getSubmissions, addComment } from "./controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = new Router();

// Update status of a submission (approve, deny, pending) by ID
router.patch("/manage-status", authMiddleware, manageStatus);

// Get all submissions (for admin view)
router.get("/submissions", authMiddleware, getSubmissions);

//Add comment
router.post("/add-comment", authMiddleware, addComment);

export default router;