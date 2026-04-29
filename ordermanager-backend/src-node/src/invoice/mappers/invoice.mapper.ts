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

    const dto: InvoiceFormModelDto = new InvoiceFormModelDto();
    dto.id = source.id;
    dto.invoiceNumber = source.invoiceNumber;
    dto.invoiceDescription = source.invoiceDescription;
    dto.personSupplierId = source.invoiceRecipientPerson?.id??null
    dto.personSupplierId = source.invoiceRecipientPerson?.id??null
    dto.recipientFullName = empty(source?.invoiceRecipientPerson?.personFirstName??'').concat(empty(source.invoiceRecipientPerson?.personLastName??'')).concat(empty(source.invoiceRecipientPerson?.companyName??'')).trim()
    dto.supplierFullName = empty(source?.invoiceSupplierPerson?.personFirstName??'').concat(empty(source?.invoiceSupplierPerson?.personLastName??'')).concat(empty(source.invoiceSupplierPerson?.companyName??'')).trim()
    dto.totalSumNetto = source.totalSumNetto
    dto.totalSumNetto = source.totalSumNetto
    dto.totalSumBrutto = source.totalSumBrutto
    dto.creationDate = new Date(source.creationDate).toISOString()
    dto.invoiceDate = new Date(source.invoiceDate).toISOString()
    dto.rateType = source.rateType
    dto.invoiceItems = (source.invoiceItems ?? []).map((it) => this.mapEntityToModelInvoiceItem(it))

    return dto;
  }

  mapEntityToModelInvoiceItem(source: InvoiceItemEntity): InvoiceItemModelDto {
    const dto: InvoiceItemModelDto = new InvoiceItemModelDto()
    dto.id = source.id
    dto.catalogItemId = source.itemCatalog?.id
    dto.description = source.itemCatalog?.description
    dto.amountItems = source.amountItems
    dto.itemPrice = source.itemPrice
    dto.vat = source.vat
    dto.sumNetto = source.sumNetto
    dto.sumBrutto = source.sumBrutto

    return dto;
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
