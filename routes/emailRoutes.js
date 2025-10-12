import express from "express";
import { sendEmail } from "../controllers/sendMail.js";

const router = express.Router();

router.post("/sendMail", async (req, res) => {
  const { to, userName, status } = req.body;

  if (!to || !userName || !status) {
    return res.status(400).json({ success: false, message: "Missing required fields: 'to', 'userName', or 'status'." });
  }

  try {
    const subject = status === "rejected"
      ? "Rejection Notification"
      : "Approval Notification";

    const result = await sendEmail(to, subject, null, userName, status);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
