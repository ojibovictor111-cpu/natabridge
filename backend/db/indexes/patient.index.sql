-- Patient identity/contact uniqueness.
CREATE UNIQUE INDEX unique_patient_email
ON patients (LOWER(email))
WHERE email IS NOT NULL;

CREATE UNIQUE INDEX unique_patient_phone
ON patients(phone)
WHERE phone IS NOT NULL;

-- Latest-assessment and dashboard access paths.
CREATE INDEX idx_patients_created_at
ON patients(created_at DESC);

CREATE INDEX idx_assessments_patient_created_at
ON assessments(patient_id, created_at DESC);

CREATE INDEX idx_prediction_runs_source_status_created_at
ON prediction_runs(source, status, created_at DESC);

CREATE INDEX idx_prediction_runs_request_id
ON prediction_runs(request_id);

CREATE INDEX idx_prediction_runs_created_by_created_at
ON prediction_runs(created_by_user_id, created_at DESC)
WHERE created_by_user_id IS NOT NULL;

CREATE INDEX idx_assessments_created_by_created_at
ON assessments(created_by_user_id, created_at DESC);

CREATE INDEX idx_prediction_factors_result
ON prediction_factors(prediction_result_id);
