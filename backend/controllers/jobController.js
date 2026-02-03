import pool from "../db.js";
import { processCandidate } from "./processCandidate.js";

export const createJob = async (req, res) => {
  try {
    const { job_id, title, department, skills, experience, employmentType, openings, description, status } = req.body;

    const [result] = await pool.query(
      `INSERT INTO jobs 
      (job_id, title, department, skills, experience, employmentType, openings, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [job_id, title, department, skills, experience, employmentType, openings, description, status]
    );

    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create job", error: err.message });
  }
};



export const getJobs = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM jobs");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
};

export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { jobId, title, department, skills, experience, employmentType, openings, description, status } = req.body;

    
    // Update job info
    await pool.query(
      `UPDATE jobs SET jobId=?, title=?, department=?, skills=?, experience=?, employmentType=?, openings=?, description=?, status=? WHERE id=?`,
      [jobId, title, department, skills, experience, employmentType, openings, description, status, id]
    );

    // If job just got closed, run AI scoring automatically
    if (status === "closed") {
      const [candidates] = await pool.query(
        `SELECT * FROM external_candidates WHERE position=?`,
        [title]
      );

      for (const c of candidates) {
        const score = await aiScoreCandidate(c.resume_url, skills);
        const shortlist = score >= 65 ? "shortlisted" : "rejected";

        await pool.query(
          `UPDATE external_candidates SET ai_score=?, shortlist_status=? WHERE id=?`,
          [score, shortlist, c.id]
        );
      }

      // Mark job as AI processed
      await pool.query(`UPDATE jobs SET ai_processed=1 WHERE id=?`, [id]);
    }

    res.json({ id, ...req.body, message: status === "closed" ? "Job closed & AI scored candidates" : "Job updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update job", error: err.message });
  }
};

export const closeJobsAndScore = async () => {
  // 1. Find jobs closing today
  const [jobs] = await pool.query(
    "SELECT * FROM jobs WHERE closing_date <= CURDATE() AND status='open'"
  );

  for (const job of jobs) {
    // 2. Close the job
    await pool.query("UPDATE jobs SET status='closed' WHERE id=?", [job.id]);

    // 3. Get all candidates for this job
    const [candidates] = await pool.query(
      "SELECT * FROM external_candidates WHERE position=? AND shortlist_status='pending'",
      [job.title]
    );

    // 4. Run AI scoring
    for (const candidate of candidates) {
      await processCandidate(candidate, job);
    }

    console.log(`✅ Job "${job.title}" closed and candidates scored`);
  }
};
export const closeJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await pool.query("UPDATE jobs SET status=? WHERE id=?", [status, id]);

    if (status === "closed") {
      // Trigger AI evaluation asynchronously
      processJobClosure(id);
    }

    res.json({ message: `Job status updated to ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update job status" });
  }
};

export const aiScoreCandidatesForJob = async (candidate) => {
  // Find the job that matches candidate's position
  if (status === "closed") {
  const [candidates] = await pool.query(
    "SELECT * FROM external_candidates WHERE position = ? AND shortlist_status='pending'",
    [title]
  );

  for (const candidate of candidates) {
    await processCandidate(candidate, { description, title });
  }
}

  const [jobs] = await pool.query(
    "SELECT * FROM jobs WHERE title = ? LIMIT 1",
    [candidate.position]
  );

  if (jobs.length === 0) {
    console.warn(`No job found for candidate ${candidate.email} with position "${candidate.position}"`);
    return;
  }

  const job = jobs[0];

  // Run AI scoring
  try {
    await processCandidate(candidate, job);
    console.log(`✅ AI scored for ${candidate.email} | Job: ${job.title}`);
  } catch (err) {
    console.error(`AI scoring failed for: ${candidate.email}`, err.message);
  }
};
