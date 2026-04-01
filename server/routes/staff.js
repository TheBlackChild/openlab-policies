const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/auth');

function map(r) {
  return { id:r.id, name:r.name, empNo:r.emp_no, position:r.position, hallId:r.hall_id, status:r.status, staffStatus:r.staff_status };
}

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM staff ORDER BY name');
  res.json(rows.map(map));
});

router.post('/', async (req, res) => {
  const { id, name, empNo, position, hallId, status='off_shift', staffStatus='active' } = req.body;
  if (!id || !name || !empNo || !position) return res.status(400).json({ error: 'id, name, empNo, position required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO staff (id,name,emp_no,position,hall_id,status,staff_status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, name, empNo, position, hallId, status, staffStatus]
    );
    res.status(201).json(map(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  const changes = req.body;
  const colMap = { name:'name', empNo:'emp_no', position:'position', hallId:'hall_id', status:'status', staffStatus:'staff_status' };
  const fields = []; const vals = []; let i = 1;
  for (const [k, col] of Object.entries(colMap)) {
    if (changes[k] !== undefined) { fields.push(`${col}=$${i++}`); vals.push(changes[k]); }
  }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  vals.push(req.params.id);
  try {
    const { rows } = await pool.query(`UPDATE staff SET ${fields.join(',')} WHERE id=$${i} RETURNING *`, vals);
    if (!rows.length) return res.status(404).json({ error: 'Staff not found' });
    res.json(map(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM staff WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
