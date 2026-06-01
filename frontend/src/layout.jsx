// layout.jsx — Professional Sidebar + Topbar
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaTachometerAlt, FaUser, FaCog, FaCalendarAlt,
  FaChartBar, FaSignOutAlt, FaClipboardList,
  FaBell, FaUsersCog, FaExclamationTriangle,
  FaBuilding, FaAngleDown, FaCircle,
} from "react-icons/fa";
import logo    from "./assets/logo.png";
import userImg from "./assets/user.png";

const injectLayoutStyles = () => {
  if (document.getElementById("layout-css")) return;
  const s = document.createElement("style");
  s.id = "layout-css";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: 'Syne', sans-serif; }

    .ly-sidebar {
      width: 240px; height: 100vh;
      background: linear-gradient(180deg, #0A1628 0%, #0D1B2A 60%, #0A1628 100%);
      display: flex; flex-direction: column;
      position: fixed; left: 0; top: 0;
      border-right: 1px solid rgba(255,255,255,0.05);
      z-index: 200;
      box-shadow: 4px 0 24px rgba(0,0,0,0.3);
    }
    .ly-logo-wrap {
      padding: 20px 20px 16px;
      display: flex; align-items: center; justify-content: center;
      border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
    }
    .ly-logo-wrap img { width: 100px; }
    .ly-user-wrap {
      display: flex; align-items: center; gap: 12px; padding: 14px 18px;
      border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
    }
    .ly-avatar {
      width: 42px; height: 42px; border-radius: 50%; object-fit: cover; flex-shrink: 0;
      border: 2px solid #38BDF8; box-shadow: 0 0 0 3px rgba(56,189,248,0.15);
    }
    .ly-user-info { min-width: 0; }
    .ly-user-name { font-weight: 700; font-size: 13px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ly-user-role { font-size: 10.5px; color: rgba(255,255,255,0.35); margin-top: 2px; letter-spacing: 0.3px; }

    .ly-nav { flex: 1; overflow-y: auto; padding: 8px 0; scrollbar-width: none; }
    .ly-nav::-webkit-scrollbar { display: none; }
    .ly-nav-section { padding: 12px 18px 4px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; color: rgba(255,255,255,0.2); text-transform: uppercase; }

    .ly-nav-item {
      display: flex; align-items: center; gap: 11px; padding: 10px 18px; cursor: pointer;
      color: rgba(255,255,255,0.5); font-size: 13px; font-weight: 600;
      transition: all 0.16s; border-left: 3px solid transparent; user-select: none;
    }
    .ly-nav-item:hover { background: rgba(56,189,248,0.08); color: #fff; border-left-color: rgba(56,189,248,0.4); }
    .ly-nav-item.active { background: rgba(56,189,248,0.14); color: #38BDF8; border-left-color: #38BDF8; }
    .ly-nav-icon { font-size: 14px; flex-shrink: 0; width: 16px; }
    .ly-nav-label { flex: 1; }
    .ly-nav-badge { background: #EF4444; color: #fff; border-radius: 10px; font-size: 9px; font-weight: 800; padding: 1px 6px; }
    .ly-nav-chevron { font-size: 10px; transition: transform 0.22s; flex-shrink: 0; }
    .ly-nav-chevron.open { transform: rotate(0deg); }
    .ly-nav-chevron.closed { transform: rotate(-90deg); }

    .ly-sub-wrap { overflow: hidden; transition: max-height 0.25s ease; }
    .ly-sub-item {
      display: flex; align-items: center; gap: 10px; padding: 8px 18px 8px 46px; cursor: pointer;
      color: rgba(255,255,255,0.38); font-size: 12px; font-weight: 600;
      transition: all 0.15s; border-left: 3px solid transparent;
    }
    .ly-sub-item:hover { background: rgba(56,189,248,0.06); color: rgba(255,255,255,0.7); border-left-color: rgba(56,189,248,0.2); }
    .ly-sub-item.active { color: #38BDF8; background: rgba(56,189,248,0.09); border-left-color: #38BDF8; }
    .ly-sub-dot { font-size: 6px; flex-shrink: 0; }

    .ly-sidebar-footer { padding: 12px 18px; border-top: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; }
    .ly-footer-txt { font-size: 10px; color: rgba(255,255,255,0.15); letter-spacing: 0.5px; text-align: center; }

    .ly-topbar {
      position: fixed; left: 240px; top: 0; width: calc(100vw - 240px); height: 58px;
      background: #0D1B2A; border-bottom: 1px solid rgba(255,255,255,0.07);
      display: flex; align-items: center; justify-content: space-between; padding: 0 24px; z-index: 100;
    }
    .ly-topbar-left { display: flex; flex-direction: column; }
    .ly-topbar-title { font-size: 15px; font-weight: 800; color: #fff; letter-spacing: 0.3px; }
    .ly-topbar-crumb { font-size: 10px; color: rgba(255,255,255,0.28); }
    .ly-topbar-right { display: flex; align-items: center; gap: 10px; }
    .ly-topbar-badge { background: rgba(56,189,248,0.12); color: #38BDF8; border: 1px solid rgba(56,189,248,0.25); border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 700; }
    .ly-icon-btn { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.55); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; transition: all 0.18s; position: relative; }
    .ly-icon-btn:hover { background: rgba(56,189,248,0.12); color: #38BDF8; }
    .ly-notif-dot { position: absolute; top: 6px; right: 6px; width: 7px; height: 7px; border-radius: 50%; background: #EF4444; border: 1.5px solid #0D1B2A; }
    .ly-logout-btn { width: 36px; height: 36px; border-radius: 10px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #EF4444; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; transition: all 0.18s; }
    .ly-logout-btn:hover { background: #EF4444; color: #fff; }

    .ly-content {
      margin-left: 240px; margin-top: 58px; width: calc(100vw - 240px);
      height: calc(100vh - 58px); display: flex; flex-direction: column;
      overflow: hidden; background: #F0F4F8;
    }
  `;
  document.head.appendChild(s);
};

const NAV = [
  { section: "MAIN", items: [
    { icon: <FaTachometerAlt />, label: "Dashboard", path: "/dashboard" },
    { icon: <FaUser />,          label: "Profile",   path: "/profile-page" },
  ]},
  { section: "HR MODULES", items: [
    { icon: <FaUsersCog />, label: "HR Managers", path: null,
      children: [
        { label: "Recruitment",  path: "/recruitment-manager" },
        { label: "Onboarding",   path: "/onboarding-manager"  },
        { label: "Offboarding",  path: "/offboarding-manager" },
        { label: "Leave Manager",path: "/leave-manager"       },
        { label: "Task Manager", path: "/task-manager"        },
      ],
    },
    { icon: <FaBuilding />,           label: "User Manager",  path: "/user-manager"      },
    { icon: <FaExclamationTriangle />, label: "Complaints",   path: "/complaint-manager" },
  ]},
  { section: "TOOLS", items: [
    { icon: <FaCalendarAlt />,   label: "Calendar",      path: "/calendar"      },
    { icon: <FaClipboardList />, label: "Attendance",    path: "/attendance"    },
    { icon: <FaChartBar />,      label: "Display Board", path: "/display-board" },
  ]},
  { section: "SYSTEM", items: [
    { icon: <FaCog />, label: "Settings", path: "/settings" },
  ]},
];

const PATH_LABELS = {
  "/dashboard":"/Dashboard", "/profile-page":"/Profile",
  "/recruitment-manager":"/HR Managers/Recruitment",
  "/onboarding-manager":"/HR Managers/Onboarding",
  "/offboarding-manager":"/HR Managers/Offboarding",
  "/leave-manager":"/HR Managers/Leave",
  "/task-manager":"/HR Managers/Tasks",
  "/user-manager":"/User Manager",
  "/complaint-manager":"/Complaints",
  "/calendar":"/Calendar", "/attendance":"/Attendance",
  "/display-board":"/Display Board", "/settings":"/Settings",
};

export default function Layout({ children }) {
  injectLayoutStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser]   = useState({ name:"", photo:"", role:"HR Manager" });
  const [open, setOpen]   = useState({ "HR Managers": true });

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res   = await fetch("http://localhost:5000/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
        const data  = await res.json();
        setUser({ ...data, role: data.role || "HR Manager" });
      } catch {}
    })();
  }, []);

  const isActive = (path) => path && location.pathname === path;
  const toggle   = (label) => setOpen(p => ({ ...p, [label]: !p[label] }));

  const crumb = PATH_LABELS[location.pathname] || `/${location.pathname.split("/").pop()}`;
  const title = crumb.split("/").pop();

  return (
    <div style={{ display:"flex", width:"100vw", height:"100vh", overflow:"hidden" }}>
      {/* SIDEBAR */}
      <div className="ly-sidebar">
        <div className="ly-logo-wrap"><img src={logo} alt="Logo" /></div>
        <div className="ly-user-wrap">
          <img src={user.photo ? `http://localhost:5000/uploads/photos/${user.photo}` : userImg} alt="User" className="ly-avatar" />
          <div className="ly-user-info">
            <div className="ly-user-name">{user.name || "Loading…"}</div>
            <div className="ly-user-role">{user.role}</div>
          </div>
        </div>

        <nav className="ly-nav">
          {NAV.map(group => (
            <div key={group.section}>
              <div className="ly-nav-section">{group.section}</div>
              {group.items.map(item => (
                <div key={item.label}>
                  <div className={`ly-nav-item${isActive(item.path) ? " active" : ""}`}
                    onClick={() => { if (item.children) toggle(item.label); else if (item.path) navigate(item.path); }}>
                    <span className="ly-nav-icon">{item.icon}</span>
                    <span className="ly-nav-label">{item.label}</span>
                    {item.badge && <span className="ly-nav-badge">{item.badge}</span>}
                    {item.children && <FaAngleDown className={`ly-nav-chevron ${open[item.label] ? "open" : "closed"}`} />}
                  </div>
                  {item.children && open[item.label] && (
                    <div className="ly-sub-wrap">
                      {item.children.map(sub => (
                        <div key={sub.label} className={`ly-sub-item${isActive(sub.path) ? " active" : ""}`}
                          onClick={() => sub.path && navigate(sub.path)}>
                          <FaCircle className="ly-sub-dot" />{sub.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="ly-sidebar-footer">
          <div className="ly-footer-txt">HR COMMAND CENTER · v2.0</div>
        </div>
      </div>

      {/* TOPBAR */}
      <div className="ly-topbar">
        <div className="ly-topbar-left">
          <div className="ly-topbar-title">{title || "Dashboard"}</div>
          <div className="ly-topbar-crumb">HR Command Center{crumb}</div>
        </div>
        <div className="ly-topbar-right">
          <span className="ly-topbar-badge">{user.name || "User"}</span>
          <button className="ly-icon-btn"><FaBell /><div className="ly-notif-dot" /></button>
          <button className="ly-logout-btn" onClick={() => { localStorage.removeItem("token"); navigate("/login"); }}><FaSignOutAlt /></button>
        </div>
      </div>

      <div className="ly-content">{children}</div>
    </div>
  );
}