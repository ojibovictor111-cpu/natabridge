# Frontend API migration: prediction runs and patient assessments

The former assessment endpoint mixed public predictions with patient records. It has been removed:

```text
POST /api/assessments  (removed; no compatibility alias)
```

Use one of the two explicit flows below. Public predictions never create patients or assessments. Patient assessments always reference an existing patient.

## Shared prediction fields

Both POST routes accept these model inputs:

```json
{
  "age": 26,
  "systolicBP": 120,
  "diastolicBP": 80,
  "bloodSugar": 4.8,
  "bodyTemp": 37,
  "heartRate": 78
}
```

`bodyTemp` is Celsius. Do not convert it in the frontend.

Validation ranges are `age` 10-70, `systolicBP` 60-250,
`diastolicBP` 30-150, `bloodSugar` 2-9999.99, `bodyTemp` 36-43, and
`heartRate` 30-220. Values are JSON numbers.

A returned `prediction` has this shape:

```json
{
  "risk": "Low Risk",
  "confidence": 0.91,
  "probabilities": {
    "Low Risk": 0.91,
    "Mid Risk": 0.06,
    "High Risk": 0.03
  },
  "topFactors": [
    {
      "feature": "SystolicBP",
      "impact": 0.24
    }
  ],
  "recommendations": [
    {
      "feature": "SystolicBP",
      "patientValue": 120,
      "condition": "Example interpretation",
      "actions": ["Example clinical action"],
      "counselling": ["Example patient guidance"]
    }
  ],
  "modelVersion": "model-version"
}
```

## 1. Public/guest prediction

```text
POST /api/predictions
Authentication: not required
Success: 201 Created
```

Send exactly the six shared prediction fields. Do not send names, contact details, date of birth, pregnancy details, `patientId`, or null placeholders.

Response:

```json
{
  "data": {
    "predictionRunId": "opaque-run-id",
    "predictionResultId": "opaque-result-id",
    "prediction": {
      "risk": "Low Risk",
      "confidence": 0.91,
      "probabilities": {
        "Low Risk": 0.91,
        "Mid Risk": 0.06,
        "High Risk": 0.03
      },
      "topFactors": [],
      "recommendations": [],
      "modelVersion": "model-version"
    }
  }
}
```

There is deliberately no `patientId` or `assessmentId`. The server records this run with source `standalone` and stores the completed prediction without creating a patient-facing record.

## 2. Assessment for an existing patient

```text
POST /api/patients/:patientId/assessments
Authentication: required (`Authorization: Bearer <Firebase ID token>`)
Success: 201 Created
```

All properties are required in the JSON object; the three pregnancy-context values may be `null`:

```json
{
  "age": 26,
  "systolicBP": 120,
  "diastolicBP": 80,
  "bloodSugar": 4.8,
  "bodyTemp": 37,
  "heartRate": 78,
  "gestationalAge": 24,
  "firstPregnancy": false,
  "previousComplications": "Previous pre-eclampsia"
}
```

Do not send patient demographics in this request. They belong to the selected patient record.

Response:

```json
{
  "data": {
    "assessmentId": "opaque-assessment-id",
    "patientId": "opaque-patient-id",
    "predictionRunId": "opaque-run-id",
    "predictionResultId": "opaque-result-id",
    "prediction": {
      "risk": "High Risk",
      "confidence": 0.91,
      "probabilities": {
        "Low Risk": 0.03,
        "Mid Risk": 0.06,
        "High Risk": 0.91
      },
      "topFactors": [],
      "recommendations": [],
      "modelVersion": "model-version"
    }
  }
}
```

The server records this run with source `patient_assessment`. A successful response means the prediction and patient-linked assessment are already stored; the result page should not offer a second "Save to patient record" operation.

## Create or select the patient first

The frontend must obtain a real patient ID before calling the patient-assessment route.

### Select an existing patient

```text
GET /api/patients
Authentication: required
Success: 200 OK
```

Response:

```json
{
  "data": [
    {
      "id": "opaque-patient-id",
      "name": "Amina Bello",
      "age": 26,
      "gestationalAge": 24,
      "lastAssessment": "2026-08-10T12:00:00.000Z",
      "currentRiskLevel": "Low Risk"
    }
  ]
}
```

