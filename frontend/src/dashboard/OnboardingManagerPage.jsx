import React, { useState, useEffect } from "react";
import axios from "axios";
import { Shield, BookOpen } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer
} from "recharts";

const API = "https://retrack.onrender.com/api";

/* ─── STYLES ─── */
const injectStyles = () => {
  if (document.getElementById("on-styles")) return;
  const s = document.createElement("style");
  s.id = "on-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
    .on-root *, .on-root *::before, .on-root *::after { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Syne', sans-serif; }
    .on-root {
      --bg: #F0F4F8; --surface: #fff; --border: #E2E8F0;
      --navy: #0D1B2A; --sky: #38BDF8; --green: #10B981;
      --amber: #F59E0B; --red: #EF4444; --purple: #7C3AED;
      --muted: #94A3B8; --text: #0F172A;
      background: var(--bg);
  height: 100%;              /* important */
  display: flex;
  flex-direction: column;
  overflow: hidden;          /* prevent outer scroll */
  color: var(--text);
    }

    .on-tabs { display: flex; gap: 4px; margin-bottom: 20px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 5px; width: 100%; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
    .on-tab { padding: 9px 22px; border-radius: 10px; border: none; background: transparent; color: var(--muted); font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.18s; }
    .on-tab.active { background: var(--navy); color: #fff; box-shadow: 0 2px 10px rgba(13,27,42,0.3); }
    .on-tab:not(.active):hover { background: var(--bg); color: var(--text); }

    .on-card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .on-card-header { padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; background: linear-gradient(to right, #FAFBFC, var(--surface)); }
    .on-card-title { font-size: 15px; font-weight: 800; color: var(--navy); display: flex; align-items: center; gap: 8px; }
    .on-card-title::before { content: ''; width: 4px; height: 18px; background: linear-gradient(to bottom, var(--sky), #0EA5E9); border-radius: 2px; }
    .on-card-body { flex: 1;
  overflow-y: auto;  }
    .on-card-body::-webkit-scrollbar { width: 5px; }
    .on-card-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    .on-table { width: 100%; border-collapse: collapse; }
    .on-table thead th { position: sticky; top: 0; z-index: 2; background: #F8FAFC; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; border-bottom: 1px solid var(--border); white-space: nowrap; }
    .on-table tbody tr { border-bottom: 1px solid #F1F5F9; transition: background 0.12s; }
    .on-table tbody tr:hover { background: #F8FAFC; }
    .on-table tbody td { padding: 13px 16px; font-size: 13.5px; color: var(--text); }

    .on-select { padding: 9px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); font-size: 13px; font-weight: 600; font-family: 'Syne', sans-serif; color: var(--text); cursor: pointer; outline: none; }
    .on-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 10px; border: none; font-size: 13px; font-family: 'Syne', sans-serif; font-weight: 700; cursor: pointer; transition: all 0.16s; }
    .on-btn-primary { background: linear-gradient(135deg, var(--navy), #1e3a5f); color: #fff; }
    .on-btn-primary:hover { box-shadow: 0 6px 20px rgba(13,27,42,0.3); transform: translateY(-1px); }
    .on-btn-upload { background: linear-gradient(135deg, #0EA5E9, var(--sky)); color: #fff; }
    .on-btn-export { background: linear-gradient(135deg, #10B981, #059669); color: #fff; }

    .on-badge { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 20px; font-size: 11.5px; font-weight: 700; }
    .on-badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.8; }

    .on-empty { padding: 70px 20px; text-align: center; color: var(--muted); font-size: 14px; }
    .on-empty-icon { font-size: 40px; margin-bottom: 14px; opacity: 0.5; }

    .on-chart-box { background: #F8FAFC; border: 1px solid var(--border); border-radius: 14px; padding: 22px; margin-bottom: 20px; }
    .on-chart-box h3 { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .on-chart-box h3::after { content: ''; flex: 1; height: 1px; background: var(--border); }

    .on-input { padding: 9px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); font-size: 13px; font-family: 'Syne', sans-serif; color: var(--text); outline: none; transition: border 0.2s; }
    .on-input:focus { border-color: var(--sky); }

    a.on-link { color: #0EA5E9; font-weight: 600; font-size: 13px; text-decoration: none; }
    a.on-link:hover { text-decoration: underline; }
  `;
  document.head.appendChild(s);
};

const badgeStyle = (status) => ({
  Pending:  { background: "#FEF3C7", color: "#D97706" },
  Sent:     { background: "#EFF6FF", color: "#2563EB" },
  Accepted: { background: "#D1FAE5", color: "#065F46" },
  Rejected: { background: "#FEE2E2", color: "#B91C1C" },
  PENDING:  { background: "#FEF3C7", color: "#D97706" },
  VERIFIED: { background: "#D1FAE5", color: "#065F46" },
  REJECTED: { background: "#FEE2E2", color: "#B91C1C" },
  ONGOING:  { background: "#EFF6FF", color: "#2563EB" },
  COMPLETED:{ background: "#D1FAE5", color: "#065F46" },
}[status] || { background: "#F1F5F9", color: "#64748B" });

const customTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0D1B2A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px" }}>
      <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 6 }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.stroke || p.fill, fontSize: 12, fontWeight: 700 }}>{p.name}: {p.value}</p>)}
    </div>
  );
};

/* ─── MAIN ─── */
export default function OnboardingManagerPage() {
  injectStyles();

  const [activeTab, setActiveTab] = useState("DASHBOARD");
  const [dashboardData, setDashboardData] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoadingDashboard(true);
        const [offersRes, bgRes, trainRes] = await Promise.all([
          axios.get(`${API}/offers/all`),
          axios.get(`${API}/background/all`),
          axios.get(`${API}/trainers/allocations`),
        ]);
        const offers      = Array.isArray(offersRes.data) ? offersRes.data : [];
        const background  = Array.isArray(bgRes.data) ? bgRes.data : [];
        const allocations = Array.isArray(trainRes.data.allocations) ? trainRes.data.allocations : [];
        setDashboardData([{
          date: "Summary",
          totalOffers:        offers.length,
          acceptedOffers:     offers.filter(o => o.offer_status === "Accepted").length,
          pendingBackground:  background.filter(b => b.background_check_status === "PENDING").length,
          completedTraining:  allocations.filter(a => a.allocation_status === "COMPLETED").length,
          ongoingTraining:    allocations.filter(a => a.allocation_status === "ONGOING").length,
          pendingTraining:    allocations.filter(a => a.allocation_status === "PENDING").length,
        }]);
      } catch (err) { console.error(err); }
      finally { setLoadingDashboard(false); }
    };
    fetchDashboardData();
  }, []);

  const tabs = [
    { id: "DASHBOARD",   label: "📊 Dashboard"           },
    { id: "OFFER",       label: "📄 Offer Status"         },
    { id: "BACKGROUND",  label: "🛡️ Background Status"   },
    { id: "TRAINING",    label: "🎓 Training Status"      },
  ];

  return (
 <div
  className="on-root"
  style={{
    width: "100%",        // ✅ IMPORTANT
    height: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "16px 20px",
     paddingTop: "30px", 
    overflow: "hidden",
  }}
>
      {/* ── HEADER ── */}
      <div style={{ marginBottom: 22, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{ width: 40, height: 40, background: "linear-gradient(135deg, #0D1B2A, #1e3a5f)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 12px rgba(13,27,42,0.3)" }}>🚀</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0D1B2A", letterSpacing: "-0.02em" }}>Onboarding Manager</h1>
          </div>
          <p style={{ fontSize: 13, color: "#94A3B8", marginLeft: 52 }}>Track offers, background checks & training allocations</p>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="on-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`on-tab${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
     <div
  className="on-card"
  style={{
    flex: 1,
    width: "100%",       // ✅ ADD THIS
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  }}
>
        {activeTab === "DASHBOARD"  && <DashboardTab data={dashboardData} loading={loadingDashboard} />}
        {activeTab === "OFFER"      && <OfferTab />}
        {activeTab === "BACKGROUND" && <BackgroundTab />}
        {activeTab === "TRAINING"   && <TrainingTab />}
      </div>
    </div>
  );
}

/* ─── DASHBOARD ─── */
function DashboardTab({ data, loading }) {
  if (loading) return <div className="on-empty"><div className="on-empty-icon">⏳</div>Loading dashboard data…</div>;
  if (!data?.length) return <div className="on-empty"><div className="on-empty-icon">📊</div>No data yet.</div>;

  return (
    <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>
      <div className="on-chart-box">
        <h3>Offer & Training Overview (Line)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94A3B8" }} />
            <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} />
            <Tooltip content={customTooltip} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="totalOffers"       stroke="#38BDF8" strokeWidth={2} dot={{ r: 4 }} name="Total Offers" />
            <Line type="monotone" dataKey="acceptedOffers"    stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} name="Accepted Offers" />
            <Line type="monotone" dataKey="pendingBackground" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} name="Pending Background" />
            <Line type="monotone" dataKey="completedTraining" stroke="#A78BFA" strokeWidth={2} dot={{ r: 4 }} name="Completed Training" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="on-chart-box">
        <h3>Full Breakdown (Bar)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} barSize={32} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94A3B8" }} />
            <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} />
            <Tooltip content={customTooltip} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="totalOffers"       fill="#38BDF8" name="Total Offers"       radius={[6,6,0,0]} />
            <Bar dataKey="acceptedOffers"    fill="#10B981" name="Accepted Offers"    radius={[6,6,0,0]} />
            <Bar dataKey="pendingBackground" fill="#F59E0B" name="Pending BG"         radius={[6,6,0,0]} />
            <Bar dataKey="completedTraining" fill="#A78BFA" name="Completed Training" radius={[6,6,0,0]} />
            <Bar dataKey="ongoingTraining"   fill="#7C3AED" name="Ongoing Training"   radius={[6,6,0,0]} />
            <Bar dataKey="pendingTraining"   fill="#EF4444" name="Pending Training"   radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── OFFER TAB ─── */
function OfferTab() {
  const [offers, setOffers]           = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => {
    axios.get(`${API}/offers/all`).then(res => setOffers(Array.isArray(res.data) ? res.data : []));
  }, []);

  const filtered = filterStatus === "All" ? offers : offers.filter(o => o.offer_status === filterStatus);

  const exportToExcel = () => {
    const data = filtered.map(o => ({ "Candidate Name": o.candidate_name, Email: o.email, Position: o.position, Status: o.offer_status }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Offers");
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]), "Offer_List.xlsx");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="on-card-header">
        <span className="on-card-title">Offer Status</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select className="on-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Sent">Sent</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button className="on-btn on-btn-export" onClick={exportToExcel}>↓ Export</button>
        </div>
      </div>
      <div className="on-card-body" style={{ flex: 1 }}>
        {filtered.length === 0 ? (
          <div className="on-empty"><div className="on-empty-icon">📭</div>No offers available.</div>
        ) : (
          <table className="on-table">
            <thead>
              <tr>
                {["Candidate Name","Email","Position","Status"].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(offer => (
                <tr key={offer.id}>
                  <td style={{ fontWeight: 700, color: "#0D1B2A" }}>{offer.candidate_name}</td>
                  <td style={{ color: "#64748B" }}>{offer.email}</td>
                  <td>
                    <span style={{ padding: "3px 10px", borderRadius: 6, background: "#EFF6FF", color: "#2563EB", fontSize: 12, fontWeight: 600 }}>
                      {offer.position}
                    </span>
                  </td>
                  <td>
                    <span className="on-badge" style={badgeStyle(offer.offer_status)}>{offer.offer_status}</span>
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

/* ─── BACKGROUND TAB ─── */
function BackgroundTab() {
  const [data, setData]               = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => {
    axios.get(`${API}/background/all`).then(res => setData(Array.isArray(res.data) ? res.data : []));
  }, []);

  const filtered = filterStatus === "All" ? data : data.filter(d => d.background_check_status === filterStatus);

  const exportToExcel = () => {
    const rows = filtered.map(o => ({ Email: o.email, PAN: o.pan_card, Aadhar: o.aadhar_card, Passport: o.passport, Education: o.education_records, PreviousEmployment: o.previous_employment_record, Consent: o.signed_consent, Status: o.background_check_status }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Background");
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]), "Background_Verification.xlsx");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="on-card-header">
        <span className="on-card-title">Background Verification</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select className="on-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button className="on-btn on-btn-export" onClick={exportToExcel}>↓ Export</button>
        </div>
      </div>
      <div className="on-card-body" style={{ flex: 1 }}>
        {filtered.length === 0 ? (
          <div className="on-empty"><div className="on-empty-icon">📭</div>No background records.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="on-table">
              <thead>
                <tr>
                  {["Email","PAN","AADHAR","Passport","Education","Employment","Consent","Status"].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id}>
                    <td style={{ color: "#64748B" }}>{row.email}</td>
                    {["pan_card","aadhar_card","passport","education_records","previous_employment_record","signed_consent"].map(k => (
                      <td key={k}>
                        <a className="on-link" href={row[k]} target="_blank" rel="noreferrer">View ↗</a>
                      </td>
                    ))}
                    <td>
                      <span className="on-badge" style={badgeStyle(row.background_check_status)}>
                        {row.background_check_status || "PENDING"}
                      </span>
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

/* ─── TRAINING TAB ─── */
function TrainingTab() {
  const [allocations, setAllocations] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [loading, setLoading]         = useState(true);

  const fetchAllocations = async () => {
    try {
      const res = await axios.get(`${API}/trainers/allocations`);
      setAllocations(Array.isArray(res.data.allocations) ? res.data.allocations : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAllocations();
    const interval = setInterval(fetchAllocations, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filterStatus === "All" ? allocations : allocations.filter(a => a.allocation_status === filterStatus);

  const exportToExcel = () => {
    const data = filtered.map(a => ({
      Candidate: a.candidate_name, Trainer: a.trainer?.name || "N/A",
      Program: a.program_type,
      "Start Date": new Date(a.allocation_start).toLocaleDateString(),
      "End Date":   new Date(a.allocation_end).toLocaleDateString(),
      "Status": a.allocation_status,
      "Trainer Remaining Capacity": a.trainer?.remaining_capacity ?? "N/A",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Training");
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]), "Training_Allocations.xlsx");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="on-card-header">
        <span className="on-card-title">Training Allocations</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select className="on-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <button className="on-btn on-btn-export" onClick={exportToExcel}>↓ Export</button>
        </div>
      </div>
      <div className="on-card-body" style={{ flex: 1 }}>
        {loading ? (
          <div className="on-empty"><div className="on-empty-icon">⏳</div>Loading allocations…</div>
        ) : filtered.length === 0 ? (
          <div className="on-empty"><div className="on-empty-icon">📭</div>No training allocations.</div>
        ) : (
          <table className="on-table">
            <thead>
              <tr>
                {["Candidate","Trainer","Program","Start Date","End Date","Status","Remaining Cap."].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.allocation_id}>
                  <td style={{ fontWeight: 700, color: "#0D1B2A" }}>{a.candidate_name}</td>
                  <td style={{ color: "#64748B" }}>{a.trainer?.name || "N/A"}</td>
                  <td>
                    <span style={{ padding: "3px 10px", borderRadius: 6, background: "#F5F3FF", color: "#7C3AED", fontSize: 12, fontWeight: 600 }}>
                      {a.program_type}
                    </span>
                  </td>
                  <td style={{ color: "#64748B", fontSize: 13 }}>{new Date(a.allocation_start).toLocaleDateString()}</td>
                  <td style={{ color: "#64748B", fontSize: 13 }}>{new Date(a.allocation_end).toLocaleDateString()}</td>
                  <td>
                    <span className="on-badge" style={badgeStyle(a.allocation_status)}>{a.allocation_status}</span>
                  </td>
                  <td style={{ fontWeight: 700, color: "#0D1B2A" }}>{a.trainer?.remaining_capacity ?? "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
