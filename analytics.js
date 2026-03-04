/*
 * SwapNest Analytics Script
 */

const Analytics = (() => {
    const STORAGE_KEY = 'swapnest_metrics';
    let currentSession = null;

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

        // Update time spent every 5 seconds
        setInterval(updateTimeSpent, 5000);
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
    }

    function trackWaitlistSignup() {
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
    }

    // Auto-start session if not already running in this tab
    if (!currentSession) {
        startSession();
    }

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
