import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const ATT_API = "http://localhost:5000/api/attendance";
const EMP_API = "http://localhost:5000/api/users/employees";

const injectAttStyles = () => {
  if (document.getElementById("att-css")) return;
  const s = document.createElement("style");
  s.id = "att-css";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
    .att-root{width:100%;height:100%;overflow-y:auto;padding:28px 30px;background:#F0F4F8;font-family:'Syne',sans-serif;}
    .att-kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:22px;}
    .att-kpi{background:#0D1B2A;border-radius:16px;padding:18px;position:relative;overflow:hidden;}
    .att-kpi-accent{position:absolute;bottom:0;left:0;right:0;height:3px;}
    .att-kpi-val{font-size:28px;font-weight:800;color:#fff;line-height:1;margin-bottom:5px;}
    .att-kpi-label{font-size:10px;color:rgba(255,255,255,0.42);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;}
    .att-card{background:#fff;border:1px solid #E2E8F0;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);}
    .att-card-header{padding:16px 22px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;justify-content:space-between;background:#FAFBFC;}
    .att-card-title{font-size:14px;font-weight:800;color:#0D1B2A;display:flex;align-items:center;gap:8px;}
    .att-card-title::before{content:'';width:4px;height:17px;background:#38BDF8;border-radius:2px;}
    .att-table{width:100%;border-collapse:collapse;}
    .att-table thead th{background:#F8FAFC;padding:12px;text-align:left;font-size:10px;color:#94A3B8;text-transform:uppercase;border-bottom:1px solid #E2E8F0;}
    .att-table tbody td{padding:12px;font-size:13px;border-bottom:1px solid #F1F5F9;}
    .att-badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;}
    .att-input{padding:8px;border-radius:8px;border:1.5px solid #E2E8F0;font-family:'Syne';}
    .att-btn{padding:8px 15px;border-radius:9px;border:none;font-weight:700;cursor:pointer;font-family:'Syne';}
    .att-btn-primary{background:#0D1B2A;color:#fff;}
    .att-pct-bar{height:5px;background:#E2E8F0;border-radius:99px;width:60px;overflow:hidden;}
    .att-pct-fill{height:100%;transition:width 0.5s;}
  `;
  document.head.appendChild(s);
};

const STATUS_STYLE = {
  Present: { bg: "#D1FAE5", color: "#065F46" },
  Absent: { bg: "#FEE2E2", color: "#B91C1C" },
  Late: { bg: "#FEF3C7", color: "#D97706" },
  "Half Day": { bg: "#EFF6FF", color: "#2563EB" },
  "Work From Home": { bg: "#F5F3FF", color: "#7C3AED" },
  "On Leave": { bg: "#F3F4F6", color: "#6B7280" },
};

export function AttendancePage() {
  injectAttStyles();
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState({});
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [tab, setTab] = useState("TODAY");
  const [monthYear, setMonthYear] = useState({ 
    year: new Date().getFullYear(), 
    month: String(new Date().getMonth() + 1).padStart(2, "0") 
  });
  const [monthSummary, setMonthSummary] = useState([]);

  const fetchToday = async () => {
    try {
      const [rRes, sRes] = await Promise.all([
        axios.get(`${ATT_API}?start=${dateFilter}&end=${dateFilter}`),
        axios.get(`${ATT_API}/today-summary`),
      ]);
      setRecords(rRes.data || []);
      setSummary(sRes.data || {});
    } catch (err) { console.error("Error fetching today:", err); }
  };

  const fetchMonthly = async () => {
    try {
      const res = await axios.get(`${ATT_API}/monthly-summary?year=${monthYear.year}&month=${monthYear.month}`);
      setMonthSummary(res.data || []);
    } catch (err) { console.error("Error fetching monthly:", err); }
  };

  const fetchEmployees = async () => {
    try {
      const r = await axios.get(EMP_API);
      setEmployees(r.data || []);
    } catch (err) { console.error("Error fetching employees:", err); }
  };

  useEffect(() => { fetchEmployees(); }, []);
  useEffect(() => { tab === "TODAY" ? fetchToday() : fetchMonthly(); }, [tab, dateFilter, monthYear]);

  const markAll = async (status) => {
    const recs = employees.map(e => ({
      employee_id: e.id,
      date: dateFilter,
      status: status,
      work_hours: (status === "Absent" || status === "On Leave") ? 0 : 8,
      marked_by: null // Critical: Ensure this is null for SQL integer column
    }));
    try {
      await axios.post(`${ATT_API}/bulk-mark`, { records: recs });
      fetchToday();
    } catch { alert("Bulk mark failed"); }
  };

  const exportExcel = () => {
    const data = records.map(r => ({
      Code: r.employee_code,
      Name: `${r.first_name} ${r.last_name}`,
      Dept: r.department,
      Status: r.status,
      CheckIn: r.check_in || "—",
      CheckOut: r.check_out || "—",
      Hours: r.work_hours
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]), "Attendance_Report.xlsx");
  };

  const kpis = [
    { label: "Total", value: summary.total || 0, accent: "#38BDF8" },
    { label: "Present", value: summary.present || 0, accent: "#10B981" },
    { label: "Absent", value: summary.absent || 0, accent: "#EF4444" },
    { label: "Late", value: summary.late || 0, accent: "#F59E0B" },
    { label: "WFH", value: summary.wfh || 0, accent: "#7C3AED" },
  ];

  return (
    <div className="att-root">
      {/* Header & Title */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 24 }}>📋</div>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#0D1B2A" }}>Attendance</span>
          </div>
        </div>
      </div>

      {/* KPI Display */}
      <div className="att-kpi-grid">
        {kpis.map(k => (
          <div key={k.label} className="att-kpi">
            <div className="att-kpi-accent" style={{ background: k.accent }} />
            <div className="att-kpi-val">{k.value}</div>
            <div className="att-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <button onClick={() => setTab("TODAY")} className="att-btn" style={{ background: tab === "TODAY" ? "#0D1B2A" : "#fff", color: tab === "TODAY" ? "#fff" : "#0D1B2A" }}>Daily</button>
        <button onClick={() => setTab("MONTHLY")} className="att-btn" style={{ background: tab === "MONTHLY" ? "#0D1B2A" : "#fff", color: tab === "MONTHLY" ? "#fff" : "#0D1B2A" }}>Monthly</button>
      </div>

      {/* Daily View */}
      {tab === "TODAY" && (
        <div className="att-card">
          <div className="att-card-header">
            <span className="att-card-title">Records</span>
            <div style={{ display: "flex", gap: 10 }}>
              <input className="att-input" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
              <button className="att-btn att-btn-primary" onClick={() => markAll("Present")}>All Present</button>
              <button className="att-btn att-btn-primary" onClick={exportExcel}>Export</button>
            </div>
          </div>
          <div className="att-card-body">
            <table className="att-table">
              <thead>
                <tr><th>Code</th><th>Employee</th><th>Dept</th><th>Status</th><th>Hours</th></tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td>{r.employee_code}</td>
                    <td style={{ fontWeight: 700 }}>{r.first_name} {r.last_name}</td>
                    <td>{r.department}</td>
                    <td>
                      <span className="att-badge" style={{ background: (STATUS_STYLE[r.status] || {}).bg, color: (STATUS_STYLE[r.status] || {}).color }}>
                        {r.status}
                      </span>
                    </td>
                    <td>{r.work_hours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly View */}
      {tab === "MONTHLY" && (
        <div className="att-card">
          <div className="att-card-header">
            <span className="att-card-title">Monthly Summary</span>
            <input className="att-input" type="month" value={`${monthYear.year}-${monthYear.month}`} onChange={e => {
              const [y, m] = e.target.value.split("-");
              setMonthYear({ year: y, month: m });
            }} />
          </div>
          <div className="att-card-body">
            <table className="att-table">
              <thead>
                <tr><th>Employee</th><th>Dept</th><th>Days</th><th>Attended</th><th>%</th></tr>
              </thead>
              <tbody>
                {monthSummary.map(r => (
                  <tr key={r.id}>
                    <td>{r.first_name} {r.last_name}</td>
                    <td>{r.department}</td>
                    <td>{r.total_days}</td>
                    <td>{r.attended}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="att-pct-bar">
                          <div className="att-pct-fill" style={{ width: `${r.pct}%`, background: r.pct >= 90 ? "#10B981" : "#F59E0B" }} />
                        </div>
                        <span>{r.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}