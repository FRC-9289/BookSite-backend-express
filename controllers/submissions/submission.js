// fetchStudents.js
import { findUserByEmail, uploadPDF } from "../../db/dbFunctions.js";
import { connectToDB } from "../../db/db.js";
import { GridFSBucket } from "mongodb";

export async function fetchStudentSubmissions(req, res) {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ error: "Email query parameter is required" });

    const student = await findUserByEmail(email);
    if (!student) return res.status(404).json({ error: "Student not found" });

    res.json(student);
  } catch (error) {
    console.error("Error fetching student submissions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function postSubmissions(req, res) {
  const fileIds = [];
  try {

    // Log form fields
    const { email, room, name } = req.body;
    console.log("Email:", email);
    console.log("Room:", room);
    console.log("UserName:", name);

    console.log(req.files)

    

    // Upload files to GridFS
    for (const file of req.files) {
      const fileId = await uploadPDF(file, email);
      console.log(`Uploaded ${file.originalname}`);
      fileIds.push(fileId);
    }
  }catch (error) {
    console.error("Error uploading files:", error);
    return res.status(500).json({ error: "Error uploading files" });
  }
  res.json({ message: "Files uploaded successfully", fileIds });
}