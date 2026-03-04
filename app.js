/* ─────────────────────────────────────────────
   THE SUSTAINABLE MOVE — App Logic (Auth-aware)
   ───────────────────────────────────────────── */

// ── Auth UI helpers ───────────────────────────

function updateNavAuth() {
  const user = Auth.currentUser();
  const navActions = document.getElementById('nav-actions');
  const mobileAuth = document.getElementById('nav-mobile-auth');
  if (!navActions || !mobileAuth) return;

  if (user) {
    navActions.innerHTML = `
      <button class="btn-secondary" style="color:rgba(255,255,255,0.8);border-color:rgba(255,255,255,0.2);"
        onclick="requireAuth(() => openModal('list-item-modal'))">+ List Item</button>
      <div class="nav-avatar" id="nav-avatar-btn" onclick="toggleDropdown()">
        <div class="nav-avatar-circle">${user.avatar}</div>
        <span class="nav-avatar-name">${user.name.split(' ')[0]}</span>
        <div class="nav-dropdown" id="nav-dropdown">
          <button class="nav-dd-item" onclick="goToDashboard()">👤 My Account</button>
          <div class="nav-dd-divider"></div>
          <button class="nav-dd-item danger" onclick="handleLogOut()">↩ Log Out</button>
        </div>
      </div>`;
    mobileAuth.innerHTML = `
      <button class="btn-sm" onclick="goToDashboard(); toggleMenu()">👤 My Account</button>
      <button class="btn-sm" style="color:#dc2626;border-color:#fca5a5;" onclick="handleLogOut()">↩ Log Out</button>`;
  } else {
    navActions.innerHTML = `
      <button class="btn-secondary" style="color:rgba(255,255,255,0.8);border-color:rgba(255,255,255,0.2);"
        onclick="openModal('login-modal')">Log In</button>
      <button class="btn-primary" onclick="openModal('signup-modal')">Sign Up Free</button>`;
    mobileAuth.innerHTML = `
      <button class="btn-sm" onclick="openModal('login-modal'); toggleMenu()">Log In</button>
      <button class="btn-primary" style="border-radius:10px;padding:10px 16px;" onclick="openModal('signup-modal'); toggleMenu()">Sign Up Free</button>`;
  }
}

function toggleDropdown() {
  const dd = document.getElementById('nav-dropdown');
  if (dd) dd.classList.toggle('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('#nav-avatar-btn')) {
    const dd = document.getElementById('nav-dropdown');
    if (dd) dd.classList.remove('open');
  }
});

// ── Auth Guard ────────────────────────────────

/**
 * requireAuth(action, pendingItem) — if logged in, run action immediately.
 * If not, open login modal and store action for after login.
 */
let _pendingAction = null;
let _pendingItemName = null;

function requireAuth(action, itemName) {
  if (Auth.isLoggedIn()) {
    action();
  } else {
    _pendingAction = action;
    _pendingItemName = itemName || null;
    openAuthGateModal(itemName);
  }
}

function openAuthGateModal(itemName) {
  // Show a friendly gate inside the login modal
  const modal = document.getElementById('login-modal');
  const err = document.getElementById('login-error');
  if (!modal || !err) return;
  err.style.display = 'block';
  err.className = 'auth-gate-notice';
  err.innerHTML = `
    <p>You need an account to ${itemName ? `reserve <strong>${itemName}</strong>` : 'do this'}.</p>
    <div class="auth-gate-buttons">
      <button class="btn-login-gate" type="button" onclick="/* already in login modal */">Log In</button>
      <button class="btn-signup-gate" type="button" onclick="switchAuthModal('signup')">Create Account</button>
    </div>`;
  openModal('login-modal');
}

function runPendingAction() {
  if (_pendingAction) {
    const fn = _pendingAction;
    _pendingAction = null;
    _pendingItemName = null;
    setTimeout(fn, 300); // slight delay so modal closes first
  }
}

// ── Onboarding ────────────────────────────────

