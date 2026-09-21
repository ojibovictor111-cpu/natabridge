export const ACTIVE_INSTITUTION_STORAGE_KEY = 'active_institution_id';

export function readActiveInstitutionId(): string | null {
  return sessionStorage.getItem(ACTIVE_INSTITUTION_STORAGE_KEY);
}
