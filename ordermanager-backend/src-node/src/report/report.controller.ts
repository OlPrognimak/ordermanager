import { Body, Controller, Header, Post, Req } from '@nestjs/common';
import { PdfRequestDto } from './dto/pdf-request.dto';
import { ReportService } from './report.service';

@Controller()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('/invoice/printreport')
  @Header('Content-Type', 'application/pdf')
  async printReport(@Body() pdfRequest: PdfRequestDto, @Req() req: { user: { username: string } }) {
    return this.reportService.createPdfReport(pdfRequest.invoiceNumber, req.user.username, pdfRequest.language);
  }
}
