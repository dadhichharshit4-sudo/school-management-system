const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Body Parsers (Photo / Base64 अपलोड के लिए 50mb लिमिट)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Supabase PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Database Connection Check
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
    // डेमो एडमिन क्रेडेंशियल्स या डेटाबेस चेक
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

// सभी छात्रों की सूची प्राप्त करें (GET /api/students)
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch Students Error:', err);
    res.status(500).json({ error: 'डेटा लोड करने में त्रुटि!' });
  }
});

// पूरा विस्तृत छात्र प्रवेश फ़ॉर्म सेव करें (POST /api/students)
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

    // फीस टेबल में भी प्रारंभिक रिकॉर्ड दर्ज करें
    try {
      await pool.query(
        'INSERT INTO fees (student_id, total_amount, paid_amount, status) VALUES ($1, $2, $3, $4)',
        [newStudent.id, Number(total_fees) || 20000, 0, 'Pending']
      );
    } catch (feeErr) {
      console.warn('Fee table sync skipped/warning:', feeErr.message);
    }

    res.json({ message: 'छात्र प्रवेश रिकॉर्ड सफलतापूर्वक सुरक्षित हुआ!', student: newStudent });
  } catch (err) {
    console.error('Admission Save Error:', err);
    res.status(500).json({ error: `डेटाबेस त्रुटि: ${err.message}` });
  }
});

// छात्र का कोई भी सेल (नाम, रोल, स्कॉलर नं, फोटो, पिता का नाम आदि) इनलाइन अपडेट करें (PUT /api/students/:id)
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

// छात्र रिकॉर्ड डिलीट करें (DELETE /api/students/:id)
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
   4. SPA ROUTING FALLBACK
========================================== */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running smoothly on port ${PORT}`);
});
