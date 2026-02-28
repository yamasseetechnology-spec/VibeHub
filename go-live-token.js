// Phase D1/D2: Token generation for Go Live (engine-agnostic, with LiveKit support)
export function registerGoLiveTokenRoutes(app) {
  if (!app || typeof app.get !== 'function') return;
  app.get('/api/go-live-token', async (req, res) => {
    const host = req.query.host || 'default-host';
    const engine = req.query.engine || 'livekit';
    const tokenData = await generateGoLiveToken(host, engine);
    res.json(tokenData);
  });
}

// Generate a LiveKit token if possible; otherwise fall back to a stub.
export async function generateGoLiveToken(host, engine) {
  // Try LiveKit server SDK if available
  try {
    const { AccessToken } = require('livekit-server-sdk');
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (apiKey && apiSecret) {
      const at = new AccessToken(apiKey, apiSecret, { identity: host });
      // Grant basic capabilities for a room; adjust as needed for production
      at.addGrant({ roomCreate: true, roomJoin: true, room: host });
      const token = at.toJwt();
      return { token, url: 'wss://livekit.example', expiresIn: 3600, engine };
    }
  } catch (_) {
    // Fall through if SDK unavailable
  }
  // Fallback stub for development and offline environments
  return {
    token: 'stub-token',
    url: 'wss://demo-go-live.example',
    expiresIn: 300,
    engine
  };
}
