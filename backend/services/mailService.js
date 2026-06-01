import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "isai12d25@gmail.com",
    pass: "keka dcyg ypus tpwn",
  },
});

export const sendOfferLetter = async (
  candidateEmail,
  candidateName,
  jobTitle
) => {

  const formLink = "https://docs.google.com/forms/d/e/1FAIpQLSc7uyFL02I2PoA4Oe4_-TrRXw3UVhLlLwrQAiVa516Q2v9fgw/viewform";

  const mailOptions = {
    from: "isai12d25@gmail.com",
    to: candidateEmail,
    subject: `Official Offer Letter - ${jobTitle}`,
    text: `Dear ${candidateName},

We are pleased to offer you the position of ${jobTitle}.

Please complete the form below:
${formLink}

Reply with ACCEPT or REJECT after filling the form.

Regards,
HR Team`,

    html: `
      <p>Dear ${candidateName},</p>

      <p>We are pleased to offer you the position of <b>${jobTitle}</b>.</p>

      <p>Please fill the candidate details form:</p>

      <p>
        <a href="${formLink}" target="_blank">
          Fill Candidate Details Form
        </a>
      </p>

      <p>After submitting the form, please reply with:<br>
      <b>ACCEPT</b> or <b>REJECT</b></p>

      <p>Regards,<br>HR Team</p>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  return info.messageId;

  
};
