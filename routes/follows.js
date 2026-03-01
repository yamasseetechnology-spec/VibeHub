const express = require('express');
const router = express.Router();
const db = require('../db');

// Follow a host
router.post('/', async (req, res) => {
  const { userId, hostUserId } = req.body || {};
  if (!userId || !hostUserId) return res.status(400).json({ error: 'userId and hostUserId required' });
  try {
    await db.addFollow(userId, hostUserId);
    res.json({ ok: true, userId, hostUserId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to follow' });
  }
});

// Unfollow a host
router.delete('/', async (req, res) => {
  const { userId, hostUserId } = req.body || {};
  if (!userId || !hostUserId) return res.status(400).json({ error: 'userId and hostUserId required' });
  try {
    await db.removeFollow(userId, hostUserId);
    res.json({ ok: true, userId, hostUserId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unfollow' });
  }
});

// List follows for a user
router.get('/users/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const hosts = await db.getFollowedHosts(userId);
    res.json({ userId, follows: hosts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch follows' });
  }
});

module.exports = router;
