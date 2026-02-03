import express from "express";
import {
  register,
  login,
  getMe,
  updateProfile,
  sendOtp,
  verifyOtp,
  changePassword,
  sendPasswordChangeOtp,
  verifyOldPassword
} from "../controllers/authController.js";

import verifyToken from "../middleware/verifyToken.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// ===== AUTH =====
router.post("/register", upload.single("photo"), register);
router.post("/login", login);

// ===== PROFILE =====
router.get("/me", verifyToken, getMe);
router.put("/update", verifyToken, upload.single("photo"), updateProfile);

// ===== PASSWORD CHANGE FLOW (LOGGED-IN USERS) =====

router.post("/verify-old-password", verifyToken, verifyOldPassword);


router.post("/send-password-otp", verifyToken, sendPasswordChangeOtp);


router.post("/change-password", verifyToken, changePassword);




router.post("/forgot-password-send-otp", sendOtp);
router.post("/forgot-password-verify-otp", verifyOtp); 
router.post("/forgot-password-change", changePassword);


export default router;
