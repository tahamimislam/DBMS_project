<?php
require 'db.php';

// 1. Create `sectors` table
$conn->query("
    CREATE TABLE IF NOT EXISTS sectors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
    ) ENGINE=InnoDB;
");

// Insert predefined sectors
$sectors = ['Food', 'Medical', 'Education', 'Financial', 'Other'];
$stmt = $conn->prepare("INSERT IGNORE INTO sectors (name) VALUES (?)");
foreach ($sectors as $s) {
    $stmt->bind_param('s', $s);
    $stmt->execute();
}
$stmt->close();

// 2. Create `charity_sectors` table
$conn->query("
    CREATE TABLE IF NOT EXISTS charity_sectors (
        charity_id INT NOT NULL,
        sector_id INT NOT NULL,
        PRIMARY KEY (charity_id, sector_id),
        FOREIGN KEY (charity_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (sector_id) REFERENCES sectors(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
");

// 3. Migrate existing data
$result = $conn->query("SELECT id, working_sectors FROM users WHERE account_type = 'charity' AND working_sectors IS NOT NULL");
if ($result && $result->num_rows > 0) {
    $insertStmt = $conn->prepare("INSERT IGNORE INTO charity_sectors (charity_id, sector_id) SELECT ?, id FROM sectors WHERE name = ?");
    while ($row = $result->fetch_assoc()) {
        $c_id = $row['id'];
        $s_names = explode(',', $row['working_sectors']); // just in case some had comma separated already
        foreach ($s_names as $name) {
            $name = trim($name);
            if ($name) {
                $insertStmt->bind_param('is', $c_id, $name);
                $insertStmt->execute();
            }
        }
    }
    $insertStmt->close();
}

// 4. Drop working_sectors from users (Check if it exists first to avoid error on multiple runs)
$checkColumn = $conn->query("SHOW COLUMNS FROM users LIKE 'working_sectors'");
if ($checkColumn && $checkColumn->num_rows > 0) {
    $conn->query("ALTER TABLE users DROP COLUMN working_sectors");
    echo "Migration completed successfully. working_sectors column dropped.\n";
} else {
    echo "Migration completed successfully. working_sectors column already dropped.\n";
}

$conn->close();
?>
