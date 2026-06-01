// App.jsx — full with all sidebar module routes
import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { Toaster } from "react-hot-toast";

import bgImage  from "./assets/bg.webp";
import bgImage1 from "./assets/bg1.jpg";
import card1 from "./assets/card1.webp";
import card2 from "./assets/card2.png";
import card3 from "./assets/card3.jpg";
import card5 from "./assets/card5.avif";
import card6 from "./assets/card6.avif";
import card7 from "./assets/card7.avif";

import Layout                 from "./layout.jsx";
import ProfilePage            from "../sidebar/profilepage.jsx";
import ForgotPasswordModal    from "../src/ForgotPasswordModal.jsx";
import RecruitmentManagerPage from "./dashboard/RecruitmentManagerPage.jsx";
import OnboardingPage         from "./dashboard/OnboardingManagerPage.jsx";
import OffboardingManagerPage from "./dashboard/OffboardingManagerPage.jsx";
import LeaveManagerPage       from "./dashboard/LeaveManagerPage.jsx";
import TaskManagerPage        from "./dashboard/TaskManagerPage.jsx";
import UserManagerPage        from "./dashboard/UserManagerPage.jsx";
import ComplaintManagerPage   from "./dashboard/ComplaintManagerPage.jsx";

// Sidebar module pages — split from sidebar_pages.jsx or keep in same file
import { CalendarPage }     from "../sidebar/CalendarPage.jsx";
import { AttendancePage }   from "../sidebar/AttendancePage.jsx";
import { DisplayBoardPage } from "../sidebar/DisplayBoardPage.jsx";
import { SettingsPage }     from "../sidebar/SettingsPage.jsx";

