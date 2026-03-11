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
                    <button class="reaction-btn" data-type="cap" onclick="window.App.handleReaction('${p.id}', 'cap')">🧢 <span>${reactions.cap}</span></button>
                    <button class="reaction-btn" data-type="wild" onclick="window.App.handleReaction('${p.id}', 'wild')">🤯 <span>${reactions.wild}</span></button>
                    <button class="reaction-btn" data-type="like" onclick="window.App.handleReaction('${p.id}', 'like')">👍 <span>${reactions.like}</span></button>
                    <button class="reaction-btn" data-type="dislike" onclick="window.App.handleReaction('${p.id}', 'dislike')">👎 <span>${reactions.dislike}</span></button>
                    <button class="reaction-btn" data-type="heat" onclick="window.App.handleReaction('${p.id}', 'heat')">🔥 <span>${reactions.heat}</span></button>
                    <button class="reaction-btn" data-type="admire" onclick="window.App.handleReaction('${p.id}', 'admire')">🙏 <span>${reactions.admire}</span></button>
                </div>
                <div class="post-secondary-actions">
                    <button class="action-btn action-comment" onclick="window.App.showCommentModal('${p.id || ''}')">💬 <span>${p.commentCount || 0}</span></button>
                    <button class="action-btn" onclick="window.App.sharePost('${p.id}')">⤴️ Share</button>
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
                <div class="profile-banner" style="position:relative; height:180px; border-radius: var(--radius-lg); overflow:hidden; margin-bottom:-50px; background: var(--bg-glass);">
                    <img src="${user.banner || user.bannerImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200'}" style="width:100%; height:100%; object-fit:cover; opacity:0.8;">
                    <div style="position:absolute; bottom:0; left:0; right:0; height:60%; background:linear-gradient(to top, var(--bg-deep), transparent);"></div>
                </div>
                <div class="profile-header glass-panel" style="text-align:center; padding:60px 20px 25px; position:relative; border-radius: var(--radius-lg); border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="position:absolute; top:-45px; left:50%; transform:translateX(-50%);">
                        <img src="${user.avatar || user.profilePhoto || 'https://i.pravatar.cc/150'}" style="width:100px; height:100px; border-radius:50%; border:3px solid var(--primary-purple); object-fit:cover; background:var(--bg-deep); box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);">
                    </div>
                    
                    <h2 style="margin-top:10px; font-size:1.6rem; font-family:var(--font-display);">${user.displayName}</h2>
                    <span class="handle" style="color:var(--accent-cyan); font-weight:600; font-size:0.9rem;">@${user.username}</span>
                    
                    <p style="margin-top:15px; color:var(--text-dim); font-size:0.95rem; max-width:450px; margin-left:auto; margin-right:auto; line-height:1.5;">${user.bio || 'New to VibeHub!'}</p>
                    
                    ${user.songLink ? `
                    <div class="vibe-track-pill" style="margin-top:20px; display:inline-flex; align-items:center; gap:10px; background:rgba(255,255,255,0.05); padding:8px 20px; border-radius:40px; border:1px solid var(--border-light); cursor:pointer;" onclick="window.open('${user.songLink}', '_blank')">
                        <span style="font-size:1.2rem;">🎵</span>
                        <span style="font-size:0.85rem; font-weight:bold; letter-spacing:0.5px; color:var(--text-main);">VIBE TRACK</span>
                    </div>
                    ` : ''}

                    <div class="profile-stats" style="display:flex; justify-content:center; gap:40px; margin-top:25px;">
                        <div style="text-align:center;"><span style="font-weight:800; font-size:1.2rem; color:var(--text-main);">${(user.followersCount || 0).toLocaleString()}</span><br><span style="font-size:0.7rem; color:var(--text-dim); text-transform:uppercase; letter-spacing:1px;">Followers</span></div>
                        <div style="text-align:center;"><span style="font-weight:800; font-size:1.2rem; color:var(--text-main);">${(user.followingCount || 0).toLocaleString()}</span><br><span style="font-size:0.7rem; color:var(--text-dim); text-transform:uppercase; letter-spacing:1px;">Following</span></div>
                        <div style="text-align:center;"><span style="font-weight:800; font-size:1.2rem; color:var(--text-main);">${(user.postCount || 0).toLocaleString()}</span><br><span style="font-size:0.7rem; color:var(--text-dim); text-transform:uppercase; letter-spacing:1px;">Posts</span></div>
                    </div>
                    
                    <div style="display:flex; gap:12px; margin-top:25px; justify-content:center;">
                        <button class="btn-primary" onclick="window.App.handleFollow('${user.id}')" style="min-width:120px;">Link Up</button>
                        <button class="btn-secondary" onclick="window.App.navigate('messages')" style="min-width:120px;">Signal</button>
                    </div>
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin: 35px 0 15px;">
                    <h3 style="font-size:0.85rem; color:var(--text-dim); letter-spacing:2px; text-transform:uppercase; font-weight:800;">Neural Feed</h3>
                    <div style="height:1px; flex:1; background:linear-gradient(to right, rgba(255,255,255,0.1), transparent); margin-left:20px;"></div>
                </div>
                
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