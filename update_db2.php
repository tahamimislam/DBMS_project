<?php
require 'api/db.php';
$conn->query("ALTER TABLE financial_campaigns ADD COLUMN category VARCHAR(100) DEFAULT 'Other' AFTER title");
echo "Category column added.\n";
?>
