<?php
session_start();
require '../api/db.php';

if (!isset($_SESSION['user']) || $_SESSION['user']['accountType'] !== 'admin') {
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// GET requests
if ($method === 'GET') {
    // Fetch system funds balance first
    $systemFunds = [
        'emergency' => 0,
        'welfare' => 0,
        'educational' => 0
    ];
    $res = $conn->query("SELECT system_fund, SUM(amount) as amt FROM donations WHERE campaign_id IS NULL AND payment_status = 'SUCCESS' GROUP BY system_fund");
    while ($row = $res->fetch_assoc()) {
        if ($row['system_fund'] === 'Emergency Relief') $systemFunds['emergency'] = (float)$row['amt'];
        if ($row['system_fund'] === 'General Welfare') $systemFunds['welfare'] = (float)$row['amt'];
        if ($row['system_fund'] === 'Meritorious Student') $systemFunds['educational'] = (float)$row['amt'];
    }

    // Fetch requests
    $sql = "SELECT fr.*, u.full_name as charity_name 
            FROM fund_requests fr
            JOIN users u ON fr.charity_id = u.id
            ORDER BY fr.created_at DESC";
    $result = $conn->query($sql);
    
    $requests = [];
    while ($row = $result->fetch_assoc()) {
        $requests[] = $row;
    }
    
    echo json_encode(['ok' => true, 'requests' => $requests, 'balances' => $systemFunds]);
    exit;
}

// POST for Approve/Reject
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) $data = $_POST;
    
    $action = $data['action'] ?? '';
    $id = (int)($data['id'] ?? 0);
    
    if (!$id || !in_array($action, ['approve', 'reject'])) {
        echo json_encode(['ok' => false, 'error' => 'Invalid parameters']);
        exit;
    }
    
    // Fetch request
    $stmt = $conn->prepare("SELECT * FROM fund_requests WHERE id = ? AND status = 'pending'");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $request = $stmt->get_result()->fetch_assoc();
    
    if (!$request) {
        echo json_encode(['ok' => false, 'error' => 'Request not found or already processed']);
        exit;
    }
    
    if ($action === 'reject') {
        $reason = $data['reason'] ?? '';
        $updateStmt = $conn->prepare("UPDATE fund_requests SET status = 'rejected', admin_feedback = ? WHERE id = ?");
        $updateStmt->bind_param("si", $reason, $id);
        if ($updateStmt->execute()) {
            echo json_encode(['ok' => true]);
        } else {
            echo json_encode(['ok' => false, 'error' => 'Database error']);
        }
    } else if ($action === 'approve') {
        // Map fund type
        $systemFundName = '';
        if ($request['fund_type'] === 'emergency') $systemFundName = 'Emergency Relief';
        else if ($request['fund_type'] === 'welfare') $systemFundName = 'General Welfare';
        else if ($request['fund_type'] === 'educational') $systemFundName = 'Meritorious Student';
        
        $amount = (float)$request['amount'];
        $adminId = $_SESSION['user']['id'];
        
        $conn->begin_transaction();
        try {
            // Mark approved
            $updateStmt = $conn->prepare("UPDATE fund_requests SET status = 'approved' WHERE id = ?");
            $updateStmt->bind_param("i", $id);
            $updateStmt->execute();
            
            // Deduct from donations (negative amount)
            $negAmount = -$amount;
            $pm = "System Payout (Req #$id)";
            $ps = "SUCCESS";
            $tid = "PAY-" . time() . rand(100, 999);
            
            $insertStmt = $conn->prepare("INSERT INTO donations (user_id, system_fund, amount, payment_method, transaction_id, payment_status) VALUES (?, ?, ?, ?, ?, ?)");
            $insertStmt->bind_param("isdsss", $adminId, $systemFundName, $negAmount, $pm, $tid, $ps);
            $insertStmt->execute();
            
            $conn->commit();
            echo json_encode(['ok' => true]);
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        }
    }
    exit;
}
?>
