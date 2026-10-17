const express = require('express');

module.exports = function(pool) {
  const router = express.Router();

  // सभी छात्र लोड करें
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM students ORDER BY id ASC');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'छात्र डेटा लोड करने में त्रुटि!' });
    }
  });

  // नया छात्र प्रवेश (10-सेक्शन फॉर्म)
  router.post('/', async (req, res) => {
    try {
      const {
        scholar_no, roll_no, admission_date, name, class_name, section,
        gender, dob, religion, category, caste, aadhaar_no, jan_aadhaar_no,
        pen_no, nic_id, father_name, mother_name, mobile_no, address,
        rte, bus_facility, installment_plan, total_fees, photo_url
      } = req.body;

      const query = `
        INSERT INTO students (
          scholar_no, roll_no, admission_date, name, class_name, section,
          gender, dob, religion, category, caste, aadhaar_no, jan_aadhaar_no,
          pen_no, nic_id, father_name, mother_name, mobile_no, address,
          rte, bus_facility, installment_plan, total_fees, photo_url, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, 'Active'
        ) RETURNING *;
      `;
      const values = [
        scholar_no || '759', roll_no, admission_date || '10/10/2026',
        name, class_name || '8th', section || 'A', gender || 'Male',
        dob || '01/01/2012', religion || 'हिन्दू', category || 'GEN', caste || '',
        aadhaar_no || '', jan_aadhaar_no || '', pen_no || '', nic_id || '',
        father_name || 'श्री देविलाल जी', mother_name || 'श्रीमती सरिता देवी',
        mobile_no || '9876543210', address || 'सिंहपुर', rte || 'NO',
        bus_facility || 'NO', installment_plan || 'Full Payment',
        Number(total_fees) || 20000, photo_url || ''
      ];
      const result = await pool.query(query, values);

      // फीस मास्टर में ऑटो एंट्री
      await pool.query(
        `INSERT INTO fees (student_id, total_amount, paid_amount, status)
         VALUES ($1, $2, 0, 'Pending') ON CONFLICT (student_id) DO NOTHING;`,
        [result.rows[0].id, Number(total_fees) || 20000]
      );

      res.json({ message: 'छात्र प्रवेश रिकॉर्ड सुरक्षित हुआ!', student: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: `डेटाबेस त्रुटि: ${err.message}` });
    }
  });

  // इनलाइन सेल अपडेट
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const allowed = ['scholar_no', 'photo_url', 'name', 'roll_no', 'class_name', 'section', 'gender', 'father_name', 'mother_name', 'mobile_no', 'address', 'dob', 'rte', 'aadhaar_no', 'jan_aadhaar_no', 'status', 'total_fees'];
      const fields = [];
      const values = [];
      let idx = 1;
      for (const k of Object.keys(updates)) {
        if (allowed.includes(k)) {
          fields.push(`${k} = $${idx}`);
          values.push(updates[k]);
          idx++;
        }
      }
      values.push(id);
      const query = `UPDATE students SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
      const result = await pool.query(query, values);
      res.json({ message: 'सेल अपडेट हुआ!', student: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'अपडेट त्रुटि!' });
    }
  });

  // छात्र हटाएं
  router.delete('/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM students WHERE id = $1', [req.params.id]);
      res.json({ message: 'छात्र हटाया गया!' });
    } catch (err) {
      res.status(500).json({ error: 'डिलीट त्रुटि!' });
    }
  });

  return router;
};
