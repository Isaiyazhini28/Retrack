import React, { useState,useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import bgImage from "./assets/bg.webp";
import bgImage1 from "./assets/bg1.jpg";
import logo from "./assets/register.png";   
import logo1 from "./assets/login.png"; 
import card1 from "./assets/card1.webp";
import card2 from "./assets/card2.png";
import card3 from "./assets/card3.jpg";
import card4 from "./assets/card4.jpg";
import card5 from "./assets/card5.avif";
import card6 from "./assets/card6.avif";
import card7 from "./assets/card7.avif";
import Layout from "./layout.jsx";
import RecruitmentManagerPage from "../src/dashboard/RecruitmentManagerPage.jsx";
import ProfilePage from "../sidebar/profilepage.jsx";
import ForgotPasswordModal from "../src/ForgotPasswordModal.jsx";

/* ================= VALIDATION ================= */
const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
const validatePassword = (password) => password.length >= 6;

/* ================= DASHBOARD DATA ================= */
const dashboardCards = [
  { title: "RECRUITMENT MANAGER", route: "/recruitment-manager", image: card1 },
  { title: "ONBOARDING MANAGER", route: "/page2", image: card2 },
  { title: "OFFBOARDING MANAGER", route: "/page3", image: card3 },
  // { title: "ATTENDANCE", route: "/page4", image: card4 },
  { title: "EMPLOYEE MANAGER", route: "/page5", image: card5 },
  { title: "ROLE & DEPT MANAGER", route: "/page6", image: card6 },
  { title: "USER MANAGER", route: "/page7", image: card7 },
];
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});


/* ================= STYLES ================= */
const styles = {
  page: {
    position: "fixed",   // 🔒 locks page
  inset: 0,            // top:0 left:0 right:0 bottom:0
  backgroundImage: `url(${bgImage})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  overflow: "hidden",  // 🔒 no scroll
  },

  cardContainer: {
       width: "1100px",      // increase width
  height: "650px",      // increase height
  minWidth: "1100px",   
  minHeight: "650px",
  display: "flex",
  alignItems: "stretch",
  borderRadius: "25px", // slightly bigger corners
  overflow: "hidden",
  boxShadow: "0 25px 60px rgba(0,0,0,0.5)", 
  },

  formCard: {
       flex: 1,
  background: "rgba(255,255,255,0.5)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  padding: "50px",   // bigger padding
  position: "relative", 
  },

  imageCard: {
     flex: 1,
  width: "50%",
  height: "100%",      
  backgroundImage: `url(${bgImage1})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  },

  title: {
    fontSize: "30px",
    fontWeight: "bold",
    marginBottom: "20px",
  },

  input: {
    width: "80%",
    padding: "12px",
    margin: "10px 0",
    borderRadius: "8px",
    border: "1px solid #aaa",
    color: "#000",
    fontSize: "16px",
  },

  buttonWrapper: {
    width: "85%",
    marginTop: "20px",
    background: "#000",
    padding: "2px",
    borderRadius: "10px",
  },

  button: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "8px",
    background: "#75bfec",
    fontWeight: "bold",
    color:"#fff",
    cursor: "pointer",
  },

  error: {
    color: "red",
    marginBottom: "10px",
  },

  // dashboardPage: {
  //   position: "fixed",
  //   inset: 0,
  //   backgroundImage: `url(${bgImage})`,
  //   backgroundSize: "cover",
  //   display: "flex",
  //   flexDirection: "column",
  //   alignItems: "center",
  //   justifyContent: "center",
  //   fontFamily: "Times New Roman", 
  // },

  cardGrid: {
    display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", // responsive
  gap: "40px", // space between cards
  width: "90%", // horizontal padding from edges
  maxWidth: "1400px",
  margin: "0 auto", // center the grid
  paddingTop: "20px", // top spacing
  paddingBottom: "40px", 
  
  },

  dashCard: {
    width: "350px",
    height: "250px",
    borderRadius: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize:"30px",
    fontWeight: "bold",
    textAlign: "center",
    cursor: "pointer",
    backgroundSize: "cover",
    backgroundPosition: "center",
    transition: "transform 0.2s",
    marginLeft: "30px",
  },

  logoutBtn: {
    position: "absolute",
    top: "20px",
    right: "30px",
    width: "45px",
    height: "45px",
    borderRadius: "50%",
    background: "rgba(0,0,0,0.6)",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },
  logo: {
    width: "100px",
  height: "100px",
  borderRadius: "50%",   // round shape
  objectFit: "cover",
  marginTop: "0px",      // aligns at the top of the card
  marginBottom: "20px",  // space between logo and title
  border: "3px solid #fff", // 
},


forgot_password :{
  position: "absolute",
  top: "10px",  
  right: "0px",  
  color: "#0984e3",
  cursor:" pointer",
  text_decoration: "underline",
  font_size: "14px",
},


};
/* ================= AUTHPAGE ================= */
// function AuthPage() {
//   const [showRegister, setShowRegister] = useState(true);

//   return (
//     <div
//       style={{
//         position: "fixed",
//         inset: 0,
//         backgroundImage: `url(${bgImage})`,
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//         overflow: "hidden",
//       }}
//     >
//       {/* 🔥 BLUR ONLY BACKGROUND */}
//         <div
//     style={{
//       position: "absolute",
//       inset: 0,
//       backdropFilter: "blur(16px)",
//       WebkitBackdropFilter: "blur(16px)",
//       maskImage:
//         "radial-gradient(circle at center, transparent 35%, black 70%)",
//       WebkitMaskImage:
//         "radial-gradient(circle at center, transparent 35%, black 70%)",
//       background: "rgba(0,0,0,0.25)",
//       zIndex: 1,
//     }}
//   />

