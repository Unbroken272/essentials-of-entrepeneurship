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
    const isAdminPage = window.location.pathname.includes('admin-metrics');
    const isConfigured = !FIREBASE_URL.includes('JOUW_PROJECT');

    let currentSession = null; // null = sessie nog niet klaar (laden of niet geconfigureerd)

    // ── Firebase helpers ─────────────────────────────────────────────────────

    function saveSession(session) {
        if (!isConfigured || !session) return;
        fetch(`${FIREBASE_URL}/sessions/${session.id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(session)
        }).catch(err => console.error('[Analytics] Firebase write fout:', err));
    }

    // ── Sessie beheer ────────────────────────────────────────────────────────

    function generateSessionId() {
        return 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    }

    function createNewSession() {
        const urlParams = new URLSearchParams(window.location.search);
        let referrer = urlParams.get('ref') || document.referrer || 'direct';
        if (referrer === '') referrer = 'direct';

        return {
            id: generateSessionId(),
            startedAt: Date.now(),
            lastActive: Date.now(),
            timeSpentMs: 0,
            referrer: referrer,
            pageViews: [window.location.pathname.split('/').pop() || 'index.html'],
            clicks: [],
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
            // currentSession blijft null totdat Firebase antwoord geeft,
            // zodat er geen lege data kan worden weggeschreven (race condition fix).
            fetch(`${FIREBASE_URL}/sessions/${savedId}.json`)
                .then(r => {
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return r.json();
                })
                .then(existing => {
                    if (existing && existing.id) {
                        // Bestaande sessie gevonden — voeg huidige pagina toe
                        existing.lastActive = Date.now();
                        existing.pageViews = existing.pageViews || [];
                        if (!existing.pageViews.includes(currentPage)) {
                            existing.pageViews.push(currentPage);
                        }
                        currentSession = existing;
                    } else {
                        // Sessie bestaat niet meer in Firebase — begin opnieuw
                        currentSession = createNewSession();
                        sessionStorage.setItem(SESSION_STORAGE_KEY, currentSession.id);
                    }
                    saveSession(currentSession);
                })
                .catch(err => {
                    console.error('[Analytics] Kon sessie niet laden uit Firebase:', err);
                    // Fallback: begin nieuwe sessie
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
