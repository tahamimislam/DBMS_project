<?php
// ── Logout ────────────────────────────────────────────────
// POST /api/logout.php

session_start();
session_destroy();
header('Content-Type: application/json');
echo json_encode(['ok' => true]);
