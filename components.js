/**
 * VIBEHUB UI COMPONENTS
 * Functional templates for views.
 */

// --- COMPONENTS OBJECT ---
export const Components = {
    post(post) {
        const isOwner = State.user && (post.userId === State.user.id || State.user.isSuperAdmin);
        const timeAgo = post.timestamp || 'Just now';
        
        return `
            <div class="post-card glass-panel animate-fade" data-post-id="${post.id}" style="margin-bottom:15px;">
                <div class="post-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <div class="post-author" style="display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="window.App.viewUserProfile('${post.userId}', '${post.handle}')">
                        <div class="author-avatar" style="width:45px; height:45px; border-radius:50%; background:var(--bg-glass); border:2px solid var(--border-light); overflow:hidden;">
                            <img src="${post.avatar}" style="width:100%; height:100%; object-fit:cover;">
                        </div>
                        <div>
                            <div class="author-name" style="font-weight:600; color:var(--text-main);">${post.displayName}</div>
                            <div class="author-handle" style="font-size:0.85rem; color:var(--text-dim);">@${post.handle}</div>
                        </div>
                    </div>
                    <div class="post-meta" style="display:flex; align-items:center; gap:10px;">
                        <span class="post-time" style="font-size:0.75rem; color:var(--text-dim);">${timeAgo}</span>
                        ${post.edited ? '<span class="edited-indicator" style="font-size:0.7rem; color:var(--text-dim);">• edited</span>' : ''}
                        ${isOwner ? `
                            <div class="post-actions" style="position:relative;">
                                <button onclick="window.App.togglePostMenu('${post.id}', event)" class="btn-icon" style="background:none; border:none; color:var(--text-muted); cursor:pointer; padding:5px;">
                                    ⋮
                                </button>
                                <div id="post-menu-${post.id}" class="post-menu" style="display:none; position:absolute; right:0; top:100%; background:var(--bg-card); border:1px solid var(--border-light); border-radius:8px; padding:5px; min-width:120px; z-index:100;">
                                    <button onclick="window.App.handleEditPost('${post.id}')" class="menu-item" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text-main); cursor:pointer; font-size:0.9rem;">✏️ Edit</button>
                                    <button onclick="window.App.handleDeletePost('${post.id}')" class="menu-item" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--accent-red); cursor:pointer; font-size:0.9rem;">🗑️ Delete</button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="post-content" style="margin-bottom:15px;">
                    <p style="margin:0; line-height:1.5; color:var(--text-main); white-space:pre-wrap;">${post.content}</p>
                </div>
                
                ${post.media ? `
                    <div class="post-media" style="margin-bottom:15px;">
                        ${post.mediaType === 'image' ? 
                            `<img src="${post.media}" style="width:100%; max-height:500px; object-fit:cover; border-radius:12px;">` :
                            post.mediaType === 'video' ?
                            `<video src="${post.media}" controls style="width:100%; max-height:500px; border-radius:12px;"></video>` :
                            ''
                        }
                    </div>
                ` : ''}
                
                <div class="post-stats" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-top:1px solid var(--border-light);">
                    <div class="reactions" style="display:flex; gap:15px;">
                        <button onclick="window.App.handleReaction('${post.id}', 'like')" class="reaction-btn ${post.reactions.like > 0 ? 'active' : ''}" data-type="like" style="background:none; border:1px solid var(--border-light); border-radius:20px; padding:5px 12px; cursor:pointer; font-size:0.9rem; transition:all 0.3s;">
                            ❤️ ${post.reactions.like || 0}
                        </button>
                        <button onclick="window.App.toggleReactionPicker('${post.id}', event)" class="reaction-btn" style="background:none; border:1px solid var(--border-light); border-radius:20px; padding:5px 12px; cursor:pointer; font-size:0.9rem; transition:all 0.3s;">
                            ✨ ${post.reactions.heat + post.reactions.wild + post.reactions.cap + post.reactions.admire}
                        </button>
                        <button onclick="window.App.showCommentModal('${post.id}')" class="reaction-btn" style="background:none; border:1px solid var(--border-light); border-radius:20px; padding:5px 12px; cursor:pointer; font-size:0.9rem; transition:all 0.3s;">
                            💬 ${post.commentCount || 0}
                        </button>
                    </div>
                    <button onclick="window.App.sharePost('${post.id}')" class="reaction-btn" style="background:none; border:1px solid var(--border-light); border-radius:20px; padding:5px 12px; cursor:pointer; font-size:0.9rem; transition:all 0.3s;">
                        🔄 Share
                    </button>
                </div>
            </div>
        `;
    },

    sponsoredAd(ad) {
        return `
            <div class="post-card glass-panel sponsored-ad animate-fade" style="border: 2px solid var(--primary-orange); background: rgba(255, 157, 0, 0.05); margin-bottom: 20px;">
                <div class="post-header">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div class="ad-icon" style="width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg, var(--primary-orange), var(--primary-purple)); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold;">V</div>
                        <div class="post-user-info">
                            <span class="post-display-name" style="color:white; font-weight:700;">Sponsored Vibe</span>
                            <span class="badge" style="position:static; background:var(--primary-orange); margin-left:5px; font-size:0.6rem;">SPONSORED</span>
                        </div>
                    </div>
                </div>
                <div class="post-content" style="margin-top:10px;">
                    <p style="font-size:1.1rem; line-height:1.4; color:white;">${ad.content}</p>
                    ${ad.media_url ? (ad.media_type === 'video' ? 
                        `<video src="${ad.media_url}" autoplay muted loop playsinline class="post-media" style="border-radius:12px; margin-top:10px; width:100%;"></video>` : 
                        `<img src="${ad.media_url}" class="post-media" style="border-radius:12px; margin-top:10px; width:100%;">`) : ''}
                </div>
                <div class="post-footer" style="margin-top:15px; display:flex; justify-content:center;">
                    <a href="${ad.link}" target="_blank" class="btn-primary" style="width:100%; text-align:center; text-decoration:none; padding:12px; border-radius:30px; font-weight:bold; letter-spacing:1px; box-shadow: 0 0 20px var(--primary-orange-glow); color:white;">LINK YOUR MIND →</a>
                </div>
            </div>
        `;
    },

    commentModal: (postId, commentsHTML) => {
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h2 class="view-title" style="margin:0;">Comments</h2>
                <button class="btn-secondary" style="padding:5px 10px;" onclick="document.getElementById('modal-container').classList.add('hidden')">✕</button>
            </div>
            
            <div id="comments-list" style="max-height: 50vh; overflow-y: auto; margin-bottom:15px; padding-right:5px;">
                ${commentsHTML}
            </div>
            
            <div class="comment-input-area" style="display:flex; flex-direction:column; gap:10px;">
                <div id="reply-indicator" style="display:none; font-size:0.8rem; color:var(--text-dim); padding:4px 8px; background:var(--bg-glass); border-radius:8px;"></div>
                <textarea id="comment-input" class="login-input" placeholder="Add a comment..." 
                          ontouchend="event.preventDefault(); this.focus();"
                          style="width:100%; min-height:80px; background:rgba(0,0,0,0.5); border:1px solid var(--border-light); color:white; padding:10px;"></textarea>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:10px;">
                        <button class="btn-secondary" title="Audio Comment" onclick="window.App.startAudioComment('${postId}')">🎤</button>
                        <form method="post" enctype="multipart/form-data" style="margin:0; display:inline-block;">
                            <button type="button" class="btn-secondary" title="Upload Video Comment" onclick="this.nextElementSibling.click()">🎥 Upload</button>
                            <input type="file" accept="video/*" style="display:none;" onchange="window.App.handleVideoCommentUpload(this, '${postId}')">
                        </form>
                        <button class="btn-secondary" title="Live Video Reply" onclick="window.App.startVideoComment('${postId}')">🤳 Live</button>
                    </div>
                    <button class="btn-primary" onclick="window.App.submitTextComment('${postId}')">Post Comment</button>
                </div>
            </div>
        `;
    },

    postModal: () => {
        return `
            <h2 class="view-header">Post Your Vibe</h2>
            <textarea id="post-input" class="glass-panel" placeholder="What's your mind linked to?" style="width:100%; min-height:120px; background:rgba(0,0,0,0.5); border:1px solid var(--border-light); color:white; padding:15px; margin:15px 0;"></textarea>
            
            <div id="media-preview" style="margin-bottom:15px; min-height:50px;"></div>
            
            <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
                <button type="button" class="btn-secondary" style="display:inline-flex; align-items:center; gap:5px;" onclick="document.getElementById('image-upload-input').click()">
                    📷 Photo
                </button>
                <input type="file" id="image-upload-input" accept="image/*" capture="environment" onchange="window.App.handlePostImage(this)" style="display:none;">
                
                <button type="button" class="btn-secondary" style="display:inline-flex; align-items:center; gap:5px;" onclick="document.getElementById('video-upload-input').click()">
                    🎥 Video
                </button>
                <input type="file" id="video-upload-input" accept="video/*" capture="environment" onchange="window.App.handlePostVideo(this)" style="display:none;">
                <button class="btn-secondary" onclick="window.App.clearMediaPreview()" style="display:none;" id="clear-media-btn">✕ Clear</button>
                <button class="btn-secondary">📍 Location</button>
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button class="btn-secondary" onclick="window.App.closeCreatePostModal()">Cancel</button>
                <button class="btn-primary" id="final-post-btn" onclick="window.App.handleCreatePost()">Post Vibe</button>
            </div>
            <div id="upload-progress" style="display:none; margin-top:15px;">
                <div style="background:rgba(255,255,255,0.1); border-radius:4px; height:8px; overflow:hidden;">
                    <div id="progress-bar" style="background:linear-gradient(90deg, #9d50bb, #6e48aa); height:100%; width:0%; transition:width 0.3s;"></div>
                </div>
                <p style="text-align:center; font-size:12px; color:#aaa; margin-top:5px;" id="progress-text">Uploading...</p>
            </div>
        `;
    },

    streamSetupModal: (modalId) => {
        return `
            <div class="profile-modal-content">
                <span class="profile-close-btn" onclick="document.getElementById('${modalId}').remove()">&times;</span>
                
                <div class="edit-banner-area" style="height: 100px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--primary-purple), var(--primary-orange));">
                    <h2 style="font-family:var(--font-display); text-shadow: 0 2px 10px rgba(0,0,0,0.3);">Go Live✨</h2>
                </div>

                <div class="edit-profile-body" style="margin-top: 0; padding-top: 25px;">
                    <div class="edit-fields">
                        <p class="text-dim" style="font-size: 0.9rem; text-align: center; margin-bottom: 10px;">Neural link ready. What's your vibe?</p>
                        
                        <div class="edit-field">
                            <label class="edit-label">Stream Topic</label>
                            <input type="text" id="stream-topic" class="edit-input" placeholder="e.g. Late Night Vibes" autofocus>
                        </div>
                    </div>

                    <div class="edit-actions" style="margin-top: 30px;">
                        <button class="btn-secondary edit-cancel-btn" onclick="document.getElementById('${modalId}').remove()">Cancel</button>
                        <button class="btn-primary edit-save-btn" onclick="window.App.goLive(document.getElementById('stream-topic').value)">Go Live ✨</button>
                    </div>
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
                        <button class="btn-secondary" onclick="window.App.openDM('${user.id}', '${user.username}')" style="min-width:120px;">Signal</button>
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
    },

    offlineBanner: () => {
        return '📡 You appear to be offline. Showing cached data.';
    },

    liveStreamCard: (l) => {
        return `
            <div class="live-card glass-panel" onclick="window.App.showToast('Joining ${l.username}\\'s stream...')">
                <div class="live-avatar">
                    <img src="https://i.pravatar.cc/150?u=${l.user_id}" alt="${l.username}">
                    <span class="live-tag">LIVE</span>
                </div>
                <span class="live-username">${l.username}</span>
            </div>
        `;
    },

    postMenu: (postId, isSuperAdmin) => {
        let menuHTML = '';
        if (isSuperAdmin) {
            menuHTML += `
                <button class="menu-item text-main" style="border:none; background:transparent; padding:8px; text-align:left; cursor:pointer;" onclick="window.App.deletePost('${postId}')">🗑️ Delete Post</button>
                <div style="height:1px; background:var(--border-light); margin:4px 0;"></div>
                <button class="menu-item text-main" style="border:none; background:transparent; padding:8px; text-align:left; cursor:pointer; color:var(--accent-pink);" onclick="window.App.handleAdminBan('${postId}')">🚫 Ban User</button>
            `;
        } else {
            menuHTML += `
                <button class="menu-item text-main" style="border:none; background:transparent; padding:8px; text-align:left; cursor:pointer;" onclick="window.App.reportPost('${postId}')">🚩 Report Vibe</button>
            `;
        }
        
        menuHTML += `
            <div style="height:1px; background:var(--border-light); margin:4px 0;"></div>
            <button class="menu-item text-main" style="border:none; background:transparent; padding:8px; text-align:left; cursor:pointer;" onclick="window.App.copyPostLink('${postId}')">🔗 Copy Link</button>
        `;
        return menuHTML;
    }
};

// --- VIEWS OBJECT ---
export const Views = {
    home(posts, activeTab = 'vibeline') {
        const safePosts = Array.isArray(posts) ? posts : [];
        const tabs = [
            { id: 'vibeline', label: 'Vibeline' },
            { id: 'trending', label: 'Trending' },
            { id: 'we-vibin', label: 'We Vibin' },
            { id: 'friends', label: 'Friends' }
        ];
        return `
            <div class="view-header animate-fade" style="text-align:center; padding-top: 5px; padding-bottom: 0;">
                <h1 class="view-title" style="background: linear-gradient(135deg, #9d50bb, #ff9f00); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: inline-block; font-size: 2.2rem; filter: drop-shadow(0px 0px 8px rgba(157,80,187,0.5)); margin-bottom: 0;">The Pulse</h1>
            </div>
            <div class="tabs">
                ${tabs.map(t => `<button class="tab ${activeTab === t.id ? 'active' : ''}" onclick="window.App.switchHomeTab('${t.id}')">${t.label}</button>`).join('')}
            </div>
            <div id="post-feed">
                ${safePosts.length > 0 ? safePosts.map(p => p.isAd ? Components.sponsoredAd(p) : Components.post(p)).join('') : '<p class="text-dim" style="padding:30px; text-align:center;">No vibes yet. Be the first to post!</p>'}
            </div>
        `;
    },

    vibeStream(videos, liveStreams = []) {
        return `
            <div class="vibestream-animated-caption">Vibe for the moment.</div>
            <div class="view-header vibestream-header" style="display:flex; justify-content:space-between; align-items:center; gap: 15px; flex-wrap: wrap; margin-bottom: 20px;">
                <div style="flex: 1; min-width: 150px;">
                    <h1 class="view-title">VibeStream</h1>
                    <p class="text-dim">Vertical vibes for the linked mind.</p>
                </div>
                <button class="btn-primary go-live-btn" onclick="window.App.showStreamSetupModal()" style="white-space: nowrap; padding: 12px 25px;">Go Live</button>
            </div>
            
            <div class="live-now-section animate-fade" style="margin-bottom: 30px;">
                <h3 style="margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <span class="pulse-dot"></span> Live Now
                </h3>
                <div class="live-scroll-container" style="display: flex; gap: 15px; overflow-x: auto; padding-bottom: 10px;">
                    ${liveStreams.length > 0 ? liveStreams.map(l => `
                        <div class="live-card glass-panel" onclick="window.App.joinLiveStream('${l.user_id}', '${l.username}')">
                            <div class="live-avatar">
                                <img src="https://i.pravatar.cc/150?u=${l.user_id}" alt="${l.username}">
                                <span class="live-tag">LIVE</span>
                            </div>
                            <span class="live-username">${l.username}</span>
                        </div>
                    `).join('') : '<p class="text-dim">No one is live yet.</p>'}
                </div>
            </div>

            <div class="vibestream-container">
                ${videos && videos.length > 0 ? videos.map(v => Components.video(v)).join('') : '<p class="text-dim" style="padding:30px; text-align:center;">No videos yet. Go live!</p>'}
            </div>
        `;
    },

    syncRooms(rooms) {
        const getRoomGlow = (userCount = 0) => {
            const intensity = Math.min(userCount / 125, 1);
            const opacity = 0.2 + (intensity * 0.6);
            const blur = 10 + (intensity * 30);
            return `box-shadow: 0 0 ${blur}px rgba(255, 159, 0, ${opacity}); border-color: rgba(255, 159, 0, ${0.2 + intensity * 0.4});`;
        };

        const getTimeRemaining = (expiresAt) => {
            if (!expiresAt) return '';
            const now = new Date();
            const expires = new Date(expiresAt);
            const hoursLeft = Math.floor((expires - now) / (1000 * 60 * 60));
            if (hoursLeft <= 0) return 'Expiring soon';
            if (hoursLeft < 24) return `${hoursLeft}h remaining`;
            return '';
        };

        return `
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h1 class="view-title">Sync Rooms</h1>
                    <p>Live psychological sync with 125 minds max.</p>
                </div>
                <button class="btn-primary" onclick="window.App.showCreateRoomModal()">+ Create Room</button>
            </div>
            <div class="rooms-grid" id="rooms-grid">
                ${rooms && rooms.length > 0 ? rooms.map(r => `
                    <div class="room-card glass-panel" style="${getRoomGlow(r.users)}">
                        ${getTimeRemaining(r.expiresAt) ? `<span class="room-timer" style="font-size:0.65rem; color:var(--primary-orange); position:absolute; top:12px; left:12px; text-transform:uppercase; letter-spacing:1px; font-weight:800;">[ ${getTimeRemaining(r.expiresAt)} ]</span>` : ''}
                        <h3 style="margin-top:10px; font-family:var(--font-display);">${r.name || 'Unnamed Room'}</h3>
                        <div style="margin:15px 0; font-size:0.9rem; color:rgba(255,255,255,0.7);">
                            <span style="color:var(--accent-cyan); font-weight:bold;">${r.users || 0}</span> / ${r.maxUsers || 125} Connected
                        </div>
                        <button class="btn-primary" onclick="window.App.joinSyncRoom('${r.id}', '${r.name}')" ${r.users >= (r.maxUsers || 125) ? 'disabled style="opacity:0.5"' : ''} style="width:100%;">
                            ${r.users >= (r.maxUsers || 125) ? 'CAPACITY REACHED' : 'SYNC IN →'}
                        </button>
                    </div>
                `).join('') : '<p class="text-dim" style="padding:20px; text-align:center;">No active rooms. Create one!</p>'}
            </div>
            <div id="active-chat-container" class="hidden" style="height: calc(100vh - 120px); display: flex; flex-direction: column;">
                <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding:0 10px;">
                    <button class="btn-secondary" onclick="window.App.leaveSyncRoom()" style="padding: 8px 15px; font-size:0.85rem;">← EXIT SYNC</button>
                    <div style="text-align:center;">
                        <h1 class="view-title" id="active-room-name" style="font-size:1.1rem; margin:0;"></h1>
                        <span id="typing-status" class="text-dim" style="font-size:0.7rem; height:12px; display:block;"></span>
                    </div>
                    <button class="btn-secondary" onclick="window.App.toggleChatSidebar()" style="padding: 8px 15px; font-size:0.85rem;">USERS 👥</button>
                </div>
                
                <div style="flex: 1; display: flex; gap: 15px; overflow: hidden; position: relative;">
                    <div class="chat-main-area" style="flex: 1; display: flex; flex-direction: column; glass-panel; overflow: hidden;">
                        <div class="chat-messages" id="chat-messages" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap:12px;"></div>
                        <div class="chat-input-area glass-panel" style="padding: 15px; display: flex; gap: 10px; border-top: 1px solid rgba(255,255,255,0.05); margin-top:10px;">
                            <input type="text" id="chat-message-input" class="login-input" placeholder="Broadcast to neural link..." style="flex: 1; background: rgba(0,0,0,0.3);" onkeypress="if(event.key==='Enter')window.App.sendChatMessage()" oninput="window.App.handleTyping()">
                            <button class="btn-primary" onclick="window.App.sendChatMessage()" style="padding: 0 25px;">SEND</button>
                        </div>
                    </div>
                    <div id="chat-sidebar" class="glass-panel" style="width: 250px; display: none; flex-direction: column; padding: 20px; border-left: 1px solid rgba(0, 242, 255, 0.2); position: absolute; right: 0; top: 0; bottom: 0; z-index: 10;">
                        <h3 style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 20px; color: var(--accent-cyan);">Sync Participants</h3>
                        <div id="user-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;"></div>
                    </div>
                </div>
            </div>
        `;
    },

    profile(user, userPosts = [], friendStatus = 'none', top8Data = [], vibeMatchScore = 100) {
        if (!user) return `
            <div class="auth-required glass-panel" style="padding:40px; text-align:center;">
                <h2>Identify Your Vibe</h2>
                <p>Login to view your link state.</p>
                <button class="btn-primary" onclick="window.App.navigate('login')" style="margin-top:20px;">Login / Register</button>
            </div>
        `;
        
        const displayName = user.displayName || user.name || 'User';
        const username = user.username || user.handle || 'username';
        const avatar = user.profilePhoto || user.avatar_url || 'https://i.pravatar.cc/150';
        const banner = user.bannerImage || user.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200';
        const bio = user.bio || 'Welcome to my Vibe.';
        const isOwnProfile = window.State?.user && user.id === window.State.user.id;
        
        let friendButtonHTML = '';
        if (!isOwnProfile && window.State?.user) {
            if (friendStatus === 'friends') {
                friendButtonHTML = `<button class="btn-secondary" style="border-color:var(--primary-orange); color:var(--primary-orange);" onclick="window.App.handleRemoveFriend('${user.id}')">✓ Friends</button>`;
            } else if (friendStatus === 'pending') {
                friendButtonHTML = `<button class="btn-secondary" style="opacity:0.7;" disabled>Request Sent</button>`;
            } else if (friendStatus === 'requested') {
                friendButtonHTML = `
                    <button class="btn-primary" style="background:var(--accent-neon-green);" onclick="window.App.handleAcceptFriend('${user.id}')">Accept</button>
                    <button class="btn-secondary" onclick="window.App.handleRejectFriend('${user.id}')">Decline</button>
                `;
            } else {
                friendButtonHTML = `<button class="btn-primary" onclick="window.App.handleAddFriend('${user.id}')">Add Friend</button>`;
            }
        }

        return `
            <div class="profile-container animate-fade">
                <div class="profile-banner">
                    <img src="${banner}" alt="Banner">
                    <div class="profile-ranking-badge">
                        <span class="rank-icon">🏆</span>
                        <span class="rank-value">Top 1%</span>
                    </div>
                </div>
                <div class="profile-content">
                    <div class="profile-header">
                        <div class="profile-avatar-wrapper">
                            <img src="${avatar}" class="profile-avatar" alt="${displayName}">
                            ${isOwnProfile ? '' : `<div class="vibe-match-ring" style="--match:${vibeMatchScore}%" title="Vibe Match: ${vibeMatchScore}%"></div>`}
                        </div>
                        <div class="profile-info" style="text-align:center;">
                            <h1 class="view-title" style="margin-bottom:0; display:flex; align-items:center; justify-content:center; gap:10px;">
                                ${displayName}
                                ${user.verified ? '<span class="verified-check">✅</span>' : ''}
                            </h1>
                            <p class="handle" style="margin-top:2px; color:var(--primary-purple-bright);">@${username}</p>
                            <p class="bio" style="margin-top:10px; max-width:600px; margin-left:auto; margin-right:auto;">${bio}</p>
                        </div>
                        <div class="profile-actions-bar" style="display:flex; gap:12px; margin-top:20px; justify-content:center; width:100%;">
                            ${isOwnProfile ? 
                                `<button class="btn-primary edit-profile-btn" onclick="window.App.showEditProfileModal()" style="padding: 8px 24px; font-size: 0.9rem; border-radius: 30px; background: linear-gradient(135deg, var(--primary-orange), var(--primary-purple)); border: none; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(255,159,0,0.3); transition: transform 0.2s ease, box-shadow 0.2s ease;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(255,159,0,0.5)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 15px rgba(255,159,0,0.3)'">
                                    <span style="font-size:1.1rem">⚙️</span> Edit Profile
                                </button>` : 
                                `
                                    ${friendButtonHTML}
                                    <button class="btn-primary" onclick="window.App.boostVibe('${user.id}')" style="background:linear-gradient(135deg, var(--primary-purple), var(--accent-magenta)); border:none; min-width:140px;">
                                        I Like Your Vibe ✨
                                    </button>
                                    <button class="btn-secondary" onclick="window.App.openDM('${user.id}', '${user.username}')" style="min-width:100px;">Message</button>
                                `
                            }
                        </div>
                    </div>
                    <div class="profile-stats glass-panel">
                        <div class="stat-item"><span class="stat-value">${(user.followersCount || 0).toLocaleString()}</span><span class="stat-label">Followers</span></div>
                        <div class="stat-item"><span class="stat-value">${(user.followingCount || 0).toLocaleString()}</span><span class="stat-label">Following</span></div>
                        <div class="stat-item"><span class="stat-value">${(user.postCount || 0).toLocaleString()}</span><span class="stat-label">Posts</span></div>
                        ${!isOwnProfile && window.State?.user ? `<div class="stat-item"><span class="stat-value" style="color:${vibeMatchScore >= 80 ? 'var(--accent-neon-green)' : vibeMatchScore >= 50 ? 'var(--primary-orange)' : 'var(--accent-pink)'}">${vibeMatchScore}%</span><span class="stat-label">Vibe Match</span></div>` : ''}
                        <div class="stat-item"><span class="stat-value" id="vibe-boost-count">${(user.vibeBoosts || 0).toLocaleString()}</span><span class="stat-label">Vibe Level</span></div>
                    </div>
                    
                    <div class="top-vibes-section" style="margin-top:40px; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 20px; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                            <h3 class="section-title" style="margin:0;">⭐ Top Inner Circle</h3>
                            ${isOwnProfile ? `<button class="btn-secondary btn-sm" onclick="window.App.showTop8Modal()" style="font-size:0.7rem;">Manage Inner Circle</button>` : ''}
                        </div>
                        <div class="top-vibes-grid" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:15px;">
                            ${[0, 1, 2].map(i => {
                                const friend = top8Data[i];
                                if (friend) {
                                    return `
                                    <div class="vibe-img-card spotlight" onclick="window.App.viewUserProfile('${friend.id}', '${friend.username}')" style="position:relative;">
                                        <div class="spotlight-rank">${i+1}</div>
                                        <img src="${friend.avatar_url || 'https://i.pravatar.cc/150'}" loading="lazy" style="width:100%; aspect-ratio:1; border-radius:50%; object-fit:cover; border:3px solid var(--primary-orange);">
                                        <div style="font-size:0.85rem; margin-top:8px; font-weight:700; color:white;">${friend.name || friend.username}</div>
                                        <div style="font-size:0.7rem; color:var(--text-dim);">@${friend.username}</div>
                                    </div>`;
                                } else {
                                    return `
                                    <div class="vibe-img-card empty-top8" style="opacity:0.3; ${isOwnProfile ? 'cursor:pointer;' : ''}" ${isOwnProfile ? 'onclick="window.App.showTop8Modal()"' : ''}>
                                        <div style="width:100%; aspect-ratio:1; border-radius:50%; background:rgba(255,255,255,0.05); border:2px dashed rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:rgba(255,255,255,0.3);">+</div>
                                        <div style="font-size:0.75rem; margin-top:5px; color:var(--text-dim);">Empty Vibe</div>
                                    </div>`;
                                }
                            }).join('')}
                        </div>
                    </div>

                    <div class="profile-tabs tabs" style="margin-top:30px;">
                        <button class="tab active" style="flex:1;">Posts</button>
                        <button class="tab" style="flex:1;">Videos</button>
                        <button class="tab" style="flex:1;">Saved</button>
                        <button class="tab" style="flex:1;">Market</button>
                    </div>
                    
                    <div class="user-posts-section" style="margin-top:20px;">
                        <h3 class="section-title">Recent Vibes</h3>
                        ${userPosts && userPosts.length > 0 ? userPosts.map(p => Components.post(p)).join('') : '<p class="text-dim" style="padding:20px; text-align:center;">No recent vibes. Post something!</p>'}
                    </div>
                </div>
            </div>
        `;
    },

    auth: (mode) => {
        const isLogin = mode === 'login';
        return `
            <div class="login-content glass-panel" style="border: 2px solid rgba(255, 165, 0, 0.4); box-shadow: 0 0 60px rgba(255, 165, 0, 0.15), 0 0 100px rgba(157, 80, 187, 0.1); max-width:420px; margin:0 auto;">
                <div class="login-header">
                    <div class="login-logo">
                        <div class="login-logo-glow" style="background: linear-gradient(135deg, #ff9f00, #9d50bb);"></div>
                        <img src="https://i.ibb.co/Fqnj3JKp/1000001392.png" alt="Vibehub Logo">
                    </div>
                    <h1 class="login-title" style="background: linear-gradient(135deg, #ff9f00, #9d50bb); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${isLogin ? 'Welcome Back' : 'Join Vibehub'}</h1>
                    <p class="login-subtitle" style="color: #aaa;">Link your mind. Share your vibe.</p>
                </div>

                <div class="login-form">
                    <div id="login-form-fields" style="display: ${isLogin ? 'block' : 'none'}; margin-bottom: 20px;">
                        <input type="email" id="login-email-input" class="login-input" placeholder="Email Address" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(255, 165, 0, 0.3); background: rgba(0,0,0,0.3); color: white;" onkeypress="if(event.key==='Enter')window.App.handleCustomSignIn()">
                        <input type="password" id="login-password-input" class="login-input" placeholder="Password" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(255, 165, 0, 0.3); background: rgba(0,0,0,0.3); color: white;" onkeypress="if(event.key==='Enter')window.App.handleCustomSignIn()">
                        <button class="login-submit-btn" onclick="window.App.handleCustomSignIn()" style="width: 100%; padding: 12px; border-radius: 8px; border: none; background: linear-gradient(135deg, #ff9f00, #ff6b00); color: white; font-weight: 600; cursor: pointer;">Sign In</button>
                    </div>
                    
                    <div id="signup-form-fields" style="display: ${!isLogin ? 'block' : 'none'}; margin-bottom: 20px;">
                        <input type="text" id="signup-name-input" class="login-input" placeholder="Full Name" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(157, 80, 187, 0.3); background: rgba(0,0,0,0.3); color: white;">
                        <input type="email" id="signup-email-input" class="login-input" placeholder="Email Address" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(157, 80, 187, 0.3); background: rgba(0,0,0,0.3); color: white;">
                        <input type="password" id="signup-password-input" class="login-input" placeholder="Password" style="width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(157, 80, 187, 0.3); background: rgba(0,0,0,0.3); color: white;">
                        <button class="signup-submit-btn" onclick="window.App.handleCustomSignUp()" style="width: 100%; padding: 12px; border-radius: 8px; border: none; background: linear-gradient(135deg, #9d50bb, #6e48aa); color: white; font-weight: 600; cursor: pointer;">Create Account</button>
                    </div>
                    <div class="login-options" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; color:#aaa; font-size:0.85rem;">
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                            <input type="checkbox" id="remember-me" checked style="accent-color:var(--primary-orange);"> Stay Signed In
                        </label>
                        <a href="https://clerk.com" target="_blank" style="color:var(--primary-orange); text-decoration:none;">Need help?</a>
                    </div>

                    <button id="toggle-auth-btn" onclick="window.App.toggleAuthMode()" style="background: transparent; border: none; color: #aaa; font-size: 14px; cursor: pointer; width: 100%; margin-bottom: 20px; text-decoration: underline;">
                        ${isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
                    </button>

                    <div class="admin-dropdown-container" style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; margin-top: 5px;">
                        <button class="admin-dropdown-btn" onclick="const content = this.nextElementSibling; content.style.display = content.style.display === 'block' ? 'none' : 'block';" style="background:transparent; border:none; color:var(--text-dim); cursor:pointer; font-size:0.8rem; width:100%; display:flex; justify-content:center; align-items:center; gap:5px;">
                            <span>🔑</span> Admin Terminal (Auth View)
                        </button>
                        <div class="admin-dropdown-content" style="display:none; margin-top:15px; padding:15px; background:rgba(0,0,0,0.3); border-radius:12px; border:1px solid rgba(157, 80, 187, 0.2);">
                            <input type="text" id="admin-login-email-alt" class="login-input" placeholder="Admin ID" style="margin-bottom:10px; padding:10px; font-size:0.9rem;" onkeypress="if(event.key==='Enter')window.App.handleAdminLogin('alt')">
                            <input type="password" id="admin-login-password-alt" class="login-input" placeholder="Secret Key" style="margin-bottom:10px; padding:10px; font-size:0.9rem;" onkeypress="if(event.key==='Enter')window.App.handleAdminLogin('alt')">
                            <label style="display:flex; align-items:center; gap:8px; margin-top:10px; font-size:0.8rem; color:#aaa;">
                                <input type="checkbox" id="admin-remember-me-alt" checked> Save Connection
                            </label>
                            <button class="login-submit" onclick="window.App.handleAdminLogin('alt')" style="margin-top:15px; width:100%; padding:10px; height:auto; font-size:0.9rem;">🔑 Enter</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    messages(dms) {
        return `
            <div class="view-header"><h1 class="view-title">Messages</h1></div>
            <div class="messages-list">
                ${dms && dms.length > 0 ? dms.map(d => `
                    <div class="dm-card glass-panel" style="padding:15px; margin-bottom:10px; display:flex; align-items:center; gap:15px; cursor:pointer;">
                        <img src="https://i.pravatar.cc/100?u=${d.id}" class="user-avatar" style="width:50px; height:50px;">
                        <div style="flex:1;">
                            <div style="display:flex;">
                                <strong>${d.user || 'Unknown'}</strong>
                                <span class="text-dim" style="font-size:0.8rem; margin-left:auto;">${d.time || ''}</span>
                            </div>
                            <p class="${d.unread ? 'text-main' : 'text-dim'}" style="font-size:0.9rem;">${d.lastMsg || ''}</p>
                        </div>
                        ${d.unread ? '<div style="width:8px; height:8px; border-radius:50%; background:var(--primary-orange);"></div>' : ''}
                    </div>
                `).join('') : '<p class="text-dim" style="padding:20px; text-align:center;">No messages yet. Start a conversation!</p>'}
            </div>
        `;
    },

    notifications: (notifications) => {
        return `
            <div class="view-header">
                <h1 class="view-title">Notifications</h1>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button class="btn-secondary" onclick="window.App.markAllNotificationsRead()" style="padding: 5px 15px; font-size: 0.8rem;">Mark All Read</button>
                    <button class="btn-secondary" onclick="window.App.refreshNotifications()" style="padding: 5px 15px; font-size: 0.8rem;">Refresh</button>
                    <span class="text-dim" style="font-size: 0.8rem;">${notifications.filter(n => !n.read).length} unread</span>
                </div>
            </div>
            <div class="notifications-list" style="margin-top:20px; display:flex; flex-direction:column; gap:12px;">
                ${notifications && notifications.length > 0 ? notifications.map(n => `
                    <div class="notification-card glass-panel ${n.read ? '' : 'unread'}" style="display:flex; gap:15px; align-items:center; cursor:pointer; position: relative;" onclick="window.App.handleNotificationClick('${n.id}', '${n.type}', '${n.related_id || ''}')">
                        <div class="notif-icon" style="font-size:1.5rem;">${n.type === 'like' ? '❤️' : n.type === 'comment' ? '💬' : n.type === 'follow' ? '👤' : n.type === 'vibe_boost' ? '✨' : n.type === 'mention' ? '📢' : '🔔'}</div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; margin-bottom: 4px; color: var(--text-main);">${Components.getNotificationTitle(n.type, n.from_username || 'Someone')}</div>
                                    <p style="margin:0; font-size:0.95rem; line-height: 1.4; word-break: break-word;">${n.content}</p>
                                    <span class="text-dim" style="font-size:0.75rem;">${Components.formatNotificationTime(n.created_at)}</span>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 5px;">
                                    ${!n.read ? '<div style="width:8px; height:8px; border-radius:50%; background:var(--primary-orange);"></div>' : ''}
                                    <button class="notification-delete" onclick="event.stopPropagation(); window.App.deleteNotification('${n.id}')" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 5px; border-radius: 4px; font-size: 1.2rem;" title="Delete notification">🗑️</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('') : '<p class="text-dim" style="padding:40px; text-align:center;">No notifications yet. Start vibing to get updates!</p>'}
            </div>
        `;
    },

    getNotificationTitle(type, fromUsername) {
        const titles = {
            like: `${fromUsername} liked your vibe`,
            comment: `${fromUsername} commented on your post`,
            follow: `${fromUsername} started following you`,
            vibe_boost: `${fromUsername} boosted your vibe`,
            mention: `${fromUsername} mentioned you`,
            default: 'New notification'
        };
        return titles[type] || titles.default;
    }

    formatNotificationTime(timestamp) {
        if (!timestamp) return 'just now';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    },

    broadcastMode: (topic) => {
        return `
            <div class="broadcast-view" style="height: calc(100vh - 120px); display: flex; flex-direction: column; gap: 20px;">
                <div class="broadcast-header glass-panel" style="padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span class="live-tag" style="background: var(--primary-orange); color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 0.7rem; margin-right: 10px;">LIVE</span>
                        <span style="font-weight: bold;">${topic}</span>
                    </div>
                    <button class="btn-secondary" onclick="window.App.endLiveBroadcast()" style="padding: 5px 15px; font-size: 0.8rem; background: rgba(255, 0, 0, 0.2); border-color: rgba(255, 0, 0, 0.4);">END STREAM</button>
                </div>
                
                <div class="video-preview-container glass-panel" style="flex: 1; position: relative; overflow: hidden; border-radius: 12px; background: black;">
                    <video id="live-local-video" autoplay muted playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
                    
                    <div class="viewer-count" style="position: absolute; bottom: 20px; left: 20px; background: rgba(0, 0, 0, 0.6); padding: 5px 12px; border-radius: 20px; display: flex; align-items: center; gap: 6px; font-size: 0.8rem;">
                        <span class="pulse-dot" style="width: 8px; height: 8px; background: var(--accent-cyan);"></span>
                        <span id="live-viewers">1 viewer</span>
                    </div>

                    <div class="broadcast-controls" style="position: absolute; bottom: 20px; right: 20px; display: flex; gap: 10px;">
                        <button class="video-action" onclick="window.App.toggleLiveMic()" id="mic-btn">🎧</button>
                        <button class="video-action" onclick="window.App.toggleLiveCam()" id="cam-btn">🎥</button>
                    </div>
                </div>

                <div class="broadcast-chat glass-panel" style="height: 150px; padding: 15px; overflow-y: auto;">
                    <p class="text-dim" style="font-size: 0.8rem; text-align: center;">Waiting for reactions...</p>
                    <div id="broadcast-messages" style="display: flex; flex-direction: column; gap: 8px;"></div>
                </div>
            </div>
        `;
    },

    friends(friends, posts) {
        return `
            <div class="view-header">
                <h1 class="view-title">Friends</h1>
                <p class="text-dim">Your vibe circle.</p>
            </div>
            <div class="tabs">
                <button class="tab active" style="flex:1;" onclick="
                    this.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); 
                    this.classList.add('active'); 
                    document.getElementById('friends-list-container').classList.remove('hidden'); 
                    document.getElementById('friends-feed-container').classList.add('hidden');
                ">Friends List</button>
                <button class="tab" style="flex:1;" onclick="
                    this.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); 
                    this.classList.add('active'); 
                    document.getElementById('friends-list-container').classList.add('hidden'); 
                    document.getElementById('friends-feed-container').classList.remove('hidden');
                ">Friends Feed</button>
            </div>
            <div id="friends-list-container">
                <div class="friends-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap:15px; margin-top:20px;">
                    ${friends && friends.length > 0 ? friends.map(f => `
                        <div class="friend-card glass-panel" style="padding:15px; text-align:center; cursor:pointer;" onclick="window.App.viewUserProfile('${f.id}', '${f.username}')">
                            <img src="${f.avatar || 'https://i.pravatar.cc/150'}" style="width:60px; height:60px; border-radius:50%; margin-bottom:10px;">
                            <h4 style="font-size:0.9rem;">${f.displayName || f.username}</h4>
                            <p class="text-dim" style="font-size:0.75rem;">@${f.username}</p>
                        </div>
                    `).join('') : '<p class="text-dim" style="grid-column:1/-1; text-align:center; padding:30px;">No friends yet. Start connecting!</p>'}
                </div>
            </div>
            <div id="friends-feed-container" class="hidden">
                <div style="margin-top:20px;">
                    <h3 class="section-title">Friends' Recent Vibes</h3>
                    <div id="friends-feed" style="margin-top:15px;">
                        ${posts && posts.length > 0 ? posts.map(p => Components.post(p)).join('') : '<p class="text-dim" style="text-align:center; padding:20px;">No recent vibes from friends.</p>'}
                    </div>
                </div>
            </div>
        `;
    },

    search() {
        return `
            <div class="view-header"><h1 class="view-title">Search</h1></div>
            <div class="search-tabs tabs">
                <button class="tab active">Minds</button>
                <button class="tab">Vibes</button>
                <button class="tab">Communities</button>
                <button class="tab">Hashtags</button>
            </div>
            <div id="search-results-area" style="padding: 20px 0;">
                <h3 class="text-dim">Trending Topics</h3>
                <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:15px;">
                    <span class="user-badge badge-truth">#cyberpunk</span>
                    <span class="user-badge badge-truth">#psychology</span>
                    <span class="user-badge badge-truth">#synthwave</span>
                    <span class="user-badge badge-truth">#meditation</span>
                </div>
                <div style="margin-top:40px;">
                    <h3 class="text-dim">Minds to Link</h3>
                    ${[1,2,3].map(i => `
                        <div class="glass-panel" style="padding:15px; margin-bottom:10px; display:flex; align-items:center; gap:15px;">
                            <img src="https://i.pravatar.cc/100?u=s${i}" class="user-avatar" style="width:50px; height:50px;">
                            <div>
                                <strong>Mind ${i}</strong>
                                <p class="text-dim" style="font-size:0.8rem;">Vibe Match: <span style="color:var(--primary-orange); font-weight:700;">${90 + i}%</span></p>
                            </div>
                            <button class="btn-primary btn-sm" style="margin-left:auto;">Link</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    communities(communities) {
        return `
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 15px;">
                <div style="flex: 1; min-width: 200px;">
                    <h1 class="view-title">Communities</h1>
                    <p class="text-dim">Find your tribe. Link your mind.</p>
                </div>
                <button class="btn-primary" onclick="window.App.showCreateCommunityModal()" style="white-space: nowrap;">+ New Group</button>
            </div>
            <div class="communities-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-top:20px;">
                ${communities && communities.length > 0 ? communities.map(c => `
                    <div class="community-card glass-panel" style="overflow:hidden; cursor:pointer;" onclick="window.App.viewCommunity('${c.id}', '${c.name}')">
                        <img src="${c.banner || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=400'}" style="width:100%; height:120px; object-fit:cover;" alt="Banner">
                        <div style="padding:15px;">
                            <h3 style="font-family:var(--font-display); font-size:1.3rem;">${c.name || 'Unnamed'}</h3>
                            <p class="text-dim" style="font-size:0.9rem; margin-top:5px; margin-bottom:15px;">${c.desc || ''}</p>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span class="badge-admired user-badge" style="margin:0;">${c.members || 0} Members</span>
                                <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); window.App.joinCommunity('${c.id}', '${c.name}')">Join</button>
                            </div>
                        </div>
                    </div>
                `).join('') : '<p class="text-dim" style="padding:30px; text-align:center;">No communities yet. Create one!</p>'}
            </div>
        `;
    },

    marketplace(items) {
        return `
            <div class="view-header">
                <h1 class="view-title">Vibe Market</h1>
                <p class="text-dim">Trade vibes, digital goods, and more.</p>
            </div>
            <div class="marketplace-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; margin-top:20px;">
                ${items && items.length > 0 ? items.map(item => `
                    <div class="marketplace-item glass-panel" style="overflow:hidden;">
                        <img src="${item.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400'}" style="width:100%; height:150px; object-fit:cover;" alt="${item.title || 'Item'}">
                        <div style="padding:15px;">
                            <h3 style="font-size:1rem;">${item.title || 'Untitled'}</h3>
                            <p class="text-dim" style="font-size:0.85rem; margin:5px 0;">${item.description || ''}</p>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                                <span style="color:var(--primary-orange); font-weight:bold;">${item.price || '0 VIBE'}</span>
                                <button class="btn-primary btn-sm" onclick="window.App.buyItem('${item.id}')">Buy</button>
                            </div>
                            <p class="text-dim" style="font-size:0.75rem; margin-top:8px;">Seller: @${item.seller || 'unknown'}</p>
                        </div>
                    </div>
                `).join('') : '<p class="text-dim" style="padding:30px; text-align:center;">No items listed yet. Check back later!</p>'}
            </div>
        `;
    },

    settings() {
        const moodGlowEnabled = localStorage.getItem('moodGlow_enabled') === 'true';
        
        return `
            <div class="view-header"><h1 class="view-title">⚙️ Settings</h1></div>
            <div class="settings-grid" style="display:flex; flex-direction:column; gap:20px;">
                
                <div class="glass-panel" style="padding:20px;">
                    <h3 style="margin:0 0 15px 0; color:var(--text-main);">🌟 Mood Glow</h3>
                    <p style="margin:0 0 15px 0; color:var(--text-dim); font-size:0.9rem;">
                        Enable Mood Glow to see your emotional state reflected in the app's ambient lighting.
                    </p>
                    
                    <div class="setting-item" style="display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid var(--border-light);">
                        <div>
                            <div style="font-weight:600; color:var(--text-main); margin-bottom:5px;">Enable Mood Glow</div>
                            <div style="color:var(--text-dim); font-size:0.9rem;">Show emotional ambiance around screen edges</div>
                        </div>
                        <label class="toggle-switch" style="position:relative; display:inline-block; width:60px; height:34px;">
                            <input type="checkbox" id="mood-glow-toggle" ${moodGlowEnabled ? 'checked' : ''} style="opacity:0; width:0; height:0;" onchange="window.App.toggleMoodGlow(this.checked)">
                            <span class="toggle-slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:var(--border-light); transition:0.4s; border-radius:34px;">
                                <span class="toggle-slider:before" style="position:absolute; content:''; height:26px; width:26px; left:4px; bottom:4px; background-color:white; transition:0.4s; border-radius:50%;"></span>
                            </span>
                        </label>
                    </div>
                    
                    <div style="margin-top:15px; padding:15px; background:var(--bg-glass); border-radius:8px;">
                        <div style="font-weight:600; color:var(--text-main); margin-bottom:10px;">How Mood Glow Works</div>
                        <div style="color:var(--text-dim); font-size:0.85rem; line-height:1.4;">
                            <p style="margin:0 0 8px 0;">🧠 <strong>Language Analysis:</strong> Words carry emotional fingerprints</p>
                            <p style="margin:0 0 8px 0;">📊 <strong>Posting Patterns:</strong> When and how often you post</p>
                            <p style="margin:0 0 8px 0;">🤝 <strong>Engagement Style:</strong> How you interact with others</p>
                            <p style="margin:0 0 8px 0;">💭 <strong>Topic Patterns:</strong> Themes reveal mood shifts</p>
                            <p style="margin:0;">🔮 <strong>Probabilistic:</strong> 70%+ accuracy based on research</p>
                        </div>
                    </div>
                </div>
                
                <div class="glass-panel" style="padding:20px;">
                    <h3>Support Vibehub Development</h3>
                    <p class="text-dim" style="margin-top:5px;">Help us link more minds. Secure via Square.</p>
                    <button class="btn-primary" style="margin-top:15px;" onclick="window.App.handleDonation()">Donate to Vibe Evolution</button>
                </div>
                
                <div class="glass-panel" style="padding:20px;">
                    <h3>Community</h3>
                    <button class="btn-secondary" style="margin-top:10px; width:100%;" onclick="window.App.navigate('guidelines')">Community Guidelines</button>
                </div>
                
                <div class="glass-panel" style="padding:20px;">
                    <h3>Account Security</h3>
                    <button class="btn-secondary" style="margin-top:10px; width:100%;">Update Passlink</button>
                </div>
                
                <button class="btn-secondary" style="color:var(--accent-pink); border-color:var(--accent-pink);" onclick="window.App.services.auth.logout()">Disconnect Session</button>
                
                <style>
                    .toggle-switch input:checked + .toggle-slider {
                        background-color: var(--primary-orange);
                    }
                    
                    .toggle-switch input:focus + .toggle-slider {
                        box-shadow: 0 0 1px var(--primary-orange);
                    }
                    
                    .toggle-switch input:checked + .toggle-slider:before {
                        transform: translateX(26px);
                    }
                </style>
            </div>
        `;
    },

    guidelines() {
        return `
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h1 class="view-title">Community Guidelines</h1>
                <button class="btn-secondary" onclick="window.App.navigate('home')">← Back to Home</button>
            </div>
            <div class="glass-panel" style="padding:25px; margin-top:20px;">
                <h2 style="color:var(--primary-orange); margin-bottom:20px;">VibeHub Community Standards</h2>
                <div style="margin-bottom:25px;">
                    <h3 style="color:var(--primary-purple);">1. Be Respectful</h3>
                    <p class="text-dim" style="margin-top:5px;">No harassment, hate speech, or bullying.</p>
                </div>
                <div style="margin-bottom:25px;">
                    <h3 style="color:var(--primary-purple);">2. Authentic Interactions</h3>
                    <p class="text-dim" style="margin-top:5px;">Be yourself. No catfishing or impersonation.</p>
                </div>
                <div style="margin-bottom:25px;">
                    <h3 style="color:var(--primary-purple);">3. Quality Content</h3>
                    <p class="text-dim" style="margin-top:5px;">Post original content. No spam.</p>
                </div>
                <div style="margin-bottom:25px;">
                    <h3 style="color:var(--primary-purple);">4. Privacy & Safety</h3>
                    <p class="text-dim" style="margin-top:5px;">Don't share personal info of others.</p>
                </div>
                <div style="margin-top:30px; padding:15px; background:rgba(255,0,0,0.1); border-radius:10px;">
                    <p style="color:var(--accent-pink);">Violations may result in warnings or bans.</p>
                </div>
                <button class="btn-primary" style="margin-top:25px; width:100%;" onclick="window.App.navigate('home')">I Understand</button>
            </div>
        `;
    },

    disclaimer() {
        return `
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h1 class="view-title">Disclaimer</h1>
                <button class="btn-secondary" onclick="window.App.navigate('home')">← Back</button>
            </div>
            <div class="glass-panel" style="padding:25px; margin-top:20px; line-height:1.6;">
                <p>VibeHub is a real-time interaction platform. We do not endorse or take responsibility for content posted by users.</p>
            </div>
        `;
    },

    privacy() {
        return `
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h1 class="view-title">Privacy Policy</h1>
                <button class="btn-secondary" onclick="window.App.navigate('home')">← Back</button>
            </div>
            <div class="glass-panel" style="padding:25px; margin-top:20px; line-height:1.6;">
                <p><strong>Data Linking:</strong> We collect your interaction history to optimize your experience.</p>
            </div>
        `;
    },

    admin(stats) {
        return `
            <div class="view-header animate-fade">
                <h1 class="view-title" style="background: linear-gradient(135deg, var(--accent-pink), var(--accent-cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Admin Portal</h1>
                <p class="text-dim">Unified Control Center for reality management.</p>
            </div>
            <div class="tabs scrollable-tabs" style="margin-bottom: 25px;">
                <button class="tab active" data-admin-tab="stats" onclick="window.App.switchAdminTab('stats')">📊 Stats</button>
                <button class="tab" data-admin-tab="users" onclick="window.App.switchAdminTab('users')">👥 Users</button>
                <button class="tab" data-admin-tab="moderation" onclick="window.App.switchAdminTab('moderation')">🛡️ Moderation</button>
                <button class="tab" data-admin-tab="ads" onclick="window.App.switchAdminTab('ads')">📢 Ads</button>
                <button class="tab" data-admin-tab="terminal" onclick="window.App.switchAdminTab('terminal')">💻 Terminal</button>
                <button class="tab" data-admin-tab="neural" onclick="window.App.switchAdminTab('neural')">🧠 Neural Merge</button>
            </div>
            <div id="admin-tab-content">
                <div id="admin-stats-view" class="admin-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
                    <div class="stat-card glass-panel" style="padding: 24px;">
                        <h3 class="text-dim">Total Users</h3>
                        <p style="font-size: 2.5rem; font-weight:800; color: var(--primary-purple);">${stats?.users || 0}</p>
                    </div>
                    <div class="stat-card glass-panel" style="padding: 24px;">
                        <h3 class="text-dim">Total Posts</h3>
                        <p style="font-size: 2.5rem; font-weight:800; color: var(--primary-orange);">${stats?.posts || 0}</p>
                    </div>
                    <div class="stat-card glass-panel" style="padding: 24px;">
                        <h3 class="text-dim">Reports</h3>
                        <p style="font-size: 2.5rem; font-weight:800; color: var(--accent-pink);">${stats?.reports || 0}</p>
                    </div>
                </div>
                
                <div id="admin-moderation-view" class="hidden">
                    <div class="glass-panel" style="padding: 20px;">
                        <h3>Active Reports</h3>
                        <div id="admin-reports-list" style="margin-top: 15px;">
                            <p class="text-dim">No active reports. Community is vibing safely. ✨</p>
                        </div>
                    </div>
                </div>

                <div id="admin-users-view" class="hidden">
                    <div class="glass-panel" style="padding: 20px;">
                        <h3>User Management</h3>
                        <div id="admin-users-list" style="margin-top: 15px;">
                            <p class="text-dim">Retrieving user sync state...</p>
                        </div>
                    </div>
                </div>

                <div id="admin-ads-view" class="hidden">
                    <div class="glass-panel" style="padding: 25px;">
                        <h3 style="color:var(--primary-orange); margin-bottom:20px;">Launch Global Advertisement</h3>
                        <div style="display:flex; flex-direction:column; gap:15px;">
                            <div class="input-group">
                                <label class="text-dim" style="font-size:0.8rem; display:block; margin-bottom:5px;">Ad Content (The Message)</label>
                                <textarea id="ad-content" class="login-input" placeholder="Enter your sponsored message..." style="min-height:100px;"></textarea>
                            </div>
                            <div class="input-group">
                                <label class="text-dim" style="font-size:0.8rem; display:block; margin-bottom:5px;">Media Link (Image/Video URL)</label>
                                <input type="text" id="ad-media" class="login-input" placeholder="https://example.com/vibe.mp4">
                            </div>
                            <div class="input-group">
                                <label class="text-dim" style="font-size:0.8rem; display:block; margin-bottom:5px;">Target Destination (Link)</label>
                                <input type="text" id="ad-link" class="login-input" placeholder="https://vibehub.link/join">
                            </div>
                            <button class="btn-primary" onclick="window.App.submitAdPost()" style="height:55px; font-size:1.1rem; box-shadow: 0 0 30px var(--primary-orange-glow);">🚀 Broadast to Universe</button>
                        </div>
                    </div>
                    <div id="admin-active-ads" style="margin-top:30px;">
                        <h3 class="text-dim">Active Campaigns</h3>
                        <div id="admin-ads-list" style="margin-top:15px; display:flex; flex-direction:column; gap:15px;">
                            <!-- Ads will be loaded here -->
                        </div>
                    </div>
                </div>

                <div id="admin-neural-view" class="hidden">
                    <div class="glass-panel" style="padding: 20px;">
                        <h3>Neural Merge Controls</h3>
                        <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 20px;">
                            <button class="btn-secondary" onclick="window.App.toggleGlobalMaintenance()">Toggle Maintenance Mode</button>
                            <button class="btn-primary" style="background: var(--accent-pink);" onclick="window.App.purgeExpiredVibes()">Purge Expired Vibes</button>
                            <button class="btn-primary" onclick="window.App.pushGlobalNotification()">Push Broadcast Signal</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    broadcastMode(topic) {
        return `
            <div class="broadcast-mode animate-fade" style="position:relative; height:calc(100vh - 100px); background:#000; border-radius:24px; overflow:hidden;">
                <video id="broadcast-preview" autoplay muted style="width:100%; height:100%; object-fit:cover;"></video>
                <div class="broadcast-overlay" style="position:absolute; top:0; left:0; right:0; bottom:0; padding:20px; display:flex; flex-direction:column; justify-content:space-between; background:linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.6) 100%); pointer-events:none;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; pointer-events:auto;">
                        <div class="glass-panel" style="padding:10px 20px; border-radius:30px; border:1px solid rgba(239, 68, 68, 0.5); display:flex; align-items:center; gap:10px;">
                            <span class="pulse-dot" style="background:#ef4444;"></span>
                            <span style="font-weight:800; color:#ef4444; letter-spacing:1px;">LIVE</span>
                            <span style="color:white; opacity:0.8;">| ${topic}</span>
                        </div>
                        <button class="btn-secondary" onclick="window.App.stopLiveStream()" style="background:rgba(239, 68, 68, 0.2); border-color:rgba(239, 68, 68, 0.4); color:#fff; border-radius:50%; width:44px; height:44px; display:flex; align-items:center; justify-content:center; padding:0;">✕</button>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; pointer-events:auto;">
                        <div class="glass-panel" style="padding:10px 15px; border-radius:20px; display:flex; align-items:center; gap:8px;">
                            <span style="font-size:1.2rem;">👥</span>
                            <span id="viewer-count" style="font-weight:bold; color:white;">0</span>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button class="glass-panel" id="toggle-mic" onclick="window.App.toggleBroadcastMedia('audio')" style="width:50px; height:50px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; cursor:pointer;">🎤</button>
                            <button class="glass-panel" id="toggle-cam" onclick="window.App.toggleBroadcastMedia('video')" style="width:50px; height:50px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; cursor:pointer;">📹</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};