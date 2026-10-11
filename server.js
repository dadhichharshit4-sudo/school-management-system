const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Body Parsers (Photo / Base64 के लिए 50mb लिमिट)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// इनबिल्ट CORS हेडर्स
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Supabase PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Connected to PostgreSQL Database successfully!');
    release();
  }
});

/* ==========================================
   1. AUTHENTICATION APIS
========================================== */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (email && password) {
      return res.json({ 
        message: 'Login successful', 
        user: { email, role: 'Admin', school: 'SHREE MEWAR PUBLIC SCHOOL' } 
      });
    }
    res.status(401).json({ error: 'अमान्य क्रेडेंशियल्स!' });
  } catch (err) {
    res.status(500).json({ error: 'लॉगिन में त्रुटि!' });
  }
});

/* ==========================================
   2. STUDENTS APIS (विद्यार्थी मॉड्यूल)
========================================== */
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch Students Error:', err);
    res.status(500).json({ error: 'डेटा लोड करने में त्रुटि!' });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const {
      scholar_no, roll_no, admission_date,
      name, class_name, section, gender, dob, religion, category, caste,
      aadhaar_no, jan_aadhaar_no, pen_no, nic_id,
      father_name, mother_name, mobile_no, address,
      rte, bus_facility, installment_plan, total_fees, photo_url
    } = req.body;

    if (!name || !roll_no) {
      return res.status(400).json({ error: 'छात्र का नाम और रोल नंबर अनिवार्य हैं!' });
    }

    const query = `
      INSERT INTO students (
        scholar_no, roll_no, admission_date,
        name, class_name, section, gender, dob, religion, category, caste,
        aadhaar_no, jan_aadhaar_no, pen_no, nic_id,
        father_name, mother_name, mobile_no, address,
        rte, bus_facility, installment_plan, total_fees, photo_url, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, 'Active'
      ) RETURNING *;
    `;

    const values = [
      scholar_no || '759',
      roll_no,
      admission_date || '10/10/2026',
      name,
      class_name || '8th',
      section || 'A',
      gender || 'Male',
      dob || '01/01/2012',
      religion || 'हिन्दू',
      category || 'GEN',
      caste || '',
      aadhaar_no || '',
      jan_aadhaar_no || '',
      pen_no || '',
      nic_id || '',
      father_name || 'श्री देविलाल जी',
      mother_name || 'श्रीमती सरिता देवी',
      mobile_no || '9876543210',
      address || 'सिंहपुर',
      rte || 'NO',
      bus_facility || 'NO',
      installment_plan || 'Full Payment',
      Number(total_fees) || 20000,
      photo_url || ''
    ];

    const result = await pool.query(query, values);
    const newStudent = result.rows[0];

    try {
      await pool.query(
        'INSERT INTO fees (student_id, total_amount, paid_amount, status) VALUES ($1, $2, $3, $4)',
        [newStudent.id, Number(total_fees) || 20000, 0, 'Pending']
      );
    } catch (feeErr) {
      console.warn('Fee insert warning:', feeErr.message);
    }

    res.json({ message: 'छात्र प्रवेश रिकॉर्ड सफलतापूर्वक सुरक्षित हुआ!', student: newStudent });
  } catch (err) {
    console.error('Admission Save Error:', err);
    res.status(500).json({ error: `डेटाबेस त्रुटि: ${err.message}` });
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedColumns = [
      'scholar_no', 'photo_url', 'name', 'roll_no', 'class_name', 'section', 'gender',
      'father_name', 'mother_name', 'mobile_no', 'address',
      'dob', 'rte', 'aadhaar_no', 'jan_aadhaar_no', 'status', 'documents', 'total_fees'
    ];

    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of Object.keys(updates)) {
      if (allowedColumns.includes(key)) {
        fields.push(`${key} = $${idx}`);
        values.push(updates[key]);
        idx++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'अपडेट के लिए कोई मान्य फ़ील्ड नहीं मिली!' });
    }

    values.push(id);
    const query = `UPDATE students SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(query, values);

    res.json({ message: 'सेल सफलतापूर्वक अपडेट हुआ!', student: result.rows[0] });
  } catch (err) {
    console.error('Inline Cell Update Error:', err);
    res.status(500).json({ error: 'अपडेट करने में त्रुटि!' });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM fees WHERE student_id = $1', [id]);
    await pool.query('DELETE FROM students WHERE id = $1', [id]);
    res.json({ message: 'छात्र रिकॉर्ड सफलतापूर्वक हटा दिया गया!' });
  } catch (err) {
    console.error('Delete Student Error:', err);
    res.status(500).json({ error: 'डिलीट करने में त्रुटि!' });
  }
});

/* ==========================================
   3. FEES & ATTENDANCE APIS
========================================== */
app.get('/api/fees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM fees');
    res.json(result.rows);
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/attendance/report', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM attendance');
    res.json(result.rows);
  } catch (err) {
    res.json([]);
  }
});

/* ==========================================
   4. SPA ROUTING (Node 24 / Express New Safe Handler)
========================================== */
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running smoothly on port ${PORT}`);
});
/* ==========================================
   2.1 STAFF / EMPLOYEE APIS (कर्मचारी मॉड्यूल)
========================================== */

