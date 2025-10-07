const { uploadPDF, uploadSubmission, findUserByEmail } = require('../db/dbFunctions');
const { FormData } = require('formdata-node');
const { FormDataEncoder } = require('form-data-encoder');
const { Readable } = require('stream');

async function studentPOST(req, res) {
  try {
    const { email, room } = req.body;
    const files = req.files;

    if (!email || !room || !files || files.length === 0) {
      return res.status(400).json({ error: 'Missing required fields or files' });
    }

    console.log('Received:', {
      email,
      room,
      files: files.map(f => f.originalname)
    });

    const fileIds = [];
    for (const file of files) {
      const fileId = await uploadPDF(file, email);
      fileIds.push(fileId);
    }

    await uploadSubmission(email, name, room, fileIds);

    res.status(201).json({
      message: 'Submission uploaded successfully',
      fileIds
    });
  } catch (err) {
    console.error('Error in studentPOST:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function studentGET(req, res) {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Missing email query parameter' });
    }

    const student = await findUserByEmail(email);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const form = new FormData();
    form.set('data', new Blob([JSON.stringify({ student })], { type: 'application/json' }));

    const pdfFileIds = (student.files || []).slice(0, 3);
    for (let i = 0; i < pdfFileIds.length; i++) {
      const fileStream = await getGridFSBuffer(pdfFileIds[i]);
      form.set(`pdf_${i}`, new Blob([fileStream], { type: 'application/pdf' }), `file_${i}.pdf`);
    }

    const encoder = new FormDataEncoder(form);
    res.setHeader('Content-Type', encoder.contentType);
    res.setHeader('Transfer-Encoding', 'chunked');

    Readable.from(encoder.encode()).pipe(res);
  } catch (err) {
    console.error('Error in studentGET:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getGridFSBuffer(fileId) {
  const { getGridFSBucket } = require('../db/db');
  const bucket = getGridFSBucket();
  const chunks = [];

  return new Promise((resolve, reject) => {
    const stream = bucket.openDownloadStream(fileId);
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', err => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

module.exports = {
  studentPOST,
  studentGET
};