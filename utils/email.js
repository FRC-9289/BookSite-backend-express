import nodemailer from "nodemailer";

export async function sendApprovalEmail(toEmail) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: "✅ You’re Approved!",
    text: "Congrats! You’ve been approved.",
    html: "<h1>Congrats! 🎉</h1><p>You have been approved by admin. Please do navigate to _____ to sign up to your bus, and welcome aboard!</p>",
  });
}