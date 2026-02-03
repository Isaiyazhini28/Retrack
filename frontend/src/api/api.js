import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

export const getCandidates = () => API.get("/candidates");
export const getInterviews = () => API.get("/interviews");
export const updateInterviewStatus = (id, status) =>
  API.put(`/interviews/${id}/status`, { status });
export const nextInterviewRound = (id) =>
  API.post(`/interviews/${id}/next`);
export const runAiInterviewShortlist = (jobId) =>
  API.post(`/interviews/ai-shortlist/${jobId}`);
