const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/auth');

function map(r) {
  return { id:r.id, hallId:r.hall_id, gameType:r.game_type, tableName:r.table_name, status:r.status, minBet:Number(r.min_bet), maxBet:Number(r.max_bet), dealerId:r.dealer_id, inspectorId:r.inspector_id, chipTotal:Number(r.chip_total), floatCapacity:Number(r.float_capacity), openingFloat:Number(r.opening_float), openedAt:r.opened_at, openedDate:r.opened_date, chipBreakdown:r.chip_breakdown||{} };
}

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tables ORDER BY id');
  res.json(rows.map(map));
});

router.post('/', async (req, res) => {
  const { id, hallId, gameType, tableName, status='closed', minBet=500, maxBet=10000, dealerId=null, inspectorId=null, chipTotal=0, floatCapacity=0, openingFloat=0, openedAt=null, openedDate=null, chipBreakdown={} } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO tables (id,hall_id,game_type,table_name,status,min_bet,max_bet,dealer_id,inspector_id,chip_total,float_capacity,opening_float,opened_at,opened_date,chip_breakdown)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [id, hallId, gameType, tableName, status, minBet, maxBet, dealerId, inspectorId, chipTotal, floatCapacity, openingFloat, openedAt, openedDate, JSON.stringify(chipBreakdown)]
    );
    res.status(201).json(map(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  const changes = req.body;
  const fields = [];
  const vals = [];
  const colMap = { hallId:'hall_id', gameType:'game_type', tableName:'table_name', status:'status', minBet:'min_bet', maxBet:'max_bet', dealerId:'dealer_id', inspectorId:'inspector_id', chipTotal:'chip_total', floatCapacity:'float_capacity', openingFloat:'opening_float', openedAt:'opened_at', openedDate:'opened_date', chipBreakdown:'chip_breakdown' };
  let i = 1;
  for (const [k, col] of Object.entries(colMap)) {
    if (changes[k] !== undefined) {
      fields.push(`${col}=$${i++}`);
      vals.push(k === 'chipBreakdown' ? JSON.stringify(changes[k]) : changes[k]);
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE tables SET ${fields.join(',')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Table not found' });
    res.json(map(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM tables WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
