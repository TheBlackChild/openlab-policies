const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

function map(r) {
  return {
    id: r.id,
    tableId: r.table_id,
    denominationLabel: r.denomination_label,
    denominationId: r.denomination_id,
    quantity: r.quantity,
    total: Number(r.total),
    amount: Number(r.amount || r.total),
    status: r.status,
    requestedBy: r.requested_by,
    time: r.time_str,
    sigShiftMgr: r.sig_shift_mgr,
    sigPitBoss: r.sig_pit_boss,
    sigGI: r.sig_gi,
    denomLines: r.denom_lines || [],
  };
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM fills ORDER BY created_at DESC');
    res.json(rows.map(map));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { id, tableId, denominationLabel, denominationId, quantity=0, total=0, status='pending',
          requestedBy, time, denomLines=[] } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO fills (id,table_id,denomination_label,denomination_id,quantity,total,amount,status,requested_by,time_str,denom_lines)
       VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,$10) RETURNING *`,
      [id, tableId, denominationLabel, denominationId, quantity, total, status, requestedBy, time, JSON.stringify(denomLines)]
    );
    res.status(201).json(map(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  const changes = req.body;
  const colMap = {
    tableId:'table_id', denominationLabel:'denomination_label', denominationId:'denomination_id',
    quantity:'quantity', total:'total', amount:'amount', status:'status',
    requestedBy:'requested_by', time:'time_str',
    sigShiftMgr:'sig_shift_mgr', sigPitBoss:'sig_pit_boss', sigGI:'sig_gi', denomLines:'denom_lines',
  };
  const fields = []; const vals = []; let i = 1;
  for (const [k, col] of Object.entries(colMap)) {
    if (changes[k] !== undefined) {
      fields.push(`${col}=$${i++}`);
      vals.push(k === 'denomLines' ? JSON.stringify(changes[k]) : changes[k]);
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE fills SET ${fields.join(',')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Fill not found' });
    res.json(map(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/fills/:id/sign — record a signature; auto-approve when all 3 present
router.patch('/:id/sign', async (req, res) => {
  const { sigField } = req.body; // 'sigShiftMgr' | 'sigPitBoss' | 'sigGI'
  const sigColMap = { sigShiftMgr: 'sig_shift_mgr', sigPitBoss: 'sig_pit_boss', sigGI: 'sig_gi' };
  const col = sigColMap[sigField];
  if (!col) return res.status(400).json({ error: 'Invalid sigField' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE fills SET ${col}=true WHERE id=$1`, [req.params.id]);
    const fillR = await client.query('SELECT * FROM fills WHERE id=$1', [req.params.id]);
    if (!fillR.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Fill not found' }); }
    const fill = fillR.rows[0];

    // Auto-approve when all three signatures present
    if (fill.sig_shift_mgr && fill.sig_pit_boss && fill.sig_gi && fill.status !== 'approved') {
      await client.query(`UPDATE fills SET status='approved' WHERE id=$1`, [req.params.id]);
      fill.status = 'approved';

      // Update table chipTotal
      if (fill.table_id) {
        await client.query(
          `UPDATE tables SET chip_total = chip_total + $1
           WHERE id = $2`,
          [Number(fill.total || fill.amount), fill.table_id]
        );
        // Clear fill_required status if set
        await client.query(
          `UPDATE tables SET status='open' WHERE id=$1 AND status='fill_required'`,
          [fill.table_id]
        );
      }
    }

    await client.query('COMMIT');
    const updated = await pool.query('SELECT * FROM fills WHERE id=$1', [req.params.id]);
    res.json(map(updated.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/fills/:id/approve — direct approval (bypasses signature flow)
router.post('/:id/approve', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fillR = await client.query('SELECT * FROM fills WHERE id=$1', [req.params.id]);
    if (!fillR.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Fill not found' }); }
    const fill = fillR.rows[0];

    await client.query(
      `UPDATE fills SET status='approved', sig_shift_mgr=true, sig_pit_boss=true, sig_gi=true WHERE id=$1`,
      [req.params.id]
    );

    if (fill.table_id) {
      await client.query(
        `UPDATE tables SET chip_total = chip_total + $1 WHERE id = $2`,
        [Number(fill.total || fill.amount), fill.table_id]
      );
      await client.query(
        `UPDATE tables SET status='open' WHERE id=$1 AND status='fill_required'`,
        [fill.table_id]
      );
    }

    await client.query('COMMIT');
    const updated = await pool.query('SELECT * FROM fills WHERE id=$1', [req.params.id]);
    res.json(map(updated.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
