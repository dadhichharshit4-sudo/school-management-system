require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 2. यूजर रजिस्ट्रेशन API (POST /api/auth/register)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // रोल चेक करें (admin, teacher, student, parent)
    const validRoles = ['admin', 'teacher', 'student', 'parent'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'अमान्य रोल! रोल केवल admin, teacher, student या parent होना चाहिए।' });
    }

    // चेक करें कि ईमेल पहले से मौजूद तो नहीं है
    const userExist = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({ error: 'यह ईमेल पहले से पंजीकृत है!' });
    }

    // पासवर्ड हैश (सुरक्षित) करें
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // डेटाबेस में यूजर सेव करें
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, hashedPassword, role]
    );

    res.status(201).json({
      message: 'यूजर सफलतापूर्वक रजिस्टर हो गया!',
      user: newUser.rows[0]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'रजिस्ट्रेशन में सर्वर त्रुटि' });
  }
});

// 3. यूजर लॉगिन API (POST /api/auth/login)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // यूजर ढूंढें
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'ईमेल या पासवर्ड गलत है!' });
    }

    // पासवर्ड मैच करें
    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ error: 'ईमेल या पासवर्ड गलत है!' });
    }

    // JWT टोकन बनाएं
    const token = jwt.sign(
      { id: user.rows[0].id, role: user.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'लॉगिन सफल!',
      token: token,
      user: {
        id: user.rows[0].id,
        name: user.rows[0].name,
        email: user.rows[0].email,
        role: user.rows[0].role
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'लॉगिन में सर्वर त्रुटि' });
  }
});

// 4. नोटिस API (GET)
app.get('/api/notices', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notices ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'डेटाबेस एरर' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
// 5. नया नोटिस जोड़ने की API (POST /api/notices)
app.post('/api/notices', async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'शीर्षक और विवरण दोनों आवश्यक हैं!' });
    }

    const newNotice = await pool.query(
      'INSERT INTO notices (title, description, date) VALUES ($1, $2, CURRENT_DATE) RETURNING *',
      [title, description]
    );

    res.status(201).json({
      message: 'नोटिस सफलतापूर्वक पोस्ट हो गया!',
      notice: newNotice.rows[0]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'नोटिस सेव करने में डेटाबेस एरर' });
  }
});
// 6. सभी छात्रों की सूची प्राप्त करें
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY roll_no ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'छात्रों का डेटा लोड करने में त्रुटि' });
  }
});

// 7. हाजिरी सेव करें
app.post('/api/attendance', async (req, res) => {
  try {
    const { attendanceData } = req.body; // Array: [{ student_id, status }]
    if (!attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({ error: 'अमान्य डेटा!' });
    }

    for (const item of attendanceData) {
      await pool.query(
        `INSERT INTO attendance (student_id, status, date)
         VALUES ($1, $2, CURRENT_DATE)
         ON CONFLICT (student_id, date)
         DO UPDATE SET status = EXCLUDED.status`,
        [item.student_id, item.status]
      );
    }

    res.json({ message: 'हाजिरी सफलतापूर्वक दर्ज हो गई!' });
  } catch (err) {
    res.status(500).json({ error: 'हाजिरी सेव करने में डेटाबेस एरर' });
  }
});
// 8. छात्रों की फीस सूची प्राप्त करें
app.get('/api/fees', async (req, res) => {
  try {
    const query = `
      SELECT s.id AS student_id, s.roll_no, s.name, s.class_name,
             COALESCE(f.total_amount, 20000) AS total_amount,
             COALESCE(f.paid_amount, 0) AS paid_amount,
             COALESCE(f.status, 'Pending') AS status
      FROM students s
      LEFT JOIN fees f ON s.id = f.student_id
      ORDER BY s.roll_no ASC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'फीस रिकॉर्ड लोड करने में त्रुटि' });
  }
  // 11. अटेंडेंस रिपोर्ट और प्रतिशत API
app.get('/api/attendance/report', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id AS student_id,
        s.roll_no,
        s.name,
        s.class_name,
        COUNT(a.id) AS total_days,
        COUNT(CASE WHEN a.status = 'Present' THEN 1 END) AS present_days
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id
      GROUP BY s.id, s.roll_no, s.name, s.class_name
      ORDER BY s.roll_no ASC;
    `;
    const result = await pool.query(query);

    const report = result.rows.map(row => {
      const total = Number(row.total_days);
      const present = Number(row.present_days);
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      return {
        ...row,
        total_days: total,
        present_days: present,
        percentage
      };
    });

    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'अटेंडेंस रिपोर्ट लोड करने में त्रुटि' });
  }
});
});

