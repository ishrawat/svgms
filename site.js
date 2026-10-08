/* ==========================================================================
   SVGMS Bhim — site.js
   Shared chrome, Firebase, navigation, thought box, ticker, rocket.
   Loaded by every page with: <script src="site.js"></script>
   ========================================================================== */
(function () {
    'use strict';

    /* ======================================================================
       CONFIG — edit these once, every page updates
       ====================================================================== */
    var CONFIG = {
        logoUrl:     'https://raw.githubusercontent.com/ishrawat/imagess/refs/heads/main/logo.jpg',
        region:      'Rajsamand',
        affiliation: '0000000',
        schoolCode:  '0000',
        firebase: {
            apiKey:            "AIzaSyAHmBCyGlSo1puz1LZ7k-4twg_XAcOqyRA",
            authDomain:        "svgms-backend.firebaseapp.com",
            projectId:         "svgms-backend",
            storageBucket:     "svgms-backend.firebasestorage.app",
            messagingSenderId: "1065359559935",
            appId:             "1:1065359559935:web:977cea73a68e05813750ca"
        }
    };

    /* ======================================================================
       FIREBASE — optional
       ====================================================================== */
    var auth = null;
    var db = null;
    if (typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(CONFIG.firebase);
            auth = firebase.auth();
            db   = firebase.firestore();
        } catch (e) {
            console.warn('Firebase init skipped:', e);
        }
    }

    /* ======================================================================
       CHROME TEMPLATE
       ====================================================================== */
    var CHROME_HTML = `
<div class="top-ribbon">
    <div class="ribbon-welcome">Welcome to SVGMS Bhim</div>
    <div class="ribbon-info">
        <span><strong>Region:</strong> ${CONFIG.region}</span>
        <span><strong>Affiliation No:</strong> ${CONFIG.affiliation}</span>
        <span><strong>School Code:</strong> ${CONFIG.schoolCode}</span>
    </div>
</div>

<header class="main-header">
    <div class="brand-container">
        <a class="brand-link" href="index.html">
            <img class="logo-image" src="${CONFIG.logoUrl}" alt="School Logo">
            <div class="brand-text">
                <h1>Swami Vivekanand Govt. Model School</h1>
                <p>Bhim, Rajasthan</p>
            </div>
        </a>
    </div>
</header>

<nav class="nav-container" aria-label="Main navigation">
    <div class="nav-inner">
        <button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false">☰</button>
        <ul class="main-nav" id="navList">

            <li class="nav-item" data-nav="home">
                <a href="index.html#home" class="nav-link" onclick="showPage('home');return false;">Home</a>
            </li>

            <li class="nav-item" data-nav="school">
                <button type="button" class="nav-link" aria-haspopup="true" onclick="toggleMenu(event, this)">School ▾</button>
                <ul class="dropdown-menu">
                    <li><a href="index.html#about" onclick="showPage('about');return false;">About School</a></li>
                    <li><a href="employees.html">Our Team</a></li>
                    <li><a href="index.html#principal" onclick="showPage('principal');return false;">Principal's Message</a></li>
                    <li><a href="#">School Infrastructure</a></li>
                    <li><a href="#">Transport Facilities</a></li>
                    <li><a href="#">Computer Lab</a></li>
                    <li><a href="#">Games &amp; Sports</a></li>
                    <li><a href="#">Library</a></li>
                    <li><a href="#">Yoga &amp; Meditation</a></li>
                    <li><a href="#">Art &amp; Craft</a></li>
                </ul>
            </li>

            <li class="nav-item" data-nav="academics">
                <button type="button" class="nav-link" aria-haspopup="true" onclick="toggleMenu(event, this)">Academics ▾</button>
                <ul class="dropdown-menu">
                    <li><a href="methodology.html">Methodology</a></li>
                    <li><a href="academic-planner.html">Academic Session Planner</a></li>
                    <li><a href="cbse-corner.html">CBSE Corner</a></li>
                    <li><a href="exams-cce.html">Exams &amp; CCE</a></li>
                    <li><a href="result-lookup.html">Result Section</a></li>
                </ul>
            </li>

            <li class="nav-item" data-nav="admission">
                <button type="button" class="nav-link" aria-haspopup="true" onclick="toggleMenu(event, this)">Admission ▾</button>
                <ul class="dropdown-menu">
                    <li><a href="shortlist.html">Shortlist of Admission Candidates</a></li>
                    <li><a href="#">Rules &amp; Regulations</a></li>
                    <li><a href="#">Parent's Involvement</a></li>
                    <li><a href="#">School Timings</a></li>
                    <li><a href="#">School Uniform</a></li>
                </ul>
            </li>

            <li class="nav-item" data-nav="library">
                <a href="library.html" class="nav-link">Digital Library</a>
            </li>

            <li class="nav-item" data-nav="news">
                <button type="button" class="nav-link" aria-haspopup="true" onclick="toggleMenu(event, this)">News ▾</button>
                <ul class="dropdown-menu">
                    <li><a href="news.html">News &amp; Events</a></li>
                    <li><a href="notices.html">Notices &amp; Downloads</a></li>
                    <li><a href="bhamashah.html">Bhamashah</a></li>
                    <li><a href="awards.html">Awards</a></li>
                    <li><a href="shortlist.html">Shortlist of Admission Candidates</a></li>
                </ul>
            </li>

            <li class="nav-item" data-nav="gallery">
                <button type="button" class="nav-link" aria-haspopup="true" onclick="toggleMenu(event, this)">Gallery ▾</button>
                <ul class="dropdown-menu">
                    <li><a href="gallery.html">Photo Gallery</a></li>
                </ul>
            </li>

            <li class="nav-item" data-nav="contact">
                <a href="index.html#contact" class="nav-link" onclick="showPage('contact');return false;">Contact</a>
            </li>

            <li class="nav-item nav-right" data-nav="admin">
                <a href="admin.html" class="nav-link" id="staffLoginLink">🔐 Staff Login</a>
            </li>

            <li class="nav-item" data-nav="student">
                <a href="student/login.html" class="nav-link student-zone" id="studentZoneLink">
                    <span id="rocketSpan">🚀</span><span>Student Zone</span>
                </a>
            </li>

        </ul>
    </div>
</nav>

<div id="thoughtIcon" role="button" tabindex="0" aria-label="Open Principal's message"
     onclick="openThought()"
     onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openThought();}">💭</div>

<div id="thoughtBox" role="dialog" aria-labelledby="thoughtHeading" aria-live="polite">
    <div class="thought-header">
        <div class="thought-title">
            <span aria-hidden="true">💭</span>
            <span id="thoughtHeading">Principal's Message</span>
        </div>
        <button type="button" class="thought-close" aria-label="Close message" onclick="closeThought()">✕</button>
    </div>
    <div id="thoughtMessage" class="thought-message">Loading...</div>
    <div class="thought-footer">
        <span id="thoughtAuthor" class="thought-author">— Principal</span>
        <span id="thoughtDate" class="thought-date"></span>
    </div>
</div>

<div class="rocket-bg" id="rocketBg"></div>
<div class="rocket-wrapper" id="rocketWrapper" aria-hidden="true">
    <svg viewBox="0 0 120 240" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="rkBody" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="100%" stop-color="#d6dce4"/>
            </linearGradient>
            <linearGradient id="rkFlame" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ffd166"/>
                <stop offset="55%" stop-color="#c8862c"/>
                <stop offset="100%" stop-color="#a84b2f" stop-opacity="0"/>
            </linearGradient>
        </defs>
        <path d="M60 175 C45 200, 50 225, 60 240 C70 225, 75 200, 60 175 Z" fill="url(#rkFlame)"/>
        <path d="M60 10 C85 40, 92 95, 92 150 L28 150 C28 95, 35 40, 60 10 Z" fill="url(#rkBody)" stroke="#1a2b3c" stroke-width="2"/>
        <circle cx="60" cy="80" r="15" fill="#1a2b3c"/>
        <circle cx="60" cy="80" r="10" fill="#e0a347" opacity=".9"/>
        <path d="M28 120 L8 165 L28 152 Z" fill="#c8862c"/>
        <path d="M92 120 L112 165 L92 152 Z" fill="#c8862c"/>
        <rect x="30" y="150" width="60" height="10" rx="3" fill="#1a2b3c"/>
    </svg>
</div>
`;

    /* ======================================================================
       NAVIGATION
       ====================================================================== */
    function closeAllMenus() {
        document.querySelectorAll('.nav-item').forEach(function (item) {
            item.classList.remove('active');
            var menu = item.querySelector('.dropdown-menu');
            if (menu) menu.style.display = 'none';
        });
    }

    function toggleMenu(event, element) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        var parent = element.closest('.nav-item');
        if (!parent) return;
        var menu = parent.querySelector('.dropdown-menu');
        if (!menu) return;
        var wasOpen = parent.classList.contains('active');
        closeAllMenus();
        if (!wasOpen) {
            parent.classList.add('active');
            menu.style.display = 'block';
        }
    }

    function showPage(pageName) {
        closeAllMenus();

        // If we're on a page with .page views (i.e. homepage), swap them
        var pages = document.querySelectorAll('.page');
        if (pages.length) {
            pages.forEach(function (p) { p.classList.remove('active'); });
            var target = document.getElementById('page-' + pageName);
            if (target) target.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (window.location.hash !== '#' + pageName) {
                history.pushState(null, '', '#' + pageName);
            }
        } else {
            // Otherwise redirect to the homepage with the hash
            window.location.href = 'index.html#' + pageName;
        }

        var list = document.getElementById('navList');
        if (list) list.classList.remove('open');
    }

    function resolveHash() {
        var hash = window.location.hash.replace('#', '');
        var views = ['home', 'about', 'principal', 'contact'];
        if (hash && views.indexOf(hash) !== -1) showPage(hash);
        else showPage('home');
    }

    function setActiveNav() {
        var active = document.body.getAttribute('data-nav-active');
        if (!active) return;
        var item = document.querySelector('.nav-item[data-nav="' + active + '"]');
        if (item) {
            var link = item.querySelector('.nav-link');
            if (link) link.classList.add('active');
        }
    }

    function wireMobileNav() {
        var navToggle = document.getElementById('navToggle');
        var navList = document.getElementById('navList');
        if (!navToggle || !navList) return;
        navToggle.addEventListener('click', function () {
            var open = navList.classList.toggle('open');
            navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            navToggle.textContent = open ? '✕' : '☰';
        });
    }

    /* ======================================================================
       THOUGHT BOX
       ====================================================================== */
    function openThought() {
        var box  = document.getElementById('thoughtBox');
        var icon = document.getElementById('thoughtIcon');
        if (box)  box.style.display  = 'block';
        if (icon) icon.style.display = 'none';
    }

    function closeThought() {
        var box  = document.getElementById('thoughtBox');
        var icon = document.getElementById('thoughtIcon');
        if (box)  box.style.display  = 'none';
        if (icon) icon.style.display = 'flex';
        try { localStorage.setItem('thoughtClosed', 'true'); } catch (e) {}
    }

    function loadThought() {
        if (!db) return;
        var iconEl = document.getElementById('thoughtIcon');
        if (!iconEl) return; // page has no thought box

        db.collection('thoughts').doc('current').get().then(function (doc) {
            if (!doc.exists) return;
            var data = doc.data();

            var msgEl    = document.getElementById('thoughtMessage');
            var authorEl = document.getElementById('thoughtAuthor');
            var dateEl   = document.getElementById('thoughtDate');

            if (msgEl)    msgEl.textContent    = '"' + (data.message || '') + '"';
            if (authorEl) authorEl.textContent = '— ' + (data.author || 'Principal');
            if (dateEl && data.date) {
                dateEl.textContent = new Date(data.date).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric'
                });
            }

            var dismissed = false;
            try { dismissed = localStorage.getItem('thoughtClosed') === 'true'; } catch (e) {}
            if (!dismissed) iconEl.style.display = 'flex';
        }).catch(function () {});
    }

    /* ======================================================================
       TICKER (homepage only — no-op if #ticker-track missing)
       ====================================================================== */
    var TICKER_ROW  = 60;
    var tickerIndex = 0;
    var tickerTimer = null;

    function tickerPosition() {
        var track = document.getElementById('ticker-track');
        if (track) track.style.transform = 'translateY(' + (-tickerIndex * TICKER_ROW) + 'px)';
    }
    function tickerCount() {
        var t = document.getElementById('ticker-track');
        return t ? t.children.length : 0;
    }
    function tickerNext() {
        var n = tickerCount();
        if (!n) return;
        tickerIndex = (tickerIndex + 1) % n;
        tickerPosition();
    }
    function tickerPrev() {
        var n = tickerCount();
        if (!n) return;
        tickerIndex = (tickerIndex - 1 + n) % n;
        tickerPosition();
    }
    function tickerStart() {
        tickerStop();
        if (tickerCount() > 1) tickerTimer = setInterval(tickerNext, 5000);
    }
    function tickerStop() {
        if (tickerTimer) { clearInterval(tickerTimer); tickerTimer = null; }
    }
    function tickerReset() { tickerStop(); tickerStart(); }

    function renderTicker(messages) {
        var track = document.getElementById('ticker-track');
        if (!track) return;
        track.innerHTML = '';
        messages.forEach(function (msg) {
            var row = document.createElement('div');
            row.className = 'ticker-message';
            if (msg.isNew) {
                var badge = document.createElement('span');
                badge.className = 'msg-badge';
                badge.textContent = 'NEW';
                row.appendChild(badge);
            }
            var text = document.createElement('span');
            text.className = 'msg-text';
            text.textContent = msg.text;
            row.appendChild(text);
            if (msg.date) {
                var d = document.createElement('span');
                d.className = 'msg-date';
                d.textContent = msg.date;
                row.appendChild(d);
            }
            track.appendChild(row);
        });
        tickerIndex = 0;
        tickerPosition();
        tickerReset();
        var countEl = document.getElementById('ticker-count');
        if (countEl) countEl.textContent = String(messages.length);
    }

    function loadTicker() {
        if (!document.getElementById('ticker-track')) return; // page has no ticker
        if (!db) {
            renderTicker([{ text: 'Notices load when you\'re online.', date: '' }]);
            return;
        }
        db.collection('ticker')
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get()
            .then(function (snap) {
                var messages = [];
                if (snap.empty) {
                    messages.push({ text: 'No active announcements at this time.', date: '' });
                } else {
                    snap.forEach(function (doc) {
                        var data = doc.data();
                        var when = data.createdAt ? new Date(data.createdAt) : new Date();
                        var isNew = data.createdAt && (Date.now() - when.getTime() < 604800000);
                        messages.push({
                            text: data.message || 'New school announcement',
                            date: when.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                            isNew: isNew
                        });
                    });
                }
                renderTicker(messages);
            })
            .catch(function () {
                renderTicker([{ text: 'Announcements are temporarily unavailable.', date: '' }]);
            });
    }

    function wireTickerControls() {
        var up = document.getElementById('ticker-up');
        var down = document.getElementById('ticker-down');
        if (up)   up.addEventListener('click', function () { tickerPrev(); tickerReset(); });
        if (down) down.addEventListener('click', function () { tickerNext(); tickerReset(); });
        var vp = document.getElementById('ticker-viewport');
        if (vp) {
            vp.addEventListener('mouseenter', tickerStop);
            vp.addEventListener('mouseleave', tickerStart);
        }
    }

    /* ======================================================================
       AUTH (updates the Staff Login nav link)
       ====================================================================== */
    function wireAuth() {
        if (!auth) return;
        auth.onAuthStateChanged(function (user) {
            var staffLink = document.getElementById('staffLoginLink');
            if (!staffLink) return;
            if (user) {
                staffLink.textContent = '🚪 Logout';
                staffLink.removeAttribute('href');
                staffLink.onclick = function (e) {
                    e.preventDefault();
                    auth.signOut().then(function () { alert('Logged out successfully.'); });
                };
            } else {
                staffLink.textContent = '🔐 Staff Login';
                staffLink.setAttribute('href', 'admin.html');
                staffLink.onclick = null;
            }
        });
    }

    /* ======================================================================
       ROCKET LAUNCH (Student Zone)
       ====================================================================== */
    function spawnTrail(x, y) {
        var p = document.createElement('div');
        p.className = 'trail-particle';
        var size = Math.random() * 5 + 3;
        var colors = ['#e0a347', '#c8862c', '#a84b2f', '#ffffff'];
        var color = colors[Math.floor(Math.random() * colors.length)];
        p.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' +
            (x + (Math.random() - 0.5) * 40) + 'px;top:' +
            (y + (Math.random() - 0.5) * 20) + 'px;background:' + color +
            ';box-shadow:0 0 12px ' + color + ';';
        document.body.appendChild(p);
        setTimeout(function () { p.remove(); }, 850);
    }

    function launchRocket(destination) {
        var bg = document.getElementById('rocketBg');
        var w  = document.getElementById('rocketWrapper');
        if (bg) bg.classList.add('active');
        if (w)  w.classList.add('launching');

        var cx = window.innerWidth / 2;
        var cy = window.innerHeight / 2;
        var count = 0;
        var trail = setInterval(function () {
            if (count++ >= 16) { clearInterval(trail); return; }
            spawnTrail(cx, cy + 50);
        }, 45);

        setTimeout(function () { window.location.href = destination; }, 1600);
    }

    function setupStudentZone() {
        var link = document.getElementById('studentZoneLink');
        if (!link || link.dataset.wired) return;
        link.dataset.wired = '1';
        link.addEventListener('click', function (e) {
            e.preventDefault();
            launchRocket(link.getAttribute('href') || 'student/login.html');
        });
    }

    /* ======================================================================
       INJECT CHROME
       ====================================================================== */
    function injectChrome() {
        var slot = document.getElementById('site-chrome');
        if (!slot) return;
        slot.innerHTML = CHROME_HTML;
        setActiveNav();
        wireMobileNav();
        wireAuth();
        setupStudentZone();
    }

    /* ======================================================================
       PUBLIC API (needed by inline onclick handlers)
       ====================================================================== */
    window.toggleMenu   = toggleMenu;
    window.showPage     = showPage;
    window.openThought  = openThought;
    window.closeThought = closeThought;

    /* ======================================================================
       BOOT
       ====================================================================== */
    function boot() {
        injectChrome();

        // Homepage-only: resolve initial hash view + popstate
        if (document.querySelector('.page')) {
            resolveHash();
            window.addEventListener('popstate', resolveHash);
        }

        // Optional components — each no-ops if its DOM isn't present
        loadTicker();
        loadThought();
        wireTickerControls();

        // Close menus on outside click
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.nav-item')) closeAllMenus();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();