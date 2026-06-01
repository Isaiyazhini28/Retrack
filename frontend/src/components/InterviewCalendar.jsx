import React, { useEffect, useState } from "react";
import { getInterviews } from "../api/api.js";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import toast from "react-hot-toast";


export default function RecruitmentDashboard() {
  const [interviews, setInterviews] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [externalCandidates, setExternalCandidates] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  



  /* ---------------- FETCH DATA ---------------- */

const fetchData = async () => {
  const res = await getInterviews();
  setInterviews(res.data); // backend already grouped per candidate
};





  const fetchExternalCandidates = async () => {
    try {
      const res = await axios.get("https://retrack.onrender.com/api/external-candidates");
      setExternalCandidates(res.data);
    } catch (err) {
      console.error("Error fetching external candidates:", err);
    }
  };

  const fetchNotifications = async () => {
  const res = await axios.get("https://retrack.onrender.com/api/admin/notifications");
  setNotifications(res.data);
};
useEffect(() => {
  notifications
    .filter(n => !n.is_read)
    .forEach(n => toast.success(n.message));
}, [notifications]);



  useEffect(() => {
  fetchData();
  fetchExternalCandidates();
  fetchNotifications();

  const interval = setInterval(() => {
    axios.post("https://retrack.onrender.com/api/reminders/check");
    fetchNotifications();
  }, 60000); // every 1 min

  return () => clearInterval(interval);
}, []);




  /* ---------------- FILTER LOGIC ---------------- */

const shouldShowInterview = (c) => {
  if (filterStatus === "all") return true;

  return (
    c.shortlist_status === filterStatus ||
    c.aptitude_status === filterStatus ||
    c.technical_status === filterStatus ||
    c.hr_status === filterStatus
  );
};


  /* ---------------- ACTIONS ---------------- */

// const handlePass = async (interviewId, candidateId) => {
//   try {
//     const { data } = await axios.post(
//       `https://retrack.onrender.com/api/interviews/${interviewId}/pass`
//     );

//     if (data.nextRound) {
//       fetchData(); // simply refetch instead of manual state update
//       toast.success(`Moved to ${data.nextRound.name}`);
//     } else {
//       fetchData();
//       toast.success("Candidate completed all rounds");
//     }

//   } catch (err) {
//     console.error(err);
//     toast.error("Error moving candidate");
//   }
// };




// Returns a map of candidate_id -> latest interview step_order
const StatusBadge = ({ status }) => {
 const value = (status || "pending").toLowerCase();


  const styles = {
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "capitalize",
    display: "inline-block"
  };

  if (value === "shortlisted" || value === "completed")
    return <span style={{ ...styles, background: "#e6f9f0", color: "#1a7f37" }}>{status}</span>;

  if (value === "rejected" || value === "expired")
    return <span style={{ ...styles, background: "#fdecea", color: "#b42318" }}>{status}</span>;

  if (value === "sent" || value === "scheduled")
    return <span style={{ ...styles, background: "#eef4ff", color: "#3538cd" }}>{status}</span>;

  return <span style={{ ...styles, background: "#f2f4f7", color: "#344054" }}>{status || "pending"}</span>;
};





// const handleFail = async (interviewId) => {
//   try {
//     await axios.post(
//       `https://retrack.onrender.com/api/interviews/${interviewId}/status`,
//       { status: "Rejected" }
//     );

//     setInterviews(prev =>
//       prev.map(i =>
//         i.interview_id === interviewId
//           ? { ...i, status: "Rejected" }
//           : i
//       )
//     );

//     toast.error("Candidate failed this round");
//   } catch (err) {
//     console.error(err);
//     toast.error("Error marking candidate as failed");
//   }
// };


  /* ---------------- AUTO CREATE INTERVIEW ---------------- */

// useEffect(() => {
//   const createFirstRounds = async () => {
//     try {
//       const candidatesToSchedule = externalCandidates.filter(
//         candidate =>
//           candidate.shortlist_status === "shortlisted" &&
//           !interviews.find(i => i.candidate_id === candidate.id)
//       );

//       for (const candidate of candidatesToSchedule) {
//         await axios.post(
//           `https://retrack.onrender.com/api/interviews/${candidate.id}/next`
//         );
//       }

//       if (candidatesToSchedule.length > 0) {
//         fetchData();
//       }

//     } catch (err) {
//       console.error("Error scheduling first rounds:", err);
//     }
//   };

//   if (externalCandidates.length > 0) {
//     createFirstRounds();
//   }
// }, [externalCandidates]);




  useEffect(() => {
  console.log(interviews); // Make sure interview_id exists
}, [interviews]);

  /* ---------------- CALENDAR EVENTS ---------------- */

  const events = interviews
    .filter((i) => i.interview_date)
    .map((i) => ({
      title: `${i.first_name} ${i.last_name} (${i.position})`,
      start: i.interview_date,
    }));

    const checkReminders = async () => {
  try {
    await axios.post("https://retrack.onrender.com/api/reminders/check");
  } catch (err) {
    console.error("Reminder check failed", err);
  }
};
useEffect(() => {
  const createFirstRounds = async () => {
    try {
      // Filter candidates who are shortlisted for a specific position and don't yet have an interview scheduled
      const candidatesToSchedule = externalCandidates.filter(candidate => {
        const alreadyScheduled = interviews.some(
          i => i.candidate_id === candidate.id && i.position === candidate.position
        );
        return candidate.shortlist_status === "shortlisted" && !alreadyScheduled;
      });

      for (const candidate of candidatesToSchedule) {
        // Schedule next round for this candidate + position
        await axios.post(
          `https://retrack.onrender.com/api/interviews/${candidate.id}/next`,
          { position: candidate.position } // send position to backend
        );
      }

      if (candidatesToSchedule.length > 0) {
        fetchData(); // refresh interviews
      }

    } catch (err) {
      console.error("Error scheduling first rounds:", err);
      toast.error("Failed to auto-schedule interviews");
    }
  };

  if (externalCandidates.length > 0) {
    createFirstRounds();
  }
}, [externalCandidates, interviews]);






  /* ---------------- STYLES ---------------- */

  const cellStyle = {
    border: "1px solid #ddd",
    padding: "10px",
    textAlign: "center",
    wordWrap: "break-word",
    width: "110px"
    
  };



  /* ---------------- UI ---------------- */

  return (
   <div style={{ display: "flex", gap: "20px", height: "580px" }}>
  {/* LEFT: TABLE */}
 <div style={{ flex: 2 }}>
        <h2 style={{ marginBottom: "10px" }}>
          Candidates & Interview Status
        </h2>

        {/* FILTER */}

        <div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "20px", // ensures buttons are side by side with space
    marginBottom: "10px",
  }}
