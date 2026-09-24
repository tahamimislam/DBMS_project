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
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    :root { --primary: #0ea5e9; --bg: #0f172a; --card: #1e293b; --text: #f8fafc; --text-muted: #94a3b8; --border: #334155; }
    body { margin: 0; font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); }
    .navbar { background: var(--card); border-bottom: 1px solid var(--border); padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; }
    .navbar h1 { margin: 0; font-size: 1.5rem; color: var(--primary); }
    .btn { padding: 8px 16px; background: var(--primary); color: #fff; border: none; border-radius: 6px; cursor: pointer; text-decoration: none; font-size: 0.9rem; font-weight: 500; }
    .btn:hover { background: #0284c7; }
    .btn-danger { background: #ef4444; }
    .btn-danger:hover { background: #dc2626; }
    .container { padding: 30px; max-width: 1200px; margin: 0 auto; }
    
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; text-align: center; }
    .stat-card h3 { margin: 0 0 10px; font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase; }
    .stat-card .value { font-size: 2rem; font-weight: 700; color: var(--primary); margin: 0; }
    
    .section-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
    
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 30px; overflow-x: auto; }
    
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.95rem; }
    th { color: var(--text-muted); font-weight: 600; }
    tr:last-child td { border-bottom: none; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .badge-success { background: rgba(34, 197, 94, 0.1); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); }
    .badge-pending { background: rgba(234, 179, 8, 0.1); color: #eab308; border: 1px solid rgba(234, 179, 8, 0.3); }
    .badge-failed { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }

    .filters { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }
    .filters select, .filters input { padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 6px; color: var(--text); }
  </style>
</head>
<body>
  <div class="navbar">
    <h1>HumanityLink Admin</h1>
    <div>
      <span style="margin-right: 15px;">Welcome, <?= htmlspecialchars($_SESSION['user']['fullName']) ?></span>
      <a href="logout.php" class="btn btn-danger">Logout</a>
    </div>
  </div>

  <div class="container">
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Donated</h3>
        <p class="value">৳<?= number_format($stats['total_amount'], 2) ?></p>
      </div>
      <div class="stat-card">
        <h3>Total Donations</h3>
        <p class="value"><?= $stats['total_donations'] ?></p>
      </div>
      <div class="stat-card">
        <h3>Successful Txns</h3>
        <p class="value"><?= $stats['successful_txns'] ?></p>
      </div>
      <div class="stat-card">
        <h3>Unique Donors</h3>
        <p class="value"><?= $stats['donors_count'] ?></p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">Campaign Progress</div>
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
            <td><?= htmlspecialchars($camp['title']) ?></td>
            <td><?= ucfirst($camp['status']) ?></td>
            <td>৳<?= number_format($camp['goal_amount'], 2) ?></td>
            <td>৳<?= number_format($camp['collected_amount'], 2) ?></td>
            <td>
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="flex:1; height:8px; background:var(--border); border-radius:4px; overflow:hidden;">
                  <div style="height:100%; width:<?= $prog ?>%; background:var(--primary);"></div>
                </div>
                <span style="font-size:0.85rem; width:40px; text-align:right;"><?= $prog ?>%</span>
              </div>
            </td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="section-title">Donation Transactions</div>
      
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
        
        <button type="submit" class="btn">Filter</button>
        <a href="dashboard.php" class="btn" style="background:var(--border); color:var(--text);">Reset</a>
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
          <tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">No transactions found.</td></tr>
          <?php else: ?>
            <?php foreach ($donations as $don): ?>
            <tr>
              <td><?= htmlspecialchars($don['donor_name']) ?></td>
              <td><?= htmlspecialchars($don['campaign_name']) ?></td>
              <td style="font-weight:600;">৳<?= number_format($don['amount'], 2) ?></td>
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
              <td style="font-size:0.85rem; color:var(--text-muted);"><?= date('M j, Y H:i', strtotime($don['created_at'])) ?></td>
            </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>

  </div>
</body>
</html>
