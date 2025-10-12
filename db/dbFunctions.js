import { MongoClient, GridFSBucket, ObjectId } from "mongodb";
import fs from "fs";

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri, { useUnifiedTopology: true });

let db = null;

export async function getStudentDB() {
  if (db) return db;

  await client.connect();
  db = client.db("students");
  console.log("Connected to MongoDB:", uri);

  return db;
}

export async function getGridFSBucket() {
  const database = await getStudentDB();
  return new GridFSBucket(db, { bucketName: "files" });
}

export async function uploadPDF(file, email) {
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

export async function getPDFMetadata(fileId) {
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

export async function studentPOST(gradeNumber, email, room, fileIds, name) {
  const db = await getStudentDB();
  const collection = db.collection("data");

  const student = {
    grade: gradeNumber,
    email,
    room,
    name: name || "",
    files: fileIds,
    updatedAt: new Date(),
    status: "Pending"
  };

  await collection.updateOne(
    { grade: gradeNumber, email },
    { $set: student },
    { upsert: true }
  );
}

export async function studentGETByGrade(grade, email) {
  const db = await getStudentDB();
  const results = await db
    .collection("data")
    .find(
      { grade: grade, email : email},
      { projection: { _id: 1, name: 1, email: 1, grade: 1, files: 1, room: 1, status: 1 } }
    )
    .toArray();

  return results[0] || null; // Return the first result or null if none found
}

export async function studentGETById(submissionId) {
  const db = await getStudentDB();
  const results = await db
    .collection("data")
    .find(
      { _id : new ObjectId(submissionId) },
      { projection: { _id: 1, name: 1, email: 1, grade: 1, files: 1, room: 1, status: 1 } }
    )
    .toArray();

  return results[0] || null; // Return the first result or null if none found
}

export async function studentsGET(gradeNumber) {
  return (await getStudentDB())
    .collection("data")
    .find({ grade: gradeNumber })
    .toArray();
}

export async function roomGET(gradeNumber, roomKey) {
  const students = await (await getStudentDB())
    .collection("data")
    .find(
      { grade: gradeNumber, room: roomKey },
      { projection: { name: 1, _id: 0, status : 1} }
    )
    .toArray();

  return students.map((s) => ({"name" : s.name, "status" : s.status}));
}

export async function roomsGET(gradeNumber) {
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

export async function updateStudentSubmissionById(submissionId, key, value) {
  const db = await getStudentDB();
  const collection = db.collection("data");

  const update = { $set: { [key]: value, updatedAt: new Date() } };

  const result = await collection.updateOne(
    { _id: new ObjectId(submissionId) },
    update
  );

  if (result.matchedCount === 0) {
    throw new Error("No submission found with the given ID");
  }

  return result;
}
/**
 * Fetch all submissions
 */
export async function submissionsGET(){
  const db = await getStudentDB();

  const submissions = await db.collection("data").find({}).toArray();

  return submissions
}

export async function downloadPDF(fileId) {
  const bucket = await getGridFSBucket();

  return new Promise((resolve, reject) => {
    const downloadStream = bucket.openDownloadStream(fileId);
    const chunks = [];

    downloadStream.on("data", (chunk) => chunks.push(chunk));
    downloadStream.on("error", reject);
    downloadStream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}