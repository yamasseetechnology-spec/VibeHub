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
          resolve(db);
        });
      });
    });
  });
}

async function init() {
  await ensure();
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

module.exports = {
  init: init,
  createStream,
  listStreams,
  getStream,
  updateStream,
  addViewerJoinEvent,
  incrementViewerCount
};
