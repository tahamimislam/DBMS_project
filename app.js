
// =====================================================
// HumanityLink — app.js
// PHP + MySQL backend version
// All data comes from /api/*.php via fetch()
// =====================================================

// ── Global State ──────────────────────────────────────────
const HL = {
  currentUser: null,   // set from api/me.php on page load
  foodPosts:   []      // set from api/food_posts.php
};

// ── API Helpers ───────────────────────────────────────────
const API = 'api/';

async function apiGet(endpoint) {
  if (window.location.protocol === 'file:') {
    return { ok: false, msg: 'Cannot run PHP via file://. Please open via http://localhost/HumanityLink/ (with XAMPP running).' };
  }
  try {
    const res = await fetch(API + endpoint);
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      return errData || { ok: false, msg: `Server error (${res.status}). Check PHP/MySQL.` };
    }
    return await res.json();
  } catch (e) {
    return { ok: false, msg: 'Network error. Please make sure Apache and MySQL are running in XAMPP and open via http://localhost/HumanityLink/' };
  }
}

async function apiPost(endpoint, data) {
  if (window.location.protocol === 'file:') {
    return { ok: false, msg: 'Cannot run PHP via file://. Please open via http://localhost/HumanityLink/ (with XAMPP running).' };
  }
  try {
    const res = await fetch(API + endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      return errData || { ok: false, msg: `Server error (${res.status}). Check PHP/MySQL.` };
    }
    return await res.json();
  } catch (e) {
    return { ok: false, msg: 'Network error. Please make sure Apache and MySQL are running in XAMPP and open via http://localhost/HumanityLink/' };
  }
}

// Load all food posts into HL.foodPosts
async function loadFoodPosts() {
  const res = await apiGet('food_posts.php');
  if (res.ok) HL.foodPosts = res.posts;
}

// ── Utilities ─────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = {
    success: '<i class="fa-solid fa-circle-check"></i>',
    error:   '<i class="fa-solid fa-circle-xmark"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
    info:    '<i class="fa-solid fa-circle-info"></i>'
  };
  toast.innerHTML = `<span>${icons[type] || icons.success}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all .3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });
}

function foodTypeIcon(type) {
  const map = {
    'Cooked Meal':       '<i class="fa-solid fa-bowl-rice"></i>',
    'Bakery':            '<i class="fa-solid fa-bread-slice"></i>',
    'Fruits & Vegetables': '<i class="fa-solid fa-apple-whole"></i>',
    'Beverages':         '<i class="fa-solid fa-mug-hot"></i>',
    'Dry Food':          '<i class="fa-solid fa-wheat-awn"></i>',
    'Other':             '<i class="fa-solid fa-box-open"></i>'
  };
  return map[type] || '<i class="fa-solid fa-utensils"></i>';
}
const foodTypeEmoji = foodTypeIcon;

// ── Navbar ────────────────────────────────────────────────
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
  });

  const hamburger = document.querySelector('.hamburger');
  const navLinks  = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (!navbar.contains(e.target)) navLinks.classList.remove('open');
    });
  }
}

function renderNavAuth() {
  const actionsEl = document.getElementById('nav-actions');
  if (!actionsEl) return;

  const isDark = document.documentElement.classList.contains('dark-theme');
  const themeBtn = `<button class="theme-toggle-btn" id="themeToggleBtn" onclick="toggleTheme()" aria-label="${isDark ? 'Switch to light mode' : 'Switch to dark mode'}" title="Toggle theme">${isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>'}</button>`;

  if (HL.currentUser) {
    const initials  = HL.currentUser.fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const dashLink  = HL.currentUser.accountType === 'restaurant' ? 'dashboard.html' : 'food-support.html';
    actionsEl.innerHTML = `
      ${themeBtn}
      <div class="nav-user-menu" id="navUserMenu">
        <button class="nav-user-btn" id="navUserBtn">
          <div class="avatar">${initials}</div>
          <span>${HL.currentUser.fullName.split(' ')[0]}</span>
          <i class="fa-solid fa-chevron-down"></i>
        </button>
        <div class="nav-dropdown" id="navDropdown">
          <a href="${dashLink}"><i class="fa-solid fa-chart-pie"></i> Dashboard</a>
          <hr>
          <button onclick="doLogout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> Log Out</button>
        </div>
      </div>`;

    const menu = document.getElementById('navUserMenu');
    const btn  = document.getElementById('navUserBtn');
    if (btn) btn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('open'); });
    document.addEventListener('click', () => { if (menu) menu.classList.remove('open'); });
  } else {
    actionsEl.innerHTML = `
      ${themeBtn}
      <a href="auth.html" class="btn btn-outline btn-sm" id="nav-login-btn">Log In</a>
      <a href="auth.html?tab=register" class="btn btn-primary btn-sm" id="nav-register-btn">Register</a>`;
  }
}

function renderSidebarAccount() {
  const accountEl = document.getElementById('sidebarAccount');
  const popupEl   = document.getElementById('sidebarAccountPopup');
  if (!accountEl) return;

  if (!HL.currentUser) {
    accountEl.innerHTML = `
      <a href="auth.html" class="app-sidebar-link" style="color:rgba(255,255,255,.6)">
        <span class="asbl-icon"><i class="fa-solid fa-right-to-bracket"></i></span>
        <span class="asbl-text">Log In</span>
      </a>`;
    return;
  }

  const initials  = HL.currentUser.fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const typeLabel = { restaurant: 'Restaurant', charity: 'Charity Org', user: 'General User' }[HL.currentUser.accountType] || HL.currentUser.accountType;

  accountEl.innerHTML = `
    <button class="app-sidebar-account-btn" id="sidebarAccountBtn" type="button" title="Account profile & options">
      <div class="app-sidebar-account-avatar">${initials}</div>
      <div class="app-sidebar-account-info">
        <div class="app-sidebar-account-name">${HL.currentUser.fullName}</div>
        <div class="app-sidebar-account-type">${typeLabel}</div>
      </div>
      <i class="fa-solid fa-chevron-up app-sidebar-account-chevron"></i>
    </button>`;

  // Toggle popup on account profile click
  const btn = document.getElementById('sidebarAccountBtn');
  if (btn && popupEl) {
    btn.onclick = (e) => {
      e.stopPropagation();
      const isOpen = btn.classList.toggle('open');
      popupEl.classList.toggle('hidden', !isOpen);
    };

    popupEl.onclick = (e) => {
      e.stopPropagation();
    };

    document.addEventListener('click', () => {
      btn.classList.remove('open');
      popupEl.classList.add('hidden');
    });
  }
}

