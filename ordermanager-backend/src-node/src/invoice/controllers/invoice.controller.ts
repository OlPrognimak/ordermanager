import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { CreatedResponseDto, DropdownDataTypeDto, RequestPeriodDateDto } from '../../common/dto/common.dto';
import { InvoiceMapper } from '../mappers/invoice.mapper';
import { InvoiceFormModelDto, ItemCatalogModelDto } from '../dto/invoice.dto';
import { InvoiceMappingService } from '../services/invoice-mapping.service';
import { InvoiceService } from '../services/invoice.service';

@Controller()
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly invoiceMappingService: InvoiceMappingService,
    private readonly invoiceMapper: InvoiceMapper,
  ) {}

  @Put('/invoice')
  async putNewInvoice(@Body() invoiceFormModel: InvoiceFormModelDto, @Req() req: any): Promise<CreatedResponseDto> {
    this.invoiceService.validateInvoiceData(invoiceFormModel);
    const id = await this.invoiceService.saveInvoice(invoiceFormModel, req.user.username);
    return new CreatedResponseDto(id);
  }

  @Post('/invoice')
  async updateInvoice(@Body() invoiceFormModels: InvoiceFormModelDto[]): Promise<CreatedResponseDto> {
    invoiceFormModels.forEach((m) => this.invoiceService.validateInvoiceData(m));
    await this.invoiceService.updateInvoices(invoiceFormModels);
    return new CreatedResponseDto(1);
  }

  @Post('/invoice/itemcatalog')
  async updateCatalogItem(@Body() itemCatalogModels: ItemCatalogModelDto[]): Promise<CreatedResponseDto> {
    await this.invoiceService.updateItemCatalog(itemCatalogModels);
    return new CreatedResponseDto(1);
  }

  @Delete('/invoice/:invoiceId')
  async deleteInvoice(@Param('invoiceId') invoiceId: string): Promise<CreatedResponseDto> {
    await this.invoiceService.deleteInvoice(Number(invoiceId));
    return new CreatedResponseDto(Number(invoiceId));
  }

  @Delete('/invoice/itemcatalog/:itemId')
  async deleteCatalogItem(@Param('itemId') itemId: string): Promise<CreatedResponseDto> {
    await this.invoiceService.deleteCatalogItem(Number(itemId));
    return new CreatedResponseDto(Number(itemId));
  }

  @Put('/invoice/itemcatalog')
  async putNewCatalogItem(@Body() itemCatalogModel: ItemCatalogModelDto): Promise<CreatedResponseDto> {
    const itemCatalog = this.invoiceMappingService.mapModelToItemCatalogEntity(itemCatalogModel);
    const saved = await this.invoiceService.saveItemCatalog(itemCatalog);
    return new CreatedResponseDto(saved.id);
  }

  @Get('/invoice/itemcatalog/:idItemCatalog')
  async getItemCatalog(@Param('idItemCatalog') idItemCatalog: string): Promise<ItemCatalogModelDto> {
    const itemCatalog = await this.invoiceService.getItemCatalog(Number(idItemCatalog));
    return this.invoiceMapper.mapEntityToItemCatalogModel(itemCatalog);
  }

  @Get('/invoice/itemscatalogdropdown')
  async getCatalogItemsDropdown(): Promise<DropdownDataTypeDto[]> {
    const all = await this.invoiceService.getCatalogItemsList();
    return this.invoiceMapper.mapListCatalogItemsToDropdownType(all);
  }

  @Get('/invoice/itemsCatalogList')
  async getItemsCatalogList(@Query('criteria') criteria: string) {
    return this.invoiceService.getCatalogItemsList(criteria);
  }

  @Get('/invoice/invoicesList')
  async getInvoices(@Req() req: any): Promise<InvoiceFormModelDto[]> {
    const invoices = await this.invoiceService.getAllUserInvoices(req.user.username);
    return invoices.map((i) => this.invoiceMapper.mapInvoiceEntityToFormModel(i));
  }

  @Post('/invoice/invoicesListPeriod')
  async getInvoicesByPeriod(@Req() req: any, @Body() periodDate: RequestPeriodDateDto): Promise<InvoiceFormModelDto[]> {
    const invoices = await this.invoiceService.getAllUserInvoicesByPeriod(req.user.username, periodDate.startDate, periodDate.endDate);
    return invoices.map((i) => this.invoiceMapper.mapInvoiceEntityToFormModel(i));
  }
}
