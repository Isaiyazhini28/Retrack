// profilepage.jsx — Fixed
import React, { useEffect, useState } from "react";
import axios from "axios";
import userImg from "../src/assets/user.png";
import ForgotPasswordModal from "../src/ForgotPasswordModal";
import ChangePasswordModal from "../src/ChangePasswordModal";

const API = "http://localhost:5000/api/auth";

const injectStyles = () => {
  if (document.getElementById("pp-styles")) return;
  const s = document.createElement("style");
  s.id = "pp-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
    .pp-root *, .pp-root *::before, .pp-root *::after {
      box-sizing: border-box; margin: 0; padding: 0; font-family: 'Syne', sans-serif;
    }
    .pp-root {
      --bg: #F0F4F8; --surface: #fff; --border: #E2E8F0;
      --navy: #0D1B2A; --sky: #38BDF8; --green: #10B981;
      --amber: #F59E0B; --red: #EF4444;
      --muted: #94A3B8; --text: #0F172A;
      width: 100%; height: 100%; overflow-y: auto; background: var(--bg);
      padding: 28px 30px 40px;
    }
    .pp-root::-webkit-scrollbar { width: 5px; }
    .pp-root::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    .pp-header { margin-bottom: 24px; display: flex; align-items: flex-end; justify-content: space-between; }
    .pp-header-left { display: flex; align-items: center; gap: 14px; }
    .pp-header-icon { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, var(--navy), #1e3a5f); display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 12px rgba(13,27,42,0.25); }
    .pp-header-title { font-size: 24px; font-weight: 800; color: var(--navy); letter-spacing: -0.4px; }
    .pp-header-sub { font-size: 13px; color: var(--muted); margin-top: 3px; }

    .pp-grid { display: grid; grid-template-columns: 300px 1fr; gap: 22px; align-items: start; }
    @media (max-width: 900px) { .pp-grid { grid-template-columns: 1fr; } }

    .pp-card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .pp-card-header { padding: 18px 22px; border-bottom: 1px solid var(--border); background: linear-gradient(to right, #FAFBFC, var(--surface)); display: flex; align-items: center; justify-content: space-between; }
    .pp-card-title { font-size: 14px; font-weight: 800; color: var(--navy); display: flex; align-items: center; gap: 8px; }
    .pp-card-title::before { content: ''; width: 4px; height: 17px; background: linear-gradient(to bottom, var(--sky), #0EA5E9); border-radius: 2px; }
    .pp-card-body { padding: 22px; }

    .pp-avatar-wrap { width: 100px; height: 100px; border-radius: 50%; position: relative; margin: 0 auto 16px; cursor: pointer; }
    .pp-avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 3px solid var(--sky); box-shadow: 0 0 0 5px rgba(56,189,248,0.14); display: block; }
    .pp-avatar-overlay { position: absolute; inset: 0; border-radius: 50%; background: rgba(13,27,42,0.55); display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.22s; color: #fff; font-size: 11px; font-weight: 700; gap: 3px; }
    .pp-avatar-wrap:hover .pp-avatar-overlay { opacity: 1; }
    .pp-avatar-icon { font-size: 18px; }
    .pp-name { font-size: 17px; font-weight: 800; color: var(--navy); text-align: center; margin-bottom: 3px; }
    .pp-email-txt { font-size: 12px; color: var(--muted); text-align: center; margin-bottom: 14px; }
    .pp-verified-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 20px; font-size: 11.5px; font-weight: 700; }

    .pp-stat-row { display: flex; gap: 10px; margin-top: 18px; }
    .pp-stat { flex: 1; background: #F8FAFC; border: 1px solid var(--border); border-radius: 12px; padding: 12px 10px; text-align: center; }
    .pp-stat-val { font-size: 18px; font-weight: 800; color: var(--navy); }
    .pp-stat-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }

    .pp-field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 700px) { .pp-field-grid { grid-template-columns: 1fr; } }
    .pp-field { display: flex; flex-direction: column; gap: 5px; }
    .pp-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
    .pp-input { padding: 11px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-family: 'Syne', sans-serif; font-size: 13.5px; color: var(--navy); background: #F8FAFC; outline: none; transition: border 0.2s, background 0.2s; }
    .pp-input:focus { border-color: var(--sky); background: #fff; }
    .pp-input:disabled { background: #F1F5F9; color: var(--muted); cursor: not-allowed; border-style: dashed; }
    .pp-input::placeholder { color: var(--muted); }

    .pp-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 20px; border-radius: 10px; border: none; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.18s; }
    .pp-btn-primary { background: linear-gradient(135deg, var(--navy), #1e3a5f); color: #fff; }
    .pp-btn-primary:hover { box-shadow: 0 6px 20px rgba(13,27,42,0.3); transform: translateY(-1px); }
    .pp-btn-sky { background: linear-gradient(135deg, #0EA5E9, var(--sky)); color: #fff; }
    .pp-btn-sky:hover { box-shadow: 0 6px 16px rgba(56,189,248,0.35); transform: translateY(-1px); }
    .pp-btn-green { background: linear-gradient(135deg, #059669, var(--green)); color: #fff; }
    .pp-btn-outline { background: transparent; color: var(--muted); border: 1.5px solid var(--border); }
    .pp-btn-outline:hover { border-color: #CBD5E1; color: #64748B; }

    .pp-security-item { background: #F8FAFC; border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .pp-security-item + .pp-security-item { margin-top: 12px; }
    .pp-security-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
    .pp-security-info { flex: 1; }
    .pp-security-title { font-size: 14px; font-weight: 700; color: var(--navy); margin-bottom: 2px; }
    .pp-security-sub { font-size: 12px; color: var(--muted); }

    .pp-otp-row { display: flex; gap: 8px; align-items: center; margin-top: 12px; flex-wrap: wrap; }
    .pp-otp-input { padding: 9px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-family: 'Syne', sans-serif; font-size: 13px; color: var(--navy); background: #fff; outline: none; transition: border 0.2s; width: 160px; letter-spacing: 2px; }
    .pp-otp-input:focus { border-color: var(--sky); }

    .pp-msg-error { background: #FEF2F2; border: 1px solid #FECACA; color: #B91C1C; border-radius: 8px; padding: 9px 13px; font-size: 12.5px; font-weight: 600; margin-bottom: 14px; }
    .pp-msg-success { background: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D; border-radius: 8px; padding: 9px 13px; font-size: 12.5px; font-weight: 600; margin-bottom: 14px; }

    .pp-divider { height: 1px; background: var(--border); margin: 20px 0; }

    .pp-change-photo-btn { padding: 8px 18px; border-radius: 9px; background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.25); color: var(--sky); font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.18s; }
    .pp-change-photo-btn:hover { background: rgba(56,189,248,0.18); }
  `;
  document.head.appendChild(s);
};

export default function ProfilePage() {
  injectStyles();

  const [user, setUser] = useState({ id: "", employeeId: "", name: "", email: "", photo: "", emailVerified: false });
  // Store the blob URL separately to avoid recreating it on every render
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  // Email verification state
  const [otp, setOtp] = useState("");
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  // Modals
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // ── FETCH ──
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser({ ...res.data, emailVerified: res.data.email_verified });
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    })();
  }, []);

  const handleChange = (e) => setUser({ ...user, [e.target.name]: e.target.value });

  const handlePhotoChange = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      // Revoke old preview URL to avoid memory leaks
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      const preview = URL.createObjectURL(file);
      setSelectedPhoto(file);
      setPhotoPreview(preview);
    }
  };

  // ── SUBMIT PROFILE ──
  const handleSubmit = async (e) => {
    e?.preventDefault();
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("name", user.name);
      if (selectedPhoto) fd.append("photo", selectedPhoto);
      await axios.put(`${API}/update`, fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      alert("Profile updated successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  // ── EMAIL VERIFICATION OTP ──
  // FIX: backend sendOtp expects { employeeId, email } — was incorrectly sending { value: user.email }
  const sendEmailOtp = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/forgot-password-send-otp`,
        { employeeId: user.employeeId, email: user.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVerifyingEmail(true);
      alert("OTP sent to your email!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send OTP");
    }
  };

  // FIX: backend verifyOtp expects { employeeId, email, otp } — was only sending { otp }
  const verifyEmailOtp = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API}/forgot-password-verify-otp`,
        { employeeId: user.employeeId, email: user.email, otp },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.verified) {
        setUser({ ...user, emailVerified: true });
        setVerifyingEmail(false);
        setOtp("");
        alert("Email verified!");
      } else {
        alert("Invalid OTP");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to verify OTP");
    }
  };

  // Resolve avatar src — use stable photoPreview, not re-created object URL
  const avatarSrc = photoPreview
    ? photoPreview
    : user.photo
    ? user.photo.startsWith("blob:")
      ? user.photo
      : `http://localhost:5000/uploads/photos/${user.photo}`
    : userImg;

  return (
    <div className="pp-root">
      {/* ── HEADER ── */}
      <div className="pp-header">
        <div className="pp-header-left">
          <div className="pp-header-icon">👤</div>
          <div>
            <div className="pp-header-title">My Profile</div>
            <div className="pp-header-sub">Manage your personal info and security settings</div>
          </div>
        </div>
        <button className="pp-btn pp-btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving…" : "💾 Save Changes"}
        </button>
      </div>

      <div className="pp-grid">
        {/* ── LEFT: AVATAR CARD ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="pp-card">
            <div className="pp-card-body" style={{ textAlign: "center" }}>
              <div className="pp-avatar-wrap" onClick={() => document.getElementById("pp-photo-input").click()}>
                <img src={avatarSrc} alt="Profile" className="pp-avatar-img" />
                <div className="pp-avatar-overlay">
                  <span className="pp-avatar-icon">📷</span>
                  <span>Edit Photo</span>
                </div>
              </div>
              <input
                id="pp-photo-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: "none" }}
              />

              <div className="pp-name">{user.name || "Employee Name"}</div>
              <div className="pp-email-txt">{user.email}</div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <span
                  className="pp-verified-badge"
                  style={{
                    background: user.emailVerified ? "#D1FAE5" : "#FEE2E2",
                    color: user.emailVerified ? "#065F46" : "#B91C1C",
                  }}
                >
                  {user.emailVerified ? "✓ Verified Account" : "⚠ Not Verified"}
                </span>
              </div>

              <div className="pp-stat-row">
                {[
                  { val: user.employeeId || "—", label: "Emp ID" },
                  { val: "Active", label: "Status" },
                  { val: "HR", label: "Dept" },
                ].map((st) => (
                  <div key={st.label} className="pp-stat">
                    <div className="pp-stat-val" style={{ fontSize: 13 }}>{st.val}</div>
                    <div className="pp-stat-label">{st.label}</div>
                  </div>
                ))}
              </div>

              <button
                className="pp-change-photo-btn"
                style={{ marginTop: 16 }}
                onClick={() => document.getElementById("pp-photo-input").click()}
              >
                📷 Change Photo
              </button>
            </div>
          </div>

          {/* Quick info card */}
          <div className="pp-card">
            <div className="pp-card-header">
              <span className="pp-card-title">Account Info</span>
            </div>
            <div className="pp-card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Employee ID", val: user.employeeId || "—", icon: "🪪" },
                { label: "Email", val: user.email || "—", icon: "📧" },
                { label: "Role", val: "HR Manager", icon: "🏷️" },
              ].map((r) => (
                <div
                  key={r.label}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", background: "#F8FAFC",
                    borderRadius: 10, border: "1px solid #E2E8F0",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0D1B2A", marginTop: 1 }}>{r.val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Personal Information */}
          <div className="pp-card">
            <div className="pp-card-header">
              <span className="pp-card-title">Personal Information</span>
            </div>
            <div className="pp-card-body">
              <form onSubmit={handleSubmit}>
                <div className="pp-field-grid">
                  <div className="pp-field">
                    <label className="pp-label">Employee ID</label>
                    <input className="pp-input" name="employeeId" value={user.employeeId} disabled />
                  </div>
                  <div className="pp-field">
                    <label className="pp-label">Full Name</label>
                    <input
                      className="pp-input"
                      name="name"
                      value={user.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="pp-field">
                    <label className="pp-label">Email Address</label>
                    <input className="pp-input" name="email" type="email" value={user.email} disabled />
                  </div>
                  <div className="pp-field">
                    <label className="pp-label">Role</label>
                    <input className="pp-input" value="HR Manager" disabled />
                  </div>
                </div>
                <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" className="pp-btn pp-btn-primary" disabled={loading}>
                    {loading ? "Saving…" : "💾 Save Profile"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Security Settings */}
          <div className="pp-card">
            <div className="pp-card-header">
              <span className="pp-card-title">Security Settings</span>
            </div>
            <div className="pp-card-body">
              {/* Email Verification */}
              <div className="pp-security-item">
                <div
                  className="pp-security-icon"
                  style={{ background: user.emailVerified ? "#D1FAE5" : "#FEF3C7" }}
                >
                  {user.emailVerified ? "✅" : "📧"}
                </div>
                <div className="pp-security-info">
                  <div className="pp-security-title">Email Verification</div>
                  <div className="pp-security-sub">
                    {user.emailVerified
                      ? "Your email is verified and secure."
                      : "Verify your email to secure your account."}
                  </div>
                  {!user.emailVerified && !verifyingEmail && (
                    <button
                      className="pp-btn pp-btn-sky"
                      style={{ marginTop: 10, padding: "7px 16px", fontSize: 12 }}
                      type="button"
                      onClick={sendEmailOtp}
                    >
                      Send Verification OTP
                    </button>
                  )}
                  {!user.emailVerified && verifyingEmail && (
                    <div className="pp-otp-row">
                      <input
                        className="pp-otp-input"
                        type="text"
                        placeholder="Enter OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                      />
                      <button
                        className="pp-btn pp-btn-green"
                        style={{ padding: "7px 16px", fontSize: 12 }}
                        type="button"
                        onClick={verifyEmailOtp}
                      >
                        Verify
                      </button>
                      <button
                        className="pp-btn pp-btn-outline"
                        style={{ padding: "7px 16px", fontSize: 12 }}
                        type="button"
                        onClick={() => { setVerifyingEmail(false); setOtp(""); }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <span
                  className="pp-verified-badge"
                  style={{
                    background: user.emailVerified ? "#D1FAE5" : "#FEE2E2",
                    color: user.emailVerified ? "#065F46" : "#B91C1C",
                    flexShrink: 0,
                  }}
                >
                  {user.emailVerified ? "Verified" : "Pending"}
                </span>
              </div>

              {/* Password */}
              <div className="pp-security-item">
                <div className="pp-security-icon" style={{ background: "#EFF6FF" }}>🔑</div>
                <div className="pp-security-info">
                  <div className="pp-security-title">Password Management</div>
                  <div className="pp-security-sub">Update your account password to keep it secure.</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      className="pp-btn pp-btn-primary"
                      style={{ padding: "7px 16px", fontSize: 12 }}
                      type="button"
                      onClick={() => setShowChangePasswordModal(true)}
                    >
                      Change Password
                    </button>
                    <button
                      className="pp-btn pp-btn-outline"
                      style={{ padding: "7px 16px", fontSize: 12 }}
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                    >
                      Reset via Email
                    </button>
                  </div>
                </div>
              </div>

              {/* 2FA placeholder */}
              <div className="pp-security-item" style={{ opacity: 0.6 }}>
                <div className="pp-security-icon" style={{ background: "#F5F3FF" }}>🛡️</div>
                <div className="pp-security-info">
                  <div className="pp-security-title">Two-Factor Authentication</div>
                  <div className="pp-security-sub">Coming soon — extra layer of account security.</div>
                </div>
                <span style={{ background: "#F1F5F9", color: "#64748B", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  Soon
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showChangePasswordModal && <ChangePasswordModal close={() => setShowChangePasswordModal(false)} />}
      {showForgotModal && <ForgotPasswordModal close={() => setShowForgotModal(false)} />}
    </div>
  );
}