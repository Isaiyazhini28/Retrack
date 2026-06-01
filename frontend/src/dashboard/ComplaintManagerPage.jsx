// ComplaintManagerPage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";

const API = "http://localhost:5000/api/complaints";

/* ─── INJECT STYLES ─── */
const injectStyles = () => {
  if (document.getElementById("cm-styles")) return;
  const s = document.createElement("style");
  s.id = "cm-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
.cm-root {
  --bg: #F0F4F8; --surface: #fff; --border: #E2E8F0;
  --navy: #0D1B2A; --sky: #38BDF8; --green: #10B981;
  --amber: #F59E0B; --red: #EF4444; --purple: #7C3AED;
  --muted: #94A3B8; --text: #0F172A;
  background: var(--bg); 
  height: calc(100vh - 64px); /* Subtract your top navbar height if any */
  color: var(--text);
  display: flex; 
  flex-direction: column;
  overflow: hidden; 
}
    .cm-page-header { padding: 26px 30px 0; flex-shrink: 0; }
    .cm-page-title { font-size: 24px; font-weight: 800; color: var(--navy); letter-spacing: -0.4px; display: flex; align-items: center; gap: 12px; }
    .cm-page-title-icon { width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg,#7C3AED,#5B21B6); display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 4px 12px rgba(124,58,237,0.3); }
    .cm-page-sub { font-size: 13px; color: var(--muted); margin-top: 4px; margin-left: 52px; }

    .cm-kpi-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 14px; padding: 22px 30px 0; }
    .cm-kpi { background: var(--navy); border-radius: 16px; padding: 20px; position: relative; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
    .cm-kpi::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(56,189,248,0.07) 0%,transparent 60%); pointer-events:none; }
    .cm-kpi:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(13,27,42,0.22); }
    .cm-kpi-accent { position:absolute; bottom:0; left:0; right:0; height:3px; }
    .cm-kpi-val { font-size: 28px; font-weight: 800; color:#fff; line-height:1; margin-bottom: 5px; }
    .cm-kpi-label { font-size: 10px; color: rgba(255,255,255,0.45); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }

    .cm-tabs { display:flex; gap:4px; margin:20px 30px 0; background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:5px; width:fit-content; box-shadow:0 1px 4px rgba(0,0,0,0.05); }
    .cm-tab { padding:9px 22px; border-radius:10px; border:none; background:transparent; color:var(--muted); font-family:'Syne',sans-serif; font-weight:700; font-size:13px; cursor:pointer; transition:all 0.18s; }
    .cm-tab.active { background:var(--navy); color:#fff; box-shadow:0 2px 10px rgba(13,27,42,0.3); }
    .cm-tab:not(.active):hover { background:var(--bg); color:var(--text); }

.cm-card {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0; /* REQUIRED for flex children to scroll */
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  margin: 20px 30px; 
  overflow: hidden; /* Clips the child cm-card-body */
}
    .cm-card-header { padding:18px 24px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; background:linear-gradient(to right,#FAFBFC,var(--surface)); }
    .cm-card-title { font-size:15px; font-weight:800; color:var(--navy); display:flex; align-items:center; gap:8px; }
    .cm-card-title::before { content:''; width:4px; height:18px; background:linear-gradient(to bottom,#7C3AED,#5B21B6); border-radius:2px; }
  .cm-card-body {
  flex: 1;
  overflow-y: auto; 
  min-height: 0;
  padding-bottom: 30px; /* Space at bottom of scroll */
}
    .cm-card-body::-webkit-scrollbar { width: 5px; }
    .cm-card-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    .cm-table { width:100%; border-collapse:collapse; }
    .cm-table thead th { position:sticky; top:0; z-index:2; background:#F8FAFC; padding:12px 16px; text-align:left; font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.07em; border-bottom:1px solid var(--border); white-space:nowrap; }
    .cm-table tbody tr { border-bottom:1px solid #F1F5F9; transition:background 0.12s; cursor:pointer; }
    .cm-table tbody tr:hover { background:#F8FAFC; }
    .cm-table tbody td { padding:13px 16px; font-size:13px; color:var(--text); vertical-align:middle; }

    .cm-controls { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .cm-input { padding:9px 14px; border-radius:10px; border:1.5px solid var(--border); background:var(--surface); font-size:13px; font-weight:600; font-family:'Syne',sans-serif; color:var(--text); cursor:pointer; outline:none; transition:border 0.2s; }
    .cm-input:focus { border-color:#7C3AED; }
    .cm-textarea { width:100%; padding:10px 14px; border-radius:10px; border:1.5px solid var(--border); background:var(--surface); font-size:13px; font-family:'Syne',sans-serif; color:var(--text); outline:none; resize:vertical; min-height:90px; transition:border 0.2s; }
    .cm-textarea:focus { border-color:#7C3AED; }
    .cm-btn { display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:10px; border:none; font-size:13px; font-family:'Syne',sans-serif; font-weight:700; cursor:pointer; transition:all 0.16s; }
    .cm-btn-primary { background:linear-gradient(135deg,var(--navy),#1e3a5f); color:#fff; }
    .cm-btn-primary:hover { box-shadow:0 6px 20px rgba(13,27,42,0.3); transform:translateY(-1px); }
    .cm-btn-purple { background:linear-gradient(135deg,#7C3AED,#5B21B6); color:#fff; }
    .cm-btn-purple:hover { box-shadow:0 6px 20px rgba(124,58,237,0.35); transform:translateY(-1px); }
    .cm-btn-green { background:linear-gradient(135deg,#059669,#10B981); color:#fff; }
    .cm-btn-cancel { background:transparent; color:var(--muted); border:1.5px solid var(--border); }
    .cm-btn-cancel:hover { border-color:#CBD5E1; color:#64748B; }

    .cm-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 11px; border-radius:20px; font-size:11.5px; font-weight:700; }
    .cm-badge::before { content:''; width:6px; height:6px; border-radius:50%; background:currentColor; opacity:0.8; }

    .cm-priority-dot { width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:6px; }

    .cm-drawer-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:500; display:flex; justify-content:flex-end; backdrop-filter:blur(3px); }
    .cm-drawer { width:500px; max-width:95vw; height:100vh; background:var(--surface); overflow-y:auto; box-shadow:-8px 0 32px rgba(0,0,0,0.15); display:flex; flex-direction:column; }
    .cm-drawer::-webkit-scrollbar { width:4px; }
    .cm-drawer::-webkit-scrollbar-thumb { background:var(--border); border-radius:3px; }
    .cm-drawer-header { background:var(--navy); padding:24px 24px 20px; flex-shrink:0; position:sticky; top:0; z-index:10; }
    .cm-drawer-body { padding:24px; flex:1; }
    .cm-drawer-section { margin-bottom:22px; }
    .cm-drawer-section-title { font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:12px; display:flex; align-items:center; gap:8px; }
    .cm-drawer-section-title::after { content:''; flex:1; height:1px; background:var(--border); }

    .cm-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .cm-info-item { background:#F8FAFC; border:1px solid var(--border); border-radius:10px; padding:12px 14px; }
    .cm-info-label { font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:3px; }
    .cm-info-val { font-size:13px; font-weight:700; color:var(--navy); }

    .cm-chart-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; padding:22px 24px; }
    .cm-chart-box { background:#F8FAFC; border:1px solid var(--border); border-radius:14px; padding:20px; }
    .cm-chart-box h3 { font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
    .cm-chart-box h3::after { content:''; flex:1; height:1px; background:var(--border); }

    .cm-empty { padding:60px 20px; text-align:center; color:var(--muted); font-size:13px; }
    .cm-empty-icon { font-size:40px; margin-bottom:14px; opacity:0.5; }

    .cm-form-group { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    .cm-form-label { font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em; }

    @media (max-width:1100px) { .cm-kpi-grid { grid-template-columns:repeat(3,1fr); } .cm-chart-grid { grid-template-columns:1fr; } }
  `;
  document.head.appendChild(s);
};

/* ─── HELPERS ─── */
const statusStyle = (s) => ({
  Open:          { background:"#EFF6FF", color:"#2563EB" },
  "Under Review":{ background:"#FEF3C7", color:"#D97706" },
  Resolved:      { background:"#D1FAE5", color:"#065F46" },
  Closed:        { background:"#F3F4F6", color:"#6B7280" },
  Rejected:      { background:"#FEE2E2", color:"#B91C1C" },
}[s] || { background:"#F1F5F9", color:"#64748B" });

const priorityStyle = (p) => ({
  Low:      { color:"#10B981", dot:"#10B981" },
  Medium:   { color:"#F59E0B", dot:"#F59E0B" },
  High:     { color:"#F97316", dot:"#F97316" },
  Critical: { color:"#EF4444", dot:"#EF4444" },
}[p] || { color:"#94A3B8", dot:"#94A3B8" });

const PIE_COLORS = ["#38BDF8","#7C3AED","#EF4444","#F59E0B","#10B981","#EC4899","#14B8A6"];

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
export default function ComplaintManagerPage() {
  injectStyles();

  const [tab, setTab]               = useState("DASHBOARD");
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats]           = useState({ summary:{}, byCategory:[], byPriority:[] });
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [selected, setSelected]     = useState(null);
  const [showFileForm, setShowFileForm] = useState(false);

  // Update form
  const [updateForm, setUpdateForm] = useState({ status:"", assigned_to:"", resolution_note:"" });

  // New complaint form
  const [newForm, setNewForm] = useState({
    employee_id:"", subject:"", description:"",
    category:"Other", priority:"Medium",
  });

  const fetchAll = async () => {
  try {
    setLoading(true);
    const [cr, sr] = await Promise.all([
      axios.get(`${API}`),          // fetch all complaints
      axios.get(`${API}/stats`),   // fetch complaints stats
    ]);
    setComplaints(Array.isArray(cr.data) ? cr.data : []);
    setStats(sr.data || { summary:{}, byCategory:[], byPriority:[] });
  } catch (e) { 
    console.error("Fetch failed:", e);
  } finally { 
    setLoading(false); 
  }
};

  useEffect(() => { fetchAll(); }, []);

  const openDetail = (c) => {
    setSelected(c);
    setUpdateForm({ status: c.status, assigned_to: c.assigned_to||"", resolution_note: c.resolution_note||"" });
  };
  const closeDetail = () => setSelected(null);

  const saveUpdate = async () => {
    try {
      await axios.put(`${API}/${selected.id}`, updateForm);
 
      fetchAll();
      closeDetail();
    } catch (e) { alert("Update failed"); }
  };

  const fileComplaint = async () => {
    if (!newForm.employee_id || !newForm.subject || !newForm.description) return alert("Fill all required fields");
    try {
       await axios.post(`${API}`, newForm);
      setNewForm({ employee_id:"", subject:"", description:"", category:"Other", priority:"Medium" });
      setShowFileForm(false);
      fetchAll();
    } catch (e) { alert(e.response?.data?.message || "Failed to file complaint"); }
  };

  const exportExcel = () => {
    const data = filtered.map(c => ({
      ID: c.id, Employee: c.employee_name, Code: c.employee_code,
      Department: c.department, Subject: c.subject, Category: c.category,
      Priority: c.priority, Status: c.status, "Assigned To": c.assigned_to||"—",
      "Filed At": new Date(c.filed_at).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Complaints");
    saveAs(new Blob([XLSX.write(wb,{bookType:"xlsx",type:"array"})]), "Complaints.xlsx");
  };

  const filtered = complaints
    .filter(c => filterStatus   === "All" || c.status   === filterStatus)
    .filter(c => filterPriority === "All" || c.priority === filterPriority)
    .filter(c => {
      const q = search.toLowerCase();
      return !q || `${c.employee_name} ${c.subject} ${c.category} ${c.department}`.toLowerCase().includes(q);
    });

  const sm = stats.summary || {};

  const kpis = [
    { label:"Total",        value: sm.total        || 0, accent:"#38BDF8" },
    { label:"Open",         value: sm.open_count   || 0, accent:"#2563EB" },
    { label:"Under Review", value: sm.under_review || 0, accent:"#F59E0B" },
    { label:"Resolved",     value: sm.resolved     || 0, accent:"#10B981" },
    { label:"Critical",     value: sm.critical     || 0, accent:"#EF4444" },
  ];

  return (
    <div className="cm-root" >
      {/* ── PAGE HEADER ── */}
      <div className="cm-page-header">
        <div className="cm-page-title">
          <div className="cm-page-title-icon">📣</div>
          Complaint Manager
        </div>
        <div className="cm-page-sub">Track, manage, and resolve employee complaints</div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="cm-kpi-grid">
        {kpis.map(k => (
          <div key={k.label} className="cm-kpi">
            <div className="cm-kpi-accent" style={{ background:`linear-gradient(to right,${k.accent},transparent)` }} />
            <div className="cm-kpi-val">{k.value}</div>
            <div className="cm-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      
      <div className="cm-tabs">
        {[
          { id:"DASHBOARD", label:"📊 Dashboard"  },
          { id:"COMPLAINTS",label:"📋 Complaints" },
          { id:"FILE",      label:"✏️ File New"   },
        ].map(t => (
          <button key={t.id} className={`cm-tab${tab===t.id?" active":""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ 
  flex: 1, 
  display: "flex", 
  flexDirection: "column", 
  minHeight: 0,   // Allows this container to be smaller than its content
  overflow: "hidden" 
}}>
        {tab === "DASHBOARD"  && <DashboardTab stats={stats} complaints={complaints} />}
        {tab === "COMPLAINTS" && (
          <ComplaintsTab
            complaints={filtered} loading={loading}
            search={search} setSearch={setSearch}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterPriority={filterPriority} setFilterPriority={setFilterPriority}
            openDetail={openDetail} exportExcel={exportExcel}
          />
        )}
        {tab === "FILE" && (
          <FileTab
            newForm={newForm} setNewForm={setNewForm}
            fileComplaint={fileComplaint}
          />
        )}
      </div>

      {/* ── DETAIL DRAWER ── */}
      {selected && (
        <div className="cm-drawer-overlay" onClick={closeDetail}>
          <div className="cm-drawer" onClick={e => e.stopPropagation()}>
            <div className="cm-drawer-header">
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:16,fontWeight:800,color:"#fff",marginBottom:4,maxWidth:380 }}>
                    {selected.subject}
                  </div>
                  <div style={{ fontSize:12,color:"rgba(255,255,255,0.5)" }}>
                    #{selected.id} · {selected.employee_name} · {selected.department}
                  </div>
                </div>
                <button onClick={closeDetail}
                  style={{ width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:16,fontWeight:700,fontFamily:"'Syne',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  ✕
                </button>
              </div>
              <div style={{ marginTop:12,display:"flex",gap:8,flexWrap:"wrap" }}>
                <span className="cm-badge" style={statusStyle(selected.status)}>{selected.status}</span>
                <span style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"4px 11px",borderRadius:20,fontSize:11.5,fontWeight:700,background:`${priorityStyle(selected.priority).dot}18`,color:priorityStyle(selected.priority).color }}>
                  <span className="cm-priority-dot" style={{ background:priorityStyle(selected.priority).dot }} />
                  {selected.priority}
                </span>
                <span style={{ background:"rgba(124,58,237,0.2)",color:"#C4B5FD",borderRadius:20,padding:"4px 11px",fontSize:11.5,fontWeight:700 }}>
                  {selected.category}
                </span>
              </div>
            </div>

            <div className="cm-drawer-body">
              {/* Details */}
              <div className="cm-drawer-section">
                <div className="cm-drawer-section-title">Complaint Details</div>
                <div className="cm-info-grid">
                  {[
                    ["Employee",   selected.employee_name],
                    ["Code",       selected.employee_code],
                    ["Department", selected.department],
                    ["Filed At",   new Date(selected.filed_at).toLocaleDateString()],
                    ["Assigned To",selected.assigned_to||"Unassigned"],
                    ["Category",   selected.category],
                  ].map(([l,v]) => (
                    <div key={l} className="cm-info-item">
                      <div className="cm-info-label">{l}</div>
                      <div className="cm-info-val">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="cm-drawer-section">
                <div className="cm-drawer-section-title">Description</div>
                <div style={{ background:"#F8FAFC",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px",fontSize:13,color:"#0F172A",lineHeight:1.6 }}>
                  {selected.description}
                </div>
              </div>

              {/* Resolution note */}
              {selected.resolution_note && (
                <div className="cm-drawer-section">
                  <div className="cm-drawer-section-title">Resolution Note</div>
                  <div style={{ background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:10,padding:"14px 16px",fontSize:13,color:"#065F46",lineHeight:1.6 }}>
                    {selected.resolution_note}
                  </div>
                </div>
              )}

              {/* Update Section */}
              <div className="cm-drawer-section">
                <div className="cm-drawer-section-title">Update Complaint</div>
                <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                  <div>
                    <div className="cm-form-label" style={{ marginBottom:4 }}>Status</div>
                    <select className="cm-input" style={{ width:"100%" }} value={updateForm.status} onChange={e => setUpdateForm(p=>({...p,status:e.target.value}))}>
                      {["Open","Under Review","Resolved","Closed","Rejected"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="cm-form-label" style={{ marginBottom:4 }}>Assign To</div>
                    <input className="cm-input" style={{ width:"100%" }} placeholder="Assignee name or team"
                      value={updateForm.assigned_to} onChange={e => setUpdateForm(p=>({...p,assigned_to:e.target.value}))} />
                  </div>
                  <div>
                    <div className="cm-form-label" style={{ marginBottom:4 }}>Resolution Note</div>
                    <textarea className="cm-textarea" placeholder="Describe resolution or action taken…"
                      value={updateForm.resolution_note} onChange={e => setUpdateForm(p=>({...p,resolution_note:e.target.value}))} />
                  </div>
                  <button className="cm-btn cm-btn-primary" style={{ width:"100%" }} onClick={saveUpdate}>
                    Save Update →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── DASHBOARD TAB ─── */
function DashboardTab({ stats, complaints }) {
  const recent = complaints.filter(c => c.status === "Open" || c.status === "Under Review").slice(0,5);
  return (
    <div className="cm-card">
      <div className="cm-card-header">
        <span className="cm-card-title">Complaint Overview</span>
      </div>
      <div className="cm-card-body">
      <div className="cm-chart-grid">
        <div className="cm-chart-box">
          <h3>By Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.byCategory||[]} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="category" tick={{ fontSize:10,fill:"#94A3B8" }} />
              <YAxis tick={{ fontSize:11,fill:"#94A3B8" }} />
              <Tooltip content={customTooltip} />
              <Bar dataKey="total" fill="#7C3AED" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="cm-chart-box">
          <h3>By Priority</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.byPriority||[]} dataKey="total" nameKey="priority"
                outerRadius={85} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {(stats.byPriority||[]).map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip content={customTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active complaints */}
      <div style={{ padding:"0 24px 24px" }}>
        <div style={{ fontSize:11,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12 }}>ACTIVE COMPLAINTS</div>
        {recent.length === 0 ? (
          <div style={{ color:"#94A3B8",fontSize:13 }}>No active complaints.</div>
        ) : recent.map(c => (
          <div key={c.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #F1F5F9" }}>
            <div style={{ width:8,height:8,borderRadius:"50%",background:priorityStyle(c.priority).dot,flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13,fontWeight:700,color:"#0D1B2A",marginBottom:2 }}>{c.subject}</div>
              <div style={{ fontSize:11,color:"#94A3B8" }}>{c.employee_name} · {c.department}</div>
            </div>
            <span className="cm-badge" style={statusStyle(c.status)}>{c.status}</span>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

/* ─── COMPLAINTS TAB ─── */
function ComplaintsTab({ complaints, loading, search, setSearch, filterStatus, setFilterStatus, filterPriority, setFilterPriority, openDetail, exportExcel }) {
  return (
    <div className="cm-card">
      <div className="cm-card-header">
        <span className="cm-card-title">All Complaints</span>
        
        <div className="cm-controls">
          <input className="cm-input" placeholder="🔍 Search subject, name…" value={search} onChange={e => setSearch(e.target.value)} style={{ width:200 }} />
          <select className="cm-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            {["Open","Under Review","Resolved","Closed","Rejected"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="cm-input" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="All">All Priority</option>
            {["Low","Medium","High","Critical"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className="cm-btn cm-btn-primary" onClick={exportExcel}>↓ Export</button>
        </div>
      </div>
      <div className="cm-card-body">
        {loading ? (
          <div className="cm-empty"><div className="cm-empty-icon">⏳</div>Loading complaints…</div>
        ) : complaints.length === 0 ? (
          <div className="cm-empty"><div className="cm-empty-icon">📭</div>No complaints found.</div>
        ) : (
          <table className="cm-table">
            <thead>
              <tr>{["ID","Employee","Department","Subject","Category","Priority","Status","Filed At","Action"].map(h=><th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {complaints.map(c => (
                <tr key={c.id} onClick={() => openDetail(c)}>
                  <td><span style={{ fontFamily:"'DM Mono',monospace",fontSize:12,color:"#94A3B8" }}>#{c.id}</span></td>
                  <td style={{ fontWeight:700,color:"#0D1B2A" }}>{c.employee_name}</td>
                  <td>
                    <span style={{ padding:"3px 10px",borderRadius:6,background:"#EFF6FF",color:"#2563EB",fontSize:12,fontWeight:600 }}>
                      {c.department}
                    </span>
                  </td>
                  <td style={{ maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.subject}</td>
                  <td style={{ color:"#64748B",fontSize:12 }}>{c.category}</td>
                  <td>
                    <span style={{ display:"inline-flex",alignItems:"center",fontSize:11.5,fontWeight:700,color:priorityStyle(c.priority).color }}>
                      <span className="cm-priority-dot" style={{ background:priorityStyle(c.priority).dot }} />
                      {c.priority}
                    </span>
                  </td>
                  <td><span className="cm-badge" style={statusStyle(c.status)}>{c.status}</span></td>
                  <td style={{ color:"#64748B",fontSize:12,whiteSpace:"nowrap" }}>{new Date(c.filed_at).toLocaleDateString()}</td>
                  <td>
                    <button onClick={e=>{e.stopPropagation();openDetail(c);}}
                      style={{ padding:"5px 12px",borderRadius:7,background:"#F5F3FF",border:"1px solid #DDD6FE",color:"#7C3AED",fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,cursor:"pointer" }}>
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─── FILE TAB ─── */
function FileTab({ newForm, setNewForm, fileComplaint }) {
  return (
    <div className="cm-card">
      <div className="cm-card-header">
        <span className="cm-card-title">File a Complaint</span>
      </div>
      <div className="cm-card-body" style={{ padding: 24 }}>
      <div style={{ padding:24, maxWidth:640 }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14 }}>
          <div className="cm-form-group">
            <div className="cm-form-label">Employee ID *</div>
            <input className="cm-input" type="number" placeholder="e.g. 5" value={newForm.employee_id}
              onChange={e => setNewForm(p=>({...p,employee_id:e.target.value}))} style={{ width:"100%" }} />
          </div>
          <div className="cm-form-group">
            <div className="cm-form-label">Category</div>
            <select className="cm-input" style={{ width:"100%" }} value={newForm.category}
              onChange={e => setNewForm(p=>({...p,category:e.target.value}))}>
              {["Harassment","Workplace Safety","Pay Dispute","Policy Violation","Manager Conduct","IT/Infrastructure","Other"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="cm-form-group">
            <div className="cm-form-label">Priority</div>
            <select className="cm-input" style={{ width:"100%" }} value={newForm.priority}
              onChange={e => setNewForm(p=>({...p,priority:e.target.value}))}>
              {["Low","Medium","High","Critical"].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="cm-form-group">
          <div className="cm-form-label">Subject *</div>
          <input className="cm-input" placeholder="Brief subject of the complaint" value={newForm.subject}
            onChange={e => setNewForm(p=>({...p,subject:e.target.value}))} style={{ width:"100%" }} />
        </div>

        <div className="cm-form-group" style={{ marginBottom:20 }}>
          <div className="cm-form-label">Description *</div>
          <textarea className="cm-textarea" placeholder="Describe the complaint in detail…" value={newForm.description}
            onChange={e => setNewForm(p=>({...p,description:e.target.value}))} style={{ minHeight:130 }} />
        </div>

        <button className="cm-btn cm-btn-purple" style={{ padding:"12px 28px" }} onClick={fileComplaint}>
          📣 Submit Complaint
        </button>
      </div>
      </div>
    </div>
  );
}

// const priorityStyle = (p) => ({
//   Low:      { color:"#10B981", dot:"#10B981" },
//   Medium:   { color:"#F59E0B", dot:"#F59E0B" },
//   High:     { color:"#F97316", dot:"#F97316" },
//   Critical: { color:"#EF4444", dot:"#EF4444" },
// }[p] || { color:"#94A3B8", dot:"#94A3B8" });