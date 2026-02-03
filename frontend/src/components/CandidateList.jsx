import React, { useEffect, useState } from "react";
import { getCandidates } from "../api/api.js";

export default function CandidateList() {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await getCandidates();
      setCandidates(res.data);
    };
    fetchData();
  }, []);

  return (
    <div>
      <h2>Candidates</h2>
      <table border="1" cellPadding={5}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Position</th>
            <th>AI Score</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.id}>
              <td>{c.first_name}</td>
              <td>{c.position}</td>
              <td>{c.ai_score}</td>
              <td>{c.shortlist_status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
