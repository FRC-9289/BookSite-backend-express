import {
  getGridFSBucket,
  uploadPDF,
  studentPOST as studentSave,
  studentGET as studentFetch,
  roomGET as roomFetch,
  roomsGET as roomsFetch,
  submissionsGET,
  downloadPDF
} from "../../db/dbFunctions.js";

import { Grade } from "../../models/student-grade.js";

import { FormData } from "formdata-node";
import { FormDataEncoder } from "form-data-encoder";
import { Readable } from "stream";
import { sendConfirmationEmail } from "./sendMail.js";

async function studentPOST(req, res) {
  try {
    const { grade, email, room, name } = req.body;
    const files = Object.values(req.files || {}).flat();

    // --- Validation ---
    if (!grade || !email || !room || !name) {
      return res.status(400).json({ error: "Missing required fields (grade, email, or room)" });
    }
    if (!files.length) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const gradex = parseInt(grade, 10);
    if (isNaN(gradex)) {
      return res.status(400).json({ error: "Grade must be a valid integer" });
    }

    const fileIds = [];
    for (const file of files) {
      try {
        const id = await uploadPDF(file, email);
        fileIds.push(id);
      } catch (uploadErr) {
        console.error("File upload failed:", file.originalname, uploadErr);
        return res.status(500).json({ error: `Failed to upload file: ${file.originalname}` });
      }
    }

    await studentSave(gradex, email, room, fileIds, name);

    const savedData = await studentFetch(gradex, email);
    const verified =
      savedData &&
      savedData.room === room &&
      Array.isArray(savedData.files) &&
      savedData.files.length === fileIds.length;

    if (!verified) {
      console.error("Verification failed. Expected:", { email, room, fileIds }, "Got:", savedData);
      return res.status(500).json({ error: "Verification failed after saving record" });
    }

    const res = await sendConfirmationEmail(email, gradex, room);
    if(!res.success){
      throw new Error(res.error);
    }

    res.status(201).json({
      submissionId: savedData._id,
      message: "Student record saved and confirmation email sent.",
      grade: gradex,
      email,
      room,
      name,
      fileIds,
    });
  } catch (err) {
    console.error("Error in studentPOST:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function studentGET(req, res) {
  try {
    const { grade, email } = req.query;
    if (!grade || !email) {
      return res.status(400).json({ error: "Missing grade or email" });
    }

    const gradex = parseInt(grade);
    if (isNaN(gradex)) {
      return res.status(400).json({ error: "Grade must be an integer" });
    }

    const student = await studentFetch(gradex, email);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const form = new FormData();

    form.set(
      "data",
      new Blob([JSON.stringify({ student })], { type: "application/json" })
    );

    const pdfFileIds = (student.files || []).slice(0, 3);
    for (let i = 0; i < pdfFileIds.length; i++) {
      const fileBuffer = await getGridFSBucket(pdfFileIds[i]);
      form.set(
        `pdf_${i}`,
        new Blob([fileBuffer], { type: "application/pdf" }),
        `file_${i}.pdf`
      );
    }

    const encoder = new FormDataEncoder(form);
    res.setHeader("Content-Type", encoder.contentType);
    res.setHeader("Transfer-Encoding", "chunked");

    Readable.from(encoder.encode()).pipe(res);
  } catch (err) {
    console.error("Error in studentGET:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function roomGET(req, res) {
  try {
    const { grade, room } = req.query;
    if (!grade || !room) return res.status(400).json({ error: "Missing grade or room" });

    const gradex = parseInt(grade);
    const emails = await roomFetch(gradex, room);
    res.status(200).json({ grade: gradex, room, students: emails });
  } catch (err) {
    console.error("Error in roomGET:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function roomsGET(req, res) {
  try {
    const { grade } = req.query;
    if (!grade) return res.status(400).json({ error: "Missing grade" });

    const gradex = parseInt(grade);
    const rooms = await roomsFetch(gradex);

    console.log(rooms);
    res.status(200).json(rooms);
  } catch (err) {
    console.error("Error in roomsGET:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function roomsPOST(req, res) {
  try {
    const { grade, rooms } = req.body;

    // --- Validation ---
    if (!grade || !Array.isArray(rooms) || rooms.length === 0) {
      return res.status(400).json({ error: "Missing or invalid grade or rooms array" });
    }

    const gradex = parseInt(grade, 10);
    if (isNaN(gradex)) {
      return res.status(400).json({ error: "Grade must be a valid integer" });
    }

    // --- Update or create Grade document ---
    const result = await Grade.updateOne(
      { grade: gradex },
      { $set: { rooms } },
      { upsert: true }
    );

    res.status(200).json({
      message: "Rooms updated successfully",
      grade: gradex,
      rooms,
      result,
    });
  } catch (err) {
    console.error("Error in roomsPOST:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
/**
 * Get all submissions
 */
async function submissionGET(req, res) {
  try {
    const submissions = await submissionsGET();

    // Prepare the populated submissions array
    const populatedSubmissions = [];

    for (const submission of submissions) {
      const populated = { ...submission, filesData: [] };

      if (Array.isArray(submission.files) && submission.files.length > 0) {
        for (const fileId of submission.files) {
          try {
            const pdfBuffer = await downloadPDF(fileId);
            populated.filesData.push({
              fileId,
              base64: pdfBuffer.toString("base64"),
              mimeType: "application/pdf",
            });
          } catch (err) {
            console.warn(`⚠️ Failed to download file ${fileId}:`, err.message);
            populated.filesData.push({
              fileId,
              error: "Failed to retrieve file from GridFS",
            });
          }
        }
      }

      populatedSubmissions.push(populated);
    }

    // ✅ Only send response ONCE after all processing is done
    return res.status(200).json(populatedSubmissions);

  } catch (err) {
    console.error("❌ Error in submissionGET:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
}


export{
  studentPOST,
  studentGET,
  roomGET,
  roomsGET,
  submissionGET
};