function openSettingsModal() {
  const popupEl = document.getElementById('sidebarAccountPopup');
  const btn = document.getElementById('sidebarAccountBtn');
  if (popupEl) popupEl.classList.add('hidden');
  if (btn) btn.classList.remove('open');

  if (!HL.currentUser) {
    window.location.href = 'auth.html';
    return;
  }

  const modal = document.getElementById('settingsModal');
  if (!modal) return;

  const initials  = HL.currentUser.fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const typeLabel = { restaurant: 'Restaurant / Community Center', charity: 'Charity Organization', user: 'General User' }[HL.currentUser.accountType] || HL.currentUser.accountType;

  const avatarEl = document.getElementById('sm-avatar');
  const typeEl   = document.getElementById('sm-type-badge');
  const nameInp  = document.getElementById('sm-name');
  const emailInp = document.getElementById('sm-email');
  const phoneInp = document.getElementById('sm-phone');
  const addrInp  = document.getElementById('sm-address');
  const regInp   = document.getElementById('sm-reg');
  const regRow   = document.getElementById('sm-reg-group');

  if (avatarEl) avatarEl.textContent = initials;
  if (typeEl)   typeEl.textContent   = typeLabel;
  if (nameInp)  nameInp.value        = HL.currentUser.fullName || '';
  if (emailInp) emailInp.value       = HL.currentUser.email || '';
  if (phoneInp) phoneInp.value       = HL.currentUser.phone || '';
  if (addrInp)  addrInp.value        = HL.currentUser.address || '';
  if (regInp)   regInp.value         = HL.currentUser.regNumber || '';
  if (regRow) {
    regRow.style.display = 'block';
    const regLabel = regRow.querySelector('label');
    if (regLabel) {
      regLabel.innerHTML = (HL.currentUser.accountType === 'user' ? 'NID / Identification Number' : 'Registration Number / Trade License') + ' <span class="req">*</span>';
    }
  }

  const errEl = document.getElementById('settings-error');
  if (errEl) errEl.style.display = 'none';

  modal.classList.add('show');
}

function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) modal.classList.remove('show');
}

async function saveSettings(e) {
  if (e) e.preventDefault();
  const errEl = document.getElementById('settings-error');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

  const smNameEl = document.getElementById('sm-name');
  const smPhoneEl = document.getElementById('sm-phone');
  const smAddrEl = document.getElementById('sm-address');
  const smRegEl = document.getElementById('sm-reg');
  
  const fullName = smNameEl ? smNameEl.value.trim() : '';
  const phone    = smPhoneEl ? smPhoneEl.value.trim() : '';
  const address  = smAddrEl ? smAddrEl.value.trim() : '';
  const regNumber= (smRegEl ? smRegEl.value.trim() : '') || '';

  if (!fullName) {
    if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'Name is required.'; }
    return;
  }

  if (!regNumber) {
    if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'Registration / NID number is required.'; }
    return;
  }

  // Phone regex check
  const phoneRegex = /^(?:\+?880|880|0)?[- ]?1[3-9]\d{2}[- ]?\d{6}$/;
  if (phone && !phoneRegex.test(phone)) {
    if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'Please enter a valid Bangladeshi phone number (e.g. 017XXXXXXXX or +880-17XXXXXXXX).'; }
    return;
  }

  const btn = document.getElementById('save-settings-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…'; }

  const res = await apiPost('profile.php', {
    fullName,
    phone,
    address,
    regNumber
  });

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Changes'; }

  if (!res.ok) {
    if (errEl) { errEl.style.display = 'block'; errEl.textContent = res.msg || 'Failed to update settings.'; }
    return;
  }

  HL.currentUser = res.user;
  if (HL.currentUser && HL.currentUser.id != null) {
    HL.currentUser.id = Number(HL.currentUser.id);
  }
  showToast('Settings updated successfully!', 'success');
  closeSettingsModal();

  // Re-render sidebar account and name on dashboard if present
  renderSidebarAccount();
  const nameEl = document.getElementById('dash-name');
  if (nameEl) nameEl.textContent = HL.currentUser.fullName.split(' ')[0];
}

async function doLogout() {
  await apiPost('logout.php', {});
  HL.currentUser = null;
  showToast('Logged out successfully.', 'info');
  setTimeout(() => window.location.href = 'index.html', 800);
}

