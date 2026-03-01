// LiveKit bridge (Phase X2) - production-ready scaffold
// This module exposes hostPublish and viewerJoin helpers that return
// a LiveKit endpoint URL and a signed token for the given stream.
// It is designed to be swapped with a real integration in production.

const tokenGen = require('./token');

let LIVEKIT_HOST = process.env.LIVEKIT_HOST || 'livekit.example.com';
let LIVEKIT_SCHEME = process.env.LIVEKIT_SCHEME || 'wss';
let LIVEKIT_URL = (process.env.LIVEKIT_URL || `${LIVEKIT_SCHEME}://${LIVEKIT_HOST}`);

function _endpointFor(streamId) {
  return `${LIVEKIT_URL}/rooms/${streamId}`;
}

function hostPublish(streamId, hostUserId) {
  // Produce a publish endpoint and a host token for the LiveKit room
  const endpoint = _endpointFor(streamId);
  const token = tokenGen.generateToken(streamId, 'host', hostUserId);
  return {
    ok: true,
    streamId,
    hostUserId,
    endpoint,
    token
  };
}

function viewerJoin(streamId, viewerUserId) {
  // Produce a viewer endpoint and a viewer token for the LiveKit room
  const endpoint = _endpointFor(streamId);
  const token = tokenGen.generateToken(streamId, 'viewer', viewerUserId);
  return {
    ok: true,
    streamId,
    viewerUserId,
    endpoint,
    token
  };
}

module.exports = {
  hostPublish,
  viewerJoin
};
