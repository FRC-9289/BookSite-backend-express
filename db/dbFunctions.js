import { MongoClient, GridFSBucket } from "mongodb";

const uri = "mongodb://localhost:27017";
export const client = new MongoClient(uri);

let db = null;

/**
 * Connect once and reuse student DB
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
export async function fetchStudentByEmail(email) {
  const db = await getStudentDB();
  const collection = db.collection("submissions");
  const submissions = await collection.find({email}).toArray();

  const bucket = new GridFSBucket(db, { bucketName: "pdfs" });

  const submissionsWithPDFs = await Promise.all(
    submissions.map(async (submission) => {
      const pdfFiles = await Promise.all(
        (submission.files || []).map(async (fileObj) => {
          const _id = typeof fileObj.fileId === "string" ? new ObjectId(fileObj.fileId) : fileObj.fileId;

          const chunks = [];
          await new Promise((resolve, reject) => {
            bucket.openDownloadStream(_id)
              .on("data", (chunk) => chunks.push(chunk))
              .on("error", (err) => reject(err))
              .on("end", () => resolve());
          });

          return {
            fileId: _id,
            fileName: fileObj.fileName,
            pdfBase64: Buffer.concat(chunks).toString("base64")
          };
        })
      );

      return {
        ...submission,
        pdfFiles
      };
    })
  );

  return submissionsWithPDFs;
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
export async function uploadSubmission(email, name, room, fileIds, fileNames) {
  const db = await getStudentDB();
  const collection = db.collection("submissions");

  const submission = {
    email,
    name,
    room,
    files: fileIds.map((id, idx) => ({
      fileId: id,
      fileName: fileNames[idx],
    })),
    submittedAt: new Date(),
  };

  const result = await collection.updateOne(
    { email },        // find by email
    { $set: submission }, // update document using $set
    { upsert: true }  // create if not exists
  );

  // Return the document _id
  return result.upsertedId
    ? result.upsertedId._id
    : (await collection.findOne({ email }))._id;
}



export async function fetchAllSubmissions() {
  const db = await getStudentDB();
  const collection = db.collection("submissions");
  const submissions = await collection.find({}).toArray();

  const bucket = new GridFSBucket(db, { bucketName: "pdfs" });

  const submissionsWithPDFs = await Promise.all(
    submissions.map(async (submission) => {
      const pdfFiles = await Promise.all(
        (submission.files || []).map(async (fileObj) => {
          const _id = typeof fileObj.fileId === "string" ? new ObjectId(fileObj.fileId) : fileObj.fileId;

          const chunks = [];
          await new Promise((resolve, reject) => {
            bucket.openDownloadStream(_id)
              .on("data", (chunk) => chunks.push(chunk))
              .on("error", (err) => reject(err))
              .on("end", () => resolve());
          });

          return {
            fileId: _id,
            fileName: fileObj.fileName,
            pdfBase64: Buffer.concat(chunks).toString("base64")
          };
        })
      );

      return {
        ...submission,
        pdfFiles
      };
    })
  );

  return submissionsWithPDFs;
}
/**
 * Get all student emails in a specific room
 */
export async function fetchStudentByRoom(room) {
  if (!room) throw new Error("Room is required");

  const db = await getStudentDB();
  const students = await db.collection("submissions")
    .find({ room })
    .toArray();

  return students
}

/**
 * Get all unique rooms
 */
export async function fetchAllRooms() {
  const db = await getStudentDB();
  const rooms = await db.collection("submissions")
    .distinct("room");

  return rooms;
}

export async function postRooms(name, roomId, submissionId) {
  const db = await getStudentDB();
  const roomsCollection = db.collection("rooms");
  
  const bus = roomId[0]; // e.g., "1"
  const gender = roomId[1] === "M" ? "Male" : "Female"; 
  const roomNumber = roomId[2]; // e.g., "1"
  
  const student = {
    Name: name,
    submissionId
  };
  try{
    // Use $push with a dynamic key
    await roomsCollection.updateOne(
      {}, // the first (and only) document
      {
        $push: {
          [`${bus}.${gender}.${roomNumber}`]: student
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`Added student to ${bus}.${gender}.${roomNumber}`);
    return { success: true };
  } catch(error){
    console.error("Error updating room:", error);
    return { success: false, error };
  }
}

export async function fetchAllRoomSubmissions(){
  const db = await getStudentDB();
  const roomsCollection = db.collection("rooms");
  
  const rooms = await roomsCollection.findOne({});

  return rooms;
}