import express from "express";
import db from "../db.js";

const router = express.Router();

router.get("/all", async (req, res) => {
  try {
    const query = "SELECT * FROM background_verifications";

    const [results] = await db.query(query);

    res.json(results);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;