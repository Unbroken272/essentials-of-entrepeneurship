/*
 * SwapNest Analytics
 * Slaat sessie-data op in Firebase Realtime Database zodat alle apparaten
 * dezelfde data zien. Geen localStorage, geen Google Sheets.
 *
 * ── SETUP ──────────────────────────────────────────────────────────────────
 * 1. Ga naar https://console.firebase.google.com
 * 2. Maak een nieuw project aan (gratis Spark-plan is genoeg)
 * 3. Klik op "Realtime Database" → "Create database" → start in testmodus
 * 4. Kopieer de database URL (ziet eruit als:
 *    https://jouw-project-default-rtdb.firebaseio.com)
 * 5. Plak die URL hieronder bij FIREBASE_URL
 * ───────────────────────────────────────────────────────────────────────────
 */

const Analytics = (() => {
    // ▼▼▼ Vervang dit met jouw Firebase Realtime Database URL ▼▼▼
    const FIREBASE_URL = 'https://swapnest-20fe9-default-rtdb.europe-west1.firebasedatabase.app';
    // ▲▲▲ ─────────────────────────────────────────────────────── ▲▲▲

    const SESSION_STORAGE_KEY = 'swapnest_active_session';
    const RETURNING_VISITOR_KEY = 'swapnest_returning_visitor';
    const isAdminPage = window.location.pathname.includes('admin-metrics');
    const isConfigured = !FIREBASE_URL.includes('JOUW_PROJECT');

    let currentSession = null; // null = sessie nog niet klaar (laden of niet geconfigureerd)

    // Rage click tracking: element label -> tijdstempels van recente clicks
    const recentClickTimes = new Map();

    // ── Firebase helpers ─────────────────────────────────────────────────────

    function saveSession(session, keepalive) {
        if (!isConfigured || !session) return;
        fetch(`${FIREBASE_URL}/sessions/${session.id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(session),
            keepalive: !!keepalive
        }).catch(err => console.error('[Analytics] Firebase write fout:', err));
    }

    // ── Device detectie ──────────────────────────────────────────────────────

    function getDevice() {
        const w = window.screen.width;
        if (w < 768) return 'mobile';
        if (w < 1024) return 'tablet';
        return 'desktop';
    }

    // ── Sessie aanmaken ──────────────────────────────────────────────────────

    function generateSessionId() {
        return 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    }

    function createNewSession() {
        const urlParams = new URLSearchParams(window.location.search);
        const ref = urlParams.get('ref') || null;
        let referrer = document.referrer || 'direct';
        if (referrer === '') referrer = 'direct';

        let returningVisitor = false;
        try {
            returningVisitor = !!localStorage.getItem(RETURNING_VISITOR_KEY);
            localStorage.setItem(RETURNING_VISITOR_KEY, '1');
        } catch (_) { /* Private browsing kan localStorage blokkeren */ }

        return {
            id: generateSessionId(),
            startedAt: Date.now(),
            lastActive: Date.now(),
            timeSpentMs: 0,
            referrer: referrer,
            ref: ref,
            device: getDevice(),
            language: navigator.language || null,
            screenWidth: window.screen.width,
            scrollDepth: 0,
            exitPage: null,
            returningVisitor: returningVisitor,
            pageViews: [window.location.pathname.split('/').pop() || 'index.html'],
            clicks: [],
            rageClicks: [],
            waitlistSignups: 0
        };
    }

    function updateTimeSpent() {
        if (!currentSession) return;
        const now = Date.now();
        currentSession.timeSpentMs += now - currentSession.lastActive;
        currentSession.lastActive = now;
    }

    function trackPageView(page) {
        if (!currentSession) return;
        currentSession.pageViews.push(page);
        saveSession(currentSession);
    }

    function trackClick(label) {
        if (!currentSession) return;
        currentSession.clicks.push({ label, time: new Date().toISOString() });
        saveSession(currentSession);
    }

    function trackWaitlistSignup(name, email) {
        if (!currentSession) return;
        currentSession.waitlistSignups += 1;
        currentSession.clicks.push({ label: 'waitlist_signup', time: new Date().toISOString() });
        saveSession(currentSession);
    }

    // ── Scroll depth ─────────────────────────────────────────────────────────

    let lastScrollThrottle = 0;
    window.addEventListener('scroll', () => {
        const now = Date.now();
        if (now - lastScrollThrottle < 500) return;
        lastScrollThrottle = now;
        if (!currentSession) return;
        const el = document.documentElement;
        const pct = Math.min(100, Math.round(((el.scrollTop + window.innerHeight) / el.scrollHeight) * 100));
        if (pct > (currentSession.scrollDepth || 0)) {
            currentSession.scrollDepth = pct;
        }
    }, { passive: true });

    // ── Rage clicks ──────────────────────────────────────────────────────────

    function getElementLabel(el) {
        if (!el) return 'unknown';
        if (el.id) return '#' + el.id;
        const text = (el.innerText || '').trim();
        if (text && text.length <= 40) return text;
        const cls = el.className && typeof el.className === 'string'
            ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
            : '';
        return el.tagName.toLowerCase() + cls;
    }

    document.addEventListener('click', (e) => {
        if (!currentSession) return;
        const target = e.target.closest('a, button, [data-track]') || e.target;
        const label = getElementLabel(target);
        const now = Date.now();

        const times = (recentClickTimes.get(label) || []).filter(t => now - t <= 600);
        times.push(now);
        recentClickTimes.set(label, times);

        if (times.length >= 3) {
            currentSession.rageClicks = currentSession.rageClicks || [];
            const last = currentSession.rageClicks[currentSession.rageClicks.length - 1];
            const isDuplicate = last && last.element === label && (now - new Date(last.timestamp).getTime()) < 2000;
            if (!isDuplicate) {
                currentSession.rageClicks.push({ element: label, timestamp: new Date().toISOString() });
                recentClickTimes.set(label, []); // reset teller na detectie
                saveSession(currentSession);
            }
        }
    });

    // ── Exit page ────────────────────────────────────────────────────────────

    window.addEventListener('beforeunload', () => {
        if (!currentSession) return;
        updateTimeSpent();
        const views = currentSession.pageViews || [];
        currentSession.exitPage = views.length > 0 ? views[views.length - 1] : null;
        saveSession(currentSession, true); // keepalive: true voor betrouwbaarheid bij unload
    });

    // ── Sessie starten / hervatten ───────────────────────────────────────────

    function startIntervals() {
        setInterval(updateTimeSpent, 5000);
        setInterval(() => { if (currentSession) saveSession(currentSession); }, 30000);
    }

    function resumeOrStartSession() {
        if (isAdminPage) return; // Admin-pagina telt niet mee als bezoeker

        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const savedId = sessionStorage.getItem(SESSION_STORAGE_KEY);

        startIntervals();

        if (savedId && isConfigured) {
            // Haal bestaande sessie op uit Firebase VOORDAT we iets opslaan.
            fetch(`${FIREBASE_URL}/sessions/${savedId}.json`)
                .then(r => {
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return r.json();
                })
                .then(existing => {
                    if (existing && existing.id) {
                        existing.lastActive = Date.now();
                        existing.pageViews = existing.pageViews || [];
                        if (!existing.pageViews.includes(currentPage)) {
                            existing.pageViews.push(currentPage);
                        }
                        // Zorg dat nieuwe velden bestaan op oude sessies
                        if (existing.rageClicks === undefined) existing.rageClicks = [];
                        if (existing.scrollDepth === undefined) existing.scrollDepth = 0;
                        currentSession = existing;
                    } else {
                        currentSession = createNewSession();
                        sessionStorage.setItem(SESSION_STORAGE_KEY, currentSession.id);
                    }
                    saveSession(currentSession);
                })
                .catch(err => {
                    console.error('[Analytics] Kon sessie niet laden uit Firebase:', err);
                    currentSession = createNewSession();
                    sessionStorage.setItem(SESSION_STORAGE_KEY, currentSession.id);
                    saveSession(currentSession);
                });
            return;
        }

        // Geen opgeslagen sessie → maak nieuwe aan
        currentSession = createNewSession();
        sessionStorage.setItem(SESSION_STORAGE_KEY, currentSession.id);
        saveSession(currentSession);
    }

    resumeOrStartSession();

    return {
        trackClick,
        trackPageView,
        trackWaitlistSignup,
        FIREBASE_URL
    };
})();

// Globale click-tracker voor alle knoppen
document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) {
        const text = btn.innerText.trim();
        if (text) {
            Analytics.trackClick(`Button: ${text}`);
        } else if (btn.id) {
            Analytics.trackClick(`Button ID: ${btn.id}`);
        }
    }
});
