import { 
  pushComment, 
  studentGETById, 
  updateStudentSubmissionById, 
  downloadPDF, 
  submissionsGET, 
  getPDFMetadata, 
  fetchComments, 
  postGradeConfig,
  fetchGradeConfig
 } from "./service.js";
import { sendEmail } from "../utils/sendMail.js";

export async function manageStatus(req, res) {
  try {
    const { status, submissionId } = req.query;
    console.log("manageStatus called with:", { status, submissionId });

    const updated = await studentGETById(submissionId);
    if (!updated) return res.status(404).json({ error: 'Submission not found' });

    await updateStudentSubmissionById(submissionId, 'status', status);

    console.log(`Updating Submission of ID: ${submissionId} to status: ${status}`);
    console.log(`Sending email to ${updated.email} (${updated.name})`);

    let success = { success: true };

    const getEmailHTML = (name, message, accentColor = "#4caf50") => `
    <div style="
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background-color: #f9f9f9;
    ">
      <h2 style="color: ${accentColor}; margin-bottom: 20px;">Hello ${name},</h2>
      <p style="font-size: 16px; margin-bottom: 20px;">${message}</p>
      <p style="font-size: 16px; margin-top: 30px;">
        Best regards,<br/>
        <strong>The Village Tech Team</strong>
      </p>
    </div>
    `;
    

    if (status === 'Approved') {
      success = await sendEmail(
        updated.email,
        'Signup Approved',
        getEmailHTML(updated.name, 'Your submission has been approved. Welcome aboard!', '#4caf50') // green
      );
    } else if (status === 'Pending') {
      success = await sendEmail(
        updated.email,
        'Signup Pending',
        getEmailHTML(updated.name, 'Your submission is pending. We will notify you with further updates.', '#ff9800') // orange
      );
    } else if (status === 'Denied') {
      success = await sendEmail(
        updated.email,
        'Signup Denied',
        getEmailHTML(updated.name, 'Your submission has been denied. We will notify you with further updates.', '#f44336') // red
      );
    }
    

    console.log(success);
    res.status(success.success ? 200 : 500).json(success);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
}


/**
 * Get all submissions
 */
export async function getSubmissions(req, res) {
    try {
        const submissions = await submissionsGET();
    
        // Prepare the populated submissions array
        const populatedSubmissions = [];
    
        for (const submission of submissions) {
        const populated = { ...submission, filesData: [] };
    
        if (Array.isArray(submission.files) && submission.files.length > 0) {
            let i=0;
            for (const fileId of submission.files) {
            try {;
                const pdfBuffer = await downloadPDF(fileId);
                populated.filesData.push({
                fileId,
                pdfType : submission.pdfNames[i],
                fileName : (await getPDFMetadata(fileId))?.filename || "unknown.pdf",
                base64: pdfBuffer.toString("base64"),
                mimeType: "application/pdf",
                });
            } catch (err) {
                console.warn(`⚠️ Failed to download file ${fileId}:`, err.message);
                populated.filesData.push({
                fileId,
                error: "Failed to retrieve file from GridFS",
                });
            }
            i++;
            }
        }
    
        populatedSubmissions.push(populated);
        }
    
        // ✅ Only send response ONCE after all processing is done
        return res.status(200).json(populatedSubmissions);
    
    } catch (err) {
        console.error("❌ Error in submissionGET:", err);
        if (!res.headersSent) {
        res.status(500).json({ error: "Internal Server Error" });
        }
    }
    }

export async function addComment(req, res){
  const { comment, submissionId } = req.body;

  try {
    const { commentId } = await pushComment(comment, submissionId);
    res.status(200).json({ success : true, commentId});

    const student = await studentGETById(submissionId);

    const email = student.email;
    const name = student.name;
    sendEmail(email, "You have a new comment on your submission", `
<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
  <h1 style="color: #4caf50; margin-bottom: 20px; font-size: 24px;">You have a new comment on your submission</h1>
  
  <div style="margin-bottom: 20px;">
    <h2 style="font-size: 20px; margin-bottom: 10px;">Hello ${name},</h2>
    <p style="font-size: 16px; margin-bottom: 10px;">
      A new comment has been left on your submission:
    </p>
    <div style="background-color: #ffffff; border-left: 4px solid #4caf50; padding: 12px 16px; border-radius: 4px; font-size: 16px; margin-bottom: 20px;">
      ${comment}
    </div>
    <p style="font-size: 16px;">
      You can log in to your account to view and reply to comments.
    </p>
  </div>

  <p style="font-size: 16px; margin-top: 30px;">
    Best regards,<br/>
    <strong>The Village Tech Team</strong>
  </p>
</div>
`)
  } catch(error){
    res.status(500).json({err : error.toString()});
  }
}

export async function getComments(req, res) {
  const { submissionId } = req.query;

  if (!submissionId) {
    return res.status(400).json({ success: false, error: "Missing submissionId" });
  }

  try {
    const comments = await fetchComments(submissionId);

    res.status(200).json({ success: true, comments });
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ success: false, error: err.message || err });
  }
}

export async function createGradeConfig(req, res) {
  const { grade, maleRooms, femaleRooms, numPdfs, pdfNames } = req.body;

  if (!(grade && maleRooms && femaleRooms && numPdfs && pdfNames)) {
    return res.status(400).json({ success: false, error: "Missing required fields: grade, maleRooms, femaleRooms" });
  }

  if (!Array.isArray(maleRooms) || !Array.isArray(femaleRooms)) {
    return res.status(400).json({ success: false, error: "maleRooms and femaleRooms must be arrays" });
  }

  try {
    const result = await postGradeConfig(grade, maleRooms, femaleRooms, numPdfs, pdfNames);
    res.status(200).json({ success: true, message: "Grade config created/updated successfully" });
  } catch (err) {
    console.error("Error creating grade config:", err);
    res.status(500).json({ success: false, error: err.message || err });
  }
}

export async function getGradeConfig(req, res) {
  const { grade } = req.query;

  if (!grade) {
    return res.status(400).json({ success: false, error: "Missing grade parameter" });
  }

  try {
    let config = await fetchGradeConfig(grade);
    if (!config) {
      config = {
        grade : grade,
        femaleRooms : [],
        maleRooms : [],
        numPdfs : 1,
        pdfNames : ["PDF not set up yet"]
      }
    }
    res.status(200).json({ success: true, config });
  } catch (err) {
    console.error("Error fetching grade config:", err);
    res.status(500).json({ success: false, error: err.message || err });
  }
}
