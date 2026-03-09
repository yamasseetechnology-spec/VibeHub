/**
 * VIBEHUB UI COMPONENTS
 * Functional templates for views.
 */

// --- COMPONENTS OBJECT ---
export const Components = {
    post(p) {
        const mindStates = ['Elevated', 'Deep Focus', 'Creative Flow', 'Zen', 'Hyper-Active'];
        const randomState = mindStates[Math.floor(Math.random() * mindStates.length)];
        const reactions = p.reactions || { like: 0, dislike: 0, heat: 0, admire: 0, cap: 0, wild: 0 };

        return `
            <div class="post-card glass-panel ${p.isSponsored ? 'sponsored-ad' : ''}" data-id="${p.id || ''}">
                ${p.isSponsored ? '<span class="ad-label">Sponsored Vibe</span>' : ''}
                <div class="post-header">
                    <img src="${p.avatar || 'https://i.pravatar.cc/150'}" class="user-avatar" alt="${p.displayName || 'User'}">
                    <div class="user-info">
                        <span class="name">${p.displayName || 'User'} <span class="mind-state" title="Current Neural State">${randomState}</span></span>
                        <span class="handle">@${p.handle || 'username'} • ${p.timestamp || 'Just now'}</span>
                    </div>
                    <button class="more-options" onclick="window.App.showPostMenu('${p.id || ''}')">•••</button>
                </div>
                <div class="post-content">
                    ${p.content || ''}
                </div>
                ${(p.mediaType === 'video' || (!p.mediaType && p.media?.includes('video'))) && p.media ? `<video src="${p.media}" class="post-media" controls loading="lazy"></video>` : ''}
                ${(p.mediaType === 'image' || (!p.mediaType && p.media && !p.media?.includes('video'))) && p.media ? `<img src="${p.media}" class="post-media" loading="lazy">` : ''}
                ${p.vibeScore !== undefined ? `<div class="vibe-score-badge"><span>🧠</span><span class="score-value">${p.vibeScore}</span></div>` : ''}
                <div class="post-actions">
                    <button class="reaction-btn" data-type="like">👍 <span>${reactions.like}</span></button>
                    <button class="reaction-btn" data-type="dislike">👎 <span>${reactions.dislike}</span></button>
                    <button class="reaction-btn" data-type="heat">🔥 <span>${reactions.heat}</span></button>
                    <button class="reaction-btn" data-type="admire">✨ <span>${reactions.admire}</span></button>
                    <button class="reaction-btn" data-type="cap">🧢 <span>${reactions.cap}</span></button>
                    <button class="reaction-btn" data-type="wild">🦁 <span>${reactions.wild}</span></button>
                    <button class="action-btn action-comment" onclick="window.App.showCommentModal('${p.id || ''}')">💬 <span>${p.commentCount || 0}</span></button>
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
                <h3>${r.name || 'Unnamed Room'}</h3>
                <p>${r.users || 0} Vibing Now</p>
                <div class="room-avatars">
                    ${Array(Math.min(r.users || 0, 4)).fill(0).map((_, i) => `<img src="https://i.pravatar.cc/50?u=r${r.id}u${i}" class="mini-avatar">`).join('')}
                    ${(r.users || 0) > 4 ? `<span>+${(r.users || 0) - 4}</span>` : ''}
                </div>
                <button class="btn-primary join-room-btn">Sync In</button>
            </div>
        `;
    },

    video(v) {
        return `
            <div class="vibe-video-card glass-panel">
                <video src="${v.url || ''}" loop muted playsinline></video>
                <div class="video-overlay">
                    <div class="video-meta">
                        <h4>@${v.user || 'user'}</h4>
                        <p>${v.caption || ''}</p>
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