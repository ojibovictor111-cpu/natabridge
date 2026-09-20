-- Seed the platform-wide administrator role. Individual identities are
-- provisioned separately because Firebase UIDs differ by environment.
INSERT INTO roles (id, name, scope, description)
VALUES (
    'rol-platform-admin',
    'PLATFORM_ADMIN',
    'PLATFORM',
    'Administrator for platform-wide operations'
)
ON CONFLICT (id) DO NOTHING;
