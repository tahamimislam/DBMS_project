<?php
// ── Register a New User ───────────────────────────────────
// POST /api/register.php
// Body (JSON): accountType, fullName, regNumber, email, phone, address, password

session_start();
header('Content-Type: application/json');
require 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok' => false, 'msg' => 'POST required.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$accountType = trim($data['accountType'] ?? '');
$fullName    = trim($data['fullName']    ?? '');
$regNumber   = trim($data['regNumber']   ?? '');
$email       = strtolower(trim($data['email'] ?? ''));
$phone       = trim($data['phone']       ?? '');
$address     = trim($data['address']     ?? '');
$password    = $data['password']         ?? '';

// Basic validation
if (!$accountType || !$fullName || !$regNumber || !$email || !$phone || !$password) {
    echo json_encode(['ok' => false, 'msg' => 'Required fields missing. Registration / NID number is required.']);
    exit;
}

// Email Regex & Filter validation
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $email)) {
    echo json_encode(['ok' => false, 'msg' => 'Please provide a valid email address.']);
    exit;
}

// Phone Regex validation (Bangladeshi phone numbers)
if (!preg_match('/^(?:\+?880|880|0)?[- ]?1[3-9]\d{2}[- ]?\d{6}$/', $phone)) {
    echo json_encode(['ok' => false, 'msg' => 'Please provide a valid Bangladeshi phone number.']);
    exit;
}

// Password Regex validation (min 8 chars, uppercase, lowercase, number, special char)
if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+={}[\]:;"\'<>,.\/~`|\\\\]).{8,}$/', $password)) {
    echo json_encode(['ok' => false, 'msg' => 'Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character.']);
    exit;
}

// Check duplicate email
$check = $conn->prepare("SELECT id FROM users WHERE email = ?");
$check->bind_param('s', $email);
$check->execute();
$check->store_result();
if ($check->num_rows > 0) {
    $check->close();
    echo json_encode(['ok' => false, 'msg' => 'Email already registered.']);
    exit;
}
$check->close();

// Check duplicate registration / NID number
$checkReg = $conn->prepare("SELECT id FROM users WHERE reg_number = ?");
$checkReg->bind_param('s', $regNumber);
$checkReg->execute();
$checkReg->store_result();
if ($checkReg->num_rows > 0) {
    $checkReg->close();
    echo json_encode(['ok' => false, 'msg' => 'This Registration / NID number is already registered.']);
    exit;
}
$checkReg->close();

// Insert
$hashed = password_hash($password, PASSWORD_DEFAULT);
$stmt = $conn->prepare(
    "INSERT INTO users (account_type, full_name, reg_number, email, phone, address, password)
     VALUES (?, ?, ?, ?, ?, ?, ?)"
);
$stmt->bind_param('sssssss', $accountType, $fullName, $regNumber, $email, $phone, $address, $hashed);
$stmt->execute();
$userId = $conn->insert_id;
$stmt->close();

$user = [
    'id'          => $userId,
    'accountType' => $accountType,
    'fullName'    => $fullName,
    'regNumber'   => $regNumber,
    'email'       => $email,
    'phone'       => $phone,
    'address'     => $address
];

$_SESSION['user'] = $user;
echo json_encode(['ok' => true, 'user' => $user]);
