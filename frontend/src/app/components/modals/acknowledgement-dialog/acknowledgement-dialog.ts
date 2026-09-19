import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { provideIcons, NgIcon } from '@ng-icons/core';
import { lucideShieldCheck } from '@ng-icons/lucide';
import { phosphorInfoFill } from '@ng-icons/phosphor-icons/fill';

@Component({
  selector: 'nata-acknowledgement-dialog',
  imports: [MatDialogModule, NgIcon],
  templateUrl: './acknowledgement-dialog.html',
  styleUrl: './acknowledgement-dialog.css',
  viewProviders: [provideIcons({ lucideShieldCheck, phosphorInfoFill })]
})
export class AcknowledgementDialog {
  private readonly dialogRef = inject(MatDialogRef<AcknowledgementDialog>);

  closeDialog(value: boolean): void {
    this.dialogRef.close(value);
  }
}
