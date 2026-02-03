import express from "express";
import mysql from "mysql2";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = "AUTH_SECRET";

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "NewPassword@123",
  database: "auth_db",
});

db.connect();

/* REGISTER */
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
    [name, email, hash],
    (err) => {
      if (err) return res.status(400).json({ message: "User exists" });
      res.json({ message: "Registered" });
    }
  );
});

/* LOGIN */
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, result) => {
      if (!result.length)
        return res.status(400).json({ message: "User not found" });

      const valid = await bcrypt.compare(password, result[0].password);
      if (!valid)
        return res.status(401).json({ message: "Invalid password" });

      const token = jwt.sign(
        { id: result[0].id },
        SECRET,
        { expiresIn: "1h" }
      );

      res.json({ token });
    }
  );
});

app.listen(5000, () => console.log("Backend running on port 5000"));
