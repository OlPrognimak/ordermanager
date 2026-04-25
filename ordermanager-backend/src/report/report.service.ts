import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../common/exceptions/error-code.enum';
import { OrderManagerException } from '../common/exceptions/order-manager.exception';

@Injectable()
export class ReportService {
  async createPdfReport(_invoiceNumber: string, _userName: string, _language?: string): Promise<Buffer> {
    // TODO(Migration): JasperReports templates (invoice.jrxml + invoice-data.jrxml) must be migrated
    // to a Node-compatible report stack (e.g., JasperServer REST bridge or PDF engine preserving layout).
    throw new OrderManagerException(ErrorCode.CODE_10001, 'Report generation exception in service method createPdfReport');
  }
}
