const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

function map(r) {
  return { id: r.id, action: r.action, detail: r.detail, icon: r.icon, time: r.time_str };
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 50');
    res.json(rows.map(map));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { id, action, detail='', icon='', time } = req.body;
  if (!id || !action) return res.status(400).json({ error: 'id and action required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO activity_log (id,action,detail,icon,time_str) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, action, detail, icon, time]
    );
    res.status(201).json(map(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
