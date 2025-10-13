import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export async function sendEmail(to, subject, html) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"The Village Tech Team" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}