const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Database Pool Connection (Single Declaration)
let pool = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Database Connection Error:', err.message);
    } else {
      console.log('✅ PostgreSQL / Supabase connected successfully!');
      release();
    }
  });
} else {
  console.log('⚠️ DATABASE_URL not found, running in offline/static mode');
}

// Routes
if (pool) {
  try {
    const studentsRoutes = require('./routes/students')(pool);
    app.use('/api/students', studentsRoutes);
  } catch (err) {
    console.error('Error loading students route:', err);
  }

  try {
    const employeesRoutes = require('./routes/employees')(pool);
    app.use('/api/employees', employeesRoutes);
  } catch (err) {
    // If employees route is not modularized with pool, fallback
  }
}

// Page Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/students', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'students.html'));
});

app.get('/employees', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'employees.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
