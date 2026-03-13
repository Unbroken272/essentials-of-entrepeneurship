/*
 * SwapNest Analytics Script
 * Sends data both to localStorage (for admin-metrics page)
 * AND to a Google Apps Script webhook (for global data collection).
 */

const Analytics = (() => {
    const STORAGE_KEY = 'swapnest_metrics';
    let currentSession = null;

    // ── Google Apps Script Webhook ───────────────────────────────
    // Replace this URL with your deployed Apps Script web app URL.
    // To set up: Google Sheets → Extensions → Apps Script → deploy doPost()
    const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwxjgO0YsbHI3v2Qgspr2p3jyhhzAYGikBtXGHRrteG8ITmsRF_rKd3n92R9qPyZOvb6Q/exec';

    function sendToSheet(payload) {
        if (!WEBHOOK_URL || WEBHOOK_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') return;
        try {
            fetch(WEBHOOK_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...payload,
                    timestamp: new Date().toISOString(),
                    page: window.location.pathname.split('/').pop() || 'index.html',
                    referrer: currentSession ? currentSession.referrer : 'unknown'
                })
            });
        } catch (e) {
            // Silently fail — don't break the site if webhook is down
        }
    }

    // Sends the full current session object as a snapshot so every device's
    // data is visible in Google Sheets and the admin-metrics dashboard.
    function syncSessionSnapshot() {
        if (!WEBHOOK_URL || WEBHOOK_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') return;
        if (!currentSession) return;
        try {
            fetch(WEBHOOK_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'session_snapshot', session: currentSession })
            });
        } catch (e) {
            // Silently fail
        }
    }

    // ── localStorage helpers (kept for admin-metrics) ───────────

    function generateSessionId() {
        return 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    }

    function getMetrics() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveMetrics(metrics) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
    }

    function startSession() {
        const urlParams = new URLSearchParams(window.location.search);
        let referrer = urlParams.get('ref') || document.referrer || 'direct';
        if (referrer === '') referrer = 'direct';

        currentSession = {
            id: generateSessionId(),
            startedAt: new Date().getTime(),
            lastActive: new Date().getTime(),
            timeSpentMs: 0,
            referrer: referrer,
            pageViews: [window.location.pathname.split('/').pop() || 'index.html'],
            clicks: [],
            waitlistSignups: 0
        };

        const metrics = getMetrics();
        metrics.push(currentSession);
        saveMetrics(metrics);

        // Log session start and push initial snapshot
        sendToSheet({ action: 'session_start', sessionId: currentSession.id });
        syncSessionSnapshot();
        // Update time spent every 5 seconds; sync snapshot every 30 seconds
        setInterval(updateTimeSpent, 5000);
        setInterval(syncSessionSnapshot, 30000);
    }

    function updateTimeSpent() {
        if (!currentSession) return;
        const metrics = getMetrics();
        const sessionIndex = metrics.findIndex(s => s.id === currentSession.id);

        if (sessionIndex !== -1) {
            const now = new Date().getTime();
            metrics[sessionIndex].timeSpentMs += (now - metrics[sessionIndex].lastActive);
            metrics[sessionIndex].lastActive = now;

            // Keep current session in sync
            currentSession = metrics[sessionIndex];
            saveMetrics(metrics);
        }
    }

    function trackPageView(page) {
        if (!currentSession) return;
        const metrics = getMetrics();
        const sessionIndex = metrics.findIndex(s => s.id === currentSession.id);

        if (sessionIndex !== -1) {
            metrics[sessionIndex].pageViews.push(page);
            currentSession = metrics[sessionIndex];
            saveMetrics(metrics);
        }
    }

    function trackClick(label) {
        if (!currentSession) return;
        const metrics = getMetrics();
        const sessionIndex = metrics.findIndex(s => s.id === currentSession.id);

        if (sessionIndex !== -1) {
            metrics[sessionIndex].clicks.push({
                label,
                time: new Date().toISOString()
            });
            currentSession = metrics[sessionIndex];
            saveMetrics(metrics);
        }

        // Send click event and sync full snapshot
        sendToSheet({ action: 'click', label: label });
        syncSessionSnapshot();
    }

    function trackWaitlistSignup(name, email) {
        if (!currentSession) return;
        const metrics = getMetrics();
        const sessionIndex = metrics.findIndex(s => s.id === currentSession.id);

        if (sessionIndex !== -1) {
            metrics[sessionIndex].waitlistSignups += 1;
            metrics[sessionIndex].clicks.push({
                label: 'waitlist_signup',
                time: new Date().toISOString()
            });
            currentSession = metrics[sessionIndex];
            saveMetrics(metrics);
        }

        // Send waitlist signup and sync full snapshot
        sendToSheet({ action: 'waitlist_signup', name: name || '', email: email || '' });
        syncSessionSnapshot();
    }

    // ── Session persistence across page navigations ────────────
    const SESSION_STORAGE_KEY = 'swapnest_active_session';

    function resumeOrStartSession() {
        const savedSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);

        if (savedSessionId) {
            // Try to resume the existing session from localStorage
            const metrics = getMetrics();
            const existingSession = metrics.find(s => s.id === savedSessionId);

            if (existingSession) {
                currentSession = existingSession;
                const currentPage = window.location.pathname.split('/').pop() || 'index.html';
                trackPageView(currentPage);
                // Restart timers
                setInterval(updateTimeSpent, 5000);
                setInterval(syncSessionSnapshot, 30000);
                syncSessionSnapshot();
                return;
            }
        }

        // No valid session found — start a fresh one
        startSession();
        sessionStorage.setItem(SESSION_STORAGE_KEY, currentSession.id);
    }

    resumeOrStartSession();

    // Export public methods
    return {
        trackClick,
        trackPageView,
        trackWaitlistSignup,
        getMetrics // useful for admin page
    };
})();

// Global click tracker for important buttons
document.addEventListener('click', (e) => {
    // Specifically track the Waitlist / Sign Up button
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
