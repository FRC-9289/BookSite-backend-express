const {
  getGridFSBucket,
  uploadPDF,
  studentPOST: studentSave,
  studentGET: studentFetch,
  roomGET: roomFetch,
  roomsGET: roomsFetch
} = require("../db/wolfDB");
const { send } = require("./send")
const { Grade } = require("../models/Wolf");

const { FormData } = require("formdata-node");
const { FormDataEncoder } = require("form-data-encoder");
const { Readable } = require("stream");
const { File } = require("formdata-node");
const { ObjectId } = require("mongodb");

async function studentGET(req, res) {
  const bucket = await getGridFSBucket();

  try {
    const { grade, email } = req.query;
    if (!grade || !email) {
      console.warn("studentGET: missing grade or email", { grade, email });
      return res.status(400).json({ error: "Missing grade or email" });
    }

    const gradex = parseInt(grade, 10);
    if (isNaN(gradex)) {
      console.warn("studentGET: invalid grade", grade);
      return res.status(400).json({ error: "Grade must be an integer" });
    }

    let student = await studentFetch(gradex, email);

    if (!student) {
      console.info(`studentGET: no student found for ${email} grade ${gradex}, creating empty record`);
      await studentSave(gradex, email, "", []);
      student = await studentFetch(gradex, email);
    }

    const form = new FormData();

    form.set("room", new File([String(student.room ?? "")], "room.txt", { type: "text/plain" }));

    form.set("status", new File([String(student.status ?? 0)], "status.txt", { type: "text/plain" }));

    const pdfFileIds = Array.isArray(student.files) ? student.files : [];
    for (const [index, rawId] of pdfFileIds.entries()) {
      try {
        const fileId = typeof rawId === "string" ? new ObjectId(rawId) : rawId;
        const chunks = [];
        await new Promise((resolve, reject) => {
          const stream = bucket.openDownloadStream(fileId);
          stream.on("data", (c) => chunks.push(c));
          stream.on("error", (err) => {
            console.error(`studentGET: error streaming file ${fileId} for ${email}`, err);
            reject(err);
          });
          stream.on("end", () => resolve());
        });

        if (chunks.length === 0) {
          console.warn(`studentGET: file ${fileId} produced no chunks for ${email}`);
          continue;
        }

        const fileBuffer = Buffer.concat(chunks);
        const file = new File([fileBuffer], `file_${index}.pdf`, { type: "application/pdf" });
        form.set(`pdf_${index}`, file);
      } catch (err) {
        console.error(`studentGET: failed to retrieve file index ${index} for ${email}`, err);
      }
    }

    const encoder = new FormDataEncoder(form);
    res.setHeader("Content-Type", encoder.contentType);
    res.setHeader("Transfer-Encoding", "chunked");
    Readable.from(encoder.encode()).pipe(res);
  } catch (err) {
    console.error("studentGET: unexpected error:", err);
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

    const form = new FormData();

    for (const [i, student] of doc.students.entries()) {
      form.set(`student_${i}_email`, new File([Buffer.from(student.email)], `email_${i}.txt`, { type: "text/plain" }));
      form.set(`student_${i}_room`, new File([Buffer.from(student.room || "")], `room_${i}.txt`, { type: "text/plain" }));
      form.set(`student_${i}_status`, new File([Buffer.from(String(student.status ?? 0))], `status_${i}.txt`, { type: "text/plain" }));

      for (const [j, rawId] of (student.files || []).entries()) {
        const fileId = typeof rawId === "string" ? new ObjectId(rawId) : rawId;
        const chunks = [];

        await new Promise((resolve, reject) => {
          bucket.openDownloadStream(fileId)
            .on("data", c => chunks.push(c))
            .on("error", reject)
            .on("end", () => resolve());
        });

        if (chunks.length > 0) {
          const fileBuffer = Buffer.concat(chunks);
          const file = new File([fileBuffer], `student_${i}_pdf_${j}.pdf`, { type: "application/pdf" });
          form.set(`student_${i}_pdf_${j}`, file);
        }
      }
    }

    const { FormDataEncoder } = require("form-data-encoder");
    const { Readable } = require("stream");
    const encoder = new FormDataEncoder(form);

    res.setHeader("Content-Type", encoder.contentType);
    res.setHeader("Transfer-Encoding", "chunked");
    Readable.from(encoder.encode()).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function studentPOST(req, res) {
  try {
    const { grade, email, room } = req.body;
    const files = Object.values(req.files || {}).flat();

    if (!grade || !email || !room) {
      return res.status(400).json({ error: "Missing required fields (grade, email, or room)" });
    }
    if (!files.length) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const gradex = parseInt(grade, 10);
    if (isNaN(gradex)) return res.status(400).json({ error: "Grade must be a valid integer" });

    const fileIds = [];
    for (const file of files) {
      try {
        const id = await uploadPDF(file, email);
        if (!id) throw new Error("Invalid file ID");
        fileIds.push(id);
      } catch (uploadErr) {
        console.error("File upload failed:", file.originalname, uploadErr);
        return res.status(500).json({ error: `Failed to upload file: ${file.originalname}` });
      }
    }

    await studentSave(gradex, email, room, fileIds);

    send(email, "Submission Received - Pending Approval").catch(err => {
      console.error("Failed to send registration email:", err);
    });

    res.status(201).json({
      message: "Student record saved successfully",
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
    const { grade, email, status, reason } = req.body;

    if (!grade || !email || ![-1, 0, 1].includes(status)) {
      return res.status(400).json({ error: "Missing grade, email, or invalid status value" });
    }

    const gradex = parseInt(grade, 10);
    if (isNaN(gradex)) return res.status(400).json({ error: "Grade must be an integer" });

    const updateFields = { "students.$.status": status };
    if (status === -1) updateFields["students.$.room"] = "";

    const result = await Grade.updateOne(
      { grade: gradex, "students.email": email },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (status === 1) {
      send(email, "Submission Approved", "approved").catch(err =>
        console.error("Failed to send approval email:", err)
      );
    } else if (status === -1) {
      send(email, "Submission Rejected", "rejected", reason).catch(err =>
        console.error("Failed to send rejection email:", err)
      );
    }

    res.status(200).json({ message: "Student updated", grade: gradex, email, status });
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

    const gradex = parseInt(grade, 10);
    if (isNaN(gradex)) return res.status(400).json({ error: "Invalid grade" });

    let rooms = await roomsFetch(gradex);

    if (Array.isArray(rooms)) {
      rooms = rooms
        .map(r => Array.isArray(r) ? r : [r])
        .filter(r => r.length > 0);

      const seen = new Set();
      const unique = [];

      for (const r of rooms) {
        const id = r[0];
        if (!seen.has(id)) {
          seen.add(id);
          unique.push(r);
        }
      }

      rooms = unique;
    } else {
      rooms = [];
    }

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