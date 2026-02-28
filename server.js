const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');

const streamsRouter = require('./routes/streams');
const config = require('./config');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;

// Simple in-memory user store (for plan/demo purposes)
const USERS = {
  admin: { id: 'u-admin', username: 'admin', password: 'admin', role: 'admin' },
  user: { id: 'u-user', username: 'user', password: 'user', role: 'user' }
};

app.use(cors());
app.use(bodyParser.json());
// Session support
app.use(session({
  secret: 'vibe-sess-secret',
  resave: false,
  saveUninitialized: false
}));

function requireRole(role) {
  return function (req, res, next) {
    const u = req.session.user || null;
    if (!u) return res.status(401).json({ error: 'Unauthorized' });
    if (role && u.role !== role) return res.status(403).json({ error: 'Forbidden' });
    req.user = u;
    next();
  };
}

app.use('/streams', streamsRouter);

// Simple login/logout routes (Phase: admin/login fix)
app.get('/login', (req, res) => {
  res.send(`<!doctype html><html><body><h2>Login</h2><form id="login-form"><input name="username" placeholder="username"/><br/><input name="password" placeholder="password" type="password"/><br/><button type="submit">Login</button></form><script>document.getElementById('login-form').addEventListener('submit', async e=>{e.preventDefault(); const form=new FormData(e.target); const res=await fetch('/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.get('username'), password:form.get('password')})}); const r=await res.json(); if(r.ok){ window.location.href = '/admin'; } else { alert(r.error||'Login failed'); } });</script></body></html>`);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false, error: 'credentials required' });
  // Simple credential check against in-memory store
  const user = Object.values(USERS).find((u) => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ ok: false, error: 'invalid credentials' });
  req.session.user = { id: user.id, username: user.username, role: user.role };
  res.json({ ok: true, user: req.session.user });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ ok: false, error: 'not logged in' });
  res.json({ ok: true, user: req.session.user });
});

// Simple health and feature flag helper
app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/admin/vibe-status', (req, res) => {
  res.json({ enabled: !!config.features.vibeStreams });
});

// Admin endpoint to toggle Vibe Streams rollout (Phase X5)
app.post('/admin/vibe-status', (req, res) => {
  const enabled = req.body && typeof req.body.enabled === 'boolean' ? req.body.enabled : null;
  if (enabled === null) {
    return res.status(400).json({ error: 'enabled boolean required' });
  }
  config.features.vibeStreams = enabled;
  res.json({ enabled });
});

// Initialize DB and start server
db.init()
  .then(() => {
    // Admin route protection example: ensure admin can toggle vibe-status
    app.get('/admin', (req, res) => {
      const u = req.session.user;
      if (!u) return res.redirect('/login');
      if (u.role !== 'admin') return res.status(403).send('<h1>Forbidden</h1>');
      res.send(`<!doctype html><html><body><h1>Admin Console</h1>
        <div id="status"></div>
        <button id="toggle">Toggle Vibe Streams</button>
        <script>async function load(){const r= await fetch('/admin/vibe-status'); const s= await r.json(); document.getElementById('status').innerText='Vibe Streams: '+(s.enabled?'Enabled':'Disabled');}
        document.getElementById('toggle').addEventListener('click', async ()=>{ const r = await fetch('/admin/vibe-status', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({enabled: !(document.getElementById('status').innerText.includes('Enabled'))})}); await r.json(); await load();});
        load();</script></body></html>`);
    });
    app.listen(port, () => {
      console.log(`Vibe Hub server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize DB', err);
    process.exit(1);
  });
