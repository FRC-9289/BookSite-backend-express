import { initStudentDB } from "../utils/db/db.js";
import { GridFSBucket, ObjectId } from "mongodb";

export async function getGridFSBucket() {
    const database = await initStudentDB();
    return new GridFSBucket(database, { bucketName: "files" });
  }

export async function updateStudentSubmissionById(submissionId, key, value) {
    const db = await initStudentDB();
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

export async function studentGETById(submissionId) {
    const db = await initStudentDB();
    const results = await db
      .collection("data")
      .find(
        { _id : new ObjectId(submissionId) },
        { projection: { _id: 1, name: 1, email: 1, grade: 1, files: 1, room: 1, status: 1 } }
      )
      .toArray();
  
    return results[0] || null; // Return the first result or null if none found
}

export async function submissionsGET(){
    const db = await initStudentDB();
  
    const submissions = await db.collection("data").find({}).toArray();
  
    return submissions
  }

export async function getPDFMetadata(fileId) {
  const database = await initStudentDB();
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


  export async function pushComment(commentText, submissionId) {
    const db = await initStudentDB();
    const studentData = db.collection("data");
  
    const commentId = new ObjectId();
    const commentObj = {
      _id: commentId,
      text: commentText,
      createdAt: new Date(),
    };
  
    // Add comment to the array
    const result = await studentData.updateOne(
      { _id: new ObjectId(submissionId) },
      { $push: { comments: commentObj } }
    );
  
    if (result.modifiedCount === 0) {
      throw new Error("Failed to add comment: submission not found");
    }
  
    return { commentId: commentId.toString() };
  }