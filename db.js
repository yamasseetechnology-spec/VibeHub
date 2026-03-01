// Lightweight SQLite-backed DB layer (Phase X1+)
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

let db = null;

function ensure() {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database('./vibehubs.db', (err) => {
      if (err) return reject(err);
      // initialize tables
      const streamsTable = `CREATE TABLE IF NOT EXISTS streams (
        id TEXT PRIMARY KEY,
        host_user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        thumbnail_url TEXT,
        started_at TEXT,
        ended_at TEXT,
        is_live INTEGER,
        visibility TEXT,
        engine TEXT,
        stream_url TEXT,
        viewer_count INTEGER,
        max_viewers INTEGER,
        metadata TEXT,
        created_at TEXT,
        updated_at TEXT
      )`;
      db.run(streamsTable, (e) => {
        if (e) return reject(e);
      const eventsTable = `CREATE TABLE IF NOT EXISTS stream_view_events (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          stream_id TEXT NOT NULL,
          event_type TEXT,
          timestamp TEXT
        )`;
        db.run(eventsTable, (e2) => {
          if (e2) return reject(e2);
          // Phase X4: add follows table if not exists
          const followsTable = `CREATE TABLE IF NOT EXISTS follows (
            user_id TEXT NOT NULL,
            host_user_id TEXT NOT NULL,
            PRIMARY KEY (user_id, host_user_id)
          )`;
          db.run(followsTable, (e3) => {
            if (e3) return reject(e3);
            resolve(db);
          });
        });
      });
    });
  });
}

async function init() {
  await ensure();
  // Ensure feature flag store exists
  await ensureFlagsTable();
  return db;
}

async function createStream({ host_user_id, title, description, thumbnail_url, visibility = 'public', metadata = {} }) {
  await ensure();
  const id = uuidv4();
  const now = new Date().toISOString();
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`INSERT INTO streams VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
      id,
      host_user_id,
      title,
      description || null,
      thumbnail_url || null,
      null,
      null,
      0,
      visibility,
      null,
      null,
      0,
      null,
      JSON.stringify(metadata || {}),
      now,
      now,
      function (err) {
        if (err) return reject(err);
        resolve({ id, host_user_id, title, description, thumbnail_url, started_at: null, ended_at: null, is_live: false, visibility, metadata, engine: null, stream_url: null, viewer_count: 0, max_viewers: null });
      }
    );
  });
}

async function listStreams() {
  await ensure();
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM streams`, [], (err, rows) => {
      if (err) return reject(err);
      const formatted = rows.map((r) => {
        let meta = {};
        try { meta = JSON.parse(r.metadata || '{}'); } catch (_) { meta = {}; }
        return {
          id: r.id,
          host_user_id: r.host_user_id,
          title: r.title,
          description: r.description,
          thumbnail_url: r.thumbnail_url,
          started_at: r.started_at,
          ended_at: r.ended_at,
          is_live: !!r.is_live,
          visibility: r.visibility,
          engine: r.engine,
          stream_url: r.stream_url,
          viewer_count: r.viewer_count || 0,
          max_viewers: r.max_viewers,
          metadata: meta,
          created_at: r.created_at,
          updated_at: r.updated_at
        };
      });
      resolve(formatted);
    });
  });
}

