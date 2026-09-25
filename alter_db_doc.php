<?php
require 'api/db.php';
$conn->query("ALTER TABLE fund_requests ADD COLUMN document_url VARCHAR(255) NULL AFTER reason");
echo "DB Updated.";
?>
