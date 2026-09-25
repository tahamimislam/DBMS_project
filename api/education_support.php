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
    $street = $data['street'] ?? null;
    $area = $data['area'] ?? null;
    $city = $data['city'] ?? null;
    $case_name = $data['case_name'] ?? null;
    
    if (!$charity_id || !$category || !$reason || !$support_amount) {
        echo json_encode(['ok' => false, 'error' => 'Missing required fields']);
        exit;
    }
    
    $fund_type = $data['fund_type'] ?? 'educational';

    $document_url = null;
    if (isset($_FILES['document']) && $_FILES['document']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = '../uploads/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
        
        $ext = pathinfo($_FILES['document']['name'], PATHINFO_EXTENSION);
        $filename = 'doc_' . time() . '_' . rand(100, 999) . '.' . $ext;
        if (move_uploaded_file($_FILES['document']['tmp_name'], $uploadDir . $filename)) {
            $document_url = 'uploads/' . $filename;
        }
    }

    $extra_info = [];
    if ($category === 'individual') {
        if ($individual_name) $extra_info[] = "Individual: $individual_name";
        if ($nid_number) $extra_info[] = "NID: $nid_number";
    } else {
        if ($organization_name) $extra_info[] = "Organization: $organization_name";
    }
    if ($case_name) $extra_info[] = "Case Name: $case_name";
    
    $final_reason = $reason;
    if (!empty($extra_info)) {
        $final_reason = implode("\n", $extra_info) . "\n\nDetails:\n" . $reason;
    }
    
    // Ensure group_category is at least set to category if empty
    if (!$group_category && $category) {
        $group_category = $category;
    }

    $sql = "INSERT INTO fund_requests (charity_id, fund_type, group_category, reason, amount, location_street, location_area, location_city, document_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        echo json_encode(['ok' => false, 'error' => $conn->error]);
        exit;
    }
    
    $stmt->bind_param("isssdssss", $charity_id, $fund_type, $group_category, $final_reason, $support_amount, $street, $area, $city, $document_url);
    
    if ($stmt->execute()) {
        echo json_encode(['ok' => true]);
    } else {
        echo json_encode(['ok' => false, 'error' => $stmt->error]);
    }
    exit;
}
?>
