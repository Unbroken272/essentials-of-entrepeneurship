/* ─────────────────────────────────────────────
   THE SUSTAINABLE MOVE — Authentication Module
   ─────────────────────────────────────────────
   Uses localStorage for persistence.
   No real server — this is a frontend MVP demo.
   ───────────────────────────────────────────── */

const Auth = (() => {

    const USERS_KEY = 'tsm_users';
    const SESSION_KEY = 'tsm_session';

    // ── Helpers ──────────────────────────────────

    function getUsers() {
        try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
        catch { return []; }
    }

    function saveUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function getSession() {
        try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; }
        catch { return null; }
    }

    function saveSession(user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    }

    function clearSession() {
        localStorage.removeItem(SESSION_KEY);
    }

    // Tiny hash — good enough for a frontend demo
    function hashPassword(pw) {
        let h = 0;
        for (let i = 0; i < pw.length; i++) {
            h = (Math.imul(31, h) + pw.charCodeAt(i)) | 0;
        }
        return h.toString(36);
    }

    // ── Public API ────────────────────────────────

    function signUp({ name, email, password, role }) {
        const users = getUsers();

        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            return { ok: false, error: 'An account with this email already exists.' };
        }
        if (password.length < 6) {
            return { ok: false, error: 'Password must be at least 6 characters.' };
        }

        const user = {
            id: `usr_${Date.now()}`,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: hashPassword(password),
            role: role || 'buyer',   // 'buyer' | 'seller' | 'both'
            joinedAt: new Date().toISOString(),
            avatar: name.trim().slice(0, 2).toUpperCase(),
            listings: [],
            reservations: [],
            rentals: [],
            donations: [],
        };

        users.push(user);
        saveUsers(users);

        // Strip password before storing in session
        const { password: _, ...sessionUser } = user;
        saveSession(sessionUser);
        return { ok: true, user: sessionUser };
    }

    function logIn({ email, password }) {
        const users = getUsers();
        const found = users.find(u => u.email === email.trim().toLowerCase());

        if (!found) {
            return { ok: false, error: 'No account found with that email.' };
        }
        if (found.password !== hashPassword(password)) {
            return { ok: false, error: 'Incorrect password.' };
        }

        const { password: _, ...sessionUser } = found;
        saveSession(sessionUser);
        return { ok: true, user: sessionUser };
    }

    function logOut() {
        clearSession();
    }

    function currentUser() {
        return getSession();
    }

    function isLoggedIn() {
        return !!getSession();
    }

    // Add a listing to the logged-in user's account
    function addListing(listing) {
        const session = getSession();
        if (!session) return;

        const users = getUsers();
        const idx = users.findIndex(u => u.id === session.id);
        if (idx === -1) return;

        const entry = { ...listing, id: `lst_${Date.now()}`, createdAt: new Date().toISOString() };
        users[idx].listings.push(entry);
        saveUsers(users);

        // Refresh session
        const { password: _, ...updated } = users[idx];
        saveSession(updated);
        return entry;
    }

    // Add a reservation to the logged-in user's account
    function addReservation(item) {
        const session = getSession();
        if (!session) return;

        const users = getUsers();
        const idx = users.findIndex(u => u.id === session.id);
        if (idx === -1) return;

        const entry = { ...item, id: `res_${Date.now()}`, reservedAt: new Date().toISOString(), status: 'confirmed' };
        users[idx].reservations.push(entry);
        saveUsers(users);

        const { password: _, ...updated } = users[idx];
        saveSession(updated);
        return entry;
    }

    // Add a rental (van or starter pack)
    function addRental(rental) {
        const session = getSession();
        if (!session) return;

        const users = getUsers();
        const idx = users.findIndex(u => u.id === session.id);
        if (idx === -1) return;

        const entry = { ...rental, id: `rnt_${Date.now()}`, bookedAt: new Date().toISOString(), status: 'upcoming' };
        users[idx].rentals.push(entry);
        saveUsers(users);

        const { password: _, ...updated } = users[idx];
        saveSession(updated);
        return entry;
    }

    // Add a donation schedule
    function addDonation(donation) {
        const session = getSession();
        if (!session) return;

        const users = getUsers();
        const idx = users.findIndex(u => u.id === session.id);
        if (idx === -1) return;

        const entry = { ...donation, id: `don_${Date.now()}`, scheduledAt: new Date().toISOString(), status: 'scheduled' };
        users[idx].donations.push(entry);
        saveUsers(users);

        const { password: _, ...updated } = users[idx];
        saveSession(updated);
        return entry;
    }

    // Refresh session from users store (to pick up mutations)
    function refreshSession() {
        const session = getSession();
        if (!session) return null;
        const users = getUsers();
        const found = users.find(u => u.id === session.id);
        if (!found) return null;
        const { password: _, ...updated } = found;
        saveSession(updated);
        return updated;
    }

    function updateUser({ name, email }) {
        const session = getSession();
        if (!session) return { ok: false, error: 'Not logged in' };

        const users = getUsers();
        const idx = users.findIndex(u => u.id === session.id);
        if (idx === -1) return { ok: false, error: 'User not found' };

        if (email.toLowerCase() !== users[idx].email) {
            if (users.find(u => u.id !== session.id && u.email.toLowerCase() === email.toLowerCase())) {
                return { ok: false, error: 'Email already in use.' };
            }
        }

        users[idx].name = name.trim();
        users[idx].email = email.trim().toLowerCase();
        users[idx].avatar = name.trim().slice(0, 2).toUpperCase();

        saveUsers(users);

        const { password: _, ...updated } = users[idx];
        saveSession(updated);
        return { ok: true, user: updated };
    }

    return { signUp, logIn, logOut, currentUser, isLoggedIn, addListing, addReservation, addRental, addDonation, refreshSession, updateUser };

})();
