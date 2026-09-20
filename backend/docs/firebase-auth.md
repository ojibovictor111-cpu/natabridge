# Firebase authentication setup

The frontend signs in with Firebase email/password and sends an ID token as
`Authorization: Bearer <token>` on protected API requests. The backend checks
the token with Firebase Admin, including revocation, then looks up an active
`users` row by its `firebase_uid`. `GET /api/users/me` returns that row's
internal `id` and `email` for the frontend. Public predictions remain open.

## Backend configuration

Set `FIREBASE_SERVICE_ACCOUNT_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL`,
and `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY` from a Firebase Admin service account
for the same project used by the frontend (`natabridge-cf0da`). The private key
may contain literal `\\n` sequences; `configs/firebase.config.ts` converts
them to newlines. Keep these values private and do not commit them. The
credential must be able to check revoked tokens.

## Link a clinician

Create the clinician in Firebase Authentication, then copy the Firebase **UID**
from the Firebase console. Link it to the corresponding existing row in the
backend database. For the seeded Jane account, run this with the real UID:

```sql
UPDATE users
SET firebase_uid = '<Firebase Authentication UID>'
WHERE id = 'usr-00000000-0000-4000-8000-000000000001';
```

Check that exactly one row was updated. For other clinicians, provision a
`users` row with a unique internal ID, their Firebase UID, name, and email.
The backend deliberately does not link accounts by email: an unverified email
address must not grant access to an existing clinician record.

## Bootstrap the first platform admin

Run the normal database migrations first. Migration
`012_seed_platform_admin_role.sql` adds the `PLATFORM_ADMIN` role with
`PLATFORM` scope; it does not contain a person's UID or email.

Create the intended admin in Firebase Authentication, verify their email, and
copy their Firebase UID. With database and Firebase Admin credentials configured
in the backend environment, run the one-time bootstrap command from the
`backend` directory. In PowerShell:

```powershell
$env:BOOTSTRAP_PLATFORM_ADMIN_UID = "<Firebase UID>"
$env:BOOTSTRAP_PLATFORM_ADMIN_FIRST_NAME = "<First name>"
$env:BOOTSTRAP_PLATFORM_ADMIN_LAST_NAME = "<Last name>"
npm run db:migrate
npm run admin:bootstrap
Remove-Item Env:BOOTSTRAP_PLATFORM_ADMIN_UID,Env:BOOTSTRAP_PLATFORM_ADMIN_FIRST_NAME,Env:BOOTSTRAP_PLATFORM_ADMIN_LAST_NAME
```

The command checks Firebase for an enabled user with a verified email, creates
or reuses the matching active `users` row, and inserts a platform-scoped
`user_roles` assignment in one database transaction. Repeating it for the same
UID is safe; it refuses a different UID once the first admin is assigned. If
the Firebase email already belongs to the seeded demo row, link that row's
`firebase_uid` first using the SQL above, then run the bootstrap command.

Verify the result with:

```sql
SELECT users.id, users.email, roles.name, user_roles.scope
FROM user_roles
JOIN users ON users.id = user_roles.user_id
JOIN roles ON roles.id = user_roles.role_id
WHERE roles.name = 'PLATFORM_ADMIN' AND user_roles.scope = 'PLATFORM';
```

The current API authenticates active users but does not yet check roles for
platform operations. This bootstrap records the first admin assignment for
role-based authorization when those endpoints are implemented.

Missing or malformed Bearer headers return `401 AUTHENTICATION_REQUIRED`;
invalid, expired, or revoked tokens return `401 INVALID_ID_TOKEN`. A verified
UID without a matching row returns `403 USER_NOT_PROVISIONED`; suspended and
disabled users return `403 USER_INACTIVE`.
