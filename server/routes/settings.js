const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

// GET /api/settings — all settings in one payload
router.get('/', async (req, res) => {
  try {
    const [ciR, ftR, hfR] = await Promise.all([
      pool.query('SELECT * FROM casino_info WHERE id=1'),
      pool.query('SELECT * FROM form_templates'),
      pool.query('SELECT * FROM house_float WHERE id=1'),
    ]);

    const ci = ciR.rows[0];
    const casinoInfo = ci
      ? { name:ci.name, address:ci.address, phone:ci.phone, email:ci.email, regNo:ci.reg_no }
      : { name:'Grand Casino', address:'', phone:'', email:'', regNo:'' };

    const formTemplates = {};
    for (const row of ftR.rows) {
      formTemplates[row.key] = { customHeader:row.custom_header, customFooter:row.custom_footer, notes:row.notes };
    }

    res.json({
      casinoInfo,
      formTemplates,
      houseFloat: hfR.rows[0] ? Number(hfR.rows[0].amount) : 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/settings/casino-info
router.patch('/casino-info', async (req, res) => {
  const { name, address, phone, email, regNo } = req.body;
  const fields = []; const vals = []; let i = 1;
  if (name !== undefined)    { fields.push(`name=$${i++}`);    vals.push(name); }
  if (address !== undefined) { fields.push(`address=$${i++}`); vals.push(address); }
  if (phone !== undefined)   { fields.push(`phone=$${i++}`);   vals.push(phone); }
  if (email !== undefined)   { fields.push(`email=$${i++}`);   vals.push(email); }
  if (regNo !== undefined)   { fields.push(`reg_no=$${i++}`);  vals.push(regNo); }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  vals.push(1);
  try {
    await pool.query(`UPDATE casino_info SET ${fields.join(',')}, updated_at=now() WHERE id=$${i}`, vals);
    const { rows } = await pool.query('SELECT * FROM casino_info WHERE id=1');
    const ci = rows[0];
    res.json({ name:ci.name, address:ci.address, phone:ci.phone, email:ci.email, regNo:ci.reg_no });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/settings/form-template/:key
router.patch('/form-template/:key', async (req, res) => {
  const { customHeader, customFooter, notes } = req.body;
  const fields = []; const vals = []; let i = 1;
  if (customHeader !== undefined) { fields.push(`custom_header=$${i++}`); vals.push(customHeader); }
  if (customFooter !== undefined) { fields.push(`custom_footer=$${i++}`); vals.push(customFooter); }
  if (notes !== undefined)        { fields.push(`notes=$${i++}`);         vals.push(notes); }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  vals.push(req.params.key);
  try {
    const { rows } = await pool.query(
      `INSERT INTO form_templates (key,custom_header,custom_footer,notes) VALUES ($${i},$1,$2,$3)
       ON CONFLICT (key) DO UPDATE SET ${fields.join(',')}, updated_at=now()
       RETURNING *`,
      [...vals.slice(0,-1), req.params.key]
    );
    const row = rows[0];
    res.json({ customHeader:row.custom_header, customFooter:row.custom_footer, notes:row.notes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/settings/house-float
router.patch('/house-float', async (req, res) => {
  const { amount } = req.body;
  if (amount == null) return res.status(400).json({ error: 'amount required' });
  try {
    await pool.query(`UPDATE house_float SET amount=$1, updated_at=now() WHERE id=1`, [amount]);
    res.json({ amount: Number(amount) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