/* ─── VALIDATION ─── */
const registerSchema = z.object({
  employeeId: z.string().min(6, "Employee ID required"),
  name:       z.string().min(2, "Name must be at least 2 characters"),
  email:      z.string().email("Invalid email"),
  password:   z.string().min(6, "Password must be at least 6 characters"),
});
const loginSchema = z.object({
  email:    z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/* ─── DASHBOARD CARDS ─── */
const dashboardCards = [
  { title:"RECRUITMENT MANAGER",  route:"/recruitment-manager",  image:card1, icon:"🎯", color:"#38BDF8" },
  { title:"ONBOARDING MANAGER",   route:"/onboarding-manager",   image:card2, icon:"🚀", color:"#10B981" },
  { title:"OFFBOARDING MANAGER",  route:"/offboarding-manager",  image:card3, icon:"🚪", color:"#F59E0B" },
  { title:"LEAVE MANAGER",        route:"/leave-manager",        image:card5, icon:"🗓️", color:"#7C3AED" },
  { title:"TASK MANAGER",         route:"/task-manager",         image:card6, icon:"⚡", color:"#EC4899" },
  { title:"USER MANAGER",         route:"/user-manager",         image:card7, icon:"👥", color:"#14B8A6" },
  { title:"COMPLAINT MANAGER",    route:"/complaint-manager",    image:card7, icon:"📣", color:"#EF4444" },
];

/* ─── AUTH STYLES ─── */
const injectAuthStyles = () => {
  if (document.getElementById("auth-css")) return;
  const s = document.createElement("style");
  s.id = "auth-css";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
    .auth-page{position:fixed;inset:0;background-size:cover;background-position:center;display:flex;justify-content:center;align-items:center;overflow:hidden;font-family:'Syne',sans-serif;}
    .auth-blur{position:absolute;inset:0;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);background:rgba(0,0,0,0.3);z-index:1;}
    .auth-shell{position:relative;z-index:2;display:flex;width:1060px;height:620px;border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.55);}
    .auth-form-side{flex:1;background:rgba(255,255,255,0.97);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 52px;}
    .auth-image-side{width:50%;background-size:cover;background-position:center;flex-shrink:0;position:relative;}
    .auth-image-side::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(13,27,42,0.7) 0%,rgba(56,189,248,0.25) 100%);}
    .auth-avatar{width:72px;height:72px;border-radius:50%;object-fit:cover;margin-bottom:18px;border:3px solid #38BDF8;box-shadow:0 0 0 6px rgba(56,189,248,0.12);}
    .auth-heading{font-size:26px;font-weight:800;color:#0D1B2A;margin-bottom:6px;letter-spacing:-0.5px;}
    .auth-sub{font-size:13px;color:#94A3B8;margin-bottom:24px;font-weight:500;}
    .auth-input{width:100%;padding:11px 16px;border:1.5px solid #E2E8F0;border-radius:10px;font-family:'Syne',sans-serif;font-size:13.5px;color:#0D1B2A;background:#F8FAFC;outline:none;transition:border 0.2s,background 0.2s;margin-bottom:12px;}
    .auth-input:focus{border-color:#38BDF8;background:#fff;}
    .auth-input::placeholder{color:#94A3B8;}
    .auth-btn{width:100%;padding:13px;background:linear-gradient(135deg,#0D1B2A,#1e3a5f);color:#fff;border:none;border-radius:10px;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;cursor:pointer;margin-top:6px;transition:all 0.2s;}
    .auth-btn:hover{box-shadow:0 6px 20px rgba(13,27,42,0.35);transform:translateY(-1px);}
    .auth-error{color:#EF4444;font-size:12.5px;font-weight:600;margin-bottom:10px;}
    .auth-switch{font-size:13px;color:#64748B;margin-top:16px;}
    .auth-link{color:#0EA5E9;cursor:pointer;font-weight:700;}
    .auth-forgot{font-size:12.5px;color:#0EA5E9;cursor:pointer;font-weight:600;margin-top:4px;text-align:right;width:100%;}
    .db-page{width:100%;height:100%;overflow-y:auto;padding:28px 30px;font-family:'Syne',sans-serif;}
    .db-page::-webkit-scrollbar{width:5px;}.db-page::-webkit-scrollbar-thumb{background:#E2E8F0;border-radius:3px;}
    .db-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;}
    .db-card{height:195px;border-radius:18px;background-size:cover;background-position:center;display:flex;align-items:flex-end;cursor:pointer;overflow:hidden;position:relative;transition:transform 0.22s,box-shadow 0.22s;box-shadow:0 6px 20px rgba(0,0,0,0.15);}
    .db-card:hover{transform:translateY(-5px) scale(1.01);box-shadow:0 16px 40px rgba(0,0,0,0.25);}
    .db-card-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(13,27,42,0.85) 30%,rgba(0,0,0,0.15) 100%);transition:opacity 0.22s;}
    .db-card:hover .db-card-overlay{opacity:0.92;}
    .db-card-label{position:relative;z-index:1;padding:16px 18px;color:#fff;font-size:14px;font-weight:800;letter-spacing:0.4px;line-height:1.3;}
    .db-card-badge{position:absolute;top:14px;left:14px;z-index:1;width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;}
    .db-card-arrow{position:absolute;right:16px;bottom:16px;z-index:1;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:800;opacity:0;transition:opacity 0.2s;border:1.5px solid rgba(255,255,255,0.4);}
    .db-card:hover .db-card-arrow{opacity:1;}
    @media(max-width:900px){.auth-shell{width:96vw;height:auto;flex-direction:column;}.auth-image-side{display:none;}}
  `;
  document.head.appendChild(s);
};

/* ── REGISTER ── */
function RegisterPage() {
  injectAuthStyles();
  const navigate = useNavigate();
  const [employeeId,setEmployeeId]=useState(""); const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [photo,setPhoto]=useState(null); const [error,setError]=useState("");
  const submit = async (e) => {
    e.preventDefault(); setError("");
    const p = registerSchema.safeParse({employeeId,name,email,password});
    if (!p.success){setError(p.error.issues[0].message);return;}
    try { const fd=new FormData(); fd.append("employeeId",employeeId); fd.append("name",name); fd.append("email",email); fd.append("password",password); if(photo) fd.append("photo",photo);
      const res=await fetch(`${import.meta.env.VITE_API_URL}/auth/register`,{method:"POST",body:fd});
      if(!res.ok){setError(data.message||"Registration failed");return;} alert("Registration successful!"); navigate("/login");
    } catch { setError("Server not responding"); }
  };
  return (
    <div className="auth-page" style={{backgroundImage:`url(${bgImage})`}}>
      <div className="auth-blur"/>
      <motion.div initial={{opacity:0,y:-50}} animate={{opacity:1,y:0}} transition={{type:"spring",stiffness:120,damping:18}} style={{position:"relative",zIndex:2}}>
        <div className="auth-shell">
          <div className="auth-form-side">
            <img src={bgImage1} alt="logo" className="auth-avatar"/>
            <div className="auth-heading">Create Account</div>
            <div className="auth-sub">Register to access the HR platform</div>
            {error&&<div className="auth-error">{error}</div>}
            <input className="auth-input" placeholder="Employee ID" value={employeeId} onChange={e=>setEmployeeId(e.target.value)}/>
            <input className="auth-input" placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)}/>
            <input className="auth-input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
            <input className="auth-input" type="password" placeholder="Password (min 6 chars)" value={password} onChange={e=>setPassword(e.target.value)}/>
            <input type="file" accept="image/*" onChange={e=>setPhoto(e.target.files[0])} style={{width:"100%",padding:"9px 14px",border:"1.5px dashed #E2E8F0",borderRadius:10,fontSize:13,cursor:"pointer",color:"#64748B",background:"#F8FAFC",marginBottom:12}}/>
            <button className="auth-btn" onClick={submit}>Create Account →</button>
            <div className="auth-switch">Already have an account? <span className="auth-link" onClick={()=>navigate("/login")}>Sign In</span></div>
          </div>
          <div className="auth-image-side" style={{backgroundImage:`url(${bgImage1})`}}/>
        </div>
      </motion.div>
    </div>
  );
}

/* ── LOGIN ── */
function LoginPage() {
  injectAuthStyles();
  const navigate=useNavigate(); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [showForgot,setShowForgot]=useState(false);
const login = async () => {
  setError("");

  const p = loginSchema.safeParse({ email, password });

  if (!p.success) {
    setError(p.error.issues[0].message);
    return;
  }

  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      }
    );

    const data = await res.json(); // IMPORTANT

    console.log("LOGIN RESPONSE:", data);

    if (!res.ok) {
      setError(data.message || "Login failed");
      return;
    }

    localStorage.setItem("token", data.token);

    navigate("/dashboard");
  } catch (err) {
    console.error(err);
    setError("Server not responding");
  }
};
  return (
    <div className="auth-page" style={{backgroundImage:`url(${bgImage})`}}>
      <div className="auth-blur"/>
      <motion.div initial={{opacity:0,y:-50}} animate={{opacity:1,y:0}} transition={{type:"spring",stiffness:120,damping:18}} style={{position:"relative",zIndex:2}}>
        <div className="auth-shell">
          <div className="auth-form-side">
            <img src={bgImage1} alt="logo" className="auth-avatar"/>
            <div className="auth-heading">Welcome Back</div>
            <div className="auth-sub">Sign in to your HR Command Center</div>
            {error&&<div className="auth-error">{error}</div>}
            <input className="auth-input" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/>
            <input className="auth-input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/>
            <div className="auth-forgot" onClick={()=>setShowForgot(true)}>Forgot Password?</div>
            <button className="auth-btn" onClick={login}>Sign In →</button>
            <div className="auth-switch">Don't have an account? <span className="auth-link" onClick={()=>navigate("/register")}>Register</span></div>
          </div>
          <div className="auth-image-side" style={{backgroundImage:`url(${bgImage1})`}}/>
        </div>
      </motion.div>
      {showForgot&&<ForgotPasswordModal close={()=>setShowForgot(false)}/>}
    </div>
  );
}

/* ── DASHBOARD ── */
function Dashboard() {
  injectAuthStyles();
  const navigate=useNavigate();
  return (
    <div className="db-page">
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
        <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#0D1B2A,#1e3a5f)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 4px 12px rgba(13,27,42,0.3)"}}>🏢</div>
        <div style={{fontSize:28,fontWeight:800,color:"#0D1B2A",letterSpacing:"-0.5px"}}>Dashboard</div>
      </div>
      <div style={{fontSize:13,color:"#94A3B8",marginBottom:26,marginLeft:52}}>Select a module to get started · {dashboardCards.length} modules available</div>
      <div className="db-grid">
        {dashboardCards.map((c,i)=>(
          <motion.div key={i} className="db-card" style={{backgroundImage:`url(${c.image})`}} onClick={()=>navigate(c.route)}>
            <div className="db-card-overlay"/>
            <div className="db-card-badge" style={{background:`${c.color}22`,border:`1px solid ${c.color}44`}}>{c.icon}</div>
            <div className="db-card-label">{c.title}</div>
            <div className="db-card-arrow" style={{background:`${c.color}33`}}>→</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const PrivateRoute = ({children}) => localStorage.getItem("token") ? children : <Navigate to="/"/>;
const wrap = (Page) => <PrivateRoute><Layout><Page/></Layout></PrivateRoute>;

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right"/>
      <Routes>
        <Route path="/login"    element={<LoginPage/>}/>
        <Route path="/register" element={<RegisterPage/>}/>
        <Route path="/dashboard"           element={<PrivateRoute><Layout><Dashboard/></Layout></PrivateRoute>}/>
        <Route path="/profile-page"        element={<PrivateRoute><Layout><ProfilePage/></Layout></PrivateRoute>}/>
        <Route path="/recruitment-manager" element={<PrivateRoute><Layout><RecruitmentManagerPage/></Layout></PrivateRoute>}/>
        <Route path="/onboarding-manager"  element={<PrivateRoute><Layout><OnboardingPage/></Layout></PrivateRoute>}/>
        <Route path="/offboarding-manager" element={<PrivateRoute><Layout><OffboardingManagerPage/></Layout></PrivateRoute>}/>
        <Route path="/leave-manager"       element={<PrivateRoute><Layout><LeaveManagerPage/></Layout></PrivateRoute>}/>
        <Route path="/task-manager"        element={<PrivateRoute><Layout><TaskManagerPage/></Layout></PrivateRoute>}/>
        <Route path="/user-manager"        element={<PrivateRoute><Layout><UserManagerPage/></Layout></PrivateRoute>}/>
        <Route path="/complaint-manager"   element={<PrivateRoute><Layout><ComplaintManagerPage/></Layout></PrivateRoute>}/>
        <Route path="/calendar"            element={<PrivateRoute><Layout><CalendarPage/></Layout></PrivateRoute>}/>
        <Route path="/attendance"          element={<PrivateRoute><Layout><AttendancePage/></Layout></PrivateRoute>}/>
        <Route path="/display-board"       element={<PrivateRoute><Layout><DisplayBoardPage/></Layout></PrivateRoute>}/>
        <Route path="/settings"            element={<PrivateRoute><Layout><SettingsPage/></Layout></PrivateRoute>}/>
        <Route path="/" element={<Navigate to="/login"/>}/>
      </Routes>
    </BrowserRouter>
  );
}