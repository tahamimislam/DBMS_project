<?php
// POST /api/doctor_campaigns.php - Create campaign
// GET /api/doctor_campaigns.php - Get campaigns

session_start();
header('Content-Type: application/json');
require 'db.php';

if (!isset($_SESSION['user'])) {
    echo json_encode(['ok' => false, 'msg' => 'Unauthorized']);
    exit;
}

$user = $_SESSION['user'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($user['accountType'] !== 'doctor') {
        echo json_encode(['ok' => false, 'msg' => 'Only doctors can create campaigns.']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $subject     = trim($data['subject'] ?? '');
    $description = trim($data['description'] ?? '');
    $location    = trim($data['location'] ?? '');
    $startTime   = trim($data['start_time'] ?? '');
    $endTime     = trim($data['end_time'] ?? '');
    $date        = trim($data['campaign_date'] ?? '');

    if (!$subject || !$description || !$location || !$startTime || !$endTime || !$date) {
        echo json_encode(['ok' => false, 'msg' => 'All fields are required.']);
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO doctor_campaigns (doctor_id, subject, description, location, start_time, end_time, campaign_date) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param('issssss', $user['id'], $subject, $description, $location, $startTime, $endTime, $date);
    $stmt->execute();
    
    if ($stmt->insert_id) {
        echo json_encode(['ok' => true, 'msg' => 'Campaign created successfully.']);
    } else {
        echo json_encode(['ok' => false, 'msg' => 'Failed to create campaign.']);
    }
    $stmt->close();
} 
else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // If the request is from a doctor, fetch only their campaigns with participant counts.
    // If from a user/charity, fetch all active campaigns.
    
    if ($user['accountType'] === 'doctor') {
        $stmt = $conn->prepare("
            SELECT dc.*, 
            (SELECT COUNT(*) FROM campaign_participants cp WHERE cp.campaign_id = dc.id) as participant_count
            FROM doctor_campaigns dc
            WHERE dc.doctor_id = ?
            ORDER BY dc.created_at DESC
        ");
        $stmt->bind_param('i', $user['id']);
    } else {
        $stmt = $conn->prepare("
            SELECT dc.*, u.full_name as doctor_name, u.qualification, u.specialization,
            (SELECT COUNT(*) FROM campaign_participants cp WHERE cp.campaign_id = dc.id) as participant_count,
            (SELECT COUNT(*) FROM campaign_participants cp WHERE cp.campaign_id = dc.id AND cp.user_id = ?) as joined
            FROM doctor_campaigns dc
            JOIN users u ON dc.doctor_id = u.id
            ORDER BY dc.campaign_date ASC
        ");
        $stmt->bind_param('i', $user['id']);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $campaigns = [];
    while ($row = $result->fetch_assoc()) {
        $campaigns[] = $row;
    }
    $stmt->close();
    
    echo json_encode(['ok' => true, 'campaigns' => $campaigns]);
} else {
    echo json_encode(['ok' => false, 'msg' => 'Method not allowed.']);
}
