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

app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
  if (err) console.error('Database connection error:', err.stack);
  else { console.log('Connected to PostgreSQL Database successfully!'); release(); }
});

/* 1. AUTH APIS */
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

/* 2. STUDENTS APIS */
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
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

    if (!name || !roll_no) return res.status(400).json({ error: 'छात्र का नाम और रोल नंबर अनिवार्य हैं!' });

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
      scholar_no || '759', roll_no, admission_date || '10/10/2026',
      name, class_name || '8th', section || 'A', gender || 'Male',
      dob || '01/01/2012', religion || 'हिन्दू', category || 'GEN', caste || '',
      aadhaar_no || '', jan_aadhaar_no || '', pen_no || '', nic_id || '',
      father_name || 'श्री देविलाल जी', mother_name || 'श्रीमती सरिता देवी',
      mobile_no || '9876543210', address || 'सिंहपुर',
      rte || 'NO', bus_facility || 'NO', installment_plan || 'Full Payment',
      Number(total_fees) || 20000, photo_url || ''
    ];

    const result = await pool.query(query, values);
    res.json({ message: 'छात्र प्रवेश रिकॉर्ड सफलतापूर्वक सुरक्षित हुआ!', student: result.rows[0] });
  } catch (err) {
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
    if (fields.length === 0) return res.status(400).json({ error: 'अपडेट के लिए मान्य फ़ील्ड नहीं मिली!' });
    values.push(id);
    const query = `UPDATE students SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(query, values);
    res.json({ message: 'सेल सफलतापूर्वक अपडेट हुआ!', student: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'अपडेट करने में त्रुटि!' });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM students WHERE id = $1', [id]);
    res.json({ message: 'छात्र रिकॉर्ड हटा दिया गया!' });
  } catch (err) {
    res.status(500).json({ error: 'डिलीट त्रुटि!' });
  }
});

/* 3. EMPLOYEES APIS */
app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'कर्मचारी डेटा लोड करने में त्रुटि!' });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    const { emp_code, name, designation, department, mobile_no, email, salary, joining_date, qualification, address, photo_url } = req.body;
    if (!name) return res.status(400).json({ error: 'कर्मचारी का नाम अनिवार्य है!' });

    const query = `
      INSERT INTO employees (emp_code, name, designation, department, mobile_no, email, salary, joining_date, qualification, address, photo_url, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Active') RETURNING *;
    `;
    const values = [
      emp_code || `EMP-${Math.floor(100 + Math.random() * 900)}`,
      name, designation || 'Teacher', department || 'Teaching',
      mobile_no || '9876543210', email || '', Number(salary) || 25000,
      joining_date || '01/07/2026', qualification || '', address || 'सिंहपुर', photo_url || ''
    ];
    const result = await pool.query(query, values);
    res.json({ message: 'कर्मचारी रिकॉर्ड सुरक्षित हुआ!', employee: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: `कर्मचारी सेव करने में त्रुटि: ${err.message}` });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
   const allowedColumns = ['emp_code', 'name', 'designation', 'department', 'gender', 'mobile_no', 'email', 'salary', 'joining_date', 'qualification', 'address', 'photo_url', 'status', 'class_teacher'];
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
    if (fields.length === 0) return res.status(400).json({ error: 'अपडेट के लिए मान्य फ़ील्ड नहीं मिली!' });
    values.push(id);
    const query = `UPDATE employees SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(query, values);
    res.json({ message: 'कर्मचारी डेटा अपडेट हुआ!', employee: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'अपडेट में त्रुटि!' });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM employees WHERE id = $1', [id]);
    res.json({ message: 'कर्मचारी हटाया गया!' });
  } catch (err) {
    res.status(500).json({ error: 'डिलीट त्रुटि!' });
  }
});

/* 4. ADVANCED ATTENDANCE APIS */
app.get('/api/attendance', async (req, res) => {
  try {
    const { date, class_name, section } = req.query;
    let query = `
      SELECT a.*, s.name, s.roll_no, s.scholar_no 
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE 1=1
    `;
    const values = [];
    let idx = 1;

    if (date) { query += ` AND a.attendance_date = $${idx}`; values.push(date); idx++; }
    if (class_name) { query += ` AND a.class_name = $${idx}`; values.push(class_name); idx++; }
    if (section) { query += ` AND a.section = $${idx}`; values.push(section); idx++; }

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'उपस्थिति लोड करने में त्रुटि!' });
  }
});

