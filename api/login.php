<?php
// ── Login ─────────────────────────────────────────────────
// POST /api/login.php
// Body (JSON): email, password

session_start();
header('Content-Type: application/json');
require 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok' => false, 'msg' => 'POST required.']);
    exit;
}

$data     = json_decode(file_get_contents('php://input'), true);
$email    = strtolower(trim($data['email']    ?? ''));
$password = $data['password'] ?? '';

if (!$email || !$password) {
    echo json_encode(['ok' => false, 'msg' => 'Email and password required.']);
    exit;
}

$stmt = $conn->prepare(
    "SELECT id, account_type, full_name, reg_number, email, phone, address, password, working_sectors
     FROM users WHERE email = ?"
);
$stmt->bind_param('s', $email);
$stmt->execute();
$result = $stmt->get_result();
$row    = $result->fetch_assoc();
$stmt->close();

if (!$row || !password_verify($password, $row['password'])) {
    echo json_encode(['ok' => false, 'msg' => 'Invalid email or password.']);
    exit;
}

$user = [
    'id'          => (int)$row['id'],
    'accountType' => $row['account_type'],
    'fullName'    => $row['full_name'],
    'regNumber'   => $row['reg_number'],
    'email'       => $row['email'],
    'phone'       => $row['phone'],
    'address'     => $row['address'],
    'sectors'     => $row['working_sectors']
];

$_SESSION['user'] = $user;
echo json_encode(['ok' => true, 'user' => $user]);
