import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const User = sequelize.define("User", {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  photo: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  emailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  phoneVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  otp: { type: DataTypes.STRING },
  otpField: { type: DataTypes.STRING },
  resetOtp: { type: DataTypes.STRING },
  resetOtpExpiry:{ type: DataTypes.DATE },
}, {
  tableName: "users",
  timestamps: true,
});

export default User;
