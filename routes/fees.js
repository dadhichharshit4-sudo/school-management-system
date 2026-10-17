const express = require('express');

module.exports = function(pool) {
  const router = express.Router();

  router.get('/summary', async (req, res) => {
    try {
      const query = `
        SELECT 
          s.id AS student_id, s.scholar_no, s.roll_no, s.name, s.class_name, s.section,
          s.father_name, s.mobile_no,
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
      res.status(500).json({ error: 'फ़ीस सारांश लोड त्रुटि!' });
    }
  });

  router.post('/pay', async (req, res) => {
    try {
      const { student_id, amount_paid, payment_mode, remarks } = req.body;
      const paid = Number(amount_paid);
      if (!student_id || !paid || paid <= 0) return res.status(400).json({ error: 'अमान्य राशि!' });

      const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
      await pool.query(
        `INSERT INTO fee_transactions (receipt_no, student_id, amount_paid, payment_mode, remarks)
         VALUES ($1, $2, $3, $4, $5)`,
        [receiptNo, student_id, paid, payment_mode || 'Cash', remarks || 'Fee Payment']
      );

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
      res.json({ message: 'फ़ीस जमा हुई!', receipt_no: receiptNo, fee_record: feeRes.rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/transactions', async (req, res) => {
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
      res.status(500).json({ error: 'ट्रांज़ैक्शन लोड त्रुटि!' });
    }
  });

  return router;
};
