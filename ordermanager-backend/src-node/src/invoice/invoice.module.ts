import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceEntity } from './entities/invoice.entity';
import { InvoiceItemEntity } from './entities/invoice-item.entity';
import { ItemCatalogEntity } from './entities/item-catalog.entity';
import { InvoiceRepository } from './repositories/invoice.repository';
import { ItemCatalogRepository } from './repositories/item-catalog.repository';
import { InvoiceService } from './services/invoice.service';
import { InvoiceMappingService } from './services/invoice-mapping.service';
import { InvoiceMapper } from './mappers/invoice.mapper';
import { InvoiceController } from './controllers/invoice.controller';
import { PersonModule } from '../person/person.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [TypeOrmModule.forFeature([InvoiceEntity, InvoiceItemEntity, ItemCatalogEntity]), PersonModule, SecurityModule],
  providers: [InvoiceRepository, ItemCatalogRepository, InvoiceService, InvoiceMappingService, InvoiceMapper],
  controllers: [InvoiceController],
  exports: [InvoiceService, InvoiceRepository],
})
export class InvoiceModule {}
