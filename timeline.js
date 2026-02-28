const express = require('express');
const db = require('../db');
const router = express.Router();

// Timeline feed (Phase X4)
router.get('/timeline', async (req, res) => {
  const userId = req.query.userId;
  const limit = parseInt(req.query.limit) || 20;
  try {
    const data = await (db.timelineForUser ? db.timelineForUser(userId, limit) : db.listStreams());
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Timeline fetch failed' });
  }
});

// Discovery feed (Phase X4)
router.get('/discovery', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  try {
    const streams = await db.listStreams();
    const publicOnly = streams.filter((s) => s.visibility === 'public');
    publicOnly.sort((a, b) => {
      const ta = a.started_at ? new Date(a.started_at).getTime() : 0;
      const tb = b.started_at ? new Date(b.started_at).getTime() : 0;
      return tb - ta;
    });
    res.json(publicOnly.slice(0, limit));
  } catch (err) {
    res.status(500).json({ error: 'Discovery fetch failed' });
  }
});

module.exports = router;