>

  <div style={{ position: "relative" }}>
  <button
    onClick={() => setShowNotifications(!showNotifications)}
 style={{
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 500,
    color:"#000",
  }}
  >
    🔔 Notifications
    {notifications.filter(n => !n.is_read).length > 0 && (
      <span
        style={{
          background: "red",
          color: "#fff",
          borderRadius: "50%",
          padding: "2px 6px",
          fontSize: "12px",
          marginLeft: "4px",
        }}
      >
        {notifications.filter(n => !n.is_read).length}
      </span>
    )}
  </button>

 {/* Notification Modal */}
{showNotifications && (
  <>
    {/* Overlay */}
    <div
      onClick={() => setShowNotifications(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 100,
      }}
    />
    {/* Modal */}
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "400px",
        maxHeight: "80vh",
        overflowY: "auto",
        background: "#fff",
        zIndex: 101,
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        padding: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <h3 style={{ margin: 0 }}>Notifications</h3>
        <button
          onClick={() => setShowNotifications(false)}
          style={{
            border: "none",
            background: "transparent",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          ✖
        </button>
      </div>

      {notifications.length === 0 && <div>No notifications</div>}

      {notifications.map((n) => (
        <div
          key={n.id}
          onClick={() => {
            axios.post(`https://retrack.onrender.com/api/admin/notifications/${n.id}/read`);
            setShowNotifications(false);
          }}
          style={{
            padding: "10px",
            marginBottom: "6px",
            borderRadius: "8px",
            cursor: "pointer",
            background: n.is_read ? "#f9f9f9" : "#eef6ff",
          }}
        >
          <strong>{n.title}</strong>
          <div>{n.message}</div>
        </div>
      ))}
    </div>
  </>
)}

</div>

  <button
    onClick={() => setShowCalendar(true)}
    style={{
      padding: "8px 14px",
      borderRadius: "8px",
      border: "1px solid #ccc",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 500,
      color:"#000",
    }}
  >
    📅 View Calendar
  </button>
  <button
  onClick={() => {
    window.location.href = "https://retrack.onrender.com/api/download-candidates-excel";
  }}
  style={{
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 500,
    color:"#000",
  }}
>
  ⬇️ Download Excel
</button>

  <div
  style={{
    position: "relative",
    display: "inline-flex",
    alignItems: "center"
  }}
>
  <span
    style={{
      position: "absolute",
      left: "10px",
      pointerEvents: "none",
      fontSize: "14px"
    }}
  >
    🔍
  </span>

  <select
    value={filterStatus}
    onChange={(e) => setFilterStatus(e.target.value)}
    style={{
      padding: "8px 12px 8px 32px",
      borderRadius: "8px",
      border: "1px solid #ccc",
      minWidth: "160px",
      cursor: "pointer",
      fontWeight: "600",
      color: "#111",
      background: "#fff"
    }}
  >
    <option value="all">All</option>
    <option value="scheduled">Scheduled</option>  
    <option value="pending">Pending</option>
    <option value="rejected">Rejected</option>
  </select>
</div>
</div>



        {/* TABLE */}
        <div
  style={{
    flex: 1,
    overflowY: "auto",
    overflowX: "auto",
    maxHeight: "450px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px"
  }}
>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                background: "#f5f7fa",
                zIndex: 1,
              }}
            >
  <tr>
    <th style={cellStyle}>Candidate</th>
    <th style={cellStyle}>Position</th>
    <th style={cellStyle}>Shortlist</th>
    <th style={cellStyle}>Process Status</th>
    <th style={cellStyle}>Aptitude</th>
    <th style={cellStyle}>Technical</th>
    <th style={cellStyle}>HR</th>
  </tr>


            </thead>


