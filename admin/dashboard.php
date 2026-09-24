<?php
session_start();
require '../api/db.php';

if (!isset($_SESSION['user']) || $_SESSION['user']['accountType'] !== 'admin') {
    header('Location: login.php');
    exit;
}

// Fetch stats
$stats = [
    'total_amount' => 0,
    'total_donations' => 0,
    'successful_txns' => 0,
    'donors_count' => 0
];

$res = $conn->query("SELECT SUM(amount) as amt, COUNT(*) as cnt FROM donations");
if ($row = $res->fetch_assoc()) {
    $stats['total_amount'] = $row['amt'] ?: 0;
    $stats['total_donations'] = $row['cnt'] ?: 0;
}

$res = $conn->query("SELECT COUNT(*) as cnt FROM donations WHERE payment_status = 'SUCCESS'");
if ($row = $res->fetch_assoc()) $stats['successful_txns'] = $row['cnt'] ?: 0;

$res = $conn->query("SELECT COUNT(DISTINCT user_id) as cnt FROM donations");
if ($row = $res->fetch_assoc()) $stats['donors_count'] = $row['cnt'] ?: 0;

// Fetch campaigns
$campaignsRes = $conn->query("SELECT id, title, goal_amount, collected_amount, status FROM financial_campaigns ORDER BY created_at DESC");
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
      <a href="../index.html" class="app-sidebar-link">
        <span class="asbl-icon"><i class="fa-solid fa-house"></i></span>
        <span class="asbl-text">Return to App</span>
      </a>
    </nav>
    <div class="app-sidebar-spacer"></div>
    <div class="app-sidebar-account">
      <div style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.03); border-radius:12px; border:1px solid var(--border);">
        <div style="width:40px; height:40px; background:var(--primary); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700;">
          AD
        </div>
        <div style="flex:1; overflow:hidden;">
          <div style="font-weight:600; font-size:0.95rem; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;"><?= htmlspecialchars($_SESSION['user']['fullName']) ?></div>
          <div style="font-size:0.8rem; color:var(--text-muted);">Administrator</div>
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
            <h1><i class="fa-solid fa-shield-halved"></i> Overview</h1>
            <p>Monitor system donations, campaigns, and overall progress.</p>
          </div>
        </div>
      </div>

      <div class="admin-stats-grid">
        <div class="admin-stat-card">
          <h3>Total Donated</h3>
          <p class="value">৳<?= number_format($stats['total_amount'], 2) ?></p>
        </div>
        <div class="admin-stat-card">
          <h3>Total Donations</h3>
          <p class="value"><?= $stats['total_donations'] ?></p>
        </div>
        <div class="admin-stat-card">
          <h3>Successful Txns</h3>
          <p class="value"><?= $stats['successful_txns'] ?></p>
        </div>
        <div class="admin-stat-card">
          <h3>Unique Donors</h3>
          <p class="value"><?= $stats['donors_count'] ?></p>
        </div>
      </div>

      <div class="admin-card">
        <div class="admin-card-title"><i class="fa-solid fa-bullseye"></i> Campaign Progress</div>
        <table>
          <thead>
            <tr>
              <th>Campaign Title</th>
              <th>Status</th>
              <th>Goal Amount</th>
              <th>Collected Amount</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($campaigns as $camp): 
              $prog = $camp['goal_amount'] > 0 ? min(100, round(($camp['collected_amount'] / $camp['goal_amount']) * 100, 1)) : 0;
            ?>
            <tr>
              <td style="font-weight:600;"><?= htmlspecialchars($camp['title']) ?></td>
              <td><span class="badge" style="background:rgba(255,255,255,0.1);"><?= ucfirst($camp['status']) ?></span></td>
              <td>৳<?= number_format($camp['goal_amount'], 2) ?></td>
              <td style="color:var(--primary); font-weight:600;">৳<?= number_format($camp['collected_amount'], 2) ?></td>
              <td>
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="flex:1; height:8px; background:var(--border); border-radius:4px; overflow:hidden;">
                    <div style="height:100%; width:<?= $prog ?>%; background:var(--primary);"></div>
                  </div>
                  <span style="font-size:0.85rem; width:40px; text-align:right; font-weight:600;"><?= $prog ?>%</span>
                </div>
              </td>
            </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>

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

    </div>
  </div>

  <script>
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
  </script>
</body>
</html>
