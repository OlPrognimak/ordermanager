import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { compareObjects, isAuthenticated } from "../../common-services/common-services-util.service";
import { TemplatesComponentComponent } from "../../common-components/templates-component/templates-component.component";
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { InvoiceFormModelInterface, ItemCatalogModel } from "../../domain/domain.invoiceformmodel";
import { ToastModule } from "primeng/toast";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { ButtonModule } from "primeng/button";
import { CommonModule } from "@angular/common";
import { MessagesPrinter } from "../../common-services/common-services.app.http.service";
import { TooltipModule } from "primeng/tooltip";

export type ItemCatalogControls = { [key in keyof ItemCatalogModel]: AbstractControl }
type ItemCatalogFormGroup = FormGroup & { value: InvoiceFormModelInterface, controls: ItemCatalogControls }

@Component({
  selector: 'app-edit-item-dialog',
  templateUrl: './edit-item-dialog.component.html',
  styleUrls: ['./edit-item-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, DialogModule, DialogModule, ToastModule, InputTextModule, ReactiveFormsModule, TemplatesComponentComponent, ButtonModule, TooltipModule],
  providers: []
})
export class EditItemDialogComponent {

  @ViewChild('templatesComponent') templatesComponentComponent: TemplatesComponentComponent
  originalItem: ItemCatalogModel
  visible: boolean;
  editCatalogItemFG: FormGroup;
  @Output() editObjectChangedChanged: EventEmitter<ItemCatalogModel> = new EventEmitter<ItemCatalogModel>();
  saveButtonTittle: string = ''
  protected readonly isAuthenticated = isAuthenticated;

  constructor(private formBuilder: FormBuilder, private messagePrinter: MessagesPrinter) {
    this.editCatalogItemFG = formBuilder.group({
        id: this.formBuilder.nonNullable.control(''),
        description: this.formBuilder.nonNullable.control('', [Validators.required]),
        shortDescription: this.formBuilder.nonNullable.control(''),
        itemPrice: this.formBuilder.nonNullable.control(null, [Validators.required]),
        vat: this.formBuilder.nonNullable.control(null, [Validators.required])
      } as ItemCatalogControls
    ) as ItemCatalogFormGroup
  }

  setEditingObject(editingObject: ItemCatalogModel) {
    this.originalItem = Object.assign(new ItemCatalogModel(), editingObject)
    this.editCatalogItemFG.setValue(editingObject)
  }

  setDialogVisible(b: boolean) {
    this.visible = b
  }

  putChangesBack() {
    if (this.editCatalogItemFG?.valid) {
      if (!compareObjects(this.originalItem, this.editCatalogItemFG.value)) {
        this.editObjectChangedChanged.emit(this.editCatalogItemFG.value)
        this.visible = false
      } else {
        this.messagePrinter.printUnsuccessefulMessage("The catalog item has no changes.", null)
      }
    } else {
      this.messagePrinter.printUnsuccessefulMessage("Please correct input errors.", null)
    }
  }


  onBlurSaveButton($event: FocusEvent) {
    console.log("On Button blur.")
    if (this.editCatalogItemFG.invalid) {
      this.saveButtonTittle = "Please correct input errors."
    }
  }
}
