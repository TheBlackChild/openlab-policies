const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

function map(r) {
  return {
    id: r.id,
    fromTable: r.from_table_id,
    toTable: r.to_table_id,
    dealerId: r.dealer_id,
    pitBossId: r.pit_boss_id,
    notes: r.notes,
    denomQtys: r.denom_qtys || {},
    time: r.time_str,
  };
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM table_transfers ORDER BY created_at DESC');
    res.json(rows.map(map));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { id, fromTable, toTable, dealerId=null, pitBossId=null, notes='', denomQtys={}, chipValues={}, time } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  // Compute transfer amount from denomQtys × chipValues
  let transferAmount = 0;
  for (const [chipId, qty] of Object.entries(denomQtys)) {
    if (chipValues[chipId]) transferAmount += Number(chipValues[chipId]) * Number(qty);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO table_transfers (id,from_table_id,to_table_id,dealer_id,pit_boss_id,notes,denom_qtys,time_str)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, fromTable, toTable, dealerId, pitBossId, notes, JSON.stringify(denomQtys), time]
    );

    // Adjust chip totals atomically if amount is known
    if (transferAmount > 0) {
      if (fromTable) {
        await client.query(
          `UPDATE tables SET chip_total = chip_total - $1 WHERE id = $2`,
          [transferAmount, fromTable]
        );
      }
      if (toTable) {
        await client.query(
          `UPDATE tables SET chip_total = chip_total + $1 WHERE id = $2`,
          [transferAmount, toTable]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(map(rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
