const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

function map(r) {
  return {
    id: r.id,
    staffId: r.staff_id,
    shift: r.shift,
    checkIn: r.check_in,
    checkOut: r.check_out,
    date: r.shift_date,
  };
}

router.get('/', async (req, res) => {
  try {
    const { shift } = req.query;
    let query = 'SELECT * FROM attendance_log';
    const vals = [];
    if (shift) { query += ' WHERE shift=$1'; vals.push(shift); }
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, vals);
    res.json(rows.map(map));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/check-in', async (req, res) => {
  const { id, staffId, shift, checkIn, date } = req.body;
  if (!id || !staffId || !shift) return res.status(400).json({ error: 'id, staffId, shift required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO attendance_log (id,staff_id,shift,check_in,shift_date) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, staffId, shift, checkIn || null, date || null]
    );
    res.status(201).json(map(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/check-out', async (req, res) => {
  const { staffId, shift, checkOut } = req.body;
  if (!staffId || !shift) return res.status(400).json({ error: 'staffId, shift required' });
  try {
    const { rows } = await pool.query(
      `UPDATE attendance_log SET check_out=$1
       WHERE staff_id=$2 AND shift=$3 AND check_out IS NULL
       ORDER BY created_at DESC LIMIT 1 RETURNING *`,
      [checkOut || null, staffId, shift]
    );
    if (!rows.length) return res.status(404).json({ error: 'Active attendance record not found' });
    res.json(map(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
