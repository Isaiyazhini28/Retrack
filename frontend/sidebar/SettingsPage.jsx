import React, { useState, useEffect } from "react";
import axios from "axios";

const SET_API = "https://retrack.onrender.com/api/settings";

const injectSetStyles = () => {
  if (document.getElementById("set-css")) return;
  const s = document.createElement("style");
  s.id = "set-css";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
    .set-root{width:100%;height:100%;overflow-y:auto;padding:28px 30px;background:#F0F4F8;font-family:'Syne',sans-serif;}
    .set-root::-webkit-scrollbar{width:5px;}.set-root::-webkit-scrollbar-thumb{background:#E2E8F0;border-radius:3px;}
    .set-grid{display:grid;grid-template-columns:220px 1fr;gap:20px;margin-top:20px;align-items:start;}
    @media(max-width:800px){.set-grid{grid-template-columns:1fr;}}
    .set-sidebar{background:#fff;border:1px solid #E2E8F0;border-radius:18px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);}
    .set-nav-item{padding:12px 18px;cursor:pointer;font-size:13px;font-weight:600;color:#64748B;border-left:3px solid transparent;transition:all 0.15s;display:flex;align-items:center;gap:10px;}
    .set-nav-item:hover{background:#F8FAFC;color:#0D1B2A;border-left-color:#BFDBFE;}
    .set-nav-item.active{background:#EFF6FF;color:#0D1B2A;border-left-color:#38BDF8;font-weight:800;}
    .set-card{background:#fff;border:1px solid #E2E8F0;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);}
    .set-card-header{padding:18px 22px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(to right,#FAFBFC,#fff);}
    .set-card-title{font-size:14px;font-weight:800;color:#0D1B2A;display:flex;align-items:center;gap:8px;}
    .set-card-title::before{content:'';width:4px;height:17px;background:linear-gradient(to bottom,#38BDF8,#0EA5E9);border-radius:2px;}
    .set-card-body{padding:22px;}
    .set-field{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #F1F5F9;gap:20px;}
    .set-field:last-child{border-bottom:none;}
    .set-field-info{flex:1;}
    .set-field-label{font-size:13.5px;font-weight:700;color:#0D1B2A;margin-bottom:3px;}
    .set-field-desc{font-size:12px;color:#94A3B8;}
    .set-input{padding:9px 13px;border:1.5px solid #E2E8F0;border-radius:9px;font-family:'Syne',sans-serif;font-size:13px;color:#0D1B2A;background:#F8FAFC;outline:none;transition:border 0.2s;min-width:180px;}
    .set-input:focus{border-color:#38BDF8;background:#fff;}
    .set-toggle{width:44px;height:24px;border-radius:12px;border:none;cursor:pointer;position:relative;flex-shrink:0;transition:background 0.22s;}
    .set-toggle::after{content:'';position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.2);transition:left 0.22s;}
    .set-toggle.on{background:#10B981;}.set-toggle.on::after{left:23px;}
    .set-toggle.off{background:#CBD5E1;}.set-toggle.off::after{left:3px;}
    .pp-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:10px;border:none;font-size:13px;font-family:'Syne',sans-serif;font-weight:700;cursor:pointer;transition:all 0.16s;}
    .pp-btn-primary{background:linear-gradient(135deg,#0D1B2A,#1e3a5f);color:#fff;}
    .pp-btn-primary:hover{box-shadow:0 6px 20px rgba(13,27,42,0.3);transform:translateY(-1px);}
    .set-save-banner{background:linear-gradient(135deg,#0D1B2A,#1e3a5f);border-radius:14px;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
    .set-save-txt{color:#fff;font-size:13px;font-weight:700;}
    .set-save-sub{color:rgba(255,255,255,0.5);font-size:11.5px;margin-top:2px;}
  `;
  document.head.appendChild(s);
};

const GROUP_ICONS = { Company:"🏢", Attendance:"📋", Leave:"🗓️", System:"⚙️", Notifications:"🔔" };

export function SettingsPage() {
  injectSetStyles();
  const [grouped, setGrouped] = useState({});
  const [flat, setFlat]       = useState([]);
  const [activeGroup, setActiveGroup] = useState("Company");
  const [changes, setChanges] = useState({});
  const [saved, setSaved]     = useState(false);

  const fetchSettings = async () => {
    try { const r = await axios.get(SET_API); setGrouped(r.data.grouped||{}); setFlat(r.data.flat||[]); }
    catch {}
  };
  useEffect(() => { fetchSettings(); }, []);

  const updateChange = (id, val) => setChanges(p => ({ ...p, [id]: val }));

  const saveAll = async () => {
    const updates = Object.entries(changes).map(([id, setting_val]) => ({ id, setting_val }));
    if (!updates.length) return;
    try {
      await axios.put(SET_API, { updates, updated_by: null });
      setSaved(true); setChanges({});
      fetchSettings();
      setTimeout(() => setSaved(false), 3000);
    } catch { alert("Save failed"); }
  };

  const groups = Object.keys(grouped);
  const currentSettings = grouped[activeGroup] || [];

  const getVal = (setting) => changes[setting.id] !== undefined ? changes[setting.id] : (setting.setting_val || "");
  const isBool = (k) => k.startsWith("notifications_");

  return (
    <div className="set-root">
      <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:20 }}>
        <div>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:3 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#0D1B2A,#1e3a5f)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>⚙️</div>
            <span style={{ fontSize:24,fontWeight:800,color:"#0D1B2A",letterSpacing:"-0.4px" }}>System Settings</span>
          </div>
          <div style={{ fontSize:13,color:"#94A3B8",marginLeft:52 }}>Configure company and system preferences</div>
        </div>
      </div>

      {Object.keys(changes).length > 0 && (
        <div className="set-save-banner">
          <div><div className="set-save-txt">⚠ Unsaved Changes</div><div className="set-save-sub">{Object.keys(changes).length} setting(s) modified</div></div>
          <button className="pp-btn" style={{ background:"#38BDF8",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13 }} onClick={saveAll}>💾 Save All Changes</button>
        </div>
      )}
      {saved && (
        <div style={{ background:"#D1FAE5",border:"1px solid #BBF7D0",borderRadius:12,padding:"12px 18px",marginBottom:14,fontSize:13,fontWeight:700,color:"#065F46",display:"flex",alignItems:"center",gap:8 }}>
          ✓ Settings saved successfully!
        </div>
      )}

      <div className="set-grid">
        {/* Nav */}
        <div className="set-sidebar">
          {groups.map(g => (
            <div key={g} className={`set-nav-item${activeGroup===g?" active":""}`} onClick={()=>setActiveGroup(g)}>
              <span>{GROUP_ICONS[g]||"⚙️"}</span>{g}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="set-card">
          <div className="set-card-header">
            <span className="set-card-title">{GROUP_ICONS[activeGroup]||"⚙️"} {activeGroup} Settings</span>
            <button className="pp-btn pp-btn-primary" onClick={saveAll} disabled={!Object.keys(changes).length}>💾 Save</button>
          </div>
          <div className="set-card-body">
            {currentSettings.map(setting => (
              <div key={setting.id} className="set-field">
                <div className="set-field-info">
                  <div className="set-field-label">{setting.setting_key.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</div>
                  {setting.description && <div className="set-field-desc">{setting.description}</div>}
                </div>
                {isBool(setting.setting_key) ? (
                  <button className={`set-toggle ${getVal(setting)==="1"?"on":"off"}`}
                    onClick={() => updateChange(setting.id, getVal(setting)==="1"?"0":"1")} />
                ) : (
                  <input className="set-input" value={getVal(setting)}
                    onChange={e => updateChange(setting.id, e.target.value)}
                    placeholder={`Enter ${setting.setting_key}`} />
                )}
              </div>
            ))}
            {currentSettings.length === 0 && <div style={{ color:"#94A3B8",fontSize:13,textAlign:"center",padding:"30px 0" }}>No settings in this group.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
export default SettingsPage;
