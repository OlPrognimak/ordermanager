import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonModule } from './person/person.module';
import { InvoiceModule } from './invoice/invoice.module';
import { SecurityModule } from './security/security.module';
import { ExceptionModule } from './exception/exception.module';
import { ReportModule } from './report/report.module';
import { UrlsModule } from './urls/urls.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: false,
    }),
    ExceptionModule,
    SecurityModule,
    PersonModule,
    InvoiceModule,
    ReportModule,
    UrlsModule,
  ],
})
export class AppModule {}
