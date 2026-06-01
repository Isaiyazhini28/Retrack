import db from "..//db.js";
import  {sendOfferLetter}  from "../services/mailService.js";

export const sendOffer = async (req, res) => {
  const { candidate_id, job_id, salary } = req.body;

  try {
    const [candidate] = await db.query(
      "SELECT email, first_name, last_name FROM external_candidates WHERE id = ?",
      [candidate_id]
    );

    const [job] = await db.query(
      "SELECT title FROM jobs WHERE id = ?",
      [job_id]
    );

    const messageId = await sendOfferLetter(
      candidate[0].email,
      candidate[0].first_name,
      job[0].title
    );

    await db.query(
      "INSERT INTO offer_letters (candidate_id, job_id, offered_salary, mail_message_id) VALUES (?, ?, ?, ?)",
      [candidate_id, job_id, salary, messageId]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Offer send failed" });
  }
};