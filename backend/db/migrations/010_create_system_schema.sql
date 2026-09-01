-- Migration: Create system schema
-- Created: 2026-09-01
-- Description: Introduces immutable audit records for changes made across NataBridge.

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    actor_user_id UUID,
    institution_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT audit_logs_actor_fk
        FOREIGN KEY (actor_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT audit_logs_institution_fk
        FOREIGN KEY (institution_id)
        REFERENCES institutions(id)
        ON DELETE SET NULL,
    CONSTRAINT audit_logs_old_values_is_object
        CHECK (old_values IS NULL OR JSONB_TYPEOF(old_values) = 'object'),
    CONSTRAINT audit_logs_new_values_is_object
        CHECK (new_values IS NULL OR JSONB_TYPEOF(new_values) = 'object')
);

CREATE INDEX audit_logs_entity_idx
    ON audit_logs (entity_type, entity_id);

CREATE INDEX audit_logs_actor_created_at_idx
    ON audit_logs (actor_user_id, created_at DESC);
