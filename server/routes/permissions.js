const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

// GET /api/permissions — returns { role: { permKey: bool, ... }, ... }
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM role_permissions');
    const out = {};
    for (const row of rows) {
      if (!out[row.role]) out[row.role] = {};
      out[row.role][row.permission_key] = row.enabled;
    }
    res.json(out);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/permissions — replace all permissions for a role
// Body: { role: "shift_manager", permissions: { "canOpenTable": true, "canFill": true, ... } }
router.put('/', async (req, res) => {
  const { role, permissions } = req.body;
  if (!role || !permissions) return res.status(400).json({ error: 'role and permissions required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Delete existing entries for this role
    await client.query('DELETE FROM role_permissions WHERE role=$1', [role]);
    // Insert new entries
    for (const [key, enabled] of Object.entries(permissions)) {
      await client.query(
        'INSERT INTO role_permissions (role,permission_key,enabled) VALUES ($1,$2,$3)',
        [role, key, enabled]
      );
    }
    await client.query('COMMIT');

    // Return full updated permissions map
    const { rows } = await pool.query('SELECT * FROM role_permissions');
    const out = {};
    for (const row of rows) {
      if (!out[row.role]) out[row.role] = {};
      out[row.role][row.permission_key] = row.enabled;
    }
    res.json(out);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
