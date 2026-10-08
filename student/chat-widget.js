// ============================================================
// CHAT WIDGET - WITH PROFILE VIEW INTEGRATED (FIXED)
// ============================================================
(function() {
    console.log('💬 Chat Widget loading...');

    if (document.getElementById('chatWidgetScript')) {
        console.log('⚠️ Chat already loaded');
        return;
    }
    var scriptTag = document.createElement('script');
    scriptTag.id = 'chatWidgetScript';
    document.head.appendChild(scriptTag);

    // ============================================================
    // CONFIGURATION
    // ============================================================
    var CONFIG = {
        GLOBAL_CHAT: 'chat_messages',
        PRIVATE_MESSAGES: 'chat_private_messages',
        CHAT_ROOMS: 'chat_rooms',
        STATUS_COLLECTION: 'chat_status',
        MESSAGE_LIMIT: 100,
        TYPING_TIMEOUT: 3000,
        MESSAGE_RETENTION_DAYS: 7
    };

    // ============================================================
    // STATE
    // ============================================================
    var state = {
        isOpen: false,
        currentUser: null,
        userData: null,
        messages: [],
        listeners: [],
        typingTimer: null,
        isTyping: false,
        isInitialized: false,
        selectedUser: null,
        activeTab: 'global',
        privateChats: [],
        privateMessages: {},
        privateListeners: [],
        privateChat: {
            isActive: false,
            roomId: null,
            otherUser: null,
            messages: [],
            listener: null,
            statusListener: null
        },
        soundEnabled: true
    };

    // ============================================================
    // SOUND EFFECTS
    // ============================================================
    var chatSounds = {
        _ctx: null,
        _enabled: true,

        _getContext: function() {
            if (!this._ctx) {
                try {
                    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
                } catch(e) {
                    console.warn('Audio not supported');
                    this._enabled = false;
                }
            }
            return this._ctx;
        },

        notification: function() {
            if (!this._enabled) return;
            try {
                var ctx = this._getContext();
                if (!ctx) return;
                var oscillator = ctx.createOscillator();
                var gain = ctx.createGain();

                oscillator.connect(gain);
                gain.connect(ctx.destination);

                oscillator.frequency.value = 880;
                oscillator.type = 'sine';

                gain.gain.setValueAtTime(0.12, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.25);

                setTimeout(function() {
                    try {
                        if (!ctx) return;
                        var osc2 = ctx.createOscillator();
                        var gain2 = ctx.createGain();
                        osc2.connect(gain2);
                        gain2.connect(ctx.destination);
                        osc2.frequency.value = 660;
                        osc2.type = 'sine';
                        gain2.gain.setValueAtTime(0.08, ctx.currentTime);
                        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                        osc2.start(ctx.currentTime);
                        osc2.stop(ctx.currentTime + 0.2);
                    } catch(e) {}
                }, 120);

            } catch(e) {
                // Silent fail
            }
        },

        sent: function() {
            if (!this._enabled) return;
            try {
                var ctx = this._getContext();
                if (!ctx) return;
                var oscillator = ctx.createOscillator();
                var gain = ctx.createGain();

                oscillator.connect(gain);
                gain.connect(ctx.destination);

                oscillator.frequency.value = 600;
                oscillator.type = 'sine';

                gain.gain.setValueAtTime(0.06, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.08);
            } catch(e) {}
        }
    };

    // ============================================================
    // CREATE CHAT HTML
    // ============================================================
    var chatHTML = `
    <div id="chatWidgetContainer" style="position:fixed;bottom:20px;right:20px;z-index:999999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <!-- Toggle Button -->
        <button id="chatToggleBtn" style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);border:none;color:#fff;font-size:28px;cursor:pointer;box-shadow:0 8px 30px rgba(102,126,234,0.4);display:flex;align-items:center;justify-content:center;position:relative;transition:transform 0.2s;">
            💬
            <span id="chatBadge" style="position:absolute;top:-4px;right:-4px;background:#ef5350;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;min-width:22px;text-align:center;display:none;">0</span>
        </button>

        <!-- Chat Window -->
        <div id="chatWindow" style="position:absolute;bottom:75px;right:0;width:380px;height:520px;background:#1a1a3e;border-radius:16px;border:1px solid rgba(255,255,255,0.08);box-shadow:0 20px 60px rgba(0,0,0,0.6);display:none;flex-direction:column;overflow:hidden;animation:chatSlideUp 0.3s ease;">
            <style>
                @keyframes chatSlideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
                @keyframes chatPulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.1); } }
                @keyframes chatSlideIn { from { opacity:0; transform:translateX(-15px) scale(0.95); } to { opacity:1; transform:translateX(0) scale(1); } }
                @keyframes chatSlideInOwn { from { opacity:0; transform:translateX(15px) scale(0.95); } to { opacity:1; transform:translateX(0) scale(1); } }
                @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
                @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }

                #chatMessages::-webkit-scrollbar { width:4px; }
                #chatMessages::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:2px; }
                #chatMessages { scroll-behavior: smooth; }

                .chat-msg {
                    display:flex;
                    gap:10px;
                    margin-bottom:10px;
                    animation: chatSlideIn 0.3s ease forwards;
                    opacity:0;
                    transform:translateX(-10px);
                }
                .chat-msg.own {
                    animation: chatSlideInOwn 0.3s ease forwards;
                    transform:translateX(10px);
                }
                .chat-msg.chat-msg-new {
                    animation: chatSlideIn 0.3s ease forwards;
                }
                .chat-msg.own.chat-msg-new {
                    animation: chatSlideInOwn 0.3s ease forwards;
                }
                .chat-msg:hover {
                    background:rgba(255,255,255,0.02);
                    border-radius:8px;
                    transition:background 0.2s ease;
                }

                .chat-msg .chat-avatar { width:34px; height:34px; border-radius:50%; flex-shrink:0; overflow:hidden; background:rgba(255,255,255,0.05); border:2px solid rgba(255,255,255,0.06); cursor:pointer; transition:transform 0.2s; }
                .chat-msg .chat-avatar:hover { transform:scale(1.08); }
                .chat-msg .chat-avatar img { width:100%; height:100%; object-fit:cover; }

                .chat-msg .chat-body { flex:1; min-width:0; max-width:calc(100% - 42px); }
                .chat-msg .chat-body .chat-header { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
                .chat-msg .chat-body .chat-header .chat-name { font-size:13px; font-weight:600; color:#667eea; cursor:pointer; }
                .chat-msg .chat-body .chat-header .chat-name:hover { text-decoration:underline; }
                .chat-msg .chat-body .chat-header .chat-time { font-size:10px; color:rgba(255,255,255,0.25); }
                .chat-msg .chat-body .chat-text { color:rgba(255,255,255,0.85); font-size:14px; word-wrap:break-word; overflow-wrap:break-word; word-break:break-word; margin-top:2px; line-height:1.4; max-width:100%; }
                .chat-msg.own .chat-body .chat-header .chat-name { color:#ffa726; }

                .chat-typing { display:none; padding:4px 16px 8px; font-size:13px; color:rgba(255,255,255,0.3); }
                .chat-typing.show { display:block; }
                .chat-typing .chat-dots span { display:inline-block; width:6px; height:6px; border-radius:50%; background:rgba(255,255,255,0.3); margin:0 1px; animation:chatDot 1.4s infinite; }
                .chat-typing .chat-dots span:nth-child(2) { animation-delay:0.2s; }
                .chat-typing .chat-dots span:nth-child(3) { animation-delay:0.4s; }
                @keyframes chatDot { 0%,60%,100% { transform:translateY(0); opacity:0.3; } 30% { transform:translateY(-6px); opacity:1; } }

                .chat-empty { text-align:center; color:rgba(255,255,255,0.2); padding:40px 20px; }
                .chat-empty .chat-icon { font-size:48px; display:block; margin-bottom:12px; opacity:0.4; }

                .chat-login { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:rgba(255,255,255,0.3); text-align:center; padding:30px; }
                .chat-login .chat-icon { font-size:40px; margin-bottom:12px; opacity:0.4; }
                .chat-login a { color:#667eea; text-decoration:none; margin-top:8px; font-weight:500; }

                /* ===== USER MENU ===== */
                .chat-user-menu { display:none; position:fixed; background:#2a1a4e; border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:6px 0; min-width:180px; box-shadow:0 20px 60px rgba(0,0,0,0.6); z-index:1000000; animation:chatSlideUp 0.2s ease; }
                .chat-user-menu.show { display:block; }
                .chat-user-menu .menu-item { padding:10px 18px; color:rgba(255,255,255,0.8); cursor:pointer; font-size:13px; transition:background 0.2s; display:flex; align-items:center; gap:10px; border:none; background:none; width:100%; text-align:left; font-family:inherit; }
                .chat-user-menu .menu-item:hover { background:rgba(255,255,255,0.06); }
                .chat-user-menu .menu-item .icon { font-size:16px; }
                .chat-user-menu .menu-divider { height:1px; background:rgba(255,255,255,0.06); margin:4px 12px; }
                .chat-user-menu .menu-user-info { padding:8px 18px 4px 18px; color:rgba(255,255,255,0.3); font-size:11px; border-bottom:1px solid rgba(255,255,255,0.06); margin-bottom:4px; }
                .chat-user-menu .menu-user-info strong { color:rgba(255,255,255,0.6); }

                /* ===== TABS ===== */
                .chat-tabs { display:flex; border-bottom:1px solid rgba(255,255,255,0.06); flex-shrink:0; background:rgba(0,0,0,0.2); }
                .chat-tab { padding:10px 18px; color:rgba(255,255,255,0.4); cursor:pointer; font-size:13px; font-weight:500; transition:all 0.3s; border-bottom:2px solid transparent; }
                .chat-tab:hover { color:rgba(255,255,255,0.7); }
                .chat-tab.active { color:#667eea; border-bottom-color:#667eea; }
                .chat-tab .tab-badge { background:#ef5350; color:#fff; font-size:10px; padding:1px 7px; border-radius:10px; margin-left:6px; display:none; }
                .chat-tab .tab-badge.show { display:inline-block; }

                /* ===== PRIVATE CHAT HEADER ===== */
                .private-chat-header { display:none; padding:10px 14px; background:rgba(102,126,234,0.12); border-bottom:1px solid rgba(255,255,255,0.06); align-items:center; gap:10px; flex-shrink:0; }
                .private-chat-header.show { display:flex; }
                .private-chat-header .pc-back { background:none; border:none; color:rgba(255,255,255,0.4); font-size:18px; cursor:pointer; padding:0 6px; }
                .private-chat-header .pc-back:hover { color:rgba(255,255,255,0.8); }
                .private-chat-header .pc-avatar { width:34px; height:34px; border-radius:50%; overflow:hidden; flex-shrink:0; background:rgba(255,255,255,0.05); border:2px solid rgba(255,255,255,0.06); }
                .private-chat-header .pc-avatar img { width:100%; height:100%; object-fit:cover; }
                .private-chat-header .pc-info { flex:1; min-width:0; }
                .private-chat-header .pc-info .pc-name { color:#fff; font-size:14px; font-weight:600; }
                .private-chat-header .pc-info .pc-status { font-size:11px; color:rgba(255,255,255,0.3); }

                .private-chat-list { display:none; flex-direction:column; overflow-y:auto; padding:6px 10px; }
                .private-chat-list.show { display:flex; }
                .private-chat-item { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:10px; cursor:pointer; transition:background 0.2s; }
                .private-chat-item:hover { background:rgba(255,255,255,0.05); }
                .private-chat-item .pc-avatar { width:40px; height:40px; border-radius:50%; overflow:hidden; flex-shrink:0; background:rgba(255,255,255,0.05); }
                .private-chat-item .pc-avatar img { width:100%; height:100%; object-fit:cover; }
                .private-chat-item .pc-info { flex:1; min-width:0; }
                .private-chat-item .pc-info .pc-name { color:#fff; font-size:14px; font-weight:500; }
                .private-chat-item .pc-info .pc-last { color:rgba(255,255,255,0.3); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                .private-chat-item .pc-time { color:rgba(255,255,255,0.2); font-size:10px; flex-shrink:0; }
                .private-chat-empty { text-align:center; color:rgba(255,255,255,0.2); padding:40px 20px; font-size:14px; }
                .private-chat-empty .icon { font-size:32px; display:block; margin-bottom:8px; opacity:0.4; }

                /* ===== PROFILE MODAL ===== */
                .profile-modal-overlay {
                    display:none;
                    position:fixed;
                    top:0; left:0;
                    width:100%; height:100%;
                    background:rgba(0,0,0,0.7);
                    backdrop-filter:blur(8px);
                    z-index:9999999;
                    align-items:center;
                    justify-content:center;
                    animation:fadeIn 0.3s ease;
                }
                .profile-modal-overlay.show { display:flex; }

                .profile-modal {
                    background:#1a1a3e;
                    border:1px solid rgba(255,255,255,0.08);
                    border-radius:20px;
                    max-width:420px;
                    width:90%;
                    max-height:90vh;
                    overflow-y:auto;
                    padding:2rem;
                    box-shadow:0 30px 80px rgba(0,0,0,0.8);
                    animation:slideUp 0.3s ease;
                    position:relative;
                }
                .profile-modal::-webkit-scrollbar { width:4px; }
                .profile-modal::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:2px; }

                .profile-modal .close-profile {
                    position:absolute;
                    top:12px; right:16px;
                    background:none;
                    border:none;
                    color:rgba(255,255,255,0.3);
                    font-size:24px;
                    cursor:pointer;
                    transition:color 0.3s;
                }
                .profile-modal .close-profile:hover { color:rgba(255,255,255,0.8); }

                .profile-modal .profile-header { text-align:center; margin-bottom:1rem; }
                .profile-modal .profile-header .p-avatar { width:90px; height:90px; border-radius:50%; overflow:hidden; margin:0 auto 12px; border:3px solid rgba(102,126,234,0.3); background:rgba(255,255,255,0.05); }
                .profile-modal .profile-header .p-avatar img { width:100%; height:100%; object-fit:cover; }
                .profile-modal .profile-header .p-name { font-size:1.4rem; font-weight:600; color:#fff; }
                .profile-modal .profile-header .p-class { font-size:0.85rem; color:rgba(255,255,255,0.4); margin-top:2px; }
                .profile-modal .profile-header .p-status { font-size:0.75rem; margin-top:4px; }
                .profile-modal .profile-header .p-status.online { color:#66bb6a; }
                .profile-modal .profile-header .p-status.offline { color:rgba(255,255,255,0.3); }

                .profile-modal .p-title {
                    display:inline-block;
                    background:rgba(255,215,0,0.12);
                    border:1px solid rgba(255,215,0,0.15);
                    color:#ffd700;
                    padding:4px 16px;
                    border-radius:20px;
                    font-size:0.75rem;
                    font-weight:600;
                    margin:6px 0 12px;
                }

                .profile-modal .p-bio {
                    color:rgba(255,255,255,0.6);
                    font-size:0.9rem;
                    text-align:center;
                    padding:8px 12px;
                    background:rgba(255,255,255,0.03);
                    border-radius:10px;
                    margin-bottom:1rem;
                    border-left:3px solid #667eea;
                }
                .profile-modal .p-bio.empty { color:rgba(255,255,255,0.2); font-style:italic; }

                .profile-modal .p-stats {
                    display:grid;
                    grid-template-columns:repeat(4,1fr);
                    gap:6px;
                    margin-bottom:1rem;
                }
                .profile-modal .p-stats .stat { text-align:center; background:rgba(255,255,255,0.03); border-radius:10px; padding:8px 4px; }
                .profile-modal .p-stats .stat .num { font-size:1.2rem; font-weight:700; color:#fff; }
                .profile-modal .p-stats .stat .lbl { font-size:0.55rem; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.5px; }
                .profile-modal .p-stats .stat.purple .num { color:#667eea; }
                .profile-modal .p-stats .stat.gold .num { color:#ffd700; }
                .profile-modal .p-stats .stat.green .num { color:#66bb6a; }
                .profile-modal .p-stats .stat.orange .num { color:#ffa726; }

                .profile-modal .p-achievements { margin-bottom:1rem; }
                .profile-modal .p-achievements .ach-title { font-size:0.7rem; text-transform:uppercase; letter-spacing:1px; color:rgba(255,255,255,0.3); margin-bottom:6px; }
                .profile-modal .p-achievements .ach-list { display:flex; flex-wrap:wrap; gap:4px; }
                .profile-modal .p-achievements .ach-list .ach-item { font-size:1.3rem; opacity:0.3; transition:all 0.3s; }
                .profile-modal .p-achievements .ach-list .ach-item.unlocked { opacity:1; }
                .profile-modal .p-achievements .ach-list .ach-item:hover { transform:scale(1.3); }
                .profile-modal .p-achievements .ach-count { font-size:0.65rem; color:rgba(255,255,255,0.2); margin-top:4px; }

                .profile-modal .p-social { display:flex; gap:12px; justify-content:center; margin-bottom:1rem; flex-wrap:wrap; }
                .profile-modal .p-social a { color:rgba(255,255,255,0.3); text-decoration:none; font-size:0.8rem; transition:color 0.3s; display:flex; align-items:center; gap:4px; }
                .profile-modal .p-social a:hover { color:rgba(255,255,255,0.8); }
                .profile-modal .p-social .no-social { color:rgba(255,255,255,0.15); font-size:0.75rem; }

                .profile-modal .p-actions { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:6px; }
                .profile-modal .p-actions button { padding:10px 24px; border-radius:10px; border:none; font-size:0.9rem; font-weight:500; cursor:pointer; transition:all 0.3s; }
                .profile-modal .p-actions .btn-chat { background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; }
                .profile-modal .p-actions .btn-chat:hover { transform:scale(1.05); box-shadow:0 8px 30px rgba(102,126,234,0.3); }
                .profile-modal .p-actions .btn-close { background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.6); border:1px solid rgba(255,255,255,0.08); }
                .profile-modal .p-actions .btn-close:hover { background:rgba(255,255,255,0.1); }

            


                
            </style>

            <!-- Header -->
            <div style="padding:14px 18px;background:rgba(102,126,234,0.1);border-bottom:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                <span style="color:#fff;font-size:16px;font-weight:600;">
                    <span id="chatTitle">💬 Student Chat</span>
                    <span style="font-size:12px;font-weight:400;color:rgba(255,255,255,0.4);margin-left:8px;">
                        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#66bb6a;margin-right:4px;animation:chatPulse 2s infinite;"></span>
                        <span id="chatOnlineCount">0</span> online
                    </span>
                </span>
                <button id="chatCloseBtn" style="background:none;border:none;color:rgba(255,255,255,0.4);font-size:20px;cursor:pointer;padding:0 4px;">✕</button>
            </div>

            <!-- Tabs -->
            <div class="chat-tabs" id="chatTabs">
                <div class="chat-tab active" data-tab="global" id="tabGlobal">🌍 Global <span class="tab-badge" id="globalBadge">0</span></div>
                <div class="chat-tab" data-tab="personal" id="tabPersonal">🔒 Personal <span class="tab-badge" id="personalBadge">0</span></div>
            </div>

            <!-- Private Chat Header -->
            <div class="private-chat-header" id="privateChatHeader">
                <button class="pc-back" id="pcBackBtn">←</button>
                <div class="pc-avatar"><img id="pcAvatar" src="" alt=""></div>
                <div class="pc-info">
                    <div class="pc-name" id="pcName">User</div>
                    <div class="pc-status" id="pcStatus">offline</div>
                </div>
            </div>

            <!-- Messages -->
            <div id="chatMessages" style="flex:1;overflow-y:auto;overflow-x:hidden;padding:12px 16px;background:rgba(0,0,0,0.15);display:flex;flex-direction:column;gap:8px;">
                <div id="chatEmpty" class="chat-empty">
                    <span class="chat-icon">💬</span>
                    <p>No messages yet.<br>Start the conversation!</p>
                </div>
            </div>

            <!-- Private Chat List -->
            <div class="private-chat-list" id="privateChatList">
                <div class="private-chat-empty">
                    <span class="icon">💬</span>
                    <p>No personal chats yet.<br>Start one from the global chat!</p>
                </div>
            </div>

            <!-- Typing -->
            <div class="chat-typing" id="chatTyping">
                <span id="chatTypingText">Someone</span> is typing
                <span class="chat-dots"><span></span><span></span><span></span></span>
            </div>

            <!-- Input -->
            <div style="padding:10px 14px;border-top:1px solid rgba(255,255,255,0.06);display:flex;gap:10px;flex-shrink:0;background:rgba(0,0,0,0.2);">
                <input id="chatInput" type="text" placeholder="Type a message..." style="flex:1;padding:10px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#fff;font-size:14px;outline:none;font-family:inherit;">
                <button id="chatSendBtn" style="padding:10px 18px;background:linear-gradient(135deg,#667eea,#764ba2);border:none;border-radius:10px;color:#fff;font-size:14px;cursor:pointer;font-weight:500;transition:transform 0.2s;">Send</button>
            </div>
        </div>
    </div>

    <!-- User Menu Popup -->
    <div class="chat-user-menu" id="chatUserMenu">
        <div class="menu-user-info">👤 <strong id="menuUserName">User</strong></div>
        <button class="menu-item" id="menuViewProfile"><span class="icon">👤</span> View Profile</button>
        <div class="menu-divider"></div>
        <button class="menu-item" id="menuPrivateChat"><span class="icon">💬</span> Start Personal Chat</button>
    </div>

    <!-- Profile Modal -->
    <div class="profile-modal-overlay" id="profileModal">
        <div class="profile-modal">
            <button class="close-profile" id="closeProfileBtn">✕</button>
            <div id="profileContent">
                <div style="text-align:center;padding:2rem;color:rgba(255,255,255,0.3);">
                    <div class="loading-spinner" style="display:inline-block;width:30px;height:30px;border:3px solid rgba(255,255,255,0.1);border-radius:50%;border-top-color:#667eea;animation:spin 0.8s ease-in-out infinite;"></div>
                    <p style="margin-top:1rem;">Loading profile...</p>
                </div>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatHTML);
    console.log('✅ Chat HTML injected');

    // ============================================================
    // GET ELEMENTS
    // ============================================================
    var toggleBtn = document.getElementById('chatToggleBtn');
    var closeBtn = document.getElementById('chatCloseBtn');
    var chatWindow = document.getElementById('chatWindow');
    var chatInput = document.getElementById('chatInput');
    var chatSend = document.getElementById('chatSendBtn');
    var chatMessages = document.getElementById('chatMessages');
    var chatEmpty = document.getElementById('chatEmpty');
    var chatBadge = document.getElementById('chatBadge');
    var chatOnlineCount = document.getElementById('chatOnlineCount');
    var chatTyping = document.getElementById('chatTyping');
    var chatTypingText = document.getElementById('chatTypingText');
    var chatTitle = document.getElementById('chatTitle');

    // Tab elements
    var tabGlobal = document.getElementById('tabGlobal');
    var tabPersonal = document.getElementById('tabPersonal');
    var globalBadge = document.getElementById('globalBadge');
    var personalBadge = document.getElementById('personalBadge');
    var privateChatList = document.getElementById('privateChatList');

    // Private Chat Elements
    var privateChatHeader = document.getElementById('privateChatHeader');
    var pcBackBtn = document.getElementById('pcBackBtn');
    var pcAvatar = document.getElementById('pcAvatar');
    var pcName = document.getElementById('pcName');
    var pcStatus = document.getElementById('pcStatus');

    // User Menu Elements
    var chatUserMenu = document.getElementById('chatUserMenu');
    var menuViewProfile = document.getElementById('menuViewProfile');
    var menuPrivateChat = document.getElementById('menuPrivateChat');
    var menuUserName = document.getElementById('menuUserName');

    // Profile Modal Elements
    var profileModal = document.getElementById('profileModal');
    var profileContent = document.getElementById('profileContent');
    var closeProfileBtn = document.getElementById('closeProfileBtn');

    if (!toggleBtn) {
        console.error('❌ Chat elements not found');
        return;
    }

    console.log('✅ Chat elements found');

    // ============================================================
    // CHECK FIREBASE
    // ============================================================
    if (typeof firebase === 'undefined' || !firebase.auth) {
        console.error('❌ Firebase not loaded!');
        chatMessages.innerHTML = `<div class="chat-login"><div class="chat-icon">🔌</div><p>Connecting to Firebase...</p></div>`;
        chatInput.disabled = true;
        chatSend.disabled = true;
        return;
    }

    console.log('✅ Firebase found');

    // ============================================================
    // AUTH STATE
    // ============================================================
    firebase.auth().onAuthStateChanged(function(user) {
        console.log('👤 Auth state:', user ? 'Logged in' : 'Not logged in');
        if (user) {
            state.currentUser = user;
            loadUserData(user);
        } else {
            state.currentUser = null;
            state.userData = null;
            chatInput.disabled = true;
            chatSend.disabled = true;
            chatMessages.innerHTML = `<div class="chat-login"><div class="chat-icon">🔒</div><p>Please login to chat</p><a href="login.html">Login →</a></div>`;
        }
    });

    // ============================================================
    // LOAD USER DATA
    // ============================================================
    async function loadUserData(user) {
        try {
            var doc = await firebase.firestore().collection('students').doc(user.uid).get();
            if (doc.exists) {
                state.userData = doc.data();
                state.userData.uid = user.uid;
                console.log('✅ User data loaded:', state.userData.name);

                chatInput.disabled = false;
                chatSend.disabled = false;

                startGlobalChat();
                loadPrivateChats();
                updateOnlineStatus(true);
                setInterval(function() { updateOnlineStatus(true); }, 60000);
                cleanupOldMessages();
                setupClickHandlers();
                setupTabHandlers();

            } else {
                console.warn('⚠️ No user data found');
                chatInput.disabled = true;
                chatSend.disabled = true;
            }
        } catch (e) {
            console.error('❌ Error loading user data:', e);
            chatInput.disabled = true;
            chatSend.disabled = true;
        }
    }

    // ============================================================
    // TAB HANDLERS
    // ============================================================
    function setupTabHandlers() {
        tabGlobal.addEventListener('click', function() {
            switchTab('global');
        });
        tabPersonal.addEventListener('click', function() {
            switchTab('personal');
        });
        console.log('✅ Tab handlers set up');
    }

    function switchTab(tab) {
        state.activeTab = tab;

        document.querySelectorAll('.chat-tab').forEach(function(el) {
            el.classList.remove('active');
        });

        if (tab === 'global') {
            tabGlobal.classList.add('active');
            chatMessages.style.display = 'flex';
            privateChatList.style.display = 'none';
            privateChatList.classList.remove('show');
            chatTyping.style.display = 'none';
            privateChatHeader.classList.remove('show');
            if (state.messages && state.messages.length > 0) {
                renderMessages(state.messages);
            } else {
                chatMessages.innerHTML = `<div class="chat-empty"><span class="chat-icon">💬</span><p>No messages yet.<br>Start the conversation!</p></div>`;
            }
            globalBadge.classList.remove('show');
            chatTitle.textContent = '💬 Student Chat';
        } else {
            tabPersonal.classList.add('active');
            chatMessages.style.display = 'none';
            privateChatList.style.display = 'flex';
            privateChatList.classList.add('show');
            chatTyping.style.display = 'none';
            privateChatHeader.classList.remove('show');
            renderPrivateChatList();
            personalBadge.classList.remove('show');
            chatTitle.textContent = '🔒 Personal Chats';
        }
    }

    // ============================================================
    // LOAD PRIVATE CHATS
    // ============================================================
    function loadPrivateChats() {
        if (state.privateListeners.length > 0) {
            state.privateListeners.forEach(function(unsub) { unsub(); });
            state.privateListeners = [];
        }

        if (!state.currentUser) return;

        console.log('🔒 Loading private chats...');

        var unsub = firebase.firestore()
            .collection(CONFIG.CHAT_ROOMS)
            .where('participants', 'array-contains', state.currentUser.uid)
            .onSnapshot(function(snapshot) {
                var rooms = [];
                snapshot.forEach(function(doc) {
                    var data = doc.data();
                    rooms.push({
                        id: doc.id,
                        participants: data.participants || [],
                        participantNames: data.participantNames || {},
                        lastMessage: data.lastMessage || '',
                        lastUpdated: data.lastUpdated?.toDate?.() || new Date()
                    });
                });

                rooms.sort(function(a, b) {
                    return b.lastUpdated - a.lastUpdated;
                });

                state.privateChats = rooms;
                renderPrivateChatList();
                updatePersonalBadge();
            }, function(error) {
                console.error('❌ Private chat listener error:', error);
            });

        state.privateListeners.push(unsub);
    }

    // ============================================================
    // RENDER PRIVATE CHAT LIST
    // ============================================================
    function renderPrivateChatList() {
        if (!privateChatList) return;

        if (state.privateChats.length === 0) {
            privateChatList.innerHTML = `
                <div class="private-chat-empty">
                    <span class="icon">💬</span>
                    <p>No personal chats yet.<br>Start one from the global chat!</p>
                </div>
            `;
            return;
        }

        var html = '';
        var currentUid = state.currentUser?.uid;

        for (var i = 0; i < state.privateChats.length; i++) {
            var room = state.privateChats[i];
            var otherUid = room.participants.find(function(uid) { return uid !== currentUid; });
            var otherName = otherUid ? room.participantNames[otherUid] || 'User' : 'Unknown';
            var avatarUrl = 'https://robohash.org/' + encodeURIComponent(otherName) + '?set=set1&size=64x64';
            var timeStr = formatTime(room.lastUpdated);
            var lastMsg = room.lastMessage || 'No messages yet';

            html += `
                <div class="private-chat-item" data-roomid="${room.id}" data-uid="${otherUid}" data-name="${otherName}">
                    <div class="pc-avatar">
                        <img src="${avatarUrl}" alt="${otherName}">
                    </div>
                    <div class="pc-info">
                        <div class="pc-name">${otherName}</div>
                        <div class="pc-last">${escapeHtml(lastMsg)}</div>
                    </div>
                    <div class="pc-time">${timeStr}</div>
                </div>
            `;
        }

        privateChatList.innerHTML = html;

        privateChatList.querySelectorAll('.private-chat-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var roomId = this.getAttribute('data-roomid');
                var uid = this.getAttribute('data-uid');
                var name = this.getAttribute('data-name');
                if (roomId && uid && name) {
                    openPrivateChat(roomId, uid, name);
                }
            });
        });
    }

    // ============================================================
    // UPDATE PERSONAL BADGE
    // ============================================================
    function updatePersonalBadge() {
        var count = state.privateChats.length;
        if (count > 0) {
            personalBadge.textContent = count;
            personalBadge.classList.add('show');
        } else {
            personalBadge.classList.remove('show');
        }
    }

    // ============================================================
    // OPEN PRIVATE CHAT FROM LIST
    // ============================================================
    function openPrivateChat(roomId, uid, name) {
        console.log('🔒 Opening private chat:', name);

        state.privateChat.isActive = true;
        state.privateChat.roomId = roomId;
        state.privateChat.otherUser = { uid: uid, name: name };

        privateChatHeader.classList.add('show');
        chatTitle.textContent = '🔒 ' + name;
        pcName.textContent = name;
        pcAvatar.src = 'https://robohash.org/' + encodeURIComponent(name) + '?set=set1&size=64x64';
        pcStatus.textContent = 'online';
        pcStatus.style.color = '#66bb6a';

        privateChatList.style.display = 'none';
        privateChatList.classList.remove('show');
        chatMessages.style.display = 'flex';

        chatMessages.innerHTML = `<div class="chat-empty"><span class="chat-icon">💬</span><p>Loading conversation with ${name}...</p></div>`;

        startPrivateChatListener(roomId);
        listenToUserStatus(uid);
    }

    // ============================================================
    // SETUP CLICK HANDLERS
    // ============================================================
    function setupClickHandlers() {
        console.log('🔧 Setting up click handlers...');

        chatMessages.addEventListener('click', function(e) {
            if (state.privateChat.isActive) return;

            var target = e.target;
            var nameElement = target.closest('.chat-name');
            if (nameElement) {
                var uid = nameElement.getAttribute('data-uid');
                var name = nameElement.getAttribute('data-name');
                if (uid && name && uid !== state.currentUser?.uid) {
                    console.log('👤 Username clicked:', name);
                    showUserMenu(e, uid, name);
                    return;
                }
            }

            var avatarElement = target.closest('.chat-avatar');
            if (avatarElement) {
                var uid = avatarElement.getAttribute('data-uid');
                var name = avatarElement.getAttribute('data-name');
                if (uid && name && uid !== state.currentUser?.uid) {
                    console.log('👤 Avatar clicked:', name);
                    showUserMenu(e, uid, name);
                    return;
                }
            }
        });

        console.log('✅ Click handlers set up');
    }

    // ============================================================
    // USER MENU
    // ============================================================
    function showUserMenu(event, uid, name) {
        event.stopPropagation();
        event.preventDefault();

        if (uid === state.currentUser?.uid) {
            console.log('⚠️ Cannot open menu for yourself');
            return;
        }

        console.log('👤 Opening menu for:', name, 'UID:', uid);

        state.selectedUser = { uid: uid, name: name };
        if (menuUserName) menuUserName.textContent = name || 'User';

        var x = event.clientX || event.pageX || 0;
        var y = event.clientY || event.pageY || 0;

        var menu = chatUserMenu;
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';

        setTimeout(function() {
            var rect = menu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                menu.style.left = (x - rect.width) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                menu.style.top = (y - rect.height) + 'px';
            }
        }, 10);

        menu.classList.add('show');
        console.log('✅ Menu opened for:', name);
    }

    function hideUserMenu() {
        if (chatUserMenu) chatUserMenu.classList.remove('show');
        state.selectedUser = null;
    }

    // ============================================================
    // PROFILE MODAL FUNCTIONS
    // ============================================================
    async function showProfile(uid, name) {
        console.log('👤 Opening profile for:', name, 'UID:', uid);

        profileModal.classList.add('show');
        profileContent.innerHTML = `
            <div style="text-align:center;padding:2rem;color:rgba(255,255,255,0.3);">
                <div class="loading-spinner" style="display:inline-block;width:30px;height:30px;border:3px solid rgba(255,255,255,0.1);border-radius:50%;border-top-color:#667eea;animation:spin 0.8s ease-in-out infinite;"></div>
                <p style="margin-top:1rem;">Loading profile...</p>
            </div>
        `;

        try {
            var doc = await firebase.firestore().collection('students').doc(uid).get();
            if (!doc.exists) {
                profileContent.innerHTML = `
                    <div style="text-align:center;padding:2rem;color:rgba(255,255,255,0.3);">
                        <div style="font-size:3rem;margin-bottom:1rem;">😕</div>
                        <p>User not found</p>
                    </div>
                `;
                return;
            }

            var data = doc.data();
            var avatarUrl = data.avatar || 'https://robohash.org/' + encodeURIComponent(name) + '?set=set1&size=128x128';

            var statusDoc = await firebase.firestore().collection('chat_status').doc(uid).get();
            var isOnline = statusDoc.exists && statusDoc.data().online === true;

            var achievements = data.achievements || [];
            var unlockedSet = new Set(achievements);

            var points = data.totalPoints || 0;
            var streak = data.streak || 0;
            var quizCount = data.quizCount || 0;
            var duelStats = data.duelStats || { totalDuels: 0, wins: 0, losses: 0, ties: 0 };

            var titleData = {
                quizCount: quizCount,
                duelCount: duelStats.totalDuels || 0,
                duelWins: duelStats.wins || 0,
                streak: streak,
                studentOfWeek: data.studentOfWeek || false
            };
            var title = getTitle(titleData);

            var social = data.social || {};
            var hasSocial = social.instagram || social.github || social.discord;

            var allAch = [
                { id: 'first_quiz', icon: '🎯', name: 'First Quiz' },
                { id: 'perfect_score', icon: '💯', name: 'Perfect Score' },
                { id: 'quiz_warrior', icon: '⚔️', name: 'Quiz Warrior' },
                { id: 'quiz_master', icon: '🏆', name: 'Quiz Master' },
                { id: 'streak_7', icon: '🔥', name: '7-Day Streak' },
                { id: 'streak_30', icon: '🌟', name: '30-Day Streak' },
                { id: 'physics_pro', icon: '⚛️', name: 'Physics Pro' },
                { id: 'chemistry_whiz', icon: '🧪', name: 'Chemistry Whiz' },
                { id: 'math_genius', icon: '📐', name: 'Math Genius' },
                { id: 'biology_expert', icon: '🧬', name: 'Biology Expert' },
                { id: 'duel_champion', icon: '⚔️', name: 'Duel Champion' },
                { id: 'student_of_week', icon: '🏆', name: 'Student of Week' }
            ];

            var achHtml = '';
            var unlockedCount = 0;
            for (var i = 0; i < allAch.length; i++) {
                var a = allAch[i];
                var isUnlocked = unlockedSet.has(a.id);
                if (isUnlocked) unlockedCount++;
                achHtml += `<span class="ach-item ${isUnlocked ? 'unlocked' : ''}" title="${a.name}">${a.icon}</span>`;
            }

            profileContent.innerHTML = `
                <div class="profile-header">
                    <div class="p-avatar">
                        <img src="${avatarUrl}" alt="${name}" loading="lazy">
                    </div>
                    <div class="p-name">${escapeHtml(name)}</div>
                    <div class="p-class">📚 Class ${escapeHtml(data.class || 'Not set')}${data.rollNo ? ' • Roll No: ' + escapeHtml(data.rollNo) : ''}</div>
                    <div class="p-status ${isOnline ? 'online' : 'offline'}">${isOnline ? '🟢 Online' : '⚫ Offline'}</div>
                    <div class="p-title">${title.icon} ${title.name}</div>
                </div>

                <div class="p-bio ${!data.bio ? 'empty' : ''}">
                    ${data.bio ? escapeHtml(data.bio) : 'No bio yet. 🦗'}
                </div>

                <div class="p-stats">
                    <div class="stat gold"><div class="num">${points}</div><div class="lbl">⭐ Points</div></div>
                    <div class="stat orange"><div class="num">${streak}</div><div class="lbl">🔥 Streak</div></div>
                    <div class="stat purple"><div class="num">${quizCount}</div><div class="lbl">📝 Quizzes</div></div>
                    <div class="stat green"><div class="num">${duelStats.totalDuels || 0}</div><div class="lbl">⚔️ Duels</div></div>
                </div>

                <div class="p-achievements">
                    <div class="ach-title">🏅 Achievements</div>
                    <div class="ach-list">${achHtml}</div>
                    <div class="ach-count">${unlockedCount} / ${allAch.length} unlocked</div>
                </div>

                ${hasSocial ? `
                <div class="p-social">
                    ${social.instagram ? `<a href="https://instagram.com/${social.instagram}" target="_blank">📸 ${social.instagram}</a>` : ''}
                    ${social.github ? `<a href="https://github.com/${social.github}" target="_blank">🐙 ${social.github}</a>` : ''}
                    ${social.discord ? `<a href="#" target="_blank">💬 ${social.discord}</a>` : ''}
                </div>
                ` : `
                <div class="p-social">
                    <span class="no-social">No social links set</span>
                </div>
                `}

                <div class="p-actions">
                    <button class="btn-chat" onclick="window.chatWidget.startPrivateChatFromProfile('${uid}', '${escapeHtml(name)}')">💬 Start Personal Chat</button>
                    <button class="btn-close" onclick="window.chatWidget.closeProfile()">✕ Close</button>
                </div>
            `;

            console.log('✅ Profile loaded for:', name);

        } catch (error) {
            console.error('❌ Error loading profile:', error);
            profileContent.innerHTML = `
                <div style="text-align:center;padding:2rem;color:rgba(255,255,255,0.3);">
                    <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
                    <p>Error loading profile: ${error.message}</p>
                </div>
            `;
        }
    }

    function closeProfile() {
        profileModal.classList.remove('show');
    }

    function getTitle(data) {
        if (data.studentOfWeek === true) return { name: 'Royal', icon: '👑' };
        if (data.streak >= 30) return { name: 'Legend', icon: '👑' };
        if (data.quizMaster >= 10) return { name: 'Quiz Master', icon: '🎯' };
        if (data.streak >= 7) return { name: 'Streak Master', icon: '🔥' };
        if (data.duelWins >= 5) return { name: 'Champion', icon: '🏆' };
        if (data.duelCount >= 10) return { name: 'Duelist', icon: '⚔️' };
        if (data.quizCount >= 5) return { name: 'Scholar', icon: '📚' };
        return { name: 'Explorer', icon: '🧑‍🎓' };
    }

    function startPrivateChatFromProfile(uid, name) {
        closeProfile();
        createPrivateChat(uid, name);
    }

    // ============================================================
    // MENU EVENT LISTENERS
    // ============================================================
    menuViewProfile.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var user = state.selectedUser;
        if (user) {
            console.log('👤 Viewing profile for:', user.name);
            hideUserMenu();
            showProfile(user.uid, user.name);
        }
    });

    closeProfileBtn.addEventListener('click', function(e) {
        e.preventDefault();
        closeProfile();
    });

    profileModal.addEventListener('click', function(e) {
        if (e.target === profileModal) {
            closeProfile();
        }
    });

    // ============================================================
    // CREATE PRIVATE CHAT
    // ============================================================
    menuPrivateChat.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var user = state.selectedUser;
        if (user) {
            console.log('💬 Starting private chat with:', user.name, 'UID:', user.uid);
            hideUserMenu();
            createPrivateChat(user.uid, user.name);
        }
    });

    async function createPrivateChat(uid, name) {
        console.log('🔒 Creating private chat with:', name);

        if (!state.currentUser) {
            alert('Please login first');
            return;
        }

        if (uid === state.currentUser.uid) {
            alert('You cannot chat with yourself!');
            return;
        }

        try {
            var roomId = [state.currentUser.uid, uid].sort().join('_');
            var roomRef = firebase.firestore().collection(CONFIG.CHAT_ROOMS).doc(roomId);
            var roomDoc = await roomRef.get();

            if (!roomDoc.exists) {
                var roomData = {
                    participants: [state.currentUser.uid, uid],
                    participantNames: {
                        [state.currentUser.uid]: state.userData.name || 'You',
                        [uid]: name
                    },
                    type: 'private',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                };
                await roomRef.set(roomData);
                console.log('✅ Room created');
            }

            openPrivateChat(roomId, uid, name);
            switchTab('personal');

        } catch (error) {
            console.error('❌ Error creating private chat:', error);
            alert('Failed to start private chat. Please try again.');
        }
    }

    // ============================================================
    // PRIVATE CHAT LISTENER
    // ============================================================
    function startPrivateChatListener(roomId) {
        if (state.privateChat.listener) {
            state.privateChat.listener();
            state.privateChat.listener = null;
        }

        console.log('🔒 Listening to private chat:', roomId);

        state.privateChat.listener = firebase.firestore()
            .collection(CONFIG.PRIVATE_MESSAGES)
            .where('roomId', '==', roomId)
            .onSnapshot(function(snapshot) {
                if (snapshot.empty) {
                    if (state.privateChat.otherUser) {
                        chatMessages.innerHTML = `<div class="chat-empty"><span class="chat-icon">💬</span><p>Start your private conversation with ${state.privateChat.otherUser.name}!</p></div>`;
                    }
                    return;
                }

                var messages = [];
                snapshot.forEach(function(doc) {
                    var data = doc.data();
                    messages.push({
                        id: doc.id,
                        uid: data.senderId,
                        name: data.senderName || 'Unknown',
                        message: data.message || '',
                        timestamp: data.timestamp?.toDate?.() || new Date()
                    });
                });

                messages.sort(function(a, b) {
                    return b.timestamp - a.timestamp;
                });
                messages.reverse();

                if (messages.length > CONFIG.MESSAGE_LIMIT) {
                    messages = messages.slice(-CONFIG.MESSAGE_LIMIT);
                }

                state.privateChat.messages = messages;
                renderPrivateMessages(messages);

            }, function(error) {
                console.error('❌ Private messages listener error:', error);
            });
    }

    // ============================================================
    // RENDER PRIVATE MESSAGES
    // ============================================================
    function renderPrivateMessages(messages) {
        if (!messages || messages.length === 0) {
            if (state.privateChat.otherUser) {
                chatMessages.innerHTML = `<div class="chat-empty"><span class="chat-icon">💬</span><p>Start your private conversation with ${state.privateChat.otherUser.name}!</p></div>`;
            }
            return;
        }

        var html = '';
        var currentUid = state.currentUser?.uid;

        for (var i = 0; i < messages.length; i++) {
            var msg = messages[i];
            var isOwn = msg.uid === currentUid;
            var timeStr = formatTime(msg.timestamp);
            var avatarUrl = 'https://robohash.org/' + encodeURIComponent(msg.name || 'user') + '?set=set1&size=64x64';

            html += `
                <div class="chat-msg ${isOwn ? 'own' : ''}">
                    <div class="chat-avatar">
                        <img src="${avatarUrl}" alt="${msg.name}" loading="lazy">
                    </div>
                    <div class="chat-body">
                        <div class="chat-header">
                            <span class="chat-name">${isOwn ? 'You' : escapeHtml(msg.name)}</span>
                            <span class="chat-time">${timeStr}</span>
                        </div>
                        <div class="chat-text">${escapeHtml(msg.message)}</div>
                    </div>
                </div>
            `;
        }

        chatMessages.innerHTML = html;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // ============================================================
    // USER STATUS LISTENER
    // ============================================================
    function listenToUserStatus(uid) {
        if (state.privateChat.statusListener) {
            state.privateChat.statusListener();
            state.privateChat.statusListener = null;
        }

        state.privateChat.statusListener = firebase.firestore()
            .collection(CONFIG.STATUS_COLLECTION)
            .doc(uid)
            .onSnapshot(function(doc) {
                if (doc.exists) {
                    var data = doc.data();
                    pcStatus.textContent = data.online ? '🟢 online' : '⚫ offline';
                    pcStatus.style.color = data.online ? '#66bb6a' : 'rgba(255,255,255,0.3)';
                }
            }, function(error) {
                console.error('Status listener error:', error);
            });
    }

    // ============================================================
    // BACK TO GLOBAL CHAT
    // ============================================================
    function backToGlobalChat() {
        console.log('🌍 Back to global chat');

        if (state.privateChat.listener) {
            state.privateChat.listener();
            state.privateChat.listener = null;
        }
        if (state.privateChat.statusListener) {
            state.privateChat.statusListener();
            state.privateChat.statusListener = null;
        }

        state.privateChat.isActive = false;
        state.privateChat.roomId = null;
        state.privateChat.otherUser = null;
        state.privateChat.messages = [];

        privateChatHeader.classList.remove('show');
        chatTitle.textContent = '💬 Student Chat';
        switchTab('global');
    }

    pcBackBtn.addEventListener('click', function(e) {
        e.preventDefault();
        backToGlobalChat();
    });

    // ============================================================
    // SEND PRIVATE MESSAGE
    // ============================================================
    async function sendPrivateMessage(text) {
        if (!text) return;
        if (!state.currentUser) { alert('Please login first'); return; }
        if (!state.privateChat.roomId) { alert('No private chat active'); return; }

        var msgData = {
            roomId: state.privateChat.roomId,
            senderId: state.currentUser.uid,
            senderName: state.userData.name || 'Student',
            message: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        chatSend.disabled = true;
        chatSend.textContent = 'Sending...';

        try {
            await firebase.firestore().collection(CONFIG.PRIVATE_MESSAGES).add(msgData);

            await firebase.firestore().collection(CONFIG.CHAT_ROOMS).doc(state.privateChat.roomId).update({
                lastMessage: text,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

            chatInput.value = '';
            chatSend.disabled = false;
            chatSend.textContent = 'Send';
            chatInput.focus();

        } catch (error) {
            console.error('❌ Error sending private message:', error);
            alert('Failed to send message. Please try again.');
            chatSend.disabled = false;
            chatSend.textContent = 'Send';
        }
    }

    // ============================================================
    // SEND MESSAGE (Global or Private)
    // ============================================================
    function sendMessage() {
        var text = chatInput.value.trim();
        if (!text) return;

        if (state.privateChat.isActive) {
            sendPrivateMessage(text);
        } else {
            sendGlobalMessage(text);
        }
    }

    // ============================================================
    // SEND GLOBAL MESSAGE (with sound)
    // ============================================================
    function sendGlobalMessage(text) {
        if (!state.currentUser) { alert('Please login first'); return; }
        if (!state.userData) { alert('Loading user data...'); return; }

        var userData = state.userData;
        var avatar = userData.avatar || 'https://robohash.org/' + encodeURIComponent(userData.name || 'student') + '?set=set1&size=64x64';

        var msgData = {
            uid: state.currentUser.uid,
            name: userData.name || 'Student',
            avatar: avatar,
            message: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        chatSend.disabled = true;
        chatSend.textContent = 'Sending...';

        firebase.firestore().collection(CONFIG.GLOBAL_CHAT).add(msgData)
            .then(function() {
                chatInput.value = '';
                chatSend.disabled = false;
                chatSend.textContent = 'Send';
                chatInput.focus();
                // Play send sound
                chatSounds.sent();
            })
            .catch(function(error) {
                console.error('❌ Error sending message:', error);
                alert('Failed to send message. Please try again.');
                chatSend.disabled = false;
                chatSend.textContent = 'Send';
            });
    }

    // ============================================================
    // GLOBAL CHAT
    // ============================================================
    function startGlobalChat() {
        console.log('🌍 Starting global chat...');
        state.privateChat.isActive = false;
        privateChatHeader.classList.remove('show');
        chatTitle.textContent = '💬 Student Chat';
        startChatListeners();
    }

    function startChatListeners() {
        if (state.listeners.length > 0) {
            state.listeners.forEach(function(unsub) { unsub(); });
            state.listeners = [];
        }

        if (state.privateChat.isActive) return;

        console.log('📡 Starting global chat listeners...');

        var unsubMessages = firebase.firestore()
            .collection(CONFIG.GLOBAL_CHAT)
            .orderBy('timestamp', 'desc')
            .limit(CONFIG.MESSAGE_LIMIT)
            .onSnapshot(function(snapshot) {
                if (snapshot.empty) {
                    if (state.activeTab === 'global') {
                        chatMessages.innerHTML = `<div class="chat-empty"><span class="chat-icon">💬</span><p>No messages yet.<br>Start the conversation!</p></div>`;
                    }
                    return;
                }

                var messages = [];
                snapshot.forEach(function(doc) {
                    var data = doc.data();
                    messages.push({
                        id: doc.id,
                        uid: data.uid,
                        name: data.name || 'Student',
                        avatar: data.avatar || '',
                        message: data.message || '',
                        timestamp: data.timestamp?.toDate?.() || new Date()
                    });
                });

                messages.reverse();
                state.messages = messages;
                if (state.activeTab === 'global') {
                    renderMessages(messages);
                }
                updateGlobalBadge(messages);

            }, function(error) {
                console.error('❌ Messages listener error:', error);
            });

        state.listeners.push(unsubMessages);
        console.log('✅ Messages listener attached');

        var unsubStatus = firebase.firestore()
            .collection(CONFIG.STATUS_COLLECTION)
            .where('online', '==', true)
            .onSnapshot(function(snapshot) {
                chatOnlineCount.textContent = snapshot.size || 0;
            }, function(error) {
                console.error('❌ Status listener error:', error);
            });

        state.listeners.push(unsubStatus);

        var unsubTyping = firebase.firestore()
            .collection(CONFIG.STATUS_COLLECTION)
            .where('typing', '==', true)
            .onSnapshot(function(snapshot) {
                if (state.privateChat.isActive) return;
                var typingUsers = [];
                snapshot.forEach(function(doc) {
                    var data = doc.data();
                    if (data.uid !== state.currentUser?.uid) {
                        typingUsers.push(data.name || 'Someone');
                    }
                });

                if (typingUsers.length > 0) {
                    var names = typingUsers.join(', ');
                    chatTypingText.textContent = names;
                    chatTyping.classList.add('show');
                } else {
                    chatTyping.classList.remove('show');
                }
            }, function(error) {
                console.error('❌ Typing listener error:', error);
            });

        state.listeners.push(unsubTyping);
        console.log('✅ All global listeners started!');
    }

    // ============================================================
    // UPDATE GLOBAL BADGE
    // ============================================================
    function updateGlobalBadge(messages) {
        if (!globalBadge) return;
        if (!state.currentUser) {
            globalBadge.classList.remove('show');
            return;
        }

        var lastRead = sessionStorage.getItem('chatLastRead');
        var unreadCount = 0;

        if (lastRead) {
            var lastReadTime = new Date(lastRead);
            for (var i = 0; i < messages.length; i++) {
                var msg = messages[i];
                if (msg.uid !== state.currentUser.uid && msg.timestamp > lastReadTime) {
                    unreadCount++;
                }
            }
        } else {
            for (var j = 0; j < messages.length; j++) {
                if (messages[j].uid !== state.currentUser.uid) {
                    unreadCount++;
                }
            }
        }

        if (unreadCount > 0 && state.activeTab !== 'global') {
            globalBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            globalBadge.classList.add('show');
        } else {
            globalBadge.classList.remove('show');
        }
    }

    // ============================================================
    // RENDER GLOBAL MESSAGES - SMOOTH ANIMATIONS (FIXED)
    // ============================================================
    function renderMessages(messages) {
        if (!messages || messages.length === 0) {
            chatMessages.innerHTML = `<div class="chat-empty"><span class="chat-icon">💬</span><p>No messages yet.<br>Start the conversation!</p></div>`;
            return;
        }

        var currentUid = state.currentUser?.uid;
        var existingIds = new Set();

        // Get existing message IDs to avoid re-rendering
        var existingMessages = chatMessages.querySelectorAll('.chat-msg');
        existingMessages.forEach(function(el) {
            var id = el.getAttribute('data-msg-id');
            if (id) existingIds.add(id);
        });

        var html = '';
        var newMessageCount = 0;

        for (var i = 0; i < messages.length; i++) {
            var msg = messages[i];
            var isOwn = msg.uid === currentUid;
            var timeStr = formatTime(msg.timestamp);
            var avatarUrl = msg.avatar || 'https://robohash.org/' + encodeURIComponent(msg.name || 'student') + '?set=set1&size=64x64';
            var safeName = escapeHtml(msg.name);
            var safeUid = msg.uid || '';
            var msgId = msg.id || 'msg-' + i;

            var isNew = !existingIds.has(msgId);
            if (isNew) newMessageCount++;

            html += `
                <div class="chat-msg ${isOwn ? 'own' : ''} ${isNew ? 'chat-msg-new' : ''}" data-msg-id="${msgId}">
                    <div class="chat-avatar" data-uid="${safeUid}" data-name="${safeName}" title="Click for options">
                        <img src="${avatarUrl}" alt="${safeName}" loading="lazy">
                    </div>
                    <div class="chat-body">
                        <div class="chat-header">
                            <span class="chat-name" data-uid="${safeUid}" data-name="${safeName}">${safeName}</span>
                            <span class="chat-time">${timeStr}</span>
                        </div>
                        <div class="chat-text">${escapeHtml(msg.message)}</div>
                    </div>
                </div>
            `;
        }

        // Only update if there are changes
        if (html !== chatMessages.innerHTML) {
            var wasAtBottom = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 50;

            chatMessages.innerHTML = html;

            // Play sound for new messages from others
            if (newMessageCount > 0 && chatMessages.querySelector('.chat-msg-new') && state.activeTab === 'global') {
                var hasNewFromOthers = false;
                chatMessages.querySelectorAll('.chat-msg-new').forEach(function(el) {
                    var avatarEl = el.querySelector('.chat-avatar');
                    if (avatarEl) {
                        var uid = avatarEl.getAttribute('data-uid');
                        if (uid && uid !== state.currentUser?.uid) {
                            hasNewFromOthers = true;
                        }
                    }
                });
                if (hasNewFromOthers && state.isOpen) {
                    chatSounds.notification();
                }
            }

            // Auto-scroll if was at bottom
            if (wasAtBottom) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
    }

    // ============================================================
    // OTHER FUNCTIONS
    // ============================================================
    function cleanupOldMessages() {
        var cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - CONFIG.MESSAGE_RETENTION_DAYS);

        firebase.firestore()
            .collection(CONFIG.GLOBAL_CHAT)
            .where('timestamp', '<', cutoffDate)
            .get()
            .then(function(snapshot) {
                if (snapshot.empty) return;
                var batch = firebase.firestore().batch();
                var count = 0;
                snapshot.forEach(function(doc) {
                    batch.delete(doc.ref);
                    count++;
                });
                batch.commit().then(function() {
                    console.log('🧹 Deleted', count, 'old global messages');
                });
            })
            .catch(function(e) { console.error('Error deleting old messages:', e); });
    }

    function updateOnlineStatus(isOnline) {
        if (!state.currentUser) return;
        var statusRef = firebase.firestore().collection(CONFIG.STATUS_COLLECTION).doc(state.currentUser.uid);
        if (isOnline) {
            statusRef.set({
                uid: state.currentUser.uid,
                name: state.userData?.name || 'Student',
                online: true,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(function() {});
        } else {
            statusRef.update({
                online: false,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(function() {});
        }
    }

    function handleTyping() {
        if (!state.currentUser) return;
        if (state.typingTimer) clearTimeout(state.typingTimer);
        if (!state.isTyping) {
            state.isTyping = true;
            firebase.firestore().collection(CONFIG.STATUS_COLLECTION).doc(state.currentUser.uid)
                .update({ typing: true }).catch(function() {});
        }
        state.typingTimer = setTimeout(function() {
            state.isTyping = false;
            firebase.firestore().collection(CONFIG.STATUS_COLLECTION).doc(state.currentUser.uid)
                .update({ typing: false }).catch(function() {});
        }, CONFIG.TYPING_TIMEOUT);
    }

    function markAsRead() {
        sessionStorage.setItem('chatLastRead', new Date().toISOString());
        if (chatBadge) chatBadge.style.display = 'none';
    }

    function toggleChat() {
        if (chatWindow.style.display === 'flex') {
            chatWindow.style.display = 'none';
            toggleBtn.style.display = 'flex';
            sessionStorage.setItem('chatOpen', 'false');
            state.isOpen = false;
        } else {
            chatWindow.style.display = 'flex';
            toggleBtn.style.display = 'none';
            sessionStorage.setItem('chatOpen', 'true');
            state.isOpen = true;
            setTimeout(function() { chatInput.focus(); }, 300);
            markAsRead();
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    function formatTime(date) {
        if (!date) return '';
        var now = new Date();
        var diff = (now - date) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        return date.toLocaleDateString();
    }

    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============================================================
    // ATTACH EVENT LISTENERS
    // ============================================================
    toggleBtn.addEventListener('click', function(e) { e.preventDefault(); toggleChat(); });
    closeBtn.addEventListener('click', function(e) { e.preventDefault(); toggleChat(); });
    chatSend.addEventListener('click', function(e) { e.preventDefault(); sendMessage(); });
    chatInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } });
    chatInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } });
    chatInput.addEventListener('input', handleTyping);

    // ============================================================
    // RESTORE STATE
    // ============================================================
    if (sessionStorage.getItem('chatOpen') === 'true') {
        chatWindow.style.display = 'flex';
        toggleBtn.style.display = 'none';
        state.isOpen = true;
        switchTab('global');
    }

    // ============================================================
    // CLEANUP
    // ============================================================
    window.addEventListener('beforeunload', function() {
        if (state.currentUser) updateOnlineStatus(false);
        if (state.listeners.length > 0) state.listeners.forEach(function(unsub) { unsub(); });
        if (state.privateListeners.length > 0) state.privateListeners.forEach(function(unsub) { unsub(); });
        if (state.privateChat.listener) state.privateChat.listener();
        if (state.privateChat.statusListener) state.privateChat.statusListener();
    });

    setInterval(function() { cleanupOldMessages(); }, 3600000);

    // ============================================================
    // EXPOSE GLOBALLY
    // ============================================================
    window.chatWidget = {
        showUserMenu: showUserMenu,
        hideUserMenu: hideUserMenu,
        toggleChat: toggleChat,
        sendMessage: sendMessage,
        createPrivateChat: createPrivateChat,
        backToGlobalChat: backToGlobalChat,
        switchTab: switchTab,
        showProfile: showProfile,
        closeProfile: closeProfile,
        startPrivateChatFromProfile: startPrivateChatFromProfile,
        state: state
    };

    console.log('✅ Chat widget fully loaded with Profile View!');
    console.log('💬 Click the 💬 button to open chat');
    console.log('🌍 Global tab - all students can chat');
    console.log('🔒 Personal tab - your private conversations');
    console.log('👤 Click on any username → View Profile to see their profile');
    console.log('🔊 Sound effects enabled - ding on new messages, pop on send');
    console.log('🧹 Messages older than 7 days will be auto-deleted');
})();
