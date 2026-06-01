import pool from "../db.js";
import { processCandidate } from "../services/autoPipeline.js";
import {getAIScore} from "../services/aiScore.js";
import { scheduleInterview } from "../services/scheduleInterview.js";

export const createJob = async (req, res) => {
  try {
    const {
      job_id,
      title,
      department,
      skills,
      experience,
      employment_type,
      openings,
      description,
      opening_date,
      closing_date
    } = req.body;

    const status = getStatusFromDates(opening_date, closing_date);

    const [result] = await pool.query(
      `INSERT INTO jobs
       (jobId, title, department, skills, experience, employmentType,
        openings, description, status, opening_date, closing_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        job_id,
        title,
        department,
        skills,
        experience,
        employment_type,
        openings,
        description,
        status,
        opening_date,
        closing_date
      ]
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create job" });
  }
};


export const getJobs = async (req, res) => {
  try {
    await updateJobStatuses();
    // 1️⃣ Upcoming jobs
    await pool.query(`
      UPDATE jobs
      SET status = 'upcoming'
      WHERE opening_date > CURDATE()
    `);

    // 2️⃣ Open jobs
    await pool.query(`
      UPDATE jobs
      SET status = 'open'
      WHERE opening_date <= CURDATE()
        AND closing_date >= CURDATE()
    `);

    // 3️⃣ Closed jobs
    await pool.query(`
      UPDATE jobs
      SET status = 'closed'
      WHERE closing_date < CURDATE()
    `);
  


    // 4️⃣ Fetch jobs (frontend decides filter)
    const [rows] = await pool.query(`
      SELECT *
      FROM jobs
      ORDER BY opening_date DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
};



export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      job_id,
      title,
      department,
      skills,
      experience,
      employment_type,
      openings,
      description,
      opening_date,
      closing_date
    } = req.body;

    const status = getStatusFromDates(opening_date, closing_date);

    await pool.query(
      `UPDATE jobs SET
        jobId=?, title=?, department=?, skills=?, experience=?,
        employmentType=?, openings=?, description=?,
        status=?, opening_date=?, closing_date=?
       WHERE id=?`,
      [
        job_id,
        title,
        department,
        skills,
        experience,
        employment_type,
        openings,
        description,
        status,
        opening_date,
        closing_date,
        id
      ]
    );

    res.json({ message: "Job updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Job update failed" });
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
      // automatically score all candidates for this job
      const [candidates] = await pool.query(
        "SELECT * FROM external_candidates WHERE job_id=? AND ai_score=0",
        [id]
      );

      const [[job]] = await pool.query("SELECT * FROM jobs WHERE id=?", [id]);

      for (const candidate of candidates) {
        await processCandidate(candidate, job);
      }

      console.log(`✅ AI scoring completed for all candidates in job ID ${id}`);
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

export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query("DELETE FROM jobs WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ message: "Job deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete job", error: err.message });
  }
};

export const updateJobStatuses = async () => {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // 1️⃣ Upcoming jobs (opening_date in future)
    await pool.query(
      `UPDATE jobs
       SET status = 'upcoming'
       WHERE opening_date > ?`,
      [today]
    );

    // 2️⃣ Open jobs (today is between opening and closing)
    await pool.query(
      `UPDATE jobs
       SET status = 'open'
       WHERE opening_date <= ? AND closing_date >= ?`,
      [today, today]
    );

    // 3️⃣ Closed jobs (closing date < today)
    await pool.query(
      `UPDATE jobs
       SET status = 'closed'
       WHERE closing_date < ?`,
      [today]
    );

    console.log("✅ Job statuses updated based on dates");
  } catch (err) {
    console.error("Failed to update job statuses:", err.message);
  }
};



export const runJobClosingPipeline = async () => {
  console.log("⏰ Running job closing pipeline...");

  const [jobs] = await pool.query(`
    SELECT * FROM jobs
    WHERE closing_date = CURDATE()
    AND status = 'open'
  `);

  for (const job of jobs) {
    console.log(`🔒 Closing job: ${job.title}`);

    await pool.query(
      "UPDATE jobs SET status='closed' WHERE id=?",
      [job.id]
    );

    const [candidates] = await pool.query(
      "SELECT * FROM external_candidates WHERE job_id=?",
      [job.id]
    );

    console.log(`👥 Candidates found: ${candidates.length}`);

    for (const c of candidates) {
      if (!c.resume_text) continue;

      const { score, shortlist } = await getAIScore(
        c.resume_text,
        job.description
      );

      const status = shortlist ? "shortlisted" : "rejected";

      await pool.query(
        `UPDATE external_candidates
         SET ai_score=?, shortlist_status=?
         WHERE id=?`,
        [score, status, c.id]
      );

      if (shortlist) {
        await scheduleInterview(c.id);
      }

      console.log(
        `✅ ${c.email} → ${score}% → ${status}`
      );
    }
  }
};
