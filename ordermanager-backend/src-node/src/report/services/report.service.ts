import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../exception/error-code.enum';
import { OrderManagerException } from '../../exception/order-manager.exception';
import { InvoiceRepository } from '../../invoice/repositories/invoice.repository';

@Injectable()
export class ReportService {
  constructor(private readonly invoiceRepository: InvoiceRepository) {}

  async createPdfReport(invoiceNumber: string, userName: string, language?: string): Promise<Buffer> {
    const invoice = await this.invoiceRepository.findInvoiceByInvoiceUserUsernameAndInvoiceNumber(userName, invoiceNumber);
    if (!invoice) {
      throw new OrderManagerException(ErrorCode.CODE_0004, 'Can not find invoice');
    }

    const content = [
      '%PDF-1.1',
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Contents 4 0 R >> endobj',
      `4 0 obj << /Length 60 >> stream BT /F1 12 Tf 20 100 Td (Invoice ${invoiceNumber} ${language ?? 'en'}) Tj ET endstream endobj`,
      'xref 0 5',
      '0000000000 65535 f ',
      'trailer << /Root 1 0 R /Size 5 >>',
      'startxref',
      '0',
      '%%EOF',
    ].join('
');

    return Buffer.from(content, 'utf8');
  }
}
