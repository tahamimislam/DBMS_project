// =====================================================
// HumanityLink — app.js
// PHP + MySQL backend version
// All data comes from /api/*.php via fetch()
// =====================================================

// ── Global State ──────────────────────────────────────────
const HL = {
  currentUser: null, // set from api/me.php on page load
  foodPosts: [], // set from api/food_posts.php
};

// ── API Helpers ───────────────────────────────────────────
const API = "api/";

async function apiGet(endpoint) {
  if (window.location.protocol === "file:") {
    return {
      ok: false,
      msg: "Cannot run PHP via file://. Please open via http://localhost/HumanityLink/ (with XAMPP running).",
    };
  }
  try {
    const res = await fetch(API + endpoint);
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      return (
        errData || {
          ok: false,
          msg: `Server error (${res.status}). Check PHP/MySQL.`,
        }
      );
    }
    return await res.json();
  } catch (e) {
    return {
      ok: false,
      msg: "Network error. Please make sure Apache and MySQL are running in XAMPP and open via http://localhost/HumanityLink/",
    };
  }
}

async function apiPost(endpoint, data) {
  if (window.location.protocol === "file:") {
    return {
      ok: false,
      msg: "Cannot run PHP via file://. Please open via http://localhost/HumanityLink/ (with XAMPP running).",
    };
  }
  try {
    const isFormData = data instanceof FormData;
    const fetchOptions = {
      method: "POST",
      body: isFormData ? data : JSON.stringify(data),
    };
    if (!isFormData) {
      fetchOptions.headers = { "Content-Type": "application/json" };
    }
    const res = await fetch(API + endpoint, fetchOptions);
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      return (
        errData || {
          ok: false,
          msg: `Server error (${res.status}). Check PHP/MySQL.`,
        }
      );
    }
    return await res.json();
  } catch (e) {
    return {
      ok: false,
      msg: "Network error. Please make sure Apache and MySQL are running in XAMPP and open via http://localhost/HumanityLink/",
    };
  }
}

// Load all food posts into HL.foodPosts
async function loadFoodPosts() {
  const res = await apiGet("food_posts.php");
  if (res.ok) HL.foodPosts = res.posts;
}

