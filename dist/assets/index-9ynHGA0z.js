(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function t(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function i(s){if(s.ep)return;s.ep=!0;const a=t(s);fetch(s.href,a)}})();const p="https://osfqlabtuqpynqcdmwff.supabase.co",u="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZnFsYWJ0dXFweW5xY2Rtd2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODQ3OTEsImV4cCI6MjA4NzU2MDc5MX0.LXZ-lbLiarXHSSlu8NXi0c_uvIVFxh8mw6amXGJAwtA";createClient(p,u);const n={user:null,currentView:"home",posts:[],notifications:[],syncRooms:[],messages:[],theme:"dark",viewData:{}};class g{constructor(){this.services={auth:new AuthService,data:new DataService,video:new VideoService,chat:new ChatService,admin:new AdminService},this.init()}async init(){console.log("Vibehub Initializing..."),window.triggerReactionPopup=this.triggerReactionPopup.bind(this),this.showLoadingScreen(),"serviceWorker"in navigator&&window.location.protocol==="https:"&&navigator.serviceWorker.register("./service-worker.js").catch(e=>console.log("Service Worker registration failed:",e)),this.setupEventListeners(),setTimeout(()=>{this.transitionToLogin()},3e3)}showLoadingScreen(){const e=document.getElementById("loading-screen");e&&(e.style.visibility="visible",e.style.opacity="1",this.createStars(),this.initLoadingParticles())}transitionToLogin(){const e=document.getElementById("loading-screen"),t=document.getElementById("login-screen"),i=document.getElementById("app");e?(e.style.opacity="0",setTimeout(()=>{e.style.visibility="hidden",t&&(t.style.opacity="1",t.style.visibility="visible",this.initLoginParticles()),i&&(i.classList.remove("hidden"),i.style.opacity="1")},500)):t&&(t.style.opacity="1",t.style.visibility="visible",this.initLoginParticles())}createStars(){const e=document.getElementById("starfield");if(e)for(let t=0;t<200;t++){const i=document.createElement("div");i.className="star",i.style.left=`${Math.random()*100}%`,i.style.top=`${Math.random()*100}%`,i.style.animationDelay=`${Math.random()*2}s`,i.style.animationDuration=`${1.5+Math.random()*1.5}s`,e.appendChild(i)}}initLoadingParticles(){const e=document.getElementById("loading-particles");if(!e)return;const t=80;for(let i=0;i<t;i++){const s=document.createElement("div");s.className="particle";const a=Math.random()*10+3;s.style.width=`${a}px`,s.style.height=`${a}px`,s.style.left=`${Math.random()*100}%`,s.style.top=`${Math.random()*100}%`,s.style.setProperty("--drift",`${Math.random()*100-50}px`),s.style.animationDelay=`${Math.random()*10}s`,s.style.animationDuration=`${10+Math.random()*15}s`,s.style.boxShadow="0 0 10px rgba(0, 242, 255, 0.5), 0 0 20px rgba(157, 80, 187, 0.5)",e.appendChild(s)}}showLoginScreen(){const e=document.getElementById("login-screen");e&&(e.style.opacity="1",e.style.visibility="visible",this.initLoginParticles())}handleRouting(){const e=window.location.hash.replace("#","")||"home";this.navigate(e)}initLoginParticles(){const e=document.getElementById("login-particles");if(!e)return;const t=60;for(let i=0;i<t;i++){const s=document.createElement("div");s.className="particle";const a=Math.random()*15+5;s.style.width=`${a}px`,s.style.height=`${a}px`,s.style.left=`${Math.random()*100}%`,s.style.top=`${Math.random()*100}%`,s.style.setProperty("--drift",`${Math.random()*60-30}px`),s.style.animationDelay=`${Math.random()*15}s`,s.style.animationDuration=`${12+Math.random()*10}s`,e.appendChild(s)}}setupEventListeners(){document.querySelectorAll(".nav-link").forEach(s=>{s.addEventListener("click",a=>{const o=a.currentTarget.dataset.view;this.navigate(o)})});const e=document.getElementById("global-search");e&&e.addEventListener("input",s=>{n.currentView!=="search"&&s.target.value.length>0&&this.navigate("search")});const t=document.getElementById("create-post-btn");t&&t.addEventListener("click",()=>this.showCreatePostModal());const i=document.getElementById("admin-trigger");i&&i.addEventListener("click",()=>this.navigate("admin")),document.body.addEventListener("click",s=>{const a=s.target.closest(".reaction-btn");if(a){a.classList.toggle("active");const o=a.querySelector("span");if(o){let r=parseInt(o.innerText);r=a.classList.contains("active")?r+1:r-1,o.innerText=r}if(a.classList.contains("active")){const r=a.innerText.split(" ")[0];window.triggerReactionPopup(s.clientX,s.clientY,r)}a.style.transform="scale(1.2)",setTimeout(()=>a.style.transform="",200)}}),window.addEventListener("popstate",s=>{s.state&&s.state.view&&this.renderView(s.state.view,!1)})}showPostMenu(e){const t=document.querySelector(`[data-id="${e}"]`);if(!t)return;const i=document.getElementById("post-menu");i&&i.remove();const s=document.createElement("div");s.id="post-menu",s.className="glass-panel",s.style.cssText="position:absolute; right:20px; top:40px; padding:10px; z-index:100; display:flex; flex-direction:column; min-width:150px;",n.user&&n.user.isSuperAdmin?s.innerHTML=`
                <button class="menu-item text-main" style="border:none; background:transparent; padding:8px; text-align:left; cursor:pointer;" onclick="window.App.deletePost('${e}')">Delete Post</button>
                <div style="height:1px; background:var(--border-light); margin:4px 0;"></div>
                <button class="menu-item text-main" style="border:none; background:transparent; padding:8px; text-align:left; cursor:pointer; color:var(--accent-pink);" onclick="window.App.removeUser('${e}')">Remove User</button>
            `:s.innerHTML=`
                <button class="menu-item text-main" style="border:none; background:transparent; padding:8px; text-align:left; cursor:pointer;" onclick="window.App.reportPost('${e}')">Report Post</button>
            `,t.appendChild(s),setTimeout(()=>{document.addEventListener("click",a=>{a.target!==s&&!s.contains(a.target)&&s.remove()},{once:!0})},100)}reportPost(e){this.showToast("Post reported for review");const t=document.getElementById("post-menu");t&&t.remove()}removeUser(e){const t=document.querySelector(`[data-id="${e}"]`);t&&t.remove(),this.showToast("User has been removed.")}deletePost(e){const t=document.querySelector(`[data-id="${e}"]`);t&&t.remove(),this.showToast("Post deleted")}showCreatePostModal(){const e=document.getElementById("modal-container"),t=document.getElementById("modal-content");!e||!t||(e.classList.remove("hidden"),t.innerHTML=`
            <h2 class="view-header">Post Your Vibe</h2>
            <textarea id="post-input" class="glass-panel" placeholder="What's your mind linked to?" style="width:100%; min-height:120px; background:rgba(0,0,0,0.5); border:1px solid var(--border-light); color:white; padding:15px; margin:15px 0;"></textarea>
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <button class="btn-secondary">📷 Photo</button>
                <button class="btn-secondary">🎥 Video</button>
                <button class="btn-secondary">📍 Location</button>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button class="btn-secondary" onclick="document.getElementById('modal-container').classList.add('hidden')">Cancel</button>
                <button class="btn-primary" id="final-post-btn">Post Vibe</button>
            </div>
        `,document.getElementById("final-post-btn").addEventListener("click",()=>this.handleCreatePost()))}async handleCreatePost(){const e=document.getElementById("post-input").value;if(!e||!n.user)return;const t={id:"p"+Date.now(),userId:n.user.id,displayName:n.user.displayName,handle:n.user.username,avatar:n.user.profilePhoto,content:e,media:null,type:"text",engagement:0,reactions:{like:0,heat:0,wild:0,cap:0,admire:0,dislike:0},comments:[],timestamp:"Just now",isSponsored:!1,tab:"all"};await this.services.data.addPost(t),document.getElementById("modal-container").classList.add("hidden"),this.showToast("Vibe posted to the Pulse!"),this.renderView("home")}async showCommentModal(e){const t=document.getElementById("modal-container"),i=document.getElementById("modal-content");if(!t||!i)return;const s=await this.services.data.getComments(e);t.classList.remove("hidden"),i.innerHTML=`
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h2 class="view-title" style="margin:0;">Comments</h2>
                <button class="btn-secondary" style="padding:5px 10px;" onclick="document.getElementById('modal-container').classList.add('hidden')">✕</button>
            </div>
            
            <div id="comments-list" style="max-height: 50vh; overflow-y: auto; margin-bottom:15px; padding-right:5px;">
                ${this.renderCommentsHTML(s)}
            </div>
            
            <div class="comment-input-area" style="display:flex; flex-direction:column; gap:10px;">
                <textarea id="comment-input" class="glass-panel" placeholder="Add a comment..." style="width:100%; min-height:80px; background:rgba(0,0,0,0.5); border:1px solid var(--border-light); color:white; padding:10px;"></textarea>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:10px;">
                        <button class="btn-secondary" title="Audio Comment" onclick="window.App.startAudioComment('${e}')">🎤</button>
                        <button class="btn-secondary" title="Video Reply" onclick="window.App.startVideoComment('${e}')">🎥</button>
                    </div>
                    <button class="btn-primary" onclick="window.App.submitTextComment('${e}')">Post Comment</button>
                </div>
            </div>
        `}renderCommentsHTML(e){return!e||e.length===0?'<p class="text-dim" style="text-align:center; padding:20px;">No comments yet. Be the first to vibe!</p>':e.map(t=>{let i="";return t.type==="audio"?i=`<div style="background:var(--bg-glass); padding:8px 15px; border-radius:50px; display:inline-flex; align-items:center; gap:10px; border:1px solid var(--primary-purple); cursor:pointer;"><span style="color:var(--accent-cyan);">▶</span> Audio Comment (0:0${Math.floor(Math.random()*5)+2})</div>`:t.type==="video"&&(i='<div style="background:black; width:150px; height:80px; border-radius:10px; display:flex; align-items:center; justify-content:center; border:1px solid var(--primary-orange); cursor:pointer;"><span style="color:white; font-size:1.5rem;">▶</span></div>'),`
                <div class="comment" style="display:flex; gap:12px; margin-bottom:15px; animation: slideInRight 0.3s ease-out;">
                    <img src="https://i.pravatar.cc/100?u=${t.userId}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
                    <div class="comment-body" style="flex:1;">
                        <div style="display:flex; align-items:baseline; gap:8px;">
                            <span class="comment-author" style="font-weight:bold; font-size:0.9rem;">${t.displayName||t.userId}</span>
                            <span class="comment-time text-dim" style="font-size:0.75rem;">${t.time}</span>
                        </div>
                        ${t.text?`<div class="comment-text" style="font-size:0.95rem; margin-top:2px;">${t.text}</div>`:""}
                        ${i?`<div style="margin-top:5px;">${i}</div>`:""}
                    </div>
                </div>
            `}).join("")}async submitTextComment(e){const i=document.getElementById("comment-input").value.trim();if(!i)return;await this.services.data.addComment(e,{userId:n.user?n.user.username:"guest",displayName:n.user?n.user.displayName:"Guest User",text:i,type:"text"}),this.showCommentModal(e),this.showToast("Comment posted!");const s=document.querySelector(`.post-card[data-id="${e}"] .action-comment span`);s&&(s.innerText=parseInt(s.innerText)+1)}async startAudioComment(e){this.showToast("Recording audio... (Simulated)"),setTimeout(async()=>{await this.services.data.addComment(e,{userId:n.user?n.user.username:"guest",displayName:n.user?n.user.displayName:"Guest User",type:"audio"}),this.showCommentModal(e),this.showToast("Audio comment posted!");const t=document.querySelector(`.post-card[data-id="${e}"] .action-comment span`);t&&(t.innerText=parseInt(t.innerText)+1)},2e3)}async startVideoComment(e){this.showToast("Uploading video... (Simulated)"),setTimeout(async()=>{await this.services.data.addComment(e,{userId:n.user?n.user.username:"guest",displayName:n.user?n.user.displayName:"Guest User",type:"video"}),this.showCommentModal(e),this.showToast("Video reply posted!");const t=document.querySelector(`.post-card[data-id="${e}"] .action-comment span`);t&&(t.innerText=parseInt(t.innerText)+1)},2e3)}hideSplash(){}navigate(e){n.currentView===e&&window.location.hash===`#${e}`||(history.pushState({view:e},"",`#${e}`),this.renderView(e))}async renderView(e,t=!0){n.currentView=e;const i=document.getElementById("view-container");if(i){t&&document.querySelectorAll(".nav-link").forEach(s=>{s.classList.toggle("active",s.dataset.view===e)}),i.innerHTML='<div class="loader-view"><div class="spinner"></div></div>';try{switch(e){case"home":const s=await this.services.data.getPosts();i.innerHTML=this.getHomeHTML(s);break;case"vibestream":const a=await this.services.video.getVibeStream();i.innerHTML=this.getVibeStreamHTML(a);break;case"syncrooms":const o=await this.services.chat.getSyncRooms();i.innerHTML=this.getSyncRoomsHTML(o);break;case"profile":i.innerHTML=this.getProfileHTML(n.user);break;case"login":case"register":i.innerHTML=this.getAuthHTML(e);break;case"messages":const r=await this.services.chat.getMessages();i.innerHTML=this.getMessagesHTML(r);break;case"notifications":i.innerHTML=this.getNotificationsHTML();break;case"settings":i.innerHTML=this.getSettingsHTML();break;case"search":i.innerHTML=this.getSearchHTML();break;case"communities":const d=await this.services.data.getCommunities();i.innerHTML=this.getCommunitiesHTML(d);break;case"marketplace":const c=await this.services.data.getMarketplace();i.innerHTML=this.getMarketplaceHTML(c);break;case"admin":const m=this.services.admin.getStats();i.innerHTML=this.getAdminHTML(m);break;default:i.innerHTML=`<div class="view-header"><h1 class="view-title">${e}</h1><p>Vibe missing. Error 404.</p></div>`}this.attachViewEvents()}catch(s){i.innerHTML=`<div class="error-view"><h2>Vibe Check Failed</h2><p>${s.message}</p></div>`}i.scrollTop=0}}attachViewEvents(){if(n.currentView==="syncrooms"?this.startSyncStream():this.streamInterval&&clearInterval(this.streamInterval),n.currentView==="vibestream"){const e=document.querySelectorAll(".vibe-video-card video"),t=new IntersectionObserver(i=>{i.forEach(s=>{s.isIntersecting?s.target.play().catch(()=>{}):s.target.pause()})},{threshold:.8});e.forEach(i=>t.observe(i))}}createFloatingReaction(e,t,i){const s=document.createElement("div");s.className="reaction-pop",s.innerText=i,s.style.left=`${e}px`,s.style.top=`${t}px`,document.body.appendChild(s),setTimeout(()=>s.remove(),800)}triggerReactionPopup(e,t,i){const s=document.createElement("div");s.className="reaction-popup",s.innerHTML=`<span>${i}</span>`,s.style.left=`${e}px`,s.style.top=`${t}px`,s.style.position="fixed",s.style.pointerEvents="none",s.style.zIndex="9999",s.style.fontSize="1.5rem",s.style.textShadow="0 0 10px rgba(255,157,0,0.8)",s.style.transition="all 0.4s ease-out",s.style.transform="translate(-50%, -50%) scale(0.5)",s.style.opacity="0",document.body.appendChild(s),requestAnimationFrame(()=>{s.style.transform="translate(-50%, -150px) scale(1.5)",s.style.opacity="1"}),setTimeout(()=>{s.style.opacity="0",s.style.transform="translate(-50%, -200px) scale(0.8)"},500),setTimeout(()=>s.remove(),900)}startSyncStream(){if(!document.getElementById("sync-stream-simulation")){const s=document.getElementById("view-container"),a=document.createElement("div");a.id="sync-stream-simulation",a.style.cssText="position:fixed; bottom:100px; right:20px; width:250px; z-index:50; pointer-events:none;",s.appendChild(a)}const t=document.getElementById("sync-stream-simulation"),i=["Mind 42 just linked!","Neural energy rising in Neon Nights.","Someone just dropped a Heat Magnet vibe.","Sync rate increasing...","Deep focus achieved in room #4."];this.streamInterval&&clearInterval(this.streamInterval),this.streamInterval=setInterval(()=>{const s=document.createElement("div");s.className="sync-stream-msg glass-panel",s.innerHTML=`<strong>LINK:</strong> ${i[Math.floor(Math.random()*i.length)]}`,t.prepend(s),t.children.length>5&&t.lastChild.remove()},3e3)}getHomeHTML(e,t="vibeline"){return`
            <div class="view-header animate-fade">
                <h1 class="view-title">The Pulse</h1>
                <p class="text-dim" style="margin-top:8px;">Connect minds. Share vibes. Elevate consciousness.</p>
            </div>
            <div class="tabs">
                ${[{id:"vibeline",label:"Vibeline"},{id:"trending",label:"Trending"},{id:"we-vibin",label:"We Vibin"}].map(s=>`<button class="tab ${t===s.id?"active":""}" onclick="window.App.switchHomeTab('${s.id}')">${s.label}</button>`).join("")}
            </div>
            <div id="post-feed">
                ${e.map(s=>Components.post(s)).join("")}
            </div>
        `}async switchHomeTab(e){const t=await this.services.data.getPosts(e);document.getElementById("view-container").innerHTML=this.getHomeHTML(t,e),this.attachViewEvents()}getVibeStreamHTML(e){return`
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h1 class="view-title">VibeStream</h1>
                    <p>Vertical vibes for the linked mind.</p>
                </div>
                <button class="btn-primary" onclick="window.App.goLive()">Go Live</button>
            </div>
            <div class="vibestream-container">
                ${e.map(t=>Components.video(t)).join("")}
            </div>
        `}getSyncRoomsHTML(e){return`
            <div class="view-header">
                <h1 class="view-title">Sync Rooms</h1>
                <p>Live psychological sync with 125 minds max.</p>
            </div>
            <div class="rooms-grid" id="rooms-grid">
                ${e.map(t=>`
                    <div class="room-card glass-panel">
                        <h3>${t.name}</h3>
                        <p>${t.users} Vibing Now</p>
                        <button class="btn-primary" onclick="window.App.joinSyncRoom('${t.id}', '${t.name}')">Sync In</button>
                    </div>
                `).join("")}
            </div>
            <div id="active-chat-container" class="hidden">
                <div class="view-header"><button class="btn-secondary" onclick="window.App.leaveSyncRoom()">← Back to Rooms</button><h1 class="view-title" id="active-room-name"></h1></div>
                <div class="chat-container">
                    <div class="chat-messages" id="chat-messages"></div>
                    <div class="chat-input">
                        <input type="text" id="chat-message-input" placeholder="Type a message...">
                        <button class="btn-primary" onclick="window.App.sendChatMessage()">Send</button>
                    </div>
                </div>
            </div>
        `}joinSyncRoom(e,t){document.getElementById("rooms-grid").classList.add("hidden"),document.getElementById("active-chat-container").classList.remove("hidden"),document.getElementById("active-room-name").innerText=t,this.activeRoomId=e,this.chatChannel=new BroadcastChannel(`vibehub_chat_${e}`),this.chatChannel.onmessage=i=>{this.appendChatMessage(i.data)}}leaveSyncRoom(){document.getElementById("rooms-grid").classList.remove("hidden"),document.getElementById("active-chat-container").classList.add("hidden"),this.chatChannel&&this.chatChannel.close()}sendChatMessage(){const e=document.getElementById("chat-message-input"),t={text:e.value,user:n.user.username,time:new Date().toLocaleTimeString()};this.chatChannel.postMessage(t),this.appendChatMessage(t),e.value=""}appendChatMessage(e){const t=document.getElementById("chat-messages");t.innerHTML+=`<div style="margin-bottom:10px;"><strong>${e.user}:</strong> ${e.text} <span class="text-dim" style="font-size:0.7rem;">${e.time}</span></div>`,t.scrollTop=t.scrollHeight}getProfileHTML(e){return e?`
            <div class="profile-container">
                <div class="profile-banner">
                    <img src="${e.bannerImage||"https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200"}" alt="Banner">
                </div>
                <div class="profile-content">
                    <div class="profile-header">
                        <img src="${e.profilePhoto}" class="profile-avatar" alt="${e.displayName}">
                        <div class="profile-info">
                            <h1 class="view-title">${e.displayName}</h1>
                            <p class="handle">@${e.username}</p>
                            <p class="bio">${e.bio}</p>
                            <div class="profile-badges">
                                ${this.generateBadges(e)}
                            </div>
                        </div>
                    </div>
                    <div class="profile-stats glass-panel">
                        <div class="stat-item"><span class="stat-value">${e.followersCount.toLocaleString()}</span><span class="stat-label">Followers</span></div>
                        <div class="stat-item"><span class="stat-value">${e.followingCount.toLocaleString()}</span><span class="stat-label">Following</span></div>
                        <div class="stat-item"><span class="stat-value">${e.postCount.toLocaleString()}</span><span class="stat-label">Posts</span></div>
                        <div class="stat-item"><span class="stat-value">98%</span><span class="stat-label">Vibe Match</span></div>
                    </div>
                    
                    <div class="top-vibes-section">
                        <h3 class="section-title">Top 8 Vibes</h3>
                        <div class="top-vibes-grid">
                            ${Array(8).fill(0).map((t,i)=>`<div class="vibe-img-card"><img src="https://picsum.photos/250?random=${i}" loading="lazy"></div>`).join("")}
                        </div>
                    </div>

                    <div class="profile-tabs tabs">
                        <button class="tab active" style="flex:1;">Posts</button>
                        <button class="tab" style="flex:1;">Videos</button>
                        <button class="tab" style="flex:1;">Saved</button>
                        <button class="tab" style="flex:1;">Market</button>
                    </div>
                </div>
            </div>
        `:`
            <div class="auth-required glass-panel" style="padding:40px; text-align:center;">
                <h2>Identify Your Vibe</h2>
                <p>Login to view your link state.</p>
                <button class="btn-primary" onclick="window.App.navigate('login')" style="margin-top:20px;">Login / Register</button>
            </div>
        `}generateBadges(e){const t=[];return e.reactionScore>5e3&&t.push({label:"Heat Magnet",class:"badge-heat"}),e.postCount>20&&t.push({label:"Truth Detector",class:"badge-truth"}),e.followersCount>1e3&&t.push({label:"Admired Creator",class:"badge-admired"}),t.map(i=>`<span class="user-badge ${i.class}">${i.label}</span>`).join(" ")}getAuthHTML(e){const t=e==="login";return`
            <div class="login-content glass-panel" style="border: 2px solid rgba(157, 80, 187, 0.3); box-shadow: 0 0 50px rgba(157, 80, 187, 0.2);">
                <div class="login-header">
                    <div class="login-logo">
                        <div class="login-logo-glow"></div>
                        <img src="https://i.ibb.co/Fqnj3JKp/1000001392.png" alt="Vibehub Logo">
                    </div>
                    <h1 class="login-title">${t?"Login":"Join"} Vibehub</h1>
                    <p class="login-subtitle">${t?"Link your mind":"Begin your journey"}</p>
                </div>

                <div class="login-form">
                    <div class="login-toggle">
                        <input type="checkbox" id="admin-toggle">
                        <label for="admin-toggle">I am an Admin</label>
                    </div>

                    <input type="email" id="login-email" class="login-input" placeholder="Email Address" required>
                    ${t?"":'<input type="text" id="register-username" class="login-input" placeholder="Choose Username" required>'}
                    <input type="password" id="login-password" class="login-input" placeholder="Password" required>
                    <button class="login-submit" onclick="window.App.handleLogin('${e}')">${t?"✨ Enter The Pulse":"🚀 Create My Identity"}</button>

                    <div class="login-footer">
                        <a href="#" onclick="window.App.navigate('${t?"register":"login"}')">${t?"Need an account? Register":"Already linked? Login"}</a>
                    </div>
                </div>
            </div>
        `}async handleLogin(e="login"){const t=document.getElementById("login-email").value,i=document.getElementById("login-password").value,s=document.getElementById("admin-toggle").checked;if(!t||!i){this.showToast("Please fill in all fields");return}const a=await this.services.auth.login(t,i,s);n.user=a,a.isSuperAdmin?this.showToast("Welcome, Admin! 🎉"):this.showToast("Welcome to the Pulse! ✨");const o=document.getElementById("login-screen");o&&(o.style.opacity="0",setTimeout(()=>{o.style.visibility="hidden"},800)),this.navigate("home")}getCommunitiesHTML(e){return`
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h1 class="view-title">Communities</h1>
                    <p class="text-dim">Find your tribe. Link your mind.</p>
                </div>
                <button class="btn-primary" onclick="window.App.showToast('Create Community coming soon!')">+ New Group</button>
            </div>
            
            <div class="communities-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-top:20px;">
                ${e.map(t=>`
                    <div class="community-card glass-panel" style="overflow:hidden; cursor:pointer;" onclick="window.App.viewCommunity('${t.id}', '${t.name}')">
                        <img src="${t.banner}" style="width:100%; height:120px; object-fit:cover;" alt="Banner">
                        <div style="padding:15px;">
                            <h3 style="font-family:var(--font-display); font-size:1.3rem;">${t.name}</h3>
                            <p class="text-dim" style="font-size:0.9rem; margin-top:5px; margin-bottom:15px;">${t.desc}</p>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span class="badge-admired user-badge" style="margin:0;">${t.members} Members</span>
                                <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); window.App.showToast('Joined ${t.name}!')">Join</button>
                            </div>
                        </div>
                    </div>
                `).join("")}
            </div>
        `}async viewCommunity(e,t){n.currentView="home",document.querySelectorAll(".nav-link").forEach(a=>{a.classList.toggle("active",a.dataset.view==="home")});const i=await this.services.data.getPosts("all",e),s=document.getElementById("view-container");s&&(s.innerHTML=`
            <div class="view-header animate-fade">
                <button class="btn-secondary" style="margin-bottom:15px;" onclick="window.App.navigate('communities')">← Back to Communities</button>
                <h1 class="view-title">${t}</h1>
                <p class="text-dim" style="margin-top:8px;">Viewing community feed.</p>
            </div>
            <div id="post-feed">
                ${i.length>0?i.map(a=>Components.post(a)).join(""):'<p class="text-dim" style="padding:20px;">No vibes in this community yet.</p>'}
            </div>
        `,this.attachViewEvents())}getMessagesHTML(e){return`
            <div class="view-header"><h1 class="view-title">Messages</h1></div>
            <div class="messages-list">
                ${e.map(t=>`
                    <div class="dm-card glass-panel" style="padding:15px; margin-bottom:10px; display:flex; align-items:center; gap:15px; cursor:pointer;">
                        <img src="https://i.pravatar.cc/100?u=${t.id}" class="user-avatar" style="width:50px; height:50px;">
                        <div style="flex:1;">
                            <div style="display:flex;">
                                <strong>${t.user}</strong>
                                <span class="text-dim" style="font-size:0.8rem; margin-left:auto;">${t.time}</span>
                            </div>
                            <p class="${t.unread?"text-main":"text-dim"}" style="font-size:0.9rem;">${t.lastMsg}</p>
                        </div>
                        ${t.unread?'<div style="width:8px; height:8px; border-radius:50%; background:var(--primary-orange);"></div>':""}
                    </div>
                `).join("")}
            </div>
        `}getNotificationsHTML(){return`
            <div class="view-header"><h1 class="view-title">Alerts</h1></div>
            <div class="notif-list">
                ${[{id:1,type:"reaction",text:"<strong>Cyber Soul</strong> reacted 🔥 to your post",time:"5m ago"},{id:2,type:"follow",text:"<strong>Future Ghost</strong> started following you",time:"1h ago"}].map(t=>`
                    <div class="notif-card glass-panel" style="padding:15px; margin-bottom:10px; display:flex; align-items:center; gap:15px;">
                        <span style="font-size:1.5rem;">${t.type==="reaction"?"⚡":"👤"}</span>
                        <div style="flex:1;">
                            <p>${t.text}</p>
                            <span class="text-dim" style="font-size:0.8rem;">${t.time}</span>
                        </div>
                    </div>
                `).join("")}
            </div>
        `}getSearchHTML(){return`
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
                    ${[1,2,3].map(e=>`
                        <div class="glass-panel" style="padding:15px; margin-bottom:10px; display:flex; align-items:center; gap:15px;">
                            <img src="https://i.pravatar.cc/100?u=s${e}" class="user-avatar" style="width:50px; height:50px;">
                            <div>
                                <strong>Mind ${e}</strong>
                                <p class="text-dim" style="font-size:0.8rem;">Vibe Match: <span style="color:var(--primary-orange); font-weight:700;">${90+e}%</span></p>
                            </div>
                            <button class="btn-primary btn-sm" style="margin-left:auto;">Link</button>
                        </div>
                    `).join("")}
                </div>
            </div>
        `}getSettingsHTML(){return`
            <div class="view-header"><h1 class="view-title">Settings</h1></div>
            <div class="settings-grid" style="display:flex; flex-direction:column; gap:20px;">
                <div class="glass-panel" style="padding:20px;">
                    <h3>Support Vibehub Development</h3>
                    <p class="text-dim" style="margin-top:5px;">Help us link more minds. Secure via Square.</p>
                    <button class="btn-primary" style="margin-top:15px;" onclick="window.App.handleDonation()">Donate to Vibe Evolution</button>
                </div>
                <div class="glass-panel" style="padding:20px;">
                    <h3>Account Security</h3>
                    <button class="btn-secondary" style="margin-top:10px; width:100%;">Update Passlink</button>
                </div>
                <button class="btn-secondary" style="color:var(--accent-pink); border-color:var(--accent-pink);" onclick="window.App.services.auth.logout()">Disconnect Session</button>
            </div>
        `}async goLive(){const e=await navigator.mediaDevices.getUserMedia({video:!0,audio:!0}),t=document.createElement("video");t.srcObject=e,t.autoplay=!0,t.muted=!0,t.className="vibe-video-card",document.getElementById("view-container").appendChild(t),this.showToast("You are live!")}getAdminHTML(e){return`
            <div class="view-header">
                <h1 class="view-title">Admin Dashboard</h1>
            </div>
            <div class="tabs">
                <button class="tab active" onclick="this.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); this.classList.add('active'); document.getElementById('admin-stats').classList.remove('hidden'); document.getElementById('admin-manage').classList.add('hidden');">Dashboard</button>
                <button class="tab" onclick="this.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); this.classList.add('active'); document.getElementById('admin-stats').classList.add('hidden'); document.getElementById('admin-manage').classList.remove('hidden');">Moderation</button>
            </div>

            <div id="admin-stats" class="admin-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
                <div class="stat-card glass-panel" style="padding: 24px;">
                    <h3 class="text-dim">Total Users</h3>
                    <p style="font-size: 2.5rem; font-weight:800; color: var(--primary-purple);">${e.users}</p>
                </div>
                <div class="stat-card glass-panel" style="padding: 24px;">
                    <h3 class="text-dim">Active Now</h3>
                    <p style="font-size: 2.5rem; font-weight:800; color: var(--primary-orange);">${e.activeNow}</p>
                </div>
                <div class="stat-card glass-panel" style="padding: 24px;">
                    <h3 class="text-dim">Posts Today</h3>
                    <p style="font-size: 2.5rem; font-weight:800; color: var(--accent-cyan);">${e.postsToday}</p>
                </div>
                <div class="stat-card glass-panel" style="padding: 24px;">
                    <h3 class="text-dim">Revenue</h3>
                    <p style="font-size: 2.5rem; font-weight:800; color: var(--accent-gold);">${e.revenue}</p>
                </div>
            </div>

            <div id="admin-manage" class="hidden glass-panel" style="padding:24px;">
                <h3>Moderation</h3>
                <div style="margin-top:20px; display:flex; flex-direction:column; gap:10px;">
                    <button class="btn-secondary" onclick="window.App.showToast('Moderation Tool Active: Delete Posts/Users')">Manage Users & Posts</button>
                </div>
            </div>
        `}showToast(e){const t=document.createElement("div");t.className="glass-panel animate-fade",t.style.cssText="position:fixed; bottom:20px; right:20px; padding:15px 25px; border-color:var(--primary-orange); z-index:2000;",t.innerText=e,document.body.appendChild(t),setTimeout(()=>t.remove(),3e3)}}document.addEventListener("DOMContentLoaded",()=>{window.App=new g});
