const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/auth');
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM halls ORDER BY name');
  res.json(rows.map(r => ({ id:r.id, name:r.name })));
});
router.post('/', async (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name required' });
  try {
    const { rows } = await pool.query('INSERT INTO halls (id,name) VALUES ($1,$2) RETURNING *', [id, name]);
    res.status(201).json({ id:rows[0].id, name:rows[0].name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.put('/:id', async (req, res) => {
  const { name } = req.body;
  const { rows } = await pool.query('UPDATE halls SET name=$1 WHERE id=$2 RETURNING *', [name, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Hall not found' });
  res.json({ id:rows[0].id, name:rows[0].name });
});
router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM halls WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});
module.exports = router;
