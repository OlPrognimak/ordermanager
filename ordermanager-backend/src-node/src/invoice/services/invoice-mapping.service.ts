import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../exception/error-code.enum';
import { OrderManagerException } from '../../exception/order-manager.exception';
import { PersonRepository } from '../../person/repositories/person.repository';
import { RateType } from '../entities/rate-type.enum';
import { InvoiceEntity } from '../entities/invoice.entity';
import { InvoiceItemEntity } from '../entities/invoice-item.entity';
import { ItemCatalogEntity } from '../entities/item-catalog.entity';
import { InvoiceFormModelDto, ItemCatalogModelDto } from '../dto/invoice.dto';
import { ItemCatalogRepository } from '../repositories/item-catalog.repository';

@Injectable()
export class InvoiceMappingService {
  constructor(
    private readonly personRepository: PersonRepository,
    private readonly itemCatalogRepository: ItemCatalogRepository,
  ) {}

  async mapInvoiceModelToEntity(dto: InvoiceFormModelDto): Promise<InvoiceEntity> {
    const supplier = await this.personRepository.findById(dto.personSupplierId);
    const recipient = await this.personRepository.findById(dto.personRecipientId);
    if (!supplier || !recipient) {
      throw new OrderManagerException(ErrorCode.CODE_0003, 'Supplier or recipient person is not found');
    }

    const invoice = {
      invoiceSupplierPerson: supplier,
      invoiceRecipientPerson: recipient,
      invoiceDate: new Date(dto.invoiceDate),
      invoiceNumber: dto.invoiceNumber,
      invoiceDescription: dto.invoiceDescription,
      creationDate: new Date(dto.creationDate),
      rateType: dto.rateType as RateType,
      totalSumBrutto: dto.totalSumBrutto,
      totalSumNetto: dto.totalSumNetto,
      invoiceItems: [],
    } as InvoiceEntity;

    for (const item of dto.invoiceItems) {
      const catalog = await this.itemCatalogRepository.findById(item.catalogItemId!);
      if (!catalog) continue;
      invoice.invoiceItems.push(this.mapInvoiceItem(item, invoice, catalog));
    }

    return invoice;
  }

  async mapInvoiceModelToExistedEntity(dto: InvoiceFormModelDto, invoice: InvoiceEntity): Promise<void> {
    const supplier = await this.personRepository.findById(dto.personSupplierId);
    const recipient = await this.personRepository.findById(dto.personRecipientId);
    if (supplier) invoice.invoiceSupplierPerson = supplier;
    if (recipient) invoice.invoiceRecipientPerson = recipient;
    invoice.invoiceDate = new Date(dto.invoiceDate);
    invoice.invoiceNumber = dto.invoiceNumber;
    invoice.invoiceDescription = dto.invoiceDescription;
    invoice.creationDate = new Date(dto.creationDate);
    invoice.rateType = dto.rateType as RateType;
    invoice.totalSumBrutto = dto.totalSumBrutto;
    invoice.totalSumNetto = dto.totalSumNetto;
    invoice.invoiceItems = [];
    for (const item of dto.invoiceItems) {
      const catalog = await this.itemCatalogRepository.findById(item.catalogItemId!);
      if (!catalog) continue;
      invoice.invoiceItems.push(this.mapInvoiceItem(item, invoice, catalog));
    }
  }

  mapModelToItemCatalogEntity(source: ItemCatalogModelDto): ItemCatalogEntity {
    return source as ItemCatalogEntity;
  }

  mapItemCatalogModelToExistedEntity(model: ItemCatalogModelDto, entity: ItemCatalogEntity): void {
    entity.description = model.description;
    entity.shortDescription = model.shortDescription;
    entity.itemPrice = model.itemPrice;
    entity.vat = model.vat;
  }

  private mapInvoiceItem(item: any, invoice: InvoiceEntity, itemCatalog: ItemCatalogEntity): InvoiceItemEntity {
    return {
      amountItems: item.amountItems,
      itemCatalog,
      invoice,
      itemPrice: itemCatalog.itemPrice,
      vat: itemCatalog.vat,
      sumNetto: item.sumNetto,
      sumBrutto: item.sumBrutto,
    } as InvoiceItemEntity;
  }
}
