const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL Database Connection (Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test Database Connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database Connection Error:', err.stack);
  } else {
    console.log('✅ PostgreSQL Database connected successfully!');
    release();
  }
});

// Import API Routers
const studentsRouter = require('./routes/students');
const employeesRouter = require('./routes/employees');
const attendanceRouter = require('./routes/attendance');
const feesRouter = require('./routes/fees');
const notificationsRouter = require('./routes/notifications');

// Register API Routes
app.use('/api/students', studentsRouter(pool));
app.use('/api/employees', employeesRouter(pool));
app.use('/api/attendance', attendanceRouter(pool));
app.use('/api/fees', feesRouter(pool));
app.use('/api/notifications', notificationsRouter(pool));

// Fallback HTML routing (Node.js 24 / Express 5 compatible: use regex instead of '*')
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Shree Mewar Public School ERP Server running on port ${PORT}`);
});
