//CONFIG START
require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
  })
);
app.use(express.json());

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

// Only add SSL settings if we're NOT on local
if (
  process.env.DATABASE_URL !==
  "postgresql://postgres:password@localhost:5432/time_tracker_db"
) {
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
      {
        id: user.id,
        org_id: user.org_id,
        email: user.email,
        is_admin: user.is_admin,
      },
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

//Create a job (ADMIN)
app.post("/jobs", authenticateToken, async (req, res) => {
  console.log("📥 Received req.body:", req.body);
  const {
    orgId,
    jobTitle,
    jobLocation,
    jobDescription,
    jobAmount,
    jobDueDate,
    assignedUserIds = [],
  } = req.body;

  // Destructure user info from the token
  const { id: userId } = req.user;

  if (!orgId || !jobTitle) {
    return res.status(400).json({ error: "orgId and jobTitle are required" });
  }

  try {
    // 1. Insert job
    const result = await pool.query(
      `INSERT INTO jobs (org_id, name, location, due_date, description, amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        orgId,
        jobTitle,
        jobLocation,
        jobDueDate || null,
        jobDescription,
        jobAmount,
      ]
    );

    const newJob = result.rows[0];

    // 2. Assign the creator and users to the job
    const allUserIds = new Set([userId, ...assignedUserIds]); // Ensure uniqueness
    const values = Array.from(allUserIds)
      .map((uid, i) => `($1, $${i + 2})`)
      .join(", ");
    const params = [newJob.id, ...Array.from(allUserIds)];

    await pool.query(
      `INSERT INTO job_assignments (job_id, user_id)
       VALUES ${values}`,
      params
    );

    console.log(
      `✅ Assigned users [${Array.from(allUserIds)}] to job ${newJob.id}`
    );

    // 3. Respond with the created job
    res.status(201).json(newJob);
  } catch (err) {
    console.error("🔥 Error inserting job:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Edit a job (ADMIN)
app.put("/jobs", authenticateToken, async (req, res) => {
  console.log("✏️ Received job edit req.body:", req.body);
  const {
    id, // job ID to edit
    orgId,
    jobTitle,
    jobLocation,
    jobDescription,
    jobAmount,
    jobDueDate,
    assignedUserIds = [],
  } = req.body;

  // Destructure user info from token
  const { id: userId } = req.user;

  if (!id || !orgId || !jobTitle) {
    return res
      .status(400)
      .json({ error: "id, orgId, and jobTitle are required" });
  }

  try {
    // 1. Verify job belongs to org
    const jobCheck = await pool.query(
      `SELECT * FROM jobs WHERE id = $1 AND org_id = $2`,
      [id, orgId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: "Job not found or unauthorized" });
    }

    // 2. Update job data
    await pool.query(
      `UPDATE jobs
       SET name = $1,
           location = $2,
           description = $3,
           amount = $4,
           due_date = $5
       WHERE id = $6`,
      [jobTitle, jobLocation, jobDescription, jobAmount, jobDueDate || null, id]
    );

    // 3. Replace job assignments
    await pool.query(`DELETE FROM job_assignments WHERE job_id = $1`, [id]);

    // Add the updated user assignments (including the user themself if needed)
    const allUserIds = new Set([userId, ...assignedUserIds]);
    if (allUserIds.size > 0) {
      const valueStrings = Array.from(allUserIds)
        .map((uid, i) => `($1, $${i + 2})`)
        .join(", ");
      const values = [id, ...Array.from(allUserIds)];

      await pool.query(
        `INSERT INTO job_assignments (job_id, user_id) VALUES ${valueStrings}`,
        values
      );

      console.log(
        `✅ Updated assignments for job ${id}:`,
        Array.from(allUserIds)
      );
    }

    // 4. Return success
    res.status(200).json({ message: "Job updated successfully" });
  } catch (err) {
    console.error("🔥 Error updating job:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a job (ADMIN)
app.delete("/jobs/:id", authenticateToken, async (req, res) => {
  const jobId = req.params.id;

  try {
    // Optionally: Check if the user has permission to delete this job (e.g., same org or admin)
    // For now, let's assume the user is authorized if authenticated

    // Delete job assignments automatically due to ON DELETE CASCADE in job_assignments table
    const result = await pool.query(
      "DELETE FROM jobs WHERE id = $1 RETURNING *",
      [jobId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({ message: "Job deleted successfully", job: result.rows[0] });
  } catch (err) {
    console.error("Error deleting job:", err);
    res.status(500).json({ error: err.message });
  }
});

//Get all users in an Org (ADMIN)
app.get("/orgusers", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE org_id = $1", [
      req.user.org_id,
    ]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/users/:id", async (req, res) => {
  const userId = req.params.id;
  const { hourly_rate } = req.body;

  console.log(`➡️ PATCH /users/${userId} with hourly_rate =`, hourly_rate);

  if (typeof hourly_rate !== "number" || hourly_rate < 0) {
    console.log("❌ Invalid input");
    return res.status(400).json({ error: "Invalid hourly_rate" });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET hourly_rate = $1 WHERE id = $2 RETURNING *`,
      [hourly_rate, userId]
    );

    if (result.rows.length === 0) {
      console.log("❌ User not found");
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ Wage updated:", result.rows[0]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("🔥 Error updating wage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//Get all jobs in an Org (ADMIN)
app.get("/orgJobsList", authenticateToken, async (req, res) => {
  try {
    // Now you can use req.user.org_id to filter jobs
    const result = await pool.query("SELECT * FROM jobs WHERE org_id = $1", [
      req.user.org_id,
    ]);
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
    res.status(500).json({ error: "Server error fetching job" });
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
    console.error("DB error:", err.message); // 👈 show real error
    res.status(500).json({ error: err.message });
  }
});

// MODAL START --------------- THIS IS NOT IMPLIMENTED ---------------
// Get all notes for a job
app.get("/jobs/:jobId/notes", authenticateToken, async (req, res) => {
  const { jobId } = req.params;
  const result = await pool.query(
    "SELECT n.id, n.note, n.created_at, u.first_name, u.last_name " +
      "FROM job_notes n " +
      "LEFT JOIN users u ON n.user_id = u.id " +
      "WHERE n.job_id = $1 " +
      "ORDER BY n.created_at DESC",
    [jobId]
  );
  res.json(result.rows);
});

// Add a note
app.post("/jobs/:jobId/notes", authenticateToken, async (req, res) => {
  const { jobId } = req.params;
  const { userId, note } = req.body;
  const result = await pool.query(
    "INSERT INTO job_notes (job_id, user_id, note) VALUES ($1, $2, $3) RETURNING *",
    [jobId, userId, note]
  );
  res.json(result.rows[0]);
});

//Get all costs for a job
app.get("/jobs/:jobId/costs", authenticateToken, async (req, res) => {
  const { jobId } = req.params;
  const result = await pool.query(
    `SELECT id, job_id, description, amount, created_at
      FROM job_costs
      WHERE job_id = $1
      ORDER BY created_at DESC`,
    [jobId]
  );
  res.json(result.rows);
});

// add a cost
app.post("/jobs/:jobId/costs", authenticateToken, async (req, res) => {
  const { jobId } = req.params;
  const { description, amount } = req.body;
  const result = await pool.query(
    `INSERT INTO job_costs (job_id, description, amount)
       VALUES ($1, $2, $3)
       RETURNING *`,
    [jobId, description, amount]
  );
  res.json(result.rows[0]);
});

// GET /jobs/:jobId/labor-costs
app.get("/jobs/:jobId/labor-costs", authenticateToken, async (req, res) => {
  const { jobId } = req.params;

  try {
    const result = await pool.query(
      `SELECT
         jt.user_id,
         u.first_name,
         u.last_name,
         u.hourly_rate,
         SUM(EXTRACT(EPOCH FROM (jt.end_time - jt.start_time)) / 3600.0) AS total_hours,
         SUM((EXTRACT(EPOCH FROM (jt.end_time - jt.start_time)) / 3600.0) * u.hourly_rate) AS labor_cost
       FROM job_times jt
       JOIN users u ON jt.user_id = u.id
       WHERE jt.job_id = $1 AND jt.start_time IS NOT NULL AND jt.end_time IS NOT NULL
       GROUP BY jt.user_id, u.first_name, u.last_name, u.hourly_rate`,
      [jobId]
    );

    res.json(result.rows); // return array of user labor costs
  } catch (error) {
    console.error("Error fetching labor costs:", error);
    res.status(500).json({ error: "Failed to calculate labor cost" });
  }
});

// MODAL END --------------- THIS IS NOT IMPLIMENTED ---------------
// ROUTES

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
