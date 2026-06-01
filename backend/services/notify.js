import nodemailer from "nodemailer";
import pool from "../db.js"; 

const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: "isai12d25@gmail.com",
    pass: "keka dcyg ypus tpwn",
  },
});

// 🔔 Interview Reminder Email (24h / 2h)
export const sendInterviewReminderMail = async (
  to,
  candidateName,
  interviewDate,
  beforeText

) => {
  await transporter.sendMail({
    from: "isai12d25@gmail.com",
    to,
    subject: "⏰ Interview Reminder",
    html: `
      <p>Hi <b>${candidateName}</b>,</p>

      <p>
        This is a reminder that your interview is scheduled
        <b>${beforeText}</b>.
      </p>

      <p>
        <b>Date & Time:</b><br/>
        ${new Date(interviewDate).toLocaleString()}
      </p>

      <p>Please be available on time.</p>

      <p>
        Best of luck!<br/>
        Recruitment Team
      </p>
    `,
  });
};

/* ✅ SHORTLIST MAIL */
export const sendShortlistMail = async (
  to,
  interviewDate,
  round,
  interviewLink,
  expiryTime
) => {
  let html = `<p>Congratulations! You are shortlisted for <b>${round}</b> round.</p>`;

  if (round === "HR") {
    html += `
      <p><b>Date:</b> ${new Date(interviewDate).toLocaleString()}</p>
      <p><a href="${interviewLink}">Join Interview</a></p>
    `;
  } else {
    html += `
      <p><a href="${interviewLink}">Start Test</a></p>
      <p><b>Expires On:</b> ${new Date(expiryTime).toLocaleString()}</p>
    `;
  }

  await transporter.sendMail({
    from: "isai12d25@gmail.com",
    to,
    subject: `Interview Round - ${round}`,
    html,
  });
};







export const sendRejectionMail = async (to) => {
  await transporter.sendMail({
    from: "isai12d25@gmail.com",
    to,
    subject: "Application Update",
    html: `
      <p>Thank you for applying.</p>
      <p>After review, we regret to inform you that you were not shortlisted.</p>
    `,
  });
};


export const createInAppNotification = async (
  candidateId,
  title,
  message
) => {
  await pool.query(
    `INSERT INTO notifications (candidate_id, title, message)
     VALUES (?, ?, ?)`,
    [candidateId, title, message]
  );
};

export const createAdminNotification = async (title, message) => {
  await pool.query(
    `INSERT INTO notifications (title, message)
     VALUES (?, ?)`,
    [title, message]
  );
};


