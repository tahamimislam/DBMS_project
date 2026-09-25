<?php
session_start();
require '../api/db.php';

if (!isset($_SESSION['user']) || $_SESSION['user']['accountType'] !== 'admin') {
    header('Location: login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fund Requests - HumanityLink Admin</title>
  <script>
    (function() {
      var saved = localStorage.getItem('hl_theme');
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = saved ? saved : (prefersDark ? 'dark' : 'light');
      if (theme === 'dark') document.documentElement.classList.add('dark-theme');
    })();
  </script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="../styles.css">
  <style>
    .admin-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
    .badge { padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
    .badge-success { background: rgba(34, 197, 94, 0.1); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); }
    .badge-pending { background: rgba(234, 179, 8, 0.1); color: #eab308; border: 1px solid rgba(234, 179, 8, 0.3); }
    .badge-failed { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }

    .req-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    
    .profile-wrapper { position: relative; }
    .profile-card {
      display: flex; align-items: center; gap: 12px; padding: 12px;
      background: rgba(255,255,255,0.03); border-radius: 12px;
      border: 1px solid var(--border);
      cursor: pointer; transition: background 0.2s, border-color 0.2s;
      user-select: none;
    }
    .profile-card:hover { background: rgba(255,255,255,0.07); border-color: var(--primary); }
    .profile-dropdown {
      position: absolute; bottom: calc(100% + 8px); left: 0; right: 0;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 12px; overflow: hidden;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      opacity: 0; pointer-events: none;
      transform: translateY(6px);
      transition: opacity 0.2s, transform 0.2s;
      z-index: 200;
    }
    .profile-dropdown.open { opacity: 1; pointer-events: all; transform: translateY(0); }
    .profile-dropdown a {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; color: #ef4444; font-weight: 600;
      font-size: 0.9rem; text-decoration: none;
      transition: background 0.15s;
    }
    .profile-dropdown a:hover { background: rgba(239,68,68,0.1); }
  </style>
</head>
<body class="has-sidebar">

  <!-- ── Sidebar ── -->
  <aside class="app-sidebar" id="appSidebar">
    <a href="../index.html" class="app-sidebar-logo">
      <img src="../assets/logo.jpg" alt="HumanityLink">
      <span>HumanityLink</span>
    </a>
    <nav class="app-sidebar-nav">
      <div class="app-sidebar-section-label">Admin Panel</div>
      <a href="dashboard.php" class="app-sidebar-link">
        <span class="asbl-icon"><i class="fa-solid fa-chart-pie"></i></span>
        <span class="asbl-text">Dashboard</span>
      </a>
      <a href="fund_requests.php" class="app-sidebar-link active">
        <span class="asbl-icon"><i class="fa-solid fa-hand-holding-hand"></i></span>
        <span class="asbl-text">Fund Requests</span>
      </a>
    </nav>
    <div class="app-sidebar-spacer"></div>
    <div class="app-sidebar-account">
      <div class="profile-wrapper">
        <div class="profile-card" id="profileCard" onclick="toggleProfileMenu(event)">
          <div style="width:40px; height:40px; background:var(--primary); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0;">
            AD
          </div>
          <div style="flex:1; overflow:hidden;">
            <div style="font-weight:600; font-size:0.95rem; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;"><?= htmlspecialchars($_SESSION['user']['fullName']) ?></div>
            <div style="font-size:0.8rem; color:var(--text-muted);">Administrator</div>
          </div>
          <i class="fa-solid fa-chevron-up" id="profileChevron" style="font-size:0.75rem; color:var(--text-muted); transition:transform 0.2s;"></i>
        </div>
        <div class="profile-dropdown" id="profileDropdown">
          <a href="logout.php">
            <i class="fa-solid fa-arrow-right-from-bracket"></i> Logout
          </a>
        </div>
      </div>
    </div>
  </aside>

  <button class="sidebar-overlay" id="sidebarOverlay" onclick="document.body.classList.remove('sidebar-open')" aria-label="Close sidebar"></button>

  <div class="app-topbar">
    <button class="sidebar-toggle" onclick="document.body.classList.toggle('sidebar-open')" aria-label="Toggle sidebar">
      <i class="fa-solid fa-bars"></i>
    </button>
    <div class="topbar-title">Fund Requests</div>
    <div class="topbar-right"></div>
    <button class="btn btn-ghost theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle theme">
      <i class="fa-solid fa-moon"></i>
    </button>
  </div>

  <div class="app-main">
    <div class="container mw-container">
      
      <div class="page-header" style="margin-bottom:24px;">
        <div class="page-header-row">
          <div>
            <h1><i class="fa-solid fa-hand-holding-hand"></i> Charity Fund Requests</h1>
            <p>Review and process funding applications from charity organizations.</p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mw-tabs" style="margin-bottom:24px; display:flex; overflow-x:auto;">
        <button class="mw-tab active" id="tab-req-emergency" onclick="switchReqTab('emergency')" style="white-space:nowrap;">
          <i class="fa-solid fa-house-crack"></i> Emergency Relief
        </button>
        <button class="mw-tab" id="tab-req-welfare" onclick="switchReqTab('welfare')" style="white-space:nowrap;">
          <i class="fa-solid fa-people-carry-box"></i> General Welfare
        </button>
        <button class="mw-tab" id="tab-req-educational" onclick="switchReqTab('educational')" style="white-space:nowrap;">
          <i class="fa-solid fa-graduation-cap"></i> Educational Support
        </button>
      </div>

      <div class="admin-card" style="margin-bottom:16px;">
        <div style="font-size:1.1rem; font-weight:700; margin-bottom:8px;">Available Balance</div>
        <div id="balance-display" style="font-size:2rem; font-weight:800; color:var(--primary);">৳0.00</div>
      </div>

      <div id="req-grid" class="req-grid">
        <!-- Injected via JS -->
      </div>
      <div id="req-empty" style="display:none; text-align:center; padding:60px 20px; color:var(--text-muted);">
        <i class="fa-solid fa-folder-open" style="font-size:3rem; margin-bottom:16px; display:block;"></i>
        <h3>No requests found</h3>
        <p>There are no applications pending for this category.</p>
      </div>

    </div>
  </div>

  <script>
    function toggleTheme() {
      const html = document.documentElement;
      if (html.classList.contains('dark-theme')) {
        html.classList.remove('dark-theme');
        localStorage.setItem('hl_theme', 'light');
      } else {
        html.classList.add('dark-theme');
        localStorage.setItem('hl_theme', 'dark');
      }
    }

    function toggleProfileMenu(e) {
      e.stopPropagation();
      const menu = document.getElementById('profileDropdown');
      const chev = document.getElementById('profileChevron');
      menu.classList.toggle('open');
      chev.style.transform = menu.classList.contains('open') ? 'rotate(180deg)' : '';
    }
    document.addEventListener('click', () => {
      document.getElementById('profileDropdown')?.classList.remove('open');
      const chev = document.getElementById('profileChevron');
      if (chev) chev.style.transform = '';
    });

    let currentTab = 'emergency';
    let allRequests = [];
    let balances = {};

    async function loadRequests() {
      document.getElementById('req-grid').innerHTML = '<div style="text-align:center; grid-column:1/-1; padding:40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;color:var(--primary);"></i></div>';
      try {
        const res = await fetch('api_fund_requests.php');
        const data = await res.json();
        if (data.ok) {
          allRequests = data.requests;
          balances = data.balances;
          renderTab();
        } else {
          alert(data.error);
        }
      } catch (err) {
        console.error(err);
      }
    }

    function switchReqTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.mw-tab').forEach(b => b.classList.remove('active'));
      document.getElementById('tab-req-' + tab).classList.add('active');
      renderTab();
    }

    function renderTab() {
      const balanceEl = document.getElementById('balance-display');
      balanceEl.textContent = '৳' + (balances[currentTab] || 0).toLocaleString(undefined, {minimumFractionDigits: 2});
      
      const filtered = allRequests.filter(r => r.fund_type === currentTab);
      const grid = document.getElementById('req-grid');
      const empty = document.getElementById('req-empty');
      
      if (filtered.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
      }
      
      empty.style.display = 'none';
      grid.innerHTML = filtered.map(req => {
        let statusBadge = '';
        if (req.status === 'pending') statusBadge = '<span class="badge badge-pending">Pending</span>';
        else if (req.status === 'approved') statusBadge = '<span class="badge badge-success">Approved</span>';
        else if (req.status === 'rejected') statusBadge = '<span class="badge badge-failed">Rejected</span>';
        
        let details = '';
        if (req.category === 'individual') {
          details = `<div><strong>Name:</strong> ${req.individual_name}</div>
                     <div><strong>NID/Birth Cert:</strong> ${req.nid_number}</div>`;
        } else if (req.category === 'group') {
          details = `<div><strong>Org:</strong> ${req.organization_name}</div>
                     <div><strong>Type:</strong> <span style="text-transform:capitalize">${req.group_category.replace('_', ' ')}</span></div>`;
        }
        
        let actions = '';
        if (req.status === 'pending') {
          actions = `
            <div style="display:flex; gap:10px; margin-top:16px;">
              <button class="btn btn-primary btn-sm" style="flex:1" onclick="processReq(${req.id}, 'approve', ${req.support_amount})">Approve & Pay</button>
              <button class="btn btn-ghost btn-sm" onclick="processReq(${req.id}, 'reject', 0)">Reject</button>
            </div>
          `;
        }
        
        let feedback = '';
        if (req.status === 'rejected' && req.admin_feedback) {
          feedback = `<div style="margin-top:12px; padding:10px 14px; background:rgba(239, 68, 68, 0.08); border-left:3px solid #ef4444; border-radius:6px; color:#fca5a5; font-size:0.85rem;">
            <strong>Reject Reason:</strong> ${req.admin_feedback}
          </div>`;
        }
        
        return `
          <div class="admin-card" style="margin-bottom:0; display:flex; flex-direction:column;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
              <div style="font-weight:700; font-size:1.1rem; color:var(--text);"><i class="fa-solid fa-building-ngo" style="color:var(--primary);"></i> ${req.charity_name}</div>
              ${statusBadge}
            </div>
            <div style="font-size:0.9rem; margin-bottom:8px;">
              <span style="display:inline-block; padding:2px 8px; background:rgba(255,255,255,0.05); border-radius:4px; text-transform:capitalize;">${req.category} Request</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">
              ${details}
              <div><strong>Amount Requested:</strong> <span style="color:var(--primary); font-weight:700;">৳${parseFloat(req.support_amount).toLocaleString()}</span></div>
              <div><strong>Date:</strong> ${new Date(req.created_at).toLocaleDateString('en-GB')}</div>
            </div>
            <div style="font-size:0.85rem; background:rgba(255,255,255,0.02); padding:10px; border-radius:8px; flex:1;">
              <strong>Reason:</strong> ${req.reason}
            </div>
            ${feedback}
            ${actions}
          </div>
        `;
      }).join('');
    }

    async function processReq(id, action, amount) {
      if (action === 'approve') {
        const bal = balances[currentTab] || 0;
        if (amount > bal) {
          alert('Insufficient funds in ' + currentTab + ' to approve this request (Needs ৳' + amount + ', Available: ৳' + bal + ').');
          return;
        }
        if (!confirm('Are you sure you want to approve this request? ৳' + amount + ' will be deducted from the system fund.')) return;
      }
      
      let reason = '';
      if (action === 'reject') {
        reason = prompt('Please enter a reason for rejection:');
        if (reason === null) return;
      }
      
      try {
        const res = await fetch('api_fund_requests.php', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({id, action, reason})
        });
        const data = await res.json();
        if (data.ok) {
          loadRequests(); // Reload
        } else {
          alert('Error: ' + data.error);
        }
      } catch (err) {
        console.error(err);
        alert('Request failed');
      }
    }

    // Load data on start
    loadRequests();
  </script>
</body>
</html>
