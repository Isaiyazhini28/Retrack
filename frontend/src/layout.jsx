import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaTachometerAlt,
  FaUser,
  FaCog,
  FaCalendarAlt,
  FaChartBar,
  FaSignOutAlt,
  FaClipboardList,
} from "react-icons/fa";
import logo from "./assets/logo.jpg";      
import userImg from "./assets/user.png";  

export default function Layout({ children }) {
  const navigate = useNavigate();


const [user, setUser] = useState({ name: "", photo: "" });
  const sidebarWidth = 220;
  const topbarHeight = 60;
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch("http://localhost:5000/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error("Failed to fetch user");
      }
    };

    fetchUser();
  }, []);


  return (
    <div
     style={{
  display: "flex",               
  width: "100vw",                
  height: "100vh",              
  overflow: "hidden",           
  fontFamily: "'Jazz Script 3', cursive", 
  background: " #FCF9EA",   
  backgroundSize: "cover",       
  backgroundPosition: "center",  
  backgroundRepeat: "no-repeat", 
}}
    >
     

      {/* Sidebar */}
      <div
        style={{
          width: `${sidebarWidth}px`,
          height: "100vh",
          background: "#1d2951",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          position: "fixed", // always static
          left: 0,
          top: 0,
        }}
      >
       {/* LOGO */}
<img
  src={logo}
  alt="App Logo"
  style={{
    width: "120px",
    margin: "20px auto 10px",
    display: "block",
  }}
/>
{/* USER INFO */}
<div
  style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "25px",
  }}
>
  <img
    src={
      user.photo
        ? `http://localhost:5000/uploads/photos/${user.photo}`
        : userImg
    }
    alt="User"
    style={{
      width: "75px",
      height: "75px",
      borderRadius: "50%",
      objectFit: "cover",
      border: "3px solid #38bdf8",
    }}
  />

  <span
    style={{
      marginTop: "10px",
      fontWeight: "600",
      fontSize: "15px",
      letterSpacing: "0.5px",
    }}
  >
    {user.name || "Loading..."}
  </span>
</div>
<SidebarItem
  icon={<FaTachometerAlt />}
  label="Dashboard"
  onClick={() => navigate("/dashboard")}
/>
        <SidebarItem icon={<FaUser />} label="Profile" onClick={() => navigate("/profile-page")}/>
        <SidebarItem icon={<FaCog />} label="Settings" />
        <SidebarItem icon={<FaCalendarAlt />} label="Calendar" />
        <SidebarItem icon={<FaChartBar />} label="Display Board" />
        <SidebarItem icon={<FaClipboardList/>} label="Attendance" />
      </div>

      
      <div
        style={{
          marginLeft: `${sidebarWidth}px`, 
          marginTop: `${topbarHeight}px`,  
          width: `calc(100vw - ${sidebarWidth}px)`,
          height: `calc(100vh - ${topbarHeight}px)`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Top bar */}
        
<div
  style={{
    position: "fixed",
    left: `${sidebarWidth}px`,
    top: 0,
    width: `calc(100vw - ${sidebarWidth}px)`,
    height: `${topbarHeight}px`,
    background: "#163061",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingRight: "15px",
    zIndex: 1000,
  }}
>
  <button
    style={{
   width: "45px", 
   height: "45px",
    borderRadius: "50%", 
    border: "#000", 
    background: "#fff", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    cursor: "pointer", 
    fontSize: "14px",
     marginRight: "10px", // ← extra space from right/topbar edge 
     marginTop: "5px",  
     marginBottom:"5px",
    }}
    onClick={() => {
      localStorage.removeItem("token");
      navigate("/login");
    }}
  >
    <FaSignOutAlt />
  </button>
</div>



        {/* Dashboard / children */}
        <div
          style={{
            flex: 1,
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
             // static content, no scroll
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
function SidebarItem({ icon, label,onClick }) {
  return (
    <div
     onClick={onClick} 
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "15px 20px",
        cursor: "pointer",
        transition: "0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "FA8112")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}































