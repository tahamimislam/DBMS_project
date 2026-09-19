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

    if (isset($_SERVER["CONTENT_TYPE"]) && strpos($_SERVER["CONTENT_TYPE"], "application/json") !== false) {
        $data = json_decode(file_get_contents('php://input'), true);
    } else {
        $data = $_POST;
    }

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

    $imageUrl = null;
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $_FILES['image']['tmp_name']);
        finfo_close($finfo);

        if (in_array($mimeType, $allowedTypes)) {
            $uploadDir = '../uploads/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
            $fileName = 'camp_' . time() . '_' . uniqid() . '.' . strtolower($ext);
            $targetFile = $uploadDir . $fileName;
            if (move_uploaded_file($_FILES['image']['tmp_name'], $targetFile)) {
                $imageUrl = 'uploads/' . $fileName;
            }
        }
    }

    $stmt = $conn->prepare("INSERT INTO doctor_campaigns (doctor_id, subject, description, image_url, location, start_time, end_time, campaign_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param('isssssss', $user['id'], $subject, $description, $imageUrl, $location, $startTime, $endTime, $date);
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
            SELECT dc.*, u.full_name as doctor_name, u.qualification, u.specialization, u.profile_picture as doctor_profile_picture,
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
} else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    if ($user['accountType'] !== 'doctor') {
        echo json_encode(['ok' => false, 'msg' => 'Only doctors can delete campaigns.']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $campaignId = intval($data['id'] ?? 0);

    if (!$campaignId) {
        echo json_encode(['ok' => false, 'msg' => 'Campaign ID required.']);
        exit;
    }

    // Make sure doctor owns this campaign, also get image_url to delete the file
    $stmt = $conn->prepare("SELECT image_url FROM doctor_campaigns WHERE id = ? AND doctor_id = ?");
    $stmt->bind_param('ii', $campaignId, $user['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $campaign = $result->fetch_assoc();
    $stmt->close();

    if (!$campaign) {
        echo json_encode(['ok' => false, 'msg' => 'Campaign not found or access denied.']);
        exit;
    }

    // Delete the campaign (participants cascade via FK)
    $stmt = $conn->prepare("DELETE FROM doctor_campaigns WHERE id = ? AND doctor_id = ?");
    $stmt->bind_param('ii', $campaignId, $user['id']);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();

    if ($affected > 0) {
        // Delete the image file if exists
        if ($campaign['image_url']) {
            $filePath = '../' . $campaign['image_url'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }
        echo json_encode(['ok' => true, 'msg' => 'Campaign deleted successfully.']);
    } else {
        echo json_encode(['ok' => false, 'msg' => 'Failed to delete campaign.']);
    }
} else {
    echo json_encode(['ok' => false, 'msg' => 'Method not allowed.']);
}
