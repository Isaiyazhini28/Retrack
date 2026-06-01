// ============================================================
// FILE: ChangePasswordModal.jsx  — drop-in replacement
// ============================================================
// (copy injectModalStyles into this file too, or import from a shared util)
import React, { useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/auth";

export function ChangePasswordModal({ close }) {
  injectModalStyles(); // same injector above

  const [oldPassword,     setOldPassword]     = useState("");
  const [newPassword,     setNewPassword]      = useState("");
  const [confirmPassword, setConfirmPassword]  = useState("");
  const [error,           setError]            = useState("");
  const [success,         setSuccess]          = useState("");

  const handleChangePassword = async () => {
    setError(""); setSuccess("");
    if (newPassword !== confirmPassword) return setError("Passwords do not match");
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/verify-old-password`,        { oldPassword },  { headers: { Authorization: `Bearer ${token}` } });
      await axios.post(`${API}/change-password-logged-in`,  { newPassword },  { headers: { Authorization: `Bearer ${token}` } });
      setSuccess("Password updated successfully!");
      setTimeout(close, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Password update failed");
    }
  };

  return (
    <div className="m-overlay">
      <div className="m-box">
        {/* Header */}
        <div className="m-header">
          <div className="m-header-icon">🔑</div>
          <div className="m-title">Change Password</div>
          <div className="m-subtitle">Update your account password securely</div>
          <button className="m-close-btn" onClick={close}>✕</button>
        </div>

        {/* Body */}
        <div className="m-body">
          {error   && <div className="m-msg-error">  ⚠ {error}</div>}
          {success && <div className="m-msg-success">✓ {success}</div>}

          <div className="m-label">Current Password</div>
          <input className="m-input" type="password" placeholder="Enter your current password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />

          <div className="m-label">New Password</div>
          <input className="m-input" type="password" placeholder="Min 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />

          <div className="m-label">Confirm New Password</div>
          <input className="m-input" type="password" placeholder="Repeat new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />

          <button className="m-btn" onClick={handleChangePassword}>Update Password →</button>
          <button className="m-btn-cancel" onClick={close}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default ChangePasswordModal;