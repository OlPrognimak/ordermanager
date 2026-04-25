import { Injectable } from '@nestjs/common';
import { DropdownDataTypeDto } from '../../common/dto/common.dto';
import { InvoiceEntity } from '../entities/invoice.entity';
import { InvoiceItemEntity } from '../entities/invoice-item.entity';
import { ItemCatalogEntity } from '../entities/item-catalog.entity';
import { InvoiceFormModelDto, InvoiceItemModelDto, ItemCatalogModelDto } from '../dto/invoice.dto';

const empty = (v?: string | null) => v ?? '';

@Injectable()
export class InvoiceMapper {
  mapInvoiceEntityToFormModel(source: InvoiceEntity): InvoiceFormModelDto {
    return {
      id: source.id,
      invoiceNumber: source.invoiceNumber,
      invoiceDescription: source.invoiceDescription,
      personRecipientId: source.invoiceRecipientPerson.id,
      personSupplierId: source.invoiceSupplierPerson.id,
      recipientFullName: `${empty(source.invoiceRecipientPerson.personFirstName)} ${empty(source.invoiceRecipientPerson.personLastName)} ${empty(source.invoiceRecipientPerson.companyName)}`.trim(),
      supplierFullName: `${empty(source.invoiceSupplierPerson.personFirstName)} ${empty(source.invoiceSupplierPerson.personLastName)} ${empty(source.invoiceSupplierPerson.companyName)}`.trim(),
      totalSumNetto: source.totalSumNetto,
      totalSumBrutto: source.totalSumBrutto,
      creationDate: source.creationDate.toISOString(),
      invoiceDate: source.invoiceDate.toISOString(),
      rateType: source.rateType,
      invoiceItems: (source.invoiceItems ?? []).map((it) => this.mapEntityToModelInvoiceItem(it)),
    };
  }

  mapEntityToModelInvoiceItem(source: InvoiceItemEntity): InvoiceItemModelDto {
    return {
      id: source.id,
      catalogItemId: source.itemCatalog?.id,
      description: source.itemCatalog?.description,
      amountItems: source.amountItems,
      itemPrice: source.itemPrice,
      vat: source.vat,
      sumNetto: source.sumNetto,
      sumBrutto: source.sumBrutto,
    };
  }

  mapEntityToItemCatalogModel(itemCatalog: ItemCatalogEntity): ItemCatalogModelDto {
    return {
      id: itemCatalog.id,
      description: itemCatalog.description,
      shortDescription: itemCatalog.shortDescription,
      itemPrice: itemCatalog.itemPrice,
      vat: itemCatalog.vat,
    };
  }

  mapListCatalogItemsToDropdownType(itemCatalogs: ItemCatalogEntity[]): DropdownDataTypeDto[] {
    return itemCatalogs.map((c) => new DropdownDataTypeDto(`${c.description} : Price :${c.itemPrice} `, String(c.id)));
  }
}
