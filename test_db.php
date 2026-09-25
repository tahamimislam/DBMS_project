<?php
require 'api/db.php';

$stmt = $conn->prepare("INSERT INTO donations (campaign_id, user_id, amount, message, payment_method, transaction_id, masked_account, payment_status) VALUES (1, 1, 10, 'msg', 'card', '123', '123', 'SUCCESS')");
if (!$stmt) { echo 'Error 1: ' . $conn->error; exit; }
echo 'Prepared insert 1. ';

$stmt = $conn->prepare("UPDATE financial_campaigns SET collected_amount = collected_amount + 10 WHERE id = 1");
if (!$stmt) { echo 'Error 2: ' . $conn->error; exit; }
echo 'Prepared update 1. ';

$stmt = $conn->prepare("INSERT INTO donations (campaign_id, user_id, amount, message, system_fund, payment_method, transaction_id, masked_account, payment_status) VALUES (NULL, 1, 10, 'msg', 'Education', 'card', '123', '123', 'SUCCESS')");
if (!$stmt) { echo 'Error 3: ' . $conn->error; exit; }
echo 'Prepared system fund insert.';