function selectRole(role) {
  const overlay = document.getElementById('onboarding-overlay');
  const btns = document.querySelectorAll('.choice-card');
  btns.forEach(b => b.classList.remove('selected'));
  document.getElementById(role === 'moving' ? 'btn-moving' : 'btn-arriving').classList.add('selected');

  setTimeout(() => {
    overlay.classList.remove('active');
    if (role === 'arriving') {
      const el = document.getElementById('starter-packs');
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 300);
      } else {
        setTimeout(() => window.location.href = 'services.html#starter-packs', 300);
      }
    } else {
      const el = document.getElementById('marketplace');
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 300);
      } else {
        setTimeout(() => window.location.href = 'marketplace.html', 300);
      }
    }
  }, 500);
}

// ── Navbar Scroll ─────────────────────────────

const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });
}

function toggleMenu() {
  const navMobile = document.getElementById('nav-mobile');
  if (navMobile) navMobile.classList.toggle('open');
}

// ── Modal System ──────────────────────────────

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
  // Clear errors
  const err = document.getElementById(id.replace('-modal', '-error'));
  if (err) { err.style.display = 'none'; err.className = 'auth-error'; }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    document.body.style.overflow = '';
  }
});

// ── Auth Modal Switching ──────────────────────

function switchAuthModal(mode) {
  if (mode === 'signup') {
    closeModal('login-modal');
    setTimeout(() => openModal('signup-modal'), 200);
  } else {
    closeModal('signup-modal');
    setTimeout(() => openModal('login-modal'), 200);
  }
}

// ── Waitlist ───────────────────────────────────

function handleWaitlist(e) {
  e.preventDefault();
  const name = document.getElementById('waitlist-name').value;
  const email = document.getElementById('waitlist-email').value;

  // Track the signup using the analytics script if available
  if (typeof Analytics !== 'undefined') {
    Analytics.trackWaitlistSignup(name, email);
  }

  showToast(`🎉 Thanks ${name.split(' ')[0]}! You're on the waitlist.`);
  e.target.reset();
}

// ── Sign Up ───────────────────────────────────

function handleSignUp(e) {
  e.preventDefault();
  const errEl = document.getElementById('signup-error');
  errEl.style.display = 'none';

  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const role = document.querySelector('input[name="role"]:checked').value;

  const result = Auth.signUp({ name, email, password, role });
  if (!result.ok) {
    errEl.style.display = 'block';
    errEl.textContent = result.error;
    return;
  }

  closeModal('signup-modal');
  updateNavAuth();
  showToast(`🎉 Welcome to SwapNest, ${result.user.name.split(' ')[0]}!`);
  document.getElementById('signup-form').reset();

  runPendingAction();
}

// ── Log In ────────────────────────────────────

function handleLogIn(e) {
  e.preventDefault();
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  errEl.className = 'auth-error';

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const result = Auth.logIn({ email, password });
  if (!result.ok) {
    errEl.style.display = 'block';
    errEl.textContent = result.error;
    return;
  }

  closeModal('login-modal');
  updateNavAuth();
  showToast(`👋 Welcome back, ${result.user.name.split(' ')[0]}!`);
  document.getElementById('login-form').reset();

  runPendingAction();
}

// ── Log Out ───────────────────────────────────

function handleLogOut() {
  Auth.logOut();
  updateNavAuth();

  // Hide dashboard if it was visible
  const dashEl = document.getElementById('dashboard');
  if (dashEl) dashEl.style.display = 'none';

  showToast('👋 You have been logged out.');
}

// ── Dashboard ─────────────────────────────────

function goToDashboard() {
  const user = Auth.refreshSession();
  if (!user) return;

  const dashEl = document.getElementById('dashboard');
  if (dashEl) {
    dashEl.style.display = 'block';
    const dashNameEl = document.getElementById('dash-name');
    if (dashNameEl) dashNameEl.textContent = user.name.split(' ')[0];

    renderDashTab('reservations', user);
    dashEl.scrollIntoView({ behavior: 'smooth' });
  } else {
    window.location.href = 'dashboard.html';
  }
}

