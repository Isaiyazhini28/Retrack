import express from "express";
import { getAllProjects, uploadRequirements, getProjectTasks } from "../controllers/projectController.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// ✅ FIXED ROUTES
router.get("/", getAllProjects);
router.post("/upload", upload.single("file"), uploadRequirements);
router.get("/:projectId/tasks", getProjectTasks);

export default router;