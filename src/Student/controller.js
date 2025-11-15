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

        const success = await sendEmail(
            email,
            'Signup Pending',
            `<div style="font-family: sans-serif; line-height: 1.5;">
            <h2>Hello ${name},</h2>
            <p>Confirming your submission, you have selected Bus ${room[0]}, Room ${room[2]} (${room[1] == "M" ? "Male" : "Female"})</p>
            <br/>
            <p>The Village Tech Team</p>
            </div>`
        );

        if(!success.success){
            throw new Error("Email could not be sent to ", email);
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

        // Add PDFs (dynamic count based on config, but fallback to 3)
        const pdfFileIds = student.files || [];
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
