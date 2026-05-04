import { Module } from '@nestjs/common';
import { ReportController } from './controllers/report.controller';
import { ReportService } from './services/report.service';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [InvoiceModule],
  providers: [ReportService],
  controllers: [ReportController],
})
export class ReportModule {}
