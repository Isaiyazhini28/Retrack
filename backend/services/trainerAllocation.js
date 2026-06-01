import pool from "../db.js";

export const autoAllocateTrainers = async () => {
  try {
    const [candidates] = await pool.query(`
      SELECT e.id AS onboarding_id, e.experience
      FROM external_candidates e
      JOIN offers o ON o.candidate_id = e.id
      JOIN background_checks b ON b.candidate_id = e.id
      LEFT JOIN trainer_allocations a ON a.onboarding_id = e.id AND a.allocation_status='Active'
      WHERE o.offer_status='Accepted'
      AND b.background_check_status='VERIFIED'
      AND a.id IS NULL
    `);

    if (candidates.length === 0) {
      console.log("No candidates eligible for allocation.");
      return;
    }

    for (const candidate of candidates) {
      const programType = candidate.experience < 1 ? "Training" : "HR Orientation";

      const [trainerRows] = await pool.query(`
        SELECT t.id, t.name, COUNT(a.trainer_id) AS workload
        FROM trainers t
        LEFT JOIN trainer_allocations a 
          ON t.id = a.trainer_id AND a.allocation_status='Active'
        WHERE t.status='Available'
        GROUP BY t.id
        HAVING workload < t.max_capacity
        ORDER BY workload ASC
        LIMIT 1
      `);

      if (trainerRows.length === 0) {
        console.log(`No trainer available for candidate ${candidate.onboarding_id}`);
        continue;
      }

      const trainer = trainerRows[0];

      await pool.query(`
        INSERT INTO trainer_allocations 
        (onboarding_id, trainer_id, program_type, allocation_status)
        VALUES (?, ?, ?, 'Active')
      `, [candidate.onboarding_id, trainer.id, programType]);

      console.log(`Allocated trainer ${trainer.name} to candidate ${candidate.onboarding_id}`);
    }
  } catch (err) {
    console.error("Error in autoAllocateTrainers cron:", err);
  }
};