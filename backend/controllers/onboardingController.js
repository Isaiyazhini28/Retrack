import db from "../db.js";
import axios from "axios";

/* ======================================
   1️⃣ PROCESS CANDIDATE (AI SCORING)
====================================== */

export const processCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const [rows] = await db.promise().query(
      "SELECT * FROM external_candidates WHERE id=?",
      [candidateId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const candidate = rows[0];

    const aiResponse = await axios.post(
      "http://localhost:8000/final-score",
      {
        resume_score: candidate.ai_score || 0,
        aptitude_score: candidate.aptitude_score || 0,
        tech_score: 75,
        hr_score: 80,
        experience_years: 3
      }
    );

    const { final_score, track } = aiResponse.data;

    // ✅ STORE AI RESULT
    await db.promise().query(
      `UPDATE external_candidates 
       SET ai_score=?, track=?, shortlist_status='selected'
       WHERE id=?`,
      [final_score, track, candidateId]
    );

    res.json({ final_score, track });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ======================================
   2️⃣ INITIATE FULL ONBOARDING FLOW
====================================== */

export const initiateOnboarding = async (req, res) => {
  const connection = await db.promise().getConnection();

  try {
    const { candidateId } = req.params;

    const [rows] = await connection.query(
      "SELECT * FROM external_candidates WHERE id=?",
      [candidateId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const candidate = rows[0];

    await connection.beginTransaction();

    const startDate = getFirstMonday();

    // 1️⃣ Insert onboarding
    const [insert] = await connection.query(
      `INSERT INTO onboarding_master
      (candidate_id, position, final_score, track, onboarding_status, start_date)
      VALUES (?, ?, ?, ?, 'Pre-Onboarding', ?)`,
      [
        candidateId,
        candidate.position,
        candidate.ai_score,
        candidate.track,
        startDate
      ]
    );

    const onboardingId = insert.insertId;

    // 2️⃣ Insert employee (no unused variable)
    await connection.query(
      `INSERT INTO employees 
       (name, type, department, position, joining_date, status)
       VALUES (?, 'New Joiner', 'IT', ?, ?, 'Pending')`,
      [
        `${candidate.first_name} ${candidate.last_name}`,
        candidate.position,
        startDate
      ]
    );

    // 3️⃣ Generate company email
    const companyEmail =
      `${candidate.first_name}.${candidate.last_name}`.toLowerCase() +
      "@company.com";

    // 4️⃣ Insert employee master
    await connection.query(
      `INSERT INTO employee_master
       (onboarding_id, first_name, last_name, email, joining_date)
       VALUES (?, ?, ?, ?, ?)`,
      [
        onboardingId,
        candidate.first_name,
        candidate.last_name,
        companyEmail,
        startDate
      ]
    );

    // 5️⃣ Create Pre Tasks
    await createPreTasks(connection, onboardingId);

    // 6️⃣ Create Training
    await createTrainingModules(connection, onboardingId);

    // 7️⃣ Assign Sprint
    await assignSprint(connection, onboardingId);

    await connection.commit();

    res.json({ message: "Onboarding initiated", onboardingId });

  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};

/* ======================================
   HELPER FUNCTIONS
====================================== */

async function createPreTasks(connection, onboardingId) {
  const tasks = [
    "Background Verification",
    "Workspace Setup",
    "IT Asset Allocation",
    "Company Email Creation",
    "Policy Documentation"
  ];

  for (let task of tasks) {
    await connection.query(
      "INSERT INTO tasks (title, employee_id) VALUES (?,?)",
      [task, onboardingId]
    );
  }
}

async function createTrainingModules(connection, onboardingId) {
  const aiTrainer = await axios.post("http://localhost:8000/assign-trainer");
  const trainer = aiTrainer.data.trainer;

  const modules = [
    { type: "Soft Skill", name: "Communication Training" },
    { type: "Technical", name: "Project Architecture" }
  ];

  for (let mod of modules) {
    await connection.query(
      `INSERT INTO training_modules
       (onboarding_id, module_type, module_name, status)
       VALUES (?, ?, ?, 'Pending')`,
      [onboardingId, mod.type, mod.name]
    );
  }

  return trainer;
}

async function assignSprint(connection, onboardingId) {
  const aiSprint = await axios.post(
    "http://localhost:8000/assign-sprint"
  );

  await connection.query(
    "INSERT INTO sprints (onboarding_id, sprint_name) VALUES (?,?)",
    [onboardingId, aiSprint.data.sprint]
  );
}

function getFirstMonday() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(1);

  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}