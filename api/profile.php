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
    if (isset($_SERVER["CONTENT_TYPE"]) && strpos($_SERVER["CONTENT_TYPE"], "application/json") !== false) {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
    } else {
        $data = $_POST;
    }
    $fullName = trim($data['fullName'] ?? '');
    $phone    = trim($data['phone'] ?? '');
    $street   = trim($data['street'] ?? '');
    $area     = trim($data['area'] ?? '');
    $city     = trim($data['city'] ?? '');
    $regNumber= trim($data['regNumber'] ?? '');
    $qualification = trim($data['qualification'] ?? '');
    $specialization = trim($data['specialization'] ?? '');

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

    $stmt = $conn->prepare("UPDATE users SET full_name = ?, phone = ?, street = ?, area = ?, city = ?, reg_number = ?, specialization = ? WHERE id = ?");
    $stmt->bind_param('sssssssi', $fullName, $phone, $street, $area, $city, $regNumber, $specialization, $currentUserId);
    $stmt->execute();
    $stmt->close();

    $accountType = $_SESSION['user']['accountType'] ?? $_SESSION['user']['account_type'] ?? '';
    if ($accountType === 'doctor') {
        $conn->query("DELETE FROM doctor_qualifications WHERE user_id = $currentUserId");
        if (!empty($qualification)) {
            $quals = explode(',', $qualification);
            $stmtQ = $conn->prepare("INSERT IGNORE INTO doctor_qualifications (user_id, qualification) VALUES (?, ?)");
            foreach ($quals as $q) {
                $q = trim($q);
                if ($q) {
                    $stmtQ->bind_param('is', $currentUserId, $q);
                    $stmtQ->execute();
                }
            }
            $stmtQ->close();
        }
    }

    $profilePicUrl = $_SESSION['user']['profilePicture'] ?? $_SESSION['user']['profile_picture'] ?? null;
    
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
            $fileName = 'avatar_' . $currentUserId . '_' . time() . '.' . strtolower($ext);
            $targetFile = $uploadDir . $fileName;
            if (move_uploaded_file($_FILES['profilePicture']['tmp_name'], $targetFile)) {
                $profilePicUrl = 'uploads/' . $fileName;
                $stmt = $conn->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
                $stmt->bind_param('si', $profilePicUrl, $currentUserId);
                $stmt->execute();
                $stmt->close();
            }
        }
    }

    // Update session
    $_SESSION['user']['fullName']   = $fullName;
    $_SESSION['user']['phone']      = $phone;
    $_SESSION['user']['street']     = $street;
    $_SESSION['user']['area']       = $area;
    $_SESSION['user']['city']       = $city;
    $_SESSION['user']['regNumber']  = $regNumber;
    $_SESSION['user']['full_name']  = $fullName;
    $_SESSION['user']['reg_number'] = $regNumber;
    $_SESSION['user']['qualification'] = $qualification;
    $_SESSION['user']['specialization'] = $specialization;
    $_SESSION['user']['profile_picture'] = $profilePicUrl;
    $_SESSION['user']['profilePicture'] = $profilePicUrl;

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
            'city'        => $city,
            'qualification' => $qualification,
            'specialization' => $specialization,
            'profilePicture' => $profilePicUrl
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
    "SELECT u.id, u.account_type, u.full_name, u.reg_number, u.email, u.phone, u.street, u.area, u.city, u.working_sectors, u.specialization, u.profile_picture,
            GROUP_CONCAT(dq.qualification) AS qualification
     FROM users u
     LEFT JOIN doctor_qualifications dq ON u.id = dq.user_id
     WHERE u.id = ?
     GROUP BY u.id"
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
    'sectors'     => $row['working_sectors'],
    'qualification' => $row['qualification'],
    'specialization' => $row['specialization'],
    'profilePicture' => $row['profile_picture']
]]);
