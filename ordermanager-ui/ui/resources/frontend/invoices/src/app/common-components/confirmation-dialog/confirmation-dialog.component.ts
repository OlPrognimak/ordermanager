import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from "primeng/dialog";
import { ButtonModule } from "primeng/button";

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule
  ],
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.css']
})
export class ConfirmationDialogComponent {
  @Input() display: boolean = false;
  @Input() message: string = '';
  @Output() confirmed = new EventEmitter<void>();
  @Output() canceled = new EventEmitter<boolean>();
  transferObject: any

  onConfirm(): void {
    this.confirmed.emit();
    this.display = false;
  }

  onCancel(): void {
    this.transferObject = null
    this.canceled.emit(true)
  }

}
