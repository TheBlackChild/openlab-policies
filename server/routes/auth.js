const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

function mapUser(row) {
  return {
    id: row.id, staffId: row.staff_id, name: row.name, empNo: row.emp_no,
    email: row.email, role: row.role, phone: row.phone, bio: row.bio, active: row.active,
  };
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { name, empNo } = req.body;
  if (!name || !empNo) return res.status(400).json({ error: 'name and empNo required' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE LOWER(name)=LOWER($1) AND emp_no=UPPER($2) AND active=true',
      [name.trim(), empNo.trim()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const valid = await bcrypt.compare(empNo.trim(), user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '24h' }
    );
    res.json({ token, user: mapUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: mapUser(rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
