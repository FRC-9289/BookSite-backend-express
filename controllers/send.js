import nodemailer from "nodemailer";

export async function send(to, subject, status = "pending", reason = "") {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });

    let name = to.replace(/_/g, " ").replace(/(^\w|\s\w)(?=\w*@)/g, c => c.toUpperCase()).split("@")[0];

    let html;
    if (status === "approved") {
      html = getApprovalEmailContent(name);
    } else if (status === "rejected") {
      html = getRejectedEmailContent(name, reason);
    } else {
      html = getPendingEmailContent(name);
    }
    const mailOptions = {
      from: `"Wolftech Industries" <${process.env.USER}>`,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);

    console.log(`Email sent to ${to} with status: ${status}`);
    return { success: true };
  } catch (err) {
    console.error("Email sending failed:", err);
    return { success: false, error: err.message };
  }
}

function getApprovalEmailContent(name) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h1>Application Approved</h1>
      <p>Dear ${name},</p>
      <p>We are pleased to inform you that your request has been approved.</p>
      <p>Best Regards,</p>
      <p><b>Wolftech Industries</b></p>
    </div>
  `;
}

function getRejectedEmailContent(name, reason) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h1>Application Rejected</h1>
      <p>Dear ${name},</p>
      <p>We regret to inform you that your request has been rejected.</p>
      <p>Reason: ${reason}</p>
      <p>Best Regards,</p>
      <p><b>Wolftech Industries</b></p>
    </div>
  `;
}

function getPendingEmailContent(name) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h1>Application Received</h1>
      <p>Dear ${name},</p>
      <p>Your application has been received and is currently under review.</p>
      <p>We will notify you once it is processed.</p>
      <p>Best Regards,</p>
      <p><b>Wolftech Industries</b></p>
    </div>
  `;
}
//Brainspark1 + Wolfram121