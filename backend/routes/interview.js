import express from "express";

const router = express.Router();

import { getInterviews, updateStatus, nextRound } from "../controllers/interviewController.js";

router.get("/", getInterviews); 
router.put("/:id/status", updateStatus);
router.post("/:id/next", nextRound);

export default router;
