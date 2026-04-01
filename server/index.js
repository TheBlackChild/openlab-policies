require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Static files (bundle.js, etc.)
app.use(express.static(path.join(__dirname, '..')));

// API routes
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/state',       require('./routes/state'));
app.use('/api/tables',      require('./routes/tables'));
app.use('/api/staff',       require('./routes/staff'));
app.use('/api/halls',       require('./routes/halls'));
app.use('/api/chips',       require('./routes/chips'));
app.use('/api/shifts',      require('./routes/shifts'));
app.use('/api/fills',       require('./routes/fills'));
app.use('/api/incidents',   require('./routes/incidents'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/transfers',   require('./routes/transfers'));
app.use('/api/attendance',  require('./routes/attendance'));
app.use('/api/chip-counts', require('./routes/chipCounts'));
app.use('/api/customers',   require('./routes/customers'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/activity',    require('./routes/activity'));
app.use('/api/settings',    require('./routes/settings'));
app.use('/api/permissions', require('./routes/permissions'));

// SPA fallback — serve CasinoOps.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'CasinoOps.html'));
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CasinoOps API running on :${PORT}`));
