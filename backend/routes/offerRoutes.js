import express from "express";
import pool from "../db.js";
import { sendOffer } from "../controllers/offerController.js";
const router = express.Router();

router.post("/send", sendOffer);


// Updated: Return all offers for the candidate with candidate name
router.get("/status/:candidateId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ol.candidate_id,
              CONCAT(ec.first_name, ' ', ec.last_name) AS candidate_name,
              ec.email,
              ol.position,
              ol.offer_status
       FROM offer_letters ol
       JOIN external_candidates ec ON ec.id = ol.candidate_id
       WHERE ol.candidate_id = ?
       ORDER BY ol.id DESC`,
      [req.params.candidateId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});
// routes/offerRoutes.js  
router.get("/all", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ol.candidate_id,
              CONCAT(ec.first_name, ' ', ec.last_name) AS candidate_name,
              ec.email,
              ol.position,
              ol.offer_status
       FROM offer_letters ol
       JOIN external_candidates ec ON ec.id = ol.candidate_id
       ORDER BY ol.id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});

export default router;