import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
   user: "isai12d25@gmail.com",
    pass: "keka dcyg ypus tpwn",
  }
});

export const sendTaskAssignmentEmail = async (email, task) => {

  try {

    await transporter.sendMail({
      from: "AI Project Manager",
      to: email,
      subject: "Task Assignment",
      text: `You have been assigned task: ${task}`
    });

    console.log("Email sent to", email);

  } catch (err) {

    console.error("Email error:", err.message);

  }
};