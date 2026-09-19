# Firebase authentication setup

The frontend signs in with Firebase email/password and sends an ID token as
`Authorization: Bearer <token>` on protected API requests. The backend checks
the token with Firebase Admin, including revocation, then looks up an active
`users` row by its `firebase_uid`. `GET /api/users/me` returns that row's
internal `id` and `email` for the frontend. Public predictions remain open.

## Backend configuration

Use Firebase project `natabridge-cf0da`, or set `FIREBASE_PROJECT_ID` to the
project used by the frontend. Supply Firebase Admin credentials using the
hosting platform's Application Default Credentials, a service account JSON
file pointed to by `GOOGLE_APPLICATION_CREDENTIALS`, or
`FIREBASE_SERVICE_ACCOUNT_JSON` containing the complete JSON document. Keep
the service account private; the frontend Firebase config is not an Admin
credential. The credential must be able to check revoked tokens.

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

Missing or malformed Bearer headers return `401 AUTHENTICATION_REQUIRED`;
invalid, expired, or revoked tokens return `401 INVALID_ID_TOKEN`. A verified
UID without a matching row returns `403 USER_NOT_PROVISIONED`; suspended and
disabled users return `403 USER_INACTIVE`.