function switchDashTab(tab, btn) {
  document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');

  document.querySelectorAll('.dash-pane').forEach(p => p.style.display = 'none');
  const panel = document.getElementById(tab);
  if (panel) panel.style.display = 'block';

  // renderDashTab expects the short key (e.g. 'rentals'), strip 'dash-' prefix
  const shortTab = tab.replace(/^dash-/, '');
  const user = Auth.refreshSession();
  if (user) renderDashTab(shortTab, user);
}

function renderDashTab(tab, user) {
  const panel = document.getElementById(`dash-${tab}`);
  if (!panel) return;
  const items = user[tab] || [];

  if (items.length === 0) {
    const emptyMessages = {
      reservations: { icon: '📋', title: 'No reservations yet', desc: 'Reserve an item from the marketplace and it will appear here.' },
      listings: { icon: '🏷️', title: 'No listings yet', desc: 'List an item to sell and it will appear here.' },
      rentals: { icon: '📦', title: 'No rentals yet', desc: 'Book a starter pack or van and it will appear here.' },
      donations: { icon: '❤️', title: 'No donations yet', desc: 'Schedule a donation and it will appear here.' },
    };
    const m = emptyMessages[tab];
    if (!m) return;
    panel.innerHTML = `
      <div class="dash-empty">
        <div class="dash-empty-icon">${m.icon}</div>
        <h4>${m.title}</h4>
        <p>${m.desc}</p>
      </div>`;
    return;
  }

  const cards = items.map(item => {
    const date = new Date(item.reservedAt || item.bookedAt || item.scheduledAt || item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const statusClass = item.status || 'active';
    return `
      <div class="dash-item-card">
        <div class="dash-item-header">
          <h4>${item.name || item.type || item.org || 'Item'}</h4>
          <span class="dash-status ${statusClass}">${item.status || 'Active'}</span>
        </div>
        <div class="dash-item-meta">
          ${item.price ? `<span>💰 ${item.price}</span>` : ''}
          ${item.address ? `<span>📍 ${item.address}</span>` : ''}
          <span>📅 ${date}</span>
        </div>
      </div>`;
  }).join('');

  panel.innerHTML = `<div class="dash-items-grid">${cards}</div>`;
}

// ── Reserve Item Modal ────────────────────────

let _currentReservation = null;

function openReserveModal(name, price) {
  requireAuth(() => {
    _currentReservation = { name, price };
    const info = document.getElementById('reserve-item-info');
    const user = Auth.currentUser();
    info.innerHTML = `
      <div class="item-modal-preview">
        <strong>${name}</strong>
        <span>${price}</span>
      </div>
      <p style="font-size:0.85rem;color:var(--slate-500);margin-bottom:16px;">
        Reserving as <strong style="color:var(--slate-700);">${user.name}</strong> · ${user.email}
      </p>`;
    openModal('reserve-modal');
  }, name);
}

function handleReserve(e) {
  e.preventDefault();
  const user = Auth.currentUser();
  if (!user || !_currentReservation) return;

  Auth.addReservation({
    name: _currentReservation.name,
    price: _currentReservation.price,
    address: '',
  });

  closeModal('reserve-modal');
  showToast(`✅ ${_currentReservation.name} reserved! Check My Account for details.`);
  _currentReservation = null;
}

// ── Starter Pack Booking ──────────────────────

let _currentBooking = null;

function openBookingModal(name, price) {
  requireAuth(() => {
    _currentBooking = { name, price };
    const info = document.getElementById('booking-item-info');
    const user = Auth.currentUser();
    info.innerHTML = `
      <div class="item-modal-preview">
        <strong>${name}</strong>
        <span>${price}</span>
      </div>
      <p style="font-size:0.85rem;color:var(--slate-500);margin-bottom:16px;">
        Booking as <strong style="color:var(--slate-700);">${user.name}</strong>
      </p>`;
    openModal('booking-modal');
  }, name);
}

function handleBooking(e) {
  e.preventDefault();
  const user = Auth.currentUser();
  if (!user || !_currentBooking) return;

  const addr = document.querySelector('#booking-modal input[type="text"]:nth-of-type(1)');
  Auth.addRental({
    type: _currentBooking.name,
    price: _currentBooking.price,
    address: addr ? addr.value : '',
  });

  closeModal('booking-modal');
  showToast(`📦 ${_currentBooking.name} booked! Delivery within 24h.`);
  _currentBooking = null;
}

// ── Van Rental ────────────────────────────────

let _currentVan = null;

function openVanModal(name, price) {
  requireAuth(() => {
    _currentVan = { name, price };
    const info = document.getElementById('van-item-info');
    const user = Auth.currentUser();
    info.innerHTML = `
      <div class="item-modal-preview">
        <strong>${name}</strong>
        <span>${price}</span>
      </div>
      <p style="font-size:0.85rem;color:var(--slate-500);margin-bottom:16px;">
        Booking as <strong style="color:var(--slate-700);">${user.name}</strong>
      </p>`;
    openModal('van-modal');
  }, name);
}

function handleVanBooking(e) {
  e.preventDefault();
  const user = Auth.currentUser();
  if (!user || !_currentVan) return;

  Auth.addRental({ type: _currentVan.name, price: _currentVan.price });

  closeModal('van-modal');
  showToast(`🚐 ${_currentVan.name} booked! Confirmation sent to ${user.email}.`);
  _currentVan = null;
}

// ── Donate Modal ──────────────────────────────

let _currentOrg = null;

function openDonateModal(orgName) {
  requireAuth(() => {
    _currentOrg = orgName;
    const info = document.getElementById('donate-org-info');
    const user = Auth.currentUser();
    info.innerHTML = `
      <div class="item-modal-preview">
        <strong>${orgName}</strong>
      </div>
      <p style="font-size:0.85rem;color:var(--slate-500);margin-bottom:16px;">
        Scheduling as <strong style="color:var(--slate-700);">${user.name}</strong>
      </p>`;
    openModal('donate-modal');
  }, `donation to ${orgName}`);
}

function handleDonate(e) {
  e.preventDefault();
  const user = Auth.currentUser();
  if (!user) return;

  Auth.addDonation({ org: _currentOrg });

  closeModal('donate-modal');
  showToast(`❤️ Donation to ${_currentOrg} scheduled! Thank you.`);
  _currentOrg = null;
}

// ── Box Order Modal ───────────────────────────

const boxPrices = { sm: 2, md: 3, lg: 4 };
const boxQtys = { sm: 0, md: 0, lg: 0 };

function openBoxModal() {
  requireAuth(() => {
    Object.keys(boxQtys).forEach(k => { boxQtys[k] = 0; });
    ['sm', 'md', 'lg'].forEach(k => { document.getElementById(`qty-${k}`).textContent = '0'; });
    updateBoxTotal();
    openModal('box-modal');
  }, 'box rental');
}

function changeQty(size, delta) {
  boxQtys[size] = Math.max(0, boxQtys[size] + delta);
  document.getElementById(`qty-${size}`).textContent = boxQtys[size];
  updateBoxTotal();
}

function updateBoxTotal() {
  const total = Object.keys(boxQtys).reduce((s, k) => s + boxQtys[k] * boxPrices[k], 0);
  document.getElementById('box-total').textContent = `€${total}`;
}

function handleBoxOrder(e) {
  e.preventDefault();
  const user = Auth.currentUser();
  const total = Object.keys(boxQtys).reduce((s, k) => s + boxQtys[k] * boxPrices[k], 0);
  if (total === 0) { showToast('⚠️ Please select at least one box!'); return; }

  Auth.addRental({ type: 'Moving Box Rental', price: `€${total}/week` });
  closeModal('box-modal');
  showToast(`📦 Boxes ordered! Free delivery within Amsterdam in 24h.`);
}

// ── List Item Modal ───────────────────────────

function openListItemModal() {
  requireAuth(() => openModal('list-item-modal'), 'a listing');
}

function handleListItem(e) {
  e.preventDefault();
  const user = Auth.currentUser();
  const name = document.querySelector('#list-item-modal input[type="text"]').value;
  const price = document.querySelector('#list-item-modal input[type="number"]').value;
  const cat = document.querySelector('#list-item-modal select').value;

  Auth.addListing({ name, price: `€${price}`, category: cat });
  closeModal('list-item-modal');
  showToast(`🎉 "${name}" is now live on the marketplace!`);
  document.querySelector('#list-item-modal form').reset();
}

// ── Wishlist Toggle ───────────────────────────

function toggleWishlist(btn) {
  if (!Auth.isLoggedIn()) {
    requireAuth(() => { }, 'save to wishlist');
    return;
  }
  const isActive = btn.classList.toggle('active');
  btn.textContent = isActive ? '♥' : '♡';
  if (isActive) showToast('💚 Added to your wishlist!');
}

// ── Item Filtering ────────────────────────────

function filterItems(category, btnEl) {
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  let visibleCount = 0;
  document.querySelectorAll('.item-card').forEach(card => {
    const cat = card.dataset.category;
    const urgency = card.dataset.urgency;
    let show = category === 'all' ? true
      : category === 'today' ? urgency === 'today'
        : category === 'week' ? urgency === 'week'
          : cat === category;
    card.classList.toggle('hidden', !show);
    if (show) visibleCount++;
  });

  // Show/hide empty state
  const emptyState = document.getElementById('empty-state');
  if (emptyState) {
    emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
  }
}

// ── Item Sorting ──────────────────────────────

function sortItems(sortBy) {
  const grid = document.getElementById('items-grid');
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.item-card'));
  const urgencyOrder = { today: 0, week: 1 };

  cards.sort((a, b) => {
    if (sortBy === 'price-low') return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
    if (sortBy === 'price-high') return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
    if (sortBy === 'distance') return parseFloat(a.dataset.distance) - parseFloat(b.dataset.distance);
    if (sortBy === 'urgency') return (urgencyOrder[a.dataset.urgency] ?? 9) - (urgencyOrder[b.dataset.urgency] ?? 9);
    return 0;
  });

  cards.forEach(card => grid.appendChild(card));
}

// ── Load More Items ───────────────────────────

const extraItems = [
  { name: 'Wardrobe – White', cat: 'bedroom', urgency: 'week', price: 95, dist: 1.8, emoji: '👗', bg: 'linear-gradient(135deg,#e0c3fc,#9b72cf)' },
  { name: 'Coffee Table – Glass', cat: 'furniture', urgency: 'today', price: 40, dist: 0.5, emoji: '☕', bg: 'linear-gradient(135deg,#d4a373,#a0522d)' },
  { name: 'Lamp Set (3x)', cat: 'furniture', urgency: 'week', price: 25, dist: 2.4, emoji: '💡', bg: 'linear-gradient(135deg,#ffd6a5,#f4a261)' },
  { name: 'Blender + Toaster Set', cat: 'kitchen', urgency: 'today', price: 35, dist: 0.9, emoji: '🥤', bg: 'linear-gradient(135deg,#a8d8a8,#5cb85c)' },
  { name: 'Desk + Chair Combo', cat: 'furniture', urgency: 'week', price: 110, dist: 1.6, emoji: '🖥️', bg: 'linear-gradient(135deg,#b8c0e0,#6c7fc4)' },
  { name: 'Bookcase – Oak', cat: 'furniture', urgency: 'week', price: 60, dist: 3.2, emoji: '📚', bg: 'linear-gradient(135deg,#c9e4ca,#52b788)' },
];

let extraLoaded = false;
function loadMore() {
  if (extraLoaded) return;
  const grid = document.getElementById('items-grid');
  const btn = document.getElementById('load-more-btn');
  if (!grid || !btn) return;
  extraLoaded = true;

  extraItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.category = item.cat;
    card.dataset.urgency = item.urgency;
    card.dataset.price = item.price;
    card.dataset.distance = item.dist;
    card.innerHTML = `
      <div class="item-img" style="background:${item.bg};">
        <span class="item-emoji">${item.emoji}</span>
      </div>
      <div class="urgency-badge ${item.urgency}">${item.urgency === 'today' ? 'Available Today' : 'This Week'}</div>
      <div class="item-info">
        <div class="item-header">
          <h4>${item.name}</h4>
          <span class="item-price">€${item.price}</span>
        </div>
        <p class="item-desc">Well maintained, clean, and ready for pickup.</p>
        <div class="item-meta">
          <span>📍 ${item.dist} km</span>
          <span>⭐ 4.7</span>
        </div>
        <div class="item-actions">
          <button class="btn-reserve" onclick="openReserveModal('${item.name}', '€${item.price}')">Reserve Now</button>
          <button class="btn-wishlist" onclick="toggleWishlist(this)">♡</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });

  btn.textContent = 'All items loaded ✓';
  btn.disabled = true;
  btn.style.opacity = '0.5';
}

// ── Availability Slots ────────────────────────

function generateSlots() {
  const row = document.getElementById('slots-row');
  if (!row) return;
  const days = ['Mon Feb 24', 'Tue Feb 25', 'Wed Feb 26', 'Thu Feb 27', 'Fri Feb 28', 'Sat Mar 1'];
  const times = ['09:00', '13:00', '17:00'];
  const taken = [0, 3, 7];
  let idx = 0;

  days.forEach(day => {
    times.forEach(time => {
      const slot = document.createElement('div');
      const isTaken = taken.includes(idx);
      slot.className = `slot ${isTaken ? 'taken' : 'available'}`;
      slot.textContent = `${day} · ${time}`;
      if (!isTaken) {
        slot.addEventListener('click', function () {
          row.querySelectorAll('.slot.selected-slot').forEach(s => {
            s.classList.remove('selected-slot');
            s.style.cssText = '';
          });
          this.classList.add('selected-slot');
          this.style.background = 'var(--green-500)';
          this.style.color = 'white';
          showToast(`📅 Slot selected: ${day} at ${time}`);
        });
      }
      row.appendChild(slot);
      idx++;
    });
  });
}

generateSlots();

// ── Quiz Modal ────────────────────────────────

const quizData = [
  { q: "What type of item do you have?", opts: ["Furniture (large)", "Kitchen items", "Clothing / Textiles", "Electronics"] },
  { q: "What's the condition?", opts: ["Like new", "Used but good", "Some wear & tear"] },
  { q: "How quickly do you need it gone?", opts: ["Today / urgent!", "This week", "Within the month", "No rush"] },
];

let quizStep = 0;
const quizAnswers = [];

function openQuizModal() {
  quizStep = 0;
  quizAnswers.length = 0;
  renderQuiz();
  openModal('quiz-modal');
}

function renderQuiz() {
  const content = document.getElementById('quiz-content');
  if (quizStep >= quizData.length) {
    const isUrgent = quizAnswers[2] === 0;
    const isGood = quizAnswers[1] <= 1;
    let rec;
    if (isUrgent && isGood) rec = { icon: '🏪', title: 'List on the Marketplace', desc: "Your item is in great shape and someone needs it now. List it — it could be gone within hours!", btn: 'List Item Now', fn: () => { closeModal('quiz-modal'); requireAuth(() => openModal('list-item-modal'), 'a listing'); } };
    else if (!isGood || quizAnswers[2] >= 2) rec = { icon: '❤️', title: 'Donate It', desc: "Your item will find a loving home with a local charity.", btn: 'Find a Drop-off', fn: () => { closeModal('quiz-modal'); document.getElementById('donate').scrollIntoView({ behavior: 'smooth' }); } };
    else rec = { icon: '💰', title: 'Sell on the Marketplace', desc: "Your item has value! List it this week and earn cash while giving it a second life.", btn: 'List Item Now', fn: () => { closeModal('quiz-modal'); requireAuth(() => openModal('list-item-modal'), 'a listing'); } };

    content.innerHTML = `
      <div style="text-align:center;padding:12px 0;">
        <div style="font-size:3.5rem;margin-bottom:20px;">${rec.icon}</div>
        <h2 style="color:var(--slate-900);margin-bottom:12px;">Our Recommendation</h2>
        <h3 style="background:var(--grad-main);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:1.5rem;margin-bottom:16px;">${rec.title}</h3>
        <p style="color:var(--slate-500);margin-bottom:32px;line-height:1.7;">${rec.desc}</p>
        <button class="btn-primary full-width" onclick="(${rec.fn.toString()})()">${rec.btn}</button>
        <button class="btn-outline" style="margin-top:12px;width:100%;" onclick="openQuizModal()">Retake Quiz</button>
      </div>`;
    return;
  }

  const step = quizData[quizStep];
  const progress = Math.round((quizStep / quizData.length) * 100);
  content.innerHTML = `
    <div>
      <div style="margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="font-size:0.82rem;color:var(--slate-400);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Question ${quizStep + 1} of ${quizData.length}</span>
          <span style="font-size:0.82rem;color:var(--green-600);font-weight:600;">${progress}% done</span>
        </div>
        <div style="height:6px;background:var(--slate-100);border-radius:50px;overflow:hidden;">
          <div style="height:100%;width:${progress}%;background:var(--grad-main);border-radius:50px;transition:width 0.4s;"></div>
        </div>
      </div>
      <h2 style="font-size:1.3rem;color:var(--slate-900);margin-bottom:24px;">${step.q}</h2>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${step.opts.map((opt, i) => `
          <button onclick="selectQuizAnswer(${i})"
            style="background:var(--slate-50);border:1.5px solid var(--slate-200);border-radius:12px;padding:14px 18px;text-align:left;font-size:0.95rem;font-weight:500;cursor:pointer;transition:all 0.2s;color:var(--slate-700);"
            onmouseover="this.style.borderColor='var(--green-400)';this.style.background='var(--green-50)';this.style.color='var(--green-700)';"
            onmouseout="this.style.borderColor='var(--slate-200)';this.style.background='var(--slate-50)';this.style.color='var(--slate-700)';">
            ${opt}
          </button>`).join('')}
      </div>
    </div>`;
}

function selectQuizAnswer(idx) {
  quizAnswers.push(idx);
  quizStep++;
  renderQuiz();
}

// ── Payment Option Interaction ────────────────

document.addEventListener('click', (e) => {
  const opt = e.target.closest('.pay-opt');
  if (!opt) return;
  const group = opt.closest('.payment-options');
  if (!group) return;
  group.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('active'));
  opt.classList.add('active');

  const opt2 = e.target.closest('.role-opt');
  if (!opt2) return;
});

document.addEventListener('click', (e) => {
  const opt = e.target.closest('.role-opt');
  if (!opt) return;
  const group = opt.closest('.role-options');
  if (!group) return;
  group.querySelectorAll('.role-opt').forEach(o => o.classList.remove('active'));
  opt.classList.add('active');
});

// ── Toast Notification ────────────────────────

function showToast(message) {
  const toast = document.getElementById('toast');
  const msg = document.getElementById('toast-msg');
  if (!toast || !msg) return;
  msg.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── Scroll Animations ─────────────────────────

const navbar2 = document.getElementById('navbar');
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.style.color = link.getAttribute('href') === `#${entry.target.id}`
          ? 'white' : 'rgba(255,255,255,0.72)';
      });
    }
  });
}, { threshold: 0.3 });

