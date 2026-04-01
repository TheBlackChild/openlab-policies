const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

function map(r) {
  return { id: r.id, name: r.name, vipLevel: r.vip_level, phone: r.phone, notes: r.notes };
}

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM customers';
    const vals = [];
    if (search) { query += ' WHERE LOWER(name) LIKE $1'; vals.push(`%${search.toLowerCase()}%`); }
    query += ' ORDER BY name';
    const { rows } = await pool.query(query, vals);
    res.json(rows.map(map));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { id, name, vipLevel='standard', phone='', notes='' } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO customers (id,name,vip_level,phone,notes) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, name, vipLevel, phone, notes]
    );
    res.status(201).json(map(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  const { name, vipLevel, phone, notes } = req.body;
  const fields = []; const vals = []; let i = 1;
  if (name !== undefined)     { fields.push(`name=$${i++}`);      vals.push(name); }
  if (vipLevel !== undefined) { fields.push(`vip_level=$${i++}`); vals.push(vipLevel); }
  if (phone !== undefined)    { fields.push(`phone=$${i++}`);     vals.push(phone); }
  if (notes !== undefined)    { fields.push(`notes=$${i++}`);     vals.push(notes); }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE customers SET ${fields.join(',')} WHERE id=$${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Customer not found' });
    res.json(map(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM customers WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
