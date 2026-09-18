<?php
// POST /api/campaign_join.php - Join a campaign
// GET /api/campaign_join.php?campaign_id=123 - Get participants for a campaign

session_start();
header('Content-Type: application/json');
require 'db.php';

if (!isset($_SESSION['user'])) {
    echo json_encode(['ok' => false, 'msg' => 'Unauthorized']);
    exit;
}

$user = $_SESSION['user'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Join a campaign
    $data = json_decode(file_get_contents('php://input'), true);
    $campaignId = isset($data['campaign_id']) ? (int)$data['campaign_id'] : 0;

    if (!$campaignId) {
        echo json_encode(['ok' => false, 'msg' => 'Campaign ID required.']);
        exit;
    }

    // Check if already joined
    $check = $conn->prepare("SELECT id FROM campaign_participants WHERE campaign_id = ? AND user_id = ?");
    $check->bind_param('ii', $campaignId, $user['id']);
    $check->execute();
    $check->store_result();
    if ($check->num_rows > 0) {
        $check->close();
        echo json_encode(['ok' => false, 'msg' => 'You have already joined this campaign.']);
        exit;
    }
    $check->close();

    $stmt = $conn->prepare("INSERT INTO campaign_participants (campaign_id, user_id) VALUES (?, ?)");
    $stmt->bind_param('ii', $campaignId, $user['id']);
    $stmt->execute();
    
    if ($stmt->insert_id) {
        echo json_encode(['ok' => true, 'msg' => 'Successfully joined campaign.']);
    } else {
        echo json_encode(['ok' => false, 'msg' => 'Failed to join campaign.']);
    }
    $stmt->close();
} 
else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get participants for a specific campaign (only the doctor who created it can see details)
    $campaignId = isset($_GET['campaign_id']) ? (int)$_GET['campaign_id'] : 0;
    
    if (!$campaignId) {
        echo json_encode(['ok' => false, 'msg' => 'Campaign ID required.']);
        exit;
    }

    // Check if the current user is the doctor who owns the campaign
    $check = $conn->prepare("SELECT doctor_id FROM doctor_campaigns WHERE id = ?");
    $check->bind_param('i', $campaignId);
    $check->execute();
    $result = $check->get_result();
    $campaign = $result->fetch_assoc();
    $check->close();

    if (!$campaign || $campaign['doctor_id'] != $user['id']) {
        echo json_encode(['ok' => false, 'msg' => 'Unauthorized or campaign not found.']);
        exit;
    }

    $stmt = $conn->prepare("
        SELECT u.id, u.full_name, u.phone, u.email, u.account_type, cp.joined_at 
        FROM campaign_participants cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.campaign_id = ?
        ORDER BY cp.joined_at DESC
    ");
    $stmt->bind_param('i', $campaignId);
    $stmt->execute();
    $res = $stmt->get_result();
    $participants = [];
    while ($row = $res->fetch_assoc()) {
        $participants[] = $row;
    }
    $stmt->close();

    echo json_encode(['ok' => true, 'participants' => $participants]);
} else {
    echo json_encode(['ok' => false, 'msg' => 'Method not allowed.']);
}
