import express from "express";
import { getAllocations } from "../controllers/trainerController.js";

const router = express.Router();

router.get("/allocations", getAllocations);

export default router;