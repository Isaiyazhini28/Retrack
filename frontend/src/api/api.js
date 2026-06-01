import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://retrack.onrender.com/api",
});

export const getCandidates = () => API.get("/candidates");
export const getInterviews = () => API.get("/interviews");
export const updateInterviewStatus = (id, status) =>
  API.put(`/interviews/${id}/status`, { status });
export const nextInterviewRound = (id) =>
  API.post(`/interviews/${id}/next`);
export const runAiInterviewShortlist = (jobId) =>
  API.post(`/interviews/ai-shortlist/${jobId}`);


