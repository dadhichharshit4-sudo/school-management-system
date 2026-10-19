const express = require('express');

module.exports = function(pool) {
  const router = express.Router();

  // 1. दैनिक उपस्थिति बल्क सेव
  router.post('/bulk', async (req, res) => {
    try {
      const { attendance_date, records } = req.body;
      if (!records || records.length === 0) {
        return res.status(400).json({ error: 'कोई रिकॉर्ड नहीं मिला!' });
      }

      for (const r of records) {
        let validStudentId = null;
        if (r.student_id) {
          const check = await pool.query('SELECT id FROM students WHERE id = $1', [r.student_id]);
          if (check.rows.length > 0) {
            validStudentId = r.student_id;
          }
        }

        if (validStudentId) {
          await pool.query(`
            INSERT INTO attendance (student_id, attendance_date, status, remarks)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (student_id, attendance_date) 
            DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks;
          `, [validStudentId, attendance_date, r.status, r.remarks || '']);
        } else {
          await pool.query(`
            INSERT INTO attendance (attendance_date, status, remarks)
            VALUES ($1, $2, $3);
          `, [attendance_date, r.status, `${r.class_name || ''} - ${r.remarks || ''}`]);
        }
      }

      res.json({ message: 'उपस्थिति सफलतापूर्वक सुरक्षित हुई!' });
    } catch (err) {
      console.error("Attendance Bulk Save Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. मासिक उपस्थिति सारांश
  router.get('/monthly', async (req, res) => {
    try {
      const { class_name, month } = req.query;
      const result = await pool.query(`
        SELECT a.*, s.name, s.scholar_no, s.roll_no
        FROM attendance a
        LEFT JOIN students s ON a.student_id = s.id
        ORDER BY a.attendance_date ASC;
      `);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
