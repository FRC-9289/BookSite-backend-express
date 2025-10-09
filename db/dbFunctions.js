const { MongoClient, GridFSBucket } = require("mongodb");
const { Grade } = require("../models/student-grade");

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

async function studentPOST(gradeNumber, email, room, fileIds) {
  const db = await getStudentDB();
  const collection = db.collection("data");

  const student = {
    grade: gradeNumber,
    email,
    room,
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
  return (await getStudentDB())
    .collection("data")
    .findOne({ grade: gradeNumber, email });
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
      { projection: { email: 1, _id: 0 } }
    )
    .toArray();

  return students.map((s) => s.email);
}

async function roomsGET(gradeNumber) {
  const db = await getStudentDB();

  
  const students = await db
    .collection("data")
    .find({ grade: gradeNumber }, { projection: { room: 1, email: 1 } })
    .toArray();

  
  const roomMap = {};
  for (const student of students) {
    if (!student.room) continue;
    if (!roomMap[student.room]) roomMap[student.room] = [];
    roomMap[student.room].push(student.email);
  }

  console.log(roomMap);

  return roomMap;
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
};