<tbody>
  {interviews
    .filter(shouldShowInterview)
    .map((c) => {
      // Determine if any stage is rejected
      const isRejected =
        c.shortlist_status === "rejected" ||
        c.ai_status === "Rejected" ||
        c.aptitude_status === "Rejected" ||
        c.technical_status === "Rejected" ||
        c.hr_status === "Rejected";

      // Cascading statuses
const aiStatus = isRejected
  ? "Rejected"
  : c.ai_status
  ? c.ai_status
  : c.shortlist_status === "selected"
  ? "Passed"
  : "Pending";

      const aptitudeStatus = isRejected ? "Rejected" : c.aptitude_status || "Pending";

      let technicalStatus = isRejected
        ? "Rejected"
        : c.technical_status || (c.aptitude_status === "Passed" ? "Scheduled" : "Pending");

      let hrStatus = isRejected
        ? "Rejected"
        : c.hr_status || (c.technical_status === "Passed" ? "Scheduled" : "Pending");

      return (
        <tr
          key={c.candidate_id}
          style={{
            backgroundColor: isRejected
              ? "#fdecea"
              : c.shortlist_status === "selected"
              ? "#e6f9f0"
              : "transparent",
          }}
        >
          <td style={cellStyle}>
            {c.first_name} {c.last_name}
          </td>

          <td style={cellStyle}>{c.position}</td>

        {/* Shortlist */}
<td style={cellStyle}>
  <StatusBadge status={c.shortlist_status} />
</td>

{/* AI Status */}
<td style={cellStyle}>
  <StatusBadge status={aiStatus} />
</td>

          {/* APTITUDE */}
<td style={cellStyle}>
  <StatusBadge status={aptitudeStatus} />
</td>

{/* TECHNICAL */}
<td style={cellStyle}>
  <StatusBadge status={technicalStatus} />
</td>

          {/* HR */}
          <td style={cellStyle}>
            <StatusBadge status={hrStatus} />
            {c.hr_date && (
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                {new Date(c.hr_date).toLocaleString()}
              </div>
            )}
            {c.hr_link && (
              <div>
                <a href={c.hr_link} target="_blank" rel="noreferrer">
                  Join Meet
                </a>
              </div>
            )}
          </td>
        </tr>
      );
    })}
</tbody>




          </table>
        </div>
      </div>

      {/* RIGHT: CALENDAR */}
      {showCalendar && (
  <>
    {/* Overlay */}
    <div
      onClick={() => setShowCalendar(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 100,
      }}
    />

    {/* Drawer */}
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: "400px",
        background: "#fff",
        zIndex: 101,
        boxShadow: "-4px 0 20px rgba(0,0,0,0.2)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <h3 style={{ margin: 0 }}>Interview Calendar</h3>
        <button
          onClick={() => setShowCalendar(false)}
          style={{  
            border: "none",
            background: "transparent",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          ✖
        </button>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin]}
        initialView="dayGridMonth"
        events={events}
        height="100%"
      />
    </div>
  </>
)}


      
    </div>
  );
}

