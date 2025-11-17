import {
getGridFSBucket,
uploadPDF,
studentPOST,
studentGETByGrade,
roomGET,
roomsGET
} from "./service.js";

import { FormData } from "formdata-node";
import { FormDataEncoder } from "form-data-encoder";
import { Readable } from "stream";
import { sendEmail } from "../utils/sendMail.js";

export async function postStudent(req, res) {
    try {
      const { grade, email, room, name, pdfNames } = req.body;
      const files = Object.values(req.files || {}).flat();
  
      // --- Validation ---
      if (!grade || !email || !room || !name || !pdfNames) {
        return res.status(400).json({ error: "Missing required fields (grade, email, room, or pdfNames)" });
      }
      if (!files.length) {
        return res.status(400).json({ error: "No files uploaded" });
      }
  
      const gradex = parseInt(grade, 10);
      if (isNaN(gradex)) {
        return res.status(400).json({ error: "Grade must be a valid integer" });
      }
  
      // Parse pdfNames if sent as JSON string
      const pdfTypes = typeof pdfNames === "string" ? JSON.parse(pdfNames) : pdfNames;
  
      if (!Array.isArray(pdfTypes) || pdfTypes.length === 0) {
        return res.status(400).json({ error: "pdfNames must be a non-empty array" });
      }
  
      // Map files to their types
      const fileIds = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const typeName = pdfTypes[i] || `File ${i + 1}`;
        try {
          const id = await uploadPDF(file, email);
          fileIds.push({ id, type: typeName });
        } catch (uploadErr) {
          console.error("File upload failed:", file.originalname, uploadErr);
          return res.status(500).json({ error: `Failed to upload file: ${file.originalname}` });
        }
      }
  
      // Save to database
      await studentPOST(gradex, email, room, fileIds, name, pdfTypes);
  
      // Verify saved record
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
  
      // Send confirmation email
      const success = await sendEmail(
        email,
            'Signup Pending',
            `<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
            <h2 style="color: #4caf50; margin-bottom: 20px;">Hello ${name},</h2>
            <p style="font-size: 16px; margin-bottom: 10px;">
                Thank you for your submission! Here are your selected details:
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                <td style="padding: 8px; font-weight: bold;">Bus:</td>
                <td style="padding: 8px;">${room[0]}</td>
                </tr>
                <tr>
                <td style="padding: 8px; font-weight: bold;">Room:</td>
                <td style="padding: 8px;">${room[2]}</td>
                </tr>
                <tr>
                <td style="padding: 8px; font-weight: bold;">Gender:</td>
                <td style="padding: 8px;">${room[1] === "M" ? "Male" : "Female"}</td>
                </tr>
            </table>
            <p style="font-size: 16px;">
                Your submission is currently <strong>Pending</strong>. We will notify you once your room is confirmed.
            </p>
            <p style="font-size: 16px; margin-top: 30px;">
                Best regards,<br/>
                <strong>The Village Tech Team</strong>
            </p>
            </div>`
      );
  
      if (!success.success) {
        throw new Error("Email could not be sent to " + email);
      }
  
      // ✅ Keep same response structure
      res.status(201).json({
        submissionId: savedData._id,
        message: "Student record saved and confirmation email sent.",
        grade: gradex,
        email,
        room,
        name,
        fileIds, // includes mapping {id, type}
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
