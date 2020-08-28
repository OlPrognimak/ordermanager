import {Component, Input} from '@angular/core';

@Component({
  //styleUrls: ['./components.cell.css'],
  styles: [`
        :host ::ng-deep .p-cell-editing {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            height: 50pt !important;
            width: 100% !important;
        }
    `],
  selector: '[toEditableCell]',
  template:
      `<p-cellEditor>
          <ng-template pTemplate="input">
             <input class = "p-cell-editing" pInputText type="input" [(ngModel)]="cellValue"/>
          </ng-template>
          <ng-template pTemplate="output">
            {{cellValue}}
          </ng-template>
        </p-cellEditor>`
})
export class EditableCellComponent {
  @Input() cellValue: string;
}


