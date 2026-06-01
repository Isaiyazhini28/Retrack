import nodemailer from "nodemailer";

export const sendEmailOtp = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    to: email,
    subject: "OTP Verification",
    text: `Your OTP is ${otp}`,
  });
};

export const sendInterviewReminderMail = async (
  to,
  candidateName,
  interviewDate,
  beforeText
) => {
  await transporter.sendMail({
    from: process.env.EMAIL,
    to,
    subject: "⏰ Interview Reminder",
    html: `
      <p>Hi <b>${candidateName}</b>,</p>
      <p>This is a reminder that your interview is scheduled in <b>${beforeText}</b>.</p>
      <p><b>Date & Time:</b> ${new Date(interviewDate).toLocaleString()}</p>
      <p>All the best!<br/>Recruitment Team</p>
    `,
  });
};

/* ✅ SHORTLIST MAIL */
export const sendShortlistMail = async (to, score, date) => {
  await transporter.sendMail({
    from: process.env.EMAIL,
    to,
    subject: "Application Update - Shortlisted",
    html: `
      <p>Congratulations! You have been shortlisted.</p>
      <p>Your AI resume score: <b>${score}</b></p>
      ${date ? `<p>Interview scheduled on <b>${date}</b></p>` : ""}
    `,
  });
};

/* ❌ REJECTION MAIL */
export const sendRejectionMail = async (to, score) => {
  await transporter.sendMail({
    from: process.env.EMAIL,
    to,
    subject: "Application Update",
    html: `
      <p>Thank you for applying.</p>
      <p>Your AI resume score: <b>${score}</b></p>
    `,
  });
};
