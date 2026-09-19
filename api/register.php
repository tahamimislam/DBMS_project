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

    if (isset($_SERVER["CONTENT_TYPE"]) && strpos($_SERVER["CONTENT_TYPE"], "application/json") !== false) {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
    } else {
        $data = $_POST;
    }

$accountType = trim($data['accountType'] ?? '');
$fullName    = trim($data['fullName']    ?? '');
$regNumber   = trim($data['regNumber']   ?? '');
$email       = strtolower(trim($data['email'] ?? ''));
$phone       = trim($data['phone']       ?? '');
$street      = trim($data['street']      ?? '');
$area        = trim($data['area']        ?? '');
$city        = trim($data['city']        ?? '');
$password    = $data['password']         ?? '';
$sectorsArr  = isset($data['sectors']) && is_string($data['sectors']) ? explode(',', $data['sectors']) : ($data['sectors'] ?? []);
$workingSectors = !empty($sectorsArr) ? implode(',', $sectorsArr) : null;
$qualification = trim($data['qualification'] ?? '');
$specialization = trim($data['specialization'] ?? '');

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
$profilePicUrl = null;
if (isset($_FILES['profilePicture']) && $_FILES['profilePicture']['error'] === UPLOAD_ERR_OK) {
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $_FILES['profilePicture']['tmp_name']);
    finfo_close($finfo);

    if (in_array($mimeType, $allowedTypes)) {
        $uploadDir = '../uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        $ext = pathinfo($_FILES['profilePicture']['name'], PATHINFO_EXTENSION);
        $fileName = 'profile_reg_' . time() . '_' . rand(1000, 9999) . '.' . strtolower($ext);
        $targetFile = $uploadDir . $fileName;
        if (move_uploaded_file($_FILES['profilePicture']['tmp_name'], $targetFile)) {
            $profilePicUrl = 'uploads/' . $fileName;
        }
    }
}

$hashed = password_hash($password, PASSWORD_DEFAULT);
$stmt = $conn->prepare(
     "INSERT INTO users (account_type, full_name, reg_number, email, phone, street, area, city, password, working_sectors, qualification, specialization, profile_picture)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
$stmt->bind_param('sssssssssssss', $accountType, $fullName, $regNumber, $email, $phone, $street, $area, $city, $hashed, $workingSectors, $qualification, $specialization, $profilePicUrl);
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
    'street'      => $street,
    'area'        => $area,
    'city'        => $city,
    'sectors'     => $workingSectors,
    'qualification' => $qualification,
    'specialization' => $specialization,
    'profilePicture' => $profilePicUrl
];

$_SESSION['user'] = $user;
echo json_encode(['ok' => true, 'user' => $user]);