// 9. फीस जमा / अपडेट करें
app.post('/api/fees/pay', async (req, res) => {
  try {
    const { student_id, amount } = req.body;
    const addAmount = Number(amount);

    if (!student_id || isNaN(addAmount) || addAmount <= 0) {
      return res.status(400).json({ error: 'अमान्य राशि!' });
    }

    const feeRes = await pool.query('SELECT * FROM fees WHERE student_id = $1', [student_id]);
    let total = 20000;
    let currentPaid = 0;

    if (feeRes.rows.length > 0) {
      total = Number(feeRes.rows[0].total_amount);
      currentPaid = Number(feeRes.rows[0].paid_amount);
    }

    const newPaid = currentPaid + addAmount;
    const newStatus = newPaid >= total ? 'Paid' : newPaid > 0 ? 'Partial' : 'Pending';

    await pool.query(
      `INSERT INTO fees (student_id, total_amount, paid_amount, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (student_id)
       DO UPDATE SET paid_amount = $3, status = $4`,
      [student_id, total, newPaid, newStatus]
    );

    res.json({ message: 'फीस सफलतापूर्वक अपडेट हो गई!' });
  } catch (err) {
    res.status(500).json({ error: 'फीस अपडेट करने में सर्वर एरर' });
  }
});
// 10. नया छात्र जोड़ने की API (POST /api/students)
app.post('/api/students', async (req, res) => {
  try {
    const { roll_no, name, class_name, total_fees } = req.body;

    if (!roll_no || !name || !class_name) {
      return res.status(400).json({ error: 'रोल नंबर, नाम और कक्षा आवश्यक हैं!' });
    }

    // 1. छात्र को students टेबल में जोड़ें
    const studentRes = await pool.query(
      'INSERT INTO students (roll_no, name, class_name) VALUES ($1, $2, $3) RETURNING *',
      [roll_no, name, class_name]
    );

    const newStudent = studentRes.rows[0];
    const feeAmount = Number(total_fees) || 20000;

    // 2. उसी छात्र के लिए फीस टेबल में रिकॉर्ड बनाएँ
    await pool.query(
      'INSERT INTO fees (student_id, total_amount, paid_amount, status) VALUES ($1, $2, 0, $3)',
      [newStudent.id, feeAmount, 'Pending']
    );

    res.status(201).json({
      message: 'नया छात्र और फीस रिकॉर्ड सफलतापूर्वक जुड़ गया!',
      student: newStudent
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'यह रोल नंबर पहले से मौजूद है!' });
    }
    console.error(err.message);
    res.status(500).json({ error: 'डेटाबेस एरर: छात्र सेव नहीं हो सका' });
  }
});
// 12. परीक्षा अंक दर्ज करने की API (Admin / Teacher)
app.post('/api/marks', async (req, res) => {
  try {
    const { student_id, subject, marks_obtained, total_marks, exam_name } = req.body;
    if (!student_id || !subject || marks_obtained === undefined) {
      return res.status(400).json({ error: 'सभी फ़ील्ड्स आवश्यक हैं!' });
    }

    const result = await pool.query(
      `INSERT INTO marks (student_id, subject, marks_obtained, total_marks, exam_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [student_id, subject, Number(marks_obtained), Number(total_marks) || 100, exam_name || 'अर्धवार्षिक परीक्षा']
    );

    res.status(201).json({ message: 'अंक सफलतापूर्वक दर्ज किए गए!', mark: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'अंक सेव करने में विफलता!' });
  }
});

// 13. छात्र रिपोर्ट कार्ड प्राप्त करने की API
app.get('/api/marks', async (req, res) => {
  try {
    const query = `
      SELECT 
        m.id,
        m.student_id,
        s.name,
        s.roll_no,
        s.class_name,
        m.subject,
        m.marks_obtained,
        m.total_marks,
        m.exam_name
      FROM marks m
      JOIN students s ON m.student_id = s.id
      ORDER BY s.roll_no ASC, m.id DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'मार्क्स डेटा लोड करने में त्रुटि' });
  }
});
// 14. मार्क्स एडिट/अपडेट करने की API (PUT /api/marks/:id)
app.put('/api/marks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { marks_obtained, total_marks } = req.body;
    const result = await pool.query(
      'UPDATE marks SET marks_obtained = $1, total_marks = $2 WHERE id = $3 RETURNING *',
      [Number(marks_obtained), Number(total_marks) || 100, id]
    );
    res.json({ message: 'मार्क्स सफलतापूर्वक अपडेट हो गए!', mark: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'मार्क्स अपडेट करने में त्रुटि' });
  }
});

// 15. मार्क्स डिलीट करने की API (DELETE /api/marks/:id)
app.delete('/api/marks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM marks WHERE id = $1', [id]);
    res.json({ message: 'रिकॉर्ड हटा दिया गया!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'मार्क्स डिलीट करने में त्रुटि' });
  }
});
// 16. नया होमवर्क पोस्ट करने की API (Admin / Teacher)
app.post('/api/homework', async (req, res) => {
  try {
    const { class_name, subject, title, description, due_date } = req.body;
    if (!subject || !title || !description) {
      return res.status(400).json({ error: 'सभी विवरण भरना अनिवार्य है!' });
    }

    const result = await pool.query(
      `INSERT INTO homework (class_name, subject, title, description, due_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [class_name || 'Class 10-A', subject, title, description, due_date || new Date()]
    );

    res.status(201).json({ message: 'गृहकार्य सफलतापूर्वक पोस्ट किया गया!', homework: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'होमवर्क सेव करने में त्रुटि!' });
  }
});

// 17. होमवर्क सूची प्राप्त करने की API
app.get('/api/homework', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM homework ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'होमवर्क लोड करने में विफलता!' });
  }
});
// 18. होमवर्क डिलीट करने की API (DELETE /api/homework/:id)
app.delete('/api/homework/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM homework WHERE id = $1', [id]);
    res.json({ message: 'गृहकार्य सफलतापूर्वक हटा दिया गया!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'होमवर्क हटाने में त्रुटि!' });
  }
});
