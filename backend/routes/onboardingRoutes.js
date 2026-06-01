import express from "express";
import {
  processCandidate,
  initiateOnboarding
} from "../controllers/onboardingController.js";

const router = express.Router();


router.post("/process/:candidateId", processCandidate);
router.post("/initiate/:candidateId", initiateOnboarding);

export default router;