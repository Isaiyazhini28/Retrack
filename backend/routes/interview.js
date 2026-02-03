import express from "express";

const router = express.Router();

import { getInterviews, updateStatus, nextRound, aiShortlistAndSchedule } from "../controllers/interviewController.js";

router.get("/", getInterviews); 
router.put("/:id/status", updateStatus);
router.post("/:id/next", nextRound);
router.post("/ai-shortlist/:jobId", aiShortlistAndSchedule);

export default router;
