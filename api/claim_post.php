<?php
// ── Claim a Food Post ─────────────────────────────────────
// POST /api/claim_post.php
// Body (JSON): postId

session_start();
header('Content-Type: application/json');
require 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok' => false, 'msg' => 'POST required.']);
    exit;
}

if (!isset($_SESSION['user'])) {
    echo json_encode(['ok' => false, 'msg' => 'Not logged in.']);
    exit;
}
if ($_SESSION['user']['accountType'] !== 'charity') {
    echo json_encode(['ok' => false, 'msg' => 'Only charity organizations can claim food posts.']);
    exit;
}

$data   = json_decode(file_get_contents('php://input'), true);
$postId = (int)($data['postId'] ?? 0);
$userId = (int)$_SESSION['user']['id'];

if (!$postId) {
    echo json_encode(['ok' => false, 'msg' => 'Post ID required.']);
    exit;
}

// Check post exists and is not already claimed
$stmt = $conn->prepare("SELECT id, claimed_by FROM food_posts WHERE id = ?");
$stmt->bind_param('i', $postId);
$stmt->execute();
$result = $stmt->get_result();
$post   = $result->fetch_assoc();
$stmt->close();

if (!$post) {
    echo json_encode(['ok' => false, 'msg' => 'Post not found.']);
    exit;
}
if ($post['claimed_by'] !== null) {
    echo json_encode(['ok' => false, 'msg' => 'This post has already been claimed.']);
    exit;
}

// Claim it
$now  = date('Y-m-d H:i:s');
$stmt = $conn->prepare("UPDATE food_posts SET claimed_by = ?, claimed_at = ? WHERE id = ?");
$stmt->bind_param('isi', $userId, $now, $postId);
$stmt->execute();
$stmt->close();

echo json_encode(['ok' => true, 'msg' => 'Post claimed successfully!']);