// ── Utilities ─────────────────────────────────────────────
function showToast(msg, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icons = {
    success: '<i class="fa-solid fa-circle-check"></i>',
    error: '<i class="fa-solid fa-circle-xmark"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
    info: '<i class="fa-solid fa-circle-info"></i>',
  };
  toast.innerHTML = `<span>${icons[type] || icons.success}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(30px)";
    toast.style.transition = "all .3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function foodTypeIcon(type) {
  const map = {
    "Cooked Meal": '<i class="fa-solid fa-bowl-rice"></i>',
    Bakery: '<i class="fa-solid fa-bread-slice"></i>',
    "Fruits & Vegetables": '<i class="fa-solid fa-apple-whole"></i>',
    Beverages: '<i class="fa-solid fa-mug-hot"></i>',
    "Dry Food": '<i class="fa-solid fa-wheat-awn"></i>',
    Other: '<i class="fa-solid fa-box-open"></i>',
  };
  return map[type] || '<i class="fa-solid fa-utensils"></i>';
}
const foodTypeEmoji = foodTypeIcon;

// ── Navbar ────────────────────────────────────────────────
function initNavbar() {
  const navbar = document.querySelector(".navbar");
  if (!navbar) return;

  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 30);
  });

  const hamburger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () =>
      navLinks.classList.toggle("open"),
    );
    document.addEventListener("click", (e) => {
      if (!navbar.contains(e.target)) navLinks.classList.remove("open");
    });
  }
}

function renderNavAuth() {
  const actionsEl = document.getElementById("nav-actions");
  if (!actionsEl) return;

  const isDark = document.documentElement.classList.contains("dark-theme");
  const themeBtn = `<button class="theme-toggle-btn" id="themeToggleBtn" onclick="toggleTheme()" aria-label="${isDark ? "Switch to light mode" : "Switch to dark mode"}" title="Toggle theme">${isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>'}</button>`;

  if (HL.currentUser) {
    const initials = HL.currentUser.fullName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const avatarHtml = HL.currentUser.profilePicture
      ? `<img src="${HL.currentUser.profilePicture}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
      : initials;
    let dashLink = "index.html";
    if (HL.currentUser.accountType === "restaurant")
      dashLink = "dashboard.html";
    else if (HL.currentUser.accountType === "doctor")
      dashLink = "doctor-dashboard.html";
    else if (HL.currentUser.accountType === "admin")
      dashLink = "admin/dashboard.php";
    else if (HL.currentUser.accountType === "charity") {
      const s = (HL.currentUser.sectors || "").toLowerCase();
      dashLink =
        s.includes("medical") && !s.includes("food")
          ? "medical-welfare.html"
          : "food-support.html";
    } else if (HL.currentUser.accountType === "user") {
      dashLink = "user-dashboard.html";
    } else dashLink = "food-support.html";

    const heroBtn = document.getElementById("hero-join-btn");
    const donateBtn = document.getElementById("hero-donate-btn");
    if (heroBtn) {
      heroBtn.href = dashLink;
      heroBtn.innerHTML =
        '<i class="fa-solid fa-table-columns"></i> Go to Dashboard';
      if (HL.currentUser.accountType === "user" && donateBtn) {
        donateBtn.style.display = "inline-flex";
      }
    }

    const ctaBtn = document.getElementById("cta-register-btn");
    if (ctaBtn) {
      ctaBtn.style.display = "none";
    }

    actionsEl.innerHTML = `
      ${themeBtn}
      <div class="nav-user-menu" id="navUserMenu">
        <button class="nav-user-btn" id="navUserBtn">
          <div class="avatar">${avatarHtml}</div>
          <span>${HL.currentUser.fullName.split(" ")[0]}</span>
          <i class="fa-solid fa-chevron-down"></i>
        </button>
        <div class="nav-dropdown" id="navDropdown">
          <a href="${dashLink}"><i class="fa-solid fa-chart-pie"></i> Dashboard</a>
          <hr>
          <button onclick="doLogout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> Log Out</button>
        </div>
      </div>`;

    const menu = document.getElementById("navUserMenu");
    const btn = document.getElementById("navUserBtn");
    if (btn)
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("open");
      });
    document.addEventListener("click", () => {
      if (menu) menu.classList.remove("open");
    });
  } else {
    const heroBtn = document.getElementById("hero-join-btn");
    if (heroBtn) {
      heroBtn.href = "auth.html";
      heroBtn.innerHTML = "Join the Network";
    }

    const ctaBtn = document.getElementById("cta-register-btn");
    if (ctaBtn) {
      ctaBtn.style.display = "inline-block";
    }

    actionsEl.innerHTML = `
      ${themeBtn}
      <a href="auth.html" class="btn btn-outline btn-sm" id="nav-login-btn">Log In</a>
      <a href="auth.html?tab=register" class="btn btn-primary btn-sm" id="nav-register-btn">Register</a>`;
  }
}

function renderSidebarAccount() {
  const accountEl = document.getElementById("sidebarAccount");
  const popupEl = document.getElementById("sidebarAccountPopup");
  if (!accountEl) return;

  if (!HL.currentUser) {
    accountEl.innerHTML = `
      <a href="auth.html" class="app-sidebar-link" style="color:rgba(255,255,255,.6)">
        <span class="asbl-icon"><i class="fa-solid fa-right-to-bracket"></i></span>
        <span class="asbl-text">Log In</span>
      </a>`;
    return;
  }

  const initials = HL.currentUser.fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const avatarHtml = HL.currentUser.profilePicture
    ? `<img src="${HL.currentUser.profilePicture}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
    : initials;
  const typeLabel =
    { restaurant: "Restaurant", charity: "Charity Org", user: "General User" }[
      HL.currentUser.accountType
    ] || HL.currentUser.accountType;

  accountEl.innerHTML = `
    <button class="app-sidebar-account-btn" id="sidebarAccountBtn" type="button" title="Account profile & options">
      <div class="app-sidebar-account-avatar">${avatarHtml}</div>
      <div class="app-sidebar-account-info">
        <div class="app-sidebar-account-name">${HL.currentUser.fullName}</div>
        <div class="app-sidebar-account-type">${typeLabel}</div>
      </div>
      <i class="fa-solid fa-chevron-up app-sidebar-account-chevron"></i>
    </button>`;

  // Toggle popup on account profile click
  const btn = document.getElementById("sidebarAccountBtn");
  if (btn && popupEl) {
    btn.onclick = (e) => {
      e.stopPropagation();
      const isOpen = btn.classList.toggle("open");
      popupEl.classList.toggle("hidden", !isOpen);
    };

    popupEl.onclick = (e) => {
      e.stopPropagation();
    };

    document.addEventListener("click", () => {
      btn.classList.remove("open");
      popupEl.classList.add("hidden");
    });
  }
}

function openSettingsModal() {
  const popupEl = document.getElementById("sidebarAccountPopup");
  const btn = document.getElementById("sidebarAccountBtn");
  if (popupEl) popupEl.classList.add("hidden");
  if (btn) btn.classList.remove("open");

  if (!HL.currentUser) {
    window.location.href = "auth.html";
    return;
  }

  const modal = document.getElementById("settingsModal");
  if (!modal) return;

  const initials = HL.currentUser.fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const typeLabel =
    {
      restaurant: "Restaurant / Community Center",
      charity: "Charity Organization",
      user: "General User",
    }[HL.currentUser.accountType] || HL.currentUser.accountType;

  const avatarEl = document.getElementById("sm-avatar");
  const typeEl = document.getElementById("sm-type-badge");
  const nameInp = document.getElementById("sm-name");
  const emailInp = document.getElementById("sm-email");
  const phoneInp = document.getElementById("sm-phone");
  const streetInp = document.getElementById("sm-street");
  const areaInp = document.getElementById("sm-area");
  const cityInp = document.getElementById("sm-city");
  const regInp = document.getElementById("sm-reg");
  const regRow = document.getElementById("sm-reg-group");
  const qualInp = document.getElementById("sm-qualification");
  const specInp = document.getElementById("sm-specialization");

  if (avatarEl) {
    if (HL.currentUser.profilePicture) {
      avatarEl.innerHTML = `<img src="${HL.currentUser.profilePicture}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
      avatarEl.textContent = initials;
    }
  }
  if (typeEl) typeEl.textContent = typeLabel;

  const picInp = document.getElementById("sm-profile-pic");
  if (picInp) picInp.value = "";
  const previewImg = document.getElementById("sm-profile-preview");
  if (previewImg) {
    if (HL.currentUser.profilePicture) {
      previewImg.src = HL.currentUser.profilePicture;
      previewImg.style.display = "block";
    } else {
      previewImg.src = "";
      previewImg.style.display = "none";
    }
  }
  if (nameInp) nameInp.value = HL.currentUser.fullName || "";
  if (emailInp) emailInp.value = HL.currentUser.email || "";
  if (phoneInp) phoneInp.value = HL.currentUser.phone || "";
  if (streetInp) streetInp.value = HL.currentUser.street || "";
  if (areaInp) areaInp.value = HL.currentUser.area || "";
  if (cityInp) cityInp.value = HL.currentUser.city || "";
  const qualCbList = document.querySelectorAll(".sm-qual-cb");
  if (qualCbList.length > 0) {
    const userQuals = HL.currentUser.qualification
      ? HL.currentUser.qualification.split(",")
      : [];
    qualCbList.forEach((cb) => {
      cb.checked = userQuals.includes(cb.value);
    });
  }
  if (specInp) specInp.value = HL.currentUser.specialization || "";
  if (regInp) regInp.value = HL.currentUser.regNumber || "";

  const charitySectorsGroup = document.getElementById("sm-charity-sectors-group");
  if (charitySectorsGroup) {
    if (HL.currentUser.accountType === "charity") {
      charitySectorsGroup.style.display = "block";
      const sectorCbList = document.querySelectorAll(".sm-sector-cb");
      const userSectors = HL.currentUser.sectors ? HL.currentUser.sectors.split(",") : [];
      sectorCbList.forEach((cb) => {
        cb.checked = userSectors.includes(cb.value);
      });
    } else {
      charitySectorsGroup.style.display = "none";
    }
  }
  if (regRow) {
    regRow.style.display = "block";
    const regLabel = regRow.querySelector("label");
    if (regLabel) {
      regLabel.innerHTML =
        (HL.currentUser.accountType === "user"
          ? "NID / Identification Number"
          : "Registration Number / Trade License") +
        ' <span class="req">*</span>';
    }
  }

  const errEl = document.getElementById("settings-error");
  if (errEl) errEl.style.display = "none";

  modal.classList.add("show");
}

function closeSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (modal) modal.classList.remove("show");
}

async function saveSettings(e) {
  if (e) e.preventDefault();
  const errEl = document.getElementById("settings-error");
  if (errEl) {
    errEl.style.display = "none";
    errEl.textContent = "";
  }

  const smNameEl = document.getElementById("sm-name");
  const smPhoneEl = document.getElementById("sm-phone");
  const smStreetEl = document.getElementById("sm-street");
  const smAreaEl = document.getElementById("sm-area");
  const smCityEl = document.getElementById("sm-city");
  const smRegEl = document.getElementById("sm-reg");
  let selectedQuals = [];
  if (HL.currentUser && HL.currentUser.accountType === "doctor") {
    const qualCheckboxes = document.querySelectorAll(".sm-qual-cb:checked");
    qualCheckboxes.forEach((cb) => selectedQuals.push(cb.value));
    if (selectedQuals.length === 0) {
      const smQErr = document.getElementById("sm-qual-error");
      if (smQErr) smQErr.style.display = "block";
      return;
    }
    const smQErr = document.getElementById("sm-qual-error");
    if (smQErr) smQErr.style.display = "none";
  }
  const smSpecEl = document.getElementById("sm-specialization");

  const fullName = smNameEl ? smNameEl.value.trim() : "";
  const phone = smPhoneEl ? smPhoneEl.value.trim() : "";
  const street = smStreetEl ? smStreetEl.value.trim() : "";
  const area = smAreaEl ? smAreaEl.value.trim() : "";
  const city = smCityEl ? smCityEl.value.trim() : "";
  const regNumber = (smRegEl ? smRegEl.value.trim() : "") || "";
  const specialization = smSpecEl ? smSpecEl.value.trim() : "";

  let selectedSectors = [];
  if (HL.currentUser && HL.currentUser.accountType === "charity") {
    const sectorCheckboxes = document.querySelectorAll(".sm-sector-cb:checked");
    sectorCheckboxes.forEach((cb) => selectedSectors.push(cb.value));
    if (selectedSectors.length === 0) {
      const smSErr = document.getElementById("sm-sectors-error");
      if (smSErr) smSErr.style.display = "block";
      return;
    }
    const smSErr = document.getElementById("sm-sectors-error");
    if (smSErr) smSErr.style.display = "none";
  }

  if (!fullName) {
    if (errEl) {
      errEl.style.display = "block";
      errEl.textContent = "Name is required.";
    }
    return;
  }

  if (!regNumber) {
    if (errEl) {
      errEl.style.display = "block";
      errEl.textContent = "Registration / NID number is required.";
    }
    return;
  }

  // Phone regex check
  const phoneRegex = /^(?:\+?880|880|0)?[- ]?1[3-9]\d{2}[- ]?\d{6}$/;
  if (phone && !phoneRegex.test(phone)) {
    if (errEl) {
      errEl.style.display = "block";
      errEl.textContent =
        "Please enter a valid Bangladeshi phone number (e.g. 017XXXXXXXX or +880-17XXXXXXXX).";
    }
    return;
  }

  const btn = document.getElementById("save-settings-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';
  }

  const fd = new FormData();
  fd.append("fullName", fullName);
  fd.append("phone", phone);
  fd.append("street", street);
  fd.append("area", area);
  fd.append("city", city);
  fd.append("regNumber", regNumber);
  if (selectedQuals.length > 0) {
    fd.append("qualification", selectedQuals.join(","));
  }
  if (selectedSectors && selectedSectors.length > 0) {
    fd.append("sectors", selectedSectors.join(","));
  }
  fd.append("specialization", specialization);

  const picInp = document.getElementById("sm-profile-pic");
  if (picInp && picInp.files[0]) {
    fd.append("profilePicture", picInp.files[0]);
  }

  const res = await apiPost("profile.php", fd);

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Changes';
  }

  if (!res.ok) {
    if (errEl) {
      errEl.style.display = "block";
      errEl.textContent = res.msg || "Failed to update settings.";
    }
    return;
  }

  HL.currentUser = res.user;
  if (HL.currentUser && HL.currentUser.id != null) {
    HL.currentUser.id = Number(HL.currentUser.id);
  }
  showToast("Settings updated successfully!", "success");
  closeSettingsModal();

  // Re-render sidebar account and name on dashboard if present
  renderSidebarAccount();
  const nameEl = document.getElementById("dash-name");
  if (nameEl) nameEl.textContent = HL.currentUser.fullName.split(" ")[0];
}

async function doLogout() {
  await apiPost("logout.php", {});
  HL.currentUser = null;
  showToast("Logged out successfully.", "info");
  setTimeout(() => (window.location.href = "index.html"), 800);
}

// ── Offerings Modal (Processes & Live Stats) ─────────────
const HL_OFFERINGS_DATA = {
  food: {
    title: "Food Support",
    emoji: '<i class="fa-solid fa-utensils"></i>',
    tag: "Surplus Food Recovery & Distribution",
    desc: "Connecting restaurants and community centers with verified charity organizations to turn surplus meals into immediate hunger relief.",
    process: [
      { step: "1", title: "Restaurant / Community Center" },
      { step: "2", title: "Food Donation Posted" },
      { step: "3", title: "Charity Organization Claims" },
      { step: "4", title: "Distribution" },
      { step: "5", title: "Completed" },
    ],
    stats: [
      { num: "0", label: "Food Posts Shared" },
      { num: "0", label: "Successfully Distributed" },
      { num: "0", label: "Active Food Donations" },
      { num: "0%", label: "Delivery Success Rate" },
    ],
    recent: [],
    primaryBtn: {
      label: "Explore Food Support Board →",
      href: "food-support.html",
    },
  },
  medical: {
    title: "Medical & Welfare Support",
    emoji: '<i class="fa-solid fa-notes-medical"></i>',
    tag: "Healthcare Aid & Emergency Response",
    desc: "Coordinating emergency medical assistance, doctor volunteer camps, and welfare aid for destitute and distressed individuals.",
    process: [
      { step: "1", title: "User Reports Case" },
      { step: "2", title: "Charity Organization Reviews" },
      { step: "3", title: "Case Accepted" },
      { step: "4", title: "Action Taken" },
      { step: "5", title: "Completed" },
    ],
    stats: [
      { num: "0", label: "Medical Cases Reported" },
      { num: "0", label: "Treated & Aided" },
      { num: "0", label: "Free Medical Camps" },
      { num: "0%", label: "Response Rate" },
    ],
    recent: [],
  },
  financial: {
    title: "Financial Support",
    emoji: '<i class="fa-solid fa-hand-holding-dollar"></i>',
    tag: "Transparent Welfare Crowdfunding",
    desc: "Transparent fundraising campaigns for urgent medical emergencies, disaster relief, and destitute family rehabilitation.",
    process: [
      { step: "1", title: "Charity Organization Creates Campaign" },
      { step: "2", title: "User Donates" },
      { step: "3", title: "Transaction Recorded" },
      { step: "4", title: "Donation History Updated" },
    ],
    stats: [
      { num: "৳ 0", label: "Total Funds Raised" },
      { num: "0", label: "Verified Campaigns" },
      { num: "0", label: "Generous Donors" },
      { num: "0%", label: "Audited Transparency" },
    ],
    recent: [],
  },
  education: {
    title: "Education Support",
    emoji: '<i class="fa-solid fa-graduation-cap"></i>',
    tag: "Empowering Underprivileged Scholars",
    desc: "Connecting underprivileged students with sponsors and educational trusts.",
    process: [
      { step: "1", title: "Applicant Applies" },
      { step: "2", title: "Documents Submitted" },
      { step: "3", title: "Verification" },
      { step: "4", title: "Approval" },
      { step: "5", title: "Fund Distribution" },
      { step: "6", title: "Record Updated" },
    ],
    stats: [
      { num: "0", label: "Students Sponsored" },
      { num: "৳ 0", label: "Scholarships Awarded" },
      { num: "0", label: "University Seats Funded" },
      { num: "0%", label: "Academic Retention" },
    ],
    recent: [],
  },
};

HL.openOfferingModal = async function (type) {
  const data = HL_OFFERINGS_DATA[type];
  if (!data) return;

  let modalEl = document.getElementById("offeringModalOverlay");
  if (!modalEl) {
    modalEl = document.createElement("div");
    modalEl.id = "offeringModalOverlay";
    modalEl.className = "modal-overlay";
    document.body.appendChild(modalEl);
  }

  // Real-time calculation for stats & recent records
  let currentStats = [...data.stats];
  let recentHTML = "";

  if (type === "food") {
    if (!HL.foodPosts || !HL.foodPosts.length) {
      await loadFoodPosts();
    }
    const total = HL.foodPosts ? HL.foodPosts.length : 0;
    const claimed = HL.foodPosts
      ? HL.foodPosts.filter((p) => p.claimedBy).length
      : 0;
    const active = total - claimed;
    const rate = total > 0 ? Math.round((claimed / total) * 100) + "%" : "0%";

    currentStats = [
      { num: String(total), label: "Food Posts Shared" },
      { num: String(claimed), label: "Successfully Distributed" },
      { num: String(active), label: "Active Food Donations" },
      { num: rate, label: "Delivery Success Rate" },
    ];

    const claimedPosts = HL.foodPosts
      ? HL.foodPosts.filter((p) => p.claimedBy).slice(0, 3)
      : [];
    if (claimedPosts.length > 0) {
      recentHTML = claimedPosts
        .map(
          (p) => `
        <div class="offering-recent-card">
          <div class="recent-card-top"><span class="recent-badge"><i class="fa-solid fa-circle-check"></i> Distributed</span></div>
          <div class="recent-parties">${p.postedByName} ➔ ${p.claimedByName || "Charity"}</div>
          <div class="recent-item">${p.quantity} &bull; ${p.foodName} (${p.foodType})</div>
          <div class="recent-meta"><i class="fa-solid fa-location-dot"></i> ${p.address || "Dhaka"} &bull; <i class="fa-regular fa-calendar"></i> Pickup: ${formatDate(p.pickupDate)}</div>
        </div>`,
        )
        .join("");
    } else {
      recentHTML = `<div class="empty-state" style="padding:22px;grid-column:1/-1;text-align:center;color:var(--muted);font-size:.85rem"><i class="fa-solid fa-clock-rotate-left" style="font-size:1.4rem;display:block;margin-bottom:8px;opacity:.6"></i>No completed distribution records yet. Initialized at 0.</div>`;
    }
  } else {
    recentHTML = `<div class="empty-state" style="padding:22px;grid-column:1/-1;text-align:center;color:var(--muted);font-size:.85rem"><i class="fa-solid fa-clock-rotate-left" style="font-size:1.4rem;display:block;margin-bottom:8px;opacity:.6"></i>No verified records yet. Initialized at 0.</div>`;
  }

  const stepsHTML = data.process
    .map(
      (s) => `
    <div class="offering-step">
      <div class="offering-step-num">${s.step}</div>
      <h5>${s.title}</h5>
    </div>`,
    )
    .join("");

  const statsHTML = currentStats
    .map(
      (st) => `
    <div class="offering-stat-box">
      <div class="offering-stat-num">${st.num}</div>
      <div class="offering-stat-label">${st.label}</div>
    </div>`,
    )
    .join("");

  let actionBtns = "";
  if (!HL.currentUser) {
    actionBtns = `<a href="auth.html?tab=register" class="btn btn-primary btn-sm">Register to Participate</a>
                  <a href="auth.html" class="btn btn-outline btn-sm">Log In</a>`;
    if (data.primaryBtn)
      actionBtns =
        `<a href="${data.primaryBtn.href}" class="btn btn-secondary btn-sm">${data.primaryBtn.label}</a>` +
        actionBtns;
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

  modalEl.classList.add("show");
  modalEl.onclick = (e) => {
    if (e.target === modalEl) HL.closeOfferingModal();
  };
};

HL.closeOfferingModal = function () {
  const modalEl = document.getElementById("offeringModalOverlay");
  if (modalEl) modalEl.classList.remove("show");
};

function handleOfferingClick(type) {
  HL.openOfferingModal(type);
}

// ── Auth Page ─────────────────────────────────────────────
let selectedAccountType = null;

function switchTab(tab) {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  if (!loginForm || !registerForm) return;
  loginForm.classList.toggle("hidden", tab !== "login");
  registerForm.classList.toggle("hidden", tab !== "register");
  if (tabLogin) tabLogin.classList.toggle("active", tab === "login");
  if (tabRegister) tabRegister.classList.toggle("active", tab === "register");
}

function selectType(type) {
  selectedAccountType = type;
  document
    .querySelectorAll(".account-type-btn")
    .forEach((b) => b.classList.remove("selected"));
  const btn = document.getElementById("type-" + type);
  if (btn) btn.classList.add("selected");
  const labels = {
    charity: "Charity Organization Full Name",
    restaurant: "Restaurant / Community Center Full Name",
    doctor: "Dr. Full Name",
    user: "Full Name",
  };
  const labelEl = document.getElementById("reg-name-label");
  if (labelEl)
    labelEl.innerHTML =
      (labels[type] || "Full Name") + ' <span class="req">*</span>';

  const regLabelEl = document.getElementById("reg-regnumber-label");
  if (regLabelEl)
    regLabelEl.innerHTML =
      type === "doctor" || type === "user"
        ? 'NID Number <span class="req">*</span>'
        : 'Registration / NID Number <span class="req">*</span>';

  const typeErr = document.getElementById("type-error");
  if (typeErr) typeErr.style.display = "none";

  const sectorsGroup = document.getElementById("charity-sectors-group");
  if (sectorsGroup)
    sectorsGroup.style.display = type === "charity" ? "block" : "none";

  const docFields = document.getElementById("doctor-fields");
  if (docFields) docFields.style.display = type === "doctor" ? "block" : "none";

  const addrFields = document.getElementById("address-fields");
  if (addrFields)
    addrFields.style.display = type === "doctor" ? "none" : "block";
}

function togglePw(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  const isPw = inp.type === "password";
  inp.type = isPw ? "text" : "password";
  btn.innerHTML = isPw
    ? '<i class="fa-regular fa-eye-slash"></i>'
    : '<i class="fa-regular fa-eye"></i>';
}

async function doLogin(e) {
  if (e) e.preventDefault();
  const emailInput = document.getElementById("login-email");
  const pwInput = document.getElementById("login-password");
  const err = document.getElementById("login-error");
  if (!emailInput || !pwInput) return;

  const btn = document.getElementById("login-submit-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Logging in…";
  }

  const res = await apiPost("login.php", {
    email: emailInput.value.trim(),
    password: pwInput.value,
  });

  if (btn) {
    btn.disabled = false;
    btn.textContent = "Log In";
  }

  if (!res.ok) {
    if (err) {
      err.style.display = "block";
      err.textContent = res.msg;
    }
    return;
  }
  if (err) err.style.display = "none";
  HL.currentUser = res.user;
  if (HL.currentUser && HL.currentUser.id != null) {
    HL.currentUser.id = Number(HL.currentUser.id);
  }
  showToast(
    "Welcome back, " + res.user.fullName.split(" ")[0] + "!",
    "success",
  );
  let dest = "index.html";
  if (res.user.accountType === "restaurant") {
    dest = "dashboard.html";
  } else if (res.user.accountType === "doctor") {
    dest = "doctor-dashboard.html";
  } else if (res.user.accountType === "admin") {
    dest = "admin/dashboard.php";
  } else if (res.user.accountType === "charity") {
    const s = (res.user.sectors || "").toLowerCase();
    if (s.includes("medical") && !s.includes("food")) {
      dest = "medical-welfare.html";
    } else {
      dest = "food-support.html";
    }
  }
  setTimeout(() => (window.location.href = dest), 900);
}

async function doRegister(e) {
  if (e) e.preventDefault();
  const err = document.getElementById("reg-error");
  const typeErr = document.getElementById("type-error");

  if (err) {
    err.style.display = "none";
    err.textContent = "";
  }
  if (typeErr) {
    typeErr.style.display = "none";
  }

  if (!selectedAccountType) {
    if (typeErr) typeErr.style.display = "block";
    return;
  }

  const name = document.getElementById("reg-name").value.trim();
  const regNumber = document.getElementById("reg-regnumber").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const street = document.getElementById("reg-street").value.trim();
  const area = document.getElementById("reg-area").value.trim();
  const city = document.getElementById("reg-city").value.trim();
  let selectedQuals = [];
  if (selectedAccountType === "doctor") {
    const checkboxes = document.querySelectorAll(".qual-cb:checked");
    checkboxes.forEach((cb) => selectedQuals.push(cb.value));
    if (selectedQuals.length === 0) {
      const qErr = document.getElementById("qual-error");
      if (qErr) qErr.style.display = "block";
      return;
    }
    const qErr = document.getElementById("qual-error");
    if (qErr) qErr.style.display = "none";
  }

  const spec = document.getElementById("reg-specialization")
    ? document.getElementById("reg-specialization").value.trim()
    : "";
  const pw = document.getElementById("reg-password").value;
  const pw2 = document.getElementById("reg-password2").value;

  // Email regex validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    if (err) {
      err.style.display = "block";
      err.textContent =
        "Please enter a valid email address (e.g. name@example.com).";
    }
    return;
  }

  // Phone regex validation (supports Bangladeshi formats: 017XXXXXXXX, +88017XXXXXXXX, +880-17XX-XXXXXX)
  const phoneRegex = /^(?:\+?880|880|0)?[- ]?1[3-9]\d{2}[- ]?\d{6}$/;
  if (!phoneRegex.test(phone)) {
    if (err) {
      err.style.display = "block";
      err.textContent =
        "Please enter a valid Bangladeshi phone number (e.g. 017XXXXXXXX or +880-17XXXXXXXX).";
    }
    return;
  }

  // Password regex validation (min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character)
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+={}[\]:;"'<>,./~`|\\]).{8,}$/;
  if (!passwordRegex.test(pw)) {
    if (err) {
      err.style.display = "block";
      err.textContent =
        "Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character.";
    }
    return;
  }

  // Confirm password
  if (pw !== pw2) {
    if (err) {
      err.style.display = "block";
      err.textContent = "Passwords do not match.";
    }
    return;
  }

  let selectedSectors = [];
  if (selectedAccountType === "charity") {
    const checkboxes = document.querySelectorAll(".sector-cb:checked");
    checkboxes.forEach((cb) => selectedSectors.push(cb.value));
    if (selectedSectors.length === 0) {
      const secErr = document.getElementById("sectors-error");
      if (secErr) secErr.style.display = "block";
      return;
    }
    const secErr = document.getElementById("sectors-error");
    if (secErr) secErr.style.display = "none";
  }

  const btn = document.getElementById("register-submit-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Creating account…";
  }

  const fd = new FormData();
  fd.append("accountType", selectedAccountType);
  fd.append("fullName", name);
  fd.append("regNumber", regNumber);
  fd.append("email", email);
  fd.append("phone", phone);
  fd.append("street", street);
  fd.append("area", area);
  fd.append("city", city);
  if (selectedQuals && selectedQuals.length > 0) {
    fd.append("qualification", selectedQuals.join(","));
  }
  if (selectedSectors && selectedSectors.length > 0) {
    fd.append("sectors", selectedSectors.join(","));
  }
  fd.append("specialization", spec);
  fd.append("password", pw);

  if (selectedSectors && selectedSectors.length > 0) {
    fd.append("sectors", selectedSectors.join(","));
  }

  const picInp = document.getElementById("reg-profile-pic");
  if (picInp && picInp.files[0]) {
    fd.append("profilePicture", picInp.files[0]);
  }

  const res = await apiPost("register.php", fd);

  if (btn) {
    btn.disabled = false;
    btn.textContent = "Create Account";
  }

  if (!res.ok) {
    if (err) {
      err.style.display = "block";
      err.textContent = res.msg;
    }
    return;
  }
  HL.currentUser = res.user;
  if (HL.currentUser && HL.currentUser.id != null) {
    HL.currentUser.id = Number(HL.currentUser.id);
  }
  showToast("Account created! Welcome to HumanityLink!", "success");
  let dest = "index.html";
  if (selectedAccountType === "restaurant") {
    dest = "dashboard.html";
  } else if (selectedAccountType === "doctor") {
    dest = "doctor-dashboard.html";
  } else if (selectedAccountType === "charity") {
    const s = selectedSectors.join(",").toLowerCase();
    if (s.includes("medical") && !s.includes("food")) {
      dest = "medical-welfare.html";
    } else {
      dest = "food-support.html";
    }
  }
  setTimeout(() => (window.location.href = dest), 900);
}

function initAuthPage() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;
  if (HL.currentUser) {
    // Redirect based on account type
    const type = HL.currentUser.accountType;
    if (type === "admin") {
      window.location.href = "admin/dashboard.php";
      return;
    }
    if (type === "doctor") {
      window.location.href = "doctor-dashboard.html";
      return;
    }
    if (type === "restaurant") {
      window.location.href = "dashboard.html";
      return;
    }
    if (type === "charity") {
      const s = (HL.currentUser.sectors || "").toLowerCase();
      window.location.href =
        s.includes("medical") && !s.includes("food")
          ? "medical-welfare.html"
          : "food-support.html";
      return;
    }
    window.location.href = "index.html";
    return;
  }
  const params = new URLSearchParams(window.location.search);
  if (params.get("tab") === "register") switchTab("register");
}

// ── Food Support Page ─────────────────────────────────────
let pendingClaimId = null;

function applyFilter() {
  const type = document.getElementById("filterType")?.value || "";
  const status = document.getElementById("filterStatus")?.value || "";
  const date = document.getElementById("filterDate")?.value || "";
  let posts = HL.foodPosts;
  if (type) posts = posts.filter((p) => p.foodType === type);
  if (status === "available") posts = posts.filter((p) => !p.claimedBy);
  if (status === "claimed") posts = posts.filter((p) => !!p.claimedBy);
  if (date) posts = posts.filter((p) => p.pickupDate === date);
  renderGrid(posts);
}

function clearFilters() {
  const typeEl = document.getElementById("filterType");
  const statusEl = document.getElementById("filterStatus");
  const dateEl = document.getElementById("filterDate");
  if (typeEl) typeEl.value = "";
  if (statusEl) statusEl.value = "";
  if (dateEl) dateEl.value = "";
  renderGrid(HL.foodPosts);
}

function renderGrid(posts) {
  const grid = document.getElementById("foodGrid");
  const empty = document.getElementById("emptyState");
  const count = document.getElementById("filter-count");
  if (!grid) return;
  if (count)
    count.textContent =
      posts.length + " post" + (posts.length !== 1 ? "s" : "") + " found";
  if (!posts.length) {
    grid.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");
  grid.innerHTML = posts.map((p) => foodCardHTML(p)).join("");
}

function foodCardHTML(p) {
  const claimed = !!p.claimedBy;
  const currentId =
    HL.currentUser && HL.currentUser.id != null
      ? Number(HL.currentUser.id)
      : null;
  const postedBy = Number(p.postedBy);
  const claimedBy = p.claimedBy ? Number(p.claimedBy) : null;
  const isPoster = currentId !== null && postedBy === currentId;
  const isClaimer = currentId !== null && claimedBy === currentId;
  const hasAccess = claimed && (isPoster || isClaimer);
  const canClaim =
    HL.currentUser && HL.currentUser.accountType === "charity" && !claimed;
  const icon = foodTypeIcon(p.foodType);

  let footerBtn = "";
  if (canClaim) {
    footerBtn = `<button class="btn btn-primary btn-sm" onclick="openClaimModal(${p.id})" id="claim-${p.id}"><i class="fa-solid fa-handshake"></i> Claim</button>`;
  } else if (hasAccess) {
    const targetUserId = isPoster ? claimedBy : postedBy;
    const btnLabel = isPoster ? "View Charity" : "View Profile";
    footerBtn = `<a href="restaurant-profile.html?id=${targetUserId}&post=${p.id}" class="btn btn-secondary btn-sm" id="view-profile-${p.id}"><i class="fa-solid fa-user"></i> ${btnLabel}</a>`;
  } else if (!HL.currentUser) {
    footerBtn = `<a href="auth.html" class="btn btn-outline btn-sm">Log in to Claim</a>`;
  }

  return `
  <div class="food-card" id="card-${p.id}">
    ${claimed ? '<div class="claimed-overlay"><i class="fa-solid fa-circle-check"></i> Claimed</div>' : ""}
    <div class="food-card-header">
      <div class="food-type-icon">${icon}</div>
      <div>
        <h4>${p.foodName}</h4>
        <div class="restaurant-name"><i class="fa-solid fa-store"></i> ${p.postedByName}</div>
      </div>
    </div>
    ${p.foodImage ? `<div style="width: 100%; height: 200px; background: #eee;"><img src="${p.foodImage}" style="width: 100%; height: 100%; object-fit: cover; display: block;" alt="${p.foodName}"></div>` : ""}
    <div class="food-card-body">
      <div class="food-detail-row"><span class="icon"><i class="fa-solid fa-tag"></i></span><div><div class="key">Food Type</div><div class="val">${p.foodType}</div></div></div>
      <div class="food-detail-row"><span class="icon"><i class="fa-solid fa-box-open"></i></span><div><div class="key">Quantity</div><div class="val">${p.quantity}</div></div></div>
      <div class="food-detail-row"><span class="icon"><i class="fa-regular fa-calendar-days"></i></span><div><div class="key">Pickup Date</div><div class="val">${formatDate(p.pickupDate)}</div></div></div>
      <div class="food-detail-row"><span class="icon"><i class="fa-regular fa-clock"></i></span><div><div class="key">Pickup Time</div><div class="val">${p.pickupFrom} – ${p.pickupTo}</div></div></div>
      ${p.notes ? `<div class="food-detail-row"><span class="icon"><i class="fa-regular fa-note-sticky"></i></span><div><div class="key">Notes</div><div class="val">${p.notes}</div></div></div>` : ""}
    </div>
    <div class="food-card-footer">
      <span class="food-status ${claimed ? "claimed" : "available"}">
        <span class="status-dot"></span>
        ${claimed ? "Claimed by " + (p.claimedByName || "Org") : "Available"}
      </span>
      ${footerBtn}
    </div>
  </div>`;
}

function openClaimModal(postId) {
  pendingClaimId = postId;
  const p = HL.foodPosts.find((x) => x.id === postId);
  if (!p) return;
  const summary = document.getElementById("claimPostSummary");
  if (summary) {
    summary.innerHTML = `
      ${p.foodImage ? `<div style="width: 100%; height: 150px; background: #eee; margin-bottom: 10px; border-radius: 8px; overflow: hidden;"><img src="${p.foodImage}" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ""}
      <strong>${p.foodName}</strong> (${p.foodType})<br>
      Quantity: ${p.quantity}<br>
      Pickup: ${formatDate(p.pickupDate)} &bull; ${p.pickupFrom} – ${p.pickupTo}<br>
      From: ${p.postedByName}`;
  }
  const modal = document.getElementById("claimModal");
  if (modal) modal.classList.add("show");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("show");
}

async function confirmClaim() {
  if (!pendingClaimId) return;
  if (!HL.currentUser) {
    window.location.href = "auth.html";
    return;
  }

  const btn = document.getElementById("confirm-claim-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Claiming…';
  }

  const res = await apiPost("claim_post.php", { postId: pendingClaimId });
  closeModal("claimModal");

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Confirm Claim';
  }

  if (res.ok) {
    showToast(
      "Post claimed! You can now view the restaurant profile.",
      "success",
    );
    await loadFoodPosts();
    renderGrid(HL.foodPosts);
  } else {
    showToast(res.msg, "error");
  }
}

async function initFoodSupportPage() {
  const grid = document.getElementById("foodGrid");
  if (!grid) return;

  renderSidebarAccount();

  if (HL.currentUser && HL.currentUser.accountType === "user") {
    window.location.href = "medical-welfare.html";
    return;
  }

  // If restaurant user is browsing, ensure they have a link to Dashboard in the sidebar
  if (HL.currentUser && HL.currentUser.accountType === "restaurant") {
    const navEl = document.querySelector(".app-sidebar-nav");
    if (navEl && !document.getElementById("sbl-dash")) {
      const dashLink = document.createElement("a");
      dashLink.href = "dashboard.html";
      dashLink.className = "app-sidebar-link";
      dashLink.id = "sbl-dash";
      dashLink.innerHTML = `<span class="asbl-icon"><i class="fa-solid fa-chart-pie"></i></span><span class="asbl-text">Dashboard</span>`;
      const sectionLabel = navEl.querySelector(".app-sidebar-section-label");
      if (sectionLabel && sectionLabel.nextSibling) {
        navEl.insertBefore(dashLink, sectionLabel.nextSibling);
      } else {
        navEl.prepend(dashLink);
      }
    }
  } else if (HL.currentUser && HL.currentUser.accountType === "charity") {
    const navEl = document.querySelector(".app-sidebar-nav");
    if (navEl) {
      navEl.innerHTML = '<div class="app-sidebar-section-label">Charity Dashboard</div>';
      navEl.innerHTML += `<a href="food-support.html" class="app-sidebar-link active" id="sbl-food"><span class="asbl-icon"><i class="fa-solid fa-bowl-food"></i></span><span class="asbl-text">Food Support</span></a>`;
      navEl.innerHTML += `<a href="medical-welfare.html" class="app-sidebar-link" id="sbl-med"><span class="asbl-icon"><i class="fa-solid fa-notes-medical"></i></span><span class="asbl-text">Medical & Welfare</span></a>`;
      navEl.innerHTML += `<a href="financial-support.html" class="app-sidebar-link" id="sbl-fin"><span class="asbl-icon"><i class="fa-solid fa-hand-holding-dollar"></i></span><span class="asbl-text">Campaign Donation</span></a>`;
    }
  }

  await loadFoodPosts();

  const wrapper = document.getElementById("post-btn-wrapper");
  if (wrapper) {
    if (HL.currentUser && HL.currentUser.accountType === "restaurant") {
      wrapper.innerHTML =
        '<a href="dashboard.html" class="btn btn-primary" id="go-post-btn"><i class="fa-solid fa-circle-plus"></i> Post Food Donation</a>';
    } else if (!HL.currentUser) {
      wrapper.innerHTML =
        '<a href="auth.html" class="btn btn-outline" id="login-to-post-btn">Log In to Post or Claim</a>';
    }
  }

  renderGrid(HL.foodPosts);
}

// ── Dashboard Page ────────────────────────────────────────
function showSection(sec, link, e) {
  if (e && e.preventDefault) e.preventDefault();
  ["overview", "post", "posts"].forEach((s) => {
    const el = document.getElementById("section-" + s);
    if (el) el.classList.add("hidden");
  });
  const target = document.getElementById("section-" + sec);
  if (target) target.classList.remove("hidden");
  // Support both old sidebar-link and new app-sidebar-link
  document
    .querySelectorAll(".sidebar-link, .app-sidebar-link")
    .forEach((l) => l.classList.remove("active"));
  if (link) link.classList.add("active");
  if (sec === "overview") loadOverview();
  if (sec === "posts") loadMyPosts();
  return false;
}

function myPosts() {
  if (!HL.currentUser) return [];
  const currentId = Number(HL.currentUser.id);
  return HL.foodPosts.filter((p) => Number(p.postedBy) === currentId);
}

function loadOverview() {
  const posts = myPosts();
  const totalEl = document.getElementById("stat-total");
  const claimedEl = document.getElementById("stat-claimed");
  const activeEl = document.getElementById("stat-active");
  if (totalEl) totalEl.textContent = posts.length;
  if (claimedEl)
    claimedEl.textContent = posts.filter((p) => p.claimedBy).length;
  if (activeEl) activeEl.textContent = posts.filter((p) => !p.claimedBy).length;

  const recent = posts.slice(0, 3);
  const grid = document.getElementById("recentGrid");
  const empty = document.getElementById("recentEmpty");
  if (!grid) return;
  if (!recent.length) {
    grid.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");
  grid.innerHTML = recent.map((p) => miniCard(p)).join("");
}

function loadMyPosts() {
  const posts = myPosts();
  const grid = document.getElementById("myPostsGrid");
  const empty = document.getElementById("myPostsEmpty");
  if (!grid) return;
  if (!posts.length) {
    grid.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");
  grid.innerHTML = posts.map((p) => miniCard(p)).join("");
}

function miniCard(p) {
  const claimed = !!p.claimedBy;
  return `
  <div class="food-card" id="mycard-${p.id}">
    ${claimed ? '<div class="claimed-overlay"><i class="fa-solid fa-circle-check"></i> Claimed</div>' : ""}
    <div class="food-card-header">
      <div class="food-type-icon">${foodTypeIcon(p.foodType)}</div>
      <div><h4>${p.foodName}</h4><div class="restaurant-name">${p.foodType}</div></div>
    </div>
    ${p.foodImage ? `<div style="width: 100%; height: 150px; background: #eee;"><img src="${p.foodImage}" style="width: 100%; height: 100%; object-fit: cover; display: block;" alt="${p.foodName}"></div>` : ""}
    <div class="food-card-body">
      <div class="food-detail-row"><span class="icon"><i class="fa-solid fa-box-open"></i></span><div><div class="key">Quantity</div><div class="val">${p.quantity}</div></div></div>
      <div class="food-detail-row"><span class="icon"><i class="fa-regular fa-calendar-days"></i></span><div><div class="key">Pickup</div><div class="val">${formatDate(p.pickupDate)} &bull; ${p.pickupFrom}–${p.pickupTo}</div></div></div>
      ${claimed ? `<div class="food-detail-row"><span class="icon"><i class="fa-solid fa-handshake"></i></span><div><div class="key">Claimed by</div><div class="val">${p.claimedByName}</div></div></div>` : ""}
    </div>
    <div class="food-card-footer">
      <span class="food-status ${claimed ? "claimed" : "available"}"><span class="status-dot"></span>${claimed ? "Claimed" : "Available"}</span>
      ${claimed ? `<a href="restaurant-profile.html?id=${p.claimedBy}&post=${p.id}" class="btn btn-secondary btn-sm" id="view-claimant-${p.id}"><i class="fa-solid fa-user"></i> View Charity</a>` : ""}
    </div>
  </div>`;
}

async function submitPost(e) {
  if (e) e.preventDefault();
  const from = document.getElementById("pf-from")?.value;
  const to = document.getElementById("pf-to")?.value;
  if (!from || !to) return;
  if (from >= to) {
    showToast("Pickup end time must be after start time.", "error");
    return;
  }

  const btn = document.getElementById("submit-post-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Posting…';
  }

  const fd = new FormData();
  fd.append("foodType", document.getElementById("pf-type").value);
  fd.append("foodName", document.getElementById("pf-name").value.trim());
  fd.append("quantity", document.getElementById("pf-qty").value.trim());
  fd.append("pickupDate", document.getElementById("pf-date").value);
  fd.append("pickupFrom", from);
  fd.append("pickupTo", to);
  fd.append("notes", document.getElementById("pf-notes").value.trim());

  const picInp = document.getElementById("pf-image");
  if (picInp && picInp.files[0]) {
    fd.append("foodImage", picInp.files[0]);
  }

  const res = await apiPost("food_posts.php", fd);

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Post Donation';
  }

  if (!res.ok) {
    showToast(res.msg || "Failed to post.", "error");
    return;
  }

  // Add the new post to local state and refresh
  HL.foodPosts.unshift(res.post);
  showToast("Food donation posted successfully!", "success");
  document.getElementById("postFoodForm")?.reset();
  loadOverview();
  showSection("posts", document.getElementById("sbl-posts"));
}

async function initDashboardPage() {
  const dash =
    document.getElementById("dashboardLayout") ||
    document.getElementById("section-overview");
  if (!dash) return;
  if (!HL.currentUser) {
    window.location.href = "auth.html";
    return;
  }
  if (HL.currentUser.accountType !== "restaurant") {
    let dest = "index.html";
    if (HL.currentUser.accountType === "charity") {
      const s = (HL.currentUser.sectors || "").toLowerCase();
      dest =
        s.includes("medical") && !s.includes("food")
          ? "medical-welfare.html"
          : "food-support.html";
    }
    window.location.href = dest;
    return;
  }

  renderSidebarAccount();

  await loadFoodPosts();

  const nameEl = document.getElementById("dash-name");
  if (nameEl) nameEl.textContent = HL.currentUser.fullName.split(" ")[0];

  const dateInput = document.getElementById("pf-date");
  if (dateInput) dateInput.min = new Date().toISOString().split("T")[0];

  if (window.location.hash === "#post-food") {
    showSection("post", document.getElementById("sbl-post"));
  } else if (window.location.hash === "#my-posts") {
    showSection("posts", document.getElementById("sbl-posts"));
  } else {
    loadOverview();
  }
}

// ── Restaurant Profile Page ───────────────────────────────
let profileTargetUser = null;
let profileTargetPost = null;

async function initRestaurantProfilePage() {
  const header = document.getElementById("profileHeader");
  if (!header) return;
  if (!HL.currentUser) {
    window.location.href = "auth.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const userId = parseInt(params.get("id"));
  const postId = parseInt(params.get("post"));

  // Load posts if not already loaded
  if (!HL.foodPosts.length) await loadFoodPosts();
  profileTargetPost = HL.foodPosts.find((p) => p.id === postId) || null;

  // Access check on post before fetching profile
  const currentId = Number(HL.currentUser.id);
  if (profileTargetPost) {
    const isClaimant =
      profileTargetPost.claimedBy &&
      Number(profileTargetPost.claimedBy) === currentId;
    const isPoster =
      profileTargetPost.postedBy &&
      Number(profileTargetPost.postedBy) === currentId;
    if (!isClaimant && !isPoster) {
      header.innerHTML =
        '<p class="access-denied-msg">Access denied. You can only view this profile after claiming the donation.</p>';
      return;
    }
  }

  // Adjust back button for restaurant users
  const backBtn = document.getElementById("back-btn");
  if (backBtn && HL.currentUser.accountType === "restaurant") {
    backBtn.href = "dashboard.html";
    backBtn.innerHTML =
      '<i class="fa-solid fa-arrow-left"></i> Back to Dashboard';
  }

  // Fetch profile from API
  const res = await apiGet(`profile.php?id=${userId}`);
  if (!res.ok) {
    const nameEl = document.getElementById("profileName");
    if (nameEl) nameEl.textContent = res.msg || "User not found.";
    return;
  }

  profileTargetUser = res.user;

  // Render profile header
  const initials = profileTargetUser.fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const initialsEl = document.getElementById("profileInitials");
  const nameEl = document.getElementById("profileName");
  if (initialsEl) {
    if (profileTargetUser.profilePicture) {
      initialsEl.innerHTML = `<img src="${profileTargetUser.profilePicture}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
      initialsEl.textContent = initials;
    }
  }
  if (nameEl) nameEl.textContent = profileTargetUser.fullName;
  document.title = profileTargetUser.fullName + " – HumanityLink";

  const typeLabels = {
    restaurant:
      '<i class="fa-solid fa-utensils"></i> Restaurant / Community Center',
    charity:
      '<i class="fa-solid fa-hand-holding-heart"></i> Charity Organization',
    user: '<i class="fa-solid fa-user"></i> General User',
  };
  const badgeEl = document.getElementById("profileBadge");
  if (badgeEl)
    badgeEl.innerHTML =
      typeLabels[profileTargetUser.accountType] ||
      profileTargetUser.accountType;

  // Update message box header based on recipient
  const msgBoxTitle = document.querySelector("#messageBox h3");
  if (msgBoxTitle) {
    const role =
      profileTargetUser.accountType === "restaurant" ? "Donor" : "Charity";
    msgBoxTitle.innerHTML = `<i class="fa-solid fa-comments"></i> Message ${role}`;
  }

  const contactGrid = document.getElementById("contactGrid");
  if (contactGrid) {
    contactGrid.innerHTML = `
      <div class="contact-item"><span class="ci-icon"><i class="fa-solid fa-phone"></i></span><div><div class="ci-label">Phone</div><div class="ci-val"><a href="tel:${profileTargetUser.phone}" class="contact-link">${profileTargetUser.phone}</a></div></div></div>
      <div class="contact-item"><span class="ci-icon"><i class="fa-solid fa-envelope"></i></span><div><div class="ci-label">Email</div><div class="ci-val"><a href="mailto:${profileTargetUser.email}" class="contact-link">${profileTargetUser.email}</a></div></div></div>
      <div class="contact-item"><span class="ci-icon"><i class="fa-solid fa-location-dot"></i></span><div><div class="ci-label">Address</div><div class="ci-val">${[profileTargetUser.street, profileTargetUser.area, profileTargetUser.city].filter(Boolean).join(", ")}</div></div></div>
      ${profileTargetUser.regNumber ? `<div class="contact-item"><span class="ci-icon"><i class="fa-solid fa-id-card"></i></span><div><div class="ci-label">Reg. Number</div><div class="ci-val">${profileTargetUser.regNumber}</div></div></div>` : ""}`;
  }

  // Render claimed post detail
  const postDetail = document.getElementById("postDetail");
  if (postDetail && profileTargetPost) {
    postDetail.innerHTML = `
      <div class="food-detail-row"><span class="icon"><i class="fa-solid fa-tag"></i></span><div><div class="key">Food Type</div><div class="val">${profileTargetPost.foodType}</div></div></div>
      <div class="food-detail-row"><span class="icon"><i class="fa-solid fa-bowl-rice"></i></span><div><div class="key">Food Name</div><div class="val">${profileTargetPost.foodName}</div></div></div>
      <div class="food-detail-row"><span class="icon"><i class="fa-solid fa-box-open"></i></span><div><div class="key">Quantity</div><div class="val">${profileTargetPost.quantity}</div></div></div>
      <div class="food-detail-row"><span class="icon"><i class="fa-regular fa-calendar-days"></i></span><div><div class="key">Pickup Date</div><div class="val">${formatDate(profileTargetPost.pickupDate)}</div></div></div>
      <div class="food-detail-row"><span class="icon"><i class="fa-regular fa-clock"></i></span><div><div class="key">Pickup Time</div><div class="val">${profileTargetPost.pickupFrom} – ${profileTargetPost.pickupTo}</div></div></div>
      ${profileTargetPost.notes ? `<div class="food-detail-row"><span class="icon"><i class="fa-regular fa-note-sticky"></i></span><div><div class="key">Notes</div><div class="val">${profileTargetPost.notes}</div></div></div>` : ""}`;
  }

  await loadMessages();
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

async function loadMessages() {
  if (!profileTargetPost) return;
  const res = await apiGet(`messages.php?post_id=${profileTargetPost.id}`);
  const area = document.getElementById("messagesArea");
  if (!area) return;
  if (!res.ok || !res.messages.length) {
    area.innerHTML =
      '<div class="msg-empty">Send a message to coordinate pickup.</div>';
    return;
  }
  const currentId = Number(HL.currentUser.id);
  area.innerHTML = res.messages
    .map((m) => {
      const isSent = Number(m.from) === currentId;
      return `
    <div style="display: flex; flex-direction: column; width: fit-content; max-width: 75%; align-self: ${isSent ? "flex-end" : "flex-start"};">
      <div class="msg-bubble ${isSent ? "sent" : "received"}" style="max-width: 100%; align-self: ${isSent ? "flex-end" : "flex-start"};">${escapeHtml(m.text)}</div>
      <div class="msg-time ${isSent ? "msg-time-sent" : "msg-time-received"}">${m.time}</div>
    </div>`;
    })
    .join("");
  area.scrollTop = area.scrollHeight;
}

async function sendMsg() {
  const inp = document.getElementById("msgInput");
  if (!inp) return;
  const text = inp.value.trim();
  if (!text || !profileTargetUser || !profileTargetPost) return;

  const res = await apiPost("messages.php", {
    receiverId: profileTargetUser.id,
    postId: profileTargetPost.id,
    message: text,
  });
  if (res.ok) {
    inp.value = "";
    await loadMessages();
  } else {
    showToast(res.msg || "Failed to send message.", "error");
  }
}

// ── Hero Slider ──────────────────────────────────────────────
function initHeroSlider() {
  const deck = document.getElementById("heroSliderDeck");
  if (!deck) return;

  const cards = Array.from(deck.querySelectorAll(".polaroid-card"));
  const dots = Array.from(document.querySelectorAll(".slider-dot"));
  const total = cards.length;
  let current = 0;
  let timer = null;

  function getClass(i) {
    const diff = (i - current + total) % total;
    if (diff === 0) return "active";
    if (diff === 1) return "next";
    if (diff === total - 1) return "prev";
    return "hidden";
  }

  function goTo(idx) {
    current = ((idx % total) + total) % total;
    cards.forEach((c, i) => {
      c.className = "polaroid-card " + getClass(i);
    });
    dots.forEach((d, i) => d.classList.toggle("active", i === current));
  }

  function next() {
    goTo(current + 1);
  }
  function prev() {
    goTo(current - 1);
  }

  function startAuto() {
    stopAuto();
    timer = setInterval(next, 3500);
  }
  function stopAuto() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  // Arrow buttons
  const btnNext = document.getElementById("sliderNext");
  const btnPrev = document.getElementById("sliderPrev");
  if (btnNext)
    btnNext.addEventListener("click", () => {
      next();
      startAuto();
    });
  if (btnPrev)
    btnPrev.addEventListener("click", () => {
      prev();
      startAuto();
    });

  // Dot buttons
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      goTo(Number(dot.dataset.dot));
      startAuto();
    });
  });

  // Card click => advance
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      next();
      startAuto();
    });
  });

  // Touch / swipe support
  let touchX = null;
  deck.addEventListener(
    "touchstart",
    (e) => {
      touchX = e.touches[0].clientX;
    },
    { passive: true },
  );
  deck.addEventListener(
    "touchend",
    (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) < 40) return;
      dx < 0 ? next() : prev();
      startAuto();
    },
    { passive: true },
  );

  // Pause on hover
  deck.addEventListener("mouseenter", stopAuto);
  deck.addEventListener("mouseleave", startAuto);

  goTo(0);
  startAuto();
}