sections.forEach(s => sectionObserver.observe(s));

function animateCounter(el, target, suffix = '') {
  const increment = target / 60;
  let current = 0;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = Math.floor(current).toLocaleString() + suffix;
  }, 16);
}

const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.stat-num, .impact-num').forEach(num => {
        const text = num.textContent.trim();
        const match = text.match(/[\d,]+/);
        if (match) {
          const val = parseInt(match[0].replace(/,/g, ''));
          const suffix = text.replace(/[\d,]+/, '');
          animateCounter(num, val, suffix);
        }
      });
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.hero-stats, .donate-stats-panel').forEach(el => counterObserver.observe(el));

const barObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const fill = entry.target.querySelector('.impact-bar-fill');
      if (fill) { const w = fill.style.width; fill.style.width = '0%'; setTimeout(() => fill.style.width = w, 100); }
      barObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.impact-bar-wrap').forEach(el => barObserver.observe(el));

// ── Init ──────────────────────────────────────

updateNavAuth();

// Skip onboarding overlay if already logged in
if (Auth.isLoggedIn()) {
  const onboardingEl = document.getElementById('onboarding-overlay');
  if (onboardingEl) onboardingEl.classList.remove('active');
}

console.log('🌿 SwapNest — auth-enabled app loaded');
