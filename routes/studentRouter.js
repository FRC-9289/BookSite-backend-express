const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/User');
const { FormData } = require('formdata-node');
const { FormDataEncoder } = require('form-data-encoder');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/authMiddleware');
const nodemailer = require('nodemailer');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/studentpost', upload.fields([
  { name: 'file1', maxCount: 1 },
  { name: 'file2', maxCount: 1 },
  { name: 'file3', maxCount: 1 }
]), auth, async (req, res) => {
  try {
    const { email, room } = req.body;

    const files = req.files;

    console.log('Received:', {
      email,
      room,
      files: Object.keys(files || {})
    });

    const user = new User({
      email,
      room,
      files: (Object.values(req.files).flat().map(file => ({
        filename: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer
      })))
    });
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail", // or use 'smtp.mailtrap.io', etc.
      auth: {
        user: email.env.EMAIL,
        pass: email.env.PASS,
      },
    });

    // Compose email
    const mailOptions = {
      from: `"The Village Robotics Team" <${email.env.EMAIL}>`,
      to: email,
      subject: "Submission Received",
      html: `
        <div style="font-family:sans-serif;">
          <h2>Hello Hooman,</h2>
          <p>This is a confirmation of your submission.</p>
          ${room}
          <br/>
          <p>– The Village Robotics Team</p>
        </div>
      `,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message: 'Form data received successfully',
      user,
      uploadedFiles: Object.keys(files || {})
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

router.get('/studentget', auth, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Missing email query parameter' });
    }

    const student = await User.findOne({ email }).lean(); // `.lean()` gives plain object
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const uploadDir = path.join(__dirname, '..', 'uploads', email);
    let pdfBuffers = [];
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir)
        .filter(f => f.toLowerCase().endsWith('.pdf'))
        .slice(0, 3);
      pdfBuffers = files.map(f => fs.readFileSync(path.join(uploadDir, f)));
    }

    const form = new FormData();

    form.set(
      'data',
      new Blob([JSON.stringify({ student })], { type: 'application/json' })
    );

    pdfBuffers.forEach((buf, i) => {
      form.set(`pdf_${i}`, new Blob([buf], { type: 'application/pdf' }), `file_${i}.pdf`);
    });

    const encoder = new FormDataEncoder(form);

    res.setHeader('Content-Type', encoder.contentType);
    res.setHeader('Transfer-Encoding', 'chunked');

    Readable.from(encoder.encode()).pipe(res);
  } catch (err) {
    console.error('Error in /studentget:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;