// ── Global Window Bindings ─────────────────────────────────
window.switchTab = switchTab;
window.selectType = selectType;
window.togglePw = togglePw;
window.doLogin = doLogin;
window.doRegister = doRegister;
window.applyFilter = applyFilter;
window.clearFilters = clearFilters;
window.renderGrid = renderGrid;
window.foodCardHTML = foodCardHTML;
window.openClaimModal = openClaimModal;
window.closeModal = closeModal;
window.confirmClaim = confirmClaim;
window.showSection = showSection;
window.loadOverview = loadOverview;
window.loadMyPosts = loadMyPosts;
window.submitPost = submitPost;
window.sendMsg = sendMsg;
window.handleOfferingClick = handleOfferingClick;
window.doLogout = doLogout;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.saveSettings = saveSettings;
window.foodTypeEmoji = foodTypeEmoji;
window.foodTypeIcon = foodTypeIcon;
window.formatDate = formatDate;
window.toggleTheme = toggleTheme;

function toggleCampaignModal(show) {
  const modal = document.getElementById("campaignModal");
  if (!modal) return;
  if (show) {
    modal.classList.add("show");
    document.getElementById("campaignForm").reset();
    document.getElementById("camp-error").style.display = "none";
  } else {
    modal.classList.remove("show");
  }
}

