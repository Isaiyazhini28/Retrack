import express from "express";
import { createLeave, triggerCron, syncSheetLeaves,getAllLeaveApprovalsLog, getAllLeaves,getAllLeaveBalance} from "../controllers/leaveController.js";

const router = express.Router();

router.post("/create", createLeave);       // Submit from form
router.post("/sync-sheet", syncSheetLeaves); // Sync from Google Sheet
router.post("/process-cron", triggerCron);
router.get("/leaves", getAllLeaves);
router.get("/leave_balance", getAllLeaveBalance);
router.get("/leave_approvals_log", getAllLeaveApprovalsLog);  // Trigger AI cron manually

export default router;