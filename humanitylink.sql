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
    account_type ENUM('charity','restaurant','user','doctor') NOT NULL,
    full_name    VARCHAR(150) NOT NULL,
    reg_number   VARCHAR(100) NOT NULL UNIQUE,
    email        VARCHAR(150) NOT NULL UNIQUE,
    phone        VARCHAR(30)  DEFAULT NULL,
    street       VARCHAR(150) DEFAULT NULL,
    area         VARCHAR(100) DEFAULT NULL,
    city         VARCHAR(100) DEFAULT NULL,
    password     VARCHAR(255) NOT NULL,
    working_sectors ENUM('Food','Medical','Education','Financial') DEFAULT NULL,
    qualification   VARCHAR(255) DEFAULT NULL,
    specialization  VARCHAR(255) DEFAULT NULL,
    profile_picture VARCHAR(255) DEFAULT NULL,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
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

