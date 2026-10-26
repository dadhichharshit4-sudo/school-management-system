const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 10000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static frontend folder
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Dedicated Health Check route (Render Ping)
app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

// PostgreSQL Database Connection (Supabase)
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database Connection Error:', err.message);
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

// Helper: Safe File Serving (ताकि सर्वर कभी हैंग न हो)
function serveSafe(res, fileName) {
  const filePath = path.join(publicDir, fileName);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  // Fallback to login or basic text if file is missing
  const loginPath = path.join(publicDir, 'login.html');
  if (fs.existsSync(loginPath)) {
    return res.sendFile(loginPath);
  }
  res.status(200).send(`<h2>SHREE MEWAR PUBLIC SCHOOL ERP</h2><p>Loading ${fileName}...</p>`);
}

// Multi-Page Routes
app.get('/', (req, res) => serveSafe(res, 'login.html'));
app.get('/login', (req, res) => serveSafe(res, 'login.html'));
app.get('/dashboard', (req, res) => serveSafe(res, 'dashboard.html'));
app.get('/students', (req, res) => serveSafe(res, 'students.html'));
app.get('/employees', (req, res) => serveSafe(res, 'employees.html'));
app.get('/attendance', (req, res) => serveSafe(res, 'attendance.html'));
app.get('/attendance-mark', (req, res) => serveSafe(res, 'attendance-mark.html'));
app.get('/attendance-report', (req, res) => serveSafe(res, 'attendance-report.html'));
app.get('/fees', (req, res) => serveSafe(res, 'fees.html'));
app.get('/notifications', (req, res) => serveSafe(res, 'notifications.html'));

// Wildcard Fallback (Express 5 & Node 24 safe regex)
app.get(/.*/, (req, res) => serveSafe(res, 'login.html'));

// Start Server listening on 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Shree Mewar Public School ERP running on port ${PORT}`);
});
  
