// backend/services/mailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create transporter for Gmail (or any SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: "isai12d25@gmail.com",
    pass: "keka dcyg ypus tpwn",
  }
});

// Function to send offboarding email
export const sendEmail = async (to, subject, text) => {
  try {
    const info = await transporter.sendMail({
      from: "isai12d25@gmail.com",
      to,
      subject,
      text,
    });

    console.log(`📧 Email sent to ${to} | ID: ${info.messageId}`);
    return info.messageId;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
};

// Offboarding email template
export const sendOffboardingEmail = async (to, employeeName, lastDay) => {
  const subject = "Offboarding Notification";

  const text = `Hi ${employeeName},

Your offboarding process has been scheduled.

Last Working Day: ${lastDay}

Please ensure:
• Company assets are returned
• Knowledge transfer is completed
• Access handover is done

Thank you for your contributions!

Regards,
HR Team`;

  return sendEmail(to, subject, text);
};