const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/auth');
router.use(requireAuth);

function map(r) { return { id:r.id, color:r.color, hex:r.hex, value:Number(r.value) }; }

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM chips ORDER BY value');
  res.json(rows.map(map));
});
router.post('/', async (req, res) => {
  const { id, color, hex='#ffffff', value } = req.body;
  if (!id || !color || !value) return res.status(400).json({ error: 'id, color, value required' });
  try {
    const { rows } = await pool.query('INSERT INTO chips (id,color,hex,value) VALUES ($1,$2,$3,$4) RETURNING *', [id, color, hex, value]);
    res.status(201).json(map(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.put('/:id', async (req, res) => {
  const { color, hex, value } = req.body;
  const fields = []; const vals = []; let i = 1;
  if (color !== undefined) { fields.push(`color=$${i++}`); vals.push(color); }
  if (hex !== undefined)   { fields.push(`hex=$${i++}`);   vals.push(hex); }
  if (value !== undefined) { fields.push(`value=$${i++}`); vals.push(value); }
  if (!fields.length) return res.status(400).json({ error: 'No fields' });
  vals.push(req.params.id);
  const { rows } = await pool.query(`UPDATE chips SET ${fields.join(',')} WHERE id=$${i} RETURNING *`, vals);
  res.json(map(rows[0]));
});
router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM chips WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});
module.exports = router;
