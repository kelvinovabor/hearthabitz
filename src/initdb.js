const pool = require("./db.js");

async function initializeTables() {
  try {
    // USERS TABLE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
      );
    `);

    // MFA SESSIONS TABLE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mfa_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL
      );
    `);

    // MFA SECRETS TABLE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mfa_secrets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        secret_base32 TEXT NOT NULL
      );
    `);

    // USER SESSIONS TABLEawa
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        token TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL
      );
    `);
// USER DATA
    await pool.query(`CREATE TABLE user_data (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  login_timestamp TIMESTAMP NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
  `);

    console.log("✅ All required tables are ready.");
  } catch (err) {
    console.error("❌ Error creating tables:", err);
  }
}

module.exports = initializeTables;