An individual selected record is also available from:

```text
GET /api/patients/:patientId
Authentication: required
Success: 200 OK
Response: { "data": { ...patientSummary } }
```

### Create a patient

```text
POST /api/patients
Authentication: required
Success: 201 Created
```

Request:

```json
{
  "firstName": "Amina",
  "middleName": null,
  "lastName": "Bello",
  "dob": "2000-01-01",
  "email": "amina@example.com",
  "phone": "+2348000000000"
}
```

`middleName`, `email`, and `phone` may be omitted or sent as `null`, but at
least one of `email` or `phone` is required. `firstName` and `lastName` must
contain a non-whitespace character, and `dob` uses `YYYY-MM-DD`.

The response uses the same `{ "data": ... }` success envelope as the other endpoints. Read the new patient ID from `response.data.id`:

```json
{
  "data": {
    "id": "opaque-patient-id",
    "firstName": "Amina",
    "middleName": null,
    "lastName": "Bello",
    "dob": "2000-01-01",
    "email": "amina@example.com",
    "phone": "+2348000000000",
    "createdAt": "2026-08-10T12:00:00.000Z"
  }
}
```

The clinical frontend flow is therefore:

1. Sign in and select an existing patient, or create one.
2. Keep the returned patient `id` as an opaque string.
3. Submit measurements to `POST /api/patients/:patientId/assessments`.
4. Render the returned prediction. The assessment is already attached to the patient.

A suitable client route is `/dashboard/patients/:patientId/assessment`. The public `/assessment` page should call only `/api/predictions`.

## Error contract

All errors use this envelope; `field` is present only when relevant:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "A human-readable description.",
  "field": "optional-field-name",
  "requestId": "req-..."
}
```

Handle these route-relevant statuses and codes:

| Status | Code | When |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | A path parameter or request body fails validation. |
| `400` | `PATIENT_CONTACT_REQUIRED` | Patient creation omitted both email and phone. |
| `401` | `AUTHENTICATION_REQUIRED` | A protected route is called without a Bearer token. |
| `401` | `INVALID_ID_TOKEN` | A Firebase ID token is invalid, expired, or revoked. |
| `403` | `USER_NOT_PROVISIONED` | The verified Firebase UID does not have a matching `users.firebase_uid`. |
| `403` | `USER_INACTIVE` | The matching user is suspended or disabled. |
| `404` | `PATIENT_NOT_FOUND` | The selected patient ID does not exist. |
| `409` | `PATIENT_EMAIL_ALREADY_EXISTS` | A new patient uses an existing email; `field` is `email`. |
| `409` | `PATIENT_PHONE_ALREADY_EXISTS` | A new patient uses an existing phone; `field` is `phone`. |
| `502` | `PREDICTION_SERVICE_ERROR` | The prediction service responds unsuccessfully. |
| `502` | `PREDICTION_SERVICE_UNAVAILABLE` | The prediction service cannot be reached. |
| `502` | `PREDICTION_SERVICE_INVALID_RESPONSE` | The prediction service returns an invalid payload. |
| `500` | `PREDICTION_AUDIT_FAILURE` | The prediction attempt could not be recorded. |
| `500` | `INTERNAL_SERVER_ERROR` | An unexpected server or persistence failure occurs. |

Unknown routes return `404 ROUTE_NOT_FOUND`.

Display `error.message` to the user. The `code` and optional `field` are stable values for field highlighting or specialized UI behavior; `requestId` is for support/debugging.

Calling removed `POST /api/assessments` now returns `404 ROUTE_NOT_FOUND`. Update the frontend before relying on the new database model.

## Frontend type migration

- Replace the single old `AssessmentApi` request with a six-field prediction input and a patient-assessment input that adds the three pregnancy fields.
- Replace old `predictionId` usage with `predictionRunId`. `predictionResultId` is also returned for traceability but is not needed to render the result.
- Model the public response without an `assessmentId`.
- Model the patient response with required `assessmentId`, `patientId`, and `predictionRunId`.
- Backend success envelopes contain `data`; they do not currently include a `success` boolean.
- Send the Firebase ID token in the `Authorization` header for protected routes. Cookie credentials are not used.
