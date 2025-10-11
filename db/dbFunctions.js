const { MongoClient, GridFSBucket, ObjectId } = require("mongodb");
const { Grade } = require("../models/student-grade");
const fs = require("fs");

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri, { useUnifiedTopology: true });

let db = null;

async function getStudentDB() {
  if (db) return db;

  await client.connect();
  db = client.db("students");
  console.log("✅ Connected to MongoDB:", uri);

  return db;
}

async function getGridFSBucket() {
  const database = await getStudentDB();
  return new GridFSBucket(db, { bucketName: "files" });
}

async function uploadPDF(file, email) {
  const bucket = await getGridFSBucket();

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(file.originalname, {
      contentType: file.mimetype,
      metadata: { email },
    });

    uploadStream.on("error", reject);
    uploadStream.on("finish", () => resolve(uploadStream.id));
    uploadStream.end(file.buffer);
  });
}

async function getPDFMetadata(fileId) {
  const database = await getStudentDB();
  const bucket = await getGridFSBucket();

  const filesCollection = database.collection("files.files");

  // Ensure fileId is an ObjectId
  const id = typeof fileId === "string" ? new ObjectId(fileId) : fileId;

  // Lookup file metadata
  const fileDoc = await filesCollection.findOne({ _id: id });
  if (!fileDoc) throw new Error("File not found in GridFS");

  // Download the actual binary content
  return new Promise((resolve, reject) => {
    const chunks = [];
    const downloadStream = bucket.openDownloadStream(id);

    downloadStream.on("data", (chunk) => chunks.push(chunk));
    downloadStream.on("error", reject);
    downloadStream.on("end", () => {
      resolve({
        filename: fileDoc.filename,
        metadata: fileDoc.metadata,
        uploadDate: fileDoc.uploadDate,
        contentType: fileDoc.contentType,
      });
    });
  });
}

async function studentPOST(gradeNumber, email, room, fileIds, name) {
  const db = await getStudentDB();
  const collection = db.collection("data");

  const student = {
    grade: gradeNumber,
    email,
    room,
    name: name || "",
    files: fileIds,
    updatedAt: new Date(),
    status: "pending"
  };

  await collection.updateOne(
    { grade: gradeNumber, email },
    { $set: student },
    { upsert: true }
  );
}

async function studentGET(gradeNumber, email) {
  const db = await getStudentDB();
  const results = await db
    .collection("data")
    .find(
      { grade: gradeNumber, email },
      { projection: { _id: 1, name: 1, email: 1, grade: 1, files: 1, room: 1 } }
    )
    .toArray();

  return results[0] || null; // Return the first result or null if none found
}

async function studentsGET(gradeNumber) {
  return (await getStudentDB())
    .collection("data")
    .find({ grade: gradeNumber })
    .toArray();
}

async function roomGET(gradeNumber, roomKey) {
  const students = await (await getStudentDB())
    .collection("data")
    .find(
      { grade: gradeNumber, room: roomKey },
      { projection: { name: 1, _id: 0, status : 1} }
    )
    .toArray();

  return students.map((s) => ({"name" : s.name, "status" : s.status}));
}

async function roomsGET(gradeNumber) {
  const db = await getStudentDB();

  
  const students = await db
    .collection("data")
    .find({ grade: gradeNumber }, { projection: { room: 1, email: 1, name : 1} })
    .toArray();

  
  const roomMap = {};
  for (const student of students) {
    if (!student.room) continue;
    if (!roomMap[student.room]) roomMap[student.room] = [];
    roomMap[student.room].push({
      name : student.name,
      email : student.email,
    });
  }

  console.log(roomMap);

  return roomMap;
}
/**
 * Fetch all submissions
 */
async function submissionsGET(){
  const db = await getStudentDB();

  const submissions = await db.collection("data").find({}).toArray();

  return submissions
}

async function downloadPDF(fileId) {
  const bucket = await getGridFSBucket();

  return new Promise((resolve, reject) => {
    const downloadStream = bucket.openDownloadStream(fileId);
    const chunks = [];

    downloadStream.on("data", (chunk) => chunks.push(chunk));
    downloadStream.on("error", reject);
    downloadStream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

module.exports = {
  getStudentDB,
  getGridFSBucket,
  uploadPDF,
  studentPOST,
  studentGET,
  studentsGET,
  roomGET,
  roomsGET,
  submissionsGET,
  downloadPDF,
  getPDFMetadata
};