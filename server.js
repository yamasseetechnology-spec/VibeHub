const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const streamsRouter = require('./routes/streams');
const followsRouter = require('./routes/follows');
const auth = require('./middleware/auth');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;

// Serve static assets from public folder (Phase X3 UI)
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
// JWT-based auth; no session usage

app.use('/streams', streamsRouter);
// Auth routes (production login via JWT)
const authRouter = require('./routes/auth');
app.use('/auth', authRouter);
// Timeline & Discovery endpoints (Phase X4)
const timelineRouter = require('./routes/timeline');
app.use('/', timelineRouter);
// Follows endpoints (Phase X4)
app.use('/follows', followsRouter);

// JWT-based login is available under /auth (see routes/auth.js). No session-based login.

// Simple health and feature flag helper
app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/admin/vibe-status', auth.authenticateToken, auth.requireRole('admin'), async (req, res) => {
  try {
    const flag = await db.getFlag('vibeStreams');
    const enabled = flag !== null ? flag === 'true' : false;
    res.json({ enabled });
  } catch (e) {
    res.status(500).json({ error: 'flag fetch failed' });
  }
});

// Admin endpoint to toggle Vibe Streams rollout (Phase X5)
app.post('/admin/vibe-status', auth.authenticateToken, auth.requireRole('admin'), async (req, res) => {
  const enabled = req.body && typeof req.body.enabled === 'boolean' ? req.body.enabled : null;
  if (enabled === null) {
    return res.status(400).json({ error: 'enabled boolean required' });
  }
  await db.setFlag('vibeStreams', String(enabled));
  res.json({ enabled });
});

// Admin dashboard (Phase X5) - concise overview and quick toggle
app.get('/admin/dashboard', auth.authenticateToken, auth.requireRole('admin'), async (req, res) => {
  try {
    const flag = await db.getFlag('vibeStreams');
    const enabled = flag !== null ? flag === 'true' : false;
    const total = await db.countStreams();
    const live = await db.countLive ? await db.countLive() : 0;
    // Top streams ranking for admin dashboard
    const top = await (db.topStreams ? db.topStreams(5) : []);
    let rows = '';
    (top || []).forEach(t => {
      const score = (t.score || 0).toFixed ? (t.score || 0).toFixed(0) : t.score;
      rows += `<tr><td>${t.title || ''}</td><td>${t.host_user_id || ''}</td><td>${score}</td><td>${t.viewer_count || 0}</td><td>${t.is_live ? 'LIVE' : ''}</td></tr>`;
    });
    res.send(`<!doctype html><html><body><h1>Admin Dashboard</h1>
      <div>Vibe Streams: ${enabled ? 'Enabled' : 'Disabled'}</div>
      <div>Total streams: ${total}</div>
      <div>Live streams: ${live}</div>
      <h3>Top Streams</h3>
      <table border="1" cellpadding="4" cellspacing="0"><tr><th>Title</th><th>Host</th><th>Score</th><th>Viewer</th><th>Status</th></tr>${rows}</table>
      <button onclick="toggle()">Toggle Vibe Streams</button>
      <script>function toggle(){ fetch('/admin/vibe-status', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({enabled: ${!enabled}}) }).then(r=>r.json()).then(()=>location.reload()) }</script><script src="/admin-fab.js"></script>
    </body></html>`);
  } catch (e) {
    res.status(500).send('<h1>Dashboard load error</h1>');
  }
});

// (Removed duplicate lightweight admin console to avoid conflicts)

// Admin: Top Streams API (Phase X4) - JSON endpoint
app.get('/admin/top-streams', auth.authenticateToken, auth.requireRole('admin'), async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  try {
    const top = await db.topStreams ? await db.topStreams(limit) : [];
    res.json(top);
  } catch (e) {
    res.status(500).json({ error: 'top streams fetch failed' });
  }
});

// Initialize DB and start server
db.init()
  .then(() => {
    app.listen(port, () => {
      console.log(`Vibe Hub server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize DB', err);
    process.exit(1);
  });
