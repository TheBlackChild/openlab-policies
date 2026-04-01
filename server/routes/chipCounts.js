const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

function map(r) {
  return {
    id: r.id,
    tableId: r.table_id,
    prevFloat: Number(r.prev_float),
    newFloat: Number(r.new_float),
    diff: Number(r.diff),
    inspector: r.inspector,
    time: r.time_str,
  };
}

router.get('/', async (req, res) => {
  try {
    const { tableId } = req.query;
    let query = 'SELECT * FROM chip_count_log';
    const vals = [];
    if (tableId) { query += ' WHERE table_id=$1'; vals.push(tableId); }
    query += ' ORDER BY created_at DESC LIMIT 100';
    const { rows } = await pool.query(query, vals);
    res.json(rows.map(map));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { id, tableId, prevFloat, newFloat, diff, inspector, time } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO chip_count_log (id,table_id,prev_float,new_float,diff,inspector,time_str)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, tableId, prevFloat, newFloat, diff, inspector, time]
    );
    res.status(201).json(map(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
