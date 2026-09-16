-- Migration: Create identity and RBAC schema
-- Created: 2026-09-01
-- Description: Introduces roles, permissions, and their assignments for NataBridge access control.
-- Application entity IDs use a descriptive prefix plus a UUID string, so keys and references are VARCHAR(100).

CREATE TYPE role_scope AS ENUM (
    'PLATFORM',
    'INSTITUTION',
    'CLINICAL'
);

CREATE TYPE user_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'DISABLED'
);

CREATE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
    id VARCHAR(100) PRIMARY KEY,
    firebase_uid VARCHAR(128) NOT NULL UNIQUE,
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    contact VARCHAR(30),
    status user_status NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX users_email_case_insensitive_unique
    ON users (LOWER(email));

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE roles (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    scope role_scope NOT NULL,
    description TEXT,

    CONSTRAINT roles_name_scope_unique
        UNIQUE (name, scope),
    CONSTRAINT roles_id_scope_unique
        UNIQUE (id, scope)
);

CREATE TABLE permissions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    scope role_scope NOT NULL,
    description TEXT,

    CONSTRAINT permissions_name_scope_unique
        UNIQUE (name, scope),
    CONSTRAINT permissions_id_scope_unique
        UNIQUE (id, scope)
);

CREATE TABLE role_permissions (
    role_id VARCHAR(100) NOT NULL,
    permission_id VARCHAR(100) NOT NULL,
    scope role_scope NOT NULL,

    PRIMARY KEY (role_id, permission_id),

    CONSTRAINT role_permissions_role_scope_fk
        FOREIGN KEY (role_id, scope)
        REFERENCES roles(id, scope)
        ON DELETE CASCADE,
    CONSTRAINT role_permissions_permission_scope_fk
        FOREIGN KEY (permission_id, scope)
        REFERENCES permissions(id, scope)
        ON DELETE CASCADE
);

CREATE INDEX role_permissions_permission_idx
    ON role_permissions (permission_id);

CREATE TABLE user_roles (
    user_id VARCHAR(100) NOT NULL,
    role_id VARCHAR(100) NOT NULL,
    scope role_scope NOT NULL,
    institution_id VARCHAR(100),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_roles_role_scope_fk
        FOREIGN KEY (role_id, scope)
        REFERENCES roles(id, scope)
        ON DELETE CASCADE,
    CONSTRAINT user_roles_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT user_roles_scope_context_valid
        CHECK (
            (scope = 'PLATFORM' AND institution_id IS NULL)
            OR
            (scope IN ('INSTITUTION', 'CLINICAL') AND institution_id IS NOT NULL)
        )
);

CREATE UNIQUE INDEX user_roles_platform_assignment_unique
    ON user_roles (user_id, role_id)
    WHERE institution_id IS NULL;

CREATE UNIQUE INDEX user_roles_institution_assignment_unique
    ON user_roles (user_id, role_id, institution_id)
    WHERE institution_id IS NOT NULL;

CREATE INDEX user_roles_role_idx
    ON user_roles (role_id);

CREATE INDEX user_roles_user_idx
    ON user_roles (user_id);

CREATE INDEX user_roles_institution_idx
    ON user_roles (institution_id)
    WHERE institution_id IS NOT NULL;