app.post('/api/attendance/bulk', async (req, res) => {
  try {
    const { attendance_date, records } = req.body;
    if (!attendance_date || !records || records.length === 0) {
      return res.status(400).json({ error: 'तारीख और उपस्थिति रिकॉर्ड अनिवार्य हैं!' });
    }

    for (const item of records) {
      const query = `
        INSERT INTO attendance (student_id, class_name, section, attendance_date, status, remarks)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (student_id, attendance_date)
        DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks;
      `;
      await pool.query(query, [
        item.student_id,
        item.class_name || '8th',
        item.section || 'A',
        attendance_date,
        item.status || 'Present',
        item.remarks || ''
      ]);
    }

    res.json({ message: 'उपस्थिति सफलतापूर्वक सुरक्षित हुई!' });
  } catch (err) {
    res.status(500).json({ error: `उपस्थिति सेव करने में त्रुटि: ${err.message}` });
  }
});
/* ==========================================
   FEES MANAGEMENT APIS
========================================== */

// 1. सभी छात्रों की फ़ीस स्थिति लोड करें (GET /api/fees/summary)
app.get('/api/fees/summary', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id AS student_id,
        s.scholar_no,
        s.roll_no,
        s.name,
        s.class_name,
        s.section,
        s.father_name,
        s.mobile_no,
        COALESCE(f.total_amount, s.total_fees, 20000) AS total_fees,
        COALESCE(f.paid_amount, 0) AS paid_fees,
        (COALESCE(f.total_amount, s.total_fees, 20000) - COALESCE(f.paid_amount, 0)) AS balance_fees,
        COALESCE(f.status, 'Pending') AS fee_status
      FROM students s
      LEFT JOIN fees f ON s.id = f.student_id
      ORDER BY s.id ASC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch Fees Error:', err);
    res.status(500).json({ error: 'फ़ीस डेटा लोड करने में त्रुटि!' });
  }
});

// 2. फ़ीस जमा करें और रसीद बनाएं (POST /api/fees/pay)
app.post('/api/fees/pay', async (req, res) => {
  try {
    const { student_id, amount_paid, payment_mode, remarks } = req.body;
    const paid = Number(amount_paid);

    if (!student_id || !paid || paid <= 0) {
      return res.status(400).json({ error: 'अमान्य छात्र या राशि!' });
    }

    const receiptNo = `REC-${Date.now().toString().slice(-6)}`;

    // रसीद रिकॉर्ड दर्ज करें
    await pool.query(
      `INSERT INTO fee_transactions (receipt_no, student_id, amount_paid, payment_mode, remarks)
       VALUES ($1, $2, $3, $4, $5)`,
      [receiptNo, student_id, paid, payment_mode || 'Cash', remarks || 'Fee Payment']
    );

    // फ़ीस टेबल अपडेट करें
    const updateQuery = `
      INSERT INTO fees (student_id, total_amount, paid_amount, status)
      VALUES ($1, 20000, $2, 'Pending')
      ON CONFLICT (student_id) DO UPDATE 
      SET paid_amount = fees.paid_amount + EXCLUDED.paid_amount,
          status = CASE 
            WHEN (fees.paid_amount + EXCLUDED.paid_amount) >= fees.total_amount THEN 'Paid'
            ELSE 'Partial'
          END
      RETURNING *;
    `;
    const feeRes = await pool.query(updateQuery, [student_id, paid]);

    res.json({
      message: 'फ़ीस सफलतापूर्वक जमा हुई!',
      receipt_no: receiptNo,
      fee_record: feeRes.rows[0]
    });
  } catch (err) {
    console.error('Fee Pay Error:', err);
    res.status(500).json({ error: `भुगतान त्रुटि: ${err.message}` });
  }
});
// भुगतान इतिहास API (GET /api/fees/transactions)
app.get('/api/fees/transactions', async (req, res) => {
  try {
    const query = `
      SELECT t.*, s.name, s.scholar_no, s.roll_no, s.class_name, s.section, s.father_name
      FROM fee_transactions t
      JOIN students s ON t.student_id = s.id
      ORDER BY t.id DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'इतिहास लोड करने में त्रुटि!' });
  }
});
/* 5. SPA ROUTING */
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running smoothly on port ${PORT}`);
});
