<?php
// ── Messages ──────────────────────────────────────────────
// GET  /api/messages.php?post_id=X  → get messages for a post
// POST /api/messages.php            → send a message
// Body (JSON): receiverId, postId, message

session_start();
header('Content-Type: application/json');
require 'db.php';

if (!isset($_SESSION['user'])) {
    echo json_encode(['ok' => false, 'msg' => 'Not logged in.']);
    exit;
}

$currentUserId = (int)$_SESSION['user']['id'];

// ─── GET: Fetch messages for a post ──────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $postId = (int)($_GET['post_id'] ?? 0);
    if (!$postId) {
        echo json_encode(['ok' => false, 'msg' => 'post_id required.']);
        exit;
    }

    $stmt = $conn->prepare("
        SELECT m.id, m.sender_id, m.receiver_id, m.message, m.sent_at,
               u.full_name AS sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.post_id = ?
          AND (m.sender_id = ? OR m.receiver_id = ?)
        ORDER BY m.sent_at ASC
    ");
    $stmt->bind_param('iii', $postId, $currentUserId, $currentUserId);
    $stmt->execute();
    $result = $stmt->get_result();

    $msgs = [];
    while ($row = $result->fetch_assoc()) {
        $msgs[] = [
            'id'       => (int)$row['id'],
            'from'     => (int)$row['sender_id'],
            'fromName' => $row['sender_name'],
            'to'       => (int)$row['receiver_id'],
            'text'     => $row['message'],
            'time'     => date('h:i A', strtotime($row['sent_at']))
        ];
    }
    $stmt->close();

    echo json_encode(['ok' => true, 'messages' => $msgs]);
    exit;
}

// ─── POST: Send a message ─────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data       = json_decode(file_get_contents('php://input'), true);
    $receiverId = (int)($data['receiverId'] ?? 0);
    $postId     = (int)($data['postId']     ?? 0);
    $message    = trim($data['message']     ?? '');

    if (!$receiverId || !$postId || !$message) {
        echo json_encode(['ok' => false, 'msg' => 'receiverId, postId, and message are required.']);
        exit;
    }

    $stmt = $conn->prepare(
        "INSERT INTO messages (sender_id, receiver_id, post_id, message) VALUES (?, ?, ?, ?)"
    );
    $stmt->bind_param('iiis', $currentUserId, $receiverId, $postId, $message);
    $stmt->execute();
    $stmt->close();

    echo json_encode(['ok' => true]);
    exit;
}

echo json_encode(['ok' => false, 'msg' => 'Method not allowed.']);
