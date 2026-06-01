import OpenAI from "openai";

const openai = new OpenAI({ apiKey: "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" });

export const aiScoreResume = async (resumeText, jobDescription) => {
  if (!resumeText) return { score: 0, shortlist: false };


  const score = Math.floor(Math.random() * 50) + 50; // 50-100
  const shortlist = score >= 70;
  return { score, shortlist };
};
