import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "isai12d25@gmail.com",
    pass: "keka dcyg ypus tpwn",
  },
});

export const sendInterviewScheduledMail = async (to, date) => {
  await transporter.sendMail({
    from: "isai12d25@gmail.com",
    to,
    subject: "Interview Scheduled",
    html: `<p>Your interview is scheduled on <b>${date}</b>.</p>`,
  });
};

export const sendShortlistMail = async (to, score, date) => {
  const interviewLine = date
    ? `<p>Your interview is scheduled on <b>${date}</b>.</p>`
    : "";

  await transporter.sendMail({
    from: "isai12d25@gmail.com",
    to,
    subject: "Application Update - Shortlisted",
    html: `
      <p>Congratulations! You have been shortlisted.</p>
      <p>Your AI resume score: <b>${score}</b>.</p>
      ${interviewLine}
    `,
  });
};

export const sendRejectionMail = async (to, score) => {
  await transporter.sendMail({
    from: "isai12d25@gmail.com",
    to,
    subject: "Application Update",
    html: `
      <p>Thank you for applying. We will not be moving forward at this time.</p>
      <p>Your AI resume score: <b>${score}</b>.</p>
    `,
  });
};
