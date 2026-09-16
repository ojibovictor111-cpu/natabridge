-- Migration: Seed temporary demo user
-- Created: 2026-09-16
-- Description: Gives the demo login a stable prefixed user ID for clinical audit foreign keys.

INSERT INTO users (id, firebase_uid, firstname, lastname, email)
VALUES (
    'usr-00000000-0000-4000-8000-000000000001',
    'demo:jane@natabridge.com',
    'Jane',
    'Demo',
    'jane@natabridge.com'
);
