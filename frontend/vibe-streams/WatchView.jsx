import React from 'react';

export default function WatchView({ stream, onClose }) {
  return (
    <div className="watch-view" style={{ position: 'fixed', right: 20, bottom: 20, width: 740, height: 420, background: '#000', color: '#fff', borderRadius: 8, padding: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong>{stream.title}</strong>
        <button onClick={onClose} style={{ padding: '4px 8px' }}>Close</button>
      </div>
      <div style={{ marginTop: 6 }}>
        <video src={stream.stream_url} controls style={{ width: '100%', height: '320px', background: '#111' }} />
      </div>
    </div>
  );
}
