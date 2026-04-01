const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── HALLS ──
    const halls = [
      { id: 'h1', name: 'Hall A — Main Floor' },
      { id: 'h2', name: 'Hall B — VIP Lounge' },
      { id: 'h3', name: 'Hall C — High Rollers' },
    ];
    for (const h of halls) {
      await client.query(
        'INSERT INTO halls (id, name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING',
        [h.id, h.name]
      );
    }

    // ── CHIPS ──
    const chips = [
      { id: 'c1', color: 'White',  hex: '#f0f0f0', value: 100   },
      { id: 'c2', color: 'Red',    hex: '#e83c4e', value: 500   },
      { id: 'c3', color: 'Green',  hex: '#2dbe6c', value: 1000  },
      { id: 'c4', color: 'Black',  hex: '#1a1a26', value: 5000  },
      { id: 'c5', color: 'Purple', hex: '#9b59b6', value: 10000 },
    ];
    for (const c of chips) {
      await client.query(
        'INSERT INTO chips (id, color, hex, value) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING',
        [c.id, c.color, c.hex, c.value]
      );
    }

    // ── STAFF ──
    const staff = [
      { id: 's1',  name: 'Ali Hassan',       empNo: 'S001', position: 'dealer',           hallId: 'h1', status: 'on_table',  staffStatus: 'active' },
      { id: 's2',  name: 'Beatrice Kamau',   empNo: 'S002', position: 'dealer',           hallId: 'h1', status: 'on_table',  staffStatus: 'active' },
      { id: 's3',  name: 'Charles Mwangi',   empNo: 'S003', position: 'dealer',           hallId: 'h1', status: 'break',     staffStatus: 'active' },
      { id: 's4',  name: 'Diana Odhiambo',   empNo: 'S004', position: 'dealer_inspector', hallId: 'h1', status: 'on_table',  staffStatus: 'active' },
      { id: 's5',  name: 'Evans Kiplagat',   empNo: 'S005', position: 'dealer',           hallId: 'h1', status: 'checked_in',staffStatus: 'active' },
      { id: 's6',  name: 'Fatuma Abdalla',   empNo: 'S006', position: 'dealer',           hallId: 'h2', status: 'on_table',  staffStatus: 'active' },
      { id: 's7',  name: 'George Otieno',    empNo: 'S007', position: 'dealer',           hallId: 'h2', status: 'on_table',  staffStatus: 'active' },
      { id: 's8',  name: 'Hannah Wanjiku',   empNo: 'S008', position: 'inspector',        hallId: 'h2', status: 'checked_in',staffStatus: 'active' },
      { id: 's9',  name: 'Isaac Njoroge',    empNo: 'S009', position: 'dealer',           hallId: 'h2', status: 'off_shift', staffStatus: 'active' },
      { id: 's10', name: 'Janet Achieng',    empNo: 'S010', position: 'dealer',           hallId: 'h2', status: 'off_shift', staffStatus: 'active' },
      { id: 's11', name: 'Kevin Mwangi',     empNo: 'EMP003', position: 'shift_manager',  hallId: 'h1', status: 'checked_in',staffStatus: 'active' },
      { id: 's12', name: 'Patrick Njoroge',  empNo: 'EMP004', position: 'pit_boss',       hallId: 'h1', status: 'checked_in',staffStatus: 'active' },
      { id: 's13', name: 'Grace Achieng',    empNo: 'EMP005', position: 'dealer',         hallId: 'h1', status: 'on_table',  staffStatus: 'active' },
    ];
    for (const s of staff) {
      await client.query(
        `INSERT INTO staff (id, name, emp_no, position, hall_id, status, staff_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [s.id, s.name, s.empNo, s.position, s.hallId, s.status, s.staffStatus]
      );
    }

    // ── USERS ──
    const users = [
      { id: 'u1', staffId: null,   name: 'System Admin',   empNo: 'EMP001', email: 'admin@casino.com',  role: 'system_admin',    password: 'EMP001' },
      { id: 'u2', staffId: null,   name: 'James Ochieng',  empNo: 'EMP002', email: 'james@casino.com',  role: 'management',      password: 'EMP002' },
      { id: 'u3', staffId: 's11',  name: 'Kevin Mwangi',   empNo: 'EMP003', email: 'kevin@casino.com',  role: 'shift_manager',   password: 'EMP003' },
      { id: 'u4', staffId: 's12',  name: 'Patrick Njoroge',empNo: 'EMP004', email: 'patrick@casino.com',role: 'pit_boss',        password: 'EMP004' },
      { id: 'u5', staffId: 's13',  name: 'Grace Achieng',  empNo: 'EMP005', email: 'grace@casino.com',  role: 'staff',           password: 'EMP005' },
    ];
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      await client.query(
        `INSERT INTO users (id, staff_id, name, emp_no, email, password_hash, role)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [u.id, u.staffId, u.name, u.empNo, u.email, hash, u.role]
      );
    }

    // ── TABLES ──
    const tables = [
      { id:'T01', hallId:'h1', gameType:'Blackjack', tableName:'Blackjack 1', status:'open',   minBet:500,  maxBet:10000, dealerId:'s1',  inspectorId:'s4',  chipTotal:250000, floatCapacity:250000, openingFloat:250000, openedAt:'04:59', openedDate:'25/03/26' },
      { id:'T02', hallId:'h1', gameType:'Roulette',  tableName:'Roulette 1',  status:'open',   minBet:200,  maxBet:5000,  dealerId:'s2',  inspectorId:null,  chipTotal:180000, floatCapacity:200000, openingFloat:200000, openedAt:'05:10', openedDate:'25/03/26' },
      { id:'T03', hallId:'h1', gameType:'Baccarat',  tableName:'Baccarat 1',  status:'incident',minBet:1000, maxBet:50000, dealerId:'s3', inspectorId:null,  chipTotal:320000, floatCapacity:300000, openingFloat:300000, openedAt:'05:05', openedDate:'25/03/26' },
      { id:'T04', hallId:'h1', gameType:'Poker',     tableName:'Poker 1',     status:'fill_required',minBet:500,maxBet:20000,dealerId:'s5',inspectorId:null, chipTotal:50000, floatCapacity:200000, openingFloat:200000, openedAt:'05:15', openedDate:'25/03/26' },
      { id:'T05', hallId:'h2', gameType:'Blackjack', tableName:'Blackjack 2', status:'open',   minBet:1000, maxBet:25000, dealerId:'s6',  inspectorId:null,  chipTotal:400000, floatCapacity:400000, openingFloat:400000, openedAt:'05:00', openedDate:'25/03/26' },
      { id:'T06', hallId:'h2', gameType:'Roulette',  tableName:'Roulette 2',  status:'open',   minBet:500,  maxBet:10000, dealerId:'s7',  inspectorId:'s8',  chipTotal:220000, floatCapacity:250000, openingFloat:250000, openedAt:'05:20', openedDate:'25/03/26' },
      { id:'T07', hallId:'h2', gameType:'Baccarat',  tableName:'Baccarat 2',  status:'closed', minBet:2000, maxBet:100000,dealerId:null,  inspectorId:null,  chipTotal:0,      floatCapacity:500000, openingFloat:500000, openedAt:null,    openedDate:null },
      { id:'T08', hallId:'h3', gameType:'Blackjack', tableName:'VIP BJ 1',    status:'closed', minBet:5000, maxBet:500000,dealerId:null,  inspectorId:null,  chipTotal:0,      floatCapacity:1000000,openingFloat:1000000,openedAt:null,   openedDate:null },
    ];
    for (const t of tables) {
      await client.query(
        `INSERT INTO tables (id, hall_id, game_type, table_name, status, min_bet, max_bet, dealer_id, inspector_id, chip_total, float_capacity, opening_float, opened_at, opened_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (id) DO NOTHING`,
        [t.id, t.hallId, t.gameType, t.tableName, t.status, t.minBet, t.maxBet, t.dealerId, t.inspectorId, t.chipTotal, t.floatCapacity, t.openingFloat, t.openedAt, t.openedDate]
      );
    }

    // ── SHIFTS ──
    const shifts = [
      { id:'sh1', name:'Morning', startTime:'06:00', endTime:'14:00', shiftCode:'M' },
      { id:'sh2', name:'Day',     startTime:'14:00', endTime:'22:00', shiftCode:'D' },
      { id:'sh3', name:'Night',   startTime:'22:00', endTime:'06:00', shiftCode:'N' },
    ];
    for (const s of shifts) {
      await client.query(
        `INSERT INTO shifts (id, name, start_time, end_time, shift_code)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [s.id, s.name, s.startTime, s.endTime, s.shiftCode]
      );
    }

    // ── SHIFT STATE ──
    await client.query(
      `INSERT INTO shift_state (id, status, type, opened_at, opened_date, opened_by)
       VALUES (1,'open','Night','22:00','25/03/26','Kevin Mwangi')
       ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, type=EXCLUDED.type,
       opened_at=EXCLUDED.opened_at, opened_date=EXCLUDED.opened_date, opened_by=EXCLUDED.opened_by`
    );

    // ── FILLS ──
    await client.query(
      `INSERT INTO fills (id, table_id, denomination_label, amount, total, status, requested_by, time_str)
       VALUES ('f1','T04','Black (5000)',200000,200000,'pending','Patrick Njoroge','10:15')
       ON CONFLICT (id) DO NOTHING`
    );

    // ── INCIDENTS ──
    await client.query(
      `INSERT INTO incidents (id, table_id, type, description, status, reported_by, time_str)
       VALUES ('i1','T03','dispute','Player disputes chip count outcome','open','Patrick Njoroge','10:23')
       ON CONFLICT (id) DO NOTHING`
    );
    await client.query(
      `INSERT INTO incidents (id, table_id, type, description, status, reported_by, time_str)
       VALUES ('i2','T06','unusual_win','Customer achieved 5 consecutive wins — review required','reviewing','Patrick Njoroge','09:47')
       ON CONFLICT (id) DO NOTHING`
    );

    // ── CUSTOMERS ──
    const customers = [
      { id:'C-081', name:'John Kamau',   vipLevel:'gold',     phone:'+254 722 111 111', notes:'' },
      { id:'C-044', name:'Sarah Otieno', vipLevel:'silver',   phone:'',                 notes:'' },
      { id:'C-012', name:'Peter Wambua', vipLevel:'platinum', phone:'+254 733 222 333', notes:'High roller — prefers Baccarat' },
      { id:'C-067', name:'Mary Njeri',   vipLevel:'standard', phone:'',                 notes:'' },
    ];
    for (const c of customers) {
      await client.query(
        `INSERT INTO customers (id, name, vip_level, phone, notes)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [c.id, c.name, c.vipLevel, c.phone, c.notes]
      );
    }

    // ── TRANSACTIONS ──
    await client.query(`INSERT INTO transactions (id, table_id, customer_id, type, amount, time_str) VALUES ('tx1','T01','C-081','drop',50000,'10:15') ON CONFLICT (id) DO NOTHING`);
    await client.query(`INSERT INTO transactions (id, table_id, customer_id, type, amount, time_str) VALUES ('tx2','T01','C-044','win',15000,'09:58') ON CONFLICT (id) DO NOTHING`);
    await client.query(`INSERT INTO transactions (id, table_id, customer_id, type, amount, time_str) VALUES ('tx3','T05','C-012','drop',200000,'08:30') ON CONFLICT (id) DO NOTHING`);

    // ── CASINO INFO ──
    await client.query(
      `INSERT INTO casino_info (id, name, address, phone, email, reg_no)
       VALUES (1,'Grand Casino','Nairobi, Kenya','','','')
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name`
    );

    // ── FORM TEMPLATES ──
    const ftKeys = ['open_float','close_float','fill_request','gi_report','transfer'];
    for (const key of ftKeys) {
      await client.query(
        `INSERT INTO form_templates (key) VALUES ($1) ON CONFLICT (key) DO NOTHING`,
        [key]
      );
    }

    // ── ROLE PERMISSIONS ──
    const DEFAULT_PERMS = {
      system_admin:  ['view_dashboard','view_floor','view_reports','view_roster','manage_users','manage_roles','configure_halls','configure_tables','configure_chips','configure_shifts','generate_roster','record_attendance','assign_halls','assign_tables','manage_breaklist','open_close_tables','request_fills','approve_fills','report_incidents','resolve_incidents','perform_chip_count','log_customer','dealer_rotation'],
      management:    ['view_dashboard','view_floor','view_reports','view_roster','resolve_incidents','report_incidents','configure_halls','configure_tables','configure_chips','configure_shifts','generate_roster','record_attendance','assign_halls','assign_tables','manage_breaklist','open_close_tables','request_fills','approve_fills','perform_chip_count','log_customer','dealer_rotation'],
      shift_manager: ['view_dashboard','view_floor','view_reports','view_roster','record_attendance','assign_halls','assign_tables','open_close_tables','approve_fills','report_incidents','resolve_incidents'],
      pit_boss:      ['view_dashboard','view_floor','manage_breaklist','assign_tables','open_close_tables','request_fills','report_incidents'],
      staff:         ['view_dashboard','perform_chip_count','log_customer','dealer_rotation'],
    };
    const ALL_PERMS = [...new Set(Object.values(DEFAULT_PERMS).flat())];
    for (const [role, enabled] of Object.entries(DEFAULT_PERMS)) {
      for (const perm of ALL_PERMS) {
        await client.query(
          `INSERT INTO role_permissions (role, permission_key, enabled) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [role, perm, enabled.includes(perm)]
        );
      }
    }

    // ── HOUSE FLOAT ──
    const tableFloatTotal = tables.reduce((s, t) => s + (t.floatCapacity || 0), 0);
    await client.query(
      `INSERT INTO house_float (id, amount) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET amount=EXCLUDED.amount`,
      [tableFloatTotal + 500000]
    );

    // ── ACTIVITY LOG ──
    await client.query(`INSERT INTO activity_log (id, action, detail, icon, time_str) VALUES ('a1','incident_reported','Dispute at T03','⚠️','10:23') ON CONFLICT (id) DO NOTHING`);
    await client.query(`INSERT INTO activity_log (id, action, detail, icon, time_str) VALUES ('a2','fill_requested','Fill request: T04 — KES 200,000','🪙','10:15') ON CONFLICT (id) DO NOTHING`);
    await client.query(`INSERT INTO activity_log (id, action, detail, icon, time_str) VALUES ('a3','shift_opened','Night Shift opened by Kevin Mwangi','🌙','22:01') ON CONFLICT (id) DO NOTHING`);

    await client.query('COMMIT');
    console.log('✅ Seed complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
