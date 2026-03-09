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
                    <img src="${p.avatar || 'https://i.pravatar.cc/150'}" class="user-avatar" alt="${p.displayName || 'User'}" 
                         style="cursor:pointer;" onclick="window.App.viewUserProfile('${p.userId}', '${p.handle}')">
                    <div class="user-info">
                        <div class="name-row">
                            <span class="name" onclick="window.App.viewUserProfile('${p.userId}', '${p.handle}')">
                                ${p.displayName || 'User'}
                            </span>
                            <span class="mind-state">${randomState}</span>
                            ${p.userId !== window.State?.user?.id ? `
                                <button class="follow-mini-btn" onclick="window.App.handleFollow('${p.userId}')">Follow</button>
                            ` : ''}
                        </div>
                        <span class="handle">@${p.handle || 'username'} • ${p.timestamp || 'Just now'}</span>
                    </div>
                    <button class="more-options" onclick="window.App.showPostMenu('${p.id || ''}')">•••</button>
                </div>
                <div class="post-content">
                    ${p.content || ''}
                </div>
                
                <div class="media-container" ondblclick="window.App.handleDoubleTapReaction('${p.id || ''}', event)">
                    ${(p.mediaType === 'video' || (!p.mediaType && p.media?.includes('video'))) && p.media ? `<video src="${p.media}" class="post-media" controls loading="lazy"></video>` : ''}
                    ${(p.mediaType === 'image' || (!p.mediaType && p.media && !p.media?.includes('video'))) && p.media ? `<img src="${p.media}" class="post-media" loading="lazy">` : ''}
                    <div class="double-tap-heart">🔥</div>
                </div>

                ${p.vibeScore !== undefined ? `<div class="vibe-score-badge"><span>🧠</span><span class="score-value">${p.vibeScore}</span></div>` : ''}
                
                <div class="post-actions">
                    <button class="reaction-btn main-react" data-type="heat" onclick="window.App.handleReaction('${p.id}', 'heat')">🔥 <span>${reactions.heat}</span></button>
                    <button class="action-btn action-comment" onclick="window.App.showCommentModal('${p.id || ''}')">💬 <span>${p.commentCount || 0}</span></button>
                    <button class="action-btn" onclick="window.App.sharePost('${p.id}')">⤴️</button>
                    <div class="reaction-divider"></div>
                    <button class="reaction-btn more-vibes" onclick="window.App.toggleReactionPicker('${p.id}', event)">✨ <span>Vibe...</span></button>
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
    },

    userProfile(user, postsHtml) {
        return `
            <div class="profile-view animate-fade">
                <div class="profile-banner" style="position:relative; height:160px; border-radius: var(--radius-lg); overflow:hidden; margin-bottom:-40px;">
                    <img src="${user.banner}" style="width:100%; height:100%; object-fit:cover; opacity:0.7;">
                </div>
                <div class="profile-header glass-panel" style="text-align:center; padding:50px 20px 25px; position:relative; border-radius: var(--radius-lg);">
                    <img src="${user.avatar}" style="width:90px; height:90px; border-radius:50%; border:3px solid var(--primary-purple); object-fit:cover; position:absolute; top:-45px; left:50%; transform:translateX(-50%); background:var(--bg-deep);">
                    <h2 style="margin-top:10px; font-size:1.4rem;">${user.displayName}</h2>
                    <span class="handle" style="color:var(--text-dim);">@${user.username}</span>
                    <p style="margin-top:10px; color:var(--text-dim); font-size:0.9rem; max-width:400px; margin-left:auto; margin-right:auto;">${user.bio}</p>
                    <div class="profile-stats" style="display:flex; justify-content:center; gap:30px; margin-top:20px;">
                        <div style="text-align:center;"><span style="font-weight:800; font-size:1.1rem; color:var(--text-main);">${(user.followersCount || 0).toLocaleString()}</span><br><span style="font-size:0.75rem; color:var(--text-dim);">Followers</span></div>
                        <div style="text-align:center;"><span style="font-weight:800; font-size:1.1rem; color:var(--text-main);">${(user.followingCount || 0).toLocaleString()}</span><br><span style="font-size:0.75rem; color:var(--text-dim);">Following</span></div>
                        <div style="text-align:center;"><span style="font-weight:800; font-size:1.1rem; color:var(--text-main);">${(user.postCount || 0).toLocaleString()}</span><br><span style="font-size:0.75rem; color:var(--text-dim);">Posts</span></div>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:20px; justify-content:center;">
                        <button class="btn-primary" onclick="window.App.handleFollow('${user.id}')">Follow</button>
                        <button class="btn-secondary" onclick="window.App.navigate('messages')">Message</button>
                    </div>
                </div>
                <h3 style="margin: 25px 0 15px; font-size:1rem; color:var(--text-dim); letter-spacing:1px; text-transform:uppercase;">Posts</h3>
                <div id="post-feed">
                    ${postsHtml}
                </div>
            </div>
        `;
    },

    skeletonLoading() {
        return `
            <div style="padding:20px;">
                ${Array(3).fill(0).map(() => `
                    <div class="post-card glass-panel skeleton-loader" style="height:200px; margin-bottom:20px;">
                        <div class="skeleton-shimmer"></div>
                        <div style="display:flex; gap:15px; margin-bottom:15px;">
                            <div style="width:45px; height:45px; border-radius:50%; background:rgba(255,255,255,0.05);"></div>
                            <div style="flex:1;">
                                <div style="width:40%; height:12px; background:rgba(255,255,255,0.05); margin-bottom:8px;"></div>
                                <div style="width:25%; height:10px; background:rgba(255,255,255,0.03);"></div>
                            </div>
                        </div>
                        <div style="width:90%; height:15px; background:rgba(255,255,255,0.05); margin-bottom:10px;"></div>
                        <div style="width:70%; height:15px; background:rgba(255,255,255,0.05);"></div>
                    </div>
                `).join('')}
            </div>
        `;
    }
};