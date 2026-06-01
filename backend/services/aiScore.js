import axios from "axios";

const FLASK_URL = "http://localhost:8000";

// Extract rough years of experience from resume text
function parseExperienceYears(resumeText) {
  const matches = resumeText.match(/(\d+)\s*(year|years)/gi);
  if (!matches) return 0;
  const nums = matches.map((m) => parseInt(m));
  return Math.min(Math.max(...nums), 30);
}

// Step 1: call Flask /keyword-score to convert raw text → numeric score
async function getKeywordScore(resumeText, jobDescription) {
  try {
    const { data } = await axios.post(`${FLASK_URL}/keyword-score`, {
      resume_text: resumeText,
      job_description: jobDescription,
    });
    return typeof data.score === "number" ? data.score : 0;
  } catch (err) {
    console.warn("⚠ /keyword-score unavailable, using local fallback:", err.message);
    // Local fallback: simple word overlap
    const words = (text) =>
      new Set(
        text
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => w.length > 2)
      );
    const jobWords = words(jobDescription);
    const resumeWords = words(resumeText);
    const matched = [...jobWords].filter((w) => resumeWords.has(w)).length;
    return jobWords.size > 0 ? Math.floor((matched / jobWords.size) * 100) : 0;
  }
}

// Step 2: send numeric scores to Flask /score → get final_score + track
export async function getAIScore(resumeText, jobDescription) {
  try {
    // Step 1 — convert text to a 0-100 keyword match score
    const resumeScore = await getKeywordScore(resumeText, jobDescription);

    // Parse experience years from resume for the experience bonus
    const experienceYears = parseExperienceYears(resumeText);

    console.log(`📊 keyword score: ${resumeScore}, experience: ${experienceYears}y`);

    // Step 2 — Flask /score expects pre-computed numbers, NOT raw text
    // aptitude/tech/hr are 0 at this stage (resume screening only)
    const { data } = await axios.post(`${FLASK_URL}/score`, {
      resume_score:    resumeScore,
      aptitude_score:  0,
      tech_score:      0,
      hr_score:        0,
      experience_years: experienceYears,
    });

    // Flask returns { final_score, track } — NOT { score, shortlist }
    const score     = typeof data.final_score === "number" ? Math.round(data.final_score) : 0;
    const shortlist = score > 20;

    console.log(`🤖 final: ${score} (${data.track ?? "?"}) → ${shortlist ? "shortlisted ✅" : "rejected ❌"}`);

    return { score, shortlist };
  } catch (err) {
    console.error("❌ AI scoring failed:", err.message);
    return { score: 0, shortlist: false };
  }
}