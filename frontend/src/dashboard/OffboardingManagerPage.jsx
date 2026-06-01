import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

const API = "https://retrack.onrender.com/api";

/* ─── INJECT STYLES ─── */
const injectStyles = () => {
  if (document.getElementById("ob-styles")) return;
  const s = document.createElement("style");
  s.id = "ob-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
    .ob-root *, .ob-root *::before, .ob-root *::after { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Syne', sans-serif; }
    .ob-root { --bg: #F0F4F8; --surface: #fff; --border: #E2E8F0; --navy: #0D1B2A; --sky: #38BDF8; --green: #10B981; --amber: #F59E0B; --red: #EF4444; --muted: #94A3B8; --text: #0F172A;
      background: var(--bg); display: flex; flex-direction: column; height: 100vh; width: 100vw; overflow: hidden; padding: 28px 30px; gap: 18px;
    }
    .ob-kpi-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 16px; }
    .ob-kpi { background: var(--navy); border-radius: 16px; padding: 18px; position: relative; display: flex; flex-direction: column; gap: 8px; transition: transform 0.2s, box-shadow 0.2s; }
    .ob-kpi::after { content: ''; position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,0.04); }
    .ob-kpi:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(13,27,42,0.2); }
    .ob-kpi-val { font-size: 28px; font-weight: 800; color: #fff; }
    .ob-kpi-label { font-size: 11px; color: rgba(255,255,255,0.5); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    .ob-kpi-dot { width: 8px; height: 8px; border-radius: 50%; }

    .ob-tabs { display: flex; gap: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 5px; width: fit-content; }
    .ob-tab { padding: 9px 22px; border-radius: 10px; border: none; background: transparent; color: var(--muted); font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.18s; }
    .ob-tab.active { background: var(--navy); color: #fff; box-shadow: 0 2px 10px rgba(13,27,42,0.3); }
    .ob-tab:not(.active):hover { background: var(--bg); color: var(--text); }

    .ob-card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; display: flex; flex-direction: column; height: 100%; overflow: hidden; }
    .ob-card-header { padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; background: linear-gradient(to right, #FAFBFC, var(--surface)); }
    .ob-card-title { font-size: 15px; font-weight: 800; color: var(--navy); display: flex; align-items: center; gap: 8px; }
    .ob-card-title::before { content: ''; width: 4px; height: 18px; background: linear-gradient(to bottom, var(--sky), #0EA5E9); border-radius: 2px; }
    .ob-card-body { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; }
    .ob-card-body::-webkit-scrollbar { width: 5px; }
    .ob-card-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    .ob-table-wrap { overflow-x: auto; flex: 1; min-height: 0; }
    .ob-table { width: 100%; border-collapse: collapse; }
    .ob-table thead th { position: sticky; top: 0; z-index: 2; background: #F8FAFC; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; border-bottom: 1px solid var(--border); white-space: nowrap; }
    .ob-table tbody tr { border-bottom: 1px solid #F1F5F9; transition: background 0.12s; }
    .ob-table tbody tr:hover { background: #F8FAFC; }
    .ob-table tbody td { padding: 13px 16px; font-size: 13.5px; color: var(--text); }

    .ob-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .ob-select { padding: 9px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); font-size: 13px; font-weight: 600; color: var(--text); cursor: pointer; outline: none; }
    .ob-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 10px; border: none; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.16s; }
    .ob-btn-primary { background: linear-gradient(135deg, var(--navy), #1e3a5f); color: #fff; }
    .ob-btn-primary:hover { box-shadow: 0 6px 20px rgba(13,27,42,0.3); transform: translateY(-1px); }
    .ob-btn-upload { background: linear-gradient(135deg, #0EA5E9, var(--sky)); color: #fff; }
    .ob-btn-upload:hover { box-shadow: 0 6px 16px rgba(56,189,248,0.35); transform: translateY(-1px); }

    .ob-badge { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 20px; font-size: 11.5px; font-weight: 700; }
    .ob-badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.8; }

    .ob-empty { padding: 70px 20px; text-align: center; color: var(--muted); font-size: 14px; }
    .ob-empty-icon { font-size: 40px; margin-bottom: 14px; opacity: 0.5; }

    .ob-chart-box { background: #F8FAFC; border: 1px solid var(--border); border-radius: 14px; padding: 22px; flex: 1; min-height: 0; display: flex; flex-direction: column; }
    .ob-chart-box h3 { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .ob-chart-box h3::after { content: ''; flex: 1; height: 1px; background: var(--border); }

    @media (max-width: 1000px) { .ob-kpi-grid { grid-template-columns: repeat(3,1fr); } }
    @media (max-width: 640px)  { .ob-kpi-grid { grid-template-columns: repeat(2,1fr); } }
  `;
  document.head.appendChild(s);
};

const statusBadge = (status) => ({
  completed:   { background: "#D1FAE5", color: "#065F46" },
  pending:     { background: "#FEF3C7", color: "#D97706" },
  in_progress: { background: "#EFF6FF", color: "#2563EB" },
  overdue:     { background: "#FEE2E2", color: "#B91C1C" },
}[status] || { background: "#F1F5F9", color: "#64748B" });

/* ─── KPI CARD ─── */
function KpiCard({ label, value, accent = "#38BDF8", icon }) {
  return (
    <div className="ob-kpi">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div className="ob-kpi-dot" style={{ background: accent }} />
      </div>
      <div className="ob-kpi-val">{value ?? 0}</div>
      <div className="ob-kpi-label">{label}</div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${accent}, transparent)` }} />
    </div>
  );
}

/* ─── MAIN ─── */
export default function OffboardingManagerPage() {
  injectStyles();

  const [activeTab, setActiveTab] = useState("DASHBOARD");
  const [tasks, setTasks]     = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [stats, setStats] = useState({
  totalEmployees: 0,
  completedTasks: 0,
  pendingTasks: 0,
  surveysCompleted: 0,
  surveysPending: 0,
});
  const [employees, setEmployees] = useState([]);

 useEffect(() => {
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/offboarding/stats`);
const data = await res.json();
setStats(data || {});
    } catch (err) {
      console.error(err);
    }
  };
  fetchStats();
}, []);

  useEffect(() => { fetchData(); }, []);

  const fetchEmployees = async () => {
  try {
    const res = await axios.get(`${API}/offboarding/employees/list`);
    setEmployees(res.data);
  } catch (err) {
    console.error(err);
  }
};

useEffect(() => {
  fetchEmployees();
}, []);

  const fetchData = async () => {
    try {
      const [tasksRes, surveysRes] = await Promise.all([
        axios.get(`${API}/offboarding/tasks/all`),
        axios.get(`${API}/offboarding/surveys/all`),
      ]);
      const td = tasksRes.data   || [];
      const sd = surveysRes.data || [];
      setTasks(td);
      setSurveys(sd);
      setStats({
        totalEmployees:    new Set(td.map(t => t.employee_name)).size,
        completedTasks:    td.filter(t => t.status === "completed").length,
        pendingTasks:      td.filter(t => t.status === "pending").length,
        surveysCompleted:  sd.filter(s => s.status === "completed").length,
        surveysPending:    sd.filter(s => s.status === "pending").length,
      });
    } catch (err) { console.error(err); }
  };

 const chartData = [{
  name: "Offboarding",
  totalEmployees:   stats?.totalEmployees ?? 0,
  completedTasks:   stats?.completedTasks ?? 0,
  pendingTasks:     stats?.pendingTasks ?? 0,
  surveysCompleted: stats?.surveysCompleted ?? 0,
  surveysPending:   stats?.surveysPending ?? 0,
}];

const kpiItems = [
  { label: "Employees",         value: stats?.totalEmployees ?? 0,   accent: "#38BDF8", icon: "👥" },
  { label: "Completed Tasks",   value: stats?.completedTasks ?? 0,   accent: "#10B981", icon: "✅" },
  { label: "Pending Tasks",     value: stats?.pendingTasks ?? 0,     accent: "#F59E0B", icon: "⏳" },
  { label: "Surveys Completed", value: stats?.surveysCompleted ?? 0, accent: "#A78BFA", icon: "📋" },
  { label: "Surveys Pending",   value: stats?.surveysPending ?? 0,   accent: "#EF4444", icon: "📌" },
];

  return (
    <div className="ob-root" style={{  width: "100%",        // ✅ IMPORTANT
    height: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "16px 20px",
     paddingTop: "30px", 
    overflow: "hidden", }}>
      {/* ── HEADER ── */}
      <div style={{ marginBottom: 22, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{ width: 40, height: 40, background: "linear-gradient(135deg, #0D1B2A, #1e3a5f)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 12px rgba(13,27,42,0.3)" }}>🚪</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0D1B2A", letterSpacing: "-0.02em" }}>Offboarding Manager</h1>
          </div>
          <p style={{ fontSize: 13, color: "#94A3B8", marginLeft: 52 }}>Manage exit tasks, surveys and employee transitions</p>
        </div>
      </div>

      {/* ── KPI ── */}
      <div className="ob-kpi-grid">
        {kpiItems.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* ── TABS ── */}
      <div className="ob-tabs">
       {["DASHBOARD","TASKS","EXIT_SURVEYS","OFFBOARDED"].map(t => (
  <button key={t} className={`ob-tab${activeTab === t ? " active" : ""}`} onClick={() => setActiveTab(t)}>
    {t === "DASHBOARD" ? "📊 Dashboard"
     : t === "TASKS" ? "✅ Tasks"
     : t === "EXIT_SURVEYS" ? "📋 Exit Surveys"
     : "🚪 Offboarded Employees"}
  </button>
))}
      </div>

      {/* ── CONTENT ── */}
      <div className="ob-card" style={{
    flex: 1,
    width: "100%",       // ✅ ADD THIS
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  }}>
        <div className="ob-card-body" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}></div>
        {activeTab === "DASHBOARD" && <DashboardTab data={chartData} />}
        {activeTab === "TASKS"     && <TasksTab tasks={tasks} fetchData={fetchData} />}
        {activeTab === "EXIT_SURVEYS" && <SurveyTab surveys={surveys} fetchData={fetchData} />}
        {activeTab === "OFFBOARDED" && <OffboardedTab employees={employees} />}
      </div>
    </div>
  );
}

/* ─── DASHBOARD ─── */
function DashboardTab({ data }) {
  const tt = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: "#0D1B2A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px" }}>
        <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 6 }}>{label}</p>
        {payload.map(p => <p key={p.name} style={{ color: p.fill, fontSize: 12, fontWeight: 700 }}>{p.name}: {p.value}</p>)}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="ob-card-header">
    <h3>Offboarding Summary</h3>
    <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} barSize={36}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94A3B8" }} />
            <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} />
            <Tooltip content={tt} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="totalEmployees"   fill="#38BDF8" name="Employees"          radius={[6,6,0,0]} />
            <Bar dataKey="completedTasks"   fill="#10B981" name="Completed Tasks"    radius={[6,6,0,0]} />
            <Bar dataKey="pendingTasks"     fill="#F59E0B" name="Pending Tasks"      radius={[6,6,0,0]} />
            <Bar dataKey="surveysCompleted" fill="#A78BFA" name="Surveys Completed"  radius={[6,6,0,0]} />
            <Bar dataKey="surveysPending"   fill="#EF4444" name="Surveys Pending"    radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── TASKS TAB ─── */
function TasksTab({ tasks, fetchData }) {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? tasks : tasks.filter(t => t.status === filter);

 const handleUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const arrayBuffer = evt.target.result;
      const wb = XLSX.read(arrayBuffer, { type: "array" });
      const rawJson = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

      const json = rawJson.map((row, i) => {
        if (!row["Employee ID"] && !row["employee_id"]) {
          throw new Error(`Row ${i + 2} missing 'Employee ID'`);
        }
        if (!row["Task Name"] && !row["task_name"]) {
          throw new Error(`Row ${i + 2} missing 'Task Name'`);
        }
        if (!row["Assigned To"] && !row["assigned_to"]) {
          throw new Error(`Row ${i + 2} missing 'Assigned To'`);
        }

        return {
          employee_id: row["Employee ID"] || row["employee_id"],
          task_name: row["Task Name"] || row["task_name"],
          assigned_to: row["Assigned To"] || row["assigned_to"],
          status: (row["Status"] || row["status"] || "pending").toLowerCase(),
          due_date: row["Due Date"] || row["due_date"] || null,
        };
      });

      await axios.post(`${API}/offboarding/tasks/import`, json);
      fetchData();
      alert("Excel uploaded successfully!");
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert("Upload failed: " + err.message);
    }
  };

  reader.readAsArrayBuffer(file);
};

  const exportExcel = () => {
    const data = filtered.map(t => ({
      id: t.id, employee_id: t.employee_id, task_name: t.task_name,
      assigned_to: t.assigned_to, status: t.status, due_date: t.due_date,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), "OffboardingTasks.xlsx");
  };

  return (
  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="ob-card-header">
    <span className="ob-card-title">Offboarding Tasks</span>
    <div className="ob-controls">
          <label className="ob-btn ob-btn-upload">
            ↑ Upload Excel
            <input type="file" accept=".xlsx" onChange={handleUpload} style={{ display: "none" }} />
          </label>
          <select className="ob-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <button className="ob-btn ob-btn-primary" onClick={exportExcel}>↓ Export</button>
        </div>
      </div>
      <div className="ob-card-body" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div className="ob-empty"><div className="ob-empty-icon">📭</div>No tasks found.</div>
        ) : (
          <div className="ob-table-wrap">
            <table className="ob-table">
              <thead>
                <tr>
                  {["Employee","Task","Assigned To","Status","Due Date"].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.employee_name}</td>
                    <td>{t.task_name}</td>
                    <td style={{ color: "#64748B" }}>{t.assigned_to}</td>
                    <td>
                      <span className="ob-badge" style={statusBadge(t.status)}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ color: "#64748B", fontSize: 13 }}>{t.due_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── SURVEYS TAB ─── */
function SurveyTab({ surveys, fetchData }) {
const handleUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const rawJson = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

      const json = [];
      const skipped = [];

      rawJson.forEach((row, i) => {
        // Normalize headers
        const keys = Object.keys(row).reduce((acc, k) => {
          acc[k.trim().toLowerCase()] = row[k];
          return acc;
        }, {});

        const id = keys["id"];
        const status = (keys["status"] || "").toString().trim().toLowerCase();

        if (!id || !["pending", "completed"].includes(status)) {
          skipped.push(i + 2); // +2 for header + 0-index
          return;
        }

        json.push({ id, status });
      });

      if (json.length === 0) {
        alert(`No valid rows to update. Skipped rows: ${skipped.join(", ")}`);
        return;
      }

      const res = await axios.post(`${API}/offboarding/surveys/import`, json);
      alert(`Upload successful! ${json.length} rows updated.${skipped.length ? ` Skipped rows: ${skipped.join(", ")}` : ""}`);
      
      fetchData(); // refresh table
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert("Upload failed: " + err.message);
    }
  };

  reader.readAsArrayBuffer(file);
};

  const exportExcel = () => {
    const data = surveys.map(s => ({ id: s.id, employee_id: s.employee_id, survey_link: s.survey_link, status: s.status }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Surveys");
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]), "ExitSurveys.xlsx");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="ob-card-header">
        <span className="ob-card-title">Exit Surveys</span>
        <div className="ob-controls">
          <label className="ob-btn ob-btn-upload">
            ↑ Upload Excel
            <input type="file" accept=".xlsx" onChange={handleUpload} style={{ display: "none" }} />
          </label>
          <button className="ob-btn ob-btn-primary" onClick={exportExcel}>↓ Export</button>
        </div>
      </div>
      <div className="ob-card-body" style={{ flex: 1, minHeight: 0  }}>
        {surveys.length === 0 ? (
          <div className="ob-empty"><div className="ob-empty-icon">📭</div>No surveys found.</div>
        ) : (
          <div className="ob-table-wrap">
            <table className="ob-table">
              <thead>
                <tr>
                  {["Employee","Survey Link","Status"].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {surveys.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.employee_name}</td>
                    <td>
                      <a href={s.survey_link} target="_blank" rel="noreferrer"
                        style={{ color: "#0EA5E9", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
                        View Survey ↗
                      </a>
                    </td>
                    <td>
                      <span className="ob-badge" style={statusBadge(s.status)}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
function OffboardedTab({ employees }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="ob-card-header">
        <span className="ob-card-title">Offboarded Employees</span>
      </div>
      <div className="ob-card-body" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {employees.length === 0 ? (
          <div className="ob-empty"><div className="ob-empty-icon">📭</div>No offboarded employees.</div>
        ) : (
          <div className="ob-table-wrap">
            <table className="ob-table">
              <thead>
                <tr>
                  {["Employee","Department","Status","Release Date"].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{e.first_name} {e.last_name}</td>
                    <td>{e.department}</td>
                    <td>
                      <span className="ob-badge" style={statusBadge(e.status)}>{e.status}</span>
                    </td>
                    <td>{e.release_date ? new Date(e.release_date).toLocaleDateString() : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
