<?php
// ── Seed Demo Data ────────────────────────────────────────
// Visit this page ONCE after importing humanitylink.sql:
//   http://localhost/HumanityLink/api/seed.php
// Inserts 2 demo users + 3 demo food posts.

require 'db.php';

$log = [];

// ── Helper ────────────────────────────────────────────────
function insertUser($conn, $type, $name, $reg, $email, $phone, $addr, $pw) {
    $check = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $check->bind_param('s', $email);
    $check->execute();
    $res = $check->get_result();
    if ($row = $res->fetch_assoc()) {
        $check->close();
        return ['id' => $row['id'], 'msg' => "Already exists: $email (id={$row['id']})"];
    }
    $check->close();

    $hash = password_hash($pw, PASSWORD_DEFAULT);
    $stmt = $conn->prepare(
        "INSERT INTO users (account_type,full_name,reg_number,email,phone,address,password)
         VALUES (?,?,?,?,?,?,?)"
    );
    $stmt->bind_param('sssssss', $type, $name, $reg, $email, $phone, $addr, $hash);
    $stmt->execute();
    $id = $conn->insert_id;
    $stmt->close();
    return ['id' => $id, 'msg' => "Created: $name (id=$id)"];
}

// ── Insert Demo Users ─────────────────────────────────────
$r1 = insertUser($conn, 'restaurant', 'Green Garden Restaurant', 'REST-2024-001',
      'greengarden@demo.com', '+880-1711-111111', '45 Mirpur Road, Dhaka 1216', 'demo123');
$log[] = $r1['msg'];
$restId = $r1['id'];

$r2 = insertUser($conn, 'charity', 'Hope Foundation Bangladesh', 'NGO-2024-077',
      'hope@demo.com', '+880-1812-222222', '12 Gulshan Avenue, Dhaka 1212', 'demo123');
$log[] = $r2['msg'];
$charityId = $r2['id'];

// ── Insert Demo Food Posts ────────────────────────────────
$d1 = date('Y-m-d', strtotime('+3 days'));
$d2 = date('Y-m-d', strtotime('+4 days'));
$d3 = date('Y-m-d', strtotime('+5 days'));
$now = date('Y-m-d H:i:s');

// Post 1: Available
$s = $conn->prepare(
    "INSERT INTO food_posts (posted_by,food_type,food_name,quantity,pickup_date,pickup_from,pickup_to,notes)
     VALUES (?,?,?,?,?,?,?,?)"
);
$ft='Cooked Meal'; $fn='Biriyani & Curry'; $qty='50 plates'; $nts='Freshly cooked, halal';
$tf='12:00:00'; $tt='14:00:00';
$s->bind_param('isssssss', $restId,$ft,$fn,$qty,$d1,$tf,$tt,$nts);
$s->execute();
$log[] = "Food post created: $fn (id={$conn->insert_id})";
$s->close();

// Post 2: Already claimed by Hope Foundation
$s = $conn->prepare(
    "INSERT INTO food_posts (posted_by,food_type,food_name,quantity,pickup_date,pickup_from,pickup_to,notes,claimed_by,claimed_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)"
);
$ft2='Bakery'; $fn2='Bread & Pastries'; $qty2='80 pieces'; $nts2='Day-end surplus';
$tf2='17:00:00'; $tt2='19:00:00';
$s->bind_param('isssssssis', $restId,$ft2,$fn2,$qty2,$d2,$tf2,$tt2,$nts2,$charityId,$now);
$s->execute();
$log[] = "Food post created: $fn2 (id={$conn->insert_id}, claimed)";
$s->close();

// Post 3: Available
$s = $conn->prepare(
    "INSERT INTO food_posts (posted_by,food_type,food_name,quantity,pickup_date,pickup_from,pickup_to,notes)
     VALUES (?,?,?,?,?,?,?,?)"
);
$ft3='Cooked Meal'; $fn3='Dal & Rice'; $qty3='100 servings'; $nts3='Vegetarian friendly';
$tf3='13:00:00'; $tt3='15:30:00';
$s->bind_param('isssssss', $restId,$ft3,$fn3,$qty3,$d3,$tf3,$tt3,$nts3);
$s->execute();
$log[] = "Food post created: $fn3 (id={$conn->insert_id})";
$s->close();

// ── Output ────────────────────────────────────────────────
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>HumanityLink — Seed</title>
  <style>
    body{font-family:monospace;background:#f5f5f5;padding:40px;color:#222}
    h2{color:#1a5c3a}
    .ok{color:#1a7a3a} .note{color:#c67400}
    a{color:#1a5c3a}
  </style>
</head>
<body>
<h2>HumanityLink — Seed Script</h2>
<?php foreach($log as $l): ?>
  <p class="<?= strpos($l,'Already')!==false ? 'note' : 'ok' ?>">&#10004; <?= htmlspecialchars($l) ?></p>
<?php endforeach; ?>
<hr>
<p><b>Done!</b> Demo logins:</p>
<ul>
  <li>Restaurant: <b>greengarden@demo.com</b> / <b>demo123</b></li>
  <li>Charity: <b>hope@demo.com</b> / <b>demo123</b></li>
</ul>
<p><a href="../auth.html">&#8594; Go to Login Page</a></p>
</body>
</html>
