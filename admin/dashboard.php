<?php
session_start();
require '../api/db.php';

if (!isset($_SESSION['user']) || $_SESSION['user']['accountType'] !== 'admin') {
    header('Location: login.php');
    exit;
}

// Fetch system managed funds totals
$systemFunds = [
    'Emergency Relief' => 0,
    'General Welfare' => 0,
    'Meritorious Student' => 0
];
$res = $conn->query("SELECT system_fund, SUM(amount) as amt FROM donations WHERE campaign_id IS NULL AND payment_status = 'SUCCESS' GROUP BY system_fund");
while ($row = $res->fetch_assoc()) {
    if (array_key_exists($row['system_fund'], $systemFunds)) {
        $systemFunds[$row['system_fund']] = (float)$row['amt'];
    }
}

// Fetch campaigns
$campaignsRes = $conn->query("
    SELECT fc.id, fc.title, fc.goal_amount, fc.collected_amount, fc.status, fc.image_url, fc.description, fc.deadline,
           u.full_name as charity_name,
           (SELECT COUNT(id) FROM donations d WHERE d.campaign_id = fc.id AND d.payment_status='SUCCESS') as donor_count
    FROM financial_campaigns fc
    JOIN users u ON fc.charity_id = u.id
    ORDER BY fc.created_at DESC
");
$campaigns = [];
while ($row = $campaignsRes->fetch_assoc()) {
    $campaigns[] = $row;
}

// Fetch donations with filters
$whereClause = "1=1";
$params = [];
$types = "";

if (!empty($_GET['method'])) {
    $whereClause .= " AND d.payment_method = ?";
    $params[] = $_GET['method'];
    $types .= "s";
}
if (!empty($_GET['campaign'])) {
    $whereClause .= " AND d.campaign_id = ?";
    $params[] = $_GET['campaign'];
    $types .= "i";
}
if (!empty($_GET['status'])) {
    $whereClause .= " AND d.payment_status = ?";
    $params[] = $_GET['status'];
    $types .= "s";
}
if (!empty($_GET['date'])) {
    $whereClause .= " AND DATE(d.created_at) = ?";
    $params[] = $_GET['date'];
    $types .= "s";
}

$sql = "SELECT d.id, u.full_name as donor_name, COALESCE(fc.title, d.system_fund) as campaign_name, d.amount, d.payment_method, d.transaction_id, d.payment_status, d.created_at 
        FROM donations d 
        JOIN users u ON d.user_id = u.id 
        LEFT JOIN financial_campaigns fc ON d.campaign_id = fc.id 
        WHERE $whereClause 
        ORDER BY d.created_at DESC";

$stmt = $conn->prepare($sql);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$donations = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard - HumanityLink</title>
  <!-- Apply theme BEFORE stylesheets to prevent flash -->
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
    /* Admin specific overrides */
    .admin-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .admin-stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .admin-stat-card h3 { margin: 0 0 8px; font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .admin-stat-card .value { font-size: 2rem; font-weight: 800; color: var(--primary); margin: 0; }
    
    .admin-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; overflow-x: auto; }
    .admin-card-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    
    table { width: 100%; border-collapse: collapse; min-width: 700px; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.95rem; }
    th { color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5px; }
    tr:last-child td { border-bottom: none; }
    
    .badge { padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
    .badge-success { background: rgba(34, 197, 94, 0.1); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); }
    .badge-pending { background: rgba(234, 179, 8, 0.1); color: #eab308; border: 1px solid rgba(234, 179, 8, 0.3); }
    .badge-failed { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }

    .filters { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .filters select, .filters input { padding: 8px 14px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-family: inherit; }
    .filters select:focus, .filters input:focus { outline: none; border-color: var(--primary); }

    /* Profile dropdown */
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
      <a href="dashboard.php" class="app-sidebar-link active">
        <span class="asbl-icon"><i class="fa-solid fa-chart-pie"></i></span>
        <span class="asbl-text">Dashboard</span>
      </a>
      <a href="fund_requests.php" class="app-sidebar-link">
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
    <div class="topbar-title">Admin Dashboard</div>
    <div class="topbar-right"></div>
    <button class="btn btn-ghost theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle theme">
      <i class="fa-solid fa-moon"></i>
    </button>
    <a href="logout.php" class="btn btn-primary" style="margin-left:12px;">
      <i class="fa-solid fa-arrow-right-from-bracket"></i> Logout
    </a>
  </div>

  <!-- ── Main Content ── -->
  <div class="app-main">
    <div class="container mw-container">
      
      <div class="page-header" style="margin-bottom:24px;">
        <div class="page-header-row">
          <div>
            <h1><i class="fa-solid fa-shield-halved"></i> Admin Panel</h1>
            <p>Manage system funds, monitor charity campaigns, and view donation transactions.</p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mw-tabs" style="margin-bottom:24px; display:flex; overflow-x:auto;">
        <button class="mw-tab active" id="tab-admin-system" onclick="switchAdminTab('system')" style="white-space:nowrap;">
          <i class="fa-solid fa-building-columns"></i> System managed fund
        </button>
        <button class="mw-tab" id="tab-admin-campaigns" onclick="switchAdminTab('campaigns')" style="white-space:nowrap;">
          <i class="fa-solid fa-building-ngo"></i> Charity campaigns
        </button>
        <button class="mw-tab" id="tab-admin-transactions" onclick="switchAdminTab('transactions')" style="white-space:nowrap;">
          <i class="fa-solid fa-money-bill-transfer"></i> Donation Transaction
        </button>
      </div>

      <!-- Tab 1: System Managed Fund -->
      <div id="admin-sub-system">
        <div style="margin-bottom:28px;">
          <h2 style="font-size:1.6rem; font-weight:800; margin-bottom:6px;"><i class="fa-solid fa-building-columns"></i> System Managed Funds</h2>
          <p style="color:var(--text-muted); font-size:0.9rem;">Your contribution goes directly to the HumanityLink System Fund for coordinated responses.</p>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px,1fr)); gap:24px;">
          
          <!-- Emergency Relief Fund -->
          <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:20px; overflow:hidden; display:flex; flex-direction:column; transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 40px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
            <div style="background:#fde8e8; display:flex; align-items:center; justify-content:center; padding:40px 20px; min-height:160px;">
              <i class="fa-solid fa-house-crack" style="font-size:4rem; color:#e53e3e;"></i>
            </div>
            <div style="padding:20px; flex:1; display:flex; flex-direction:column; gap:8px;">
              <div style="font-size:1.05rem; font-weight:800;">Emergency Relief Fund</div>
              <div style="font-size:0.8rem; color:var(--text-muted);"><i class="fa-solid fa-shield-halved" style="color:var(--primary);"></i> HumanityLink System</div>
              <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.55; flex:1;">
                Rapid response fund for natural disasters, floods, and unforeseen emergencies affecting vulnerable communities across Bangladesh.
              </div>
              <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:12px; padding:14px; margin-top:8px; text-align:center;">
                <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Total Collected</div>
                <div style="font-size:1.5rem; font-weight:800; color:var(--primary);">৳<?= number_format($systemFunds['Emergency Relief'] ?? 0, 2) ?></div>
              </div>
            </div>
          </div>

          <!-- General Welfare Fund -->
          <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:20px; overflow:hidden; display:flex; flex-direction:column; transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 40px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
            <div style="background:#e8eeff; display:flex; align-items:center; justify-content:center; padding:40px 20px; min-height:160px;">
              <i class="fa-solid fa-hand-holding-heart" style="font-size:4rem; color:#4361ee;"></i>
            </div>
            <div style="padding:20px; flex:1; display:flex; flex-direction:column; gap:8px;">
              <div style="font-size:1.05rem; font-weight:800;">General Welfare Fund</div>
              <div style="font-size:0.8rem; color:var(--text-muted);"><i class="fa-solid fa-shield-halved" style="color:var(--primary);"></i> HumanityLink System</div>
              <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.55; flex:1;">
                A flexible fund utilized for medical aid, clothing, and essential sustenance for marginalized individuals without access to specific charity campaigns.
              </div>
              <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:12px; padding:14px; margin-top:8px; text-align:center;">
                <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Total Collected</div>
                <div style="font-size:1.5rem; font-weight:800; color:var(--primary);">৳<?= number_format($systemFunds['General Welfare'] ?? 0, 2) ?></div>
              </div>
            </div>
          </div>

          <!-- Meritorious Student Fund -->
          <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:20px; overflow:hidden; display:flex; flex-direction:column; transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 40px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
            <div style="background:#fef9e0; display:flex; align-items:center; justify-content:center; padding:40px 20px; min-height:160px;">
              <i class="fa-solid fa-graduation-cap" style="font-size:4rem; color:#d97706;"></i>
            </div>
            <div style="padding:20px; flex:1; display:flex; flex-direction:column; gap:8px;">
              <div style="font-size:1.05rem; font-weight:800;">Meritorious Fund</div>
              <div style="font-size:0.8rem; color:var(--text-muted);"><i class="fa-solid fa-shield-halved" style="color:var(--primary);"></i> HumanityLink System</div>
              <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.55; flex:1;">
                Dedicated financial assistance for meritorious but impoverished students who cannot afford their educational expenses.
              </div>
              <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:12px; padding:14px; margin-top:8px; text-align:center;">
                <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Total Collected</div>
                <div style="font-size:1.5rem; font-weight:800; color:var(--primary);">৳<?= number_format($systemFunds['Meritorious Student'] ?? 0, 2) ?></div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Tab 2: Charity Campaigns -->
      <div id="admin-sub-campaigns" class="hidden">
        <div style="margin-bottom:28px;">
          <h2 style="font-size:1.6rem; font-weight:800; margin-bottom:6px;"><i class="fa-solid fa-building-ngo"></i> Charity Organization Campaigns</h2>
          <p style="color:var(--text-muted); font-size:0.9rem;">Monitor all active and archived campaigns created by verified charity organizations.</p>
          <hr style="border:0; border-top:1px solid var(--border); margin:20px 0 0;">
        </div>
        <div style="display:flex; flex-direction:column; gap:16px;">
          <?php foreach ($campaigns as $camp): 
            $prog = $camp['goal_amount'] > 0 ? min(100, round(($camp['collected_amount'] / $camp['goal_amount']) * 100, 1)) : 0;
            $isActive = $camp['status'] === 'active';
          ?>
          <div style="
            background:var(--bg-card);
            border:1px solid var(--border);
            border-radius:16px;
            overflow:hidden;
            display:flex;
            flex-direction:row;
            transition:transform 0.2s, box-shadow 0.2s;
            <?= !$isActive ? 'opacity:0.75;' : '' ?>
          ">
            <!-- Image Column -->
            <div style="flex-shrink:0; width:180px; min-height:160px; background:var(--bg-secondary); display:flex; align-items:center; justify-content:center; position:relative;">
              <?php if ($camp['image_url']): ?>
                <img src="../<?= htmlspecialchars($camp['image_url']) ?>" style="width:100%; height:100%; object-fit:cover;" alt="<?= htmlspecialchars($camp['title']) ?>">
              <?php else: ?>
                <i class="fa-solid fa-hand-holding-dollar" style="font-size:3rem; color:var(--text-muted);"></i>
              <?php endif; ?>
            </div>

            <!-- Content Column -->
            <div style="flex:1; padding:20px; display:flex; flex-direction:column; gap:6px;">
              
              <!-- Title + Status -->
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
                <div style="font-size:1.05rem; font-weight:700;"><?= htmlspecialchars($camp['title']) ?></div>
                <?php 
                  $sBg = $isActive ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.08)';
                  $sColor = $isActive ? '#22c55e' : '#888';
                  $sBorder = $isActive ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.15)';
                ?>
                <span style="background:<?= $sBg ?>; color:<?= $sColor ?>; border:<?= $sBorder ?>; padding:4px 10px; border-radius:20px; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap;">
                  <?= ucfirst($camp['status']) ?>
                </span>
              </div>

              <!-- Charity Name -->
              <div style="font-size:0.83rem; color:var(--text-muted);">
                <i class="fa-solid fa-building-ngo"></i> <?= htmlspecialchars($camp['charity_name'] ?: 'Charity') ?>
              </div>

              <!-- Description -->
              <?php if ($camp['description']): ?>
              <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                <?= htmlspecialchars($camp['description']) ?>
              </div>
              <?php endif; ?>

              <!-- Progress Bar -->
              <div style="margin-top:auto; padding-top:12px;">
                <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:6px;">
                  <span style="font-weight:700; color:var(--primary);">৳<?= number_format($camp['collected_amount'], 2) ?> collected</span>
                  <span style="color:var(--text-muted);">Goal: ৳<?= number_format($camp['goal_amount'], 2) ?></span>
                </div>
                <div style="background:var(--bg-secondary); border:1px solid rgba(255,255,255,0.1); border-radius:99px; height:8px; overflow:hidden;">
                  <div style="height:8px; width:<?= $prog ?>%; background:linear-gradient(90deg,#22c55e,#16a34a); border-radius:99px;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:0.78rem; color:var(--text-muted);">
                  <span><i class="fa-solid fa-users"></i> <?= $camp['donor_count'] ?> donor<?= $camp['donor_count'] != 1 ? 's' : '' ?></span>
                  <span style="font-weight:700; color:var(--primary);"><?= $prog ?>%</span>
                  <span><i class="fa-regular fa-calendar"></i> <?= date('M j, Y', strtotime($camp['deadline'])) ?></span>
                </div>
              </div>
            </div>
          </div>
          <?php endforeach; ?>
          <?php if (empty($campaigns)): ?>
            <div style="text-align:center; padding:60px; color:var(--text-muted);">
              <i class="fa-solid fa-hand-holding-dollar" style="font-size:3rem; margin-bottom:16px; display:block;"></i>
              <p>No charity campaigns yet.</p>
            </div>
          <?php endif; ?>
        </div>
      </div>

      <!-- Tab 3: Donation Transactions -->
      <div id="admin-sub-transactions" class="hidden">

      <div class="admin-card">
        <div class="admin-card-title"><i class="fa-solid fa-money-bill-transfer"></i> Donation Transactions</div>
        
        <form class="filters" method="GET">
          <select name="method">
            <option value="">All Payment Methods</option>
            <option value="card" <?= ($_GET['method'] ?? '') === 'card' ? 'selected' : '' ?>>Card</option>
            <option value="bkash" <?= ($_GET['method'] ?? '') === 'bkash' ? 'selected' : '' ?>>bKash</option>
            <option value="nagad" <?= ($_GET['method'] ?? '') === 'nagad' ? 'selected' : '' ?>>Nagad</option>
            <option value="rocket" <?= ($_GET['method'] ?? '') === 'rocket' ? 'selected' : '' ?>>Rocket</option>
          </select>
          
          <select name="campaign">
            <option value="">All Campaigns</option>
            <?php foreach ($campaigns as $camp): ?>
            <option value="<?= $camp['id'] ?>" <?= ($_GET['campaign'] ?? '') == $camp['id'] ? 'selected' : '' ?>><?= htmlspecialchars($camp['title']) ?></option>
            <?php endforeach; ?>
          </select>
          
          <select name="status">
            <option value="">All Statuses</option>
            <option value="SUCCESS" <?= ($_GET['status'] ?? '') === 'SUCCESS' ? 'selected' : '' ?>>Success</option>
            <option value="PENDING" <?= ($_GET['status'] ?? '') === 'PENDING' ? 'selected' : '' ?>>Pending</option>
            <option value="FAILED" <?= ($_GET['status'] ?? '') === 'FAILED' ? 'selected' : '' ?>>Failed</option>
          </select>
          
          <input type="date" name="date" value="<?= htmlspecialchars($_GET['date'] ?? '') ?>">
          
          <button type="submit" class="btn btn-primary"><i class="fa-solid fa-filter"></i> Filter</button>
          <a href="dashboard.php" class="btn btn-ghost" style="border:1px solid var(--border);">Reset</a>
        </form>

        <table>
          <thead>
            <tr>
              <th>Donor Name</th>
              <th>Campaign / Fund</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Transaction ID</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <?php if (empty($donations)): ?>
            <tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No transactions found.</td></tr>
            <?php else: ?>
              <?php foreach ($donations as $don): ?>
              <tr>
                <td><?= htmlspecialchars($don['donor_name']) ?></td>
                <td><?= htmlspecialchars($don['campaign_name']) ?></td>
                <td style="font-weight:700; color:var(--primary);">৳<?= number_format($don['amount'], 2) ?></td>
                <td style="text-transform:capitalize;"><?= htmlspecialchars($don['payment_method']) ?></td>
                <td style="font-family:monospace;"><?= htmlspecialchars($don['transaction_id']) ?></td>
                <td>
                  <?php 
                    $cls = 'badge-pending';
                    if ($don['payment_status'] === 'SUCCESS') $cls = 'badge-success';
                    if ($don['payment_status'] === 'FAILED') $cls = 'badge-failed';
                  ?>
                  <span class="badge <?= $cls ?>"><?= $don['payment_status'] ?></span>
                </td>
                <td style="font-size:0.85rem; color:var(--text-muted);"><?= date('M j, Y h:i A', strtotime($don['created_at'])) ?></td>
              </tr>
              <?php endforeach; ?>
            <?php endif; ?>
          </tbody>
        </table>
      </div>
      </div> <!-- End Tab 3: Donation Transactions -->

    </div>
  </div>

  <script>
    function switchAdminTab(tab) {
      document.querySelectorAll('.mw-tab').forEach(b => b.classList.remove('active'));
      document.getElementById('tab-admin-' + tab)?.classList.add('active');

      const systemEl = document.getElementById('admin-sub-system');
      const campaignsEl = document.getElementById('admin-sub-campaigns');
      const txnsEl = document.getElementById('admin-sub-transactions');

      if (systemEl) systemEl.classList.add('hidden');
      if (campaignsEl) campaignsEl.classList.add('hidden');
      if (txnsEl) txnsEl.classList.add('hidden');

      if (tab === 'system' && systemEl) systemEl.classList.remove('hidden');
      else if (tab === 'campaigns' && campaignsEl) campaignsEl.classList.remove('hidden');
      else if (tab === 'transactions' && txnsEl) txnsEl.classList.remove('hidden');
    }

    function updateThemeIcon() {
      var isDark = document.documentElement.classList.contains('dark-theme');
      var btns = document.querySelectorAll('.theme-toggle-btn');
      btns.forEach(function(btn) {
        btn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
      });
    }

    function toggleTheme() {
      var html = document.documentElement;
      var isDark = html.classList.contains('dark-theme');
      if (isDark) {
        html.classList.remove('dark-theme');
        localStorage.setItem('hl_theme', 'light');
      } else {
        html.classList.add('dark-theme');
        localStorage.setItem('hl_theme', 'dark');
      }
      updateThemeIcon();
    }

    document.addEventListener('DOMContentLoaded', updateThemeIcon);

    // Profile dropdown
    function toggleProfileMenu(e) {
      e.stopPropagation();
      var dropdown = document.getElementById('profileDropdown');
      var chevron  = document.getElementById('profileChevron');
      var isOpen   = dropdown.classList.contains('open');
      dropdown.classList.toggle('open', !isOpen);
      chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    }

    document.addEventListener('click', function() {
      var dropdown = document.getElementById('profileDropdown');
      var chevron  = document.getElementById('profileChevron');
      if (dropdown && dropdown.classList.contains('open')) {
        dropdown.classList.remove('open');
        chevron.style.transform = 'rotate(0deg)';
      }
    });
  </script>
</body>
</html>
