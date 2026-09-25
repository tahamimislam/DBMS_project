<?php
// ── Financial Campaigns & Donations API ───────────────────
// GET  /api/financial.php?action=campaigns   → all campaigns
// GET  /api/financial.php?action=my_donations → my donation history
// POST /api/financial.php  action=create_campaign | donate

session_start();
header("Content-Type: application/json");
require "db.php";

$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true) ?? [];

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    // For JSON body requests, merge into $_POST
    if (!empty($jsonInput)) {
        $_POST = array_merge($_POST, $jsonInput);
    }
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');
$userId = $_SESSION['user']['id'] ?? null;

// ─── GET ────────────────────────────────────────────────────
if ($_SERVER["REQUEST_METHOD"] === "GET") {

    if ($action === "campaigns") {
        $sql = "
            SELECT
                fc.id,
                fc.charity_id,
                u.full_name     AS charity_name,
                u.profile_picture AS charity_avatar,
                fc.title,
                fc.category,
                fc.description,
                fc.goal_amount,
                fc.image_url,
                fc.deadline,
                fc.status,
                fc.created_at,
                COALESCE(SUM(d.amount), 0) AS raised_amount,
                COUNT(d.id)                AS donor_count,
                MAX(CASE WHEN d.user_id = ? THEN 1 ELSE 0 END) AS i_donated
            FROM financial_campaigns fc
            JOIN users u ON fc.charity_id = u.id
            LEFT JOIN donations d ON fc.id = d.campaign_id
            WHERE fc.status = 'active'
            GROUP BY fc.id
            ORDER BY fc.created_at DESC
        ";
        $stmt = $conn->prepare($sql);
        $uid = $userId ?? 0;
        $stmt->bind_param("i", $uid);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

        foreach ($rows as &$r) {
            $r['goal_amount']   = (float)$r['goal_amount'];
            $r['raised_amount'] = (float)$r['raised_amount'];
            $r['donor_count']   = (int)$r['donor_count'];
            $r['i_donated']     = (bool)$r['i_donated'];
            $r['progress']      = $r['goal_amount'] > 0
                ? min(100, round(($r['raised_amount'] / $r['goal_amount']) * 100, 1))
                : 0;
        }
        echo json_encode(['ok' => true, 'campaigns' => $rows]);
        exit;
    }

    if ($action === "my_campaigns") {
        if (!$userId) { echo json_encode(['ok'=>false,'msg'=>'Not logged in']); exit; }
        $sql = "
            SELECT
                fc.id, fc.title, fc.description, fc.goal_amount,
                fc.image_url, fc.deadline, fc.status, fc.created_at,
                COALESCE(SUM(d.amount), 0) AS raised_amount,
                COUNT(d.id)                AS donor_count
            FROM financial_campaigns fc
            LEFT JOIN donations d ON fc.id = d.campaign_id
            WHERE fc.charity_id = ?
            GROUP BY fc.id
            ORDER BY fc.created_at DESC
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        foreach ($rows as &$r) {
            $r['goal_amount']   = (float)$r['goal_amount'];
            $r['raised_amount'] = (float)$r['raised_amount'];
            $r['donor_count']   = (int)$r['donor_count'];
            $r['progress']      = $r['goal_amount'] > 0
                ? min(100, round(($r['raised_amount'] / $r['goal_amount']) * 100, 1))
                : 0;
        }
        echo json_encode(['ok' => true, 'campaigns' => $rows]);
        exit;
    }

    if ($action === "my_donations") {
        if (!$userId) { echo json_encode(['ok'=>false,'msg'=>'Not logged in']); exit; }
        $sql = "
            SELECT
                d.id, d.amount, d.message, d.created_at,
                COALESCE(fc.title, CONCAT(d.system_fund, ' Fund')) AS campaign_title,
                COALESCE(u.full_name, 'HumanityLink System') AS charity_name
            FROM donations d
            LEFT JOIN financial_campaigns fc ON d.campaign_id = fc.id
            LEFT JOIN users u ON fc.charity_id = u.id
            WHERE d.user_id = ?
            ORDER BY d.created_at DESC
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        foreach ($rows as &$r) {
            $r['amount'] = (float)$r['amount'];
        }
        echo json_encode(['ok' => true, 'donations' => $rows]);
        exit;
    }

    if ($action === "campaign_donors") {
        $cid = (int)($_GET['campaign_id'] ?? 0);
        if (!$cid) { echo json_encode(['ok'=>false,'msg'=>'Campaign ID required']); exit; }
        $sql = "
            SELECT u.full_name, d.amount, d.message, d.created_at
            FROM donations d JOIN users u ON d.user_id = u.id
            WHERE d.campaign_id = ?
            ORDER BY d.created_at DESC
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $cid);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['ok' => true, 'donors' => $rows]);
        exit;
    }

    echo json_encode(['ok' => false, 'msg' => 'Unknown action']);
    exit;
}

