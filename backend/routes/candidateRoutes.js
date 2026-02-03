
import express from "express";
import { applyCandidate, getCandidates } from "../controllers/candidateController.js";

const router = express.Router();

router.post("/apply", applyCandidate);
router.get("/", getCandidates);

export default router; // ✅ default export
