const {
  getGridFSBucket,
  uploadPDF,
  studentPOST: studentSave,
  studentGET: studentFetch,
  roomGET: roomFetch,
  roomsGET: roomsFetch
} = require("../db/dbFunctions");

const { FormData } = require("formdata-node");
const { FormDataEncoder } = require("form-data-encoder");
const { Readable } = require("stream");

async function studentPOST(req, res) {
  try {
    const { email, room, name } = req.body;
    const files = Object.values(req.files || {}).flat();

    if (!email || !room || !name || files.length === 0) {
      return res.status(400).json({ error: "Missing required fields or files" });
    }

    const fileIds = [];
    for (const file of files) {
      const fileId = await uploadPDF(file, email);
      fileIds.push(fileId);
    }

    await studentSave(email, name, room, fileIds);

    res.status(201).json({ message: "Student record saved", fileIds });
  } catch (err) {
    console.error("Error in studentPOST:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function studentGET(req, res) {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Missing email query parameter" });

    const student = await studentFetch(email);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const form = new FormData();
    form.set("data", new Blob([JSON.stringify({ student })], { type: "application/json" }));

    const pdfFileIds = (student.files || []).slice(0, 3);
    for (let i = 0; i < pdfFileIds.length; i++) {
      const fileBuffer = await getGridFSBuffer(pdfFileIds[i]);
      form.set(`pdf_${i}`, new Blob([fileBuffer], { type: "application/pdf" }), `file_${i}.pdf`);
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
    const { room } = req.query;
    if (!room) return res.status(400).json({ error: "Missing room query parameter" });

    const emails = await roomFetch(room);
    res.status(200).json({ room, students: emails });
  } catch (err) {
    console.error("Error in roomGET:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function roomsGET(req, res) {
  try {
    const rooms = await roomsFetch();
    res.status(200).json({ rooms });
  } catch (err) {
    console.error("Error in roomsGET:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getGridFSBuffer(fileId) {
  const bucket = getGridFSBucket();
  const chunks = [];

  return new Promise((resolve, reject) => {
    const stream = bucket.openDownloadStream(fileId);
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

module.exports = {
  studentPOST,
  studentGET,
  roomGET,
  roomsGET
};
//Wolfram121