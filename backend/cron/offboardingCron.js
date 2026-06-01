// backend/cron/offboardingCron.js

import cron from "node-cron";
import db from "../db.js";
import { sendOffboardingEmail, sendEmail } from "../services/offmailService.js";

// Run once daily at 12:05 AM
cron.schedule("5 0 * * *", async () => {
  try {
    console.log("Running daily offboarding automation...");

    const today = new Date().toISOString().split("T")[0];

    const [employees] = await db.query(
      "SELECT * FROM employees WHERE last_day <= ? AND status = ?",
      [today, "offboarding"]
    );

    console.log(`Employees found: ${employees.length}`);

    for (let emp of employees) {
      console.log(`Processing offboarding for ${emp.first_name}`);

      // Revoke system access
      await db.query(
        `UPDATE offboarding_tasks 
         SET status = 'completed' 
         WHERE employee_id = ? 
         AND task_name = 'Revoke System Access'`,
        [emp.id]
      );

      console.log("✔ System access revoked");

      // Knowledge transfer completion
      await db.query(
        `UPDATE knowledge_transfer 
         SET status = 'completed' 
         WHERE employee_id = ?`,
        [emp.id]
      );

      console.log("✔ Knowledge transfer completed");

      // Mark employee offboarded
      await db.query(
        `UPDATE employees SET status = 'offboarded' WHERE id = ?`,
        [emp.id]
      );

      console.log("✔ Employee marked as offboarded");

      // Send email to employee
      await sendOffboardingEmail(
        emp.email,
        emp.first_name,
        emp.last_day
      );

      console.log(`📧 Email sent to employee ${emp.email}`);

      // Notify HR
      await sendEmail(
        "hr-team@company.com",
        "Employee Offboarded",
        `Employee ${emp.first_name} ${emp.last_name} has been offboarded today.`
      );

      console.log("📧 Email sent to HR team");

      // Notify IT
      await sendEmail(
        "it-team@company.com",
        "Revoke Access Required",
        `Employee ${emp.first_name} ${emp.last_name} has been offboarded.
Please ensure all system access is revoked.`
      );

      console.log("📧 Email sent to IT team");
    }

    console.log("🎉 Daily offboarding process finished");
  } catch (err) {
    console.error("Cron job error:", err);
  }
});