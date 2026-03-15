import { Injectable, computed, signal } from '@angular/core';
import {
  InvoiceItemModel,
  InvoiceItemModelInterface
} from '../../domain/domain.invoiceformmodel';

/**
 * Calculates netto/brutto for all invoice items
 * and exposes total sums as computed signals.
 */
@Injectable({
  providedIn: 'root'
})
export class InvoiceItemsTableCalculatorService {
  readonly invoiceItems = signal<InvoiceItemModelInterface[]>([]);

  readonly totalNettoSum = computed(() =>
    Number(
      this.invoiceItems()
        .reduce((sum, item) => sum + Number(item.sumNetto ?? 0), 0)
        .toFixed(2)
    )
  );

  readonly totalBruttoSum = computed(() =>
    Number(
      this.invoiceItems()
        .reduce((sum, item) => sum + Number(item.sumBrutto ?? 0), 0)
        .toFixed(2)
    )
  );

  setInvoiceItems(items: InvoiceItemModel[]): void {
    this.invoiceItems.set(items.map(item => this.calculateItem(item)));
  }

  /**
   * Recalculate netto/brutto for all existing items and for the passed modelItem.
   * Then update internal signal so total signals are recalculated automatically.
   * @param invoiceItems the items of invoice
   * @param modelItem the item from currently selected or added row where was changed the item price, amount of items or vat.
   */
  calculateAllSum(invoiceItems: InvoiceItemModel[], modelItem: InvoiceItemModel): void {
    const recalculatedItems = invoiceItems.map(item => this.calculateItem(item));
    const recalculatedModelItem = this.calculateItem(modelItem);

    const modelItemExists = recalculatedItems.some(item => item === modelItem);

    const updatedItems = modelItemExists
      ? recalculatedItems.map(item => item === modelItem ? recalculatedModelItem : item)
      : [...recalculatedItems, recalculatedModelItem];

    this.invoiceItems.set(updatedItems);
  }

  /**
   * Calculate netto/brutto for one item.
   * Keeps old mutation style, because your models seem mutable.
   */
  private calculateItem(item: InvoiceItemModel): InvoiceItemModel {
    item.sumNetto = Number(
      (Number(item.amountItems ?? 0) * Number(item.itemPrice ?? 0)).toFixed(2)
    );

    item.sumBrutto = Number(
      (item.sumNetto + (item.sumNetto / 100) * Number(item.vat ?? 0)).toFixed(2)
    );

    return item;
  }
}
