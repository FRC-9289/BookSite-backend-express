import express from "express";
import { ObjectId } from "mongodb";
import { sendEmail } from "../controllers/sendMail.js";
import { getStudentDB } from "../db/wolf.js";

const router = express.Router();

router.put("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["approved", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status value" });
  }

  try {
    const db = getStudentDB();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update the status
    await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: status } }
    );

    // Send email if not pending
    if (status !== "pending") {
      const subject =
        status === "approved" ? "Approval Notification" : "Rejection Notification";

      await sendEmail(user.email, subject, null, user.name, status);
    }

    res.status(200).json({
      success: true,
      message: `User status updated to ${status} and email sent.`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;