import { AbstractControl, FormGroup } from '@angular/forms';

export function focusFirstInvalidControl(
  form: AbstractControl,
  root: HTMLElement,
  fallbackId?: string,
): void {
  const firstInvalidName =
    form instanceof FormGroup
      ? Object.entries(form.controls).find(([, control]) => control.invalid)?.[0]
      : undefined;
  const fieldId = firstInvalidName ?? fallbackId;

  if (!fieldId) return;

  // Let Angular render validation messages and any newly selected step first.
  setTimeout(() => root.querySelector<HTMLElement>(`[id="${fieldId}"]`)?.focus(), 0);
}
