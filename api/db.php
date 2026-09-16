<?php
// ── Database Connection ───────────────────────────────────
// Default XAMPP settings: host=localhost, user=root, pass=""
// Change $pass if you set a MySQL password in XAMPP.

$host   = 'localhost';
$dbname = 'humanitylink';
$user   = 'root';
$pass   = '';          // Leave empty for default XAMPP

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'msg' => 'DB connection failed: ' . $conn->connect_error]);
    exit;
}

$conn->set_charset('utf8mb4');
