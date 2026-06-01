// backend/routes/offboardingRoutes.js
import express from "express";
import {
  triggerOffboarding,
  getOffboardingStatus,
  getAllTasks,
  getAllSurveys,
  getOffboardingStats,
  importTasksFromExcel,
  importSurveyExcel,
  getOffboardedEmployees,
} from "../controllers/OffboardingController.js";

const router = express.Router();

router.post("/trigger", triggerOffboarding);
router.get("/status/:employeeId", getOffboardingStatus);
router.get("/tasks/all", getAllTasks);
router.get("/surveys/all", getAllSurveys);
router.post("/tasks/import", importTasksFromExcel);
router.get("/stats",getOffboardingStats);
router.post("/surveys/import", importSurveyExcel);
router.get("/employees/list", getOffboardedEmployees);

export default router;