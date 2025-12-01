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
      const { grade, email, room, name, pdfNames } = req.body; // include pdfNames
      const files = Object.values(req.files || {}).flat();

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

      if (pdfTypes.length !== files.length) {
          return res.status(400).json({ error: "Number of pdfNames must match number of files" });
      }

      // Upload files and map to types
      const fileIds = [];
      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const typeName = pdfTypes[i] || `File ${i + 1}`;
          try {
              const id = await uploadPDF(file, email);
              fileIds.push({ id, type: typeName, status: "Pending" });
          } catch (uploadErr) {
              console.error("File upload failed:", file.originalname, uploadErr);
              return res.status(500).json({ error: `Failed to upload file: ${file.originalname}` });
          }
      }

      await studentPOST(gradex, email, room, fileIds, name);

      const savedData = await studentGETByGrade(gradex, email);

      const success = await sendEmail(
          email,
          'Signup Pending',
          `<div style="font-family: sans-serif; line-height: 1.5;">
              <h2>Hello ${name},</h2>
              <p>We have received your submission</p>
              <br/>
              <p>The Village Tech Team</p>
          </div>`
      );

      if (!success.success) {
          throw new Error(`Email could not be sent to ${email}`);
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
      console.error("Error in postStudent:", err);
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
