const express = require('express');
const { v4: uuidv4 } = require('uuid');
const tokenGen = require('../lib/token');
const db = require('../db');
const bridge = require('../lib/bridge');
const auth = require('../middleware/auth');

const router = express.Router();

// Create a new stream (X1)
router.post('/', async (req, res) => {
  const data = req.body || {};
  if (!data.host_user_id || !data.title) {
    return res.status(400).json({ error: 'host_user_id and title are required' });
  }
  try {
    const s = await db.createStream({
      host_user_id: data.host_user_id,
      title: data.title,
      description: data.description,
      thumbnail_url: data.thumbnail_url,
      visibility: data.visibility || 'public',
      metadata: data.metadata || {}
    });
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create stream' });
  }
});

// List streams (X1)
router.get('/', async (req, res) => {
  // Include a computed score for timeline ranking (Phase X4)
  try {
    const rows = await db.listStreams();
    const list = rows.map((s) => {
      const score = ((s.likes || 0) * 2) + ((s.comments || 0) * 3) + (s.waves || 0);
      return { ...s, score };
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch streams' });
  }
});

// Details (X1)
router.get('/:id', async (req, res) => {
  const s = await db.getStream(req.params.id);
  if (!s) return res.status(404).json({ error: 'Stream not found' });
  res.json(s);
});

// Start stream (X1/X2) - wire LiveKit bridge and host token
router.post('/:id/start', async (req, res) => {
  const id = req.params.id;
  // Mark live and initialize engine/session
  await db.updateStream(id, { is_live: 1, started_at: new Date().toISOString(), engine: 'livekit' });
  const full = await db.getStream(id);
  if (!full) return res.status(404).json({ error: 'Stream not found' });
  // Initialize LiveKit bridge for host publish
  const bridgeInfo = require('../lib/bridge').hostPublish(id, full.host_user_id);
  // Persist endpoint for client usage
  await db.updateStream(id, { stream_url: bridgeInfo.endpoint });
  // Host token for publishing
  const hostToken = bridgeInfo.token;
  // Return enriched data to client
  const updated = await db.getStream(id);
  res.json({ ...updated, bridge: bridgeInfo, hostToken });
});

// End stream (X1/X2)
router.post('/:id/end', async (req, res) => {
  const id = req.params.id;
  const s = await db.updateStream(id, { is_live: 0, ended_at: new Date().toISOString() });
  if (!s) return res.status(404).json({ error: 'Stream not found' });
  res.json(await db.getStream(id));
});

// Token for host/viewer (X2)
router.get('/:id/token', async (req, res) => {
  const s = await db.getStream(req.params.id);
  if (!s) return res.status(404).json({ error: 'Stream not found' });
  const role = (req.query.role || 'viewer').toLowerCase();
  const userId = req.headers['x-user-id'] || 'anonymous';
  const t = tokenGen.generateToken(req.params.id, role, userId);
  res.json({ token: t });
});

// Convenience: generate a viewer token for a given stream (Phase X2)
router.get('/:id/viewer-token', async (req, res) => {
  const s = await db.getStream(req.params.id);
  if (!s) return res.status(404).json({ error: 'Stream not found' });
  const userId = req.query.userId || ('viewer-' + uuidv4());
  const t = tokenGen.generateToken(req.params.id, 'viewer', userId);
  res.json({ token: t, userId });
});

// Watch/join (X1)
router.post('/:id/watch', async (req, res) => {
  const id = req.params.id;
  const viewerId = req.headers['x-user-id'] || uuidv4();
  try {
    await db.addViewerJoinEvent(id, viewerId);
    await db.incrementViewerCount(id);
    const s = await db.getStream(id);
    res.json({ ok: true, viewer_count: s.viewer_count, last_viewer: viewerId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record viewer' });
  }
});

// Moderation endpoint (Phase X5) - flag/unflag/end stream
router.post('/:id/moderate', auth.requireRole('admin'), async (req, res) => {
  const id = req.params.id;
  const { action, reason } = req.body || {};
  if (!action) return res.status(400).json({ error: 'action is required' });
  try {
    if (action === 'flag') {
      await db.updateStream(id, { visibility: 'flagged' });
      return res.json({ ok: true, action: 'flag', reason });
    } else if (action === 'unflag') {
      await db.updateStream(id, { visibility: 'public' });
      return res.json({ ok: true, action: 'unflag' });
    } else if (action === 'end') {
      await db.updateStream(id, { is_live: 0, ended_at: new Date().toISOString() });
      return res.json({ ok: true, action: 'end' });
    } else {
      return res.status(400).json({ error: 'invalid action' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Moderation failed' });
  }
});

module.exports = router;
