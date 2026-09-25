<?php
require 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

// Handle GET: Fetch applications for the charity
if ($method === 'GET') {
    if (!isset($_GET['charity_id'])) {
        echo json_encode(['ok' => false, 'error' => 'Missing charity_id']);
        exit;
    }
    
    $charity_id = (int)$_GET['charity_id'];
    
    $sql = "SELECT * FROM fund_requests WHERE charity_id = ? ORDER BY created_at DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $charity_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $applications = [];
    while ($row = $result->fetch_assoc()) {
        $applications[] = $row;
    }
    
    echo json_encode(['ok' => true, 'applications' => $applications]);
    exit;
}

// Handle POST: Submit a new application
if ($method === 'POST') {
    $data = $_POST;
    if (empty($data)) {
        $data = json_decode(file_get_contents('php://input'), true);
    }
    
    $charity_id = isset($data['charity_id']) ? (int)$data['charity_id'] : 0;
    $category = $data['category'] ?? '';
    $reason = $data['reason'] ?? '';
    $support_amount = isset($data['support_amount']) ? (float)$data['support_amount'] : 0;
    
    $individual_name = $data['individual_name'] ?? null;
    $nid_number = $data['nid_number'] ?? null;
    $organization_name = $data['organization_name'] ?? null;
    $group_category = $data['group_category'] ?? null;
    
    if (!$charity_id || !$category || !$reason || !$support_amount) {
        echo json_encode(['ok' => false, 'error' => 'Missing required fields']);
        exit;
    }
    
    $fund_type = $data['fund_type'] ?? 'educational';

    $sql = "INSERT INTO fund_requests (charity_id, fund_type, category, individual_name, nid_number, organization_name, group_category, reason, support_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("isssssssd", $charity_id, $fund_type, $category, $individual_name, $nid_number, $organization_name, $group_category, $reason, $support_amount);
    
    if ($stmt->execute()) {
        echo json_encode(['ok' => true]);
    } else {
        echo json_encode(['ok' => false, 'error' => $stmt->error]);
    }
    exit;
}
?>
