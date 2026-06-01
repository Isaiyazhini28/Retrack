// UserManagerPage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";

const API = "http://localhost:5000/api/users";

/* ─── INJECT STYLES ─── */
const injectStyles = () => {
  if (document.getElementById("um-styles")) return;
  const s = document.createElement("style");
  s.id = "um-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
    .um-root *, .um-root *::before, .um-root *::after { box-sizing:border-box; margin:0; padding:0; font-family:'Syne',sans-serif; }
    .um-root { --bg:#F0F4F8; --surface:#fff; --border:#E2E8F0; --navy:#0D1B2A; --sky:#38BDF8; --green:#10B981; --amber:#F59E0B; --red:#EF4444; --purple:#7C3AED; --muted:#94A3B8; --text:#0F172A; background:var(--bg); min-height:100%; color:var(--text); display:flex; flex-direction:column; }

    /* HEADER */
    .um-page-header { padding:26px 30px 0; flex-shrink:0; }
    .um-page-title { font-size:24px; font-weight:800; color:var(--navy); display:flex; align-items:center; gap:12px; letter-spacing:-0.4px; }
    .um-page-title-icon { width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg,var(--navy),#1e3a5f); display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 4px 12px rgba(13,27,42,0.25); }
    .um-page-sub { font-size:13px; color:var(--muted); margin-top:4px; margin-left:52px; }

    /* KPI GRID */
    .um-kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; padding:22px 30px 0; }
    .um-kpi { background:var(--navy); border-radius:16px; padding:20px; position:relative; overflow:hidden; transition:transform 0.2s, box-shadow 0.2s; }
    .um-kpi::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg, rgba(56,189,248,0.08) 0%, transparent 60%); pointer-events:none; }
    .um-kpi:hover { transform:translateY(-2px); box-shadow:0 12px 32px rgba(13,27,42,0.22); }
    .um-kpi-accent { position:absolute; bottom:0; left:0; right:0; height:3px; }
    .um-kpi-val { font-size:30px; font-weight:800; color:#fff; line-height:1; margin-bottom:5px; }
    .um-kpi-label { font-size:11px; color:rgba(255,255,255,0.45); font-weight:700; text-transform:uppercase; letter-spacing:0.06em; }

    /* TABS */
    .um-tabs { display:flex; gap:4px; margin:20px 30px 0; background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:5px; width:fit-content; box-shadow:0 1px 4px rgba(0,0,0,0.05); }
    .um-tab { padding:9px 22px; border-radius:10px; border:none; background:transparent; color:var(--muted); font-family:'Syne',sans-serif; font-weight:700; font-size:13px; cursor:pointer; transition:all 0.18s; }
    .um-tab.active { background:var(--navy); color:#fff; box-shadow:0 2px 10px rgba(13,27,42,0.3); }
    .um-tab:not(.active):hover { background:var(--bg); color:var(--text); }

    /* CARD */
    .um-card { background:var(--surface); border:1px solid var(--border); border-radius:20px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.06); margin:16px 30px 30px; }
    .um-card-header { padding:18px 24px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; background:linear-gradient(to right, #FAFBFC, var(--surface)); }
    .um-card-title { font-size:15px; font-weight:800; color:var(--navy); display:flex; align-items:center; gap:8px; }
    .um-card-title::before { content:''; width:4px; height:18px; background:linear-gradient(to bottom, var(--sky), #0EA5E9); border-radius:2px; }
    .um-card-body { max-height:480px; overflow-y:auto; }
    .um-card-body::-webkit-scrollbar { width:5px; }
    .um-card-body::-webkit-scrollbar-thumb { background:var(--border); border-radius:3px; }

    /* TABLE */
    .um-table { width:100%; border-collapse:collapse; }
    .um-table thead th { position:sticky; top:0; z-index:2; background:#F8FAFC; padding:12px 16px; text-align:left; font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.07em; border-bottom:1px solid var(--border); white-space:nowrap; }
    .um-table tbody tr { border-bottom:1px solid #F1F5F9; transition:background 0.12s; cursor:pointer; }
    .um-table tbody tr:hover { background:#F8FAFC; }
    .um-table tbody td { padding:13px 16px; font-size:13px; color:var(--text); vertical-align:middle; }

    /* CONTROLS */
    .um-controls { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .um-input { padding:9px 14px; border-radius:10px; border:1.5px solid var(--border); background:var(--surface); font-size:13px; font-weight:600; font-family:'Syne',sans-serif; color:var(--text); cursor:pointer; outline:none; transition:border 0.2s; }
    .um-input:focus { border-color:var(--sky); }
    .um-btn { display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:10px; border:none; font-size:13px; font-family:'Syne',sans-serif; font-weight:700; cursor:pointer; transition:all 0.16s; }
    .um-btn-primary { background:linear-gradient(135deg, var(--navy), #1e3a5f); color:#fff; }
    .um-btn-primary:hover { box-shadow:0 6px 20px rgba(13,27,42,0.3); transform:translateY(-1px); }
    .um-btn-sky { background:linear-gradient(135deg, #0EA5E9, var(--sky)); color:#fff; }
    .um-btn-green { background:linear-gradient(135deg, #059669, var(--green)); color:#fff; }
    .um-btn-red { background:#FFF5F5; border:1px solid #FECACA; color:var(--red); }

    /* BADGE */
    .um-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 11px; border-radius:20px; font-size:11.5px; font-weight:700; }
    .um-badge::before { content:''; width:6px; height:6px; border-radius:50%; background:currentColor; opacity:0.8; }

    /* SKILL TAG */
    .um-skill-tag { display:inline-flex; align-items:center; gap:6px; padding:4px 10px 4px 12px; border-radius:20px; margin:3px; font-size:12px; font-weight:700; }
    .um-skill-remove { width:16px; height:16px; border-radius:50%; cursor:pointer; font-size:10px; display:flex; align-items:center; justify-content:center; font-weight:800; line-height:1; transition:background 0.15s; border:none; }

    /* DRAWER */
    .um-drawer-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:500; display:flex; justify-content:flex-end; backdrop-filter:blur(3px); }
    .um-drawer { width:480px; max-width:95vw; height:100vh; background:var(--surface); overflow-y:auto; box-shadow:-8px 0 32px rgba(0,0,0,0.15); display:flex; flex-direction:column; }
    .um-drawer::-webkit-scrollbar { width:4px; }
    .um-drawer::-webkit-scrollbar-thumb { background:var(--border); border-radius:3px; }
    .um-drawer-header { background:var(--navy); padding:24px 24px 20px; flex-shrink:0; position:sticky; top:0; z-index:10; }
    .um-drawer-body { padding:24px; flex:1; }
    .um-drawer-section { margin-bottom:24px; }
    .um-drawer-section-title { font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:12px; display:flex; align-items:center; gap:8px; }
    .um-drawer-section-title::after { content:''; flex:1; height:1px; background:var(--border); }

    /* CHART */
    .um-chart-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; padding:22px 24px; }
    .um-chart-box { background:#F8FAFC; border:1px solid var(--border); border-radius:14px; padding:20px; }
    .um-chart-box h3 { font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
    .um-chart-box h3::after { content:''; flex:1; height:1px; background:var(--border); }

    /* EMPTY */
    .um-empty { padding:60px 20px; text-align:center; color:var(--muted); font-size:13px; }
    .um-empty-icon { font-size:40px; margin-bottom:14px; opacity:0.5; }

    /* INFO GRID */
    .um-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .um-info-item { background:#F8FAFC; border:1px solid var(--border); border-radius:10px; padding:12px 14px; }
    .um-info-label { font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:3px; }
    .um-info-val { font-size:13px; font-weight:700; color:var(--navy); }

    @media (max-width:1000px) { .um-kpi-grid { grid-template-columns:repeat(2,1fr); } .um-chart-grid { grid-template-columns:1fr; } }
  `;
  document.head.appendChild(s);
};

/* ─── HELPERS ─── */
const statusBadge = (status) => ({
  Active: { background: "#D1FAE5", color: "#065F46" },
  offboarded: { background: "#F3F4F6", color: "#6B7280" },
  offboarding: { background: "#FEF3C7", color: "#D97706" },
}[status] || { background: "#F1F5F9", color: "#64748B" });

const levelColor = { Beginner:"#38BDF8", Intermediate:"#7C3AED", Advanced:"#F59E0B", Expert:"#EF4444" };
const PIE_COLORS = ["#38BDF8","#10B981","#F59E0B","#EF4444","#7C3AED","#EC4899","#14B8A6","#F97316"];

const customTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0D1B2A",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 14px" }}>
      <p style={{ color:"#94A3B8",fontSize:11,marginBottom:6 }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color:p.fill||p.stroke,fontSize:12,fontWeight:700 }}>{p.name||p.dataKey}: {p.value}</p>)}
    </div>
  );
};

/* ══════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════ */
export default function UserManagerPage() {
  injectStyles();

  const [tab, setTab] = useState("OVERVIEW");
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ summary:{}, byDept:[], byContract:[] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selected, setSelected] = useState(null); // for drawer
  const [drawerData, setDrawerData] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Skill add form
  const [newSkill, setNewSkill] = useState("");
  const [newLevel, setNewLevel] = useState("Intermediate");
  const [addingSkill, setAddingSkill] = useState(false);

  // Edit form
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [empRes, statsRes] = await Promise.all([
        axios.get(`${API}/employees`),
        axios.get(`${API}/employees-stats`),
      ]);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      setStats(statsRes.data || { summary:{}, byDept:[], byContract:[] });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const openDrawer = async (emp) => {
    setSelected(emp);
    setDrawerLoading(true);
    setEditMode(false);
    try {
      const res = await axios.get(`${API}/employees/${emp.id}`);
      setDrawerData(res.data);
      setEditForm({ salary: res.data.salary, status: res.data.status, department: res.data.department, contract_type: res.data.contract_type });
    } catch (e) { console.error(e); }
    finally { setDrawerLoading(false); }
  };

  const closeDrawer = () => { setSelected(null); setDrawerData(null); setEditMode(false); };

  const addSkill = async () => {
    if (!newSkill.trim() || !drawerData) return;
    try {
      const res = await axios.post(`${API}/employees/${drawerData.id}/skills`, { skill_name: newSkill.trim(), level: newLevel });
      setDrawerData(p => ({ ...p, skills: [res.data, ...(p.skills||[])] }));
      setNewSkill(""); setAddingSkill(false);
    } catch (e) { alert("Failed to add skill"); }
  };

  const removeSkill = async (skillId) => {
    try {
      await axios.delete(`${API}/employees/${drawerData.id}/skills/${skillId}`);
      setDrawerData(p => ({ ...p, skills: p.skills.filter(s => s.id !== skillId) }));
    } catch (e) { alert("Failed to remove skill"); }
  };

  const saveEdit = async () => {
    try {
      await axios.put(`${API}/employees/${drawerData.id}`, editForm);
      setDrawerData(p => ({ ...p, ...editForm }));
      setEditMode(false);
      fetchAll();
    } catch (e) { alert("Update failed"); }
  };

  const exportExcel = () => {
    const data = filtered.map(e => ({
      Code: e.employee_code,
      Name: `${e.first_name} ${e.last_name}`,
      Email: e.email,
      Department: e.department,
      Status: e.status,
      Contract: e.contract_type,
      Salary: e.salary,
      "Join Date": e.date_of_joining,
      Skills: e.skill_count,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    const buf = XLSX.write(wb, { bookType:"xlsx", type:"array" });
    saveAs(new Blob([buf], { type:"application/octet-stream" }), "employees.xlsx");
  };

  // FILTERED
  const filtered = employees.filter(e => {
    if (search && !`${e.first_name} ${e.last_name} ${e.email}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterDept !== "All" && e.department !== filterDept) return false;
    if (filterStatus !== "All" && e.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="um-root">
      <div className="um-page-header">
        <div className="um-page-title"><span className="um-page-title-icon">👤</span> Employee Manager</div>
        <div className="um-page-sub">Manage employee data, view stats, and update profiles.</div>
      </div>

      {/* KPI */}
      <div className="um-kpi-grid">
        <div className="um-kpi"><div className="um-kpi-val">{stats.summary.total || 0}</div><div className="um-kpi-label">Total Employees</div></div>
        <div className="um-kpi"><div className="um-kpi-val">{stats.summary.active || 0}</div><div className="um-kpi-label">Active</div></div>
        <div className="um-kpi"><div className="um-kpi-val">{stats.summary.offboarding || 0}</div><div className="um-kpi-label">Offboarding</div></div>
        <div className="um-kpi"><div className="um-kpi-val">{stats.summary.offboarded || 0}</div><div className="um-kpi-label">Offboarded</div></div>
      </div>

      {/* Tabs */}
      <div className="um-tabs">
        {["OVERVIEW","EMPLOYEES"].map(t => (
          <button key={t} className={`um-tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "OVERVIEW" && (
        <div className="um-chart-grid">
          <div className="um-chart-box">
            <h3>By Department</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.byDept}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" />
                <YAxis />
                <Tooltip content={customTooltip} />
                <Bar dataKey="count" fill="#38BDF8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="um-chart-box">
            <h3>By Contract Type</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={stats.byContract} dataKey="count" nameKey="contract_type" cx="50%" cy="50%" outerRadius={60} label>
                  {stats.byContract.map((entry, index) => <Cell key={index} fill={PIE_COLORS[index%PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={customTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === "EMPLOYEES" && (
        <div className="um-card">
          <div className="um-card-header">
            <div className="um-controls">
              <input type="text" className="um-input" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} />
              <select className="um-input" value={filterDept} onChange={e=>setFilterDept(e.target.value)}>
                <option>All</option>{[...new Set(employees.map(e=>e.department))].map(d=> <option key={d}>{d}</option>)}
              </select>
              <select className="um-input" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                <option>All</option>
                <option>Active</option><option>offboarding</option><option>offboarded</option>
              </select>
              <button className="um-btn um-btn-sky" onClick={exportExcel}>Export</button>
            </div>
          </div>

          <div className="um-card-body">
            {loading ? <div className="um-empty">Loading...</div> :
            filtered.length === 0 ? <div className="um-empty">No employees found</div> :
            <table className="um-table">
              <thead>
                <tr>
                  <th>ID</th><th>Name</th><th>Email</th><th>Dept</th><th>Status</th><th>Contract</th><th>Salary</th><th>Skills</th><th>Availability</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
  {filtered.map(emp => (
    <tr key={emp.id} onClick={() => openDrawer(emp)}>
      <td>{emp.employee_code}</td>
      <td>{emp.first_name} {emp.last_name}</td>
      <td>{emp.email}</td>
      <td>{emp.department}</td>
      <td>
        <span
          className="um-badge"
          style={{
            background: statusBadge(emp.status).background,
            color: statusBadge(emp.status).color
          }}
        >
          {emp.status}
        </span>
      </td>
      <td>{emp.contract_type}</td>
      <td>{emp.salary}</td>
      <td>{emp.skill_count}</td>
      <td>
        <td>
  <span
    className="um-badge"
    style={{
      background: emp.status === "offboarded" || emp.availability_today === "On Leave" ? "#FEE2E2" : "#D1FAE5",
      color: emp.status === "offboarded" || emp.availability_today === "On Leave" ? "#B91C1C" : "#065F46"
    }}
  >
    {emp.status === "offboarded" ? "Not Available" : (emp.availability_today || "Available")}
  </span>
</td>
      </td>
      <td>
        <button
          className="um-btn um-btn-sky"
          style={{ fontSize:11, padding:"4px 10px" }}
          onClick={e2 => { e2.stopPropagation(); openDrawer(emp); }}
        >
          View
        </button>
      </td>
    </tr>
  ))}
</tbody>
            </table>}
          </div>
        </div>
      )}

      {/* DRAWER */}
      {selected && (
        <div className="um-drawer-overlay" onClick={closeDrawer}>
          <div className="um-drawer" onClick={e=>e.stopPropagation()}>
            <div className="um-drawer-header">
              <h2 style={{color:"#fff"}}>{drawerData?.first_name} {drawerData?.last_name}</h2>
              <button className="um-btn um-btn-red" onClick={closeDrawer}>X</button>
            </div>
            <div className="um-drawer-body">
              {drawerLoading ? <div className="um-empty">Loading...</div> :
              drawerData && <>
                <div className="um-drawer-section">
                  <div className="um-drawer-section-title">Basic Info</div>
                  <div className="um-info-grid">
                    <div className="um-info-item"><div className="um-info-label">Email</div><div className="um-info-val">{drawerData.email}</div></div>
                    <div className="um-info-item"><div className="um-info-label">Department</div><div className="um-info-val">{drawerData.department}</div></div>
                    <div className="um-info-item"><div className="um-info-label">Salary</div><div className="um-info-val">{drawerData.salary}</div></div>
                    <div className="um-info-item"><div className="um-info-label">Status</div><div className="um-info-val">{drawerData.status}</div></div>
                  </div>
                </div>

                <div className="um-drawer-section">
                  <div className="um-drawer-section-title">Skills</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                    {drawerData.skills?.map(s => (
                      <div key={s.id} className="um-skill-tag" style={{background:levelColor[s.level]||"#E5E7EB",color:"#fff"}}>
                        {s.skill_name} ({s.level})
                        <button className="um-skill-remove" onClick={()=>removeSkill(s.id)}>×</button>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:8, display:"flex",gap:6}}>
                    <input placeholder="New skill" value={newSkill} onChange={e=>setNewSkill(e.target.value)} className="um-input" />
                    <select value={newLevel} onChange={e=>setNewLevel(e.target.value)} className="um-input">
                      {Object.keys(levelColor).map(l => <option key={l}>{l}</option>)}
                    </select>
                    <button className="um-btn um-btn-green" onClick={addSkill}>Add</button>
                  </div>
                </div>
              </>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}