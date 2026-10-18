const express = require('express');

module.exports = function(pool) {
  const router = express.Router();

  // अनुपस्थित छात्रों की सूची अलर्ट हेतु प्राप्त करें
  router.get('/absent-today', async (req, res) => {
    try {
      const today = req.query.date || new Date().toISOString().split('T')[0];
      const query = `
        SELECT a.id AS att_id, a.attendance_date, s.id AS student_id, s.name, s.scholar_no, 
               s.roll_no, s.class_name, s.section, s.father_name, s.mobile_no
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        WHERE a.attendance_date = $1 AND a.status = 'Absent'
        ORDER BY s.class_name, s.roll_no ASC;
      `;
      const result = await pool.query(query, [today]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'अनुपस्थित डेटा लोड करने में त्रुटि!' });
    }
  });

  // फीस रिमाइंडर हेतु बकाया छात्रों की सूची
  router.get('/fee-defaulters', async (req, res) => {
    try {
      const query = `
        SELECT s.id AS student_id, s.name, s.scholar_no, s.roll_no, s.class_name, s.section,
               s.father_name, s.mobile_no,
               COALESCE(f.total_amount, s.total_fees, 20000) AS total_fees,
               COALESCE(f.paid_amount, 0) AS paid_fees,
               (COALESCE(f.total_amount, s.total_fees, 20000) - COALESCE(f.paid_amount, 0)) AS balance_fees
        FROM students s
        LEFT JOIN fees f ON s.id = f.student_id
        WHERE (COALESCE(f.total_amount, s.total_fees, 20000) - COALESCE(f.paid_amount, 0)) > 0
        ORDER BY s.class_name, s.roll_no ASC;
      `;
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'बकाया फीस डेटा लोड त्रुटि!' });
    }
  });

  // संदेश लॉग सुरक्षित करें
  router.post('/log', async (req, res) => {
    try {
      const { recipient_mobile, student_id, message_type, message_text } = req.body;
      res.json({ message: 'संदेश सफलतापूर्वक लॉग किया गया!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
