const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const speakeasy = require("speakeasy");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const Joi = require("joi");


router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Validate email format
    const schema = Joi.object({
      username: Joi.string().email().required(),
      password: Joi.string().min(6).required()
    });

    const { error } = schema.validate({ username, password });
    if (error) {
      return res.status(200).json({
        token: null,
        message: "Invalid email format",
        errorCode: "INVALID_EMAIL",
        requiresMfa: false,
        mfaSetupRequired: false,
        mfaSessionToken: null,
        otpAuthUri: null,
        manualEntryKey: null
      });
    }

    // 2. Check if username exists
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (userCheck.rows.length > 0) {
      return res.status(200).json({
        token: null,
        message: "Username already exists",
        errorCode: "USERNAME_EXISTS",
        requiresMfa: false,
        mfaSetupRequired: false,
        mfaSessionToken: null,
        otpAuthUri: null,
        manualEntryKey: null
      });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Create user
    const newUser = await pool.query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2) RETURNING id`,
      [username, hashedPassword]
    );

    const userId = newUser.rows[0].id;

    // 5. Generate MFA secret
    const secret = speakeasy.generateSecret({
      name: `Roohi:${username}`
    });

    // 6. Store MFA secret in DB (IMPORTANT)
    await pool.query(
      `INSERT INTO mfa_secrets (user_id, secret_base32)
       VALUES ($1, $2)`,
      [userId, secret.base32]
    );

    // 7. Generate MFA session token (valid 10 mins)
    const mfaSessionToken = uuidv4();

    await pool.query(
      `INSERT INTO mfa_sessions (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [userId, mfaSessionToken]
    );

    // 8. Format OTP Auth URL
    const otpAuthUri = secret.otpauth_url;

    // 9. Return response
    return res.status(200).json({
      token: null,
      message: "Account created. Please set up MFA.",
      errorCode: null,
      requiresMfa: false,
      mfaSetupRequired: true,
      mfaSessionToken,
      otpAuthUri,
      manualEntryKey: secret.base32
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({
      message: "Server error",
      errorCode: "SERVER_ERROR"
    });
  }
});
 
 // Loging Endpoint
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(200).json({
        token: null,
        message: "Invalid username or password",
        errorCode: "INVALID_CREDENTIALS",
        requiresMfa: false,
        mfaSetupRequired: false,
        mfaSessionToken: null,
        otpAuthUri: null,
        manualEntryKey: null
      });
    }

    // 1. Look up user by username
    const userQuery = await pool.query(
      "SELECT id, password_hash FROM users WHERE username = $1",
      [username]
    );

    // SECURITY: Do not reveal whether user exists
    if (userQuery.rows.length === 0) {
      return res.status(200).json({
        token: null,
        message: "Invalid username or password",
        errorCode: "INVALID_CREDENTIALS",
        requiresMfa: false,
        mfaSetupRequired: false,
        mfaSessionToken: null,
        otpAuthUri: null,
        manualEntryKey: null
      });
    }

    const user = userQuery.rows[0];

    // 2. Compare password hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(200).json({
        token: null,
        message: "Invalid username or password",
        errorCode: "INVALID_CREDENTIALS",
        requiresMfa: false,
        mfaSetupRequired: false,
        mfaSessionToken: null,
        otpAuthUri: null,
        manualEntryKey: null
      });
    }

    // 3. Valid credentials → Generate a temporary MFA session token
    const mfaSessionToken = uuidv4();

    await pool.query(
      `INSERT INTO mfa_sessions (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [user.id, mfaSessionToken]
    );

    // 4. Return MFA required response
    return res.status(200).json({
      token: null,
      message: "MFA verification required",
      errorCode: null,
      requiresMfa: true,
      mfaSetupRequired: false,
      mfaSessionToken,
      otpAuthUri: null,
      manualEntryKey: null
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      errorCode: "SERVER_ERROR"
    });
  }
});

// POST /mfa/enroll
router.post("/mfa/enroll", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        message: "Username is required",
        errorCode: "USERNAME_MISSING"
      });
    }

    // Look up the user
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        errorCode: "USER_NOT_FOUND"
      });
    }

    // Generate MFA secret if user does not have one
    let secret = user.mfaSecret;

    if (!secret) {
      const generated = speakeasy.generateSecret({
        name: `Roohi:${username}`,
        length: 20
      });

      secret = generated.base32;

      // Save secret to user in DB
      user.mfaSecret = secret;
      await user.save();
    }

    // Create OTP Auth URI
    const otpauthUri = `otpauth://totp/Roohi:${encodeURIComponent(
      username
    )}?secret=${secret}&issuer=Roohi`;

    return res.status(200).json({
      manualEntryKey: secret,
      otpauthUri,
      message: "MFA secret generated",
      errorCode: null
    });

  } catch (error) {
    console.error("MFA enroll error:", error);

    return res.status(500).json({
      message: "Internal server error",
      errorCode: "SERVER_ERROR"
    });
  }
});



router.post("/mfa/verify", async (req, res) => {
  const client = await pool.connect();

  try {
    const { username, mfaSessionToken, otpCode } = req.body;

    if (!username || !mfaSessionToken || !otpCode) {
      client.release();
      return res.status(400).json({
        token: null,
        message: "Missing parameters",
        errorCode: "BAD_REQUEST"
      });
    }

    // 1. Validate MFA session token
    const mfaResult = await client.query(
      "SELECT * FROM mfa_sessions WHERE username=$1 AND token=$2",
      [username, mfaSessionToken]
    );

    if (mfaResult.rows.length === 0) {
      client.release();
      return res.status(200).json({
        token: null,
        message: "MFA session expired. Please log in again.",
        errorCode: "EXPIRED_MFA_SESSION"
      });
    }

    const session = mfaResult.rows[0];

    // Check expiration
    if (session.expires_at < Date.now()) {
      await client.query("DELETE FROM mfa_sessions WHERE id=$1", [session.id]);
      client.release();

      return res.status(200).json({
        token: null,
        message: "MFA session expired. Please log in again.",
        errorCode: "EXPIRED_MFA_SESSION"
      });
    }

    // 2. Get user's MFA secret
    const userResult = await client.query(
      "SELECT * FROM users WHERE username=$1",
      [username]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].mfa_secret) {
      client.release();
      return res.status(200).json({
        token: null,
        message: "MFA not configured",
        errorCode: "MFA_NOT_CONFIGURED"
      });
    }

    const mfaSecret = userResult.rows[0].mfa_secret;

    // 3. Verify OTP code
    const verified = speakeasy.totp.verify({
      secret: mfaSecret,
      encoding: "base32",
      token: otpCode,
      window: 1
    });

    if (!verified) {
      client.release();
      return res.status(200).json({
        token: null,
        message: "Invalid verification code",
        errorCode: "INVALID_MFA_CODE"
      });
    }

    // 4. Generate long-lived session token
    const sessionToken = "session_" + crypto.randomUUID();
    const expiration = Date.now() + 30 * 24 * 60 * 60 * 1000;

    await client.query(
      "INSERT INTO sessions (username, token, expires_at) VALUES ($1, $2, $3)",
      [username, sessionToken, expiration]
    );

    // 5. Delete MFA temp session
    await client.query("DELETE FROM mfa_sessions WHERE id=$1", [session.id]);

    client.release();

    return res.status(200).json({
      token: sessionToken,
      message: "Authentication successful",
      errorCode: null
    });

  } catch (error) {
    console.error("MFA verify error:", error);

    client.release();

    return res.status(500).json({
      token: null,
      message: "Internal server error",
      errorCode: "SERVER_ERROR"
    });
  }
});



module.exports = router;
