import { Router } from "express";
import { manageStatus, getSubmissions } from "./controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = new Router();

// Update status of a submission (approve, deny, pending) by ID
router.patch("/manage-status", authMiddleware, manageStatus);

// Get all submissions (for admin view)
router.get("/submissions", authMiddleware, getSubmissions);

export default router;