async function getStream(id) {
  await ensure();
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM streams WHERE id = ?`, [id], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      let meta = {};
      try { meta = JSON.parse(row.metadata || '{}'); } catch (_) { meta = {}; }
      resolve({
        id: row.id,
        host_user_id: row.host_user_id,
        title: row.title,
        description: row.description,
        thumbnail_url: row.thumbnail_url,
        started_at: row.started_at,
        ended_at: row.ended_at,
        is_live: !!row.is_live,
        visibility: row.visibility,
        engine: row.engine,
        stream_url: row.stream_url,
        viewer_count: row.viewer_count || 0,
        max_viewers: row.max_viewers,
        metadata: meta,
        created_at: row.created_at,
        updated_at: row.updated_at
      });
    });
  });
}

async function updateStream(id, patch) {
  if (!patch || Object.keys(patch).length === 0) return getStream(id);
  await ensure();
  const keys = Object.keys(patch);
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k]);
  values.push(id);
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.run(`UPDATE streams SET ${sets}, updated_at = ? WHERE id = ?`, [...values, now], function (err) {
      if (err) return reject(err);
      resolve({ id, ...patch });
    });
  });
}

async function addViewerJoinEvent(stream_id, user_id) {
  await ensure();
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const ts = new Date().toISOString();
    db.run(`INSERT INTO stream_view_events (id, user_id, stream_id, event_type, timestamp) VALUES (?, ?, ?, ?, ?)`, [id, user_id, stream_id, 'join', ts], (err) => {
      if (err) return reject(err);
      resolve({ id, user_id, stream_id, event_type: 'join', timestamp: ts });
    });
  });
}

async function incrementViewerCount(stream_id) {
  await ensure();
  return new Promise((resolve, reject) => {
    db.run(`UPDATE streams SET viewer_count = COALESCE(viewer_count, 0) + 1 WHERE id = ?`, [stream_id], function (err) {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

async function addFollow(userId, hostUserId) {
  await ensure();
  return new Promise((resolve, reject) => {
    const id = require('uuid').v4();
    // Simple insert
    db.run(`INSERT OR IGNORE INTO follows (user_id, host_user_id) VALUES (?, ?)`, [userId, hostUserId], (err) => {
      if (err) return reject(err);
      resolve({ userId, hostUserId });
    });
  });
}

async function getFollowedHosts(userId) {
  await ensure();
  return new Promise((resolve, reject) => {
    db.all(`SELECT host_user_id FROM follows WHERE user_id = ?`, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map((r) => r.host_user_id));
    });
  });
}

async function removeFollow(userId, hostUserId) {
  await ensure();
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM follows WHERE user_id = ? AND host_user_id = ?`, [userId, hostUserId], function (err) {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

async function listTimeline(userId, limit = 20) {
  await ensure();
  const hosts = await getFollowedHosts(userId);
  const placeholders = hosts.length ? hosts.map(() => '?').join(',') : '';
  const queryParams = hosts.length ? hosts : [];
  // If following none, show public streams only
  let whereClause = 'visibility = \'public\'';
  if (hosts.length) {
    whereClause = `(visibility = 'public' OR host_user_id IN (${placeholders}))`;
  }
  return new Promise((resolve, reject) => {
    const q = `SELECT * FROM streams WHERE ${whereClause}`;
    db.all(q, hosts.length ? queryParams : [], (err, rows) => {
      if (err) return reject(err);
      const mapped = rows.map((r) => {
        let meta = {};
        try { meta = JSON.parse(r.metadata || '{}'); } catch (_) { meta = {}; }
        const score = ((r.likes || 0) * 2) + ((r.comments || 0) * 3) + (r.waves || 0);
        return { id: r.id, host_user_id: r.host_user_id, title: r.title, description: r.description, thumbnail_url: r.thumbnail_url, started_at: r.started_at, ended_at: r.ended_at, is_live: !!r.is_live, visibility: r.visibility, engine: r.engine, stream_url: r.stream_url, viewer_count: r.viewer_count || 0, max_viewers: r.max_viewers, metadata: meta, created_at: r.created_at, updated_at: r.updated_at, score };
      });
      // sort by score desc, then by started_at desc as tie-breaker
      mapped.sort((a, b) => (b.score || 0) - (a.score || 0) || new Date(bstarted_at) - new Date(a.started_at));
      resolve(mapped.slice(0, Math.max(1, limit)));
    });
  });
}

async function getTimeline(userId, limit) {
  return listTimeline(userId, limit || 20);
}

async function getDiscovery(limit) {
  return listTimeline(null, limit || 20);
}

// Phase X4: top streams by engagement score (for admin dashboards)
async function topStreams(limit) {
  await ensure();
  const lim = limit || 20;
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM streams`, [], (err, rows) => {
      if (err) return reject(err);
      const mapped = rows.map((r) => {
        let meta = {};
        try { meta = JSON.parse(r.metadata || '{}'); } catch (_) { meta = {}; }
        const score = ((r.likes || 0) * 2) + ((r.comments || 0) * 3) + (r.waves || 0);
        return {
          id: r.id,
          host_user_id: r.host_user_id,
          title: r.title,
          description: r.description,
          thumbnail_url: r.thumbnail_url,
          started_at: r.started_at,
          ended_at: r.ended_at,
          is_live: !!r.is_live,
          visibility: r.visibility,
          engine: r.engine,
          stream_url: r.stream_url,
          viewer_count: r.viewer_count || 0,
          max_viewers: r.max_viewers,
          metadata: meta,
          created_at: r.created_at,
          updated_at: r.updated_at,
          score
        };
      });
      mapped.sort((a, b) => {
        const diff = (b.score || 0) - (a.score || 0);
        if (diff !== 0) return diff;
        const ta = a.started_at ? new Date(a.started_at).getTime() : 0;
        const tb = b.started_at ? new Date(b.started_at).getTime() : 0;
        return tb - ta;
      });
      resolve(mapped.slice(0, lim));
    });
  });
}

async function getFlag(key) {
  await ensure();
  return new Promise((resolve, reject) => {
    db.get(`SELECT value FROM feature_flags WHERE key = ?`, [key], (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.value : null);
    });
  });
}

async function setFlag(key, value) {
  await ensure();
  return new Promise((resolve, reject) => {
    db.run(`INSERT OR REPLACE INTO feature_flags (key, value) VALUES (?, ?)`, [key, String(value)], function (err) {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

// Initialize a flag store helper to ensure table exists on startup
async function ensureFlagsTable() {
  await ensure();
  return new Promise((resolve, reject) => {
    const tbl = `CREATE TABLE IF NOT EXISTS feature_flags (
      key TEXT PRIMARY KEY,
      value TEXT
    )`;
    db.run(tbl, (err) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

async function timelineForUser(userId, limit) {
  await ensure();
  const hosts = userId ? await getFollowedHosts(userId) : [];
  const placeholders = hosts.length ? hosts.map(() => '?').join(',') : '';
  const params = hosts.length ? hosts : [];
  let whereClause = "visibility = 'public'";
  if (hosts.length) {
    whereClause = `(visibility = 'public' OR host_user_id IN (${placeholders}))`;
  }
  const lim = limit || 20;
  const q = `SELECT * FROM streams WHERE ${whereClause} ORDER BY COALESCE(started_at, created_at) DESC LIMIT ?`;
  const finalParams = hosts.length ? [...params, lim] : [lim];
  return new Promise((resolve, reject) => {
    db.all(q, finalParams, (err, rows) => {
      if (err) return reject(err);
      const mapped = rows.map((r) => {
        let meta = {};
        try { meta = JSON.parse(r.metadata || '{}'); } catch (_) { meta = {}; }
        const score = ((r.likes || 0) * 2) + ((r.comments || 0) * 3) + (r.waves || 0);
        return {
          id: r.id,
          host_user_id: r.host_user_id,
          title: r.title,
          description: r.description,
          thumbnail_url: r.thumbnail_url,
          started_at: r.started_at,
          ended_at: r.ended_at,
          is_live: !!r.is_live,
          visibility: r.visibility,
          engine: r.engine,
          stream_url: r.stream_url,
          viewer_count: r.viewer_count || 0,
          max_viewers: r.max_viewers,
          metadata: meta,
          created_at: r.created_at,
          updated_at: r.updated_at,
          score
        };
      });
      // sort by score desc, then by started_at desc
      mapped.sort((a, b) => {
        const diff = (b.score || 0) - (a.score || 0);
        if (diff !== 0) return diff;
        const ta = a.started_at ? new Date(a.started_at).getTime() : 0;
        const tb = b.started_at ? new Date(b.started_at).getTime() : 0;
        return tb - ta;
      });
      resolve(mapped.slice(0, lim));
    });
  });
}

async function countStreams() {
  await ensure();
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS c FROM streams', [], (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.c : 0);
    });
  });
}

async function countLive() {
  await ensure();
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS c FROM streams WHERE is_live = 1', [], (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.c : 0);
    });
  });
}

module.exports = {
  init: init,
  createStream,
  listStreams,
  getStream,
  updateStream,
  addViewerJoinEvent,
  incrementViewerCount
  , addFollow, getFollowedHosts, removeFollow, listTimeline, getTimeline, getDiscovery, timelineForUser, topStreams, countStreams, countLive, getFlag, setFlag, ensureFlagsTable
};
