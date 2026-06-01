import mysql from "mysql2/promise";
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "NewPassword@123",
  database: "auth_db",
  waitForConnections:true,
});
export default pool;


