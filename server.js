const express = require('express');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Body Parsers & Static Directory
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Database Pool Connection
let pool = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Database Connection Error:', err.message);
    } else {
      console.log('✅ PostgreSQL / Supabase connected successfully!');
      release();
    }
  });
}

// API Routes
if (pool) {
  try {
    const studentsRoutes = require('./routes/students')(pool);
    app.use('/api/students', studentsRoutes);
  } catch (err) {
    console.error('Students route error:', err);
  }

  try {
    const employeesRoutes = require('./routes/employees')(pool);
    app.use('/api/employees', employeesRoutes);
  } catch (err) {
    // Optional fallback
  }
}

// Root Route
app.get('/', (req, res) => {
  const publicDir = path.join(__dirname, 'public');
  if (fs.existsSync(path.join(publicDir, 'dashboard.html'))) {
    res.sendFile(path.join(publicDir, 'dashboard.html'));
  } else if (fs.existsSync(path.join(publicDir, 'index.html'))) {
    res.sendFile(path.join(publicDir, 'index.html'));
  } else if (fs.existsSync(path.join(publicDir, 'login.html'))) {
    res.sendFile(path.join(publicDir, 'login.html'));
  } else {
    res.redirect('/students');
  }
});

// Primary Fixed Routes
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/students', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'students.html'));
});

app.get('/employees', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'employees.html'));
});

// Dynamic Route: Public folder ke kisi bhi page ko bina .html ke direct open karega
app.get('/:page', (req, res, next) => {
  const pageName = req.params.page;
  const filePath = path.join(__dirname, 'public', `${pageName}.html`);

  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  next();
});

// 404 Fallback
app.use((req, res) => {
  res.redirect('/dashboard');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
