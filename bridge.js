// LiveKit bridge shim (Phase X2)
// This file provides placeholder bridge functions for host publish and viewer join.
// In production, these would interface with the LiveKit server.

function hostPublish(streamId, hostUserId) {
  // Placeholder: return a mock publish endpoint
  return {
    ok: true,
    streamId,
    hostUserId,
    endpoint: 'wss://livekit.example.com' + '/rooms/' + streamId
  };
}

function viewerJoin(streamId, viewerUserId) {
  // Placeholder: return a mock join token/endpoint
  return {
    ok: true,
    streamId,
    viewerUserId: viewerUserId
  };
}

module.exports = {
  hostPublish,
  viewerJoin
};
