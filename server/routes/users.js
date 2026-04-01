const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

function map(r) {
  return {
    id: r.id, staffId: r.staff_id, name: r.name, empNo: r.emp_no,
    email: r.email, role: r.role, phone: r.phone, bio: r.bio, active: r.active,
  };
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY name');
    res.json(rows.map(map));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { id, staffId=null, name, empNo, email=null, role='staff', phone='', bio='', password } = req.body;
  if (!id || !name || !empNo) return res.status(400).json({ error: 'id, name, empNo required' });
  const hash = await bcrypt.hash(password || empNo, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (id,staff_id,name,emp_no,email,password_hash,role,phone,bio)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, staffId, name, empNo.toUpperCase(), email, hash, role, phone, bio]
    );
    res.status(201).json(map(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  const changes = req.body;
  const colMap = {
    staffId:'staff_id', name:'name', empNo:'emp_no', email:'email',
    role:'role', phone:'phone', bio:'bio', active:'active',
  };
  const fields = []; const vals = []; let i = 1;

  for (const [k, col] of Object.entries(colMap)) {
    if (changes[k] !== undefined) {
      fields.push(`${col}=$${i++}`);
      vals.push(k === 'empNo' ? changes[k].toUpperCase() : changes[k]);
    }
  }
  // Handle password change separately
  if (changes.password) {
    const hash = await bcrypt.hash(changes.password, 10);
    fields.push(`password_hash=$${i++}`);
    vals.push(hash);
  }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(',')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(map(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
