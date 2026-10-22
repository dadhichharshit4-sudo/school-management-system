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

// Static frontend folder
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL Database Connection (Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test Connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database Connection Error:', err.stack);
  } else {
    console.log('✅ PostgreSQL Database connected successfully!');
    release();
  }
});

// Health check route for UptimeRobot
app.get('/api/health', (req, res) => res.status(200).send('OK'));

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

// Direct Multi-Page HTML Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/students', (req, res) => res.sendFile(path.join(__dirname, 'public', 'students.html')));
app.get('/employees', (req, res) => res.sendFile(path.join(__dirname, 'public', 'employees.html')));
app.get('/attendance', (req, res) => res.sendFile(path.join(__dirname, 'public', 'attendance.html')));
app.get('/attendance-mark', (req, res) => res.sendFile(path.join(__dirname, 'public', 'attendance-mark.html')));
app.get('/attendance-report', (req, res) => res.sendFile(path.join(__dirname, 'public', 'attendance-report.html')));
app.get('/fees', (req, res) => res.sendFile(path.join(__dirname, 'public', 'fees.html')));
app.get('/notifications', (req, res) => res.sendFile(path.join(__dirname, 'public', 'notifications.html')));

// Fallback to login
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Shree Mewar Public School ERP running on port ${PORT}`);
});
