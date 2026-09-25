1<?php
session_start();
header("Content-Type: application/json");
require "db.php";

$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true) ?? [];

if ($_SERVER["REQUEST_METHOD"] === "POST" && !empty($jsonInput)) {
    $_POST = array_merge($_POST, $jsonInput);
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');
$userId = $_SESSION['user']['id'] ?? null;

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    if ($action === "public_posts") {
        $sql = "
            SELECT p.id, p.title, p.content, p.image_url, p.created_at,
                   c.title AS campaign_title, c.id AS campaign_id,
                   u.full_name AS charity_name, u.profile_picture AS charity_avatar
            FROM donation_posts p
            JOIN financial_campaigns c ON p.campaign_id = c.id
            JOIN users u ON p.charity_id = u.id
            WHERE p.status = 'active'
            ORDER BY p.created_at DESC
        ";
        $result = $conn->query($sql);
        echo json_encode(['ok'=>true, 'posts'=>$result->fetch_all(MYSQLI_ASSOC)]);
        exit;
    }

    if ($action === "my_posts") {
        if (!$userId) { echo json_encode(['ok'=>false,'msg'=>'Not logged in']); exit; }
        $sql = "
            SELECT p.id, p.title, p.content, p.image_url, p.created_at,
                   c.title AS campaign_title
            FROM donation_posts p
            JOIN financial_campaigns c ON p.campaign_id = c.id
            WHERE p.charity_id = ? AND p.status = 'active'
            ORDER BY p.created_at DESC
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $posts = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['ok'=>true, 'posts'=>$posts]);
        exit;
    }

    echo json_encode(['ok'=>false,'msg'=>'Unknown GET action']);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    if (!$userId) { echo json_encode(['ok'=>false,'msg'=>'Not logged in']); exit; }

    if ($action === "create_post") {
        $title = trim($_POST['title'] ?? '');
        $campaignId = (int)($_POST['campaign_id'] ?? 0);
        $content = trim($_POST['content'] ?? '');

        if (!$title || !$campaignId || !$content) {
            echo json_encode(['ok'=>false,'msg'=>'All fields are required.']);
            exit;
        }

        // Verify charity owns this campaign
        $verify = $conn->prepare("SELECT id FROM financial_campaigns WHERE id = ? AND charity_id = ?");
        $verify->bind_param("ii", $campaignId, $userId);
        $verify->execute();
        if ($verify->get_result()->num_rows === 0) {
            echo json_encode(['ok'=>false,'msg'=>'Invalid campaign.']);
            exit;
        }

        $imageUrl = null;
        if (!empty($_FILES['image']['tmp_name'])) {
            $uploadDir = "../uploads/posts/";
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
            $ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg','jpeg','png','gif','webp'])) {
                echo json_encode(['ok'=>false,'msg'=>'Invalid image format.']);
                exit;
            }
            $filename = "dp_" . $userId . "_" . time() . "." . $ext;
            move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $filename);
            $imageUrl = "uploads/posts/" . $filename;
        }

        $stmt = $conn->prepare("INSERT INTO donation_posts (charity_id, campaign_id, title, content, image_url) VALUES (?,?,?,?,?)");
        $stmt->bind_param("iisss", $userId, $campaignId, $title, $content, $imageUrl);
        
        if ($stmt->execute()) {
            echo json_encode(['ok'=>true,'msg'=>'Post created!']);
        } else {
            echo json_encode(['ok'=>false,'msg'=>'Database error.']);
        }
        exit;
    }
}
?>
