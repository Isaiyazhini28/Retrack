import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../jwt.js";

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email }
    next();
  } catch (err) {
    console.error("JWT VERIFY ERROR:", err.message);
    res.status(401).json({ message: "Invalid token" });
  }
};

export default verifyToken;
