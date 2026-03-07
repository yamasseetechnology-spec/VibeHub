/**
 * VIBEHUB UI COMPONENTS
 * Functional templates for views.
 */

export const Components = {
    post(p) {
        const mindStates = ['Elevated', 'Deep Focus', 'Creative Flow', 'Zen', 'Hyper-Active'];
        const randomState = mindStates[Math.floor(Math.random() * mindStates.length)];
        
        return `
            <div class="post-card glass-panel ${p.isSponsored ? 'sponsored-ad' : ''}" data-id="${p.id}">
                ${p.isSponsored ? '<span class="ad-label">Sponsored Vibe</span>' : ''}
                <div class="post-header">
                    <img src="${p.avatar}" class="user-avatar" alt="${p.displayName}">
                    <div class="user-info">
                        <span class="name">${p.displayName} ${p.badge ? `<span class="user-badge">${p.badge}</span>` : ''} <span class="mind-state" title="Current Neural State">${randomState}</span></span>
                        <span class="handle">@${p.handle} • ${p.timestamp}</span>
                    </div>
                    <button class="more-options">•••</button>
                </div>
                <div class="post-content">
                    ${p.content}
                </div>
                ${p.media ? `<img src="${p.media}" class="post-media" loading="lazy">` : ''}
                <div class="post-actions">
                    <button class="reaction-btn" data-type="like" title="Sync Minds">👍 <span>${p.reactions.like}</span></button>
                    <button class="reaction-btn" data-type="heat" title="Intense Energy">🔥 <span>${p.reactions.heat}</span></button>
                    <button class="reaction-btn" data-type="wild" title="Neural Spark">🤯 <span>${p.reactions.wild}</span></button>
                    <button class="reaction-btn" data-type="admire" title="Deep Respect">✨ <span>${p.reactions.admire}</span></button>
                    <button class="reaction-btn" data-type="cap" title="Truth Filter">🧢 <span>${p.reactions.cap}</span></button>
                    <button class="reaction-btn action-comment">💬 <span>${p.commentsCount}</span></button>
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
