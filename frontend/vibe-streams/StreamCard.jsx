import React from 'react';

export default function StreamCard({ stream, onWatch }) {
  return (
    <div className="stream-card" style={{ border: '1px solid #ddd', padding: 8, width: 240, borderRadius: 8 }}>
      <div style={{ position: 'relative' }}>
        {stream.thumbnail_url ? (
          <img src={stream.thumbnail_url} alt="thumb" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6 }} />
        ) : (
          <div style={{ width: '100%', height: 120, background: '#eee', borderRadius: 6 }} />
        )}
        {stream.is_live ? (
          <span style={{ position: 'absolute', top: 6, left: 6, background: 'red', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>LIVE</span>
        ) : null}
      </div>
      <div style={{ marginTop: 6, fontWeight: 600 }}>{stream.title}</div>
      <div style={{ fontSize: 12, color: '#555' }}>Host: {stream.host_user_id}</div>
      <div style={{ fontSize: 12, color: '#555' }}>{stream.viewer_count || 0} watching</div>
      <button onClick={onWatch} style={{ marginTop: 6, padding: '6px 8px' }}>Watch</button>
    </div>
  );
}
