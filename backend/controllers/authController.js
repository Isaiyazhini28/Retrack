import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { JWT_SECRET } from "../jwt.js";
import nodemailer from "nodemailer";

/* ===== EMAIL CONFIG ===== */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "isai12d25@gmail.com",        // your Gmail
    pass: "keka dcyg ypus tpwn",        // app password
  },
});

/* ===== REGISTER ===== */
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const photo = req.file ? req.file.filename : "";

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const [exists] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (exists.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (name, email, password, photo) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, photo]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Server error" });
    console.log("REQ.BODY:", req.body);
    console.log("REQ.FILE:", req.file);

  }
};

/* ===== LOGIN ===== */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        email_verified: user.email_verified,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===== GET CURRENT USER ===== */
export const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      "SELECT id, name, email, photo, email_verified FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("GET ME ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===== UPDATE PROFILE ===== */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, password } = req.body;
    const photo = req.file ? req.file.filename : null;

    const [rows] = await pool.query(
      "SELECT email, email_verified, password FROM users WHERE id=?",
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    const current = rows[0];


    if (password && !current.email_verified) {
      return res.status(403).json({ message: "Verify your email before changing password" });
    }


    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;


    const updates = [];
    const params = [];

    if (name) {
      updates.push("name=?");
      params.push(name);
    }


    if (email && current.email_verified) {
      updates.push("email=?");
      params.push(email);
    }

    if (hashedPassword) {
      updates.push("password=?");
      params.push(hashedPassword);
    }

    if (photo) {
      updates.push("photo=?");
      params.push(photo);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const sql = `UPDATE users SET ${updates.join(", ")} WHERE id=?`;
    params.push(userId);

    await pool.query(sql, params);

    // Return updated user
    const [updatedRows] = await pool.query(
      "SELECT id, name, email, photo, email_verified FROM users WHERE id=?",
      [userId]
    );

    res.json(updatedRows[0]);
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ===== SEND EMAIL OTP ===== */
export const sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    const userId = rows[0].id;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await pool.query(
      "UPDATE users SET email_otp=?, otp_expiry=? WHERE id=?",
      [otp, Date.now() + 10 * 60 * 1000, userId]
    );

    await transporter.sendMail({
      from: '"RecTrack" <isai12d25@gmail.com>',
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};



/* ===== VERIFY EMAIL OTP ===== */
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    const [rows] = await pool.query(
      "SELECT email_otp, otp_expiry FROM users WHERE email = ?",
      [email]
    );
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    const user = rows[0];
    if (user.email_otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (Date.now() > user.otp_expiry) return res.status(400).json({ message: "OTP expired" });

    res.json({ verified: true });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===== VERIFY OLD PASSWORD ===== */
export const verifyOldPassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword } = req.body;

    const [rows] = await pool.query(
      "SELECT password FROM users WHERE id=?",
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(oldPassword, rows[0].password);
    if (!match) return res.status(400).json({ message: "Old password incorrect" });

    res.json({ verified: true });
  } catch (err) {
    console.error("VERIFY OLD PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===== SEND PASSWORD CHANGE OTP ===== */
export const sendPasswordChangeOtp = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query("SELECT email FROM users WHERE id=?", [userId]);
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await pool.query("UPDATE users SET email_otp=? WHERE id=?", [otp, userId]);

    await transporter.sendMail({
      from: '"RecTrack" <isai12d25@gmail.com>',
      to: rows[0].email,
      subject: "Password Change OTP",
      html: `<h2>Password Change Verification</h2><h1>${otp}</h1>`,
    });

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    console.error("SEND PASSWORD OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===== CHANGE PASSWORD ===== */
export const changePassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ message: "All fields required" });

    const [rows] = await pool.query(
      "SELECT email_otp, otp_expiry FROM users WHERE email = ?",
      [email]
    );
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    const user = rows[0];
    if (user.email_otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (Date.now() > user.otp_expiry) return res.status(400).json({ message: "OTP expired" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password=?, email_otp=NULL, otp_expiry=NULL WHERE email=?",
      [hashedPassword, email]
    );

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

