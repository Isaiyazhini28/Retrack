import React, { useState } from "react";

export default function ForgotPasswordModal({ close }) {
  const [step, setStep] = useState(1); // 1: email, 2: OTP, 3: new password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sendOtp = async () => {
    setError("");
    try {
      const res = await fetch("http://localhost:5000/api/auth/forgot-password-send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "Failed to send OTP");
      setStep(2);
      setSuccess("OTP sent to your email");
    } catch {
      setError("Server not responding");
    }
  };

  const verifyOtp = async () => {
    setError("");
    try {
      const res = await fetch("http://localhost:5000/api/auth/forgot-password-verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "OTP invalid");
      setStep(3);
      setSuccess("OTP verified. Enter new password.");
    } catch {
      setError("Server not responding");
    }
  };

  const changePassword = async () => {
    setError("");
    if (newPassword !== confirmPassword) return setError("Passwords do not match");
    try {
      const res = await fetch("http://localhost:5000/api/auth/forgot-password-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "Failed to change password");
      setSuccess("Password changed successfully! You can now login.");
      setTimeout(close, 2000);
    } catch {
      setError("Server not responding");
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Forgot Password</h2>
        {error && <div style={{ color: "red" }}>{error}</div>}
        {success && <div style={{ color: "green" }}>{success}</div>}

        {step === 1 && (
          <>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button onClick={sendOtp}>Send OTP</button>
          </>
        )}

        {step === 2 && (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button onClick={verifyOtp}>Verify OTP</button>
          </>
        )}

        {step === 3 && (
          <>
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button onClick={changePassword}>Change Password</button>
          </>
        )}

        <button onClick={close} style={{ marginTop: "10px", background: "gray" }}>Close</button>
      </div>
    </div>
  );
}