// ── Offerings Modal (Processes & Live Stats) ─────────────
const HL_OFFERINGS_DATA = {
  food: {
    title: 'Food Support',
    emoji: '<i class="fa-solid fa-utensils"></i>',
    tag:   'Surplus Food Recovery & Distribution',
    desc:  'Connecting restaurants and community centers with verified charity organizations to turn surplus meals into immediate hunger relief.',
    process: [
      { step: '1', title: 'Restaurant / Community Center' },
      { step: '2', title: 'Food Donation Posted' },
      { step: '3', title: 'Charity Organization Claims' },
      { step: '4', title: 'Distribution' },
      { step: '5', title: 'Completed' }
    ],
    stats: [
      { num: '0', label: 'Food Posts Shared' },
      { num: '0', label: 'Successfully Distributed' },
      { num: '0', label: 'Active Food Donations' },
      { num: '0%', label: 'Delivery Success Rate' }
    ],
    recent: [],
    primaryBtn: { label: 'Explore Food Support Board →', href: 'food-support.html' }
  },
  medical: {
    title: 'Medical & Welfare Support',
    emoji: '<i class="fa-solid fa-notes-medical"></i>',
    tag:   'Healthcare Aid & Emergency Response',
    desc:  'Coordinating emergency medical assistance, doctor volunteer camps, and welfare aid for destitute and distressed individuals.',
    process: [
      { step: '1', title: 'User Reports Case' },
      { step: '2', title: 'Charity Organization Reviews' },
      { step: '3', title: 'Case Accepted' },
      { step: '4', title: 'Action Taken' },
      { step: '5', title: 'Completed' }
    ],
    stats: [
      { num: '0', label: 'Medical Cases Reported' },
      { num: '0', label: 'Treated & Aided' },
      { num: '0', label: 'Free Medical Camps' },
      { num: '0%', label: 'Response Rate' }
    ],
    recent: []
  },
  financial: {
    title: 'Financial Support',
    emoji: '<i class="fa-solid fa-hand-holding-dollar"></i>',
    tag:   'Transparent Welfare Crowdfunding',
    desc:  'Transparent fundraising campaigns for urgent medical emergencies, disaster relief, and destitute family rehabilitation.',
    process: [
      { step: '1', title: 'Charity Organization Creates Campaign' },
      { step: '2', title: 'User Donates' },
      { step: '3', title: 'Transaction Recorded' },
      { step: '4', title: 'Donation History Updated' }
    ],
    stats: [
      { num: '৳ 0', label: 'Total Funds Raised' },
      { num: '0', label: 'Verified Campaigns' },
      { num: '0', label: 'Generous Donors' },
      { num: '0%', label: 'Audited Transparency' }
    ],
    recent: []
  },
  education: {
    title: 'Education Support',
    emoji: '<i class="fa-solid fa-graduation-cap"></i>',
    tag:   'Empowering Underprivileged Scholars',
    desc:  'Connecting underprivileged students with sponsors and educational trusts.',
    process: [
      { step: '1', title: 'Applicant Applies' },
      { step: '2', title: 'Documents Submitted' },
      { step: '3', title: 'Verification' },
      { step: '4', title: 'Approval' },
      { step: '5', title: 'Fund Distribution' },
      { step: '6', title: 'Record Updated' }
    ],
    stats: [
      { num: '0', label: 'Students Sponsored' },
      { num: '৳ 0', label: 'Scholarships Awarded' },
      { num: '0', label: 'University Seats Funded' },
      { num: '0%', label: 'Academic Retention' }
    ],
    recent: []
  }
};

