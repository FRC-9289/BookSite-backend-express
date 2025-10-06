import { MongoClient, GridFSBucket } from "mongodb";

const uri = "mongodb://localhost:27017";
export const client = new MongoClient(uri);

let db = null;

/**
 * Connect once and reuse DB
 */
export async function getDB() {
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
    const db = await getDB();
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
  const db = await getDB();
  const bucket = new GridFSBucket(db, { bucketName: "pdfs" });

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(file.originalname, {
      contentType: file.mimetype,
      metadata: { email },
    });

    uploadStream.end(file.buffer, (err, fileDoc) => {
      if (err) {
        console.error("Error uploading file to GridFS:", err);
        return reject(err);
      }
      resolve(fileDoc);
    });
  });
}
