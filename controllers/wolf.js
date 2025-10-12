const {
  getGridFSBucket,
  uploadPDF,
  studentPOST: studentSave,
  studentGET: studentFetch,
  roomGET: roomFetch,
  roomsGET: roomsFetch,
  getStudentDB
} = require("../db/wolfDB");
const { Grade } = require("../models/Wolf");

const { FormData } = require("formdata-node");
const { FormDataEncoder } = require("form-data-encoder");
const { Readable } = require("stream");
const { File } = require("formdata-node");
const { ObjectId } = require("mongodb");
const { sendEmail } = require("../controllers/sendMail"); 
const { getApprovalEmailContent } = require("../controllers/sendMail"); 
const { getRejectedEmailContent } = require("../controllers/sendMail"); 
const { getPendingEmailContent } = require("../controllers/sendMail"); 

async function studentGET(req, res) {
  const bucket = await getGridFSBucket();

  try {
    const { grade, email } = req.query;
    if (!grade || !email) return res.status(400).json({ error: "Missing grade or email" });

    const gradex = parseInt(grade);
    if (isNaN(gradex)) return res.status(400).json({ error: "Grade must be an integer" });

    let student = await studentFetch(gradex, email);
    if (!student) {
      await studentSave(gradex, email, "", []);
      student = await studentFetch(gradex, email);
    }

    const form = new FormData();

    form.set("room", new File([Buffer.from(JSON.stringify(student.room))], "room.json", { type: "application/json" }));

    form.set("approved", new File([Buffer.from(JSON.stringify(student.approved))], "approved.json", { type: "application/json" }));

    const pdfFileIds = student.files || [];
    for (const [index, rawId] of pdfFileIds.entries()) {
      const fileId = typeof rawId === "string" ? new ObjectId(rawId) : rawId;
      const chunks = [];

      await new Promise((resolve, reject) => {
        bucket.openDownloadStream(fileId)
          .on("data", chunk => chunks.push(chunk))
          .on("error", reject)
          .on("end", () => resolve());
      });

      if (chunks.length > 0) {
        const fileBuffer = Buffer.concat(chunks);
        const file = new File([fileBuffer], `file_${index}.pdf`, { type: "application/pdf" });
        form.set(`pdf_${index}`, file);
      }
    }

    const encoder = new FormDataEncoder(form);
    res.setHeader("Content-Type", encoder.contentType);
    res.setHeader("Transfer-Encoding", "chunked");
    Readable.from(encoder.encode()).pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function studentsGET(req, res) {
  try {
    const { grade } = req.query;
    if (!grade) return res.status(400).json({ error: "Missing grade" });

    const gradex = parseInt(grade, 10);
    if (isNaN(gradex)) return res.status(400).json({ error: "Grade must be an integer" });

    const doc = await Grade.findOne({ grade: gradex }).lean();
    if (!doc || !doc.students) return res.status(200).json([]);

    const bucket = await getGridFSBucket();

    const studentsWithPdfs = [];

    for (const student of doc.students) {
      const pdfBlobs = [];

      for (const rawId of student.files || []) {
        const fileId = typeof rawId === "string" ? new ObjectId(rawId) : rawId;
        const chunks = [];

        await new Promise ((resolve, reject) => {
          bucket.openDownloadStream(fileId)
            .on("data", c => chunks.push(c))
            .on("error", reject)
            .on("end", () => resolve());
        });

        if (chunks.length > 0) {
          pdfBlobs.push(new Blob([Buffer.concat(chunks)], { type: "application/pdf" }));
        }
      }

      studentsWithPdfs.push({
        email: student.email,
        room: student.room,
        approved: !!student.approved,
        pdfs: pdfBlobs
      });
    }

    res.status(200).json(studentsWithPdfs);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function studentPOST(req, res) {
  try {
    const { grade, email, room } = req.body;
    const files = Object.values(req.files || {}).flat();

    if (!grade || !email || !room)
      return res.status(400).json({ error: "Missing required fields (grade, email, or room)" });
    if (!files.length)
      return res.status(400).json({ error: "No files uploaded" });

    const gradex = parseInt(grade, 10);
    if (isNaN(gradex)) return res.status(400).json({ error: "Grade must be a valid integer" });

    const fileIds = [];
    for (const file of files) {
      const id = await uploadPDF(file, email);
      if (!id) throw new Error("Invalid file ID");
      fileIds.push(id);
    }

    await studentSave(gradex, email, room, fileIds);
    const saved = await studentFetch(gradex, email);

    const verified =
      saved && saved.room === room &&
      Array.isArray(saved.files) &&
      saved.files.length === fileIds.length;

    if (!verified)
      return res.status(500).json({ error: "Verification failed after saving record" });

    // send submission confirmation email
    try {
      await sendEmail({
        to: email,
        subject: "Submission Received - Pending Approval",
        text: getPendingEmailContent(),
      });
      console.log(`Confirmation email sent to ${email}`);
    } catch (mailErr) {
      console.error("Failed to send confirmation email:", mailErr);
    }

    res.status(201).json({
      message: "Student record saved successfully. Confirmation email sent.",
      grade: gradex,
      email,
      room,
      fileIds,
    });

  } catch (err) {
    console.error("Error in studentPOST:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function studentPATCH(req, res) {
  try {
    const { grade, email, approved } = req.body;

    if (!grade || !email || typeof approved !== 'boolean')
      return res.status(400).json({ error: "Missing grade, email, or invalid approved value" });

    const gradex = parseInt(grade, 10);
    if (isNaN(gradex)) return res.status(400).json({ error: "Grade must be an integer" });

    const result = await Grade.updateOne(
      { grade: gradex, "students.email": email },
      { $set: { "students.$.approved": approved } }
    );

    if (result.matchedCount === 0)
      return res.status(404).json({ error: "Student not found" });

    // send approval or rejection email
    try {
      if (approved) {
        if (typeof sendEmail === "function") {
          await sendEmail(email);
        } else {
          await sendEmail({
            to: email,
            subject: "Submission Approved",
            text: getApprovalEmailContent(),
          });
        }
        console.log(`Approval email sent to ${email}`);
      } else {
        await sendMail({
          to: email,
          subject: "Submission Not Approved",
          text: getRejectedEmailContent(),
        });
        console.log(`Rejection email sent to ${email}`);
      }
    } catch (mailErr) {
      console.error("Failed to send status update email:", mailErr);
    }

    res.status(200).json({ message: "Student updated", grade: gradex, email, approved });
  } catch (err) {
    console.error("Error in studentPATCH:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function roomGET(req, res) {
  try {
    const { grade, room } = req.query;
    if (!grade || !room) return res.status(400).json({ error: "Missing grade or room" });

    const emails = await roomFetch(parseInt(grade), room);
    res.status(200).json({ students: emails });
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
    res.status(200).json(rooms);
  } catch (err) {
    console.error("Error in roomsGET:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function roomsPOST(req, res) {
  try {
    const { grade, rooms } = req.body;

    if (!grade || !Array.isArray(rooms) || rooms.length === 0) {
      return res.status(400).json({ error: "Missing or invalid grade or rooms array" });
    }

    const gradex = parseInt(grade, 10);
    if (isNaN(gradex)) {
      return res.status(400).json({ error: "Grade must be a valid integer" });
    }

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

module.exports = {
  studentGET,
  studentsGET,
  studentPOST,
  studentPATCH,
  roomGET,
  roomsGET,
  roomsPOST
};
//Wolfram121