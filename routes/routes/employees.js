const express = require('express');

module.exports = function(pool) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM employees ORDER BY id ASC');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'कर्मचारी लोड त्रुटि!' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const { emp_code, name, designation, department, gender, mobile_no, email, salary, joining_date, qualification, address, photo_url, class_teacher } = req.body;
      const query = `
        INSERT INTO employees (emp_code, name, designation, department, gender, mobile_no, email, salary, joining_date, qualification, address, photo_url, class_teacher, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'Active') RETURNING *;
      `;
      const values = [
        emp_code || `EMP-${Math.floor(100 + Math.random() * 900)}`,
        name, designation || 'Teacher', department || 'Teaching', gender || 'Male',
        mobile_no || '9876543210', email || '', Number(salary) || 25000,
        joining_date || '01-Jul-2025', qualification || '', address || 'सिंहपुर', photo_url || '', class_teacher || 'N/A'
      ];
      const result = await pool.query(query, values);
      res.json({ message: 'कर्मचारी सुरक्षित!', employee: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const allowed = ['emp_code', 'name', 'designation', 'department', 'gender', 'mobile_no', 'email', 'salary', 'joining_date', 'qualification', 'address', 'photo_url', 'status', 'class_teacher'];
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
      const query = `UPDATE employees SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
      const result = await pool.query(query, values);
      res.json({ message: 'कर्मचारी अपडेट हुआ!', employee: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'अपडेट त्रुटि!' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
      res.json({ message: 'कर्मचारी हटाया गया!' });
    } catch (err) {
      res.status(500).json({ error: 'डिलीट त्रुटि!' });
    }
  });

  return router;
};
