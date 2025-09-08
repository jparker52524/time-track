//CONFIG START
require('dotenv').config();
const express = require('express');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN
}));
app.use(express.json());

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

// Only add SSL settings if we're NOT on local
if (process.env.DATABASE_URL !== "postgresql://postgres:password@localhost:5432/time_tracker_db") {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);
// CONFIG END

//JWT MIDDLEWARE START
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // "Bearer TOKEN"

  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });

    req.user = user; // attach decoded payload (id, org_id, email, is_admin, etc.)
    next();
  });
}
//JWT MIDDLEWARE END

// ROUTES

//Login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. find user by email
    const result = await pool.query(
      "SELECT id, org_id, first_name, last_name, email, password_hash, is_admin FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    // 2. compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invlid credentials" });
    }
    // 3. sign token
    const token = jwt.sign(
      { id: user.id, org_id: user.org_id, email: user.email, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    // 4. send response
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        org_id: user.org_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        is_admin: user.is_admin,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

//Get all jobs in an Org (ADMIN)
app.get("/orgJobsList", authenticateToken, async (req, res) => {
  try {
    // Now you can use req.user.org_id to filter jobs
    const result = await pool.query(
      "SELECT * FROM jobs WHERE org_id = $1",
      [req.user.org_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Get all jobs for a user
app.get("/userJobsList", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT j.*
      FROM jobs j
      INNER JOIN job_assignments ja ON j.id = ja.job_id
      WHERE j.org_id = $1
        AND ja.user_id = $2
      ORDER BY j.id DESC
      `,
      [req.user.org_id, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Get job details for Job Page
app.get(`/jobs/:id`, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM jobs WHERE id = $1 AND org_id = $2",
      [id, req.user.org_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).json({ error: "Server error fetching job" })
  }
});

// ✅ Get job status for current user
app.get("/jobs/:id/status", authenticateToken, async (req, res) => {
  console.log("Auth user in /jobs/:id/status:", req.user);
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT * FROM job_times 
       WHERE job_id = $1 AND user_id = $2 
       ORDER BY start_time DESC 
       LIMIT 1`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.json(null); // no log yet
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching job status:", error);
    res.status(500).json({ error: "Server error fetching job status" });
  }
});

// ✅ Start job (insert new log row)
app.post("/jobs/:id/start", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const now = new Date();
    const result = await pool.query(
      `INSERT INTO job_times (job_id, user_id, start_time)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, userId, now]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error starting job:", error);
    res.status(500).json({ error: "Server error starting job" });
  }
});

// ✅ Stop job (update latest open log)
app.post("/jobs/:id/stop", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const now = new Date();
    const result = await pool.query(
      `UPDATE job_times
       SET end_time = $3
       WHERE job_id = $1 AND user_id = $2 AND end_time IS NULL
       RETURNING *`,
      [id, userId, now]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "No active job to stop" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error stopping job:", error);
    res.status(500).json({ error: "Server error stopping job" });
  }
});

//Log time (simple beta version table)
app.post("/timeLog", authenticateToken, async (req, res) => {
  const { time } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO time_logs (log_time) VALUES ($1) RETURNING *",
      [time]
    );
    console.log("Inserted row:", result.rows[0]);
    res.json({ success: true });
  } catch (err) {
    console.error("DB error:", err.message);   // 👈 show real error
    res.status(500).json({ error: err.message });
  }
});
// ROUTES

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
