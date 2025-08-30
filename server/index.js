require('dotenv').config();
const express = require('express');
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
if (process.env.DATABASE_URL !== "postgres://postgres:password@localhost:5432/tododb") {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

// ROUTES
app.post("/timeLog", async (req, res) => {
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
