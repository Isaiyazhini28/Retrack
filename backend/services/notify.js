import nodemailer from "nodemailer";

export const sendMail = async (to, date) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "isai12d25@gmail.com",    
      pass: "keka dcyg ypus tpwn" 
    },
  });

  await transporter.sendMail({
    from: "isai12d25@gmail.com",
    to,
    subject: "Interview Scheduled",
    html: `<p>Your interview is scheduled on <b>${date}</b></p>`
  });
};
