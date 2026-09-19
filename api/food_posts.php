<?php
// ── Food Posts ────────────────────────────────────────────
// GET  /api/food_posts.php          → returns all posts
// POST /api/food_posts.php          → create new post (restaurant only)

session_start();
header('Content-Type: application/json');
require 'db.php';

// ─── GET: Return all food posts ───────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $sql = "
        SELECT
            fp.id,
            fp.posted_by,
            u1.full_name    AS posted_by_name,
            u1.account_type AS posted_by_type,
            u1.phone        AS posted_by_phone,
            u1.email        AS posted_by_email,
            CONCAT_WS(', ', u1.street, u1.area, u1.city) AS posted_by_address,
            fp.food_type,
            fp.food_name,
            fp.quantity,
            fp.pickup_date,
            fp.pickup_from,
            fp.pickup_to,
            fp.notes,
            fp.food_image,
            fp.claimed_by,
            u2.full_name    AS claimed_by_name,
            fp.claimed_at,
            fp.created_at
        FROM food_posts fp
        LEFT JOIN users u1 ON fp.posted_by  = u1.id
        LEFT JOIN users u2 ON fp.claimed_by = u2.id
        ORDER BY fp.created_at DESC
    ";

    $result = $conn->query($sql);
    $posts  = [];

    while ($row = $result->fetch_assoc()) {
        $posts[] = [
            'id'            => (int)$row['id'],
            'postedBy'      => (int)$row['posted_by'],
            'postedByName'  => $row['posted_by_name'],
            'postedByType'  => $row['posted_by_type'],
            'phone'         => $row['posted_by_phone'],
            'email'         => $row['posted_by_email'],
            'address'       => $row['posted_by_address'],
            'foodType'      => $row['food_type'],
            'foodName'      => $row['food_name'],
            'quantity'      => $row['quantity'],
            'pickupDate'    => $row['pickup_date'],
            'pickupFrom'    => substr($row['pickup_from'], 0, 5),   // HH:MM
            'pickupTo'      => substr($row['pickup_to'],   0, 5),
            'notes'         => $row['notes'],
            'foodImage'     => $row['food_image'],
            'claimedBy'     => $row['claimed_by'] ? (int)$row['claimed_by'] : null,
            'claimedByName' => $row['claimed_by_name'],
            'claimedAt'     => $row['claimed_at'],
            'createdAt'     => $row['created_at']
        ];
    }

    echo json_encode(['ok' => true, 'posts' => $posts]);
    exit;
}

// ─── POST: Create new food post ───────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['user'])) {
        echo json_encode(['ok' => false, 'msg' => 'Not logged in.']);
        exit;
    }
    if ($_SESSION['user']['accountType'] !== 'restaurant') {
        echo json_encode(['ok' => false, 'msg' => 'Only restaurants can post food donations.']);
        exit;
    }

    if (isset($_SERVER["CONTENT_TYPE"]) && strpos($_SERVER["CONTENT_TYPE"], "application/json") !== false) {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
    } else {
        $data = $_POST;
    }

    $postedBy   = (int)$_SESSION['user']['id'];
    $foodType   = trim($data['foodType']   ?? '');
    $foodName   = trim($data['foodName']   ?? '');
    $quantity   = trim($data['quantity']   ?? '');
    $pickupDate = trim($data['pickupDate'] ?? '');
    $pickupFrom = trim($data['pickupFrom'] ?? '');
    $pickupTo   = trim($data['pickupTo']   ?? '');
    $notes      = trim($data['notes']      ?? '');

    if (!$foodType || !$foodName || !$quantity || !$pickupDate || !$pickupFrom || !$pickupTo) {
        echo json_encode(['ok' => false, 'msg' => 'All required fields must be filled.']);
        exit;
    }

    $foodImageUrl = null;
    if (isset($_FILES['foodImage']) && $_FILES['foodImage']['error'] === UPLOAD_ERR_OK) {
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $_FILES['foodImage']['tmp_name']);
        finfo_close($finfo);

        if (in_array($mimeType, $allowedTypes)) {
            $uploadDir = '../uploads/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $ext = pathinfo($_FILES['foodImage']['name'], PATHINFO_EXTENSION);
            $fileName = 'food_' . $postedBy . '_' . time() . '.' . strtolower($ext);
            $targetFile = $uploadDir . $fileName;
            if (move_uploaded_file($_FILES['foodImage']['tmp_name'], $targetFile)) {
                $foodImageUrl = 'uploads/' . $fileName;
            }
        }
    }

    $stmt = $conn->prepare(
        "INSERT INTO food_posts (posted_by, food_type, food_name, quantity, pickup_date, pickup_from, pickup_to, notes, food_image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param('issssssss', $postedBy, $foodType, $foodName, $quantity, $pickupDate, $pickupFrom, $pickupTo, $notes, $foodImageUrl);
    $stmt->execute();
    $postId = $conn->insert_id;
    $stmt->close();

    $u = $_SESSION['user'];
    $post = [
        'id'            => (int)$postId,
        'postedBy'      => (int)$u['id'],
        'postedByName'  => $u['fullName'] ?? $u['full_name'] ?? '',
        'postedByType'  => $u['accountType'] ?? $u['account_type'] ?? '',
        'phone'         => $u['phone'] ?? '',
        'email'         => $u['email'] ?? '',
        'address'       => implode(', ', array_filter([$u['street'] ?? '', $u['area'] ?? '', $u['city'] ?? ''])),
        'foodType'      => $foodType,
        'foodName'      => $foodName,
        'quantity'      => $quantity,
        'pickupDate'    => $pickupDate,
        'pickupFrom'    => substr($pickupFrom, 0, 5),
        'pickupTo'      => substr($pickupTo, 0, 5),
        'notes'         => $notes,
        'foodImage'     => $foodImageUrl,
        'claimedBy'     => null,
        'claimedByName' => null,
        'claimedAt'     => null,
        'createdAt'     => date('Y-m-d H:i:s')
    ];

    echo json_encode(['ok' => true, 'post' => $post]);
    exit;
}

echo json_encode(['ok' => false, 'msg' => 'Method not allowed.']);
