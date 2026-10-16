const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// स्टैटिक फाइलें (HTML, CSS, Modules)
app.use(express.static(path.join(__dirname, 'public')));

// Supabase डेटाबेस कनेक्शन
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
  if (err) console.error('Database connection error:', err.stack);
  else { console.log('Connected to PostgreSQL Database successfully!'); release(); }
});

// अलग-अलग मॉड्यूल्स के राउट्स जोड़ना (Routes)
const studentsRouter = require('./routes/students');
const employeesRouter = require('./routes/employees');
const attendanceRouter = require('./routes/attendance');
const feesRouter = require('./routes/fees');

app.use('/api/students', studentsRouter(pool));
app.use('/api/employees', employeesRouter(pool));
app.use('/api/attendance', attendanceRouter(pool));
app.use('/api/fees', feesRouter(pool));

// SPA डिफ़ॉल्ट रूट
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running smoothly on port ${PORT}`);
});
