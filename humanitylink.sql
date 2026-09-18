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
    account_type ENUM('charity','restaurant','user') NOT NULL,
    full_name    VARCHAR(150) NOT NULL,
    reg_number   VARCHAR(100) NOT NULL UNIQUE,
    email        VARCHAR(150) NOT NULL UNIQUE,
    phone        VARCHAR(30)  DEFAULT NULL,
    street       VARCHAR(150) DEFAULT NULL,
    area         VARCHAR(100) DEFAULT NULL,
    city         VARCHAR(100) DEFAULT NULL,
    password     VARCHAR(255) NOT NULL,
    working_sectors VARCHAR(255) DEFAULT NULL,
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
    claimed_by  INT          DEFAULT NULL,
    claimed_at  TIMESTAMP    NULL DEFAULT NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (posted_by)  REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Messages Table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    sender_id   INT  NOT NULL,
    receiver_id INT  NOT NULL,
    post_id     INT  NOT NULL,
    message     TEXT NOT NULL,
    sent_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id)     REFERENCES food_posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;
