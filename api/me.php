<?php
// ── Get Current User from Session ────────────────────────
// GET /api/me.php
// Returns logged-in user info or null

session_start();
header('Content-Type: application/json');

if (isset($_SESSION['user'])) {
    echo json_encode(['ok' => true, 'user' => $_SESSION['user']]);
} else {
    echo json_encode(['ok' => false, 'user' => null]);
}