//       {/* 🔥 AUTH CARD (CLEAR) */}
//       <div
//         style={{
//           position: "relative",
//           zIndex: 2,
//           display: "flex",
//           justifyContent: "center",
//           alignItems: "center",
//           height: "100vh",
//         }}
//       >
//         <div style={styles.cardContainer}>
//           <AnimatePresence mode="wait">
//             {showRegister ? (
//               <motion.div
//                 key="register"
//                 initial={{ opacity: 0, y: -60 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: 60 }}
//                 transition={{ type: "spring", stiffness: 120, damping: 18 }}
//                 style={{ display: "flex", width: "100%" }}
//               >
//                 <Register switchToLogin={() => setShowRegister(false)} />
//               </motion.div>
//             ) : (
//               <motion.div
//                 key="login"
//                 initial={{ opacity: 0, y: -60 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: 60 }}
//                 transition={{ type: "spring", stiffness: 120, damping: 18 }}
//                 style={{ display: "flex", width: "100%" }}
//               >
//                 <Login switchToRegister={() => setShowRegister(true)} />
//               </motion.div>
//             )}
//           </AnimatePresence>
//         </div>
//       </div>
//     </div>
//   );
// }



/* ================= REGISTER ================= */
 function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("password", password);
      if (photo) formData.append("photo", photo);

      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      alert("Registration successful! Please login.");
      navigate("/login");
    } catch {
      setError("Server not responding");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          background: "rgba(0,0,0,0.25)",
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div style={styles.cardContainer}>
          <motion.div
            key="register"
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            style={{ display: "flex", width: "100%" }}
          >
            <div style={styles.formCard}>
              <img src={bgImage1} alt="Register Logo" style={styles.logo} />

              {error && <div style={styles.error}>{error}</div>}

              <input
                style={styles.input}
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                style={styles.input}
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                style={styles.input}
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files[0])}
                 style={{
    width: "80%",         // same width as other inputs
    padding: "12px",      // same padding
    margin: "10px 0",
    borderRadius: "8px",
    border: "1px solid #aaa",
    fontSize: "16px",
    cursor: "pointer",
  }}
              />

              <div style={styles.buttonWrapper}>
                <button style={styles.button} onClick={submit}>
                  Continue
                </button>
              </div>

              <p style={{ marginTop: "15px" }}>
                Already have an account?{" "}
                <span
                  style={{ color: "#0984e3", cursor: "pointer", fontWeight: 600 }}
                  onClick={() => navigate("/login")}
                >
                  Login
                </span>
              </p>
            </div>

            <div style={styles.imageCard}></div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}


/* ================= LOGIN ================= */
 function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);


  const login = async () => {
    setError("");

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } catch {
      setError("Server not responding");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          background: "rgba(0,0,0,0.25)",
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div style={styles.cardContainer}>
          <motion.div
            key="login"
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            style={{ display: "flex", width: "100%" }}
          >
            {/* Login Form */}
            <div style={styles.formCard}>
              <img src={bgImage1} alt="Login Logo" style={styles.logo} />

              {error && <div style={styles.error}>{error}</div>}

              <input
                style={styles.input}
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                style={styles.input}
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <div style={styles.buttonWrapper}>
                <button style={styles.button} onClick={login}>
                  Login
                </button>
              </div>
              <div style={{ marginTop: "15px", width: "80%", textAlign: "right" }}>
              <span
                style={{ color: "#0984e3", cursor: "pointer", textDecoration: "underline",fontWeight: 600 }}
                onClick={() => setShowForgot(true)}
              >
              Forget Password
              </span>
              </div>

              {showForgot && <ForgotPasswordModal close={() => setShowForgot(false)} />}

              <p style={{ marginTop: "15px", color: "#000" }}>
                Don’t have an account?{" "}
                <span
                  style={{
                    color: "#0984e3",
                    cursor: "pointer",
                    fontWeight: 600,
                    textDecoration: "underline",
                  }}
                  onClick={() => navigate("/register")}
                >
                  Register
                </span>
              </p>
              


            </div>

            <div style={styles.imageCard}></div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}


/* ================= DASHBOARD ================= */
function Dashboard() {
  const navigate = useNavigate();

  return (
    <div style={{ flex: 1, padding: "20px" }}>
      <h1
        style={{
          color: "#163061",
          fontSize: "64px",
          marginTop: "30px",
          fontWeight: "700",
          textAlign: "center",
          
        }}
      >
        DASHBOARD
      </h1>

      <div style={styles.cardGrid}>
        {dashboardCards.map((c, i) => (
          <motion.div
            key={i}
            style={{
              ...styles.dashCard,
              backgroundImage: `linear-gradient(rgba(0,0,0,.6),rgba(0,0,0,.6)),url(${c.image})`,
            }}
            whileHover={{ scale: 1.05,
              color: "#e7feff",        
              textDecoration: "underline" }}
            onClick={() => navigate(c.route)}
          >
            {c.title}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ================= PRIVATE ================= */
const PrivateRoute = ({ children }) =>
  localStorage.getItem("token") ? children : <Navigate to="/" />;


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/dashboard" element={
    <PrivateRoute>
      <Layout><Dashboard /></Layout>
    </PrivateRoute>
  }/>
  <Route
  path="/recruitment-manager"
  element={
    <PrivateRoute>
      <Layout>
        <RecruitmentManagerPage />
      </Layout>
    </PrivateRoute>
  }
/>
  <Route
  path="/profile-page"
  element={
    <PrivateRoute>
      <Layout>
        <ProfilePage />
      </Layout>
    </PrivateRoute>
  }
/>
  <Route path="/" element={<Navigate to="/login" />} />
</Routes>
    </BrowserRouter>
  );
}
