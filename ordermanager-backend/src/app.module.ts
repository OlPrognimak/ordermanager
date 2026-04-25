import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceModule } from './invoice/invoice.module';
import { PersonModule } from './person/person.module';
import { ReportModule } from './report/report.module';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('DB_HOST'),
        port: cfg.get<number>('DB_PORT'),
        username: cfg.get('DB_USERNAME'),
        password: cfg.get('DB_PASSWORD'),
        database: cfg.get('DB_NAME'),
        schema: cfg.get('DB_SCHEMA', 'public'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    SecurityModule,
    PersonModule,
    InvoiceModule,
    ReportModule,
  ],
})
export class AppModule {}
