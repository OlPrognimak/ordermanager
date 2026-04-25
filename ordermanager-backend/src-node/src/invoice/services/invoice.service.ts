import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../exception/error-code.enum';
import { OrderManagerException } from '../../exception/order-manager.exception';
import { UserRepository } from '../../security/repositories/user.repository';
import { InvoiceEntity } from '../entities/invoice.entity';
import { ItemCatalogEntity } from '../entities/item-catalog.entity';
import { InvoiceFormModelDto, ItemCatalogModelDto } from '../dto/invoice.dto';
import { InvoiceMappingService } from './invoice-mapping.service';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { ItemCatalogRepository } from '../repositories/item-catalog.repository';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly userRepository: UserRepository,
    private readonly itemCatalogRepository: ItemCatalogRepository,
    private readonly invoiceMappingService: InvoiceMappingService,
  ) {}

  async getItemCatalog(idItemCatalog: number): Promise<ItemCatalogEntity> {
    const item = await this.itemCatalogRepository.findById(idItemCatalog);
    if (!item) throw new OrderManagerException(ErrorCode.CODE_0000, 'Item not found');
    return item;
  }

  async getAllUserInvoices(userName: string): Promise<InvoiceEntity[]> {
    const user = await this.userRepository.findByUsername(userName);
    if (!user) return [];
    return this.invoiceRepository.findByInvoiceUser(user);
  }

  async getAllUserInvoicesByPeriod(userName: string, startDate: string, endDate?: string): Promise<InvoiceEntity[]> {
    const user = await this.userRepository.findByUsername(userName);
    if (!user) return [];
    return this.invoiceRepository.findByInvoiceUserAndCreationDateBetween(user, new Date(startDate), new Date(endDate ?? new Date().toISOString()));
  }

  async saveInvoice(dto: InvoiceFormModelDto, userName: string): Promise<number> {
    const invoice = await this.invoiceMappingService.mapInvoiceModelToEntity(dto);
    const user = await this.userRepository.findByUsername(userName);
    if (!user) throw new OrderManagerException(ErrorCode.CODE_0007, 'Can not find user');
    invoice.invoiceUser = user;
    const saved = await this.invoiceRepository.save(invoice);
    return saved.id;
  }

  async updateInvoices(invoices: InvoiceFormModelDto[]): Promise<void> {
    for (const dto of invoices) {
      const invoice = await this.invoiceRepository.findById(dto.id!);
      if (!invoice) continue;
      await this.invoiceMappingService.mapInvoiceModelToExistedEntity(dto, invoice);
      await this.invoiceRepository.save(invoice);
    }
  }

  async getInvoice(invoiceNumber: string): Promise<InvoiceEntity | null> {
    return this.invoiceRepository.findByInvoiceNumber(invoiceNumber);
  }

  getCatalogItemsList(criteria?: string): Promise<ItemCatalogEntity[]> {
    if (!criteria || !criteria.trim()) return this.itemCatalogRepository.findAll();
    return this.itemCatalogRepository.findByDescriptionContainingOrShortDescriptionContaining(criteria);
  }

  saveItemCatalog(itemCatalog: ItemCatalogEntity): Promise<ItemCatalogEntity> {
    return this.itemCatalogRepository.save(itemCatalog);
  }

  async deleteInvoice(invoiceId: number): Promise<void> {
    const invoice = await this.invoiceRepository.findById(invoiceId);
    if (invoice) await this.invoiceRepository.delete(invoice);
  }

  deleteCatalogItem(itemId: number): Promise<void> {
    return this.itemCatalogRepository.deleteById(itemId);
  }

  async updateItemCatalog(itemModels: ItemCatalogModelDto[]): Promise<void> {
    for (const dto of itemModels) {
      const entity = await this.itemCatalogRepository.findById(dto.id!);
      if (!entity) continue;
      this.invoiceMappingService.mapItemCatalogModelToExistedEntity(dto, entity);
      await this.itemCatalogRepository.save(entity);
    }
  }

  validateInvoiceData(invoiceData: InvoiceFormModelDto): void {
    if (!invoiceData.invoiceItems || invoiceData.invoiceItems.length === 0) {
      throw new OrderManagerException(ErrorCode.CODE_20007, 'At least one Item should be selected.');
    }
    if (new Date(invoiceData.creationDate) < new Date(invoiceData.invoiceDate)) {
      throw new OrderManagerException(ErrorCode.CODE_20009, 'Creation date can not be less then invoice date.');
    }
  }
}
