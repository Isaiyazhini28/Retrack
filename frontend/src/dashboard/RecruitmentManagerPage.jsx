import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { saveAs } from "file-saver";
import InterviewCalendar from "../components/InterviewCalendar";

/* ─── INJECT STYLES ─── */
const injectStyles = () => {
  if (document.getElementById("rc-styles")) return;
  const s = document.createElement("style");
  s.id = "rc-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
    .rc-root *, .rc-root *::before, .rc-root *::after { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Syne', sans-serif; }
    .rc-root {
      --bg: #F0F4F8; --surface: #fff; --border: #E2E8F0;
      --navy: #0D1B2A; --sky: #38BDF8; --green: #10B981;
      --amber: #F59E0B; --red: #EF4444; --purple: #7C3AED;
      --muted: #94A3B8; --text: #0F172A;
      background: var(--bg); color: var(--text);
        height: 100%;              /* take parent height */
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
    }

    /* HEADER */
    .rc-header {
      flex-shrink: 0; background: var(--navy);
      padding: 0 30px; display: flex; align-items: center;
      justify-content: space-between; height: 56px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .rc-header-title { font-weight: 800; font-size: 14px; letter-spacing: 3px; color: #fff; }
    .rc-header-counts { display: flex; gap: 20px; align-items: center; }
    .rc-header-count { color: rgba(255,255,255,0.5); font-size: 12px; }
    .rc-header-count b { color: #38BDF8; }

    /* TABS in header */
    .rc-tabs { display: flex; gap: 4px; }
    .rc-tab { padding: 8px 18px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: transparent; color: rgba(255,255,255,0.55); font-family: 'Syne', sans-serif; font-weight: 700; font-size: 11px; cursor: pointer; letter-spacing: 1px; transition: all 0.18s; text-transform: uppercase; }
    .rc-tab.active { background: #38BDF8; color: #fff; border-color: #38BDF8; box-shadow: 0 4px 14px rgba(56,189,248,0.35); }
    .rc-tab:not(.active):hover { background: rgba(255,255,255,0.08); color: #fff; }

    /* CONTENT AREA */
    .rc-body {
   flex: 1;                   /* fills remaining space */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px;
  width: 100%;          /* ADD THIS */
}
.rc-scroll-card {
  flex: 1;
  width: 100%;  
  height: 100%;            /* ADD THIS */
  max-width: 100%;          /* ADD THIS */
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-radius: 16px;
}
   .rc-inner {
  flex: 1;
  overflow-y: auto;     /* scroll here only */
  padding: 24px;
}
    .rc-inner::-webkit-scrollbar { width: 5px; }
    .rc-inner::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    /* KPI GRID */
    .rc-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
    .rc-kpi { background: var(--navy); border-radius: 16px; padding: 20px; position: relative; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
    .rc-kpi::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(56,189,248,0.07) 0%, transparent 60%); pointer-events: none; }
    .rc-kpi:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(13,27,42,0.22); }
    .rc-kpi-val { font-size: 32px; font-weight: 800; color: #fff; line-height: 1; margin-bottom: 6px; }
    .rc-kpi-label { font-size: 11px; color: rgba(255,255,255,0.45); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    .rc-kpi-sub { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 4px; }
    .rc-kpi-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; }

    /* CHARTS */
    .rc-chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .rc-chart-box { background: #F8FAFC; border: 1px solid var(--border); border-radius: 14px; padding: 20px; }
    .rc-chart-box h3 { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .rc-chart-box h3::after { content: ''; flex: 1; height: 1px; background: var(--border); }

    /* TABLE */
    .rc-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }
    .rc-table { width: 100%; border-collapse: collapse; min-width: 700px; }
    .rc-table thead th { position: sticky; top: 0; z-index: 2; background: #F8FAFC; padding: 13px 14px; text-align: left; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; border-bottom: 2px solid var(--border); white-space: nowrap; }
    .rc-table tbody tr { border-bottom: 1px solid #F1F5F9; transition: background 0.12s; }
    .rc-table tbody tr:hover { background: #F8FAFC; }
    .rc-table tbody td { padding: 13px 14px; font-size: 13px; color: var(--text); vertical-align: middle; }

    /* FORM */
    .rc-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .rc-form-group { display: flex; flex-direction: column; gap: 5px; }
    .rc-label { font-weight: 700; font-size: 11px; color: var(--muted); letter-spacing: 0.06em; text-transform: uppercase; }
    .rc-input { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: #F8FAFC; font-size: 13px; font-family: 'Syne', sans-serif; color: var(--navy); outline: none; transition: border 0.2s; }
    .rc-input:focus { border-color: #38BDF8; background: #fff; }
    .rc-textarea { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: #F8FAFC; font-size: 13px; font-family: 'Syne', sans-serif; color: var(--navy); min-height: 110px; resize: vertical; outline: none; transition: border 0.2s; }
    .rc-textarea:focus { border-color: #38BDF8; background: #fff; }

    /* BUTTONS */
    .rc-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 20px; border-radius: 10px; border: none; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.16s; }
    .rc-btn-primary { background: linear-gradient(135deg, var(--navy), #1e3a5f); color: #fff; }
    .rc-btn-primary:hover { box-shadow: 0 6px 20px rgba(13,27,42,0.3); transform: translateY(-1px); }
    .rc-btn-sky { background: linear-gradient(135deg, #0EA5E9, #38BDF8); color: #fff; }
    .rc-btn-sky:hover { box-shadow: 0 6px 16px rgba(56,189,248,0.35); transform: translateY(-1px); }
    .rc-btn-green { background: linear-gradient(135deg, #059669, #10B981); color: #fff; }
    .rc-btn-outline-red { background: #FFF5F5; border: 1px solid #FECACA; color: #EF4444; }
    .rc-btn-sm { padding: 5px 12px; font-size: 11px; border-radius: 7px; }

    /* CONTROLS */
    .rc-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .rc-select { padding: 9px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); font-size: 13px; font-weight: 600; font-family: 'Syne', sans-serif; color: var(--text); cursor: pointer; outline: none; min-width: 160px; }

    /* BADGE */
    .rc-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; white-space: nowrap; display: inline-block; }

    /* JOB CARD */
    .rc-job-card { padding: 16px; background: #F8FAFC; border: 1px solid var(--border); border-radius: 12px; cursor: pointer; transition: all 0.15s; }
    .rc-job-card:hover { background: #EFF6FF; border-color: #BFDBFE; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.07); }

    /* SECTION HEADING */
    .rc-section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
    .rc-section-head-title { color: var(--navy); font-weight: 800; font-size: 13px; letter-spacing: 0.5px; }
    .rc-section-count { background: #EFF6FF; color: #38BDF8; border-radius: 20px; padding: 2px 10px; font-size: 11px; font-weight: 700; }

    .rc-card {
  background: #ffffff;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.05);
  height: 100%;
}
    @media (max-width: 900px) { .rc-kpi-grid { grid-template-columns: repeat(2,1fr); } .rc-chart-grid { grid-template-columns: 1fr; } }
    @keyframes fadeIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
  `;
  document.head.appendChild(s);
};

const BAR_COLORS = ["#10B981","#38BDF8","#F59E0B","#7C3AED","#EC4899","#EF4444"];
const PIE_COLORS = ["#10B981","#EF4444","#38BDF8","#F59E0B","#7C3AED"];

/* ─── HELPERS ─── */
function StatCard({ label, value, sub, accent = "#38BDF8" }) {
  return (
    <div className="rc-kpi">
      <div className="rc-kpi-bar" style={{ background: `linear-gradient(to right, ${accent}, transparent)` }} />
      <div className="rc-kpi-val">{value ?? "—"}</div>
      <div className="rc-kpi-label">{label}</div>
      {sub && <div className="rc-kpi-sub">{sub}</div>}
    </div>
  );
}

function Badge({ label, color = "#38BDF8", bg }) {
  return (
    <span className="rc-badge" style={{ background: bg || `${color}22`, color }}>
      {label}
    </span>
  );
}

const jobStatusBadge = (status) => {
  const map = {
    open:     { color: "#10B981", bg: "#D1FAE5" },
    closed:   { color: "#6B7280", bg: "#F3F4F6" },
    upcoming: { color: "#D97706", bg: "#FEF3C7" },
  };
  const s = map[status] || map.upcoming;
  return <Badge label={status?.toUpperCase() || "—"} color={s.color} bg={s.bg} />;
};

const displayDate  = (d) => { if (!d) return ""; const dt = new Date(d); return `${String(dt.getDate()).padStart(2,"0")}-${String(dt.getMonth()+1).padStart(2,"0")}-${dt.getFullYear()}`; };
const toInputDate  = (d) => (d ? d.split("T")[0] : "");

const customTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0D1B2A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px" }}>
      <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 6 }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.fill, fontSize: 12, fontWeight: 700 }}>{p.name}: {p.value}</p>)}
    </div>
  );
};

/* ─── MAIN ─── */
export default function RecruitmentManagerPage() {
  injectStyles();

  const [activeTab, setActiveTab]             = useState("dashboard");
  const [jobs, setJobs]                       = useState([]);
  const [editJobId, setEditJobId]             = useState(null);
  const [jobForm, setJobForm]                 = useState({ job_id:"",title:"",department:"",skills:"",experience:"",employment_type:"",openings:0,opening_date:"",closing_date:"",description:"" });
  const [externalPieData, setExternalPieData] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState("");
  const [externalCandidates, setExternalCandidates] = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [selectedJobId, setSelectedJobId]     = useState(null);
  const [interviews, setInterviews]           = useState([]);
  const [pieData, setPieData]                 = useState([]);
  const [barData, setBarData]                 = useState([]);

  const API_BASE = "http://localhost:5000/api";

  const fetchJobs = async () => { try { const r = await axios.get(`${API_BASE}/jobs`); setJobs(r.data); } catch(e) { console.error(e); } };
  const fetchExternalCandidates = async () => {
    try {
      const r = await axios.get(`${API_BASE}/external-candidates`);
      setExternalCandidates(r.data.map(c => ({ id:c.id, firstName:c.firstName, lastName:c.lastName, email:c.email, phone:c.phone, position:c.position, experience:c.experience, resumeUrl:c.resumeUrl, aiScore:Number(c.aiScore||0), shortlistStatus:c.shortlistStatus||"pending" })));
    } catch(e) { console.error(e); }
  };
  const syncExternalCandidates = async () => {
    setLoading(true);
    try { const r = await axios.get(`${API_BASE}/external-candidates/sync`); alert(`${r.data.inserted} new applications synced!`); await fetchExternalCandidates(); }
    catch(e) { alert("Failed to sync"); } finally { setLoading(false); }
  };
  const clearExternalCandidates = async () => {
    if (!window.confirm("Delete ALL external candidates?")) return;
    setLoading(true);
    try { await axios.delete(`${API_BASE}/external-candidates/clear`); setExternalCandidates([]); setExternalPieData([]); }
    catch(e) { alert("Failed to clear"); } finally { setLoading(false); }
  };
  const exportExternalExcel = () => {
    const data = externalCandidates.map(c => ({ FirstName:c.first_name, LastName:c.last_name, Email:c.email, Phone:c.phone, Position:c.position, Experience:c.experience, Resume:c.resume_url }));
    import("xlsx").then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Candidates");
      saveAs(new Blob([XLSX.write(wb, { bookType:"xlsx", type:"array" })]), "ExternalCandidates.xlsx");
    });
  };

  const handleJobChange = (e) => setJobForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const submitJob = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...jobForm, openings: Number(jobForm.openings||0) };
      if (editJobId) { await axios.put(`${API_BASE}/jobs/${editJobId}`, payload); alert("Job updated"); }
      else { await axios.post(`${API_BASE}/jobs`, payload); alert("Job created"); }
      setJobForm({ job_id:"",title:"",department:"",skills:"",experience:"",employment_type:"",openings:0,opening_date:"",closing_date:"",description:"" });
      setEditJobId(null); setActiveTab("dashboard"); fetchJobs();
    } catch(e) { alert(editJobId ? "Update failed" : "Create failed"); }
  };
  const editJob = (job) => {
    setJobForm({ job_id:job.jobId, title:job.title, department:job.department, skills:job.skills, experience:job.experience, employment_type:job.employmentType||job.employment_type, openings:job.openings, opening_date:toInputDate(job.opening_date), closing_date:toInputDate(job.closing_date), description:job.description });
    setEditJobId(job.id); setActiveTab("create Job");
  };
  const deleteJob = async (id) => {
    const job = jobs.find(j => j.id === id); if (!job) return;
    if (!window.confirm(`Delete "${job.title}"?`)) return;
    try { await axios.delete(`${API_BASE}/jobs/${id}`); setJobs(p => p.filter(j => j.id !== id)); }
    catch(e) { alert("Failed to delete"); }
  };

  const fetchInterviews = async () => { try { const r = await axios.get(`${API_BASE}/interviews`); setInterviews(r.data); } catch(e) {} };
  const fetchDashboardData = async () => {
    try {
      const [sum, bar] = await Promise.all([axios.get(`${API_BASE}/dashboard/summary`), axios.get(`${API_BASE}/dashboard/jobs-by-department`)]);
      setPieData([{ name:"Open Jobs", value:sum.data.openJobs }, { name:"Closed Jobs", value:sum.data.closedJobs }]);
      setBarData(bar.data);
    } catch(e) {}
  };

  useEffect(() => { fetchJobs(); fetchExternalCandidates(); fetchInterviews(); fetchDashboardData(); }, []);
  useEffect(() => {
    const counts = externalCandidates.reduce((acc, c) => { const pos = c.position||"Unknown"; acc[pos]=(acc[pos]||0)+1; return acc; }, {});
    setExternalPieData(Object.keys(counts).map(pos => ({ name:pos, value:counts[pos] })));
  }, [externalCandidates]);

  const positions = [...new Set(externalCandidates.map(c => c.position).filter(Boolean))];

  const TABS = ["dashboard","create Job","candidate","interviews"];

  return (
    <div className="rc-root">
      {/* ── HEADER ── */}
      <div className="rc-header">
        <div className="rc-header-title">◈ RECRUITMENT</div>
        <div className="rc-tabs">
          {TABS.map(t => (
            <button key={t} className={`rc-tab${activeTab === t ? " active" : ""}`} onClick={() => setActiveTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <div className="rc-header-counts">
          <span className="rc-header-count"><b>{jobs.length}</b> jobs</span>
          <span className="rc-header-count"><b>{externalCandidates.length}</b> candidates</span>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="rc-body">
        <div className="rc-scroll-card">
          <div className="rc-inner">

            {/* ═══ DASHBOARD ═══ */}
            {activeTab === "dashboard" && (
              <div className="rc-card">
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0D1B2A", marginBottom: 20, letterSpacing: "-0.01em" }}>
                  Recruitment Overview
                </div>
                <div className="rc-kpi-grid">
                  <StatCard label="Total Jobs"   value={jobs.length}                              accent="#38BDF8" />
                  <StatCard label="Open Jobs"    value={jobs.filter(j=>j.status==="open").length}  accent="#10B981" sub="active postings" />
                  <StatCard label="Candidates"   value={externalCandidates.length}                accent="#F59E0B" />
                  <StatCard label="Interviews"   value={interviews.length}                        accent="#7C3AED" />
                </div>
                <div className="rc-chart-grid">
                  <div className="rc-chart-box">
                    <h3>Applications by Position</h3>
                    {externalPieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={externalPieData} dataKey="value" nameKey="name" outerRadius={90}
                            label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                            {externalPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={customTooltip} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div style={{ textAlign: "center", color: "#94A3B8", padding: 40 }}>No data yet</div>}
                  </div>
                  <div className="rc-chart-box">
                    <h3>Openings by Department</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={barData} barSize={28}>
                        <XAxis dataKey="dept" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} />
                        <Tooltip content={customTooltip} />
                        <Bar dataKey="openings" radius={[6,6,0,0]}>
                          {barData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ CREATE JOB ═══ */}
            {activeTab === "create Job" && (
              <div style={{ display: "flex", gap: 24 }}>
                {/* Form */}
                <div style={{ flex: 2, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0D1B2A", marginBottom: 20 }}>
                    {editJobId ? "✏️ Edit Job" : "➕ Create Job Posting"}
                  </div>
                  <form onSubmit={submitJob} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="rc-form-grid">
                      {[{ key:"job_id",label:"Job ID" },{ key:"title",label:"Title" },{ key:"department",label:"Department" },{ key:"skills",label:"Skills" },{ key:"experience",label:"Experience" },{ key:"employment_type",label:"Employment Type" }].map(({ key, label }) => (
                        <div key={key} className="rc-form-group">
                          <label className="rc-label">{label}</label>
                          <input name={key} placeholder={`Enter ${label}`} value={jobForm[key]} onChange={handleJobChange} required className="rc-input" />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                      <div className="rc-form-group">
                        <label className="rc-label">Openings</label>
                        <input type="number" name="openings" value={jobForm.openings} onChange={e => setJobForm(p => ({ ...p, openings: Number(e.target.value) }))} className="rc-input" />
                      </div>
                      {[{ key:"opening_date",label:"Opening Date" },{ key:"closing_date",label:"Closing Date" }].map(({ key, label }) => (
                        <div key={key} className="rc-form-group">
                          <label className="rc-label">{label}</label>
                          <input type="date" name={key} value={jobForm[key]} onChange={handleJobChange} className="rc-input" />
                        </div>
                      ))}
                    </div>
                    <div className="rc-form-group">
                      <label className="rc-label">Job Description</label>
                      <textarea name="description" value={jobForm.description} onChange={handleJobChange} placeholder="Enter job description…" className="rc-textarea" />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button type="submit" className="rc-btn rc-btn-primary">{editJobId ? "Update Job" : "Create Job"}</button>
                      {editJobId && (
                        <button type="button" onClick={() => { setEditJobId(null); setJobForm({ job_id:"",title:"",department:"",skills:"",experience:"",employment_type:"",openings:0,opening_date:"",closing_date:"",description:"" }); }}
                          style={{ padding:"9px 18px",borderRadius:10,background:"#F8FAFC",border:"1px solid #E2E8F0",color:"#64748B",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer" }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>
                {/* Job list */}
              <div style={{
  flex: 1.2,
  minWidth: 280,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  height: "100%",
  overflowY: "auto"
}}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#0D1B2A", marginBottom: 4 }}>
                    Existing Jobs <span style={{ color: "#38BDF8" }}>({jobs.length})</span>
                  </div>
                  {jobs.map(job => (
                    <div key={job.id} className="rc-job-card" onClick={() => editJob(job)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, color: "#0D1B2A", fontSize: 13 }}>{job.title}</span>
                        {jobStatusBadge(job.status)}
                      </div>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 4 }}>{job.department} · {job.openings} opening{job.openings !== 1 ? "s" : ""}</div>
                      <div style={{ fontSize: 11, color: "#CBD5E1" }}>{displayDate(job.opening_date)} → {displayDate(job.closing_date)}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button className="rc-btn rc-btn-sm" onClick={e => { e.stopPropagation(); editJob(job); }}
                          style={{ background:"#EFF6FF",border:"1px solid #BFDBFE",color:"#0D1B2A",fontFamily:"'Syne',sans-serif",fontWeight:700,padding:"5px 12px",borderRadius:7,fontSize:11,cursor:"pointer" }}>✏️ Edit</button>
                        <button className="rc-btn rc-btn-sm rc-btn-outline-red" onClick={e => { e.stopPropagation(); deleteJob(job.id); }}
                          style={{ background:"#FFF5F5",border:"1px solid #FECACA",color:"#EF4444",fontFamily:"'Syne',sans-serif",fontWeight:700,padding:"5px 12px",borderRadius:7,fontSize:11,cursor:"pointer" }}>🗑 Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ CANDIDATES ═══ */}
            {activeTab === "candidate" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#0D1B2A" }}>Candidates Applied</span>
                    <span style={{ background: "#EFF6FF", color: "#38BDF8", borderRadius: 20, padding: "2px 12px", fontSize: 13, fontWeight: 700 }}>{externalCandidates.length}</span>
                  </div>
                  <div className="rc-controls">
                    <select className="rc-select" value={selectedPosition} onChange={e => setSelectedPosition(e.target.value)}>
                      <option value="">All Positions</option>
                      {positions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                    </select>
                    <button className="rc-btn rc-btn-sky" onClick={syncExternalCandidates}>{loading ? "Syncing…" : "⟳ Sync Form Data"}</button>
                    <button className="rc-btn rc-btn-green" onClick={exportExternalExcel}>⬇ Export Excel</button>
                    <button className="rc-btn" onClick={clearExternalCandidates}
                      style={{ background:"#FFF5F5",border:"1px solid #FECACA",color:"#EF4444",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13 }}>🗑 Clear All</button>
                  </div>
                </div>
<div className="rc-table-wrap" style={{ maxHeight: "60vh", overflowY: "auto" }}>
                  <table className="rc-table">
                    <thead>
                      <tr>{["Name","Email","Phone","Position","Experience","Resume"].map(h => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {externalCandidates.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign:"center",padding:40,color:"#94A3B8",fontSize:13 }}>No candidates yet. Sync form data to load applications.</td></tr>
                      ) : externalCandidates.filter(c => !selectedPosition || c.position === selectedPosition).map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 700, color: "#0D1B2A" }}>{c.firstName} {c.lastName}</td>
                          <td style={{ color: "#64748B" }}>{c.email}</td>
                          <td style={{ color: "#64748B" }}>{c.phone}</td>
                          <td><Badge label={c.position || "—"} color="#7C3AED" bg="#F5F3FF" /></td>
                          <td style={{ color: "#64748B" }}>{c.experience || 0} yrs</td>
                          <td>{c.resumeUrl ? <a href={c.resumeUrl} target="_blank" rel="noreferrer" style={{ padding:"4px 10px",borderRadius:6,background:"#EFF6FF",border:"1px solid #BFDBFE",color:"#0D1B2A",fontSize:11,fontWeight:700,textDecoration:"none" }}>View ↗</a> : <span style={{ color:"#94A3B8",fontSize:12 }}>—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══ INTERVIEWS ═══ */}
            {activeTab === "interviews" && (
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0D1B2A", marginBottom: 16 }}>Interview Schedule</div>
                <InterviewCalendar interviews={interviews.filter(i => i.interview_date)} />
              </div>
            )}

          </div>
        </div>
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px }
        ::-webkit-scrollbar-track { background: #F9FAFB }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 3px }
      `}</style>
    </div>
  );
}