HL.openOfferingModal = async function(type) {
  const data = HL_OFFERINGS_DATA[type];
  if (!data) return;

  let modalEl = document.getElementById('offeringModalOverlay');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'offeringModalOverlay';
    modalEl.className = 'modal-overlay';
    document.body.appendChild(modalEl);
  }

  // Real-time calculation for stats & recent records
  let currentStats = [...data.stats];
  let recentHTML = '';

  if (type === 'food') {
    if (!HL.foodPosts || !HL.foodPosts.length) {
      await loadFoodPosts();
    }
    const total = HL.foodPosts ? HL.foodPosts.length : 0;
    const claimed = HL.foodPosts ? HL.foodPosts.filter(p => p.claimedBy).length : 0;
    const active = total - claimed;
    const rate = total > 0 ? Math.round((claimed / total) * 100) + '%' : '0%';

    currentStats = [
      { num: String(total), label: 'Food Posts Shared' },
      { num: String(claimed), label: 'Successfully Distributed' },
      { num: String(active), label: 'Active Food Donations' },
      { num: rate, label: 'Delivery Success Rate' }
    ];

    const claimedPosts = HL.foodPosts ? HL.foodPosts.filter(p => p.claimedBy).slice(0, 3) : [];
    if (claimedPosts.length > 0) {
      recentHTML = claimedPosts.map(p => `
        <div class="offering-recent-card">
          <div class="recent-card-top"><span class="recent-badge"><i class="fa-solid fa-circle-check"></i> Distributed</span></div>
          <div class="recent-parties">${p.postedByName} ➔ ${p.claimedByName || 'Charity'}</div>
          <div class="recent-item">${p.quantity} &bull; ${p.foodName} (${p.foodType})</div>
          <div class="recent-meta"><i class="fa-solid fa-location-dot"></i> ${p.address || 'Dhaka'} &bull; <i class="fa-regular fa-calendar"></i> Pickup: ${formatDate(p.pickupDate)}</div>
        </div>`).join('');
    } else {
      recentHTML = `<div class="empty-state" style="padding:22px;grid-column:1/-1;text-align:center;color:var(--muted);font-size:.85rem"><i class="fa-solid fa-clock-rotate-left" style="font-size:1.4rem;display:block;margin-bottom:8px;opacity:.6"></i>No completed distribution records yet. Initialized at 0.</div>`;
    }
  } else {
    recentHTML = `<div class="empty-state" style="padding:22px;grid-column:1/-1;text-align:center;color:var(--muted);font-size:.85rem"><i class="fa-solid fa-clock-rotate-left" style="font-size:1.4rem;display:block;margin-bottom:8px;opacity:.6"></i>No verified records yet. Initialized at 0.</div>`;
  }

  const stepsHTML  = data.process.map(s => `
    <div class="offering-step">
      <div class="offering-step-num">${s.step}</div>
      <h5>${s.title}</h5>
    </div>`).join('');

  const statsHTML  = currentStats.map(st => `
    <div class="offering-stat-box">
      <div class="offering-stat-num">${st.num}</div>
      <div class="offering-stat-label">${st.label}</div>
    </div>`).join('');

  let actionBtns = '';
  if (!HL.currentUser) {
    actionBtns = `<a href="auth.html?tab=register" class="btn btn-primary btn-sm">Register to Participate</a>
                  <a href="auth.html" class="btn btn-outline btn-sm">Log In</a>`;
    if (data.primaryBtn) actionBtns = `<a href="${data.primaryBtn.href}" class="btn btn-secondary btn-sm">${data.primaryBtn.label}</a>` + actionBtns;
  } else {
    actionBtns = data.primaryBtn
      ? `<a href="${data.primaryBtn.href}" class="btn btn-primary btn-sm">${data.primaryBtn.label}</a>`
      : `<a href="dashboard.html" class="btn btn-primary btn-sm">Go to Dashboard</a>`;
  }

  modalEl.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header">
        <div>
          <div class="offering-badge">${data.emoji} ${data.tag}</div>
          <h3 class="offering-title-clean">${data.title}</h3>
        </div>
        <button class="modal-close" onclick="HL.closeOfferingModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <p class="offering-desc-clean">${data.desc}</p>
      <div class="subheading-label"><i class="fa-solid fa-list-check"></i> How It Works &mdash; Process</div>
      <div class="offering-steps-grid">${stepsHTML}</div>
      <div class="subheading-label"><i class="fa-solid fa-chart-line"></i> Success History &mdash; Impact at a Glance</div>
      <div class="offering-stats-grid">${statsHTML}</div>
      <div class="subheading-label"><i class="fa-solid fa-star"></i> Recent Success Details &mdash; Verified Records</div>
      <div class="offering-recent-grid">${recentHTML}</div>
      <div class="offering-actions">
        <button class="btn btn-ghost btn-sm" onclick="HL.closeOfferingModal()">Close</button>
        ${actionBtns}
      </div>
    </div>`;

  modalEl.classList.add('show');
  modalEl.onclick = e => { if (e.target === modalEl) HL.closeOfferingModal(); };
};

HL.closeOfferingModal = function() {
  const modalEl = document.getElementById('offeringModalOverlay');
  if (modalEl) modalEl.classList.remove('show');
};

function handleOfferingClick(type) {
  HL.openOfferingModal(type);
}

// ── Auth Page ─────────────────────────────────────────────
let selectedAccountType = null;

function switchTab(tab) {
  const loginForm    = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabLogin     = document.getElementById('tab-login');
  const tabRegister  = document.getElementById('tab-register');
  if (!loginForm || !registerForm) return;
  loginForm.classList.toggle('hidden', tab !== 'login');
  registerForm.classList.toggle('hidden', tab !== 'register');
  if (tabLogin)    tabLogin.classList.toggle('active', tab === 'login');
  if (tabRegister) tabRegister.classList.toggle('active', tab === 'register');
}

function selectType(type) {
  selectedAccountType = type;
  document.querySelectorAll('.account-type-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.getElementById('type-' + type);
  if (btn) btn.classList.add('selected');
  const labels = { charity: 'Charity Organization Full Name', restaurant: 'Restaurant / Community Center Full Name', user: 'Full Name' };
  const labelEl = document.getElementById('reg-name-label');
  if (labelEl) labelEl.innerHTML = (labels[type] || 'Full Name') + ' <span class="req">*</span>';
  const typeErr = document.getElementById('type-error');
  if (typeErr) typeErr.style.display = 'none';
}

function togglePw(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  const isPw = inp.type === 'password';
  inp.type = isPw ? 'text' : 'password';
  btn.innerHTML = isPw ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
}

async function doLogin(e) {
  if (e) e.preventDefault();
  const emailInput = document.getElementById('login-email');
  const pwInput    = document.getElementById('login-password');
  const err        = document.getElementById('login-error');
  if (!emailInput || !pwInput) return;

  const btn = document.getElementById('login-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Logging in…'; }

  const res = await apiPost('login.php', {
    email:    emailInput.value.trim(),
    password: pwInput.value
  });

  if (btn) { btn.disabled = false; btn.textContent = 'Log In'; }

  if (!res.ok) {
    if (err) { err.style.display = 'block'; err.textContent = res.msg; }
    return;
  }
  if (err) err.style.display = 'none';
  HL.currentUser = res.user;
  if (HL.currentUser && HL.currentUser.id != null) {
    HL.currentUser.id = Number(HL.currentUser.id);
  }
  showToast('Welcome back, ' + res.user.fullName.split(' ')[0] + '!', 'success');
  const dest = res.user.accountType === 'restaurant' ? 'dashboard.html'
             : res.user.accountType === 'charity'    ? 'food-support.html'
             : 'index.html';
  setTimeout(() => window.location.href = dest, 900);
}

async function doRegister(e) {
  if (e) e.preventDefault();
  const err     = document.getElementById('reg-error');
  const typeErr = document.getElementById('type-error');

  if (err) { err.style.display = 'none'; err.textContent = ''; }
  if (typeErr) { typeErr.style.display = 'none'; }

  if (!selectedAccountType) {
    if (typeErr) typeErr.style.display = 'block';
    return;
  }

  const name      = document.getElementById('reg-name').value.trim();
  const regNumber = document.getElementById('reg-regnumber').value.trim();
  const email     = document.getElementById('reg-email').value.trim();
  const phone     = document.getElementById('reg-phone').value.trim();
  const address   = document.getElementById('reg-address').value.trim();
  const pw        = document.getElementById('reg-password').value;
  const pw2       = document.getElementById('reg-password2').value;

  // Email regex validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    if (err) {
      err.style.display = 'block';
      err.textContent = 'Please enter a valid email address (e.g. name@example.com).';
    }
    return;
  }

  // Phone regex validation (supports Bangladeshi formats: 017XXXXXXXX, +88017XXXXXXXX, +880-17XX-XXXXXX)
  const phoneRegex = /^(?:\+?880|880|0)?[- ]?1[3-9]\d{2}[- ]?\d{6}$/;
  if (!phoneRegex.test(phone)) {
    if (err) {
      err.style.display = 'block';
      err.textContent = 'Please enter a valid Bangladeshi phone number (e.g. 017XXXXXXXX or +880-17XXXXXXXX).';
    }
    return;
  }

  // Password regex validation (min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character)
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+={}[\]:;"'<>,./~`|\\]).{8,}$/;
  if (!passwordRegex.test(pw)) {
    if (err) {
      err.style.display = 'block';
      err.textContent = 'Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character.';
    }
    return;
  }

  // Confirm password
  if (pw !== pw2) {
    if (err) {
      err.style.display = 'block';
      err.textContent = 'Passwords do not match.';
    }
    return;
  }

  const btn = document.getElementById('register-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }

  const res = await apiPost('register.php', {
    accountType: selectedAccountType,
    fullName:    name,
    regNumber:   regNumber,
    email:       email,
    phone:       phone,
    address:     address,
    password:    pw
  });

  if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }

  if (!res.ok) {
    if (err) { err.style.display = 'block'; err.textContent = res.msg; }
    return;
  }
  HL.currentUser = res.user;
  if (HL.currentUser && HL.currentUser.id != null) {
    HL.currentUser.id = Number(HL.currentUser.id);
  }
  showToast('Account created! Welcome to HumanityLink!', 'success');
  const dest = selectedAccountType === 'restaurant' ? 'dashboard.html' : 'food-support.html';
  setTimeout(() => window.location.href = dest, 900);
}

