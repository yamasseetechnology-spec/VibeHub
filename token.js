// Production token generator (Phase X2)
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'change-me-securely';

function generateToken(streamId, role = 'viewer', userId = 'anonymous') {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    stream_id: streamId,
    role,
    iat: now,
    exp: now + 60 * 60 // 1 hour expiry
  };
  // In a real deployment, include per-stream LiveKit grants via custom claims
  payload.grants = {
    roomCreate: role === 'host',
    roomJoin: true,
    publish: role === 'host',
    subscribe: true
  };
  return jwt.sign(payload, SECRET, { algorithm: 'HS256' });
}

module.exports = {
  generateToken
};
