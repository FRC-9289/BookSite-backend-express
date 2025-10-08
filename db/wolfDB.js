const { MongoClient, GridFSBucket } = require("mongodb");

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri, { useUnifiedTopology: true });

let db = null;

async function getStudentDB() {
  if (db) return db;
  await client.connect();
  db = client.db("students");
  return db;
}

function getGridFSBucket() {
  if (!db) throw new Error("DB not initialized");
  return new GridFSBucket(db, { bucketName: "files" });
}

async function uploadPDF(file, email) {
  const bucket = getGridFSBucket();

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

async function studentPOST(email, room, fileIds) {
  const collection = (await getStudentDB()).collection("students");

  const student = {
    email,
    room,
    files: fileIds,
    updatedAt: new Date(),
  };

  await collection.updateOne({ email }, { $set: student }, { upsert: true });
}

async function studentGET(email) {
  return (await getStudentDB()).collection("students").findOne({ email });
}

async function studentsGET() {
  return (await getStudentDB()).collection("students").studentGET({}).toArray();
}

async function roomGET(roomKey) {
  const students = await (await getStudentDB()).collection("students")
    .studentGET({ room: roomKey }, { projection: { email: 1, _id: 0 } })
    .toArray();
  return students.map(s => s.email);
}

async function roomsGET() {
  const students = await (await getStudentDB())
    .collection('students')
    .find({}, { projection: { room: 1, email: 1 } })
    .toArray();

  const roomMap = {};

  for (const s of students) {
    if (!s.room) continue;
    if (!roomMap[s.room]) roomMap[s.room] = [];
    roomMap[s.room].push(s.email);
  }

  const result = Object.entries(roomMap).map(([room, emails]) => [room, ...emails]);
  return result;
}

module.exports = {
  getStudentDB,
  getGridFSBucket,
  uploadPDF,
  studentPOST,
  studentGET,
  studentsGET,
  roomGET,
  roomsGET
};
//Wolfram121