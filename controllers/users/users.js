import { fetchStudentByEmail } from "../../db/dbFunctions";

export async function getStudentByEmail(req,res){
    const email = req.query.email;
    if(!email) return res.status(400).json({error: "Email query parameter is required"});
    
    const student = await fetchStudentByEmail(email);
    if(!student) return res.status(404).json({error: "Student not found"});
    
    res.json(student);
}