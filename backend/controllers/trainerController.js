import pool from "../db.js";

// Auto allocate trainers

// Auto allocate trainers with transaction safety

// ================= AUTO ALLOCATE TRAINERS =================


// Auto allocate trainers (Training + HR Orientation)
export const autoAllocateTrainers = async () => {
  let connection;
  try {
    // 1️⃣ Get DB connection
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 2️⃣ Fetch eligible candidates (no active allocation yet)
    const [candidates] = await connection.query(`
      SELECT 
        e.id AS onboarding_id,
        CONCAT(e.first_name, ' ', e.last_name) AS candidate_name,
        e.experience
      FROM external_candidates e
      JOIN offer_letters o ON o.candidate_id = e.id
      JOIN background_verifications b ON b.email = e.email
      LEFT JOIN trainer_allocations ta ON ta.onboarding_id = e.id AND ta.allocation_status='Active'
      WHERE o.offer_status='Accepted'
        AND b.background_check_status='VERIFIED'
        AND ta.id IS NULL
    `);

    if (!candidates.length) {
      console.log("No eligible candidates found.");
      await connection.rollback();
      return;
    }

    for (const candidate of candidates) {
      const programType = candidate.experience < 1 ? "Training" : "HR Orientation";

      let trainerId = null;
      let trainerName = null;

      // 3️⃣ Allocate trainer if Training
      if (programType === "Training") {
        const [trainers] = await connection.query(`
          SELECT t.id, t.name, t.max_capacity, COUNT(ta.id) AS current_allocations
          FROM trainers t
          LEFT JOIN trainer_allocations ta
            ON t.id = ta.trainer_id AND ta.allocation_status='Active'
          WHERE t.status='Available' AND t.max_capacity > 0
          GROUP BY t.id
          HAVING current_allocations < t.max_capacity
          ORDER BY current_allocations ASC
          LIMIT 1
          FOR UPDATE
        `);

        if (trainers.length) {
          trainerId = trainers[0].id;
          trainerName = trainers[0].name;

          // Reduce trainer max_capacity by 1
          await connection.query(
            `UPDATE trainers SET max_capacity = max_capacity - 1 WHERE id = ?`,
            [trainerId]
          );
        }
      }

      // 4️⃣ Allocate HR Orientation candidates to HR trainer
      if (programType === "HR Orientation") {
        const [hrTrainers] = await connection.query(`
          SELECT id, name
          FROM trainers
          WHERE status='Available' AND department='HR'
          LIMIT 1
        `);

        if (hrTrainers.length) {
          trainerId = hrTrainers[0].id;
          trainerName = hrTrainers[0].name;

          // Reduce HR trainer capacity by 1
          await connection.query(
            `UPDATE trainers SET max_capacity = max_capacity - 1 WHERE id = ?`,
            [trainerId]
          );
        }
      }

      // 5️⃣ Set allocation dates
      const startDate = new Date();
      const endDate = new Date();
      if (programType === "Training") endDate.setMonth(startDate.getMonth() + 6);
      else endDate.setDate(startDate.getDate() + 1); // HR Orientation 1 day

      // 6️⃣ Insert trainer allocation
      await connection.query(`
        INSERT INTO trainer_allocations
          (onboarding_id, trainer_id, program_type, allocation_status, created_at, start_date, end_date)
        VALUES (?, ?, ?, 'Active', NOW(), ?, ?)
      `, [candidate.onboarding_id, trainerId, programType, startDate, endDate]);

      console.log(`Allocated ${programType} to ${candidate.candidate_name} ${trainerName ? `with trainer ${trainerName}` : ''}`);
    }

    await connection.commit();
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Error in autoAllocateTrainers:", err.message);
  } finally {
    if (connection) connection.release();
  }
};

// Get all allocations for frontend
// Get all allocations with trainer workload
export const getAllocations = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        a.id AS allocation_id,
        e.id AS candidate_id,
        CONCAT(e.first_name, ' ', e.last_name) AS candidate_name,
        a.program_type,
        a.start_date AS allocation_start,
        a.end_date AS allocation_end,
        a.allocation_status,
        t.id AS trainer_id,
        t.name AS trainer_name,
        t.max_capacity,
        IFNULL(t.max_capacity - COUNT(ta.id), t.max_capacity) AS remaining_capacity
      FROM trainer_allocations a
      JOIN external_candidates e ON e.id = a.onboarding_id
      LEFT JOIN trainers t ON t.id = a.trainer_id
      LEFT JOIN trainer_allocations ta ON ta.trainer_id = t.id AND ta.allocation_status='Active'
      GROUP BY a.id
      ORDER BY a.start_date DESC;
    `);

    // Update status based on end_date
    const today = new Date();
    const allocations = rows.map(row => {
      let status = row.allocation_status;
      if (new Date(row.allocation_end) < today) {
        status = "COMPLETED";
      }
      return {
        allocation_id: row.allocation_id,
        candidate_id: row.candidate_id,
        candidate_name: row.candidate_name,
        program_type: row.program_type,
        allocation_start: row.allocation_start,
        allocation_end: row.allocation_end,
        allocation_status: status,
        trainer: row.trainer_id
          ? {
              id: row.trainer_id,
              name: row.trainer_name,
              max_capacity: row.max_capacity,
              remaining_capacity: row.remaining_capacity,
            }
          : null,
      };
    });

    res.json({ success: true, allocations });
  } catch (err) {
    console.error("Error fetching allocations:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};