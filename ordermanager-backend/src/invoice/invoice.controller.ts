import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { RequestPeriodDateDto } from '../common/dto/common.dto';
import { InvoiceFormModelDto, ItemCatalogModelDto } from './dto/invoice.dto';
import { InvoiceService } from './invoice.service';

@Controller()
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Put('/invoice')
  async putNewInvoice(@Body() invoiceFormModel: InvoiceFormModelDto, @Req() req: { user: { username: string } }) {
    const id = await this.invoiceService.saveInvoice(invoiceFormModel, req.user.username);
    return { createdId: Number(id) };
  }

  @Post('/invoice')
  async updateInvoice(@Body() invoiceFormModels: InvoiceFormModelDto[]) {
    await this.invoiceService.updateInvoices(invoiceFormModels);
    return { createdId: 1 };
  }

  @Post('/invoice/itemcatalog')
  async updateCatalogItem(@Body() itemCatalogModels: ItemCatalogModelDto[]) {
    await this.invoiceService.updateItemCatalog(itemCatalogModels);
    return { createdId: 1 };
  }

  @Delete('/invoice/:invoiceId')
  async deleteInvoice(@Param('invoiceId') invoiceId: string) {
    await this.invoiceService.deleteInvoice(Number(invoiceId));
    return { createdId: Number(invoiceId) };
  }

  @Delete('/invoice/itemcatalog/:itemId')
  async deleteCatalogItem(@Param('itemId') itemId: string) {
    await this.invoiceService.deleteCatalogItem(Number(itemId));
    return { createdId: Number(itemId) };
  }

  @Put('/invoice/itemcatalog')
  async putNewCatalogItem(@Body() itemCatalogModel: ItemCatalogModelDto) {
    const itemCatalog = await this.invoiceService.saveItemCatalog(itemCatalogModel);
    return { createdId: Number(itemCatalog.id) };
  }

  @Get('/invoice/itemcatalog/:idItemCatalog')
  async getItemCatalog(@Param('idItemCatalog') idItemCatalog: string) {
    return this.invoiceService.getItemCatalog(Number(idItemCatalog));
  }

  @Get('/invoice/itemscatalogdropdown')
  async getCatalogItemsDropdown() {
    const allCatalogItems = await this.invoiceService.getCatalogItemsList();
    return allCatalogItems.map((c) => ({ label: `${c.description} : Price :${c.itemPrice} `, value: String(c.id) }));
  }

  @Get('/invoice/itemsCatalogList')
  getItemsCatalogList(@Query('criteria') criteria: string) {
    return this.invoiceService.getCatalogItemsList(criteria);
  }

  @Get('/invoice/invoicesList')
  async getInvoices(@Req() req: { user: { username: string } }) {
    const invoices = await this.invoiceService.getAllUserInvoices(req.user.username);
    return invoices.map((i) => this.invoiceService.mapInvoiceEntityToModel(i));
  }

  @Post('/invoice/invoicesListPeriod')
  async getInvoicesByPeriod(@Req() req: { user: { username: string } }, @Body() periodDate: RequestPeriodDateDto) {
    const invoices = await this.invoiceService.getAllUserInvoicesByPeriod(
      req.user.username,
      periodDate.startDate,
      periodDate.endDate,
    );
    return invoices.map((i) => this.invoiceService.mapInvoiceEntityToModel(i));
  }
}
