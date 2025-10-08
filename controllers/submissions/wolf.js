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
const nodemailer = require('nodemailer');

async function studentPOST(req, res) {
  try {
    const { email, room } = req.body;
    const files = Object.values(req.files || {}).flat();

    if (!email || !room || files.length === 0) {
      return res.status(400).json({ error: "Missing required fields or files" });
    }

    const fileIds = [];
    for (const file of files) {
      fileIds.push(await uploadPDF(file, email));
    }

    await studentSave(email, room, fileIds);

    const savedData = await studentFetch(email);
    const isMatch =
      savedData &&
      savedData.room === room &&
      Array.isArray(savedData.pdfs) &&
      savedData.pdfs.length === fileIds.length;

    if (!isMatch) {
      console.error('Verification failed:', savedData);
      return res.status(500).json({ error: 'Verification failed after saving.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"The Village Robotics Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Submission Received',
      html: `
        <div style="font-family:sans-serif;">
          <h2>Hello ${email},</h2>
          <p>Thanks for your submission of your form to us!</p>
          <p>We’ll review your request and get back to you soon.</p>
          <p>Please keep checking this email inbox in the next coming days for approval from us.</p>
          <br/>
          <p>– The Village Robotics Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Confirmation email sent to ${email}`);

    res.status(201).json({ message: 'Student record saved and email sent', fileIds });
  } catch (err) {
    console.error('Error in studentPOST:', err);
    res.status(500).json({ error: 'Internal server error' });
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
    res.status(200).json(rooms);
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