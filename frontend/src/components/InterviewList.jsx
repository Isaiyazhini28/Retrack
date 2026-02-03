import React, { useEffect, useState } from "react";
import { getInterviews, updateInterviewStatus, nextInterviewRound } from "../api/api.js";

export default function InterviewList() {
  const [interviews, setInterviews] = useState([]);

  const fetchData = async () => {
    const res = await getInterviews();
    setInterviews(res.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (id, status) => {
    await updateInterviewStatus(id, status);
    fetchData();
  };

  const handleNextRound = async (id) => {
    await nextInterviewRound(id);
    fetchData();
  };

  return (
    <div>
      <h2>Interviews</h2>
      <table border="1" cellPadding={5}>
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Position</th>
            <th>Round</th>
            <th>AI Score</th>
            <th>Shortlist Status</th>
            <th>Status</th>
            <th>Interview Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {interviews.map((i) => (
            <tr key={`${i.candidate_id}-${i.round || "pending"}`}>
              <td>
                {i.first_name} {i.last_name}
              </td>
              <td>{i.position}</td>
              <td>{i.round || "Pending"}</td>
              <td>{i.ai_score ?? "-"}</td>
              <td>{i.shortlist_status ?? "pending"}</td>
              <td>{i.status ?? "Pending"}</td>
              <td>
                {i.interview_date ? new Date(i.interview_date).toLocaleString() : "—"}
              </td>
              <td>
                <button onClick={() => handleStatusChange(i.candidate_id, "Passed")}>Pass</button>
                <button onClick={() => handleStatusChange(i.candidate_id, "Failed")}>Fail</button>
                <button onClick={() => handleNextRound(i.candidate_id)}>Next Round</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
