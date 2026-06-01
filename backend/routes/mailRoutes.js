import express from "express";
import {
  sendOfferMail,
  simulateReply
} from "../controllers/mailController.js";

const router = express.Router();

router.post("/offer/:candidateId", sendOfferMail);

/* 
  Simulated reply endpoint
  body: { decision: "ACCEPT" or "REJECT" }
*/
router.post("/reply/:candidateId", simulateReply);

export default router;