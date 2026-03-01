const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Simple in-memory user store (replace with real DB in production)
const USERS = [
  { id: 'u-admin', username: 'admin', password: 'admin', role: 'admin' },
  { id: 'u-user', username: 'user', password: 'user', role: 'user' }
];

const SECRET = process.env.JWT_SECRET || 'change-me-secure';

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false, error: 'credentials required' });
  const user = USERS.find((u) => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ ok: false, error: 'invalid credentials' });
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    iat: now,
    exp: now + 60 * 60
  };
  const token = jwt.sign(payload, SECRET, { algorithm: 'HS256' });
  res.json({ ok: true, token, user: { id: user.id, username: user.username, role: user.role } });
});

// Simple login page for admin (JS-enhanced) - Phase X5
router.get('/login', (req, res) => {
  res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Admin Login</title></head><body>
    <h2>Admin Login</h2>
    <form id="login-form">
      <label>Username</label><br/>
      <input name="username"/><br/>
      <label>Password</label><br/>
      <input name="password" type="password"/><br/><br/>
      <button type="submit">Login</button>
    </form>
    <script>
      document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
          username: e.target.username.value,
          password: e.target.password.value
        };
        const r = await fetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const result = await r.json();
        if (result.ok) {
          localStorage.setItem('VIBE_ADMIN_TOKEN', result.token);
          window.location.href = '/admin/dashboard';
        } else {
          alert(result.error || 'Login failed');
        }
      });
    </script>
  </body></html>`);
});

module.exports = router;
