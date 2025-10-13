const mongoose = require('mongoose');
const { MongoClient, GridFSBucket } = require("mongodb");
const { Grade } = require("../models/Wolf");

const url = process.env.MONGO_URL;
const client = new MongoClient(url, { useUnifiedTopology: true });

let db = null;

async function getStudentDB() {
  if (db) return db;
  await client.connect();
  db = client.db("main");
  return db;
}

async function getGridFSBucket() {
  if (!db) await getStudentDB();
  return new GridFSBucket(db, { bucketName: "files" });
}

async function uploadPDF(file, email) {
  const bucket = await getGridFSBucket();
  return new Promise((resolve, reject) => {
    if (!file || !file.buffer) return reject(new Error("Invalid file or missing buffer"));

    const uploadStream = bucket.openUploadStream(file.originalname, {
      contentType: file.mimetype,
      metadata: { email },
    });

    uploadStream.on("error", reject);
    uploadStream.on("finish", async () => {
      const chunkExists = await bucket.s.db.collection("files.chunks").findOne({
        files_id: uploadStream.id,
        n: 0
      });
      if (!chunkExists) return reject(new Error("Upload failed: no chunks found"));
      resolve(uploadStream.id.toString());
    });

    uploadStream.end(file.buffer);
  });
}

async function studentPOST(grade, email, room, fileIds) {
  const student = { email, room, files: fileIds, status: 0 };

  const result = await Grade.updateOne(
    { grade, "students.email": email },
    { $set: { "students.$": student } }
  );

  if (result.matchedCount === 0) {
    await Grade.updateOne(
      { grade },
      { $push: { students: student } },
      { upsert: true }
    );
  }
}

async function studentGET(grade, email) {
  const doc = await Grade.findOne(
    { grade, "students.email": email },
    { "students.$": 1 }
  ).lean();

  return doc?.students?.[0] || null;
}

async function roomGET(grade, room) {
  const doc = await Grade.findOne({ grade }, { students: 1 }).lean();
  if (!doc) return [];

  return doc.students
    .filter(s => s.room === room)
    .map(s => s.email);
}

async function roomsGET(grade) {
  const doc = await Grade.findOne({ grade }, { rooms: 1, students: 1 }).lean();
  if (!doc) return [`No Doc for ${grade}`];

  return (doc.rooms || []).map(room => {
    const emails = (doc.students || [])
      .filter(s => s.room === room)
      .map(s => s.email);
    return [room, ...emails];
  });
}

module.exports = {
  getStudentDB,
  getGridFSBucket,
  uploadPDF,
  studentPOST,
  studentGET,
  roomGET,
  roomsGET,
};
//Wolfram121