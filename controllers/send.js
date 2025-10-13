import nodemailer from "nodemailer";

export async function send(to, subject, status = "pending") {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });

    let html;
    if (status === "approved") {
      html = getApprovalEmailContent(to);
    } else if (status === "rejected") {
      html = getRejectedEmailContent(to);
    } else {
      html = getPendingEmailContent(to);
    }
    const mailOptions = {
      from: `"The Village Tech Team" <${process.env.USER}>`,
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

function getApprovalEmailContent(to) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h1>You've Been Approved!</h1>
      <p>Dear ${to},</p>
      <p>We are pleased to inform you that your request has been approved.</p>
      <p>Thank you for being a part of our community — congratulations!</p>
      <p>Best Regards,</p>
      <p><b>The Village Robotics Team</b></p>
    </div>
  `;
}

function getRejectedEmailContent(to) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h1>Application Update</h1>
      <p>Dear ${to},</p>
      <p>We regret to inform you that your request has been rejected.</p>
      <p>If you have any questions, please reach out to us.</p>
      <p>Best Regards,</p>
      <p><b>The Village Robotics Team</b></p>
    </div>
  `;
}

function getPendingEmailContent(to) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h1>Application Received</h1>
      <p>Dear ${to},</p>
      <p>Your application has been received and is currently under review.</p>
      <p>We’ll notify you once it’s processed.</p>
      <p>Best Regards,</p>
      <p><b>The Village Robotics Team</b></p>
    </div>
  `;
}
//Brainspark1 + Wolfram121