function initAuthPage() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;
  if (HL.currentUser) { window.location.href = 'index.html'; return; }
  const params = new URLSearchParams(window.location.search);
  if (params.get('tab') === 'register') switchTab('register');
}

// ── Food Support Page ─────────────────────────────────────
let pendingClaimId = null;

function applyFilter() {
  const type   = document.getElementById('filterType')?.value   || '';
  const status = document.getElementById('filterStatus')?.value || '';
  const date   = document.getElementById('filterDate')?.value   || '';
  let posts = HL.foodPosts;
  if (type)               posts = posts.filter(p => p.foodType === type);
  if (status === 'available') posts = posts.filter(p => !p.claimedBy);
  if (status === 'claimed')   posts = posts.filter(p => !!p.claimedBy);
  if (date)               posts = posts.filter(p => p.pickupDate === date);
  renderGrid(posts);
}

function clearFilters() {
  const typeEl   = document.getElementById('filterType');
  const statusEl = document.getElementById('filterStatus');
  const dateEl   = document.getElementById('filterDate');
  if (typeEl)   typeEl.value   = '';
  if (statusEl) statusEl.value = '';
  if (dateEl)   dateEl.value   = '';
  renderGrid(HL.foodPosts);
}

function renderGrid(posts) {
  const grid  = document.getElementById('foodGrid');
  const empty = document.getElementById('emptyState');
  const count = document.getElementById('filter-count');
  if (!grid) return;
  if (count) count.textContent = posts.length + ' post' + (posts.length !== 1 ? 's' : '') + ' found';
  if (!posts.length) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  grid.innerHTML = posts.map(p => foodCardHTML(p)).join('');
}

function foodCardHTML(p) {
  const claimed   = !!p.claimedBy;
  const currentId = HL.currentUser && HL.currentUser.id != null ? Number(HL.currentUser.id) : null;
  const postedBy  = Number(p.postedBy);
  const claimedBy = p.claimedBy ? Number(p.claimedBy) : null;
  const isPoster  = currentId !== null && postedBy === currentId;
  const isClaimer = currentId !== null && claimedBy === currentId;
  const hasAccess = claimed && (isPoster || isClaimer);
  const canClaim  = HL.currentUser && HL.currentUser.accountType === 'charity' && !claimed;
  const icon      = foodTypeIcon(p.foodType);

  let footerBtn = '';
  if (canClaim) {
    footerBtn = `<button class="btn btn-primary btn-sm" onclick="openClaimModal(${p.id})" id="claim-${p.id}"><i class="fa-solid fa-handshake"></i> Claim</button>`;
  } else if (hasAccess) {
    const targetUserId = isPoster ? claimedBy : postedBy;
    const btnLabel     = isPoster ? 'View Charity' : 'View Profile';
    footerBtn = `<a href="restaurant-profile.html?id=${targetUserId}&post=${p.id}" class="btn btn-secondary btn-sm" id="view-profile-${p.id}"><i class="fa-solid fa-user"></i> ${btnLabel}</a>`;
  } else if (!HL.currentUser) {
    footerBtn = `<a href="auth.html" class="btn btn-outline btn-sm">Log in to Claim</a>`;
  }

  return `
  <div class="food-card" id="card-${p.id}">
    ${claimed ? '<div class="claimed-overlay"><i class="fa-solid fa-circle-check"></i> Claimed</div>' : ''}
    <div class="food-card-header">
      <div class="food-type-icon">${icon}</div>
      <div>
        <h4>${p.foodName}</h4>
        <div class="restaurant-name"><i class="fa-solid fa-store"></i> ${p.postedByName}</div>
      </div>
    </div>
    <div class="food-card-body">
      <div class="food-detail-row"><span class="icon"><i class="fa-solid fa-tag"></i></span><div><div class="key">Food Type</div><div class="val">${p.foodType}</div></div></div>
      <div class="food-detail-row"><span class="icon"><i class="fa-solid fa-box-open"></i></span><div><div class="key">Quantity</div><div class="val">${p.quantity}</div></div></div>
      <div class="food-detail-row"><span class="icon"><i class="fa-regular fa-calendar-days"></i></span><div><div class="key">Pickup Date</div><div class="val">${formatDate(p.pickupDate)}</div></div></div>
      <div class="food-detail-row"><span class="icon"><i class="fa-regular fa-clock"></i></span><div><div class="key">Pickup Time</div><div class="val">${p.pickupFrom} – ${p.pickupTo}</div></div></div>
      ${p.notes ? `<div class="food-detail-row"><span class="icon"><i class="fa-regular fa-note-sticky"></i></span><div><div class="key">Notes</div><div class="val">${p.notes}</div></div></div>` : ''}
    </div>
    <div class="food-card-footer">
      <span class="food-status ${claimed ? 'claimed' : 'available'}">
        <span class="status-dot"></span>
        ${claimed ? 'Claimed by ' + (p.claimedByName || 'Org') : 'Available'}
      </span>
      ${footerBtn}
    </div>
  </div>`;
}

function openClaimModal(postId) {
  pendingClaimId = postId;
  const p = HL.foodPosts.find(x => x.id === postId);
  if (!p) return;
  const summary = document.getElementById('claimPostSummary');
  if (summary) {
    summary.innerHTML = `
      <strong>${p.foodName}</strong> (${p.foodType})<br>
      Quantity: ${p.quantity}<br>
      Pickup: ${formatDate(p.pickupDate)} &bull; ${p.pickupFrom} – ${p.pickupTo}<br>
      From: ${p.postedByName}`;
  }
  const modal = document.getElementById('claimModal');
  if (modal) modal.classList.add('show');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('show');
}

async function confirmClaim() {
  if (!pendingClaimId) return;
  if (!HL.currentUser) { window.location.href = 'auth.html'; return; }

  const btn = document.getElementById('confirm-claim-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Claiming…'; }

  const res = await apiPost('claim_post.php', { postId: pendingClaimId });
  closeModal('claimModal');

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Confirm Claim'; }

  if (res.ok) {
    showToast('Post claimed! You can now view the restaurant profile.', 'success');
    await loadFoodPosts();
    renderGrid(HL.foodPosts);
  } else {
    showToast(res.msg, 'error');
  }
}

