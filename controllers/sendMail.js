import nodemailer from "nodemailer";

/**
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject line
 * @param {string} userName - Recipient name for personalization
 * @param {"approved"|"rejected"|"pending"} status - Email type
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendEmail(to, subject, userName, status = "pending") {
  try {
    // Configure Gmail transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });

    // Select email content based on status
    let html;
    if (status === "approved") {
      html = getApprovalEmailContent(userName);
    } else if (status === "rejected") {
      html = getRejectedEmailContent(userName);
    } else {
      html = getPendingEmailContent(userName);
    }
    const mailOptions = {
      from: `"The Village Tech Team" <${process.env.USER}>`,
      to,
      subject,
      html,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent to ${to} with status: ${status}`);
    return { success: true };
  } catch (err) {
    console.error("❌ Email sending failed:", err);
    return { success: false, error: err.message };
  }
}

function getApprovalEmailContent(userName) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h1>You've Been Approved!</h1>
      <p>Dear ${userName},</p>
      <p>We are pleased to inform you that your request has been approved.</p>
      <p>Thank you for being a part of our community — congratulations!</p>
      <p>Best Regards,</p>
      <p><b>The Village Robotics Team</b></p>
    </div>
  `;
}

function getRejectedEmailContent(userName) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h1>Application Update</h1>
      <p>Dear ${userName},</p>
      <p>We regret to inform you that your request has been rejected.</p>
      <p>If you have any questions, please reach out to us.</p>
      <p>Best Regards,</p>
      <p><b>The Village Robotics Team</b></p>
    </div>
  `;
}

function getPendingEmailContent(userName) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h1>Application Received</h1>
      <p>Dear ${userName},</p>
      <p>Your application has been received and is currently under review.</p>
      <p>We’ll notify you once it’s processed.</p>
      <p>Best Regards,</p>
      <p><b>The Village Robotics Team</b></p>
    </div>
  `;
}