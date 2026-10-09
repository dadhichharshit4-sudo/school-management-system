require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// कनेक्शन टेस्ट फ़ंक्शन
async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Supabase PostgreSQL डेटाबेस सफलतापूर्वक कनेक्ट हो गया!');
    console.log('डेटाबेस समय:', res.rows[0].now);
  } catch (err) {
    console.error('❌ कनेक्शन में त्रुटि:', err.message);
  }
}

testConnection();

module.exports = pool;