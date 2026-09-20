# API permissions

Migration `013_seed_permissions.sql` defines the permission catalog; 
`014_seed_role_permissions.sql` creates local roles and grants permissions. The existing `PLATFORM_ADMIN` role receives all platform permissions. `INSTITUTION_ADMIN` receives all institution permissions. `CLINICAL_LEAD` receives all clinical permissions. `CLINICIAN` receives routine clinical permissions; amending visits, completing referrals, and exporting records are reserved for `CLINICAL_LEAD`.

The first platform administrator already has a platform `user_roles` assignment from `admin:bootstrap`. Its permissions become effective after migration 014. No local role is assigned to a user by the migration. A local assignment also requires an active `institution_memberships` row and an active institution. Assign local roles through a trusted provisioning workflow. For example, within a transaction, after checking the user and institution:

```sql
INSERT INTO institution_memberships (id, user_id, institution_id)
VALUES ('membership-<unique-id>', '<user-id>', '<institution-id>');

INSERT INTO user_roles (user_id, role_id, scope, institution_id)
VALUES ('<user-id>', 'rol-clinician', 'CLINICAL', '<institution-id>');
```

Protected requests use the Firebase ID token in `Authorization: Bearer <token>`. Local permissions are evaluated from database grants on every request. A user with one eligible institution can omit `X-Institution-Id`; a user with multiple eligible institutions must provide it. A missing grant returns `403 PERMISSION_DENIED`. A missing institution choice when several are eligible returns `400 INSTITUTION_CONTEXT_REQUIRED`.

Patient creation also creates an active `institutional_care` link. Patient lists, details, assessments, and dashboard data require an active care link to the chosen institution. Existing patient records without a care link will be hidden until linked through a reviewed data reconciliation. The standalone `/api/predictions` route remains public for the existing frontend flow; `clinical.predictions.run` protects patient linked assessment routes.
