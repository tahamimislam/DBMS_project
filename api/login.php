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
    "SELECT u.id, u.account_type, u.full_name, u.reg_number, u.email, u.phone, u.street, u.area, u.city, u.password, u.working_sectors, u.specialization, u.profile_picture,
            GROUP_CONCAT(dq.qualification) AS qualification
     FROM users u
     LEFT JOIN doctor_qualifications dq ON u.id = dq.user_id
     WHERE u.email = ?
     GROUP BY u.id"
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
    'street'      => $row['street'],
    'area'        => $row['area'],
    'city'        => $row['city'],
    'sectors'     => $row['working_sectors'],
    'qualification' => $row['qualification'],
    'specialization' => $row['specialization'],
    'profilePicture' => $row['profile_picture']
];

$_SESSION['user'] = $user;
echo json_encode(['ok' => true, 'user' => $user]);
