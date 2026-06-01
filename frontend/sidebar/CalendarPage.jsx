import React, { useState, useEffect } from "react";
import axios from "axios";

const CAL_API = "http://localhost:5000/api/calendar";

const injectCalStyles = () => {
  if (document.getElementById("cal-css")) return;
  const s = document.createElement("style");
  s.id = "cal-css";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
    .cal-root { width:100%;height:100%;overflow-y:auto;padding:28px 30px;background:#F0F4F8;font-family:'Syne',sans-serif; }
    .cal-root::-webkit-scrollbar{width:5px;}.cal-root::-webkit-scrollbar-thumb{background:#E2E8F0;border-radius:3px;}
    .cal-header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:22px;}
    .cal-title{font-size:24px;font-weight:800;color:#0D1B2A;letter-spacing:-0.4px;display:flex;align-items:center;gap:12px;}
    .cal-title-icon{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#0D1B2A,#1e3a5f);display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 12px rgba(13,27,42,0.25);}
    .cal-sub{font-size:13px;color:#94A3B8;margin-top:3px;margin-left:52px;}
    .cal-card{background:#fff;border:1px solid #E2E8F0;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);}
    .cal-card-header{padding:16px 22px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(to right,#FAFBFC,#fff);}
    .cal-card-title{font-size:14px;font-weight:800;color:#0D1B2A;display:flex;align-items:center;gap:8px;}
    .cal-card-title::before{content:'';width:4px;height:17px;background:linear-gradient(to bottom,#38BDF8,#0EA5E9);border-radius:2px;}
    .cal-grid{display:grid;grid-template-columns:1fr 320px;gap:20px;margin-top:20px;}
    @media(max-width:900px){.cal-grid{grid-template-columns:1fr;}}
    .cal-month-nav{display:flex;align-items:center;gap:12px;}
    .cal-nav-btn{width:32px;height:32px;border-radius:8px;background:#F8FAFC;border:1px solid #E2E8F0;color:#0D1B2A;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
    .cal-nav-btn:hover{background:#0D1B2A;color:#fff;border-color:#0D1B2A;}
    .cal-month-label{font-size:15px;font-weight:800;color:#0D1B2A;min-width:120px;text-align:center;}
    .cal-days-header{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;margin-bottom:2px;}
    .cal-day-name{text-align:center;padding:8px 0;font-size:10.5px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.06em;}
    .cal-days-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;}
    .cal-day{min-height:80px;padding:6px;border-radius:8px;background:#F8FAFC;border:1px solid transparent;cursor:pointer;transition:all 0.15s;position:relative;}
    .cal-day:hover{border-color:#BFDBFE;background:#EFF6FF;}
    .cal-day.today{border-color:#38BDF8;background:#EFF6FF;}
    .cal-day.other-month{opacity:0.35;}
    .cal-day-num{font-size:12px;font-weight:700;color:#0D1B2A;margin-bottom:4px;}
    .cal-day.today .cal-day-num{background:#38BDF8;color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;}
    .cal-event-chip{padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .cal-upcoming{display:flex;flex-direction:column;gap:10px;max-height:500px;overflow-y:auto;}
    .cal-upcoming::-webkit-scrollbar{width:4px;}.cal-upcoming::-webkit-scrollbar-thumb{background:#E2E8F0;border-radius:3px;}
    .cal-event-item{padding:12px 14px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;display:flex;gap:12px;cursor:pointer;transition:all 0.15s;}
    .cal-event-item:hover{border-color:#BFDBFE;background:#EFF6FF;}
    .cal-event-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:4px;}
    .cal-event-title{font-size:13px;font-weight:700;color:#0D1B2A;margin-bottom:2px;}
    .cal-event-meta{font-size:11px;color:#94A3B8;}
    .pp-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:10px;border:none;font-size:13px;font-family:'Syne',sans-serif;font-weight:700;cursor:pointer;transition:all 0.16s;}
    .pp-btn-primary{background:linear-gradient(135deg,#0D1B2A,#1e3a5f);color:#fff;}
    .pp-btn-primary:hover{box-shadow:0 6px 20px rgba(13,27,42,0.3);transform:translateY(-1px);}

    /* MODAL */
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);}
    .modal-box{background:#fff;border-radius:20px;width:480px;max-width:95vw;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.25);}
    .modal-header{background:#0D1B2A;padding:22px 24px 18px;}
    .modal-title{font-size:16px;font-weight:800;color:#fff;margin-bottom:4px;}
    .modal-sub{font-size:12px;color:rgba(255,255,255,0.45);}
    .modal-body{padding:22px 24px;}
    .modal-close{float:right;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.6);cursor:pointer;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;}
    .form-label{font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;display:block;}
    .form-input{width:100%;padding:10px 13px;border:1.5px solid #E2E8F0;border-radius:10px;font-family:'Syne',sans-serif;font-size:13px;color:#0D1B2A;background:#F8FAFC;outline:none;transition:border 0.2s;margin-bottom:13px;}
    .form-input:focus{border-color:#38BDF8;background:#fff;}
    .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  `;
  document.head.appendChild(s);
};

const EVENT_COLORS = { Meeting:"#38BDF8",Holiday:"#10B981",Birthday:"#F59E0B",Deadline:"#EF4444",Training:"#7C3AED",Review:"#F97316",Other:"#94A3B8" };
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function CalendarPage() {
  injectCalStyles();
  const [events, setEvents]   = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [today]               = useState(new Date());
  const [view, setView]       = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title:"", event_type:"Meeting", start_date:"", end_date:"", start_time:"", end_time:"", description:"", color:"#38BDF8", all_day:false });

  const fetchEvents = async () => {
    try {
      const start = `${view.year}-${String(view.month+1).padStart(2,"0")}-01`;
      const end   = `${view.year}-${String(view.month+1).padStart(2,"0")}-31`;
      const [eRes, uRes] = await Promise.all([
        axios.get(`${CAL_API}/events?start=${start}&end=${end}`),
        axios.get(`${CAL_API}/upcoming`),
      ]);
      setEvents(Array.isArray(eRes.data) ? eRes.data : []);
      setUpcoming(Array.isArray(uRes.data) ? uRes.data : []);
    } catch {}
  };
  useEffect(() => { fetchEvents(); }, [view]);

  const prevMonth = () => setView(v => v.month === 0 ? { year:v.year-1,month:11 } : { ...v,month:v.month-1 });
  const nextMonth = () => setView(v => v.month === 11 ? { year:v.year+1,month:0 } : { ...v,month:v.month+1 });

  const createEvent = async () => {
    if (!form.title || !form.start_date) return alert("Title and start date required");
    try {
      await axios.post(`${CAL_API}/events`, { ...form, color: EVENT_COLORS[form.event_type] || "#38BDF8" });
      setShowModal(false);
      setForm({ title:"",event_type:"Meeting",start_date:"",end_date:"",start_time:"",end_time:"",description:"",color:"#38BDF8",all_day:false });
      fetchEvents();
    } catch { alert("Failed to create event"); }
  };

  // Build calendar grid
  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month+1, 0).getDate();
  const prevDays = new Date(view.year, view.month, 0).getDate();
  const cells = [];
  for (let i = firstDay-1; i >= 0; i--) cells.push({ day: prevDays-i, cur:false });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day:i, cur:true });
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) cells.push({ day:i, cur:false });

  const eventsForDay = (day) => {
    const d = `${view.year}-${String(view.month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return events.filter(e => e.start_date && e.start_date.slice(0,10) === d);
  };

  return (
    <div className="cal-root">
      <div className="cal-header">
        <div>
          <div className="cal-title"><div className="cal-title-icon">📅</div>Calendar</div>
          <div className="cal-sub">Manage events, meetings and important dates</div>
        </div>
        <button className="pp-btn pp-btn-primary" onClick={() => setShowModal(true)}>+ Add Event</button>
      </div>

      <div className="cal-grid">
        {/* Calendar */}
        <div className="cal-card">
          <div className="cal-card-header">
            <span className="cal-card-title">{MONTHS[view.month]} {view.year}</span>
            <div className="cal-month-nav">
              <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
              <button className="cal-nav-btn" onClick={() => setView({ year:today.getFullYear(), month:today.getMonth() })}>Today</button>
              <button className="cal-nav-btn" onClick={nextMonth}>›</button>
            </div>
          </div>
          <div style={{ padding:"16px" }}>
            <div className="cal-days-header">{DAYS.map(d => <div key={d} className="cal-day-name">{d}</div>)}</div>
            <div className="cal-days-grid">
              {cells.map((cell, i) => {
                const isToday = cell.cur && cell.day === today.getDate() && view.month === today.getMonth() && view.year === today.getFullYear();
                const dayEvents = cell.cur ? eventsForDay(cell.day) : [];
                return (
                  <div key={i} className={`cal-day${isToday?" today":""}${!cell.cur?" other-month":""}`}>
                    <div className="cal-day-num">{isToday ? <span>{cell.day}</span> : cell.day}</div>
                    {dayEvents.slice(0,2).map((ev,j) => (
                      <div key={j} className="cal-event-chip" style={{ background:`${EVENT_COLORS[ev.event_type]||"#38BDF8"}20`,color:EVENT_COLORS[ev.event_type]||"#38BDF8" }}>
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <div style={{ fontSize:9,color:"#94A3B8",fontWeight:700 }}>+{dayEvents.length-2} more</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Upcoming */}
        <div className="cal-card">
          <div className="cal-card-header"><span className="cal-card-title">Upcoming Events</span></div>
          <div style={{ padding:"16px" }}>
            <div className="cal-upcoming">
              {upcoming.length === 0 && <div style={{ color:"#94A3B8",fontSize:13,textAlign:"center",padding:"30px 0" }}>No upcoming events.</div>}
              {upcoming.map(ev => (
                <div key={ev.id} className="cal-event-item">
                  <div className="cal-event-dot" style={{ background:EVENT_COLORS[ev.event_type]||"#38BDF8" }} />
                  <div>
                    <div className="cal-event-title">{ev.title}</div>
                    <div className="cal-event-meta">{ev.start_date?.slice(0,10)} {ev.start_time ? `· ${ev.start_time.slice(0,5)}` : ""}</div>
                    <div style={{ fontSize:10.5,fontWeight:700,marginTop:4,color:EVENT_COLORS[ev.event_type]||"#38BDF8" }}>{ev.event_type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                <div><div className="modal-title">Add Calendar Event</div><div className="modal-sub">Schedule a new event or meeting</div></div>
                <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
            </div>
            <div className="modal-body">
              <label className="form-label">Event Title</label>
              <input className="form-input" placeholder="e.g. Team Standup" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} />
              <div className="form-row">
                <div>
                  <label className="form-label">Type</label>
                  <select className="form-input" value={form.event_type} onChange={e=>setForm(p=>({...p,event_type:e.target.value}))}>
                    {Object.keys(EVENT_COLORS).map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} />
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label className="form-label">Start Time</label>
                  <input className="form-input" type="time" value={form.start_time} onChange={e=>setForm(p=>({...p,start_time:e.target.value}))} />
                </div>
                <div>
                  <label className="form-label">End Time</label>
                  <input className="form-input" type="time" value={form.end_time} onChange={e=>setForm(p=>({...p,end_time:e.target.value}))} />
                </div>
              </div>
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} placeholder="Optional details…" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} style={{ resize:"vertical" }} />
              <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:4 }}>
                <button className="pp-btn" style={{ background:"#F8FAFC",border:"1px solid #E2E8F0",color:"#64748B",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13 }} onClick={()=>setShowModal(false)}>Cancel</button>
                <button className="pp-btn pp-btn-primary" onClick={createEvent}>Create Event →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarPage;