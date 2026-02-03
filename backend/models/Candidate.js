import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  jobId: String,
  source: String, // LinkedIn / Website / Referral
  status: {
    type: String,
    enum: ["Applied", "Screening", "Interview", "Rejected", "Hired"],
    default: "Applied",
  },
  resume: String,
}, { timestamps: true });

export default mongoose.model("Candidate", candidateSchema);
