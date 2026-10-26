const express = require('express');

module.exports = function(pool) {
  const router = express.Router();

  // 1. GET ALL STUDENTS
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          s.id,
          s.scholar_no,
          s.admission_date as adm_date,
          s.name,
          s.pen_no,
          s.roll_no,
          s.class_name,
          s.section,
          s.status,
          s.gender,
          s.rte,
          s.father_name,
          s.mother_name,
          s.mobile_no,
          s.dob,
          s.aadhar_no as aadhaar,
          s.jan_aadhar_no as janaadhaar,
          s.address,
          s.photo,
          COALESCE(f.balance_fees, 0) as balance_fees
        FROM students s
        LEFT JOIN fees f ON s.id = f.student_id
        ORDER BY s.id DESC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching students:', err);
      res.status(500).json({ error: 'Database fetch failed' });
    }
  });

  // 2. CREATE NEW STUDENT (WITH PERMANENT FEES INSERTION)
  router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const {
        scholar_no,
        adm_date,
        name,
        pen_no,
        roll_no,
        class_name,
        section,
        status,
        gender,
        rte,
        father_name,
        mother_name,
        mobile_no,
        dob,
        aadhaar,
        janaadhaar,
        address,
        photo,
        tuition_fee,
        admission_fee,
        discount,
        initial_paid
      } = req.body;

      // Insert Student
      const studentInsertQuery = `
        INSERT INTO students (
          scholar_no, admission_date, name, pen_no, roll_no, 
          class_name, section, status, gender, rte, 
          father_name, mother_name, mobile_no, dob, 
          aadhar_no, jan_aadhar_no, address, photo
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) RETURNING id;
      `;

      const studentValues = [
        scholar_no || '760',
        adm_date || new Date().toISOString().split('T')[0],
        name ? name.toUpperCase() : 'NEW STUDENT',
        pen_no || '-',
        roll_no || '1',
        class_name || '8th',
        section || 'A',
        status || 'सक्रिय (Active)',
        gender || 'Male',
        rte || 'NO',
        father_name || 'श्री पिता जी',
        mother_name || 'श्रीमती माता जी',
        mobile_no || '9876543210',
        dob || '2012-01-01',
        aadhaar || '-',
        janaadhaar || '-',
        address || 'सिंहपुर',
        photo || null
      ];

      const studentRes = await client.query(studentInsertQuery, studentValues);
      const newStudentId = studentRes.rows[0].id;

      // Calculate Fees
      const tFee = Number(tuition_fee || 0);
      const aFee = Number(admission_fee || 0);
      const disc = Number(discount || 0);
      const paid = Number(initial_paid || 0);
      const totalFees = Math.max(0, (tFee + aFee) - disc);
      const balanceFees = Math.max(0, totalFees - paid);

      // Insert into Fees table permanently
      await client.query(`
        INSERT INTO fees (student_id, total_fees, paid_fees, balance_fees, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (student_id) DO UPDATE 
        SET total_fees = $2, paid_fees = $3, balance_fees = $4;
      `, [newStudentId, totalFees, paid, balanceFees, balanceFees > 0 ? 'Pending' : 'Paid']);

      await client.query('COMMIT');
      res.status(201).json({ success: true, student_id: newStudentId });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error saving student & fees:', err);
      res.status(500).json({ error: 'Failed to permanently save student' });
    } finally {
      client.release();
    }
  });

  return router;
};
