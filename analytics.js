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
    const FIREBASE_URL = 'https://console.firebase.google.com/u/1/project/swapnest-20fe9/database/swapnest-20fe9-default-rtdb/data/~2F';
    // ▲▲▲ ─────────────────────────────────────────────────────── ▲▲▲

    let currentSession = null;

    // ── Firebase helpers ─────────────────────────────────────────────────────

    function saveSession(session) {
        if (!FIREBASE_URL || FIREBASE_URL.includes('JOUW_PROJECT')) return;
        fetch(`${FIREBASE_URL}/sessions/${session.id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(session)
        }).catch(() => {}); // Silently fail — breekt de site niet
    }

    // ── Sessie beheer ────────────────────────────────────────────────────────

    function generateSessionId() {
        return 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    }

    function startSession() {
        const urlParams = new URLSearchParams(window.location.search);
        let referrer = urlParams.get('ref') || document.referrer || 'direct';
        if (referrer === '') referrer = 'direct';

        currentSession = {
            id: generateSessionId(),
            startedAt: Date.now(),
            lastActive: Date.now(),
            timeSpentMs: 0,
            referrer: referrer,
            pageViews: [window.location.pathname.split('/').pop() || 'index.html'],
            clicks: [],
            waitlistSignups: 0
        };

        saveSession(currentSession);
        setInterval(updateTimeSpent, 5000);
        setInterval(() => saveSession(currentSession), 30000);
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

    // ── Sessie herstel bij navigatie ─────────────────────────────────────────
    const SESSION_STORAGE_KEY = 'swapnest_active_session';

    function resumeOrStartSession() {
        // sessionStorage (tab-scoped, niet persistent tussen tabs/apparaten)
        // gebruiken we alleen om de sessie-ID bij te houden tijdens navigatie
        // binnen dezelfde browsertab.
        const savedId = sessionStorage.getItem(SESSION_STORAGE_KEY);

        if (savedId) {
            // Herstel sessie in geheugen — haal huidige state op uit Firebase
            currentSession = {
                id: savedId,
                startedAt: Date.now(),
                lastActive: Date.now(),
                timeSpentMs: 0,
                referrer: 'direct',
                pageViews: [window.location.pathname.split('/').pop() || 'index.html'],
                clicks: [],
                waitlistSignups: 0
            };

            if (!FIREBASE_URL.includes('JOUW_PROJECT')) {
                // Laad bestaande sessie uit Firebase en merge
                fetch(`${FIREBASE_URL}/sessions/${savedId}.json`)
                    .then(r => r.json())
                    .then(existing => {
                        if (existing && existing.id) {
                            existing.lastActive = Date.now();
                            existing.pageViews = existing.pageViews || [];
                            existing.pageViews.push(
                                window.location.pathname.split('/').pop() || 'index.html'
                            );
                            currentSession = existing;
                            saveSession(currentSession);
                        }
                    })
                    .catch(() => {});
            }

            setInterval(updateTimeSpent, 5000);
            setInterval(() => saveSession(currentSession), 30000);
            return;
        }

        startSession();
        sessionStorage.setItem(SESSION_STORAGE_KEY, currentSession.id);
    }

    resumeOrStartSession();

    return {
        trackClick,
        trackPageView,
        trackWaitlistSignup,
        FIREBASE_URL // Beschikbaar voor admin-metrics.html
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
