import {
  getGridFSBucket,
  uploadPDF,
  studentPOST,
  studentGETByGrade,
  studentGETById,
  roomGET,
  roomsGET,
  submissionsGET,
  downloadPDF,
  getPDFMetadata,
  updateStudentSubmissionById
} from "../../db/dbFunctions.js";

import { FormData } from "formdata-node";
import { FormDataEncoder } from "form-data-encoder";
import { Readable } from "stream";
import { sendEmail } from "./sendMail.js";

export async function postStudent(req, res) {
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

    await studentPOST(gradex, email, room, fileIds, name);

    const savedData = await studentGETByGrade(gradex, email);
    const verified =
      savedData &&
      savedData.room === room &&
      Array.isArray(savedData.files) &&
      savedData.files.length === fileIds.length;

    if (!verified) {
      console.error("Verification failed. Expected:", { email, room, fileIds }, "Got:", savedData);
      return res.status(500).json({ error: "Verification failed after saving record" });
    }

    // const res = await sendConfirmationEmail(email, gradex, room);
    // if(!res.success){
    //   throw new Error(res.error);
    // }

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

export async function getStudentByGrade(req, res) {
  try {
    const { grade, email } = req.query;
    if (!grade || !email) {
      return res.status(400).json({ error: "Missing grade or email" });
    }

    const gradex = parseInt(grade, 10) ;
    if (isNaN(gradex)) {
      return res.status(400).json({ error: "Grade must be an integer" });
    }

    const student = await studentGETByGrade(gradex, email);

    // Create FormData response
    const form = new FormData();

    if (student) {
      // Add student data
      form.set(
        "data",
        new Blob([JSON.stringify({ student })], { type: "application/json" })
      );

      // Add up to 3 PDFs
      const pdfFileIds = (student.files || []).slice(0, 3);
      for (let i = 0; i < pdfFileIds.length; i++) {
        const fileBuffer = await getGridFSBucket(pdfFileIds[i]);
        form.set(
          `pdf_${i}`,
          new Blob([fileBuffer], { type: "application/pdf" }),
          `file_${i}.pdf`
        );
      }
    } else {
      // No student found → return empty student object
      form.set(
        "data",
        new Blob([JSON.stringify({ student: null })], { type: "application/json" })
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

export async function getRoom(req, res) {
  try {
    const { grade, room } = req.query;
    if (!grade || !room) return res.status(400).json({ error: "Missing grade or room" });

    const gradex = parseInt(grade);
    const names = await roomGET(gradex, room);
    res.status(200).json({ grade: gradex, room, students: names });
  } catch (err) {
    console.error("Error in roomGET:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getRoomsSubmissions(req, res) {
  try {
    const { grade } = req.query;
    if (!grade) return res.status(400).json({ error: "Missing grade" });

    const gradex = parseInt(grade);
    const rooms = await roomsGET(gradex);


    res.status(200).json(rooms);
  } catch (err) {
    console.error("Error in roomsGET:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
/**
 * Get all submissions
 */
export async function getSubmissions(req, res) {
  try {
    const submissions = await submissionsGET();

    // Prepare the populated submissions array
    const populatedSubmissions = [];

    for (const submission of submissions) {
      const populated = { ...submission, filesData: [] };

      if (Array.isArray(submission.files) && submission.files.length > 0) {
        for (const fileId of submission.files) {
          try {;
            const pdfBuffer = await downloadPDF(fileId);
            populated.filesData.push({
              fileId,
              fileName : (await getPDFMetadata(fileId))?.filename || "unknown.pdf",
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

export async function manageStatus(req,res){
  const { status, submissionId } = req.query;

  console.log(status);
  console.log(submissionId);

  const updated = await studentGETById(submissionId);
  console.log(updated);
  if (!updated) return res.status(404).json({ error: 'Submission not found' });

  await updateStudentSubmissionById(submissionId, 'status', status);

  // Send approval email if approved
  if (status === 'approved') {
    await sendEmail({
      to: updated.studentEmail,
      subject: 'Village Robotics Signup Approved',
      text: `
        <div style="font-family: sans-serif; line-height: 1.5;">
          <h2>Hello ${updated.studentName},</h2>
          <p>Your submission has been approved. Welcome aboard!</p>
          <br/>
          <p> The Village Tech Team</p>
        </div>
      `
    });
  }
  else if(status == 'pending'){
    await sendEmail({
      to: updated.studentEmail,
      subject: 'Village Robotics Signup Approved',
      text: `
        <div style="font-family: sans-serif; line-height: 1.5;">
          <h2>Hello ${updated.studentName},</h2>
          <p>Your submission has been put on pending. We will notify you further for more updates</p>
          <br/>
          <p> The Village Tech Team</p>
        </div>
      `
    });
  } else if(status == 'denied'){
    await sendEmail({
      to: updated.studentEmail,
      subject: 'Village Robotics Signup Approved',
      text: `
        <div style="font-family: sans-serif; line-height: 1.5;">
          <h2>Hello ${updated.studentName},</h2>
          <p>Your submission has been denied. We will notify you further for more updates</p>
          <br/>
          <p> The Village Tech Team</p>
        </div>
      `
    });
  }

  res.json({ message: 'Status updated successfully' });
}

export async function sendEmailNotification(req, res) {
  try {
    const { email, status } = req.body;

    // Validation
    if (!email || !status) {
      return res.status(400).json({ error: "Missing required fields: email and status" });
    }

    if (!['approved', 'pending', 'denied'].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be 'approved', 'pending', or 'denied'" });
    }

    let subject, html;

    if (status === 'approved') {
      subject = 'Village Robotics Signup Approved';
      html = `
        <div style="font-family: sans-serif; line-height: 1.5;">
          <h2>Hello,</h2>
          <p>Your submission has been approved. Welcome aboard!</p>
          <br/>
          <p>The Village Tech Team</p>
        </div>
      `;
    } else if (status === 'pending') {
      subject = 'Village Robotics Signup Pending';
      html = `
        <div style="font-family: sans-serif; line-height: 1.5;">
          <h2>Hello,</h2>
          <p>Your submission has been put on pending. We will notify you further for more updates.</p>
          <br/>
          <p>The Village Tech Team</p>
        </div>
      `;
    } else if (status === 'denied') {
      subject = 'Village Robotics Signup Denied';
      html = `
        <div style="font-family: sans-serif; line-height: 1.5;">
          <h2>Hello,</h2>
          <p>Your submission has been denied. We will notify you further for more updates.</p>
          <br/>
          <p>The Village Tech Team</p>
        </div>
      `;
    }

    const emailResult = await sendEmail({
      to: email,
      subject: subject,
      html: html
    });

    if (!emailResult.success) {
      return res.status(500).json({ error: "Failed to send email" });
    }

    res.status(200).json({ message: "Email sent successfully" });
  } catch (err) {
    console.error("Error in sendEmailNotification:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