window.toggleCampaignModal = toggleCampaignModal;

async function postCampaign(e) {
  e.preventDefault();
  const btn = document.getElementById("camp-submit-btn");
  const err = document.getElementById("camp-error");
  if (err) err.style.display = "none";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Posting...';
  }

  const formData = new FormData();
  formData.append(
    "subject",
    document.getElementById("camp-subject").value.trim(),
  );
  formData.append(
    "description",
    document.getElementById("camp-desc").value.trim(),
  );
  formData.append(
    "location",
    document.getElementById("camp-location").value.trim(),
  );
  formData.append("start_time", document.getElementById("camp-start").value);
  formData.append("end_time", document.getElementById("camp-end").value);
  formData.append("campaign_date", document.getElementById("camp-date").value);

  const imageInput = document.getElementById("camp-image");
  if (imageInput && imageInput.files[0]) {
    formData.append("image", imageInput.files[0]);
  }

  const res = await apiPost("doctor_campaigns.php", formData);
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Post Campaign';
  }

  if (!res.ok) {
    if (err) {
      err.style.display = "block";
      err.textContent = res.msg;
    }
    return;
  }

  showToast(res.msg, "success");
  toggleCampaignModal(false);
  await loadDoctorCampaigns();
}

async function loadDoctorCampaigns() {
  const res = await apiGet("doctor_campaigns.php");
  if (res.ok) {
    renderDoctorCampaigns(res.campaigns || []);
  }
}

window.openParticipantsModal = async function (campaignId, subject) {
  const modal = document.getElementById("participantsModal");
  const tbody = document.getElementById("participants-table-body");
  const title = document.getElementById("participants-camp-title");
  if (!modal || !tbody) return;

  if (title) title.textContent = subject;
  tbody.innerHTML =
    '<tr><td colspan="5" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';
  modal.classList.add("show");

  const res = await apiGet("campaign_join.php?campaign_id=" + campaignId);
  if (res.ok) {
    if (!res.participants || res.participants.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">No participants yet.</td></tr>';
    } else {
      tbody.innerHTML = res.participants
        .map(
          (p, idx) => `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 10px;">${idx + 1}</td>
          <td style="padding: 10px; font-weight:600;">${p.full_name}</td>
          <td style="padding: 10px;"><span class="badge ${p.account_type === "charity" ? "badge-primary" : "badge-outline"}">${p.account_type}</span></td>
          <td style="padding: 10px;"><i class="fa-solid fa-phone"></i> ${p.phone}<br><i class="fa-solid fa-envelope"></i> ${p.email}</td>
          <td style="padding: 10px;">${new Date(p.joined_at).toLocaleDateString()}</td>
        </tr>
      `,
        )
        .join("");
    }
  } else {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--danger);">${res.msg}</td></tr>`;
  }
};

window.closeParticipantsModal = function () {
  const modal = document.getElementById("participantsModal");
  if (modal) modal.classList.remove("show");
};

window.postCampaign = postCampaign;

