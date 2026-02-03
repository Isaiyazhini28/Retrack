import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { saveAs } from "file-saver";
import InterviewCalendar from "../components/InterviewCalendar";
import CandidateList from "../components/CandidateList.jsx";
import InterviewList from "../components/InterviewList.jsx";



/* ================= STYLES ================= */
const styles = {
  container: {
    flex:1,
    height: "100vh",
    padding: "25px",
    background: " #FCF9EA",
    paddingTop: "80px", 
    overflowY: "hidden",
    marginBottom:"120px" 
  },
  title: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#163061",
    marginBottom: "25px",
  },
  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "15px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    marginBottom: "30px",
    minHeight: "300px",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "700",
    marginBottom: "15px",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2,1fr)",
    gap: "15px",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  textarea: {
    gridColumn: "span 2",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    minHeight: "100px",
  },
  button: {
    padding: "12px",
    borderRadius: "10px",
    background: "#75bfec",
    border: "none",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
  },
  tabBar: {
    display: "flex",
    gap: "15px",
    marginBottom: "20px",
  },
  tab: (active) => ({
    padding: "10px 20px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    background: active ? "#75bfec" : "#fff",
    color: active ? "#fff" : "#000",
    cursor: "pointer",
    fontWeight: "600",
  }),
};

/* ================= COMPONENT ================= */
export default function RecruitmentManagerPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [jobs, setJobs] = useState([]);
  const [editJobId, setEditJobId] = useState(null);
  const [jobForm, setJobForm] = useState({
    jobId: "",
    title: "",
    department: "",
    skills: "",
    experience: "",
    employmentType: "",
    openings: "",
    description: "",
    status: "open",
  });
  const [externalPieData, setExternalPieData] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [shortlistResult, setShortlistResult] = useState([]);
  const [externalCandidates, setExternalCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [scoredCandidates, setScoredCandidates] = useState([]); 
  const [shortlistedTab, setShortlistedTab] = useState(false); 
  const [interviews, setInterviews] = useState([]);
  

  const API_BASE = "http://localhost:5000/api";

  /* ================= FETCH JOBS ================= */
 const fetchJobs = async () => {
  try {
    const res = await axios.get("http://localhost:5000/api/jobs");
    setJobs(res.data);
  } catch (err) {
    console.error(err);
    alert("Failed to fetch jobs");
  }
};



  /* ================= EXTERNAL CANDIDATES ================= */
  const fetchExternalCandidates = async () => {
    const res = await axios.get(`${API_BASE}/external-candidates`);
    setExternalCandidates(res.data);
  };

  const syncExternalCandidates = async () => {
    setLoading(true);
    const res = await axios.get(`${API_BASE}/external-candidates/sync`);
    alert(`${res.data.inserted} new applications synced!`);
    await fetchExternalCandidates();
    setLoading(false);
  };

  const clearExternalCandidates = async () => {
    if (!window.confirm("Are you sure you want to delete ALL external candidates?")) return;
    setLoading(true);
    await axios.delete(`${API_BASE}/external-candidates/clear`);
    setExternalCandidates([]);
    setLoading(false);
  };

  const exportExternalExcel = () => {
    const data = externalCandidates.map(c => ({
      FirstName: c.first_name,
      LastName: c.last_name,
      Email: c.email,
      Phone: c.phone,
      Position: c.position,
      Experience: c.experience,
      Resume: c.resume_url
    }));

    import("xlsx").then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Candidates");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      saveAs(new Blob([buf]), "ExternalCandidates.xlsx");
    });
  };

  useEffect(() => {
    fetchJobs();
    fetchExternalCandidates();
  }, []);
  
  useEffect(() => {
  if (jobs.length > 0) setSelectedJobId(jobs[0].id);
}, [jobs]);

  /* ================= JOB HANDLERS ================= */
  const handleJobChange = (e) =>
    setJobForm({ ...jobForm, [e.target.name]: e.target.value });

  const submitJob = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...jobForm, openings: Number(jobForm.openings) };
      await axios.post(`${API_BASE}/jobs`, payload);
      alert("Job created successfully");
      setJobForm({
        jobId: "",
        title: "",
        department: "",
        skills: "",
        experience: "",
        employmentType: "",
        openings: 0,
        description: "",
        status: "open",
      });
      fetchJobs();
    } catch (err) {
      console.error(err.response?.data || err);
      alert("Job insert failed");
    }
  };

  const editJob = (job) => {
    setJobForm(job);
    setEditJobId(job.id);
    setActiveTab("createJob");
  };

  /* ================= DASHBOARD DATA ================= */
  const [pieData, setPieData] = useState([]);
  const [barData, setBarData] = useState([]);
