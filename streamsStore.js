// Simple in-memory store for demonstration purposes (Phase X1)
const { v4: uuidv4 } = require('uuid');

class Stream {
  constructor({ host_user_id, title, description, thumbnail_url, visibility = 'public', metadata = {} }) {
    this.id = uuidv4();
    this.host_user_id = host_user_id;
    this.title = title;
    this.description = description;
    this.thumbnail_url = thumbnail_url;
    this.started_at = null;
    this.ended_at = null;
    this.is_live = false;
    this.visibility = visibility;
    this.engine = null;
    this.stream_url = null;
    this.viewer_count = 0;
    this.max_viewers = null;
    this.metadata = metadata;
    // engagement metrics used for X4
    this.likes = 0;
    this.comments = 0;
    this.waves = 0;
    // internal
    this.events = []; // StreamViewEvent-like records
  }
}

const streams = new Map();

function createStream(data) {
  const s = new Stream({
    host_user_id: data.host_user_id,
    title: data.title,
    description: data.description,
    thumbnail_url: data.thumbnail_url,
    visibility: data.visibility,
    metadata: data.metadata || {}
  });
  streams.set(s.id, s);
  return s;
}

function listStreams() {
  return Array.from(streams.values());
}

function getStream(id) {
  return streams.get(id);
}

function updateStream(id, patch) {
  const s = streams.get(id);
  if (!s) return null;
  Object.assign(s, patch);
  streams.set(id, s);
  return s;
}

function addViewerJoinEvent(streamId, userId) {
  const s = streams.get(streamId);
  if (!s) return null;
  const evt = { user_id: userId, stream_id: streamId, event_type: 'join', timestamp: new Date().toISOString() };
  s.events.push(evt);
  return evt;
}

module.exports = {
  Stream,
  streams,
  createStream,
  listStreams,
  getStream,
  updateStream,
  addViewerJoinEvent
};