window.deleteCampaign = async function (id, subject) {
  if (
    !confirm(
      `"${subject}" campaign টি permanently delete করতে চান?\nParticipants list-ও মুছে যাবে।`,
    )
  )
    return;

  const res = await fetch("api/doctor_campaigns.php", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  })
    .then((r) => r.json())
    .catch(() => ({ ok: false, msg: "Network error." }));

  if (res.ok) {
    showToast(res.msg, "success");
    const card = document.getElementById("camp-card-" + id);
    if (card) {
      card.style.transition = "opacity 0.3s, transform 0.3s";
      card.style.opacity = "0";
      card.style.transform = "scale(0.95)";
      setTimeout(() => card.remove(), 300);
    }
    // If grid is now empty, show empty state
    setTimeout(() => {
      const grid = document.getElementById("campaigns-grid");
      if (grid && grid.children.length === 0) {
        grid.innerHTML =
          '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">You have not posted any campaigns yet.</div>';
      }
    }, 350);
  } else {
    showToast(res.msg || "Delete failed.", "error");
  }
};

function renderDoctorCampaigns(campaigns) {
  const grid = document.getElementById("campaigns-grid");
  if (!grid) return;
  if (campaigns.length === 0) {
    grid.innerHTML =
      '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">You have not posted any campaigns yet.</div>';
    return;
  }

  grid.innerHTML = campaigns
    .map(
      (c) => `
    <div class="campaign-card" style="display:flex; flex-direction:column;" id="camp-card-${c.id}">
      ${c.image_url ? `<div style="width:100%; height:200px; border-radius:8px; overflow:hidden; margin-bottom:15px;"><img src="${c.image_url}" style="width:100%; height:100%; object-fit:cover;" alt="Campaign Image"></div>` : ""}
      <div class="campaign-header" style="border-bottom:none; padding-bottom:0; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <h3 class="campaign-title" style="margin:0; flex:1;">${c.subject}</h3>
          <button class="btn btn-sm" onclick="deleteCampaign(${c.id}, '${c.subject.replace(/'/g, "\\'")}')"
            style="background:rgba(220,53,69,0.1); color:var(--danger); border:1px solid rgba(220,53,69,0.3); margin-left:10px; flex-shrink:0;"
            title="Delete Campaign">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
        <div class="campaign-meta"><i class="fa-solid fa-calendar-day"></i> ${new Date(c.campaign_date).toLocaleDateString()}</div>
      </div>
      <div class="campaign-desc" style="flex:1;">
        <p style="margin:0 0 10px 0; color:var(--text-muted); font-size:0.9rem;"><i class="fa-solid fa-location-dot"></i> ${c.location} &nbsp;|&nbsp; <i class="fa-regular fa-clock"></i> ${c.start_time.substring(0, 5)} - ${c.end_time.substring(0, 5)}</p>
        <p style="margin:0; font-size:0.95rem; line-height:1.5;">${c.description}</p>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid var(--border); padding-top: 15px; margin-top: auto;">
        <div style="font-weight:600; color:var(--primary); font-size:0.9rem;"><i class="fa-solid fa-users"></i> ${c.participant_count} Joined</div>
        <button class="btn btn-outline btn-sm" onclick="openParticipantsModal(${c.id}, '${c.subject.replace(/'/g, "\\'")}')">View List</button>
      </div>
    </div>
  `,
    )
    .join("");
}

async function initDoctorDashboardPage() {
  // Only run on doctor-dashboard.html
  if (!document.getElementById("campaigns-grid")) return;

  if (!HL.currentUser) {
    window.location.href = "auth.html";
    return;
  }
  if (HL.currentUser.accountType !== "doctor") {
    window.location.href = "auth.html";
    return;
  }

  renderSidebarAccount();
  await loadDoctorCampaigns();
}

// ── Master Init on Page Load ───────────────────────────────
async function initApp() {
  initTheme();

  // Check if user is logged in via PHP session
  const meRes = await apiGet("me.php");
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
  await initMedicalPage();
  await initDoctorDashboardPage();
  await initFinancialPage();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// ── Theme Management ───────────────────────────────────────
function getPreferredTheme() {
  const saved = localStorage.getItem("hl_theme");
  if (saved) return saved;
  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === "dark") {
    html.classList.add("dark-theme");
  } else {
    html.classList.remove("dark-theme");
  }
  localStorage.setItem("hl_theme", theme);
  // Update any theme toggle buttons
  document
    .querySelectorAll(".theme-toggle-btn, #themeToggleBtn, #themeToggleMobile")
    .forEach((btn) => {
      btn.innerHTML =
        theme === "dark"
          ? '<i class="fa-solid fa-sun"></i>'
          : '<i class="fa-solid fa-moon"></i>';
      btn.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
      );
    });
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark-theme");
  applyTheme(isDark ? "light" : "dark");
}

function initTheme() {
  const theme = getPreferredTheme();
  applyTheme(theme);

  if (window.matchMedia) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (!localStorage.getItem("hl_theme")) {
          applyTheme(e.matches ? "dark" : "light");
        }
      });
  }
}

// ── Medical & Welfare Support ─────────────────────────────

HL.welfareCases = [];

async function loadWelfareCases() {
  const res = await apiGet("welfare_cases.php");
  if (res.ok) HL.welfareCases = res.cases;
  return HL.welfareCases;
}

function caseTypeIcon(type) {
  const map = {
    Medical: '<i class="fa-solid fa-kit-medical"></i>',
    Homeless: '<i class="fa-solid fa-house-crack"></i>',
    Abandoned: '<i class="fa-solid fa-person-circle-question"></i>',
    Other: '<i class="fa-solid fa-circle-exclamation"></i>',
  };
  return map[type] || '<i class="fa-solid fa-circle-exclamation"></i>';
}

function urgencyIcon(urgency) {
  const map = {
    Low: '<i class="fa-solid fa-arrow-down"></i>',
    Medium: '<i class="fa-solid fa-minus"></i>',
    High: '<i class="fa-solid fa-arrow-up"></i>',
    Critical: '<i class="fa-solid fa-bolt"></i>',
  };
  return map[urgency] || "";
}

