<?php
// ── User Profile ──────────────────────────────────────────
// GET /api/profile.php?id=X
// Returns user info — only accessible to users involved in a claimed post together

session_start();
header('Content-Type: application/json');
require 'db.php';

if (!isset($_SESSION['user'])) {
    echo json_encode(['ok' => false, 'msg' => 'Not logged in.']);
    exit;
}

$currentUserId = (int)$_SESSION['user']['id'];

// Handle profile update via POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    $fullName = trim($data['fullName'] ?? '');
    $phone    = trim($data['phone'] ?? '');
    $street   = trim($data['street'] ?? '');
    $area     = trim($data['area'] ?? '');
    $city     = trim($data['city'] ?? '');
    $regNumber= trim($data['regNumber'] ?? '');

    if (!$fullName) {
        echo json_encode(['ok' => false, 'msg' => 'Name cannot be empty.']);
        exit;
    }

    if (!$regNumber) {
        echo json_encode(['ok' => false, 'msg' => 'Registration / NID number cannot be empty.']);
        exit;
    }

    // Check uniqueness of reg_number (excluding current user)
    $checkReg = $conn->prepare("SELECT id FROM users WHERE reg_number = ? AND id != ?");
    $checkReg->bind_param('si', $regNumber, $currentUserId);
    $checkReg->execute();
    $checkReg->store_result();
    if ($checkReg->num_rows > 0) {
        $checkReg->close();
        echo json_encode(['ok' => false, 'msg' => 'This Registration / NID number is already used by another account.']);
        exit;
    }
    $checkReg->close();

    // Phone validation
    $phonePattern = '/^(?:\+?880|880|0)?[- ]?1[3-9]\d{2}[- ]?\d{6}$/';
    if ($phone && !preg_match($phonePattern, $phone)) {
        echo json_encode(['ok' => false, 'msg' => 'Please enter a valid Bangladeshi phone number.']);
        exit;
    }

    $stmt = $conn->prepare("UPDATE users SET full_name = ?, phone = ?, street = ?, area = ?, city = ?, reg_number = ? WHERE id = ?");
    $stmt->bind_param('ssssssi', $fullName, $phone, $street, $area, $city, $regNumber, $currentUserId);
    $stmt->execute();
    $stmt->close();

    // Update session
    $_SESSION['user']['fullName']   = $fullName;
    $_SESSION['user']['phone']      = $phone;
    $_SESSION['user']['street']     = $street;
    $_SESSION['user']['area']       = $area;
    $_SESSION['user']['city']       = $city;
    $_SESSION['user']['regNumber']  = $regNumber;
    $_SESSION['user']['full_name']  = $fullName;
    $_SESSION['user']['reg_number'] = $regNumber;

    $accountType = $_SESSION['user']['accountType'] ?? $_SESSION['user']['account_type'] ?? '';

    echo json_encode([
        'ok' => true,
        'msg' => 'Profile updated successfully!',
        'user' => [
            'id'          => $currentUserId,
            'accountType' => $accountType,
            'fullName'    => $fullName,
            'regNumber'   => $regNumber,
            'email'       => $_SESSION['user']['email'],
            'phone'       => $phone,
            'street'      => $street,
            'area'        => $area,
            'city'        => $city
        ]
    ]);
    exit;
}

$targetId = (int)($_GET['id'] ?? 0);

if (!$targetId) {
    echo json_encode(['ok' => false, 'msg' => 'User ID required.']);
    exit;
}

// Access check: current user must be the poster or claimer in a post with the target user
// OR the user is viewing their own profile
if ($targetId !== $currentUserId) {
    $stmt = $conn->prepare("
        SELECT id FROM food_posts
        WHERE (posted_by = ? AND claimed_by = ?)
           OR (posted_by = ? AND claimed_by = ?)
        LIMIT 1
    ");
    $stmt->bind_param('iiii', $targetId, $currentUserId, $currentUserId, $targetId);
    $stmt->execute();
    $stmt->store_result();
    $hasAccess = $stmt->num_rows > 0;
    $stmt->close();

    if (!$hasAccess) {
        echo json_encode(['ok' => false, 'msg' => 'Access denied. Claim a post to view this profile.']);
        exit;
    }
}

// Fetch user info (no password returned)
$stmt = $conn->prepare(
    "SELECT id, account_type, full_name, reg_number, email, phone, street, area, city, working_sectors
     FROM users WHERE id = ?"
);
$stmt->bind_param('i', $targetId);
$stmt->execute();
$result = $stmt->get_result();
$row    = $result->fetch_assoc();
$stmt->close();

if (!$row) {
    echo json_encode(['ok' => false, 'msg' => 'User not found.']);
    exit;
}

echo json_encode(['ok' => true, 'user' => [
    'id'          => (int)$row['id'],
    'accountType' => $row['account_type'],
    'fullName'    => $row['full_name'],
    'regNumber'   => $row['reg_number'],
    'email'       => $row['email'],
    'phone'       => $row['phone'],
    'street'      => $row['street'],
    'area'        => $row['area'],
    'city'        => $row['city'],
    'sectors'     => $row['working_sectors']
]]);
