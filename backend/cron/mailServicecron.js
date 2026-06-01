import cron from "node-cron";
import pool from "../db.js";
import { sendOfferLetter } from "../services/mailService.js";

// Configurable delays
const OFFER_SEND_DELAY_MINUTES = parseInt(process.env.OFFER_SEND_DELAY_MINUTES || "1"); // test 1 min
const OFFER_AUTO_REJECT_DAYS = parseInt(process.env.OFFER_AUTO_REJECT_DAYS || "10"); // default 10 days

// Helper to process async tasks sequentially (or in parallel if needed)
async function processQueue(items, handler) {
  for (const item of items) {
    try {
      await handler(item);
    } catch (err) {
      console.error("Queue Processing Error:", err.message, item);
    }
  }
}

/* 1️⃣ Insert new Level 3 passed candidates every hour */
cron.schedule("5 0 * * *", async () => { // hourly at minute 0
  try {
    const [result] = await pool.query(`
      INSERT INTO offer_letters (candidate_id, position, offer_status, passed_at)
      SELECT i.candidate_id, i.position, 'Pending', NOW()
      FROM interviews i
      WHERE i.level_id = 3
        AND i.status = 'Passed'
        AND NOT EXISTS (
          SELECT 1 
          FROM offer_letters ol 
          WHERE ol.candidate_id = i.candidate_id
        );
    `);
    console.log(`[${new Date().toISOString()}] Inserted ${result.affectedRows} new Level 3 passed candidates.`);
  } catch (err) {
    console.error("Insert Error:", err.message);
  }
});

/* 2️⃣ Send offer emails after configured delay every 5 minutes */
cron.schedule("*/5 * * * *", async () => { 
  try {
    const [offers] = await pool.query(`
      SELECT ol.id, ec.email, ec.first_name, ol.position
      FROM offer_letters ol
      JOIN external_candidates ec ON ec.id = ol.candidate_id
      WHERE ol.offer_status = 'Pending'
        AND ol.sent_at IS NULL
        AND NOW() >= DATE_ADD(ol.passed_at, INTERVAL ? MINUTE)
    `, [OFFER_SEND_DELAY_MINUTES]);

    await processQueue(offers, async (offer) => {
      const messageId = await sendOfferLetter(offer.email, offer.first_name, offer.position);
      await pool.query(`
        UPDATE offer_letters
        SET offer_status = 'Sent',
            sent_at = NOW(),
            mail_message_id = ?
        WHERE id = ?
      `, [messageId, offer.id]);
      console.log(`[${new Date().toISOString()}] Offer sent to ${offer.email} for ${offer.position}`);
    });
  } catch (err) {
    console.error("Send Offer Error:", err.message);
  }
});

/* 3️⃣ Auto-reject unresponded offers daily at midnight */
cron.schedule("0 0 * * *", async () => { // runs daily at 00:00
  try {
    const [expiredOffers] = await pool.query(`
      SELECT id, candidate_id
      FROM offer_letters
      WHERE offer_status = 'Sent'
        AND sent_at IS NOT NULL
        AND sent_at <= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [OFFER_AUTO_REJECT_DAYS]);

    await processQueue(expiredOffers, async (offer) => {
      await pool.query(`
        UPDATE offer_letters
        SET offer_status = 'Rejected', responded_at = NOW()
        WHERE id = ?
      `, [offer.id]);
      console.log(`[${new Date().toISOString()}] Auto-rejected candidate ${offer.candidate_id}`);
    });
  } catch (err) {
    console.error("Auto-Reject Error:", err.message);
  }
});