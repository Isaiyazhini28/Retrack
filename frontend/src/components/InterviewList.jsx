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
            <th>Status</th>
            <th>Interview Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {interviews.map((i) => (
            <tr key={`${i.id}-${i.round}`}>
              <td>{i.first_name}</td>
              <td>{i.position}</td>
              <td>{i.level_name}</td>
              <td>{i.status}</td>
              <td>{new Date(i.interview_date).toLocaleString()}</td>
              <td>
                <button onClick={() => handleStatusChange(i.id, "Passed")}>Pass</button>
                <button onClick={() => handleStatusChange(i.id, "Failed")}>Fail</button>
                <button onClick={() => handleNextRound(i.id)}>Next Round</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
