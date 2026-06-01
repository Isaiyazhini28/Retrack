// ============================================================
// FILE: ForgotPasswordModal.jsx  — drop-in replacement
// ============================================================
import React, { useState } from "react";

/* ── shared modal styles ── */
const injectModalStyles = () => {
  if (document.getElementById("modal-css")) return;
  const s = document.createElement("style");
  s.id = "modal-css";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');

    .m-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex; justify-content: center; align-items: center;
      z-index: 9999;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      font-family: 'Syne', sans-serif;
    }
    .m-box {
      background: #fff; border-radius: 20px;
      width: 440px; max-width: 94vw;
      box-shadow: 0 24px 60px rgba(0,0,0,0.28);
      overflow: hidden; position: relative;
    }
    .m-header {
      background: #0D1B2A; padding: 24px 28px 20px;
      position: relative;
    }
    .m-header-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: rgba(56,189,248,0.15);
      border: 1px solid rgba(56,189,248,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; margin-bottom: 12px;
    }
    .m-title {
      font-size: 18px; font-weight: 800; color: #fff;
      letter-spacing: -0.3px; margin-bottom: 4px;
    }
    .m-subtitle { font-size: 12.5px; color: rgba(255,255,255,0.45); }
    .m-close-btn {
      position: absolute; top: 18px; right: 18px;
      width: 32px; height: 32px; border-radius: 50%;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.6); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700; transition: all 0.18s;
      font-family: 'Syne', sans-serif;
    }
    .m-close-btn:hover { background: rgba(239,68,68,0.2); color: #EF4444; border-color: rgba(239,68,68,0.3); }

    .m-body { padding: 26px 28px 28px; }

    .m-steps { display: flex; gap: 6px; margin-bottom: 22px; }
    .m-step {
      flex: 1; height: 4px; border-radius: 99px; background: #E2E8F0;
      transition: background 0.3s;
    }
    .m-step.done { background: #10B981; }
    .m-step.active { background: #38BDF8; }

    .m-label {
      font-size: 11px; font-weight: 700; color: #94A3B8;
      text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;
    }
    .m-input {
      width: 100%; padding: 11px 14px;
      border: 1.5px solid #E2E8F0; border-radius: 10px;
      font-family: 'Syne', sans-serif; font-size: 13.5px;
      color: #0D1B2A; background: #F8FAFC; outline: none;
      transition: border 0.2s, background 0.2s; margin-bottom: 14px;
    }
    .m-input:focus { border-color: #38BDF8; background: #fff; }
    .m-input::placeholder { color: #94A3B8; }

    .m-btn {
      width: 100%; padding: 13px;
      background: linear-gradient(135deg, #0D1B2A, #1e3a5f);
      color: #fff; border: none; border-radius: 10px;
      font-family: 'Syne', sans-serif; font-weight: 700;
      font-size: 13.5px; cursor: pointer; transition: all 0.2s;
    }
    .m-btn:hover { box-shadow: 0 6px 20px rgba(13,27,42,0.3); transform: translateY(-1px); }
    .m-btn-cancel {
      width: 100%; padding: 11px;
      background: transparent; color: #94A3B8;
      border: 1.5px solid #E2E8F0; border-radius: 10px;
      font-family: 'Syne', sans-serif; font-weight: 700;
      font-size: 13px; cursor: pointer; margin-top: 10px;
      transition: all 0.18s;
    }
    .m-btn-cancel:hover { border-color: #CBD5E1; color: #64748B; }

    .m-msg-error {
      background: #FEF2F2; border: 1px solid #FECACA;
      color: #B91C1C; border-radius: 8px;
      padding: 9px 13px; font-size: 12.5px; font-weight: 600;
      margin-bottom: 14px; display: flex; align-items: center; gap: 7px;
    }
    .m-msg-success {
      background: #F0FDF4; border: 1px solid #BBF7D0;
      color: #15803D; border-radius: 8px;
      padding: 9px 13px; font-size: 12.5px; font-weight: 600;
      margin-bottom: 14px; display: flex; align-items: center; gap: 7px;
    }
  `;
  document.head.appendChild(s);
};

export default function ForgotPasswordModal({ close }) {
  injectModalStyles();
  const [employeeId,       setEmployeeId]       = useState("");
  const [step,             setStep]             = useState(1);
  const [email,            setEmail]            = useState("");
  const [otp,              setOtp]              = useState("");
  const [newPassword,      setNewPassword]      = useState("");
  const [confirmPassword,  setConfirmPassword]  = useState("");
  const [error,            setError]            = useState("");
  const [success,          setSuccess]          = useState("");

  const sendOtp = async () => {
    setError("");
    try {
      const res  = await fetch("http://localhost:5000/api/auth/forgot-password-send-otp", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ employeeId, email }) });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "Failed to send OTP");
      setStep(2); setSuccess("OTP sent to your email");
    } catch { setError("Server not responding"); }
  };

  const verifyOtp = async () => {
    setError(""); setSuccess("");
    try {
      const res  = await fetch("http://localhost:5000/api/auth/forgot-password-verify-otp", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ employeeId, email, otp }) });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "OTP invalid");
      setStep(3); setSuccess("OTP verified. Enter new password.");
    } catch { setError("Server not responding"); }
  };

  const changePassword = async () => {
    setError(""); setSuccess("");
    if (newPassword !== confirmPassword) return setError("Passwords do not match");
    try {
      const res  = await fetch("http://localhost:5000/api/auth/forgot-password-change", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ employeeId, email, otp, newPassword }) });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "Failed to change password");
      setSuccess("Password changed successfully!");
      setTimeout(close, 2000);
    } catch { setError("Server not responding"); }
  };

  const stepTitles = ["", "Verify Identity", "Enter OTP", "New Password"];
  const stepSubs   = ["", "Enter your employee ID and email", "Check your email for the OTP code", "Set a strong new password"];

  return (
    <div className="m-overlay">
      <div className="m-box">
        {/* Header */}
        <div className="m-header">
          <div className="m-header-icon">🔐</div>
          <div className="m-title">{stepTitles[step]}</div>
          <div className="m-subtitle">{stepSubs[step]}</div>
          <button className="m-close-btn" onClick={close}>✕</button>
        </div>

        {/* Body */}
        <div className="m-body">
          {/* Step progress */}
          <div className="m-steps">
            {[1,2,3].map(n => (
              <div key={n} className={`m-step ${n < step ? "done" : n === step ? "active" : ""}`} />
            ))}
          </div>

          {error   && <div className="m-msg-error">  ⚠ {error}</div>}
          {success && <div className="m-msg-success">✓ {success}</div>}

          {/* Step 1 */}
          {step === 1 && (
            <>
              <div className="m-label">Employee ID</div>
              <input className="m-input" placeholder="e.g. EMP001" value={employeeId} onChange={e => setEmployeeId(e.target.value)} />
              <div className="m-label">Registered Email</div>
              <input className="m-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
              <button className="m-btn" onClick={sendOtp}>Send OTP →</button>
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <>
              <div className="m-label">One-Time Password</div>
              <input className="m-input" placeholder="Enter 6-digit OTP" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} />
              <button className="m-btn" onClick={verifyOtp}>Verify OTP →</button>
            </>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <>
              <div className="m-label">New Password</div>
              <input className="m-input" type="password" placeholder="Min 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <div className="m-label">Confirm Password</div>
              <input className="m-input" type="password" placeholder="Repeat new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              <button className="m-btn" onClick={changePassword}>Update Password →</button>
            </>
          )}

          <button className="m-btn-cancel" onClick={close}>Cancel</button>
        </div>
      </div>
    </div>
  );
}


