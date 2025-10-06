// fetchStudents.js
import { findUserByEmail } from "../../db/dbFunctions.js";

export default async function fetchStudentSubmissions(req, res) {
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
