-- Migration: Create identity and RBAC schema
-- Created: 2026-09-01
-- Description: Introduces roles, permissions, and their assignments for NataBridge access control.

CREATE TYPE role_scope AS ENUM (
    'PLATFORM',
    'INSTITUTION',
    'CLINICAL'
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    contact VARCHAR(30),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    scope role_scope NOT NULL,
    description TEXT,

    CONSTRAINT roles_name_scope_unique
        UNIQUE (name, scope),
    CONSTRAINT roles_id_scope_unique
        UNIQUE (id, scope)
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    scope role_scope NOT NULL,
    description TEXT,

    CONSTRAINT permissions_name_scope_unique
        UNIQUE (name, scope),
    CONSTRAINT permissions_id_scope_unique
        UNIQUE (id, scope)
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
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

CREATE TABLE user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,

    PRIMARY KEY (user_id, role_id),

    CONSTRAINT user_roles_role_fk
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE CASCADE,
    CONSTRAINT user_roles_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
