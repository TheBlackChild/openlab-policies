const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

function mapShift(r) {
  return { id: r.id, name: r.name, start: r.start_time, end: r.end_time, shiftCode: r.shift_code };
}

function mapShiftState(r) {
  if (!r) return { status: 'closed', history: [] };
  return {
    status: r.status,
    type: r.type,
    openedAt: r.opened_at,
    openedDate: r.opened_date,
    openedBy: r.opened_by,
    history: r.history || [],
  };
}

// GET /api/shifts — shift definitions
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM shifts ORDER BY shift_code');
    res.json(rows.map(mapShift));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/shifts/:id — update shift definition
router.put('/:id', async (req, res) => {
  const { name, start, end, shiftCode } = req.body;
  const fields = []; const vals = []; let i = 1;
  if (name !== undefined)      { fields.push(`name=$${i++}`);       vals.push(name); }
  if (start !== undefined)     { fields.push(`start_time=$${i++}`); vals.push(start); }
  if (end !== undefined)       { fields.push(`end_time=$${i++}`);   vals.push(end); }
  if (shiftCode !== undefined) { fields.push(`shift_code=$${i++}`); vals.push(shiftCode); }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE shifts SET ${fields.join(',')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Shift not found' });
    res.json(mapShift(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/shifts/state — current shift state
router.get('/state', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM shift_state WHERE id=1');
    res.json(mapShiftState(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/shifts/state/open — open a shift
router.post('/state/open', async (req, res) => {
  const { type, openedAt, openedDate, openedBy } = req.body;
  if (!type) return res.status(400).json({ error: 'type required' });
  try {
    const { rows } = await pool.query(
      `UPDATE shift_state SET status='open', type=$1, opened_at=$2, opened_date=$3, opened_by=$4, updated_at=now()
       WHERE id=1 RETURNING *`,
      [type, openedAt || null, openedDate || null, openedBy || null]
    );
    res.json(mapShiftState(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/shifts/state/close — close shift and reset table floats
router.post('/state/close', async (req, res) => {
  const closeData = req.body; // { type, openedAt, openedDate, openedBy, closedAt, totalDrop, totalWin, net, staffCount, ... }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Snapshot current shift state and tables
    const ssR = await client.query('SELECT * FROM shift_state WHERE id=1');
    const ss = ssR.rows[0];
    const tablesR = await client.query('SELECT id, table_name, chip_total, opening_float FROM tables');

    const historyEntry = {
      ...closeData,
      tableSnapshot: tablesR.rows.map(t => ({
        id: t.id, name: t.table_name,
        chipTotal: Number(t.chip_total),
        openingFloat: Number(t.opening_float),
      })),
    };

    const newHistory = [...(ss.history || []), historyEntry];

    await client.query(
      `UPDATE shift_state SET status='closed', type=null, opened_at=null, opened_date=null, opened_by=null,
       history=$1::jsonb, updated_at=now() WHERE id=1`,
      [JSON.stringify(newHistory)]
    );

    // Reset all tables back to closed state
    await client.query(
      `UPDATE tables SET status='closed', chip_total=float_capacity, opening_float=0,
       opened_at=null, opened_date=null, dealer_id=null, inspector_id=null, chip_breakdown='{}'`
    );

    await client.query('COMMIT');

    const updatedSS = await pool.query('SELECT * FROM shift_state WHERE id=1');
    res.json(mapShiftState(updatedSS.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
