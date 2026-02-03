import React, { useEffect, useState } from "react";
import axios from "axios";
import userImg from "../src/assets/user.png";

const API = "http://localhost:5000/api/auth";

export default function ProfilePage() {
  const [user, setUser] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
    photo: "",
    emailVerified: false,
  });
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  // ====== FETCH USER ======
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser({
          ...res.data,
          emailVerified: res.data.email_verified,
        });
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };
    fetchUser();
  }, []);

  // ====== HANDLE FIELD CHANGES ======
  const handleChange = (e) => setUser({ ...user, [e.target.name]: e.target.value });

 const handlePhotoChange = (e) => {
  if (e.target.files && e.target.files[0]) {
    setSelectedPhoto(e.target.files[0]);
    setUser({
      ...user,
      photo: URL.createObjectURL(e.target.files[0]), 
    });
  }
};

  // ====== UPDATE PROFILE ======
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("name", user.name);
      formData.append("password", user.password);
      if (selectedPhoto) formData.append("photo", selectedPhoto);

      // Only send email if verified
      if (user.emailVerified) formData.append("email", user.email);

      const res = await axios.put(`${API}/update`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setUser({ ...res.data, emailVerified: res.data.email_verified });
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", err);
      alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // ====== SEND EMAIL OTP ======
  const sendEmailOtp = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/send-otp`,
        { value: user.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVerifyingEmail(true);
      alert("OTP sent to your email!");
    } catch (err) {
      console.error("SEND OTP ERROR:", err);
      alert("Failed to send OTP");
    }
  };

  // ====== VERIFY EMAIL OTP ======
  const verifyEmailOtp = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API}/verify-otp`,
        { otp },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.verified) {
        setUser({ ...user, emailVerified: true });
        setVerifyingEmail(false);
        setOtp("");
        alert("Email verified successfully!");
      } else {
        alert("Invalid OTP");
      }
    } catch (err) {
      console.error("VERIFY OTP ERROR:", err);
      alert("Failed to verify OTP");
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "20px", color: "#163061" }}>
        My Profile
      </h1>

      <div style={{
        display: "flex", gap: "40px", flexWrap: "wrap",
        background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)",
        padding: "25px", borderRadius: "16px", boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
      }}>
        {/* PROFILE PHOTO */}
        <div style={{ flex: "0 0 180px", textAlign: "center" }}>
          <img
             src={user.photo ? `http://localhost:5000/uploads/photos/${user.photo}` : userImg}
            alt="Profile"
            style={{
              width: "150px", height: "150px", borderRadius: "50%",
              objectFit: "cover", marginBottom: "15px", border: "3px solid #38bdf8",
            }}
          />
          <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ marginTop: "10px" }} />
        </div>

        {/* PROFILE FORM */}
        <form onSubmit={handleSubmit} style={{ flex: "1 1 400px", display: "flex", flexDirection: "column", gap: "15px" }}>
          {/* Name */}
          <input
            name="name" value={user.name} onChange={handleChange} placeholder="Full Name"
            style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc" }} required
          />

          {/* Email */}
          <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            <input
              name="email" type="email" value={user.email} onChange={handleChange} placeholder="Email"
              style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ccc" }} required
              disabled={user.emailVerified} // cannot edit if verified
            />
            {!user.emailVerified && (
              <button type="button" onClick={sendEmailOtp} style={{ padding: "8px 12px" }}>
                Send OTP
              </button>
            )}
            <span style={{ color: user.emailVerified ? "#4CAF50" : "#FF7043", fontWeight: "600" }}>
              {user.emailVerified ? "Verified" : "Not Verified"}
            </span>
          </div>

          {/* OTP INPUT */}
          {verifyingEmail && (
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter Email OTP"
                style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ccc" }}
              />
              <button type="button" onClick={verifyEmailOtp} style={{ padding: "8px 12px" }}>Verify</button>
            </div>
          )}

          {/* Password */}
          <input
            name="password" type="password" value={user.password} onChange={handleChange}
            placeholder="Password (leave blank to keep current)"
            style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc" }}
          />

          {/* SUBMIT */}
          <button type="submit" disabled={loading} style={{
            padding: "12px", borderRadius: "10px", background: "#75bfec",
            color: "#fff", fontWeight: "600", cursor: "pointer", marginTop: "10px"
          }}>
            {loading ? "Saving..." : "Update Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
