import axios from "axios";

export const aiScoreResume = async (resumeText, jobDescription) => {
  if (!resumeText || !jobDescription) return { score: 0, shortlist: false };

  const { data } = await axios.post("http://localhost:8000/score", {
    resume_text: resumeText,
    job_description: jobDescription
  });

  return data; // { score, shortlist }
};
