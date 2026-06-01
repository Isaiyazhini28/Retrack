import api from "../api/axios";
import { useNavigate } from "react-router-dom";

export default function CandidateCard({ candidate }) {

  const navigate = useNavigate();

  const processAI = async () => {
    const res = await api.post(`/onboarding/process/${candidate.id}`);
    alert(`Final Score: ${res.data.final_score}, Track: ${res.data.track}`);
  };

  const sendOffer = async () => {
    await api.post(`/mail/offer/${candidate.id}`);
    alert("Offer Sent");
  };

  const acceptOffer = async () => {
    await api.post(`/mail/reply/${candidate.id}`, {
      decision: "ACCEPT"
    });
    alert("Candidate Accepted");
  };

  const initiateOnboarding = async () => {
    const res = await api.post(`/onboarding/initiate/${candidate.id}`);
    navigate(`/dashboard/${res.data.onboardingId}`);
  };

  return (
    <div className="card">
      <h3>{candidate.first_name} {candidate.last_name}</h3>
      <p>Email: {candidate.email}</p>
      <p>Status: {candidate.shortlist_status}</p>

      <div className="buttons">
        <button onClick={processAI}>Process AI</button>
        <button onClick={sendOffer}>Send Offer</button>
        <button onClick={acceptOffer}>Accept</button>
        <button onClick={initiateOnboarding}>Start Onboarding</button>
      </div>
    </div>
  );
}