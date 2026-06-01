import Imap from "imap";
import { simpleParser } from "mailparser";
import pool from "../db.js";

function createImapConnection() {
  return new Imap({
    user: "isai12d25@gmail.com",
    password: "keka dcyg ypus tpwn",
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    connTimeout: 30000,
    authTimeout: 30000,
    keepalive: {
      interval: 10000,
      idleInterval: 300000,
      forceNoop: true
    }
  });
}

function parseReply(body) {
  const lower = body.toLowerCase();
  if (lower.includes("accept")) return "Accepted";
  if (lower.includes("reject")) return "Rejected";
  return null;
}

async function getPendingCandidateEmails() {
  const [rows] = await pool.query(`
    SELECT ec.email
    FROM offer_letters ol
    JOIN external_candidates ec ON ec.id = ol.candidate_id
    WHERE ol.offer_status = 'Sent'
  `);

  return rows.map(r => r.email);
}

async function fetchEmailsFrom(imap, candidateEmail) {
  return new Promise((resolve, reject) => {

    const sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    imap.search(
      [["UNSEEN"], ["FROM", candidateEmail], ["SINCE", sinceDate]],
      (err, results) => {

        if (err) return reject(err);
        if (!results || !results.length) return resolve();

        // limit results to last 10 emails
        if (results.length > 10) {
          results = results.slice(-10);
        }

        let f;

        try {
          f = imap.fetch(results, { bodies: "", markSeen: true });
        } catch (err) {
          console.error("Fetch error:", err.message);
          return resolve();
        }

        f.on("message", (msg) => {

          msg.on("body", (stream) => {

            let buffer = "";

            stream.on("data", chunk => {
              buffer += chunk.toString("utf8");
            });

            stream.once("end", async () => {

              try {

                const parsed = await simpleParser(buffer);
                const status = parseReply(parsed.text || "");

                if (!status) return;

                const subject = parsed.subject || "";
                const match = subject.match(/Offer Letter\s*[-:]\s*(.+)$/i);

                if (!match) {
                  console.warn("Position not found in subject:", subject);
                  return;
                }

                const position = match[1].trim().toLowerCase();

                await pool.query(`
                  UPDATE offer_letters ol
                  JOIN external_candidates ec ON ec.id = ol.candidate_id
                  SET ol.offer_status = ?, ol.responded_at = NOW()
                  WHERE ol.offer_status = 'Sent'
                  AND ec.email = ?
                  AND LOWER(ol.position) = ?
                `, [status, candidateEmail, position]);

                console.log(`Updated ${candidateEmail} → ${status}`);

              } catch (err) {
                console.error("Email parse error:", err.message);
              }

            });

          });

        });

        f.once("error", err => {
          console.error("Fetch stream error:", err.message);
          resolve();
        });

        f.once("end", () => {
          resolve();
        });

      }
    );

  });
}

export const startMailListener = () => {

  let imap = createImapConnection();
  let processing = false;

  const connect = () => {

    console.log("Connecting to IMAP...");

    imap.connect();

    imap.once("ready", async () => {

      imap.openBox("INBOX", false, async (err, box) => {

        if (err) {
          console.error("Mailbox open error:", err.message);
          return;
        }

        console.log(`Mailbox opened. ${box.messages.total} messages.`);

        const processReplies = async () => {

          if (processing) return;

          processing = true;

          try {

            const emails = await getPendingCandidateEmails();

            for (const email of emails) {
              await fetchEmailsFrom(imap, email);
            }

          } catch (err) {
            console.error("Error processing replies:", err.message);
          }

          processing = false;

        };

        // Initial scan
        await processReplies();

        // Listen for new emails
        imap.on("mail", async () => {
          console.log("New email received");
          await processReplies();
        });

      });

    });

    imap.once("error", err => {
      console.error("IMAP error:", err.message);
    });

    imap.once("end", () => {
      console.log("IMAP connection ended");
    });

    imap.once("close", () => {
      console.log("IMAP closed. Reconnecting in 5s...");

      imap.removeAllListeners();

      setTimeout(() => {
        imap = createImapConnection();
        connect();
      }, 5000);
    });

  };

  connect();

};