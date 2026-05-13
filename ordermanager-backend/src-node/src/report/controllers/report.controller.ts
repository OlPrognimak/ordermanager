import { Body, Controller, Header, Post, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { PdfRequestDto } from '../dto/pdf-request.dto';
import { ReportService } from '../services/report.service';

@Controller()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('/invoice/printreport')
  @Header('Content-Type', 'application/pdf')
  async printReport(@Body() pdfRequest: PdfRequestDto, @Req() req: any, @Res() res: Response): Promise<void> {
    const report = await this.reportService.createPdfReport(pdfRequest.invoiceNumber, req.user.username, pdfRequest.language);
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${pdfRequest.invoiceNumber}.pdf`);
    res.status(200).send(report);
  }
}