async function initFoodSupportPage() {
  const grid = document.getElementById('foodGrid');
  if (!grid) return;

  renderSidebarAccount();

  // If restaurant user is browsing, ensure they have a link to Dashboard in the sidebar
  if (HL.currentUser && HL.currentUser.accountType === 'restaurant') {
    const navEl = document.querySelector('.app-sidebar-nav');
    if (navEl && !document.getElementById('sbl-dash')) {
      const dashLink = document.createElement('a');
      dashLink.href = 'dashboard.html';
      dashLink.className = 'app-sidebar-link';
      dashLink.id = 'sbl-dash';
      dashLink.innerHTML = `<span class="asbl-icon"><i class="fa-solid fa-chart-pie"></i></span><span class="asbl-text">Dashboard</span>`;
      const sectionLabel = navEl.querySelector('.app-sidebar-section-label');
      if (sectionLabel && sectionLabel.nextSibling) {
        navEl.insertBefore(dashLink, sectionLabel.nextSibling);
      } else {
        navEl.prepend(dashLink);
      }
    }
  }

  await loadFoodPosts();

  const wrapper = document.getElementById('post-btn-wrapper');
  if (wrapper) {
    if (HL.currentUser && HL.currentUser.accountType === 'restaurant') {
      wrapper.innerHTML = '<a href="dashboard.html" class="btn btn-primary" id="go-post-btn"><i class="fa-solid fa-circle-plus"></i> Post Food Donation</a>';
    } else if (!HL.currentUser) {
      wrapper.innerHTML = '<a href="auth.html" class="btn btn-outline" id="login-to-post-btn">Log In to Post or Claim</a>';
    }
  }

  renderGrid(HL.foodPosts);
}

