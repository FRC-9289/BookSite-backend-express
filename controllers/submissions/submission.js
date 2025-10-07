// fetchStudents.js
import { fetchStudentByEmail, uploadPDF, uploadSubmission, fetchAllSubmissions } from "../../db/dbFunctions.js";
import { connectToDB } from "../../db/db.js";
import { GridFSBucket } from "mongodb";

export async function getStudentSubmissions(req, res) {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ error: "Email query parameter is required" });

    const student = await fetchStudentByEmail(email);
    if (!student) return res.status(404).json({ error: "Student not found" });

    res.json(student);
  } catch (error) {
    console.error("Error fetching student submissions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function postSubmissions(req, res) {
  try {
    const { email, room, name } = req.body;
    const fileIds = [];
    const fileNames = [];

    for (const file of req.files) {
      const fileId = await uploadPDF(file, email);
      console.log(`Uploaded ${file.originalname}`);
      fileIds.push(fileId);
      fileNames.push(file.originalname);
    }

    const submissionId = await uploadSubmission(email, name, room, fileIds, fileNames);

    res.json({ 
      message: "Submission uploaded successfully", 
      submissionId 
    });

  } catch (error) {
    console.error("Error uploading files:", error);
    return res.status(500).json({ error: "Error uploading submission" });
  }
}


export async function getAllSubmissions(req,res){
  const submissions = await fetchAllSubmissions();
  res.status(200).json(submissions);
}

export async function getStudentByEmail(req,res){
  const email = req.query.email;
  if(!email) return res.status(400).json({error: "Email query parameter is required"});

  const student = await fetchStudentByEmail(email);
  if(!student) return res.status(404).json({error: "Student not found"});

  res.json(student);
}