function formatDateTime(dt) {
  if (!dt) return "";
  return new Date(dt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function caseCardHTML(c) {
  const isCharity = HL.currentUser && HL.currentUser.accountType === "charity";
  const isReporter =
    HL.currentUser && Number(HL.currentUser.id) === Number(c.reportedBy);
  const statusClass = c.status.replace(" ", "-");
  const location = [c.locationStreet, c.locationArea, c.locationCity]
    .filter(Boolean)
    .join(", ");
  const reported = formatDateTime(c.createdAt);

  let footerRight = "";
  if (isCharity) {
    if (c.status === "Pending") {
      footerRight = `
        <div class="status-update-wrap" style="display:flex;gap:8px;align-items:center;">
          <button class="btn btn-primary btn-sm" onclick="updateCaseStatus(${c.id}, 'Reviewing')"><i class="fa-solid fa-hand-paper"></i> Claim for Reviewing</button>
        </div>`;
    } else if (c.handledBy === Number(HL.currentUser.id)) {
      if (c.status === "Reviewing") {
        footerRight = `
          <div class="status-update-wrap" style="display:flex;gap:8px;align-items:center;">
            <button class="btn btn-outline btn-sm" onclick="openMwChat(${c.id}, ${c.reportedBy}, '${(c.reportedByName || "Anonymous").replace(/'/g, "\\'")}')" style="padding:0.25rem 0.5rem;font-size:0.8rem;"><i class="fa-solid fa-comments"></i> Chat</button>
            <button class="btn btn-success btn-sm" onclick="updateCaseStatus(${c.id}, 'Accepted')"><i class="fa-solid fa-check"></i> Accept</button>
            <button class="btn btn-danger btn-sm" onclick="updateCaseStatus(${c.id}, 'Pending')"><i class="fa-solid fa-xmark"></i> Reject</button>
          </div>`;
      } else {
        let actionBtn = "";
        if (c.status === "Accepted") {
          actionBtn = `<button class="btn btn-primary btn-sm" onclick="updateCaseStatus(${c.id}, 'Action Taken')" style="padding:0.25rem 0.5rem;font-size:0.8rem;"><i class="fa-solid fa-person-walking-arrow-right"></i> Mark Action Taken</button>`;
        } else if (c.status === "Action Taken") {
          actionBtn = `<button class="btn btn-success btn-sm" onclick="updateCaseStatus(${c.id}, 'Completed')" style="padding:0.25rem 0.5rem;font-size:0.8rem;"><i class="fa-solid fa-circle-check"></i> Mark Completed</button>`;
        }

        footerRight = `
          <div class="status-update-wrap" style="display:flex;gap:8px;align-items:center;">
            <button class="btn btn-outline btn-sm" onclick="openMwChat(${c.id}, ${c.reportedBy}, '${(c.reportedByName || "Anonymous").replace(/'/g, "\\'")}')" style="padding:0.25rem 0.5rem;font-size:0.8rem;"><i class="fa-solid fa-comments"></i> Chat</button>
            ${actionBtn}
          </div>`;
      }
    } else {
      footerRight = `<span style="font-size:.75rem;color:var(--muted)"><i class="fa-solid fa-building-ngo"></i> Handled by ${c.handledByName}</span>`;
    }
  } else if (isReporter) {
    if (c.handledBy) {
      footerRight = `
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-size:.75rem;color:var(--muted)"><i class="fa-solid fa-user"></i> My Report</span>
          <button class="btn btn-outline btn-sm" onclick="openMwChat(${c.id}, ${c.handledBy}, '${(c.handledByName || "Charity").replace(/'/g, "\\'")}')" style="padding:0.25rem 0.5rem;font-size:0.8rem;"><i class="fa-solid fa-comments"></i> Chat</button>
        </div>`;
    } else {
      footerRight = `<span style="font-size:.75rem;color:var(--muted)"><i class="fa-solid fa-user"></i> My Report</span>`;
    }
  } else if (!HL.currentUser) {
    footerRight = `<a href="auth.html" class="btn btn-outline btn-sm">Log in to Help</a>`;
  }

  return `
  <div class="case-card" id="case-card-${c.id}">
    <div class="case-card-top">
      <div style="display:flex;flex-direction:column;gap:6px">
        <span class="case-type-badge ${c.caseType}">${caseTypeIcon(c.caseType)} ${c.caseType}</span>
        <span style="font-size:.75rem;color:var(--muted)">Reported by ${c.reportedByName || "Anonymous"}</span>
      </div>
      <span class="urgency-badge ${c.urgency}">${urgencyIcon(c.urgency)} ${c.urgency}</span>
    </div>
    <div class="case-card-body">
      ${c.imageUrl ? `<div style="margin-bottom:12px;border-radius:6px;overflow:hidden;max-height:180px;"><img src="${c.imageUrl}" alt="Case Image" style="width:100%;height:100%;object-fit:cover;"></div>` : ""}
      <div class="case-desc">${c.personDesc}</div>
      <div class="case-detail-row">
        <span class="icon"><i class="fa-solid fa-location-dot"></i></span>
        <div><div class="key">Location</div><div class="val">${location}</div></div>
      </div>
      <div class="case-detail-row">
        <span class="icon"><i class="fa-solid fa-phone"></i></span>
        <div><div class="key">Contact Number</div><div class="val">${c.reportedByPhone || "N/A"}</div></div>
      </div>
      ${
        c.handledByName
          ? `<div class="case-detail-row">
        <span class="icon"><i class="fa-solid fa-building-ngo"></i></span>
        <div><div class="key">Handled By</div><div class="val">${c.handledByName}</div></div>
      </div>`
          : ""
      }
      <div class="case-detail-row">
        <span class="icon"><i class="fa-regular fa-clock"></i></span>
        <div><div class="key">Reported</div><div class="val">${reported}</div></div>
      </div>
    </div>
    <div class="case-card-footer">
      <span class="case-status-pill ${statusClass}">
        <span class="status-dot-mw"></span>${c.status}
      </span>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn btn-ghost btn-sm" onclick="openCaseDetailModal(${c.id})" id="view-case-${c.id}">
          <i class="fa-solid fa-eye"></i> Details
        </button>
        ${footerRight}
      </div>
    </div>
  </div>`;
}

function renderMwGrid(cases) {
  const grid = document.getElementById("mwGrid");
  const empty = document.getElementById("mwEmptyState");
  const count = document.getElementById("mw-filter-count");
  if (!grid) return;
  if (count)
    count.textContent =
      cases.length + " case" + (cases.length !== 1 ? "s" : "") + " found";
  if (!cases.length) {
    grid.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");
  grid.innerHTML = cases.map((c) => caseCardHTML(c)).join("");
}

function applyMwFilter() {
  const type = document.getElementById("mwFilterType")?.value || "";
  const status = document.getElementById("mwFilterStatus")?.value || "";
  const urgency = document.getElementById("mwFilterUrgency")?.value || "";
  let cases = HL.welfareCases;
  if (type) cases = cases.filter((c) => c.caseType === type);
  if (status) cases = cases.filter((c) => c.status === status);
  if (urgency) cases = cases.filter((c) => c.urgency === urgency);
  renderMwGrid(cases);
}

function clearMwFilters() {
  ["mwFilterType", "mwFilterStatus", "mwFilterUrgency"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  renderMwGrid(HL.welfareCases);
}

function toggleReportForm(show) {
  const section = document.getElementById("reportCaseSection");
  if (section) section.classList.toggle("hidden", !show);
  const btnWrap = document.getElementById("report-btn-wrapper");
  if (btnWrap) {
    btnWrap.innerHTML = show
      ? ""
      : `<button class="btn btn-primary" onclick="toggleReportForm(true)" id="open-report-btn">
           <i class="fa-solid fa-plus"></i> Report a Case
         </button>`;
  }
  
  const emptyEl = document.getElementById("mwUserEmpty");
  const gridEl = document.getElementById("mwUserGrid");
  if (emptyEl && gridEl) {
    if (show) {
      emptyEl.classList.add("hidden");
    } else {
      if (gridEl.innerHTML.trim() === "") {
        emptyEl.classList.remove("hidden");
      }
    }
  }
}

async function submitWelfareCase(e) {
  if (e) e.preventDefault();
  const errEl = document.getElementById("report-case-error");
  if (errEl) {
    errEl.style.display = "none";
    errEl.textContent = "";
  }

  const caseType = document.getElementById("wc-type")?.value || "";
  const urgency = document.getElementById("wc-urgency")?.value || "Medium";
  const personDesc = document.getElementById("wc-desc")?.value.trim() || "";
  const locationStreet =
    document.getElementById("wc-street")?.value.trim() || "";
  const locationArea = document.getElementById("wc-area")?.value.trim() || "";
  const locationCity = document.getElementById("wc-city")?.value.trim() || "";
  const notes = document.getElementById("wc-notes")?.value.trim() || "";

  const btn = document.getElementById("submit-case-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting…';
  }

  const fileInput = document.getElementById("wc-image");
  const fd = new FormData();
  fd.append("action", "report");
  fd.append("caseType", caseType);
  fd.append("urgency", urgency);
  fd.append("personDesc", personDesc);
  fd.append("locationStreet", locationStreet);
  fd.append("locationArea", locationArea);
  fd.append("locationCity", locationCity);
  fd.append("notes", notes);
  if (fileInput && fileInput.files[0]) {
    fd.append("image", fileInput.files[0]);
  }

  const res = await apiPost("welfare_cases.php", fd);

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Report';
  }

  if (!res.ok) {
    if (errEl) {
      errEl.style.display = "block";
      errEl.textContent = res.msg || "Failed to submit report.";
    }
    return;
  }

  // Add to local store & re-render
  HL.welfareCases.unshift(res.case);
  const isCharity = HL.currentUser && HL.currentUser.accountType === "charity";
  if (isCharity) {
    renderMwDashboard(HL.welfareCases);
  } else {
    const myCases = HL.welfareCases.filter(
      (c) => Number(c.reportedBy) === Number(HL.currentUser.id),
    );
    renderMwUserGrid(myCases);
    // Switch to My Reported Cases section after submit
    switchMwUserTab('mycases', document.getElementById('tab-mycases'));
  }
  document.getElementById("reportCaseForm")?.reset();
  showToast(
    "Case reported successfully! A charity organization will review it.",
    "success",
  );
}

function openCaseDetailModal(caseId) {
  const c = HL.welfareCases.find((x) => x.id === caseId);
  if (!c) return;
  const modal = document.getElementById("caseDetailModal");
  const content = document.getElementById("caseDetailContent");
  if (!modal || !content) return;
  const location = [c.locationStreet, c.locationArea, c.locationCity]
    .filter(Boolean)
    .join(", ");
  const statusClass = c.status.replace(" ", "-");
  content.innerHTML = `
    <div class="modal-header">
      <div>
        <span class="case-type-badge ${c.caseType}" style="margin-bottom:6px;display:inline-flex">${caseTypeIcon(c.caseType)} ${c.caseType}</span>
        <h3 style="margin:0">Welfare Case #${c.id}</h3>
      </div>
      <button class="modal-close" onclick="closeCaseModal()"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div style="padding:8px 0 4px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:20px">
      <span class="case-status-pill ${statusClass}"><span class="status-dot-mw"></span>${c.status}</span>
      <span class="urgency-badge ${c.urgency}">${urgencyIcon(c.urgency)} ${c.urgency} Urgency</span>
    </div>
    <div class="case-detail-section">
      <h4>Person Description</h4>
      ${c.imageUrl ? `<div style="margin-bottom:12px;border-radius:8px;overflow:hidden;max-height:300px;text-align:center;background:#000;"><img src="${c.imageUrl}" alt="Case Image" style="max-width:100%;max-height:300px;object-fit:contain;"></div>` : ""}
      <p style="font-size:.9rem;color:var(--text);line-height:1.65">${c.personDesc}</p>
    </div>
    <div class="case-detail-section">
      <h4>Location</h4>
      <div class="case-detail-grid">
        <div class="case-detail-item"><div class="label">Street / Landmark</div><div class="value">${c.locationStreet}</div></div>
        <div class="case-detail-item"><div class="label">Area</div><div class="value">${c.locationArea}</div></div>
        <div class="case-detail-item"><div class="label">City</div><div class="value">${c.locationCity}</div></div>
      </div>
    </div>
    ${c.notes ? `<div class="case-detail-section"><h4>Additional Notes</h4><p style="font-size:.9rem;color:var(--text)">${c.notes}</p></div>` : ""}
    <div class="case-detail-section">
      <h4>Report Details</h4>
      <div class="case-detail-grid">
        <div class="case-detail-item"><div class="label">Reported By</div><div class="value">${c.reportedByName || "—"}</div></div>
        <div class="case-detail-item"><div class="label">Reported At</div><div class="value">${formatDateTime(c.createdAt)}</div></div>
        <div class="case-detail-item"><div class="label">Handled By</div><div class="value">${c.handledByName || "Not yet assigned"}</div></div>
        <div class="case-detail-item"><div class="label">Last Updated</div><div class="value">${c.handledAt ? formatDateTime(c.handledAt) : "—"}</div></div>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeCaseModal()">Close</button>
    </div>`;
  modal.classList.add("show");
}

function closeCaseModal() {
  const modal = document.getElementById("caseDetailModal");
  if (modal) modal.classList.remove("show");
}

// Current active tab for charity dashboard
let mwActiveTab = "all";

function switchMwTab(tab, btnEl) {
  mwActiveTab = tab;
  document
    .querySelectorAll(".mw-tab")
    .forEach((b) => b.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");
  renderMwDashboard(HL.welfareCases);
}

function renderMwDashboard(allCases) {
  // Filter out cases rejected by this charity
  const currentUserIdStr = String(HL.currentUser.id);
  const cases = allCases.filter((c) => {
    if (!c.rejectedBy) return true;
    const rejArr = c.rejectedBy.split(",");
    return !rejArr.includes(currentUserIdStr);
  });

  // Stats
  const total = cases.length;
  const pending = cases.filter((c) => c.status === "Pending").length;
  const emergency = cases.filter(
    (c) => c.urgency === "Critical" || c.urgency === "High",
  ).length;
  const completed = cases.filter((c) => c.status === "Completed").length;

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setEl("mw-stat-total", total);
  setEl("mw-stat-pending", pending);
  setEl("mw-stat-emergency", emergency);
  setEl("mw-stat-completed", completed);

  // Badge counts
  const emergencyCases = cases.filter(
    (c) => c.urgency === "Critical" || c.urgency === "High",
  );
  const generalCases = cases.filter(
    (c) => c.urgency === "Medium" || c.urgency === "Low",
  );
  setEl("badge-all", total);
  setEl("badge-emergency", emergencyCases.length);
  setEl("badge-general", generalCases.length);

  // Filter by active tab
  let visible = cases;
  if (mwActiveTab === "emergency") visible = emergencyCases;
  if (mwActiveTab === "general") visible = generalCases;

  // Render grid
  const grid = document.getElementById("mwGrid");
  const empty = document.getElementById("mwEmptyState");
  if (!grid) return;
  if (!visible.length) {
    grid.innerHTML = "";
    if (empty) {
      empty.classList.remove("hidden");
      const titleEl = document.getElementById("mwEmptyTitle");
      const descEl = document.getElementById("mwEmptyDesc");
      if (titleEl)
        titleEl.textContent =
          mwActiveTab === "emergency"
            ? "No emergency cases"
            : mwActiveTab === "general"
              ? "No general cases"
              : "No cases reported yet";
      if (descEl)
        descEl.textContent = "No welfare cases found in this category.";
    }
    return;
  }
  if (empty) empty.classList.add("hidden");
  grid.innerHTML = visible.map((c) => caseCardHTML(c)).join("");
}

function renderMwUserGrid(cases) {
  const grid = document.getElementById("mwUserGrid");
  const empty = document.getElementById("mwUserEmpty");
  if (!grid) return;
  if (!cases.length) {
    grid.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");
  grid.innerHTML = cases.map((c) => caseCardHTML(c)).join("");
}

async function updateCaseStatus(caseId, newStatus) {
  if (!newStatus) return;
  const res = await apiPost("welfare_cases.php", {
    action: "update_status",
    caseId,
    status: newStatus,
  });
  if (!res.ok) {
    showToast(res.msg || "Failed to update status.", "error");
    return;
  }
  const c = HL.welfareCases.find((x) => x.id === caseId);
  if (c) {
    c.status = newStatus;
    if (newStatus === "Pending") {
      c.handledBy = null;
      c.handledByName = null;
      const currentUserIdStr = String(HL.currentUser.id);
      const rejArr = c.rejectedBy ? c.rejectedBy.split(",") : [];
      if (!rejArr.includes(currentUserIdStr)) rejArr.push(currentUserIdStr);
      c.rejectedBy = rejArr.join(",");
    } else {
      c.handledBy = HL.currentUser.id;
      c.handledByName = HL.currentUser.fullName;
    }
  }
  // Re-render based on role
  const isCharity = HL.currentUser && HL.currentUser.accountType === "charity";
  if (isCharity) {
    renderMwDashboard(HL.welfareCases);
  } else {
    const myCases = HL.welfareCases.filter(
      (x) => Number(x.reportedBy) === Number(HL.currentUser.id),
    );
    renderMwUserGrid(myCases);
  }
  showToast('Case status updated to "' + newStatus + '"!', "success");
}

let mwChatCaseId = null;
let mwChatReceiverId = null;

function openMwChat(caseId, receiverId, reporterName) {
  mwChatCaseId = caseId;
  mwChatReceiverId = receiverId;
  const modal = document.getElementById("chatModal");
  if (modal) {
    const titleEl = modal.querySelector(".modal-header h3");
    if (titleEl) {
      titleEl.innerHTML = `<i class="fa-solid fa-comments"></i> Chat with ${reporterName || "Reporter"}`;
    }
    modal.classList.add("show");
    loadMwMessages();
  }
}

function closeChatModal() {
  const modal = document.getElementById("chatModal");
  if (modal) modal.classList.remove("show");
  mwChatCaseId = null;
  mwChatReceiverId = null;
}

async function loadMwMessages() {
  if (!mwChatCaseId) return;
  const area = document.getElementById("mwMessagesArea");
  if (!area) return;
  const res = await apiGet(`messages.php?case_id=${mwChatCaseId}`);
  if (!res.ok) {
    area.innerHTML = `<div class="msg-empty">${res.msg || "Error loading chat"}</div>`;
    return;
  }
  if (!res.messages || res.messages.length === 0) {
    area.innerHTML = `<div class="msg-empty">No messages yet. Start the conversation!</div>`;
    return;
  }
  let html = "";
  res.messages.forEach((m) => {
    const isMe = m.from === Number(HL.currentUser.id);
    html += `
      <div style="display: flex; flex-direction: column; width: fit-content; max-width: 75%; align-self: ${isMe ? "flex-end" : "flex-start"};">
        <div class="msg-bubble ${isMe ? "sent" : "received"}" style="max-width: 100%; align-self: ${isMe ? "flex-end" : "flex-start"};">
          <div class="msg-text">${escapeHtml(m.text)}</div>
        </div>
        <div class="msg-time ${isMe ? "msg-time-sent" : "msg-time-received"}" style="opacity: 0.8;">${escapeHtml(m.fromName)} &bull; ${m.time}</div>
      </div>
    `;
  });
  area.innerHTML = html;
  area.scrollTop = area.scrollHeight;
}

async function sendMwMsg() {
  const inp = document.getElementById("mwMsgInput");
  if (!inp) return;
  const text = inp.value.trim();
  if (!text || !mwChatCaseId || !mwChatReceiverId) return;

  const res = await apiPost("messages.php", {
    receiverId: mwChatReceiverId,
    caseId: mwChatCaseId,
    message: text,
  });
  if (res.ok) {
    inp.value = "";
    await loadMwMessages();
  } else {
    showToast(res.msg || "Failed to send message.", "error");
  }
}

async function loadPublicCampaigns() {
  const grid = document.getElementById("public-campaigns-grid");
  if (!grid) return;
  grid.innerHTML =
    '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br><br>Loading campaigns...</div>';
  const res = await apiGet("doctor_campaigns.php");
  if (res.ok) {
    renderPublicCampaigns(res.campaigns || []);
  } else {
    grid.innerHTML =
      '<div style="grid-column: 1/-1; text-align: center; color: var(--danger);">Failed to load campaigns.</div>';
  }
}

function renderPublicCampaigns(campaigns) {
  const grid = document.getElementById("public-campaigns-grid");
  if (!grid) return;
  if (campaigns.length === 0) {
    grid.innerHTML =
      '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No active campaigns found.</div>';
    return;
  }

  grid.innerHTML = campaigns
    .map(
      (c) => `
    <div class="campaign-card" style="background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:20px;">
      <h3 style="margin-top:0; color:var(--text-color);">${c.subject}</h3>
      <div style="display:flex; align-items:center; margin-bottom:15px; gap:15px;">
        <div style="width:50px; height:50px; border-radius:50%; background:#eee; overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:#aaa; font-weight:bold; font-size: 1.2rem;">
          ${
            c.doctor_profile_picture
              ? `<img src="${c.doctor_profile_picture}" style="width:100%; height:100%; object-fit:cover;">`
              : c.doctor_name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()
          }
        </div>
        <div style="font-size:0.9rem; color:var(--text-muted);">
          <strong style="color:var(--text-color); font-size:1rem;">Dr. ${c.doctor_name}</strong><br>
          <small>${c.qualification} | ${c.specialization}</small>
        </div>
      </div>
      <div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:5px;"><i class="fa-solid fa-calendar-day"></i> ${new Date(c.campaign_date).toLocaleDateString()} &nbsp;|&nbsp; <i class="fa-regular fa-clock"></i> ${c.start_time.substring(0, 5)} - ${c.end_time.substring(0, 5)}</div>
      <div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:15px;"><i class="fa-solid fa-location-dot"></i> ${c.location}</div>
      <div style="font-size:0.95rem; margin-bottom:20px; line-height:1.5;">${c.description}</div>
      
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:15px;">
        <span style="font-size:0.85rem; font-weight:600; color:var(--primary);"><i class="fa-solid fa-users"></i> ${c.participant_count} Joined</span>
        ${
          c.joined > 0
            ? `<button class="btn btn-outline btn-sm" disabled><i class="fa-solid fa-check"></i> Joined</button>`
            : `<button class="btn btn-primary btn-sm" onclick="joinCampaign(${c.id}, this)">Join Campaign</button>`
        }
      </div>
    </div>
  `,
    )
    .join("");
}

async function joinCampaign(campaignId, btn) {
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Joining...';
  const res = await apiPost("campaign_join.php", { campaign_id: campaignId });
  if (res.ok) {
    showToast(res.msg, "success");
    btn.className = "btn btn-outline btn-sm";
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Joined';
  } else {
    showToast(res.msg, "error");
    btn.disabled = false;
    btn.innerHTML = "Join Campaign";
  }
}
window.joinCampaign = joinCampaign;

async function initMedicalPage() {
  // Only run on medical-welfare.html
  if (!document.getElementById("mw-charity-dashboard")) return;

  const charityView = document.getElementById("mw-charity-dashboard");
  const userView = document.getElementById("mw-user-dashboard");
  const guestView = document.getElementById("mw-guest-view");

  // Hide all by default
  charityView.classList.add("hidden");
  userView.classList.add("hidden");
  guestView.classList.add("hidden");

  // Guest
  if (!HL.currentUser) {
    guestView.classList.remove("hidden");
    return;
  }

  renderSidebarAccount();

  if (HL.currentUser && HL.currentUser.accountType === "user") {
    const sblFood = document.getElementById("sbl-food");
    if (sblFood) sblFood.remove();
  }

  // If charity user is browsing, show their specific nav
  if (HL.currentUser.accountType === "charity") {
    const navEl = document.querySelector(".app-sidebar-nav");
    if (navEl) {
      navEl.innerHTML = '<div class="app-sidebar-section-label">Charity Dashboard</div>';
      navEl.innerHTML += `<a href="food-support.html" class="app-sidebar-link" id="sbl-food"><span class="asbl-icon"><i class="fa-solid fa-bowl-food"></i></span><span class="asbl-text">Food Support</span></a>`;
      navEl.innerHTML += `<a href="medical-welfare.html" class="app-sidebar-link active" id="sbl-med"><span class="asbl-icon"><i class="fa-solid fa-notes-medical"></i></span><span class="asbl-text">Medical & Welfare</span></a>`;
      navEl.innerHTML += `<a href="financial-support.html" class="app-sidebar-link" id="sbl-fin"><span class="asbl-icon"><i class="fa-solid fa-hand-holding-dollar"></i></span><span class="asbl-text">Campaign Donation</span></a>`;
    }
  } else if (HL.currentUser.accountType === "admin") {
    const navEl = document.querySelector(".app-sidebar-nav");
    if (navEl) {
      navEl.innerHTML = '<div class="app-sidebar-section-label">Navigation</div>';
      navEl.innerHTML += `<a href="admin/dashboard.php" class="app-sidebar-link"><span class="asbl-icon"><i class="fa-solid fa-shield-halved"></i></span><span class="asbl-text">Admin Dashboard</span></a>`;
      navEl.innerHTML += `<a href="medical-welfare.html" class="app-sidebar-link active" id="sbl-med"><span class="asbl-icon"><i class="fa-solid fa-notes-medical"></i></span><span class="asbl-text">Medical &amp; Welfare</span></a>`;
    }
  }

  const isCharity = HL.currentUser.accountType === "charity";
  const cases = await loadWelfareCases();

  if (isCharity) {
    // ── Charity Dashboard ──
    charityView.classList.remove("hidden");
    mwActiveTab = "all";
    renderMwDashboard(cases);
  } else {
    // ── User View ──
    userView.classList.remove("hidden");
    const btnWrap = document.getElementById("report-btn-wrapper");
    if (btnWrap) {
      btnWrap.innerHTML = "";
    }
    // Only show own cases
    const myCases = cases.filter(
      (c) => Number(c.reportedBy) === Number(HL.currentUser.id),
    );
    renderMwUserGrid(myCases);
  }

  await loadPublicCampaigns();

  const reportSec = document.getElementById("section-report");
  if (reportSec) reportSec.classList.remove("hidden");

  // Handle hash-based tab routing for user views
  if (!isCharity) {
    if (window.location.hash === "#doctor-campaigns") {
      switchMwUserTab('campaigns', document.getElementById('tab-campaigns'));
    } else if (window.location.hash === "#mycases") {
      switchMwUserTab('mycases', document.getElementById('tab-mycases'));
    } else {
      switchMwUserTab('report', document.getElementById('tab-report'));
    }
  }
}

function switchMwUserTab(tab, btn) {
  const tabsContainer = btn ? btn.closest('.mw-tabs') : document.querySelector('.mw-tabs');
  if (tabsContainer) {
    tabsContainer.querySelectorAll('.mw-tab').forEach(b => b.classList.remove('active'));
  }
  if (btn) btn.classList.add('active');

  const reportEl = document.getElementById('mw-user-report-section');
  const mycasesEl = document.getElementById('mw-user-mycases-section');
  const campaignsEl = document.getElementById('mw-user-campaigns-section');

  if (reportEl) reportEl.classList.add('hidden');
  if (mycasesEl) mycasesEl.classList.add('hidden');
  if (campaignsEl) campaignsEl.classList.add('hidden');

  if (tab === 'report') {
    if (reportEl) reportEl.classList.remove('hidden');
  } else if (tab === 'mycases') {
    if (mycasesEl) mycasesEl.classList.remove('hidden');
  } else if (tab === 'campaigns') {
    if (campaignsEl) campaignsEl.classList.remove('hidden');
  }
}
window.switchMwUserTab = switchMwUserTab;

function showMwSection(sec, link, e) {
  if (e && e.preventDefault) e.preventDefault();
  
  // Hide all sections
  document.querySelectorAll(".mw-section").forEach((el) => el.classList.add("hidden"));
  
  // Show target section
  const target = document.getElementById("section-" + sec);
  if (target) target.classList.remove("hidden");
  
  // Update sidebar active state
  document.querySelectorAll(".app-sidebar-link").forEach((l) => l.classList.remove("active"));
  if (link) link.classList.add("active");
}
window.showMwSection = showMwSection;

// ── Financial Support Page ─────────────────────────────────

HL.finCampaigns = [];
let finDonateTarget = null;
let finActiveTab = 'browse';

async function initFinancialPage() {
  if (!document.getElementById('fin-section-charity') && !document.getElementById('fin-section-user')) return;

  const charityView = document.getElementById('fin-section-charity');
  const userView    = document.getElementById('fin-section-user');
  const guestView   = document.getElementById('fin-section-guest');

  // Hide all
  [charityView, userView, guestView].forEach(el => el && el.classList.add('hidden'));

  if (!HL.currentUser) {
    guestView && guestView.classList.remove('hidden');
    return;
  }

  renderSidebarAccount();
  buildFinSidebar();

  const isCharity = HL.currentUser.accountType === 'charity';

  if (isCharity) {
    charityView && charityView.classList.remove('hidden');
    await loadMyCampaigns();
  } else {
    userView && userView.classList.remove('hidden');
    await loadPublicFinCampaigns();
    // Set min date for deadline
    const today = new Date().toISOString().split('T')[0];
    const ddl = document.getElementById('fc-deadline');
    if (ddl) ddl.min = today;
  }
}

function buildFinSidebar() {
  const navEl = document.getElementById('fin-sidebar-nav');
  if (!navEl) return;
  const isCharity = HL.currentUser && HL.currentUser.accountType === 'charity';
  const isAdmin = HL.currentUser && HL.currentUser.accountType === 'admin';

  if (isCharity) {
    navEl.innerHTML = '<div class="app-sidebar-section-label">Charity Dashboard</div>';
    navEl.innerHTML += `<a href="food-support.html" class="app-sidebar-link"><span class="asbl-icon"><i class="fa-solid fa-bowl-food"></i></span><span class="asbl-text">Food Support</span></a>`;
    navEl.innerHTML += `<a href="medical-welfare.html" class="app-sidebar-link"><span class="asbl-icon"><i class="fa-solid fa-notes-medical"></i></span><span class="asbl-text">Medical & Welfare</span></a>`;
    navEl.innerHTML += `<a href="financial-support.html" class="app-sidebar-link active"><span class="asbl-icon"><i class="fa-solid fa-hand-holding-dollar"></i></span><span class="asbl-text">Campaign Donation</span></a>`;
  } else if (isAdmin) {
    navEl.innerHTML = '<div class="app-sidebar-section-label">Navigation</div>';
    navEl.innerHTML += `<a href="admin/dashboard.php" class="app-sidebar-link"><span class="asbl-icon"><i class="fa-solid fa-shield-halved"></i></span><span class="asbl-text">Admin Dashboard</span></a>`;
    navEl.innerHTML += `<a href="financial-support.html" class="app-sidebar-link active"><span class="asbl-icon"><i class="fa-solid fa-hand-holding-dollar"></i></span><span class="asbl-text">Financial Support</span></a>`;
  } else {
    navEl.innerHTML = `
      <div class="app-sidebar-section-label">Navigation</div>
      <a href="user-dashboard.html" class="app-sidebar-link"><span class="asbl-icon"><i class="fa-solid fa-table-columns"></i></span><span class="asbl-text">Dashboard</span></a>
      <a href="medical-welfare.html" class="app-sidebar-link"><span class="asbl-icon"><i class="fa-solid fa-notes-medical"></i></span><span class="asbl-text">Medical & Welfare</span></a>
      <a href="financial-support.html" class="app-sidebar-link active"><span class="asbl-icon"><i class="fa-solid fa-hand-holding-dollar"></i></span><span class="asbl-text">Financial Support</span></a>
    `;
  }
}

// ── Charity Dashboard Tabs ───────────────────────────────────
function showCharitySubTab(tab) {
  document.querySelectorAll('#fin-section-charity .mw-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-charity-' + tab)?.classList.add('active');

  const newEl = document.getElementById('charity-sub-new');
  const ongoingEl = document.getElementById('charity-sub-ongoing');
  const historyEl = document.getElementById('charity-sub-history');

  if (newEl) newEl.classList.add('hidden');
  if (ongoingEl) ongoingEl.classList.add('hidden');
  if (historyEl) historyEl.classList.add('hidden');

  if (tab === 'new') {
    if (newEl) newEl.classList.remove('hidden');
  } else if (tab === 'ongoing') {
    if (ongoingEl) ongoingEl.classList.remove('hidden');
  } else if (tab === 'history') {
    if (historyEl) historyEl.classList.remove('hidden');
  }
}
window.showCharitySubTab = showCharitySubTab;

// ── Charity: Load My Campaigns ─────────────────────────────
async function loadMyCampaigns() {
  const res = await apiGet('financial.php?action=my_campaigns');
  if (!res.ok) return;
  const camps = res.campaigns || [];
  
  const activeCamps = camps.filter(c => c.status === 'active');
  const historyCamps = camps.filter(c => c.status !== 'active');

  // Stats removed per user request

  // Populate campaign dropdown for Donation Posts (if active)
  const dpCamp = document.getElementById('dp-campaign');
  if (dpCamp) {
    dpCamp.innerHTML = '<option value="">Select a campaign to link...</option>' + 
      activeCamps.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
  }

  renderCampaignGrid(activeCamps, 'my-campaigns-list', 'my-campaigns-empty', true);
  renderCampaignGrid(historyCamps, 'my-history-list', 'my-history-empty', false);
}

function renderCampaignGrid(camps, listId, emptyId, isActive) {
  const list  = document.getElementById(listId);
  const empty = document.getElementById(emptyId);
  if (!list) return;
  if (!camps.length) {
    list.innerHTML = '';
    empty && empty.classList.remove('hidden');
    return;
  }
  empty && empty.classList.add('hidden');

  list.innerHTML = camps.map(c => `
    <div class="fin-campaign-card" style="display:flex; flex-direction:column; height:100%; position:relative; ${!isActive ? 'opacity:0.7;' : ''}" id="fin-mgmt-${c.id}">
      ${isActive ? `
      <button class="btn btn-sm" onclick="deleteFinCampaign(${c.id})"
        style="position:absolute; top:12px; right:12px; background:rgba(220,53,69,0.9); color:white; border:none; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; z-index:10; cursor:pointer;" title="Delete/Archive Campaign">
        <i class="fa-solid fa-trash"></i>
      </button>` : `<div style="position:absolute; top:12px; right:12px; background:var(--bg-secondary); color:var(--text-muted); padding:4px 8px; border-radius:12px; font-size:0.7rem; font-weight:700; z-index:10;">ARCHIVED</div>`}
      ${c.image_url 
        ? `<div class="fin-campaign-img" style="height:180px; background:var(--bg-secondary);"><img src="${c.image_url}" style="width:100%; height:100%; object-fit:contain;" alt="Campaign Image"></div>` 
        : `<div class="fin-campaign-img" style="background:var(--border); display:flex; align-items:center; justify-content:center; font-size:3rem; color:var(--text-muted); height:180px;"><i class="fa-solid fa-hand-holding-dollar"></i></div>`
      }
      <div class="fin-campaign-body" style="flex:1;">
        <div class="fin-campaign-title" style="margin-bottom:8px;">${c.title}</div>
        <div class="fin-campaign-charity" style="margin-bottom:12px;">
          <i class="fa-solid fa-building-ngo"></i> ${HL.currentUser.fullName || 'Charity'}
        </div>
        <div class="fin-campaign-desc" style="white-space:pre-wrap; margin-bottom:16px;">${c.description || ''}</div>
        
        <div class="fin-mgmt-progress" style="margin-bottom:16px;">
          <div class="fin-progress-bar-bg" style="border:1px solid rgba(255,255,255,0.1); border-radius:8px; overflow:hidden;">
            <div class="fin-progress-bar-fill" style="width:${c.progress}%"></div>
          </div>
          <div class="fin-progress-labels" style="margin-top:8px;">
            <span class="fin-raised">৳${c.raised_amount.toLocaleString()}</span>
            <span class="fin-goal">of ৳${c.goal_amount.toLocaleString()}</span>
          </div>
        </div>

        <div class="fin-campaign-footer" style="margin-top:auto; padding-top:16px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:0.8rem; color:var(--text-muted);">
            <i class="fa-solid fa-users"></i> ${c.donor_count} donor${c.donor_count !== 1 ? 's' : ''} | 
            <i class="fa-regular fa-calendar"></i> ${new Date(c.deadline + 'T00:00:00').toLocaleDateString('en-US')}
          </div>
          <button class="btn btn-outline btn-sm" onclick="openDonorsModal(${c.id}, '${c.title.replace(/'/g,"\\'")}')" style="display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-users"></i> Donors
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ── User: Load Public Campaigns ────────────────────────────
async function loadPublicFinCampaigns() {
  const grid  = document.getElementById('public-campaigns-grid');
  const empty = document.getElementById('public-campaigns-empty');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br><br>Loading campaigns...</div>';

  const res = await apiGet('financial.php?action=campaigns');
  if (!res.ok) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--danger)">Failed to load campaigns.</div>';
    return;
  }
  HL.finCampaigns = res.campaigns || [];
  renderPublicFinCampaigns(HL.finCampaigns);
}

function renderPublicFinCampaigns(camps) {
  const grid  = document.getElementById('public-campaigns-grid');
  const empty = document.getElementById('public-campaigns-empty');
  if (!grid) return;

  if (!camps.length) {
    grid.innerHTML = '';
    empty && empty.classList.remove('hidden');
    return;
  }
  empty && empty.classList.add('hidden');

  const isLoggedIn = !!HL.currentUser;

  grid.innerHTML = camps.map(c => {
    const deadlineDate = c.deadline.split('T')[0]; // get YYYY-MM-DD
    const todayDate = new Date().toISOString().split('T')[0];
    const isExpired = deadlineDate < todayDate;
    const deadlineStr = new Date(c.deadline + 'T00:00:00').toLocaleDateString('en-BD');

    let donateBtn = '';
    if (!isLoggedIn) {
      donateBtn = `<a href="auth.html" class="btn btn-primary btn-sm">Log in to Donate</a>`;
    } else if (isExpired) {
      donateBtn = `<button class="btn btn-ghost btn-sm" disabled>Expired</button>`;
    } else {
      donateBtn = `<button class="btn btn-primary btn-sm" onclick="openDonateModal(${c.id})">Donate</button>`;
    }

    return `
    <div class="fin-campaign-card" id="fin-card-${c.id}">
      <div class="fin-campaign-img" style="background:var(--bg-secondary);">
        ${c.image_url ? `<img src="${c.image_url}" alt="${c.title}" style="width:100%; height:100%; object-fit:contain;">` : `<i class="fa-solid fa-hand-holding-heart"></i>`}
      </div>
      <div class="fin-campaign-body">
        <div class="fin-campaign-title">${c.title}</div>
        <div class="fin-campaign-charity"><i class="fa-solid fa-building-ngo"></i> ${c.charity_name}</div>
        <div class="fin-campaign-desc">${c.description.length > 120 ? c.description.substring(0,120)+'...' : c.description}</div>
        <div class="fin-progress-wrap">
          <div class="fin-progress-bar-bg">
            <div class="fin-progress-bar-fill" style="width:${c.progress}%"></div>
          </div>
          <div class="fin-progress-labels">
            <span class="fin-raised">৳${c.raised_amount.toLocaleString()}</span>
            <span class="fin-goal">of ৳${c.goal_amount.toLocaleString()}</span>
          </div>
        </div>
        <div class="fin-campaign-footer">
          <div class="fin-meta">
            <i class="fa-solid fa-users"></i> ${c.donor_count} donor${c.donor_count!==1?'s':''}
            &nbsp;|&nbsp;
            <span class="fin-deadline"><i class="fa-regular fa-calendar"></i> ${deadlineStr}</span>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-sm" onclick="openDonorsModal(${c.id}, '${c.title.replace(/'/g,"\\'")}')">
              <i class="fa-solid fa-users"></i>
            </button>
            ${donateBtn}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

let finSystemFund = null;

function openSystemDonateModal(fundName) {
  if (!HL.currentUser) { window.location.href = 'auth.html'; return; }
  finDonateTarget = null;
  finSystemFund = fundName;
  
  const titleEl = document.getElementById('donate-modal-title');
  const subEl   = document.getElementById('donate-modal-subtitle');
  if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-heart" style="color:var(--primary)"></i> Donate to ${fundName}`;
  if (subEl) subEl.textContent = "Your contribution will go directly to the HumanityLink System Fund.";
  
  const errEl = document.getElementById('donate-error');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  const amtEl = document.getElementById('donate-amount');
  if (amtEl) amtEl.value = '';
  const msgEl = document.getElementById('donate-message');
  if (msgEl) msgEl.value = '';
  document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('donateModal').classList.add('show');
}
window.openSystemDonateModal = openSystemDonateModal;

// ── Donate Modal ───────────────────────────────────────────
function openDonateModal(campaignId) {
  if (!HL.currentUser) { window.location.href = 'auth.html'; return; }
  finDonateTarget = campaignId;
  finSystemFund = null;
  const camp = HL.finCampaigns.find(c => Number(c.id) === Number(campaignId));
  if (camp) {
    const titleEl = document.getElementById('donate-modal-title');
    const subEl   = document.getElementById('donate-modal-subtitle');
    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-heart" style="color:var(--primary)"></i> Donate to Campaign`;
    if (subEl) subEl.textContent = camp.title;
  }
  const errEl = document.getElementById('donate-error');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

  // Clear ALL fields explicitly every time
  const clearIds = ['donate-amount','donate-message','card-name','card-number','card-expiry','card-cvv','mfs-number','mfs-pin'];
  clearIds.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));

  // Reset payment method to card
  const cardRadio = document.querySelector('input[name="payment_method"][value="card"]');
  if (cardRadio) cardRadio.checked = true;
  const mfsOptions = document.getElementById('mfs-options');
  const cardDetails = document.getElementById('payment-card-details');
  const mfsDetails = document.getElementById('payment-mfs-details');
  if (mfsOptions) mfsOptions.style.display = 'none';
  if (cardDetails) cardDetails.style.display = 'block';
  if (mfsDetails) mfsDetails.style.display = 'none';

  document.getElementById('donateModal').classList.add('show');
}
window.openDonateModal = openDonateModal;

function closeDonateModal() {
  document.getElementById('donateModal').classList.remove('show');
  finDonateTarget = null;
}
window.closeDonateModal = closeDonateModal;

function selectAmount(amt) {
  document.getElementById('donate-amount').value = amt;
  document.querySelectorAll('.amount-btn').forEach(b => {
    b.classList.toggle('selected', parseInt(b.textContent.replace(/[^\d]/g,'')) === amt);
  });
}
window.selectAmount = selectAmount;

// Card type selection helper
function selectCardType(type) {
  ['visa','mastercard','nexus'].forEach(t => {
    const el = document.getElementById('card-type-' + t);
    if (el) el.classList.toggle('active', t === type);
  });
  const radio = document.querySelector(`input[name="card_type"][value="${type}"]`);
  if (radio) radio.checked = true;
}
window.selectCardType = selectCardType;

async function submitDonation() {
  const amt  = parseFloat(document.getElementById('donate-amount')?.value || 0);
  const msg  = document.getElementById('donate-message')?.value.trim() || '';
  const errEl = document.getElementById('donate-error');
  if (errEl) errEl.style.display = 'none';

  if (!amt || amt < 1) {
    if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'Please enter a valid amount.'; }
    return;
  }

  const methodType = document.querySelector('input[name="payment_method"]:checked').value;
  let provider = 'card';
  let maskedAccount = '';

  if (methodType === 'card') {
    const cardNum = document.getElementById('card-number').value.replace(/\s+/g, '');
    if (cardNum.length < 16) {
      if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'Please enter a valid 16-digit card number.'; }
      return;
    }
    const cardTypeEl = document.querySelector('input[name="card_type"]:checked');
    const cardType   = cardTypeEl ? cardTypeEl.value : 'card';
    provider = cardType; // visa | mastercard | nexus
    maskedAccount = '**** **** **** ' + cardNum.slice(-4);
  } else {
    provider = document.querySelector('input[name="mfs_provider"]:checked').value;
    const mfsNum = document.getElementById('mfs-number').value;
    if (mfsNum.length < 11) {
      if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'Please enter a valid 11-digit mobile number.'; }
      return;
    }
    maskedAccount = '*******' + mfsNum.slice(-4);
  }

  const btn = document.getElementById('donate-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing payment...'; }

  // Simulate payment processing delay (1.5 seconds)
  await new Promise(r => setTimeout(r, 1500));

  // Generate fake transaction ID
  let prefix = 'CRD';
  if (provider === 'visa')       prefix = 'VSA';
  else if (provider === 'mastercard') prefix = 'MSC';
  else if (provider === 'nexus') prefix = 'NXS';
  else if (provider === 'bkash') prefix = 'BKX';
  else if (provider === 'nagad') prefix = 'NGD';
  else if (provider === 'rocket') prefix = 'RKT';
  const txnId = prefix + new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);

  let res;
  if (finSystemFund) {
    res = await apiPost('financial.php', { action: 'donate_system', fund_type: finSystemFund, amount: amt, message: msg, payment_method: provider, transaction_id: txnId, masked_account: maskedAccount });
  } else {
    res = await apiPost('financial.php', { action: 'donate', campaign_id: finDonateTarget, amount: amt, message: msg, payment_method: provider, transaction_id: txnId, masked_account: maskedAccount });
  }

  if (btn) { btn.disabled = false; btn.innerHTML = 'Donate Now'; }

  if (!res.ok) {
    if (errEl) { errEl.style.display = 'block'; errEl.textContent = res.msg || 'Donation failed.'; }
    return;
  }

  closeDonateModal();

  // Show payment success modal
  const methodLabels = {
    visa: 'Visa Card', mastercard: 'Mastercard', nexus: 'Nexus Card',
    bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket'
  };
  showPaySuccessModal({
    amount:  amt,
    method:  methodLabels[provider] || provider,
    txnId:   txnId,
    account: maskedAccount
  });

  // Update card live if not a system fund
  if (!finSystemFund) {
    const camp = HL.finCampaigns.find(c => Number(c.id) === Number(finDonateTarget));
    if (camp) {
      camp.raised_amount = res.raised_amount;
      camp.donor_count   = res.donor_count;
      camp.progress      = camp.goal_amount > 0 ? Math.min(100, Math.round((res.raised_amount / camp.goal_amount) * 100 * 10) / 10) : 0;
    }
    renderPublicFinCampaigns(HL.finCampaigns);
  }
}
window.submitDonation = submitDonation;

