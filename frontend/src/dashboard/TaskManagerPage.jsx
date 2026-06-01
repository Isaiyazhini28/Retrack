// pages/TaskManagerPage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const API = "https://retrack.onrender.com/api";

/* ─── INJECT STYLES ─── */
const injectStyles = () => {
  if (document.getElementById("tm-styles")) return;
  const s = document.createElement("style");
  s.id = "tm-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
    .tm-root *, .tm-root *::before, .tm-root *::after { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Syne', sans-serif; }
    .tm-root {
      --bg: #F0F4F8; --surface: #fff; --border: #E2E8F0;
      --navy: #0D1B2A; --sky: #38BDF8; --green: #10B981;
      --amber: #F59E0B; --red: #EF4444; --purple: #7C3AED;
      --blue: #2563EB; --muted: #94A3B8; --text: #0F172A;
      background: var(--bg); color: var(--text);
      display: flex; flex-direction: column; height: 100%; overflow: hidden; width: 100%;
    }

    /* HEADER */
    .tm-header {
      flex-shrink: 0; background: var(--navy);
      padding: 0 28px; display: flex; align-items: center;
      justify-content: space-between; height: 54px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      gap: 12px;
    }
    .tm-header-title { font-weight: 800; font-size: 13px; letter-spacing: 3px; color: #fff; white-space: nowrap; }
    .tm-tabs { display: flex; gap: 4px; }
    .tm-tab { padding: 7px 16px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.12); background: transparent; color: rgba(255,255,255,0.5); font-family: 'Syne', sans-serif; font-weight: 700; font-size: 11px; cursor: pointer; letter-spacing: 1px; transition: all 0.18s; text-transform: uppercase; }
    .tm-tab.active { background: #38BDF8; color: #fff; border-color: #38BDF8; box-shadow: 0 4px 14px rgba(56,189,248,0.35); }
    .tm-tab:not(.active):hover { background: rgba(255,255,255,0.08); color: #fff; }
    .tm-project-select { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 7px 12px; border-radius: 9px; font-family: 'Syne', sans-serif; font-size: 12px; cursor: pointer; outline: none; font-weight: 600; min-width: 180px; }

    /* UPLOAD STRIP */
    .tm-strip { flex-shrink: 0; background: #F8FAFC; border-bottom: 1px solid var(--border); padding: 10px 28px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .tm-strip-label { color: var(--muted); font-size: 11px; letter-spacing: 1px; white-space: nowrap; font-weight: 700; }
    .tm-strip-input { background: var(--surface); border: 1px solid var(--border); color: var(--navy); padding: 7px 12px; border-radius: 8px; font-family: 'Syne', sans-serif; font-size: 12px; width: 180px; outline: none; }
    .tm-strip-input:focus { border-color: #38BDF8; }

    /* BUTTONS */
    .tm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 9px; border: none; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 12px; cursor: pointer; transition: all 0.16s; white-space: nowrap; }
    .tm-btn-file { background: var(--surface); border: 1px solid var(--border); color: var(--navy); }
    .tm-btn-file.active { background: #EFF6FF; border-color: #BFDBFE; }
    .tm-btn-run { background: linear-gradient(135deg, #059669, #10B981); color: #fff; }
    .tm-btn-run:disabled { background: #E2E8F0; color: var(--muted); cursor: not-allowed; }
    .tm-btn-run:not(:disabled):hover { box-shadow: 0 5px 16px rgba(16,185,129,0.35); transform: translateY(-1px); }
    .tm-btn-refresh { background: #64748B; color: #fff; }
    .tm-btn-export { background: linear-gradient(135deg, #0EA5E9, #38BDF8); color: #fff; }
    .tm-btn-export:hover { box-shadow: 0 5px 16px rgba(56,189,248,0.35); transform: translateY(-1px); }

    /* BODY */
    .tm-body { flex: 1; overflow: hidden; padding: 22px 28px; display: flex; flex-direction: column; min-height: 0; }
    .tm-scroll-card { flex: 1; background: var(--surface); border-radius: 20px; border: 1px solid var(--border); box-shadow: 0 4px 20px rgba(0,0,0,0.06); display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
    .tm-inner { flex: 1; overflow-y: auto; padding: 22px; }
    .tm-inner::-webkit-scrollbar { width: 5px; }
    .tm-inner::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    /* KPI */
    .tm-kpi-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 13px; margin-bottom: 22px; }
    .tm-kpi { background: var(--navy); border-radius: 15px; padding: 18px; position: relative; overflow: hidden; transition: transform 0.2s; }
    .tm-kpi::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(56,189,248,0.07) 0%, transparent 60%); pointer-events: none; }
    .tm-kpi:hover { transform: translateY(-2px); }
    .tm-kpi-val { font-size: 30px; font-weight: 800; color: #fff; line-height: 1; margin-bottom: 5px; }
    .tm-kpi-label { font-size: 10px; color: rgba(255,255,255,0.45); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
    .tm-kpi-sub { font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 3px; }
    .tm-kpi-accent { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; }

    /* CHART BOXES */
    .tm-chart-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 22px; }
    .tm-chart-box { background: #F8FAFC; border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
    .tm-chart-box h3 { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
    .tm-chart-box h3::after { content: ''; flex: 1; height: 1px; background: var(--border); }

    /* TABLE */
    .tm-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }
    .tm-table { width: 100%; border-collapse: collapse; min-width: 900px; }
    .tm-table thead th { position: sticky; top: 0; z-index: 2; background: #F8FAFC; padding: 12px 12px; text-align: left; font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; border-bottom: 2px solid var(--border); white-space: nowrap; }
    .tm-table tbody tr { border-bottom: 1px solid #F1F5F9; transition: background 0.12s; cursor: pointer; }
    .tm-table tbody tr:hover { background: #F8FAFC; }
    .tm-table tbody td { padding: 12px 12px; font-size: 12.5px; color: var(--text); vertical-align: middle; }

    /* SEARCH + FILTER */
    .tm-search-row { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
    .tm-search { flex: 1; min-width: 200px; background: var(--surface); border: 1px solid var(--border); color: var(--navy); padding: 9px 14px; border-radius: 9px; font-family: 'Syne', sans-serif; font-size: 13px; outline: none; transition: border 0.2s; }
    .tm-search:focus { border-color: #38BDF8; }
    .tm-filter-btn { padding: 9px 14px; border-radius: 9px; background: var(--surface); border: 1px solid var(--border); color: var(--muted); font-family: 'Syne', sans-serif; font-weight: 700; font-size: 12px; cursor: pointer; transition: all 0.16s; }
    .tm-filter-btn.active-filter { background: #EFF6FF; border-color: #BFDBFE; color: var(--navy); }
    .tm-clear-btn { padding: 9px 14px; border-radius: 9px; background: var(--surface); border: 1px solid #FECACA; color: #EF4444; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 12px; cursor: pointer; }

    /* SPRINT CARDS */
    .tm-sprint-card { background: #F8FAFC; border: 1px solid var(--border); border-radius: 14px; padding: 18px; margin-bottom: 14px; }
    .tm-sprint-task { background: #F8FAFC; border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; }

    /* RISK FILTERS */
    .tm-risk-filter { background: #F8FAFC; border: 2px solid var(--border); border-radius: 12px; padding: 14px 18px; cursor: pointer; transition: all 0.18s; }
    .tm-risk-filter.selected { border-width: 2px; }
    .tm-risk-filter:hover { transform: translateY(-1px); }

    /* EMPTY */
    .tm-empty { padding: 70px 20px; text-align: center; color: var(--muted); font-size: 13px; }
    .tm-empty-icon { font-size: 40px; margin-bottom: 14px; opacity: 0.5; }

    /* UPLOAD OVERLAY */
    .tm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 9000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }
    .tm-overlay-progress { width: 320px; background: var(--border); border-radius: 8px; height: 10px; }
    .tm-overlay-fill { height: 100%; border-radius: 8px; background: linear-gradient(90deg, #38BDF8, #7C3AED); transition: width .4s ease; }

    /* TOAST */
    .tm-toast { position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 12px 20px; border-radius: 10px; font-weight: 700; font-size: 13px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); animation: toastIn .25s ease; font-family: 'Syne', sans-serif; }
    @keyframes toastIn { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }

    /* SECTION HEAD */
    .tm-section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .tm-section-title { color: var(--navy); font-weight: 800; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
    .tm-section-count { background: #EFF6FF; color: #38BDF8; border-radius: 20px; padding: 2px 10px; font-size: 11px; font-weight: 700; }

    @media (max-width: 1100px) { .tm-kpi-grid { grid-template-columns: repeat(3,1fr); } .tm-chart-grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 900px)  { .tm-kpi-grid { grid-template-columns: repeat(2,1fr); } .tm-chart-grid { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(s);
};

/* ─── CONSTANTS ─── */
const STATUS_META = {
  Backlog:      { color: "#6B7280", bg: "#F3F4F6", icon: "◎" },
  Todo:         { color: "#D97706", bg: "#FEF3C7", icon: "○" },
  "In Progress":{ color: "#2563EB", bg: "#EFF6FF", icon: "◐" },
  Review:       { color: "#7C3AED", bg: "#F5F3FF", icon: "◑" },
  Done:         { color: "#10B981", bg: "#D1FAE5", icon: "●" },
};
const PRIORITY_META = {
  Low:      { color: "#10B981", icon: "▼" },
  Medium:   { color: "#F59E0B", icon: "■" },
  High:     { color: "#F97316", icon: "▲" },
  Critical: { color: "#EF4444", icon: "⬆" },
};
const RISK_META = {
  Low:    { color: "#10B981", label: "LOW RISK"  },
  Medium: { color: "#F59E0B", label: "MED RISK"  },
  High:   { color: "#EF4444", label: "HIGH RISK" },
};
const PIE_COLORS = ["#94A3B8","#F59E0B","#38BDF8","#7C3AED","#10B981"];

const fmt  = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"2-digit" }) : "—";
const pct  = (a, b) => b ? Math.round((a / b) * 100) : 0;

const customTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0D1B2A",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 14px" }}>
      <p style={{ color:"#94A3B8",fontSize:11,marginBottom:6 }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color:p.fill||p.stroke,fontSize:12,fontWeight:700 }}>{p.name}: {p.value}</p>)}
    </div>
  );
};

/* ─── MAIN ─── */
export default function TaskManagerPage() {
  injectStyles();

  const [tab, setTab]               = useState("OVERVIEW");
  const [tasks, setTasks]           = useState([]);
  const [projects, setProjects]     = useState([]);
  const [selProject, setSelProject] = useState("ALL");
  const [sprints, setSprints]       = useState([]);
  const [workload, setWorkload]     = useState([]);
  const [aiRisks, setAiRisks]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [file, setFile]             = useState(null);
  const [projectName, setProjectName] = useState("");
  const [toast, setToast]           = useState(null);
  const [search, setSearch]         = useState("");
  const [filters, setFilters]       = useState({ priority:"", status:"", assigned:"" });
  const [activeFilter, setActiveFilter] = useState(null);
  const [dailyFile, setDailyFile] = useState(null);
  const fileRef = useRef();

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchProjects = useCallback(async () => {
    try { const { data } = await axios.get(`${API}/projects`); const list = Array.isArray(data) ? data : []; setProjects(list); return list; }
    catch { return []; }
  }, []);

  const fetchTasks = useCallback(async (pid) => {
    setLoading(true);
    try {
      const id = pid || (selProject !== "ALL" ? selProject : null);
      const url = id ? `${API}/tasks/all?project_id=${id}` : `${API}/tasks/all`;
      const { data } = await axios.get(url);
      setTasks(Array.isArray(data) ? data : []);
    } catch { showToast("Failed to load tasks","error"); }
    finally { setLoading(false); }
  }, [selProject]);

  const fetchSprints  = useCallback(async (pid) => { if (!pid||pid==="ALL"){setSprints([]);return;} try{const{data}=await axios.get(`${API}/tasks/sprints/${pid}`);setSprints(Array.isArray(data)?data:[]);}catch{setSprints([]);} },[]);
  const fetchWorkload = useCallback(async (pid) => { if (!pid||pid==="ALL"){setWorkload([]);return;} try{const{data}=await axios.get(`${API}/tasks/workload/${pid}`);setWorkload(Array.isArray(data)?data:[]);}catch{setWorkload([]);} },[]);
  const fetchAiRisks  = useCallback(async (pid) => { if (!pid||pid==="ALL"){setAiRisks([]);return;} try{const{data}=await axios.get(`${API}/tasks/ai-risk/${pid}`);setAiRisks(Array.isArray(data)?data:[]);}catch{setAiRisks([]);} },[]);

  const refreshAll = useCallback((pid) => {
    const id = pid !== undefined ? pid : (selProject !== "ALL" ? selProject : null);
    fetchTasks(id); fetchSprints(id); fetchWorkload(id); fetchAiRisks(id);
  }, [selProject, fetchTasks, fetchSprints, fetchWorkload, fetchAiRisks]);

  useEffect(() => {
    fetchProjects().then(list => {
      if (list.length) {
        const latest = list.reduce((a,b) => b.id > a.id ? b : a, list[0]);
        const latestId = String(latest.id);
        setSelProject(latestId);
        fetchTasks(latestId); fetchSprints(latestId); fetchWorkload(latestId); fetchAiRisks(latestId);
      } else { fetchTasks(null); }
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    if (selProject === "ALL") { fetchTasks(null); setSprints([]); setWorkload([]); setAiRisks([]); }
    else { fetchTasks(selProject); fetchSprints(selProject); fetchWorkload(selProject); fetchAiRisks(selProject); }
  }, [selProject]); // eslint-disable-line

  const handleUpload = async () => {
    if (!file) return showToast("Please select an Excel file","error");
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx","xls","csv"].includes(ext)) return showToast("Only .xlsx / .xls / .csv files","error");
    setUploading(true); setUploadProgress(0);
    const ticker = setInterval(() => setUploadProgress(p => Math.min(p+4,90)), 400);
    const form = new FormData();
    form.append("file", file);
    form.append("projectName", projectName || `Project ${new Date().toLocaleDateString("en-GB")}`);
    try {
      const { data } = await axios.post(`${API}/tasks/upload-excel`, form, { headers: { "Content-Type":"multipart/form-data" } });
      clearInterval(ticker); setUploadProgress(100);
      setTimeout(() => {
        setUploading(false); setUploadProgress(0); setFile(null); setProjectName("");
        if (fileRef.current) fileRef.current.value = "";
        fetchProjects().then(() => { const newId = String(data.projectId); setSelProject(newId); fetchTasks(newId); fetchSprints(newId); fetchWorkload(newId); fetchAiRisks(newId); });
        showToast(`✅ ${data.taskCount} tasks automated → Project #${data.projectId}`);
      }, 600);
    } catch (err) { clearInterval(ticker); setUploading(false); setUploadProgress(0); showToast(err.response?.data?.error || "Upload failed","error"); }
  };

  const updateStatus = async (taskId, employeeId) => {
    try { const { data } = await axios.post(`${API}/tasks/update-status`, { taskId, employeeId }); showToast(`Task → ${data.nextStatus}`); refreshAll(selProject !== "ALL" ? selProject : null); }
    catch { showToast("Status update failed","error"); }
  };

  const exportExcel = () => {
    const rows = filteredTasks.map(t => ({ "Task Name":t.task_name,"Priority":t.priority,"Skill":t.skill_required,"Assigned To":t.assigned_name||"—","Sprint":t.sprint_name||"—","Start":fmt(t.start_date),"Due":fmt(t.due_date),"Est. Hours":t.estimated_hours,"Status":t.status,"AI Risk":t.risk_level||"—","Delay Days":t.predicted_delay_days??"—","Confidence":t.confidence_score!=null?`${Math.round(t.confidence_score*100)}%`:"—" }));
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    saveAs(new Blob([XLSX.write(wb,{bookType:"xlsx",type:"array"})],{type:"application/octet-stream"}),"tasks_export.xlsx");
  };
const handleDailyUpdate = async () => {
  if (!dailyFile) return showToast("Please select daily update file", "error");

  const form = new FormData();
  form.append("file", dailyFile);

  try {
    setUploading(true);
    const { data } = await axios.post(`${API}/tasks/daily-update`, form);

    setUploading(false);
    setDailyFile(null);
    showToast(`✅ ${data.message}`);

    // FIX: Update selProject to the one the server actually modified
    if (data.detectedProjectId) {
      const newPid = String(data.detectedProjectId);
      setSelProject(newPid); 
      refreshAll(newPid); // Force refresh using the ID from the server
    } else {
      refreshAll(selProject !== "ALL" ? selProject : null);
    }

  } catch (err) {
    setUploading(false);
    showToast(err.response?.data?.error || "Daily update failed", "error");
  }
};

  const filteredTasks = tasks
    .filter(t => (t.task_name||"").toLowerCase().includes(search.toLowerCase()) || (t.assigned_name||"").toLowerCase().includes(search.toLowerCase()))
    .filter(t => !filters.priority || t.priority === filters.priority)
    .filter(t => !filters.status   || t.status   === filters.status)
    .filter(t => !filters.assigned || (t.assigned_name||"").toLowerCase().includes(filters.assigned.toLowerCase()));

  const statusCounts   = ["Backlog","Todo","In Progress","Review","Done"].map(s => ({ name:s, value:tasks.filter(t=>t.status===s).length }));
  const priorityCounts = ["Low","Medium","High","Critical"].map(p => ({ name:p, value:tasks.filter(t=>t.priority===p).length, fill:PRIORITY_META[p]?.color }));
  const riskSource     = aiRisks.length ? aiRisks : tasks;
  const riskCounts     = { High:riskSource.filter(r=>r.risk_level==="High").length, Medium:riskSource.filter(r=>r.risk_level==="Medium").length, Low:riskSource.filter(r=>r.risk_level==="Low").length };

  return (
    <div className="tm-root">
      {/* ── TOAST ── */}
      {toast && (
        <div className="tm-toast" style={{ background: toast.type==="error" ? "#EF4444" : "#10B981", color:"#fff" }}>
          {toast.msg}
        </div>
      )}

      {/* ── UPLOAD OVERLAY ── */}
      {uploading && (
        <div className="tm-overlay">
          <div style={{ fontSize:48 }}>⚙️</div>
          <div style={{ color:"#fff",fontSize:18,fontWeight:800 }}>Running Full Automation Pipeline…</div>
          <div className="tm-overlay-progress">
            <div className="tm-overlay-fill" style={{ width:`${uploadProgress}%` }} />
          </div>
          <div style={{ color:"rgba(255,255,255,0.5)",fontSize:12 }}>
            {uploadProgress<30?"📝 Parsing tasks from Excel…":uploadProgress<55?"🎯 Assigning tasks by skill & workload…":uploadProgress<75?"📦 Scheduling sprints…":uploadProgress<90?"📅 Setting task timelines…":"🤖 Generating AI risk predictions…"}
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="tm-header">
        <div className="tm-header-title">◈ TASK COMMAND</div>
        <div className="tm-tabs">
          {["OVERVIEW","TASKS","SPRINTS","WORKLOAD","AI RISK"].map(t => (
            <button key={t} className={`tm-tab${tab===t?" active":""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <select className="tm-project-select" value={selProject} onChange={e => setSelProject(e.target.value)}>
          <option value="ALL">All Projects</option>
          {[...projects].sort((a,b)=>b.id-a.id).map(p => <option key={p.id} value={String(p.id)}>{p.project_name} (#{p.id})</option>)}
        </select>
      </div>

      {/* ── UPLOAD STRIP ── */}
      <div className="tm-strip">
        <span className="tm-strip-label">UPLOAD EXCEL →</span>
        <input type="text" className="tm-strip-input" placeholder="Project name (optional)" value={projectName} onChange={e => setProjectName(e.target.value)} />
        <label className={`tm-btn tm-btn-file${file?" active":""}`} style={{ cursor:"pointer" }}>
          {file ? `📄 ${file.name.slice(0,18)}…` : "📂 Choose File"}
          <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files[0])} />
        </label>
        <button className="tm-btn tm-btn-run" onClick={handleUpload} disabled={!file||uploading}>⚡ Run Automation</button>
          <hr style={{
    margin: "0 10px",
    height: 24,
    border: "none",
    borderLeft: "1px solid #E2E8F0"
  }} />
        <div style={{ marginLeft:"auto",display:"flex",gap:8 }}>
          <button className="tm-btn tm-btn-refresh" onClick={() => refreshAll(selProject!=="ALL"?selProject:null)}>⟳ Refresh</button>
          <button className="tm-btn tm-btn-export" onClick={exportExcel}>⬇ Export</button>
        </div>
        <span className="tm-strip-label">DAILY UPDATE →</span>

<label className={`tm-btn tm-btn-file${dailyFile ? " active" : ""}`} style={{ cursor: "pointer" }}>
  {dailyFile ? `📄 ${dailyFile.name.slice(0, 18)}…` : "📂 Choose Update"}
  <input
    type="file"
    hidden
    accept=".xlsx,.xls,.csv"
    onChange={(e) => setDailyFile(e.target.files[0])}
  />
</label>

<button
  className="tm-btn tm-btn-run"
  onClick={handleDailyUpdate}
  disabled={!dailyFile || uploading}
>
  🔄 Run Daily Update
</button>
      </div>

      {/* ── BODY ── */}
      <div className="tm-body">
        <div className="tm-scroll-card">
          <div className="tm-inner">
            {tab === "OVERVIEW"  && <OverviewTab tasks={tasks} statusCounts={statusCounts} priorityCounts={priorityCounts} riskCounts={riskCounts} aiRisks={aiRisks} sprints={sprints} />}
            {tab === "TASKS"     && <TasksTab tasks={filteredTasks} loading={loading} search={search} setSearch={setSearch} filters={filters} setFilters={setFilters} activeFilter={activeFilter} setActiveFilter={setActiveFilter} updateStatus={updateStatus} />}
            {tab === "SPRINTS"   && <SprintsTab sprints={sprints} selProject={selProject} />}
            {tab === "WORKLOAD"  && <WorkloadTab workload={workload} selProject={selProject} />}
            {tab === "AI RISK"   && <AiRiskTab risks={aiRisks} selProject={selProject} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── OVERVIEW ─── */
function OverviewTab({ tasks, statusCounts, priorityCounts, riskCounts, aiRisks, sprints }) {
  const done = tasks.filter(t => t.status === "Done").length;
  const total = tasks.length;

  return (
    <div>
      <div className="tm-kpi-grid">
        {[
          { label:"TOTAL TASKS",    value:total,                                          accent:"#38BDF8" },
          { label:"COMPLETED",      value:done,         sub:`${pct(done,total)}% done`,   accent:"#10B981" },
          { label:"IN PROGRESS",    value:tasks.filter(t=>t.status==="In Progress").length, accent:"#2563EB" },
          { label:"HIGH RISK",      value:riskCounts.High, sub:`${riskCounts.Medium} medium`, accent:"#EF4444" },
          { label:"ACTIVE SPRINTS", value:sprints.filter(s=>s.status==="Active").length, sub:`${sprints.length} total`, accent:"#7C3AED" },
        ].map(k => (
          <div key={k.label} className="tm-kpi">
            <div className="tm-kpi-accent" style={{ background:`linear-gradient(to right, ${k.accent}, transparent)` }} />
            <div className="tm-kpi-val">{k.value}</div>
            <div className="tm-kpi-label">{k.label}</div>
            {k.sub && <div className="tm-kpi-sub">{k.sub}</div>}
          </div>
        ))}
      </div>

      <div className="tm-chart-grid">
        <div className="tm-chart-box">
          <h3>Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                label={({ name, value }) => value ? `${name} ${value}` : ""}>
                {statusCounts.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip content={customTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="tm-chart-box">
          <h3>Priority Spread</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={priorityCounts} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fill:"#94A3B8",fontSize:11 }} />
              <YAxis tick={{ fill:"#94A3B8",fontSize:11 }} />
              <Tooltip content={customTooltip} />
              <Bar dataKey="value" name="Tasks" radius={[6,6,0,0]}>
                {priorityCounts.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="tm-chart-box">
          <h3>AI Risk Overview</h3>
          <div style={{ display:"flex",flexDirection:"column",gap:12,marginTop:8 }}>
            {[["High","#EF4444"],["Medium","#F59E0B"],["Low","#10B981"]].map(([lvl,col]) => (
              <div key={lvl} style={{ display:"flex",alignItems:"center",gap:10 }}>
                <span style={{ color:col,fontWeight:800,width:56,fontSize:11 }}>{lvl}</span>
                <div style={{ flex:1,background:"#E2E8F0",borderRadius:4,height:8 }}>
                  <div style={{ width:`${pct(riskCounts[lvl],(aiRisks.length||tasks.length)||1)}%`,height:"100%",background:col,borderRadius:4,transition:"width .5s" }} />
                </div>
                <span style={{ color:"#94A3B8",fontSize:11,width:24,textAlign:"right" }}>{riskCounts[lvl]}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:16,color:"#94A3B8",fontSize:11 }}>
            Avg confidence: {aiRisks.length ? `${Math.round(aiRisks.reduce((s,r)=>s+(r.confidence_score||0),0)/aiRisks.length*100)}%` : "—"}
          </div>
        </div>
      </div>

      {aiRisks.filter(r=>r.risk_level==="High").length > 0 && (
        <div style={{ background:"#FFF5F5",border:"1px solid #FECACA",borderRadius:14,padding:18 }}>
          <div className="tm-section-head">
            <span className="tm-section-title">⚠ HIGH RISK TASKS</span>
            <span className="tm-section-count" style={{ background:"#FEE2E2",color:"#EF4444" }}>{aiRisks.filter(r=>r.risk_level==="High").length}</span>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {aiRisks.filter(r=>r.risk_level==="High").slice(0,5).map(r => (
              <div key={r.id} style={{ display:"flex",alignItems:"center",gap:12,background:"#fff",borderRadius:10,padding:"10px 14px",border:"1px solid #FECACA" }}>
                <span style={{ color:"#EF4444",fontSize:16 }}>⬆</span>
                <span style={{ flex:1,fontSize:12,color:"#0D1B2A",fontWeight:600 }}>{r.task_name}</span>
                <span style={{ color:"#94A3B8",fontSize:11 }}>{r.assigned_name||"—"}</span>
                <span style={{ color:"#EF4444",fontSize:11,fontWeight:700 }}>+{r.predicted_delay_days}d delay</span>
                <span style={{ color:"#94A3B8",fontSize:11 }}>{Math.round((r.confidence_score||0)*100)}% conf</span>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── TASKS TAB ─── */
function TasksTab({ tasks, loading, search, setSearch, filters, setFilters, activeFilter, setActiveFilter, updateStatus }) {
  const STATUS_FLOW = ["Backlog","Todo","In Progress","Review","Done"];

  return (
    <div>
      <div className="tm-search-row">
        <input className="tm-search" placeholder="🔍  Search tasks or assignee…" value={search} onChange={e => setSearch(e.target.value)} />
        <FilterDropdown label="Priority" field="priority" options={["Low","Medium","High","Critical"]} filters={filters} setFilters={setFilters} activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
        <FilterDropdown label="Status"   field="status"   options={["Backlog","Todo","In Progress","Review","Done"]} filters={filters} setFilters={setFilters} activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
        {(filters.priority||filters.status||filters.assigned||search) && (
          <button className="tm-clear-btn" onClick={() => { setFilters({priority:"",status:"",assigned:""}); setSearch(""); }}>✕ Clear</button>
        )}
        <span style={{ color:"#94A3B8",fontSize:12,marginLeft:"auto" }}>{tasks.length} task{tasks.length!==1?"s":""}</span>
      </div>

      {loading ? (
        <div className="tm-empty"><div className="tm-empty-icon">⏳</div>Loading tasks…</div>
      ) : (
        <div className="tm-table-wrap">
          <table className="tm-table">
            <thead>
              <tr>
                {["ASSIGNED","SPRINT","START","DUE","TASK","PRIORITY","SKILL","HRS","STATUS","AI RISK","NEXT"].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign:"center",padding:40,color:"#94A3B8",fontSize:13 }}>No tasks. Upload Excel to run automation.</td></tr>
              )}
              {tasks.map(t => {
                const pm        = PRIORITY_META[t.priority] || PRIORITY_META.Medium;
                const rm        = RISK_META[t.risk_level] || null;
                const nextIdx   = STATUS_FLOW.indexOf(t.status);
                const nextStatus= nextIdx < STATUS_FLOW.length-1 ? STATUS_FLOW[nextIdx+1] : null;
                const overdue   = t.due_date && new Date(t.due_date) < new Date() && t.status !== "Done";

                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight:700,color:"#0D1B2A",whiteSpace:"nowrap" }}>{t.assigned_name||"—"}</td>
                    <td><span style={{ color:"#7C3AED",fontSize:11,fontWeight:600 }}>{t.sprint_name||"—"}</span></td>
                    <td><span style={{ color:"#94A3B8",fontSize:11 }}>{fmt(t.start_date)}</span></td>
                    <td>
                      <span style={{ color:overdue?"#EF4444":"#94A3B8",fontSize:11,fontWeight:overdue?700:400 }}>
                        {fmt(t.due_date)}{overdue?" ⚠":""}
                      </span>
                    </td>
                    <td style={{ maxWidth:180 }}>
                      <span style={{ fontSize:12,color:"#0D1B2A",lineHeight:1.4 }}>{t.task_name||"—"}</span>
                    </td>
                    <td><span style={{ color:pm.color,fontWeight:800,fontSize:11 }}>{pm.icon} {t.priority||"—"}</span></td>
                    <td><span style={{ color:"#94A3B8",fontSize:11 }}>{t.skill_required||"—"}</span></td>
                    <td><span style={{ color:"#0D1B2A",fontSize:12,fontWeight:600 }}>{t.estimated_hours||0}h</span></td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>
                      {rm ? (
                        <div>
                          <span style={{ color:rm.color,fontWeight:700,fontSize:10 }}>{rm.label}</span>
                          <div style={{ color:"#94A3B8",fontSize:10 }}>+{t.predicted_delay_days}d · {Math.round((t.confidence_score||0)*100)}%</div>
                        </div>
                      ) : <span style={{ color:"#94A3B8",fontSize:12 }}>—</span>}
                    </td>
                    <td>
                      {nextStatus && t.status !== "Done" ? (
                        <button onClick={() => updateStatus(t.id, t.assigned_to)}
                          style={{ padding:"5px 10px",borderRadius:7,background:"#EFF6FF",border:"1px solid #BFDBFE",color:"#0D1B2A",fontFamily:"'Syne',sans-serif",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap" }}>
                          → {nextStatus}
                        </button>
                      ) : <span style={{ color:"#10B981",fontSize:11,fontWeight:700 }}>✓ Done</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── SPRINTS TAB ─── */
function SprintsTab({ sprints, selProject }) {
  if (!sprints.length)
    return <div className="tm-empty"><div className="tm-empty-icon">📭</div>{selProject&&selProject!=="ALL"?"No sprints. Run automation to generate.":"Select a project to view sprints."}</div>;

  return (
    <div>
      {sprints.map(sp => {
        const progress    = pct(Number(sp.done_tasks), Number(sp.total_tasks));
        const statusColor = { Active:"#10B981",Planned:"#F59E0B",Completed:"#6B7280" }[sp.status]||"#6B7280";
        return (
          <div key={sp.id} className="tm-sprint-card" style={{ borderLeft:`4px solid ${statusColor}` }}>
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
              <span style={{ fontWeight:800,fontSize:14,color:"#0D1B2A" }}>{sp.sprint_name}</span>
              <span style={{ background:`${statusColor}22`,color:statusColor,borderRadius:20,padding:"2px 10px",fontSize:10,fontWeight:700 }}>{sp.status}</span>
              <span style={{ color:"#94A3B8",fontSize:11,marginLeft:"auto" }}>{fmt(sp.start_date)} → {fmt(sp.end_date)}</span>
              <span style={{ color:"#94A3B8",fontSize:11 }}>{sp.total_hours||0}h · {sp.total_tasks} tasks</span>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                <span style={{ color:"#94A3B8",fontSize:11 }}>Progress</span>
                <span style={{ color:"#0D1B2A",fontWeight:700,fontSize:11 }}>{progress}%</span>
              </div>
              <div style={{ background:"#E2E8F0",borderRadius:4,height:6 }}>
                <div style={{ width:`${progress}%`,height:"100%",borderRadius:4,background:"linear-gradient(90deg, #38BDF8, #7C3AED)",transition:"width .5s" }} />
              </div>
            </div>
            {sp.tasks?.length > 0 && (
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:8 }}>
                {sp.tasks.map(t => {
                  const pm = PRIORITY_META[t.priority] || PRIORITY_META.Medium;
                  const rm = RISK_META[t.risk_level];
                  return (
                    <div key={t.id} className="tm-sprint-task">
                      <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:5 }}>
                        <span style={{ color:pm.color,fontSize:10 }}>{pm.icon}</span>
                        <span style={{ fontSize:11,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#0D1B2A" }}>{t.task_name}</span>
                        {rm && <span style={{ color:rm.color,fontSize:9,fontWeight:700 }}>{rm.label}</span>}
                      </div>
                      <div style={{ display:"flex",justifyContent:"space-between" }}>
                        <span style={{ color:"#94A3B8",fontSize:10 }}>{t.assigned_name||"—"}</span>
                        <StatusBadge status={t.status} small />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── WORKLOAD TAB ─── */
function WorkloadTab({ workload, selProject }) {
  if (!workload.length)
    return <div className="tm-empty"><div className="tm-empty-icon">📭</div>{selProject&&selProject!=="ALL"?"No workload data. Assign tasks to employees.":"Select a project to view workload."}</div>;

  const maxHours = Math.max(...workload.map(w => w.total_hours||0), 1);
  return (
    <div>
      <div className="tm-section-head"><span className="tm-section-title">TEAM WORKLOAD DISTRIBUTION</span><span className="tm-section-count">{workload.length}</span></div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14,marginBottom:22 }}>
        {workload.map(emp => {
          const load   = pct(emp.total_hours, maxHours);
          const isHigh = load > 80;
          return (
            <div key={emp.id} style={{ background:"#F8FAFC",border:`1px solid ${isHigh?"#FECACA":"#E2E8F0"}`,borderRadius:14,padding:18 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12 }}>
                <span style={{ fontWeight:700,color:"#0D1B2A" }}>{emp.first_name}</span>
                <span style={{ color:isHigh?"#EF4444":"#94A3B8",fontWeight:700,fontSize:12 }}>{emp.total_hours||0}h</span>
              </div>
              <div style={{ background:"#E2E8F0",borderRadius:4,height:8,marginBottom:12 }}>
                <div style={{ width:`${load}%`,height:"100%",borderRadius:4,background:isHigh?"linear-gradient(90deg,#F59E0B,#EF4444)":"linear-gradient(90deg,#38BDF8,#10B981)",transition:"width .5s" }} />
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6 }}>
                {[["Backlog",emp.backlog,"#94A3B8"],["Todo",emp.todo,"#F59E0B"],["Active",emp.in_progress,"#38BDF8"],["Done",emp.done,"#10B981"]].map(([label,val,col]) => (
                  <div key={label} style={{ background:"#fff",borderRadius:8,padding:"6px 8px",textAlign:"center",border:"1px solid #E2E8F0" }}>
                    <div style={{ color:col,fontWeight:800,fontSize:16 }}>{val||0}</div>
                    <div style={{ color:"#94A3B8",fontSize:9,letterSpacing:.5,textTransform:"uppercase" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="tm-chart-box">
        <h3>Hours Comparison</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={workload} barSize={22}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="first_name" tick={{ fill:"#94A3B8",fontSize:11 }} />
            <YAxis tick={{ fill:"#94A3B8",fontSize:11 }} />
            <Tooltip content={customTooltip} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }} />
            <Bar dataKey="total_hours" name="Total Hours" fill="#38BDF8" radius={[6,6,0,0]} />
            <Bar dataKey="done"        name="Done Tasks"  fill="#10B981" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── AI RISK TAB ─── */
function AiRiskTab({ risks, selProject }) {
  const [filter, setFilter] = useState("All");
  if (!risks.length)
    return <div className="tm-empty"><div className="tm-empty-icon">🤖</div>{selProject&&selProject!=="ALL"?"No AI risk predictions. Run automation pipeline.":"Select a project to view AI risk analysis."}</div>;

  const shown = filter==="All" ? risks : risks.filter(r => r.risk_level===filter);
  return (
    <div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:22 }}>
        {[["HIGH","High","#EF4444"],["MEDIUM","Medium","#F59E0B"],["LOW","Low","#10B981"]].map(([label,lvl,col]) => (
          <div key={lvl} className={`tm-risk-filter${filter===lvl?" selected":""}`}
            onClick={() => setFilter(filter===lvl?"All":lvl)}
            style={{ borderColor:filter===lvl?col:"#E2E8F0",background:filter===lvl?`${col}0D`:"#F8FAFC" }}>
            <div style={{ color:"#94A3B8",fontSize:10,letterSpacing:2,marginBottom:4,textTransform:"uppercase",fontWeight:700 }}>{label} RISK</div>
            <div style={{ fontSize:36,fontWeight:800,color:col }}>{risks.filter(r=>r.risk_level===lvl).length}</div>
            <div style={{ color:"#94A3B8",fontSize:11 }}>Avg delay: {risks.filter(r=>r.risk_level===lvl).length?Math.round(risks.filter(r=>r.risk_level===lvl).reduce((s,r)=>s+(r.predicted_delay_days||0),0)/risks.filter(r=>r.risk_level===lvl).length):0}d</div>
          </div>
        ))}
      </div>
      <div className="tm-table-wrap">
        <table className="tm-table">
          <thead>
            <tr>{["RISK","TASK","ASSIGNED","PRIORITY","STATUS","DELAY","CONFIDENCE","DUE"].map(h=><th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map(r => {
              const rm = RISK_META[r.risk_level] || RISK_META.Low;
              const pm = PRIORITY_META[r.priority] || PRIORITY_META.Medium;
              const overdue = r.due_date && new Date(r.due_date) < new Date() && r.status !== "Done";
              return (
                <tr key={r.id}>
                  <td>
                    <span style={{ background:`${rm.color}22`,color:rm.color,borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700 }}>{r.risk_level}</span>
                  </td>
                  <td style={{ maxWidth:180,color:"#0D1B2A",fontSize:12 }}>{r.task_name}</td>
                  <td style={{ fontWeight:700,color:"#0D1B2A" }}>{r.assigned_name||"—"}</td>
                  <td><span style={{ color:pm.color,fontWeight:700,fontSize:11 }}>{pm.icon} {r.priority}</span></td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><span style={{ color:rm.color,fontWeight:700,fontSize:12 }}>+{r.predicted_delay_days}d</span></td>
                  <td>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <div style={{ flex:1,background:"#E2E8F0",borderRadius:3,height:5,width:60 }}>
                        <div style={{ width:`${Math.round((r.confidence_score||0)*100)}%`,height:"100%",borderRadius:3,background:rm.color }} />
                      </div>
                      <span style={{ color:"#94A3B8",fontSize:11 }}>{Math.round((r.confidence_score||0)*100)}%</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ color:overdue?"#EF4444":"#94A3B8",fontSize:11,fontWeight:overdue?700:400 }}>
                      {fmt(r.due_date)}{overdue?" ⚠":""}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── SHARED COMPONENTS ─── */
function StatusBadge({ status, small }) {
  const sm = STATUS_META[status] || STATUS_META.Backlog;
  return (
    <span style={{ background:sm.bg,color:sm.color,borderRadius:20,padding:small?"2px 7px":"4px 10px",fontSize:small?9:11,fontWeight:700,whiteSpace:"nowrap" }}>
      {sm.icon} {status||"—"}
    </span>
  );
}

function FilterDropdown({ label, field, options, filters, setFilters, activeFilter, setActiveFilter }) {
  const active = filters[field];
  return (
    <div style={{ position:"relative" }}>
      <button className={`tm-filter-btn${active?" active-filter":""}`} onClick={() => setActiveFilter(activeFilter===field?null:field)}>
        {label}{active?`: ${active}`:""} ⏷
      </button>
      {activeFilter===field && (
        <div style={{ position:"absolute",top:40,left:0,zIndex:100,background:"#fff",border:"1px solid #E2E8F0",borderRadius:12,padding:6,boxShadow:"0 8px 24px rgba(0,0,0,0.1)",minWidth:140 }}>
          <div onClick={() => { setFilters(p=>({...p,[field]:""})); setActiveFilter(null); }}
            style={{ padding:"7px 12px",cursor:"pointer",color:"#94A3B8",fontSize:12,borderRadius:7,fontFamily:"'Syne',sans-serif",fontWeight:600 }}>All</div>
          {options.map(o => (
            <div key={o} onClick={() => { setFilters(p=>({...p,[field]:o})); setActiveFilter(null); }}
              style={{ padding:"7px 12px",cursor:"pointer",fontSize:12,color:filters[field]===o?"#0D1B2A":"#0F172A",background:filters[field]===o?"#EFF6FF":"transparent",borderRadius:7,fontFamily:"'Syne',sans-serif",fontWeight:600 }}>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
