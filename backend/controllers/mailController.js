import db from "..//db.js";
import nodemailer from "nodemailer";

/* ===============================
   SEND OFFER LETTER
================================ */

export const sendOfferMail = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const [rows] = await db.promise().query(
      "SELECT * FROM external_candidates WHERE id=?",
      [candidateId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const candidate = rows[0];

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "yourgmail@gmail.com",
        pass: "yourapppassword"
      }
    });

    await transporter.sendMail({
      from: "yourgmail@gmail.com",
      to: candidate.email,
      subject: "Offer Letter",
      html: `
        <h3>Congratulations ${candidate.first_name}</h3>
        <p>Please reply ACCEPT or REJECT.</p>
      `
    });

    res.json({ message: "Offer mail sent" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ===============================
   SIMULATED ACCEPT / REJECT
================================ */

export const simulateReply = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { decision } = req.body;

    if (decision === "ACCEPT") {
      await db.promise().query(
        "UPDATE external_candidates SET shortlist_status='selected' WHERE id=?",
        [candidateId]
      );

      return res.json({ message: "Candidate accepted offer" });
    }

    if (decision === "REJECT") {
      await db.promise().query(
        "UPDATE external_candidates SET shortlist_status='rejected' WHERE id=?",
        [candidateId]
      );

      return res.json({ message: "Candidate rejected offer" });
    }

    res.status(400).json({ message: "Invalid decision" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};