// ── Payment Success Modal ───────────────────────────────────
function showPaySuccessModal({ amount, method, txnId, account }) {
  const overlay = document.getElementById('paySuccessModal');
  if (!overlay) return;
  const now = new Date();
  const dateStr = now.toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' });
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('psr-amount', '৳' + Number(amount).toLocaleString('en-BD', { minimumFractionDigits: 2 }));
  setText('psr-method', method + (account ? '  (' + account + ')' : ''));
  setText('psr-txnid',  txnId);
  setText('psr-date',   dateStr);
  overlay.classList.add('show');
}
function closePaySuccessModal() {
  const overlay = document.getElementById('paySuccessModal');
  if (overlay) overlay.classList.remove('show');
}
window.showPaySuccessModal  = showPaySuccessModal;
window.closePaySuccessModal = closePaySuccessModal;

// ── Donation History ───────────────────────────────────────
async function loadDonationHistory() {
  const listEl  = document.getElementById('donation-history-list');
  const emptyEl = document.getElementById('donation-history-empty');
  if (!listEl) return;
  listEl.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';

  const res = await apiGet('financial.php?action=my_donations');
  if (!res.ok || !res.donations.length) {
    listEl.innerHTML = '';
    emptyEl && emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl && emptyEl.classList.add('hidden');
  listEl.innerHTML = res.donations.map(d => `
    <div class="donation-hist-row">
      <div class="donation-hist-amount">৳${d.amount.toLocaleString()}</div>
      <div class="donation-hist-info">
        <div class="donation-hist-campaign">${d.campaign_title}</div>
        <div class="donation-hist-charity"><i class="fa-solid fa-building-ngo"></i> ${d.charity_name}</div>
        ${d.message ? `<div style="font-size:0.82rem;color:var(--text-muted);margin-top:3px"><i class="fa-solid fa-quote-left"></i> ${d.message}</div>` : ''}
      </div>
      <div class="donation-hist-date">${new Date(d.created_at).toLocaleDateString('en-BD', {month:'short',day:'numeric',year:'numeric'})}</div>
    </div>
  `).join('');
}

function switchFinTab(tab, btn) {
  finActiveTab = tab;
  document.querySelectorAll('#fin-section-user .mw-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const systemEl  = document.getElementById('fin-system-section');
  const charityEl = document.getElementById('fin-charity-section');
  const historyEl = document.getElementById('fin-history-section');
  const postsEl   = document.getElementById('fin-posts-section');

  if (systemEl) systemEl.classList.add('hidden');
  if (charityEl) charityEl.classList.add('hidden');
  if (historyEl) historyEl.classList.add('hidden');
  if (postsEl) postsEl.classList.add('hidden');

  if (tab === 'system') {
    if (systemEl) systemEl.classList.remove('hidden');
  } else if (tab === 'charity') {
    if (charityEl) charityEl.classList.remove('hidden');
  } else if (tab === 'history') {
    if (historyEl) historyEl.classList.remove('hidden');
    loadDonationHistory();
  } else if (tab === 'posts') {
    if (postsEl) postsEl.classList.remove('hidden');
    loadPublicDonationPosts();
  }
}
window.switchFinTab = switchFinTab;

// ── Charity: Create Campaign ───────────────────────────────
function toggleCreateForm(show) {
  const form = document.getElementById('create-campaign-form');
  const btn  = document.getElementById('create-campaign-btn');
  if (form) form.classList.toggle('hidden', !show);
  if (btn)  btn.style.display = show ? 'none' : '';
}
window.toggleCreateForm = toggleCreateForm;

async function submitCreateCampaign(e) {
  e.preventDefault();
  const errEl = document.getElementById('create-campaign-error');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

  const fd = new FormData();
  fd.append('action', 'create_campaign');
  fd.append('title',       document.getElementById('fc-title').value.trim());
  fd.append('category',    document.getElementById('fc-category').value.trim());
  fd.append('description', document.getElementById('fc-desc').value.trim());
  fd.append('goal_amount', document.getElementById('fc-goal').value);
  fd.append('deadline',    document.getElementById('fc-deadline').value);
  const img = document.getElementById('fc-image');
  if (img && img.files[0]) fd.append('image', img.files[0]);

  const btn = document.getElementById('submit-campaign-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...'; }

  const res = await apiPost('financial.php', fd);

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Create Campaign'; }

  if (!res.ok) {
    if (errEl) { errEl.style.display = 'block'; errEl.textContent = res.msg || 'Failed to create campaign.'; }
    return;
  }

  document.getElementById('campaignForm')?.reset();
  showCharitySubTab('ongoing');
  showToast('Campaign created successfully!', 'success');
  await loadMyCampaigns();
}
window.submitCreateCampaign = submitCreateCampaign;

// ── Delete Campaign (Charity) ──────────────────────────────
async function deleteFinCampaign(id) {
  if (!confirm('Delete this campaign? This cannot be undone.')) return;
  const res = await apiPost('financial.php', { action: 'delete_campaign', id });
  if (res.ok) {
    showToast(res.msg, 'success');
    const card = document.getElementById('fin-mgmt-' + id);
    if (card) { card.style.opacity = '0'; card.style.transition = 'opacity 0.3s'; setTimeout(() => card.remove(), 300); }
    await loadMyCampaigns();
  } else {
    showToast(res.msg || 'Delete failed.', 'error');
  }
}
window.deleteFinCampaign = deleteFinCampaign;

// ── Donors Modal ───────────────────────────────────────────
async function openDonorsModal(campaignId, title) {
  const modal   = document.getElementById('donorsModal');
  const listEl  = document.getElementById('donors-modal-list');
  const titleEl = document.getElementById('donors-modal-title');
  if (!modal || !listEl) return;

  if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-users"></i> Donors — ${title}`;
  listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';
  modal.classList.add('show');

  const res = await apiGet(`financial.php?action=campaign_donors&campaign_id=${campaignId}`);
  if (!res.ok || !res.donors.length) {
    listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted)">No donations yet.</div>';
    return;
  }
  listEl.innerHTML = res.donors.map(d => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
      <div style="width:38px;height:38px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0">
        ${d.full_name[0].toUpperCase()}
      </div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:0.95rem">${d.full_name}</div>
        ${d.message ? `<div style="font-size:0.8rem;color:var(--text-muted)">"${d.message}"</div>` : ''}
      </div>
      <div style="font-weight:700;color:var(--primary);white-space:nowrap">৳${parseFloat(d.amount).toLocaleString()}</div>
    </div>
  `).join('');
}
window.openDonorsModal = openDonorsModal;

function closeDonorsModal() {
  document.getElementById('donorsModal')?.classList.remove('show');
}
window.closeDonorsModal = closeDonorsModal;

// ── Donation Posts ─────────────────────────────────────────
function togglePostForm(show) {
  const form = document.getElementById('create-post-form');
  if (form) {
    if (show) {
      form.classList.remove('hidden');
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      form.classList.add('hidden');
    }
  }
}
window.togglePostForm = togglePostForm;

async function submitCreatePost(e) {
  e.preventDefault();
  const errEl = document.getElementById('create-post-error');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

  const fd = new FormData();
  fd.append('action', 'create_post');
  fd.append('title',       document.getElementById('dp-title').value.trim());
  fd.append('campaign_id', document.getElementById('dp-campaign').value);
  fd.append('content',     document.getElementById('dp-content').value.trim());
  
  const img = document.getElementById('dp-image');
  if (img && img.files[0]) fd.append('image', img.files[0]);

  const btn = document.getElementById('submit-post-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...'; }

  const res = await apiPost('donation_posts.php', fd);

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publish Post'; }

  if (!res.ok) {
    if (errEl) { errEl.style.display = 'block'; errEl.textContent = res.msg || 'Failed to publish post.'; }
    return;
  }

  document.getElementById('donationPostForm')?.reset();
  togglePostForm(false);
  showToast('Post published successfully!', 'success');
  await loadMyDonationPosts();
}
window.submitCreatePost = submitCreatePost;

async function loadMyDonationPosts() {
  const res = await apiGet('donation_posts.php?action=my_posts');
  if (!res.ok) return;
  const posts = res.posts || [];
  
  const list = document.getElementById('my-posts-list');
  const empty = document.getElementById('my-posts-empty');
  if (!list) return;

  if (!posts.length) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  list.innerHTML = posts.map(p => `
    <div class="post-card">
      ${p.image_url ? `<img src="${p.image_url}" class="post-image" alt="Post Image">` : ''}
      <div class="post-content">
        <h3 class="post-title">${p.title}</h3>
        <p class="post-desc" style="white-space:pre-wrap;">${p.content}</p>
        <div class="post-meta">
          <span><i class="fa-regular fa-clock"></i> ${formatTimeAgo(p.created_at)}</span>
          <span style="color:var(--primary)"><i class="fa-solid fa-bullseye"></i> ${p.campaign_title}</span>
        </div>
      </div>
    </div>
  `).join('');
}
window.loadMyDonationPosts = loadMyDonationPosts;

async function loadPublicDonationPosts() {
  const res = await apiGet('donation_posts.php?action=public_posts');
  if (!res.ok) return;
  const posts = res.posts || [];
  
  const grid = document.getElementById('public-posts-grid');
  const empty = document.getElementById('public-posts-empty');
  if (!grid) return;

  if (!posts.length) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  grid.innerHTML = posts.map(p => `
    <div class="fin-campaign-card" style="display:flex; flex-direction:column; height:100%;">
      ${p.image_url ? `<div class="fin-campaign-img" style="background-image:url('${p.image_url}')"></div>` : ''}
      <div class="fin-campaign-body" style="flex:1;">
        <div class="fin-campaign-title">${p.title}</div>
        <div class="fin-campaign-charity" style="margin-bottom:12px;">
          ${p.charity_avatar ? `<img src="${p.charity_avatar}" style="width:20px;height:20px;border-radius:50%;">` : '<i class="fa-solid fa-building-ngo"></i>'}
          ${p.charity_name}
        </div>
        <div class="fin-campaign-desc" style="white-space:pre-wrap; margin-bottom:16px;">${p.content}</div>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:12px;">
          <i class="fa-regular fa-clock"></i> ${formatTimeAgo(p.created_at)}
        </div>
        <div class="fin-campaign-footer" style="margin-top:auto; padding-top:16px;">
          <button class="btn btn-primary" style="width:100%" onclick="openDonateModal(${p.campaign_id}, '${p.campaign_title.replace(/'/g, "\\'")}', '${p.charity_name.replace(/'/g, "\\'")}')">Donate to Campaign</button>
        </div>
      </div>
    </div>
  `).join('');
}
window.loadPublicDonationPosts = loadPublicDonationPosts;
