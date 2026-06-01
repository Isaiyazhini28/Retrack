import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  ResponsiveContainer, BarChart, Bar, CartesianGrid,
  XAxis, YAxis, Tooltip, Legend,
} from "recharts";

const API = "http://localhost:5000/api/leaves";

/* ─── INJECT STYLES ─── */
const injectGlobalStyles = () => {
  if (document.getElementById("lm-global")) return;
  const s = document.createElement("style");
  s.id = "lm-global";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

    .lm-root *, .lm-root *::before, .lm-root *::after {
      box-sizing: border-box;
      margin: 0; 
      padding: 0;
      font-family: 'Syne', sans-serif;
    }

    .lm-root {
      --navy: #0D1B2A;
      --navy2: #1B2B3A;
      --sky: #38BDF8;
      --sky2: #0EA5E9;
      --green: #10B981;
      --amber: #F59E0B;
      --red: #EF4444;
      --surface: #FFFFFF;
      --bg: #F0F4F8;
      --border: #E2E8F0;
      --muted: #94A3B8;
      --text: #0F172A;

      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;  /* root does NOT scroll */
      background: var(--bg);
      color: var(--text);
    }
      .lm-content {
  flex: 1;              /* fill remaining height */
  overflow-y: auto;     /* scrollable */
  padding-bottom: 16px; /* optional for spacing */
}
  .lm-chart-scroll::-webkit-scrollbar {
  display: none;
}

.lm-chart-scroll {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;     /* Firefox */
}

    /* ── KPI GRID ── */
    .lm-kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 24px;
    }
    .lm-kpi {
      background: var(--navy);
      border-radius: 16px;
      padding: 22px 20px;
      display: flex;
      align-items: flex-start;
      gap: 14px;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .lm-kpi::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(56,189,248,0.08) 0%, transparent 60%);
      pointer-events: none;
    }
    .lm-kpi:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(13,27,42,0.18); }
    .lm-kpi-icon {
      width: 46px; height: 46px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .lm-kpi-val { font-size: 30px; font-weight: 800; color: #fff; line-height: 1; }
    .lm-kpi-label { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    .lm-kpi-accent { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; }

    /* ── TABS ── */
    .lm-tabs {
      display: flex; gap: 4px; margin-bottom: 20px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 14px; padding: 5px; width: fit-content;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    }
    .lm-tab {
      padding: 9px 22px; border-radius: 10px; border: none;
      background: transparent; color: var(--muted); font-family: 'Syne', sans-serif;
      font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.18s;
      letter-spacing: 0.02em;
    }
    .lm-tab.active { background: var(--navy); color: #fff; box-shadow: 0 2px 10px rgba(13,27,42,0.3); }
    .lm-tab:not(.active):hover { background: var(--bg); color: var(--text); }

    /* ── CARD ── */
    .lm-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 20px; overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      display: flex; 
      flex-direction: column;
      height: 100%;       /* card fills container */
      min-height: 0;      /* enable inner scrolling */
    }
    .lm-card-header {
      padding: 20px 24px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 12px;
      background: linear-gradient(to right, #FAFBFC, var(--surface));
      flex-shrink: 0;     /* header stays fixed */
    }
    .lm-card-title {
      font-size: 15px; font-weight: 800; color: var(--navy);
      display: flex; align-items: center; gap: 8px;
    }
    .lm-card-title::before {
      content: ''; width: 4px; height: 18px;
      background: linear-gradient(to bottom, var(--sky), var(--sky2));
      border-radius: 2px; display: inline-block;
    }
    .lm-card-body { 
      padding: 0; 
      overflow-y: auto;   /* scrollable content */
      flex-grow: 1;       /* fills remaining card height */
      min-height: 0;      /* needed for flex scroll to work */
    }
    .lm-card-body::-webkit-scrollbar { width: 5px; }
    .lm-card-body::-webkit-scrollbar-track { background: transparent; }
    .lm-card-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    /* ── TABLE ── */
    .lm-table-wrap { overflow-x: auto; }
    .lm-table { width: 100%; border-collapse: collapse; }
    .lm-table thead th {
      position: sticky; top: 0; z-index: 2;
      background: #F8FAFC; padding: 12px 18px;
      text-align: left; font-size: 11px; font-weight: 700;
      color: var(--muted); text-transform: uppercase;
      letter-spacing: 0.07em; border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    .lm-table tbody tr { border-bottom: 1px solid #F1F5F9; transition: background 0.12s; }
    .lm-table tbody tr:hover { background: #F8FAFC; }
    .lm-table tbody td { padding: 14px 18px; font-size: 13.5px; color: var(--text); }
    .lm-table tbody td .mono { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); }

    /* ── CONTROLS ── */
    .lm-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .lm-select {
      padding: 9px 14px; border-radius: 10px; border: 1px solid var(--border);
      background: var(--surface); font-size: 13px; font-weight: 600;
      font-family: 'Syne', sans-serif; color: var(--text); cursor: pointer; outline: none;
      transition: border 0.2s;
    }
    .lm-select:focus { border-color: var(--sky); }
    .lm-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 18px; border-radius: 10px; border: none;
      font-size: 13px; font-family: 'Syne', sans-serif;
      font-weight: 700; cursor: pointer; transition: all 0.16s;
      letter-spacing: 0.01em;
    }
    .lm-btn-primary { background: linear-gradient(135deg, var(--navy), #1e3a5f); color: #fff; }
    .lm-btn-primary:hover { box-shadow: 0 6px 20px rgba(13,27,42,0.3); transform: translateY(-1px); }

    /* ── BADGE ── */
    .lm-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 12px; border-radius: 20px;
      font-size: 11.5px; font-weight: 700;
    }
    .lm-badge::before {
      content: ''; width: 6px; height: 6px;
      border-radius: 50%; background: currentColor; opacity: 0.8;
    }

    /* ── EMPTY ── */
    .lm-empty { padding: 70px 20px; text-align: center; color: var(--muted); font-size: 14px; }
    .lm-empty-icon { font-size: 40px; margin-bottom: 14px; opacity: 0.5; }

    @media (max-width: 900px) {
      .lm-kpi-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) { .lm-kpi-grid { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(s);
};

/* ─── HELPERS ─── */
const badgeProps = (status) => ({
  Pending:  { style: { background: "#FEF3C7", color: "#D97706" } },
  Approved: { style: { background: "#D1FAE5", color: "#065F46" } },
  Rejected: { style: { background: "#FEE2E2", color: "#B91C1C" } },
}[status] || { style: { background: "#F1F5F9", color: "#64748B" } });

const exportToExcel = (data, filename) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, filename);
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
};

/* ─── KPI CARD ─── */
function KpiCard({ label, value, icon, accent }) {
  return (
    <div className="lm-kpi">
      <div className="lm-kpi-accent" style={{ background: `linear-gradient(to right, ${accent}, transparent)` }} />
      <div className="lm-kpi-icon">{icon}</div>
      <div>
        <div className="lm-kpi-val">{value ?? "—"}</div>
        <div className="lm-kpi-label">{label}</div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
export default function LeaveManagerPage() {
  injectGlobalStyles();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [logs, setLogs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [dashboardData, setDashboardData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [leavesRes, balancesRes, logsRes] = await Promise.all([
          axios.get(`${API}/leaves`),
          axios.get(`${API}/leave_balance`),
          axios.get(`${API}/leave_approvals_log`),
        ]);
        const leavesData   = Array.isArray(leavesRes.data)   ? leavesRes.data   : [];
        const balancesData = Array.isArray(balancesRes.data) ? balancesRes.data : [];
        const logsData     = Array.isArray(logsRes.data)     ? logsRes.data     : [];
        setLeaves(leavesData);
        setBalances(balancesData);
        setLogs(logsData);
        const total    = leavesData.length;
        const pending  = leavesData.filter(l => l.status === "Pending").length;
        const approved = leavesData.filter(l => l.status === "Approved").length;
        const rejected = leavesData.filter(l => l.status === "Rejected").length;
        setDashboardData([{ date: "Summary", totalRequests: total, pending, approved, rejected }]);
      } catch (err) {
        console.error("Error fetching leave data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const pending  = leaves.filter(l => l.status === "Pending").length;
  const approved = leaves.filter(l => l.status === "Approved").length;
  const rejected = leaves.filter(l => l.status === "Rejected").length;
  const filteredLeaves = filterStatus === "All" ? leaves : leaves.filter(l => l.status === filterStatus);

  const tabs = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "requests",  label: "📋 Requests"  },
    { id: "balance",   label: "⚖️ Balance"   },
    { id: "approvals", label: "✅ Approvals"  },
  ];

  return (
    <div className="lm-root" style={{  width: "100%",        // ✅ IMPORTANT
    height: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "16px 20px",
     paddingTop: "30px", 
    overflow: "hidden", }}>
      {/* ── HEADER ── */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 40, height: 40, background: "linear-gradient(135deg, #0D1B2A, #1e3a5f)",
              borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, boxShadow: "0 4px 12px rgba(13,27,42,0.3)",
            }}>🗓️</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0D1B2A", letterSpacing: "-0.02em" }}>
              Leave Manager
            </h1>
          </div>
          <p style={{ fontSize: 13, color: "#94A3B8", marginLeft: 52 }}>
            Track employee leave requests, balances & approvals
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{
            padding: "6px 14px", borderRadius: 8, background: "#EFF6FF",
            color: "#2563EB", fontSize: 12, fontWeight: 700, border: "1px solid #BFDBFE",
          }}>
            {leaves.length} Total Requests
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="lm-kpi-grid">
        <KpiCard label="Total Requests" value={leaves.length} icon="📋" accent="#38BDF8" />
        <KpiCard label="Pending Review" value={pending}  icon="⏳" accent="#F59E0B" />
        <KpiCard label="Approved"       value={approved} icon="✅" accent="#10B981" />
        <KpiCard label="Rejected"       value={rejected} icon="❌" accent="#EF4444" />
      </div>

      {/* ── TABS ── */}
      <div className="lm-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`lm-tab${activeTab === t.id ? " active" : ""}`}
            onClick={() => { setActiveTab(t.id); setFilterStatus("All"); }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
 <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
  {loading ? (
    <div className="lm-card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="lm-empty">
        <div className="lm-empty-icon">⏳</div>Loading leave data…
      </div>
    </div>
  ) : activeTab === "dashboard" ? (
    <DashboardTab data={dashboardData} leaves={leaves} />
  ) : activeTab === "requests" ? (
    <RequestsTab filteredLeaves={filteredLeaves} filterStatus={filterStatus} setFilterStatus={setFilterStatus} />
  ) : activeTab === "balance" ? (
    <BalanceTab balances={balances} />
  ) : (
    <ApprovalsTab logs={logs} />
  )}
</div>
    </div>
  );
}

/* ─── DASHBOARD ─── */
function DashboardTab({ data, leaves }) {
  if (!data?.length)
    return <div className="lm-card"><div className="lm-empty"><div className="lm-empty-icon">📊</div>No dashboard data yet.</div></div>;

  const monthlyMap = {};
  leaves.forEach(l => {
    const month = l.start_date ? l.start_date.slice(0, 7) : "Unknown";
    if (!monthlyMap[month]) monthlyMap[month] = { month, Approved: 0, Pending: 0, Rejected: 0 };
    monthlyMap[month][l.status] = (monthlyMap[month][l.status] || 0) + 1;
  });
  const monthly = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: "#0D1B2A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px" }}>
        <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 6 }}>{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.fill, fontSize: 12, fontWeight: 700 }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  };

return (
  <div
    className="lm-card"
    style={{
      maxHeight: "500px",      // Set the max height for the card
      overflowY: "auto",       // Enable vertical scroll
      padding: "16px",
    }}
  >
    <div className="lm-card-header">
      <span className="lm-card-title">Leave Overview</span>
      <span style={{ fontSize: 12, color: "#94A3B8" }}>Last 6 months + summary</span>
    </div>

    <div className="lm-chart-section">
      <div className="lm-chart-box">
        <h3>Status Summary</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94A3B8" }} />
            <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} />
            <Tooltip content={customTooltip} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="totalRequests" fill="#38BDF8" name="Total" radius={[6, 6, 0, 0]} />
            <Bar dataKey="pending" fill="#F59E0B" name="Pending" radius={[6, 6, 0, 0]} />
            <Bar dataKey="approved" fill="#10B981" name="Approved" radius={[6, 6, 0, 0]} />
            <Bar dataKey="rejected" fill="#EF4444" name="Rejected" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="lm-chart-box">
        <h3>Monthly Trend</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthly} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} />
            <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} />
            <Tooltip content={customTooltip} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Approved" fill="#10B981" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Pending" fill="#F59E0B" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Rejected" fill="#EF4444" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);
}

