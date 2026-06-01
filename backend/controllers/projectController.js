import fs from "fs";
import { parseTextFile, extractTasks } from "../services/parserService.js";
import { runFullAutomation } from "../services/fullAutomationService.js";
import db from "../db.js";

// Upload requirements and create project
export const uploadRequirements = async (req, res) => {
  let filePath;
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    filePath = req.file.path;

    const lines = parseTextFile(filePath);
    if (!lines.length) return res.status(400).json({ error: "Empty file" });

    const tasks = extractTasks(lines);
    const projectId = await runFullAutomation(tasks);

    fs.unlinkSync(filePath); // clean up uploaded file

    res.json({ message: "Project created successfully!", projectId, totalTasks: tasks.length });

  } catch (err) {
    console.error("Upload Error:", err);
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: err.message });
  }
};

// Get all projects
export const getAllProjects = async (req, res) => {
  try {
    const [projects] = await db.query("SELECT id, project_name FROM projects");
    res.json(projects);
  } catch (err) {
    console.error("❌ Fetch Projects Error:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
};

// Get tasks for a project
export const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const [tasks] = await db.query(`
      SELECT t.id, t.task_name, t.priority, t.skill_required, t.estimated_hours,
             t.status, e.first_name AS assigned_to
      FROM tasks t
      LEFT JOIN employees e ON t.assigned_to = e.id
      WHERE t.project_id = ?
    `, [projectId]);
    res.json(tasks);
  } catch (err) {
    console.error("Fetch Tasks Error:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};