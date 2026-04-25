import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { OrderManagerException } from '../common/exceptions/order-manager.exception';
import { PersonEntity } from '../person/entities/person.entity';
import { AuthService } from '../security/auth.service';
import { InvoiceFormModelDto, ItemCatalogModelDto } from './dto/invoice.dto';
import { InvoiceEntity } from './entities/invoice.entity';
import { InvoiceItemEntity } from './entities/invoice-item.entity';
import { ItemCatalogEntity } from './entities/item-catalog.entity';
import { RateType } from './entities/rate-type.enum';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(InvoiceEntity) private readonly invoiceRepository: Repository<InvoiceEntity>,
    @InjectRepository(ItemCatalogEntity) private readonly itemCatalogRepository: Repository<ItemCatalogEntity>,
    @InjectRepository(PersonEntity) private readonly personRepository: Repository<PersonEntity>,
    private readonly authService: AuthService,
  ) {}

  validateInvoiceData(invoiceData: InvoiceFormModelDto): void {
    if (!invoiceData.invoiceItems?.length) {
      throw new OrderManagerException(ErrorCode.CODE_20007, 'Validation error. invoiceFormData.invoiceItems at least one item must be added. At least one Item should be selected.');
    }
    if (new Date(invoiceData.creationDate) < new Date(invoiceData.invoiceDate)) {
      throw new OrderManagerException(ErrorCode.CODE_20009, 'Validation error. invoiceFormData.creationDate can not be less as invoiceFormData.invoiceDate. Creation date can not be less then invoice date.');
    }
  }

  async saveInvoice(model: InvoiceFormModelDto, userName: string): Promise<string> {
    this.validateInvoiceData(model);
    const invoice = await this.mapInvoiceModelToEntity(model);
    const user = await this.authService.getUserOrException(userName);
    invoice.invoiceUser = user;
    const saved = await this.invoiceRepository.save(invoice);
    return saved.id;
  }

  async updateInvoices(models: InvoiceFormModelDto[]): Promise<void> {
    for (const model of models) {
      if (!model.id) continue;
      this.validateInvoiceData(model);
      const invoice = await this.invoiceRepository.findOne({ where: { id: String(model.id) } });
      if (!invoice) continue;
      const patched = await this.mapInvoiceModelToEntity(model, invoice);
      await this.invoiceRepository.save(patched);
    }
  }

  async getInvoice(invoiceNumber: string): Promise<InvoiceEntity | null> {
    return this.invoiceRepository.findOne({ where: { invoiceNumber } });
  }

  async getAllUserInvoices(userName: string): Promise<InvoiceEntity[]> {
    return this.invoiceRepository
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.invoiceSupplierPerson', 'supplier')
      .leftJoinAndSelect('i.invoiceRecipientPerson', 'recipient')
      .leftJoinAndSelect('i.invoiceItems', 'items')
      .leftJoinAndSelect('items.itemCatalog', 'catalog')
      .leftJoin('i.invoiceUser', 'u')
      .where('u.username = :userName', { userName })
      .getMany();
  }

  async getAllUserInvoicesByPeriod(userName: string, startDate: string, endDate?: string): Promise<InvoiceEntity[]> {
    return this.invoiceRepository
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.invoiceSupplierPerson', 'supplier')
      .leftJoinAndSelect('i.invoiceRecipientPerson', 'recipient')
      .leftJoinAndSelect('i.invoiceItems', 'items')
      .leftJoinAndSelect('items.itemCatalog', 'catalog')
      .leftJoin('i.invoiceUser', 'u')
      .where('u.username = :userName', { userName })
      .andWhere('i.creationDate between :startDate and :endDate', {
        startDate,
        endDate: endDate ?? new Date().toISOString(),
      })
      .getMany();
  }

  async getCatalogItemsList(criteria?: string): Promise<ItemCatalogEntity[]> {
    const qb = this.itemCatalogRepository.createQueryBuilder('c');
    if (criteria && criteria.trim()) {
      qb.where('c.description like :criteria or c.shortDescription like :criteria', { criteria: `%${criteria}%` });
    }
    return qb.orderBy('c.shortDescription', 'ASC').getMany();
  }

  async getItemCatalog(idItemCatalog: number): Promise<ItemCatalogEntity> {
    const item = await this.itemCatalogRepository.findOne({ where: { id: String(idItemCatalog) } });
    if (!item) throw new OrderManagerException(ErrorCode.CODE_0000, 'Can not find catalog item');
    return item;
  }

  async saveItemCatalog(model: ItemCatalogModelDto): Promise<ItemCatalogEntity> {
    const entity = this.itemCatalogRepository.create(model);
    return this.itemCatalogRepository.save(entity);
  }

  async updateItemCatalog(models: ItemCatalogModelDto[]): Promise<void> {
    for (const model of models) {
      if (!model.id) continue;
      const item = await this.itemCatalogRepository.findOne({ where: { id: String(model.id) } });
      if (!item) continue;
      Object.assign(item, model);
      await this.itemCatalogRepository.save(item);
    }
  }

  async deleteInvoice(invoiceId: number): Promise<void> {
    await this.invoiceRepository.delete(String(invoiceId));
  }

  async deleteCatalogItem(itemId: number): Promise<void> {
    await this.itemCatalogRepository.delete(String(itemId));
  }

  async mapInvoiceModelToEntity(model: InvoiceFormModelDto, existing?: InvoiceEntity): Promise<InvoiceEntity> {
    const supplier = await this.personRepository.findOneBy({ id: String(model.personSupplierId) });
    const recipient = await this.personRepository.findOneBy({ id: String(model.personRecipientId) });
    if (!supplier || !recipient) throw new OrderManagerException(ErrorCode.CODE_0003, 'Can not find person');

    const invoice = existing ?? this.invoiceRepository.create();
    invoice.invoiceSupplierPerson = supplier;
    invoice.invoiceRecipientPerson = recipient;
    invoice.invoiceDate = new Date(model.invoiceDate);
    invoice.creationDate = new Date(model.creationDate);
    invoice.invoiceNumber = model.invoiceNumber;
    invoice.invoiceDescription = model.invoiceDescription;
    invoice.rateType = model.rateType as RateType;
    invoice.totalSumBrutto = model.totalSumBrutto;
    invoice.totalSumNetto = model.totalSumNetto;
    invoice.invoiceItems = [];

    for (const item of model.invoiceItems) {
      const itemCatalog = await this.itemCatalogRepository.findOneBy({ id: String(item.catalogItemId) });
      if (!itemCatalog) continue;
      const invoiceItem = new InvoiceItemEntity();
      invoiceItem.amountItems = item.amountItems;
      invoiceItem.itemPrice = itemCatalog.itemPrice;
      invoiceItem.vat = itemCatalog.vat;
      invoiceItem.sumNetto = item.sumNetto;
      invoiceItem.sumBrutto = item.sumBrutto;
      invoiceItem.itemCatalog = itemCatalog;
      invoiceItem.invoice = invoice;
      invoice.invoiceItems.push(invoiceItem);
    }

    return invoice;
  }

  mapInvoiceEntityToModel(source: InvoiceEntity): InvoiceFormModelDto {
    return {
      id: Number(source.id),
      invoiceNumber: source.invoiceNumber,
      invoiceDescription: source.invoiceDescription,
      personSupplierId: Number(source.invoiceSupplierPerson?.id),
      personRecipientId: Number(source.invoiceRecipientPerson?.id),
      supplierFullName: `${source.invoiceSupplierPerson?.personFirstName ?? ''} ${source.invoiceSupplierPerson?.personLastName ?? ''} ${source.invoiceSupplierPerson?.companyName ?? ''}`.trim(),
      recipientFullName: `${source.invoiceRecipientPerson?.personFirstName ?? ''} ${source.invoiceRecipientPerson?.personLastName ?? ''} ${source.invoiceRecipientPerson?.companyName ?? ''}`.trim(),
      totalSumNetto: source.totalSumNetto,
      totalSumBrutto: source.totalSumBrutto,
      creationDate: source.creationDate.toISOString(),
      invoiceDate: source.invoiceDate.toISOString(),
      rateType: source.rateType,
      invoiceItems: (source.invoiceItems ?? []).map((item) => ({
        id: Number(item.id),
        catalogItemId: Number(item.itemCatalog?.id),
        description: item.itemCatalog?.description,
        amountItems: item.amountItems,
        itemPrice: item.itemPrice,
        vat: item.vat,
        sumNetto: item.sumNetto,
        sumBrutto: item.sumBrutto,
      })),
    };
  }
}
