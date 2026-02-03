import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import jobRoutes from "./routes/jobRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from"./routes/dashboard_rm.js";
import externalCandidates from "./routes/externalCandidates.js";
import interviewRoutes from "./routes/interview.js";
import { closeJobs } from "./cron/closeJobs.js";
import candidateRoutes from "./routes/candidateRoutes.js";
import "./cron/aiCron.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;  

app.use(cors());
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
setInterval(closeJobs,  15 * 24 * 60 * 60 * 1000 );
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
