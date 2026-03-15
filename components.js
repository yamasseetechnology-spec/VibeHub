/**
 * VIBEHUB UI COMPONENTS
 * Functional templates for views.
 */

// --- COMPONENTS OBJECT ---
const Components = {
    post(p) {
        const mindStates = ['Elevated', 'Deep Focus', 'Creative Flow', 'Zen', 'Hyper-Active'];
        const randomState = mindStates[Math.floor(Math.random() * mindStates.length)];
        
        // Ensure reactions exist
        const reactions = p.reactions || {};

        return `
            <div class="post-card glass-panel ${p.isSponsored ? 'sponsored-ad' : ''}" data-id="${p.id}">
                ${p.isSponsored ? '<span class="ad-label">Sponsored Vibe</span>' : ''}
                <div class="post-header">
                    <img src="${p.avatar}" class="user-avatar" alt="${p.displayName}">
                    <div class="user-info">
                        <span class="name">${p.displayName} <span class="mind-state" title="Current Neural State">${randomState}</span></span>
                        <span class="handle">@${p.handle} • ${p.timestamp}</span>
                    </div>
                    <div class="post-options">
                        <button class="more-options" onclick="window.App.showPostMenu('${p.id}')">•••</button>
                    </div>
                </div>
                <div class="post-content">
                    ${p.content}
                </div>
                ${p.media && p.media !== '' ? `<img src="${p.media}" class="post-media" loading="lazy">` : ''}
                <div class="post-actions">
                    <button class="reaction-btn" data-type="like">👍 <span>${reactions.like || 0}</span></button>
                    <button class="reaction-btn" data-type="dislike">👎 <span>${reactions.dislike || 0}</span></button>
                    <button class="reaction-btn" data-type="heat">🔥 <span>${reactions.heat || 0}</span></button>
                    <button class="reaction-btn" data-type="admire">✨ <span>${reactions.admire || 0}</span></button>
                    <button class="reaction-btn" data-type="cap">🧢 <span>${reactions.cap || 0}</span></button>
                    <button class="reaction-btn" data-type="wild">🦁 <span>${reactions.wild || 0}</span></button>
                    <button class="action-btn action-comment" onclick="window.App.showCommentModal('${p.id}')">💬 <span>${p.engagement}</span></button>
                    <button class="reaction-btn advanced-reactions" title="Neural Spark">🤯</button>
                    <button class="reaction-btn advanced-reactions" title="Deep Respect">🙏</button>
                </div>
                ${window.App.currentUser?.role === 'admin' ? `
                <div class="admin-controls-inline">
                    <button class="btn-danger btn-small" onclick="window.App.handleDeletePost('${p.id}')">Delete Post</button>
                    <button class="btn-warning btn-small" onclick="window.App.handleBanUser('${p.userId}')">Ban User</button>
                </div>
                ` : ''}
            </div>
        `;
    },

    room(r) {
        return `
            <div class="room-card glass-panel animate-slide-up">
                <div class="room-status ${r.is_active ? 'online' : ''}"></div>
                <h3>${r.name}</h3>
                <p>${r.message_count} Interactions</p>
                <div class="room-avatars">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${r.id}" class="mini-avatar">
                </div>
                <button class="btn-primary join-room-btn">Sync In</button>
            </div>
        `;
    },

    video(v) {
        return `
            <div class="vibe-video-card glass-panel">
                <div class="video-placeholder">📺 ${v.title}</div>
                <div class="video-overlay">
                    <div class="video-meta">
                        <h4>${v.title}</h4>
                        <p>${v.description || ''}</p>
                    </div>
                    <div class="video-actions-sidebar">
                        <button class="video-action">🔥</button>
                        <button class="video-action">💬</button>
                    </div>
                </div>
            </div>
        `;
    },

    adminPanel(stats) {
        return `
            <div class="admin-dashboard animate-fade-in">
                <div class="admin-header">
                    <h2>Neural Network Administration</h2>
                    <p>Central Control Unit for VibeHub Ecosystem</p>
                </div>

                <div class="stats-grid">
                    <div class="stat-card glass-panel">
                        <span class="stat-label">Total Consciousnesses</span>
                        <span class="stat-value">${stats.users}</span>
                    </div>
                    <div class="stat-card glass-panel">
                        <span class="stat-label">Active Vibrations</span>
                        <span class="stat-value">${stats.activeNow}</span>
                    </div>
                    <div class="stat-card glass-panel">
                        <span class="stat-label">Neural Signals (Today)</span>
                        <span class="stat-value">${stats.postsToday}</span>
                    </div>
                    <div class="stat-card glass-panel">
                        <span class="stat-label">Pending Reports</span>
                        <span class="stat-value">${stats.reports}</span>
                    </div>
                </div>

                <div class="admin-tools-grid">
                    <div class="tool-section glass-panel">
                        <h3><span class="icon">🔗</span> Neural Link (Account Merge)</h3>
                        <p>Consolidate neural patterns from legacy identities into a single unified stream.</p>
                        <div class="tool-inputs">
                            <input type="email" id="merge-legacy-email" placeholder="Legacy Email (e.g. yamasseetechnology@gmail.com)">
                            <input type="text" id="merge-target-username" placeholder="Target Username (e.g. KingKool23)">
                            <button class="btn-primary" onclick="window.App.handleAccountMerge()">Initiate Neural Link</button>
                        </div>
                    </div>

                    <div class="tool-section glass-panel">
                        <h3><span class="icon">🛡️</span> Ecosystem Moderation</h3>
                        <p>Direct intervention in the vibe ecosystem.</p>
                        <div class="tool-actions">
                            <button class="btn-secondary" onclick="window.App.navigate('reports')">View Critical Reports</button>
                            <button class="btn-warning" onclick="window.App.showNotification('System alert sent to all users', 'info')">Broadcast Global Vibe</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

export default Components;