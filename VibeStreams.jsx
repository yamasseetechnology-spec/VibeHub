import React, { useEffect, useState } from 'react';
import StreamCard from './StreamCard.jsx';
import WatchView from './WatchView.jsx';

export default function VibeStreams() {
  const [streams, setStreams] = useState([]);
  const [watchStream, setWatchStream] = useState(null);

  useEffect(() => {
    fetch('/streams')
      .then((r) => r.json())
      .then((data) => setStreams(data));
  }, []);

  return (
    <div>
      <h2>Vibe Streams</h2>
      <div className="vibe-streams-grid">
        {streams.map((s) => (
          <StreamCard key={s.id} stream={s} onWatch={() => setWatchStream(s)} />
        ))}
      </div>
      {watchStream && (
        <WatchView stream={watchStream} onClose={() => setWatchStream(null)} />
      )}
    </div>
  );
}
