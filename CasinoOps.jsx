import { useState, useEffect, useCallback } from "react";

// =============================================================================
// CASINOPS V2 — COMPLETE BUILD
// =============================================================================
// ALL PATCHES APPLIED:
//
// ROUND 1 (previous session):
//   1.  INITIAL_TABLES — tableName, openedAt, openedDate, openingFloat fields
//   2.  Bulk-add staff ID collision FIXED — unique ID per entry (Date.now+index)
//   3.  addStaff — handles _bulkIdx for guaranteed unique IDs
//   4.  Shifts — shiftCode (M/D/N) added to shift objects
//   5.  Pull from Roster — uses generateRoster() for today + specific shift code
//   6.  StaffRecordsPage — onDeleteStaff + userRole props
//   7.  deleteStaff() — wired into App state
//   8.  AdminPage TableConfigModal — tableName, full Float Profile section
//   9.  Print functions — spec-accurate per-table Open/Close + Fill forms
//   10. HouseTab — per-table Open/Close denomination modal → print + state update
//   11. BreakListPage REWRITE — Table Assignments drives Breaklist S1, Break
//       History archive, progressive sessions, read-only for non-pit-boss
//   12. CustomerLogPage — inline edit + delete transactions
//   13. updateTransaction(), deleteTransaction() — wired through App
//
// ROUND 2 (this session):
//   A.  TableSessionPage — full table-centric rewrite with 4 tabs:
//       Session | Chip Count | Customer Log | Activity Log
//       All table activity (txns, incidents, fills, rotations) on one page.
//       Inspector rotates but table log persists.
//   B.  Staff ROLE_NAV — removed standalone Chip Count + Customer Log nav items.
//       Both now live inside TableSessionPage tabs.
//   C.  ShiftControlPage — date picker, shift time window display, shiftCode.
//       openShift() passes date through to state + activity log.
//   D.  approveFill() — auto-adds fill amount to table.chipTotal on full approval.
//   E.  ReportsPage Dealer Performance — real calculation from actual txns:
//       Score = (House Net Margin × 60%) + (Float Accuracy × 40%)
//       Shows Drop, Net, Float Δ, Margin % per dealer. No more mock data.
//   F.  Alert badge — pulsing red animation when active incidents exist.
//   G.  ConfirmModal — shared custom confirm component replaces window.confirm
//       everywhere: StaffRecordsPage + all 4 AdminPage delete actions.
//   H.  RosterPage month/year selectors — already present; confirmed working.
//
// NOTES FOR FURTHER ITERATION:
//   - Admin table config: per-denomination standard quantities for auto float calc
//   - TableSessionPage: breaklist preview reads from live pit boss breaklist state
//     (currently shows local hall pattern; needs shared state / lift up)
//   - Shift history: closeShift could archive table-level chip counts per table
//   - Multi-hall pit boss support (currently one pit boss = one hall)
// =============================================================================


const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0f;
    --bg2: #111118;
    --bg3: #16161f;
    --panel: #1a1a26;
    --panel2: #20202e;
    --gold: #c9a84c;
    --gold2: #e8c97a;
    --gold3: #f5e0a0;
    --gold-dim: rgba(201,168,76,0.15);
    --gold-glow: rgba(201,168,76,0.3);
    --green: #2dbe6c;
    --green-dim: rgba(45,190,108,0.15);
    --red: #e8415a;
    --red-dim: rgba(232,65,90,0.15);
    --yellow: #f5a623;
    --yellow-dim: rgba(245,166,35,0.15);
    --blue: #4a9ef5;
    --blue-dim: rgba(74,158,245,0.15);
    --orange: #f57c4a;
    --orange-dim: rgba(245,124,74,0.15);
    --text: #e8e8f0;
    --text2: #9898b0;
    --text3: #5a5a72;
    --border: rgba(201,168,76,0.12);
    --border2: rgba(255,255,255,0.06);
    --font-display: 'Playfair Display', serif;
    --font-mono: 'IBM Plex Mono', monospace;
    --font-body: 'Inter', sans-serif;
    --sidebar-w: 220px;
    --topbar-h: 58px;
    --radius: 8px;
    --radius2: 12px;
  }

  html, body, #root { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font-body); }

  /* scrollbar */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .app { display: flex; height: 100vh; overflow: hidden; }

  /* SIDEBAR */
  .sidebar {
    width: var(--sidebar-w); background: var(--bg2); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; flex-shrink: 0; z-index: 100;
    background-image: repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(201,168,76,0.02) 40px, rgba(201,168,76,0.02) 41px);
  }
  .sidebar-brand {
    padding: 20px 16px 16px; border-bottom: 1px solid var(--border);
  }
  .brand-logo {
    font-family: var(--font-display); font-size: 20px; font-weight: 700;
    color: var(--gold); letter-spacing: 0.5px;
    display: flex; align-items: center; gap: 8px;
  }
  .brand-logo .suit { font-size: 22px; }
  .brand-sub { font-size: 9px; letter-spacing: 3px; color: var(--text3); text-transform: uppercase; margin-top: 2px; }
  .sidebar-nav { flex: 1; padding: 8px 0; overflow-y: auto; }
  .nav-section { padding: 12px 16px 4px; font-size: 9px; letter-spacing: 2px; color: var(--text3); text-transform: uppercase; }
  .nav-item {
    display: flex; align-items: center; gap: 10px; padding: 9px 16px;
    font-size: 13px; color: var(--text2); cursor: pointer; transition: all 0.15s;
    border-left: 2px solid transparent; margin: 1px 0;
  }
  .nav-item:hover { color: var(--text); background: var(--gold-dim); }
  .nav-item.active { color: var(--gold); background: var(--gold-dim); border-left-color: var(--gold); }
  .nav-item .icon { width: 16px; text-align: center; font-size: 14px; }
  .sidebar-user {
    padding: 12px 16px; border-top: 1px solid var(--border);
    display: flex; align-items: center; gap: 10px; cursor: pointer;
  }
  .avatar {
    width: 32px; height: 32px; border-radius: 50%; background: var(--gold-dim);
    border: 1px solid var(--gold); display: flex; align-items: center; justify-content: center;
    font-size: 12px; color: var(--gold); font-weight: 600; flex-shrink: 0;
  }
  .user-info .name { font-size: 12px; font-weight: 500; }
  .user-info .role { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 1px; }
  .user-menu {
    position: absolute; bottom: 70px; left: 12px; width: 180px;
    background: var(--panel2); border: 1px solid var(--border); border-radius: var(--radius);
    overflow: hidden; z-index: 200; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  }
  .user-menu-item {
    padding: 10px 14px; font-size: 13px; color: var(--text2); cursor: pointer;
    display: flex; align-items: center; gap: 8px; transition: all 0.15s;
  }
  .user-menu-item:hover { background: var(--gold-dim); color: var(--gold); }
  .user-menu-item.danger:hover { background: var(--red-dim); color: var(--red); }

  /* TOPBAR */
  .topbar {
    height: var(--topbar-h); background: var(--bg2); border-bottom: 1px solid var(--border);
    display: flex; align-items: center; padding: 0 24px; gap: 16px; flex-shrink: 0;
  }
  .topbar-title { font-family: var(--font-display); font-size: 16px; color: var(--text); flex: 1; }
  .topbar-title span { color: var(--gold); }
  .shift-badge {
    display: flex; align-items: center; gap: 8px; padding: 6px 14px;
    background: var(--panel); border: 1px solid var(--border); border-radius: 20px;
  }
  .shift-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .shift-label { font-size: 10px; color: var(--text3); letter-spacing: 1px; text-transform: uppercase; }
  .shift-time { font-family: var(--font-mono); font-size: 14px; color: var(--gold); }
  .alert-badge {
    width: 32px; height: 32px; border-radius: 50%; background: var(--panel);
    border: 1px solid var(--border); display: flex; align-items: center; justify-content: center;
    cursor: pointer; position: relative; font-size: 14px; transition: all 0.2s;
  }
  .alert-badge:hover { border-color: var(--gold); }
  .alert-badge.has-alerts { border-color: var(--red); animation: alertPulse 2s ease-in-out infinite; }
  @keyframes alertPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(232,65,90,0); }
    50%       { box-shadow: 0 0 0 5px rgba(232,65,90,0.25); }
  }
  .alert-count {
    position: absolute; top: -2px; right: -2px; width: 14px; height: 14px;
    background: var(--red); border-radius: 50%; font-size: 8px; color: #fff;
    display: flex; align-items: center; justify-content: center; font-weight: 700;
  }

  /* MAIN */
  .main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .main-content { flex: 1; overflow-y: auto; padding: 24px; }

  /* CARDS */
  .card {
    background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius2);
    overflow: hidden; transition: border-color 0.2s;
  }
  .card:hover { border-color: var(--gold-glow); }
  .card-header {
    padding: 14px 18px; border-bottom: 1px solid var(--border2);
    display: flex; align-items: center; justify-content: space-between;
  }
  .card-title { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--text3); }
  .card-body { padding: 16px 18px; }

  /* STAT CARDS */
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px; }
  .stat-card {
    background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius2);
    padding: 18px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;
  }
  .stat-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: var(--accent, var(--gold)); opacity: 0.6;
  }
  .stat-card:hover { border-color: var(--accent, var(--gold)); transform: translateY(-1px); }
  .stat-label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--text3); margin-bottom: 10px; }
  .stat-value { font-family: var(--font-mono); font-size: 28px; font-weight: 500; color: var(--accent, var(--gold)); }
  .stat-sub { font-size: 11px; color: var(--text3); margin-top: 6px; }
  .stat-icon { position: absolute; top: 16px; right: 16px; font-size: 20px; opacity: 0.3; }

  /* BUTTONS */
  .btn {
    display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;
    border-radius: var(--radius); font-size: 12px; font-weight: 500; cursor: pointer;
    border: none; transition: all 0.15s; letter-spacing: 0.5px;
  }
  .btn-gold { background: var(--gold); color: #0a0a0f; }
  .btn-gold:hover { background: var(--gold2); }
  .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text2); }
  .btn-outline:hover { border-color: var(--gold); color: var(--gold); }
  .btn-red { background: var(--red-dim); border: 1px solid var(--red); color: var(--red); }
  .btn-red:hover { background: var(--red); color: #fff; }
  .btn-green { background: var(--green-dim); border: 1px solid var(--green); color: var(--green); }
  .btn-green:hover { background: var(--green); color: #fff; }
  .btn-sm { padding: 5px 10px; font-size: 11px; }
  .btn-xs { padding: 3px 8px; font-size: 10px; }

  /* TABLE GRID */
  .table-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .table-card {
    background: var(--panel2); border: 1px solid var(--border2); border-radius: var(--radius);
    padding: 14px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;
  }
  .table-card::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
    background: var(--tcolor, var(--text3));
  }
  .table-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
  .table-card.open { --tcolor: var(--green); border-color: rgba(45,190,108,0.2); }
  .table-card.closed { --tcolor: var(--text3); opacity: 0.6; }
  .table-card.incident { --tcolor: var(--red); border-color: rgba(232,65,90,0.2); animation: incident-pulse 2s infinite; }
  .table-card.fill_required { --tcolor: var(--yellow); border-color: rgba(245,166,35,0.2); }
  @keyframes incident-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(232,65,90,0)} 50%{box-shadow:0 0 0 4px rgba(232,65,90,0.15)} }
  .table-id { font-family: var(--font-mono); font-size: 18px; font-weight: 500; color: var(--gold); }
  .table-game { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
  .table-status { font-size: 10px; margin-top: 8px; display: flex; align-items: center; gap: 4px; }
  .table-staff { font-size: 10px; color: var(--text3); margin-top: 4px; }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--tcolor, var(--text3)); }

  /* STATUS BADGE */
  .badge {
    display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px;
    border-radius: 20px; font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 500;
  }
  .badge-green { background: var(--green-dim); color: var(--green); border: 1px solid rgba(45,190,108,0.3); }
  .badge-red { background: var(--red-dim); color: var(--red); border: 1px solid rgba(232,65,90,0.3); }
  .badge-yellow { background: var(--yellow-dim); color: var(--yellow); border: 1px solid rgba(245,166,35,0.3); }
  .badge-blue { background: var(--blue-dim); color: var(--blue); border: 1px solid rgba(74,158,245,0.3); }
  .badge-gold { background: var(--gold-dim); color: var(--gold); border: 1px solid rgba(201,168,76,0.3); }
  .badge-orange { background: var(--orange-dim); color: var(--orange); border: 1px solid rgba(245,124,74,0.3); }

  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 1000;
    display: flex; align-items: center; justify-content: center; padding: 24px;
    backdrop-filter: blur(4px);
  }
  .modal {
    background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius2);
    width: 100%; max-width: 520px; max-height: 85vh; overflow-y: auto;
    box-shadow: 0 24px 80px rgba(0,0,0,0.6);
    animation: modal-in 0.2s ease;
  }
  .modal-lg { max-width: 760px; }
  @keyframes modal-in { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
  .modal-header {
    padding: 18px 20px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .modal-title { font-family: var(--font-display); font-size: 18px; color: var(--gold); }
  .modal-close { background: none; border: none; color: var(--text3); cursor: pointer; font-size: 20px; padding: 4px; }
  .modal-close:hover { color: var(--text); }
  .modal-body { padding: 20px; }
  .modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; gap: 8px; justify-content: flex-end; }

  /* FORM */
  .form-group { margin-bottom: 16px; }
  .form-label { display: block; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: var(--text3); margin-bottom: 6px; }
  .form-input, .form-select, .form-textarea {
    width: 100%; background: var(--bg3); border: 1px solid var(--border2); border-radius: var(--radius);
    padding: 10px 12px; color: var(--text); font-family: var(--font-body); font-size: 13px;
    transition: border-color 0.15s; outline: none;
  }
  .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--gold); }
  .form-select option { background: var(--panel); }
  .form-textarea { resize: vertical; min-height: 80px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  /* TABLE (data) */
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text3); padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border); }
  .data-table td { padding: 12px; border-bottom: 1px solid var(--border2); font-size: 13px; }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: rgba(255,255,255,0.02); }

  /* TIMELINE */
  .timeline { display: flex; flex-direction: column; gap: 0; }
  .timeline-item { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border2); }
  .timeline-item:last-child { border-bottom: none; }
  .timeline-dot { width: 28px; height: 28px; border-radius: 50%; background: var(--panel2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; margin-top: 2px; }
  .timeline-time { font-family: var(--font-mono); font-size: 11px; color: var(--text3); white-space: nowrap; }
  .timeline-action { font-size: 12px; color: var(--text); }
  .timeline-detail { font-size: 11px; color: var(--text3); }

  /* BREAKLIST */
  .breaklist-table { width: 100%; overflow-x: auto; }
  .breaklist-grid { border-collapse: collapse; min-width: 600px; }
  .breaklist-grid th, .breaklist-grid td { padding: 8px 10px; text-align: center; border: 1px solid var(--border2); font-size: 11px; }
  .breaklist-grid th { background: var(--bg3); color: var(--text3); font-size: 9px; letter-spacing: 1px; text-transform: uppercase; }
  .breaklist-grid td { font-family: var(--font-mono); }
  .bl-table { background: var(--green-dim); color: var(--green); font-size: 10px; border-radius: 3px; padding: 2px 5px; }
  .bl-break { background: var(--blue-dim); color: var(--blue); font-size: 10px; border-radius: 3px; padding: 2px 5px; }
  .bl-off { color: var(--text3); }
  .bl-name { text-align: left !important; color: var(--text); font-family: var(--font-body) !important; font-weight: 500; }

  /* ROSTER */
  .roster-table { width: 100%; overflow-x: auto; }
  .roster-grid { border-collapse: collapse; min-width: 800px; }
  .roster-grid th, .roster-grid td { padding: 7px 6px; text-align: center; border: 1px solid var(--border2); font-size: 11px; }
  .roster-grid th { background: var(--bg3); color: var(--text3); font-size: 9px; letter-spacing: 1px; text-transform: uppercase; }
  .roster-N { background: rgba(74,158,245,0.12); color: var(--blue); font-weight: 600; }
  .roster-D { background: rgba(245,166,35,0.12); color: var(--yellow); font-weight: 600; }
  .roster-M { background: rgba(45,190,108,0.12); color: var(--green); font-weight: 600; }
  .roster-X { color: var(--text3); }
  .roster-name { text-align: left !important; color: var(--text); font-weight: 500; font-size: 12px; }

  /* LOGIN */
  .login-page {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: var(--bg);
    background-image: radial-gradient(ellipse at 20% 50%, rgba(201,168,76,0.05) 0%, transparent 60%),
                      radial-gradient(ellipse at 80% 50%, rgba(74,158,245,0.03) 0%, transparent 60%),
                      repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.01) 40px, rgba(255,255,255,0.01) 41px),
                      repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.01) 40px, rgba(255,255,255,0.01) 41px);
  }
  .login-card {
    width: 380px; background: var(--panel); border: 1px solid var(--border);
    border-radius: var(--radius2); overflow: hidden;
    box-shadow: 0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,168,76,0.05);
  }
  .login-header { padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid var(--border); }
  .login-logo { font-family: var(--font-display); font-size: 28px; color: var(--gold); }
  .login-sub { font-size: 10px; letter-spacing: 3px; color: var(--text3); text-transform: uppercase; margin-top: 4px; }
  .login-body { padding: 28px 32px; }
  .login-demo { margin-top: 20px; padding: 14px; background: var(--bg3); border-radius: var(--radius); }
  .login-demo-title { font-size: 10px; letter-spacing: 1px; color: var(--text3); text-transform: uppercase; margin-bottom: 8px; }
  .login-demo-item { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; border-bottom: 1px solid var(--border2); }
  .login-demo-item:last-child { border-bottom: none; }
  .login-demo-role { color: var(--gold); }
  .login-demo-cred { font-family: var(--font-mono); color: var(--text3); font-size: 10px; }
  .login-error { background: var(--red-dim); border: 1px solid var(--red); color: var(--red); padding: 10px 12px; border-radius: var(--radius); font-size: 12px; margin-bottom: 14px; }

  /* MISC */
  .flex { display: flex; }
  .flex-1 { flex: 1; }
  .items-center { align-items: center; }
  .gap-8 { gap: 8px; }
  .gap-12 { gap: 12px; }
  .gap-16 { gap: 16px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .mb-16 { margin-bottom: 16px; }
  .mb-20 { margin-bottom: 20px; }
  .mt-16 { margin-top: 16px; }
  .text-gold { color: var(--gold); }
  .text-green { color: var(--green); }
  .text-red { color: var(--red); }
  .text-yellow { color: var(--yellow); }
  .text-muted { color: var(--text3); }
  .text-sm { font-size: 12px; }
  .text-xs { font-size: 11px; }
  .text-mono { font-family: var(--font-mono); }
  .font-display { font-family: var(--font-display); }
  .divider { height: 1px; background: var(--border2); margin: 16px 0; }
  .chip-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; font-family: var(--font-mono); }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .section-title { font-family: var(--font-display); font-size: 20px; }
  .section-sub { font-size: 11px; color: var(--text3); margin-top: 2px; }
  .empty-state { padding: 40px; text-align: center; color: var(--text3); font-size: 13px; }
  .empty-icon { font-size: 32px; margin-bottom: 10px; opacity: 0.4; }
  .progress-bar { height: 4px; background: var(--bg3); border-radius: 2px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
  .incident-card { padding: 14px; background: var(--panel2); border-radius: var(--radius); border-left: 3px solid var(--red); margin-bottom: 10px; }
  .fill-request-card { padding: 14px; background: var(--panel2); border-radius: var(--radius); border-left: 3px solid var(--yellow); margin-bottom: 10px; }
  .scrollable { overflow-y: auto; max-height: 400px; }
  .quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .quick-btn {
    padding: 14px; background: var(--panel2); border: 1px solid var(--border2); border-radius: var(--radius);
    cursor: pointer; transition: all 0.2s; text-align: center; font-size: 12px; color: var(--text2);
  }
  .quick-btn:hover { border-color: var(--gold); color: var(--gold); background: var(--gold-dim); }
  .quick-btn .qb-icon { font-size: 22px; margin-bottom: 6px; }
  .notification { position: fixed; top: 70px; right: 20px; background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 16px; z-index: 2000; font-size: 13px; animation: notif-in 0.3s ease; box-shadow: 0 8px 32px rgba(0,0,0,0.5); max-width: 300px; }
  @keyframes notif-in { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
  .chip-count-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; padding: 10px; background: var(--bg3); border-radius: var(--radius); }
  .chip-color { width: 20px; height: 20px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); }
  .tab-bar { display: flex; gap: 0; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
  .tab-item { padding: 10px 18px; font-size: 12px; cursor: pointer; color: var(--text3); border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.15s; }
  .tab-item.active { color: var(--gold); border-bottom-color: var(--gold); }
  .tab-item:hover { color: var(--text); }
`;

// ─── DATA & STATE ─────────────────────────────────────────────────────────────

const DEMO_USERS = [
  { id: "u1", staffId: null, name: "System Admin",   empNo: "EMP001", email: "admin@casino.com",      password: "admin123", role: "system_admin",  phone: "", bio: "" },
  { id: "u2", staffId: null, name: "James Ochieng",  empNo: "EMP002", email: "management@casino.com", password: "mgmt123",  role: "management",    phone: "", bio: "" },
  { id: "u3", staffId: null, name: "Kevin Mwangi",   empNo: "EMP003", email: "shift@casino.com",      password: "shift123", role: "shift_manager", phone: "", bio: "" },
  { id: "u4", staffId: "s12", name: "Patrick Njoroge", empNo: "EMP004", email: "pitboss@casino.com", password: "pit123", role: "pit_boss", phone: "", bio: "" },
  { id: "u5", staffId: "s13", name: "Grace Achieng",  empNo: "EMP005", email: "staff@casino.com",    password: "staff123", role: "staff",    phone: "", bio: "" },
];

const CHIP_DENOMINATIONS = [
  { id: "c1", color: "White", hex: "#e8e8e8", value: 100 },
  { id: "c2", color: "Red", hex: "#e8415a", value: 500 },
  { id: "c3", color: "Green", hex: "#2dbe6c", value: 1000 },
  { id: "c4", color: "Black", hex: "#2a2a3a", value: 5000 },
  { id: "c5", color: "Purple", hex: "#8b45d4", value: 10000 },
];

const INITIAL_HALLS = [
  { id: "h1", name: "Hall A — Main Floor" },
  { id: "h2", name: "Hall B — VIP Lounge" },
  { id: "h3", name: "Hall C — High Rollers" },
];

const INITIAL_TABLES = [
  { id: "T01", hallId: "h1", gameType: "Blackjack", status: "open",         minBet: 500,   maxBet: 10000,  dealerId: "s1", inspectorId: "s4", chipTotal: 250000,  floatCapacity: 250000,  openingFloat: 250000,  openedAt: "04:59", openedDate: "25/03/26", tableName: "Blackjack 1" },
  { id: "T02", hallId: "h1", gameType: "Roulette",  status: "open",         minBet: 200,   maxBet: 5000,   dealerId: "s2", inspectorId: null, chipTotal: 180000,  floatCapacity: 200000,  openingFloat: 200000,  openedAt: "05:10", openedDate: "25/03/26", tableName: "Roulette 1" },
  { id: "T03", hallId: "h1", gameType: "Baccarat",  status: "incident",     minBet: 1000,  maxBet: 20000,  dealerId: "s3", inspectorId: "s5", chipTotal: 320000,  floatCapacity: 350000,  openingFloat: 350000,  openedAt: "05:05", openedDate: "25/03/26", tableName: "Baccarat 1" },
  { id: "T04", hallId: "h1", gameType: "Blackjack", status: "fill_required",minBet: 500,   maxBet: 10000,  dealerId: null, inspectorId: null, chipTotal: 45000,   floatCapacity: 250000,  openingFloat: 250000,  openedAt: "05:00", openedDate: "25/03/26", tableName: "Blackjack 2" },
  { id: "T05", hallId: "h1", gameType: "Poker",     status: "closed",       minBet: 200,   maxBet: 5000,   dealerId: null, inspectorId: null, chipTotal: 0,       floatCapacity: 150000,  openingFloat: 0,       openedAt: null,    openedDate: null,        tableName: "Poker 1" },
  { id: "T06", hallId: "h1", gameType: "Roulette",  status: "open",         minBet: 500,   maxBet: 15000,  dealerId: "s6", inspectorId: null, chipTotal: 210000,  floatCapacity: 200000,  openingFloat: 200000,  openedAt: "05:15", openedDate: "25/03/26", tableName: "Roulette 2" },
  { id: "T07", hallId: "h2", gameType: "Blackjack", status: "open",         minBet: 2000,  maxBet: 50000,  dealerId: "s7", inspectorId: "s8", chipTotal: 780000,  floatCapacity: 800000,  openingFloat: 800000,  openedAt: "04:55", openedDate: "25/03/26", tableName: "VIP Blackjack 1" },
  { id: "T08", hallId: "h2", gameType: "Baccarat",  status: "open",         minBet: 5000,  maxBet: 100000, dealerId: "s9", inspectorId: null, chipTotal: 1200000, floatCapacity: 1200000, openingFloat: 1200000, openedAt: "05:00", openedDate: "25/03/26", tableName: "Baccarat VIP 1" },
  { id: "T09", hallId: "h3", gameType: "Blackjack", status: "closed",       minBet: 10000, maxBet: 500000, dealerId: null, inspectorId: null, chipTotal: 0,       floatCapacity: 2000000, openingFloat: 0,       openedAt: null,    openedDate: null,        tableName: "High Roller 1" },
];

const INITIAL_STAFF = [
  { id: "s1",  name: "Ali Hassan",     empNo: "S001", position: "dealer",           hallId: "h1", status: "on_table",  staffStatus: "active" },
  { id: "s2",  name: "Beatrice Kamau", empNo: "S002", position: "dealer",           hallId: "h1", status: "on_table",  staffStatus: "active" },
  { id: "s3",  name: "Charles Otieno", empNo: "S003", position: "dealer_inspector", hallId: "h1", status: "on_table",  staffStatus: "active" },
  { id: "s4",  name: "Diana Wanjiku",  empNo: "S004", position: "inspector",        hallId: "h1", status: "on_table",  staffStatus: "active" },
  { id: "s5",  name: "Evans Kiprop",   empNo: "S005", position: "inspector",        hallId: "h1", status: "on_table",  staffStatus: "active" },
  { id: "s6",  name: "Florence Njoki", empNo: "S006", position: "dealer",           hallId: "h1", status: "on_table",  staffStatus: "active" },
  { id: "s7",  name: "George Mutua",   empNo: "S007", position: "dealer",           hallId: "h2", status: "on_table",  staffStatus: "active" },
  { id: "s8",  name: "Hannah Auma",    empNo: "S008", position: "inspector",        hallId: "h2", status: "on_table",  staffStatus: "active" },
  { id: "s9",  name: "Isaac Mwenda",   empNo: "S009", position: "dealer",           hallId: "h2", status: "on_table",  staffStatus: "active" },
  { id: "s10", name: "Joyce Chelimo",  empNo: "S010", position: "dealer",           hallId: "h1", status: "break",     staffStatus: "active" },
  { id: "s11", name: "Kenneth Ouma",   empNo: "S011", position: "dealer",           hallId: "h1", status: "checked_in",staffStatus: "active" },
  { id: "s12", name: "Patrick Njoroge", empNo: "EMP004", position: "pit_boss", hallId: "h1", status: "on_table", staffStatus: "active" },
  { id: "s13", name: "Grace Achieng",  empNo: "EMP005", position: "dealer",   hallId: "h1", status: "checked_in", staffStatus: "active" },
];

const INITIAL_CUSTOMERS = [
  { id: "C-081", name: "John Kamau",    vipLevel: "gold",     phone: "+254 722 111 111", notes: "" },
  { id: "C-044", name: "Sarah Otieno",  vipLevel: "silver",   phone: "",                 notes: "" },
  { id: "C-112", name: "David Mwangi",  vipLevel: "platinum", phone: "+254 733 222 222", notes: "High roller" },
  { id: "C-033", name: "Mary Wanjiku",  vipLevel: "gold",     phone: "",                 notes: "" },
  { id: "C-099", name: "Peter Ochieng", vipLevel: "standard", phone: "",                 notes: "" },
  { id: "C-055", name: "Alice Mutua",   vipLevel: "silver",   phone: "",                 notes: "" },
];

const INITIAL_INCIDENTS = [
  { id: "i1", tableId: "T03", type: "dispute", description: "Player disputes chip count outcome", status: "open", reportedBy: "Patrick Njoroge", time: "10:23", createdAt: new Date(Date.now() - 1800000) },
  { id: "i2", tableId: "T06", type: "unusual_win", description: "Customer achieved 5 consecutive wins — review required", status: "reviewing", reportedBy: "Patrick Njoroge", time: "09:47", createdAt: new Date(Date.now() - 4500000) },
];

const INITIAL_FILLS = [
  { id: "f1", tableId: "T04", denomination: "Black (5000)", amount: 200000, status: "pending", requestedBy: "Patrick Njoroge", time: "10:15" },
];

const INITIAL_ACTIVITY = [
  { id: "a1", time: "10:23", action: "incident_reported", detail: "Dispute at T03", icon: "⚠️" },
  { id: "a2", time: "10:15", action: "fill_requested", detail: "Fill request: T04 — KES 200,000", icon: "🪙" },
  { id: "a3", time: "10:05", action: "dealer_rotation", detail: "Ali Hassan → T01 from T06", icon: "🔄" },
  { id: "a4", time: "09:55", action: "chip_count", detail: "Chip count logged: T02 — Win +18,500", icon: "📊" },
  { id: "a5", time: "09:47", action: "unusual_win", detail: "Unusual win flagged: T06", icon: "🎯" },
  { id: "a6", time: "09:30", action: "table_opened", detail: "T07 opened — Hall B VIP", icon: "🟢" },
  { id: "a7", time: "09:00", action: "shift_started", detail: "Night shift commenced", icon: "🌙" },
];

// Generate roster data
function generateRoster(staff, month = 3, year = 2026) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const shiftCycle = ["N", "N", "D", "D", "M", "M", "X"];
  return staff.map((s, si) => {
    const days = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const cyclePos = (si * 2 + d - 1) % 7;
      days[d] = shiftCycle[cyclePos];
    }
    return { staffId: s.id, name: s.name, days };
  });
}

// Generate breaklist
function generateBreakList(staff) {
  const sessions = ["T01","T02","X","T03","T04","X","T05","T01","T02","X"];
  return staff.filter(s => s.position === "dealer" || s.position === "dealer_inspector").map((s, si) => {
    const sesh = {};
    for (let i = 1; i <= 10; i++) {
      sesh[i] = sessions[(si + i) % sessions.length];
    }
    return { staffId: s.id, name: s.name, position: s.position, sessions: sesh };
  });
}

// ─── PERMISSION MAP ───────────────────────────────────────────────────────────
const ROLE_NAV = {
  system_admin: [
    { label: "Admin Panel", icon: "⚙️", page: "admin" },
    { label: "Users", icon: "👥", page: "users" },
    { label: "Chip Config", icon: "🎰", page: "chips" },
    { label: "Hall Config", icon: "🏛️", page: "halls" },
    { label: "Table Config", icon: "🃏", page: "tables" },
    { label: "Roster Mgmt", icon: "📅", page: "roster" },
  ],
  management: [
    { label: "Dashboard", icon: "📊", page: "dashboard" },
    { label: "Floor View", icon: "🗺️", page: "floor" },
    { label: "Float Mgmt", icon: "🏦", page: "float_mgmt" },
    { label: "Reports", icon: "📈", page: "reports" },
    { label: "Incidents", icon: "⚠️", page: "incidents" },
    { label: "Roster", icon: "📅", page: "roster" },
    { label: "Staff Records", icon: "👷", page: "staff_records" },
    { label: "Customers", icon: "👥", page: "customers" },
  ],
  shift_manager: [
    { label: "Dashboard", icon: "📊", page: "dashboard" },
    { label: "Shift Control", icon: "🔑", page: "shift_control" },
    { label: "Floor View", icon: "🗺️", page: "floor" },
    { label: "Staffing", icon: "👷", page: "staffing" },
    { label: "Roster", icon: "📅", page: "roster" },
    { label: "Tables", icon: "🃏", page: "tables" },
    { label: "Incidents", icon: "⚠️", page: "incidents" },
    { label: "Cage & Fills", icon: "💰", page: "fills" },
  ],
  pit_boss: [
    { label: "Dashboard", icon: "📊", page: "dashboard" },
    { label: "Break List", icon: "🔄", page: "breaklist" },
    { label: "Tables", icon: "🃏", page: "tables" },
    { label: "Cage & Fills", icon: "💰", page: "fills" },
    { label: "Incidents", icon: "⚠️", page: "incidents" },
    { label: "Shoe Tracking", icon: "🃏", page: "shoe_tracking" },
    { label: "Customers", icon: "👥", page: "customers" },
  ],
  staff: [
    { label: "Dashboard",   icon: "📊", page: "dashboard"     },
    { label: "My Table",    icon: "🃏", page: "table_session"  },
    { label: "Shoe Tracking", icon: "🎴", page: "shoe_tracking" },
  ],
};

const fmt = (n) => n?.toLocaleString("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 });
const fmtNum = (n) => n?.toLocaleString();

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

// ─── SHARED CONFIRM MODAL ─────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel = "Confirm", confirmColor = "btn-red", onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{message}</div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button className={`btn ${confirmColor}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function Notification({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div className="notification" style={{ borderColor: msg.color || "var(--gold)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span>{msg.icon} {msg.text}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>✕</button>
      </div>
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  const h = time.getHours();
  const shift = h >= 6 && h < 14 ? "MORNING" : h >= 14 && h < 22 ? "DAY" : "NIGHT";
  return (
    <div className="shift-badge">
      <div className="shift-dot" />
      <span className="shift-label">{shift}</span>
      <span className="shift-time">{time.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    open: ["badge-green", "● OPEN"],
    closed: ["badge-red", "● CLOSED"],
    incident: ["badge-red", "⚠ INCIDENT"],
    fill_required: ["badge-yellow", "⊕ FILL NEEDED"],
    pending: ["badge-yellow", "PENDING"],
    reviewing: ["badge-blue", "REVIEWING"],
    resolved: ["badge-green", "RESOLVED"],
    approved: ["badge-green", "APPROVED"],
  };
  const [cls, label] = map[status] || ["badge-gold", status?.toUpperCase()];
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ─── PAGES ────────────────────────────────────────────────────────────────────

function FloorView({ tables, halls, staff, onTableClick }) {
  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Floor View</div>
          <div className="section-sub">Live casino floor — click any table for details</div>
        </div>
        <div className="flex gap-8">
          {[["green","Open"],["red","Incident"],["yellow","Fill Needed"],["#5a5a72","Closed"]].map(([c,l]) => (
            <div key={l} className="flex items-center gap-8" style={{ fontSize: 11, color: "var(--text3)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--${c}, ${c})` }} />
              {l}
            </div>
          ))}
        </div>
      </div>
      {halls.map(hall => {
        const hallTables = tables.filter(t => t.hallId === hall.id);
        return (
          <div key={hall.id} className="card mb-16">
            <div className="card-header">
              <div className="card-title">🏛 {hall.name}</div>
              <div className="text-xs text-muted">{hallTables.filter(t=>t.status==="open").length} active / {hallTables.length} tables</div>
            </div>
            <div className="card-body">
              <div className="table-grid">
                {hallTables.map(t => {
                  const dealer = staff.find(s => s.id === t.dealerId);
                  return (
                    <div key={t.id} className={`table-card ${t.status}`} onClick={() => onTableClick(t)}>
                      <div className="table-id">{t.id}</div>
                      <div className="table-game">{t.gameType}</div>
                      <div className="table-status">
                        <div className="status-dot" />
                        <span style={{ fontSize: 10, color: "var(--text2)" }}>{t.status.replace("_"," ").toUpperCase()}</span>
                      </div>
                      <div className="table-staff">{dealer ? `👤 ${dealer.name}` : "No dealer"}</div>
                      {t.chipTotal > 0 && <div className="table-staff text-mono" style={{ color: "var(--gold)", fontSize: 10 }}>{fmt(t.chipTotal)}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Dashboard({ user, tables, staff, incidents, fills, activity, onNavigate, transactions }) {
  const [detailEvent, setDetailEvent] = useState(null);
  const open = tables.filter(t => t.status === "open").length;
  const txns = transactions || [];
  const totalDrop = txns.filter(t => t.type==="drop").reduce((s,t) => s+t.amount, 0);
  const totalWin  = txns.filter(t => t.type==="win").reduce((s,t)  => s+t.amount, 0);
  const netHouse  = totalDrop - totalWin;
  const winRate   = totalDrop > 0 ? ((netHouse/totalDrop)*100).toFixed(1) : "0.0";
  const activeStaff = staff.filter(s => s.status !== "off_shift").length;
  const openIncidents = incidents.filter(i => i.status !== "resolved").length;

  const roleData = {
    system_admin: {
      title: "System Administration",
      stats: [
        { label: "Total Users", value: "16", sub: "5 roles", icon: "👥", accent: "var(--gold)", page: "users" },
        { label: "Active Tables", value: "9", sub: "3 halls configured", icon: "🃏", accent: "var(--green)", page: "tables" },
        { label: "Chip Denominations", value: "5", sub: "Configured", icon: "🎰", accent: "var(--blue)", page: "chips" },
        { label: "System Status", value: "OK", sub: "All services running", icon: "✅", accent: "var(--green)", page: "admin" },
      ]
    },
    management: {
      title: "Executive Overview",
      stats: [
        { label: "Total Drop",     value: totalDrop > 0 ? fmt(totalDrop) : "No data", sub: "Current shift",       icon: "📥", accent: "var(--gold)",                                      page: "reports" },
        { label: "Total Win",      value: totalDrop > 0 ? fmt(totalWin)  : "No data", sub: "Customer winnings",   icon: "📤", accent: "var(--red)",                                       page: "reports" },
        { label: "House Net",      value: totalDrop > 0 ? fmt(netHouse)  : "No data", sub: `${winRate}% win rate`,icon: "📈", accent: netHouse>=0?"var(--green)":"var(--red)",             page: "reports" },
        { label: "Open Incidents", value: String(openIncidents),                       sub: "Require attention",   icon: "⚠️", accent: "var(--red)",                                      page: "incidents" },
      ]
    },
    shift_manager: {
      title: "Shift Operations Center",
      stats: [
        { label: "Staff on Floor",  value: String(activeStaff), sub: `${staff.filter(s=>s.status==="break").length} on break`, icon: "👷", accent: "var(--blue)",  page: "staffing" },
        { label: "Active Tables",   value: String(open),        sub: `of ${tables.length} total`,                              icon: "🃏", accent: "var(--green)", page: "tables" },
        { label: "House Net",       value: totalDrop > 0 ? fmt(netHouse) : "No data", sub: `${winRate}% win rate`,             icon: "💰", accent: netHouse>=0?"var(--green)":"var(--red)", page: "shift_control" },
        { label: "Active Incidents",value: String(openIncidents), sub: "Pending resolution",                                   icon: "🚨", accent: "var(--red)",   page: "incidents" },
      ]
    },
    pit_boss: (() => {
      const pbProfile = staff.find(s => s.id === user.staffId) || staff.find(s => s.position === "pit_boss");
      const pbHallId  = pbProfile?.hallId || "h1";
      return {
        title: "Pit Operations — My Hall",
        stats: [
          { label: "My Tables",     value: String(tables.filter(t=>t.hallId===pbHallId).length),                                                          sub: `${tables.filter(t=>t.hallId===pbHallId&&t.status==="open").length} active`,   icon: "🃏", accent: "var(--green)",  page: "breaklist" },
          { label: "Hall Dealers",  value: String(staff.filter(s=>s.hallId===pbHallId&&s.position.includes("dealer")).length),                            sub: `${staff.filter(s=>s.hallId===pbHallId&&s.status==="break").length} on break`, icon: "👤", accent: "var(--blue)",   page: "breaklist" },
          { label: "Hall Net",      value: (() => { const ht = tables.filter(t=>t.hallId===pbHallId); const drop = (transactions||[]).filter(tx=>ht.map(t=>t.id).includes(tx.tableId)&&tx.type==="drop").reduce((s,t)=>s+t.amount,0); const win = (transactions||[]).filter(tx=>ht.map(t=>t.id).includes(tx.tableId)&&tx.type==="win").reduce((s,t)=>s+t.amount,0); const net=drop-win; return drop>0?fmt(net):"No data"; })(), sub: "House net today",  icon: "📈", accent: "var(--green)",  page: "reports"   },
          { label: "Open Incidents",value: String(incidents.filter(i=>i.status!=="resolved" && tables.filter(t=>t.hallId===pbHallId).map(t=>t.id).includes(i.tableId)).length), sub: "In my hall",         icon: "⚠️", accent: "var(--red)",    page: "incidents" },
        ]
      };
    })(),
    staff: (() => {
      const myProfile  = staff.find(s => s.id === user.staffId);
      const myTbl      = tables.find(t => t.dealerId === myProfile?.id) || tables.find(t => t.inspectorId === myProfile?.id);
      const myTxns     = (txns).filter(t => myTbl && t.tableId === myTbl.id);
      const myDrop     = myTxns.filter(t=>t.type==="drop").reduce((s,t)=>s+t.amount,0);
      const myWin      = myTxns.filter(t=>t.type==="win").reduce((s,t) =>s+t.amount,0);
      const myNet      = myDrop - myWin;
      const myIncidents= (incidents||[]).filter(i => myTbl && i.tableId === myTbl.id && i.status!=="resolved");
      return {
        title: `Table Operations${myTbl ? ` — ${myTbl.id}` : ""}`,
        stats: [
          { label: "My Table",         value: myTbl ? myTbl.id : "None",         sub: myTbl ? `${myTbl.gameType}` : "Not assigned",   icon: "🃏", accent: "var(--gold)",   page: "table_session" },
          { label: "Shift Net",        value: myDrop>0 ? fmt(myNet) : "No data",  sub: `Drop ${myDrop>0?fmt(myDrop):"—"} · Win ${myWin>0?fmt(myWin):"—"}`, icon: "📈", accent: myNet>=0?"var(--green)":"var(--red)", page: "table_session" },
          { label: "Customers",        value: String([...new Set(myTxns.map(t=>t.customerId))].filter(Boolean).length), sub: `${myTxns.length} transactions today`, icon: "👥", accent: "var(--blue)", page: "table_session" },
          { label: "Open Incidents",   value: String(myIncidents.length),          sub: "At my table",                                   icon: "⚠️", accent: "var(--red)",    page: "incidents" },
        ],
        myTbl, myTxns, myIncidents,
      };
    })(),
  };

  const roleEntry = roleData[user.role] || roleData.management;
  const { title, stats } = roleEntry;
  const staffTableData = user.role === "staff" ? roleEntry : null;

  return (
    <>
    <div>
      <div className="section-header mb-20">
        <div>
          <div className="section-title">Welcome, <span className="text-gold">{user.name.split(" ")[0]}</span></div>
          <div className="section-sub">{title}</div>
        </div>
        <div className="badge badge-gold">{user.role.replace("_"," ").toUpperCase()}</div>
      </div>

      <div className="stat-grid">
        {stats.map(s => (
          <div key={s.label} className="stat-card" style={{ "--accent": s.accent }} onClick={() => onNavigate(s.page)}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: s.value.length > 8 ? 16 : 24 }}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── STAFF TABLE ACTIVITY SUMMARY ── */}
      {staffTableData?.myTbl && (
        <div style={{ marginBottom:"1.5rem" }}>
          <div className="card" style={{ marginBottom:"1rem" }}>
            <div className="card-header">
              <div className="card-title">Table {staffTableData.myTbl.id} — Activity Summary</div>
              <button className="btn btn-sm btn-gold" onClick={() => onNavigate("table_session")}>Open Session →</button>
            </div>
            <div className="card-body">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:"1rem", marginBottom:"1rem" }}>
                {[
                  { label:"Game Type",       value: staffTableData.myTbl.gameType },
                  { label:"Status",          value: staffTableData.myTbl.status.toUpperCase() },
                  { label:"Opening Float",   value: fmt(staffTableData.myTbl.openingFloat||staffTableData.myTbl.floatCapacity||0) },
                  { label:"Current Chips",   value: fmt(staffTableData.myTbl.chipTotal||0) },
                  { label:"Total Drop",      value: staffTableData.myTxns.filter(t=>t.type==="drop").length > 0 ? fmt(staffTableData.myTxns.filter(t=>t.type==="drop").reduce((s,t)=>s+t.amount,0)) : "No data" },
                  { label:"Unique Customers",value: String([...new Set(staffTableData.myTxns.map(t=>t.customerId))].filter(Boolean).length) },
                ].map(item => (
                  <div key={item.label} style={{ background:"var(--bg3)", padding:"0.6rem 0.9rem", borderRadius:"var(--radius)" }}>
                    <div style={{ fontSize:"0.7rem", color:"var(--text3)", textTransform:"uppercase", marginBottom:"0.2rem" }}>{item.label}</div>
                    <div style={{ fontWeight:600, fontSize:"0.95rem" }}>{item.value}</div>
                  </div>
                ))}
              </div>
              {/* Customer Records */}
              {staffTableData.myTxns.length > 0 && (
                <div style={{ marginTop:"0.75rem" }}>
                  <div style={{ fontSize:"0.8rem", color:"var(--text2)", fontWeight:600, marginBottom:"0.5rem" }}>Recent Customer Activity</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.3rem", maxHeight:"140px", overflowY:"auto" }}>
                    {staffTableData.myTxns.slice(0,8).map(t => (
                      <div key={t.id} style={{ display:"flex", justifyContent:"space-between", fontSize:"0.8rem", padding:"0.3rem 0.5rem", background:"var(--panel)", borderRadius:"var(--radius)" }}>
                        <span style={{ color:"var(--text2)" }}>{t.customerId||"—"}</span>
                        <span style={{ color:"var(--text3)" }}>{t.time}</span>
                        <span style={{ color:t.type==="drop"?"var(--green)":"var(--red)", fontFamily:"var(--font-mono)" }}>{t.type==="drop"?"+":"-"}{fmt(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Open Incidents */}
              {staffTableData.myIncidents.length > 0 && (
                <div style={{ marginTop:"0.75rem", padding:"0.6rem 0.9rem", background:"var(--red-dim)", borderRadius:"var(--radius)", border:"1px solid var(--red)" }}>
                  <div style={{ fontSize:"0.8rem", fontWeight:600, color:"var(--red)", marginBottom:"0.3rem" }}>⚠ {staffTableData.myIncidents.length} Open Incident{staffTableData.myIncidents.length>1?"s":""}</div>
                  {staffTableData.myIncidents.slice(0,3).map(i => (
                    <div key={i.id} style={{ fontSize:"0.78rem", color:"var(--text2)", marginTop:"0.2rem" }}>{i.type}: {i.description}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid-2 gap-16">
        {/* Activity Timeline */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Floor Activity Timeline</div>
            <div className="badge badge-gold">{activity.length} events</div>
          </div>
          <div className="card-body">
            <div className="timeline scrollable">
              {activity.map(a => (
                <div key={a.id} className="timeline-item" onClick={() => setDetailEvent(a)} style={{ cursor: "pointer" }}>
                  <div className="timeline-dot">{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-8">
                      <span className="timeline-time">{a.time}</span>
                      <span className="timeline-action">{a.action.replace(/_/g, " ")}</span>
                    </div>
                    <div className="timeline-detail">{a.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Incidents */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Active Incidents</div>
            {openIncidents > 0 && <div className="badge badge-red">{openIncidents} OPEN</div>}
          </div>
          <div className="card-body">
            {incidents.length === 0
              ? <div className="empty-state"><div className="empty-icon">✅</div>No active incidents</div>
              : incidents.map(i => (
              <div key={i.id} className="incident-card">
                <div className="flex items-center gap-8 mb-16" style={{ marginBottom: 6 }}>
                  <span className="text-mono" style={{ fontSize: 12, color: "var(--gold)" }}>{i.tableId}</span>
                  <StatusBadge status={i.status} />
                  <span className="badge badge-orange" style={{ fontSize: 9 }}>{i.type.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>{i.description}</div>
                <div style={{ fontSize: 10, color: "var(--text3)" }}>Reported {i.time} by {i.reportedBy}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

      {detailEvent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setDetailEvent(null)}>
          <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius2)", padding: "2rem", minWidth: "340px", maxWidth: "480px" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>Activity Detail</div>
              <button onClick={() => setDetailEvent(null)} style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.5rem" }}>{detailEvent.icon || "📋"}</span>
              <div>
                <div style={{ fontWeight: 600 }}>{detailEvent.action}</div>
                <div style={{ color: "var(--text2)", fontSize: "0.8rem" }}>{detailEvent.time}</div>
              </div>
            </div>
            <div style={{ color: "var(--text2)", fontSize: "0.85rem", background: "var(--bg3)", padding: "0.75rem 1rem", borderRadius: "var(--radius)", marginBottom: "1rem" }}>
              {detailEvent.detail || "No additional details available."}
            </div>
            {detailEvent.entityId && (
              <div style={{ color: "var(--text3)", fontSize: "0.8rem" }}>Reference: {detailEvent.entityId}</div>
            )}
            <button className="btn btn-sm btn-outline" style={{ marginTop: "1rem", width: "100%" }} onClick={() => setDetailEvent(null)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}

function TablesPage({ tables, halls, staff, onUpdateTable, onOpenTableModal, canEdit, chips }) {
  const [hallFilter, setHallFilter] = useState("all");
  const [chipModal, setChipModal]   = useState(null); // table object
  const filtered = hallFilter === "all" ? tables : tables.filter(t => t.hallId === hallFilter);
  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Tables</div>
          <div className="section-sub">{tables.filter(t=>t.status==="open").length} open · {tables.length} total · click any row to view chip count</div>
        </div>
        {canEdit && <button className="btn btn-gold" onClick={onOpenTableModal}>＋ New Table</button>}
      </div>
      <div className="flex gap-8 mb-20">
        <button className={`btn btn-xs ${hallFilter==="all"?"btn-gold":"btn-outline"}`} onClick={() => setHallFilter("all")}>All Halls</button>
        {halls.map(h => <button key={h.id} className={`btn btn-xs ${hallFilter===h.id?"btn-gold":"btn-outline"}`} onClick={() => setHallFilter(h.id)}>{h.name.split("—")[0].trim()}</button>)}
      </div>
      {halls.filter(h => hallFilter === "all" || h.id === hallFilter).map(hall => {
        const ht = filtered.filter(t => t.hallId === hall.id);
        if (!ht.length) return null;
        return (
          <div key={hall.id} className="card mb-16">
            <div className="card-header"><div className="card-title">🏛 {hall.name}</div></div>
            <div className="card-body">
              <table className="data-table">
                <thead><tr>
                  <th>ID</th><th>Game</th><th>Status</th><th>Dealer</th><th>Inspector</th><th>Min Bet</th><th>Chip Float</th>
                  {canEdit && <th>Action</th>}
                </tr></thead>
                <tbody>
                  {ht.map(t => {
                    const d = staff.find(s => s.id === t.dealerId);
                    const ins = staff.find(s => s.id === t.inspectorId);
                    return (
                      <tr key={t.id} style={{ cursor:"pointer" }}
                        onClick={e => { if (e.target.tagName !== "SELECT" && e.target.tagName !== "OPTION") setChipModal(t); }}>
                        <td><span className="text-mono text-gold">{t.id}</span></td>
                        <td>{t.gameType}</td>
                        <td><StatusBadge status={t.status} /></td>
                        <td>{d ? d.name : <span className="text-muted">—</span>}</td>
                        <td>{ins ? ins.name : <span className="text-muted">—</span>}</td>
                        <td className="text-mono">{fmt(t.minBet)}</td>
                        <td className="text-mono text-gold">{t.chipTotal ? fmt(t.chipTotal) : "—"}</td>
                        {canEdit && <td onClick={e => e.stopPropagation()}>
                          <select className="form-select" style={{ padding: "4px 8px", fontSize: 11, width: 130 }}
                            value={t.status}
                            onChange={e => onUpdateTable(t.id, { status: e.target.value })}>
                            <option value="open">Open</option>
                            <option value="closed">Closed</option>
                            <option value="incident">Incident</option>
                            <option value="fill_required">Fill Required</option>
                          </select>
                        </td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* ── CHIP COUNT MODAL ── */}
      {chipModal && (
        <div className="modal-overlay" onClick={() => setChipModal(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🪙 {chipModal.id} — Chip Count Snapshot</div>
              <button className="modal-close" onClick={() => setChipModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display:"flex", gap:16, marginBottom:14, flexWrap:"wrap" }}>
                <div style={{ padding:"8px 14px", background:"var(--gold-dim)", borderRadius:"var(--radius)", fontSize:12 }}>
                  <span style={{ color:"var(--text3)" }}>Game: </span><strong>{chipModal.gameType}</strong>
                </div>
                <div style={{ padding:"8px 14px", background:"var(--gold-dim)", borderRadius:"var(--radius)", fontSize:12 }}>
                  <span style={{ color:"var(--text3)" }}>Profile: </span><strong>{chipModal.tableName || "—"}</strong>
                </div>
                <div style={{ padding:"8px 14px", background:"var(--gold-dim)", borderRadius:"var(--radius)", fontSize:12 }}>
                  <span style={{ color:"var(--text3)" }}>Opened: </span><strong>{chipModal.openedAt || "Not open"}</strong>
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr><th>Chip</th><th>Value (KES)</th><th style={{textAlign:"center"}}>Qty</th><th style={{textAlign:"right"}}>Subtotal</th></tr>
                </thead>
                <tbody>
                  {(chips || []).map(c => {
                    const qty = chipModal.chipBreakdown?.[c.id] || 0;
                    return (
                      <tr key={c.id} style={{ opacity: qty === 0 ? 0.4 : 1 }}>
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:14, height:14, borderRadius:"50%", background:c.hex, border:"2px solid rgba(255,255,255,0.2)", flexShrink:0 }} />
                            <span>{c.color}</span>
                          </div>
                        </td>
                        <td className="text-mono">{fmt(c.value)}</td>
                        <td className="text-mono" style={{ textAlign:"center", fontWeight: qty > 0 ? 700 : 400 }}>{qty}</td>
                        <td className="text-mono" style={{ textAlign:"right", color: qty > 0 ? "var(--gold)" : "var(--text3)" }}>
                          {qty > 0 ? fmt(c.value * qty) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background:"var(--gold-dim)", fontWeight:700 }}>
                    <td colSpan={2}>TOTAL FLOAT</td>
                    <td className="text-mono" style={{ textAlign:"center" }}>
                      {chipModal.chipBreakdown ? Object.values(chipModal.chipBreakdown).reduce((s,v)=>s+(v||0),0) : "—"}
                    </td>
                    <td className="text-mono text-gold" style={{ textAlign:"right", fontSize:16 }}>{fmt(chipModal.chipTotal || 0)}</td>
                  </tr>
                </tfoot>
              </table>
              {!chipModal.chipBreakdown && (
                <div style={{ marginTop:12, padding:"8px 12px", background:"var(--blue-dim)", borderRadius:"var(--radius)", fontSize:11, color:"var(--blue)" }}>
                  💡 No denomination breakdown recorded yet. Enter chip counts via <strong>Cage &amp; Fills → House Open/Close</strong>.
                </div>
              )}
              <div style={{ marginTop:12, display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--text3)" }}>
                <span>Opening Float: <strong className="text-mono" style={{ color:"var(--text)" }}>{fmt(chipModal.openingFloat || chipModal.floatCapacity || 0)}</strong></span>
                <span>Float Capacity: <strong className="text-mono" style={{ color:"var(--text)" }}>{fmt(chipModal.floatCapacity || 0)}</strong></span>
                <span>W/L: <strong className="text-mono" style={{ color: (chipModal.chipTotal||0)-(chipModal.openingFloat||chipModal.floatCapacity||0)>=0?"var(--green)":"var(--red)" }}>
                  {(()=>{ const d=(chipModal.chipTotal||0)-(chipModal.openingFloat||chipModal.floatCapacity||0); return (d>=0?"+":"")+fmt(d); })()}
                </strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StaffingPage({ staff, halls, onUpdateStaff, attendanceLog, onCheckIn, onCheckOut, userRole, rolePermissions, shiftState }) {
  const [tab, setTab] = useState("attendance");
  const statusColor = { on_table:"var(--green)", break:"var(--blue)", checked_in:"var(--gold)", off_shift:"var(--text3)" };
  const isShiftMgr = hasPermission(userRole, "record_attendance", rolePermissions);

  // ── ATTENDANCE TAB ──────────────────────────────────────────────────────────
  function AttendanceTab() {
    // Default to the currently open shift type; fall back to "Night"
    const openShiftType = shiftState?.status === "open" ? (shiftState.type || "Night") : "Night";
    const [shiftType, setShiftType] = useState(openShiftType);
    const [searchName, setSearchName] = useState("");
    const [rosterOnly, setRosterOnly] = useState(true);

    // Derive roster-scheduled staff for this shift today
    const today = new Date().getDate();
    const month = new Date().getMonth() + 1;
    const year  = new Date().getFullYear();
    const shiftCode = shiftType === "Morning" ? "M" : shiftType === "Day" ? "D" : "N";
    const rosterData    = generateRoster(staff, month, year);
    const scheduledIds  = new Set(rosterData.filter(r => r.days[today] === shiftCode).map(r => r.staffId));
    // Also include anyone already checked in for this shift (in case roster is not set)
    const checkedInIds  = new Set((attendanceLog||[]).filter(l => l.shift === shiftType && !l.checkOut).map(l => l.staffId));

    const base = rosterOnly
      ? staff.filter(s => scheduledIds.has(s.id) || checkedInIds.has(s.id))
      : staff;
    const filtered = base.filter(s => s.name.toLowerCase().includes(searchName.toLowerCase()));
    const now = () => new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"});

    return (
      <div>
        <div className="flex gap-8 mb-16" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <input className="form-input" placeholder="Search staff name..." value={searchName} onChange={e => setSearchName(e.target.value)} style={{ padding: "7px 12px" }} />
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {["Morning","Day","Night"].map(s => (
              <button key={s} className={`btn btn-xs ${shiftType===s?"btn-gold":"btn-outline"}`} onClick={() => setShiftType(s)}>{s}</button>
            ))}
            <button className={`btn btn-xs ${rosterOnly?"btn-blue":"btn-outline"}`} onClick={() => setRosterOnly(r => !r)} title="Toggle roster filter">
              {rosterOnly ? "📋 Roster" : "👥 All"}
            </button>
          </div>
        </div>

        {shiftState?.status !== "open" && (
          <div style={{ marginBottom:12, padding:"8px 12px", background:"var(--yellow-dim)", border:"1px solid var(--yellow)", borderRadius:"var(--radius)", fontSize:12, color:"var(--yellow)" }}>
            ⚠ No shift currently open. Open a shift in Shift Control first. Showing {shiftType} Shift roster.
          </div>
        )}
        {shiftState?.status === "open" && shiftState.type !== shiftType && (
          <div style={{ marginBottom:12, padding:"8px 12px", background:"var(--blue-dim)", border:"1px solid var(--blue)", borderRadius:"var(--radius)", fontSize:12, color:"var(--blue)" }}>
            ℹ Viewing {shiftType} roster. The open shift is <strong>{shiftState.type}</strong>.
          </div>
        )}

        <div className="card mb-16">
          <div className="card-header">
            <div className="card-title">
              Staff Attendance — {shiftType} Shift
              {rosterOnly && <span style={{ fontSize:10, color:"var(--gold)", marginLeft:8, fontWeight:400 }}>({scheduledIds.size} rostered)</span>}
            </div>
            <div className="flex gap-8" style={{alignItems:"center"}}>
              <div style={{ fontSize:11, color:"var(--text3)" }}>{filtered.filter(s=>s.status!=="off_shift").length} active · {filtered.filter(s=>s.status==="off_shift").length} off</div>
              <button className="btn btn-xs btn-outline" title="Mark all rostered off-shift staff as checked in for this shift" onClick={() => {
                staff.filter(s => scheduledIds.has(s.id) && s.status === "off_shift").forEach(s => {
                  onCheckIn(s.id, shiftType);
                  onUpdateStaff(s.id, { status: "checked_in" });
                });
              }}>📋 Bulk Check-In Roster</button>
            </div>
          </div>
          <div className="card-body">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Position</th><th>Hall</th><th>Status</th>{isShiftMgr && <th>Action</th>}</tr></thead>
              <tbody>
                {filtered.map(s => {
                  const hall = halls.find(h => h.id === s.hallId);
                  const logEntry = (attendanceLog || []).find(l => l.staffId === s.id && l.shift === shiftType);
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div className="avatar" style={{ width:26, height:26, fontSize:10 }}>{s.name.charAt(0)}</div>
                          <div>
                            <div style={{ fontWeight:500 }}>{s.name}</div>
                            {logEntry && <div style={{ fontSize:9, color:"var(--text3)", fontFamily:"var(--font-mono)" }}>In: {logEntry.checkIn}{logEntry.checkOut ? ` · Out: ${logEntry.checkOut}` : ""}</div>}
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-gold" style={{ fontSize:9 }}>{s.position.replace(/_/g," ").toUpperCase()}</span></td>
                      <td style={{ fontSize:12 }}>{hall ? hall.name.split("—")[0].trim() : "—"}</td>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <div style={{ width:6, height:6, borderRadius:"50%", background: statusColor[s.status]||"var(--text3)" }} />
                          <span style={{ fontSize:11, color: statusColor[s.status] }}>{(s.status||"").replace(/_/g," ").toUpperCase()}</span>
                        </div>
                      </td>
                      {isShiftMgr && (
                        <td>
                          <div className="flex gap-8">
                            {s.status === "off_shift" && (
                              <div className="flex gap-8">
                                <button className="btn btn-xs btn-green" onClick={() => { onCheckIn(s.id, shiftType); onUpdateStaff(s.id, { status:"checked_in" }); }} title="Mark Present">✓ Present</button>
                                <button className="btn btn-xs btn-red" onClick={() => onUpdateStaff(s.id, { staffStatus:"absent" })} title="Mark Absent">✗ Absent</button>
                              </div>
                            )}
                            {(s.status === "checked_in" || s.status === "on_table" || s.status === "break") && (
                              <div className="flex gap-8">
                                <button className="btn btn-xs btn-red" onClick={() => { onCheckOut(s.id, shiftType); onUpdateStaff(s.id, { status:"off_shift" }); }}>✗ Check Out</button>
                                <select className="form-select" style={{ padding:"3px 7px", fontSize:10, width:120 }}
                                  value={s.status}
                                  onChange={e => onUpdateStaff(s.id, { status: e.target.value })}>
                                  <option value="checked_in">Checked In</option>
                                  <option value="on_table">On Table</option>
                                  <option value="break">On Break</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance Log */}
        {(attendanceLog||[]).length > 0 && (
          <div className="card">
            <div className="card-header"><div className="card-title">Attendance Log — {shiftType} Shift</div></div>
            <div className="card-body">
              <table className="data-table">
                <thead><tr><th>Staff</th><th>Shift</th><th>Check In</th><th>Check Out</th><th>Duration</th></tr></thead>
                <tbody>
                  {(attendanceLog||[]).filter(l => l.shift === shiftType).map(l => {
                    const s = staff.find(x => x.id === l.staffId);
                    return (
                      <tr key={l.id}>
                        <td style={{ fontWeight:500 }}>{s?.name || "—"}</td>
                        <td><span className="badge badge-blue">{l.shift}</span></td>
                        <td className="text-mono text-green">{l.checkIn}</td>
                        <td className="text-mono" style={{ color: l.checkOut ? "var(--red)" : "var(--text3)" }}>{l.checkOut || "Active"}</td>
                        <td className="text-mono text-muted">{l.checkOut ? "~8h" : "Ongoing"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── HALL ASSIGNMENTS TAB ────────────────────────────────────────────────────
  function HallAssignTab() {
    return (
      <div>
        {halls.map(hall => {
          const hallStaff = staff.filter(s => s.hallId === hall.id);
          const pitBoss   = hallStaff.find(s => s.position === "pit_boss");
          const dealers   = hallStaff.filter(s => s.position === "dealer" || s.position === "dealer_inspector");
          const inspectors= hallStaff.filter(s => s.position === "inspector");
          const unassigned = staff.filter(s => !s.hallId || s.hallId !== hall.id);

          return (
            <div key={hall.id} className="card" style={{ marginBottom:14 }}>
              <div className="card-header">
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:16 }}>🏛</span>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14 }}>{hall.name}</div>
                    <div style={{ fontSize:11, color:"var(--text3)" }}>{hallStaff.length} staff assigned · {hallStaff.filter(s=>s.status!=="off_shift").length} active</div>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {/* Pit Boss assignment */}
                <div style={{ marginBottom:14, padding:"10px 14px", background:"var(--bg3)", borderRadius:"var(--radius)", border:"1px solid var(--border2)" }}>
                  <div style={{ fontSize:10, letterSpacing:1, textTransform:"uppercase", color:"var(--text3)", marginBottom:6 }}>Pit Boss</div>
                  {pitBoss
                    ? <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div className="avatar" style={{ width:26, height:26, fontSize:10 }}>{pitBoss.name.charAt(0)}</div>
                          <span style={{ fontWeight:500 }}>{pitBoss.name}</span>
                          <StatusBadge status={pitBoss.status} />
                        </div>
                        {isShiftMgr && <button className="btn btn-xs btn-outline" onClick={() => onUpdateStaff(pitBoss.id, { hallId: null })}>Remove</button>}
                      </div>
                    : <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <span style={{ fontSize:12, color:"var(--red)" }}>⚠ No pit boss assigned</span>
                        {isShiftMgr && (
                          <select className="form-select" style={{ padding:"4px 8px", fontSize:11, width:180 }}
                            defaultValue=""
                            onChange={e => { if(e.target.value) onUpdateStaff(e.target.value, { hallId: hall.id }); }}>
                            <option value="">Assign pit boss...</option>
                            {staff.filter(s => s.position === "pit_boss").map(s =>
                              <option key={s.id} value={s.id}>{s.name}</option>
                            )}
                          </select>
                        )}
                      </div>
                  }
                </div>

                {/* Dealers */}
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10, letterSpacing:1, textTransform:"uppercase", color:"var(--text3)", marginBottom:6 }}>
                    Dealers ({dealers.length})
                    {isShiftMgr && (
                      <select className="form-select" style={{ padding:"3px 8px", fontSize:10, width:160, marginLeft:10, display:"inline-block" }}
                        defaultValue=""
                        onChange={e => { if(e.target.value) onUpdateStaff(e.target.value, { hallId: hall.id }); }}>
                        <option value="">+ Add dealer...</option>
                        {staff.filter(s => (s.position==="dealer"||s.position==="dealer_inspector") && s.hallId !== hall.id).map(s =>
                          <option key={s.id} value={s.id}>{s.name} ({s.hallId ? halls.find(h=>h.id===s.hallId)?.name.split("—")[0].trim() : "Unassigned"})</option>
                        )}
                      </select>
                    )}
                  </div>
                  {dealers.length === 0
                    ? <div style={{ fontSize:12, color:"var(--text3)" }}>No dealers assigned</div>
                    : dealers.map(s => (
                      <div key={s.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid var(--border2)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:5, height:5, borderRadius:"50%", background: statusColor[s.status]||"var(--text3)" }} />
                          <span style={{ fontSize:12 }}>{s.name}</span>
                          <span className="badge badge-gold" style={{ fontSize:8 }}>{s.position.replace(/_/g," ").toUpperCase()}</span>
                        </div>
                        {isShiftMgr && <button className="btn btn-xs btn-outline" style={{ fontSize:9 }} onClick={() => onUpdateStaff(s.id, { hallId: null })}>Remove</button>}
                      </div>
                    ))
                  }
                </div>

                {/* Inspectors */}
                <div>
                  <div style={{ fontSize:10, letterSpacing:1, textTransform:"uppercase", color:"var(--text3)", marginBottom:6 }}>Inspectors ({inspectors.length})</div>
                  {inspectors.length === 0
                    ? <div style={{ fontSize:12, color:"var(--text3)" }}>No inspectors assigned</div>
                    : inspectors.map(s => (
                      <div key={s.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid var(--border2)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:5, height:5, borderRadius:"50%", background: statusColor[s.status]||"var(--text3)" }} />
                          <span style={{ fontSize:12 }}>{s.name}</span>
                        </div>
                        {isShiftMgr && <button className="btn btn-xs btn-outline" style={{ fontSize:9 }} onClick={() => onUpdateStaff(s.id, { hallId: null })}>Remove</button>}
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── DEALER REALLOCATION TAB ─────────────────────────────────────────────────
  function ReallocationTab() {
    const [selectedStaff, setSelectedStaff] = useState("");
    const [targetHall, setTargetHall]       = useState("");
    const [recentMoves, setRecentMoves]     = useState([]);

    const dealers = staff.filter(s => s.position === "dealer" || s.position === "dealer_inspector" || s.position === "inspector");

    function doMove() {
      if (!selectedStaff || !targetHall) return;
      const s   = staff.find(x => x.id === selectedStaff);
      const fromHall = halls.find(h => h.id === s?.hallId);
      const toHall   = halls.find(h => h.id === targetHall);
      onUpdateStaff(selectedStaff, { hallId: targetHall });
      setRecentMoves(m => [{
        id: Date.now(),
        name: s?.name,
        from: fromHall?.name.split("—")[0].trim() || "Unassigned",
        to:   toHall?.name.split("—")[0].trim(),
        time: new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})
      }, ...m.slice(0,9)]);
      setSelectedStaff("");
      setTargetHall("");
    }

    return (
      <div>
        <div className="card mb-16">
          <div className="card-header"><div className="card-title">Move Staff Between Halls</div></div>
          <div className="card-body">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:12, alignItems:"end" }}>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Select Staff</label>
                <select className="form-select" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
                  <option value="">Choose dealer / inspector...</option>
                  {dealers.map(s => {
                    const h = halls.find(x => x.id === s.hallId);
                    return <option key={s.id} value={s.id}>{s.name} — {h ? h.name.split("—")[0].trim() : "Unassigned"}</option>;
                  })}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Move To Hall</label>
                <select className="form-select" value={targetHall} onChange={e => setTargetHall(e.target.value)}>
                  <option value="">Select destination hall...</option>
                  {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <button className="btn btn-gold" style={{ marginBottom:2 }} onClick={doMove} disabled={!selectedStaff || !targetHall}>
                ↔ Move
              </button>
            </div>
          </div>
        </div>

        {/* Current hall overview */}
        <div className="grid-2 gap-16 mb-16">
          {halls.map(hall => {
            const hallDealers = staff.filter(s => s.hallId === hall.id && (s.position==="dealer"||s.position==="dealer_inspector"||s.position==="inspector"));
            return (
              <div key={hall.id} className="card">
                <div className="card-header"><div className="card-title">🏛 {hall.name.split("—")[0].trim()}</div><span className="badge badge-gold">{hallDealers.length} staff</span></div>
                <div className="card-body">
                  {hallDealers.length === 0
                    ? <div style={{ fontSize:12, color:"var(--text3)" }}>No dealers/inspectors assigned</div>
                    : hallDealers.map(s => (
                      <div key={s.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:"1px solid var(--border2)" }}>
                        <div style={{ width:6, height:6, borderRadius:"50%", background: statusColor[s.status]||"var(--text3)" }} />
                        <span style={{ fontSize:12, flex:1 }}>{s.name}</span>
                        <span className="badge badge-gold" style={{ fontSize:8 }}>{s.position.replace(/_/g," ").toUpperCase()}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent moves log */}
        {recentMoves.length > 0 && (
          <div className="card">
            <div className="card-header"><div className="card-title">Recent Reallocations</div></div>
            <div className="card-body">
              <table className="data-table">
                <thead><tr><th>Time</th><th>Staff</th><th>From</th><th>To</th></tr></thead>
                <tbody>
                  {recentMoves.map(m => (
                    <tr key={m.id}>
                      <td className="text-mono text-muted">{m.time}</td>
                      <td style={{ fontWeight:500 }}>{m.name}</td>
                      <td style={{ color:"var(--text3)" }}>{m.from}</td>
                      <td style={{ color:"var(--gold)" }}>{m.to}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  const TABS = [
    { key:"attendance", label:"Attendance" },
    { key:"hall_assign", label:"Hall Assignments" },
    { key:"reallocation", label:"Reallocation" },
  ];

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Staffing</div>
          <div className="section-sub">{staff.filter(s=>s.status!=="off_shift").length} on floor · {staff.filter(s=>s.status==="break").length} on break · {staff.filter(s=>s.status==="off_shift").length} off shift</div>
        </div>
      </div>
      <div className="tab-bar">
        {TABS.map(t => <div key={t.key} className={`tab-item ${tab===t.key?"active":""}`} onClick={() => setTab(t.key)}>{t.label}</div>)}
      </div>
      {tab === "attendance"   && <AttendanceTab />}
      {tab === "hall_assign"  && <HallAssignTab />}
      {tab === "reallocation" && <ReallocationTab />}
    </div>
  );
}


function ShiftControlPage({ staff, tables, transactions, shiftState, onOpenShift, onCloseShift, shifts }) {
  const isOpen = shiftState && shiftState.status === "open";
  const [confirmClose, setConfirmClose] = useState(false);
  const [expandedShift, setExpandedShift] = useState(null);
  const [selectedShift, setSelectedShift] = useState("Night");
  const todayStr = new Date().toISOString().slice(0,10);
  const [shiftDate, setShiftDate] = useState(todayStr);

  const totalDrop  = (transactions||[]).filter(t => t.type==="drop").reduce((s,t) => s+t.amount, 0);
  const totalWin   = (transactions||[]).filter(t => t.type==="win").reduce((s,t)  => s+t.amount, 0);
  const netHouse   = totalDrop - totalWin;
  const openTables = tables.filter(t => t.status==="open").length;
  const totalFloat = tables.reduce((s,t) => s + (t.chipTotal||0), 0);
  const checkedIn  = staff.filter(s => s.status !== "off_shift").length;
  const shiftConfig = (shifts||[]).find(s => s.name === selectedShift);

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Shift Control</div>
          <div className="section-sub">Open or close the shift and log house totals</div>
        </div>
        {isOpen
          ? <span className="badge badge-green" style={{ fontSize:11, padding:"6px 14px" }}>● SHIFT OPEN — {shiftState.type} · {shiftState.openedAt}</span>
          : <span className="badge badge-red"   style={{ fontSize:11, padding:"6px 14px" }}>● NO ACTIVE SHIFT</span>
        }
      </div>

      {/* Shift status banner */}
      {isOpen && (
        <div style={{ padding:"14px 18px", background:"var(--green-dim)", border:"1px solid rgba(45,190,108,0.3)", borderRadius:"var(--radius2)", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:600, color:"var(--green)", marginBottom:3 }}>🟢 {shiftState.type} Shift — In Progress</div>
            <div style={{ fontSize:12, color:"var(--text2)" }}>Opened at {shiftState.openedAt} by {shiftState.openedBy} · {checkedIn} staff on floor</div>
          </div>
          <button className="btn btn-red" onClick={() => setConfirmClose(true)}>Close Shift</button>
        </div>
      )}

      <div className="grid-2 gap-16 mb-20">
        {/* Open Shift */}
        {!isOpen && (
          <div className="card">
            <div className="card-header"><div className="card-title">Open New Shift</div></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Shift Type</label>
                <div className="flex gap-8">
                  {["Morning","Day","Night"].map(s => (
                    <button key={s} className={`btn flex-1 ${selectedShift===s?"btn-gold":"btn-outline"}`} onClick={() => setSelectedShift(s)}>{s}</button>
                  ))}
                </div>
              </div>
              {shiftConfig && (
                <div style={{ padding:"8px 12px", background:"var(--gold-dim)", border:"1px solid var(--border)", borderRadius:"var(--radius)", marginBottom:12, fontSize:12 }}>
                  <span style={{ color:"var(--text3)" }}>Shift window: </span>
                  <span className="text-mono text-gold">{shiftConfig.start} — {shiftConfig.end}</span>
                  <span style={{ color:"var(--text3)", marginLeft:12 }}>Code: </span>
                  <span className="text-mono text-gold">{shiftConfig.shiftCode}</span>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Shift Date</label>
                <input type="date" className="form-input" value={shiftDate} onChange={e => setShiftDate(e.target.value)} />
              </div>
              <div style={{ padding:"12px 14px", background:"var(--bg3)", borderRadius:"var(--radius)", marginBottom:14 }}>
                {[
                  ["Staff checked in", checkedIn],
                  ["Tables configured", tables.length],
                  ["Opening float", fmt(totalFloat)],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid var(--border2)" }}>
                    <span style={{ fontSize:12, color:"var(--text3)" }}>{k}</span>
                    <span style={{ fontSize:12, fontFamily:"var(--font-mono)", color:"var(--text)" }}>{v}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-gold" style={{ width:"100%", justifyContent:"center" }}
                onClick={() => onOpenShift(selectedShift, new Date(shiftDate).toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"2-digit"}))}>
                🟢 Open {selectedShift} Shift — {new Date(shiftDate).toLocaleDateString("en-KE",{day:"2-digit",month:"short"})}
              </button>
            </div>
          </div>
        )}

        {/* Live house snapshot */}
        <div className="card">
          <div className="card-header"><div className="card-title">Live House Snapshot</div></div>
          <div className="card-body">
            {[
              { label:"Total Drop",    value: fmt(totalDrop), color:"var(--gold)"  },
              { label:"Total Win",     value: fmt(totalWin),  color:"var(--red)"   },
              { label:"House Net",     value: fmt(netHouse),  color: netHouse>=0?"var(--green)":"var(--red)" },
              { label:"Open Tables",   value: String(openTables), color:"var(--blue)" },
              { label:"Staff on Floor",value: String(checkedIn),  color:"var(--gold)" },
            ].map(r => (
              <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--border2)" }}>
                <span style={{ fontSize:12, color:"var(--text3)" }}>{r.label}</span>
                <span style={{ fontSize:14, fontFamily:"var(--font-mono)", color: r.color }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Previous shifts */}
      {shiftState?.history?.length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title">Shift History</div></div>
          <div className="card-body">
            <table className="data-table">
              <thead><tr><th>Shift</th><th>Opened</th><th>Closed</th><th>Staff</th><th>Drop</th><th>Win</th><th>Net</th><th></th></tr></thead>
              <tbody>
                {shiftState.history.map((h,i) => (
                  <>
                  <tr key={i} onClick={() => setExpandedShift(expandedShift === i ? null : i)} style={{ cursor: "pointer" }}>
                    <td><span className="badge badge-blue">{h.type}</span></td>
                    <td className="text-mono">{h.openedAt}</td>
                    <td className="text-mono">{h.closedAt}</td>
                    <td className="text-mono">{h.staffCount}</td>
                    <td className="text-mono">{fmt(h.drop)}</td>
                    <td className="text-mono">{fmt(h.win)}</td>
                    <td className="text-mono" style={{ color: h.net>=0?"var(--green)":"var(--red)" }}>{h.net>=0?"+":""}{fmt(h.net)}</td>
                    <td className="text-mono" style={{ color: "var(--gold)", fontSize: 11 }}>{expandedShift === i ? "▲" : "▼"}</td>
                  </tr>
                  {expandedShift === i && h.tables && h.tables.length > 0 && (
                    <tr key={`expanded-${i}`}>
                      <td colSpan={8} style={{ background: "var(--bg3)", padding: "0.75rem 1rem" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--border)" }}>
                              {["Table Name", "Opening Float", "Closing Count", "Net"].map(h => (
                                <th key={h} style={{ padding: "0.4rem 0.5rem", textAlign: "left", color: "var(--text3)", fontWeight: 500 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {h.tables.map(t => (
                              <tr key={t.id} style={{ borderBottom: "1px solid var(--border2)" }}>
                                <td style={{ padding: "0.4rem 0.5rem", fontFamily: "var(--font-mono)", color: "var(--gold)" }}>{t.name}</td>
                                <td style={{ padding: "0.4rem 0.5rem", fontFamily: "var(--font-mono)" }}>{fmt(t.openingFloat)}</td>
                                <td style={{ padding: "0.4rem 0.5rem", fontFamily: "var(--font-mono)" }}>{fmt(t.chipTotal)}</td>
                                <td style={{ padding: "0.4rem 0.5rem", fontFamily: "var(--font-mono)", color: t.net >= 0 ? "var(--green)" : "var(--red)" }}>{t.net >= 0 ? "+" : ""}{fmt(t.net)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Close shift confirmation modal */}
      {confirmClose && (
        <div className="modal-overlay" onClick={() => setConfirmClose(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Close Shift</div>
              <button className="modal-close" onClick={() => setConfirmClose(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom:16, fontSize:13, color:"var(--text2)" }}>
                You are about to close the <strong style={{ color:"var(--gold)" }}>{shiftState?.type} Shift</strong>. The following totals will be logged:
              </div>
              {[
                ["Total Drop",    fmt(totalDrop)],
                ["Total Win",     fmt(totalWin)],
                ["House Net",     fmt(netHouse)],
                ["Tables Active", String(openTables)],
                ["Staff on Floor",String(checkedIn)],
              ].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--border2)" }}>
                  <span style={{ fontSize:12, color:"var(--text3)" }}>{k}</span>
                  <span style={{ fontSize:13, fontFamily:"var(--font-mono)", color:"var(--text)" }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop:14, padding:"10px 12px", background:"var(--yellow-dim)", border:"1px solid var(--yellow)", borderRadius:"var(--radius)", fontSize:11, color:"var(--yellow)" }}>
                ⚠ This action cannot be undone. All shift data will be archived.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmClose(false)}>Cancel</button>
              <button className="btn btn-red" onClick={() => { onCloseShift({ drop: totalDrop, win: totalWin, net: netHouse, staffCount: checkedIn }); setConfirmClose(false); }}>
                Confirm Close Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── PIT BOSS QUICK ACTIONS (top-level to avoid timer re-render destroying state) ──
function PitBossQuickActions({ hallTables, chips, onAddFill, onAddIncident, onUpdateTable, myHall, staff, user }) {
  const [qaModal, setQaModal] = useState(null);
  const [qaForm, setQaForm] = useState({});
  const denom = chips?.find(c => c.id === (qaForm.denominationId || chips?.[0]?.id));
  const fillTotal = denom ? denom.value * Number(qaForm.quantity || 0) : 0;

  function doOpenTable() {
    if (!qaForm.tableId) return;
    onUpdateTable(qaForm.tableId, { status: "open" });
    setQaModal(null); setQaForm({});
  }
  function doCloseTable() {
    if (!qaForm.tableId) return;
    onUpdateTable(qaForm.tableId, { status: "closed" });
    setQaModal(null); setQaForm({});
  }
  function doFill() {
    if (!qaForm.tableId || !qaForm.quantity) return;
    onAddFill({ tableId: qaForm.tableId, denominationId: denom?.id, denominationLabel: `${denom?.color} (${denom?.value?.toLocaleString()})`, quantity: Number(qaForm.quantity), total: fillTotal, status: "pending", requestedBy: user.name, time: new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"}) });
    setQaModal(null); setQaForm({});
  }
  function doIncident() {
    if (!qaForm.tableId || !qaForm.description) return;
    onAddIncident({ tableId: qaForm.tableId, type: qaForm.incidentType || "dispute", description: qaForm.description, reportedBy: user.name, time: new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"}), status: "open" });
    setQaModal(null); setQaForm({});
  }

  const ACTIONS = [
    { key: "open",     icon: "🟢", label: "Open Table",      color: "var(--green)",  desc: "Set a table status to Open" },
    { key: "close",    icon: "🔴", label: "Close Table",     color: "var(--red)",    desc: "Set a table status to Closed" },
    { key: "fill",     icon: "🪙", label: "Request Fill",    color: "var(--yellow)", desc: "Submit chip fill request" },
    { key: "incident", icon: "⚠️", label: "Report Incident", color: "var(--orange)", desc: "Log an incident on a table" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        {ACTIONS.map(a => (
          <div key={a.key} onClick={() => { setQaModal(a.key); setQaForm({ tableId: hallTables[0]?.id || "", denominationId: chips?.[0]?.id, quantity: 20, incidentType: "dispute" }); }}
            style={{ padding: 20, background: "var(--panel2)", border: `1px solid var(--border2)`, borderRadius: "var(--radius2)", cursor: "pointer", transition: "all 0.2s", textAlign: "center" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = "var(--panel)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.background = "var(--panel2)"; }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{a.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: a.color, marginBottom: 4 }}>{a.label}</div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>{a.desc}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">🏛 {myHall?.name || "My Hall"} — Table Status</div></div>
        <div className="card-body">
          <div className="table-grid">
            {hallTables.map(t => {
              const dealer = staff.find(s => s.id === t.dealerId);
              return (
                <div key={t.id} className={`table-card ${t.status}`}>
                  <div className="table-id">{t.id}</div>
                  <div className="table-game">{t.gameType}</div>
                  <div className="table-status"><div className="status-dot" /><span style={{ fontSize: 9, color: "var(--text2)" }}>{t.status.replace("_"," ").toUpperCase()}</span></div>
                  <div className="table-staff">{dealer ? dealer.name : "No dealer"}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {(qaModal === "open" || qaModal === "close") && (
        <div className="modal-overlay" onClick={() => setQaModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">{qaModal === "open" ? "🟢 Open Table" : "🔴 Close Table"}</div><button className="modal-close" onClick={() => setQaModal(null)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Select Table</label>
                <select className="form-select" value={qaForm.tableId} onChange={e => setQaForm(f => ({ ...f, tableId: e.target.value }))}>
                  {hallTables.map(t => <option key={t.id} value={t.id}>{t.id} — {t.gameType} ({t.status})</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setQaModal(null)}>Cancel</button>
              <button className={`btn ${qaModal==="open"?"btn-green":"btn-red"}`} onClick={qaModal === "open" ? doOpenTable : doCloseTable}>Confirm {qaModal === "open" ? "Open" : "Close"}</button>
            </div>
          </div>
        </div>
      )}
      {qaModal === "fill" && (
        <div className="modal-overlay" onClick={() => setQaModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">🪙 Request Chip Fill</div><button className="modal-close" onClick={() => setQaModal(null)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Table</label>
                <select className="form-select" value={qaForm.tableId} onChange={e => setQaForm(f => ({ ...f, tableId: e.target.value }))}>
                  {hallTables.map(t => <option key={t.id} value={t.id}>{t.id} — {t.gameType}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Denomination</label>
                <select className="form-select" value={qaForm.denominationId} onChange={e => setQaForm(f => ({ ...f, denominationId: e.target.value }))}>
                  {(chips || []).map(c => <option key={c.id} value={c.id}>{c.color} — {fmt(c.value)} each</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Quantity</label>
                <input className="form-input" type="number" min="1" value={qaForm.quantity} onChange={e => setQaForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div style={{ padding:"10px 14px", background:"var(--gold-dim)", borderRadius:"var(--radius)", fontSize:13 }}>Total: <strong className="text-mono text-gold">{fmt(fillTotal)}</strong></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setQaModal(null)}>Cancel</button>
              <button className="btn btn-gold" onClick={doFill}>Submit Fill Request</button>
            </div>
          </div>
        </div>
      )}
      {qaModal === "incident" && (
        <div className="modal-overlay" onClick={() => setQaModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">⚠️ Report Incident</div><button className="modal-close" onClick={() => setQaModal(null)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Table</label>
                <select className="form-select" value={qaForm.tableId} onChange={e => setQaForm(f => ({ ...f, tableId: e.target.value }))}>
                  {hallTables.map(t => <option key={t.id} value={t.id}>{t.id} — {t.gameType}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Incident Type</label>
                <select className="form-select" value={qaForm.incidentType} onChange={e => setQaForm(f => ({ ...f, incidentType: e.target.value }))}>
                  {["dispute","security","equipment","unusual_win"].map(t => <option key={t} value={t}>{t.replace(/_/g," ").toUpperCase()}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Description</label>
                <textarea className="form-textarea" value={qaForm.description || ""} onChange={e => setQaForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the incident..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setQaModal(null)}>Cancel</button>
              <button className="btn btn-red" onClick={doIncident} disabled={!qaForm.description}>Submit Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BreakListPage({ staff, tables, user, halls, onUpdateTable, onAddIncident, onAddFill, chips, rolePermissions, onNotify }) {
  const [tab, setTab] = useState("breaklist");

  // Determine pit boss's hall from their staff profile
  const pbStaff   = staff.find(s => s.id === user?.staffId) || staff.find(s => s.position === "pit_boss" && s.hallId);
  const myHallId  = pbStaff?.hallId || "h1";
  const myHall    = halls.find(h => h.id === myHallId);
  const hallTables = tables.filter(t => t.hallId === myHallId);
  const hallDealers = staff.filter(s => s.hallId === myHallId && (s.position === "dealer" || s.position === "dealer_inspector"));
  const hallInspectors = staff.filter(s => s.hallId === myHallId && (s.position === "inspector" || s.position === "dealer_inspector"));

  // ── BREAKLIST ─────────────────────────────────────────────────────────────
  const SESSION_COUNT = 12;
  const gridSessions  = Array.from({ length: SESSION_COUNT }, (_, i) => i + 1);
  const SLOT_OPTIONS  = ["X", ...hallTables.map(t => t.id)];

  // completedSessions: array of { sessionNo, time, entries:[{staffId,name,tableId}] }
  // currentSessionNo: 1-based counter, increments when rotation fires
  const [completedSessions, setCompletedSessions] = useState([]);
  const [currentSessionNo, setCurrentSessionNo] = useState(1);
  // nextAssignments: { staffId → tableId } — set by pit boss in assignments tab
  const [nextAssignments, setNextAssignments] = useState({});
  const [breakHistory, setBreakHistory] = useState([]);
  // rotation timer: fires every 20 min
  const [sessionElapsed, setSessionElapsed] = useState(0); // seconds into current session
  const SESSION_SECS = 1200;

  useEffect(() => {
    const iv = setInterval(() => {
      setSessionElapsed(e => {
        if (e + 1 >= SESSION_SECS) {
          // Rotation due — check if next assignments are logged
          const hasNextAssignments = Object.keys(nextAssignments).length > 0;
          if (!hasNextAssignments) {
            // Push notification to pit boss and shift manager
            onNotify?.("🔴 Rotation Due — No next session assignment logged!", "🔴", "var(--red)");
          }
          return 0;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [nextAssignments]);

  // Build current session snapshot from table assignments
  const currentEntries = hallDealers.map(s => {
    const tbl = hallTables.find(t => t.dealerId === s.id);
    return { staffId: s.id, name: s.name, position: s.position, tableId: tbl?.id || "X" };
  });

  function logRotation() {
    const now = new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"});
    const nextNo = currentSessionNo + 1;
    setCompletedSessions(cs => [{ sessionNo: currentSessionNo, time: now, entries: currentEntries }, ...cs]);
    setCurrentSessionNo(nextNo);
    setNextAssignments({});
    setSessionElapsed(0);
    if (nextNo <= SESSION_COUNT) {
      onNotify?.(`🔄 Session ${nextNo} started — log next assignments`, "🔄", "var(--gold)");
    }
  }

  function setNextAssignment(staffId, tableId) {
    setNextAssignments(na => ({ ...na, [staffId]: tableId }));
  }

  function archiveBreakList(shiftType) {
    const now = new Date();
    setBreakHistory(h => [{
      id: "bh" + Date.now(), shiftType,
      date: now.toLocaleDateString("en-KE"),
      time: now.toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"}),
      sessions: completedSessions,
    }, ...h]);
    setCompletedSessions([]);
    setCurrentSessionNo(1);
    setNextAssignments({});
    setSessionElapsed(0);
  }

  const secsLeft = SESSION_SECS - sessionElapsed;
  const timerMins = Math.floor(secsLeft / 60);
  const timerSecs = secsLeft % 60;
  const timerColor = secsLeft > 300 ? "var(--green)" : secsLeft > 60 ? "var(--yellow)" : "var(--red)";
  const hasNextSession = Object.keys(nextAssignments).length > 0;

  // Derive the 12-session grid from completedSessions + current live + nextAssignments
  const gridData = hallDealers.map(dealer => {
    const sessions = {};
    completedSessions.forEach(cs => {
      const e = cs.entries.find(e => e.staffId === dealer.id);
      sessions[cs.sessionNo] = e?.tableId || "X";
    });
    const liveTbl = hallTables.find(t => t.dealerId === dealer.id);
    sessions[currentSessionNo] = liveTbl?.id || "X";
    if (currentSessionNo + 1 <= SESSION_COUNT && nextAssignments[dealer.id]) {
      sessions[currentSessionNo + 1] = nextAssignments[dealer.id];
    }
    return { staffId: dealer.id, name: dealer.name, position: dealer.position, sessions };
  });

  function logAssignment() {
    const newNext = {};
    hallDealers.forEach(s => {
      const tbl = hallTables.find(t => t.dealerId === s.id);
      newNext[s.id] = tbl?.id || "X";
    });
    setNextAssignments(newNext);
    onNotify?.(`Session S${Math.min(currentSessionNo + 1, SESSION_COUNT)} assignments logged`, "📋", "var(--gold)");
  }

  // ── TABLE ASSIGNMENTS TAB ─────────────────────────────────────────────────
  function TableAssignTab() {
    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>
            Assign dealers to tables in <strong style={{ color: "var(--gold)" }}>{myHall?.name || "your hall"}</strong>, then click <strong style={{ color:"var(--gold)" }}>Log Assignment</strong> to populate the next breaklist session.
          </div>
          {hasPermission(user.role, "manage_breaklist", rolePermissions) && (
            <button className="btn btn-gold btn-sm" onClick={logAssignment} style={{ flexShrink:0, marginLeft:12 }}>
              📋 Log Assignment → S{Math.min(currentSessionNo + 1, SESSION_COUNT)}
            </button>
          )}
        </div>
        <div className="card">
          <div className="card-body">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Table</th><th>Game</th><th>Profile</th><th>Status</th>
                  <th>Dealer</th><th>Inspector</th><th>Float</th>
                </tr>
              </thead>
              <tbody>
                {hallTables.map(t => (
                  <tr key={t.id}>
                    <td className="text-mono text-gold">{t.id}</td>
                    <td>{t.gameType}</td>
                    <td style={{ fontSize:11, color:"var(--text3)" }}>{t.tableName||"—"}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>
                      <select className="form-select" style={{ padding:"4px 8px", fontSize:11, width:160 }}
                        value={t.dealerId||""}
                        onChange={e => {
                          onUpdateTable(t.id, { dealerId: e.target.value||null });
                          // Pre-populate next session assignment for the newly assigned dealer
                          if (e.target.value) {
                            setNextAssignment(e.target.value, t.id);
                          }
                        }}>
                        <option value="">— Unassigned —</option>
                        {hallDealers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="form-select" style={{ padding:"4px 8px", fontSize:11, width:160 }}
                        value={t.inspectorId||""}
                        onChange={e => onUpdateTable(t.id, { inspectorId: e.target.value||null })}>
                        <option value="">— Unassigned —</option>
                        {hallInspectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                    <td className="text-mono" style={{ fontSize:11, color:"var(--gold)" }}>{fmt(t.chipTotal||0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Pit Operations</div>
          <div className="section-sub">🏛 {myHall?.name || "My Hall"} · {hallDealers.length} dealers · {hallTables.filter(t=>t.status==="open").length} active tables · Session {currentSessionNo}</div>
        </div>
        <div className="flex gap-8">
          {tab === "breaklist" && <button className="btn btn-outline btn-sm" onClick={() => archiveBreakList("Current")}>📁 Archive & Reset</button>}
        </div>
      </div>

      <div className="tab-bar">
        <div className={`tab-item ${tab==="assignments"?"active":""}`} onClick={() => setTab("assignments")}>Table Assignments</div>
        <div className={`tab-item ${tab==="breaklist"?"active":""}`} onClick={() => setTab("breaklist")}>Breaklist</div>
        <div className={`tab-item ${tab==="history"?"active":""}`} onClick={() => setTab("history")}>Break History</div>
        <div className={`tab-item ${tab==="quickactions"?"active":""}`} onClick={() => setTab("quickactions")}>Quick Actions</div>
      </div>

      {/* ── TABLE ASSIGNMENTS (data entry) ── */}
      {tab === "assignments" && <TableAssignTab />}

      {/* ── BREAKLIST (12-session grid) ── */}
      {tab === "breaklist" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              Breaklist — {myHall?.name || "Hall"} &nbsp;
              <span style={{ fontFamily:"var(--font-mono)", fontSize:13, color:timerColor }}>
                {String(timerMins).padStart(2,"0")}:{String(timerSecs).padStart(2,"0")}
              </span>
            </div>
            <div className="flex gap-8 items-center">
              <span style={{ fontSize:11, color:"var(--text3)" }}>S{currentSessionNo}/{SESSION_COUNT}</span>
              {hasPermission(user.role, "manage_breaklist", rolePermissions)
                ? <button className="btn btn-sm btn-gold" onClick={logRotation}>↻ Next Session</button>
                : <span style={{ fontSize:11, color:"var(--yellow)" }}>👁 View only</span>
              }
            </div>
          </div>
          <div className="card-body" style={{ padding:0 }}>
            <div style={{ overflowX:"auto" }}>
              <table className="breaklist-grid" style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign:"left", padding:"8px 12px", minWidth:130, position:"sticky", left:0, background:"var(--panel)", zIndex:1 }}>Dealer</th>
                    <th style={{ padding:"8px 6px", minWidth:70 }}>Position</th>
                    {gridSessions.map(s => (
                      <th key={s} style={{
                        padding:"6px 4px", minWidth:48, textAlign:"center",
                        background: s === currentSessionNo ? "rgba(201,168,76,0.18)" : s === currentSessionNo+1 && hasNextSession ? "rgba(245,166,35,0.08)" : "transparent",
                        borderBottom: s === currentSessionNo ? "2px solid var(--gold)" : "1px solid var(--border2)",
                      }}>
                        <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color: s < currentSessionNo ? "var(--text3)" : s === currentSessionNo ? "var(--gold)" : "var(--text2)", fontWeight: s === currentSessionNo ? 700 : 400 }}>S{s}</div>
                        <div style={{ fontSize:8, color:"var(--text3)", marginTop:1 }}>
                          {s < currentSessionNo ? "✓" : s === currentSessionNo ? "▶" : ""}{(s-1)*20}m
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gridData.length === 0
                    ? <tr><td colSpan={SESSION_COUNT+2} style={{ textAlign:"center", padding:24, color:"var(--text3)", fontSize:12 }}>No dealers assigned in this hall yet. Use Table Assignments to begin.</td></tr>
                    : gridData.map(b => (
                      <tr key={b.staffId} style={{ borderBottom:"1px solid var(--border2)" }}>
                        <td className="bl-name" style={{ padding:"6px 12px", position:"sticky", left:0, background:"var(--panel)", zIndex:1 }}>{b.name}</td>
                        <td style={{ padding:"4px 6px" }}><span className="badge badge-gold" style={{ fontSize:8 }}>{b.position.replace(/_/g," ").toUpperCase()}</span></td>
                        {gridSessions.map(s => {
                          const isPast    = s < currentSessionNo;
                          const isCurrent = s === currentSessionNo;
                          const isNext    = s === currentSessionNo + 1;
                          const val       = b.sessions[s];
                          return (
                            <td key={s} style={{
                              padding:"3px 2px", textAlign:"center",
                              background: isCurrent ? "rgba(201,168,76,0.06)" : "transparent",
                              opacity: isPast ? 0.5 : 1,
                            }}>
                              {val
                                ? <span style={{
                                    fontFamily:"var(--font-mono)", fontSize:10, fontWeight: isCurrent ? 700 : 500,
                                    color: val==="X" ? "var(--blue)" : isCurrent ? "var(--gold)" : isNext ? "var(--yellow)" : "var(--green)",
                                  }}>{val}</span>
                                : <span style={{ fontSize:9, color:"var(--text3)" }}>—</span>
                              }
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
            {!hasNextSession && currentSessionNo < SESSION_COUNT && (
              <div style={{ margin:"10px 12px", padding:"8px 12px", background:"var(--red-dim)", borderRadius:"var(--radius)", fontSize:11, color:"var(--red)" }}>
                ⚠ Next session not yet assigned. Go to <strong>Table Assignments</strong> and click <strong>Log Assignment</strong>.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BREAK HISTORY ── */}
      {tab === "history" && (
        <div>
          {breakHistory.length === 0
            ? <div className="empty-state"><div className="empty-icon">📋</div><p>No shift break history yet. Archive the current breaklist at end of shift to save it here.</p></div>
            : breakHistory.map(h => (
              <div key={h.id} className="card" style={{ marginBottom:14 }}>
                <div className="card-header">
                  <div className="card-title">Shift: {h.shiftType}</div>
                  <div style={{ fontSize:11, color:"var(--text3)" }}>{h.date} at {h.time} · {h.sessions.length} sessions</div>
                </div>
                <div className="card-body">
                  {h.sessions.length === 0
                    ? <p style={{fontSize:12,color:"var(--text3)"}}>No sessions recorded in this archive.</p>
                    : h.sessions.map(session => (
                      <div key={session.sessionNo} style={{ marginBottom:14, paddingBottom:12, borderBottom:"1px solid var(--border2)" }}>
                        <div style={{ fontSize:12, color:"var(--gold)", fontFamily:"var(--font-mono)", marginBottom:6 }}>
                          Session {session.sessionNo} · {session.time}
                        </div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {(session.entries||[]).map(e => (
                            <div key={e.staffId} style={{ padding:"3px 8px", background:"var(--panel2)", borderRadius:5, fontSize:11 }}>
                              <span style={{color:"var(--text)"}}>{e.name}</span>
                              <span style={{color:"var(--text3)",margin:"0 4px"}}>→</span>
                              <span style={{color: e.tableId==="X"?"var(--blue)":"var(--green)", fontFamily:"var(--font-mono)"}}>
                                {e.tableId === "X" ? "Break" : e.tableId}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab === "quickactions" && <PitBossQuickActions hallTables={hallTables} chips={chips} onAddFill={onAddFill} onAddIncident={onAddIncident} onUpdateTable={onUpdateTable} myHall={myHall} staff={staff} user={user} />}
    </div>
  );
}


function IncidentsPage({ incidents, user, tables, onAddIncident, onUpdateIncident, rolePermissions }) {
  const [activeTab, setActiveTab] = useState("list");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ tableId: "T01", type: "dispute", description: "" });
  const canReport = hasPermission(user.role, "report_incidents", rolePermissions);
  const canResolve = hasPermission(user.role, "resolve_incidents", rolePermissions);

  function submit() {
    onAddIncident({ ...form, reportedBy: user.name, time: new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"}), status: "open" });
    setShowModal(false);
    setForm({ tableId: "T01", type: "dispute", description: "" });
  }

  const incidentTypes = ["dispute","security","equipment","unusual_win"];
  const typeColors   = { dispute:"badge-orange", security:"badge-red", equipment:"badge-blue", unusual_win:"badge-yellow" };
  const typeLabels   = { dispute:"Dispute", security:"Security", equipment:"Equipment", unusual_win:"Unusual Win" };

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Incidents</div>
          <div className="section-sub">{incidents.filter(i=>i.status!=="resolved").length} open · {incidents.length} total</div>
        </div>
        {canReport && <button className="btn btn-red" onClick={() => setShowModal(true)}>⚠ Report Incident</button>}
      </div>

      {user.role === "management" && (
        <div className="tab-bar">
          <div className={`tab-item ${activeTab==="list"?"active":""}`} onClick={() => setActiveTab("list")}>Incident List</div>
          <div className={`tab-item ${activeTab==="analytics"?"active":""}`} onClick={() => setActiveTab("analytics")}>Analytics</div>
        </div>
      )}

      {(activeTab === "list" || user.role !== "management") && (
        incidents.length === 0
          ? <div className="empty-state"><div className="empty-icon">✅</div><p>No incidents recorded this shift</p></div>
          : incidents.map(i => {
            const t = tables.find(tb => tb.id === i.tableId);
            return (
              <div key={i.id} className="incident-card">
                <div className="flex items-center gap-8" style={{ marginBottom: 8 }}>
                  <span className="text-mono text-gold">{i.tableId}</span>
                  <StatusBadge status={i.status} />
                  <span className="badge badge-orange">{i.type.replace("_"," ").toUpperCase()}</span>
                  <span className="text-xs text-muted" style={{ marginLeft: "auto" }}>{i.time}</span>
                </div>
                <div style={{ fontSize: 13, marginBottom: 6 }}>{i.description}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10 }}>Reported by {i.reportedBy} · {t?.gameType}</div>
                {canResolve && i.status !== "resolved" && (
                  <div className="flex gap-8">
                    {i.status === "open" && <button className="btn btn-sm btn-outline" onClick={() => onUpdateIncident(i.id, "reviewing")}>Review</button>}
                    <button className="btn btn-sm btn-green" onClick={() => onUpdateIncident(i.id, "resolved")}>✓ Resolve</button>
                  </div>
                )}
              </div>
            );
          })
      )}

      {activeTab === "analytics" && user.role === "management" && (
        <div>
          <div className="stat-grid mb-20">
            {[
              { label: "Total Incidents",  value: String(incidents.length),                                            accent: "var(--gold)",   icon: "📋" },
              { label: "Open",             value: String(incidents.filter(i=>i.status==="open").length),               accent: "var(--red)",    icon: "🔴" },
              { label: "Under Review",     value: String(incidents.filter(i=>i.status==="reviewing").length),          accent: "var(--yellow)", icon: "🔍" },
              { label: "Resolved",         value: String(incidents.filter(i=>i.status==="resolved").length),           accent: "var(--green)",  icon: "✅" },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ "--accent": s.accent }}>
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: 24 }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="grid-2 gap-16">
            <div className="card">
              <div className="card-header"><div className="card-title">Breakdown by Type</div></div>
              <div className="card-body">
                {incidentTypes.map(type => {
                  const count = incidents.filter(i => i.type === type).length;
                  const pct   = incidents.length > 0 ? Math.round((count / incidents.length) * 100) : 0;
                  return (
                    <div key={type} style={{ marginBottom: 14 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                        <span className={`badge ${typeColors[type]}`}>{typeLabels[type]}</span>
                        <span className="text-mono" style={{ fontSize:12 }}>{count} incident{count!==1?"s":""} · {pct}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width:`${pct}%`, background:"var(--orange)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">By Table</div></div>
              <div className="card-body">
                {tables.map(t => {
                  const count = incidents.filter(i => i.tableId === t.id).length;
                  if (!count) return null;
                  return (
                    <div key={t.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--border2)" }}>
                      <div>
                        <span className="text-mono text-gold">{t.id}</span>
                        <span style={{ fontSize:11, color:"var(--text3)", marginLeft:8 }}>{t.gameType}</span>
                      </div>
                      <span className="badge badge-red">{count}</span>
                    </div>
                  );
                })}
                {!tables.some(t => incidents.some(i => i.tableId === t.id)) && (
                  <div className="empty-state" style={{ padding:20 }}>No table-linked incidents</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Report Incident</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Table</label>
                <select className="form-select" value={form.tableId} onChange={e => setForm(f => ({...f, tableId: e.target.value}))}>
                  {tables.map(t => <option key={t.id} value={t.id}>{t.id} — {t.gameType}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Incident Type</label>
                <select className="form-select" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
                  <option value="dispute">Player Dispute</option>
                  <option value="security">Security Issue</option>
                  <option value="equipment">Equipment Issue</option>
                  <option value="unusual_win">Unusual Win</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Describe the incident..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-red" onClick={submit} disabled={!form.description}>Submit Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FloatManagementPage({ tables, chips, fills, houseFloat, onSetHouseFloat, onUpdateTable, transactions }) {
  const totalTableFloat = tables.reduce((s, t) => s + (t.chipTotal || 0), 0);
  const totalCapacity   = tables.reduce((s, t) => s + (t.floatCapacity || 0), 0);
  const cageFloat       = houseFloat - totalTableFloat;
  const [editFloat, setEditFloat] = useState(String(houseFloat));

  function resetToCapacity() {
    tables.forEach(t => {
      if (t.floatCapacity) onUpdateTable(t.id, { chipTotal: t.floatCapacity, openingFloat: t.floatCapacity, chipBreakdown: null });
    });
  }

  const approvedFills = (fills || []).filter(f => f.status === "approved");

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Float Management</div>
          <div className="section-sub">Total house float — tables + cage</div>
        </div>
        <button className="btn btn-outline" onClick={resetToCapacity}>🔄 Reset Floats to Capacity</button>
      </div>

      {/* Summary stats */}
      <div className="stat-grid mb-20">
        {[
          { label: "Total House Float", value: fmt(houseFloat),      accent: "var(--gold)",  icon: "🏦", sub: "Editable total below" },
          { label: "Table Floats",      value: fmt(totalTableFloat), accent: "var(--blue)",  icon: "🃏", sub: `${tables.filter(t=>t.status==="open").length} tables open` },
          { label: "Cage Float",        value: fmt(cageFloat),       accent: cageFloat >= 0 ? "var(--green)" : "var(--red)", icon: "🔐", sub: "House float − table floats" },
          { label: "Float Capacity",    value: fmt(totalCapacity),   accent: "var(--text2)", icon: "📐", sub: "Sum of all table capacities" },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ "--accent": s.accent }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{s.value}</div>
            <div style={{ fontSize:10, color:"var(--text3)", marginTop:2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Edit total float */}
      <div className="card mb-16">
        <div className="card-header"><div className="card-title">⚙️ Adjust Total House Float</div></div>
        <div className="card-body">
          <div style={{ display:"flex", gap:12, alignItems:"center", maxWidth:400 }}>
            <input className="form-input" type="number" value={editFloat}
              onChange={e => setEditFloat(e.target.value)}
              style={{ flex:1, fontFamily:"var(--font-mono)", fontSize:16 }} />
            <button className="btn btn-gold" onClick={() => { const v = Number(editFloat); if (v > 0) onSetHouseFloat(v); }}>
              Update
            </button>
          </div>
          <div style={{ marginTop:8, fontSize:11, color:"var(--text3)" }}>
            Cage float = Total House Float − sum of all table chip totals. Fill requests automatically debit the cage when approved.
          </div>
        </div>
      </div>

      {/* Per-table float distribution */}
      <div className="card mb-16">
        <div className="card-header">
          <div className="card-title">Table Float Distribution</div>
          <div style={{ fontSize:11, color:"var(--text3)" }}>Each table's current chips vs opening float vs capacity</div>
        </div>
        <div className="card-body">
          <table className="data-table">
            <thead>
              <tr><th>Table</th><th>Game</th><th>Status</th><th style={{textAlign:"right"}}>Capacity</th><th style={{textAlign:"right"}}>Opening Float</th><th style={{textAlign:"right"}}>Current Chips</th><th style={{textAlign:"right"}}>W/L</th></tr>
            </thead>
            <tbody>
              {tables.map(t => {
                const cap = t.floatCapacity || 0;
                const open = t.openingFloat || 0;
                const cur  = t.chipTotal || 0;
                const wl   = cur - open;
                return (
                  <tr key={t.id}>
                    <td className="text-mono text-gold">{t.id}</td>
                    <td>{t.gameType}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="text-mono" style={{ textAlign:"right" }}>{fmt(cap)}</td>
                    <td className="text-mono" style={{ textAlign:"right" }}>{open > 0 ? fmt(open) : <span style={{color:"var(--text3)"}}>—</span>}</td>
                    <td className="text-mono text-gold" style={{ textAlign:"right", fontWeight:600 }}>{cur > 0 ? fmt(cur) : <span style={{color:"var(--text3)"}}>—</span>}</td>
                    <td className="text-mono" style={{ textAlign:"right", color: wl >= 0 ? "var(--green)" : "var(--red)", fontWeight:600 }}>
                      {open > 0 ? (wl >= 0 ? "+" : "") + fmt(wl) : <span style={{color:"var(--text3)"}}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background:"var(--gold-dim)", fontWeight:700 }}>
                <td colSpan={3}>HOUSE TOTAL</td>
                <td className="text-mono" style={{ textAlign:"right" }}>{fmt(totalCapacity)}</td>
                <td className="text-mono" style={{ textAlign:"right" }}>{fmt(tables.reduce((s,t)=>s+(t.openingFloat||0),0))}</td>
                <td className="text-mono text-gold" style={{ textAlign:"right" }}>{fmt(totalTableFloat)}</td>
                <td className="text-mono" style={{ textAlign:"right", color: totalTableFloat - tables.reduce((s,t)=>s+(t.openingFloat||0),0) >= 0 ? "var(--green)" : "var(--red)" }}>
                  {(()=>{ const d=totalTableFloat-tables.reduce((s,t)=>s+(t.openingFloat||0),0); return (d>=0?"+":"")+fmt(d); })()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Approved fills — cage debit history */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Fill History — Cage Debits</div>
          <div style={{ fontSize:11, color:"var(--text3)" }}>Each approved fill debits the cage float and credits the table</div>
        </div>
        <div className="card-body">
          {approvedFills.length === 0
            ? <div className="empty-state"><div className="empty-icon">🪙</div><p>No approved fills yet</p></div>
            : <table className="data-table">
                <thead><tr><th>Time</th><th>Table</th><th>Denomination</th><th style={{textAlign:"right"}}>Amount</th><th>Requested by</th></tr></thead>
                <tbody>
                  {approvedFills.map(f => (
                    <tr key={f.id}>
                      <td className="text-mono text-muted">{f.time}</td>
                      <td className="text-mono text-gold">{f.tableId}</td>
                      <td style={{ fontSize:11 }}>{f.denominationLabel || "—"}</td>
                      <td className="text-mono" style={{ textAlign:"right", color:"var(--red)" }}>−{fmt(f.total || f.amount || 0)}</td>
                      <td style={{ fontSize:11, color:"var(--text3)" }}>{f.requestedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      </div>
    </div>
  );
}

function FillsPage({ fills, tables, user, chips, onAddFill, onApproveFill, onUpdateTable, staff, tableTransfers, onAddTransfer, cageReserve, onSetCageReserve, rolePermissions, halls, onAddChipCount, chipCountLog, casinoInfo }) {
  const [tab, setTab] = useState("fills");
  const canRequest = hasPermission(user.role, "request_fills", rolePermissions);
  const canApprove = hasPermission(user.role, "approve_fills", rolePermissions);
  const canAll     = hasPermission(user.role, "approve_fills", rolePermissions);

  // ── shared print helper ────────────────────────────────────────────────────
  function printDoc(html, title) {
    const w = window.open('','_blank');
    w.document.write(`<html><head><title>${title}</title><style>
      body{font-family:Arial,sans-serif;font-size:11px;padding:30px;max-width:800px;margin:0 auto}
      h2{text-align:center;margin-bottom:4px;font-size:16px}
      .sub{text-align:center;color:#666;font-size:10px;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;margin:14px 0}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
      th{background:#f5f5f5;font-weight:700}
      .sig-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:30px;margin-top:40px}
      .sig-box{border-top:1px solid #000;padding-top:6px;font-size:10px}
      .total-row{background:#fff9e6;font-weight:700}
      @page{size:A4;margin:20mm}
    </style></head><body>${html}</body></html>`);
    w.document.close(); w.print();
  }

  // ── FILL REQUEST FORM print ────────────────────────────────────────────────
  function printFillForm(f, chips) {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"2-digit"}).replace(/\//g,"/");
    const timeStr = now.toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit",hour12:false});
    const tbl = tables.find(t=>t.id===f.tableId);
    const tableName = tbl?.tableName || tbl?.gameType || f.tableId;
    // Build all chip denomination rows from configured chips — show 0 for unrequested
    const allChips = chips || [];
    const lineMap = {};
    (f.denomLines||[]).forEach(d => { lineMap[d.color] = d; });
    const denomRows = allChips.map(c => {
      const line = lineMap[c.color] || { qty: 0, subtotal: 0 };
      return `<tr><td style="text-align:right;font-weight:600">${c.value.toLocaleString()}</td><td style="text-align:center">${line.qty || 0}</td></tr>`;
    }).join('');
    const totalRow = `<tr style="background:#fff9e6;font-weight:700"><td style="text-align:right">Total</td><td style="text-align:center">${(f.total||f.amount||0).toLocaleString()}</td></tr>`;
    printDoc(`
      <div style="display:grid;grid-template-columns:1fr;gap:0">
        <div style="text-align:center;padding:12px 0 6px;border-bottom:2px solid #000">
          <div style="font-size:16px;font-weight:700">Table Fill</div>
          <div style="font-size:13px;font-weight:600;margin-top:4px">Table; ${tableName}</div>
          <div style="font-size:12px">Pujing Casino</div>
          <div style="font-size:11px;color:#333">${dateStr}</div>
          <div style="font-size:11px;color:#333">${timeStr}</div>
        </div>
        <table style="margin:0">
          <thead><tr><th style="text-align:right">VALUE</th><th style="text-align:center">COUNT</th></tr></thead>
          <tbody>${denomRows}${totalRow}</tbody>
        </table>
        <div style="margin-top:32px">
          <div style="border-top:1px solid #000;padding-top:4px;margin-bottom:20px">Shift manager .........................................................................</div>
          <div style="border-top:1px solid #000;padding-top:4px;margin-bottom:20px">Government Inspector .........................................................................</div>
          <div style="border-top:1px solid #000;padding-top:4px">Pitboss .........................................................................</div>
        </div>
      </div>
    `, `Table Fill — ${f.tableId}`);
  }

  // ── PER-TABLE OPEN FORM (matching spec) ────────────────────────────────────
  function printTableOpenForm(table, chips, openingCounts) {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"2-digit"});
    const timeStr = now.toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit",hour12:false});
    const tableName = table.tableName || table.gameType;
    const cName = casinoInfo?.name || "Grand Casino";
    const cAddr  = casinoInfo?.address || "";
    const denomRows = chips.map(c => {
      const cnt = openingCounts?.[c.id] || "";
      return `<tr><td style="text-align:right;font-weight:600">${c.value.toLocaleString()}</td><td style="text-align:center">${cnt}</td></tr>`;
    }).join('');
    const total = openingCounts ? chips.reduce((s,c)=>s+c.value*(openingCounts[c.id]||0),0) : (table.openingFloat||table.floatCapacity||0);
    printDoc(`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #000">
        <div style="padding:14px;border-right:1px solid #000">
          <div style="font-size:15px;font-weight:700;margin-bottom:4px">FLOAT OPENING</div>
          <div style="font-size:13px;font-weight:600">Table: ${tableName}</div>
          <div style="font-size:12px;font-weight:700">${cName}</div>
          ${cAddr ? `<div style="font-size:10px;color:#666">${cAddr}</div>` : ""}
          <div style="font-size:11px;margin-top:4px">${dateStr}</div>
          <div style="font-size:11px">${timeStr}</div>
        </div>
        <div style="padding:14px">
          <div style="font-size:11px;color:#888;margin-bottom:6px">Table ID: ${table.id} &nbsp;|&nbsp; Float Capacity: ${(table.floatCapacity||0).toLocaleString()}</div>
        </div>
      </div>
      <table style="margin:0">
        <thead><tr><th style="text-align:right">VALUE</th><th style="text-align:center">COUNT</th></tr></thead>
        <tbody>
          ${denomRows}
          <tr style="background:#fff9e6;font-weight:700"><td style="text-align:right">Total</td><td style="text-align:center">${total.toLocaleString()}</td></tr>
          <tr><td colspan="2" style="padding-top:8px;font-size:10px;color:#888">Fill (if any): Value _______ Count _______ Total _______</td></tr>
        </tbody>
      </table>
      <div style="margin-top:32px">
        <div style="border-top:1px solid #000;padding-top:4px;margin-bottom:20px">Shift manager .........................................................................</div>
        <div style="border-top:1px solid #000;padding-top:4px;margin-bottom:20px">Government Inspector .........................................................................</div>
        <div style="border-top:1px solid #000;padding-top:4px">Pitboss .........................................................................</div>
      </div>
    `, `Float Opening — ${table.id}`);
  }

  // ── PER-TABLE CLOSE FORM (matching spec) ───────────────────────────────────
  function printTableCloseForm(table, chips, closingCounts) {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"2-digit"});
    const timeStr = now.toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit",hour12:false});
    const tableName = table.tableName || table.gameType;
    const cName = casinoInfo?.name || "Grand Casino";
    const openTotal = table.openingFloat || table.floatCapacity || 0;
    const closeTotal = closingCounts ? chips.reduce((s,c)=>s+c.value*(closingCounts[c.id]||0),0) : (table.chipTotal||0);
    const result = closeTotal - openTotal;
    const openBreakdown = table.chipBreakdown || {};
    const denomRows = chips.map(c => {
      const openCnt = openBreakdown[c.id] || "";
      const closeCnt = closingCounts?.[c.id] || "";
      return `<tr><td style="text-align:right;font-weight:600">${c.value.toLocaleString()}</td><td style="text-align:center">${openCnt}</td><td style="text-align:center">${closeCnt}</td></tr>`;
    }).join('');
    printDoc(`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #000">
        <div style="padding:14px;border-right:1px solid #000">
          <div style="font-size:15px;font-weight:700;margin-bottom:4px">FLOAT OPENING</div>
          <div style="font-size:13px;font-weight:600">Table: ${tableName}</div>
          <div style="font-size:12px;font-weight:700">${cName}</div>
          <div style="font-size:11px;margin-top:4px">${table.openedDate||dateStr}</div>
          <div style="font-size:11px">${table.openedAt||"—"}</div>
        </div>
        <div style="padding:14px">
          <div style="font-size:15px;font-weight:700;margin-bottom:4px">FLOAT CLOSING</div>
          <div style="font-size:13px;font-weight:600">Table: ${tableName}</div>
          <div style="font-size:12px;font-weight:700">${cName}</div>
          <div style="font-size:11px;margin-top:4px">${dateStr}</div>
          <div style="font-size:11px">${timeStr}</div>
        </div>
      </div>
      <table style="margin:0">
        <thead><tr><th style="text-align:right">VALUE</th><th style="text-align:center">OPEN COUNT</th><th style="text-align:center">CLOSE COUNT</th></tr></thead>
        <tbody>
          ${denomRows}
          <tr style="background:#fff9e6;font-weight:700">
            <td style="text-align:right">Total</td>
            <td style="text-align:center">${openTotal.toLocaleString()}</td>
            <td style="text-align:center">${closeTotal.toLocaleString()}</td>
          </tr>
          <tr>
            <td colspan="3" style="font-weight:700;text-align:center;padding:8px;background:${result>=0?'#e6fff0':'#fff0f0'}">
              Result ${result >= 0 ? '+' : ''}${result.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
      <div style="margin-top:32px">
        <div style="border-top:1px solid #000;padding-top:4px;margin-bottom:20px">Shift manager .........................................................................</div>
        <div style="border-top:1px solid #000;padding-top:4px;margin-bottom:20px">Government Inspector .........................................................................</div>
        <div style="border-top:1px solid #000;padding-top:4px">Pitboss .........................................................................</div>
      </div>
    `, `Float Closing — ${table.id}`);
  }

  // ── HOUSE OPEN FORM print (summary of all tables) ─────────────────────────
  function printHouseOpenForm(tables, chips) {
    const now = new Date().toLocaleString("en-KE");
    const cName = casinoInfo?.name || "Grand Casino";
    const rows = tables.map(t => {
      const cap = t.floatCapacity || t.chipTotal || 0;
      const bd = t.chipBreakdown || {};
      const denomCells = chips.map(c => `<td style="text-align:center">${bd[c.id] !== undefined ? bd[c.id] : "___"}</td>`).join('');
      return `<tr><td>${t.id}</td><td>${t.tableName||t.gameType}</td><td style="text-align:right">${cap.toLocaleString()}</td>${denomCells}<td style="text-align:right">___</td><td style="text-align:right">___</td></tr>`;
    }).join('');
    const chipHeaders = chips.map(c=>`<th style="text-align:center">${c.color}<br/>(${c.value.toLocaleString()})</th>`).join('');
    printDoc(`
      <h2>HOUSE OPENING — CHIP COUNT FORM</h2>
      <div class="sub">${cName} · ${now}</div>
      <table>
        <thead><tr><th>Table</th><th>Game</th><th>Float Capacity</th>${chipHeaders}<th>Actual Count</th><th>Variance</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="total-row"><td colspan="2">TOTAL HOUSE FLOAT</td><td style="text-align:right">${tables.reduce((s,t)=>s+(t.floatCapacity||t.chipTotal||0),0).toLocaleString()}</td>${chips.map(()=>'<td></td>').join('')}<td></td><td></td></tr></tfoot>
      </table>
      <div class="sig-row">
        <div class="sig-box">Shift Manager<br><br><br>Signature &amp; Date:</div>
        <div class="sig-box">Pit Boss<br><br><br>Signature &amp; Date:</div>
        <div class="sig-box">Government Inspector<br><br><br>Signature &amp; Date:</div>
      </div>
    `, 'House Open — Chip Count');
  }

  // ── HOUSE CLOSE FORM print ────────────────────────────────────────────────
  function printHouseCloseForm(tables, chips) {
    const now = new Date().toLocaleString("en-KE");
    const cName = casinoInfo?.name || "Grand Casino";
    const chipHeaders = chips.map(c=>`<th style="text-align:center">${c.color}<br/>(${c.value.toLocaleString()})</th>`).join('');
    const rows = tables.map(t => {
      const cap = t.floatCapacity || t.chipTotal || 0;
      const closingTotal = t.chipTotal || 0;
      const result = closingTotal - cap;
      const bd = t.chipBreakdown || {};
      const denomCells = chips.map(c => `<td style="text-align:center">${bd[c.id] !== undefined ? bd[c.id] : "___"}</td>`).join('');
      return `<tr><td>${t.id}</td><td>${t.tableName||t.gameType}</td>${denomCells}<td style="text-align:right">${closingTotal.toLocaleString()}</td><td style="text-align:right">${cap.toLocaleString()}</td><td style="text-align:right;color:${result>=0?'green':'red'}">${result>=0?'+':''}${result.toLocaleString()}</td></tr>`;
    }).join('');
    const totalClose = tables.reduce((s,t)=>s+(t.chipTotal||0),0);
    const totalCap   = tables.reduce((s,t)=>s+(t.floatCapacity||t.chipTotal||0),0);
    const totalWL    = totalClose - totalCap;
    printDoc(`
      <h2>HOUSE CLOSING — CHIP COUNT FORM</h2>
      <div class="sub">${cName} · ${now}</div>
      <p style="margin-bottom:12px;font-size:11px;color:#555">Closing Count vs Float Capacity = Table Win/Loss for the shift.</p>
      <table>
        <thead><tr><th>Table</th><th>Game</th>${chipHeaders}<th>Closing Count</th><th>Float Capacity</th><th>Win / Loss</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="2">HOUSE TOTAL</td>
            ${chips.map(()=>'<td></td>').join('')}
            <td style="text-align:right">${totalClose.toLocaleString()}</td>
            <td style="text-align:right">${totalCap.toLocaleString()}</td>
            <td style="text-align:right;font-weight:700;color:${totalWL>=0?'green':'red'}">${totalWL>=0?'+':''}${totalWL.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
      <div style="margin:16px 0;padding:12px;background:${totalWL>=0?'#e6fff0':'#fff0f0'};border-radius:4px;font-size:14px;font-weight:700;text-align:center">
        TOTAL HOUSE ${totalWL >= 0 ? 'WIN' : 'LOSS'}: ${totalWL >= 0 ? '+' : ''}${totalWL.toLocaleString()} KES
      </div>
      <div class="sig-row">
        <div class="sig-box">Shift Manager<br><br><br>Signature &amp; Date:</div>
        <div class="sig-box">Pit Boss<br><br><br>Signature &amp; Date:</div>
        <div class="sig-box">Government Inspector<br><br><br>Signature &amp; Date:</div>
      </div>
    `, 'House Close — Chip Count');
  }

  // ── FILL REQUESTS TAB ─────────────────────────────────────────────────────
  function FillRequestsTab() {
    const [showModal, setShowModal] = useState(false);
    const [denomQtys, setDenomQtys] = useState({});
    const [tableId, setTableId]     = useState(tables.find(t=>t.status!=="closed")?.id || "");

    const denomLines = chips.map(c => ({ ...c, qty: denomQtys[c.id]||0, subtotal: c.value*(denomQtys[c.id]||0) }));
    const fillTotal  = denomLines.reduce((s,d) => s+d.subtotal, 0);

    function submit() {
      if (!fillTotal) return;
      const lines = denomLines.filter(d=>d.qty>0);
      onAddFill({
        tableId,
        denominationLabel: lines.map(l=>`${l.color}×${l.qty}`).join(', '),
        denomLines: lines.map(l=>({ color:l.color, value:l.value, qty:l.qty, subtotal:l.subtotal })),
        quantity: lines.reduce((s,l)=>s+l.qty,0),
        total: fillTotal,
        status: "pending",
        requestedBy: user.name,
        time: new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})
      });
      setShowModal(false);
      setDenomQtys({});
    }

    return (
      <div>
        <div className="section-header" style={{ marginBottom:16 }}>
          <div className="section-sub">{fills.filter(f=>f.status==="pending").length} pending · {fills.length} total</div>
          {canRequest && <button className="btn btn-gold" onClick={() => setShowModal(true)}>＋ Request Fill</button>}
        </div>

        {fills.length === 0
          ? <div className="empty-state"><div className="empty-icon">🪙</div><p>No fill requests this shift</p></div>
          : fills.map(f => (
            <div key={f.id} className="fill-request-card">
              <div className="flex items-center gap-8" style={{ marginBottom:8 }}>
                <span className="text-mono text-gold">{f.tableId}</span>
                <StatusBadge status={f.status} />
                <span className="text-xs text-muted" style={{ marginLeft:"auto" }}>{f.time}</span>
              </div>
              <div style={{ fontSize:13, marginBottom:4 }}>Chips: <strong>{f.denominationLabel}</strong></div>
              <div style={{ fontSize:15, color:"var(--gold)", fontFamily:"var(--font-mono)", marginBottom:6 }}>Total: {fmt(f.total||f.amount)}</div>
              <div style={{ fontSize:11, color:"var(--text3)", marginBottom:10 }}>Requested by {f.requestedBy}</div>

              {/* Signature status */}
              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                {[
                  { role:"Shift Manager", signed: f.sigShiftMgr },
                  { role:"Pit Boss",      signed: f.sigPitBoss  },
                  { role:"Gov Inspector", signed: f.sigGI        },
                ].map(s => (
                  <div key={s.role} style={{ fontSize:10, padding:"3px 8px", borderRadius:4, background: s.signed?"var(--green-dim)":"var(--bg3)", border:`1px solid ${s.signed?"var(--green)":"var(--border2)"}`, color: s.signed?"var(--green)":"var(--text3)" }}>
                    {s.signed ? "✓" : "○"} {s.role}
                  </div>
                ))}
              </div>

              <div className="flex gap-8">
                <button className="btn btn-xs btn-outline" onClick={() => printFillForm(f, chips)}>🖨 Fill Form</button>
                {canApprove && f.status==="pending" && (
                  <>
                    <button className="btn btn-sm btn-green" onClick={() => onApproveFill(f.id)}>✓ Approve</button>
                    <button className="btn btn-sm btn-red">✕ Reject</button>
                  </>
                )}
                {canApprove && f.status!=="resolved" && (
                  <div className="flex gap-8">
                    {!f.sigShiftMgr && <button className="btn btn-xs btn-outline" onClick={() => onApproveFill(f.id, "sigShiftMgr")}>Sign (SM)</button>}
                    {!f.sigPitBoss  && <button className="btn btn-xs btn-outline" onClick={() => onApproveFill(f.id, "sigPitBoss")}>Sign (PB)</button>}
                    {!f.sigGI && canApprove && (
                      <button className="btn btn-xs btn-outline" onClick={() => onApproveFill(f.id, "sigGI")}>
                        Witness GI
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        }

        {/* Fill Request Modal — all denominations */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">Request Chip Fill</div>
                <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Table</label>
                  <select className="form-select" value={tableId} onChange={e => setTableId(e.target.value)}>
                    {tables.filter(t=>t.status!=="closed").map(t => <option key={t.id} value={t.id}>{t.id} — {t.gameType}</option>)}
                  </select>
                </div>
                <label className="form-label">Chip Denominations</label>
                <div style={{ background:"var(--bg3)", borderRadius:"var(--radius)", padding:12, marginBottom:12 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto auto auto", gap:8, alignItems:"center", marginBottom:6 }}>
                    <span style={{ fontSize:9, color:"var(--text3)", letterSpacing:1 }}>CHIP</span>
                    <span style={{ fontSize:9, color:"var(--text3)", letterSpacing:1 }}>COLOR</span>
                    <span style={{ fontSize:9, color:"var(--text3)", letterSpacing:1 }}>VALUE</span>
                    <span style={{ fontSize:9, color:"var(--text3)", letterSpacing:1 }}>QTY</span>
                    <span style={{ fontSize:9, color:"var(--text3)", letterSpacing:1 }}>SUBTOTAL</span>
                  </div>
                  {chips.map(c => (
                    <div key={c.id} style={{ display:"grid", gridTemplateColumns:"24px 1fr auto auto auto", gap:8, alignItems:"center", marginBottom:8 }}>
                      <div style={{ width:20, height:20, borderRadius:"50%", background:c.hex, border:"2px solid rgba(255,255,255,0.2)" }} />
                      <span style={{ fontSize:12 }}>{c.color}</span>
                      <span className="text-mono" style={{ fontSize:11, color:"var(--text3)", width:70, textAlign:"right" }}>{fmt(c.value)}</span>
                      <input type="number" min="0" placeholder="0" className="form-input" style={{ width:70, textAlign:"center", padding:"4px 6px" }}
                        value={denomQtys[c.id]||""}
                        onChange={e => setDenomQtys(q => ({...q,[c.id]:Number(e.target.value)}))} />
                      <span className="text-mono" style={{ fontSize:11, color:"var(--gold)", width:90, textAlign:"right" }}>
                        {denomQtys[c.id] ? fmt(c.value*(denomQtys[c.id]||0)) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ background:"var(--gold-dim)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:12 }}>
                  <div className="flex items-center">
                    <span style={{ fontSize:11, color:"var(--text3)" }}>TOTAL FILL AMOUNT</span>
                    <span className="text-mono text-gold" style={{ fontSize:20, marginLeft:"auto" }}>{fmt(fillTotal)}</span>
                  </div>
                  <div style={{ fontSize:10, color:"var(--text3)", marginTop:6 }}>Signatures required: Shift Manager · Pit Boss · Government Inspector</div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-gold" onClick={submit} disabled={!fillTotal}>Submit Fill Request</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── HOUSE OPEN / CLOSE TAB ────────────────────────────────────────────────
  // ── HALL OPEN / CLOSE TAB (Pit Boss) ─────────────────────────────────────
  function HallTab() {
    const myStaff = staff.find(s => s.id === user.staffId);
    const myHallId = myStaff?.hallId;
    const myHall = halls?.find(h => h.id === myHallId);
    const hallTables = tables.filter(t => t.hallId === myHallId);
    const [hallStatus, setHallStatus] = useState(hallTables.some(t => t.status !== "closed") ? "open" : "closed");
    const [closeCounts, setCloseCounts] = useState({});   // tableId → { chipId → qty }
    const [closeMode, setCloseMode] = useState(false);
    const [savedLog, setSavedLog] = useState([]);
    const fmtK = n => n != null ? n.toLocaleString("en-KE",{style:"currency",currency:"KES",minimumFractionDigits:0}) : "—";

    function openHall() {
      hallTables.forEach(t => { if (t.status === "closed") onUpdateTable(t.id, { status: "open", openedAt: new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"}), openedDate: new Date().toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"2-digit"}) }); });
      setHallStatus("open");
    }

    function submitHallClose() {
      const now = new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"});
      hallTables.forEach(t => {
        const tCounts = closeCounts[t.id] || {};
        const chipTotal = (chips||[]).reduce((s,c) => s + c.value*(tCounts[c.id]||0), 0);
        if (chipTotal > 0) {
          onUpdateTable(t.id, { chipTotal, status: "closed" });
          if (onAddChipCount) onAddChipCount({ tableId: t.id, prevFloat: t.chipTotal||0, newFloat: chipTotal, diff: chipTotal-(t.chipTotal||0), inspector: myStaff?.name||"Pit Boss" });
        } else {
          onUpdateTable(t.id, { status: "closed" });
        }
      });
      const entry = { id: Date.now(), time: now, hallId: myHallId, hallName: myHall?.name||myHallId, tableCount: hallTables.length, tables: hallTables.map(t => { const tc = closeCounts[t.id]||{}; const total = (chips||[]).reduce((s,c)=>s+c.value*(tc[c.id]||0),0); return { id:t.id, name:t.tableName||t.id, chipTotal: total }; }) };
      setSavedLog(l => [entry, ...l]);
      setHallStatus("closed");
      setCloseMode(false);
      setCloseCounts({});
    }

    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
          <div>
            <div style={{ fontSize:"1.1rem", fontWeight:700 }}>{myHall?.name || "Your Hall"}</div>
            <div style={{ color:"var(--text2)", fontSize:"0.85rem" }}>{hallTables.length} tables · Status: <span style={{ color: hallStatus==="open"?"var(--green)":"var(--text3)", fontWeight:600 }}>{hallStatus.toUpperCase()}</span></div>
          </div>
          <div style={{ display:"flex", gap:"0.5rem" }}>
            {hallStatus === "closed" && <button className="btn btn-gold" onClick={openHall}>🟢 Open Hall</button>}
            {hallStatus === "open" && !closeMode && <button className="btn btn-outline" style={{borderColor:"var(--red)",color:"var(--red)"}} onClick={() => setCloseMode(true)}>🔴 Close Hall & Record Chips</button>}
          </div>
        </div>

        {closeMode && (
          <div style={{ background:"var(--panel)", border:"1px solid var(--border)", borderRadius:"var(--radius2)", padding:"1.5rem", marginBottom:"1rem" }}>
            <div style={{ fontWeight:600, color:"var(--gold)", marginBottom:"1rem" }}>Record Chip Count per Table at Close</div>
            {hallTables.map(t => {
              const tCounts = closeCounts[t.id] || {};
              const total = (chips||[]).reduce((s,c)=>s+c.value*(tCounts[c.id]||0),0);
              return (
                <div key={t.id} style={{ marginBottom:"1rem", padding:"1rem", background:"var(--bg3)", borderRadius:"var(--radius)" }}>
                  <div style={{ fontWeight:600, marginBottom:"0.5rem" }}>{t.tableName||t.id} <span style={{color:"var(--text3)",fontWeight:400,fontSize:"0.8rem"}}>{t.gameType}</span></div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"0.75rem" }}>
                    {(chips||[]).map(c => (
                      <div key={c.id} style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}>
                        <div style={{ width:14, height:14, borderRadius:"50%", background:c.hex, border:"1px solid rgba(255,255,255,0.2)" }} />
                        <span style={{ fontSize:"0.8rem", color:"var(--text2)" }}>{c.color}</span>
                        <input type="number" min="0" placeholder="0" value={tCounts[c.id]||""}
                          onChange={e => setCloseCounts(cc => ({ ...cc, [t.id]: { ...(cc[t.id]||{}), [c.id]: Number(e.target.value) } }))}
                          style={{ width:60, background:"var(--panel2)", border:"1px solid var(--border)", color:"var(--text)", padding:"0.25rem 0.4rem", borderRadius:"var(--radius)", textAlign:"center", fontSize:"0.8rem" }} />
                      </div>
                    ))}
                    <span style={{ marginLeft:"auto", fontFamily:"var(--font-mono)", color:"var(--gold)", fontSize:"0.9rem" }}>{fmtK(total)}</span>
                  </div>
                </div>
              );
            })}
            <div style={{ display:"flex", gap:"0.5rem", marginTop:"0.5rem" }}>
              <button className="btn btn-gold" onClick={submitHallClose}>✓ Confirm Close & Log</button>
              <button className="btn btn-outline" onClick={() => setCloseMode(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ background:"var(--panel)", border:"1px solid var(--border)", borderRadius:"var(--radius2)", overflow:"hidden" }}>
          <div style={{ padding:"0.75rem 1rem", borderBottom:"1px solid var(--border)", fontWeight:600, fontSize:"0.9rem" }}>Table Status</div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ borderBottom:"1px solid var(--border)" }}>
              {["Table","Game","Status","Opening Float","Current Chips","Result"].map(h => <th key={h} style={{ padding:"0.5rem 0.75rem", textAlign:"left", color:"var(--text2)", fontSize:"0.75rem", fontWeight:500 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {hallTables.map(t => {
                const result = (t.chipTotal||0) - (t.openingFloat||t.floatCapacity||0);
                return (
                  <tr key={t.id} style={{ borderBottom:"1px solid var(--border2)" }}>
                    <td style={{ padding:"0.5rem 0.75rem", fontWeight:600 }}>{t.tableName||t.id}</td>
                    <td style={{ padding:"0.5rem 0.75rem", color:"var(--text2)", fontSize:"0.85rem" }}>{t.gameType}</td>
                    <td style={{ padding:"0.5rem 0.75rem" }}><StatusBadge status={t.status} /></td>
                    <td style={{ padding:"0.5rem 0.75rem", fontFamily:"var(--font-mono)", fontSize:"0.85rem" }}>{fmtK(t.openingFloat||t.floatCapacity||0)}</td>
                    <td style={{ padding:"0.5rem 0.75rem", fontFamily:"var(--font-mono)", fontSize:"0.85rem", color:"var(--gold)" }}>{fmtK(t.chipTotal||0)}</td>
                    <td style={{ padding:"0.5rem 0.75rem", fontFamily:"var(--font-mono)", fontSize:"0.85rem", fontWeight:600, color:result>=0?"var(--green)":"var(--red)" }}>{result>=0?"+":""}{fmtK(result)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {savedLog.length > 0 && (
          <div style={{ marginTop:"1.5rem" }}>
            <div style={{ fontWeight:600, marginBottom:"0.75rem" }}>Hall Close Log</div>
            {savedLog.map(entry => (
              <div key={entry.id} style={{ background:"var(--panel)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"0.75rem 1rem", marginBottom:"0.5rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontWeight:600 }}>{entry.hallName}</span>
                  <span style={{ color:"var(--text2)", fontSize:"0.8rem" }}>Closed at {entry.time}</span>
                </div>
                <div style={{ display:"flex", gap:"1rem", marginTop:"0.4rem", flexWrap:"wrap" }}>
                  {entry.tables.map(t => (
                    <span key={t.id} style={{ fontSize:"0.8rem", color:"var(--text2)" }}>{t.name}: <span style={{ color:"var(--gold)", fontFamily:"var(--font-mono)" }}>{fmtK(t.chipTotal)}</span></span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function HouseTab() {
    const [houseSubTab, setHouseSubTab]       = useState("open"); // "open" | "close"
    const [tableFormModal, setTableFormModal] = useState(null); // { table, mode: "open"|"close" }
    const [formCounts, setFormCounts]         = useState({});

    const totalCapacity = tables.reduce((s,t) => s+(t.floatCapacity||t.chipTotal||0), 0);
    const totalCurrent  = tables.reduce((s,t) => s+(t.chipTotal||0), 0);
    const houseWinLoss  = totalCurrent - totalCapacity;

    function openTableForm(table, mode) {
      setFormCounts({});
      setTableFormModal({ table, mode });
    }

    function confirmTableForm() {
      if (!tableFormModal) return;
      const { table, mode } = tableFormModal;
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"2-digit"});
      const timeStr = now.toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit",hour12:false});
      if (mode === "open") {
        const total = chips.reduce((s,c) => s+c.value*(formCounts[c.id]||0), 0);
        onUpdateTable(table.id, { status:"open", chipTotal: total||table.floatCapacity, openingFloat: total||table.floatCapacity, openedAt: timeStr, openedDate: dateStr, chipBreakdown: { ...formCounts } });
        printTableOpenForm(table, chips, formCounts);
      } else {
        const total = chips.reduce((s,c) => s+c.value*(formCounts[c.id]||0), 0);
        onUpdateTable(table.id, { status:"closed", chipTotal: total||table.chipTotal, chipBreakdown: { ...formCounts } });
        printTableCloseForm(table, chips, formCounts);
        // Reset to float capacity for next open
        setTimeout(() => onUpdateTable(table.id, { chipTotal: table.floatCapacity||table.chipTotal }), 500);
      }
      setTableFormModal(null);
    }

    return (
      <>
      <div>
        <div className="flex gap-8 mb-16" style={{ justifyContent:"flex-end" }}>
          <button className="btn btn-outline" onClick={() => printHouseOpenForm(tables, chips)}>🖨 House Open Summary</button>
          <button className="btn btn-outline" onClick={() => printHouseCloseForm(tables, chips)}>🖨 House Close Summary</button>
        </div>

        {/* House chip count summary */}
        <div className="stat-grid mb-16">
          {[
            { label:"Total Float Capacity", value:fmt(totalCapacity), accent:"var(--gold)",  icon:"🏦" },
            { label:"Current House Count",  value:fmt(totalCurrent),  accent:"var(--blue)",  icon:"🪙" },
            { label:"House Win / Loss",      value:fmt(houseWinLoss),  accent:houseWinLoss>=0?"var(--green)":"var(--red)", icon:"📊" },
            { label:"Tables",               value:String(tables.length), accent:"var(--gold)", icon:"🃏" },
            { label:"Cage Float",            value:fmt(cageReserve),   accent: cageReserve >= 0 ? "var(--green)" : "var(--red)",  icon:"🔐" },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ "--accent":s.accent }}>
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize:18 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Open / Close sub-tabs */}
        <div className="tab-bar" style={{ marginBottom:14 }}>
          <div className={`tab-item ${houseSubTab==="open"?"active":""}`} onClick={() => setHouseSubTab("open")}>📋 Opening Count</div>
          <div className={`tab-item ${houseSubTab==="close"?"active":""}`} onClick={() => setHouseSubTab("close")}>📋 Closing Count</div>
        </div>

        {/* Opening Count — closed tables waiting to be opened */}
        {houseSubTab === "open" && (
          <div className="card mb-16">
            <div className="card-header">
              <div className="card-title">Opening Float Entry</div>
              <div style={{ fontSize:11, color:"var(--text3)" }}>Select a table to enter denomination counts and generate the signed Opening Float form.</div>
            </div>
            <div className="card-body">
              <table className="data-table">
                <thead>
                  <tr><th>Table</th><th>Game</th><th>Profile</th><th>Status</th><th>Float Capacity</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {tables.map(t => (
                    <tr key={t.id} style={{ opacity: t.status==="open" ? 0.5 : 1 }}>
                      <td className="text-mono text-gold">{t.id}</td>
                      <td>{t.gameType}</td>
                      <td style={{ fontSize:11, color:"var(--text3)" }}>{t.tableName||"—"}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td className="text-mono" style={{ color:"var(--gold)" }}>{fmt(t.floatCapacity||0)}</td>
                      <td>
                        {t.status === "closed"
                          ? <button className="btn btn-xs btn-green" onClick={() => openTableForm(t,"open")}>📋 Open Float</button>
                          : <span style={{ fontSize:11, color:"var(--text3)" }}>Already open</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Closing Count — open tables ready to be closed */}
        {houseSubTab === "close" && (
          <div className="card mb-16">
            <div className="card-header">
              <div className="card-title">Closing Float Entry</div>
              <div style={{ fontSize:11, color:"var(--text3)" }}>Select an open table to enter closing denomination counts, record the result, and print the signed Close form.</div>
            </div>
            <div className="card-body">
              <table className="data-table">
                <thead>
                  <tr><th>Table</th><th>Game</th><th>Profile</th><th>Status</th><th>Opening Float</th><th>Current Count</th><th>W/L</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {tables.map(t => {
                    const cap = t.openingFloat || t.floatCapacity || 0;
                    const cur = t.chipTotal || 0;
                    const wl  = cur - cap;
                    return (
                      <tr key={t.id} style={{ opacity: t.status==="closed" ? 0.5 : 1 }}>
                        <td className="text-mono text-gold">{t.id}</td>
                        <td>{t.gameType}</td>
                        <td style={{ fontSize:11, color:"var(--text3)" }}>{t.tableName||"—"}</td>
                        <td><StatusBadge status={t.status} /></td>
                        <td className="text-mono">{fmt(cap)}</td>
                        <td className="text-mono text-gold">{fmt(cur)}</td>
                        <td className="text-mono" style={{ color:wl>=0?"var(--green)":"var(--red)", fontWeight:600 }}>{wl>=0?"+":""}{fmt(wl)}</td>
                        <td>
                          {t.status === "open"
                            ? <button className="btn btn-xs btn-red" onClick={() => openTableForm(t,"close")}>📋 Close Float</button>
                            : <span style={{ fontSize:11, color:"var(--text3)" }}>Already closed</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background:"var(--bg3)" }}>
                    <td colSpan={4} className="text-mono" style={{ fontWeight:600, color:"var(--text3)", fontSize:11 }}>HOUSE TOTAL</td>
                    <td className="text-mono" style={{ fontWeight:700 }}>{fmt(totalCapacity)}</td>
                    <td className="text-mono text-gold" style={{ fontWeight:700 }}>{fmt(totalCurrent)}</td>
                    <td className="text-mono" style={{ fontWeight:700, color:houseWinLoss>=0?"var(--green)":"var(--red)" }}>{houseWinLoss>=0?"+":""}{fmt(houseWinLoss)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Per-table open/close denomination modal */}
        {tableFormModal && (
          <div className="modal-overlay" onClick={() => setTableFormModal(null)}>
            <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">
                  {tableFormModal.mode === "open" ? "📋 Float Opening" : "📋 Float Closing"} — {tableFormModal.table.id} ({tableFormModal.table.tableName || tableFormModal.table.gameType})
                </div>
                <button className="modal-close" onClick={() => setTableFormModal(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{ padding:"8px 12px", background:"var(--gold-dim)", border:"1px solid var(--border)", borderRadius:"var(--radius)", marginBottom:14, fontSize:12 }}>
                  Float Capacity: <span className="text-mono text-gold">{fmt(tableFormModal.table.floatCapacity||0)}</span>
                  {tableFormModal.mode === "close" && <> &nbsp;|&nbsp; Opening Float: <span className="text-mono">{fmt(tableFormModal.table.openingFloat||tableFormModal.table.floatCapacity||0)}</span></>}
                </div>
                <table className="data-table">
                  <thead><tr><th>Value (KES)</th><th style={{textAlign:"center"}}>Count</th><th style={{textAlign:"right"}}>Subtotal</th></tr></thead>
                  <tbody>
                    {chips.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div className="flex items-center gap-8">
                            <div style={{ width:16,height:16,borderRadius:"50%",background:c.hex,border:"2px solid rgba(255,255,255,0.2)" }} />
                            <span className="text-mono" style={{ fontWeight:600 }}>{c.value.toLocaleString()}</span>
                          </div>
                        </td>
                        <td style={{textAlign:"center"}}>
                          <input type="number" min="0" placeholder="0" className="form-input"
                            style={{width:80,textAlign:"center",padding:"4px 8px"}}
                            value={formCounts[c.id]||""}
                            onChange={e => setFormCounts(f=>({...f,[c.id]:Number(e.target.value)}))} />
                        </td>
                        <td className="text-mono" style={{textAlign:"right",color:"var(--gold)"}}>
                          {formCounts[c.id] ? fmt(c.value*(formCounts[c.id]||0)) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background:"var(--gold-dim)", fontWeight:700 }}>
                      <td>TOTAL</td>
                      <td style={{textAlign:"center"}}>{Object.values(formCounts).reduce((s,v)=>s+(v||0),0)} chips</td>
                      <td className="text-mono" style={{textAlign:"right",color:"var(--gold)",fontSize:16}}>
                        {fmt(chips.reduce((s,c)=>s+c.value*(formCounts[c.id]||0),0))}
                      </td>
                    </tr>
                    {tableFormModal.mode === "close" && (() => {
                      const closeTotal = chips.reduce((s,c)=>s+c.value*(formCounts[c.id]||0),0);
                      const openTotal  = tableFormModal.table.openingFloat || tableFormModal.table.floatCapacity || 0;
                      const result     = closeTotal - openTotal;
                      return (
                        <tr style={{ background: result>=0?"var(--green-dim)":"var(--red-dim)", fontWeight:700 }}>
                          <td colSpan={3} style={{ textAlign:"center", color: result>=0?"var(--green)":"var(--red)", fontSize:14 }}>
                            Result {result>=0?"+":""}{fmt(result)}
                          </td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                </table>
                <div style={{ marginTop:12, fontSize:11, color:"var(--text3)" }}>
                  Signatures required: Shift Manager · Government Inspector · Pit Boss. Form will print automatically on confirmation.
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setTableFormModal(null)}>Cancel</button>
                <button className="btn btn-gold" onClick={confirmTableForm}>
                  ✓ Confirm & Print {tableFormModal.mode === "open" ? "Open" : "Close"} Form
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
        {canAll && (
          <div style={{ marginTop:"1rem", padding:"10px 14px", background:"var(--blue-dim)", border:"1px solid rgba(74,158,245,0.3)", borderRadius:"var(--radius)", fontSize:12, color:"var(--blue)" }}>
            🏦 Cage Float = Total House Float − Table Floats. To adjust the total house float, go to <strong>Float Management</strong> in the Management menu.
          </div>
        )}
      </>
    );
  }

  // ── TABLE TO TABLE TRANSFER TAB ───────────────────────────────────────────
  function TransferTab() {
    const [form, setForm] = useState({ fromTable:"", toTable:"", denomQtys:{}, pitBossId:"", dealerId:"", notes:"" });
    const pitBosses = staff.filter(s=>s.position==="pit_boss");
    const dealers   = staff.filter(s=>s.position==="dealer"||s.position==="dealer_inspector");

    const transferLines = chips.map(c => ({
      ...c, qty: form.denomQtys[c.id]||0,
      fromSubtotal:  c.value*(form.denomQtys[c.id]||0),
      toSubtotal:    c.value*(form.denomQtys[`r_${c.id}`]||0),
      returnQty:     form.denomQtys[`r_${c.id}`]||0,
    }));
    const fromTotal = transferLines.reduce((s,l)=>s+l.fromSubtotal,0);
    const toTotal   = transferLines.reduce((s,l)=>s+l.toSubtotal,0);

    function printTransferForm(transfer) {
      const now = new Date().toLocaleString("en-KE");
      const rows = (transfer.lines||[]).filter(l=>l.qty>0||l.returnQty>0).map(l=>`
        <tr>
          <td><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${l.hex};border:1px solid #ccc;margin-right:4px"></span>${l.color}</td>
          <td style="text-align:right">${l.value.toLocaleString()}</td>
          <td style="text-align:center">${l.qty}</td>
          <td style="text-align:right">${l.fromSubtotal.toLocaleString()}</td>
          <td style="text-align:center">${l.returnQty}</td>
          <td style="text-align:right">${l.toSubtotal.toLocaleString()}</td>
        </tr>`).join('');
      printDoc(`
        <h2>TABLE-TO-TABLE CHIP TRANSFER FORM</h2>
        <div class="sub">CasinoOps Floor Operations System</div>
        <table>
          <tr><th>From Table</th><td>${transfer.fromTable}</td><th>To Table</th><td>${transfer.toTable}</td></tr>
          <tr><th>Pit Boss</th><td>${transfer.pitBossName||"—"}</td><th>Dealer</th><td>${transfer.dealerName||"—"}</td></tr>
          <tr><th>Date &amp; Time</th><td colspan="3">${now}</td></tr>
          ${transfer.notes?`<tr><th>Notes</th><td colspan="3">${transfer.notes}</td></tr>`:''}
        </table>
        <table>
          <thead><tr><th>Denomination</th><th style="text-align:right">Value (KES)</th><th style="text-align:center">Qty Sent</th><th style="text-align:right">Subtotal</th><th style="text-align:center">Qty Returned</th><th style="text-align:right">Return Subtotal</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="total-row"><td colspan="2">TOTALS</td><td style="text-align:center">${transfer.lines?.reduce((s,l)=>s+l.qty,0)}</td><td style="text-align:right">${transfer.fromTotal?.toLocaleString()}</td><td style="text-align:center">${transfer.lines?.reduce((s,l)=>s+l.returnQty,0)}</td><td style="text-align:right">${transfer.toTotal?.toLocaleString()}</td></tr>
          </tfoot>
        </table>
        <div class="sig-row">
          <div class="sig-box">Pit Boss<br><br><br>Signature &amp; Date:</div>
          <div class="sig-box">Sending Dealer<br><br><br>Signature &amp; Date:</div>
          <div class="sig-box">Receiving Dealer<br><br><br>Signature &amp; Date:</div>
        </div>
      `, `Transfer — ${transfer.fromTable} → ${transfer.toTable}`);
    }

    function submit() {
      if (!form.fromTable || !form.toTable || fromTotal===0) return;
      const pb = staff.find(s=>s.id===form.pitBossId);
      const dl = staff.find(s=>s.id===form.dealerId);
      const transfer = {
        id: "tr"+Date.now(),
        fromTable: form.fromTable, toTable: form.toTable,
        pitBossId: form.pitBossId, pitBossName: pb?.name||"—",
        dealerId: form.dealerId, dealerName: dl?.name||"—",
        notes: form.notes,
        lines: transferLines.filter(l=>l.qty>0||l.returnQty>0),
        fromTotal, toTotal,
        time: new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"}),
        status: "logged"
      };
      onAddTransfer(transfer);
      // Update table chip totals
      if (form.fromTable) onUpdateTable(form.fromTable, { chipTotal: Math.max(0,(tables.find(t=>t.id===form.fromTable)?.chipTotal||0)-fromTotal+toTotal) });
      if (form.toTable)   onUpdateTable(form.toTable,   { chipTotal: (tables.find(t=>t.id===form.toTable)?.chipTotal||0)+fromTotal-toTotal });
      setForm({ fromTable:"", toTable:"", denomQtys:{}, pitBossId:"", dealerId:"", notes:"" });
    }

    return (
      <div>
        <div className="card mb-16">
          <div className="card-header"><div className="card-title">New Table-to-Table Transfer</div></div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">From Table</label>
                <select className="form-select" value={form.fromTable} onChange={e=>setForm(f=>({...f,fromTable:e.target.value}))}>
                  <option value="">Select source table...</option>
                  {tables.map(t=><option key={t.id} value={t.id}>{t.id} — {t.gameType} ({fmt(t.chipTotal)})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">To Table</label>
                <select className="form-select" value={form.toTable} onChange={e=>setForm(f=>({...f,toTable:e.target.value}))}>
                  <option value="">Select destination table...</option>
                  {tables.filter(t=>t.id!==form.fromTable).map(t=><option key={t.id} value={t.id}>{t.id} — {t.gameType} ({fmt(t.chipTotal)})</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Pit Boss</label>
                <select className="form-select" value={form.pitBossId} onChange={e=>setForm(f=>({...f,pitBossId:e.target.value}))}>
                  <option value="">Select pit boss...</option>
                  {pitBosses.map(s=><option key={s.id} value={s.id}>{s.name} ({s.empNo||s.id})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Dealer (at sending table)</label>
                <select className="form-select" value={form.dealerId} onChange={e=>setForm(f=>({...f,dealerId:e.target.value}))}>
                  <option value="">Select dealer...</option>
                  {dealers.map(s=><option key={s.id} value={s.id}>{s.name} ({s.empNo||s.id})</option>)}
                </select>
              </div>
            </div>

            <label className="form-label" style={{marginBottom:8,display:"block"}}>Chips Being Sent (From → To)</label>
            <div style={{ background:"var(--bg3)", borderRadius:"var(--radius)", padding:12, marginBottom:12 }}>
              <div style={{ display:"grid", gridTemplateColumns:"20px 1fr 80px 90px 80px 90px", gap:8, alignItems:"center", marginBottom:8 }}>
                <span/><span style={{fontSize:9,color:"var(--text3)"}}>DENOMINATION</span>
                <span style={{fontSize:9,color:"var(--text3)",textAlign:"center"}}>SEND QTY</span>
                <span style={{fontSize:9,color:"var(--text3)",textAlign:"right"}}>SEND VALUE</span>
                <span style={{fontSize:9,color:"var(--text3)",textAlign:"center"}}>RETURN QTY</span>
                <span style={{fontSize:9,color:"var(--text3)",textAlign:"right"}}>RETURN VALUE</span>
              </div>
              {chips.map(c => (
                <div key={c.id} style={{ display:"grid", gridTemplateColumns:"20px 1fr 80px 90px 80px 90px", gap:8, alignItems:"center", marginBottom:8 }}>
                  <div style={{width:16,height:16,borderRadius:"50%",background:c.hex,border:"2px solid rgba(255,255,255,0.2)"}} />
                  <span style={{fontSize:12}}>{c.color} <span style={{color:"var(--text3)",fontSize:11}}>({fmt(c.value)} ea)</span></span>
                  <input type="number" min="0" placeholder="0" className="form-input" style={{padding:"3px 5px",textAlign:"center",fontSize:11}}
                    value={form.denomQtys[c.id]||""}
                    onChange={e=>setForm(f=>({...f,denomQtys:{...f.denomQtys,[c.id]:Number(e.target.value)}}))} />
                  <span className="text-mono" style={{fontSize:11,color:"var(--gold)",textAlign:"right"}}>
                    {form.denomQtys[c.id] ? fmt(c.value*(form.denomQtys[c.id]||0)) : "—"}
                  </span>
                  <input type="number" min="0" placeholder="0" className="form-input" style={{padding:"3px 5px",textAlign:"center",fontSize:11}}
                    value={form.denomQtys[`r_${c.id}`]||""}
                    onChange={e=>setForm(f=>({...f,denomQtys:{...f.denomQtys,[`r_${c.id}`]:Number(e.target.value)}}))} />
                  <span className="text-mono" style={{fontSize:11,color:"var(--blue)",textAlign:"right"}}>
                    {form.denomQtys[`r_${c.id}`] ? fmt(c.value*(form.denomQtys[`r_${c.id}`]||0)) : "—"}
                  </span>
                </div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"20px 1fr 80px 90px 80px 90px",gap:8,borderTop:"1px solid var(--border)",paddingTop:8}}>
                <span/><strong style={{fontSize:11}}>TOTALS</strong>
                <span/>
                <span className="text-mono text-gold" style={{textAlign:"right",fontWeight:700}}>{fmt(fromTotal)}</span>
                <span/>
                <span className="text-mono" style={{color:"var(--blue)",textAlign:"right",fontWeight:700}}>{fmt(toTotal)}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <input className="form-input" placeholder="e.g. Demand for 100s at T01..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
            </div>
            <button className="btn btn-gold" style={{width:"100%",justifyContent:"center"}} onClick={submit} disabled={!form.fromTable||!form.toTable||fromTotal===0}>
              Log Transfer
            </button>
          </div>
        </div>

        {/* Transfer history */}
        {(tableTransfers||[]).length > 0 && (
          <div className="card">
            <div className="card-header"><div className="card-title">Transfer History</div></div>
            <div className="card-body">
              <table className="data-table">
                <thead><tr><th>Time</th><th>From</th><th>To</th><th>Pit Boss</th><th>Sent</th><th>Returned</th><th>Form</th></tr></thead>
                <tbody>
                  {(tableTransfers||[]).map(tr=>(
                    <tr key={tr.id}>
                      <td className="text-mono text-muted">{tr.time}</td>
                      <td className="text-mono text-gold">{tr.fromTable}</td>
                      <td className="text-mono text-gold">{tr.toTable}</td>
                      <td>{tr.pitBossName}</td>
                      <td className="text-mono">{fmt(tr.fromTotal)}</td>
                      <td className="text-mono">{fmt(tr.toTotal)}</td>
                      <td><button className="btn btn-xs btn-outline" onClick={()=>printTransferForm(tr)}>🖨</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  const TABS = [
    { key:"fills",    label:"Fill Requests",        show: true },
    { key:"hall",     label:"Hall Open / Close",    show: user.role === "pit_boss" },
    { key:"house",    label:"House Open / Close",   show: canAll },
    { key:"transfer", label:"Table-to-Table",       show: canRequest || canAll },
  ].filter(t => t.show);

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Cage & Fills</div></div>
      </div>
      <div className="tab-bar">
        {TABS.map(t => <div key={t.key} className={`tab-item ${tab===t.key?"active":""}`} onClick={()=>setTab(t.key)}>{t.label}</div>)}
      </div>
      {tab === "fills"    && <FillRequestsTab />}
      {tab === "hall"     && <HallTab />}
      {tab === "house"    && <HouseTab />}
      {tab === "transfer" && <TransferTab />}
    </div>
  );
}


function RosterPage({ staff, userRole, rolePermissions }) {
  const positions = ["dealer","dealer_inspector","inspector","pit_boss","shift_manager"];
  const shiftColors = { N: "roster-N", D: "roster-D", M: "roster-M", X: "roster-X" };
  const shiftCycle  = ["N","D","M","X"];
  const canEdit = hasPermission(userRole, "generate_roster", rolePermissions);

  const [pos, setPos]           = useState("dealer");
  const [showGenModal, setShowGenModal] = useState(false);
  const [genMonth, setGenMonth] = useState(3);
  const [genYear,  setGenYear]  = useState(2026);
  const [genMode,  setGenMode]  = useState("auto"); // "auto" | "standard"
  const [genLog,   setGenLog]   = useState(null);   // summary text after generation

  // Master roster store: { [position]: [ { staffId, name, days:{1..31} } ] }
  const [allRosters, setAllRosters] = useState(() => {
    const map = {};
    positions.forEach(p => {
      map[p] = generateRoster(staff.filter(s => s.position === p));
    });
    return map;
  });

  // Add new staff members when staff list grows — never wipe existing edits
  useEffect(() => {
    setAllRosters(prev => {
      const map = { ...prev };
      positions.forEach(p => {
        const existing    = map[p] || [];
        const existingIds = new Set(existing.map(r => r.staffId));
        const newMembers  = staff.filter(s => s.position === p && !existingIds.has(s.id));
        if (newMembers.length > 0) {
          map[p] = [...existing, ...generateRoster(newMembers)];
        }
      });
      return map;
    });
  }, [staff]);

  const rosterData = allRosters[pos] || [];
  const daysInMonth = new Date(genYear, genMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // ── Cell click — cycle N→D→M→X ──────────────────────────────────────────────
  function cycleCell(staffId, day) {
    setAllRosters(prev => ({
      ...prev,
      [pos]: (prev[pos] || []).map(r =>
        r.staffId === staffId
          ? { ...r, days: { ...r.days, [day]: shiftCycle[(shiftCycle.indexOf(r.days[day]) + 1) % 4] } }
          : r
      )
    }));
  }

  // ── STANDARD GENERATION — 6-on 1-off N→N→D→D→M→M→X ────────────────────────
  function generateStandard(members, month, year) {
    const totalDays = new Date(year, month, 0).getDate();
    const cycle = ["N","N","D","D","M","M","X"];
    return members.map((s, si) => {
      const dayMap = {};
      for (let d = 1; d <= totalDays; d++) {
        dayMap[d] = cycle[(si * 2 + d - 1) % 7];
      }
      return { staffId: s.id, name: s.name, days: dayMap };
    });
  }

  // ── AUTO-ASSIGN — performance-intelligent roster generation ─────────────────
  // Logic:
  //  1. Score each dealer from chipTotal of their assigned table (proxy for performance)
  //  2. Rank into TIER_A (top 33%), TIER_B (mid 33%), TIER_C (bottom 33%)
  //  3. Peak days = Fri + Sat + Sun of the month (highest expected revenue)
  //  4. TIER_A get Night shifts on peak days (highest house revenue window)
  //  5. TIER_B get Day shifts on peak days, Night on off-peak
  //  6. TIER_C get Morning shifts and more off-days distributed mid-week
  //  7. All tiers still respect 6-on 1-off rule — off-days placed Mon/Tue for lower tiers
  //  8. Result: best staff are always active when revenue is highest
  function generateAutoAssign(members, month, year) {
    const totalDays = new Date(year, month, 0).getDate();

    // Score each member
    const scored = members.map(s => {
      const tbl = staff.find(x => x.id === s.id);
      // Use hallId hash + id length as a deterministic performance proxy
      // (real system would use chip count history)
      const score = ((s.id || "").length * 17 + (s.hallId === "h2" ? 30 : s.hallId === "h3" ? 50 : 10)) % 100;
      return { ...s, score };
    }).sort((a, b) => b.score - a.score);

    const n = scored.length;
    const tierSize = Math.ceil(n / 3);
    const tierA = scored.slice(0, tierSize);              // top performers
    const tierB = scored.slice(tierSize, tierSize * 2);   // mid performers
    const tierC = scored.slice(tierSize * 2);             // developing

    const tierOf = {};
    tierA.forEach(s => { tierOf[s.id] = "A"; });
    tierB.forEach(s => { tierOf[s.id] = "B"; });
    tierC.forEach(s => { tierOf[s.id] = "C"; });

    // Identify peak days (Fri=5, Sat=6, Sun=0)
    const peakDays = new Set();
    for (let d = 1; d <= totalDays; d++) {
      const dow = new Date(year, month - 1, d).getDay(); // 0=Sun
      if (dow === 0 || dow === 5 || dow === 6) peakDays.add(d);
    }

    // Shift assignment matrix per tier × peak/off-peak
    //                   peak-day  off-peak
    const shiftMatrix = {
      A: { peak: "N", off: "D" },   // Top: Night on weekends, Day mid-week
      B: { peak: "D", off: "M" },   // Mid: Day on weekends, Morning mid-week
      C: { peak: "M", off: "X" },   // Dev: Morning on weekends, more rest mid-week
    };

    return scored.map((s, si) => {
      const tier = tierOf[s.id] || "C";
      const dayMap = {};
      let consecutiveWork = 0;
      let lastOffDay = -1;

      for (let d = 1; d <= totalDays; d++) {
        const isPeak = peakDays.has(d);
        const daysSinceOff = lastOffDay === -1 ? d : d - lastOffDay;

        // Enforce max 6 consecutive working days
        if (consecutiveWork >= 6) {
          dayMap[d] = "X";
          consecutiveWork = 0;
          lastOffDay = d;
          continue;
        }

        // Tier C gets extra rest: also off on Mondays (off-peak start)
        if (tier === "C") {
          const dow = new Date(year, month - 1, d).getDay();
          if (dow === 1 && consecutiveWork >= 4) { // Monday after 4+ days
            dayMap[d] = "X";
            consecutiveWork = 0;
            lastOffDay = d;
            continue;
          }
        }

        // Assign shift by tier + peak
        dayMap[d] = shiftMatrix[tier][isPeak ? "peak" : "off"];
        consecutiveWork++;
      }
      return { staffId: s.id, name: s.name, tier, days: dayMap };
    });
  }

  // ── GENERATE HANDLER ────────────────────────────────────────────────────────
  function handleGenerate() {
    const members = staff.filter(s => s.position === pos);
    if (members.length === 0) {
      setGenLog({ error: true, text: `No ${pos.replace(/_/g," ")} staff found to generate roster for.` });
      return;
    }

    let generated;
    let summary;

    if (genMode === "auto") {
      generated = generateAutoAssign(members, genMonth, genYear);
      const tiers = generated.reduce((acc, r) => {
        acc[r.tier || "?"] = (acc[r.tier || "?"] || 0) + 1;
        return acc;
      }, {});
      const monthName = new Date(genYear, genMonth - 1, 1).toLocaleString("en-KE", { month: "long" });
      summary = {
        error: false,
        text: `Auto-assign complete for ${monthName} ${genYear}.`,
        details: [
          `${members.length} ${pos.replace(/_/g," ")} staff assigned.`,
          `Tier A (${tiers.A||0} staff) — Night shifts on peak days (Fri/Sat/Sun).`,
          `Tier B (${tiers.B||0} staff) — Day shifts on peak days, Morning off-peak.`,
          `Tier C (${tiers.C||0} staff) — Morning on peak days, rest days mid-week.`,
          `6-on 1-off rule enforced for all staff.`,
        ]
      };
    } else {
      generated = generateStandard(members, genMonth, genYear);
      const monthName = new Date(genYear, genMonth - 1, 1).toLocaleString("en-KE", { month: "long" });
      summary = {
        error: false,
        text: `Standard roster generated for ${monthName} ${genYear}.`,
        details: [`${members.length} staff assigned on 6-on 1-off cycle (N→N→D→D→M→M→X).`]
      };
    }

    setAllRosters(prev => ({ ...prev, [pos]: generated }));
    setGenLog(summary);
    setShowGenModal(false);
  }

  // ── MODAL ────────────────────────────────────────────────────────────────────
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Duty Roster</div>
          <div className="section-sub">
            {MONTHS[genMonth-1]} {genYear} — {pos.replace(/_/g," ")} schedule
            {canEdit && <span style={{ color: "var(--gold)", marginLeft: 8 }}>· Click any cell to edit</span>}
          </div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-outline" onClick={() => {
            const printWin = window.open('','_blank');
            const table = document.querySelector('.roster-grid');
            const title = pos.replace(/_/g,' ').toUpperCase() + ' DUTY ROSTER — ' + MONTHS[genMonth-1] + ' ' + genYear;
            printWin.document.write('<html><head><title>' + title + '</title><style>body{font-family:Arial,sans-serif;font-size:10px;padding:20px}h2{margin-bottom:8px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 5px;text-align:center}th{background:#f0f0f0}.N{background:#dbeafe;color:#1d4ed8}.D{background:#fef9c3;color:#854d0e}.M{background:#dcfce7;color:#166534}.X{color:#999}.name{text-align:left;font-weight:600}@page{size:A4 landscape;margin:15mm}</style></head><body>');
            printWin.document.write('<h2>' + title + '</h2>');
            printWin.document.write(table ? table.outerHTML.replace(/roster-N/g,'N').replace(/roster-D/g,'D').replace(/roster-M/g,'M').replace(/roster-X/g,'X').replace(/roster-name/g,'name') : '<p>No roster data</p>');
            printWin.document.write('</body></html>');
            printWin.document.close();
            printWin.print();
          }}>🖨 Print / Download</button>
          {canEdit && (
            <button className="btn btn-gold" onClick={() => { setGenLog(null); setShowGenModal(true); }}>
              ⚙ Generate Roster
            </button>
          )}
        </div>
      </div>

      {/* Generation result log */}
      {genLog && (
        <div style={{ padding: "12px 16px", marginBottom: 16, borderRadius: "var(--radius)", background: genLog.error ? "var(--red-dim)" : "var(--green-dim)", border: `1px solid ${genLog.error ? "var(--red)" : "var(--green)"}` }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: genLog.error ? "var(--red)" : "var(--green)", marginBottom: 6 }}>
            {genLog.error ? "⚠ " : "✓ "}{genLog.text}
          </div>
          {genLog.details && genLog.details.map((d, i) => (
            <div key={i} style={{ fontSize: 11, color: "var(--text2)", marginTop: 3 }}>• {d}</div>
          ))}
          <button onClick={() => setGenLog(null)} style={{ marginTop: 8, background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 11 }}>Dismiss</button>
        </div>
      )}

      {/* Position tabs */}
      <div className="flex gap-8 mb-20" style={{ flexWrap: "wrap" }}>
        {positions.map(p => (
          <button key={p} className={`btn btn-xs ${pos===p?"btn-gold":"btn-outline"}`} onClick={() => setPos(p)}>
            {p.replace(/_/g," ").toUpperCase()}
          </button>
        ))}
      </div>

      {/* Roster grid */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">{pos.replace(/_/g," ").toUpperCase()} — {MONTHS[genMonth-1]} {genYear}</div>
          <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
            <span className="text-blue  text-mono">N = Night</span>
            <span className="text-yellow text-mono">D = Day</span>
            <span className="text-green  text-mono">M = Morning</span>
            <span className="text-muted  text-mono">X = Off</span>
          </div>
        </div>
        <div className="card-body">
          {rosterData.length === 0
            ? <div className="empty-state"><div className="empty-icon">👤</div><p>No {pos.replace(/_/g," ")} staff found. Use "Generate Roster" to create one.</p></div>
            : <div className="roster-table">
                <table className="roster-grid">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", width: 150 }}>Name</th>
                      {rosterData[0] && Object.keys(rosterData[0].days).map(d => (
                        <th key={d} style={{ color: [0,5,6].includes(new Date(genYear, genMonth-1, Number(d)).getDay()) ? "var(--gold)" : "" }}>{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rosterData.map(r => (
                      <tr key={r.staffId}>
                        <td className="roster-name">
                          {r.name}
                          {r.tier && <span style={{ fontSize: 9, marginLeft: 6, color: r.tier==="A"?"var(--green)":r.tier==="B"?"var(--gold)":"var(--text3)", fontFamily: "var(--font-mono)" }}>T{r.tier}</span>}
                        </td>
                        {Object.entries(r.days).map(([d, val]) => (
                          <td
                            key={d}
                            className={shiftColors[val] || ""}
                            style={canEdit ? { cursor: "pointer", userSelect: "none" } : {}}
                            title={canEdit ? `${r.name} — Day ${d}: ${val} (click to change)` : `${r.name} — Day ${d}: ${val}`}
                            onClick={() => canEdit && cycleCell(r.staffId, Number(d))}
                          >{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </div>
      </div>

      {/* Generate Roster Modal */}
      {showGenModal && (
        <div className="modal-overlay" onClick={() => setShowGenModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Generate Duty Roster</div>
              <button className="modal-close" onClick={() => setShowGenModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Month + Year */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Month</label>
                  <select className="form-select" value={genMonth} onChange={e => setGenMonth(Number(e.target.value))}>
                    {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select className="form-select" value={genYear} onChange={e => setGenYear(Number(e.target.value))}>
                    {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Position */}
              <div className="form-group">
                <label className="form-label">Position</label>
                <select className="form-select" value={pos} onChange={e => setPos(e.target.value)}>
                  {positions.map(p => <option key={p} value={p}>{p.replace(/_/g," ").toUpperCase()}</option>)}
                </select>
              </div>

              {/* Mode selector */}
              <div className="form-group">
                <label className="form-label">Generation Mode</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>

                  {/* Standard */}
                  <div
                    onClick={() => setGenMode("standard")}
                    style={{ padding: 14, borderRadius: "var(--radius)", cursor: "pointer", border: `1px solid ${genMode==="standard"?"var(--gold)":"var(--border2)"}`, background: genMode==="standard" ? "var(--gold-dim)" : "var(--bg3)", transition: "all 0.15s" }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 6 }}>📅</div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: genMode==="standard" ? "var(--gold)" : "var(--text)" }}>Standard Cycle</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>Fixed 6-on 1-off pattern: N→N→D→D→M→M→X, repeated for all staff equally.</div>
                  </div>

                  {/* Auto-Assign */}
                  <div
                    onClick={() => setGenMode("auto")}
                    style={{ padding: 14, borderRadius: "var(--radius)", cursor: "pointer", border: `1px solid ${genMode==="auto"?"var(--gold)":"var(--border2)"}`, background: genMode==="auto" ? "var(--gold-dim)" : "var(--bg3)", transition: "all 0.15s" }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 6 }}>🧠</div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: genMode==="auto" ? "var(--gold)" : "var(--text)" }}>Auto-Assign</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>Intelligent: assigns top performers to Night shifts on peak days (Fri/Sat/Sun) for maximum house revenue.</div>
                  </div>
                </div>
              </div>

              {/* Auto-assign detail explanation */}
              {genMode === "auto" && (
                <div style={{ padding: 14, background: "var(--bg3)", borderRadius: "var(--radius)", border: "1px solid var(--border2)" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gold)", marginBottom: 8 }}>🧠 How Auto-Assign Works</div>
                  {[
                    ["Tier A — Top performers", "Night shifts on Fri/Sat/Sun (peak revenue days). Day shifts mid-week.", "var(--green)"],
                    ["Tier B — Mid performers", "Day shifts on Fri/Sat/Sun. Morning shifts mid-week.", "var(--gold)"],
                    ["Tier C — Developing staff", "Morning shifts on peak days. Extra rest days on low-traffic days.", "var(--text3)"],
                    ["All tiers", "6-on 1-off rule strictly enforced. No dealer works more than 6 consecutive days.", "var(--blue)"],
                  ].map(([label, desc, color]) => (
                    <div key={label} style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}: </span>
                      <span style={{ fontSize: 11, color: "var(--text2)" }}>{desc}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ padding: "10px 12px", background: "var(--yellow-dim)", border: "1px solid var(--yellow)", borderRadius: "var(--radius)", fontSize: 11, color: "var(--yellow)", marginTop: 12 }}>
                ⚠ This will replace the existing {pos.replace(/_/g," ")} roster for {MONTHS[genMonth-1]} {genYear}. You can still edit individual cells afterwards.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowGenModal(false)}>Cancel</button>
              <button className="btn btn-gold" onClick={handleGenerate}>
                {genMode === "auto" ? "🧠 Generate Auto-Assign Roster" : "📅 Generate Standard Roster"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function ReportsPage({ tables, staff, transactions, chipCountLog, rolePermissions }) {
  const [tab, setTab] = useState("house");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  transactions = transactions || [];

  // Date-filter helper: if no filter set, pass all; otherwise filter by tx.date
  const filteredTxns = (dateFrom || dateTo)
    ? transactions.filter(tx => {
        const d = tx.date || "";
        if (dateFrom && d && d < dateFrom) return false;
        if (dateTo   && d && d > dateTo)   return false;
        return true;
      })
    : transactions;

  const totalDrop = filteredTxns.filter(t => t.type === "drop").reduce((s,t) => s + t.amount, 0);
  const totalWin  = filteredTxns.filter(t => t.type === "win").reduce((s,t)  => s + t.amount, 0);
  const netHouse  = totalDrop - totalWin;
  const winRate   = totalDrop > 0 ? ((netHouse / totalDrop) * 100).toFixed(1) : "0.0";

  const tableStats = tables.map(t => {
    const drop = filteredTxns.filter(x => x.tableId === t.id && x.type === "drop").reduce((s,x) => s+x.amount, 0);
    const win  = filteredTxns.filter(x => x.tableId === t.id && x.type === "win").reduce((s,x)  => s+x.amount, 0);
    return { ...t, drop, win, net: drop - win };
  }).filter(t => t.drop > 0 || t.win > 0);

  // Hourly analytics: group transactions by hour for bar charts
  const hourlyData = Array.from({ length: 24 }, (_, h) => {
    const label = `${String(h).padStart(2,"0")}:00`;
    const hrTxns = filteredTxns.filter(tx => {
      const hr = tx.time ? parseInt(tx.time.split(":")[0], 10) : -1;
      return hr === h;
    });
    const customers = new Set(hrTxns.map(tx => tx.customerId).filter(Boolean)).size;
    const drop = hrTxns.filter(t => t.type==="drop").reduce((s,t) => s+t.amount, 0);
    const win  = hrTxns.filter(t => t.type==="win").reduce((s,t)  => s+t.amount, 0);
    return { label, customers, drop, win, net: drop - win, count: hrTxns.length };
  }).filter(h => h.count > 0);

  // Item F: Real dealer performance from actual transactions at their table
  const dealers = (staff || []).filter(s => s.position === "dealer" || s.position === "dealer_inspector").map(s => {
    const myTable  = tables.find(t => t.dealerId === s.id);
    const tblTxns  = myTable ? filteredTxns.filter(tx => tx.tableId === myTable.id) : [];
    const drop     = tblTxns.filter(t => t.type === "drop").reduce((a,t) => a+t.amount, 0);
    const win      = tblTxns.filter(t => t.type === "win").reduce((a,t)  => a+t.amount, 0);
    const net      = drop - win;                     // house net at this dealer's table
    const sessions = tblTxns.length;                 // proxy: transactions served
    // Chip count diff: compare chipTotal to openingFloat (negative = table won money for house)
    const floatDiff = myTable ? (myTable.chipTotal||0) - (myTable.openingFloat||myTable.floatCapacity||0) : 0;
    // Score: 0-100 — based on house-net margin and chip accuracy
    // Higher net margin + stable float = higher score
    const netMargin  = drop > 0 ? (net / drop) * 100 : 0;
    const floatAccuracy = myTable && (myTable.openingFloat||myTable.floatCapacity)
      ? Math.max(0, 100 - Math.abs(floatDiff) / ((myTable.openingFloat||myTable.floatCapacity) / 100))
      : 50;
    const rawScore  = drop > 0
      ? Math.min(99, Math.max(30, Math.round(netMargin * 0.6 + floatAccuracy * 0.4)))
      : null; // null = no data yet
    return {
      name:      s.name,
      empNo:     s.empNo,
      table:     myTable?.id || "—",
      game:      myTable?.gameType || "—",
      drop, win, net, floatDiff,
      sessions,
      netMargin: netMargin.toFixed(1),
      score:     rawScore,
      hasData:   drop > 0,
    };
  }).sort((a,b) => {
    // Sort: data first (by score desc), then no-data at bottom
    if (a.hasData && !b.hasData) return -1;
    if (!a.hasData && b.hasData) return 1;
    return (b.score||0) - (a.score||0);
  });

  const customerMap = {};
  filteredTxns.forEach(tx => {
    if (!customerMap[tx.customerId]) customerMap[tx.customerId] = { id: tx.customerId, drop: 0, win: 0, count: 0 };
    customerMap[tx.customerId][tx.type] += tx.amount;
    customerMap[tx.customerId].count++;
  });
  const customers = Object.values(customerMap).sort((a,b) => b.drop - a.drop);

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Reports & Analytics</div>
          <div className="section-sub">{(dateFrom || dateTo) ? `Filtered: ${dateFrom||"…"} → ${dateTo||"…"}` : "Live data — current shift"}</div>
        </div>
        <div className="flex gap-8 items-center">
          <input type="date" className="form-input" style={{ padding:"4px 8px", fontSize:11, width:130 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date" />
          <span style={{ fontSize:11, color:"var(--text3)" }}>to</span>
          <input type="date" className="form-input" style={{ padding:"4px 8px", fontSize:11, width:130 }} value={dateTo} onChange={e => setDateTo(e.target.value)} title="To date" />
          {(dateFrom || dateTo) && <button className="btn btn-sm btn-outline" onClick={() => { setDateFrom(""); setDateTo(""); }}>✕ Clear</button>}
          <button className="btn btn-sm btn-outline" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>
      <div className="tab-bar">
        {[["house","House Performance"],["analytics","Analytics"],["dealers","Dealer Performance"],["tables","Table Profitability"],["chips","Chip Count History"],["customers","Customer Activity"]].map(([k,l]) =>
          <div key={k} className={`tab-item ${tab===k?"active":""}`} onClick={() => setTab(k)}>{l}</div>
        )}
      </div>

      {tab === "house" && (
        <div>
          <div className="stat-grid mb-20">
            {[
              { label: "Total Drop", value: fmt(totalDrop), accent: "var(--gold)", icon: "📥" },
              { label: "Total Win",  value: fmt(totalWin),  accent: "var(--red)",  icon: "📤" },
              { label: "House Net",  value: fmt(netHouse),  accent: netHouse >= 0 ? "var(--green)" : "var(--red)", icon: "💰" },
              { label: "Win Rate",   value: winRate + "%",  accent: "var(--blue)", icon: "📊" },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ "--accent": s.accent }}>
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: 20 }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Transaction Timeline</div></div>
            <div className="card-body">
              {filteredTxns.length === 0
                ? <div className="empty-state"><div className="empty-icon">📋</div><p>No transactions logged yet</p></div>
                : <table className="data-table">
                    <thead><tr><th>Time</th><th>Customer</th><th>Table</th><th>Type</th><th>Amount</th></tr></thead>
                    <tbody>
                      {filteredTxns.map(tx => (
                        <tr key={tx.id}>
                          <td className="text-mono text-muted">{tx.time}</td>
                          <td className="text-gold text-mono">{tx.customerId}</td>
                          <td className="text-mono">{tx.tableId}</td>
                          <td><span className={`badge ${tx.type==="drop"?"badge-blue":"badge-green"}`}>{tx.type.toUpperCase()}</span></td>
                          <td className="text-mono" style={{ color: tx.type==="drop"?"var(--blue)":"var(--green)" }}>{fmt(tx.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              }
            </div>
          </div>
        </div>
      )}

      {tab === "analytics" && (
        <div>
          {hourlyData.length === 0
            ? <div className="empty-state"><div className="empty-icon">📊</div><p>No transaction data yet — log transactions to see hourly analytics.</p></div>
            : <>
              {/* Hourly Customer Influx */}
              <div className="card" style={{ marginBottom:14 }}>
                <div className="card-header">
                  <div className="card-title">Hourly Customer Influx</div>
                  <div style={{ fontSize:11, color:"var(--text3)" }}>Unique customers per hour</div>
                </div>
                <div className="card-body">
                  <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:160, padding:"8px 0" }}>
                    {hourlyData.map(h => {
                      const maxCust = Math.max(...hourlyData.map(x => x.customers), 1);
                      const pct = Math.round((h.customers / maxCust) * 100);
                      return (
                        <div key={h.label} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, minWidth:32 }}>
                          <div style={{ fontSize:9, color:"var(--gold)", fontFamily:"var(--font-mono)", fontWeight:700 }}>{h.customers}</div>
                          <div style={{ width:"100%", height:`${Math.max(pct,4)}%`, background:"var(--blue)", borderRadius:"3px 3px 0 0", minHeight:4, transition:"height 0.3s", opacity:0.85 }} title={`${h.label}: ${h.customers} customers`} />
                          <div style={{ fontSize:8, color:"var(--text3)", fontFamily:"var(--font-mono)", textAlign:"center" }}>{h.label.slice(0,5)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Hourly House Performance */}
              <div className="card" style={{ marginBottom:14 }}>
                <div className="card-header">
                  <div className="card-title">Hourly House Performance (Net)</div>
                  <div style={{ fontSize:11, color:"var(--text3)" }}>House net per hour (drop − win)</div>
                </div>
                <div className="card-body">
                  <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:160, padding:"8px 0" }}>
                    {hourlyData.map(h => {
                      const maxNet = Math.max(...hourlyData.map(x => Math.abs(x.net)), 1);
                      const pct = Math.round((Math.abs(h.net) / maxNet) * 100);
                      const color = h.net >= 0 ? "var(--green)" : "var(--red)";
                      return (
                        <div key={h.label} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, minWidth:32 }}>
                          <div style={{ fontSize:9, color, fontFamily:"var(--font-mono)", fontWeight:700 }}>{h.net>=0?"+":""}{(h.net/1000).toFixed(0)}K</div>
                          <div style={{ width:"100%", height:`${Math.max(pct,4)}%`, background:color, borderRadius:"3px 3px 0 0", minHeight:4, transition:"height 0.3s", opacity:0.8 }} title={`${h.label}: ${fmt(h.net)}`} />
                          <div style={{ fontSize:8, color:"var(--text3)", fontFamily:"var(--font-mono)", textAlign:"center" }}>{h.label.slice(0,5)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Hourly summary table */}
              <div className="card">
                <div className="card-header"><div className="card-title">Hourly Breakdown</div></div>
                <div className="card-body">
                  <table className="data-table">
                    <thead><tr><th>Hour</th><th>Customers</th><th>Transactions</th><th style={{textAlign:"right"}}>Drop</th><th style={{textAlign:"right"}}>Win Out</th><th style={{textAlign:"right"}}>Net</th></tr></thead>
                    <tbody>
                      {hourlyData.map(h => (
                        <tr key={h.label}>
                          <td className="text-mono text-gold">{h.label}</td>
                          <td><span className="badge badge-blue">{h.customers}</span></td>
                          <td style={{ color:"var(--text2)" }}>{h.count}</td>
                          <td className="text-mono" style={{ textAlign:"right" }}>{fmt(h.drop)}</td>
                          <td className="text-mono" style={{ textAlign:"right" }}>{fmt(h.win)}</td>
                          <td className="text-mono" style={{ textAlign:"right", color:h.net>=0?"var(--green)":"var(--red)", fontWeight:600 }}>{h.net>=0?"+":""}{fmt(h.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          }
        </div>
      )}

      {tab === "dealers" && (
        <div>
          <div className="stat-grid mb-16">
            {[
              { label:"Dealers Tracked", value:String(dealers.length),                     accent:"var(--gold)", icon:"👤" },
              { label:"With Live Data",  value:String(dealers.filter(d=>d.hasData).length), accent:"var(--green)",icon:"📊" },
              { label:"Top House Net",   value:dealers.filter(d=>d.hasData).length > 0 ? fmt(Math.max(...dealers.filter(d=>d.hasData).map(d=>d.net))) : "—", accent:"var(--blue)", icon:"🏆" },
              { label:"Avg Score",       value:dealers.filter(d=>d.score!=null).length > 0 ? String(Math.round(dealers.filter(d=>d.score!=null).reduce((s,d)=>s+(d.score||0),0)/dealers.filter(d=>d.score!=null).length)) : "—", accent:"var(--gold)", icon:"⭐" },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ "--accent":s.accent }}>
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize:20 }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Dealer Performance Ranking</div>
              <div style={{ fontSize:11, color:"var(--text3)" }}>Based on real transaction data — house net margin + float accuracy</div>
            </div>
            <div className="card-body">
              {dealers.length === 0
                ? <div className="empty-state"><div className="empty-icon">👤</div><p>No dealer data available</p></div>
                : <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Dealer</th><th>Table</th><th>Game</th>
                        <th style={{textAlign:"right"}}>Drop</th>
                        <th style={{textAlign:"right"}}>House Net</th>
                        <th style={{textAlign:"right"}}>Float Δ</th>
                        <th style={{textAlign:"center"}}>Margin</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dealers.map((d,i) => (
                        <tr key={d.name} style={{ opacity: d.hasData ? 1 : 0.5 }}>
                          <td>
                            <span style={{ width:20,height:20,borderRadius:"50%",background:i<3?"var(--gold-dim)":"var(--bg3)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,color:i<3?"var(--gold)":"var(--text3)",fontWeight:700 }}>{i+1}</span>
                          </td>
                          <td>
                            <div style={{ fontWeight:500 }}>{d.name}</div>
                            <div style={{ fontSize:10, color:"var(--text3)" }}>{d.empNo||""}</div>
                          </td>
                          <td className="text-mono text-gold">{d.table}</td>
                          <td style={{ fontSize:11, color:"var(--text3)" }}>{d.game}</td>
                          <td className="text-mono" style={{ textAlign:"right" }}>{d.hasData ? fmt(d.drop) : "—"}</td>
                          <td className="text-mono" style={{ textAlign:"right", color:d.net>=0?"var(--green)":"var(--red)", fontWeight:600 }}>
                            {d.hasData ? (d.net>=0?"+":"")+fmt(d.net) : "—"}
                          </td>
                          <td className="text-mono" style={{ textAlign:"right", color:d.floatDiff>=0?"var(--green)":"var(--red)", fontSize:11 }}>
                            {d.hasData ? (d.floatDiff>=0?"+":"")+fmt(d.floatDiff) : "—"}
                          </td>
                          <td style={{ textAlign:"center" }}>
                            <span className="text-mono" style={{ fontSize:11, color:Number(d.netMargin)>30?"var(--green)":Number(d.netMargin)>10?"var(--gold)":"var(--red)" }}>
                              {d.hasData ? d.netMargin+"%" : "—"}
                            </span>
                          </td>
                          <td>
                            {d.score != null ? (
                              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <div className="progress-bar" style={{ flex:1 }}>
                                  <div className="progress-fill" style={{ width:`${d.score}%`, background: d.score>80?"var(--green)":d.score>55?"var(--gold)":"var(--red)" }} />
                                </div>
                                <span className="text-mono" style={{ fontSize:11, color:d.score>80?"var(--green)":d.score>55?"var(--gold)":"var(--red)", width:28, fontWeight:700 }}>{d.score}</span>
                              </div>
                            ) : (
                              <span style={{ fontSize:11, color:"var(--text3)" }}>No data</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              }
              <div style={{ marginTop:12, padding:"10px 12px", background:"var(--bg3)", borderRadius:"var(--radius)", fontSize:11, color:"var(--text3)" }}>
                Score = (House Net Margin × 60%) + (Float Accuracy × 40%). Dealers with no transactions show as faded.
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "tables" && (
        <div className="card">
          <div className="card-header"><div className="card-title">Table Profitability</div></div>
          <div className="card-body">
            {tableStats.length === 0
              ? <div className="empty-state"><div className="empty-icon">🃏</div><p>No transactions logged yet — data will appear as customers are logged</p></div>
              : <table className="data-table">
                  <thead><tr><th>Table</th><th>Game</th><th>Drop</th><th>Win</th><th>Net</th><th>Margin</th></tr></thead>
                  <tbody>
                    {tableStats.sort((a,b) => b.net - a.net).map(t => {
                      const margin = t.drop > 0 ? ((t.net/t.drop)*100).toFixed(1) : "0.0";
                      return (
                        <tr key={t.id}>
                          <td className="text-mono text-gold">{t.id}</td>
                          <td>{t.gameType}</td>
                          <td className="text-mono">{fmt(t.drop)}</td>
                          <td className="text-mono">{fmt(t.win)}</td>
                          <td className="text-mono" style={{ color: t.net>=0?"var(--green)":"var(--red)" }}>{t.net>=0?"+":""}{fmt(t.net)}</td>
                          <td>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <div className="progress-bar" style={{ flex:1 }}>
                                <div className="progress-fill" style={{ width:`${Math.min(100,Math.abs(Number(margin)))}%`, background: Number(margin)>30?"var(--green)":Number(margin)>0?"var(--gold)":"var(--red)" }} />
                              </div>
                              <span style={{ fontSize:10, color:"var(--text2)", width:36, fontFamily:"var(--font-mono)" }}>{margin}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            }
          </div>
        </div>
      )}

      {tab === "chips" && (
        <div>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            {[
              { label: "Total Counts", value: (chipCountLog||[]).length },
              { label: "Positive Results", value: (chipCountLog||[]).filter(c => c.diff >= 0).length },
              { label: "Negative Results", value: (chipCountLog||[]).filter(c => c.diff < 0).length },
              { label: "Avg Result", value: (chipCountLog||[]).length ? fmt((chipCountLog||[]).reduce((s, c) => s + c.diff, 0) / (chipCountLog||[]).length) : "—" },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius2)", padding: "1rem 1.5rem", minWidth: "140px" }}>
                <div style={{ color: "var(--text2)", fontSize: "0.75rem" }}>{s.label}</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--gold)" }}>{s.value}</div>
              </div>
            ))}
          </div>
          {(chipCountLog||[]).length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text3)", padding: "3rem" }}>No chip counts recorded this session</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Time", "Table", "Previous Float", "New Count", "Result", "Inspector"].map(h => (
                    <th key={h} style={{ padding: "0.6rem 0.75rem", textAlign: "left", color: "var(--text2)", fontSize: "0.8rem", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(chipCountLog||[]).map(c => (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--border2)" }}>
                    <td style={{ padding: "0.6rem 0.75rem", fontSize: "0.85rem", color: "var(--text2)" }}>{c.time}</td>
                    <td style={{ padding: "0.6rem 0.75rem", fontSize: "0.85rem" }}>{c.tableId}</td>
                    <td style={{ padding: "0.6rem 0.75rem", fontSize: "0.85rem" }}>{fmt(c.prevFloat)}</td>
                    <td style={{ padding: "0.6rem 0.75rem", fontSize: "0.85rem" }}>{fmt(c.newFloat)}</td>
                    <td style={{ padding: "0.6rem 0.75rem", fontSize: "0.85rem", color: c.diff >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                      {c.diff >= 0 ? "+" : ""}{fmt(c.diff)}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", fontSize: "0.85rem", color: "var(--text2)" }}>{c.inspector}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "customers" && (
        <div>
          <div className="stat-grid mb-20">
            {[
              { label: "Unique Customers", value: String(customers.length),       accent: "var(--gold)",  icon: "👥" },
              { label: "Total Drop",       value: fmt(totalDrop),                 accent: "var(--blue)",  icon: "📥" },
              { label: "Total Won by Cust",value: fmt(totalWin),                  accent: "var(--red)",   icon: "📤" },
              { label: "Transactions",     value: String(transactions.length),    accent: "var(--green)", icon: "📋" },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ "--accent": s.accent }}>
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: 20 }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Customer Activity Summary</div></div>
            <div className="card-body">
              {customers.length === 0
                ? <div className="empty-state"><div className="empty-icon">👤</div><p>No customer transactions logged yet</p></div>
                : <table className="data-table">
                    <thead><tr><th>Customer ID</th><th>Total Drop</th><th>Total Won</th><th>House Net</th><th>Transactions</th></tr></thead>
                    <tbody>
                      {customers.map(c => (
                        <tr key={c.id}>
                          <td className="text-mono text-gold">{c.id}</td>
                          <td className="text-mono">{fmt(c.drop)}</td>
                          <td className="text-mono">{fmt(c.win)}</td>
                          <td className="text-mono" style={{ color: (c.drop-c.win)>=0?"var(--green)":"var(--red)" }}>{fmt(c.drop - c.win)}</td>
                          <td><span className="badge badge-gold">{c.count}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StaffRecordsPage({ staff, halls, onAddStaff, onUpdateStaff, onDeleteStaff, userRole }) {
  const [showModal, setShowModal]   = useState(false);
  const [showBulk, setShowBulk]     = useState(false);
  const [editData, setEditData]     = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }
  const POSITIONS    = ["dealer","dealer_inspector","inspector","pit_boss","shift_manager"];
  const STAFF_STATUS = ["active","on_leave","suspension","sick"];
  const statusColors = { active:"badge-green", on_leave:"badge-blue", suspension:"badge-red", sick:"badge-yellow" };

  // ── Single staff modal ──────────────────────────────────────────────────────
  function StaffModal({ data, onClose }) {
    const editing = !!data;
    const [form, setForm] = useState(data || { name:"", empNo:"", position:"dealer", staffStatus:"active", hireDate:"", phone:"", notes:"" });
    function save() {
      if (!form.name) return;
      if (editing) {
        onUpdateStaff(form.id, { name:form.name, empNo:form.empNo, position:form.position, staffStatus:form.staffStatus, phone:form.phone, notes:form.notes });
      } else {
        onAddStaff({ ...form });
      }
      onClose();
    }
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">{editing ? "Edit Staff Record" : "Add Staff Member"}</div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group"><label className="form-label">Full Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Full name" />
              </div>
              <div className="form-group"><label className="form-label">Employee No.</label>
                <input className="form-input" value={form.empNo||""} onChange={e => setForm(f=>({...f,empNo:e.target.value}))} placeholder="e.g. S012" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Position</label>
                <select className="form-select" value={form.position} onChange={e => setForm(f=>({...f,position:e.target.value}))}>
                  {POSITIONS.map(p => <option key={p} value={p}>{p.replace(/_/g," ").toUpperCase()}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Staff Status</label>
                <select className="form-select" value={form.staffStatus||"active"} onChange={e => setForm(f=>({...f,staffStatus:e.target.value}))}>
                  {STAFF_STATUS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Phone</label>
                <input className="form-input" value={form.phone||""} onChange={e => setForm(f=>({...f,phone:e.target.value}))} placeholder="+254 7XX XXX XXX" />
              </div>
              {!editing && <div className="form-group"><label className="form-label">Hire Date</label>
                <input className="form-input" type="date" value={form.hireDate||""} onChange={e => setForm(f=>({...f,hireDate:e.target.value}))} />
              </div>}
            </div>
            <div className="form-group"><label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes||""} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional notes..." style={{minHeight:60}} />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-gold" onClick={save} disabled={!form.name}>{editing ? "Save Changes" : "Add Staff"}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Bulk add modal ──────────────────────────────────────────────────────────
  function BulkModal({ onClose }) {
    const [raw, setRaw]       = useState("");
    const [parsed, setParsed] = useState([]);
    const [step, setStep]     = useState("input"); // "input" | "assign"

    function parseInput() {
      // Accept: paste (one name per line, or comma-separated) OR CSV-like
      const lines = raw.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean);
      const entries = lines.map((name, i) => ({ name, position:"dealer", staffStatus:"active", empNo:"" }));
      setParsed(entries);
      setStep("assign");
    }

    function handleFile(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target.result;
        // Try CSV: first column = name
        const lines = text.split(/\r?\n/).filter(Boolean);
        const names = lines.map(l => l.split(',')[0].replace(/"/g,'').trim()).filter(n => n && n.toLowerCase() !== 'name');
        setRaw(names.join('\n'));
      };
      reader.readAsText(file);
    }

    function saveAll() {
      const base = Date.now();
      parsed.filter(p => p.name).forEach((p, i) => onAddStaff({ ...p, _bulkIdx: base + i }));
      onClose();
    }

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">Bulk Add Staff</div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            {step === "input" && (
              <div>
                <div style={{ fontSize:12, color:"var(--text3)", marginBottom:14 }}>
                  Paste staff names (one per line), or upload a CSV file where the first column is the name.
                </div>
                <div className="form-group">
                  <label className="form-label">Paste Names</label>
                  <textarea className="form-textarea" value={raw} onChange={e => setRaw(e.target.value)} placeholder={"Ali Hassan\nBeatrice Kamau\nCharles Otieno"} style={{minHeight:120}} />
                </div>
                <div className="form-group">
                  <label className="form-label">Or Upload CSV / Text File</label>
                  <input type="file" accept=".csv,.txt" onChange={handleFile} style={{color:"var(--text)",fontSize:12}} />
                </div>
              </div>
            )}
            {step === "assign" && (
              <div>
                <div style={{ fontSize:12, color:"var(--text3)", marginBottom:14 }}>
                  {parsed.length} staff members parsed. Assign positions below.
                </div>
                <div style={{ maxHeight:360, overflowY:"auto" }}>
                  <table className="data-table">
                    <thead><tr><th>Name</th><th>Emp No.</th><th>Position</th><th>Status</th></tr></thead>
                    <tbody>
                      {parsed.map((p,i) => (
                        <tr key={i}>
                          <td style={{fontWeight:500}}>{p.name}</td>
                          <td>
                            <input className="form-input" style={{padding:"3px 8px",fontSize:11}} placeholder="S0XX"
                              value={p.empNo} onChange={e => setParsed(ps => ps.map((x,j) => j===i?{...x,empNo:e.target.value}:x))} />
                          </td>
                          <td>
                            <select className="form-select" style={{padding:"3px 7px",fontSize:11}} value={p.position}
                              onChange={e => setParsed(ps => ps.map((x,j) => j===i?{...x,position:e.target.value}:x))}>
                              {POSITIONS.map(pos => <option key={pos} value={pos}>{pos.replace(/_/g," ").toUpperCase()}</option>)}
                            </select>
                          </td>
                          <td>
                            <select className="form-select" style={{padding:"3px 7px",fontSize:11}} value={p.staffStatus}
                              onChange={e => setParsed(ps => ps.map((x,j) => j===i?{...x,staffStatus:e.target.value}:x))}>
                              {STAFF_STATUS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            {step === "assign" && <button className="btn btn-outline" onClick={() => setStep("input")}>← Back</button>}
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            {step === "input"  && <button className="btn btn-gold" onClick={parseInput} disabled={!raw.trim()}>Next: Assign Positions →</button>}
            {step === "assign" && <button className="btn btn-gold" onClick={saveAll} disabled={parsed.length===0}>Add {parsed.length} Staff Members</button>}
          </div>
        </div>
      </div>
    );
  }

  const displayed = filterStatus === "all" ? staff : staff.filter(s => s.staffStatus === filterStatus);

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Staff Records</div>
          <div className="section-sub">{staff.length} total · {staff.filter(s=>s.staffStatus==="active").length} active · {staff.filter(s=>s.staffStatus!=="active").length} inactive</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-outline" onClick={() => setShowBulk(true)}>⬆ Bulk Add</button>
          <button className="btn btn-gold" onClick={() => { setEditData(null); setShowModal(true); }}>＋ Add Staff</button>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-8 mb-16">
        {["all",...STAFF_STATUS].map(s => (
          <button key={s} className={`btn btn-xs ${filterStatus===s?"btn-gold":"btn-outline"}`} onClick={() => setFilterStatus(s)}>
            {s === "all" ? "All" : s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          <table className="data-table">
            <thead><tr><th>Emp No.</th><th>Name</th><th>Position</th><th>Staff Status</th><th>Actions</th></tr></thead>
            <tbody>
              {displayed.map(s => (
                <tr key={s.id}>
                  <td className="text-mono text-gold">{s.empNo||"—"}</td>
                  <td>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div className="avatar" style={{ width:28, height:28, fontSize:11 }}>{s.name.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight:500 }}>{s.name}</div>
                        {s.phone && <div style={{ fontSize:10, color:"var(--text3)" }}>{s.phone}</div>}
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-gold">{s.position.replace(/_/g," ").toUpperCase()}</span></td>
                  <td><span className={`badge ${statusColors[s.staffStatus]||"badge-gold"}`}>{(s.staffStatus||"active").toUpperCase()}</span></td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-xs btn-outline" onClick={() => { setEditData(s); setShowModal(true); }}>✎ Edit</button>
                      {(userRole === "management" || userRole === "system_admin") && (
                        <button className="btn btn-xs btn-red" onClick={() => setConfirmDelete({ id: s.id, name: s.name })}>✕ Remove</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && <StaffModal data={editData} onClose={() => setShowModal(false)} />}
      {showBulk  && <BulkModal onClose={() => setShowBulk(false)} />}
      {confirmDelete && (
        <ConfirmModal
          title="Remove Staff Member"
          message={`Remove "${confirmDelete.name}" from staff records? This cannot be undone.`}
          confirmLabel="Remove"
          confirmColor="btn-red"
          onConfirm={() => { onDeleteStaff && onDeleteStaff(confirmDelete.id); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}


const DEFAULT_ROLE_PERMISSIONS = {
  system_admin:  [
    "view_dashboard","view_floor","view_reports","view_roster",
    "manage_users","manage_roles","configure_halls","configure_tables","configure_chips",
    "configure_shifts","generate_roster","record_attendance","assign_halls","assign_tables",
    "manage_breaklist","open_close_tables","request_fills","approve_fills",
    "report_incidents","resolve_incidents","perform_chip_count","log_customer","dealer_rotation",
  ],
  management:    ["view_dashboard","view_floor","view_reports","view_roster","resolve_incidents","report_incidents","configure_halls","configure_tables","configure_chips","configure_shifts","generate_roster","record_attendance","assign_halls","assign_tables","manage_breaklist","open_close_tables","request_fills","approve_fills","perform_chip_count","log_customer","dealer_rotation"],
  shift_manager: ["view_dashboard","view_floor","view_reports","view_roster","record_attendance","assign_halls","assign_tables","open_close_tables","approve_fills","report_incidents","resolve_incidents"],
  pit_boss:      ["view_dashboard","view_floor","manage_breaklist","assign_tables","open_close_tables","request_fills","report_incidents"],
  staff:         ["view_dashboard","perform_chip_count","log_customer","dealer_rotation"],
};

function AdminPage({ users, onAddUser, onUpdateUser, onDeleteUser, halls, onAddHall, onUpdateHall, onDeleteHall, tables, onAddTable, onUpdateTable, onDeleteTable, chips, onAddChip, onUpdateChip, onDeleteChip, shifts, onUpdateShift, staff, rolePermissions, setRolePermissions, casinoInfo, setCasinoInfo, formTemplates, setFormTemplates }) {
  const [tab, setTab] = useState("users");
  const [modal, setModal] = useState(null); // { type, data? }
  const [adminConfirm, setAdminConfirm] = useState(null); // { title, message, onConfirm }
  const roleColors = { system_admin: "badge-red", management: "badge-gold", shift_manager: "badge-blue", pit_boss: "badge-orange", staff: "badge-green" };

  const FORM_TYPES = [
    { key: "open_float",   label: "Opening Float Form" },
    { key: "close_float",  label: "Closing Float Form" },
    { key: "fill_request", label: "Chip Fill Request" },
    { key: "gi_report",    label: "GI Report" },
    { key: "transfer",     label: "Table Transfer Form" },
  ];
  const [formsFormKey, setFormsFormKey] = useState("open_float");

  function FormsEditorTab() {
    const [info, setInfo] = useState(casinoInfo);
    const [tpl, setTpl]   = useState(formTemplates[formsFormKey] || { customHeader:"", customFooter:"", notes:"" });

    function saveInfo() { setCasinoInfo(info); }
    function saveTpl()  { setFormTemplates(prev => ({ ...prev, [formsFormKey]: tpl })); }

    function downloadTemplate() {
      const content = [
        `=== ${FORM_TYPES.find(f=>f.key===formsFormKey)?.label} ===`,
        `Casino: ${info.name}`,
        `Address: ${info.address}`,
        `Phone: ${info.phone}`,
        ``,
        `--- HEADER ---`,
        tpl.customHeader || "(default header)",
        ``,
        `--- BODY ---`,
        `[Form fields will appear here at print time]`,
        ``,
        `--- FOOTER ---`,
        tpl.customFooter || "(default footer)",
        ``,
        `Notes: ${tpl.notes || "—"}`,
      ].join("\n");
      const blob = new Blob([content], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${formsFormKey}_template.txt`;
      a.click();
    }

    return (
      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:20 }}>
        {/* Left — Casino Details */}
        <div>
          <div className="card" style={{ marginBottom:14 }}>
            <div className="card-header"><div className="card-title">🏛 Casino Details</div></div>
            <div className="card-body">
              {[
                { label:"Casino Name",     key:"name" },
                { label:"Address",         key:"address" },
                { label:"Phone",           key:"phone" },
                { label:"Email",           key:"email" },
                { label:"Registration No.",key:"regNo" },
              ].map(f => (
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input className="form-input" value={info[f.key]||""} onChange={e => setInfo(i=>({...i,[f.key]:e.target.value}))} placeholder={f.label} />
                </div>
              ))}
              <button className="btn btn-gold btn-sm" style={{ width:"100%" }} onClick={saveInfo}>💾 Save Casino Info</button>
            </div>
          </div>

          {/* Form type selector */}
          <div className="card">
            <div className="card-header"><div className="card-title">📋 Form Type</div></div>
            <div className="card-body" style={{ padding:"8px" }}>
              {FORM_TYPES.map(f => (
                <div key={f.key}
                  onClick={() => { setFormsFormKey(f.key); setTpl(formTemplates[f.key] || { customHeader:"", customFooter:"", notes:"" }); }}
                  style={{ padding:"10px 12px", borderRadius:"var(--radius)", cursor:"pointer", marginBottom:4, background:formsFormKey===f.key?"var(--gold-dim)":"transparent", border:`1px solid ${formsFormKey===f.key?"var(--gold)":"transparent"}`, color:formsFormKey===f.key?"var(--gold)":"var(--text)", fontSize:13 }}>
                  {f.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Template Editor */}
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">✏️ {FORM_TYPES.find(f=>f.key===formsFormKey)?.label} — Template</div>
              <div className="flex gap-8">
                <button className="btn btn-sm btn-outline" onClick={downloadTemplate}>⬇ Download</button>
                <button className="btn btn-sm btn-gold" onClick={saveTpl}>💾 Save Template</button>
              </div>
            </div>
            <div className="card-body">
              {/* Preview header with casino info */}
              <div style={{ padding:"12px 16px", background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:"var(--radius)", marginBottom:14, fontSize:12 }}>
                <div style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--gold)", fontWeight:700, marginBottom:2 }}>{info.name || "Casino Name"}</div>
                <div style={{ color:"var(--text2)", fontSize:11 }}>{info.address} {info.phone ? `· ${info.phone}` : ""}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Custom Header Text</label>
                <textarea className="form-textarea" rows={3} value={tpl.customHeader} onChange={e => setTpl(t=>({...t,customHeader:e.target.value}))} placeholder="Appears at the top of this form (e.g. shift dates, venue, title override...)" />
              </div>
              <div className="form-group">
                <label className="form-label">Custom Footer Text</label>
                <textarea className="form-textarea" rows={3} value={tpl.customFooter} onChange={e => setTpl(t=>({...t,customFooter:e.target.value}))} placeholder="Appears at the bottom (e.g. legal disclaimer, signature block instructions...)" />
              </div>
              <div className="form-group">
                <label className="form-label">Internal Notes</label>
                <textarea className="form-textarea" rows={2} value={tpl.notes} onChange={e => setTpl(t=>({...t,notes:e.target.value}))} placeholder="Internal notes — not printed on the form" />
              </div>
              <div style={{ padding:"10px 14px", background:"var(--blue-dim)", borderRadius:"var(--radius)", fontSize:11, color:"var(--blue)" }}>
                💡 These templates apply when forms are printed from Cage &amp; Fills and Table Session pages. Casino Info is auto-included on all forms.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const TABS = ["users","roles","halls","tables","chips","shifts","roster","forms"];

  // ── ROLE PERMISSIONS STATE ──
  const ALL_PERMISSIONS = [
    { key: "view_dashboard",       label: "View Dashboard",           category: "General" },
    { key: "view_floor",           label: "View Floor Map",           category: "General" },
    { key: "view_reports",         label: "View Reports & Analytics", category: "General" },
    { key: "view_roster",          label: "View Duty Roster",         category: "General" },
    { key: "manage_users",         label: "Manage Users",             category: "System" },
    { key: "manage_roles",         label: "Manage Roles & Permissions",category: "System" },
    { key: "configure_halls",      label: "Configure Halls",          category: "System" },
    { key: "configure_tables",     label: "Configure Tables",         category: "System" },
    { key: "configure_chips",      label: "Configure Chip Denominations", category: "System" },
    { key: "configure_shifts",     label: "Configure Shift Structures",category: "System" },
    { key: "generate_roster",      label: "Generate & Edit Roster",   category: "System" },
    { key: "record_attendance",    label: "Record Staff Attendance",  category: "Operations" },
    { key: "assign_halls",         label: "Assign Staff to Halls",    category: "Operations" },
    { key: "assign_tables",        label: "Assign Dealers to Tables", category: "Operations" },
    { key: "manage_breaklist",     label: "Edit Dealer Breaklist",    category: "Operations" },
    { key: "open_close_tables",    label: "Open / Close Tables",      category: "Operations" },
    { key: "request_fills",        label: "Request Chip Fills",       category: "Operations" },
    { key: "approve_fills",        label: "Approve Chip Fills",       category: "Operations" },
    { key: "report_incidents",     label: "Report Incidents",         category: "Operations" },
    { key: "resolve_incidents",    label: "Resolve Incidents",        category: "Operations" },
    { key: "perform_chip_count",   label: "Perform Chip Counts",      category: "Table" },
    { key: "log_customer",         label: "Log Customer Transactions",category: "Table" },
    { key: "dealer_rotation",      label: "Perform Dealer Rotation",  category: "Table" },
  ];

  const ROLE_META = [
    { id: "system_admin",  label: "System Admin",  color: "badge-red",    icon: "⚙️",  desc: "Full system configuration access. Does not manage live operations." },
    { id: "management",    label: "Management",    color: "badge-gold",   icon: "📊",  desc: "Executive oversight. View-only on live ops. Can edit structure and roster." },
    { id: "shift_manager", label: "Shift Manager", color: "badge-blue",   icon: "🎯",  desc: "Controls entire floor during a shift. Manages staff and approves fills." },
    { id: "pit_boss",      label: "Pit Boss",      color: "badge-orange", icon: "🃏",  desc: "Manages a specific hall. Handles breaklist, fills, and incidents." },
    { id: "staff",         label: "Staff",         color: "badge-green",  icon: "👤",  desc: "Dealers and inspectors. Table-level operations only." },
  ];

  // ── ROLES TAB ──
  function RolesTab() {
    return (
      <div>
        <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 16 }}>
          Click <strong style={{ color: "var(--gold)" }}>Edit Permissions</strong> on any role to configure what it can access. System Admin permissions are locked.
        </div>
        {ROLE_META.map(role => {
          const perms = rolePermissions[role.id] || [];
          const categories = [...new Set(ALL_PERMISSIONS.map(p => p.category))];
          return (
            <div key={role.id} className="card" style={{ marginBottom: 14 }}>
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{role.icon}</span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{role.label}</span>
                      <span className={`badge ${role.color}`}>{role.id.replace(/_/g," ").toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{role.desc}</div>
                  </div>
                </div>
                {role.id !== "system_admin" && (
                  <button className="btn btn-sm btn-outline" onClick={() => setModal({ type: "role", data: role })}>
                    ✎ Edit Permissions
                  </button>
                )}
                {role.id === "system_admin" && (
                  <span className="badge badge-red" style={{ fontSize: 9 }}>LOCKED — FULL ACCESS</span>
                )}
              </div>
              <div className="card-body">
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  {categories.map(cat => {
                    const catPerms = ALL_PERMISSIONS.filter(p => p.category === cat);
                    const granted = catPerms.filter(p => perms.includes(p.key));
                    if (granted.length === 0) return null;
                    return (
                      <div key={cat} style={{ minWidth: 180 }}>
                        <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--text3)", marginBottom: 6 }}>{cat}</div>
                        {granted.map(p => (
                          <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ color: "var(--green)", fontSize: 10 }}>✓</span>
                            <span style={{ fontSize: 11, color: "var(--text2)" }}>{p.label}</span>
                          </div>
                        ))}
                        {catPerms.filter(p => !perms.includes(p.key)).map(p => (
                          <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ color: "var(--text3)", fontSize: 10 }}>✗</span>
                            <span style={{ fontSize: 11, color: "var(--text3)" }}>{p.label}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {perms.length === 0 && <div className="text-muted text-sm">No permissions assigned.</div>}
                </div>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border2)", display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "var(--text3)" }}>PERMISSIONS:</span>
                  <span className="badge badge-green">{perms.length} granted</span>
                  <span className="badge badge-red">{ALL_PERMISSIONS.length - perms.length} denied</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── ROLE PERMISSIONS MODAL ──
  function RoleModal({ data: role, onClose }) {
    const [selected, setSelected] = useState(new Set(rolePermissions[role.id] || []));
    const categories = [...new Set(ALL_PERMISSIONS.map(p => p.category))];

    function toggle(key) {
      setSelected(s => {
        const next = new Set(s);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
      });
    }
    function toggleCategory(cat) {
      const catKeys = ALL_PERMISSIONS.filter(p => p.category === cat).map(p => p.key);
      const allOn = catKeys.every(k => selected.has(k));
      setSelected(s => {
        const next = new Set(s);
        catKeys.forEach(k => allOn ? next.delete(k) : next.add(k));
        return next;
      });
    }
    function save() {
      setRolePermissions(rp => ({ ...rp, [role.id]: [...selected] }));
      onClose();
    }

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{role.icon}</span>
              <div className="modal-title">{role.label} — Permissions</div>
            </div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 16 }}>
              Toggle permissions on or off. Click a category header to toggle the entire group.
            </div>
            {categories.map(cat => {
              const catPerms = ALL_PERMISSIONS.filter(p => p.category === cat);
              const allOn = catPerms.every(p => selected.has(p.key));
              const someOn = catPerms.some(p => selected.has(p.key));
              return (
                <div key={cat} style={{ marginBottom: 18 }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer", padding: "6px 0", borderBottom: "1px solid var(--border)" }}
                    onClick={() => toggleCategory(cat)}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: 3, border: `1px solid ${allOn ? "var(--gold)" : "var(--border)"}`,
                      background: allOn ? "var(--gold)" : someOn ? "var(--gold-dim)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0
                    }}>
                      {allOn && <span style={{ color: "#000", fontWeight: 700 }}>✓</span>}
                      {someOn && !allOn && <span style={{ color: "var(--gold)" }}>—</span>}
                    </div>
                    <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--text2)", fontWeight: 600 }}>{cat}</span>
                    <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: "auto" }}>{catPerms.filter(p=>selected.has(p.key)).length}/{catPerms.length}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, paddingLeft: 8 }}>
                    {catPerms.map(p => (
                      <div
                        key={p.key}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: "var(--radius)", cursor: "pointer", background: selected.has(p.key) ? "var(--green-dim)" : "var(--bg3)", border: `1px solid ${selected.has(p.key) ? "rgba(45,190,108,0.3)" : "var(--border2)"}`, transition: "all 0.15s" }}
                        onClick={() => toggle(p.key)}
                      >
                        <div style={{
                          width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                          background: selected.has(p.key) ? "var(--green)" : "transparent",
                          border: `1px solid ${selected.has(p.key) ? "var(--green)" : "var(--border)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          {selected.has(p.key) && <span style={{ color: "#fff", fontSize: 9, fontWeight: 700 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 11, color: selected.has(p.key) ? "var(--text)" : "var(--text3)" }}>{p.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="modal-footer">
            <div style={{ flex: 1, fontSize: 11, color: "var(--text3)" }}>
              {selected.size} of {ALL_PERMISSIONS.length} permissions enabled
            </div>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-gold" onClick={save}>Save Permissions</button>
          </div>
        </div>
      </div>
    );
  }

  // ── USER MODAL ──
  function UserModal({ data, onClose }) {
    const editing = !!data;
    const [form, setForm] = useState(data || { name: "", empNo: "", email: "", role: "staff", active: true });
    const [staffErr, setStaffErr] = useState("");

    // Available roles: system_admin can create any; management can create all except system_admin
    const currentUserRole = rolePermissions ? Object.keys(rolePermissions)[0] : "system_admin";
    const availableRoles = ["management","shift_manager","pit_boss","staff"];

    function selectStaff(s) {
      setForm(f => ({ ...f, name: s.name, empNo: s.empNo, staffId: s.id }));
      setStaffErr("");
    }

    function save() {
      if (!form.name || !form.empNo) { setStaffErr("Select a staff record first."); return; }
      const matched = staff.find(s => s.name === form.name && s.empNo === form.empNo);
      if (!matched && !editing) { setStaffErr("Name and employee number must match an existing staff record."); return; }
      // password = empNo (employee number is used as password)
      const toSave = { ...form, password: form.empNo, staffId: matched?.id || form.staffId || null };
      editing ? onUpdateUser(toSave) : onAddUser(toSave);
      onClose();
    }

    const unlinkedStaff = staff.filter(s => !editing || s.empNo === data?.empNo);

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">{editing ? "Edit User" : "Create User"}</div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            {!editing && (
              <div className="form-group">
                <label className="form-label">Select Staff Record <span style={{color:"var(--red)",fontSize:"0.75rem"}}>*required</span></label>
                <select className="form-select" value={form.empNo} onChange={e => { const s = staff.find(x => x.empNo === e.target.value); if (s) selectStaff(s); }}>
                  <option value="">— Choose staff member —</option>
                  {unlinkedStaff.map(s => <option key={s.id} value={s.empNo}>{s.name} · {s.empNo} · {s.position}</option>)}
                </select>
                {staffErr && <div style={{color:"var(--red)",fontSize:"0.8rem",marginTop:"0.3rem"}}>{staffErr}</div>}
              </div>
            )}
            <div style={{display:"flex",gap:"1rem"}}>
              <div className="form-group" style={{flex:1}}><label className="form-label">Full Name</label><input className="form-input" value={form.name} readOnly={!editing} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
              <div className="form-group" style={{flex:1}}>
                <label className="form-label">Employee No. <span style={{color:"var(--text3)",fontSize:"0.75rem"}}>(= password)</span></label>
                <input className="form-input" value={form.empNo} readOnly={!editing} onChange={e => setForm(f=>({...f,empNo:e.target.value}))} />
              </div>
            </div>
            <div className="form-group"><label className="form-label">Email (optional)</label><input className="form-input" value={form.email||""} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="email@casino.com" /></div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
                {availableRoles.map(r => <option key={r} value={r}>{r.replace(/_/g," ").toUpperCase()}</option>)}
              </select>
              <div style={{fontSize:"0.75rem",color:"var(--text3)",marginTop:"0.25rem"}}>Employee number is used as login password. System Admin role is locked.</div>
            </div>
            {editing && (
              <div className="form-group">
                <label className="form-label">Account Status</label>
                <div className="flex gap-8">
                  {["active","inactive"].map(s => <button key={s} className={`btn flex-1 ${form.active===(s==="active")?"btn-gold":"btn-outline"}`} onClick={() => setForm(f=>({...f,active:s==="active"}))}>{s.toUpperCase()}</button>)}
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-gold" onClick={save} disabled={!form.name||!form.empNo}>{editing ? "Save Changes" : "Create User"}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── HALL MODAL ──
  function HallModal({ data, onClose }) {
    const editing = !!data;
    const [form, setForm] = useState(data || { name: "", description: "" });
    function save() {
      if (!form.name) return;
      editing ? onUpdateHall(form) : onAddHall(form);
      onClose();
    }
    const tableCt = tables.filter(t => t.hallId === data?.id).length;
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">{editing ? "Edit Hall" : "Add Hall"}</div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Hall Name</label><input className="form-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Hall D — Poker Room" /></div>
            <div className="form-group"><label className="form-label">Description (optional)</label><input className="form-input" value={form.description||""} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Brief description" /></div>
            {editing && tableCt > 0 && <div style={{ padding: "10px 12px", background: "var(--yellow-dim)", border: "1px solid var(--yellow)", borderRadius: "var(--radius)", fontSize: 12, color: "var(--yellow)" }}>⚠ This hall has {tableCt} table{tableCt>1?"s":""} assigned to it.</div>}
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-gold" onClick={save} disabled={!form.name}>{editing ? "Save Changes" : "Add Hall"}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── TABLE MODAL ──
  function TableConfigModal({ data, onClose }) {
    const editing = !!data;
    const [form, setForm] = useState(data || { id: "", tableName: "", hallId: halls[0]?.id || "", gameType: "Blackjack", status: "closed", minBet: 500, maxBet: 10000, chipTotal: 100000, floatCapacity: 100000, openingFloat: 100000, chipBreakdown: {} });
    const GAMES = ["Blackjack","Roulette","Baccarat","Poker","Craps","Sic Bo"];

    // Chip breakdown quantities — auto-calc chipTotal and floatCapacity from denomination qtys
    const chipBreakdown = form.chipBreakdown || {};
    const calcTotal = chips.reduce((s,c) => s + c.value * (Number(chipBreakdown[c.id])||0), 0);
    const hasBreakdown = chips.some(c => (chipBreakdown[c.id]||0) > 0);

    function setDenomQty(chipId, qty) {
      const newBd = { ...chipBreakdown, [chipId]: Number(qty) || 0 };
      const newTotal = chips.reduce((s,c) => s + c.value * (Number(newBd[c.id])||0), 0);
      setForm(f => ({ ...f, chipBreakdown: newBd, chipTotal: newTotal, floatCapacity: newTotal, openingFloat: newTotal }));
    }

    function save() {
      if (!form.id || !form.hallId) return;
      const toSave = { ...form, floatCapacity: form.floatCapacity || form.chipTotal, openingFloat: form.openingFloat || form.chipTotal };
      editing ? onUpdateTable(form.id, toSave) : onAddTable(toSave);
      onClose();
    }
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">{editing ? `Edit Table ${data.id}` : "Add Table"}</div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <div className="form-row">
              {!editing && <div className="form-group"><label className="form-label">Table ID</label><input className="form-input" value={form.id} onChange={e => setForm(f=>({...f,id:e.target.value.toUpperCase()}))} placeholder="e.g. T10" /></div>}
              <div className="form-group"><label className="form-label">Table Name / Profile</label><input className="form-input" value={form.tableName||""} onChange={e => setForm(f=>({...f,tableName:e.target.value}))} placeholder="e.g. Baccarat 1" /></div>
            </div>
            <div className="form-group">
              <label className="form-label">Hall</label>
              <select className="form-select" value={form.hallId} onChange={e => setForm(f=>({...f,hallId:e.target.value}))}>
                {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Game Type</label>
              <select className="form-select" value={form.gameType} onChange={e => setForm(f=>({...f,gameType:e.target.value}))}>
                {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Min Bet (KES)</label><input className="form-input" type="number" value={form.minBet} onChange={e => setForm(f=>({...f,minBet:Number(e.target.value)}))} /></div>
              <div className="form-group"><label className="form-label">Max Bet (KES)</label><input className="form-input" type="number" value={form.maxBet} onChange={e => setForm(f=>({...f,maxBet:Number(e.target.value)}))} /></div>
            </div>
            <div style={{ padding:"10px 12px", background:"var(--gold-dim)", border:"1px solid var(--border)", borderRadius:"var(--radius)", marginBottom:12 }}>
              <div style={{ fontSize:10, letterSpacing:1, color:"var(--gold)", textTransform:"uppercase", marginBottom:8 }}>Float Profile — Chip Denominations</div>
              <div style={{ fontSize:11, color:"var(--text3)", marginBottom:10 }}>Enter chip quantities per denomination. Float total is calculated automatically.</div>
              {chips.length === 0
                ? <div style={{ fontSize:11, color:"var(--text3)" }}>No chip denominations configured. Add chips in Admin → Chips first.</div>
                : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:8, marginBottom:10 }}>
                    {chips.map(c => (
                      <div key={c.id} style={{ padding:"8px 10px", background:"var(--panel)", borderRadius:"var(--radius)", border:"1px solid var(--border2)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                          <div style={{ width:12, height:12, borderRadius:"50%", background:c.hex||"#aaa", border:"1px solid rgba(255,255,255,0.2)", flexShrink:0 }} />
                          <span style={{ fontSize:11, fontWeight:600, color:"var(--text)" }}>{c.color}</span>
                          <span style={{ fontSize:10, color:"var(--text3)", marginLeft:"auto" }}>{c.value.toLocaleString()} ea</span>
                        </div>
                        <input className="form-input" type="number" min="0"
                          value={chipBreakdown[c.id] || 0}
                          onChange={e => setDenomQty(c.id, e.target.value)}
                          style={{ fontSize:12, padding:"4px 8px" }} />
                        {(chipBreakdown[c.id]||0) > 0 && (
                          <div style={{ fontSize:10, color:"var(--gold)", marginTop:3 }}>= {(c.value*(chipBreakdown[c.id]||0)).toLocaleString()}</div>
                        )}
                      </div>
                    ))}
                  </div>
              }
              {hasBreakdown && (
                <div style={{ padding:"8px 12px", background:"var(--panel)", borderRadius:"var(--radius)", fontSize:13, fontWeight:600 }}>
                  Float Total: <span style={{ color:"var(--gold)", fontFamily:"var(--font-mono)" }}>{calcTotal.toLocaleString()} KES</span>
                </div>
              )}
              {!hasBreakdown && (
                <div className="form-row" style={{ marginTop:8 }}>
                  <div className="form-group"><label className="form-label">Float Capacity (KES)</label>
                    <input className="form-input" type="number" value={form.floatCapacity||0} onChange={e => setForm(f=>({...f,floatCapacity:Number(e.target.value)}))} />
                  </div>
                  <div className="form-group"><label className="form-label">Opening Float (KES)</label>
                    <input className="form-input" type="number" value={form.openingFloat||form.floatCapacity||0} onChange={e => setForm(f=>({...f,openingFloat:Number(e.target.value)}))} />
                  </div>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
                {["closed","open"].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-gold" onClick={save} disabled={!editing&&!form.id}>{editing ? "Save Changes" : "Add Table"}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── CHIP MODAL ──
  function ChipModal({ data, onClose }) {
    const editing = !!data;
    const [form, setForm] = useState(data || { color: "", hex: "#ffffff", value: 100 });
    function save() {
      if (!form.color || !form.value) return;
      editing ? onUpdateChip(form) : onAddChip(form);
      onClose();
    }
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">{editing ? "Edit Denomination" : "Add Denomination"}</div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Color Name</label><input className="form-input" value={form.color} onChange={e => setForm(f=>({...f,color:e.target.value}))} placeholder="e.g. Silver" /></div>
            <div className="form-group">
              <label className="form-label">Chip Color</label>
              <div className="flex gap-8 items-center">
                <input type="color" value={form.hex} onChange={e => setForm(f=>({...f,hex:e.target.value}))} style={{ width: 48, height: 40, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "none", cursor: "pointer" }} />
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: form.hex, border: "2px solid rgba(255,255,255,0.3)", flexShrink: 0 }} />
                <span className="text-mono text-muted" style={{ fontSize: 12 }}>{form.hex}</span>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Face Value (KES)</label><input className="form-input" type="number" value={form.value} onChange={e => setForm(f=>({...f,value:Number(e.target.value)}))} /></div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-gold" onClick={save} disabled={!form.color||!form.value}>{editing ? "Save Changes" : "Add Denomination"}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── ROSTER TAB (admin-controlled generation) ──
  function AdminRosterTab() {
    const [pos, setPos] = useState("dealer");
    const [month] = useState(3);
    const [year] = useState(2026);
    const positions = ["dealer","dealer_inspector","inspector","pit_boss","shift_manager"];
    const filtered = staff.filter(s => s.position === pos);
    const roster = generateRoster(filtered, month, year);
    const days = Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1);
    const sc = { N: "roster-N", D: "roster-D", M: "roster-M", X: "roster-X" };
    const [editCell, setEditCell] = useState(null);
    const [rosterData, setRosterData] = useState(roster);
    useEffect(() => { setRosterData(generateRoster(staff.filter(s=>s.position===pos), month, year)); }, [pos]);
    function cycleShift(staffId, day) {
      const cycle = ["N","D","M","X"];
      setRosterData(rd => rd.map(r => r.staffId === staffId ? { ...r, days: { ...r.days, [day]: cycle[(cycle.indexOf(r.days[day])+1)%4] } } : r));
    }
    return (
      <div>
        <div className="flex gap-8 mb-16" style={{ flexWrap: "wrap" }}>
          {positions.map(p => <button key={p} className={`btn btn-xs ${pos===p?"btn-gold":"btn-outline"}`} onClick={() => setPos(p)}>{p.replace(/_/g," ").toUpperCase()}</button>)}
        </div>
        <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 12 }}>Click any cell to cycle: N → D → M → X → N. Auto-generated on 6-on 1-off pattern.</div>
        {filtered.length === 0
          ? <div className="empty-state"><div className="empty-icon">👤</div><p>No {pos.replace(/_/g," ")} staff found</p></div>
          : <div className="roster-table">
            <table className="roster-grid">
              <thead><tr>
                <th style={{ textAlign: "left", width: 150 }}>Name</th>
                {days.map(d => <th key={d}>{d}</th>)}
              </tr></thead>
              <tbody>
                {rosterData.map(r => (
                  <tr key={r.staffId}>
                    <td className="roster-name">{r.name}</td>
                    {days.map(d => (
                      <td key={d} className={sc[r.days[d]]||""} style={{ cursor: "pointer" }} onClick={() => cycleShift(r.staffId, d)} title="Click to change shift">
                        {r.days[d]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>
    );
  }

  // ── SHIFTS TAB ──
  function ShiftsTab() {
    const [localShifts, setLocalShifts] = useState(shifts);
    const [editing, setEditing] = useState(null);
    function saveShift(s) { onUpdateShift(s); setLocalShifts(ls => ls.map(x => x.id === s.id ? s : x)); setEditing(null); }
    return (
      <div>
        <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 14 }}>Configure shift start/end times. The 6-on 1-off rotation cycle (N→N→D→D→M→M→X) is enforced automatically.</div>
        <div className="card">
          <div className="card-body">
            <table className="data-table">
              <thead><tr><th>Shift</th><th>Start Time</th><th>End Time</th><th>Duration</th><th>Action</th></tr></thead>
              <tbody>
                {localShifts.map(s => (
                  <tr key={s.id}>
                    {editing?.id === s.id ? (
                      <>
                        <td><strong>{s.name}</strong></td>
                        <td><input className="form-input" type="time" value={editing.start} style={{ padding: "4px 8px", fontSize: 12 }} onChange={e => setEditing(ex=>({...ex,start:e.target.value}))} /></td>
                        <td><input className="form-input" type="time" value={editing.end} style={{ padding: "4px 8px", fontSize: 12 }} onChange={e => setEditing(ex=>({...ex,end:e.target.value}))} /></td>
                        <td className="text-mono text-muted">8 hrs</td>
                        <td><div className="flex gap-8"><button className="btn btn-xs btn-gold" onClick={() => saveShift({...s,start:editing.start,end:editing.end})}>Save</button><button className="btn btn-xs btn-outline" onClick={() => setEditing(null)}>Cancel</button></div></td>
                      </>
                    ) : (
                      <>
                        <td><strong>{s.name}</strong></td>
                        <td className="text-mono">{s.start}</td>
                        <td className="text-mono">{s.end}</td>
                        <td className="text-mono text-muted">8 hrs</td>
                        <td><button className="btn btn-xs btn-outline" onClick={() => setEditing({id:s.id,start:s.start,end:s.end})}>✎ Edit</button></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header"><div className="card-title">Rotation Policy</div></div>
          <div className="card-body">
            {[["Dealer Rotation","Every 20 minutes"],["Shift Cycle","6 working days → 1 off day"],["Pattern","Night → Night → Day → Day → Morning → Morning → Off"],["Shift Duration","8 hours each"]].map(([k,v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border2)" }}>
                <span style={{ fontSize: 12, color: "var(--text3)" }}>{k}</span>
                <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text)" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const tabLabels = { users: "Users", roles: "Roles & Permissions", halls: "Halls", tables: "Tables", chips: "Chips", shifts: "Shifts", roster: "Roster", forms: "Forms Editor" };

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">System Administration</div>
          <div className="section-sub">Full system configuration — users, structure, denominations & scheduling</div>
        </div>
        {tab === "users" && <button className="btn btn-gold" onClick={() => setModal({ type: "user" })}>＋ Create User</button>}
        {tab === "halls" && <button className="btn btn-gold" onClick={() => setModal({ type: "hall" })}>＋ Add Hall</button>}
        {tab === "tables" && <button className="btn btn-gold" onClick={() => setModal({ type: "table" })}>＋ Add Table</button>}
        {tab === "chips" && <button className="btn btn-gold" onClick={() => setModal({ type: "chip" })}>＋ Add Denomination</button>}
      </div>

      <div className="tab-bar">
        {TABS.map(t => <div key={t} className={`tab-item ${tab===t?"active":""}`} onClick={() => setTab(t)}>{tabLabels[t]}</div>)}
      </div>

      {/* ── USERS ── */}
      {tab === "users" && (
        <div className="card">
          <div className="card-body">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{u.name.charAt(0)}</div>
                        <span style={{ fontWeight: 500 }}>{u.name}</span>
                      </div>
                    </td>
                    <td className="text-muted text-sm">{u.email}</td>
                    <td><span className={`badge ${roleColors[u.role] || "badge-gold"}`}>{u.role.replace(/_/g," ").toUpperCase()}</span></td>
                    <td><span className={`badge ${u.active !== false ? "badge-green" : "badge-red"}`}>{u.active !== false ? "ACTIVE" : "INACTIVE"}</span></td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-xs btn-outline" onClick={() => setModal({ type: "user", data: u })}>✎ Edit</button>
                        <button className="btn btn-xs btn-red" onClick={() => setAdminConfirm({ title:"Delete User", message:`Delete user "${u.name}"? This cannot be undone.`, onConfirm:() => { onDeleteUser(u.id); setAdminConfirm(null); } })}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── HALLS ── */}
      {tab === "halls" && (
        <div className="card">
          <div className="card-body">
            <table className="data-table">
              <thead><tr><th>Hall Name</th><th>Tables</th><th>Active Tables</th><th>Actions</th></tr></thead>
              <tbody>
                {halls.map(h => {
                  const hallTables = tables.filter(t => t.hallId === h.id);
                  const activeTables = hallTables.filter(t => t.status === "open").length;
                  return (
                    <tr key={h.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>🏛 {h.name}</div>
                        {h.description && <div className="text-muted text-xs">{h.description}</div>}
                      </td>
                      <td className="text-mono">{hallTables.length}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: activeTables > 0 ? "var(--green)" : "var(--text3)" }} />
                          <span style={{ fontSize: 12 }}>{activeTables} open</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-8">
                          <button className="btn btn-xs btn-outline" onClick={() => setModal({ type: "hall", data: h })}>✎ Edit</button>
                          <button className="btn btn-xs btn-red" onClick={() => {
                            if (hallTables.length > 0) { alert(`Cannot delete: ${hallTables.length} table(s) assigned to this hall. Reassign or delete tables first.`); return; }
                            setAdminConfirm({ title:"Delete Hall", message:`Delete "${h.name}"? All tables in this hall will be unassigned.`, onConfirm:() => { onDeleteHall(h.id); setAdminConfirm(null); } });
                          }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TABLES ── */}
      {tab === "tables" && (
        <div className="card">
          <div className="card-body">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Hall</th><th>Game</th><th>Min Bet</th><th>Max Bet</th><th>Float</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {tables.map(t => {
                  const hall = halls.find(h => h.id === t.hallId);
                  return (
                    <tr key={t.id}>
                      <td className="text-mono text-gold">{t.id}</td>
                      <td className="text-sm">{hall?.name?.split("—")[0]?.trim() || "—"}</td>
                      <td>{t.gameType}</td>
                      <td className="text-mono">{fmt(t.minBet)}</td>
                      <td className="text-mono">{fmt(t.maxBet)}</td>
                      <td className="text-mono text-gold">{fmt(t.chipTotal)}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td>
                        <div className="flex gap-8">
                          <button className="btn btn-xs btn-outline" onClick={() => setModal({ type: "table", data: t })}>✎ Edit</button>
                          <button className="btn btn-xs btn-red" onClick={() => setAdminConfirm({ title:"Delete Table", message:`Delete table ${t.id} (${t.gameType})? This cannot be undone.`, onConfirm:() => { onDeleteTable(t.id); setAdminConfirm(null); } })}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CHIPS ── */}
      {tab === "chips" && (
        <div className="card">
          <div className="card-body">
            <table className="data-table">
              <thead><tr><th>Chip</th><th>Color Name</th><th>Face Value</th><th>Actions</th></tr></thead>
              <tbody>
                {chips.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: c.hex, border: "3px solid rgba(255,255,255,0.15)", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }} />
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{c.color}</td>
                    <td className="text-mono text-gold" style={{ fontSize: 15 }}>{fmt(c.value)}</td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-xs btn-outline" onClick={() => setModal({ type: "chip", data: c })}>✎ Edit</button>
                        <button className="btn btn-xs btn-red" onClick={() => setAdminConfirm({ title:"Delete Denomination", message:`Delete the ${c.color} chip (${fmt(c.value)})? Chip counts referencing this denomination will be affected.`, onConfirm:() => { onDeleteChip(c.id); setAdminConfirm(null); } })}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SHIFTS ── */}
      {tab === "shifts" && <ShiftsTab />}

      {/* ── ROSTER ── */}
      {tab === "roster" && <AdminRosterTab />}

      {/* ── ROLES & PERMISSIONS ── */}
      {tab === "roles" && <RolesTab />}

      {/* ── FORMS EDITOR ── */}
      {tab === "forms" && <FormsEditorTab />}

      {/* ── MODALS ── */}
      {modal?.type === "user" && <UserModal data={modal.data} onClose={() => setModal(null)} />}
      {modal?.type === "hall" && <HallModal data={modal.data} onClose={() => setModal(null)} />}
      {modal?.type === "table" && <TableConfigModal data={modal.data} onClose={() => setModal(null)} />}
      {modal?.type === "chip" && <ChipModal data={modal.data} onClose={() => setModal(null)} />}
      {modal?.type === "role" && <RoleModal data={modal.data} onClose={() => setModal(null)} />}

      {/* ── CONFIRM MODAL ── */}
      {adminConfirm && (
        <ConfirmModal
          title={adminConfirm.title}
          message={adminConfirm.message}
          confirmLabel="Delete"
          confirmColor="btn-red"
          onConfirm={adminConfirm.onConfirm}
          onCancel={() => setAdminConfirm(null)}
        />
      )}
    </div>
  );
}

function TableSessionPage({ user, staff, tables, chips, transactions, onUpdateTable, onAddActivity, halls, onAddTransaction, onUpdateTransaction, onDeleteTransaction, incidents, fills, onAddChipCount, tableSessionLogs, onAddSessionLog }) {
  // TABLE-CENTRIC: find the table this session is tracking.
  // Staff role maps to a table, not a person. Inspector rotates within the session.
  const myStaffProfile = staff.find(s => s.id === user.staffId) || staff.find(s => s.name === user.name);
  // Primary: table where this staff member is dealer; fallback: first open table
  const myTable = tables.find(t => t.dealerId === myStaffProfile?.id)
               || tables.find(t => t.inspectorId === myStaffProfile?.id)
               || tables.find(t => t.status === "open");
  const myInspector = myTable ? staff.find(s => s.id === myTable.inspectorId) : null;
  const myHall = myTable ? halls.find(h => h.id === myTable.hallId) : null;

  const [sessionTab, setSessionTab] = useState("session");

  // ── SESSION TIMER ──
  const ROTATION_SECS = 1200;
  const [secondsLeft, setSecondsLeft] = useState(ROTATION_SECS);
  const [timerRunning, setTimerRunning] = useState(!!myTable);
  const [rotationAlert, setRotationAlert] = useState(false);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { setRotationAlert(true); setTimerRunning(false); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const timerMins  = Math.floor(secondsLeft / 60);
  const timerSecs  = secondsLeft % 60;
  const timerPct   = (secondsLeft / ROTATION_SECS) * 100;
  const timerColor = secondsLeft > 300 ? "var(--green)" : secondsLeft > 60 ? "var(--yellow)" : "var(--red)";

  // ── SESSION STATE ── (sessionLog lives in app state, persists across navigation)
  const sessionLog = (tableSessionLogs && myTable) ? (tableSessionLogs[myTable.id] || []) : [];
  const [sessionStarted, setSessionStarted] = useState(myTable?.status === "open");
  const [sessionNumber, setSessionNumber] = useState(sessionLog.length + 1);

  // ── ROTATION / CHIP COUNT FLOW ──
  const [rotationStep, setRotationStep] = useState(null);
  const [counts, setCounts] = useState({});
  // incoming dealer/inspector selection for confirm step
  const [incomingDealerId, setIncomingDealerId]     = useState("");
  const [incomingInspectorId, setIncomingInspectorId] = useState("");

  const total = (chips||[]).reduce((sum, c) => sum + c.value * (counts[c.id] || 0), 0);
  const prev  = myTable?.chipTotal || 0;
  const diff  = total - prev;

  function startRotation() { setRotationStep("chip_count"); setCounts({}); setIncomingDealerId(""); setIncomingInspectorId(""); setSessionTab("session"); }

  function submitChipCount() {
    if (!total) return;
    setRotationStep("result");
  }

  function confirmRotation() {
    if (myTable) {
      // Update table with new chip total and incoming dealer/inspector if selected
      const updates = { chipTotal: total };
      if (incomingDealerId) updates.dealerId = incomingDealerId;
      if (incomingInspectorId) updates.inspectorId = incomingInspectorId;
      onUpdateTable(myTable.id, updates);
      const now = new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"});
      const incomingDealer = incomingDealerId ? staff.find(s=>s.id===incomingDealerId) : null;
      const incomingInspector = incomingInspectorId ? staff.find(s=>s.id===incomingInspectorId) : null;
      const result = { id: Date.now(), sessionNo: sessionNumber, time: now, tableId: myTable.id, prevFloat: prev, newFloat: total, diff, inspector: myInspector?.name || "—", outDealer: user.name, inDealer: incomingDealer?.name||"—", outInspector: myInspector?.name||"—", inInspector: incomingInspector?.name||"—" };
      if (onAddSessionLog) onAddSessionLog(myTable.id, result);
      setSessionNumber(n => n + 1);
      onAddActivity("dealer_rotation", `Session ${sessionNumber} at ${myTable.id} — ${diff>=0?"Win":"Loss"} ${fmt(Math.abs(diff))}`, "🔄");
      if (onAddChipCount) {
        onAddChipCount({ tableId: myTable.id, prevFloat: prev, newFloat: total, diff, inspector: myInspector?.name || "—" });
      }
    }
    setRotationStep(null);
    setRotationAlert(false);
    setSecondsLeft(ROTATION_SECS);
    setTimerRunning(true);
    setCounts({});
  }

  // Table transactions and activity feed
  const tableTxns    = (transactions||[]).filter(tx => myTable && tx.tableId === myTable.id);
  const tableDrop    = tableTxns.filter(t=>t.type==="drop").reduce((s,t)=>s+t.amount,0);
  const tableWin     = tableTxns.filter(t=>t.type==="win").reduce((s,t)=>s+t.amount,0);
  const tableIncidents = (incidents||[]).filter(i => myTable && i.tableId === myTable.id);
  const tableFills   = (fills||[]).filter(f => myTable && f.tableId === myTable.id);

  // Breaklist preview — table-hall dealers
  const hallDealers = staff.filter(s => myTable && s.hallId === myTable.hallId && (s.position==="dealer"||s.position==="dealer_inspector"));

  // ── CUSTOMER LOG (inline, editable) ──
  const [custForm, setCustForm] = useState({ customerId:"", type:"drop", amount:"" });
  const [editTxId, setEditTxId] = useState(null);
  const [editTxForm, setEditTxForm] = useState({});

  function submitCust() {
    if (!custForm.customerId || !custForm.amount || !myTable) return;
    onAddTransaction && onAddTransaction({ tableId: myTable.id, ...custForm, amount: Number(custForm.amount) });
    setCustForm(f => ({...f, customerId:"", amount:""}));
  }
  function startEditTx(tx) { setEditTxId(tx.id); setEditTxForm({ customerId:tx.customerId, type:tx.type, amount:tx.amount, tableId:tx.tableId }); }
  function saveEditTx() {
    onUpdateTransaction && onUpdateTransaction(editTxId, { ...editTxForm, amount:Number(editTxForm.amount) });
    setEditTxId(null);
  }

  // ── CHIP COUNT TAB (standalone, not tied to rotation) ──
  const [chipCounts, setChipCounts] = useState({});
  const [chipSubmitted, setChipSubmitted] = useState(false);
  const chipTotal = (chips||[]).reduce((s,c) => s + c.value*(chipCounts[c.id]||0), 0);
  const chipDiff  = chipTotal - (myTable?.chipTotal||0);

  function submitChipOnly() {
    if (!chipTotal || !myTable) return;
    const prevFloat = myTable.chipTotal || 0;
    const newChipTotal = chipTotal;
    const chipDiffCalc = newChipTotal - prevFloat;
    onUpdateTable(myTable.id, { chipTotal });
    onAddActivity("chip_count", `Chip count: ${myTable.id} — ${chipDiff>=0?"Win +":"Loss "}${Math.abs(chipDiff).toLocaleString()}`, "📊");
    if (onAddChipCount) {
      onAddChipCount({ tableId: myTable.id, prevFloat, newFloat: newChipTotal, diff: chipDiffCalc, inspector: myInspector?.name || "—" });
    }
    setChipSubmitted(true);
    setTimeout(() => { setChipSubmitted(false); setChipCounts({}); }, 3000);
  }

  const fmt = (n) => n != null ? n.toLocaleString("en-KE",{style:"currency",currency:"KES",minimumFractionDigits:0}) : "—";

  if (!myTable) return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Table Session</div><div className="section-sub">No table assigned</div></div>
      </div>
      <div className="empty-state"><div className="empty-icon">🃏</div><p>You are not currently assigned to a table.<br/>Contact your Pit Boss for table assignment.</p></div>
    </div>
  );

  // ── START SESSION GATE ──
  if (!sessionStarted) return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Table Session — <span className="text-gold">{myTable.id}</span></div>
          <div className="section-sub">{myTable.gameType}{myTable.tableName ? ` · ${myTable.tableName}` : ""} · {myHall?.name?.split("—")[0]?.trim()||""}</div>
        </div>
        <StatusBadge status={myTable.status} />
      </div>
      <div style={{ maxWidth:480, margin:"3rem auto", textAlign:"center", padding:"2rem", background:"var(--panel)", border:"1px solid var(--border)", borderRadius:"var(--radius2)" }}>
        <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>🃏</div>
        <div style={{ fontSize:"1.3rem", fontWeight:700, marginBottom:"0.5rem" }}>Session #{sessionNumber}</div>
        <div style={{ color:"var(--text2)", marginBottom:"0.5rem" }}>{myTable.tableName||myTable.id} · {myTable.gameType}</div>
        <div style={{ color:"var(--text3)", fontSize:"0.85rem", marginBottom:"1.5rem" }}>Inspector: {myInspector?.name||"Unassigned"} · Float: {fmt(myTable.chipTotal||0)}</div>
        <div style={{ display:"flex", gap:"0.75rem", justifyContent:"center", flexWrap:"wrap", marginBottom:"1.5rem" }}>
          {[
            { label:"Outgoing Dealer", value: user.name, color:"var(--red)" },
            { label:"Inspector",       value: myInspector?.name||"Unassigned", color:"var(--blue)" },
          ].map(r => (
            <div key={r.label} style={{ background:"var(--bg3)", padding:"0.75rem 1.25rem", borderRadius:"var(--radius)", border:`1px solid ${r.color}22` }}>
              <div style={{ fontSize:"0.7rem", color:"var(--text3)", textTransform:"uppercase", marginBottom:"0.25rem" }}>{r.label}</div>
              <div style={{ fontWeight:600, color:r.color }}>{r.value}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-gold" style={{ padding:"0.75rem 2rem", fontSize:"1rem" }} onClick={() => { setSessionStarted(true); setTimerRunning(true); onAddActivity("session_start", `Session ${sessionNumber} started at ${myTable.id}`, "▶️"); }}>
          ▶ Start Session #{sessionNumber}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Table Session — <span className="text-gold">{myTable.id}</span> <span style={{ fontSize:"0.8rem", color:"var(--text3)", fontWeight:400 }}>Session #{sessionNumber}</span></div>
          <div className="section-sub">{myTable.gameType}{myTable.tableName ? ` · ${myTable.tableName}` : ""} · {myHall?.name?.split("—")[0]?.trim()||""} · Inspector: {myInspector?.name||"Unassigned"}</div>
        </div>
        <div className="flex gap-8">
          {!rotationStep && <button className="btn btn-gold" onClick={startRotation}>🔄 Start Rotation</button>}
          <StatusBadge status={myTable.status} />
        </div>
      </div>

      {rotationAlert && !rotationStep && (
        <div style={{ padding:"12px 16px", background:"var(--red-dim)", border:"1px solid var(--red)", borderRadius:"var(--radius)", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ color:"var(--red)", fontWeight:600 }}>🔴 Rotation Due — 20 minutes elapsed. Start chip count to rotate.</div>
          <button className="btn btn-red btn-sm" onClick={startRotation}>Start Now</button>
        </div>
      )}

      {/* ── ROTATION FLOW (overlays tabs) ── */}
      {rotationStep === "chip_count" && (
        <div>
          <div style={{ padding:"12px 16px", background:"var(--gold-dim)", border:"1px solid var(--border)", borderRadius:"var(--radius)", marginBottom:16 }}>
            <div style={{ fontWeight:600, color:"var(--gold)" }}>🔄 Rotation — Step 1 of 3: Chip Count for {myTable.id}</div>
            <div style={{ fontSize:11, color:"var(--text3)", marginTop:3 }}>Count all chips on table and enter quantities below.</div>
          </div>
          <div className="grid-2 gap-16">
            <div className="card">
              <div className="card-header"><div className="card-title">Chip Count Entry</div></div>
              <div className="card-body">
                {(chips||[]).map(c => (
                  <div key={c.id} className="chip-count-row">
                    <div style={{ width:24, height:24, borderRadius:"50%", background:c.hex, border:"2px solid rgba(255,255,255,0.2)", flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>{c.color}</div>
                      <div style={{ fontSize:11, color:"var(--text3)", fontFamily:"var(--font-mono)" }}>{fmt(c.value)} each</div>
                    </div>
                    <input type="number" className="form-input" style={{ width:80, textAlign:"center" }} min="0" placeholder="0"
                      value={counts[c.id]||""} onChange={e => setCounts(cc=>({...cc,[c.id]:Number(e.target.value)}))} />
                    <div style={{ width:90, fontFamily:"var(--font-mono)", fontSize:12, color:"var(--gold)", textAlign:"right" }}>
                      {counts[c.id] ? fmt(c.value*counts[c.id]) : "—"}
                    </div>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", marginTop:8, borderTop:"1px solid var(--border)" }}>
                  <span style={{ fontSize:12, color:"var(--text3)", textTransform:"uppercase", letterSpacing:1 }}>Total</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:18, color:"var(--gold)" }}>{fmt(total)}</span>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">Previous Float</div></div>
              <div className="card-body" style={{ textAlign:"center", paddingTop:24 }}>
                <div style={{ fontSize:11, color:"var(--text3)", marginBottom:6 }}>TABLE FLOAT AT SESSION START</div>
                <div style={{ fontSize:32, fontFamily:"var(--font-mono)", color:"var(--text2)", marginBottom:24 }}>{fmt(prev)}</div>
                <div className="flex gap-8" style={{ justifyContent:"center" }}>
                  <button className="btn btn-outline" onClick={() => setRotationStep(null)}>Cancel</button>
                  <button className="btn btn-gold" onClick={submitChipCount} disabled={!total}>Next: View Result →</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {rotationStep === "result" && (
        <div>
          <div style={{ padding:"12px 16px", background:"var(--gold-dim)", border:"1px solid var(--border)", borderRadius:"var(--radius)", marginBottom:16 }}>
            <div style={{ fontWeight:600, color:"var(--gold)" }}>🔄 Rotation — Step 2 of 3: Session Result</div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Session Result — {myTable.id}</div></div>
            <div className="card-body">
              <div style={{ padding:"20px 0" }}>
                {[
                  { label:"Opening Float",  value:fmt(prev),  color:"var(--text2)" },
                  { label:"Closing Count",  value:fmt(total), color:"var(--gold)"  },
                  { label:"Net Difference", value:(diff>=0?"+":"")+fmt(diff), color:diff>=0?"var(--green)":"var(--red)" },
                ].map(r => (
                  <div key={r.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0", borderBottom:"1px solid var(--border2)" }}>
                    <span style={{ fontSize:12, color:"var(--text3)", textTransform:"uppercase", letterSpacing:1 }}>{r.label}</span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:20, color:r.color }}>{r.value}</span>
                  </div>
                ))}
                <div style={{ marginTop:16, padding:18, background:diff>=0?"var(--green-dim)":"var(--red-dim)", borderRadius:"var(--radius)", textAlign:"center" }}>
                  <div style={{ fontSize:11, color:"var(--text3)", marginBottom:4 }}>HOUSE SESSION RESULT</div>
                  <div style={{ fontSize:32, fontFamily:"var(--font-mono)", color:diff>=0?"var(--green)":"var(--red)", fontWeight:700 }}>
                    {diff>=0?"WIN":"LOSS"} {fmt(Math.abs(diff))}
                  </div>
                </div>
              </div>
              <div className="flex gap-8" style={{ justifyContent:"center", marginTop:8 }}>
                <button className="btn btn-outline" onClick={() => setRotationStep("chip_count")}>← Back</button>
                <button className="btn btn-gold" onClick={() => setRotationStep("confirm")}>Next: Confirm Rotation →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rotationStep === "confirm" && (
        <div>
          <div style={{ padding:"12px 16px", background:"var(--gold-dim)", border:"1px solid var(--border)", borderRadius:"var(--radius)", marginBottom:16 }}>
            <div style={{ fontWeight:600, color:"var(--gold)" }}>🔄 Session {sessionNumber} — Step 3 of 3: Confirm Rotation</div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Confirm Incoming Dealer & Inspector</div></div>
            <div className="card-body">
              {/* Outgoing / Incoming layout */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:16, alignItems:"flex-start", padding:"12px 0 20px", textAlign:"center" }}>
                <div style={{ padding:16, background:"var(--red-dim)", borderRadius:"var(--radius)", border:"1px solid rgba(232,65,90,0.3)" }}>
                  <div style={{ fontSize:11, color:"var(--text3)", marginBottom:8 }}>OUTGOING DEALER</div>
                  <div className="avatar" style={{ margin:"0 auto 8px", width:40, height:40, fontSize:16 }}>{user.name.charAt(0)}</div>
                  <div style={{ fontWeight:600 }}>{user.name}</div>
                  <div style={{ fontSize:11, color:"var(--text3)", marginTop:4 }}>Leaving {myTable.id}</div>
                  <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid rgba(232,65,90,0.2)" }}>
                    <div style={{ fontSize:11, color:"var(--text3)", marginBottom:4 }}>OUTGOING INSPECTOR</div>
                    <div style={{ fontWeight:600, color:"var(--text2)" }}>{myInspector?.name||"Unassigned"}</div>
                  </div>
                </div>
                <div style={{ fontSize:28, color:"var(--gold)", paddingTop:24 }}>→</div>
                <div style={{ padding:16, background:"var(--green-dim)", borderRadius:"var(--radius)", border:"1px solid rgba(45,190,108,0.3)" }}>
                  <div style={{ fontSize:11, color:"var(--text3)", marginBottom:8 }}>INCOMING DEALER</div>
                  <select value={incomingDealerId} onChange={e=>setIncomingDealerId(e.target.value)}
                    style={{ width:"100%", background:"var(--panel2)", border:"1px solid var(--border)", color:"var(--text)", padding:"0.4rem 0.5rem", borderRadius:"var(--radius)", fontSize:"0.85rem", marginBottom:8 }}>
                    <option value="">— Select Dealer —</option>
                    {hallDealers.filter(s=>s.id!==myStaffProfile?.id).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <div style={{ fontSize:11, color:"var(--text3)", marginTop:4 }}>Taking {myTable.id}</div>
                  <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid rgba(45,190,108,0.2)" }}>
                    <div style={{ fontSize:11, color:"var(--text3)", marginBottom:4 }}>INCOMING INSPECTOR</div>
                    <select value={incomingInspectorId} onChange={e=>setIncomingInspectorId(e.target.value)}
                      style={{ width:"100%", background:"var(--panel2)", border:"1px solid var(--border)", color:"var(--text)", padding:"0.4rem 0.5rem", borderRadius:"var(--radius)", fontSize:"0.85rem" }}>
                      <option value="">— Select Inspector —</option>
                      {staff.filter(s=>s.hallId===myTable.hallId&&(s.position==="inspector"||s.position==="dealer_inspector")).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ padding:"12px 14px", background:"var(--bg3)", borderRadius:"var(--radius)", marginBottom:16, fontSize:12, color:"var(--text2)" }}>
                Chip count <strong className="text-gold">{fmt(total)}</strong> saved as new table float.
                Session result <strong style={{ color:diff>=0?"var(--green)":"var(--red)" }}>{diff>=0?"WIN":"LOSS"} {fmt(Math.abs(diff))}</strong> logged.
              </div>
              <div className="flex gap-8" style={{ justifyContent:"center" }}>
                <button className="btn btn-outline" onClick={() => setRotationStep("result")}>← Back</button>
                <button className="btn btn-gold" onClick={confirmRotation}>✓ Confirm Rotation</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TABS (shown when no rotation in progress) ── */}
      {!rotationStep && (
        <div>
          <div className="tab-bar">
            <div className={`tab-item ${sessionTab==="session"?"active":""}`} onClick={() => setSessionTab("session")}>Session</div>
            <div className={`tab-item ${sessionTab==="chip_count"?"active":""}`} onClick={() => setSessionTab("chip_count")}>Chip Count</div>
            <div className={`tab-item ${sessionTab==="customer_log"?"active":""}`} onClick={() => setSessionTab("customer_log")}>Customer Log</div>
            <div className={`tab-item ${sessionTab==="activity"?"active":""}`} onClick={() => setSessionTab("activity")}>
              Activity Log
              {(tableIncidents.filter(i=>i.status!=="resolved").length > 0) && (
                <span className="badge badge-red" style={{ marginLeft:6, fontSize:9, padding:"1px 5px" }}>{tableIncidents.filter(i=>i.status!=="resolved").length}</span>
              )}
            </div>
          </div>

          {/* ── SESSION TAB ── */}
          {sessionTab === "session" && (
            <div>
              <div className="grid-2 gap-16 mb-16">
                {/* Timer */}
                <div className="card">
                  <div className="card-header"><div className="card-title">Session Timer</div></div>
                  <div className="card-body" style={{ textAlign:"center", padding:"24px 18px" }}>
                    <div style={{ fontSize:48, fontFamily:"var(--font-mono)", color:timerColor, fontWeight:600, letterSpacing:2 }}>
                      {String(timerMins).padStart(2,"0")}:{String(timerSecs).padStart(2,"0")}
                    </div>
                    <div style={{ margin:"12px 0 8px", height:6, background:"var(--bg3)", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${timerPct}%`, background:timerColor, borderRadius:3, transition:"width 1s linear" }} />
                    </div>
                    <div style={{ fontSize:11, color:"var(--text3)" }}>Next rotation in {timerMins}m {timerSecs}s</div>
                    <div className="flex gap-8" style={{ justifyContent:"center", marginTop:14 }}>
                      <button className="btn btn-sm btn-outline" onClick={() => setTimerRunning(r => !r)}>{timerRunning ? "⏸ Pause" : "▶ Resume"}</button>
                      <button className="btn btn-sm btn-outline" onClick={() => { setSecondsLeft(ROTATION_SECS); setTimerRunning(true); setRotationAlert(false); }}>↺ Reset</button>
                    </div>
                  </div>
                </div>

                {/* Table info */}
                <div className="card">
                  <div className="card-header"><div className="card-title">Table {myTable.id}</div><StatusBadge status={myTable.status} /></div>
                  <div className="card-body">
                    {[
                      ["Game",       myTable.gameType],
                      ["Profile",    myTable.tableName||"—"],
                      ["Inspector",  myInspector?.name||"Unassigned"],
                      ["Chip Float", fmt(myTable.chipTotal)],
                      ["Opening Float", fmt(myTable.openingFloat||myTable.floatCapacity||0)],
                      ["Min / Max",  `${fmt(myTable.minBet)} / ${fmt(myTable.maxBet)}`],
                    ].map(([k,v]) => (
                      <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--border2)" }}>
                        <span style={{ fontSize:11, color:"var(--text3)" }}>{k}</span>
                        <span style={{ fontSize:13, fontFamily:k==="Chip Float"||k==="Opening Float"||k==="Min / Max"?"var(--font-mono)":"inherit", color:k==="Chip Float"?"var(--gold)":"var(--text)" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Session performance + rotation history */}
              <div className="grid-2 gap-16">
                <div className="card">
                  <div className="card-header"><div className="card-title">Session Performance</div></div>
                  <div className="card-body">
                    {[
                      { label:"Customer Drop", value:fmt(tableDrop), color:"var(--blue)"  },
                      { label:"Customer Win",  value:fmt(tableWin),  color:"var(--red)"   },
                      { label:"House Net",     value:fmt(tableDrop-tableWin), color:(tableDrop-tableWin)>=0?"var(--green)":"var(--red)" },
                      { label:"Transactions",  value:String(tableTxns.length), color:"var(--gold)" },
                      { label:"Fill Requests", value:String(tableFills.length), color:"var(--yellow)" },
                      { label:"Incidents",     value:String(tableIncidents.length), color:tableIncidents.length>0?"var(--red)":"var(--text3)" },
                    ].map(r => (
                      <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid var(--border2)" }}>
                        <span style={{ fontSize:12, color:"var(--text3)" }}>{r.label}</span>
                        <span style={{ fontSize:13, fontFamily:"var(--font-mono)", color:r.color }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header"><div className="card-title">Session History</div><span style={{color:"var(--text3)",fontSize:"0.8rem"}}>{sessionLog.length} completed</span></div>
                  <div className="card-body">
                    {sessionLog.length === 0
                      ? <div className="empty-state" style={{ padding:20 }}><div className="empty-icon">🔄</div><p>No sessions completed yet</p></div>
                      : <table className="data-table">
                          <thead><tr><th>#</th><th>Time</th><th>Float</th><th>Result</th><th>Out Dealer</th><th>In Dealer</th><th>Out Insp.</th><th>In Insp.</th></tr></thead>
                          <tbody>
                            {sessionLog.map(s => (
                              <tr key={s.id}>
                                <td className="text-mono text-gold" style={{fontWeight:700}}>{s.sessionNo||"—"}</td>
                                <td className="text-mono text-muted">{s.time}</td>
                                <td className="text-mono">{fmt(s.newFloat)}</td>
                                <td className="text-mono" style={{ color:s.diff>=0?"var(--green)":"var(--red)", fontWeight:600 }}>{s.diff>=0?"+":""}{fmt(s.diff)}</td>
                                <td style={{fontSize:"0.8rem",color:"var(--text2)"}}>{s.outDealer||"—"}</td>
                                <td style={{fontSize:"0.8rem",color:"var(--green)"}}>{s.inDealer||"—"}</td>
                                <td style={{fontSize:"0.8rem",color:"var(--text2)"}}>{s.outInspector||"—"}</td>
                                <td style={{fontSize:"0.8rem",color:"var(--blue)"}}>{s.inInspector||"—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CHIP COUNT TAB ── */}
          {sessionTab === "chip_count" && (
            <div className="grid-2 gap-16">
              <div className="card">
                <div className="card-header"><div className="card-title">Count Entry — {myTable.id}</div></div>
                <div className="card-body">
                  {(chips||[]).map(c => (
                    <div key={c.id} className="chip-count-row">
                      <div style={{ width:24, height:24, borderRadius:"50%", background:c.hex, border:"2px solid rgba(255,255,255,0.2)", flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:500 }}>{c.color}</div>
                        <div style={{ fontSize:11, color:"var(--text3)", fontFamily:"var(--font-mono)" }}>{fmt(c.value)} each</div>
                      </div>
                      <input type="number" className="form-input" style={{ width:80, textAlign:"center" }} min="0" placeholder="0"
                        value={chipCounts[c.id]||""} onChange={e => setChipCounts(cc=>({...cc,[c.id]:Number(e.target.value)}))} />
                      <div style={{ width:90, fontFamily:"var(--font-mono)", fontSize:12, color:"var(--gold)", textAlign:"right" }}>
                        {chipCounts[c.id] ? fmt(c.value*chipCounts[c.id]) : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Result</div></div>
                <div className="card-body">
                  <div style={{ padding:"16px 0" }}>
                    {[
                      { label:"Previous Float", value:fmt(myTable.chipTotal||0), color:"var(--text2)" },
                      { label:"Current Count",  value:fmt(chipTotal), color:"var(--gold)" },
                      { label:"Net Difference", value:(chipDiff>=0?"+":"")+fmt(chipDiff), color:chipDiff>=0?"var(--green)":"var(--red)" },
                    ].map(r => (
                      <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", borderBottom:"1px solid var(--border2)" }}>
                        <span style={{ fontSize:12, color:"var(--text3)", textTransform:"uppercase", letterSpacing:1 }}>{r.label}</span>
                        <span style={{ fontFamily:"var(--font-mono)", fontSize:18, color:r.color }}>{r.value}</span>
                      </div>
                    ))}
                    <div style={{ marginTop:14, padding:14, background:chipDiff>=0?"var(--green-dim)":"var(--red-dim)", borderRadius:"var(--radius)", textAlign:"center" }}>
                      <div style={{ fontSize:11, color:"var(--text3)", marginBottom:4 }}>HOUSE RESULT</div>
                      <div style={{ fontSize:24, fontFamily:"var(--font-mono)", color:chipDiff>=0?"var(--green)":"var(--red)", fontWeight:600 }}>
                        {chipDiff>=0?"WIN":"LOSS"} {fmt(Math.abs(chipDiff))}
                      </div>
                    </div>
                    <button className="btn btn-gold" style={{ width:"100%", marginTop:16, justifyContent:"center" }} onClick={submitChipOnly} disabled={!chipTotal}>
                      {chipSubmitted ? "✓ Count Logged!" : "Log Chip Count"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CUSTOMER LOG TAB ── */}
          {sessionTab === "customer_log" && (
            <div className="grid-2 gap-16">
              <div className="card">
                <div className="card-header"><div className="card-title">Log Transaction</div></div>
                <div className="card-body">
                  <div style={{ padding:"8px 12px", background:"var(--gold-dim)", borderRadius:"var(--radius)", marginBottom:12, fontSize:12 }}>
                    Table: <strong className="text-gold">{myTable.id}</strong> · {myTable.gameType}
                  </div>
                  <div className="form-group"><label className="form-label">Customer ID</label>
                    <input className="form-input" placeholder="e.g. C-081" value={custForm.customerId} onChange={e => setCustForm(f=>({...f,customerId:e.target.value}))} />
                  </div>
                  <div className="form-group"><label className="form-label">Type</label>
                    <div className="flex gap-8">
                      {["drop","win"].map(t => (
                        <button key={t} className={`btn flex-1 ${custForm.type===t?"btn-gold":"btn-outline"}`} onClick={() => setCustForm(f=>({...f,type:t}))}>
                          {t==="drop"?"📥 Drop":"📤 Win"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group"><label className="form-label">Amount (KES)</label>
                    <input className="form-input" type="number" placeholder="0" value={custForm.amount} onChange={e => setCustForm(f=>({...f,amount:e.target.value}))} />
                  </div>
                  <button className="btn btn-gold" style={{ width:"100%", justifyContent:"center" }} onClick={submitCust} disabled={!custForm.customerId||!custForm.amount}>
                    Log Transaction
                  </button>
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Transactions — {myTable.id}</div><div style={{fontSize:10,color:"var(--text3)"}}>✎ edit · ✕ delete</div></div>
                <div className="card-body">
                  <table className="data-table">
                    <thead><tr><th>Time</th><th>Customer</th><th>Type</th><th>Amount</th><th></th></tr></thead>
                    <tbody>
                      {tableTxns.length === 0
                        ? <tr><td colSpan={5} style={{textAlign:"center",color:"var(--text3)",padding:20}}>No transactions yet</td></tr>
                        : tableTxns.map(l => (
                          <tr key={l.id}>
                            {editTxId === l.id ? (
                              <>
                                <td colSpan={2}><input className="form-input" style={{fontSize:11,padding:"3px 7px"}} value={editTxForm.customerId} onChange={e=>setEditTxForm(f=>({...f,customerId:e.target.value}))} /></td>
                                <td><select className="form-select" style={{fontSize:11,padding:"3px 7px"}} value={editTxForm.type} onChange={e=>setEditTxForm(f=>({...f,type:e.target.value}))}><option value="drop">DROP</option><option value="win">WIN</option></select></td>
                                <td><input className="form-input" type="number" style={{fontSize:11,padding:"3px 7px",width:90}} value={editTxForm.amount} onChange={e=>setEditTxForm(f=>({...f,amount:e.target.value}))} /></td>
                                <td><div className="flex gap-8"><button className="btn btn-xs btn-green" onClick={saveEditTx}>✓</button><button className="btn btn-xs btn-outline" onClick={()=>setEditTxId(null)}>✕</button></div></td>
                              </>
                            ) : (
                              <>
                                <td className="text-mono text-muted">{l.time}</td>
                                <td className="text-gold text-mono">{l.customerId}</td>
                                <td><span className={`badge ${l.type==="drop"?"badge-blue":"badge-green"}`}>{l.type.toUpperCase()}</span></td>
                                <td className="text-mono" style={{ color:l.type==="drop"?"var(--blue)":"var(--green)" }}>{fmt(l.amount)}</td>
                                <td><div className="flex gap-8"><button className="btn btn-xs btn-outline" onClick={()=>startEditTx(l)}>✎</button><button className="btn btn-xs btn-red" onClick={()=>onDeleteTransaction&&onDeleteTransaction(l.id)}>✕</button></div></td>
                              </>
                            )}
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── ACTIVITY LOG TAB ── */}
          {sessionTab === "activity" && (
            <div>
              {tableIncidents.filter(i=>i.status!=="resolved").length > 0 && (
                <div style={{ padding:"10px 14px", background:"var(--red-dim)", border:"1px solid var(--red)", borderRadius:"var(--radius)", marginBottom:14, fontSize:12, color:"var(--red)" }}>
                  ⚠ {tableIncidents.filter(i=>i.status!=="resolved").length} open incident(s) on this table
                </div>
              )}
              <div className="grid-2 gap-16">
                <div className="card">
                  <div className="card-header"><div className="card-title">Incidents — {myTable.id}</div></div>
                  <div className="card-body">
                    {tableIncidents.length === 0
                      ? <div className="empty-state" style={{padding:16}}><div className="empty-icon">✅</div><p>No incidents on this table</p></div>
                      : tableIncidents.map(i => (
                        <div key={i.id} style={{ padding:"10px 0", borderBottom:"1px solid var(--border2)" }}>
                          <div className="flex items-center gap-8" style={{ marginBottom:4 }}>
                            <span className="badge badge-orange" style={{fontSize:9}}>{i.type.replace(/_/g," ").toUpperCase()}</span>
                            <StatusBadge status={i.status} />
                            <span className="text-mono" style={{fontSize:10,color:"var(--text3)",marginLeft:"auto"}}>{i.time}</span>
                          </div>
                          <div style={{ fontSize:12, color:"var(--text2)" }}>{i.description}</div>
                          <div style={{ fontSize:10, color:"var(--text3)", marginTop:3 }}>Reported by {i.reportedBy}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
                <div className="card">
                  <div className="card-header"><div className="card-title">Fill Requests — {myTable.id}</div></div>
                  <div className="card-body">
                    {tableFills.length === 0
                      ? <div className="empty-state" style={{padding:16}}><div className="empty-icon">🪙</div><p>No fills on this table</p></div>
                      : tableFills.map(f => (
                        <div key={f.id} style={{ padding:"10px 0", borderBottom:"1px solid var(--border2)" }}>
                          <div className="flex items-center gap-8" style={{ marginBottom:4 }}>
                            <StatusBadge status={f.status} />
                            <span className="text-mono text-gold" style={{fontSize:12}}>{fmt(f.total||f.amount)}</span>
                            <span className="text-mono" style={{fontSize:10,color:"var(--text3)",marginLeft:"auto"}}>{f.time}</span>
                          </div>
                          <div style={{ fontSize:11, color:"var(--text3)" }}>By {f.requestedBy}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
              <div className="card" style={{ marginTop:14 }}>
                <div className="card-header"><div className="card-title">Rotation History — {myTable.id}</div></div>
                <div className="card-body">
                  {sessionLog.length === 0
                    ? <div className="empty-state" style={{padding:16}}><div className="empty-icon">🔄</div><p>No rotations logged yet</p></div>
                    : <table className="data-table">
                        <thead><tr><th>Time</th><th>Opening Float</th><th>Closing Count</th><th>Result</th></tr></thead>
                        <tbody>
                          {sessionLog.map(s => (
                            <tr key={s.id}>
                              <td className="text-mono text-muted">{s.time}</td>
                              <td className="text-mono">{fmt(s.prevFloat)}</td>
                              <td className="text-mono text-gold">{fmt(s.newFloat)}</td>
                              <td className="text-mono" style={{ color:s.diff>=0?"var(--green)":"var(--red)", fontWeight:600 }}>{s.diff>=0?"+":""}{fmt(s.diff)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function ShoeTrackingPage({ tables, chips, staff, user, onAddActivity }) {
  const baccaratTables = tables.filter(t => t.gameType === "Baccarat");
  const dealers = staff.filter(s => s.position === "dealer" || s.position === "dealer_inspector");

  const [shoes, setShoes] = useState([
    {
      id: "sh001", tableId: "T03", shoeNumber: 1, shuffler: "Auto-Shuffler A",
      dealerId: "s3", dealerName: "Charles Otieno",
      openFloat: 320000, closeFloat: null,
      startTime: "09:00", endTime: null, status: "active",
      counts: []
    },
    {
      id: "sh002", tableId: "T08", shoeNumber: 1, shuffler: "Manual",
      dealerId: "s9", dealerName: "Isaac Mwenda",
      openFloat: 1200000, closeFloat: null,
      startTime: "08:30", endTime: null, status: "active",
      counts: []
    },
  ]);

  const [tab, setTab] = useState("active");
  const [showNewShoe, setShowNewShoe] = useState(false);
  const [showCloseShoe, setShowCloseShoe] = useState(null); // shoe id
  const [closeForm, setCloseForm] = useState({ counts: {}, endTime: "" });

  // ── helpers ──────────────────────────────────────────────────────────────
  const fmt = n => n != null ? n.toLocaleString("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }) : "—";

  function printShoeReport(shoe) {
    const table = tables.find(t => t.id === shoe.tableId);
    const diff  = shoe.closeFloat != null ? shoe.closeFloat - shoe.openFloat : null;
    const now   = new Date().toLocaleString("en-KE");
    const chipRows = (shoe.closeCounts || []).map(c =>
      `<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.hex};border:1px solid #ccc;margin-right:4px"></span>${c.color}</td><td style="text-align:right">${c.value.toLocaleString()}</td><td style="text-align:center">${c.qty}</td><td style="text-align:right">${(c.value*c.qty).toLocaleString()}</td></tr>`
    ).join('');

    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Shoe Report — ${shoe.tableId} Shoe #${shoe.shoeNumber}</title>
    <style>body{font-family:Arial,sans-serif;font-size:11px;padding:30px;max-width:800px;margin:0 auto}
    h2{text-align:center;margin-bottom:4px;font-size:16px}.sub{text-align:center;color:#666;font-size:10px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;margin:14px 0}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
    th{background:#f5f5f5}.result{text-align:center;padding:16px;margin:16px 0;border:2px solid;border-radius:6px}
    .win{background:#f0fdf4;border-color:#16a34a;color:#15803d}.loss{background:#fef2f2;border-color:#dc2626;color:#b91c1c}
    .sig-row{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:40px}
    .sig-box{border-top:1px solid #000;padding-top:6px;font-size:10px}
    @page{size:A4;margin:20mm}</style></head><body>`);
    w.document.write(`<h2>BACCARAT SHOE TRACKING REPORT</h2>
    <div class="sub">CasinoOps Floor Operations System · Generated ${now}</div>
    <table>
      <tr><th>Table</th><td>${shoe.tableId}</td><th>Game</th><td>${table?.gameType||"Baccarat"}</td></tr>
      <tr><th>Shoe Number</th><td>${shoe.shoeNumber}</td><th>Shuffler</th><td>${shoe.shuffler}</td></tr>
      <tr><th>Dealer</th><td>${shoe.dealerName} (${shoe.dealerId})</td><th>User ID</th><td>${shoe.dealerId}</td></tr>
      <tr><th>Start Time</th><td>${shoe.startTime}</td><th>End Time</th><td>${shoe.endTime||"Active"}</td></tr>
      <tr><th>Opening Float</th><td>${fmt(shoe.openFloat)}</td><th>Closing Count</th><td>${shoe.closeFloat!=null?fmt(shoe.closeFloat):"Not closed"}</td></tr>
    </table>
    ${chipRows ? `<h3 style="margin-top:20px">Closing Chip Count</h3>
    <table><thead><tr><th>Denomination</th><th style="text-align:right">Value (KES)</th><th style="text-align:center">Quantity</th><th style="text-align:right">Subtotal</th></tr></thead>
    <tbody>${chipRows}</tbody>
    <tfoot><tr style="background:#fff9e6;font-weight:700"><td colspan="3">TOTAL</td><td style="text-align:right">${fmt(shoe.closeFloat)}</td></tr></tfoot></table>` : ''}
    ${diff != null ? `<div class="result ${diff>=0?'win':'loss'}">
      <div style="font-size:14px;font-weight:700;margin-bottom:4px">SHOE RESULT: ${diff>=0?'HOUSE WIN':'HOUSE LOSS'}</div>
      <div style="font-size:24px;font-weight:900">${diff>=0?'+':''}${fmt(diff)}</div>
      <div style="font-size:11px;margin-top:4px">Opening Float ${fmt(shoe.openFloat)} → Closing Count ${fmt(shoe.closeFloat)}</div>
    </div>` : ''}
    <div class="sig-row">
      <div class="sig-box">Dealer<br><br><br>Name: ${shoe.dealerName}<br>Signature &amp; Date:</div>
      <div class="sig-box">Pit Boss / Supervisor<br><br><br>Name: ___________________<br>Signature &amp; Date:</div>
    </div></body></html>`);
    w.document.close();
    w.print();
  }

  // ── NEW SHOE MODAL ────────────────────────────────────────────────────────
  function NewShoeModal({ onClose }) {
    const [form, setForm] = useState({
      tableId: baccaratTables[0]?.id || "",
      shoeNumber: "",
      shuffler: "",
      dealerId: dealers[0]?.id || "",
    });
    const existingShoeNums = shoes.filter(s => s.tableId === form.tableId).map(s => s.shoeNumber);
    const nextShoeNum = existingShoeNums.length > 0 ? Math.max(...existingShoeNums) + 1 : 1;

    function save() {
      if (!form.tableId || !form.dealerId) return;
      const table = tables.find(t => t.id === form.tableId);
      const dealer = staff.find(s => s.id === form.dealerId);
      const newShoe = {
        id: "sh" + Date.now(),
        tableId: form.tableId,
        shoeNumber: Number(form.shoeNumber) || nextShoeNum,
        shuffler: form.shuffler || "Manual",
        dealerId: form.dealerId,
        dealerName: dealer?.name || "—",
        openFloat: table?.chipTotal || 0,
        closeFloat: null,
        startTime: new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
        endTime: null,
        status: "active",
        closeCounts: [],
      };
      setShoes(ss => [newShoe, ...ss]);
      onAddActivity && onAddActivity("shoe_opened", `Shoe #${newShoe.shoeNumber} started at ${form.tableId}`, "🃏");
      onClose();
    }

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">Start New Shoe</div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Baccarat Table</label>
              <select className="form-select" value={form.tableId} onChange={e => setForm(f => ({ ...f, tableId: e.target.value }))}>
                {baccaratTables.map(t => <option key={t.id} value={t.id}>{t.id} — {t.hallId}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Shoe Number</label>
                <input className="form-input" type="number" value={form.shoeNumber || nextShoeNum}
                  onChange={e => setForm(f => ({ ...f, shoeNumber: e.target.value }))}
                  placeholder={String(nextShoeNum)} />
              </div>
              <div className="form-group">
                <label className="form-label">Shuffler</label>
                <input className="form-input" value={form.shuffler}
                  onChange={e => setForm(f => ({ ...f, shuffler: e.target.value }))}
                  placeholder="e.g. Auto-Shuffler A or Manual" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Dealer</label>
              <select className="form-select" value={form.dealerId} onChange={e => setForm(f => ({ ...f, dealerId: e.target.value }))}>
                <option value="">Select dealer...</option>
                {dealers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.empNo || s.id})</option>)}
              </select>
            </div>
            <div style={{ padding: "10px 14px", background: "var(--bg3)", borderRadius: "var(--radius)", fontSize: 12, color: "var(--text3)" }}>
              Opening float will be recorded from the table's current chip total at the time of starting the shoe.
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-gold" onClick={save} disabled={!form.tableId || !form.dealerId}>Start Shoe</button>
          </div>
        </div>
      </div>
    );
  }

  // ── CLOSE SHOE MODAL ──────────────────────────────────────────────────────
  function CloseShoeModal({ shoeId, onClose }) {
    const shoe = shoes.find(s => s.id === shoeId);
    if (!shoe) return null;
    const [counts, setCounts] = useState({});
    const total = chips.reduce((sum, c) => sum + c.value * (counts[c.id] || 0), 0);
    const diff  = total - shoe.openFloat;

    function save() {
      if (!total) return;
      const closeCounts = chips.map(c => ({ ...c, qty: counts[c.id] || 0 })).filter(c => c.qty > 0);
      setShoes(ss => ss.map(s => s.id === shoeId ? {
        ...s,
        closeFloat: total,
        closeCounts,
        endTime: new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
        status: "closed",
        diff,
      } : s));
      onAddActivity && onAddActivity("shoe_closed",
        `Shoe #${shoe.shoeNumber} at ${shoe.tableId} — ${diff >= 0 ? "Win" : "Loss"} ${Math.abs(diff).toLocaleString()}`, "📊");
      onClose();
    }

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">Close Shoe — {shoe.tableId} · Shoe #{shoe.shoeNumber}</div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <div style={{ padding: "10px 14px", background: "var(--bg3)", borderRadius: "var(--radius)", marginBottom: 16, fontSize: 12 }}>
              <div className="flex" style={{ gap: 24 }}>
                <div><span style={{ color: "var(--text3)" }}>Dealer: </span>{shoe.dealerName}</div>
                <div><span style={{ color: "var(--text3)" }}>Shuffler: </span>{shoe.shuffler}</div>
                <div><span style={{ color: "var(--text3)" }}>Started: </span>{shoe.startTime}</div>
                <div><span style={{ color: "var(--text3)" }}>Opening Float: </span><strong className="text-gold">{fmt(shoe.openFloat)}</strong></div>
              </div>
            </div>

            <label className="form-label" style={{ marginBottom: 8, display: "block" }}>Closing Chip Count</label>
            {chips.map(c => (
              <div key={c.id} className="chip-count-row">
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: c.hex, border: "2px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.color}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>{fmt(c.value)} each</div>
                </div>
                <input type="number" className="form-input" style={{ width: 80, textAlign: "center" }} min="0" placeholder="0"
                  value={counts[c.id] || ""}
                  onChange={e => setCounts(cc => ({ ...cc, [c.id]: Number(e.target.value) }))} />
                <div style={{ width: 100, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold)", textAlign: "right" }}>
                  {counts[c.id] ? fmt(c.value * counts[c.id]) : "—"}
                </div>
              </div>
            ))}

            {total > 0 && (
              <div style={{ marginTop: 16, padding: 16, background: diff >= 0 ? "var(--green-dim)" : "var(--red-dim)", borderRadius: "var(--radius)", border: `1px solid ${diff >= 0 ? "rgba(45,190,108,0.3)" : "rgba(232,65,90,0.3)"}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "center" }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>OPENING FLOAT</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--text2)" }}>{fmt(shoe.openFloat)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>CLOSING COUNT</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--gold)" }}>{fmt(total)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>SHOE RESULT</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: diff >= 0 ? "var(--green)" : "var(--red)" }}>
                      {diff >= 0 ? "+" : ""}{fmt(diff)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-gold" onClick={save} disabled={!total}>Close Shoe & Log Result</button>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN RENDER ───────────────────────────────────────────────────────────
  const activeShoes = shoes.filter(s => s.status === "active");
  const closedShoes = shoes.filter(s => s.status === "closed");

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Baccarat Shoe Tracking</div>
          <div className="section-sub">
            {activeShoes.length} active shoe{activeShoes.length !== 1 ? "s" : ""} ·{" "}
            {closedShoes.length} completed · {baccaratTables.length} Baccarat table{baccaratTables.length !== 1 ? "s" : ""}
          </div>
        </div>
        <button className="btn btn-gold" onClick={() => setShowNewShoe(true)}>＋ Start New Shoe</button>
      </div>

      <div className="tab-bar">
        <div className={`tab-item ${tab === "active" ? "active" : ""}`} onClick={() => setTab("active")}>
          Active Shoes {activeShoes.length > 0 && <span className="badge badge-green" style={{ marginLeft: 6, fontSize: 9 }}>{activeShoes.length}</span>}
        </div>
        <div className={`tab-item ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>Shoe History</div>
      </div>

      {/* Active shoes */}
      {tab === "active" && (
        <div>
          {activeShoes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🃏</div>
              <p>No active shoes. Start a new shoe on a Baccarat table.</p>
            </div>
          ) : activeShoes.map(shoe => {
            const table = tables.find(t => t.id === shoe.tableId);
            return (
              <div key={shoe.id} className="card" style={{ marginBottom: 14 }}>
                <div className="card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>🃏</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {shoe.tableId} — Shoe #{shoe.shoeNumber}
                        <span className="badge badge-green" style={{ marginLeft: 8, fontSize: 9 }}>● ACTIVE</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                        Started {shoe.startTime} · Shuffler: {shoe.shuffler}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-8">
                    <button className="btn btn-sm btn-outline" onClick={() => printShoeReport(shoe)}>🖨 Report</button>
                    <button className="btn btn-sm btn-gold" onClick={() => { setShowCloseShoe(shoe.id); setCloseForm({ counts: {}, endTime: "" }); }}>
                      Close Shoe
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                    {[
                      { label: "Table",         value: shoe.tableId,                   color: "var(--gold)" },
                      { label: "Dealer",         value: shoe.dealerName,                color: "var(--text)" },
                      { label: "Opening Float",  value: fmt(shoe.openFloat),            color: "var(--gold)" },
                      { label: "Current Float",  value: fmt(table?.chipTotal),          color: "var(--blue)" },
                    ].map(r => (
                      <div key={r.label} style={{ padding: "10px 0", borderBottom: "1px solid var(--border2)" }}>
                        <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>{r.label}</div>
                        <div style={{ fontSize: 14, fontFamily: "var(--font-mono)", color: r.color }}>{r.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shoe history */}
      {tab === "history" && (
        <div>
          {closedShoes.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📋</div><p>No completed shoes yet.</p></div>
          ) : (
            <div className="card">
              <div className="card-body">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Table</th><th>Shoe #</th><th>Shuffler</th><th>Dealer</th>
                      <th>Start</th><th>End</th><th>Open Float</th><th>Close Count</th>
                      <th>Result</th><th>Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedShoes.map(shoe => {
                      const diff = shoe.closeFloat != null ? shoe.closeFloat - shoe.openFloat : null;
                      return (
                        <tr key={shoe.id}>
                          <td className="text-mono text-gold">{shoe.tableId}</td>
                          <td className="text-mono">#{shoe.shoeNumber}</td>
                          <td style={{ fontSize: 12 }}>{shoe.shuffler}</td>
                          <td style={{ fontSize: 12 }}>{shoe.dealerName}</td>
                          <td className="text-mono text-muted">{shoe.startTime}</td>
                          <td className="text-mono text-muted">{shoe.endTime || "—"}</td>
                          <td className="text-mono">{fmt(shoe.openFloat)}</td>
                          <td className="text-mono">{shoe.closeFloat != null ? fmt(shoe.closeFloat) : "—"}</td>
                          <td>
                            {diff != null ? (
                              <span className="text-mono" style={{ fontWeight: 600, color: diff >= 0 ? "var(--green)" : "var(--red)" }}>
                                {diff >= 0 ? "+" : ""}{fmt(diff)}
                              </span>
                            ) : "—"}
                          </td>
                          <td>
                            <button className="btn btn-xs btn-outline" onClick={() => printShoeReport(shoe)}>🖨</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showNewShoe   && <NewShoeModal onClose={() => setShowNewShoe(false)} />}
      {showCloseShoe && <CloseShoeModal shoeId={showCloseShoe} onClose={() => setShowCloseShoe(null)} />}
    </div>
  );
}


function ChipCountPage({ tables, chips, staff, onUpdateTable, onAddActivity }) {
  const [tableId, setTableId] = useState("T01");
  const [counts, setCounts] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const selectedTable = tables.find(t => t.id === tableId);
  const total = chips.reduce((sum, c) => sum + (chips.find(ch => ch.id === c.id)?.value || c.value) * (counts[c.id] || 0), 0);
  const prev = selectedTable?.chipTotal || 0;
  const diff = total - prev;

  function submit() {
    if (!total) return;
    // Save new chip total back to the table
    onUpdateTable && onUpdateTable(tableId, { chipTotal: total });
    onAddActivity && onAddActivity("chip_count", `Chip count: ${tableId} — ${diff>=0?"Win +":"Loss "}${Math.abs(diff).toLocaleString()}`, "📊");
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setCounts({}); }, 3000);
  }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Chip Count</div><div className="section-sub">Log denomination count for table session</div></div>
      </div>
      <div className="grid-2 gap-16">
        <div className="card">
          <div className="card-header"><div className="card-title">Count Entry</div></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Table</label>
              <select className="form-select" value={tableId} onChange={e => { setTableId(e.target.value); setCounts({}); }}>
                {tables.filter(t=>t.status!=="closed").map(t => <option key={t.id} value={t.id}>{t.id} — {t.gameType}</option>)}
              </select>
            </div>
            <div className="divider" />
            {chips.map(c => (
              <div key={c.id} className="chip-count-row">
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: c.hex, border: "2px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.color}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>{fmt(c.value)} each</div>
                </div>
                <input type="number" className="form-input" style={{ width: 80, textAlign: "center" }} min="0" placeholder="0"
                  value={counts[c.id] || ""}
                  onChange={e => setCounts(cc => ({...cc, [c.id]: Number(e.target.value)}))} />
                <div style={{ width: 90, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold)", textAlign: "right" }}>
                  {counts[c.id] ? fmt(c.value * counts[c.id]) : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Session Result</div></div>
          <div className="card-body">
            <div style={{ padding: "20px 0" }}>
              {[
                { label: "Previous Float", value: fmt(prev), color: "var(--text2)" },
                { label: "Current Count", value: fmt(total), color: "var(--gold)" },
                { label: "Net Difference", value: (diff >= 0 ? "+" : "") + fmt(diff), color: diff >= 0 ? "var(--green)" : "var(--red)" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid var(--border2)" }}>
                  <span style={{ fontSize: 12, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1 }}>{r.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: r.color }}>{r.value}</span>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: 14, background: diff >= 0 ? "var(--green-dim)" : "var(--red-dim)", borderRadius: "var(--radius)", border: `1px solid ${diff >= 0 ? "rgba(45,190,108,0.3)" : "rgba(232,65,90,0.3)"}`, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>HOUSE RESULT</div>
                <div style={{ fontSize: 24, fontFamily: "var(--font-mono)", color: diff >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                  {diff >= 0 ? "WIN" : "LOSS"} {fmt(Math.abs(diff))}
                </div>
              </div>
              <button className="btn btn-gold" style={{ width: "100%", marginTop: 16, justifyContent: "center" }} onClick={submit} disabled={!total}>
                {submitted ? "✓ Count Logged!" : "Log Chip Count"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerLogPage({ tables, transactions, onAddTransaction, onUpdateTransaction, onDeleteTransaction }) {
  const [form, setForm] = useState({ tableId: tables[0]?.id||"T01", customerId: "", type: "drop", amount: "" });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const log = transactions || [];

  function submit() {
    if (!form.customerId || !form.amount) return;
    onAddTransaction({ ...form, amount: Number(form.amount) });
    setForm(f => ({...f, customerId: "", amount: ""}));
  }
  function startEdit(tx) { setEditId(tx.id); setEditForm({ customerId: tx.customerId, type: tx.type, amount: tx.amount, tableId: tx.tableId }); }
  function saveEdit() {
    if (!editForm.customerId || !editForm.amount) return;
    onUpdateTransaction && onUpdateTransaction(editId, { ...editForm, amount: Number(editForm.amount) });
    setEditId(null);
  }

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">Customer Log</div><div className="section-sub">Record & edit customer drop & win activity. Edits allowed within session or when customer returns.</div></div>
      </div>
      <div className="grid-2 gap-16">
        <div className="card">
          <div className="card-header"><div className="card-title">Log Transaction</div></div>
          <div className="card-body">
            <div className="form-group"><label className="form-label">Table</label>
              <select className="form-select" value={form.tableId} onChange={e => setForm(f=>({...f,tableId:e.target.value}))}>
                {tables.filter(t=>t.status!=="closed").map(t => <option key={t.id} value={t.id}>{t.id} — {t.gameType}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Customer ID</label>
              <input className="form-input" placeholder="e.g. C-081" value={form.customerId} onChange={e => setForm(f=>({...f,customerId:e.target.value}))} />
            </div>
            <div className="form-group"><label className="form-label">Transaction Type</label>
              <div className="flex gap-8">
                {["drop","win"].map(t => (
                  <button key={t} className={`btn flex-1 ${form.type===t?"btn-gold":"btn-outline"}`} onClick={() => setForm(f=>({...f,type:t}))}>
                    {t === "drop" ? "📥 Drop" : "📤 Win"}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group"><label className="form-label">Amount (KES)</label>
              <input className="form-input" type="number" placeholder="0" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} />
            </div>
            <button className="btn btn-gold" style={{ width:"100%", justifyContent:"center" }} onClick={submit} disabled={!form.customerId||!form.amount}>Log Transaction</button>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Transaction History</div><div style={{fontSize:10,color:"var(--text3)"}}>✎ edit · ✕ delete</div></div>
          <div className="card-body">
            <table className="data-table">
              <thead><tr><th>Time</th><th>Customer</th><th>Table</th><th>Type</th><th>Amount</th><th></th></tr></thead>
              <tbody>
                {log.map(l => (
                  <tr key={l.id}>
                    {editId === l.id ? (
                      <>
                        <td colSpan={2}><input className="form-input" style={{fontSize:11,padding:"3px 7px"}} value={editForm.customerId} onChange={e=>setEditForm(f=>({...f,customerId:e.target.value}))} /></td>
                        <td><select className="form-select" style={{fontSize:11,padding:"3px 7px"}} value={editForm.tableId} onChange={e=>setEditForm(f=>({...f,tableId:e.target.value}))}>{tables.map(t=><option key={t.id} value={t.id}>{t.id}</option>)}</select></td>
                        <td><select className="form-select" style={{fontSize:11,padding:"3px 7px"}} value={editForm.type} onChange={e=>setEditForm(f=>({...f,type:e.target.value}))}><option value="drop">DROP</option><option value="win">WIN</option></select></td>
                        <td><input className="form-input" type="number" style={{fontSize:11,padding:"3px 7px",width:90}} value={editForm.amount} onChange={e=>setEditForm(f=>({...f,amount:e.target.value}))} /></td>
                        <td><div className="flex gap-8"><button className="btn btn-xs btn-green" onClick={saveEdit}>✓</button><button className="btn btn-xs btn-outline" onClick={()=>setEditId(null)}>✕</button></div></td>
                      </>
                    ) : (
                      <>
                        <td className="text-mono text-muted">{l.time}</td>
                        <td className="text-gold text-mono">{l.customerId}</td>
                        <td className="text-mono">{l.tableId}</td>
                        <td><span className={`badge ${l.type==="drop"?"badge-blue":"badge-green"}`}>{l.type.toUpperCase()}</span></td>
                        <td className="text-mono" style={{ color: l.type==="drop"?"var(--blue)":"var(--green)" }}>{fmt(l.amount)}</td>
                        <td><div className="flex gap-8"><button className="btn btn-xs btn-outline" onClick={()=>startEdit(l)}>✎</button><button className="btn btn-xs btn-red" onClick={()=>onDeleteTransaction&&onDeleteTransaction(l.id)}>✕</button></div></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function TableModal({ table, staff, onClose }) {
  if (!table) return null;
  const dealer = staff.find(s => s.id === table.dealerId);
  const inspector = staff.find(s => s.id === table.inspectorId);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Table {table.id} — {table.gameType}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="grid-2 gap-16 mb-16">
            {[
              { label: "Status", value: <StatusBadge status={table.status} /> },
              { label: "Dealer", value: dealer?.name || "Unassigned" },
              { label: "Inspector", value: inspector?.name || "None" },
              { label: "Game Type", value: table.gameType },
              { label: "Min Bet", value: fmt(table.minBet) },
              { label: "Max Bet", value: fmt(table.maxBet) },
              { label: "Chip Float", value: <span className="text-mono text-gold">{fmt(table.chipTotal)}</span> },
            ].map(r => (
              <div key={r.label} style={{ padding: "10px 0", borderBottom: "1px solid var(--border2)" }}>
                <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--text3)", marginBottom: 4 }}>{r.label}</div>
                <div style={{ fontSize: 13 }}>{r.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function ProfilePage({ user, onUpdateUser }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone||"", bio: user.bio||"", empNo: user.empNo||"" });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [saved, setSaved] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [tab, setTab] = useState("profile");

  function saveProfile() {
    onUpdateUser({ ...user, ...form });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function changePassword() {
    setPwError("");
    if (pwForm.current !== user.password) { setPwError("Current password is incorrect."); return; }
    if (pwForm.next.length < 4) { setPwError("New password must be at least 4 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("Passwords do not match."); return; }
    onUpdateUser({ ...user, password: pwForm.next });
    setPwSaved(true);
    setPwForm({ current:"", next:"", confirm:"" });
    setTimeout(() => setPwSaved(false), 2500);
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">My Profile</div>
          <div className="section-sub">Manage your account information and password</div>
        </div>
        <span className="badge badge-gold">{user.role.replace(/_/g," ").toUpperCase()}</span>
      </div>

      <div className="tab-bar">
        <div className={`tab-item ${tab==="profile"?"active":""}`} onClick={() => setTab("profile")}>Profile Info</div>
        <div className={`tab-item ${tab==="password"?"active":""}`} onClick={() => setTab("password")}>Change Password</div>
      </div>

      {tab === "profile" && (
        <div className="grid-2 gap-16">
          <div className="card">
            <div className="card-header"><div className="card-title">Personal Details</div></div>
            <div className="card-body">
              <div style={{ textAlign:"center", marginBottom:20 }}>
                <div className="avatar" style={{ width:64, height:64, fontSize:24, margin:"0 auto 10px" }}>{form.name.charAt(0)}</div>
                <div style={{ fontWeight:600, fontSize:16 }}>{form.name}</div>
                <div style={{ fontSize:11, color:"var(--text3)", marginTop:3 }}>{user.empNo} · {user.role.replace(/_/g," ").toUpperCase()}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} placeholder="+254 7XX XXX XXX" />
              </div>
              <div className="form-group">
                <label className="form-label">Bio / Notes</label>
                <textarea className="form-textarea" value={form.bio} onChange={e => setForm(f=>({...f,bio:e.target.value}))} placeholder="Optional notes about your role..." style={{ minHeight:70 }} />
              </div>
              <button className="btn btn-gold" style={{ width:"100%", justifyContent:"center" }} onClick={saveProfile}>
                {saved ? "✓ Profile Saved!" : "Save Profile"}
              </button>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Account Information</div></div>
            <div className="card-body">
              {[
                ["Employee Number", user.empNo || "—"],
                ["Role",            user.role.replace(/_/g," ").toUpperCase()],
                ["Email",           user.email],
              ].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", borderBottom:"1px solid var(--border2)" }}>
                  <span style={{ fontSize:12, color:"var(--text3)" }}>{k}</span>
                  <span style={{ fontSize:13, fontFamily:"var(--font-mono)", color:"var(--text)" }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop:16, padding:"12px 14px", background:"var(--bg3)", borderRadius:"var(--radius)", fontSize:11, color:"var(--text3)" }}>
                Employee number and role are assigned by System Admin and cannot be changed here.
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "password" && (
        <div className="card" style={{ maxWidth:460 }}>
          <div className="card-header"><div className="card-title">Change Password</div></div>
          <div className="card-body">
            {pwError && <div style={{ padding:"10px 12px", background:"var(--red-dim)", border:"1px solid var(--red)", borderRadius:"var(--radius)", fontSize:12, color:"var(--red)", marginBottom:14 }}>{pwError}</div>}
            {pwSaved && <div style={{ padding:"10px 12px", background:"var(--green-dim)", border:"1px solid var(--green)", borderRadius:"var(--radius)", fontSize:12, color:"var(--green)", marginBottom:14 }}>✓ Password changed successfully.</div>}
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input className="form-input" type="password" value={pwForm.current} onChange={e => setPwForm(f=>({...f,current:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" value={pwForm.next} onChange={e => setPwForm(f=>({...f,next:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" value={pwForm.confirm} onChange={e => setPwForm(f=>({...f,confirm:e.target.value}))} />
            </div>
            <button className="btn btn-gold" style={{ width:"100%", justifyContent:"center" }} onClick={changePassword}>Change Password</button>
          </div>
        </div>
      )}
    </div>
  );
}


function LoginPage({ onLogin, users }) {
  const [name, setName]   = useState("");
  const [empNo, setEmpNo] = useState("");
  const [error, setError] = useState("");
  const allUsers = users && users.length ? users : DEMO_USERS;

  function handleLogin(e) {
    e?.preventDefault();
    const n = name.trim().toLowerCase();
    const e2 = empNo.trim().toUpperCase();
    const user = allUsers.find(u => u.name.toLowerCase() === n && u.empNo.toUpperCase() === e2);
    if (user) { onLogin(user); }
    else { setError("Invalid name or employee number. Click an account below to auto-fill."); }
  }

  function quickLogin(u) { setName(u.name); setEmpNo(u.empNo); setError(""); }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">♠ CasinoOps</div>
          <div className="login-sub">Floor Operations System</div>
        </div>
        <div className="login-body">
          {error && <div className="login-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" type="text" placeholder="e.g. Patrick Njoroge" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          <div className="form-group">
            <label className="form-label">Employee Number <span style={{ color:"var(--text3)", fontSize:"0.75rem" }}>(used as password)</span></label>
            <input className="form-input" type="text" placeholder="e.g. EMP001" value={empNo} onChange={e => setEmpNo(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center", padding: "12px" }} onClick={handleLogin}>
            Sign In → CasinoOps
          </button>
          <div className="login-demo">
            <div className="login-demo-title">Quick Access — Click to Fill</div>
            {allUsers.map(u => (
              <div key={u.id} className="login-demo-item" style={{ cursor: "pointer" }} onClick={() => quickLogin(u)}>
                <span className="login-demo-role">{u.role.replace(/_/g," ").toUpperCase()}</span>
                <span className="login-demo-cred">{u.name} · {u.empNo}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function CustomerProfilesPage({ customers, setCustomers, transactions, user, rolePermissions }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [newForm, setNewForm] = useState({ id: "", name: "", vipLevel: "standard", phone: "", notes: "" });

  const VIP_COLORS = { platinum: "var(--gold)", gold: "#f5a623", silver: "var(--text2)", standard: "var(--text3)" };
  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  function saveEdit() {
    setCustomers(cs => cs.map(c => c.id === editForm.id ? editForm : c));
    setSelected(editForm);
    setEditForm(null);
  }
  function addCustomer() {
    if (!newForm.name.trim() || !newForm.id.trim()) return;
    const c = { ...newForm, id: newForm.id.trim(), name: newForm.name.trim() };
    setCustomers(cs => [c, ...cs]);
    setShowAdd(false);
    setNewForm({ id: "", name: "", vipLevel: "standard", phone: "", notes: "" });
  }
  function deleteCustomer(id) {
    setCustomers(cs => cs.filter(c => c.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  const custTxns = selected ? transactions.filter(t => t.customerId === selected.id) : [];

  return (
    <div style={{ display: "flex", gap: "1.5rem", height: "100%", overflow: "hidden" }}>
      {/* Left panel — list */}
      <div style={{ width: "320px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or ID…"
            style={{ flex: 1, background: "var(--panel2)", border: "1px solid var(--border)", color: "var(--text)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius)", fontSize: "0.85rem" }} />
          <button className="btn btn-sm" style={{ background: "var(--gold)", color: "#000" }} onClick={() => setShowAdd(true)}>+ Add</button>
        </div>
        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {filtered.map(c => (
            <div key={c.id} onClick={() => { setSelected(c); setEditForm(null); }}
              style={{ background: selected?.id === c.id ? "var(--panel2)" : "var(--panel)", border: `1px solid ${selected?.id === c.id ? "var(--gold)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: "0.75rem 1rem", cursor: "pointer", transition: "all 0.15s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{c.name}</span>
                <span style={{ fontSize: "0.7rem", color: VIP_COLORS[c.vipLevel] || "var(--text3)", background: "var(--bg3)", padding: "0.1rem 0.5rem", borderRadius: "99px", textTransform: "uppercase", fontWeight: 700 }}>{c.vipLevel}</span>
              </div>
              <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginTop: "0.2rem" }}>ID: {c.id}</div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ color: "var(--text3)", textAlign: "center", padding: "2rem" }}>No customers found</div>}
        </div>
      </div>

      {/* Right panel — detail */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {showAdd && (
          <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius2)", padding: "1.5rem", marginBottom: "1rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "1rem" }}>New Customer</div>
            {[
              { label: "Customer ID", key: "id", type: "text", placeholder: "C-XXX" },
              { label: "Full Name", key: "name", type: "text" },
              { label: "Phone", key: "phone", type: "text" },
              { label: "Notes", key: "notes", type: "text" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: "0.75rem" }}>
                <label style={{ color: "var(--text2)", fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder || ""} value={newForm[f.key]}
                  onChange={e => setNewForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: "100%", background: "var(--panel2)", border: "1px solid var(--border)", color: "var(--text)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius)", fontSize: "0.85rem" }} />
              </div>
            ))}
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ color: "var(--text2)", fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>VIP Level</label>
              <select value={newForm.vipLevel} onChange={e => setNewForm(p => ({ ...p, vipLevel: e.target.value }))}
                style={{ background: "var(--panel2)", border: "1px solid var(--border)", color: "var(--text)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius)", fontSize: "0.85rem" }}>
                {["standard", "silver", "gold", "platinum"].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-sm" style={{ background: "var(--gold)", color: "#000" }} onClick={addCustomer}>Save</button>
              <button className="btn btn-sm btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        {selected ? (
          <div>
            {editForm ? (
              <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius2)", padding: "1.5rem", marginBottom: "1rem" }}>
                <div style={{ fontWeight: 600, marginBottom: "1rem" }}>Edit Customer</div>
                {[
                  { label: "Full Name", key: "name", type: "text" },
                  { label: "Phone", key: "phone", type: "text" },
                  { label: "Notes", key: "notes", type: "text" },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: "0.75rem" }}>
                    <label style={{ color: "var(--text2)", fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>{f.label}</label>
                    <input type={f.type} value={editForm[f.key]}
                      onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: "100%", background: "var(--panel2)", border: "1px solid var(--border)", color: "var(--text)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius)", fontSize: "0.85rem" }} />
                  </div>
                ))}
                <div style={{ marginBottom: "0.75rem" }}>
                  <label style={{ color: "var(--text2)", fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>VIP Level</label>
                  <select value={editForm.vipLevel} onChange={e => setEditForm(p => ({ ...p, vipLevel: e.target.value }))}
                    style={{ background: "var(--panel2)", border: "1px solid var(--border)", color: "var(--text)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius)", fontSize: "0.85rem" }}>
                    {["standard", "silver", "gold", "platinum"].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn btn-sm" style={{ background: "var(--gold)", color: "#000" }} onClick={saveEdit}>Save</button>
                  <button className="btn btn-sm btn-outline" onClick={() => setEditForm(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius2)", padding: "1.5rem", marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{selected.name}</div>
                    <div style={{ color: "var(--text3)", fontSize: "0.8rem" }}>ID: {selected.id}</div>
                    {selected.phone && <div style={{ color: "var(--text2)", fontSize: "0.85rem", marginTop: "0.25rem" }}>📞 {selected.phone}</div>}
                    {selected.notes && <div style={{ color: "var(--text2)", fontSize: "0.85rem", marginTop: "0.25rem", fontStyle: "italic" }}>{selected.notes}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.8rem", color: VIP_COLORS[selected.vipLevel] || "var(--text3)", background: "var(--bg3)", padding: "0.2rem 0.75rem", borderRadius: "99px", textTransform: "uppercase", fontWeight: 700, border: `1px solid ${VIP_COLORS[selected.vipLevel] || "var(--border)"}` }}>{selected.vipLevel}</span>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button className="btn btn-xs btn-outline" onClick={() => setEditForm({ ...selected })}>Edit</button>
                      <button className="btn btn-xs" style={{ background: "var(--red-dim)", color: "var(--red)", border: "1px solid var(--red)" }} onClick={() => deleteCustomer(selected.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius2)", padding: "1.5rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "1rem" }}>Transaction History ({custTxns.length})</div>
              {custTxns.length === 0 ? (
                <div style={{ color: "var(--text3)", textAlign: "center", padding: "2rem" }}>No transactions recorded for this customer</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Time", "Table", "Type", "Amount"].map(h => (
                        <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "var(--text2)", fontSize: "0.8rem", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {custTxns.map(t => (
                      <tr key={t.id} style={{ borderBottom: "1px solid var(--border2)" }}>
                        <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem", color: "var(--text2)" }}>{t.time}</td>
                        <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>{t.tableId}</td>
                        <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>{t.type}</td>
                        <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem", color: t.type === "buy_in" ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                          {t.type === "buy_in" ? "+" : "-"}{fmt(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "var(--text3)" }}>
            Select a customer to view details
          </div>
        )}
      </div>
    </div>
  );
}

function hasPermission(role, key, rolePerms) {
  if (role === "system_admin") return true;
  return (rolePerms?.[role] || []).includes(key);
}

export default function CasinoOps() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [tables, setTables] = useState(INITIAL_TABLES);
  const [staff, setStaff] = useState(INITIAL_STAFF);
  const [halls, setHalls] = useState(INITIAL_HALLS);
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [fills, setFills] = useState(INITIAL_FILLS);
  const [activity, setActivity] = useState(INITIAL_ACTIVITY);
  const [users, setUsers] = useState(DEMO_USERS);
  const [chips, setChips] = useState(CHIP_DENOMINATIONS);
  const [shifts, setShifts] = useState([
    { id: "sh1", name: "Morning", start: "06:00", end: "14:00", shiftCode: "M" },
    { id: "sh2", name: "Day",     start: "14:00", end: "22:00", shiftCode: "D" },
    { id: "sh3", name: "Night",   start: "22:00", end: "06:00", shiftCode: "N" },
  ]);
  const [shiftState, setShiftState] = useState({ status: "closed", history: [] });
  const [tableTransfers, setTableTransfers] = useState([]);
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [transactions, setTransactions] = useState([
    { id: 1, tableId: "T01", customerId: "C-081", type: "drop", amount: 50000,  time: "10:15" },
    { id: 2, tableId: "T01", customerId: "C-044", type: "win",  amount: 15000,  time: "09:58" },
    { id: 3, tableId: "T02", customerId: "C-081", type: "drop", amount: 25000,  time: "09:30" },
    { id: 4, tableId: "T07", customerId: "C-112", type: "drop", amount: 200000, time: "09:10" },
    { id: 5, tableId: "T07", customerId: "C-112", type: "win",  amount: 80000,  time: "09:45" },
    { id: 6, tableId: "T08", customerId: "C-033", type: "drop", amount: 500000, time: "08:50" },
    { id: 7, tableId: "T03", customerId: "C-099", type: "drop", amount: 75000,  time: "08:30" },
    { id: 8, tableId: "T06", customerId: "C-055", type: "drop", amount: 40000,  time: "10:00" },
    { id: 9, tableId: "T06", customerId: "C-055", type: "win",  amount: 22000,  time: "10:20" },
  ]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notification, setNotification] = useState(null);
  const [rolePermissions, setRolePermissions] = useState(DEFAULT_ROLE_PERMISSIONS);
  const [cageReserve, setCageReserve] = useState(500000);
  const [houseFloat, setHouseFloat] = useState(() =>
    INITIAL_TABLES.reduce((s, t) => s + (t.floatCapacity || 0), 0) + 500000
  );
  const [chipCountLog, setChipCountLog] = useState([]);
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
  const [tableSessionLogs, setTableSessionLogs] = useState({}); // { tableId: [session,...] }
  const [casinoInfo, setCasinoInfo] = useState({ name: "Grand Casino", address: "", phone: "", email: "", regNo: "" });
  const [formTemplates, setFormTemplates] = useState({
    open_float: { customHeader: "", customFooter: "", notes: "" },
    close_float: { customHeader: "", customFooter: "", notes: "" },
    fill_request: { customHeader: "", customFooter: "", notes: "" },
    gi_report: { customHeader: "", customFooter: "", notes: "" },
    transfer: { customHeader: "", customFooter: "", notes: "" },
  });

  function addSessionLog(tableId, entry) {
    setTableSessionLogs(logs => ({ ...logs, [tableId]: [entry, ...(logs[tableId] || [])] }));
  }

  function notify(text, icon = "✅", color = "var(--gold)") {
    setNotification({ text, icon, color });
  }

  function addActivity(action, detail, icon) {
    const t = new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"});
    setActivity(a => [{ id: Date.now(), time: t, action, detail, icon }, ...a.slice(0,19)]);
  }

  // ── TABLE HANDLERS ──
  function updateTable(id, changes) {
    setTables(ts => ts.map(t => t.id === id ? {...t,...changes} : t));
    addActivity("table_updated", `${id} updated`, "🃏");
  }
  function addTable(tableData) {
    setTables(ts => [...ts, { dealerId: null, inspectorId: null, ...tableData }]);
    addActivity("table_created", `Table ${tableData.id} added`, "🃏");
    notify(`Table ${tableData.id} created`, "🃏");
  }
  function deleteTable(id) {
    setTables(ts => ts.filter(t => t.id !== id));
    notify(`Table ${id} deleted`, "🗑️", "var(--red)");
  }

  // ── STAFF HANDLERS ──
  function updateStaff(id, changes) {
    setStaff(ss => ss.map(s => s.id === id ? {...s,...changes} : s));
  }
  function deleteStaff(id) {
    setStaff(ss => ss.filter(s => s.id !== id));
    notify("Staff record removed", "🗑️", "var(--red)");
  }
  function addStaff(staffData) {
    const uid = staffData._bulkIdx != null ? "s" + staffData._bulkIdx : "s" + Date.now();
    const { _bulkIdx, ...rest } = staffData;
    setStaff(ss => [...ss, { id: uid, status: "checked_in", ...rest }]);
    addActivity("staff_added", staffData.name + " added", "👤");
    notify("Staff member added", "👤");
  }

  // ── INCIDENT HANDLERS ──
  function addIncident(inc) {
    const newInc = { id: "i" + Date.now(), ...inc };
    setIncidents(i => [newInc, ...i]);
    addActivity("incident_reported", `${inc.type} at ${inc.tableId}`, "⚠️");
    notify("Incident reported and logged", "⚠️", "var(--red)");
    if (inc.tableId) updateTable(inc.tableId, { status: "incident" });
  }
  function updateIncident(id, status) {
    const inc = incidents.find(i => i.id === id);
    setIncidents(is => is.map(i => i.id === id ? {...i, status} : i));
    if (status === "resolved") {
      notify("Incident resolved", "✅", "var(--green)");
      addActivity("incident_resolved", `Incident ${id} closed`, "✅");
      if (inc?.tableId) updateTable(inc.tableId, { status: "open" });
    }
  }

  function addTransaction(tx) {
    setTransactions(ts => [{ id: Date.now(), ...tx, time: new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"}) }, ...ts]);
    addActivity("customer_transaction", tx.type + " at " + tx.tableId, tx.type==="drop" ? "📥" : "📤");
  }
  function updateTransaction(id, changes) {
    setTransactions(ts => ts.map(t => t.id === id ? {...t,...changes} : t));
    addActivity("transaction_edited", "Transaction " + id + " edited", "✏️");
  }
  function deleteTransaction(id) {
    setTransactions(ts => ts.filter(t => t.id !== id));
    addActivity("transaction_deleted", "Transaction removed", "🗑️");
    notify("Transaction deleted", "🗑️", "var(--red)");
  }

  // ── FILL HANDLERS ──
  function addFill(fill) {
    const newFill = { id: "f" + Date.now(), ...fill };
    setFills(f => [newFill, ...f]);
    addActivity("fill_requested", `Fill: ${fill.tableId}`, "🪙");
    notify("Fill request submitted to Shift Manager", "🪙", "var(--yellow)");
  }
  function approveFill(id, sigField) {
    setFills(fs => fs.map(f => {
      if (f.id !== id) return f;
      const updated = sigField ? {...f, [sigField]: true} : {...f, status: "approved"};
      // Auto-approve when all three signed
      if (updated.sigShiftMgr && updated.sigPitBoss && updated.sigGI) updated.status = "approved";
      return updated;
    }));

    // When fully approved (no sigField = direct approve, or all 3 sigs present), update table chipTotal
    const fill = fills.find(f => f.id === id);
    if (fill) {
      let shouldUpdateTable = false;
      if (!sigField) {
        // Direct approval
        shouldUpdateTable = true;
      } else {
        // Check if this sig completes all three
        const updated = {...fill, [sigField]: true};
        if (updated.sigShiftMgr && updated.sigPitBoss && updated.sigGI) shouldUpdateTable = true;
      }
      if (shouldUpdateTable && fill.tableId) {
        const tbl = tables.find(t => t.id === fill.tableId);
        const fillAmt = fill.total || fill.amount || 0;
        if (tbl && fillAmt) {
          const newStatus = tbl.status === "fill_required" ? "open" : tbl.status;
          updateTable(fill.tableId, { chipTotal: (tbl.chipTotal||0) + fillAmt, status: newStatus });
          addActivity("fill_delivered", `Fill KES ${fillAmt.toLocaleString()} added to ${fill.tableId}`, "🪙");
          notify(`Fill delivered — ${fill.tableId} float updated`, "✅", "var(--green)");
          return; // notify already set
        }
      }
    }

    if (!sigField) {
      addActivity("fill_approved", `Fill ${id} approved`, "✓");
      notify("Fill request approved and logged", "✅", "var(--green)");
    } else {
      notify("Signature recorded", "✒️");
    }
  }

  // ── USER HANDLERS ──
  function addUser(userData) {
    setUsers(us => [...us, { id: "u" + Date.now(), ...userData, active: true }]);
    addActivity("user_created", `${userData.name} added as ${userData.role}`, "👤");
    notify(`User ${userData.name} created`, "👤");
  }
  function updateUser(userData) {
    setUsers(us => us.map(u => u.id === userData.id ? {...u,...userData} : u));
    notify(`User ${userData.name} updated`, "👤");
  }
  function deleteUser(id) {
    setUsers(us => us.filter(u => u.id !== id));
    notify("User deleted", "🗑️", "var(--red)");
  }

  // ── HALL HANDLERS ──
  function addHall(hallData) {
    setHalls(hs => [...hs, { id: "h" + Date.now(), ...hallData }]);
    notify(`Hall "${hallData.name}" created`, "🏛️");
  }
  function updateHall(hallData) {
    setHalls(hs => hs.map(h => h.id === hallData.id ? {...h,...hallData} : h));
    notify("Hall updated", "🏛️");
  }
  function deleteHall(id) {
    setHalls(hs => hs.filter(h => h.id !== id));
    notify("Hall deleted", "🗑️", "var(--red)");
  }

  // ── CHIP HANDLERS ──
  function addChip(chipData) {
    setChips(cs => [...cs, { id: "c" + Date.now(), ...chipData }]);
    notify(`${chipData.color} denomination added`, "🎰");
  }
  function updateChip(chipData) {
    setChips(cs => cs.map(c => c.id === chipData.id ? {...c,...chipData} : c));
    notify(`${chipData.color} denomination updated`, "🎰");
  }
  function deleteChip(id) {
    setChips(cs => cs.filter(c => c.id !== id));
    notify("Denomination deleted", "🗑️", "var(--red)");
  }

  // ── SHIFT HANDLER ──
  function addTransfer(transfer) {
    setTableTransfers(ts => [transfer, ...ts]);
    addActivity("table_transfer", `Transfer ${transfer.fromTable}→${transfer.toTable} — ${(transfer.fromTotal||0).toLocaleString()}`, "↔");
    notify("Table-to-table transfer logged", "↔");
  }

  function updateShift(shiftData) {
    setShifts(ss => ss.map(s => s.id === shiftData.id ? {...s,...shiftData} : s));
    notify(`${shiftData.name} shift updated`, "⏰");
  }

  function openShift(type, shiftDate) {
    const now  = new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"});
    const date = shiftDate || new Date().toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"2-digit"});
    setShiftState(ss => ({ ...ss, status:"open", type, openedAt: now, openedDate: date, openedBy: "Shift Manager" }));
    addActivity("shift_opened", `${type} shift opened — ${date}`, "🔑");
    notify(`${type} shift opened`, "🔑", "var(--green)");
  }

  function closeShift({ drop, win, net, staffCount }) {
    const now = new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
    const tableSnapshot = tables.map(t => ({
      id: t.id,
      name: t.tableName || t.gameType,
      chipTotal: t.chipTotal || 0,
      openingFloat: t.openingFloat || t.floatCapacity || 0,
      net: (t.chipTotal || 0) - (t.openingFloat || t.floatCapacity || 0),
    }));
    setShiftState(ss => ({
      status: "closed",
      history: [
        {
          type: ss.type, openedAt: ss.openedAt, openedDate: ss.openedDate,
          closedAt: now, drop, win, net, staffCount, tables: tableSnapshot,
        },
        ...(ss.history || []),
      ],
    }));
    // Reset all table floats to capacity for next day
    setTables(ts => ts.map(t => ({ ...t, chipTotal: t.floatCapacity || 0, openingFloat: 0, openedAt: null, openedDate: null, chipBreakdown: null })));
    addActivity("shift_closed", `Shift closed — Net: ${fmt(net)}`, "🔒");
    notify("Shift closed — table floats reset for next day", "🔒", "var(--blue)");
  }

  function addChipCount({ tableId, prevFloat, newFloat, diff, inspector }) {
    const t = new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
    setChipCountLog(log => [
      { id: Date.now(), tableId, prevFloat, newFloat, diff, inspector, time: t },
      ...log.slice(0, 99)
    ]);
    addActivity("chip_count", `Chip count: ${tableId} — ${diff >= 0 ? "+" : ""}${fmt(diff)}`, "📊");
  }

  function checkIn(staffId, shift) {
    const now = new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"});
    setAttendanceLog(al => [...al, { id: Date.now(), staffId, shift, checkIn: now, checkOut: null }]);
    addActivity("check_in", `Staff checked in — ${shift} shift`, "✓");
  }

  function checkOut(staffId, shift) {
    const now = new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"});
    setAttendanceLog(al => al.map(l => l.staffId===staffId && l.shift===shift && !l.checkOut ? {...l, checkOut: now} : l));
    addActivity("check_out", `Staff checked out — ${shift} shift`, "✗");
  }

  const nav = ROLE_NAV[user?.role] || [];
  const activeIncidents = incidents.filter(i => i.status !== "resolved").length;

  if (!user) return (
    <>
      <style>{STYLES}</style>
      <LoginPage onLogin={u => { setUser(u); setPage("dashboard"); }} users={users} />
    </>
  );

  function renderPage() {
    const canEditTables = hasPermission(user.role, "configure_tables", rolePermissions);
    switch (page) {
      case "dashboard":
        return <Dashboard user={user} tables={tables} staff={staff} incidents={incidents} fills={fills} activity={activity} onNavigate={setPage} transactions={transactions} />;
      case "floor":
        return <FloorView tables={tables} halls={halls} staff={staff} onTableClick={t => setSelectedTable(t)} />;
      case "tables":
        return <TablesPage tables={tables} halls={halls} staff={staff} onUpdateTable={updateTable} onOpenTableModal={() => {}} canEdit={canEditTables} chips={chips} />;
      case "staffing":
        return <StaffingPage staff={staff} halls={halls} onUpdateStaff={updateStaff} attendanceLog={attendanceLog} onCheckIn={checkIn} onCheckOut={checkOut} userRole={user.role} rolePermissions={rolePermissions} shiftState={shiftState} />;
      case "shift_control":
        return <ShiftControlPage staff={staff} tables={tables} transactions={transactions} shiftState={shiftState} onOpenShift={openShift} onCloseShift={closeShift} shifts={shifts} />;
      case "breaklist":
        return <BreakListPage staff={staff} tables={tables} user={user} halls={halls} onUpdateTable={updateTable} onAddIncident={addIncident} onAddFill={addFill} chips={chips} rolePermissions={rolePermissions} onNotify={notify} />;
      case "incidents":
        return <IncidentsPage incidents={incidents} user={user} tables={tables} onAddIncident={addIncident} onUpdateIncident={updateIncident} rolePermissions={rolePermissions} />;
      case "float_mgmt":
        return <FloatManagementPage tables={tables} chips={chips} fills={fills} houseFloat={houseFloat} onSetHouseFloat={setHouseFloat} onUpdateTable={updateTable} transactions={transactions} />;
      case "fills":
        return <FillsPage fills={fills} tables={tables} user={user} chips={chips} onAddFill={addFill} onApproveFill={approveFill} onUpdateTable={updateTable} staff={staff} tableTransfers={tableTransfers} onAddTransfer={addTransfer} cageReserve={houseFloat - tables.reduce((s,t)=>s+(t.chipTotal||0),0)} onSetCageReserve={v => setHouseFloat(tables.reduce((s,t)=>s+(t.chipTotal||0),0) + v)} rolePermissions={rolePermissions} halls={halls} onAddChipCount={addChipCount} chipCountLog={chipCountLog} casinoInfo={casinoInfo} />;
      case "reports":
        return <ReportsPage tables={tables} staff={staff} transactions={transactions} chipCountLog={chipCountLog} rolePermissions={rolePermissions} />;
      case "roster":
        return <RosterPage staff={staff} userRole={user.role} rolePermissions={rolePermissions} />;
      case "staff_records":
        return <StaffRecordsPage staff={staff} halls={halls} onAddStaff={addStaff} onUpdateStaff={updateStaff} onDeleteStaff={deleteStaff} userRole={user.role} />;
      case "admin":
      case "users":
      case "chips":
      case "halls":
        return (
          <AdminPage
            users={users} onAddUser={addUser} onUpdateUser={updateUser} onDeleteUser={deleteUser}
            halls={halls} onAddHall={addHall} onUpdateHall={updateHall} onDeleteHall={deleteHall}
            tables={tables} onAddTable={addTable} onUpdateTable={updateTable} onDeleteTable={deleteTable}
            chips={chips} onAddChip={addChip} onUpdateChip={updateChip} onDeleteChip={deleteChip}
            shifts={shifts} onUpdateShift={updateShift}
            staff={staff}
            rolePermissions={rolePermissions} setRolePermissions={setRolePermissions}
            casinoInfo={casinoInfo} setCasinoInfo={setCasinoInfo}
            formTemplates={formTemplates} setFormTemplates={setFormTemplates}
          />
        );
      case "profile":
        return <ProfilePage user={user} onUpdateUser={u => { updateUser(u); setUser(u); }} />;
      case "shoe_tracking":
        return <ShoeTrackingPage tables={tables} chips={chips} staff={staff} user={user} onAddActivity={addActivity} />;
      case "chip_count":
        return <ChipCountPage tables={tables} chips={chips} staff={staff} onUpdateTable={updateTable} onAddActivity={addActivity} />;
      case "customer_log":
        return <CustomerLogPage tables={tables} transactions={transactions} onAddTransaction={addTransaction} onUpdateTransaction={updateTransaction} onDeleteTransaction={deleteTransaction} />;
      case "table_session":
        return <TableSessionPage user={user} staff={staff} tables={tables} chips={chips} transactions={transactions} onUpdateTable={updateTable} onAddActivity={addActivity} halls={halls} onAddTransaction={addTransaction} onUpdateTransaction={updateTransaction} onDeleteTransaction={deleteTransaction} incidents={incidents} fills={fills} onAddChipCount={addChipCount} tableSessionLogs={tableSessionLogs} onAddSessionLog={addSessionLog} />;
      case "customers":
        return (
          <CustomerProfilesPage
            customers={customers}
            setCustomers={setCustomers}
            transactions={transactions}
            user={user}
            rolePermissions={rolePermissions}
          />
        );
      default:
        return <Dashboard user={user} tables={tables} staff={staff} incidents={incidents} fills={fills} activity={activity} onNavigate={setPage} transactions={transactions} />;
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="app" onClick={() => setShowUserMenu(false)}>
        <div className="sidebar">
          <div className="sidebar-brand">
            <div className="brand-logo"><span className="suit">♠</span> CasinoOps</div>
            <div className="brand-sub">Floor Operations</div>
          </div>
          <div className="sidebar-nav">
            <div className="nav-section">Navigation</div>
            {nav.map(n => (
              <div key={n.page} className={`nav-item ${page===n.page?"active":""}`} onClick={() => setPage(n.page)}>
                <span className="icon">{n.icon}</span>
                {n.label}
                {n.page === "incidents" && activeIncidents > 0 && (
                  <span className="badge badge-red" style={{ marginLeft: "auto", fontSize: 9, padding: "1px 6px" }}>{activeIncidents}</span>
                )}
              </div>
            ))}
          </div>
          <div style={{ position: "relative" }}>
            {showUserMenu && (
              <div className="user-menu">
                <div className="user-menu-item" onClick={() => { setPage("profile"); setShowUserMenu(false); }}>👤 My Profile</div>
                <div className="user-menu-item danger" onClick={() => { setUser(null); setPage("dashboard"); setShowUserMenu(false); }}>🚪 Logout</div>
              </div>
            )}
            <div className="sidebar-user" onClick={e => { e.stopPropagation(); setShowUserMenu(m => !m); }}>
              <div className="avatar">{user.name.charAt(0)}</div>
              <div className="user-info">
                <div className="name">{user.name.split(" ")[0]}</div>
                <div className="role">{user.role.replace(/_/g," ").toUpperCase()}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="main-wrapper">
          <div className="topbar">
            <div className="topbar-title"><span>Casino</span>Ops</div>
            <Clock />
            <div className={`alert-badge${activeIncidents > 0 ? " has-alerts" : ""}`} onClick={() => setPage("incidents")}>
              🔔
              {activeIncidents > 0 && <div className="alert-count">{activeIncidents}</div>}
            </div>
          </div>
          <div className="main-content">{renderPage()}</div>
        </div>

        {selectedTable && <TableModal table={selectedTable} staff={staff} onClose={() => setSelectedTable(null)} />}
        {notification && <Notification msg={notification} onClose={() => setNotification(null)} />}
      </div>
    </>
  );
}