// ─── POST ───────────────────────────────────────────────────
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    if (!$userId) {
        echo json_encode(['ok' => false, 'msg' => 'You must be logged in.']);
        exit;
    }

    $stmt = $conn->prepare("SELECT account_type FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $userRow = $stmt->get_result()->fetch_assoc();
    $accountType = $userRow['account_type'] ?? '';

    if ($action === "create_campaign") {
        if ($accountType !== 'charity') {
            echo json_encode(['ok'=>false,'msg'=>'Only charity organizations can create campaigns.']);
            exit;
        }

        $title       = trim($_POST['title'] ?? '');
        $category    = trim($_POST['category'] ?? 'Other');
        $description = trim($_POST['description'] ?? '');
        $goalAmount  = (float)($_POST['goal_amount'] ?? 0);
        $deadline    = $_POST['deadline'] ?? '';

        if (!$title || !$description || $goalAmount <= 0 || !$deadline) {
            echo json_encode(['ok'=>false,'msg'=>'All fields are required.']);
            exit;
        }

        $imageUrl = null;
        if (!empty($_FILES['image']['tmp_name'])) {
            $uploadDir = "../uploads/financial/";
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
            $ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
            $allowed = ['jpg','jpeg','png','gif','webp'];
            if (!in_array($ext, $allowed)) {
                echo json_encode(['ok'=>false,'msg'=>'Invalid image format.']);
                exit;
            }
            $filename = "fc_" . $userId . "_" . time() . "." . $ext;
            move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $filename);
            $imageUrl = "uploads/financial/" . $filename;
        }

        $stmt = $conn->prepare("INSERT INTO financial_campaigns (charity_id, title, category, description, goal_amount, image_url, deadline) VALUES (?,?,?,?,?,?,?)");
        $stmt->bind_param("isssdss", $userId, $title, $category, $description, $goalAmount, $imageUrl, $deadline);

        if ($stmt->execute()) {
            echo json_encode(['ok'=>true,'msg'=>'Campaign created!','campaign_id'=>$conn->insert_id]);
        } else {
            echo json_encode(['ok'=>false,'msg'=>'Failed to create campaign.']);
        }
        exit;
    }

    if ($action === "donate_system") {
        $fundType = trim($_POST['fund_type'] ?? '');
        $amount   = (float)($_POST['amount'] ?? 0);
        $message  = trim($_POST['message'] ?? '');
        $pm       = trim($_POST['payment_method'] ?? 'card');
        $txId     = trim($_POST['transaction_id'] ?? '');
        $masked   = trim($_POST['masked_account'] ?? '');

        if (!$fundType || $amount <= 0) {
            echo json_encode(['ok'=>false,'msg'=>'Invalid donation amount.']);
            exit;
        }

        $stmt = $conn->prepare("INSERT INTO donations (campaign_id, user_id, amount, message, system_fund, payment_method, transaction_id, masked_account, payment_status) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 'SUCCESS')");
        $stmt->bind_param("idsssss", $userId, $amount, $message, $fundType, $pm, $txId, $masked);

        if ($stmt->execute()) {
            echo json_encode([
                'ok'  => true,
                'msg' => 'Thank you for donating to the ' . $fundType . ' Fund!'
            ]);
        } else {
            echo json_encode(['ok'=>false,'msg'=>'Donation failed. Please try again.']);
        }
        exit;
    }

    if ($action === "donate") {
        $campaignId = (int)($_POST['campaign_id'] ?? 0);
        $amount     = (float)($_POST['amount'] ?? 0);
        $message    = trim($_POST['message'] ?? '');
        $pm         = trim($_POST['payment_method'] ?? 'card');
        $txId       = trim($_POST['transaction_id'] ?? '');
        $masked     = trim($_POST['masked_account'] ?? '');

        if (!$campaignId || $amount <= 0) {
            echo json_encode(['ok'=>false,'msg'=>'Invalid donation amount.']);
            exit;
        }

        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("SELECT id FROM financial_campaigns WHERE id = ? AND status = 'active' FOR UPDATE");
            $stmt->bind_param("i", $campaignId);
            $stmt->execute();
            if (!$stmt->get_result()->fetch_assoc()) {
                throw new Exception('Campaign not found or no longer active.');
            }

            $stmt = $conn->prepare("INSERT INTO donations (campaign_id, user_id, amount, message, payment_method, transaction_id, masked_account, payment_status) VALUES (?,?,?,?,?,?,?,'SUCCESS')");
            $stmt->bind_param("iidssss", $campaignId, $userId, $amount, $message, $pm, $txId, $masked);
            $stmt->execute();

            $stmt = $conn->prepare("UPDATE financial_campaigns SET collected_amount = collected_amount + ? WHERE id = ?");
            $stmt->bind_param("di", $amount, $campaignId);
            $stmt->execute();

            $conn->commit();

            $stmt2 = $conn->prepare("SELECT COALESCE(SUM(amount),0) AS raised, COUNT(*) AS donors FROM donations WHERE campaign_id = ?");
            $stmt2->bind_param("i", $campaignId);
            $stmt2->execute();
            $totals = $stmt2->get_result()->fetch_assoc();
            
            echo json_encode([
                'ok'           => true,
                'msg'          => 'Thank you for your donation!',
                'raised_amount'=> (float)$totals['raised'],
                'donor_count'  => (int)$totals['donors'],
            ]);
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(['ok'=>false,'msg'=>$e->getMessage() ?: 'Donation failed. Please try again.']);
        }
        exit;
    }

    if ($action === "delete_campaign") {
        $campaignId = (int)($_POST['id'] ?? 0);
        if ($accountType !== 'charity' || !$campaignId) {
            echo json_encode(['ok'=>false,'msg'=>'Not allowed.']);
            exit;
        }
        $stmt = $conn->prepare("DELETE FROM financial_campaigns WHERE id = ? AND charity_id = ?");
        $stmt->bind_param("ii", $campaignId, $userId);
        $stmt->execute();
        echo json_encode($stmt->affected_rows > 0
            ? ['ok'=>true,'msg'=>'Campaign deleted.']
            : ['ok'=>false,'msg'=>'Campaign not found.']);
        exit;
    }

    echo json_encode(['ok'=>false,'msg'=>'Unknown action.']);
    exit;
}

echo json_encode(['ok'=>false,'msg'=>'Invalid request method.']);
