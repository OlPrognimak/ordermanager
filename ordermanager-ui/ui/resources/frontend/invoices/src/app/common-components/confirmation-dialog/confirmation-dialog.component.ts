import { Component, effect, EventEmitter, input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from "primeng/dialog";
import { ButtonModule } from "primeng/button";
import { TranslocoModule } from '@jsverse/transloco';

@Component({
    selector: 'app-confirmation-dialog',
    imports: [
        CommonModule,
        DialogModule,
        ButtonModule,
        TranslocoModule
    ],
    templateUrl: './confirmation-dialog.component.html',
    styleUrls: ['./confirmation-dialog.component.css']
})
export class ConfirmationDialogComponent {
  display = input(false);
  message = input('');
  @Output() confirmed = new EventEmitter<void>();
  @Output() canceled = new EventEmitter<boolean>();
  transferObject: any
  confirmMessage = input('');
  visible = false;

  constructor() {
    effect(() => {
      this.visible = this.display();
    });
  }

  get confirmHeaderText(): string {
    return this.confirmMessage() ? this.confirmMessage() : ''
  }

  onConfirm(): void {
    this.confirmed.emit();
    this.visible = false;
  }

  onCancel(): void {
    this.transferObject = null
    this.canceled.emit(true)
  }

}
