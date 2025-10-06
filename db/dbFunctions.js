import { MongoClient, GridFSBucket } from "mongodb";

const uri = "mongodb://localhost:27017";
export const client = new MongoClient(uri);

let db = null;

/**
 * Connect once and reuse DB
 */
export async function getStudentDB() {
  if (db) return db;
  await client.connect();
  db = client.db("students");
  return db;
}

/**
 * Find a user by email
 */
export async function findUserByEmail(email) {
  try {
    const db = await getStudentDB();
    const collection = db.collection("submissions");
    const student = await collection.findOne({ email });
    return student;
  } catch (err) {
    console.error("Error fetching student:", err);
    return null;
  }
}

/**
 * Upload a PDF to GridFS and return its file ID
 */
export async function uploadPDF(file, email) {
  const db = await getStudentDB();
  const bucket = new GridFSBucket(db, { bucketName: "pdfs" });

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(file.originalname, {
      contentType: file.mimetype,
      metadata: { email },
    });

    const fileId = uploadStream.id; // Get the file’s ObjectId immediately

    uploadStream.on("error", (err) => {
      console.error("Error uploading file to GridFS:", err);
      reject(err);
    });

    uploadStream.on("finish", () => {
      resolve(fileId); // Resolve with just the file ID
    });

    uploadStream.end(file.buffer);
  });
}

/**
 * 
 * @param email 
 * @param name 
 * @param room 
 * @param fileIds 
 * 
 * Upload submission details to the database
 */

export async function uploadSubmission(email, name, room, fileIds){
  const db = await getStudentDB();
  const collection = db.collection("submissions");

  const submission = {
    email,
    name,
    room,
    files: fileIds,
    submittedAt: new Date(),
  };

  await collection.updateOne(
    { email },
    { $set: submission },
    { upsert: true }
  );

}

export async function fetchAllSubmissions(){
  const db = await getStudentDB();
  const collection = db.collection("submissions");
  const submissions = await collection.find({}).toArray();
  return submissions;
}