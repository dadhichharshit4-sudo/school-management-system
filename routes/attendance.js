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

  router.post('/bulk', async (req, res) => {
    try {
      const { attendance_date, records } = req.body;
      if (!attendance_date || !records) return res.status(400).json({ error: 'अमान्य डेटा!' });

      for (const item of records) {
        const query = `
          INSERT INTO attendance (student_id, class_name, section, attendance_date, status, remarks)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (student_id, attendance_date)
          DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks;
        `;
        await pool.query(query, [
          item.student_id, item.class_name || '8th', item.section || 'A',
          attendance_date, item.status || 'Present', item.remarks || ''
        ]);
      }
      res.json({ message: 'उपस्थिति सफलतापूर्वक सुरक्षित हुई!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
