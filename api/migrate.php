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

// 3. Migrate existing data if working_sectors still exists
$checkColumn = $conn->query("SHOW COLUMNS FROM users LIKE 'working_sectors'");
if ($checkColumn && $checkColumn->num_rows > 0) {
    $result = $conn->query("SELECT id, working_sectors FROM users WHERE account_type = 'charity' AND working_sectors IS NOT NULL");
    if ($result && $result->num_rows > 0) {
        $insertStmt = $conn->prepare("INSERT IGNORE INTO charity_sectors (charity_id, sector_id) SELECT ?, id FROM sectors WHERE name = ?");
        while ($row = $result->fetch_assoc()) {
            $c_id = $row['id'];
            $s_names = explode(',', $row['working_sectors']);
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
}

// 4. Drop working_sectors from users (Check if it exists first to avoid error on multiple runs)
$checkColumn = $conn->query("SHOW COLUMNS FROM users LIKE 'working_sectors'");
if ($checkColumn && $checkColumn->num_rows > 0) {
    $conn->query("ALTER TABLE users DROP COLUMN working_sectors");
    echo "Migration completed successfully. working_sectors column dropped.\n";
} else {
    echo "Migration completed successfully. working_sectors column already dropped.\n";
}

// 5. Create fund_requests table if not exists
$conn->query("
    CREATE TABLE IF NOT EXISTS fund_requests (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        charity_id       INT NOT NULL,
        fund_type        ENUM('educational','emergency','welfare') NOT NULL DEFAULT 'educational',
        group_category   VARCHAR(100) DEFAULT NULL,
        reason           TEXT NOT NULL,
        amount           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        status           ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        admin_feedback   TEXT DEFAULT NULL,
        location_area    VARCHAR(150) DEFAULT NULL,
        location_street  VARCHAR(150) DEFAULT NULL,
        location_city    VARCHAR(100) DEFAULT NULL,
        document_url     VARCHAR(255) DEFAULT NULL,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (charity_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
");

// 6. Create VIEWs for reporting
$conn->query("
    CREATE OR REPLACE VIEW v_active_campaign_summary AS
        SELECT
            fc.id                                  AS campaign_id,
            fc.title,
            fc.goal_amount,
            fc.deadline,
            fc.status,
            u.full_name                            AS charity_name,
            COALESCE(SUM(d.amount), 0)             AS total_raised,
            COUNT(d.id)                            AS donor_count,
            ROUND(
                COALESCE(SUM(d.amount), 0)
                / NULLIF(fc.goal_amount, 0) * 100, 1
            )                                      AS progress_pct
        FROM financial_campaigns fc
        JOIN  users u    ON fc.charity_id = u.id
        LEFT JOIN donations d ON fc.id = d.campaign_id
                              AND d.payment_status = 'SUCCESS'
        GROUP BY fc.id, fc.title, fc.goal_amount, fc.deadline, fc.status, u.full_name
");

$conn->query("
    CREATE OR REPLACE VIEW v_charity_welfare_workload AS
        SELECT
            u.id                                  AS charity_id,
            u.full_name                           AS charity_name,
            COUNT(wc.id)                          AS total_cases,
            SUM(wc.status = 'Completed')          AS completed_cases,
            SUM(wc.status = 'Pending')            AS pending_cases,
            MAX(wc.created_at)                    AS last_case_date
        FROM users u
        LEFT JOIN welfare_cases wc ON wc.handled_by = u.id
        WHERE u.account_type = 'charity'
        GROUP BY u.id, u.full_name
");

// 7. Add index (check if exists first)
$checkIndex = $conn->query("SHOW INDEX FROM donations WHERE Key_name = 'idx_donations_campaign_status'");
if ($checkIndex && $checkIndex->num_rows == 0) {
    $conn->query("
        CREATE INDEX idx_donations_campaign_status 
        ON donations(campaign_id, payment_status);
    ");
}

echo "Migration completed: Views and Indexes created and fund_requests table ready.\n";

$conn->close();
?>
$conn->query("CREATE INDEX idx_users_account_type ON users(account_type)");
$conn->query("CREATE INDEX idx_welfare_cases_status ON welfare_cases(status)");
