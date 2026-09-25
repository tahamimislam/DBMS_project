-- ============================================================
-- HumanityLink Database Schema
-- How to use:
--   1. Open phpMyAdmin (http://localhost/phpmyadmin)
--   2. Click "Import" tab
--   3. Choose this file and click "Go"
--   4. Then visit http://localhost/HumanityLink/api/seed.php
--      to insert demo users and demo food posts
-- ============================================================

CREATE DATABASE IF NOT EXISTS humanitylink
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE humanitylink;

-- ── Users Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    account_type ENUM('charity','restaurant','user','doctor','admin') NOT NULL,
    full_name    VARCHAR(150) NOT NULL,
    reg_number   VARCHAR(100) NOT NULL UNIQUE,
    email        VARCHAR(150) NOT NULL UNIQUE,
    phone        VARCHAR(30)  DEFAULT NULL,
    street       VARCHAR(150) DEFAULT NULL,
    area         VARCHAR(100) DEFAULT NULL,
    city         VARCHAR(100) DEFAULT NULL,
    password     VARCHAR(255) NOT NULL,
    specialization  ENUM('Cardiology','Neurology','Pediatrics','General Medicine','Orthopedics','Gynaecology','Dermatology','Psychiatry','Ophthalmology','Dental') DEFAULT NULL,
    profile_picture VARCHAR(255) DEFAULT NULL,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insert Predefined Admin
INSERT IGNORE INTO users (account_type, full_name, reg_number, email, password)
VALUES ('admin', 'System Admin', 'ADMIN-001', 'admin@charity.com', '$2y$10$UNo6idvhNE/jOO3WJaufm.aEYnu5GECipeGYE9ZHPS3yWnmka9NYe');

-- ── Sectors Table (3NF for Charity Sectors) ───────────────
CREATE TABLE IF NOT EXISTS sectors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- Insert Predefined Sectors
INSERT IGNORE INTO sectors (name) VALUES ('Food'), ('Medical'), ('Education'), ('Financial'), ('Other');

-- ── Charity Sectors Mapping Table ─────────────────────────
CREATE TABLE IF NOT EXISTS charity_sectors (
    charity_id INT NOT NULL,
    sector_id INT NOT NULL,
    PRIMARY KEY (charity_id, sector_id),
    FOREIGN KEY (charity_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sector_id) REFERENCES sectors(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Doctor Qualifications Table ─────────────────────────
CREATE TABLE IF NOT EXISTS doctor_qualifications (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    qualification ENUM('MBBS','FCPS','BCS Health') NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY (user_id, qualification)
) ENGINE=InnoDB;

-- ── Food Posts Table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_posts (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    posted_by   INT  NOT NULL,
    food_type   VARCHAR(50)  NOT NULL,
    food_name   VARCHAR(150) NOT NULL,
    quantity    VARCHAR(100) NOT NULL,
    pickup_date DATE         NOT NULL,
    pickup_from TIME         NOT NULL,
    pickup_to   TIME         NOT NULL,
    notes       TEXT         DEFAULT NULL,
    food_image  VARCHAR(255) DEFAULT NULL,
    claimed_by  INT          DEFAULT NULL,
    claimed_at  TIMESTAMP    NULL DEFAULT NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (posted_by)  REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Welfare Cases Table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS welfare_cases (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    reported_by      INT NOT NULL,
    case_type        ENUM('Medical','Homeless','Abandoned','Other') NOT NULL,
    person_desc      TEXT NOT NULL,
    image_url        VARCHAR(255) DEFAULT NULL,
    location_street  VARCHAR(150) NOT NULL,
    location_area    VARCHAR(100) NOT NULL,
    location_city    VARCHAR(100) NOT NULL,
    urgency          ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
    notes            TEXT DEFAULT NULL,
    status           ENUM('Pending','Reviewing','Accepted','Action Taken','Completed') NOT NULL DEFAULT 'Pending',
    handled_by       INT DEFAULT NULL,
    handled_at       TIMESTAMP NULL DEFAULT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (handled_by)  REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Welfare Case Rejections Table ─────────────────────────
CREATE TABLE IF NOT EXISTS welfare_case_rejections (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    case_id          INT NOT NULL,
    charity_id       INT NOT NULL,
    rejected_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES welfare_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (charity_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY (case_id, charity_id)
) ENGINE=InnoDB;

-- ── Messages Table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    sender_id       INT  NOT NULL,
    receiver_id     INT  NOT NULL,
    post_id         INT  DEFAULT NULL,
    welfare_case_id INT  DEFAULT NULL,
    message         TEXT NOT NULL,
    sent_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id)       REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id)     REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id)         REFERENCES food_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (welfare_case_id) REFERENCES welfare_cases(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Doctor Campaigns Table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_campaigns (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id     INT NOT NULL,
    subject       VARCHAR(255) NOT NULL,
    description   TEXT NOT NULL,
    image_url     VARCHAR(255) DEFAULT NULL,
    location      VARCHAR(255) NOT NULL,
    start_time    TIME NOT NULL,
    end_time      TIME NOT NULL,
    campaign_date DATE NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Campaign Participants Table ────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_participants (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id   INT NOT NULL,
    user_id       INT NOT NULL,
    joined_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES doctor_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY (campaign_id, user_id)
) ENGINE=InnoDB;


-- ── Financial Campaigns Table ──────────────────────────────
CREATE TABLE IF NOT EXISTS financial_campaigns (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    charity_id  INT NOT NULL,
    title       VARCHAR(200) NOT NULL,
    category    VARCHAR(100) DEFAULT 'Other',
    description TEXT NOT NULL,
    goal_amount DECIMAL(12,2) NOT NULL,
    collected_amount DECIMAL(12,2) DEFAULT 0.00,
    image_url   VARCHAR(255) DEFAULT NULL,
    deadline    DATE NOT NULL,
    status      ENUM('active','completed','cancelled') DEFAULT 'active',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (charity_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Donations Table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donations (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    user_id     INT NOT NULL,
    amount      DECIMAL(10,2) NOT NULL,
    message     TEXT DEFAULT NULL,
    payment_method VARCHAR(50) DEFAULT 'card',
    transaction_id VARCHAR(100),
    payment_status ENUM('SUCCESS', 'PENDING', 'FAILED') DEFAULT 'SUCCESS',
    masked_account VARCHAR(100),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES financial_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Fund Requests Table ────────────────────────────────────
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

-- ============================================================
-- VIEWS
-- ============================================================

-- ── View: Active Campaign Summary (used in admin & charity dashboards)
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
    GROUP BY fc.id, fc.title, fc.goal_amount, fc.deadline, fc.status, u.full_name;

-- ── View: Charity Welfare Workload (used in medical-welfare section)
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
    GROUP BY u.id, u.full_name;

-- ============================================================
-- AGGREGATION WITH HAVING (examples used by application)
-- ============================================================

-- Campaigns that have received at least 1 successful donation
-- (Used internally to identify "active" campaigns with real traction)
-- SELECT campaign_id, charity_name, total_raised, donor_count
-- FROM v_active_campaign_summary
-- HAVING donor_count > 0;

-- Charities handling more than 0 welfare cases (HAVING example)
-- SELECT charity_id, charity_name, total_cases, completed_cases
-- FROM v_charity_welfare_workload
-- HAVING total_cases > 0;

-- ============================================================
-- TRANSACTION EXAMPLE (implemented in api/financial.php donate action)
-- BEGIN / COMMIT / ROLLBACK pattern used when processing donations:
--   START TRANSACTION;
--     INSERT INTO donations (...) VALUES (...);
--     UPDATE financial_campaigns SET collected_amount = collected_amount + ? WHERE id = ?;
--   COMMIT;
--   (ROLLBACK on error)
-- ============================================================

-- ============================================================
-- INDEXES
-- ============================================================

-- Explanation for adding this index:
-- In HumanityLink, the application frequently needs to calculate the total amount 
-- raised and the number of donors for active financial campaigns. This means we 
-- repeatedly run queries against the `donations` table filtering by `campaign_id` 
-- and `payment_status` = 'SUCCESS' (e.g. SELECT SUM(amount) FROM donations WHERE ...).
-- By adding a composite index on (campaign_id, payment_status), the database engine 
-- can instantly locate the successful donations for a specific campaign without 
-- scanning the entire table, significantly improving dashboard load times.
CREATE INDEX idx_donations_campaign_status 
ON donations(campaign_id, payment_status);

-- Explanation:
-- The application frequently filters users by their roles (e.g., loading all charities 
-- or all doctors). Indexing account_type speeds up these table scans.
CREATE INDEX idx_users_account_type ON users(account_type);

-- Explanation:
-- The welfare and medical support dashboards often filter cases by their status 
-- (Pending, Completed, etc.). An index here prevents full table scans on large numbers of cases.
CREATE INDEX idx_welfare_cases_status ON welfare_cases(status);

-- Explanation:
-- The financial support dashboard primarily displays 'active' campaigns. 
-- Adding an index on the status column of financial_campaigns ensures fast retrieval 
-- of ongoing campaigns without scanning through completed or cancelled ones.
CREATE INDEX idx_financial_campaigns_status ON financial_campaigns(status);

-- Explanation:
-- The admin panel needs to quickly fetch and filter fund requests by their status 
-- (e.g., 'pending' requests that need approval). Indexing this column improves admin load times.
CREATE INDEX idx_fund_requests_status ON fund_requests(status);
