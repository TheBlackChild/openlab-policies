const router = require('express').Router();
const pool = require('../db');
const requireAuth = require('../middleware/auth');

function mapTable(r) {
  return { id:r.id, hallId:r.hall_id, gameType:r.game_type, tableName:r.table_name, status:r.status, minBet:Number(r.min_bet), maxBet:Number(r.max_bet), dealerId:r.dealer_id, inspectorId:r.inspector_id, chipTotal:Number(r.chip_total), floatCapacity:Number(r.float_capacity), openingFloat:Number(r.opening_float), openedAt:r.opened_at, openedDate:r.opened_date, chipBreakdown:r.chip_breakdown||{} };
}
function mapStaff(r) {
  return { id:r.id, name:r.name, empNo:r.emp_no, position:r.position, hallId:r.hall_id, status:r.status, staffStatus:r.staff_status };
}
function mapUser(r) {
  return { id:r.id, staffId:r.staff_id, name:r.name, empNo:r.emp_no, email:r.email, role:r.role, phone:r.phone, bio:r.bio, active:r.active };
}
function mapFill(r) {
  return { id:r.id, tableId:r.table_id, denominationLabel:r.denomination_label, denominationId:r.denomination_id, quantity:r.quantity, total:Number(r.total), amount:Number(r.amount), status:r.status, requestedBy:r.requested_by, time:r.time_str, sigShiftMgr:r.sig_shift_mgr, sigPitBoss:r.sig_pit_boss, sigGI:r.sig_gi, denomLines:r.denom_lines||[] };
}
function mapIncident(r) {
  return { id:r.id, tableId:r.table_id, type:r.type, description:r.description, status:r.status, reportedBy:r.reported_by, time:r.time_str, createdAt:r.created_at };
}
function mapTx(r) {
  return { id:r.id, tableId:r.table_id, customerId:r.customer_id, type:r.type, amount:Number(r.amount), time:r.time_str };
}
function mapAttendance(r) {
  return { id:r.id, staffId:r.staff_id, shift:r.shift, checkIn:r.check_in, checkOut:r.check_out, date:r.shift_date };
}
function mapActivity(r) {
  return { id:r.id, action:r.action, detail:r.detail, icon:r.icon, time:r.time_str };
}
function mapChipCount(r) {
  return { id:r.id, tableId:r.table_id, prevFloat:Number(r.prev_float), newFloat:Number(r.new_float), diff:Number(r.diff), inspector:r.inspector, time:r.time_str };
}
function mapTransfer(r) {
  return { id:r.id, fromTable:r.from_table_id, toTable:r.to_table_id, dealerId:r.dealer_id, pitBossId:r.pit_boss_id, notes:r.notes, denomQtys:r.denom_qtys||{}, time:r.time_str };
}
function mapCustomer(r) {
  return { id:r.id, name:r.name, vipLevel:r.vip_level, phone:r.phone, notes:r.notes };
}
function mapShift(r) {
  return { id:r.id, name:r.name, start:r.start_time, end:r.end_time, shiftCode:r.shift_code };
}

// GET /api/state — full app snapshot
router.get('/', requireAuth, async (req, res) => {
  try {
    const [tables, staff, halls, chips, fills, incidents, transactions, shifts, shiftStateR,
           attendance, users, customers, ciR, ftR, rpR, activity, ccLog, hfR, transfers] = await Promise.all([
      pool.query('SELECT * FROM tables ORDER BY id'),
      pool.query('SELECT * FROM staff ORDER BY name'),
      pool.query('SELECT * FROM halls ORDER BY name'),
      pool.query('SELECT * FROM chips ORDER BY value'),
      pool.query('SELECT * FROM fills ORDER BY created_at DESC'),
      pool.query('SELECT * FROM incidents ORDER BY created_at DESC'),
      pool.query('SELECT * FROM transactions ORDER BY created_at DESC'),
      pool.query('SELECT * FROM shifts ORDER BY shift_code'),
      pool.query('SELECT * FROM shift_state WHERE id=1'),
      pool.query('SELECT * FROM attendance_log ORDER BY created_at DESC'),
      pool.query('SELECT * FROM users ORDER BY name'),
      pool.query('SELECT * FROM customers ORDER BY name'),
      pool.query('SELECT * FROM casino_info WHERE id=1'),
      pool.query('SELECT * FROM form_templates'),
      pool.query('SELECT * FROM role_permissions'),
      pool.query('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 50'),
      pool.query('SELECT * FROM chip_count_log ORDER BY created_at DESC LIMIT 100'),
      pool.query('SELECT * FROM house_float WHERE id=1'),
      pool.query('SELECT * FROM table_transfers ORDER BY created_at DESC'),
    ]);

    // Build rolePermissions object { role: { perm: bool } }
    const rolePermissions = {};
    for (const row of rpR.rows) {
      if (!rolePermissions[row.role]) rolePermissions[row.role] = {};
      rolePermissions[row.role][row.permission_key] = row.enabled;
    }

    // Build formTemplates object { key: { customHeader, customFooter, notes } }
    const formTemplates = {};
    for (const row of ftR.rows) {
      formTemplates[row.key] = { customHeader:row.custom_header, customFooter:row.custom_footer, notes:row.notes };
    }

    const ss = shiftStateR.rows[0];
    const shiftState = ss
      ? { status:ss.status, type:ss.type, openedAt:ss.opened_at, openedDate:ss.opened_date, openedBy:ss.opened_by, history:ss.history||[] }
      : { status:'closed', history:[] };

    const ci = ciR.rows[0];
    const casinoInfo = ci
      ? { name:ci.name, address:ci.address, phone:ci.phone, email:ci.email, regNo:ci.reg_no }
      : { name:'Grand Casino', address:'', phone:'', email:'', regNo:'' };

    res.json({
      tables: tables.rows.map(mapTable),
      staff: staff.rows.map(mapStaff),
      halls: halls.rows.map(r => ({ id:r.id, name:r.name })),
      chips: chips.rows.map(r => ({ id:r.id, color:r.color, hex:r.hex, value:Number(r.value) })),
      fills: fills.rows.map(mapFill),
      incidents: incidents.rows.map(mapIncident),
      transactions: transactions.rows.map(mapTx),
      shifts: shifts.rows.map(mapShift),
      shiftState,
      attendanceLog: attendance.rows.map(mapAttendance),
      users: users.rows.map(mapUser),
      customers: customers.rows.map(mapCustomer),
      casinoInfo,
      formTemplates,
      rolePermissions,
      activity: activity.rows.map(mapActivity),
      chipCountLog: ccLog.rows.map(mapChipCount),
      houseFloat: hfR.rows[0] ? Number(hfR.rows[0].amount) : 0,
      tableTransfers: transfers.rows.map(mapTransfer),
    });
  } catch (err) {
    console.error('State load error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
