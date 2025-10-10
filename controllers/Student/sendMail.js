import nodemailer from "nodemailer";

export async function sendConfirmationEmail(email, grade, room) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });

    const mailOptions = {
      from: `"The Village Robotics Team" <${process.env.USER}>`,
      to: email,
      subject: `Submission Received (Grade ${grade})`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.5;">
          <h2>Hello ${email},</h2>
          <p>Thanks for your submission for <strong>Grade ${grade}</strong>!</p>
          <p>We’ve received your files for room <strong>${room}</strong> and will review them soon.</p>
          <br/>
          <p>– The Village Robotics Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
