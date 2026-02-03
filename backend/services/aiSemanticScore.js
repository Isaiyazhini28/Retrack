import axios from "axios";

export const aiScoreResume = async (resumeText, jobDescription) => {
  if (!resumeText || !jobDescription) return { score: 0, shortlist: false };

  try {
    const { data } = await axios.post("http://localhost:8000/score", {
      resume_text: resumeText,
      job_description: jobDescription
    });

    return data; // { score, shortlist }
  } catch (error) {
    console.error("❌ AI SCORE ERROR:", error.message);
    return { score: 0, shortlist: false };
  }
};