// सभी कर्मचारियों की सूची (GET /api/employees)
app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch Employees Error:', err);
    res.status(500).json({ error: 'कर्मचारी डेटा लोड करने में त्रुटि!' });
  }
});

// नया कर्मचारी जोड़ें (POST /api/employees)
app.post('/api/employees', async (req, res) => {
  try {
    const {
      emp_code, name, designation, department,
      mobile_no, email, salary, joining_date,
      qualification, address, photo_url
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'कर्मचारी का नाम अनिवार्य है!' });
    }

    const query = `
      INSERT INTO employees (
        emp_code, name, designation, department,
        mobile_no, email, salary, joining_date,
        qualification, address, photo_url, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Active')
      RETURNING *;
    `;

    const values = [
      emp_code || `EMP-${Math.floor(100 + Math.random() * 900)}`,
      name,
      designation || 'Teacher',
      department || 'Teaching',
      mobile_no || '9876543210',
      email || '',
      Number(salary) || 25000,
      joining_date || '01/07/2026',
      qualification || '',
      address || 'सिंहपुर',
      photo_url || ''
    ];

    const result = await pool.query(query, values);
    res.json({ message: 'कर्मचारी रिकॉर्ड सुरक्षित हुआ!', employee: result.rows[0] });
  } catch (err) {
    console.error('Save Employee Error:', err);
    res.status(500).json({ error: `कर्मचारी सेव करने में त्रुटि: ${err.message}` });
  }
});

// इनलाइन सेल अपडेट (PUT /api/employees/:id)
app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedColumns = [
      'emp_code', 'name', 'designation', 'department',
      'mobile_no', 'email', 'salary', 'joining_date',
      'qualification', 'address', 'photo_url', 'status'
    ];

    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of Object.keys(updates)) {
      if (allowedColumns.includes(key)) {
        fields.push(`${key} = $${idx}`);
        values.push(updates[key]);
        idx++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'अपडेट के लिए मान्य फ़ील्ड नहीं मिली!' });
    }

    values.push(id);
    const query = `UPDATE employees SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(query, values);

    res.json({ message: 'कर्मचारी डेटा अपडेट हुआ!', employee: result.rows[0] });
  } catch (err) {
    console.error('Update Employee Error:', err);
    res.status(500).json({ error: 'अपडेट में त्रुटि!' });
  }
});

// कर्मचारी हटाएं (DELETE /api/employees/:id)
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM employees WHERE id = $1', [id]);
    res.json({ message: 'कर्मचारी रिकॉर्ड सफलतापूर्वक हटा दिया गया!' });
  } catch (err) {
    console.error('Delete Employee Error:', err);
    res.status(500).json({ error: 'डिलीट में त्रुटि!' });
  }
});
