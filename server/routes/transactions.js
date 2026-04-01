const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

function map(r) {
  return {
    id: r.id,
    tableId: r.table_id,
    customerId: r.customer_id,
    type: r.type,
    amount: Number(r.amount),
    time: r.time_str,
  };
}

router.get('/', async (req, res) => {
  try {
    const { tableId, customerId } = req.query;
    let query = 'SELECT * FROM transactions';
    const vals = [];
    const conds = [];
    if (tableId)    { conds.push(`table_id=$${vals.push(tableId)}`); }
    if (customerId) { conds.push(`customer_id=$${vals.push(customerId)}`); }
    if (conds.length) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, vals);
    res.json(rows.map(map));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { id, tableId, customerId=null, type, amount, time } = req.body;
  if (!id || !type || amount == null) return res.status(400).json({ error: 'id, type, amount required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO transactions (id,table_id,customer_id,type,amount,time_str) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, tableId, customerId, type, amount, time]
    );
    res.status(201).json(map(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  const { tableId, customerId, type, amount, time } = req.body;
  const fields = []; const vals = []; let i = 1;
  if (tableId !== undefined)    { fields.push(`table_id=$${i++}`);    vals.push(tableId); }
  if (customerId !== undefined) { fields.push(`customer_id=$${i++}`); vals.push(customerId); }
  if (type !== undefined)       { fields.push(`type=$${i++}`);        vals.push(type); }
  if (amount !== undefined)     { fields.push(`amount=$${i++}`);      vals.push(amount); }
  if (time !== undefined)       { fields.push(`time_str=$${i++}`);    vals.push(time); }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE transactions SET ${fields.join(',')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Transaction not found' });
    res.json(map(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM transactions WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
