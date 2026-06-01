import pool from "../db.js";
import { scheduleNextRound } from "../utils/sheetsSync.js";
import { sendRejectionMail } from "../services/notify.js";

export async function transitionCandidate(candidateId, event, conn = pool) {
  const [rows] = await conn.query(
    `SELECT pipeline_state, email FROM external_candidates WHERE id=?`,
    [candidateId]
  );
  if (!rows.length) return;

  const currentState = rows[0].pipeline_state;
  const email = rows[0].email;

  function invalid() {
    console.log(`⚠ Invalid transition: ${currentState} → ${event}`);
    return;
  }

  const terminalStates = [
    "AI_REJECTED", "APTITUDE_FAILED", "TECH_FAILED", "HR_FAILED", "SELECTED"
  ];

  if (terminalStates.includes(currentState)) {
    console.log(`⛔ Candidate already in terminal state: ${currentState}`);
    return;
  }

  // Get positions for multi-position support
  const [positionsRows] = await conn.query(
    `SELECT position FROM external_candidates_positions WHERE candidate_id=?`,
    [candidateId]
  );
  const positions = positionsRows.map(r => r.position);

  switch (event) {
    // ================== AI STAGE ==================
    case "AI_FAIL":
      if (currentState !== "APTITUDE_PENDING") return invalid();

      await conn.query(
        `UPDATE external_candidates
         SET pipeline_state='AI_REJECTED', shortlist_status='rejected'
         WHERE id=?`,
        [candidateId]
      );

      // Reject all interviews for all positions
      await conn.query(
        `UPDATE interviews
         SET status='Rejected'
         WHERE candidate_id=?`,
        [candidateId]
      );

      await sendRejectionMail(email);
      break;

    case "AI_PASS":
      if (currentState !== "APTITUDE_PENDING") return invalid();
      break;

    // ================== APTITUDE STAGE ==================
    case "APTITUDE_PASS":
      if (currentState !== "APTITUDE_PENDING") return invalid();

      await conn.query(
        `UPDATE external_candidates
         SET pipeline_state='TECH_PENDING'
         WHERE id=?`,
        [candidateId]
      );

      // Schedule Technical for all positions
      for (const pos of positions) {
        await scheduleNextRound(candidateId, 1, conn, pos);
      }
      break;

    case "APTITUDE_FAIL":
      if (currentState !== "APTITUDE_PENDING") return invalid();

      await conn.query(
        `UPDATE external_candidates
         SET pipeline_state='APTITUDE_FAILED', shortlist_status='rejected'
         WHERE id=?`,
        [candidateId]
      );

      for (const pos of positions) {
        await conn.query(
          `INSERT INTO interviews (candidate_id, level_id, position, status, test_status, round_type)
           VALUES (?, 2, ?, 'Rejected', 'completed', 'technical')
           ON DUPLICATE KEY UPDATE status='Rejected', test_status='completed'`,
          [candidateId, pos]
        );

        await conn.query(
          `INSERT INTO interviews (candidate_id, level_id, position, status, test_status, round_type)
           VALUES (?, 3, ?, 'Rejected', 'completed', 'hr')
           ON DUPLICATE KEY UPDATE status='Rejected', test_status='completed'`,
          [candidateId, pos]
        );
      }

      await sendRejectionMail(email);
      break;

    // ================== TECH STAGE ==================
    case "TECH_PASS":
      if (currentState !== "TECH_PENDING") return invalid();

      await conn.query(
        `UPDATE external_candidates
         SET pipeline_state='HR_PENDING'
         WHERE id=?`,
        [candidateId]
      );

      for (const pos of positions) {
        // Ensure HR interview is marked rejected initially (if exists)
        await conn.query(
          `INSERT INTO interviews (candidate_id, level_id, position, status, test_status, round_type)
           VALUES (?, 3, ?, 'Rejected', 'completed', 'hr')
           ON DUPLICATE KEY UPDATE status='Rejected', test_status='completed'`,
          [candidateId, pos]
        );

        // Schedule HR
        await scheduleNextRound(candidateId, 2, conn, pos);
      }
      break;

    case "TECH_FAIL":
      if (currentState !== "TECH_PENDING") return invalid();

      await conn.query(
        `UPDATE external_candidates
         SET pipeline_state='TECH_FAILED', shortlist_status='rejected'
         WHERE id=?`,
        [candidateId]
      );

      for (const pos of positions) {
        await conn.query(
          `UPDATE interviews
           SET status='Rejected'
           WHERE candidate_id=? AND level_id >= 2 AND position=?`,
          [candidateId, pos]
        );
      }

      await sendRejectionMail(email);
      break;

    // ================== HR STAGE ==================
    case "HR_PASS":
      if (currentState !== "HR_PENDING") return invalid();

      await conn.query(
        `UPDATE external_candidates
         SET pipeline_state='SELECTED', shortlist_status='selected'
         WHERE id=?`,
        [candidateId]
      );
      break;

    case "HR_FAIL":
      if (currentState !== "HR_PENDING") return invalid();

      await conn.query(
        `UPDATE external_candidates
         SET pipeline_state='HR_FAILED', shortlist_status='rejected'
         WHERE id=?`,
        [candidateId]
      );

      for (const pos of positions) {
        await conn.query(
          `UPDATE interviews
           SET status='Rejected'
           WHERE candidate_id=? AND level_id = 3 AND position=?`,
          [candidateId, pos]
        );
      }

      await sendRejectionMail(email);
      break;

    default:
      console.log("⚠ Unknown event:", event);
  }
}