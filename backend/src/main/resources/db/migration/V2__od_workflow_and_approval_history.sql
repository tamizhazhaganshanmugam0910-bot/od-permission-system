-- ============================================================
-- Flyway Migration: V2__od_workflow_and_approval_history.sql
-- Database: MySQL 8 Compatible
-- Purpose: Add approval_history table, 48h escalation tracking,
--          and RETURNED_FOR_CORRECTION status support.
-- ============================================================

-- 1. Modify od_requests to support RETURNED_FOR_CORRECTION status and escalation tracking
ALTER TABLE od_requests
  MODIFY COLUMN status ENUM('PENDING', 'DECLINED', 'COMPLETED', 'RETURNED_FOR_CORRECTION') NOT NULL DEFAULT 'PENDING';

ALTER TABLE od_requests
  ADD COLUMN is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN last_stage_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 2. Create approval_history table for auditing all workflow transitions
CREATE TABLE IF NOT EXISTS approval_history (
  id CHAR(36) NOT NULL,
  od_request_id CHAR(36) NOT NULL,
  stage VARCHAR(32) NOT NULL,
  action VARCHAR(32) NOT NULL,
  actor_id CHAR(36) NOT NULL,
  actor_name VARCHAR(255) NOT NULL,
  actor_role VARCHAR(64) NOT NULL,
  comments TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_approval_history_od_request
    FOREIGN KEY (od_request_id) REFERENCES od_requests (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Indexes for efficient lookup of history and escalation checks
CREATE INDEX idx_approval_history_od_request ON approval_history (od_request_id);
CREATE INDEX idx_od_requests_escalation ON od_requests (status, is_escalated, last_stage_updated_at);