// ── Dashboard Page ────────────────────────────────────────
function showSection(sec, link, e) {
  if (e && e.preventDefault) e.preventDefault();
  ['overview', 'post', 'posts'].forEach(s => {
    const el = document.getElementById('section-' + s);
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById('section-' + sec);
  if (target) target.classList.remove('hidden');
  // Support both old sidebar-link and new app-sidebar-link
  document.querySelectorAll('.sidebar-link, .app-sidebar-link').forEach(l => l.classList.remove('active'));
  if (link) link.classList.add('active');
  if (sec === 'overview') loadOverview();
  if (sec === 'posts')    loadMyPosts();
  return false;
}

function myPosts() {
  if (!HL.currentUser) return [];
  const currentId = Number(HL.currentUser.id);
  return HL.foodPosts.filter(p => Number(p.postedBy) === currentId);
}

function loadOverview() {
  const posts     = myPosts();
  const totalEl   = document.getElementById('stat-total');
  const claimedEl = document.getElementById('stat-claimed');
  const activeEl  = document.getElementById('stat-active');
  if (totalEl)   totalEl.textContent   = posts.length;
  if (claimedEl) claimedEl.textContent = posts.filter(p => p.claimedBy).length;
  if (activeEl)  activeEl.textContent  = posts.filter(p => !p.claimedBy).length;

  const recent = posts.slice(0, 3);
  const grid   = document.getElementById('recentGrid');
  const empty  = document.getElementById('recentEmpty');
  if (!grid) return;
  if (!recent.length) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  grid.innerHTML = recent.map(p => miniCard(p)).join('');
}

function loadMyPosts() {
  const posts = myPosts();
  const grid  = document.getElementById('myPostsGrid');
  const empty = document.getElementById('myPostsEmpty');
  if (!grid) return;
  if (!posts.length) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  grid.innerHTML = posts.map(p => miniCard(p)).join('');
}

function miniCard(p) {
  const claimed = !!p.claimedBy;
  return `
  <div class="food-card" id="mycard-${p.id}">
    ${claimed ? '<div class="claimed-overlay"><i class="fa-solid fa-circle-check"></i> Claimed</div>' : ''}
    <div class="food-card-header">
      <div class="food-type-icon">${foodTypeIcon(p.foodType)}</div>
      <div><h4>${p.foodName}</h4><div class="restaurant-name">${p.foodType}</div></div>
    </div>
    <div class="food-card-body">
      <div class="food-detail-row"><span class="icon"><i class="fa-solid fa-box-open"></i></span><div><div class="key">Quantity</div><div class="val">${p.quantity}</div></div></div>
      <div class="food-detail-row"><span class="icon"><i class="fa-regular fa-calendar-days"></i></span><div><div class="key">Pickup</div><div class="val">${formatDate(p.pickupDate)} &bull; ${p.pickupFrom}–${p.pickupTo}</div></div></div>
      ${claimed ? `<div class="food-detail-row"><span class="icon"><i class="fa-solid fa-handshake"></i></span><div><div class="key">Claimed by</div><div class="val">${p.claimedByName}</div></div></div>` : ''}
    </div>
    <div class="food-card-footer">
      <span class="food-status ${claimed ? 'claimed' : 'available'}"><span class="status-dot"></span>${claimed ? 'Claimed' : 'Available'}</span>
      ${claimed ? `<a href="restaurant-profile.html?id=${p.claimedBy}&post=${p.id}" class="btn btn-secondary btn-sm" id="view-claimant-${p.id}"><i class="fa-solid fa-user"></i> View Charity</a>` : ''}
    </div>
  </div>`;
}

async function submitPost(e) {
  if (e) e.preventDefault();
  const from = document.getElementById('pf-from')?.value;
  const to   = document.getElementById('pf-to')?.value;
  if (!from || !to) return;
  if (from >= to) { showToast('Pickup end time must be after start time.', 'error'); return; }

  const btn = document.getElementById('submit-post-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Posting…'; }

  const res = await apiPost('food_posts.php', {
    foodType:   document.getElementById('pf-type').value,
    foodName:   document.getElementById('pf-name').value.trim(),
    quantity:   document.getElementById('pf-qty').value.trim(),
    pickupDate: document.getElementById('pf-date').value,
    pickupFrom: from,
    pickupTo:   to,
    notes:      document.getElementById('pf-notes').value.trim()
  });

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Post Donation'; }

  if (!res.ok) { showToast(res.msg || 'Failed to post.', 'error'); return; }

  // Add the new post to local state and refresh
  HL.foodPosts.unshift(res.post);
  showToast('Food donation posted successfully!', 'success');
  document.getElementById('postFoodForm')?.reset();
  loadOverview();
  showSection('posts', document.getElementById('sbl-posts'));
}

async function initDashboardPage() {
  const dash = document.getElementById('dashboardLayout') || document.getElementById('section-overview');
  if (!dash) return;
  if (!HL.currentUser) { window.location.href = 'auth.html'; return; }
  if (HL.currentUser.accountType !== 'restaurant') { window.location.href = 'food-support.html'; return; }

  renderSidebarAccount();

  await loadFoodPosts();

  const nameEl = document.getElementById('dash-name');
  if (nameEl) nameEl.textContent = HL.currentUser.fullName.split(' ')[0];

  const dateInput = document.getElementById('pf-date');
  if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

  if (window.location.hash === '#post-food') {
    showSection('post', document.getElementById('sbl-post'));
  } else if (window.location.hash === '#my-posts') {
    showSection('posts', document.getElementById('sbl-posts'));
  } else {
    loadOverview();
  }
}

// ── Restaurant Profile Page ───────────────────────────────
let profileTargetUser = null;
let profileTargetPost = null;

async function initRestaurantProfilePage() {
  const header = document.getElementById('profileHeader');
  if (!header) return;
  if (!HL.currentUser) { window.location.href = 'auth.html'; return; }

  const params = new URLSearchParams(window.location.search);
  const userId = parseInt(params.get('id'));
  const postId = parseInt(params.get('post'));

  // Load posts if not already loaded
  if (!HL.foodPosts.length) await loadFoodPosts();
  profileTargetPost = HL.foodPosts.find(p => p.id === postId) || null;

  // Access check on post before fetching profile
  const currentId = Number(HL.currentUser.id);
  if (profileTargetPost) {
    const isClaimant = profileTargetPost.claimedBy && Number(profileTargetPost.claimedBy) === currentId;
    const isPoster   = profileTargetPost.postedBy && Number(profileTargetPost.postedBy) === currentId;
    if (!isClaimant && !isPoster) {
      header.innerHTML = '<p class="access-denied-msg">Access denied. You can only view this profile after claiming the donation.</p>';
      return;
    }
  }

  // Adjust back button for restaurant users
  const backBtn = document.getElementById('back-btn');
  if (backBtn && HL.currentUser.accountType === 'restaurant') {
    backBtn.href = 'dashboard.html';
    backBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Back to Dashboard';
  }

  // Fetch profile from API
  const res = await apiGet(`profile.php?id=${userId}`);
  if (!res.ok) {
    const nameEl = document.getElementById('profileName');
    if (nameEl) nameEl.textContent = res.msg || 'User not found.';
    return;
  }

  profileTargetUser = res.user;

  // Render profile header
  const initials   = profileTargetUser.fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const initialsEl = document.getElementById('profileInitials');
  const nameEl     = document.getElementById('profileName');
  if (initialsEl) initialsEl.textContent = initials;
  if (nameEl)     nameEl.textContent     = profileTargetUser.fullName;
  document.title = profileTargetUser.fullName + ' – HumanityLink';

  const typeLabels = {
    restaurant: '<i class="fa-solid fa-utensils"></i> Restaurant / Community Center',
    charity:    '<i class="fa-solid fa-hand-holding-heart"></i> Charity Organization',
    user:       '<i class="fa-solid fa-user"></i> General User'
  };
  const badgeEl = document.getElementById('profileBadge');
  if (badgeEl) badgeEl.innerHTML = typeLabels[profileTargetUser.accountType] || profileTargetUser.accountType;

  // Update message box header based on recipient
  const msgBoxTitle = document.querySelector('#messageBox h3');
  if (msgBoxTitle) {
    const role = profileTargetUser.accountType === 'restaurant' ? 'Donor' : 'Charity';
    msgBoxTitle.innerHTML = `<i class="fa-solid fa-comments"></i> Message ${role}`;
  }

  const contactGrid = document.getElementById('contactGrid');
  if (contactGrid) {
    contactGrid.innerHTML = `
      <div class="contact-item"><span class="ci-icon"><i class="fa-solid fa-phone"></i></span><div><div class="ci-label">Phone</div><div class="ci-val"><a href="tel:${profileTargetUser.phone}" class="contact-link">${profileTargetUser.phone}</a></div></div></div>
      <div class="contact-item"><span class="ci-icon"><i class="fa-solid fa-envelope"></i></span><div><div class="ci-label">Email</div><div class="ci-val"><a href="mailto:${profileTargetUser.email}" class="contact-link">${profileTargetUser.email}</a></div></div></div>
      <div class="contact-item"><span class="ci-icon"><i class="fa-solid fa-location-dot"></i></span><div><div class="ci-label">Address</div><div class="ci-val">${profileTargetUser.address}</div></div></div>
      ${profileTargetUser.regNumber ? `<div class="contact-item"><span class="ci-icon"><i class="fa-solid fa-id-card"></i></span><div><div class="ci-label">Reg. Number</div><div class="ci-val">${profileTargetUser.regNumber}</div></div></div>` : ''}`;
  }

  // Render claimed post detail
  const postDetail = document.getElementById('postDetail');
  if (postDetail && profileTargetPost) {
    postDetail.innerHTML = `
      <div class="food-detail-row"><span class="icon"><i class="fa-solid fa-tag"></i></span><div><div class="key">Food Type</div><div class="val">${profileTargetPost.foodType}</div></div></div>
      <div class="food-detail-row"><span class="icon"><i class="fa-solid fa-bowl-rice"></i></span><div><div class="key">Food Name</div><div class="val">${profileTargetPost.foodName}</div></div></div>
      <div class="food-detail-row"><span class="icon"><i class="fa-solid fa-box-open"></i></span><div><div class="key">Quantity</div><div class="val">${profileTargetPost.quantity}</div></div></div>
      <div class="food-detail-row"><span class="icon"><i class="fa-regular fa-calendar-days"></i></span><div><div class="key">Pickup Date</div><div class="val">${formatDate(profileTargetPost.pickupDate)}</div></div></div>
      <div class="food-detail-row"><span class="icon"><i class="fa-regular fa-clock"></i></span><div><div class="key">Pickup Time</div><div class="val">${profileTargetPost.pickupFrom} – ${profileTargetPost.pickupTo}</div></div></div>
      ${profileTargetPost.notes ? `<div class="food-detail-row"><span class="icon"><i class="fa-regular fa-note-sticky"></i></span><div><div class="key">Notes</div><div class="val">${profileTargetPost.notes}</div></div></div>` : ''}`;
  }

  await loadMessages();
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

async function loadMessages() {
  if (!profileTargetPost) return;
  const res  = await apiGet(`messages.php?post_id=${profileTargetPost.id}`);
  const area = document.getElementById('messagesArea');
  if (!area) return;
  if (!res.ok || !res.messages.length) {
    area.innerHTML = '<div class="msg-empty">Send a message to coordinate pickup.</div>';
    return;
  }
  const currentId = Number(HL.currentUser.id);
  area.innerHTML = res.messages.map(m => `
    <div>
      <div class="msg-bubble ${Number(m.from) === currentId ? 'sent' : 'received'}">${escapeHtml(m.text)}</div>
      <div class="msg-time ${Number(m.from) === currentId ? 'msg-time-sent' : 'msg-time-received'}">${m.time}</div>
    </div>`).join('');
  area.scrollTop = area.scrollHeight;
}

async function sendMsg() {
  const inp = document.getElementById('msgInput');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text || !profileTargetUser || !profileTargetPost) return;

  const res = await apiPost('messages.php', {
    receiverId: profileTargetUser.id,
    postId:     profileTargetPost.id,
    message:    text
  });
  if (res.ok) {
    inp.value = '';
    await loadMessages();
  } else {
    showToast(res.msg || 'Failed to send message.', 'error');
  }
}

// ── Hero Slider ──────────────────────────────────────────────
function initHeroSlider() {
  const deck = document.getElementById('heroSliderDeck');
  if (!deck) return;

  const cards = Array.from(deck.querySelectorAll('.polaroid-card'));
  const dots  = Array.from(document.querySelectorAll('.slider-dot'));
  const total = cards.length;
  let current = 0;
  let timer   = null;

  function getClass(i) {
    const diff = (i - current + total) % total;
    if (diff === 0) return 'active';
    if (diff === 1) return 'next';
    if (diff === total - 1) return 'prev';
    return 'hidden';
  }

  function goTo(idx) {
    current = ((idx % total) + total) % total;
    cards.forEach((c, i) => {
      c.className = 'polaroid-card ' + getClass(i);
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startAuto() {
    stopAuto();
    timer = setInterval(next, 3500);
  }
  function stopAuto() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  // Arrow buttons
  const btnNext = document.getElementById('sliderNext');
  const btnPrev = document.getElementById('sliderPrev');
  if (btnNext) btnNext.addEventListener('click', () => { next(); startAuto(); });
  if (btnPrev) btnPrev.addEventListener('click', () => { prev(); startAuto(); });

  // Dot buttons
  dots.forEach(dot => {
    dot.addEventListener('click', () => { goTo(Number(dot.dataset.dot)); startAuto(); });
  });

  // Card click => advance
  cards.forEach(card => {
    card.addEventListener('click', () => { next(); startAuto(); });
  });

  // Touch / swipe support
  let touchX = null;
  deck.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  deck.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) < 40) return;
    dx < 0 ? next() : prev();
    startAuto();
  }, { passive: true });

  // Pause on hover
  deck.addEventListener('mouseenter', stopAuto);
  deck.addEventListener('mouseleave', startAuto);

  goTo(0);
  startAuto();
}

// ── Global Window Bindings ─────────────────────────────────
window.switchTab         = switchTab;
window.selectType        = selectType;
window.togglePw          = togglePw;
window.doLogin           = doLogin;
window.doRegister        = doRegister;
window.applyFilter       = applyFilter;
window.clearFilters      = clearFilters;
window.renderGrid        = renderGrid;
window.foodCardHTML      = foodCardHTML;
window.openClaimModal    = openClaimModal;
window.closeModal        = closeModal;
window.confirmClaim      = confirmClaim;
window.showSection       = showSection;
window.loadOverview      = loadOverview;
window.loadMyPosts       = loadMyPosts;
window.submitPost        = submitPost;
window.sendMsg           = sendMsg;
window.handleOfferingClick = handleOfferingClick;
window.doLogout          = doLogout;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.saveSettings      = saveSettings;
window.foodTypeEmoji     = foodTypeEmoji;
window.foodTypeIcon      = foodTypeIcon;
window.formatDate        = formatDate;
window.toggleTheme       = toggleTheme;

// ── Master Init on Page Load ───────────────────────────────
async function initApp() {
  initTheme();

  // Check if user is logged in via PHP session
  const meRes = await apiGet('me.php');
  HL.currentUser = meRes.ok ? meRes.user : null;
  if (HL.currentUser && HL.currentUser.id != null) {
    HL.currentUser.id = Number(HL.currentUser.id);
  }

  initNavbar();
  renderNavAuth();
  initHeroSlider();

  // Run page-specific initializers (each checks if it's on the right page)
  initAuthPage();
  await initFoodSupportPage();
  await initDashboardPage();
  await initRestaurantProfilePage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ── Theme Management ───────────────────────────────────────
function getPreferredTheme() {
  const saved = localStorage.getItem('hl_theme');
  if (saved) return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark-theme');
  } else {
    html.classList.remove('dark-theme');
  }
  localStorage.setItem('hl_theme', theme);
  // Update any theme toggle buttons
  document.querySelectorAll('.theme-toggle-btn, #themeToggleBtn, #themeToggleMobile').forEach(btn => {
    btn.innerHTML = theme === 'dark'
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  });
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark-theme');
  applyTheme(isDark ? 'light' : 'dark');
}

function initTheme() {
  const theme = getPreferredTheme();
  applyTheme(theme);

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('hl_theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}
