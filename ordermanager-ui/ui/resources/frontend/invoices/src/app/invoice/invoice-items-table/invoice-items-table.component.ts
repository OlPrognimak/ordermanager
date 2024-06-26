/*
 * Copyright (c) 2020, Oleksandr Prognimak. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 *   - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *
 *   - Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *
 *   - The name of Oleksandr Prognimak
 *     may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import {
  DropdownDataType,
  InvoiceItemModel,
  InvoiceItemModelInterface
} from '../../domain/domain.invoiceformmodel';
import { Observable, of, Subscription } from 'rxjs';
import { InvoiceItemsTableCalculatorService } from './invoice-items-table.calculator.service';
import { InvoiceItemsTableService } from './invoice-items-table.service';
import { HttpClient } from "@angular/common/http";
import {NgForm} from "@angular/forms";

@Component({
  styles: [],
  styleUrls: ['./invoice-items-table.component.css'],
  selector: 'app-invoice-items-table',
  templateUrl: './invoice-items-table.component.html',
  providers: [HttpClient],
})
export class InvoiceItemsTableComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() invoiceItems: InvoiceItemModel[];
  /** The observer for observation model changing event in parent component */
  @Input() modelChangedEvent: Observable<void> = of();
  @Output() changeItemsEvent = new EventEmitter<InvoiceItemModel[]>();
  @Output() changeItemEvent = new EventEmitter<InvoiceItemModelInterface>()
  @Output() totalNettoSumEvent = new EventEmitter<number>();
  @Output() totalBruttoSumEvent = new EventEmitter<number>();
  @Input() catalogItems: DropdownDataType[];
  @Input() myInputField;
  @ViewChild("itemsForm") itemsForm: NgForm
  idxItem: number;
  defaultItemMsg: string = "Click to select item";
  /** The subscription for observer of model changing event in parent component */
  private modelChangedSubscription: Subscription;

  constructor(public itemtableService: InvoiceItemsTableService,
              public calculatorService: InvoiceItemsTableCalculatorService) {
    this.idxItem = 0;
  }


  ngOnInit(): void {
    this.modelChangedSubscription = this.modelChangedEvent.subscribe(() => {
      this.resetTotalValues();
    });

    this.itemtableService.downloadCatalogItemsDropdownList(callback => {
      if (callback) {
        this.catalogItems = callback;
      }
    })

  }

  ngOnDestroy(): void {
    this.modelChangedSubscription.unsubscribe();
  }

  /** sets to 0 the values of total netto and total bruto sum price of invoice */
  public resetTotalValues(): void {
    this.calculatorService.totalNettoSum.set(0)
    this.calculatorService.totalBruttoSum.set(0)
  }

  /**
   *
   * @param invoiceitem the item which belong to table row
   * @param event id catalog item
   */
  catalogItemSlected(invoiceitem: InvoiceItemModel, event: any): void {
    this.itemtableService.loadCatalogItemDetails(invoiceitem, event, callback => {
      this.changeItemsEvent.emit(this.invoiceItems);
      this.inputBoxChanged(callback, null)
    });

  }

  /**
   * Adds new Item to table of items
   */
  addNewItem(): void {
    const newItem = new InvoiceItemModel();
    this.idxItem = ++this.idxItem;
    newItem.idxItem = this.idxItem;
    this.invoiceItems.push(newItem);
    this.changeItemsEvent.emit(this.invoiceItems);
  }

  /**
   * Deletes item from list of items
   * @param idxItem index of item in list items
   */
  deleteItem(idxItem: any): void {
    this.invoiceItems = this.invoiceItems.filter(val => val.idxItem !== idxItem);
    this.changeItemsEvent.emit(this.invoiceItems);
    this.inputBoxChanged(new InvoiceItemModel(), 0);
  }

  /**
   * Retrieve the label of item in dropdown to set in editable set component
   * @param idItemCatalog the id of item in catalog of items
   */
  getCatalogDescription(idItemCatalog: string): any {
    if (idItemCatalog !== undefined) {
      // tslint:disable-next-line:triple-equals
      const rez = this.catalogItems?.filter(
        val => Number(val.value) === Number(idItemCatalog));
      const labelTxt = rez?.at(0).label
      return labelTxt;
    } else {
      return '[Please select item]';
    }
  }

  /**
   * @param value element refernce
   */
  // @HostListener('change', ['$event.target'])
  inputBoxChanged(model: InvoiceItemModel, event: any): any {
    const promise = this.calculatorService.calculateAllSum(this.invoiceItems, model);
    promise.then(() => {
        this.emitTotalChanged();
      }
    ).catch(error => {
      this.printToJson(JSON.stringify(error));
    });
  }

  printToJson(data: any): void {
    console.log(JSON.stringify(data));
  }

  /** emits events with changed total netto and brutto sums */
  private emitTotalChanged(): void {
    try {
      //this.calculatorService.invoiceFormData.totalSumNetto = this.calculatorService.totalNettoSum()
      //this.calculatorService.invoiceFormData.totalSumBrutto = this.calculatorService.totalBruttoSum()
    }catch (err) {
      console.log("Error :"+err)
    }
   }

  ngAfterViewInit(): void {
    this.itemsForm.valueChanges.subscribe(value => {

      setTimeout( () => {
       //TODO
      }, 0)
    })
  }
}
