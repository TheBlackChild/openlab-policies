const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

function map(r) {
  return {
    id: r.id,
    tableId: r.table_id,
    type: r.type,
    description: r.description,
    status: r.status,
    reportedBy: r.reported_by,
    time: r.time_str,
    createdAt: r.created_at,
  };
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM incidents ORDER BY created_at DESC');
    res.json(rows.map(map));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { id, tableId, type='dispute', description='', status='open', reportedBy, time } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO incidents (id,table_id,type,description,status,reported_by,time_str)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, tableId, type, description, status, reportedBy, time]
    );
    // Set table status to 'incident'
    if (tableId) {
      await client.query(`UPDATE tables SET status='incident' WHERE id=$1`, [tableId]);
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

router.put('/:id', async (req, res) => {
  const { status, description, type } = req.body;
  const fields = []; const vals = []; let i = 1;
  if (status !== undefined)      { fields.push(`status=$${i++}`);      vals.push(status); }
  if (description !== undefined) { fields.push(`description=$${i++}`); vals.push(description); }
  if (type !== undefined)        { fields.push(`type=$${i++}`);        vals.push(type); }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  vals.push(req.params.id);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE incidents SET ${fields.join(',')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Incident not found' }); }

    // When resolved, restore table status to 'open' if it was set to 'incident'
    if (status === 'resolved' && rows[0].table_id) {
      await client.query(
        `UPDATE tables SET status='open' WHERE id=$1 AND status='incident'`,
        [rows[0].table_id]
      );
    }
    await client.query('COMMIT');
    res.json(map(rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
