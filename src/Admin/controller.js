import {
  pushComment,
  studentGETById,
  updateStudentSubmissionById,
  downloadPDF,
  submissionsGET,
  getPDFMetadata,
  fetchComments,
  postGradeConfig,
  fetchGradeConfig,
  updateFileStatus
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

    if (status === 'Approved') {
      success = await sendEmail(
        updated.email,
        'Signup Approved',
        `<div style="font-family: sans-serif; line-height: 1.5;">
           <h2>Hello ${updated.name},</h2>
           <p>Your submission has been approved. Welcome aboard!</p>
           <br/>
           <p>The Village Tech Team</p>
         </div>`
      );
    } else if (status === 'Pending') {
      success = await sendEmail(
        updated.email,
        'Signup Pending',
        `<div style="font-family: sans-serif; line-height: 1.5;">
           <h2>Hello ${updated.name},</h2>
           <p>Your submission is pending. We will notify you further for more updates.</p>
           <br/>
           <p>The Village Tech Team</p>
         </div>`
      );
    } else if (status === 'Denied') {
      success = await sendEmail(
        updated.email,
        'Signup Denied',
        `<div style="font-family: sans-serif; line-height: 1.5;">
           <h2>Hello ${updated.name},</h2>
           <p>Your submission has been denied. We will notify you further for more updates.</p>
           <br/>
           <p>The Village Tech Team</p>
         </div>`
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

          console.log(submission);

          if (Array.isArray(submission.files) && submission.files.length > 0) {
              for (const fileId of submission.files) {
              try {;
                  const pdfBuffer = await downloadPDF(fileId.id);
                  populated.filesData.push({
                  fileId: fileId.id,
                  pdfType: (await getPDFMetadata(fileId.id))?.filename || "unknown.pdf",
                  base64: pdfBuffer.toString("base64"),
                  });
              } catch (err) {
                  console.warn(`⚠️ Failed to download file ${fileId.id}:`, err.message);
                  populated.filesData.push({
                  fileId: fileId.id,
                  error: "Failed to retrieve file from GridFS",
                  });
              }
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
      <h1>You have a new comment on your submission</h1>
      <div style="font-family: sans-serif; line-height: 1.5;">
        <h2>Hello ${name},</h2>
        <p>A new comment has been left on your submission:</p>
        <p>${comment}</p>
        <br/>
        <p>The Village Tech Team</p>
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
  const { grade, maleRooms, femaleRooms } = req.body;

  if (!grade || !maleRooms || !femaleRooms) {
    return res.status(400).json({ success: false, error: "Missing required fields: grade, maleRooms, femaleRooms" });
  }

  if (!Array.isArray(maleRooms) || !Array.isArray(femaleRooms)) {
    return res.status(400).json({ success: false, error: "maleRooms and femaleRooms must be arrays" });
  }

  try {
    const result = await postGradeConfig(grade, maleRooms, femaleRooms);
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
        maleRooms : []
      }
    }
    res.status(200).json({ success: true, config });
  } catch (err) {
    console.error("Error fetching grade config:", err);
    res.status(500).json({ success: false, error: err.message || err });
  }
}

export async function manageFileStatus(req, res) {
  try {
    const { submissionId, fileId, status } = req.query;
    console.log("manageFileStatus called with:", { submissionId, fileId, status });

    if (!submissionId || !fileId || !status) {
      return res.status(400).json({ success: false, error: "Missing required parameters: submissionId, fileId, status" });
    }

    const validStatuses = ['Pending', 'Correct', 'Incorrect'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status. Must be one of: Pending, Correct, Incorrect" });
    }

    const updated = await updateFileStatus(submissionId, fileId, status);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Submission or file not found' });
    }

    console.log(`Updated file status for submission ${submissionId}, file ${fileId} to ${status}`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error updating file status:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
