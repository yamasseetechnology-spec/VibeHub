// Lightweight frontend to render streams (Phase X3)
async function loadStreams() {
  try {
    const res = await fetch('/streams');
    if (!res.ok) {
      console.error('Failed to load streams:', res.status);
      return;
    }
    const streams = await res.json();
    const container = document.getElementById('streams');
    if (!container) return;
    container.innerHTML = '';
    streams.forEach((s) => {
      const card = document.createElement('div');
      card.className = 'stream-card';
      card.style.cssText = 'border:1px solid #ddd; padding:8px; width:240px; border-radius:8px; display:inline-block; margin:8px; vertical-align:top;';
      const thumb = s.thumbnail_url ? `<img src="${s.thumbnail_url}" alt="thumb" style="width:100%; height:120px; object-fit:cover; border-radius:6px;"/>` : `<div style="width:100%; height:120px; background:#eee; border-radius:6px;"></div>`;
      const live = s.is_live ? '<span style="position:absolute; top:6px; left:6px; background:red; color:#fff; padding:2px 6px; border-radius:4px;">LIVE</span>' : '';
      card.innerHTML = `
        <div style="position: relative;">${thumb}${live}</div>
        <div style="font-weight:600; margin-top:6px;">${s.title || ''}</div>
        <div style="font-size:12px; color:#555;">Host: ${s.host_user_id||''}</div>
        <div style="font-size:12px; color:#555;">${s.viewer_count || 0} watching</div>
        <button style="margin-top:6px; padding:6px 8px;" onclick="openWatch('${s.id}')">Watch</button>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Error loading streams:', err);
  }
}

function openWatch(id) {
  // naive modal with video tag if endpoint exists
  fetch(`/streams/${id}/token?role=viewer`)
    .then(r => {
      if (!r.ok) throw new Error('Failed to get stream token');
      return r.json();
    })
    .then(data => {
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed; right:20px; bottom:20px; width:640px; height:360px; background:#000; color:#fff; border-radius:8px; padding:8px;';
      // Use the token if available
      const videoSrc = data?.token || data?.stream_url || '';
      modal.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><strong>Watch Stream</strong><button onclick="this.parentElement.parentElement.remove()">Close</button></div><video src="${videoSrc}" controls style="width:100%; height:300px; background:#111"></video>`;
      document.body.appendChild(modal);
    })
    .catch(err => {
      console.error('Error opening watch:', err);
      alert('Could not load stream. Please try again.');
    });
}

document.addEventListener('DOMContentLoaded', loadStreams);
