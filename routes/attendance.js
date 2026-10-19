const express = require('express');

module.exports = function(pool) {
  const router = express.Router();

  router.get('/', async (req, res) => {
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
      res.status(500).json({ error: 'उपस्थिति लोड त्रुटि!' });
    }
  });

 const express = require('express');

module.exports = function(pool) {
  const router = express.Router();

  // बल्क अटेंडेंस सुरक्षित रूप से सेव करें
  router.post('/bulk', async (req, res) => {
    try {
      const { attendance_date, records } = req.body;
      if (!records || records.length === 0) {
        return res.status(400).json({ error: 'कोई रिकॉर्ड नहीं मिला!' });
      }

      for (const r of records) {
        // चेक करें कि क्या यह छात्र आईडी डेटाबेस में वास्तव में है
        let validStudentId = null;
        if (r.student_id) {
          const check = await pool.query('SELECT id FROM students WHERE id = $1', [r.student_id]);
          if (check.rows.length > 0) {
            validStudentId = r.student_id;
          }
        }

        // पहले से मौजूद आज की हाजिरी अपडेट करें या नई डालें
        if (validStudentId) {
          await pool.query(`
            INSERT INTO attendance (student_id, attendance_date, status, remarks)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (student_id, attendance_date) 
            DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks;
          `, [validStudentId, attendance_date, r.status, r.remarks || '']);
        } else {
          // यदि डमी या बिना आईडी का रिकॉर्ड है
          await pool.query(`
            INSERT INTO attendance (attendance_date, status, remarks)
            VALUES ($1, $2, $3);
          `, [attendance_date, r.status, `${r.class_name || ''} - ${r.remarks || ''}`]);
        }
      }

      res.json({ message: 'उपस्थिति सफलतापूर्वक सुरक्षित हुई!' });
    } catch (err) {
      console.error("Attendance Save Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
