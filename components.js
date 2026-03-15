/**
 * VIBEHUB UI COMPONENTS
 * Functional templates for views.
 */

const Components = {
    post(p) {
        const mindStates = ['Elevated', 'Deep Focus', 'Creative Flow', 'Zen', 'Hyper-Active'];
        const randomState = mindStates[Math.floor(Math.random() * mindStates.length)];
        const reactions = p.reactions || {};

        // FIXED: window.App.currentUser was undefined — VibeApp now has a currentUser getter
        const isAdmin = window.App?.getCurrentUser?.()?.role === 'admin';

        return `
            <div class="post-card glass-panel ${p.isSponsored ? 'sponsored-ad' : ''}" data-id="${p.id}">
                ${p.isSponsored ? '<span class="ad-label">Sponsored Vibe</span>' : ''}
                <div class="post-header">
                    <img src="${p.avatar}" class="user-avatar" alt="${p.displayName}" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=default'">
                    <div class="user-info">
                        <span class="name">${p.displayName} <span class="mind-state" title="Current Neural State">${randomState}</span></span>
                        <span class="handle">@${p.handle} • ${p.timestamp}</span>
                    </div>
                    <div class="post-options">
                        <button class="more-options" onclick="window.App.showPostMenu('${p.id}')">•••</button>
                    </div>
                </div>
                <div class="post-content">${p.content || ''}</div>
                ${p.media ? `<img src="${p.media}" class="post-media" loading="lazy" onerror="this.style.display='none'">` : ''}
                <div class="post-actions">
                    <button class="reaction-btn" data-type="like">👍 <span>${reactions.like || 0}</span></button>
                    <button class="reaction-btn" data-type="dislike">👎 <span>${reactions.dislike || 0}</span></button>
                    <button class="reaction-btn" data-type="heat">🔥 <span>${reactions.heat || 0}</span></button>
                    <button class="reaction-btn" data-type="admire">✨ <span>${reactions.admire || 0}</span></button>
                    <button class="reaction-btn" data-type="cap">🧢 <span>${reactions.cap || 0}</span></button>
                    <button class="reaction-btn" data-type="wild">🦁 <span>${reactions.wild || 0}</span></button>
                    <button class="action-btn action-comment" onclick="window.App.showCommentModal('${p.id}')">💬 <span>${p.engagement || 0}</span></button>
                    <button class="reaction-btn advanced-reactions" data-type="cold" title="Cold">🥶</button>
                    <button class="reaction-btn advanced-reactions" data-type="mindblown" title="Neural Spark">🤯</button>
                    <button class="reaction-btn advanced-reactions" data-type="respect" title="Deep Respect">🙏</button>
                </div>
                ${isAdmin ? `
                <div class="admin-controls-inline">
                    <button class="btn-danger btn-small" onclick="window.App.handleDeletePost('${p.id}')">Delete Post</button>
                    <button class="btn-warning btn-small" onclick="window.App.handleBanUser('${p.userId}')">Ban User</button>
                </div>` : ''}
            </div>`;
    },

    room(r) {
        return `
            <div class="room-card glass-panel animate-slide-up">
                <div class="room-status ${r.is_active ? 'online' : ''}"></div>
                <h3>${r.name || 'Unnamed Room'}</h3>
                <p>${r.message_count || 0} Interactions</p>
                <div class="room-avatars">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${r.id}" class="mini-avatar" alt="">
                </div>
                <button class="btn-primary join-room-btn" onclick="window.App.showToast('Syncing into ${r.name || 'room'}...')">Sync In</button>
            </div>`;
    },

    video(v) {
        return `
            <div class="vibe-video-card glass-panel">
                ${v.video_url
                    ? `<video src="${v.video_url}" loop muted playsinline style="width:100%;border-radius:8px"></video>`
                    : `<div class="video-placeholder">📺 ${v.title || 'Untitled Stream'}</div>`}
                <div class="video-overlay">
                    <div class="video-meta">
                        <h4>${v.title || 'Untitled'}</h4>
                        <p>${v.description || ''}</p>
                    </div>
                    <div class="video-actions-sidebar">
                        <button class="video-action" onclick="window.App.showToast('Reacting 🔥')">🔥</button>
                        <button class="video-action" onclick="window.App.showToast('Comments coming soon')">💬</button>
                    </div>
                </div>
            </div>`;
    },

    // FIXED: adminPanel now receives users list and renders it
    // Also: removed "Admin panel loading..." state — component renders fully or not at all
    adminPanel(stats, users = []) {
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
                        <span class="stat-label">Neural Signals (Total)</span>
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
                            <input type="email" id="merge-legacy-email" placeholder="Legacy Email" class="login-input" style="margin:5px 0">
                            <input type="text" id="merge-target-username" placeholder="Target Username" class="login-input" style="margin:5px 0">
                            <button class="btn-primary" onclick="window.App.handleAccountMerge()">Initiate Neural Link</button>
                        </div>
                    </div>

                    <div class="tool-section glass-panel">
                        <h3><span class="icon">🛡️</span> Ecosystem Moderation</h3>
                        <p>Direct intervention in the vibe ecosystem.</p>
                        <div class="tool-actions">
                            <button class="btn-secondary" onclick="window.App.showToast('Reports view coming soon')">View Critical Reports</button>
                            <button class="btn-warning" onclick="window.App.showToast('Broadcast sent to all users')">Broadcast Global Vibe</button>
                        </div>
                    </div>
                </div>

                ${users.length > 0 ? `
                <div class="tool-section glass-panel" style="margin-top:20px">
                    <h3><span class="icon">👥</span> User Management</h3>
                    <div style="overflow-x:auto">
                        <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
                            <thead>
                                <tr style="text-align:left;border-bottom:1px solid rgba(255,255,255,0.1)">
                                    <th style="padding:8px">User</th>
                                    <th style="padding:8px">Email</th>
                                    <th style="padding:8px">Role</th>
                                    <th style="padding:8px">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${users.map(u => `
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                                    <td style="padding:8px">
                                        <img src="${u.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.id}"
                                            style="width:24px;height:24px;border-radius:50%;vertical-align:middle;margin-right:6px">
                                        ${u.name || u.username || 'Unknown'}
                                    </td>
                                    <td style="padding:8px;color:var(--text-secondary)">${u.email || ''}</td>
                                    <td style="padding:8px">
                                        <span class="mind-state">${u.role || 'user'}</span>
                                    </td>
                                    <td style="padding:8px">
                                        ${u.role !== 'admin' ? `<button class="btn-danger btn-small" onclick="window.App.handleBanUser('${u.id}')">Ban</button>` : ''}
                                    </td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>` : ''}
            </div>`;
    }
};

export default Components;