const renderCustomLabel = ({
  cx, cy, midAngle, outerRadius, name, percent,
}) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 18;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#333"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={500}
    >
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
};
const BAR_COLORS = [
  "#4CAF50",
  "#42A5F5",
  "#FF7043",
  "#AB47BC",
  "#26C6DA",
  "#FFA726",
];

  const fetchDashboardData = async () => {
    try {
      const summary = await axios.get(`${API_BASE}/dashboard/summary`);
      const bar = await axios.get(`${API_BASE}/dashboard/jobs-by-department`);

      setPieData([
        { name: "Open Jobs", value: summary.data.openJobs },
        { name: "Closed Jobs", value: summary.data.closedJobs },
      ]);

      setBarData(bar.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);
  useEffect(() => {
  const counts = externalCandidates.reduce((acc, c) => {
    const pos = c.position || "Unknown";
    acc[pos] = (acc[pos] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.keys(counts).map(pos => ({
    name: pos,
    value: counts[pos],
  }));

  setExternalPieData(chartData);
}, [externalCandidates]);

  const fetchInterviews = async () => {
    const res = await axios.get(`${API_BASE}/interviews`);
    setInterviews(res.data);
  };

  const updateStatus = async (id, status) => {
    await axios.put(`${API_BASE}/interviews/${id}/status`, { status });
    fetchInterviews();
  };

  const nextRound = async (id) => {
    await axios.post(`${API_BASE}/interviews/${id}/next`, {});
    fetchInterviews();
  };

const toggleCandidateSelection = (id) => {
  setSelectedCandidates((prev) =>
    prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
  );
};

/* ================= AI SHORTLIST ================= */
  const aiShortlist = async () => {
    if (!selectedJobId) return alert("Select a job first!");
    try {
      const res = await axios.post(`${API_BASE}/ai-shortlist/${selectedJobId}`);
      setScoredCandidates(res.data); // scored top candidates
      fetchExternalCandidates();
      fetchInterviews();
      alert("AI Shortlist updated!");
    } catch (err) { console.error(err); }
  };
    useEffect(() => { fetchJobs(); fetchExternalCandidates(); fetchInterviews(); }, []);




  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Recruitment Manager</h1>

      {/* TABS */}
      <div style={styles.tabBar}>
        {["dashboard","create Job","candidate", "interviews"].map(t => (
          <button key={t} onClick={()=>setActiveTab(t)} style={styles.tab(activeTab===t)}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>


      {/* DASHBOARD */}
      {activeTab === "dashboard" && (
        <div
    style={{
      ...styles.card,
      height: "500px",       
      display: "flex",
      flexDirection: "column",
    }}>
          <h2 style={styles.sectionTitle}>Recruitment Overview</h2>
          <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
           {externalPieData.length > 0 && (
        <div style={{ width: "400px", height: "220px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={externalPieData}
                dataKey="value"
                nameKey="name"
                outerRadius={75}
                label={renderCustomLabel}
                labelLine={false}
              >
                {externalPieData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={["#4CAF50", "#FF7043", "#5C6BC0", "#FFEB3B", "#9C27B0"][i % 5]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
           <div style={{ width: "100%", height: 250 }}>
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={barData}>
      <XAxis dataKey="dept" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="openings">
        {barData.map((_, index) => (
          <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>

          </div>
        </div>
      )}

      {/* CREATE / EDIT JOB */}
      {activeTab==="create Job" && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>
            {editJobId ? "Edit Job" : "Create Job"}
          </h2>
          <form onSubmit={submitJob} style={styles.grid2}>
            {["job_id","title","department","skills","experience","employment_type"].map(field => (
              <input
                key={field}
                style={styles.input}
                name={field}
                placeholder={field.replace("_", " ").toUpperCase()}
                value={jobForm[field]}
                onChange={handleJobChange}
                required
              />
            ))}

            <input
              type="number"
              name="openings"
              placeholder="OPENINGS"
              style={styles.input}
              value={jobForm.openings}
              onChange={handleJobChange}
              required
            />

            <textarea
              name="description"
              placeholder="JOB DESCRIPTION"
              style={styles.textarea}
              value={jobForm.description}
              onChange={handleJobChange}
            />

            <select
              name="status"
              value={jobForm.status}
              onChange={handleJobChange}
              style={styles.input}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>

            <button type="submit" style={styles.button}>
              {editJobId ? "Update Job" : "Create Job"}
            </button>
          </form>
        </div>
      )}

      {/* EXTERNAL CANDIDATES */}
     {activeTab === "candidate" && (
  <div
    style={{
      ...styles.card,
      height: "420px",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <h2>External Form Applications ({externalCandidates.length})</h2>

    <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
      <button style={styles.button} onClick={syncExternalCandidates}>
        {loading ? "Syncing..." : "Sync Form Data"}
      </button>
      <button style={styles.button} onClick={exportExternalExcel}>
        Export Excel
      </button>
      <button
        style={{ ...styles.button, background: "#e74c3c" }}
        onClick={clearExternalCandidates}
      >
        Clear All
      </button>
     <div style={{ marginBottom: "10px" }}>
  <button 
    style={styles.button} 
    onClick={() => setShortlistedTab(false)}
  >
    All Candidates
  </button>
  <button 
    style={{ ...styles.button, background: "#2ecc71" }} 
    onClick={() => setShortlistedTab(true)}
  >
    Shortlisted Candidates
  </button>
</div>


    </div>

    {/* SCROLLABLE LIST */}
    <div
      style={{
        overflowY: "auto",
        flex: 1,
        borderTop: "1px solid #eee",
      }}
    >
      {externalCandidates.map(c => (
        <div
          key={c.id}
          style={{ padding: "10px", borderBottom: "1px solid #ddd" }}
        >
          <b>{c.first_name} {c.last_name}</b><br/>
          {c.email} | {c.phone}<br/>
          {c.position} | {c.experience}<br/>
          {c.resume_url && (
            <a href={c.resume_url} target="_blank" rel="noreferrer">
              Resume
            </a>
          )}
        </div>
      ))}
     <div style={{ overflowY: "auto", flex: 1, borderTop: "1px solid #eee" }}>
  {(shortlistedTab ? scoredCandidates.filter(c => c.score >= 80) : scoredCandidates.length ? scoredCandidates : externalCandidates)
    .map(c => (
    <div
      key={c.id}
      style={{ padding: "10px", borderBottom: "1px solid #ddd" }}
    >
      <b>{c.first_name} {c.last_name}</b><br/>
      {c.email} | {c.phone}<br/>
      {c.position} | {c.experience}<br/>
      {c.resume_url && (
        <a href={c.resume_url} target="_blank" rel="noreferrer">
          Resume
        </a>
      )}
      {c.score && (
        <div>AI Score: <b>{c.score}</b></div>
      )}
    </div>
  ))}
</div>

    </div>
  </div>
)}

{/* EXTERNAL CANDIDATES */}
{activeTab === "candidate" && (
  <div
    style={{
      ...styles.card,
      height: "500px",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <h2>External Form Applications ({externalCandidates.length})</h2>

    {/* ACTION BUTTONS */}
    <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
      <button style={styles.button} onClick={syncExternalCandidates}>
        {loading ? "Syncing..." : "Sync Form Data"}
      </button>
      <button style={styles.button} onClick={exportExternalExcel}>
        Export Excel
      </button>
      <button
        style={{ ...styles.button, background: "#e74c3c" }}
        onClick={clearExternalCandidates}
      >
        Clear All
      </button>

      <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
        <button
          style={styles.button}
          onClick={() => setShortlistedTab(false)}
        >
          All Candidates
        </button>
        <button
          style={{ ...styles.button, background: "#2ecc71" }}
          onClick={() => setShortlistedTab(true)}
        >
          Shortlisted
        </button>
      </div>
    </div>

    {/* SCROLLABLE LIST */}
    <div style={{ overflowY: "auto", flex: 1, borderTop: "1px solid #eee" }}>
      {(shortlistedTab
        ? externalCandidates.filter((c) => c.shortlist_status === "shortlisted")
        : externalCandidates
      ).map((c) => (
        <div
          key={c.id}
          style={{
            padding: "10px",
            borderBottom: "1px solid #ddd",
            background:
              c.shortlist_status === "shortlisted" ? "#e0f7fa" : "transparent",
          }}
        >
          <b>
            {c.first_name} {c.last_name}
          </b>{" "}
          | {c.position}
          <br />
          {c.email} | {c.phone}
          <br />
          {c.resume_url && (
            <a href={c.resume_url} target="_blank" rel="noreferrer">
              Resume
            </a>
          )}
          <br />
          {/* AI Score & Status */}
          <span>
            AI Score: <b>{c.ai_score ?? 0}</b> | Status:{" "}
            <b>{c.shortlist_status}</b>
          </span>
        </div>
      ))}
    </div>
  </div>
)}





    </div>
  );
} 




