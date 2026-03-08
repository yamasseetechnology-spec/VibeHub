/**
 * VIBEHUB UI COMPONENTS
 * Functional templates for views.
 */

// --- COMPONENTS OBJECT ---
const Components = {
    post(p) {
        const mindStates = ['Elevated', 'Deep Focus', 'Creative Flow', 'Zen', 'Hyper-Active'];
        const randomState = mindStates[Math.floor(Math.random() * mindStates.length)];

        return `
            <div class="post-card glass-panel ${p.isSponsored ? 'sponsored-ad' : ''}" data-id="${p.id}">
                ${p.isSponsored ? '<span class="ad-label">Sponsored Vibe</span>' : ''}
                <div class="post-header">
                    <img src="${p.avatar}" class="user-avatar" alt="${p.displayName}">
                    <div class="user-info">
                        <span class="name">${p.displayName} <span class="mind-state" title="Current Neural State">${randomState}</span></span>
                        <span class="handle">@${p.handle} • ${p.timestamp}</span>
                    </div>
                    <button class="more-options" onclick="window.App.showPostMenu('${p.id}')">•••</button>
                </div>
                <div class="post-content">
                    ${p.content}
                </div>
                ${p.media ? `<img src="${p.media}" class="post-media" loading="lazy">` : ''}
                ${p.vibeScore !== undefined ? `<div class="vibe-score-badge"><span>🧠</span><span class="score-value">${p.vibeScore}</span></div>` : ''}
                <div class="post-actions">
                    <button class="reaction-btn" data-type="like">👍 <span>${p.reactions.like}</span></button>
                    <button class="reaction-btn" data-type="dislike">👎 <span>${p.reactions.dislike}</span></button>
                    <button class="reaction-btn" data-type="heat">🔥 <span>${p.reactions.heat}</span></button>
                    <button class="reaction-btn" data-type="admire">✨ <span>${p.reactions.admire}</span></button>
                    <button class="reaction-btn" data-type="cap">🧢 <span>${p.reactions.cap}</span></button>
                    <button class="reaction-btn" data-type="wild">🦁 <span>${p.reactions.wild}</span></button>
                    <button class="reaction-btn action-comment">💬 <span>${p.commentsCount}</span></button>
                    <button class="reaction-btn advanced-reactions">🤯 <span>Neural Spark</span></button>
                    <button class="reaction-btn advanced-reactions">🙏 <span>Deep Respect</span></button>
                </div>
            </div>
        `;
    },

    room(r) {
        return `
            <div class="room-card glass-panel animate-slide-up">
                <div class="room-status ${r.active ? 'online' : ''}"></div>
                <h3>${r.name}</h3>
                <p>${r.users} Vibing Now</p>
                <div class="room-avatars">
                    ${Array(Math.min(r.users, 4)).fill(0).map((_, i) => `<img src="https://i.pravatar.cc/50?u=r${r.id}u${i}" class="mini-avatar">`).join('')}
                    ${r.users > 4 ? `<span>+${r.users - 4}</span>` : ''}
                </div>
                <button class="btn-primary join-room-btn">Sync In</button>
            </div>
        `;
    },

    video(v) {
        return `
            <div class="vibe-video-card glass-panel">
                <video src="${v.url}" loop muted playsinline></video>
                <div class="video-overlay">
                    <div class="video-meta">
                        <h4>@${v.user}</h4>
                        <p>${v.caption}</p>
                    </div>
                    <div class="video-actions-sidebar">
                        <button class="video-action">🔥</button>
                        <button class="video-action">💬</button>
                        <button class="video-action">⤴️</button>
                    </div>
                </div>
            </div>
        `;
    }
};