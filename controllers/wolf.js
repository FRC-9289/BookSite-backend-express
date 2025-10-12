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
    if (isNaN(gradex)) {
      return res.status(400).json({ error: "Grade must be a valid integer" });
    }

    const fileIds = [];
    console.log("Incoming files:", files.map(f => ({
      name: f.originalname,
      mimetype: f.mimetype,
      hasBuffer: !!f.buffer
    })));

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

    const saved = await studentFetch(gradex, email);
    const verified =
      saved &&
      saved.room === room &&
      Array.isArray(saved.files) &&
      saved.files.length === fileIds.length;

    if (!verified) {
      console.error("Verification failed. Expected:", { email, room, fileIds }, "Got:", saved);
      return res.status(500).json({ error: "Verification failed after saving record" });
    }

    res.status(201).json({
      message: "Student record saved successfully.",
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
    const roomJson = JSON.stringify({ room: student.room });
    form.set("data", new File([Buffer.from(roomJson)], "data.json", { type: "application/json" }));

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
  studentPOST,
  studentGET,
  roomGET,
  roomsGET,
  roomsPOST
};
//Wolfram121