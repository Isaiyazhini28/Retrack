import express from "express";
import cors from "cors";
import path from "path";
import cron from "node-cron";
import { fileURLToPath } from "url";
import jobRoutes from "./routes/jobRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from"./routes/dashboard_rm.js";
import externalCandidates from "./routes/externalCandidates.js";
import interviewRoutes from "./routes/interview.js";
import candidateRoutes from "./routes/candidateRoutes.js";
import adminNotificationRoutes from "./routes/adminNotifications.js" ;
import reminderRoutes from "./routes/reminders.js";
import "./cron/aiCron.js";
import "./cron/autoAiShortlist.js";
import "./cron/jobAutoCloseCron.js";
import "./cron/interviewReminder.js";
import './cron/autoNextRound.js';
import "./routes/onboardingRoutes.js";
import onboardingRoutes from "./routes/onboardingRoutes.js"; 
import "./cron/scoreSync.js";
import { expireRounds } from "./utils/expireRounds.js";
import syncInterviewScores from "./utils/sheetsSync.js";
import excelRouter from "./routes/excel.js"
import { runRecruitmentPipeline } from "./routes/recruitmentPipeline.js";

import mailRoutes  from "./routes/mailRoutes.js";
import { Server } from "socket.io";
import http from "http";
import offerRoutes from "./routes/offerRoutes.js";
import trainerRoutes from "./routes/trainerRoutes.js";
import { startMailListener } from "./services/mailParserService.js";
import "./cron/mailServicecron.js";
import backgroundRoutes from "./routes/background.js";
import "./cron/syncJob.js";
import "./cron/trainingcron.js";
import offboardingRoutes from './routes/offboardingRoutes.js';
import './cron/offboardingCron.js';
import leaveRoutes from "./routes/leaveRoutes.js";
import "./cron/leaveCron.js";
import "./cron/leaveSheetCron.js";
import projectRoutes from "./routes/projectRoutes.js";
import tasksRoutes from "./routes/tasksRoutes.js";
import employeesRoutes from "./routes/userManager.js";
import { calRouter, attRouter, boardRouter, settingsRouter } from "./routes/sidebar_routes.js";
import complaintRoutes from "./routes/complaintManager.js";




import dotenv from "dotenv";


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000; 


app.use(cors({
  origin: [
    "https://retrack-app.hrstrategicatlas.workers.dev",
    "https://retrack-hrms.netlify.app",
    "http://localhost:5173"
  ],
  credentials: true
}));
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use(express.json());       
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/jobs",jobRoutes);
app.use("/api/external-candidates", externalCandidates);
app.use("/uploads/photos", express.static(path.join(path.resolve(), "uploads/photos")));
app.use("/api/candidates", candidateRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/reminders", reminderRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use("/api", excelRouter);


app.use("/api/mail", mailRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/trainers", trainerRoutes);
app.use("/api/background", backgroundRoutes);
app.use("/api/trainers", trainerRoutes);
app.use('/api/offboarding', offboardingRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/users", employeesRoutes);
app.use("/api/calendar", calRouter);
app.use("/api/attendance", attRouter);
app.use("/api/board", boardRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/complaints", complaintRoutes);



startMailListener();
console.log("🚀 Offer automation system started...");


cron.schedule("0 * * * *", async () => {
  await expireRounds();
});

cron.schedule("0 * * * *", async () => {
  console.log("⏰ CRON: AI auto process running");
  await autoAiProcessClosedJobs();
});

cron.schedule("0 * * * *", async () => {
  console.log("⏱ Syncing interview scores from Google Sheet...");
  await syncInterviewScores();
});

// cron.schedule("0 * * * *", async () => {
//   await autoCloseAndTriggerAI();
// });

let isRunning = false;
cron.schedule("0 * * * *", async () => {
  if (isRunning) return;
  isRunning = true;
  try {
    await runRecruitmentPipeline();
  } finally {
    isRunning = false;
  }
});

cron.schedule('00 08 * * *', async () => {
    console.log('--- Running Morning Attendance Initialization (8:00 AM) ---');
    
    try {
        const today = new Date().toISOString().slice(0, 10);

        // 1. Fetch all active employees
        const [employees] = await db.query("SELECT id, employee_code FROM employees WHERE status = 'Active'");

        if (employees.length === 0) {
            console.log('No active employees found to mark.');
            return;
        }

        // 2. Prepare the bulk insert values
        // We use INSERT IGNORE or ON DUPLICATE KEY to avoid errors if 
        // attendance was already marked manually before 8 AM.
        for (const emp of employees) {
            await db.query(
                `INSERT INTO attendance_records 
                    (employee_id, employee_code, date, status, work_hours, marked_by)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE employee_id = employee_id`, 
                 // The UPDATE part does nothing, effectively making it "Insert if not exists"
                [emp.id, emp.employee_code, today, 'Absent', 0, 'SYSTEM_AUTO']
            );
        }

        console.log(`Successfully initialized attendance for ${employees.length} employees.`);
    } catch (error) {
        console.error('Error in Attendance Cron Job:', error);
    }
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { io };


 