/* ─── REQUESTS TAB ─── */
function RequestsTab({ filteredLeaves, filterStatus, setFilterStatus }) {
  return (
    <div className="lm-card">
      <div className="lm-card-header">
        <span className="lm-card-title">Leave Requests</span>
        <div className="lm-controls">
          <select className="lm-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button className="lm-btn lm-btn-primary"
            onClick={() => exportToExcel(filteredLeaves, "Leave_Requests.xlsx")}>
            ↓ Export Excel
          </button>
        </div>
      </div>
      <div className="lm-card-body">
        {filteredLeaves.length === 0 ? (
          <div className="lm-empty"><div className="lm-empty-icon">📭</div>No leave requests found.</div>
        ) : (
          <div className="lm-table-wrap">
            <table className="lm-table">
              <thead>
                <tr>
                  {["Request ID","Employee ID","Leave Type","Start Date","End Date","Days","Status"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map(l => (
                  <tr key={l.leave_request_id}>
                    <td><span className="mono">#{l.leave_request_id}</span></td>
                    <td><span className="mono">{l.employee_id}</span></td>
                    <td>
                      <span style={{ padding: "3px 10px", borderRadius: 6, background: "#EFF6FF", color: "#2563EB", fontSize: 12, fontWeight: 600 }}>
                        {l.leave_type}
                      </span>
                    </td>
                    <td style={{ color: "#475569", fontSize: 13 }}>{l.start_date}</td>
                    <td style={{ color: "#475569", fontSize: 13 }}>{l.end_date}</td>
                    <td>
                      <span style={{ fontWeight: 800, fontSize: 15, color: "#0D1B2A" }}>{l.number_of_days}</span>
                      <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: 3 }}>d</span>
                    </td>
                    <td>
                      <span className="lm-badge" style={badgeProps(l.status).style}>{l.status}</span>
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

/* ─── BALANCE TAB ─── */
function BalanceTab({ balances }) {
  return (
    <div className="lm-card">
      <div className="lm-card-header">
        <span className="lm-card-title">Leave Balance</span>
        <button className="lm-btn lm-btn-primary" onClick={() => exportToExcel(balances, "Leave_Balance.xlsx")}>
          ↓ Export Excel
        </button>
      </div>
      <div className="lm-card-body">
        {balances.length === 0 ? (
          <div className="lm-empty"><div className="lm-empty-icon">📭</div>No balance records found.</div>
        ) : (
          <div className="lm-table-wrap">
            <table className="lm-table">
              <thead>
                <tr>
                  {["Employee ID","Leave Type","Year","Allocated","Used","Remaining"].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {balances.map(b => {
                  const remaining = (b.total_allocated || 0) - (b.used_days || 0);
                  const pct = b.total_allocated ? Math.round((b.used_days / b.total_allocated) * 100) : 0;
                  const barColor = pct > 80 ? "#EF4444" : pct > 50 ? "#F59E0B" : "#10B981";
                  return (
                    <tr key={b.balance_id}>
                      <td><span className="mono">{b.employee_id}</span></td>
                      <td><span className="mono">{b.leave_type_id}</span></td>
                      <td style={{ fontWeight: 600 }}>{b.year}</td>
                      <td style={{ fontWeight: 700, color: "#0D1B2A" }}>{b.total_allocated}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontWeight: 600 }}>{b.used_days}</span>
                          <div className="lm-progress-bar">
                            <div className="lm-progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                          </div>
                          <span style={{ fontSize: 11, color: "#94A3B8" }}>{pct}%</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, fontSize: 15, color: remaining <= 0 ? "#EF4444" : "#10B981" }}>
                          {remaining}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── APPROVALS TAB ─── */
function ApprovalsTab({ logs }) {
  return (
    <div className="lm-card">
      <div className="lm-card-header">
        <span className="lm-card-title">Approvals Log</span>
        <button className="lm-btn lm-btn-primary" onClick={() => exportToExcel(logs, "Leave_Approvals_Log.xlsx")}>
          ↓ Export Excel
        </button>
      </div>
      <div className="lm-card-body">
        {logs.length === 0 ? (
          <div className="lm-empty"><div className="lm-empty-icon">📭</div>No approval logs found.</div>
        ) : (
          <div className="lm-table-wrap">
            <table className="lm-table">
              <thead>
                <tr>
                  {["Log ID","Request ID","Approved By","Status","Comments","Action Date"].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.log_id}>
                    <td><span className="mono">#{l.log_id}</span></td>
                    <td><span className="mono">#{l.leave_request_id}</span></td>
                    <td style={{ fontWeight: 600 }}>{l.approved_by || "—"}</td>
                    <td><span className="lm-badge" style={badgeProps(l.status).style}>{l.status}</span></td>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#64748B", fontSize: 13 }}>
                      {l.comments || "—"}
                    </td>
                    <td style={{ whiteSpace: "nowrap", color: "#64748B", fontSize: 13 }}>
                      {new Date(l.action_date).toLocaleString()}
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