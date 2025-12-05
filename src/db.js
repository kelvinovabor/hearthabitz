const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "12345",
  database: "hearthabitz",
  port: 5432
});

// Test connection once on startup
pool.connect()
  .then(() => console.log("✅ PostgreSQL Connected Successfully"))
  .catch(err => console.error("❌ PostgreSQL Connection Failed:", err));

module.exports = pool;
