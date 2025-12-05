const express = require("express");
const router = express.Router();
const pool = require("../db");


router.post("/data", async (req, res) => {
  const client = await pool.connect();

  try {
    const { username, payload } = req.body;

    // Validate request body
    if (!username || !payload || !payload.loginTimestamp) {
      client.release();
      return res.status(400).json({
        message: "Missing required fields",
        errorCode: "BAD_REQUEST"
      });
    }

    // 1. Confirm user exists
    const userCheck = await client.query(
      "SELECT id FROM users WHERE username=$1",
      [username]
    );

    if (userCheck.rows.length === 0) {
      client.release();
      return res.status(200).json({
        message: "Invalid username",
        errorCode: "USER_NOT_FOUND"
      });
    }

    // 2. Convert timestamp properly
    const loginTimestamp = new Date(payload.loginTimestamp);

    // 3. Save payload as JSONB
    await client.query(
      `
      INSERT INTO user_data (username, login_timestamp, payload)
      VALUES ($1, $2, $3)
      `,
      [username, loginTimestamp, payload]
    );

    client.release();

    return res.status(200).json({
      message: "Data saved successfully",
      errorCode: null
    });

  } catch (error) {
    console.error("Error saving data:", error);
    client.release();

    return res.status(500).json({
      message: "Internal server error",
      errorCode: "SERVER_ERROR"
    });
  }
});

module.exports = router;
